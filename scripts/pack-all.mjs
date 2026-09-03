/**
 * pack-all.mjs — produce a release tarball for every plugin into dist/.
 *
 * Uses `pnpm pack` (or `npm pack` fallback) per plugin. The tarballs are the
 * artifacts uploaded to a GitHub Release; the marketplace installs from them.
 *
 * Usage: node scripts/pack-all.mjs
 */
import { readdirSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pluginsDir = join(root, 'plugins')
const distDir = join(root, 'dist')
mkdirSync(distDir, { recursive: true })

const packer = existsSync(join(root, 'node_modules', '.bin', 'pnpm.cmd')) ? 'pnpm' : 'npm'

const produced = []
for (const dir of readdirSync(pluginsDir)) {
  const pkgPath = join(pluginsDir, dir, 'package.json')
  if (!existsSync(pkgPath)) continue
  const cwd = join(pluginsDir, dir)
  try {
    const out = execSync(`${packer} pack --pack-destination "${distDir}"`, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }).toString()
    const tgz = out.trim().split(/\r?\n/).pop()
    produced.push(tgz)
    console.log(`packed ${dir} -> ${tgz}`)
  } catch (err) {
    console.error(`FAILED to pack ${dir}: ${err.message}`)
    process.exitCode = 1
  }
}

console.log(`\n${produced.length} tarballs in ${distDir}`)
