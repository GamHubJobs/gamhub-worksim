import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// The neighbourhood: stepping out of the front door, walking the street in 3D
// and from the list of places, going in, and walking to work in the morning.

const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')

async function endTheDay(page: Page) {
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 15_000 })
}

async function goOut(page: Page) {
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page)).toContainText('Out in the neighbourhood')
}

let problems: string[] = []

// Activities are played out in 3D (walking over, doing them), so these take longer.
test.setTimeout(180_000)

test.beforeEach(async ({ page }) => {
  problems = []
  page.on('console', (m) => {
    // In development only, React mounts the office twice and its 3D labels say so.
    if (
      m.type() === 'error' &&
      !m.text().startsWith('Attempted to synchronously unmount')
    )
      problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(e.message))
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  // Activities in 3D (walking there, doing them) play faster in tests.
  await page.evaluate('window.__worksimSpeed = 12')
})

// The street, going in and coming out log no errors.
test.afterEach(() => {
  expect(problems).toEqual([])
})

test('an evening out: dinner at the café, the shop, and home again', async ({ page }) => {
  await endTheDay(page)
  await goOut(page)

  // The office is closed in the evening; the café is a short walk.
  await expect(city(page).getByTestId('place-office')).toBeDisabled()
  await expect(city(page).getByTestId('place-office')).toContainText(
    'closed until tomorrow',
  )
  await expect(city(page).getByTestId('place-cafe')).toContainText('2 min walk')

  await city(page).getByTestId('place-cafe').click()
  await expect(city(page).getByTestId('place')).toContainText('Kettle & Crumb')
  const balance = await city(page).getByTestId('balance').textContent()
  await city(page)
    .getByRole('button', { name: /Dinner at the café/ })
    .click()
  // The character orders, sits down and eats in 3D; the meal counts when it is finished.
  await expect(city(page).getByTestId('city-log')).toContainText(
    'Had dinner at Kettle & Crumb',
    { timeout: 30_000 },
  )
  await expect(city(page).getByTestId('balance')).not.toHaveText(balance!)

  // On to the shop for groceries.
  await city(page).getByRole('button', { name: 'Back out to the street' }).click()
  await city(page).getByTestId('place-shop').click()
  await city(page)
    .getByRole('button', { name: /Buy a week of groceries/ })
    .click()
  await expect(city(page).getByTestId('money')).toContainText('11 meals in the fridge', {
    timeout: 30_000,
  })

  // The neighbourhood passes the automated accessibility checks.
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(audit.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])

  // Home, and to bed.
  await city(page).getByRole('button', { name: 'Back out to the street' }).click()
  await city(page).getByTestId('place-home').click()
  await expect(home(page)).toContainText('Evening at home')
  await expect(home(page).getByTestId('home-log')).toContainText('Walked home')
})

test('walking the street in 3D with the keyboard, and going in at a door', async ({
  page,
}) => {
  await endTheDay(page)
  await goOut(page)
  const street = city(page).getByTestId('city-3d')
  test.skip((await street.count()) === 0, 'No 3D in this browser')
  await expect(street.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await street.focus()
  // The café is across the street from home: walk north until at its door.
  await page.keyboard.down('ArrowUp')
  await expect(city(page).getByTestId('prompt')).toContainText('Kettle & Crumb', {
    timeout: 15_000,
  })
  await page.keyboard.up('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(city(page).getByTestId('place')).toContainText('Kettle & Crumb')
})

test('the morning: a gym shower and breakfast out, then walking to work', async ({
  page,
}) => {
  await endTheDay(page)
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Bedroom' })
    .click()
  await home(page)
    .getByRole('button', { name: /Go to bed/ })
    .click()
  await expect(home(page)).toContainText('Morning at home', { timeout: 60_000 })
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Bedroom' })
    .click()
  await home(page)
    .getByRole('button', { name: /Get dressed/ })
    .click()
  await goOut(page)

  await city(page).getByTestId('place-gym').click()
  await city(page)
    .getByRole('button', { name: /Shower in the changing rooms/ })
    .click()
  await expect(city(page).getByTestId('city-log')).toContainText('Showered at the gym', {
    timeout: 30_000,
  })
  await city(page).getByRole('button', { name: 'Back out to the street' }).click()
  await city(page).getByTestId('place-cafe').click()
  await city(page)
    .getByRole('button', { name: /Breakfast at the café/ })
    .click()
  await expect(city(page).getByTestId('city-log')).toContainText(
    'Had breakfast at Kettle & Crumb',
    { timeout: 30_000 },
  )
  await city(page).getByRole('button', { name: 'Back out to the street' }).click()

  await expect(city(page).getByTestId('place-office')).toContainText('40 min walk')
  await city(page).getByTestId('place-office').click()
  await city(page).locator('[data-commute="walk"]').click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

test('Westmark County Court on the street: shut in the evening, with its hours, and on the map', async ({
  page,
}) => {
  await endTheDay(page)
  await goOut(page)
  const street = city(page).getByTestId('city-3d')
  test.skip((await street.count()) === 0, 'No 3D in this browser')
  await expect(street.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.waitForFunction('typeof window.__worksimStreetWalk === "function"')
  await page.evaluate("window.__worksimStreetWalk('door-court')")
  // The character walks up and tries the door: it is shut, and says when it sits.
  const notice = city(page).getByTestId('city-notice')
  await expect(notice).toContainText('closed now', { timeout: 60_000 })
  await expect(notice).toContainText('10 am to 4 pm')
  await page.waitForTimeout(800)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/city/courthouse.png`,
  })
  // Marked on the world map as the court, reached from work.
  await street.focus()
  await page.keyboard.press('m')
  const map = page.getByTestId('world-map')
  await expect(map.getByTestId('map-courthouse')).toBeVisible()
  await expect(map).toContainText('Court (from work)')
  await page.keyboard.press('Escape')
})
