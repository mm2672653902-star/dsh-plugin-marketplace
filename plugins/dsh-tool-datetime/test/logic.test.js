import { describe, expect, it } from 'vitest'
import { parseInput, describeNow, describeDiff, timeZoneOffsetMinutes } from '../index.js'

describe('parseInput', () => {
  it('parses unix seconds', () => {
    expect(parseInput(0).toISOString()).toBe('1970-01-01T00:00:00.000Z')
    expect(parseInput('0').toISOString()).toBe('1970-01-01T00:00:00.000Z')
  })
  it('parses unix millis', () => {
    expect(parseInput(1700000000000).toISOString()).toBe('2023-11-14T22:13:20.000Z')
  })
  it('parses ISO strings', () => {
    expect(parseInput('2024-01-02T03:04:05Z').toISOString()).toBe('2024-01-02T03:04:05.000Z')
  })
  it('handles now and null', () => {
    expect(parseInput('now')).toBeInstanceOf(Date)
    expect(parseInput(undefined)).toBeInstanceOf(Date)
  })
  it('rejects garbage', () => {
    expect(() => parseInput('not a date')).toThrow()
  })
})

describe('describeNow', () => {
  it('returns iso and timestamps', () => {
    const r = describeNow('UTC')
    expect(r.iso_utc).toMatch(/Z$/)
    expect(r.timezone).toBe('UTC')
    expect(r.unix_seconds).toBe(Math.floor(r.unix_millis / 1000))
    expect(r.iso_local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/)
  })
  it('rejects unknown timezone', () => {
    expect(() => describeNow('Mars/Olympus')).toThrow()
  })
})

describe('timeZoneOffsetMinutes', () => {
  it('UTC offset is zero', () => {
    expect(timeZoneOffsetMinutes(new Date('2024-06-01T12:00:00Z'), 'UTC')).toBe(0)
  })
  it('Shanghai is +480', () => {
    expect(timeZoneOffsetMinutes(new Date('2024-06-01T12:00:00Z'), 'Asia/Shanghai')).toBe(480)
  })
})

describe('describeDiff', () => {
  it('computes differences', () => {
    const r = describeDiff('2024-01-01T00:00:00Z', '2024-01-02T06:00:00Z')
    expect(r.seconds).toBe(30 * 3600)
    expect(r.hours).toBeCloseTo(30)
    expect(r.days).toBeCloseTo(1.25)
    expect(r.human).toContain('1 day')
    expect(r.direction).toBe('b is after a')
  })
  it('detects backwards direction', () => {
    const r = describeDiff('2024-01-02T00:00:00Z', '2024-01-01T00:00:00Z')
    expect(r.direction).toBe('b is before a')
  })
})
