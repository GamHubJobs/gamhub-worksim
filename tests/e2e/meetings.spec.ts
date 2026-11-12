import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Meetings are attended in person: the player walks to the stand-up and takes
// their place in the circle, the team speak in turn, the player gives their
// update, and only then has the meeting been attended. Walking away part way
// is not attending.

const player = (page: Page) =>
  page.evaluate(
    () =>
      (
        globalThis as unknown as {
          __worksimPlayer: { x: number; z: number; mode: string }
        }
      ).__worksimPlayer,
  )

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
})

test('the stand-up, attended in person: walked to, listened to, an update given', async ({
  page,
}) => {
  test.setTimeout(300_000)
  // At normal speed, to see the meeting happen (other tests play activities faster).
  await page.evaluate(
    "window.__worksimSpeed = 1; sessionStorage.setItem('worksim.testSpeed', '1')",
  )
  await page.evaluate('window.__worksim.setTime(1, 9 * 60 + 16)')
  const join = page
    .getByTestId('meeting-now')
    .getByRole('button', { name: /Join the team stand-up/ })
  await expect(join).toBeVisible({ timeout: 30_000 })
  await join.click()
  const activity = page.getByTestId('office-3d').getByTestId('activity')
  await expect(activity).toContainText('Listening to the team', { timeout: 120_000 })
  // In the circle at the whiteboard.
  const me = await player(page)
  expect(Math.hypot(me.x + 0.9, me.z - 4.07)).toBeLessThan(0.3)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/meetings/standup-listening.png`,
  })
  await expect(activity).toContainText('Giving your update', { timeout: 60_000 })
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/meetings/standup-update.png`,
  })
  // Then the meeting itself (its content and choices, as before).
  await expect(page.getByTestId('office-dialogue')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('meeting-now')).toHaveCount(0)
})

test('walking away from the stand-up part way is not attending it', async ({ page }) => {
  test.setTimeout(300_000)
  await page.evaluate(
    "window.__worksimSpeed = 1; sessionStorage.setItem('worksim.testSpeed', '1')",
  )
  await page.evaluate('window.__worksim.setTime(1, 9 * 60 + 16)')
  await page
    .getByTestId('meeting-now')
    .getByRole('button', { name: /Join the team stand-up/ })
    .click()
  const activity = page.getByTestId('office-3d').getByTestId('activity')
  await expect(activity).toContainText('Listening to the team', { timeout: 180_000 })
  // Walk off.
  await page.getByTestId('office-3d').focus()
  await page.keyboard.down('s')
  await page.waitForTimeout(600)
  await page.keyboard.up('s')
  await expect(activity).toHaveCount(0)
  // Not attended: the meeting is still there to join, and no meeting scene opened.
  await expect(page.getByTestId('meeting-now')).toBeVisible()
  await expect(page.getByTestId('office-dialogue')).toHaveCount(0)
})
