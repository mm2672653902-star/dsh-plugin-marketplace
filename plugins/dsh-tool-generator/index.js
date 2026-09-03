/**
 * dsh-tool-generator — UUIDv4, short ids, passwords and hex tokens.
 *
 * Everything is built on node:crypto (CSPRNG).
 */
import { randomBytes, randomUUID } from 'node:crypto'

export const name = 'dsh-tool-generator'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

export function generateId(length = 16, alphabet = ID_ALPHABET) {
  if (!Number.isInteger(length) || length < 4 || length > 128) {
    throw new Error('length must be an integer between 4 and 128')
  }
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

export function generateToken(byteLength = 16) {
  if (!Number.isInteger(byteLength) || byteLength < 8 || byteLength > 128) {
    throw new Error('byteLength must be an integer between 8 and 128')
  }
  return randomBytes(byteLength).toString('hex')
}

const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
}

export function generatePassword(options = {}) {
  const length = options.length ?? 16
  if (!Number.isInteger(length) || length < 8 || length > 128) {
    throw new Error('length must be an integer between 8 and 128')
  }
  const include = {
    lower: options.lower !== false,
    upper: options.upper !== false,
    digits: options.digits !== false,
    symbols: options.symbols ?? false,
  }
  const pools = Object.keys(CHARSETS).filter((k) => include[k])
  if (!pools.length) throw new Error('At least one character class must be enabled')
  const alphabet = pools.map((k) => CHARSETS[k]).join('')

  // Guarantee at least one character from every enabled class, then fill.
  const bytes = randomBytes(length)
  const chars = pools.map((k, i) => CHARSETS[k][bytes[i] % CHARSETS[k].length])
  for (let i = pools.length; i < length; i++) {
    chars.push(alphabet[bytes[i] % alphabet.length])
  }
  // Fisher-Yates shuffle with fresh randomness.
  const shuffleBytes = randomBytes(length)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx) {
  const disposers = []

  disposers.push(
    ctx.tools.register({
      name: 'generate_uuid',
      description: 'Generate one or more random UUIDv4 identifiers.',
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'How many UUIDs (1-50, default 1).' },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { uuids: { type: 'array', items: { type: 'string' } } },
          required: ['uuids'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.uuids.join('\n') }],
      },
      async execute(args) {
        const count = Math.min(Math.max(Math.trunc(args.count ?? 1), 1), 50)
        return { uuids: Array.from({ length: count }, () => randomUUID()) }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'generate_id',
      description: 'Generate a short URL-safe random identifier (nanoid-style).',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: '4-128 characters, default 16.' },
          count: { type: 'number', description: 'How many ids (1-50, default 1).' },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { ids: { type: 'array', items: { type: 'string' } } },
          required: ['ids'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.ids.join('\n') }],
      },
      async execute(args) {
        const count = Math.min(Math.max(Math.trunc(args.count ?? 1), 1), 50)
        return { ids: Array.from({ length: count }, () => generateId(args.length ?? 16)) }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'generate_token',
      description: 'Generate a cryptographically secure hex token (for secrets/API keys).',
      parameters: {
        type: 'object',
        properties: {
          byte_length: { type: 'number', description: 'Entropy bytes 8-128, default 16 (32 hex chars).' },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { token: { type: 'string' } },
          required: ['token'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.token }],
      },
      async execute(args) {
        return { token: generateToken(args.byte_length ?? 16) }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'generate_password',
      description:
        'Generate a random password. Character classes: lowercase/uppercase/digits on by default, symbols optional; at least one char per enabled class is guaranteed.',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: '8-128 characters, default 16.' },
          lower: { type: 'boolean' },
          upper: { type: 'boolean' },
          digits: { type: 'boolean' },
          symbols: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { password: { type: 'string' } },
          required: ['password'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.password }],
      },
      async execute(args) {
        return {
          password: generatePassword({
            length: args.length,
            lower: args.lower,
            upper: args.upper,
            digits: args.digits,
            symbols: args.symbols,
          }),
        }
      },
    }),
  )

  return () => disposers.forEach((dispose) => dispose())
}
