/**
 * Takes the workplace environment tour: every career's floor, its areas, and
 * the character doing each workplace activity at its object, for review,
 * into docs/screenshots/environments.
 *
 * Usage: `npm run shots:environments` (it starts the development server itself).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve('docs/screenshots/environments')
mkdirSync(dir, { recursive: true })
const result = spawnSync(
  'npx',
  [
    'playwright',
    'test',
    'tests/e2e/environments.shots.spec.ts',
    '--project=chromium',
    '--retries=0',
  ],
  { stdio: 'inherit', shell: true, env: { ...process.env, SHOTS_DIR: dir } },
)
process.exit(result.status ?? 1)
