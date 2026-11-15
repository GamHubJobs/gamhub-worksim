import { expect, test, type Page } from '@playwright/test'
import { sitAtComputer, startCareerIfNeeded } from './helpers.ts'

const dialogue = (page: Page) => page.getByTestId('office-dialogue')

test('when the player is overloaded, Priya comes over to check in', async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await sitAtComputer(page)

  // A stressful morning (set directly; the development-only hook saves time).
  await page.evaluate('window.__worksim.passTime(40)')
  await page.evaluate('window.__worksim.setWellbeing({ stress: 85 })')

  // Priya comes to the desk; the reminder does not block work.
  const notices = page.getByTestId('notices')
  await expect(notices).toContainText('Priya has come over to your desk')
  await notices.getByRole('button', { name: 'Talk to Priya' }).click()

  await expect(dialogue(page)).toContainText('under a lot of pressure')
  await dialogue(page)
    .getByRole('button', { name: /Be honest about your workload/ })
    .click()
  await expect(dialogue(page)).toContainText('move your next deadline by a day')
  await expect(dialogue(page)).toContainText('Stress −10')
  await expect(dialogue(page)).toContainText('Deadline moved by one day')
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()
  await expect(page.getByTestId('event-waiting')).toHaveCount(0)
})

test('in the 3D office she really comes over to the desk, and is talked to there', async ({
  page,
}) => {
  test.setTimeout(240_000)
  interface Npc {
    id: string
    x: number
    z: number
    status: string
    place: string | null
  }
  const manager = async () =>
    (
      (await page.evaluate(
        () => (globalThis as unknown as { __worksimNpcs?: Npc[] }).__worksimNpcs ?? [],
      )) as Npc[]
    ).find((n) => n.id === 'manager')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 90_000,
  })
  await expect
    .poll(async () => (await manager())?.place, { timeout: 30_000 })
    .toBeTruthy()
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 30)')
  await page.waitForTimeout(1500)
  await page.evaluate('window.__worksim.setWellbeing({ stress: 85 })')

  // She walks across the office from her own room to the player's desk.
  const card = page.getByTestId('event-waiting')
  await expect(card).toContainText('has come over to your desk', { timeout: 30_000 })
  await expect
    .poll(
      async () => {
        const m = await manager()
        return `${m?.place}:${m?.status}`
      },
      { timeout: 90_000, intervals: [500] },
    )
    .toBe('call:player:there')
  const m = (await manager())!
  expect(Math.hypot(m.x - 0.68, m.z - 1.9)).toBeLessThan(1.6)
  const shots = process.env.WORKSIM_SHOTS
  if (shots) await page.screenshot({ path: `${shots}/events/manager-at-desk.png` })

  // Walking up to her: what she came about, face to face.
  await page.evaluate("window.__worksimWalk('person:manager')")
  await expect(dialogue(page)).toContainText('under a lot of pressure', {
    timeout: 60_000,
  })
  if (shots) await page.screenshot({ path: `${shots}/events/manager-talk.png` })
  await dialogue(page)
    .getByRole('button', { name: /Be honest about your workload/ })
    .click()
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()
  await expect(card).toHaveCount(0)
  // Done: she goes back to her own room.
  await expect
    .poll(async () => (await manager())?.place, { timeout: 30_000 })
    .not.toBe('call:player')
})
