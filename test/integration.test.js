/**
 * Integration tests: mount every plugin against a mock Cordis context and
 * drive its tools/events end-to-end. Proves each apply(ctx, config) runs and
 * registers a working surface without booting the full harness.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createMockCtx } from './mock-ctx.js'

import * as toolText from '../plugins/dsh-tool-text/index.js'
import * as calculator from '../plugins/dsh-tool-calculator/index.js'
import * as datetime from '../plugins/dsh-tool-datetime/index.js'
import * as generator from '../plugins/dsh-tool-generator/index.js'
import * as systemInfo from '../plugins/dsh-tool-system-info/index.js'
import * as notes from '../plugins/dsh-notes/index.js'
import * as safety from '../plugins/dsh-safety-guard/index.js'
import * as usage from '../plugins/dsh-usage-stats/index.js'
import * as gitCommit from '../plugins/dsh-skill-git-commit/index.js'
import * as reminder from '../plugins/dsh-reminder/index.js'

describe('dsh-tool-text mounts', () => {
  it('registers five tools and they execute', async () => {
    const m = createMockCtx()
    const dispose = toolText.apply(m.ctx)
    expect(m.toolNames()).toEqual([
      'json_tool', 'text_decode', 'text_encode', 'text_hash', 'text_stats',
    ])
    const stats = await m.call('text_stats', { text: 'hi 你好' })
    expect(stats.cjk_characters).toBe(2)
    const enc = await m.call('text_encode', { text: 'ab', encoding: 'hex' })
    expect(enc.text).toBe('6162')
    expect(typeof dispose).toBe('function')
    dispose()
  })
})

describe('dsh-tool-calculator mounts', () => {
  it('registers calculate + convert_unit', async () => {
    const m = createMockCtx()
    const dispose = calculator.apply(m.ctx)
    expect(m.toolNames()).toEqual(['calculate', 'convert_unit'])
    const r = await m.call('calculate', { expression: '2+3*4' })
    expect(r.result).toBe(14)
    const c = await m.call('convert_unit', { value: 1, from: 'km', to: 'm' })
    expect(c.result).toBe(1000)
    dispose()
  })
})

describe('dsh-tool-datetime mounts', () => {
  it('registers three tools', async () => {
    const m = createMockCtx()
    const dispose = datetime.apply(m.ctx)
    expect(m.toolNames()).toEqual(['datetime_convert', 'datetime_diff', 'datetime_now'])
    const now = await m.call('datetime_now', { timezone: 'UTC' })
    expect(now.iso_utc).toMatch(/Z$/)
    dispose()
  })
})

describe('dsh-tool-generator mounts', () => {
  it('registers four generators', async () => {
    const m = createMockCtx()
    const dispose = generator.apply(m.ctx)
    expect(m.toolNames()).toEqual([
      'generate_id', 'generate_password', 'generate_token', 'generate_uuid',
    ])
    const uuid = await m.call('generate_uuid', { count: 2 })
    expect(uuid.uuids).toHaveLength(2)
    dispose()
  })
})

describe('dsh-tool-system-info mounts', () => {
  it('registers system_info', async () => {
    const m = createMockCtx()
    const dispose = systemInfo.apply(m.ctx)
    expect(m.toolNames()).toEqual(['system_info'])
    const info = await m.call('system_info', {})
    expect(info.platform).toBeTruthy()
    dispose()
  })
})

describe('dsh-notes mounts', () => {
  it('saves, searches, lists and deletes notes', async () => {
    const m = createMockCtx()
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tmp-notes')
    const dispose = notes.apply(m.ctx, { dir })
    expect(m.toolNames()).toEqual(['note_delete', 'note_list', 'note_save', 'note_search'])

    const saved = await m.call('note_save', { title: 'T1', body: 'remember this', tags: ['x'] })
    expect(saved.status).toBe('created')
    const again = await m.call('note_save', { title: 'T1', body: 'updated' })
    expect(again.status).toBe('updated')

    const found = await m.call('note_search', { query: 'updated' })
    expect(found.count).toBe(1)
    const list = await m.call('note_list', {})
    expect(list.count).toBe(1)
    const del = await m.call('note_delete', { title: 'T1' })
    expect(del.deleted).toBe(true)
    dispose()
  })
})

describe('dsh-safety-guard mounts', () => {
  it('denies dangerous bash commands and passes safe ones', async () => {
    const m = createMockCtx()
    const dispose = safety.apply(m.ctx, { mode: 'deny' })
    expect(m.events()).toContain('tools/pre-execute')

    const exec = { name: 'bash', arguments: { command: 'rm -rf /' } }
    const decision = await m.waterfall('tools/pre-execute', () => ({ kind: 'allow' }), exec)
    expect(decision.kind).toBe('deny')

    const safe = { name: 'bash', arguments: { command: 'ls -la' } }
    const pass = await m.waterfall('tools/pre-execute', () => ({ kind: 'allow' }), safe)
    expect(pass.kind).toBe('allow')
    dispose()
  })

  it('ask mode escalates instead of denying', async () => {
    const m = createMockCtx()
    const dispose = safety.apply(m.ctx, { mode: 'ask' })
    const exec = { name: 'bash', arguments: { command: 'shutdown -h now' } }
    const decision = await m.waterfall('tools/pre-execute', () => ({ kind: 'allow' }), exec)
    expect(decision.kind).toBe('ask')
    dispose()
  })
})

describe('dsh-usage-stats mounts', () => {
  it('counts events and reports', async () => {
    const m = createMockCtx()
    const dispose = usage.apply(m.ctx)
    expect(m.events()).toContain('session/event')
    expect(m.toolNames()).toEqual(['usage_stats'])

    await m.emit('session/event', { id: 's1' }, { type: 'turn/start' })
    await m.emit('session/event', { id: 's1' }, { type: 'tool/call' })
    const report = await m.call('usage_stats', {})
    expect(report.sessions).toBe(1)
    expect(report.report).toMatch(/1 turns/)
    dispose()
  })
})

describe('dsh-skill-git-commit mounts', () => {
  it('validates commit messages', async () => {
    const m = createMockCtx()
    const dispose = gitCommit.apply(m.ctx)
    expect(m.toolNames()).toEqual(['commit_message_help', 'commit_message_validate'])
    const good = await m.call('commit_message_validate', { message: 'feat: add x' })
    expect(good.valid).toBe(true)
    const bad = await m.call('commit_message_validate', { message: 'broke' })
    expect(bad.valid).toBe(false)
    dispose()
  })
})

describe('dsh-reminder mounts', () => {
  it('sets, lists, cancels and fires a reminder', async () => {
    const m = createMockCtx()
    const dispose = reminder.apply(m.ctx)
    expect(m.toolNames()).toEqual(['reminder_cancel', 'reminder_list', 'reminder_set'])

    const injected = []
    const agent = { inject: (payload) => injected.push(payload) }
    const set = await m.call('reminder_set', { message: 'standup', in_seconds: 0.05 }, { agent })
    expect(set.id).toBeTruthy()

    const list = await m.call('reminder_list', {})
    expect(list.count).toBe(1)

    // Wait for the short timer to fire.
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(injected).toHaveLength(1)
    expect(injected[0].content[0].text).toContain('standup')
    expect((await m.call('reminder_list', {})).count).toBe(0)
    dispose()
  })

  it('cancels before firing', async () => {
    const m = createMockCtx()
    const dispose = reminder.apply(m.ctx)
    const set = await m.call('reminder_set', { message: 'x', in_seconds: 0.05 })
    const cancel = await m.call('reminder_cancel', { id: set.id })
    expect(cancel.cancelled).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 100))
    dispose()
  })
})
