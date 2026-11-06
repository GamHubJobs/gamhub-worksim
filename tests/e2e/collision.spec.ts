import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// The character cannot walk into or through solid things, in any place:
// it runs and walks about in every direction, against the furniture, and is
// never found inside anything (only sitting or lying down on purpose is).

interface Player {
  x: number
  z: number
  mode: string
  inside: boolean
}
const player = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimPlayer: Player }).__worksimPlayer,
  )

/** Walks and runs about for a while, turning, and reports how far it got and any time inside something. */
async function roam(page: Page, view: ReturnType<Page['getByTestId']>) {
  await view.focus()
  const start = await player(page)
  let inside = 0
  let furthest = 0
  const moves: Array<[string[], number]> = [
    [['KeyW'], 1800],
    [['ShiftLeft', 'KeyW'], 1600],
    [['KeyW', 'KeyD'], 1400],
    [['KeyQ', 'KeyW'], 1500],
    [['ShiftLeft', 'KeyW', 'KeyA'], 1600],
    [['KeyS'], 1000],
    [['KeyR', 'ShiftLeft', 'KeyW'], 1800],
  ]
  for (const [keys, ms] of moves) {
    for (const k of keys) await page.keyboard.down(k)
    for (let t = 0; t < ms; t += 150) {
      await page.waitForTimeout(150)
      const p = await player(page)
      if (p.inside) inside++
      furthest = Math.max(furthest, Math.hypot(p.x - start.x, p.z - start.z))
    }
    for (const k of keys) await page.keyboard.up(k)
  }
  return { inside, furthest }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
})

test('the office: never inside a desk, chair, sofa or wall', async ({ page }) => {
  test.setTimeout(180_000)
  const office = page.getByTestId('office-3d')
  await expect(office.locator('canvas')).toBeVisible({ timeout: 30_000 })
  // Reception (the sofa), then the manager's office (desk and chairs).
  await expect
    .poll(async () => (await player(page))?.mode, { timeout: 15_000 })
    .toBe('free')
  const reception = await roam(page, office)
  expect(reception.inside).toBe(0)
  expect(reception.furthest).toBeGreaterThan(1)
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: /office/ })
    .click()
  await expect
    .poll(async () => (await player(page)).x, { timeout: 30_000 })
    .toBeGreaterThan(5)
  await expect
    .poll(async () => (await player(page)).mode, { timeout: 30_000 })
    .toBe('free')
  const manager = await roam(page, office)
  expect(manager.inside).toBe(0)
})

test('home and the places in the neighbourhood: never inside anything', async ({
  page,
}) => {
  test.setTimeout(420_000)
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 20_000 })
  const flat = home.getByTestId('home-3d')
  await expect(flat.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  expect((await roam(page, flat)).inside).toBe(0)

  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  const city = page.getByTestId('city')
  const view = city.getByTestId('city-3d')
  await expect(view.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  expect((await roam(page, view)).inside).toBe(0)
  for (const place of ['gym', 'cafe', 'shop', 'park', 'garage']) {
    await city.getByTestId(`place-${place}`).click()
    await expect(view.locator('canvas')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1500)
    const { inside, furthest } = await roam(page, view)
    expect(inside, place).toBe(0)
    expect(furthest, place).toBeGreaterThan(0.8)
    await city.getByRole('button', { name: 'Back out to the street' }).click()
  }
})
