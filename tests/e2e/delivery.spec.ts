import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// A takeaway, as it really happens: ordered and paid once, a courier comes to
// the door and rings, the bag is handed over when the player answers, and only
// then can it be eaten. A reload part way carries on, with nothing paid twice;
// and if no one answers, it is left on the doorstep.

const home = (page: Page) => page.getByTestId('home')
const room = (page: Page, name: string) =>
  home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name })
    .click()
const courier = (page: Page) =>
  page.evaluate(
    () =>
      (
        globalThis as unknown as {
          __worksimCourier?: { shown: boolean; atDoor?: boolean; holding?: boolean }
        }
      ).__worksimCourier ?? { shown: false },
  )

async function evening(page: Page) {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 20_000 })
  await expect(home(page).getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
}

test('ordered, delivered to the door by a courier, handed over, then eaten', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await evening(page)
  const balance = await home(page).getByTestId('balance').textContent()
  await room(page, 'Kitchen')
  await home(page)
    .getByRole('button', { name: /Order a takeaway/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText('Ordered a takeaway', {
    timeout: 60_000,
  })
  const paid = await home(page).getByTestId('balance').textContent()
  expect(paid).not.toBe(balance)
  // Not yet: nothing to eat, no one at the door, and no second order.
  await expect(
    home(page).getByRole('button', { name: /Eat the takeaway/ }),
  ).toBeDisabled()
  await expect(
    home(page).getByRole('button', { name: /Order a takeaway/ }),
  ).toBeDisabled()

  // A reload while it is on its way: still on its way, paid once.
  await page.reload()
  await expect(home(page)).toContainText('Evening at home', { timeout: 30_000 })
  await expect(home(page).getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect(home(page).getByTestId('balance')).toHaveText(paid!)

  // Waiting until it comes: the courier walks up to the door and rings.
  await room(page, 'Living room')
  await home(page)
    .getByRole('button', { name: /Wait for the takeaway/ })
    .click()
  await expect
    .poll(async () => (await courier(page)).atDoor, { timeout: 60_000 })
    .toBe(true)
  expect((await courier(page)).holding).toBe(true)

  // Answering the door: the bag changes hands, the courier leaves.
  await room(page, 'Front door')
  await home(page)
    .getByRole('button', { name: /Answer the door/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText('The takeaway arrived', {
    timeout: 60_000,
  })
  await expect
    .poll(async () => (await courier(page)).shown, { timeout: 20_000 })
    .toBe(false)

  // Now it can be eaten, at the table.
  await room(page, 'Kitchen')
  await home(page)
    .getByRole('button', { name: /Eat the takeaway/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText('Had a takeaway', {
    timeout: 60_000,
  })
  await expect(home(page).getByTestId('balance')).toHaveText(paid!)
})

test('if no one answers, it is left on the doorstep to pick up', async ({ page }) => {
  test.setTimeout(240_000)
  await evening(page)
  await room(page, 'Kitchen')
  await home(page)
    .getByRole('button', { name: /Order a takeaway/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText('Ordered a takeaway', {
    timeout: 60_000,
  })
  // Something long meanwhile: the courier comes, waits, and leaves it.
  await room(page, 'Living room')
  await home(page)
    .getByRole('button', { name: /Watch a series/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText('Watched a series', {
    timeout: 90_000,
  })
  await room(page, 'Front door')
  await home(page)
    .getByRole('button', { name: /Answer the door/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText('The takeaway arrived', {
    timeout: 60_000,
  })
  await room(page, 'Kitchen')
  await expect(home(page).getByRole('button', { name: /Eat the takeaway/ })).toBeEnabled()
})
