import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// The people of the office keep to their day: at their desks, at the stand-up
// round the whiteboard, at lunch; they walk where they are going and stop
// there, and someone the player goes to talk to comes back to their desk.

interface Npc {
  id: string
  x: number
  z: number
  status: string
  shown: boolean
  place: string | null
  reason: string
}
const npcs = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimNpcs?: Npc[] }).__worksimNpcs ?? [],
  )
const npc = async (page: Page, id: string) => (await npcs(page)).find((n) => n.id === id)!
const setTime = (page: Page, minute: number) =>
  page.evaluate(`window.__worksim.setTime(1, ${minute})`)

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 30_000,
  })
  await expect.poll(async () => (await npcs(page)).length, { timeout: 20_000 }).toBe(11)
})

test('people walk to the stand-up, stop there, and go back to their desks after', async ({
  page,
}) => {
  test.setTimeout(150_000)
  // Just before the stand-up: everyone in at their desks.
  await setTime(page, 9 * 60 + 11)
  await expect.poll(async () => (await npc(page, 'senior')).place).toBe('desk:senior')
  await page.waitForTimeout(1500)
  // A few minutes on (not a jump): they walk over.
  await setTime(page, 9 * 60 + 15)
  let walked = false
  await expect
    .poll(
      async () => {
        const m = await npc(page, 'manager')
        if (m.status === 'walking') walked = true
        return `${m.place}:${m.status}`
      },
      { timeout: 60_000, intervals: [250] },
    )
    .toBe('standup:host:there')
  expect(walked).toBe(true)
  await expect
    .poll(
      async () =>
        (await npcs(page)).filter((n) => n.reason === 'meeting' && n.status === 'there')
          .length,
      { timeout: 60_000 },
    )
    .toBe(7)
  // There, they stay put: no one paces back and forth.
  const before = await npcs(page)
  await page.waitForTimeout(5000)
  const after = await npcs(page)
  for (const n of before.filter((b) => b.reason === 'meeting')) {
    const later = after.find((a) => a.id === n.id)!
    expect(Math.hypot(later.x - n.x, later.z - n.z), n.id).toBeLessThan(0.01)
  }
  // When it ends, back to their desks.
  await setTime(page, 9 * 60 + 31)
  await expect
    .poll(
      async () =>
        `${(await npc(page, 'senior')).place}:${(await npc(page, 'senior')).status}`,
      {
        timeout: 60_000,
      },
    )
    .toBe('desk:senior:there')
})

test('the office through the day: lunch, then home at the end of it', async ({
  page,
}) => {
  await setTime(page, 12 * 60 + 40)
  await expect.poll(async () => (await npc(page, 'senior')).place).toBe('table:south')
  await expect.poll(async () => (await npc(page, 'coordinator')).shown).toBe(false)
  await setTime(page, 18 * 60 + 30)
  await expect
    .poll(async () => (await npcs(page)).filter((n) => n.shown).length, {
      timeout: 20_000,
    })
    .toBe(0)
})

test('someone the player goes to talk to comes back to their desk, then rejoins', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await setTime(page, 9 * 60 + 18)
  await expect.poll(async () => (await npc(page, 'senior')).place).toBe('standup:0')
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /^Talk to Marcus/ })
    .click({ timeout: 30_000 })
  await expect
    .poll(async () => `${(await npc(page, 'senior')).place}`, { timeout: 30_000 })
    .toBe('desk:senior')
  // The conversation: they stay at the desk while it lasts, then rejoin the stand-up.
  const dialogue = page.getByTestId('office-dialogue')
  await expect(dialogue).toBeVisible({ timeout: 60_000 })
  expect((await npc(page, 'senior')).place).toBe('desk:senior')
  while (await dialogue.isVisible()) {
    await dialogue.getByRole('button').first().click()
    await page.waitForTimeout(300)
  }
  await expect
    .poll(async () => (await npc(page, 'senior')).reason, { timeout: 30_000 })
    .not.toBe('attending')
})
