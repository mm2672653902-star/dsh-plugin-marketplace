import { describe, expect, it } from 'vitest'
import { createCounter, touchCounter, formatReport } from '../index.js'

describe('touchCounter', () => {
  it('counts each event type', () => {
    const c = createCounter()
    touchCounter(c, { type: 'turn/start' })
    touchCounter(c, { type: 'step/start' })
    touchCounter(c, { type: 'step/start' })
    touchCounter(c, { type: 'user/message' })
    touchCounter(c, { type: 'assistant/message' })
    touchCounter(c, { type: 'tool/call' })
    touchCounter(c, { type: 'tool/call' })
    touchCounter(c, { type: 'session/event' }) // ignored
    expect(c.turns).toBe(1)
    expect(c.steps).toBe(2)
    expect(c.userMessages).toBe(1)
    expect(c.assistantMessages).toBe(1)
    expect(c.toolCalls).toBe(2)
  })
  it('updates lastSeen', () => {
    const c = createCounter()
    const before = c.lastSeen
    touchCounter(c, { type: 'turn/start' }, before + 5000)
    expect(c.lastSeen).toBe(before + 5000)
  })
})

describe('formatReport', () => {
  it('reports empty state', () => {
    expect(formatReport({})).toMatch(/No activity/)
  })
  it('sums across sessions', () => {
    const a = touchCounter(createCounter(), { type: 'turn/start' })
    const b = touchCounter(touchCounter(createCounter(), { type: 'turn/start' }), { type: 'tool/call' })
    const report = formatReport({ s1: a, s2: b })
    expect(report).toMatch(/2 session/)
    expect(report).toMatch(/2 turns/)
    expect(report).toMatch(/1 tool call/)
  })
})
