/**
 * build-registry.mjs — scan plugins/ and emit marketplace/registry.json.
 *
 * The registry is the single source of truth the static marketplace page
 * reads. Each entry carries enough metadata to render a card and to build
 * install commands / tarball URLs.
 *
 * Usage: node scripts/build-registry.mjs [--owner <gh-owner>] [--repo <name>] [--version <v>]
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pluginsDir = join(root, 'plugins')

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

const owner = opt('owner', 'mm2672653902-star')
const repo = opt('repo', 'dsh-plugin-marketplace')
const version = opt('version', '0.1.0')

const CATEGORY = {
  'dsh-tool-text': ['tools', ''],
  'dsh-tool-calculator': ['tools', '🧮'],
  'dsh-tool-datetime': ['tools', '🕒'],
  'dsh-tool-generator': ['tools', '🎲'],
  'dsh-tool-system-info': ['tools', '🖥️'],
  'dsh-notes': ['productivity', '🗒️'],
  'dsh-reminder': ['productivity', '⏰'],
  'dsh-usage-stats': ['productivity', '📊'],
  'dsh-skill-git-commit': ['developer', '🧑‍💻'],
  'dsh-safety-guard': ['safety', '🛡️'],
  'dsh-theme-ink': ['ui', '🎨'],
  'dsh-ui-session-badge': ['ui', '🪪'],
}

const plugins = []
for (const dir of readdirSync(pluginsDir)) {
  const pkgPath = join(pluginsDir, dir, 'package.json')
  if (!existsSync(pkgPath)) continue
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  if (!pkg.dsh?.bundle) continue // only bundles are installable plugins
  const [category, icon] = CATEGORY[pkg.name] ?? ['other', '🧩']
  plugins.push({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description ?? '',
    category,
    icon,
    ui: Boolean(pkg.dsh?.client),
    keywords: pkg.keywords ?? [],
    tarball: `https://github.com/${owner}/${repo}/releases/download/v${version}/${pkg.name}-${pkg.version}.tgz`,
  })
}

plugins.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

const registry = {
  owner,
  repo,
  version,
  generatedAt: new Date().toISOString(),
  baseUrl: `https://${owner}.github.io/${repo}`,
  plugins,
}

const out = join(root, 'marketplace', 'registry.json')
writeFileSync(out, JSON.stringify(registry, null, 2))
console.log(`Wrote ${out} with ${plugins.length} plugins.`)
