import { expect, test, type Page } from '@playwright/test'

// The visual QA tour (docs/VISUAL_QA.md): every career's workplace and every
// place in the neighbourhood, photographed at the High graphics setting (soft
// shadows, reflections, materials), as a player with a graphics card sees them,
// for checking by eye. Opt in with SHOTS_DIR.

const DIR = process.env.SHOTS_DIR
test.skip(!DIR, 'Set SHOTS_DIR to take the visual QA screenshots')
test.setTimeout(900_000)
/** How many of each career's places to photograph (all, unless set). */
const LIMIT = Number(process.env.PLACES_LIMIT ?? 99)

const CAREERS: Array<[string, RegExp]> = [
  ['finance', /Office Administration & Finance/],
  ['accounting', /^Accounting/],
  ['it', /IT Help Desk/],
  ['marketing', /Digital Marketing/],
  ['data', /Data Analysis/],
  ['dev', /Software Development/],
  ['healthcare', /Healthcare & Medical Services/],
  ['law', /Law & Legal Services/],
  ['engineering', /Engineering & Technical Services/],
]

async function start(page: Page, career: RegExp, width = 1440, height = 900) {
  await page.addInitScript(() => localStorage.setItem('worksim.graphics.v1', 'high'))
  await page.setViewportSize({ width, height })
  await page.goto('/')
  await page.getByRole('radio', { name: career }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 30)')
  await page.waitForTimeout(6000)
}

for (const [id, career] of CAREERS) {
  test(`the ${id} workplace, at High`, async ({ page }) => {
    await start(page, career)
    await page.screenshot({ path: `${DIR}/${id}-0-arrival.png` })
    const places = page.getByRole('navigation', { name: 'Places' }).getByRole('button')
    const count = Math.min(LIMIT, await places.count())
    for (let i = 0; i < count; i++) {
      const name = (await places.nth(i).innerText()).trim()
      await places.nth(i).click()
      await page.waitForTimeout(9000)
      await page.screenshot({
        path: `${DIR}/${id}-${i + 1}-${name.replace(/[^a-z]+/gi, '-').toLowerCase()}.png`,
      })
    }
  })
}

test('the flat and the neighbourhood, at High', async ({ page }) => {
  await start(page, /Office Administration & Finance/)
  const home = page.getByTestId('home')
  const city = page.getByTestId('city')
  await page.evaluate('window.__worksim.setTime(1, 17 * 60 + 35)')
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home).toContainText('Evening at home', { timeout: 30_000 })
  await expect(home.getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `${DIR}/home-evening.png` })
  const rooms = home.getByRole('navigation', { name: 'Rooms' })
  await rooms.getByRole('button', { name: 'Kitchen' }).click()
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `${DIR}/home-kitchen.png` })
  await rooms.getByRole('button', { name: 'Front door' }).click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  await expect(city.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `${DIR}/street-evening.png` })
  for (const place of ['cafe', 'shop', 'gym', 'garage', 'offices', 'park']) {
    await city.getByTestId(`place-${place}`).click()
    await expect(city.getByTestId('place')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(9000)
    await page.screenshot({ path: `${DIR}/place-${place}.png` })
    await city.getByRole('button', { name: 'Back out to the street' }).click()
    await page.waitForTimeout(1500)
  }
})
