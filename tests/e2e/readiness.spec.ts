import { expect, test, type Page } from '@playwright/test'
import { openApp, waitUntilSaved } from './helpers.ts'

const body = (page: Page) => page.getByTestId('doc-body').locator('.ProseMirror')
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Formatting' })

test('a readiness assessment: a failed attempt with feedback, a retake in another version with a real report, and promotion', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Office Administration/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Career')
  // Second level: the next promotion asks for the level's assessment.
  await page.evaluate("window.__worksim.skipTo('budget-report')")
  await expect(page.getByTestId('career')).toContainText(
    'Pass the readiness assessment: process the expense claims',
  )
  await page.getByRole('button', { name: 'Go to the assessment' }).click()

  const view = page.getByTestId('readiness')
  await expect(view.getByTestId('status-ready-fa-practitioner')).toHaveText(
    'Ready to take',
  )
  await view.getByRole('button', { name: 'Start the assessment' }).click()
  const detail = view.getByTestId('case-detail')
  await expect(detail.getByTestId('case-deadline')).toContainText('3 h')

  // A rushed first attempt: only the decision, through the real form.
  await detail
    .getByTestId('step-decide')
    .getByLabel(/Pay what the policy allows/)
    .check()
  await detail.getByRole('button', { name: 'Submit the assessment' }).click()
  await detail.getByRole('button', { name: 'Submit for marking' }).click()
  const feedback = view.getByTestId('assessment-feedback')
  await expect(feedback).toContainText('The exceptions')
  await expect(feedback).toContainText('Write the report')
  await expect(view.getByTestId('status-ready-fa-practitioner')).toHaveText(
    'Not yet passed',
  )

  // The retake is the other version: different people and figures.
  await view.getByRole('button', { name: 'Take it again' }).click()
  await expect(view.getByTestId('case-detail')).toContainText('Lucy Ford')
  await page.evaluate("window.__worksim.answerAssessment('ready-fa-practitioner')")

  // The report, written in Docs.
  await view
    .getByTestId('case-detail')
    .getByRole('button', { name: /Start “Expenses report” in Docs/ })
    .click()
  await body(page).click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await toolbar(page).getByLabel('Text style').selectOption('h2')
  await page.keyboard.type('Summary')
  await page.keyboard.press('Enter')
  await toolbar(page).getByLabel('Text style').selectOption('p')
  await page.keyboard.type(
    'This week we are paying £129.50 for the expense claims that meet the policy. Each claim was checked against the expenses policy, and the claimants have been told what was paid and why. ',
  )
  await page.keyboard.press('Enter')
  await toolbar(page).getByLabel('Text style').selectOption('h2')
  await page.keyboard.type('Exceptions')
  await page.keyboard.press('Enter')
  await toolbar(page).getByLabel('Text style').selectOption('p')
  await page.keyboard.type(
    'The meal claim was paid at the £25 limit. The mileage claim was corrected to the 45p mileage rate. The taxi claim has no receipt, so it is on hold until the receipt arrives, as the policy needs a receipt for any claim over £10. ',
  )
  await waitUntilSaved(page)

  await openApp(page, 'Readiness')
  await page
    .getByRole('navigation', { name: 'Assessments' })
    .getByRole('button')
    .first()
    .click()
  const retake = page.getByTestId('readiness').getByTestId('case-detail')
  await retake.getByRole('button', { name: 'Submit the assessment' }).click()
  await retake.getByRole('button', { name: 'Submit for marking' }).click()
  await expect(retake.getByTestId('case-score')).toHaveText('100%')
  await expect(page.getByTestId('status-ready-fa-practitioner')).toHaveText('Passed')
  await expect(page.getByTestId('attempts').getByRole('row')).toHaveCount(3)

  // The promotion requirement is met, and the assessment is in the portfolio.
  await openApp(page, 'Career')
  await expect(page.getByRole('button', { name: 'Go to the assessment' })).toHaveCount(0)
  await openApp(page, 'Portfolio')
  await expect(
    page.getByTestId('portfolio-card').filter({ hasText: 'process the expense claims' }),
  ).toBeVisible()
})
