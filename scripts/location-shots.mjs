/**
 * Takes a screenshot of every location (the office, home's rooms, the street
 * and each place in the neighbourhood) for the development report, into
 * docs/screenshots/locations.
 *
 * Usage: `npm run shots:locations` (it starts the development server itself).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve('docs/screenshots/locations')
mkdirSync(dir, { recursive: true })
const result = spawnSync(
  'npx',
  [
    'playwright',
    'test',
    'tests/e2e/locations.spec.ts',
    '--project=chromium',
    '--retries=0',
  ],
  { stdio: 'inherit', shell: true, env: { ...process.env, SHOTS_DIR: dir } },
)
process.exit(result.status ?? 1)
