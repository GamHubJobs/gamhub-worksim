/**
 * Writes dist/sw.js after a production build: the service worker template
 * with the list of every built file and a version that changes whenever any
 * file changes (a hash of all of them).
 *
 * The office apps (crafts/, tens of megabytes each) are not installed with the
 * game: each is kept, once opened, in a cache of its own named by the apps'
 * versions, so updating the game does not download them again.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'

/** Every file under a folder, as paths relative to it with forward slashes. */
function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory()
      ? filesIn(path).map((f) => `${name}/${f}`)
      : [name]
  })
}

export function serviceWorker(): Plugin {
  let outDir = 'dist'
  return {
    name: 'worksim-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const files = filesIn(outDir)
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map') && !f.startsWith('crafts/'))
        .sort()
      const hash = createHash('sha256')
      for (const file of files) {
        hash.update(file)
        hash.update(readFileSync(join(outDir, file)))
      }
      const version = hash.digest('hex').slice(0, 16)
      // The installed office apps and their versions (scripts/crafts/fetch.mjs).
      const craftsDir = join(outDir, 'crafts')
      const crafts = Object.fromEntries(
        (existsSync(craftsDir) ? readdirSync(craftsDir) : [])
          .filter((app) => existsSync(join(craftsDir, app, 'craft.json')))
          .map((app) => {
            const info = JSON.parse(
              readFileSync(join(craftsDir, app, 'craft.json'), 'utf8'),
            ) as {
              version: string
            }
            return [app, info.version]
          }),
      )
      const template = readFileSync(resolve('scripts/pwa/sw-template.js'), 'utf8')
      const list = ['./', ...files.map((f) => `./${f}`)]
      writeFileSync(
        join(outDir, 'sw.js'),
        template
          .replace("'__VERSION__'", JSON.stringify(version))
          .replace('__FILES__', JSON.stringify(list, null, 2))
          .replace('__CRAFTS__', JSON.stringify(crafts)),
      )
      this.info?.(
        `service worker: ${list.length} files, version ${version} (${relative(process.cwd(), outDir)}/sw.js)`,
      )
    },
  }
}
