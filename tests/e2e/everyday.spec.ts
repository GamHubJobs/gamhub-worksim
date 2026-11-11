import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Everyday life, played: children growing up (their age, school, a grown-up
// one living away); café customers coming in through the door; and the
// courier waiting at the building's door in the street when the takeaway
// comes while the player is out.

const talkTo = (page: Page, id: string) =>
  page.evaluate(
    (who) =>
      (globalThis as unknown as { __worksimTalk: (id: string) => void }).__worksimTalk(
        who,
      ),
    id,
  )
const here = (page: Page, id: string) =>
  page.evaluate(
    (who) =>
      (globalThis as unknown as { __worksimPeople?: () => Array<{ id: string }> })
        .__worksimPeople?.()
        .some((p) => p.id === who) ?? false,
    id,
  )
type Walking = { id: string; shown: boolean; status: string; place: string | null }
const crowd = (page: Page, id: string) =>
  page.evaluate(
    (who) =>
      ((globalThis as unknown as { __worksimNpcs?: Walking[] }).__worksimNpcs ?? []).find(
        (n) => n.id === who,
      ) ?? null,
    id,
  )

async function evening(page: Page) {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(page.getByTestId('home')).toContainText('Evening at home', {
    timeout: 30_000,
  })
}

async function outside(page: Page) {
  const home = page.getByTestId('home')
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  await expect(page.getByTestId('city')).toContainText('Out in the neighbourhood')
}

test('children grow up: a seven-year-old at home, a grown-up one living away', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await evening(page)
  // Day 1: Ada is 7 (born 98 days, seven game years, ago), Theo 18.
  await page.evaluate(
    "window.__worksim.setLife({ family: { children: [{ name: 'Ada', born: -97, adopted: false }, { name: 'Theo', born: -251, adopted: false }], expected: null } })",
  )
  await expect(page.getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect.poll(() => here(page, 'child:0'), { timeout: 60_000 }).toBe(true)
  expect(await here(page, 'child:1')).toBe(false)
  await talkTo(page, 'child:0')
  const talk = page.getByTestId('encounter')
  await expect(talk).toBeVisible({ timeout: 120_000 })
  await expect(talk).toContainText('Your child, 7')
  await talk.getByRole('button', { name: 'Ask Ada about their day' }).click()
  await expect(talk).toContainText(/fire drill|volcano/)
  await page.screenshot({ path: 'docs/screenshots/relationships/child-day.png' })
  await talk.getByRole('button', { name: /^(Close|Goodbye)$/ }).click()
  // The family, in the Relationships screen.
  await page.getByRole('button', { name: /Menu/ }).click()
  await page
    .getByTestId('pause-menu')
    .getByRole('button', { name: 'Relationships' })
    .click()
  const family = page.getByTestId('family')
  await expect(family).toContainText('Ada, 7 years old')
  await expect(family).toContainText('Theo, 18 years old, grown up and living away')
})

test('café customers come in through the door, order, and sit down', async ({ page }) => {
  test.setTimeout(400_000)
  await evening(page)
  await outside(page)
  await page.getByTestId('city').getByTestId('place-cafe').click()
  await expect(page.getByTestId('city')).toContainText('Kettle & Crumb', {
    timeout: 30_000,
  })
  // A minute before Owen's next visit: out, then in through the door. Where he
  // is, sampled in the page ten times a second (the walk takes a few seconds).
  await page.evaluate('window.__worksim.setLifeMinute(19 * 60 + 29)')
  await expect
    .poll(async () => (await crowd(page, 'cafe:walkin1'))?.shown, { timeout: 60_000 })
    .toBe(false)
  await page.evaluate(() => {
    const w = globalThis as unknown as { __worksimNpcs?: Walking[]; __samples: unknown[] }
    w.__samples = []
    setInterval(() => {
      const n = w.__worksimNpcs?.find((q) => q.id === 'cafe:walkin1')
      if (n) w.__samples.push({ ...n })
    }, 100)
  })
  await expect
    .poll(async () => await crowd(page, 'cafe:walkin1'), { timeout: 120_000 })
    .toMatchObject({ shown: true, status: 'there', place: 'counter' })
  const samples = (await page.evaluate('window.__samples')) as Array<
    Walking & { x: number; z: number }
  >
  const first = samples.find((n) => n.shown)!
  // He came in at the door (just inside it, by the front of the café), and walked.
  expect(first.z).toBeGreaterThan(2.5)
  expect(samples.some((n) => n.shown && n.status !== 'there')).toBe(true)
  await page.screenshot({ path: 'docs/screenshots/city/cafe-customer.png' })
  expect(await here(page, 'cafe:walkin1')).toBe(true)
})

test('the takeaway comes while you are out: the courier waits at your door in the street', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await evening(page)
  await outside(page)
  await page.evaluate('window.__worksim.setLifeMinute(18 * 60 + 30)')
  await page.evaluate(
    "window.__worksim.setLife({ delivery: { id: 'takeaway-1-1080', ordered: 1080, due: 1105, status: 'coming' } })",
  )
  await expect(page.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect.poll(() => here(page, 'home:courier'), { timeout: 60_000 }).toBe(true)
  await talkTo(page, 'home:courier')
  const talk = page.getByTestId('encounter')
  await expect(talk).toBeVisible({ timeout: 120_000 })
  await expect(talk).toContainText("hands you the bag at your building's door")
  await page.screenshot({ path: 'docs/screenshots/city/courier-street.png' })
  // Handed over: they are gone.
  await expect.poll(() => here(page, 'home:courier'), { timeout: 30_000 }).toBe(false)
})
