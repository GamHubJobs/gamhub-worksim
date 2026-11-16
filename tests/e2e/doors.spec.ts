import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

/**
 * Doors are real, moving 3D objects (world/doors): they open for the player
 * going through them and for anyone walking up to them, close behind, latch,
 * and a locked one stays shut and rattles. Development builds log what each
 * door did, by where it is, in `__worksimDoors`.
 */
type DoorLog = Array<{ x: number; z: number; event: string; state: string; t: number }>

const doors = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimDoors?: DoorLog }).__worksimDoors ?? [],
  )
const clearDoors = (page: Page) =>
  page.evaluate(() => {
    ;(globalThis as unknown as { __worksimDoors?: DoorLog }).__worksimDoors = []
  })
const at = (log: DoorLog, x: number, z: number, event: string) =>
  log.some((d) => Math.abs(d.x - x) < 0.3 && Math.abs(d.z - z) < 0.3 && d.event === event)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

test('in and out through doors: home, the street, the café; the court’s is locked', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 15_000 })
  await expect(home.locator('canvas')).toBeVisible({ timeout: 60_000 })
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await page.waitForTimeout(1500)
  // At normal speed: a door is pushed for a second, a few frames at the low frame rate.
  await page.evaluate('window.__worksimSpeed = 1')
  await clearDoors(page)

  // Going out: the flat's front door swings open as the player pushes it.
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  const street = page.getByTestId('city').getByTestId('city-3d')
  await expect(street.locator('canvas')).toBeVisible({ timeout: 60_000 })
  let log = await doors(page)
  // (The flat is about 10 m across, so its door is near the middle of its own space.)
  expect(log.some((d) => Math.abs(d.x) < 8 && d.event === 'opens')).toBe(true)

  // Out in the street: the building's street door is open behind them, then shuts.
  await expect
    .poll(async () => at(await doors(page), -40, 10, 'shut'), { timeout: 20_000 })
    .toBe(true)
  log = await doors(page)
  expect(at(log, -40, 10, 'opens')).toBe(true)

  // The court's doors are locked: tried, they rattle and stay shut.
  await clearDoors(page)
  await page.evaluate("window.__worksimStreetWalk('door-court')")
  await expect
    .poll(async () => at(await doors(page), 16, -10, 'rattle'), { timeout: 60_000 })
    .toBe(true)
  log = await doors(page)
  expect(
    log.filter((d) => Math.abs(d.x - 16) < 0.3).every((d) => d.state === 'locked'),
  ).toBe(true)

  // Into the café: its door opens as the player gets to it, before they go in.
  await clearDoors(page)
  await page.evaluate("window.__worksimStreetWalk('door-cafe')")
  await expect
    .poll(async () => at(await doors(page), -40, -10, 'opens'), { timeout: 60_000 })
    .toBe(true)
})

test('the office: the manager’s door opens for the player, and shuts behind', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await page.evaluate('window.__worksimSpeed = 1')
  await clearDoors(page)
  await page.getByRole('button', { name: /’s office/ }).click()
  await expect
    .poll(async () => at(await doors(page), 5, -2.8, 'opens'), { timeout: 60_000 })
    .toBe(true)
  await expect
    .poll(async () => at(await doors(page), 5, -2.8, 'shut'), { timeout: 60_000 })
    .toBe(true)
})
