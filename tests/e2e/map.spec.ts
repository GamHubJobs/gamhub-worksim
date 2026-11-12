import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// The world map: on its own, full screen (M, the pause menu, the HUD, or the
// phone's Maps app, which puts the phone away); the mini-map following the
// player; places with their details; a destination and a route that follows
// the pavements (never through buildings); and the game exactly as it was
// when the map closes.

const map = (page: Page) => page.getByTestId('world-map')
const player = (page: Page) =>
  page.evaluate<{ x: number; z: number; mode: string }>('window.__worksimPlayer')

async function toTheStreet(page: Page) {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 30_000 })
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  await expect(page.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByTestId('minimap')).toBeVisible({ timeout: 30_000 })
}

test('the world map: M, the pause menu and the phone; places, a destination, a real route', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await toTheStreet(page)
  await page.getByTestId('city-3d').focus()
  const before = await player(page)

  // M opens it, full screen; keys do not move the player while it is open.
  await page.keyboard.press('m')
  await expect(map(page)).toBeVisible()
  const box = (await map(page).boundingBox())!
  expect(box.width).toBeGreaterThan(page.viewportSize()!.width - 2)
  await expect(map(page).getByTestId('map-player')).toBeVisible()
  await page.keyboard.down('w')
  await page.waitForTimeout(1000)
  await page.keyboard.up('w')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/map/world-map.png`,
  })

  // Zoom.
  const canvas = map(page).getByTestId('world-map-canvas')
  const viewBefore = await canvas.getAttribute('viewBox')
  await map(page).getByRole('button', { name: 'Zoom in' }).click()
  expect(await canvas.getAttribute('viewBox')).not.toBe(viewBefore)

  // A place: its details, then the destination.
  await map(page).getByTestId('map-place-gym').click()
  const details = map(page).getByTestId('map-details')
  await expect(details).toContainText(/Not yet found|Forge Fitness/)
  await details.getByRole('button', { name: 'Set as destination' }).click()
  await expect(map(page).getByTestId('map-destination')).toBeVisible()
  // The route: along the street, never into the buildings either side.
  // (A straight stretch of pavement has no height on the map, so it is checked by its points.)
  await expect(map(page).getByTestId('map-route')).toHaveAttribute('points', /[0-9]/, {
    timeout: 15_000,
  })
  const points = await map(page).getByTestId('map-route').getAttribute('points')
  const zs = points!.split(' ').map((p) => Number(p.split(',')[1]))
  expect(zs.length).toBeGreaterThanOrEqual(2)
  for (const z of zs) expect(Math.abs(z)).toBeLessThan(10)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/map/route.png`,
  })

  // M again closes it: the player is exactly where they were.
  await page.keyboard.press('m')
  await expect(map(page)).toHaveCount(0)
  const after = await player(page)
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.05)
  // The mini-map shows the route too.
  await expect(page.getByTestId('minimap').getByTestId('map-route')).toHaveAttribute(
    'points',
    /[0-9]/,
  )
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/map/minimap.png`,
  })

  // The pause menu opens the same map.
  await page.getByTestId('city-3d').focus()
  await page.keyboard.press('Escape')
  await page.getByTestId('pause-menu').getByRole('button', { name: 'Map' }).click()
  await expect(map(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(map(page)).toHaveCount(0)

  // The phone's Maps app: the phone goes away, and the map opens on its own.
  await page.getByTestId('city-3d').focus()
  await page.keyboard.press('p')
  await page
    .getByTestId('phone')
    .getByRole('list', { name: 'Dock' })
    .getByRole('button', { name: /Maps/ })
    .click()
  await expect(page.getByTestId('phone').getByTestId('phone-map')).toContainText(
    'Forge Fitness',
  )
  await page
    .getByTestId('phone')
    .getByRole('button', { name: /Open the map/ })
    .click()
  await expect(map(page)).toBeVisible()
  await expect(page.getByTestId('phone')).toHaveCount(0)
  await page.keyboard.press('Escape')
})

test('the mini-map follows the player as they walk', async ({ page }) => {
  test.setTimeout(300_000)
  await toTheStreet(page)
  await page.getByTestId('city-3d').focus()
  const before = await player(page)
  const turn = () =>
    page.getByTestId('minimap').locator('svg > g').getAttribute('transform')
  const t0 = await turn()
  await page.keyboard.down('d')
  await page.waitForTimeout(2500)
  await page.keyboard.up('d')
  const after = await player(page)
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.5)
  await expect.poll(turn, { timeout: 10_000 }).not.toBe(t0)
})
