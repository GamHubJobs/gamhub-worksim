import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

/**
 * Accessories in play (accessories/AccessoryStore.tsx, game/accessories.ts):
 * from the phone's Style app into the shop, a smartwatch bought with earned
 * money after a confirmation, worn at once (on the character in 3D, its watch
 * face by the clock with the time and messages), in the wardrobe and the
 * inventory, and all still so after a reload. Then a clash: headphones over a
 * cap take the cap off and say so.
 */
const store = (page: Page) => page.getByTestId('accessory-store')

async function openShop(page: Page) {
  await page.getByTestId('office-3d').focus()
  await page.keyboard.press('p')
  const phone = page.getByTestId('phone')
  await expect(phone).toBeVisible()
  await phone
    .getByRole('list', { name: /Apps|Dock/ })
    .getByRole('button', { name: /^Style/ })
    .click()
  await expect(phone.getByTestId('phone-style')).toBeVisible()
  await phone.getByRole('button', { name: 'Shop accessories' }).click()
  await expect(store(page)).toBeVisible()
}

async function buy(page: Page, category: string, id: string) {
  await store(page)
    .getByRole('navigation', { name: 'Categories' })
    .getByRole('button', { name: category })
    .click()
  await store(page).getByTestId(`product-${id}`).click()
  const detail = store(page).getByTestId('product-detail')
  await detail.getByRole('button', { name: 'Buy', exact: true }).click()
  await detail.getByRole('button', { name: 'Confirm purchase' }).click()
  await expect(detail.getByRole('status')).toContainText('in your wardrobe')
  await detail.getByRole('button', { name: 'Wear it now' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
})

test('bought with earned money, worn at once, kept after a reload', async ({ page }) => {
  test.setTimeout(480_000)
  await openShop(page)
  const before = await store(page).getByTestId('store-money').innerText()
  // The product turned in 3D, and side by side with another.
  await store(page)
    .getByRole('navigation', { name: 'Categories' })
    .getByRole('button', { name: 'Watches & wrist' })
    .click()
  await store(page).getByTestId('product-watch-smart').click()
  await expect(store(page).getByTestId('preview-3d').locator('canvas')).toBeVisible()
  await store(page)
    .getByTestId('product-detail')
    .getByRole('button', { name: 'Compare' })
    .click()
  await store(page).getByTestId('product-watch-classic').click()
  await store(page)
    .getByTestId('product-detail')
    .getByRole('button', { name: 'Compare' })
    .click()
  await expect(store(page).getByTestId('comparison')).toContainText('Smartwatch')
  await expect(store(page).getByTestId('comparison')).toContainText(
    'Classic analogue watch',
  )
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/accessories/shop.png`,
  })
  // Accessible.
  const audit = await new AxeBuilder({ page })
    .include('[data-testid="accessory-store"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast'])
    .analyze()
  expect(audit.violations.map((v) => v.id)).toEqual([])

  await buy(page, 'Watches & wrist', 'watch-smart')
  await expect(store(page).getByTestId('store-money')).not.toHaveText(before)
  // Worn: its face by the clock, with the time and the messages not read.
  await expect(page.getByTestId('wrist-display')).toBeVisible()
  await expect(page.getByTestId('wrist-display')).toContainText(/\d+:\d\d/)
  await expect(page.getByTestId('wrist-unread')).toBeVisible()
  // In the wardrobe, worn; on the character in 3D (the scene's look).
  await store(page)
    .getByRole('navigation', { name: 'Accessories' })
    .getByRole('button', { name: 'Wardrobe' })
    .click()
  await expect(store(page).getByTestId('owned-watch-smart')).toHaveAttribute(
    'data-state',
    'worn',
  )
  // (The character in 3D takes a moment to appear on a computer without a graphics card.)
  await expect(store(page).getByTestId('preview-3d').locator('canvas')).toBeVisible()
  await page.waitForTimeout(8000)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/accessories/wardrobe.png`,
  })
  await store(page).getByRole('button', { name: 'Close' }).click()
  await expect(store(page)).toBeHidden()

  // After a reload: still owned, still worn.
  await page.waitForTimeout(1500)
  await page.reload()
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('wrist-display')).toBeVisible({ timeout: 60_000 })
  // The pause menu's inventory lists it.
  await page.getByTestId('office-3d').focus()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Inventory' }).click()
  await expect(page.getByTestId('inventory-accessories')).toContainText('Smartwatch')
  await page.getByRole('button', { name: 'Open your wardrobe' }).click()
  await expect(store(page).getByTestId('owned-watch-smart')).toHaveAttribute(
    'data-state',
    'worn',
  )
  // Taken off: the watch face goes.
  await store(page)
    .getByTestId('owned-watch-smart')
    .getByRole('button', { name: 'Take off' })
    .click()
  await expect(page.getByTestId('wrist-display')).toBeHidden()
})

test('headphones over a cap: the cap comes off, and the wardrobe says why', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await openShop(page)
  await buy(page, 'Hats & helmets', 'cap')
  await buy(page, 'Audio', 'headphones')
  await store(page)
    .getByRole('navigation', { name: 'Accessories' })
    .getByRole('button', { name: 'Wardrobe' })
    .click()
  await expect(store(page).getByTestId('owned-headphones')).toHaveAttribute(
    'data-state',
    'worn',
  )
  await expect(store(page).getByTestId('owned-cap')).toHaveAttribute(
    'data-state',
    'stored',
  )
  // Putting the cap back on: the headphones come off, with the reason.
  await store(page).getByTestId('owned-cap').getByRole('button', { name: 'Wear' }).click()
  await expect(store(page).getByRole('status')).toContainText('won’t fit over')
  await expect(store(page).getByTestId('owned-headphones')).toHaveAttribute(
    'data-state',
    'stored',
  )
  // Sold on, after a confirmation, for part of what it cost.
  await store(page)
    .getByTestId('owned-headphones')
    .getByRole('button', { name: /^Sell/ })
    .click()
  await store(page)
    .getByTestId('owned-headphones')
    .getByRole('button', { name: 'Sell', exact: true })
    .click()
  await expect(store(page).getByTestId('owned-headphones')).toHaveCount(0)
  await expect(store(page).getByTestId('purchase-history')).toContainText(
    'Sold Over-ear headphones',
  )
})
