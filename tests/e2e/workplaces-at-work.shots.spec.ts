import { expect, test, type Page } from '@playwright/test'

// Every career's workplace at work, for review by eye (High graphics unless
// SHOTS_QUALITY=low: on a machine without a graphics card, High is too slow to
// walk to the equipment): the
// afternoon huddle at the workplace's main equipment, the player at another
// piece of equipment beside it (in the themed workplaces, with the task lamps
// and their tags), and the team board. Opt in with SHOTS_DIR.

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
    for (const activity of activities) {
      await page.waitForFunction('typeof window.__worksimWalk === "function"')
      await page.evaluate(`window.__worksimWalk('${activity}')`)
      const doing = page.getByTestId('activity')
      const leave = page.getByRole('button', { name: /Leave desk/ })
      for (let t = 0; t < 1200; t++) {
        const text = (await doing.isVisible())
          ? await doing.innerText({ timeout: 1000 }).catch(() => '')
          : ''
        if (text && !text.includes('Going to')) break
        if (
          (await leave.isVisible()) ||
          (await page.getByRole('button', { name: /Step back/ }).isVisible())
        )
          break
        await page.waitForTimeout(100)
      }
      await page.screenshot({ path: `${DIR}/${id}-at-${activity}.png` })
      // The work opens at the computer (Leave desk) or on the tablet (Step back).
      const back = page.getByRole('button', { name: /Step back/ })
      const open = leave.or(back)
      await expect(open.first()).toBeVisible({ timeout: 300_000 })
      await open.first().click()
      await expect(open).toHaveCount(0, { timeout: 120_000 })
      await page.waitForTimeout(4000)
      await page.screenshot({ path: `${DIR}/${id}-after-${activity}.png` })
    }
  })
}
