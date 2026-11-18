import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

/**
 * The district's workplaces are used (city/scene/CityScene.tsx, COMERS): staff
 * and visitors walk to the hospital, the office tower and Northbank's office,
 * their automatic doors open for them, and they go in, out of sight for a
 * while before coming back out. The player is far away at the other end of the
 * street. Development builds log the doors (`__worksimDoors`).
 */
type DoorLog = Array<{ x: number; z: number; event: string }>

const doors = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimDoors?: DoorLog }).__worksimDoors ?? [],
  )

test("people go in and out of the district's workplaces through their doors", async ({
  page,
}) => {
  test.setTimeout(420_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(page.getByTestId('home')).toContainText('Evening at home', {
    timeout: 15_000,
  })
  await page
    .getByTestId('home')
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await page
    .getByTestId('home')
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(page.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  const player = (await page.evaluate(
    () => (globalThis as unknown as { __worksimPlayer?: { x: number } }).__worksimPlayer,
  )) as { x: number } | undefined
  // The player is at the other end of the street, nowhere near the district.
  expect(player?.x ?? 0).toBeLessThan(40)
  const opened = (log: DoorLog, x: number, z: number) =>
    log.some((d) => d.event === 'opens' && Math.hypot(d.x - x, d.z - z) < 1.5)
  await expect
    .poll(
      async () => {
        const log = await doors(page)
        return {
          northbank: opened(log, 66, 25.8),
          hospital: opened(log, 78.9, -19),
          tower: opened(log, 80.1, 22),
        }
      },
      { timeout: 240_000, intervals: [2000] },
    )
    .toEqual({ northbank: true, hospital: true, tower: true })
})
