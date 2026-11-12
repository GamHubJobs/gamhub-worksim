import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Everyone can be talked to: walk up (E) or click them, they stop, turn to the
// player and wave, there is something to say that fits who they are and what
// they are doing, and afterwards they go back to their day.

interface Someone {
  id: string
  name: string
  kind: string
  availability: string
  x: number
  z: number
  heading: number
  talking: boolean
}
const people = (page: Page) =>
  page.evaluate(
    () =>
      (
        globalThis as unknown as { __worksimPeople?: () => Someone[] }
      ).__worksimPeople?.() ?? [],
  )
const person = async (page: Page, id: string) =>
  (await people(page)).find((p) => p.id === id)
const player = (page: Page) =>
  page.evaluate(
    () =>
      (
        globalThis as unknown as {
          __worksimPlayer: { x: number; z: number; mode: string }
        }
      ).__worksimPlayer,
  )
const talkTo = (page: Page, id: string) =>
  page.evaluate(
    (who) =>
      (globalThis as unknown as { __worksimTalk: (id: string) => void }).__worksimTalk(
        who,
      ),
    id,
  )
const encounter = (page: Page) => page.getByTestId('encounter')

let problems: string[] = []
test.beforeEach(async ({ page }) => {
  problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 90_000,
  })
  // (Everyone who has arrived for the day.)
  await expect
    .poll(async () => (await people(page)).length, { timeout: 90_000 })
    .toBeGreaterThan(5)
})
test.afterEach(() => expect(problems).toEqual([]))

test('a colleague in the office: walked over to, turns and waves, talks, goes back to work', async ({
  page,
}) => {
  test.setTimeout(360_000)
  // Mid-morning: Grace, the bookkeeper, is at her desk.
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 40)')
  await expect
    .poll(async () => (await person(page, 'backL'))?.availability, { timeout: 30_000 })
    .toBe('working')
  await talkTo(page, 'backL')
  // She is talking to the player straight away (stopped, turning to them).
  await expect
    .poll(async () => (await person(page, 'backL'))?.talking, { timeout: 30_000 })
    .toBe(true)
  await expect(encounter(page)).toBeVisible({ timeout: 120_000 })
  await expect(encounter(page)).toHaveAttribute('data-person', 'backL')
  await expect(encounter(page)).toContainText('Grace Mensah')
  await expect(encounter(page)).toContainText("I'm Grace")
  // The player is beside her, facing her.
  const me = await player(page)
  const her = (await person(page, 'backL'))!
  expect(Math.hypot(me.x - her.x, me.z - her.z)).toBeLessThan(1.6)
  // Options that fit a colleague.
  await expect(
    encounter(page).getByRole('button', { name: /Offer Grace a hand/ }),
  ).toBeVisible()
  // Just saying hello and goodbye (no time passes): she is still there, and E
  // (the usual key) talks to her again.
  await encounter(page).getByRole('button', { name: 'Say goodbye' }).click()
  await encounter(page).getByRole('button', { name: 'Close' }).click()
  await expect(encounter(page)).toHaveCount(0)
  await expect(page.getByTestId('office-3d')).toContainText(/talk to Grace/, {
    timeout: 20_000,
  })
  // (As a player does: the keys go to the 3D view.)
  await page.getByTestId('office-3d').focus()
  await page.keyboard.press('e')
  await expect(encounter(page)).toHaveAttribute('data-person', 'backL', {
    timeout: 120_000,
  })
  await encounter(page).getByRole('button', { name: 'Chat with Grace' }).click()
  await expect(encounter(page)).toContainText('Grace:')
  await expect(encounter(page)).toContainText(/warms to you/)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/people/office-colleague.png`,
  })
  // A second thing to say, in the same conversation; then goodbye.
  await encounter(page)
    .getByRole('button', { name: /what they are working on/ })
    .click()
  await page.keyboard.press('Escape')
  await expect(encounter(page)).toHaveCount(0)
  // Back to her day.
  await expect
    .poll(async () => (await person(page, 'backL'))?.talking, { timeout: 30_000 })
    .toBe(false)
})

test('someone busy says so: at the stand-up, a colleague only lifts a hand', async ({
  page,
}) => {
  test.setTimeout(360_000)
  await page.evaluate('window.__worksim.setTime(1, 9 * 60 + 20)')
  await expect
    .poll(async () => (await person(page, 'front2'))?.availability, { timeout: 120_000 })
    .toBe('meeting')
  const before = (await person(page, 'front2'))!
  await talkTo(page, 'front2')
  await expect(encounter(page)).toBeVisible({ timeout: 120_000 })
  await expect(encounter(page)).toContainText('In a meeting')
  await expect(
    encounter(page).getByRole('button', { name: 'Say you will come back later' }),
  ).toBeVisible()
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/people/office-busy.png`,
  })
  // She stays at the stand-up.
  const after = (await person(page, 'front2'))!
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.05)
  await encounter(page)
    .getByRole('button', { name: 'Say you will come back later' })
    .click()
  await encounter(page).getByRole('button', { name: 'Close' }).click()
})

test('clicking someone walks over to talk to them', async ({ page }) => {
  test.setTimeout(360_000)
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 40)')
  await expect
    .poll(async () => (await person(page, 'analyst'))?.availability, { timeout: 30_000 })
    .toBe('working')
  const view = page.getByTestId('office-3d')
  for (let attempt = 0; attempt < 4; attempt++) {
    const a = (await person(page, 'analyst'))!
    const at = await page.evaluate(
      ([x, z]) =>
        (
          globalThis as unknown as {
            __worksimProject: (
              x: number,
              y: number,
              z: number,
            ) => { x: number; y: number }
          }
        ).__worksimProject(x, 1.0, z),
      [a.x, a.z],
    )
    await page.mouse.move(at.x, at.y)
    await page.waitForTimeout(400)
    await page.mouse.click(at.x, at.y)
    const went = await expect
      .poll(async () => (await person(page, 'analyst'))?.talking, { timeout: 3000 })
      .toBe(true)
      .then(() => true)
      .catch(() => false)
    if (went) break
    // Not in view from here: turn the camera a little and try again.
    await view.hover()
    await page.keyboard.down('q')
    await page.waitForTimeout(500)
    await page.keyboard.up('q')
  }
  await expect(encounter(page)).toHaveAttribute('data-person', 'analyst', {
    timeout: 120_000,
  })
  await expect(encounter(page)).toContainText('Arjun')
})

test('out in town: the barista, a gym member mid-run, a local in the street', async ({
  page,
}) => {
  test.setTimeout(420_000)
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 15_000 })
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  const city = page.getByTestId('city')
  await expect(city).toContainText('Out in the neighbourhood')

  // A local walking down the street.
  await expect(city.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await expect
    .poll(async () => (await people(page)).filter((p) => p.kind === 'neighbour').length, {
      timeout: 30_000,
    })
    .toBeGreaterThan(0)
  const local = (await people(page)).find((p) => p.kind === 'neighbour')!
  await talkTo(page, local.id)
  await expect(encounter(page)).toBeVisible({ timeout: 90_000 })
  await expect(encounter(page)).toContainText(/new one on the street/)
  await expect(
    encounter(page).getByRole('button', { name: 'Ask what is on locally' }),
  ).toBeVisible()
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/people/street-local.png`,
  })
  await encounter(page).getByRole('button', { name: 'Ask what is on locally' }).click()
  await encounter(page).getByRole('button', { name: 'Goodbye' }).click()

  // The café: the barista, across the counter.
  await city.getByTestId('place-cafe').click()
  await expect(city.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 30_000,
  })
  await expect
    .poll(async () => await person(page, 'cafe:barista'), { timeout: 30_000 })
    .toBeTruthy()
  await talkTo(page, 'cafe:barista')
  await expect(encounter(page)).toHaveAttribute('data-person', 'cafe:barista', {
    timeout: 120_000,
  })
  await expect(encounter(page)).toContainText("I'm Maya")
  await encounter(page).getByRole('button', { name: 'Ask what is good today' }).click()
  await expect(encounter(page)).toContainText('banana bread')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/people/cafe-barista.png`,
  })
  await encounter(page).getByRole('button', { name: 'Goodbye' }).click()

  // The gym: a member on the treadmill keeps running.
  await city.getByRole('button', { name: 'Back out to the street' }).click()
  await city.getByTestId('place-gym').click()
  await expect(city.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 30_000,
  })
  await expect
    .poll(async () => await person(page, 'gym:runner1'), { timeout: 30_000 })
    .toBeTruthy()
  await talkTo(page, 'gym:runner1')
  await expect(encounter(page)).toBeVisible({ timeout: 120_000 })
  await expect(encounter(page)).toContainText('Mid-set')
  await encounter(page)
    .getByRole('button', { name: 'Say you will come back later' })
    .click()
  await encounter(page).getByRole('button', { name: 'Close' }).click()
  // The trainer has advice.
  await talkTo(page, 'gym:trainer')
  await expect(encounter(page)).toHaveAttribute('data-person', 'gym:trainer', {
    timeout: 120_000,
  })
  await encounter(page).getByRole('button', { name: 'Ask for fitness guidance' }).click()
  await expect(encounter(page)).toContainText('A fitness tip.')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/people/gym-trainer.png`,
  })
})
