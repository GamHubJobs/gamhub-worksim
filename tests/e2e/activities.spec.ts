import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// People doing real things with real things (see docs/NPC_ACTIVITIES.md),
// measured in the 3D scenes themselves: everyone seated is on a real seat
// (the hips on its cushion, not above it or sunk in), one person a seat,
// facing the way it faces; nothing is done without what it needs (typing
// needs a keyboard, a reach needs a shelf, a printer or a till); and what is
// held matches what is done (a phone to the ear, a document to read, a
// clipboard and a pen to write, a cup to drink).

interface Anchor {
  id: string
  kind: string
  x: number
  z: number
  top?: number
}
interface Crowd {
  id: string
  shown: boolean
  status: string
  clip: string | null
  seat: string | null
  held: string[]
  rejected: Array<{ clip: string; why: string }>
  hip: number | null
  top: number | null
  drawn: { x: number; z: number } | null
  target: string | null
}
interface Pose {
  id: string
  hip: number
  top: number | null
  seat: string | null
  seatAt: { x: number; z: number } | null
  at: { x: number; z: number }
  clips: string[]
  rejected: Array<{ clip: string; why: string }>
  held: string[]
}

const anchors = (page: Page) =>
  page.evaluate(() =>
    (globalThis as unknown as { __worksimAnchors: () => Anchor[] }).__worksimAnchors(),
  )
const crowd = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimNpcs?: Crowd[] }).__worksimNpcs ?? [],
  )
const poses = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { __worksimPoses?: () => Pose[] }).__worksimPoses?.() ??
      [],
  )

/** What each activity must hold. */
const HOLDS: Record<string, string[]> = {
  phone: ['phone'],
  read: ['document'],
  write: ['clipboard', 'pen'],
  drink: ['cup'],
  eat: ['sandwich'],
}
const NEEDS: Record<string, string[]> = {
  type: ['keyboard'],
  reach: ['shelf', 'printer', 'counter', 'checkout', 'coffee-machine', 'water', 'plant'],
  present: ['whiteboard'],
}
const SEAT_CONTACT = 0.075

function checkCrowd(list: Crowd[], all: Anchor[]) {
  const byId = new Map(all.map((a) => [a.id, a]))
  const seats = new Set<string>()
  let seated = 0
  for (const n of list.filter((q) => q.shown && q.status === 'there')) {
    expect(n.rejected, `${n.id} at a place where something cannot be done`).toEqual([])
    if (n.seat) {
      seated++
      expect(seats.has(n.seat), `${n.id} on someone else's seat`).toBe(false)
      seats.add(n.seat)
      const seat = byId.get(n.seat)!
      expect(seat.kind).toBe('seat')
      // On the seat: the hips at its cushion, drawn where it is.
      expect(Math.abs(n.hip! - (n.top! + SEAT_CONTACT)), `${n.id} hips`).toBeLessThan(
        0.02,
      )
      expect(Math.hypot(n.drawn!.x - seat.x, n.drawn!.z - seat.z), n.id).toBeLessThan(
        0.06,
      )
    } else if (n.hip !== null) {
      // Standing: never a seated pose with nothing under them.
      expect(n.hip, `${n.id} standing hips`).toBeGreaterThan(0.8)
    }
    if (n.clip && HOLDS[n.clip])
      expect(n.held, `${n.id} ${n.clip}`).toEqual(expect.arrayContaining(HOLDS[n.clip]))
    if (n.clip && NEEDS[n.clip]) expect(NEEDS[n.clip]).toContain(n.target)
  }
  return seated
}

function checkPoses(list: Pose[]) {
  const seats = new Set<string>()
  for (const p of list) {
    expect(p.rejected, `${p.id} doing something without what it needs`).toEqual([])
    if (p.seat) {
      expect(seats.has(p.seat), `${p.id} on someone else's seat`).toBe(false)
      seats.add(p.seat)
      expect(Math.abs(p.hip - (p.top! + SEAT_CONTACT)), `${p.id} hips`).toBeLessThan(0.02)
    } else expect(p.hip, `${p.id} standing hips`).toBeGreaterThan(0.8)
  }
}

async function evening(page: Page) {
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
  await expect(page.getByTestId('city')).toContainText('Out in the neighbourhood')
}

async function enter(page: Page, place: string, name: RegExp) {
  await page.getByTestId('city').getByTestId(`place-${place}`).click()
  await expect(page.getByTestId('city')).toContainText(name, { timeout: 30_000 })
  await expect
    .poll(async () => (await poses(page)).length, { timeout: 90_000 })
    .toBeGreaterThan(0)
  await page.waitForTimeout(3000)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
})

test('the office: everyone seated is on a real chair, and works with real things', async ({
  page,
}) => {
  test.setTimeout(400_000)
  // Mid-morning: at their desks, the printer, the kitchen, the standing desk.
  await page.evaluate(`window.__worksim.setTime(1, 10 * 60 + 20)`)
  await expect
    .poll(async () => (await crowd(page)).filter((n) => n.shown).length, {
      timeout: 90_000,
    })
    .toBeGreaterThan(4)
  await page.waitForTimeout(4000)
  // Over half a minute, as they change between what they do.
  let seated = 0
  const seen = new Set<string>()
  for (let i = 0; i < 8; i++) {
    const list = await crowd(page)
    seated = Math.max(seated, checkCrowd(list, await anchors(page)))
    for (const n of list) if (n.clip) seen.add(n.clip)
    await page.waitForTimeout(3500)
  }
  expect(seated).toBeGreaterThanOrEqual(3)
  expect(seen).toContain('type')
  await page.screenshot({ path: 'docs/screenshots/activities/office.png' })
  // The lunch hour: the break room table, the kitchen.
  await page.evaluate(`window.__worksim.setTime(1, 13 * 60 + 5)`)
  await page.waitForTimeout(5000)
  checkCrowd(await crowd(page), await anchors(page))
  await page.getByRole('button', { name: 'Break room' }).click()
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'docs/screenshots/activities/break-room.png' })
})

test('the café and the shop: seats, equipment and what is held', async ({ page }) => {
  test.setTimeout(600_000)
  await evening(page)
  await enter(page, 'cafe', /Kettle & Crumb/)
  checkPoses(await poses(page))
  const cafe = await poses(page)
  expect(cafe.find((p) => p.id === 'cafe:reader')).toMatchObject({
    clips: expect.arrayContaining(['read']),
  })
  expect(cafe.find((p) => p.id === 'cafe:reader')!.seat).not.toBeNull()
  expect(cafe.find((p) => p.id === 'cafe:barista')!.clips).toContain('reach')
  await page.screenshot({ path: 'docs/screenshots/activities/cafe.png' })
  await page
    .getByTestId('city')
    .getByRole('button', { name: 'Back out to the street' })
    .click()

  await expect(page.getByTestId('city')).toContainText('Out in the neighbourhood', {
    timeout: 30_000,
  })
  await enter(page, 'shop', /Daily Basket/)
  checkPoses(await poses(page))
  const shop = await poses(page)
  for (const id of ['shop:shopper', 'shop:cashier'])
    expect(shop.find((p) => p.id === id)!.clips, id).toContain('reach')
  await page.screenshot({ path: 'docs/screenshots/activities/shop.png' })
})
