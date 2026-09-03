/**
 * dsh-tool-text — text toolbox for DeepSeek Harness.
 *
 * Tools: text_stats, text_encode, text_decode, text_hash, json_tool.
 * Zero runtime dependencies; registers through the raw ToolDefinition
 * shape (the same path MCP tools take), so it needs no dsh imports.
 */
import { createHash } from 'node:crypto'

export const name = 'dsh-tool-text'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
export function textStats(text) {
  const trimmed = text ?? ''
  const chars = [...trimmed]
  const cjk = trimmed.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0
  const words = trimmed.split(/\s+/).filter(Boolean).length
  return {
    characters: chars.length,
    characters_no_whitespace: chars.filter((c) => !/\s/.test(c)).length,
    cjk_characters: cjk,
    words,
    lines: trimmed.length === 0 ? 0 : trimmed.split('\n').length,
    bytes_utf8: Buffer.byteLength(trimmed, 'utf8'),
  }
}

const ENCODINGS = ['base64', 'hex', 'url', 'base64url']

export function textEncode(text, encoding) {
  const buf = Buffer.from(text ?? '', 'utf8')
  switch (encoding) {
    case 'base64':
      return buf.toString('base64')
    case 'base64url':
      return buf.toString('base64url')
    case 'hex':
      return buf.toString('hex')
    case 'url':
      return encodeURIComponent(text ?? '')
    default:
      throw new Error(`Unsupported encoding "${encoding}". Use one of: ${ENCODINGS.join(', ')}`)
  }
}

export function textDecode(text, encoding) {
  const input = text ?? ''
  switch (encoding) {
    case 'base64':
      return Buffer.from(input, 'base64').toString('utf8')
    case 'base64url':
      return Buffer.from(input, 'base64url').toString('utf8')
    case 'hex':
      if (!/^([0-9a-fA-F]{2})*$/.test(input)) throw new Error('Invalid hex string')
      return Buffer.from(input, 'hex').toString('utf8')
    case 'url':
      try {
        return decodeURIComponent(input)
      } catch {
        throw new Error('Invalid percent-encoded string')
      }
    default:
      throw new Error(`Unsupported encoding "${encoding}". Use one of: ${ENCODINGS.join(', ')}`)
  }
}

const HASHES = ['md5', 'sha1', 'sha256', 'sha512']

export function textHash(text, algorithm) {
  if (!HASHES.includes(algorithm)) {
    throw new Error(`Unsupported algorithm "${algorithm}". Use one of: ${HASHES.join(', ')}`)
  }
  return createHash(algorithm).update(text ?? '', 'utf8').digest('hex')
}

export function jsonTool(text, operation, path) {
  let value
  try {
    value = JSON.parse(text)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`)
  }
  switch (operation) {
    case 'format':
      return JSON.stringify(value, null, 2)
    case 'minify':
      return JSON.stringify(value)
    case 'query': {
      const result = queryPath(value, path ?? '')
      return JSON.stringify(result, null, 2)
    }
    case 'keys':
      return JSON.stringify(listKeys(value), null, 2)
    default:
      throw new Error(`Unsupported operation "${operation}". Use: format, minify, query, keys`)
  }
}

/** Resolve a dotted path with [n] array indices, e.g. "a.b[0].c". */
export function queryPath(value, path) {
  if (!path) return value
  const segments = []
  for (const part of path.split('.')) {
    const m = part.match(/^([^\[\]]*)((?:\[\d+\])*)$/)
    if (!m) throw new Error(`Invalid path segment "${part}"`)
    if (m[1]) segments.push(m[1])
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) segments.push(Number(idx[1]))
  }
  let current = value
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined
    current = current[seg]
  }
  return current
}

function listKeys(value, prefix = '', depth = 0, out = []) {
  if (depth > 4 || value === null || typeof value !== 'object') return out
  for (const key of Array.isArray(value) ? value.keys() : Object.keys(value)) {
    const full = Array.isArray(value) ? `${prefix}[${key}]` : prefix ? `${prefix}.${key}` : String(key)
    out.push(full)
    const child = value[key]
    if (child !== null && typeof child === 'object') listKeys(child, full, depth + 1, out)
  }
  return out
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
function textResult(text) {
  return { text }
}

const OUTPUT_TEXT = {
  schema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
    additionalProperties: false,
  },
  render: (_args, value) => [{ type: 'text', text: value.text }],
}

export function apply(ctx) {
  const disposers = []

  disposers.push(
    ctx.tools.register({
      name: 'text_stats',
      description:
        'Count characters, CJK characters, words, lines and UTF-8 bytes of a text.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to analyze.' },
        },
        required: ['text'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            characters: { type: 'number' },
            characters_no_whitespace: { type: 'number' },
            cjk_characters: { type: 'number' },
            words: { type: 'number' },
            lines: { type: 'number' },
            bytes_utf8: { type: 'number' },
          },
          required: ['characters', 'cjk_characters', 'words', 'lines', 'bytes_utf8'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          {
            type: 'text',
            text:
              `${value.characters} chars (${value.cjk_characters} CJK), ` +
              `${value.words} words, ${value.lines} lines, ${value.bytes_utf8} bytes`,
          },
        ],
      },
      async execute(args) {
        return textStats(args.text)
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'text_encode',
      description: 'Encode text to base64, base64url, hex or percent-encoding.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          encoding: { type: 'string', enum: ENCODINGS },
        },
        required: ['text', 'encoding'],
        additionalProperties: false,
      },
      output: OUTPUT_TEXT,
      async execute(args) {
        return textResult(textEncode(args.text, args.encoding))
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'text_decode',
      description: 'Decode base64, base64url, hex or percent-encoded text to UTF-8.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          encoding: { type: 'string', enum: ENCODINGS },
        },
        required: ['text', 'encoding'],
        additionalProperties: false,
      },
      output: OUTPUT_TEXT,
      async execute(args) {
        return textResult(textDecode(args.text, args.encoding))
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'text_hash',
      description: 'Compute the md5 / sha1 / sha256 / sha512 hex digest of a text.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          algorithm: { type: 'string', enum: HASHES },
        },
        required: ['text', 'algorithm'],
        additionalProperties: false,
      },
      output: OUTPUT_TEXT,
      async execute(args) {
        return textResult(textHash(args.text, args.algorithm))
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'json_tool',
      description:
        'Format, minify, query by path (e.g. "a.b[0].c") or list keys of a JSON string.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Raw JSON text.' },
          operation: { type: 'string', enum: ['format', 'minify', 'query', 'keys'] },
          path: { type: 'string', description: 'Dotted path for the query operation.' },
        },
        required: ['text', 'operation'],
        additionalProperties: false,
      },
      output: OUTPUT_TEXT,
      async execute(args) {
        return textResult(jsonTool(args.text, args.operation, args.path))
      },
    }),
  )

  return () => disposers.forEach((dispose) => dispose())
}
