/**
 * Writes dist/sw.js after a production build: the service worker template
 * with the list of every built file and a version that changes whenever any
 * file changes (a hash of all of them).
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
        .sort()
      const hash = createHash('sha256')
      for (const file of files) {
        hash.update(file)
        hash.update(readFileSync(join(outDir, file)))
      }
      const version = hash.digest('hex').slice(0, 16)
      const template = readFileSync(resolve('scripts/pwa/sw-template.js'), 'utf8')
      const list = ['./', ...files.map((f) => `./${f}`)]
      writeFileSync(
        join(outDir, 'sw.js'),
        template
          .replace("'__VERSION__'", JSON.stringify(version))
          .replace('__FILES__', JSON.stringify(list, null, 2)),
      )
      this.info?.(
        `service worker: ${list.length} files, version ${version} (${relative(process.cwd(), outDir)}/sw.js)`,
      )
    },
  }
}
