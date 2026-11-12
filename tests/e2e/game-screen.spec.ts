import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// The game is the screen: the 3D world fills the view (no page around it, no
// scrolling), a small HUD sits over it, Esc pauses, and menus and the phone
// open over the world without rebuilding it.

const noScroll = (page: Page) =>
  page.evaluate<boolean>(
    'document.scrollingElement.scrollHeight <= innerHeight + 1 && document.scrollingElement.scrollWidth <= innerWidth + 1',
  )

async function fillsTheView(page: Page, testId: string) {
  const canvas = page.getByTestId(testId).locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 120_000 })
  const view = page.viewportSize()!
  // All of the width, and all of the height below the slim top bar (once it has been sized).
  await expect
    .poll(async () => (await canvas.boundingBox())?.width ?? 0, { timeout: 20_000 })
    .toBeGreaterThan(view.width - 2)
  await expect
    .poll(async () => (await canvas.boundingBox())?.height ?? 0, { timeout: 20_000 })
    .toBeGreaterThan(view.height - 80)
  expect(await noScroll(page)).toBe(true)
}

test('full screen at work, at home and in town, with the HUD; Esc pauses; menus keep the world', async ({
  page,
}) => {
  test.setTimeout(420_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await fillsTheView(page, 'office-3d')
  await expect(page.getByTestId('hud-needs')).toBeVisible()

  // Home: the flat fills the view, the drawer over it.
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(page.getByTestId('home')).toContainText('Evening at home', {
    timeout: 30_000,
  })
  await fillsTheView(page, 'home-3d')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/game-screen/home.png`,
  })
  // The drawer folds away, leaving the world and the HUD.
  const drawer = page.getByTestId('drawer')
  await drawer.getByRole('button', { name: 'Hide ◂' }).click()
  await expect(drawer).toBeHidden()
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/game-screen/home-world.png`,
  })

  // Opening the pause menu, a screen from it, and the phone does not rebuild the 3D view.
  await page.evaluate(
    "window.__canvas = document.querySelector('[data-testid=home-3d] canvas')",
  )
  await page.getByTestId('home-3d').focus()
  await page.keyboard.press('Escape')
  const pause = page.getByTestId('pause-menu')
  await expect(pause).toBeVisible()
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/game-screen/pause.png`,
  })
  await pause.getByRole('button', { name: 'Relationships' }).click()
  await expect(page.getByTestId('relationships')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('relationships')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(pause).toBeVisible()
  await pause.getByRole('button', { name: 'Resume' }).click()
  await expect(pause).toHaveCount(0)
  await page.getByRole('button', { name: /Phone/ }).click()
  await expect(page.getByTestId('phone')).toBeVisible()
  await page
    .getByTestId('phone')
    .getByRole('button', { name: 'Put the phone away' })
    .click()
  const same = await page.evaluate<boolean>(
    "window.__canvas === document.querySelector('[data-testid=home-3d] canvas')",
  )
  expect(same).toBe(true)
  // Show the drawer again (it is remembered), then out into town.
  await page.getByRole('button', { name: /▸ Your flat/ }).click()
  await expect(drawer).toBeVisible()

  // Resizing keeps it filling the view.
  await page.setViewportSize({ width: 1024, height: 700 })
  await page.waitForTimeout(500)
  await fillsTheView(page, 'home-3d')
  await page.setViewportSize({ width: 1280, height: 720 })

  await page
    .getByTestId('home')
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await page
    .getByTestId('home')
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await fillsTheView(page, 'city-3d')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/game-screen/street.png`,
  })
})
