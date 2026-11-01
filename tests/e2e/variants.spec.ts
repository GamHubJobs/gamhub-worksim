import { expect, test } from '@playwright/test'
import { openApp } from './helpers.ts'

test('a case in another variant: new people and figures, graded against them, kept as handed in', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Office Administration/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Mail')
  // Seed 1 gives this save the "brightline" version of the supplier case.
  await page.evaluate('window.__worksim.setSeed(1)')
  await page.evaluate("window.__worksim.arriveCase('fa-short-delivery')")

  await page
    .getByRole('button', { name: /Overdue: invoice BLS-7716 \(£648\.00\)/ })
    .click()
  const message = page.getByTestId('mail-message')
  await expect(message).toContainText('Dana Whitfield')
  await expect(message).toContainText('Brightline Supplies')
  await message.getByRole('button', { name: 'Open case' }).click()

  const detail = page.getByTestId('case-detail')
  await expect(detail.getByRole('region', { name: 'Evidence' })).toContainText('£30.00')
  await expect(detail.getByTestId('case-difficulty')).toHaveText('Difficulty: Foundation')
  // Graded against the variant's figures: £576 owed, not the original £552.
  await page.evaluate("window.__worksim.answerCase('fa-short-delivery')")
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')

  // The portfolio keeps the case exactly as it was handed in.
  await openApp(page, 'Portfolio')
  await page
    .getByTestId('portfolio-card')
    .filter({ hasText: 'A supplier chases an unpaid invoice' })
    .click()
  const item = page.getByTestId('portfolio-item-page')
  await item.getByRole('button', { name: /^Main file: Case record/ }).click()
  await expect(item.getByTestId('evidence-viewer')).toContainText('Pay £576 today')
  await expect(item.getByTestId('evidence-viewer')).not.toContainText('£552')
})

test('an advanced case is marked advanced and graded like every case', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Data Analysis/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Cases')
  await page.evaluate("window.__worksim.arriveCase('adv-data-survey-bias')")
  await page
    .getByRole('list', { name: 'Cases' })
    .getByRole('button', { name: /Customers love the app/ })
    .click()
  const detail = page.getByTestId('case-detail')
  await expect(detail.getByTestId('case-difficulty')).toHaveText('Difficulty: Advanced')
  const rate = detail.getByTestId('step-rate').getByRole('textbox')
  await rate.fill('12.5')
  await rate.blur()
  await page.evaluate("window.__worksim.answerCase('adv-data-survey-bias')")
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')
})
