import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Life outside work: the evening and morning at home, money, sleep and the
// commute, and how they show at work the next day.

const home = (page: Page) => page.getByTestId('home')
const room = (page: Page, name: string) =>
  home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name })
    .click()

/** Ends the working day straight away and goes home. */
async function endTheDay(page: Page, day = 1) {
  await page.evaluate(`window.__worksim.setTime(${day}, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 15_000 })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

test('Friday: paid, an evening out, a late night, and a rushed Monday morning', async ({
  page,
}) => {
  await endTheDay(page, 5)
  // Pay day.
  await expect(home(page).getByTestId('money')).toContainText('£677.50')
  await home(page).getByTestId('money').getByText('Statement').click()
  await expect(home(page).getByTestId('money')).toContainText('Pay for week 1')

  // Out with friends: money and time spent, social and fun up.
  await room(page, 'Front door')
  const social = Number(
    await home(page).getByRole('meter', { name: 'Social' }).getAttribute('aria-valuenow'),
  )
  await home(page)
    .getByRole('button', { name: /Meet friends in town/ })
    .click()
  await expect(home(page).getByTestId('balance')).toHaveText('£655.50')
  expect(
    Number(
      await home(page)
        .getByRole('meter', { name: 'Social' })
        .getAttribute('aria-valuenow'),
    ),
  ).toBeGreaterThan(social)
  await expect(home(page).getByTestId('home-log')).toContainText('Met friends in town')

  // The home screen passes the automated accessibility checks.
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(audit.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])

  // Saved: still at home after a reload.
  await page.reload()
  await expect(home(page)).toContainText('Evening at home', { timeout: 30_000 })

  // Bed, then Monday: rent, and leaving without breakfast or work clothes.
  await room(page, 'Bedroom')
  await home(page)
    .getByRole('button', { name: /Go to bed/ })
    .click()
  await expect(home(page)).toContainText('Morning at home')
  await expect(home(page).getByTestId('home-clock')).toContainText('Monday')
  await expect(home(page).getByTestId('home-log')).toContainText('Paid £160.00 rent')
  await room(page, 'Front door')
  const commute = home(page).getByTestId('commute')
  await expect(commute).toContainText('Not ready yet: breakfast, a shower, work clothes')
  await commute.getByRole('button', { name: /^Walk/ }).click()

  // At work, it shows.
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('workday-bar').click()
  const log = page.getByTestId('day-log')
  await expect(log).toContainText('Started the day hungry')
  await expect(log).toContainText('Came to work in yesterday’s clothes')
})
