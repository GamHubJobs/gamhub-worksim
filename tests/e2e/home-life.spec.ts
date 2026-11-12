import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Life at home with someone: an evening round at the player's (they are there,
// on the sofa), asked to stay the night (a yes), a fade to the morning, waking
// up with them there, and asking them to move in.

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

test('an evening at home together, staying the night, and moving in', async ({
  page,
}) => {
  test.setTimeout(600_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  // A couple already, Maya coming round tonight.
  await page.evaluate(
    "window.__worksim.setBond('cafe:barista', { stage: 'partners', closeness: 85, attraction: 80, known: ['baking'], visit: 1 })",
  )
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 30_000 })
  await page.evaluate('window.__worksim.setLifeMinute(19 * 60 + 40)')
  await expect(home.getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect.poll(() => here(page, 'cafe:barista'), { timeout: 60_000 }).toBe(true)

  // She is on the sofa: walk up, sit with her.
  await talkTo(page, 'cafe:barista')
  const evening = page.getByTestId('date')
  await expect(evening).toContainText('An evening at yours', { timeout: 120_000 })
  await evening.getByRole('button', { name: 'Sit with Maya on the sofa' }).click()
  await expect(evening.getByText('Round 1 of 3')).toBeVisible({ timeout: 60_000 })
  await evening.getByRole('button', { name: 'Talk about baking' }).click()
  await evening.getByRole('button', { name: 'Ask if you can hold their hand' }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/sofa.png`,
  })
  await evening.getByRole('button', { name: 'Ask about their day' }).click()
  await expect(evening.getByTestId('date-summary')).toBeVisible()
  // Asked to stay: a yes, for a couple.
  await evening.getByRole('button', { name: 'Ask Maya to stay the night' }).click()
  await expect(evening).toContainText('Stay. I would like you to.')
  await evening.getByRole('button', { name: 'Maya is staying: carry on' }).click()
  await expect(evening).toHaveCount(0)

  // Bed: a fade to the morning, and she is still there.
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Bedroom' })
    .click()
  await page.evaluate('window.__worksimSpeed = 12')
  await home.getByRole('button', { name: /^Go to bed/ }).click()
  await expect(page.getByTestId('night-fade')).toBeVisible({ timeout: 60_000 })
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/night-fade.png`,
  })
  await expect(home).toContainText('Morning at home', { timeout: 60_000 })
  await expect.poll(() => here(page, 'cafe:barista'), { timeout: 60_000 }).toBe(true)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/morning.png`,
  })

  // Asking her to move in.
  await talkTo(page, 'cafe:barista')
  const talk = page.getByTestId('encounter')
  await expect(talk).toBeVisible({ timeout: 120_000 })
  await talk.getByRole('button', { name: 'Ask Maya to move in with you' }).click()
  await expect(talk).toContainText('Let’s find somewhere together')
  await expect(talk).toContainText('moving in')
  await talk.getByRole('button', { name: /Goodbye|Close/ }).click()
  // In the Relationships screen: moved in.
  await page.getByRole('button', { name: /Menu/ }).click()
  await page
    .getByTestId('pause-menu')
    .getByRole('button', { name: 'Relationships' })
    .click()
  await expect(page.getByTestId('bond-cafe:barista')).toContainText('Moved in with Maya')
})
