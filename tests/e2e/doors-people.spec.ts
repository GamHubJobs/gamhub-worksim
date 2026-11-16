import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

/**
 * Other people use the doors too: in the café, customers come in from the
 * street through the front door and leave through it. The door opens for them
 * (the player is across the room, nowhere near it), they walk through the
 * doorway, and it shuts behind them. Development builds log the doors
 * (`__worksimDoors`) and where each person is drawn (`__worksimNpcs`).
 */
type DoorLog = Array<{ x: number; z: number; event: string; state: string; t: number }>
type Npc = { id: string; drawn: { x: number; z: number } | null }

const doors = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimDoors?: DoorLog }).__worksimDoors ?? [],
  )
const people = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimNpcs?: Npc[] }).__worksimNpcs ?? [],
  )
const player = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { __worksimPlayer?: { x: number; z: number } })
        .__worksimPlayer!,
  )

test('café customers open the front door, walk through it, and it shuts behind them', async ({
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
  await page.evaluate("window.__worksimStreetWalk('door-cafe')")
  const cafe = page.getByTestId('city').locator('[data-interior="cafe"]')
  await expect(cafe).toHaveCount(1, { timeout: 60_000 })
  // (Once they have walked in from the doorway.) The café's front door is at (1.25, 4.5).
  await expect
    .poll(
      async () => {
        const me = await player(page)
        return Math.hypot(me.x - 1.25, me.z - 4.5)
      },
      { timeout: 60_000 },
    )
    .toBeGreaterThan(2)

  // A customer (Owen: a visit every 50 minutes from 7:00, for 32) finishes and
  // leaves at 6:32 pm, then comes back at 6:50: out through the door and in again.
  await page.evaluate('window.__worksim.setLifeMinute(18 * 60 + 31)')
  // Watch the door and the people.
  await page.evaluate(() => {
    ;(globalThis as unknown as { __worksimDoors?: DoorLog }).__worksimDoors = []
  })
  const outside = new Set<string>()
  const inside = new Set<string>()
  const throughDoorway = new Set<string>()
  const end = Date.now() + 260_000
  let back = false
  let opened = false
  let shut = false
  while (Date.now() < end && !(opened && shut && throughDoorway.size > 0)) {
    for (const p of await people(page)) {
      if (!p.drawn) continue
      // Out in the street, beyond the front wall, and inside: someone who went
      // through the doorway one way or the other.
      if (p.drawn.z > 4.6) outside.add(p.id)
      else if (p.drawn.z < 4.2) inside.add(p.id)
      if (outside.has(p.id) && inside.has(p.id)) throughDoorway.add(p.id)
    }
    const log = (await doors(page)).filter(
      (d) => Math.abs(d.x - 1.25) < 0.3 && Math.abs(d.z - 4.5) < 0.3,
    )
    opened ||= log.some((d) => d.event === 'opens')
    shut ||= log.some((d) => d.event === 'shut')
    // Gone out: bring him back in.
    if (!back && outside.size > 0) {
      back = true
      await page.evaluate('window.__worksim.setLifeMinute(18 * 60 + 49)')
    }
    await page.waitForTimeout(250)
  }
  console.log('NPCS', outside.size, inside.size, throughDoorway.size, opened, shut)
  // The player stayed away from the door the whole time.
  const now = await player(page)
  expect(Math.hypot(now.x - 1.25, now.z - 4.5)).toBeGreaterThan(1.6)
  expect(opened).toBe(true)
  expect(shut).toBe(true)
  expect(throughDoorway.size).toBeGreaterThan(0)
})
