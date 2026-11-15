/**
 * The home and the neighbourhood, photographed for review (as the workplace
 * tour is in environments.shots.spec.ts): every room of the flat, the street
 * by day and evening, and inside each place. Opt-in: set SHOTS_DIR.
 */
import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

const DIR = process.env.SHOTS_DIR
test.skip(!DIR, 'Set SHOTS_DIR to take the home and city screenshots')
test.setTimeout(600_000)

const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')

async function evening(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 30_000 })
}

test('home: every room', async ({ page }) => {
  await evening(page)
  const rooms = home(page).getByRole('navigation', { name: 'Rooms' }).getByRole('button')
  const count = await rooms.count()
  for (let i = 0; i < count; i++) {
    const name = (await rooms.nth(i).innerText()).trim()
    await rooms.nth(i).click()
    await page.waitForTimeout(5000)
    await page.screenshot({
      path: `${DIR}/home-${i + 1}-${name.replace(/[^a-z]+/gi, '-').toLowerCase()}.png`,
    })
  }
})

test('the street and every place in it', async ({ page }) => {
  await evening(page)
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page)).toContainText('Out in the neighbourhood')
  await page.waitForTimeout(5000)
  await page.screenshot({ path: `${DIR}/city-0-street-evening.png` })
  for (const id of ['cafe', 'shop', 'gym', 'park', 'garage']) {
    const button = city(page).getByTestId(`place-${id}`)
    if (await button.isDisabled()) continue
    await button.click()
    await expect(city(page).getByTestId('place')).toBeVisible()
    await page.waitForTimeout(6000)
    await page.screenshot({ path: `${DIR}/city-${id}.png` })
    await city(page).getByRole('button', { name: 'Back out to the street' }).click()
    await page.waitForTimeout(1500)
  }
})
