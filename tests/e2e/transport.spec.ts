import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Getting around: buying a bike, riding it round the neighbourhood and to
// work, and the choice of ways to work at the end of the street.

const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')

async function rooms(page: Page, name: string) {
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name })
    .click()
}

async function goOut(page: Page) {
  await rooms(page, 'Front door')
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page)).toContainText('Out in the neighbourhood')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

test('a bike from Cog & Kerb: round the neighbourhood, then to work', async ({
  page,
}) => {
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 15_000 })

  // At home the bike and car are offered but need owning first.
  await goOut(page)
  await city(page).getByTestId('place-garage').click()
  await city(page)
    .getByRole('button', { name: /Buy a city bike/ })
    .click()
  await expect(city(page).getByTestId('balance')).toHaveText('£57.50')
  await expect(
    city(page).getByRole('button', { name: /Lease a small car/ }),
  ).toBeDisabled()
  await city(page).getByRole('button', { name: 'Back out to the street' }).click()

  // On the bike the park is half the time away.
  await expect(city(page).getByTestId('place-park')).toContainText('7 min walk')
  await city(page).getByRole('button', { name: 'Get on your bike' }).click()
  await expect(city(page).getByTestId('place-park')).toContainText('4 min by bike')
  await city(page).getByTestId('place-home').click()
  await expect(home(page).getByTestId('home-log')).toContainText('Cycled home')

  // The morning: the bike is one of the ways to work, from home or the street.
  await rooms(page, 'Bedroom')
  await home(page)
    .getByRole('button', { name: /Go to bed/ })
    .click()
  await rooms(page, 'Front door')
  await expect(home(page).locator('[data-commute="car"]')).toContainText('You need a car')
  await goOut(page)
  await city(page).getByTestId('place-office').click()
  await expect(city(page).getByTestId('commute')).toContainText('Go to work')
  await city(page).locator('[data-commute="bike"]').click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})
