import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// A home repair, as it really happens: the boiler breaks down (on day 4), so no
// shower; a heating engineer is called, comes to the door and rings, is let in,
// works on the boiler in the kitchen, is paid at the door, and leaves; hot
// water again. A reload while they are on the way carries on.

const home = (page: Page) => page.getByTestId('home')
const room = (page: Page, name: string) =>
  home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name })
    .click()
const engineer = (page: Page) =>
  page.evaluate(
    () =>
      (
        globalThis as unknown as {
          __worksimEngineer?: { shown: boolean; doing?: string; x?: number; z?: number }
        }
      ).__worksimEngineer ?? { shown: false },
  )
const shots = process.env.WORKSIM_SHOTS

test('the boiler breaks down; an engineer comes, fixes it, is paid, and goes', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  // Thursday, day 4: home from work.
  await page.evaluate(`window.__worksim.setTime(4, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 20_000 })
  await expect(home(page).getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect(home(page).getByTestId('home-log')).toContainText(
    'The boiler has broken down',
  )

  // No hot water, so no shower.
  await room(page, 'Bathroom')
  const shower = home(page).getByRole('button', { name: /Have a shower/ })
  await expect(shower).toBeDisabled()
  await expect(shower).toContainText('No hot water')

  // Calling an engineer.
  const balance = await home(page).getByTestId('balance').textContent()
  await room(page, 'Living room')
  await home(page)
    .getByRole('button', { name: /Call a heating engineer/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText(
    'Called a heating engineer',
    { timeout: 60_000 },
  )

  // A reload while they are on the way: still coming, nothing paid yet.
  await page.reload()
  await expect(home(page)).toContainText('Evening at home', { timeout: 30_000 })
  await expect(home(page).getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect(home(page).getByTestId('balance')).toHaveText(balance!)

  // Waiting: the engineer walks up to the door and rings.
  await room(page, 'Living room')
  await home(page)
    .getByRole('button', { name: /Wait for the heating engineer/ })
    .click()
  await expect
    .poll(async () => (await engineer(page)).shown, { timeout: 90_000 })
    .toBe(true)

  // Let in: to the boiler in the kitchen, at work on it.
  // (At its real pace, to see each part: the tests otherwise play activities faster.)
  await page.evaluate(
    "window.__worksimSpeed = 1; sessionStorage.setItem('worksim.testSpeed', '1')",
  )
  await room(page, 'Front door')
  await home(page)
    .getByRole('button', { name: /Answer the door: the heating engineer/ })
    .click()
  await expect
    .poll(async () => (await engineer(page)).doing, { timeout: 60_000, intervals: [200] })
    .toBe('fixing the boiler')
  if (shots) await page.screenshot({ path: `${shots}/home/engineer-at-boiler.png` })
  await expect(home(page).getByTestId('home-log')).toContainText(
    'The heating engineer fixed the boiler',
    { timeout: 90_000 },
  )
  await expect
    .poll(async () => (await engineer(page)).shown, { timeout: 30_000 })
    .toBe(false)
  // Paid once, and hot water again.
  await expect(home(page).getByTestId('balance')).not.toHaveText(balance!)
  await room(page, 'Bathroom')
  await expect(home(page).getByRole('button', { name: /Have a shower/ })).toBeEnabled()
  await room(page, 'Living room')
  await expect(
    home(page).getByRole('button', { name: /Call a heating engineer/ }),
  ).toHaveCount(0)
})
