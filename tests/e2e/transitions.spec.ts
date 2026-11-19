import { expect, test, type Page } from '@playwright/test'
import { openApp, startCareerIfNeeded } from './helpers.ts'

/**
 * Transitions (ui/motion.ts, index.css, world/transition/Still.tsx): each
 * animates and then finishes (nothing is left half-way, hidden or blocking),
 * the controls work straight after, and with reduced motion each is instant.
 */
const player = (page: Page) =>
  page.evaluate(
    () =>
      (
        globalThis as unknown as {
          __worksimPlayer?: { x: number; z: number; mode: string }
        }
      ).__worksimPlayer,
  )

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
})

test('windows open, go to the taskbar and back, maximise and close, each animated and finished', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await openApp(page, 'Tasks')
  const win = page.getByTestId('window-tasks')
  await expect(win).toBeVisible()
  // Opening: it pops in, then the animation is done with (nothing left playing).
  await expect(win).not.toHaveClass(/motion-pop/, { timeout: 5000 })
  // To the taskbar: it shrinks away, then is hidden; and back.
  await win.getByRole('button', { name: 'Minimise Tasks' }).click()
  await expect(win).toBeHidden()
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await expect(win).toBeVisible()
  await expect(win).not.toHaveClass(/motion-/, { timeout: 5000 })
  // Maximised: it eases to fill the desktop, and drags no more.
  const before = await win.boundingBox()
  await win.getByRole('button', { name: 'Maximise Tasks' }).click()
  await expect
    .poll(async () => (await win.boundingBox())!.width, { timeout: 5000 })
    .toBeGreaterThan(before!.width + 50)
  await expect(win).not.toHaveClass(/motion-geometry/, { timeout: 5000 })
  await win.getByRole('button', { name: 'Restore Tasks' }).click()
  await expect
    .poll(async () => Math.round((await win.boundingBox())!.width), { timeout: 5000 })
    .toBe(Math.round(before!.width))
  // Closed: it fades, then is gone.
  await win.getByRole('button', { name: 'Close Tasks' }).click()
  await expect(win).toHaveCount(0)
})

test('changing place: the last picture or a curtain, lifted once the place is drawn, never left', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  const office = page.getByTestId('office-3d')
  await expect(office.locator('canvas')).toBeVisible({ timeout: 120_000 })
  // The first place of the day: a curtain, lifted.
  await expect(
    office.getByTestId('scene-curtain').or(office.getByTestId('doorway-still')),
  ).toHaveCount(0, {
    timeout: 15_000,
  })
  // Home after work: the office's last picture over the flat, until it is drawn.
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 30_000 })
  await expect(home.locator('canvas')).toBeVisible({ timeout: 60_000 })
  await expect(
    home.getByTestId('scene-curtain').or(home.getByTestId('doorway-still')),
  ).toHaveCount(0, {
    timeout: 15_000,
  })
  // The keys walk at once after it (the curtain takes no input).
  await expect
    .poll(async () => (await player(page))?.mode, { timeout: 60_000 })
    .toBe('free')
  await home.locator('[role="application"]').focus()
  const from = await player(page)
  await page.keyboard.down('KeyS')
  await page.waitForTimeout(1500)
  await page.keyboard.up('KeyS')
  const to = await player(page)
  expect(Math.hypot(to!.x - from!.x, to!.z - from!.z)).toBeGreaterThan(0.3)
})

test('the phone and the pause menu animate away, and walking goes on straight after', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  const office = page.getByTestId('office-3d')
  await expect(office.locator('canvas')).toBeVisible({ timeout: 120_000 })
  await expect
    .poll(async () => (await player(page))?.mode, { timeout: 60_000 })
    .toBe('free')
  await office.focus()
  // The phone: lowered, then gone; while lowered it takes no keys or clicks.
  await page.keyboard.press('p')
  const phone = page.getByTestId('phone')
  await expect(phone).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(phone).toBeHidden()
  // The pause menu and a screen from it: Back fades it out, then it is closed.
  await office.focus()
  await page.keyboard.press('Escape')
  const menu = page.getByTestId('pause-menu')
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(menu).toHaveCount(0)
  // Walking, at once.
  await office.focus()
  const from = await player(page)
  await page.keyboard.down('KeyS')
  await page.waitForTimeout(1500)
  await page.keyboard.up('KeyS')
  const to = await player(page)
  expect(Math.hypot(to!.x - from!.x, to!.z - from!.z)).toBeGreaterThan(0.3)
})

test('with reduced motion, windows and menus change at once', async ({ page }) => {
  test.setTimeout(240_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await openApp(page, 'Tasks')
  const win = page.getByTestId('window-tasks')
  await expect(win).toBeVisible()
  await win.getByRole('button', { name: 'Close Tasks' }).click()
  // No exit animation to wait for: gone straight away.
  await expect(win).toHaveCount(0, { timeout: 300 })
})
