/**
 * Office life in person (living scenarios S7): a new colleague's first day (the
 * manager brings them over to the desk), a jammed printer (the facilities
 * colleague waits at it for a hand), and the team's Friday cake in the break
 * room (everyone gathers round the table; the player joins them).
 */
import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

interface Npc {
  id: string
  x: number
  z: number
  status: string
  place: string | null
}
const npcs = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as { __worksimNpcs?: Npc[] }).__worksimNpcs ?? [],
  ) as Promise<Npc[]>
const npc = async (page: Page, id: string) => (await npcs(page)).find((n) => n.id === id)
const at = async (page: Page, id: string) => {
  const n = await npc(page, id)
  return `${n?.place}:${n?.status}`
}
const dialogue = (page: Page) => page.getByTestId('office-dialogue')
const shots = process.env.WORKSIM_SHOTS

test.setTimeout(240_000)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 90_000,
  })
  await expect.poll(async () => (await npcs(page)).length, { timeout: 30_000 }).toBe(12)
})

async function finish(page: Page) {
  while (await dialogue(page).isVisible()) {
    await dialogue(page).getByRole('button').first().click()
    await page.waitForTimeout(300)
  }
}

test('a new colleague’s first day: the manager brings them over to the desk', async ({
  page,
}) => {
  // Not in before their first day.
  expect((await npc(page, 'starter'))?.place).toBeNull()
  await page.evaluate('window.__worksim.setTime(3, 9 * 60 + 50)')
  await page.waitForTimeout(1500)
  await page.evaluate('window.__worksim.passTime(1)')
  const card = page.getByTestId('event-waiting')
  await expect(card).toContainText('has come over to your desk', { timeout: 30_000 })
  await expect
    .poll(async () => `${await at(page, 'manager')} ${await at(page, 'starter')}`, {
      timeout: 90_000,
      intervals: [500],
    })
    .toBe('call:player:there call:player2:there')
  if (shots) await page.screenshot({ path: `${shots}/office/new-starter.png` })
  await page.evaluate("window.__worksimWalk('person:manager')")
  await expect(dialogue(page)).toContainText('joins the team today', { timeout: 60_000 })
  await dialogue(page)
    .getByRole('button', { name: /Offer to show .* how things work here/ })
    .click()
  await expect(dialogue(page)).toContainText('That would be brilliant')
  await finish(page)
  // Then the new starter settles in at the break room table.
  await expect
    .poll(async () => (await npc(page, 'starter'))?.place, { timeout: 60_000 })
    .not.toBe('call:player2')
})

test('the printer jams: the facilities colleague waits at it for a hand', async ({
  page,
}) => {
  // Tuesday afternoon.
  await page.evaluate('window.__worksim.setTime(2, 14 * 60 + 20)')
  await page.waitForTimeout(1500)
  await page.evaluate('window.__worksim.passTime(1)')
  const card = page.getByTestId('event-waiting')
  await expect(card).toContainText('is at the printer', { timeout: 30_000 })
  await expect
    .poll(async () => at(page, 'facilities'), { timeout: 90_000, intervals: [500] })
    .toBe('call:printer:there')
  // Go: over to the printer, and what to do about it.
  await card.getByRole('button', { name: 'Go' }).click()
  await expect(dialogue(page)).toContainText('Paper jam in tray 2', { timeout: 60_000 })
  if (shots) await page.screenshot({ path: `${shots}/office/printer-jam.png` })
  await dialogue(page)
    .getByRole('button', { name: /ease the sheet out gently/ })
    .click()
  await expect(dialogue(page)).toContainText('comes out in one piece')
  await finish(page)
  // Dealt with (the next thing, such as an overdue deadline, may come after).
  await expect(card.filter({ hasText: 'is at the printer' })).toHaveCount(0)
})

test('Friday cake: the team gathers in the break room, and the player joins them', async ({
  page,
}) => {
  // Friday, just before a quarter past four: everyone walks over.
  await page.evaluate('window.__worksim.setTime(5, 16 * 60 + 10)')
  await page.waitForTimeout(1500)
  await page.evaluate('window.__worksim.setTime(5, 16 * 60 + 16)')
  const cake = page.getByTestId('celebration')
  await expect(cake).toContainText('Friday cake in the break room', { timeout: 30_000 })
  await expect
    .poll(
      async () =>
        (await npcs(page)).filter(
          (n) => n.place?.startsWith('party:') && n.status === 'there',
        ).length,
      { timeout: 90_000, intervals: [500] },
    )
    .toBeGreaterThanOrEqual(5)
  // (At its real pace, to see it: the tests otherwise play activities faster.)
  await page.evaluate(
    "window.__worksimSpeed = 1; sessionStorage.setItem('worksim.testSpeed', '1')",
  )
  await cake.getByRole('button', { name: 'Join the team for cake' }).click()
  await page.waitForTimeout(9000)
  if (shots) await page.screenshot({ path: `${shots}/office/friday-cake.png` })
  await expect(cake).toHaveCount(0, { timeout: 60_000 })
})
