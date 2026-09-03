/**
 * dsh-skill-git-commit — Conventional Commits helper.
 *
 * Two tools: `commit_message_validate` checks an existing message against
 * the Conventional Commits grammar, and `commit_message_help` returns
 * guidance for composing one from a change summary.
 */

export const name = 'dsh-skill-git-commit'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
export const TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test',
  'build', 'ci', 'chore', 'revert',
]

const HEADER_RE = /^(\w+)(\(([^)\s]+)\))?(!)?:\s(.+)$/

export function validateCommitMessage(message) {
  const issues = []
  const lines = String(message ?? '').split('\n')
  const header = lines[0] ?? ''

  if (!header.trim()) {
    return { valid: false, issues: ['Empty commit message.'] }
  }
  if (header.length > 100) {
    issues.push(`Header is ${header.length} chars; keep it under 100.`)
  }
  const match = header.match(HEADER_RE)
  if (!match) {
    issues.push(
      'Header must look like "type(scope)!: subject", e.g. "feat(auth): add OAuth login".',
    )
  } else {
    const [, type, , scope, bang, subject] = match
    if (!TYPES.includes(type)) {
      issues.push(`Unknown type "${type}". Use one of: ${TYPES.join(', ')}.`)
    }
    if (!subject.trim()) issues.push('Subject is empty.')
    if (subject.length > 72) issues.push(`Subject is ${subject.length} chars; keep it under 72.`)
    if (/^\s/.test(subject)) issues.push('Subject should not start with whitespace.')
    if (/[.。]\s*$/.test(subject)) issues.push('Subject should not end with a period.')
    if (bang && bang === '!') {
      // breaking change marker is fine
    }
  }
  if (lines.length > 1 && lines[1] !== '') {
    issues.push('Leave one blank line between the header and the body.')
  }
  return { valid: issues.length === 0, issues }
}

export function commitGuidelines() {
  return [
    'Format: type(scope)!: subject',
    `Types: ${TYPES.join(', ')}`,
    'Scope is optional and names the affected module, e.g. feat(parser): ...',
    'Add "!" before the colon for a breaking change, and explain it in the body.',
    'Subject: imperative mood, lowercase start, no trailing period, <= 72 chars.',
    'Body (optional): wrap at 100 chars; explain WHAT changed and WHY, not HOW.',
    'Footer (optional): "BREAKING CHANGE: ..." or issue refs like "Closes #123".',
    'Example:',
    '  feat(auth): add OAuth login',
    '',
    '  Adds an OAuth 2.0 flow with PKCE for the /login endpoint.',
    '  Session cookies are now HttpOnly.',
    '',
    '  Closes #142',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx) {
  const disposers = []

  disposers.push(
    ctx.tools.register({
      name: 'commit_message_validate',
      description:
        'Validate a git commit message against Conventional Commits and return any issues.',
      parameters: {
        type: 'object',
        properties: { message: { type: 'string', description: 'Full commit message.' } },
        required: ['message'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } },
          },
          required: ['valid', 'issues'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: value.valid ? 'Commit message looks good.' : value.issues.join('\n') },
        ],
      },
      async execute(args) {
        return validateCommitMessage(args.message)
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'commit_message_help',
      description:
        'Return Conventional Commits guidelines and a template. Call this before writing a commit message.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: {
        schema: {
          type: 'object',
          properties: { guidelines: { type: 'string' } },
          required: ['guidelines'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.guidelines }],
      },
      async execute() {
        return { guidelines: commitGuidelines() }
      },
    }),
  )

  return () => disposers.forEach((dispose) => dispose())
}
