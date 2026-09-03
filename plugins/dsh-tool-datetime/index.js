/**
 * dsh-tool-datetime — current time, timestamp conversion and date diffs.
 *
 * Uses the built-in Intl/Temporal-free APIs only (Node ships full ICU),
 * so no dependencies are needed.
 */

export const name = 'dsh-tool-datetime'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested)
// ---------------------------------------------------------------------------
export function parseInput(value) {
  if (value === undefined || value === null || value === 'now') return new Date()
  if (typeof value === 'number') return new Date(value < 1e12 ? value * 1000 : value)
  const text = String(value).trim()
  if (/^\d{1,10}$/.test(text)) return new Date(Number(text) * 1000) // unix seconds
  if (/^\d{11,13}$/.test(text)) return new Date(Number(text)) // unix millis
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) throw new Error(`Cannot parse date "${value}"`)
  return date
}

export function formatInTimeZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]))
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}`,
    offsetMinutes: timeZoneOffsetMinutes(date, timeZone),
  }
}

export function timeZoneOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]))
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day,
    parts.hour === '24' ? 0 : parts.hour, parts.minute, parts.second)
  return Math.round((asUTC - date.getTime()) / 60000)
}

export function describeNow(timeZone) {
  const date = new Date()
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
  let formatted
  try {
    formatted = formatInTimeZone(date, zone)
  } catch {
    throw new Error(`Unknown timezone "${zone}"`)
  }
  const offset = formatted.offsetMinutes
  const sign = offset >= 0 ? '+' : '-'
  const oh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const om = String(Math.abs(offset) % 60).padStart(2, '0')
  return {
    iso_local: `${formatted.iso}${sign}${oh}:${om}`,
    iso_utc: date.toISOString(),
    unix_seconds: Math.floor(date.getTime() / 1000),
    unix_millis: date.getTime(),
    timezone: zone,
    weekday: new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(date),
  }
}

export function describeDiff(from, to) {
  const a = parseInput(from)
  const b = parseInput(to)
  const ms = b.getTime() - a.getTime()
  const seconds = Math.round(ms / 1000)
  return {
    milliseconds: ms,
    seconds,
    minutes: +(seconds / 60).toFixed(4),
    hours: +(seconds / 3600).toFixed(4),
    days: +(seconds / 86400).toFixed(4),
    human: humanDuration(Math.abs(ms)),
    direction: ms >= 0 ? 'b is after a' : 'b is before a',
  }
}

function humanDuration(ms) {
  const units = [
    ['day', 86400000], ['hour', 3600000], ['minute', 60000], ['second', 1000],
  ]
  const parts = []
  let rest = ms
  for (const [label, size] of units) {
    const count = Math.floor(rest / size)
    if (count > 0) {
      parts.push(`${count} ${label}${count > 1 ? 's' : ''}`)
      rest -= count * size
    }
  }
  return parts.length ? parts.join(' ') : '0 seconds'
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx) {
  const disposers = []

  disposers.push(
    ctx.tools.register({
      name: 'datetime_now',
      description:
        'Get the current date and time: local ISO, UTC ISO, unix timestamps, weekday. ' +
        'Optionally for another IANA timezone (e.g. "Asia/Shanghai", "America/New_York").',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: 'IANA timezone; defaults to system timezone.' },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            iso_local: { type: 'string' },
            iso_utc: { type: 'string' },
            unix_seconds: { type: 'number' },
            unix_millis: { type: 'number' },
            timezone: { type: 'string' },
            weekday: { type: 'string' },
          },
          required: ['iso_local', 'iso_utc', 'unix_seconds', 'timezone', 'weekday'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: `${value.iso_local} (${value.timezone}, ${value.weekday}) — UTC ${value.iso_utc}` },
        ],
      },
      async execute(args) {
        return describeNow(args.timezone)
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'datetime_convert',
      description:
        'Convert a date/time between representations: accepts unix seconds/millis, ISO strings ' +
        'or "now"; returns ISO in the requested timezone plus unix timestamps.',
      parameters: {
        type: 'object',
        properties: {
          value: {
            type: 'string',
            description: 'Date to convert: ISO string, unix seconds/millis as digits, or "now".',
          },
          timezone: { type: 'string', description: 'Target IANA timezone.' },
        },
        required: ['value'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            iso_utc: { type: 'string' },
            iso_local: { type: 'string' },
            timezone: { type: 'string' },
            unix_seconds: { type: 'number' },
          },
          required: ['iso_utc', 'iso_local', 'timezone', 'unix_seconds'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: `${value.iso_local} (${value.timezone}) — UTC ${value.iso_utc}` },
        ],
      },
      async execute(args) {
        const date = parseInput(args.value)
        const zone = args.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        let formatted
        try {
          formatted = formatInTimeZone(date, zone)
        } catch {
          throw new Error(`Unknown timezone "${zone}"`)
        }
        const offset = formatted.offsetMinutes
        const sign = offset >= 0 ? '+' : '-'
        const oh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
        const om = String(Math.abs(offset) % 60).padStart(2, '0')
        return {
          iso_utc: date.toISOString(),
          iso_local: `${formatted.iso}${sign}${oh}:${om}`,
          timezone: zone,
          unix_seconds: Math.floor(date.getTime() / 1000),
        }
      },
    }),
  )

  disposers.push(
    ctx.tools.register({
      name: 'datetime_diff',
      description:
        'Compute the difference between two dates (each given as ISO string, unix timestamp or "now").',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'ISO string, unix seconds/millis as digits, or "now".' },
          to: { type: 'string', description: 'ISO string, unix seconds/millis as digits, or "now".' },
        },
        required: ['from', 'to'],
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            seconds: { type: 'number' },
            minutes: { type: 'number' },
            hours: { type: 'number' },
            days: { type: 'number' },
            human: { type: 'string' },
            direction: { type: 'string' },
          },
          required: ['seconds', 'days', 'human', 'direction'],
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: 'text', text: `${value.human} (${value.direction})` },
        ],
      },
      async execute(args) {
        return describeDiff(args.from, args.to)
      },
    }),
  )

  return () => disposers.forEach((dispose) => dispose())
}
