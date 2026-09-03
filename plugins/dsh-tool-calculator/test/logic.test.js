import { describe, expect, it } from 'vitest'
import { evaluate, convertUnit } from '../index.js'

describe('evaluate', () => {
  it('handles arithmetic precedence', () => {
    expect(evaluate('2+3*4')).toBe(14)
    expect(evaluate('(2+3)*4')).toBe(20)
    expect(evaluate('10 % 3')).toBe(1)
  })
  it('handles unary minus and plus', () => {
    expect(evaluate('-5+3')).toBe(-2)
    expect(evaluate('-(2+3)')).toBe(-5)
    expect(evaluate('+7')).toBe(7)
    expect(evaluate('2*-3')).toBe(-6)
  })
  it('handles exponentiation right-associatively', () => {
    expect(evaluate('2^3^2')).toBe(512)
    expect(evaluate('-2^2')).toBe(-4)
  })
  it('supports functions', () => {
    expect(evaluate('sqrt(16)')).toBe(4)
    expect(evaluate('min(3,1,2)')).toBe(1)
    expect(evaluate('max(3,9,2)')).toBe(9)
    expect(evaluate('log(1000)')).toBeCloseTo(3)
    expect(evaluate('ln(e)')).toBeCloseTo(1)
    expect(evaluate('atan2(1,1)')).toBeCloseTo(Math.PI / 4)
  })
  it('supports constants', () => {
    expect(evaluate('pi')).toBeCloseTo(Math.PI)
    expect(evaluate('2*pi')).toBeCloseTo(2 * Math.PI)
    expect(evaluate('tau')).toBeCloseTo(2 * Math.PI)
  })
  it('supports scientific notation', () => {
    expect(evaluate('1e3 + 2.5e2')).toBe(1250)
  })
  it('rejects malformed input', () => {
    expect(() => evaluate('2+')).toThrow()
    expect(() => evaluate('(2+3')).toThrow()
    expect(() => evaluate('2)')).toThrow()
    expect(() => evaluate('foo(3)')).toThrow()
    expect(() => evaluate('1/0')).toThrow(/not finite/)
  })
})

describe('convertUnit', () => {
  it('converts length', () => {
    expect(convertUnit(1, 'km', 'm')).toBe(1000)
    expect(convertUnit(12, 'in', 'cm')).toBeCloseTo(30.48)
  })
  it('converts mass', () => {
    expect(convertUnit(1, 'kg', 'g')).toBe(1000)
    expect(convertUnit(1, 'lb', 'kg')).toBeCloseTo(0.4536, 3)
  })
  it('converts temperature', () => {
    expect(convertUnit(0, 'C', 'F')).toBe(32)
    expect(convertUnit(100, 'C', 'F')).toBe(212)
    expect(convertUnit(0, 'C', 'K')).toBeCloseTo(273.15)
    expect(convertUnit(72, 'F', 'C')).toBeCloseTo(22.222, 3)
  })
  it('converts data units', () => {
    expect(convertUnit(1, 'GiB', 'MiB')).toBe(1024)
    expect(convertUnit(1000, 'KB', 'MB')).toBe(1)
  })
  it('rejects incompatible units', () => {
    expect(() => convertUnit(1, 'kg', 'C')).toThrow()
  })
})
