import { describe, expect, it } from 'vitest'
import { normalizeNote, searchNotes } from '../index.js'

describe('normalizeNote', () => {
  it('builds a note with lowercase tags', () => {
    const note = normalizeNote({ title: ' Hello ', body: 'World', tags: [' Foo ', 'BAR', ''] })
    expect(note.title).toBe('Hello')
    expect(note.body).toBe('World')
    expect(note.tags).toEqual(['foo', 'bar'])
    expect(note.updatedAt).toBeTruthy()
  })
  it('requires title and body', () => {
    expect(() => normalizeNote({ body: 'x' })).toThrow(/title/)
    expect(() => normalizeNote({ title: 'x' })).toThrow(/body/)
  })
})

describe('searchNotes', () => {
  const notes = [
    { title: 'Git workflow', body: 'Use rebase for feature branches', tags: ['git'] },
    { title: 'Recipes', body: 'Tomato pasta with basil', tags: ['food'] },
    { title: 'Git rebase tips', body: 'Interactive rebase squash', tags: ['git', 'tips'] },
  ]
  it('matches single term across fields', () => {
    expect(searchNotes(notes, 'git')).toHaveLength(2)
    expect(searchNotes(notes, 'basil')).toHaveLength(1)
    expect(searchNotes(notes, 'tips')).toHaveLength(1)
  })
  it('requires all terms to match', () => {
    expect(searchNotes(notes, 'git squash')).toHaveLength(1)
    expect(searchNotes(notes, 'git pasta')).toHaveLength(0)
  })
  it('is case-insensitive', () => {
    expect(searchNotes(notes, 'TOMATO')).toHaveLength(1)
  })
  it('returns everything for empty query', () => {
    expect(searchNotes(notes, '')).toHaveLength(3)
  })
})
