/**
 * Takes screenshots of the character's physical activities (the gym, the café,
 * the shop, home, the office, rain in the street) for the development report,
 * into docs/screenshots/interactions.
 *
 * Usage: `npm run shots:interactions` (it starts the development server itself).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve('docs/screenshots/interactions')
mkdirSync(dir, { recursive: true })
const result = spawnSync(
  'npx',
  [
    'playwright',
    'test',
    'tests/e2e/interactions.shots.spec.ts',
    '--project=chromium',
    '--retries=0',
  ],
  { stdio: 'inherit', shell: true, env: { ...process.env, SHOTS_DIR: dir } },
)
process.exit(result.status ?? 1)
