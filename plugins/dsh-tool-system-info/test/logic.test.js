import { describe, expect, it } from 'vitest'
import { formatBytes, staticInfo } from '../index.js'

describe('formatBytes', () => {
  it('formats units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.0 KiB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MiB')
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GiB')
  })
  it('handles unknown', () => {
    expect(formatBytes(-1)).toBe('unknown')
    expect(formatBytes(NaN)).toBe('unknown')
  })
})

describe('staticInfo', () => {
  it('returns required fields', () => {
    const info = staticInfo()
    expect(info.platform).toBeTruthy()
    expect(info.arch).toBeTruthy()
    expect(info.cpu_cores).toBeGreaterThan(0)
    expect(info.node_version).toMatch(/^v\d+/)
    expect(info.total_memory).toMatch(/B$/)
  })
})
