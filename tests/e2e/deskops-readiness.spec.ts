import { expect, test } from '@playwright/test'
import { openApp } from './helpers.ts'

/**
 * IT operations readiness: the competency framework from passed work, the
 * service record from the player's queues, the completion record, and the
 * final readiness assessment at the last level.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/deskops'

test('IT operations competencies, service record and completion in Readiness', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  // Every earlier task passed (development helper), up to the last one.
  await page.evaluate(`window.__worksim.skipTo('full-day')`)

  await openApp(page, 'Readiness')
  const readiness = page.getByTestId('readiness')
  // The final assessment is listed at the last level.
  await expect(
    readiness.getByRole('button', { name: /run the service desk/ }),
  ).toBeVisible()
  await readiness.getByRole('button', { name: /IT operations competencies/ }).click()
  const view = page.getByTestId('it-readiness')
  await expect(view.getByTestId('it-competency')).toHaveCount(14)
  await expect(view.getByTestId('completion-record')).toHaveAttribute(
    'data-complete',
    'false',
  )
  await expect(view.getByTestId('completion-record')).toContainText(
    'the final readiness assessment is ready to take',
  )
  await expect(view).toContainText('not a professional certification')
  await page.screenshot({ path: `${shots}/deskops-readiness.png` })
})
