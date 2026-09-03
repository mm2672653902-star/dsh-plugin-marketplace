/**
 * dsh-reminder — timed reminders injected back into the owning session.
 *
 * `reminder_set` schedules a one-shot timer; when it fires, the reminder
 * text is appended to the session via `agent.inject()` (the agent sees it
 * on its next request). Timers are cleared when the plugin is disposed.
 */

export const name = 'dsh-reminder'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
export function resolveDelayMs({ in_minutes, in_seconds, at }, now = new Date()) {
  if (typeof in_seconds === 'number' && in_seconds > 0) return in_seconds * 1000
  if (typeof in_minutes === 'number' && in_minutes > 0) return in_minutes * 60_000
  if (typeof at === 'string') {
    const target = new Date(at)
    if (Number.isNaN(target.getTime())) throw new Error(`Cannot parse "at" date: ${at}`)
    const delay = target.getTime() - now.getTime()
    if (delay <= 0) throw new Error('The reminder time is already in the past.')
    return delay
  }
  throw new Error('Provide in_seconds, in_minutes or an absolute "at" time.')
}

export function describeDelay(ms) {
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds} seconds`
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes} minute(s)`
  return `${(minutes / 60).toFixed(1)} hour(s)`
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx) {
  /** @type {Map<string, { timer: NodeJS.Timeout, message: string, firesAt: string }>} */
  const pending = new Map()
  let seq = 0

  function fire(id) {
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    const { agent } = entry
    if (!agent) return
    try {
      agent.inject?.({
        content: [{ type: 'text', text: `⏰ Reminder: ${entry.message}` }],
        source: { kind: 'plugin', plugin: 'dsh-reminder' },
      })
    } catch {
      // The agent may have been disposed; drop the reminder quietly.
    }
  }

  const disposers = []

  disposers.push(
    ctx.tools.register({
      name: 'reminder_set',
      description:
        'Schedule a reminder. It is delivered into this session after the delay. ' +
        'Give either a relative delay (in_minutes / in_seconds) or an absolute time "at" (ISO 8601).',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'What to remind about.' },
          in_minutes: { type: 'number' },
          in_seconds: { type: 'number' },
          at: { type: 'string', description: 'Absolute ISO time, e.g. 2026-09-03T18:00:00' },
        },
        required: ['message'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fires_at: { type: 'string' },
            text: { type: 'string' },
          },
          required: ['id', 'fires_at', 'text'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: value.text }],
      },
      async execute(args, exec) {
        const delay = resolveDelayMs(args)
        const id = `rem-${++seq}`
        const firesAt = new Date(Date.now() + delay)
        const timer = setTimeout(() => fire(id), delay)
        timer.unref?.()
        pending.set(id, { timer, message: args.message, firesAt: firesAt.toISOString(), agent: exec.agent })
        return {
          id,
          fires_at: firesAt.toISOString(),
          text: `Reminder set: "${args.message}" in ${describeDelay(delay)} (id ${id}).`,
        }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'reminder_list',
      description: 'List pending reminders.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: {
        schema: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            reminders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  message: { type: 'string' },
                  fires_at: { type: 'string' },
                },
                required: ['id', 'message', 'fires_at'],
                additionalProperties: false,
              },
            },
          },
          required: ['count', 'reminders'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          {
            type: 'text',
            text: value.count === 0
              ? 'No pending reminders.'
              : value.reminders.map((r) => `${r.id}: "${r.message}" at ${r.fires_at}`).join('\n'),
          },
        ],
      },
      async execute() {
        const reminders = [...pending.entries()].map(([id, e]) => ({
          id,
          message: e.message,
          fires_at: e.firesAt,
        }))
        return { count: reminders.length, reminders }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'reminder_cancel',
      description: 'Cancel a pending reminder by its id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: { cancelled: { type: 'boolean' }, id: { type: 'string' } },
          required: ['cancelled', 'id'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: value.cancelled ? `Reminder ${value.id} cancelled.` : `Reminder ${value.id} not found.` },
        ],
      },
      async execute(args) {
        const entry = pending.get(args.id)
        if (!entry) return { cancelled: false, id: args.id }
        clearTimeout(entry.timer)
        pending.delete(args.id)
        return { cancelled: true, id: args.id }
      },
    }),
  )

  return () => {
    for (const entry of pending.values()) clearTimeout(entry.timer)
    pending.clear()
    disposers.forEach((dispose) => dispose())
  }
}
