/**
 * Social life in the neighbourhood, in person (living scenarios S7): the
 * neighbour outside the building calls over to the player, who stops to chat;
 * and a friend met at Millpond Park for a run, who runs the laps alongside.
 * (A drink with a friend at the café is in life.spec.ts.)
 */
import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')
const shots = process.env.WORKSIM_SHOTS

test.setTimeout(240_000)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

async function eveningOut(page: Page, day: number) {
  await page.evaluate(`window.__worksim.setTime(${day}, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 20_000 })
}

async function goOut(page: Page) {
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page)).toContainText('Out in the neighbourhood')
  await expect(city(page).getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
}

test('the neighbour calls over from outside the building; a chat in the street', async ({
  page,
}) => {
  // Tuesday evening: Aisha is outside with her shopping.
  await eveningOut(page, 2)
  await goOut(page)
  const notice = city(page).getByTestId('city-notice')
  await expect(notice).toContainText('Aisha waves from outside your building', {
    timeout: 30_000,
  })
  if (shots) await page.screenshot({ path: `${shots}/city/neighbour-calls.png` })
  await page.evaluate("window.__worksimStreetWalk('person:friend:aisha')")
  await expect(page.getByTestId('encounter')).toContainText('Aisha', { timeout: 60_000 })
  await expect(city(page).getByTestId('city-log')).toContainText(
    'Stopped to chat with Aisha, your neighbour',
  )
})

test('a run round Millpond Park with a friend, who runs alongside', async ({ page }) => {
  await eveningOut(page, 1)
  // Dan's invitation to a run at 7, accepted (as if from the phone).
  const social = {
    friends: {},
    messages: [
      {
        id: 'run-1',
        from: 'dan',
        day: 1,
        minute: 17 * 60 + 50,
        text: 'Easy run round Millpond Park at 7? Just a few laps, I promise.',
        read: true,
        invite: { kind: 'run', status: 'accepted' },
      },
    ],
  }
  await page.evaluate(`window.__worksim.setLife({ social: ${JSON.stringify(social)} })`)
  await goOut(page)
  await city(page).getByTestId('place-park').click()
  const meet = city(page).getByTestId('meet-friend')
  await expect(meet).toContainText('Go for a run with Dan', { timeout: 30_000 })
  await expect(meet).toContainText('Dan is waiting for you here')
  await page.waitForTimeout(2000)
  if (shots) await page.screenshot({ path: `${shots}/city/friend-waiting-park.png` })
  // (At its real pace, to see them run together.)
  await page.evaluate(
    "window.__worksimSpeed = 1; sessionStorage.setItem('worksim.testSpeed', '1')",
  )
  await meet.click()
  // Running together (once the player has walked over and said hello): Dan keeps a
  // pace or so from the player.
  type Run = { together: boolean; x: number; z: number; playerX: number; playerZ: number }
  const runNow = async () =>
    ((await page.evaluate('window.__worksimFriendRun')) as Run | undefined) ?? null
  await expect
    .poll(async () => (await runNow())?.together, { timeout: 60_000, intervals: [250] })
    .toBe(true)
  await page.waitForTimeout(2500)
  if (shots) await page.screenshot({ path: `${shots}/city/friend-run.png` })
  const run = (await runNow())!
  expect(Math.hypot(run.x - run.playerX, run.z - run.playerZ)).toBeLessThan(2.5)
  await expect(city(page).getByTestId('city-log')).toContainText(
    'A run round Millpond Park with Dan',
    { timeout: 90_000 },
  )
  await expect(meet).toHaveCount(0)
})

test('a parcel for next door: taken in from the courier, then taken round', async ({
  page,
}) => {
  // Thursday evening, at seven: the courier rings with a parcel for Aisha.
  await eveningOut(page, 4)
  await expect(home(page).getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await page.evaluate('window.__worksim.setLifeMinute(19 * 60 + 1)')
  const parcel = () =>
    page.evaluate(
      () =>
        (
          globalThis as unknown as {
            __worksimParcel?: { shown: boolean; atDoor?: boolean }
          }
        ).__worksimParcel ?? { shown: false },
    )
  await expect.poll(async () => (await parcel()).atDoor, { timeout: 60_000 }).toBe(true)
  const rooms = home(page).getByRole('navigation', { name: 'Rooms' })
  await rooms.getByRole('button', { name: 'Front door' }).click()
  await home(page)
    .getByRole('button', { name: /Answer the door: a parcel for next door/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText(
    'Took in a parcel for Aisha next door',
    { timeout: 60_000 },
  )
  await home(page)
    .getByRole('button', { name: /Take Aisha’s parcel round next door/ })
    .click()
  await expect(home(page).getByTestId('home-log')).toContainText(
    'Took Aisha’s parcel round next door',
    { timeout: 60_000 },
  )
  // A thank-you on the phone.
  await expect(home(page).getByTestId('phone-summary')).toContainText('new')
})
