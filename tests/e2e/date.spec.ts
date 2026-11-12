import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// A date, played in the world: getting to know someone and asking them out
// (they say yes when things have got there), then on the evening, they wait
// at the café; the player walks up, they sit down to dinner together, talk
// for three rounds, asking (and being answered) before holding hands or a
// kiss, and the evening ends with how it went.

const talkTo = (page: Page, id: string) =>
  page.evaluate(
    (who) =>
      (globalThis as unknown as { __worksimTalk: (id: string) => void }).__worksimTalk(
        who,
      ),
    id,
  )
const people = (page: Page) =>
  page.evaluate(
    () =>
      (
        globalThis as unknown as { __worksimPeople?: () => Array<{ id: string }> }
      ).__worksimPeople?.() ?? [],
  )

async function toTown(page: Page) {
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

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
})

test('asking Maya out in person, and the date at the café that evening', async ({
  page,
}) => {
  test.setTimeout(600_000)
  // Friends already, who have talked about baking: asked out today, the date tonight.
  await page.evaluate(
    "window.__worksim.setBond('cafe:barista', { stage: 'friends', closeness: 45, attraction: 40, known: ['baking'] })",
  )
  await toTown(page)
  const city = page.getByTestId('city')
  await city.getByTestId('place-cafe').click()
  await expect(city.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect
    .poll(async () => (await people(page)).some((p) => p.id === 'cafe:barista'), {
      timeout: 60_000,
    })
    .toBe(true)
  await talkTo(page, 'cafe:barista')
  const encounter = page.getByTestId('encounter')
  await expect(encounter).toBeVisible({ timeout: 120_000 })
  await encounter.getByRole('button', { name: 'Ask Maya out on a date' }).click()
  await expect(encounter).toContainText('I would like that. Yes.')
  await expect(encounter).toContainText(/A date with Maya/)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/asked-out.png`,
  })
  await encounter.getByRole('button', { name: /Goodbye|Close/ }).click()

  // On the evening (her free day may be later in the week: the date is moved to tonight
  // for the test), at seven, she is waiting at the table.
  await page.evaluate(
    "window.__worksim.setBond('cafe:barista', { date: { day: 1, minute: 1140, place: 'cafe' } })",
  )
  await page.evaluate('window.__worksim.setLifeMinute(19 * 60)')
  await city.getByRole('button', { name: 'Back out to the street' }).click()
  await city.getByTestId('place-cafe').click()
  await expect(city.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect
    .poll(async () => (await people(page)).some((p) => p.id === 'cafe:barista'), {
      timeout: 60_000,
    })
    .toBe(true)
  await talkTo(page, 'cafe:barista')
  const date = page.getByTestId('date')
  await expect(date).toBeVisible({ timeout: 120_000 })
  await expect(date).toContainText('You came!')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/date-greet.png`,
  })
  const balance = await city.getByTestId('balance').textContent()
  // Dinner together: the player orders, sits down at the table across from her, and eats.
  await date.getByRole('button', { name: /Sit down with Maya for dinner/ }).click()
  await expect(date.getByText('Round 1 of 3')).toBeVisible({ timeout: 180_000 })
  await expect(city.getByTestId('balance')).not.toHaveText(balance!)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/date-dinner.png`,
  })
  await date.getByRole('button', { name: 'Talk about baking' }).click()
  await expect(date).toContainText('You remembered!')
  await date.getByRole('button', { name: 'Ask if you can hold their hand' }).click()
  await expect(date).toContainText('takes your hand')
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/holding-hands.png`,
  })
  // Too soon for a kiss: “not yet”, and that is respected.
  await date.getByRole('button', { name: 'Ask if you can kiss them goodnight' }).click()
  await expect(date).toContainText('Not yet')
  await expect(date).toContainText('completely fine')
  await expect(date.getByTestId('date-summary')).toContainText('dating now')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/date-end.png`,
  })
  // Goodnight, standing face to face (a hug: they are close enough, and a kiss was not yet).
  // (At normal speed, to see it.)
  await page.evaluate('window.__worksimSpeed = 1')
  await date.getByRole('button', { name: 'Say goodnight' }).click()
  await expect
    .poll(() => page.evaluate('window.__worksimPlayer.mode'), { timeout: 30_000 })
    .toBe('acting')
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/goodnight.png`,
  })
  await expect(date).toHaveCount(0, { timeout: 20_000 })
})
