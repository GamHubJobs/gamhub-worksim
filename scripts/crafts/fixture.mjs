/**
 * Remakes the Grid Craft fixture of the unit tests
 * (src/apps/sheets/gridcraft/fixtures/everything.gridcraft.json) with the
 * installed Grid Craft, after updating it in crafts.json: the live round-trip
 * browser test, writing what the real app saved.
 */
import { spawnSync } from 'node:child_process'

const result = spawnSync(
  'npx',
  [
    'playwright',
    'test',
    'tests/e2e/gridcraft.spec.ts',
    '-g',
    'round trip, live',
    '--project=chromium',
  ],
  { stdio: 'inherit', shell: true, env: { ...process.env, WRITE_CRAFT_FIXTURE: '1' } },
)
process.exit(result.status ?? 1)
