import { expect, test, type Page } from '@playwright/test'

// A tour of every career's workplace, for reviewing the environments by eye:
// the first view, each area of the floor, and the character doing each of the
// workplace's own activities at its object (then the tool it opens).
// Opt in with SHOTS_DIR: npm run shots:environments

const DIR = process.env.SHOTS_DIR
test.skip(!DIR, 'Set SHOTS_DIR to take environment screenshots')
test.setTimeout(900_000)

const CAREERS: Array<[string, RegExp, string[]]> = [
  ['finance', /Office Administration & Finance/, ['supplies-cupboard', 'post-table']],
  ['accounting', /^Accounting/, ['ledger-desk', 'filing-cabinets']],
  ['it', /IT Help Desk/, []],
  ['marketing', /Digital Marketing/, ['photo-set', 'campaign-wall']],
  ['data', /Data Analysis/, ['dashboard-wall', 'standing-table']],
  ['dev', /Software Development/, ['pairing-desk', 'sprint-board']],
  [
    'healthcare',
    /Healthcare & Medical Services/,
    ['bedside', 'medicines-trolley', 'treatment-room'],
  ],
  [
    'law',
    /Law & Legal Services/,
    ['counsel-table', 'court-list', 'law-library', 'client-room'],
  ],
  [
    'engineering',
    /Engineering & Technical Services/,
    ['test-bench', 'beam-rig', 'cad-station', 'plot-room', 'project-room'],
  ],
]

async function start(page: Page, career: RegExp) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('radio', { name: career }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  // After the morning stand-up, so a meeting starting does not interrupt the tour.
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 30)')
  // Activities play slowly, so each is photographed in the middle (as interactions.shots).
  await page.evaluate(
    "window.__worksimSpeed = 0.3; sessionStorage.setItem('worksim.testSpeed', '0.3')",
  )
  await page.waitForTimeout(2500)
}

for (const [id, career, activities] of CAREERS) {
  test(`the ${id} workplace`, async ({ page }) => {
    await start(page, career)
    await page.screenshot({ path: `${DIR}/${id}-0-arrival.png` })
    const places = page.getByRole('navigation', { name: 'Places' }).getByRole('button')
    const count = await places.count()
    for (let i = 0; i < count; i++) {
      const name = (await places.nth(i).innerText()).trim()
      await places.nth(i).click()
      await page.waitForTimeout(7000)
      await page.screenshot({
        path: `${DIR}/${id}-${i + 1}-${name.replace(/[^a-z]+/gi, '-').toLowerCase()}.png`,
      })
    }
    for (const [n, activity] of activities.entries()) {
      await expect(page.getByTestId('office-panel')).toBeVisible({ timeout: 60_000 })
      await page.waitForFunction('typeof window.__worksimWalk === "function"')
      await page.evaluate(`window.__worksimWalk('${activity}')`)
      // Mid-activity, at the object (not still walking there): watched closely,
      // since on a busy machine the stages can pass in a few frames.
      const doing = page.getByTestId('activity')
      const leave = page.getByRole('button', { name: /Leave desk/ })
      let caught = false
      for (let t = 0; t < 600 && !caught; t++) {
        const text = (await doing.isVisible())
          ? await doing.innerText().catch(() => '')
          : ''
        if (text && !text.includes('Going to')) {
          await page.screenshot({ path: `${DIR}/${id}-a${n + 1}-${activity}.png` })
          caught = true
        } else if (await leave.isVisible()) break
        else await page.waitForTimeout(100)
      }
      if (!caught)
        console.log(`${id}: ${activity} finished before it could be photographed`)
      // Then the computer opens at that app or tool; back to the floor.
      await expect(leave).toBeVisible({ timeout: 60_000 })
      await page.screenshot({ path: `${DIR}/${id}-a${n + 1}-${activity}-opens.png` })
      await leave.click()
      await expect(leave).toBeHidden({ timeout: 60_000 })
      await page.waitForTimeout(1500)
    }
  })
}
