import { expect, test, type Locator, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Screenshots of the character's physical activities, for the development
// report. Opt in with SHOTS_DIR: npm run shots:interactions

const DIR = process.env.SHOTS_DIR
test.skip(!DIR, 'Set SHOTS_DIR to take interaction screenshots')
test.setTimeout(600_000)

/** Activities play slowly here, so a screenshot lands in the middle of one. */
const SLOW =
  "window.__worksimSpeed = 0.3; sessionStorage.setItem('worksim.testSpeed', '0.3')"

async function shot(view: Locator, name: string) {
  await view.screenshot({ path: `${DIR}/${name}.png` })
}

async function evening(page: Page, day = 1) {
  await page.evaluate(`window.__worksim.setTime(${day}, 17 * 60 + 35)`)
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Reception' })
    .click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: 'Go home' })
    .click({ timeout: 90_000 })
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(page.getByTestId('home')).toContainText('Evening at home', {
    timeout: 20_000,
  })
}

async function goOut(page: Page) {
  const home = page.getByTestId('home')
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
}

/** Into a place, start an activity from its list, and photograph it at moments. */
async function inPlace(
  page: Page,
  place: string,
  action: RegExp,
  shots: Array<[number, string]>,
) {
  const city = page.getByTestId('city')
  await city.getByTestId(`place-${place}`).click()
  const view = city.getByTestId('city-3d')
  await expect(view.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  await city.getByTestId('place').getByRole('button', { name: action }).first().click()
  for (const [wait, name] of shots) {
    await page.waitForTimeout(wait)
    await shot(view, name)
  }
  await city.getByRole('button', { name: 'Back out to the street' }).click()
}

test('the character at work and at leisure', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 1100 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await page.evaluate(SLOW)
  const office = page.getByTestId('office-3d')
  await expect(office.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  // The office: to the desk, and sitting down at the computer.
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await page.waitForTimeout(9000)
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Use your computer/ })
    .click()
  await page.waitForTimeout(6000)
  if (await office.count()) await shot(office, 'office-sitting-down')
  await page.getByRole('button', { name: 'Leave desk' }).click({ timeout: 90_000 })
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })

  // Home: cooking and the shower.
  await evening(page)
  const home = page.getByTestId('home')
  const flat = home.getByTestId('home-3d')
  await expect(flat.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Kitchen' })
    .click()
  await home.getByRole('button', { name: /Cook dinner/ }).click()
  await page.waitForTimeout(14_000)
  await shot(flat, 'home-cooking')
  await page.waitForTimeout(30_000)
  await shot(flat, 'home-eating')
  await page.waitForTimeout(25_000)
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Bathroom' })
    .click()
  await home.getByRole('button', { name: /Have a shower/ }).click()
  await page.waitForTimeout(36_000)
  await shot(flat, 'home-shower')
  await page.waitForTimeout(40_000)

  // Out: the gym, the café and the shop.
  await goOut(page)
  await inPlace(page, 'gym', /Work out/, [
    [12_000, 'gym-bench-lying-down'],
    [14_000, 'gym-bench-press'],
  ])
  await inPlace(page, 'cafe', /Coffee and a slice/, [
    [7_000, 'cafe-ordering'],
    [26_000, 'cafe-drinking'],
  ])
  await inPlace(page, 'shop', /week of groceries/, [[16_000, 'shop-basket']])

  // Home to bed.
  await page.getByTestId('city').getByTestId('place-home').click()
  await expect(flat.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3000)
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Bedroom' })
    .click()
  await home.getByRole('button', { name: /Go to bed/ }).click()
  await page.waitForTimeout(16_000)
  await shot(flat, 'home-sleeping')
})

test('rain in the street', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 1100 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  // Day 2 is a rainy day.
  await evening(page, 2)
  await goOut(page)
  const view = page.getByTestId('city-3d')
  await expect(view.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await view.focus()
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(1500)
  await page.keyboard.up('KeyW')
  await page.waitForTimeout(1500)
  await shot(view, 'street-rain')
})
