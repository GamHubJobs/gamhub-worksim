import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Inside the places: each has its own 3D interior (not the street with a
// sign), its hotspots do the place's real actions, and the sound changes.

const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')

let problems: string[] = []

test.beforeEach(async ({ page }) => {
  problems = []
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      !m.text().startsWith('Attempted to synchronously unmount')
    )
      problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(e.message))
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 15_000 })
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page)).toContainText('Out in the neighbourhood')
})

test.afterEach(() => {
  expect(problems).toEqual([])
})

const scene = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { __worksimAudio: { stats: { scene: string } } })
        .__worksimAudio.stats.scene,
  )

/** Where a hotspot's ring is on screen (reported by the 3D view in development). */
const hotspot = (page: Page, id: string) =>
  page.evaluate(
    (which) =>
      (
        globalThis as unknown as {
          __worksimHotspots?: Record<string, { x: number; y: number }>
        }
      ).__worksimHotspots?.[which] ?? null,
    id,
  )

async function clickHotspot(page: Page, id: string, testId = 'city-3d') {
  const view = page.getByTestId(testId)
  await expect.poll(() => hotspot(page, id), { timeout: 20_000 }).not.toBeNull()
  // Let the camera settle, then click the ring.
  await page.waitForTimeout(800)
  const spot = (await hotspot(page, id))!
  const box = (await view.boundingBox())!
  await page.mouse.click(box.x + spot.x, box.y + spot.y)
}

test('every place has its own interior, and the sound to go with it', async ({
  page,
}) => {
  for (const place of ['cafe', 'shop', 'gym', 'park', 'garage']) {
    await city(page).getByTestId(`place-${place}`).click()
    const view = city(page).getByTestId('city-3d')
    await expect(view).toHaveAttribute('data-interior', place)
    await expect(view.locator('canvas')).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => scene(page)).toMatch(new RegExp(`^${place}:`))
    await city(page).getByRole('button', { name: 'Back out to the street' }).click()
    await expect(view).not.toHaveAttribute('data-interior', place)
  }
})

test('the hotspots do the real thing: a coffee at the café, a workout at the gym', async ({
  page,
}) => {
  const balance = city(page).getByTestId('balance')
  await city(page).getByTestId('place-cafe').click()
  const before = await balance.textContent()
  await clickHotspot(page, 'cafe-coffee')
  await expect(balance).not.toHaveText(before!)
  await expect(page.getByTestId('city-log')).toContainText(/coffee|cake/i)

  await city(page).getByRole('button', { name: 'Back out to the street' }).click()
  await city(page).getByTestId('place-gym').click()
  const cash = await balance.textContent()
  await clickHotspot(page, 'gym-workout')
  await expect(balance).not.toHaveText(cash!)

  await city(page).getByRole('button', { name: 'Back out to the street' }).click()
  await city(page).getByTestId('place-park').click()
  const clock = await page.getByTestId('city-clock').textContent()
  await clickHotspot(page, 'park-bench')
  await expect(page.getByTestId('city-clock')).not.toHaveText(clock!)
})

test('at home, the furniture and the front door can be used in 3D', async ({ page }) => {
  await city(page).getByTestId('place-home').click()
  await expect(home(page)).toContainText('Evening at home')
  await clickHotspot(page, 'go-out', 'home-3d')
  await expect(city(page)).toContainText('Out in the neighbourhood')
})
