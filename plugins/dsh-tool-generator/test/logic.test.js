import { describe, expect, it } from 'vitest'
import { generateId, generateToken, generatePassword } from '../index.js'

describe('generateId', () => {
  it('produces requested length', () => {
    expect(generateId(16)).toHaveLength(16)
    expect(generateId(64)).toHaveLength(64)
  })
  it('produces distinct values', () => {
    const set = new Set(Array.from({ length: 200 }, () => generateId(16)))
    expect(set.size).toBe(200)
  })
  it('rejects out-of-range lengths', () => {
    expect(() => generateId(2)).toThrow()
    expect(() => generateId(1000)).toThrow()
  })
})

describe('generateToken', () => {
  it('produces hex of double the byte length', () => {
    const token = generateToken(16)
    expect(token).toMatch(/^[0-9a-f]{32}$/)
  })
  it('rejects tiny entropy', () => {
    expect(() => generateToken(2)).toThrow()
  })
})

describe('generatePassword', () => {
  it('defaults to 16 chars with all base classes', () => {
    const pw = generatePassword()
    expect(pw).toHaveLength(16)
    expect(pw).toMatch(/[a-z]/)
    expect(pw).toMatch(/[A-Z]/)
    expect(pw).toMatch(/[0-9]/)
  })
  it('guarantees enabled classes', () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword({ length: 8, symbols: true })
      expect(pw).toMatch(/[!@#$%^&*()\-_=+[\]{};:,.<>?]/)
    }
  })
  it('respects disabled classes', () => {
    const pw = generatePassword({ length: 32, upper: false, digits: false })
    expect(pw).not.toMatch(/[A-Z0-9]/)
  })
  it('rejects short passwords', () => {
    expect(() => generatePassword({ length: 4 })).toThrow()
  })
})
