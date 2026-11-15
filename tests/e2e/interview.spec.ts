/**
 * An interview in person at Harbourside House, the serviced offices on the high
 * street: in the evening, sign in at reception, sit and wait, the interviewer
 * comes out of Meeting Room 2 to call the player in, the interview at the
 * table, and the result in the career notes.
 */
import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')
const shots = process.env.WORKSIM_SHOTS

interface Npc {
  id: string
  x: number
  z: number
  status: string
  place: string | null
}
const interviewer = async (page: Page) =>
  (
    (await page.evaluate(
      () => (globalThis as unknown as { __worksimNpcs?: Npc[] }).__worksimNpcs ?? [],
    )) as Npc[]
  ).find((n) => n.id === 'offices:interviewer')

/** An interview with Harbour Lane Logistics, booked (as if invited after applying). */
const BOOKED = {
  applications: [
    {
      jobId: 'harbour-lane',
      day: 1,
      stage: 'interview',
      since: 1,
      offer: null,
      notes: [],
    },
  ],
  raisePct: 0,
  talkWeek: 0,
  payTalk: null,
  payAnswer: null,
  business: { id: null, sessions: 0, earned: 0, week: 0, weekSessions: 0 },
}

test('an interview in person: sign in, wait, called in, the questions at the table', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page.evaluate('window.__worksimSpeed = 12')

  // The evening, with an interview booked.
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 15_000 })
  await page.evaluate(`window.__worksim.setLife({ career: ${JSON.stringify(BOOKED)} })`)
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page)).toContainText('Out in the neighbourhood')

  // Harbourside House, on the high street.
  const door = city(page).getByTestId('place-offices')
  await expect(door).toContainText('Harbourside House')
  await expect(door).toContainText('Serviced offices')
  await door.click()
  const place = city(page).getByTestId('place')
  await expect(place).toContainText('Harbourside House', { timeout: 30_000 })

  // Steps in order: not before signing in.
  await expect(place.getByTestId('interview-wait')).toBeDisabled()
  await expect(place.getByTestId('interview-room')).toBeDisabled()
  await expect
    .poll(async () => (await interviewer(page))?.place, { timeout: 60_000 })
    .toBe('room')
  if (shots) {
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${shots}/interview/reception.png` })
  }
  await place.getByTestId('interview-sign-in').click()
  await expect(place.getByTestId('interview-wait')).toBeEnabled({ timeout: 60_000 })
  await place.getByTestId('interview-wait').click()

  // The interviewer comes out of the meeting room to call the player in.
  await expect
    .poll(
      async () => {
        const n = await interviewer(page)
        return `${n?.place}:${n?.status}`
      },
      { timeout: 90_000, intervals: [500] },
    )
    .toBe('collect:there')
  await expect(place.getByTestId('interview-room')).toBeEnabled({ timeout: 30_000 })
  if (shots) await page.screenshot({ path: `${shots}/interview/called-in.png` })
  await place.getByTestId('interview-room').click()

  // At the table: the questions.
  const form = place.getByTestId('interview-in-person')
  await expect(form).toBeVisible({ timeout: 90_000 })
  await expect(form).toContainText('In Meeting Room 2')
  await expect(form).toContainText('Harbour Lane Logistics')
  // The interviewer goes back round to the other side of the table, and sits.
  await expect
    .poll(
      async () => {
        const n = await interviewer(page)
        return `${n?.place}:${n?.status}:${n?.x.toFixed(1)},${n?.z.toFixed(1)}`
      },
      { timeout: 60_000, intervals: [1000] },
    )
    .toMatch(/^room:there:/)
  if (shots) {
    await page.waitForTimeout(4000)
    await page.screenshot({ path: `${shots}/interview/at-the-table.png` })
  }
  // An answer to each of the three questions (graded as on video; the unit tests
  // check the scores and the offer).
  const groups = form.locator('fieldset')
  await expect(groups).toHaveCount(3)
  for (let i = 0; i < 3; i++) await groups.nth(i).getByRole('radio').first().check()
  await form.getByRole('button', { name: 'Finish the interview' }).click()
  await expect(place.getByTestId('interview-done')).toBeVisible()
  await expect(city(page).getByTestId('city-log')).toContainText(
    'Interview with Harbour Lane Logistics at Harbourside House',
  )
  // Interviewed: nothing more to do here.
  await expect(place.getByTestId('no-interview')).toBeVisible()
})
