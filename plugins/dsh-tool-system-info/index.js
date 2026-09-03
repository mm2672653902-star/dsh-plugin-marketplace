/**
 * dsh-tool-system-info — report host machine facts to the agent.
 *
 * OS, CPU, memory, uptime, node runtime and (best-effort) free disk space.
 * Disk probing uses platform-native commands with a short timeout and
 * degrades gracefully when unavailable.
 */
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const pExecFile = promisify(execFile)

export const name = 'dsh-tool-system-info'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Pure logic (unit-tested where deterministic)
// ---------------------------------------------------------------------------
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function staticInfo() {
  const cpus = os.cpus()
  return {
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    os_release: `${os.type()} ${os.release()}`,
    cpu_model: cpus[0]?.model?.trim() ?? 'unknown',
    cpu_cores: cpus.length,
    total_memory: formatBytes(os.totalmem()),
    free_memory: formatBytes(os.freemem()),
    uptime_seconds: Math.floor(os.uptime()),
    node_version: process.version,
    shell_locale: Intl.DateTimeFormat().resolvedOptions().locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

async function probeDisk() {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await pExecFile(
        'powershell',
        ['-NoProfile', '-Command',
          "(Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | " +
          "Select-Object Name, @{n='FreeGB';e={[math]::Round($_.Free/1GB,1)}} | " +
          "ForEach-Object { \"$($_.Name): $($_.FreeGB) GB free\" }) -join '; '"],
        { timeout: 5000, windowsHide: true },
      )
      const text = stdout.trim()
      return text || undefined
    }
    const { stdout } = await pExecFile('df', ['-h', '--output=target,size,avail', '-x', 'tmpfs'], { timeout: 5000 })
    return stdout.trim() || undefined
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
export function apply(ctx) {
  const dispose = ctx.tools.register({
    name: 'system_info',
    description:
      'Report information about the host machine: OS, CPU model and cores, memory, ' +
      'uptime, node version, timezone and free disk space.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: {
        type: 'object',
        properties: {
          hostname: { type: 'string' },
          platform: { type: 'string' },
          arch: { type: 'string' },
          os_release: { type: 'string' },
          cpu_model: { type: 'string' },
          cpu_cores: { type: 'number' },
          total_memory: { type: 'string' },
          free_memory: { type: 'string' },
          uptime_seconds: { type: 'number' },
          node_version: { type: 'string' },
          timezone: { type: 'string' },
          disk: { type: 'string' },
        },
        required: ['hostname', 'platform', 'arch', 'os_release', 'cpu_model', 'cpu_cores',
          'total_memory', 'free_memory', 'node_version', 'timezone'],
        additionalProperties: false,
      },
      render: (_args, value) => [
        {
          type: 'text',
          text:
            `${value.hostname} (${value.os_release}, ${value.platform}/${value.arch})\n` +
            `CPU: ${value.cpu_model} x${value.cpu_cores}\n` +
            `Memory: ${value.free_memory} free of ${value.total_memory}\n` +
            (value.disk ? `Disk: ${value.disk}\n` : '') +
            `Node ${value.node_version}, tz ${value.timezone}`,
        },
      ],
    },
    async execute(_args, exec) {
      const info = staticInfo()
      if (exec.signal.aborted) throw new Error('aborted')
      const disk = await probeDisk()
      return disk ? { ...info, disk } : info
    },
  })
  return dispose
}
