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

test('furniture: buy, recolour and use it; and move to a flat nearer work', async ({
  page,
}) => {
  await endTheDay(page, 5)
  await expect(home(page).getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 30_000,
  })
  await room(page, 'Living room')
  await expect(
    home(page).getByRole('button', { name: /Play video games/ }),
  ).toBeDisabled()
  await expect(home(page)).toContainText('You need a games console (in the shop)')

  await home(page).getByRole('button', { name: 'Furniture shop' }).click()
  const shop = home(page).getByTestId('home-shop')
  const console = shop.getByTestId('shop-console')
  await console.getByRole('radio', { name: 'Colour 2' }).click()
  await console.getByRole('button', { name: 'Buy' }).click()
  await expect(console).toContainText('You have this')
  await expect(home(page).getByTestId('balance')).toHaveText('£377.50')
  await shop.getByRole('button', { name: 'Back to the flat' }).click()
  await room(page, 'Living room')
  await home(page)
    .getByRole('button', { name: /Play video games/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText('Played video games')

  // Moving: the flat is nearer work, and the furniture comes too.
  await home(page).getByRole('button', { name: 'Move home' }).click()
  await shop.getByTestId('home-flat').getByRole('button', { name: 'Move here' }).click()
  await expect(shop.getByTestId('home-flat')).toContainText('You live here')
  await expect(home(page).getByTestId('your-home')).toContainText('Harbour Road')
  await page.reload()
  await expect(home(page).getByTestId('your-home')).toContainText('Harbour Road', {
    timeout: 30_000,
  })
  await home(page).getByRole('button', { name: 'Furniture shop' }).click()
  await expect(shop.getByTestId('shop-console')).toContainText('You have this')
})

test('friends: an invitation accepted and kept, and a call', async ({ page }) => {
  await endTheDay(page, 5)
  await expect(home(page).getByTestId('phone-summary')).toContainText('1 new')
  await home(page).getByRole('button', { name: 'Open your phone' }).click()
  // The phone (it opens over any screen, on Messages).
  const phone = page.getByTestId('phone')
  const thread = phone.getByTestId('phone-thread')
  await expect(thread).toContainText('Leo Martins')
  await expect(thread).toContainText('Quick drink at the Kettle & Crown')
  await thread.getByTestId('invitation').getByRole('button', { name: 'Accept' }).click()
  await expect(thread).toContainText('I’d love to!')
  await expect(thread.getByTestId('invitation')).toContainText('You said yes')
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(audit.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])

  // A call to another friend.
  await phone
    .getByRole('list', { name: 'Friends' })
    .getByRole('button', { name: /Dan/ })
    .click()
  await thread.getByRole('button', { name: /^Call/ }).click()
  await expect(
    thread.getByRole('meter', { name: /Friendship with Dan/ }),
  ).toHaveAttribute('aria-valuenow', '55')
  await phone.getByRole('button', { name: 'Put the phone away' }).click()
  await expect(phone).toHaveCount(0)

  // Out for the drink, from the front door.
  await room(page, 'Front door')
  await home(page)
    .getByTestId('plans')
    .getByRole('button', { name: /Go: a drink at the kettle & crown with Leo/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText(
    'A drink at the Kettle & Crown with Leo',
  )
  await expect(home(page).getByTestId('plans')).toHaveCount(0)
})
