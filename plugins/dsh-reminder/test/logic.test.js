import { describe, expect, it } from 'vitest'
import { resolveDelayMs, describeDelay } from '../index.js'

describe('resolveDelayMs', () => {
  it('uses in_seconds', () => {
    expect(resolveDelayMs({ in_seconds: 30 })).toBe(30_000)
  })
  it('uses in_minutes', () => {
    expect(resolveDelayMs({ in_minutes: 2 })).toBe(120_000)
  })
  it('prefers in_seconds over in_minutes', () => {
    expect(resolveDelayMs({ in_seconds: 10, in_minutes: 5 })).toBe(10_000)
  })
  it('computes absolute at', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const delay = resolveDelayMs({ at: '2024-01-01T01:00:00Z' }, now)
    expect(delay).toBe(3_600_000)
  })
  it('rejects past at', () => {
    const now = new Date('2024-01-01T02:00:00Z')
    expect(() => resolveDelayMs({ at: '2024-01-01T01:00:00Z' }, now)).toThrow(/past/)
  })
  it('rejects missing input', () => {
    expect(() => resolveDelayMs({})).toThrow()
  })
})

describe('describeDelay', () => {
  it('describes seconds', () => {
    expect(describeDelay(30_000)).toBe('30 seconds')
  })
  it('describes minutes', () => {
    expect(describeDelay(5 * 60_000)).toBe('5 minute(s)')
  })
  it('describes hours', () => {
    expect(describeDelay(150 * 60_000)).toBe('2.5 hour(s)')
  })
})
