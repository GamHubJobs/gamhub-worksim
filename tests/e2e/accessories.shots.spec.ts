import { expect, test, type Page } from '@playwright/test'

// The player in their accessories, close up from the front and back, for review
// by eye: safety kit, an office outfit, a day out. Dressed through the
// development hook (`__worksim.setLife`: the wardrobe in the save, so this is
// what the shop and wardrobe produce), placed with `__worksimPlace`.
// Opt in with SHOTS_DIR (and SHOTS_QUALITY=high for High graphics).

const DIR = process.env.SHOTS_DIR
test.skip(!DIR, 'Set SHOTS_DIR to take the screenshots')
test.setTimeout(900_000)

const OUTFITS: Record<string, string[]> = {
  site: [
    'hardhat',
    'glasses-safety',
    'hivis-vest',
    'work-gloves',
    'tool-belt',
    'safety-boots',
    'watch-digital',
    'keyring',
    'tape-measure',
  ],
  office: [
    'glasses-designer',
    'watch-smart',
    'necklace',
    'earrings-hoops',
    'ring-signet',
    'laptop-bag',
    'formal-shoes',
    'briefcase',
    'bangle-silver',
  ],
  out: [
    'cap',
    'sunglasses',
    'earbuds',
    'backpack',
    'sneakers',
    'fitness-tracker',
    'chain',
  ],
  music: ['headphones', 'chain', 'shoulder-bag', 'sandals', 'watch-classic', 'wallet'],
}

async function dress(page: Page, ids: string[]) {
  const owned = ids.map((id) => ({
    uid: id,
    id,
    colour: 0,
    bought: 1,
    paid: 100,
    condition: 100,
  }))
  await page.evaluate(
    (wardrobe) =>
      (
        globalThis as unknown as { __worksim: { setLife: (p: unknown) => void } }
      ).__worksim.setLife({ wardrobe }),
    { owned, worn: ids, packed: [], history: [], woreDay: 0 },
  )
}

test('the player in their accessories', async ({ page }) => {
  await page.addInitScript(
    (q) => localStorage.setItem('worksim.graphics.v1', q),
    process.env.SHOTS_QUALITY ?? 'low',
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page
    .getByRole('radio', { name: /Office Administration/ })
    .first()
    .check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 30_000 })
  const leave = page.getByRole('button', { name: 'Leave desk', exact: true })
  if (await leave.isVisible().catch(() => false)) await leave.click()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 300_000,
  })
  await page.waitForFunction('typeof window.__worksimPlace === "function"')
  // Open floor by reception.
  const at = { x: -7.5, z: 6.2 }
  for (const [name, ids] of Object.entries(OUTFITS)) {
    await dress(page, ids)
    for (const [side, yaw] of [
      ['front', Math.PI],
      ['back', 0],
    ] as const) {
      await page.evaluate(
        ([x, z, y]) =>
          (
            globalThis as unknown as {
              __worksimPlace: (x: number, z: number, h: number, v: object) => void
            }
          ).__worksimPlace(x, z, 0, { yaw: y, distance: 1.7, pitch: 0.12 }),
        [at.x, at.z, yaw] as const,
      )
      await page.waitForTimeout(5000)
      await page.screenshot({ path: `${DIR}/player-${name}-${side}.png` })
    }
  }
})
