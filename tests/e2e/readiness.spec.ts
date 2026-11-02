import { expect, test, type Page } from '@playwright/test'
import { openApp, waitUntilSaved } from './helpers.ts'

const body = (page: Page) => page.getByTestId('doc-body').locator('.ProseMirror')
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Formatting' })

async function startAt(page: Page, career: RegExp, levelTask: string) {
  await page.goto('/')
  await page.getByRole('radio', { name: career }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Career')
  await page.evaluate(`window.__worksim.skipTo('${levelTask}')`)
}

/** Types a report in the Docs editor: headed sections with their paragraphs. */
async function writeReport(page: Page, sections: Array<[string, string]>) {
  await body(page).click()
  await page.keyboard.press('Control+End')
  for (const [heading, text] of sections) {
    await page.keyboard.press('Enter')
    await toolbar(page).getByLabel('Text style').selectOption('h2')
    await page.keyboard.type(heading)
    await page.keyboard.press('Enter')
    await toolbar(page).getByLabel('Text style').selectOption('p')
    await page.keyboard.type(text)
  }
  await waitUntilSaved(page)
}

test('a readiness assessment: a rushed attempt with feedback, and a retake in another version', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await startAt(page, /Office Administration/, 'budget-report')
  // Second level: the next promotion asks for the level's assessment.
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
  // The practical work is a real task, in the career's own tool.
  await expect(detail.getByTestId('step-practical')).toContainText('in Sheets')
  await expect(detail.getByTestId('step-practical')).not.toContainText('{name}')

  // A rushed first attempt: only the decision, through the real form.
  await detail
    .getByTestId('step-decide')
    .getByLabel(/Pay what the policy allows/)
    .check()
  await detail.getByRole('button', { name: 'Submit the assessment' }).click()
  await detail.getByRole('button', { name: 'Submit for marking' }).click()
  const feedback = view.getByTestId('assessment-feedback')
  await expect(feedback).toContainText('The exceptions')
  await expect(feedback).toContainText('Do the work in the tool')
  await expect(feedback).toContainText('Write the report')
  await expect(view.getByTestId('status-ready-fa-practitioner')).toHaveText(
    'Not yet passed',
  )

  // The retake is the other version: different people, figures and task.
  await view.getByRole('button', { name: 'Take it again' }).click()
  await expect(view.getByTestId('case-detail')).toContainText('Lucy Ford')
  await expect(view.getByTestId('attempts').getByRole('row')).toHaveCount(3)
})

test('passing a readiness assessment with real SQL in Data Studio and a report in Docs', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await startAt(page, /Data Analysis/, 'survey-analysis')
  await page.getByRole('button', { name: 'Go to the assessment' }).click()
  const view = page.getByTestId('readiness')
  await view.getByRole('button', { name: 'Start the assessment' }).click()

  // The practical work: the sales questions, answered with SQL in Data Studio.
  await view
    .getByTestId('case-detail')
    .getByRole('button', {
      name: /Start “Answer the sales questions with SQL” in Data Studio/,
    })
    .click()
  await expect(page.getByTestId('datastudio')).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Data Studio sections' })
    .getByRole('button', { name: 'SQL', exact: true })
    .click()
  const queries: Array<[string, string]> = [
    [
      'Revenue by sector',
      'SELECT c.sector, SUM(o.amount) AS revenue FROM orders o JOIN clients c ON c.client_id = o.client_id GROUP BY c.sector ORDER BY revenue DESC',
    ],
    [
      'Top 3 clients',
      'SELECT c.name, SUM(o.amount) AS revenue FROM orders o JOIN clients c ON c.client_id = o.client_id GROUP BY c.name ORDER BY revenue DESC LIMIT 3',
    ],
    [
      'Monthly',
      "SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders, SUM(amount) AS revenue FROM orders GROUP BY month ORDER BY month",
    ],
    [
      'No orders',
      'SELECT c.name FROM clients c LEFT JOIN orders o ON o.client_id = c.client_id WHERE o.order_id IS NULL',
    ],
  ]
  for (const [name, sql] of queries) {
    await page.getByRole('button', { name: '+ New query' }).click()
    await page.getByLabel('SQL', { exact: true }).fill(sql)
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await expect(page.getByTestId('sql-result')).toBeVisible()
    await page.getByLabel('Query name').fill(name)
    await page.getByRole('button', { name: 'Save query' }).click()
    await expect(page.getByTestId('saved-query').filter({ hasText: name })).toBeVisible()
  }
  await waitUntilSaved(page)

  // The other steps, then the report written in Docs.
  await openApp(page, 'Readiness')
  await page
    .getByRole('navigation', { name: 'Assessments' })
    .getByRole('button')
    .first()
    .click()
  await page.evaluate("window.__worksim.answerAssessment('ready-data-practitioner')")
  await page
    .getByTestId('readiness')
    .getByTestId('case-detail')
    .getByRole('button', { name: /Start “Analysis note: quarterly sales total” in Docs/ })
    .click()
  await writeReport(page, [
    [
      'Method',
      'I checked the sales query against the orders table and the customers table, looking at how the join matches each order to its customer. ',
    ],
    [
      'Findings',
      'The correct total for the quarter is £12,200. Customer C-104 appears twice in the customers table, so the join counted each of its orders twice. ',
    ],
    [
      'Limitations',
      'Other reports that use the same join were affected too. The duplicate customer record should be merged and a check added for duplicate customers. ',
    ],
  ])

  await openApp(page, 'Readiness')
  await page
    .getByRole('navigation', { name: 'Assessments' })
    .getByRole('button')
    .first()
    .click()
  const attempt = page.getByTestId('readiness').getByTestId('case-detail')
  await attempt.getByRole('button', { name: 'Submit the assessment' }).click()
  await attempt.getByRole('button', { name: 'Submit for marking' }).click()
  await expect(attempt.getByTestId('case-score')).toHaveText('100%')
  await expect(attempt.getByTestId('step-practical')).toBeVisible()
  await expect(page.getByTestId('status-ready-data-practitioner')).toHaveText('Passed')

  // The promotion requirement is met, and the assessment is in the portfolio,
  // with the work done in Data Studio.
  await openApp(page, 'Career')
  await expect(page.getByRole('button', { name: 'Go to the assessment' })).toHaveCount(0)
  await openApp(page, 'Portfolio')
  await page
    .getByTestId('portfolio-card')
    .filter({ hasText: 'the sales total that doesn’t add up' })
    .click()
  await expect(page.getByTestId('portfolio-item-page')).toContainText('Data Studio')
  await openApp(page, 'Portfolio')
  await page
    .getByRole('navigation', { name: 'Portfolio sections' })
    .getByRole('button', { name: 'Progress report' })
    .click()
  await expect(page.getByTestId('report-readiness')).toContainText('Passed (100%)')
  await expect(page.getByTestId('report-achievements')).toContainText('First delivery')
})

const CAREER_ASSESSMENTS: Array<
  [career: RegExp, levelTask: string, id: string, tool: string]
> = [
  [/Office Administration/, 'budget-report', 'ready-fa-practitioner', 'Sheets'],
  [/Accounting/, 'books-sales-purchases', 'ready-acc-practitioner', 'Books'],
  [/IT Help Desk/, 'directory-leaver', 'ready-it-practitioner', 'Network'],
  [/Digital Marketing/, 'seo-fixes', 'ready-mkt-practitioner', 'Ad Campaigns'],
  [/Data Analysis/, 'survey-analysis', 'ready-data-practitioner', 'Data Studio'],
  [/Software Development/, 'working-days-tests', 'ready-dev-practitioner', 'Code'],
]

for (const [career, levelTask, id, tool] of CAREER_ASSESSMENTS) {
  test(`every career's readiness assessment needs its tool work and its report: ${id}`, async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await startAt(page, career, levelTask)
    await page.getByRole('button', { name: 'Go to the assessment' }).click()
    const view = page.getByTestId('readiness')
    await view.getByRole('button', { name: 'Start the assessment' }).click()
    const detail = view.getByTestId('case-detail')
    await expect(detail.getByTestId('step-practical')).toContainText(`in ${tool}`)
    await page.evaluate(`window.__worksim.answerAssessment('${id}')`)
    // Everything right except the tool work and the report: far from a pass.
    await detail.getByRole('button', { name: 'Submit the assessment' }).click()
    await detail.getByRole('button', { name: 'Submit for marking' }).click()
    await expect(detail.getByTestId('case-score')).toHaveText('45%')
    await expect(view.getByTestId(`status-${id}`)).toHaveText('Not yet passed')
    const feedback = view.getByTestId('assessment-feedback')
    await expect(feedback).toContainText('Do the work in the tool')
    await expect(feedback).toContainText('Write the report')
    await expect(view.getByRole('button', { name: 'Take it again' })).toBeEnabled()
  })
}
