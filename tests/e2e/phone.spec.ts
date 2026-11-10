import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// The phone: out with P in the 3D office (the character holds it and stands
// still), every app opens and shows the game's own state, the home bar and
// back work, settings persist across a reload, and food ordered at home brings
// the courier to the door.

const phone = (page: Page) => page.getByTestId('phone')
const player = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { __worksimPlayer: { x: number; z: number } })
        .__worksimPlayer,
  )
const app = (page: Page, name: string) =>
  phone(page)
    .getByRole('list', { name: /Apps|Dock/ })
    .getByRole('button', { name: new RegExp(`^${name}`) })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
})

test('out with P in the office: held, no walking, every app opens, home and back work', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.getByTestId('office-3d').focus()
  await page.keyboard.press('p')
  await expect(phone(page)).toBeVisible()
  await expect(phone(page).getByTestId('phone-home')).toBeVisible()
  await expect(phone(page).getByTestId('phone-time')).toHaveText(/\d+:\d\d/)
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'docs/screenshots/phone/home.png' })
  // Accessible: the home screen.
  const audit = await new AxeBuilder({ page })
    .include('[data-testid="phone"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(
    audit.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([])
  // While it is out, the character does not walk.
  const before = await player(page)
  await page.keyboard.down('w')
  await page.waitForTimeout(1200)
  await page.keyboard.up('w')
  const after = await player(page)
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.05)

  for (const [name, testId] of [
    ['Messages', 'phone-thread'],
    ['Contacts', 'phone-contacts'],
    ['Calendar', 'phone-calendar'],
    ['Maps', 'phone-map'],
    ['Bank', 'phone-bank'],
    ['Career', 'phone-jobs'],
    ['Food', 'phone-food'],
    ['Circle', 'phone-social'],
    ['Browser', 'phone-browser'],
    ['Camera', 'phone-camera'],
    ['Settings', 'phone-settings'],
  ] as const) {
    await app(page, name).click()
    await expect(phone(page).getByTestId(testId), name).toBeVisible()
    if (name === 'Calendar')
      await expect(phone(page).getByTestId(testId)).toContainText('Team stand-up')
    if (name === 'Bank')
      await expect(phone(page).getByTestId('phone-balance')).toHaveText(/£\d/)
    if (name === 'Food')
      await expect(phone(page).getByTestId(testId)).toContainText('Lotus')
    if (name === 'Camera') {
      await phone(page)
        .getByRole('button', { name: /Take a photo/ })
        .click()
      await expect(
        phone(page).getByRole('list', { name: 'Gallery' }).getByRole('img'),
      ).toHaveCount(1, {
        timeout: 15_000,
      })
      await page.screenshot({ path: 'docs/screenshots/phone/camera.png' })
    }
    // Back to the home screen: the back arrow, or the home bar.
    if (name === 'Maps')
      await phone(page).getByRole('button', { name: 'Home screen' }).click()
    else await phone(page).getByRole('button', { name: '‹ Back' }).click()
    await expect(phone(page).getByTestId('phone-home')).toBeVisible()
  }
  // A call to a friend: ringing, then connected.
  await app(page, 'Contacts').click()
  await phone(page)
    .getByRole('button', { name: /Call Leo/ })
    .click()
  await expect(phone(page).getByTestId('phone-call')).toContainText('Calling…')
  await page.screenshot({ path: 'docs/screenshots/phone/calling.png' })
  await expect(phone(page).getByTestId('phone-call')).toContainText(
    /Connected|No answer/,
    {
      timeout: 10_000,
    },
  )
  await phone(page).getByRole('button', { name: 'End call' }).click()

  // Away with P again; walking works again.
  await page.keyboard.press('p')
  await expect(phone(page)).toHaveCount(0)
  await page.getByTestId('office-3d').focus()
  const here = await player(page)
  await page.keyboard.down('s')
  await page.waitForTimeout(1500)
  await page.keyboard.up('s')
  const moved = await player(page)
  expect(Math.hypot(moved.x - here.x, moved.z - here.z)).toBeGreaterThan(0.1)
})

test('settings persist across a reload: the wallpaper and notifications', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.getByTestId('office-3d').focus()
  await page.keyboard.press('p')
  await app(page, 'Settings').click()
  await phone(page).getByRole('radio', { name: 'Harbour' }).click()
  await phone(page)
    .getByRole('checkbox', { name: /Notifications/ })
    .click()
  await expect(
    phone(page).getByRole('checkbox', { name: /Notifications/ }),
  ).not.toBeChecked()
  await expect(phone(page).getByRole('radio', { name: 'Harbour' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await page.getByTestId('office-3d').focus()
  await page.keyboard.press('p')
  await app(page, 'Settings').click()
  await expect(phone(page).getByRole('radio', { name: 'Harbour' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(
    phone(page).getByRole('checkbox', { name: /Notifications/ }),
  ).not.toBeChecked()
})

test('food ordered on the phone at home brings the courier to the door', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(page.getByTestId('home')).toContainText('Evening at home', {
    timeout: 30_000,
  })
  const balance = await page.getByTestId('home').getByTestId('balance').textContent()
  await page.getByTestId('home').getByRole('button', { name: 'Open your phone' }).click()
  await phone(page).getByRole('button', { name: '‹ Back' }).click()
  await app(page, 'Food').click()
  await phone(page)
    .getByRole('button', { name: /Lotus Noodle Bar/ })
    .click()
  await phone(page)
    .getByRole('button', { name: /Order for delivery/ })
    .click()
  await expect(phone(page).getByTestId('phone-delivery')).toContainText('on its way', {
    timeout: 15_000,
  })
  await expect(page.getByTestId('home').getByTestId('balance')).not.toHaveText(balance!)
  await page.screenshot({ path: 'docs/screenshots/phone/food.png' })
  // The same delivery as ordering any other way: wait, and the courier comes to the door.
  await phone(page).getByRole('button', { name: 'Put the phone away' }).click()
  await page
    .getByTestId('home')
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Living room' })
    .click()
  await page
    .getByTestId('home')
    .getByRole('button', { name: /Wait for the takeaway/ })
    .click()
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (globalThis as unknown as { __worksimCourier?: { atDoor?: boolean } })
              .__worksimCourier?.atDoor ?? false,
        ),
      { timeout: 90_000 },
    )
    .toBe(true)
})
