/**
 * dsh-safety-guard — dangerous-command gate on `tools/pre-execute`.
 *
 * Inspects shell-bearing tool calls (the built-in `bash` tool today) and
 * either denies or escalates to the approval flow when a command matches a
 * destructive pattern. Pure detection logic is exported for unit testing.
 */

export const name = 'dsh-safety-guard'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
export const DEFAULT_RULES = [
  // --- always deny: irreversible at scale ---
  {
    action: 'deny',
    reason: 'Recursive deletion of a filesystem root.',
    pattern: String.raw`\brm\s+(-[a-z]+\s+)*-[a-z]*r[a-z]*f?|--recursive\b.*(/|~|\$HOME)(\s|$|/\*)`,
  },
  {
    action: 'deny',
    reason: 'Recursive forced deletion of a filesystem root.',
    pattern: String.raw`\brm\s+-[a-z]*[rf][a-z]*\s+(/|~|\$HOME)\s*(/\*|\s|$)`,
  },
  { action: 'deny', reason: 'Formatting a block device.', pattern: String.raw`\bmkfs(\.\w+)?\b` },
  { action: 'deny', reason: 'Writing raw data to a block device.', pattern: String.raw`\bdd\b[^\n]*\bof=/dev/` },
  { action: 'deny', reason: 'Overwriting a block device.', pattern: String.raw`>\s*/dev/(sd[a-z]|nvme|hd[a-z]|disk)` },
  { action: 'deny', reason: 'Fork bomb.', pattern: String.raw`:\s*\(\s*\)\s*\{[^}]*\|` },
  { action: 'deny', reason: 'Recursive chmod of a filesystem root.', pattern: String.raw`\bchmod\s+(-R\s+)?777\s+(/|~|\$HOME)\s*$` },
  { action: 'deny', reason: 'Wiping a disk via diskpart.', pattern: String.raw`\bdiskpart\b` },

  // --- ask: destructive but occasionally legitimate ---
  { action: 'ask', reason: 'Formats a drive.', pattern: String.raw`\bformat\s+[a-z]:` },
  { action: 'ask', reason: 'Recursive Windows delete.', pattern: String.raw`\b(rd|del)\s+/s\b` },
  { action: 'ask', reason: 'Deletes Windows volume shadows.', pattern: String.raw`\bvssadmin\s+delete\b` },
  { action: 'ask', reason: 'System power operation.', pattern: String.raw`\b(shutdown|reboot|poweroff|halt)\b` },
  { action: 'ask', reason: 'Drops a database.', pattern: String.raw`\bdrop\s+database\b` },
  { action: 'ask', reason: 'Truncates a table.', pattern: String.raw`\btruncate\s+table\b` },
  {
    action: 'ask',
    reason: 'Pipes a remote script directly into a shell.',
    pattern: String.raw`\b(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(ba|z|da)?sh\b`,
  },
  {
    action: 'ask',
    reason: 'Force push can overwrite remote history.',
    pattern: String.raw`\bgit\s+push\s+(--[a-z-]+\s+)*(--force|-f|--force-with-lease)\b`,
  },
  {
    action: 'ask',
    reason: 'Deletes a git branch.',
    pattern: String.raw`\bgit\s+branch\s+-D\b`,
  },
]

export function compileRules(rules) {
  return rules.map((rule) => ({
    action: rule.action === 'ask' ? 'ask' : 'deny',
    reason: rule.reason ?? 'Blocked by safety guard.',
    regex: new RegExp(rule.pattern, 'i'),
  }))
}

/**
 * Evaluate a command against compiled rules.
 * Returns { action: 'deny'|'ask', reason, pattern } or null when clean.
 */
export function evaluateCommand(command, compiledRules) {
  const text = String(command ?? '')
  for (const rule of compiledRules) {
    if (rule.regex.test(text)) {
      return { action: rule.action, reason: rule.reason, pattern: rule.regex.source }
    }
  }
  return null
}

/** Extract the shell command from a tool execution, if it has one. */
export function commandOf(exec) {
  if (exec?.name === 'bash' && typeof exec.arguments?.command === 'string') {
    return exec.arguments.command
  }
  return null
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx, config = {}) {
  const mode = config.mode === 'ask' ? 'ask' : 'deny'
  const rules = compileRules([...DEFAULT_RULES, ...(config.extraRules ?? [])])

  const dispose = ctx.on('tools/pre-execute', async (exec, next) => {
    const command = commandOf(exec)
    if (command !== null) {
      const hit = evaluateCommand(command, rules)
      if (hit) {
        if (hit.action === 'deny' || mode === 'deny') {
          return {
            kind: 'deny',
            reason: `[dsh-safety-guard] ${hit.reason} (pattern: ${hit.pattern})`,
          }
        }
        return { kind: 'ask', reason: `[dsh-safety-guard] ${hit.reason}` }
      }
    }
    return next()
  })
  return () => {
    if (typeof dispose === 'function') dispose()
  }
}
