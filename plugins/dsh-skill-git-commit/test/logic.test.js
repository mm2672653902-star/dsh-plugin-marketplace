import { describe, expect, it } from 'vitest'
import { validateCommitMessage, commitGuidelines, TYPES } from '../index.js'

describe('validateCommitMessage', () => {
  it('accepts a good message', () => {
    const r = validateCommitMessage('feat(auth): add OAuth login\n\nAdds PKCE flow.')
    expect(r.valid).toBe(true)
    expect(r.issues).toHaveLength(0)
  })
  it('accepts type without scope', () => {
    expect(validateCommitMessage('fix: handle null').valid).toBe(true)
  })
  it('accepts breaking change marker', () => {
    expect(validateCommitMessage('feat(api)!: drop v1').valid).toBe(true)
  })
  it('rejects unknown type', () => {
    const r = validateCommitMessage('frobnicate: do thing')
    expect(r.valid).toBe(false)
    expect(r.issues.join(' ')).toMatch(/Unknown type/)
  })
  it('rejects missing colon/format', () => {
    expect(validateCommitMessage('add stuff').valid).toBe(false)
  })
  it('rejects empty message', () => {
    expect(validateCommitMessage('').valid).toBe(false)
  })
  it('rejects trailing period in subject', () => {
    const r = validateCommitMessage('fix: handle null.')
    expect(r.valid).toBe(false)
  })
  it('warns on long subject', () => {
    const long = 'fix: ' + 'x'.repeat(90)
    const r = validateCommitMessage(long)
    expect(r.valid).toBe(false)
    expect(r.issues.join(' ')).toMatch(/72/)
  })
})

describe('commitGuidelines', () => {
  it('mentions all standard types', () => {
    const text = commitGuidelines()
    for (const t of TYPES) expect(text).toContain(t)
  })
})
