/**
 * Puts the office apps (Grid Craft, …) where the game serves them:
 * public/crafts/<app>/. Each is the official, unmodified web build from its
 * GitHub release, pinned in crafts.json by version and SHA-256. The download
 * is kept in .cache/crafts/, so this needs the network only once per version;
 * neither folder is committed (see docs/CRAFT_APPS.md).
 *
 * Runs before `npm run dev` and `npm run build`. Without the network (and no
 * cached download) it warns and goes on: the game then uses its own basic
 * editors.
 *
 *   node scripts/crafts/fetch.mjs          only what is missing or out of date
 *   node scripts/crafts/fetch.mjs --force  everything again
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const manifest = JSON.parse(
  readFileSync(join(root, 'scripts/crafts/crafts.json'), 'utf8'),
)
const force = process.argv.includes('--force')
const cacheDir = join(root, '.cache/crafts')

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function download(app, spec) {
  const cached = join(cacheDir, `${app}-${spec.version}.zip`)
  if (existsSync(cached)) {
    const bytes = readFileSync(cached)
    if (sha256(bytes) === spec.sha256) return bytes
  }
  console.log(`crafts: downloading ${spec.title} ${spec.version}…`)
  const response = await fetch(spec.url)
  if (!response.ok) throw new Error(`${spec.url}: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const actual = sha256(bytes)
  if (actual !== spec.sha256)
    throw new Error(
      `${spec.title}: checksum ${actual}, expected ${spec.sha256}; not used`,
    )
  mkdirSync(cacheDir, { recursive: true })
  writeFileSync(cached, bytes)
  return bytes
}

async function install(app, spec) {
  const target = join(root, 'public/crafts', app)
  const marker = join(target, 'craft.json')
  if (!force && existsSync(marker)) {
    const installed = JSON.parse(readFileSync(marker, 'utf8'))
    if (installed.version === spec.version && installed.sha256 === spec.sha256) return
  }
  const files = unzipSync(new Uint8Array(await download(app, spec)))
  rmSync(target, { recursive: true, force: true })
  const prefix = `${spec.folder}/`
  let count = 0
  for (const [name, data] of Object.entries(files)) {
    if (!name.startsWith(prefix) || name.endsWith('/')) continue
    const relative = name.slice(prefix.length)
    // Server samples for other hosts; the game's own server and service worker serve these files.
    if (relative === '_headers' || relative === '.htaccess') continue
    if (relative.split('/').includes('..'))
      throw new Error(`${spec.title}: bad path ${name}`)
    const path = join(target, relative)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, data)
    count++
  }
  if (!existsSync(join(target, 'index.html')))
    throw new Error(`${spec.title}: the download has no index.html`)
  writeFileSync(
    marker,
    JSON.stringify(
      {
        app,
        title: spec.title,
        version: spec.version,
        sha256: spec.sha256,
        source: spec.source,
        license: spec.license,
      },
      null,
      2,
    ),
  )
  console.log(`crafts: ${spec.title} ${spec.version} installed (${count} files)`)
}

let failed = false
for (const [app, spec] of Object.entries(manifest)) {
  try {
    await install(app, spec)
  } catch (error) {
    failed = true
    console.warn(`crafts: ${spec.title} not installed: ${error.message}`)
  }
}
if (failed)
  console.warn('crafts: the game will use its basic editors where an app is missing.')
