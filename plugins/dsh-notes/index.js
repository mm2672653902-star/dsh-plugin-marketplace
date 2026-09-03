/**
 * dsh-notes — persistent note / knowledge-base tools.
 *
 * Notes are stored as a single JSON document under the harness home
 * (<DSH_HOME or ~/.dsh>/plugin-data/dsh-notes/notes.json by default),
 * so they survive restarts and are easy to inspect or back up.
 */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export const name = 'dsh-notes'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
export function normalizeNote(input, now = new Date()) {
  const title = String(input.title ?? '').trim()
  const body = String(input.body ?? '').trim()
  if (!title) throw new Error('A note needs a non-empty title.')
  if (!body) throw new Error('A note needs a non-empty body.')
  const tags = (input.tags ?? [])
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean)
  return { title, body, tags, updatedAt: now.toISOString() }
}

export function searchNotes(notes, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return notes
  const terms = q.split(/\s+/)
  return notes.filter((note) => {
    const haystack = `${note.title}\n${note.body}\n${(note.tags ?? []).join(' ')}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
function defaultDir() {
  const home = process.env.DSH_HOME || path.join(homedir(), '.dsh')
  return path.join(home, 'plugin-data', 'dsh-notes')
}

function createStore(dir, maxNotes) {
  const file = path.join(dir, 'notes.json')

  async function load() {
    try {
      const raw = await readFile(file, 'utf8')
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed.notes) ? parsed.notes : []
    } catch {
      return []
    }
  }

  async function save(notes) {
    await mkdir(dir, { recursive: true })
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify({ notes }, null, 2), 'utf8')
    await rename(tmp, file)
  }

  return {
    file,
    async list() {
      const notes = await load()
      return notes
        .slice()
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    },
    async upsert(note) {
      const notes = await load()
      const idx = notes.findIndex((n) => n.title.toLowerCase() === note.title.toLowerCase())
      if (idx >= 0) notes[idx] = { ...notes[idx], ...note }
      else {
        if (notes.length >= maxNotes) {
          throw new Error(`Note limit reached (${maxNotes}). Delete notes first.`)
        }
        notes.push(note)
      }
      await save(notes)
      return idx >= 0 ? 'updated' : 'created'
    },
    async remove(title) {
      const notes = await load()
      const idx = notes.findIndex((n) => n.title.toLowerCase() === title.toLowerCase())
      if (idx < 0) return false
      notes.splice(idx, 1)
      await save(notes)
      return true
    },
  }
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx, config = {}) {
  const store = createStore(config.dir || defaultDir(), config.maxNotes ?? 500)
  const disposers = []

  disposers.push(
    ctx.tools.register({
      name: 'note_save',
      description:
        'Save or update a persistent note (knowledge base). Re-saving the same title updates it. ' +
        'Use it to remember facts, decisions or snippets the user wants to keep.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Unique note title.' },
          body: { type: 'string', description: 'Note content.' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'body'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { status: { type: 'string' }, title: { type: 'string' } },
          required: ['status', 'title'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: `Note "${value.title}" ${value.status}.` },
        ],
      },
      async execute(args) {
        const note = normalizeNote(args)
        const status = await store.upsert(note)
        return { status, title: note.title }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'note_search',
      description: 'Search persistent notes by keywords (title, body or tags; all terms must match).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number', description: 'Max results, default 10.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            notes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  body: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  updatedAt: { type: 'string' },
                },
                required: ['title', 'body'],
                additionalProperties: false,
              },
            },
          },
          required: ['count', 'notes'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          {
            type: 'text',
            text: value.count === 0
              ? 'No matching notes.'
              : value.notes.map((n) => `### ${n.title}\n${n.body}`).join('\n\n'),
          },
        ],
      },
      async execute(args) {
        const notes = searchNotes(await store.list(), args.query).slice(0, args.limit ?? 10)
        return { count: notes.length, notes }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'note_list',
      description: 'List all saved notes (most recent first), titles and tags only.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: {
        schema: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            titles: { type: 'array', items: { type: 'string' } },
          },
          required: ['count', 'titles'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: value.count === 0 ? 'No notes saved.' : value.titles.join('\n') },
        ],
      },
      async execute() {
        const notes = await store.list()
        return {
          count: notes.length,
          titles: notes.map((n) =>
            n.tags?.length ? `${n.title}  [${n.tags.join(', ')}]` : n.title),
        }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'note_delete',
      description: 'Delete a persistent note by its exact title.',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { deleted: { type: 'boolean' }, title: { type: 'string' } },
          required: ['deleted', 'title'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: value.deleted ? `Note "${value.title}" deleted.` : `Note "${value.title}" not found.` },
        ],
      },
      async execute(args) {
        return { deleted: await store.remove(String(args.title)), title: String(args.title) }
      },
    }),
  )

  return () => disposers.forEach((dispose) => dispose())
}
