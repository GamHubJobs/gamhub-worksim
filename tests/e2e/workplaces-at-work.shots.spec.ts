import { expect, test, type Page } from '@playwright/test'

// Every career's workplace at work, for review by eye, at High graphics (or
// SHOTS_QUALITY=low): the afternoon huddle at the workplace's main equipment,
// and the workplace's equipment (in the themed workplaces, with the task lamps
// and their tags). The player is put just behind each piece of equipment, facing
// it (development hook `__worksimPlace`), rather than walked there: on a
// computer without a graphics card, walking at High takes too long.
// Opt in with SHOTS_DIR.

const DIR = process.env.SHOTS_DIR
test.skip(!DIR, 'Set SHOTS_DIR to take the screenshots')
test.setTimeout(1_200_000)

const CAREERS: Array<[string, RegExp, string[]]> = [
  ['finance', /Office Administration & Finance/, ['post-table']],
  ['accounting', /^Accounting/, ['filing-cabinets']],
  ['it', /IT Help Desk/, []],
  ['marketing', /Digital Marketing/, ['campaign-wall']],
  ['data', /Data Analysis/, ['standing-table']],
  ['dev', /Software Development/, ['sprint-board']],
  ['healthcare', /Healthcare & Medical Services/, ['medicines-trolley']],
  ['law', /Law & Legal Services/, ['court-list', 'law-library']],
  ['engineering', /Engineering & Technical Services/, ['beam-rig', 'test-bench']],
]

async function start(page: Page, career: RegExp) {
  await page.addInitScript(
    (q) => localStorage.setItem('worksim.graphics.v1', q),
    process.env.SHOTS_QUALITY ?? 'high',
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('radio', { name: career }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 300_000,
  })
  await page.evaluate('window.__worksimSpeed = 12')
  await page.evaluate('window.__worksim.setTime(1, 14 * 60 + 31)')
}

for (const [id, career, activities] of CAREERS) {
  test(`the ${id} workplace at work`, async ({ page }) => {
    await start(page, career)
    // The huddle gathering at the main work station.
    await expect
      .poll(
        async () =>
          (await page.evaluate(
            "(window.__worksimNpcs ?? []).filter((p) => p.place?.startsWith('huddle:') && p.status === 'there').length",
          )) as number,
        { timeout: 300_000, intervals: [3000] },
      )
      .toBe(3)
    await page.screenshot({ path: `${DIR}/${id}-huddle-from-desk.png` })
    type Anchor = { id: string; x: number; z: number; heading: number }
    const anchors = (await page.evaluate('window.__worksimEquipment')) as Anchor[]
    // The huddle, at the first work station, then each piece of equipment.
    const views = [
      { name: 'huddle', at: anchors[0] },
      ...activities.map((a) => ({ name: a, at: anchors.find((x) => x.id === a)! })),
    ]
    for (const { name, at } of views) {
      expect(at, name).toBeDefined()
      // 2.2 m behind where it is used, facing it (forward is −sin h, −cos h).
      const x = at.x + Math.sin(at.heading) * 2.2
      const z = at.z + Math.cos(at.heading) * 2.2
      await page.evaluate(`window.__worksimPlace(${x}, ${z}, ${at.heading})`)
      await page.waitForTimeout(8000)
      await page.screenshot({ path: `${DIR}/${id}-at-${name}.png` })
    }
  })
}
