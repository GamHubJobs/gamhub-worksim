import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

/**
 * Going in and out of a place is walked, not a jump: in the street the player
 * walks up to the door, it opens, and they walk on through it into the
 * doorway; inside, they appear in that doorway and walk on in. Going out is
 * the same the other way, and they come out of the door they went in at. The
 * last picture of the doorway stays on screen while the next place is drawn.
 * Positions are sampled all the way (`__worksimPlayer`, development builds).
 */
type Player = { x: number; z: number; mode: string }
const player = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimPlayer?: Player }).__worksimPlayer ?? null,
  )

/**
 * Samples the player's position in the page every 30 ms (so none of a short walk
 * through a doorway is missed, however slowly the test drives the page) until
 * `done` holds, or the timeout.
 */
async function track(page: Page, done: () => Promise<boolean>, ms = 60_000) {
  await page.evaluate(`(() => {
    window.__track = []
    window.__tracking = setInterval(() => {
      const p = window.__worksimPlayer
      if (p) window.__track.push({ x: p.x, z: p.z, mode: p.mode })
    }, 30)
  })()`)
  const end = Date.now() + ms
  while (Date.now() < end && !(await done())) await page.waitForTimeout(100)
  return (await page.evaluate(`(() => {
    clearInterval(window.__tracking)
    return window.__track
  })()`)) as Player[]
}

test('into the café through its door, about inside, and out through it again', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 15_000 })
  await expect(home.locator('canvas')).toBeVisible({ timeout: 60_000 })
  await page.evaluate('window.__worksimSpeed = 1')
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await page.waitForTimeout(2000)

  // Out of the flat: the street starts in the building's doorway (z ≈ 10.7) and
  // the player walks out onto the pavement, to where they stand at the door (z = 5).
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  const city = page.getByTestId('city')
  const out = await track(page, async () => {
    const p = await player(page)
    return !!p && Math.abs(p.x + 40) < 1 && p.z < 5.2 && p.mode === 'free'
  })
  const street = out.filter((p) => Math.abs(p.x + 40) < 1.5)
  expect(street.some((p) => p.z > 8.6)).toBe(true)
  expect(street.at(-1)!.z).toBeLessThan(5.2)

  // Into the café: across the road, up to its door, and on through it (z < -10).
  await page.evaluate("window.__worksimStreetWalk('door-cafe')")
  const inside = city.locator('[data-interior="cafe"]')
  const going = await track(page, async () => (await inside.count()) > 0)
  expect(going.some((p) => Math.abs(p.x + 40) < 0.5 && p.z < -10)).toBe(true)
  // The doorway's picture covers the change.
  // Inside: first in the café's doorway (its front wall is at z = 4.5), then in.
  const arriving = await track(page, async () => {
    const p = await player(page)
    return !!p && p.mode === 'free' && p.z < 2
  })
  const first = arriving.find((p) => p.x > -5)!
  expect(first.z).toBeGreaterThan(4.3)
  expect(arriving.at(-1)!.z).toBeLessThan(2)

  // About inside, with the keys.
  await page.getByTestId('city-3d').focus()
  await page.keyboard.down('w')
  await page.waitForTimeout(1000)
  await page.keyboard.up('w')

  // And out: to the door, through it (z > 4.5), then in the street in the café's
  // doorway (z ≈ -10.7) and out onto the pavement.
  await page.getByRole('button', { name: 'Back out to the street' }).click()
  const leaving = await track(page, async () => (await inside.count()) === 0)
  expect(leaving.some((p) => p.z > 4.6)).toBe(true)
  const back = await track(page, async () => {
    const p = await player(page)
    return !!p && p.x < -30 && p.mode === 'free' && p.z > -5.2
  })
  const onStreet = back.filter((p) => p.x < -30)
  expect(onStreet.some((p) => p.z < -8.6)).toBe(true)
  expect(onStreet.at(-1)!.z).toBeGreaterThan(-5.2)
  // Not back in again (what was asked of the street is not asked twice).
  await page.waitForTimeout(3000)
  await expect(inside).toHaveCount(0)
})
