import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

/**
 * Walking answers the keys at once and on its own, never waiting for the mouse
 * (world/WalkView.tsx, world/walkKeys.ts, Controls.wake in world/PlayerRig.tsx):
 * - a key held after a while of doing nothing moves the character straight
 *   away, even with the computer set to reduce motion (the places then draw a
 *   frame only every 30 seconds while nothing moves);
 * - letting go stops it;
 * - with keyboard focus back on the page (after closing the phone or a menu)
 *   or on a header button, the keys still walk, and the mouse is never moved.
 * And the name and XP in the header open the career page over the world.
 */
interface Player {
  x: number
  z: number
  mode: string
}
const player = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimPlayer: Player }).__worksimPlayer,
  )

/** Holds a key for a moment and says how far the character went. */
async function walked(page: Page, code: string, ms: number) {
  const from = await player(page)
  await page.keyboard.down(code)
  await page.waitForTimeout(ms)
  await page.keyboard.up(code)
  const to = await player(page)
  return Math.hypot(to.x - from.x, to.z - from.z)
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await expect
    .poll(async () => (await player(page))?.mode, { timeout: 60_000 })
    .toBe('free')
})

test('keys walk at once without the mouse, and stop when let go', async ({ page }) => {
  test.setTimeout(240_000)
  const office = page.getByTestId('office-3d')
  await office.focus()
  // A while with nothing pressed and the mouse left alone: the place is idle.
  await page.waitForTimeout(4000)
  // Held for a second and a half: well on the way (a second is about a metre and a half).
  expect(await walked(page, 'KeyW', 1500)).toBeGreaterThan(0.5)
  // Let go: it stops (the next moment it has hardly moved).
  await page.waitForTimeout(600)
  const stopped = await player(page)
  await page.waitForTimeout(1500)
  const later = await player(page)
  expect(Math.hypot(later.x - stopped.x, later.z - stopped.z)).toBeLessThan(0.05)
  // Two keys together (forward and to the side) walk too.
  const from = await player(page)
  await page.keyboard.down('KeyS')
  await page.keyboard.down('KeyD')
  await page.waitForTimeout(1500)
  await page.keyboard.up('KeyD')
  await page.keyboard.up('KeyS')
  const to = await player(page)
  expect(Math.hypot(to.x - from.x, to.z - from.z)).toBeGreaterThan(0.5)
})

test('with focus on the page or a header button, the keys still walk', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const office = page.getByTestId('office-3d')
  // The phone opened and closed: focus goes back to the page, not the 3D view.
  await office.focus()
  await page.keyboard.press('p')
  await expect(page.getByTestId('phone')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('phone')).toBeHidden()
  await page.evaluate('document.activeElement && document.activeElement.blur()')
  expect(await page.evaluate('document.activeElement === document.body')).toBe(true)
  expect(await walked(page, 'KeyS', 1500)).toBeGreaterThan(0.5)

  // A header button clicked (the view switched and back): it keeps focus, and W walks.
  const toggle = page.getByRole('button', { name: /^View:/ })
  await toggle.click()
  await toggle.click()
  expect(await walked(page, 'KeyW', 1500)).toBeGreaterThan(0.5)
})

test('the name and XP in the header open the career page, and walking goes on after', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const chip = page.getByTestId('player-chip')
  await expect(chip).toContainText('XP')
  await chip.click()
  const career = page.getByTestId('career-screen')
  await expect(career).toBeVisible()
  await expect(career.getByTestId('career')).toBeVisible()
  await expect(career).toContainText(/XP/)
  // While it is open, the keys are its own: the character does not walk behind it.
  const before = await player(page)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(800)
  await page.keyboard.up('KeyW')
  const during = await player(page)
  expect(Math.hypot(during.x - before.x, during.z - before.z)).toBeLessThan(0.05)
  // Still in the office (not sent to the computer), and back to walking.
  await career.getByRole('button', { name: 'Back' }).click()
  await expect(career).toBeHidden()
  await expect(page.getByTestId('office-3d')).toBeVisible()
  expect(await walked(page, 'KeyS', 1500)).toBeGreaterThan(0.5)
})

/** Nothing invisible lies over the header's buttons: the middle of each is the button itself. */
async function headerClear(page: Page) {
  const covered = await page.evaluate(`(() => {
    const out = []
    for (const b of document.querySelectorAll('header button')) {
      const r = b.getBoundingClientRect()
      if (!r.width) continue
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      if (!top || !b.contains(top)) out.push((b.textContent || '').trim() + ' under ' + (top ? top.outerHTML.slice(0, 80) : 'nothing'))
    }
    return out
  })()`)
  expect(covered).toEqual([])
}

test('the header works in the office, at home and in the street', async ({ page }) => {
  test.setTimeout(360_000)
  const chip = page.getByTestId('player-chip')
  const openCareer = async () => {
    await headerClear(page)
    await chip.click()
    await expect(page.getByTestId('career-screen')).toBeVisible()
    await expect(page.getByTestId('career-screen')).toContainText('XP')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('career-screen')).toBeHidden()
  }
  await openCareer()
  // Home after work.
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 30_000 })
  await openCareer()
  // Out in the street, as in the picture: the name, the job and the XP open the career page.
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  await expect(page.getByTestId('city')).toContainText('Out in the neighbourhood')
  await expect(page.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await openCareer()
  // And the keys walk there afterwards, with the mouse left alone.
  await expect
    .poll(async () => (await player(page))?.mode, { timeout: 60_000 })
    .toBe('free')
  expect(await walked(page, 'KeyW', 2000)).toBeGreaterThan(0.5)
  // Keyboard focus on a button in the drawer over the 3D view: the keys still walk.
  const drawer = page.getByTestId('drawer')
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button').first().focus()
  expect(await page.evaluate('document.activeElement.tagName')).toBe('BUTTON')
  expect(await walked(page, 'KeyS', 2000)).toBeGreaterThan(0.5)
})
