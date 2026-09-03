import { describe, expect, it } from 'vitest'
import { textStats, textEncode, textDecode, textHash, jsonTool, queryPath } from '../index.js'

describe('textStats', () => {
  it('counts characters, words, lines and CJK', () => {
    const s = textStats('你好, world\nsecond line')
    expect(s.cjk_characters).toBe(2)
    expect(s.words).toBe(4)
    expect(s.lines).toBe(2)
    expect(s.characters).toBe([...'你好, world\nsecond line'].length)
  })
  it('handles empty input', () => {
    const s = textStats('')
    expect(s.characters).toBe(0)
    expect(s.lines).toBe(0)
    expect(s.words).toBe(0)
  })
})

describe('textEncode/textDecode', () => {
  it('round-trips base64', () => {
    const text = 'hello 世界 🚀'
    expect(textDecode(textEncode(text, 'base64'), 'base64')).toBe(text)
  })
  it('round-trips hex', () => {
    const text = 'abc 123'
    expect(textEncode(text, 'hex')).toBe('61626320313233')
    expect(textDecode('61626320313233', 'hex')).toBe(text)
  })
  it('round-trips url encoding', () => {
    const text = 'a b&c=d/中'
    expect(textDecode(textEncode(text, 'url'), 'url')).toBe(text)
  })
  it('rejects bad hex', () => {
    expect(() => textDecode('zz', 'hex')).toThrow()
  })
  it('rejects unknown encoding', () => {
    expect(() => textEncode('x', 'rot13')).toThrow()
  })
})

describe('textHash', () => {
  it('computes sha256 of empty string', () => {
    expect(textHash('', 'sha256')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })
  it('computes md5 of abc', () => {
    expect(textHash('abc', 'md5')).toBe('900150983cd24fb0d6963f7d28e17f72')
  })
  it('rejects unknown algorithm', () => {
    expect(() => textHash('x', 'crc32')).toThrow()
  })
})

describe('jsonTool', () => {
  const doc = '{"a":{"b":[10,20,{"c":"deep"}]},"name":"测试"}'
  it('formats json', () => {
    expect(jsonTool(doc, 'format')).toContain('\n  ')
  })
  it('minifies json', () => {
    expect(jsonTool('{ "a" : 1 }', 'minify')).toBe('{"a":1}')
  })
  it('queries a nested path', () => {
    expect(JSON.parse(jsonTool(doc, 'query', 'a.b[2].c'))).toBe('deep')
    expect(JSON.parse(jsonTool(doc, 'query', 'a.b[0]'))).toBe(10)
    expect(JSON.parse(jsonTool(doc, 'query', 'name'))).toBe('测试')
  })
  it('lists keys', () => {
    const keys = JSON.parse(jsonTool(doc, 'keys'))
    expect(keys).toContain('a')
    expect(keys).toContain('a.b[0]')
  })
  it('rejects invalid json', () => {
    expect(() => jsonTool('{bad', 'format')).toThrow(/Invalid JSON/)
  })
  it('queryPath returns undefined for missing path', () => {
    expect(queryPath({ a: 1 }, 'x.y')).toBeUndefined()
  })
})
