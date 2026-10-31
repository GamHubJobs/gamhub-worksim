import { expect, test, type Page } from '@playwright/test'
import {
  cell,
  enterValue,
  openApp,
  sitAtComputer,
  startCareerIfNeeded,
  waitUntilSaved,
} from './helpers.ts'

const apps = (page: Page) => page.getByRole('navigation', { name: 'Apps' })

async function selectRange(page: Page, from: string, to: string) {
  await cell(page, from).click()
  await cell(page, to).click({ modifiers: ['Shift'] })
}

test('a report task: analyse in Sheets, write in Docs, present in Slides, hand in by email', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await sitAtComputer(page)
  // Development shortcut: the earlier tasks count as done.
  await page.evaluate("window.__worksim.skipTo('performance-report')")

  // 1. Priya's email; starting the task creates three files.
  await openApp(page, 'Mail')
  await page
    .getByRole('button', { name: /October performance report for the management/ })
    .click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open task' })
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('sheet-grid')).toBeVisible()

  // 2. The analysis in Sheets.
  await enterValue(page, 'D2', '=C2-B2', '3240')
  await enterValue(page, 'E2', '=C2/B2', '1.0675')
  await enterValue(
    page,
    'F2',
    '=IF(C2>B2, "Over budget", "Within budget")',
    'Over budget',
  )
  await selectRange(page, 'D2', 'F7')
  await page.keyboard.press('Control+d')
  await expect(cell(page, 'F4')).toHaveText('Over budget')
  await enterValue(page, 'B9', '=SUM(B2:B7)', '227000')
  await enterValue(page, 'C9', '=SUM(C2:C7)', '227300')
  await enterValue(page, 'D9', '=C9-B9', '300')
  await enterValue(page, 'E9', '=C9/B9', '1.001321586')
  await selectRange(page, 'A1', 'C7')
  await page.getByRole('button', { name: 'Charts' }).click()
  await page.getByTestId('data-panel').getByLabel('Title').fill('Budget vs actual')
  await page.getByTestId('data-panel').getByRole('button', { name: 'Add chart' }).click()
  await waitUntilSaved(page)

  // 3. The report in Docs, opened from the task.
  await apps(page)
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /October performance report/ })
    .click()
  const body = page.getByTestId('doc-body').locator('.ProseMirror')
  await body.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  const docTools = page.getByRole('toolbar', { name: 'Formatting' })
  const section = async (heading: string, text: string) => {
    await docTools.getByLabel('Text style').selectOption('h2')
    await page.keyboard.insertText(heading)
    await page.keyboard.press('Enter')
    await page.keyboard.insertText(text)
    await page.keyboard.press('Enter')
  }
  await section(
    'Executive summary',
    'In October the six departments spent $227,300 against a total budget of $227,000, so overall spending was $300 over budget. Two departments overspent and four stayed within their budgets.',
  )
  await section(
    'Findings',
    'Sales was the largest overspend at $3,240 above budget, followed by Operations at $2,870 over. Marketing, IT, HR and Finance all spent less than planned, which almost balanced the overspends. The chart below compares budget and actual spending for each department, and shows that the overspends are concentrated in the two largest operational areas.',
  )
  await docTools.getByRole('button', { name: 'Insert chart from Sheets' }).click()
  await page
    .getByTestId('sheets-picker')
    .getByRole('button', { name: /October departmental performance/ })
    .click()
  await section(
    'Recommendations',
    'Sales and Operations should review their forecasts for November and explain the main causes of the overspend at the next management meeting. Finance will monitor both budgets weekly until the end of the quarter, and the underspends in Marketing and IT should be confirmed before they are released to other departments.',
  )
  await waitUntilSaved(page)

  // 4. The slides.
  await apps(page)
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /October performance review/ })
    .click()
  const thumbnails = page.getByRole('navigation', { name: 'Slides' })
  await thumbnails.getByRole('button', { name: 'Slide 3', exact: true }).click()
  const tools = page.getByRole('toolbar', { name: 'Slide tools' })
  await tools.getByRole('button', { name: 'Text box' }).click()
  await page
    .getByLabel('Slide text')
    .fill('Total spending: $227,300 (Sales $3,240 over budget)')
  await page.keyboard.press('Escape')
  await tools.getByRole('button', { name: 'Chart from Sheets' }).click()
  await page
    .getByTestId('sheets-picker')
    .getByRole('button', { name: /October departmental performance/ })
    .click()
  await expect(page.getByTestId('slide-canvas').getByTestId('element-chart')).toHaveCount(
    1,
  )
  await waitUntilSaved(page)

  // 5. Hand in: reply to Priya with the three files attached.
  await apps(page)
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /Reply to Priya/ })
    .click()
  const compose = page.getByTestId('compose')
  const attached = compose.getByRole('list', { name: 'Attached files' })
  await expect(attached.getByRole('listitem')).toHaveCount(3)
  await expect(attached).toContainText('October departmental performance')
  await expect(attached).toContainText('October performance report')
  await expect(attached).toContainText('October performance review')
  await compose.getByRole('button', { name: 'Send' }).click()

  const results = page.getByTestId('submission-results')
  await expect(results).toBeVisible({ timeout: 15_000 })
  await expect(results.getByTestId('score')).toHaveText('100%')
  await expect(page.getByTestId('check-results')).toContainText(
    'Key figures in the report',
  )
})

test('handing in without the report explains what is missing', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam')
  await sitAtComputer(page)
  await page.evaluate("window.__worksim.skipTo('performance-report')")
  await openApp(page, 'Tasks')
  await page
    .getByRole('button', { name: /Monthly departmental performance report/ })
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('sheet-grid')).toBeVisible()

  await apps(page)
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /Reply to Priya/ })
    .click()
  const compose = page.getByTestId('compose')
  await compose.getByRole('button', { name: /Remove October performance report/ }).click()
  await expect(
    compose.getByRole('list', { name: 'Attached files' }).getByRole('listitem'),
  ).toHaveCount(2)
  await compose.getByRole('button', { name: 'Send' }).click()
  const results = page.getByTestId('submission-results')
  await expect(results).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('check-results')).toContainText('No report was attached')

  // The sent email is kept, with what was attached.
  await page.keyboard.press('Escape')
})
