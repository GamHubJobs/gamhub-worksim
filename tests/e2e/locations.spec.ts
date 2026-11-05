import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Screenshots of every location, for the development report. Opt in with
// SHOTS_DIR (the folder to write to): npm run shots:locations

const DIR = process.env.SHOTS_DIR
const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')

test.skip(!DIR, 'Set SHOTS_DIR to take location screenshots')
test.setTimeout(180_000)

async function shot(page: Page, testId: string, name: string) {
  const view = page.getByTestId(testId)
  await expect(view).toBeVisible()
  // Let the 3D view load and settle.
  await page.waitForTimeout(2500)
  await view.screenshot({ path: `${DIR}/${name}.png` })
}

test('every location', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await shot(page, 'office', 'office-reception')
  for (const [spot, name] of [
    ['Your desk', 'office-desk'],
    ['’s office', 'office-manager'],
    ['Break room', 'office-breakroom'],
  ]) {
    const button = page
      .getByRole('navigation', { name: 'Places' })
      .getByRole('button', { name: new RegExp(spot) })
    if (await button.count()) {
      await button.first().click()
      await shot(page, 'office', name)
    }
  }

  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: /Reception/ })
    .click()
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 15_000 })
  for (const room of ['Living room', 'Kitchen', 'Bedroom', 'Bathroom']) {
    await home(page)
      .getByRole('navigation', { name: 'Rooms' })
      .getByRole('button', { name: room })
      .click()
    await shot(page, 'home-3d', `home-${room.split(' ')[0].toLowerCase()}`)
  }

  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page)).toContainText('Out in the neighbourhood')
  await shot(page, 'city-3d', 'street')
  for (const place of ['cafe', 'shop', 'gym', 'park', 'garage']) {
    await city(page).getByTestId(`place-${place}`).click()
    await expect(city(page).getByTestId('place')).toBeVisible()
    await shot(page, 'city-3d', place)
    await city(page).getByRole('button', { name: 'Back out to the street' }).click()
  }
})
