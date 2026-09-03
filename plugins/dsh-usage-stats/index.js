/**
 * dsh-usage-stats — live activity counters over the session event stream.
 *
 * Listens to `session/event` and keeps in-memory counters per session:
 * turns, steps, user/assistant messages and tool calls. The `usage_stats`
 * tool reports them; counters reset when the process restarts.
 */

export const name = 'dsh-usage-stats'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
export function createCounter() {
  return {
    turns: 0,
    steps: 0,
    userMessages: 0,
    assistantMessages: 0,
    toolCalls: 0,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
  }
}

export function touchCounter(counter, event, now = Date.now()) {
  counter.lastSeen = now
  switch (event?.type) {
    case 'turn/start': counter.turns += 1; break
    case 'step/start': counter.steps += 1; break
    case 'user/message': counter.userMessages += 1; break
    case 'assistant/message': counter.assistantMessages += 1; break
    case 'tool/call': counter.toolCalls += 1; break
    default: break
  }
  return counter
}

export function formatReport(all) {
  const sessions = Object.entries(all)
  if (!sessions.length) return 'No activity recorded yet.'
  const totals = createCounter()
  const lines = []
  for (const [id, c] of sessions) {
    totals.turns += c.turns
    totals.steps += c.steps
    totals.userMessages += c.userMessages
    totals.assistantMessages += c.assistantMessages
    totals.toolCalls += c.toolCalls
    lines.push(
      `${id}: ${c.turns} turns, ${c.steps} steps, ` +
      `${c.userMessages} user / ${c.assistantMessages} assistant msgs, ${c.toolCalls} tool calls`,
    )
  }
  return (
    `Totals across ${sessions.length} session(s): ${totals.turns} turns, ${totals.steps} steps, ` +
    `${totals.userMessages} user / ${totals.assistantMessages} assistant msgs, ${totals.toolCalls} tool calls\n` +
    lines.join('\n')
  )
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx) {
  const sessions = new Map()

  const offEvent = ctx.on('session/event', (session, event) => {
    const id = session?.id ?? 'unknown'
    if (!sessions.has(id)) sessions.set(id, createCounter())
    touchCounter(sessions.get(id), event)
  })

  const disposeTool = ctx.tools.register({
    name: 'usage_stats',
    description:
      'Report session activity statistics recorded by dsh-usage-stats: turns, steps, ' +
      'user/assistant messages and tool calls per session (since process start).',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: {
        type: 'object',
        properties: {
          report: { type: 'string' },
          sessions: { type: 'number' },
        },
        required: ['report', 'sessions'],
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: value.report }],
    },
    async execute() {
      const all = Object.fromEntries(sessions)
      return { report: formatReport(all), sessions: sessions.size }
    },
  })

  return () => {
    if (typeof offEvent === 'function') offEvent()
    disposeTool()
  }
}
