import { expect, test, type Page } from '@playwright/test'
import { cell, enterValue, openApp, waitUntilSaved, showApp } from './helpers.ts'

/** A passing score. (Full marks for the model work are proven in the unit tests.) */
const PASSED = /^(7[0-9]|8[0-9]|9[0-9]|100)%$/

/** Records and posts a journal in Books. */
async function postJournal(
  page: Page,
  memo: string,
  lines: Array<[account: string, debit: number, credit: number]>,
) {
  await page
    .getByRole('navigation', { name: 'Books sections' })
    .getByRole('button', { name: 'Journals', exact: true })
    .click()
  await page.getByRole('button', { name: 'New journal' }).click()
  const editor = page.getByTestId('journal-editor')
  await editor.getByLabel('Journal date').fill('2026-03-31')
  await editor.getByLabel('Journal description').fill(memo)
  for (const [i, [account, debit, credit]] of lines.entries()) {
    await editor.getByLabel(`Line ${i + 1} account`).selectOption(account)
    if (debit) await editor.getByLabel(`Line ${i + 1} debit`).fill(String(debit))
    if (credit) await editor.getByLabel(`Line ${i + 1} credit`).fill(String(credit))
  }
  await editor.getByLabel('Journal description').click()
  await editor.getByRole('button', { name: 'Post journal' }).click()
  await expect(editor).toContainText('Posted')
  await editor.getByRole('button', { name: 'Close' }).click()
}

/** Opens a task from the Tasks app and starts (or continues) it. */
async function startStage(page: Page, title: RegExp) {
  await showApp(page, 'Tasks')
  await page
    .getByRole('list', { name: 'Tasks' })
    .getByRole('button', { name: title })
    .click()
  await expect(page.getByTestId('project-brief')).toContainText(
    'Project: Close the quarter for the board',
  )
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: /Start task|Continue working/ })
    .click()
}

/** Types a formula into a cell (the result is checked afterwards). */
async function typeIn(page: Page, address: string, input: string) {
  await cell(page, address).click()
  await page.keyboard.type(input)
  await page.keyboard.press('Enter')
}

async function submitInApp(page: Page) {
  await page.getByRole('button', { name: /Submit to Daniel/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  const results = page.getByTestId('submission-results')
  await expect(results.getByTestId('score')).toHaveText(PASSED, { timeout: 15_000 })
  await results.getByRole('button', { name: /^(Close|Back to )/ }).click()
}

async function addChart(page: Page, from: string, to: string, title: string) {
  await cell(page, from).click()
  await cell(page, to).click({ modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Charts' }).click()
  await page.getByTestId('data-panel').getByLabel('Title').fill(title)
  await page.getByTestId('data-panel').getByRole('button', { name: 'Add chart' }).click()
}

test('an integrated project: three stages in three apps become one portfolio item', async ({
  page,
}) => {
  test.setTimeout(420_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Accounting/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Tasks')
  await page.evaluate("window.__worksim.skipTo('quarter-close-adjustments')")

  // Stage 1: the adjustments in Books.
  await startStage(page, /Quarter close, stage 1/)
  await expect(page.getByTestId('books')).toBeVisible()
  await postJournal(page, 'Q1 share of the annual audit fee', [
    ['6700', 1350, 0],
    ['2300', 0, 1350],
  ])
  await postJournal(page, 'Interest earned on the deposit account in Q1', [
    ['1210', 145, 0],
    ['4900', 0, 145],
  ])
  await postJournal(page, 'March electricity, not yet billed', [
    ['6100', 320, 0],
    ['2300', 0, 320],
  ])
  await submitInApp(page)

  // Stage 2: the variance analysis in Sheets.
  await startStage(page, /Quarter close, stage 2/)
  await expect(page.getByTestId('sheet-grid')).toBeVisible()
  await enterValue(page, 'D2', '=C2-B2', '4850')
  await enterValue(page, 'E2', '=D2/B2', '0.06736111111')
  await enterValue(page, 'F2', '=IF(ABS(E2)>0.1, "Investigate", "OK")', 'OK')
  await cell(page, 'D2').click()
  await cell(page, 'F10').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+d')
  await expect(cell(page, 'F9')).toHaveText('Investigate')
  for (const col of ['B', 'C', 'D']) {
    await typeIn(page, `${col}12`, `=SUM(${col}2:${col}3)`)
    await typeIn(page, `${col}13`, `=SUM(${col}4:${col}10)`)
    await typeIn(page, `${col}14`, `=${col}12-${col}13`)
  }
  await expect(cell(page, 'C14')).toHaveText('11284')
  await addChart(page, 'A1', 'C10', 'Q1 budget vs actual')
  await waitUntilSaved(page)
  await submitInApp(page)

  // Stage 3: the board pack, handed in by email.
  await startStage(page, /Quarter close, stage 3/)
  await expect(page.getByTestId('sheet-grid')).toBeVisible()
  await enterValue(page, 'E2', '=SUM(B2:D2)', '84050')
  await enterValue(page, 'E3', '=SUM(B3:D3)', '72766')
  for (const col of ['B', 'C', 'D', 'E']) {
    await typeIn(page, `${col}4`, `=${col}2-${col}3`)
    await typeIn(page, `${col}5`, `=${col}4/${col}2`)
  }
  await expect(cell(page, 'E4')).toHaveText('11284')
  await addChart(page, 'A1', 'D3', 'Income and costs by month')
  await waitUntilSaved(page)

  await showApp(page, 'Tasks')
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /Q1 board report/ })
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
    'In Q1 the company earned £84,050 of income and made a net profit of £11,284, a net margin of 13.4%. The quarter was close to budget overall, with a few lines that need explaining to the board.',
  )
  await section(
    'Findings',
    'Professional fees were £2,850 over budget. Most of this is the audit fee accrual: a quarter of the annual audit is now recognised in Q1 instead of all at the year end. Subcontractor costs and utilities were also over budget, while training income and travel were below budget. Rent, software and wages were in line with the plan, and consulting fees were ahead of budget, which kept profit close to the plan.',
  )
  await section(
    'Recommendations',
    'Keep accruing the audit fee each quarter so the year-end cost is not a surprise. Review subcontractor use with the delivery leads before Q2, and check why training income fell short of the budget. The finance team will report on these points again at the end of Q2, using the same variance threshold of ten percent so that the board can compare the two quarters directly and see whether the actions have worked. We also suggest a short review of the Q2 budget for professional fees, because the audit accrual will continue every quarter from now on and the current budget does not include it.',
  )
  await waitUntilSaved(page)

  await showApp(page, 'Tasks')
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /Reply to Daniel/ })
    .click()
  const compose = page.getByTestId('compose')
  await expect(compose.getByRole('list', { name: 'Attached files' })).toContainText(
    'Q1 board report',
  )
  await compose.getByRole('button', { name: 'Send' }).click()
  const results = page.getByTestId('submission-results')
  await expect(results.getByTestId('score')).toHaveText(PASSED, { timeout: 15_000 })
  await results.getByRole('button', { name: 'Close' }).click()

  // The project is now one piece of work in the portfolio, linked to its stages.
  await showApp(page, 'Portfolio')
  const project = page
    .getByTestId('portfolio-card')
    .filter({ hasText: 'Close the quarter for the board' })
  await expect(project).toContainText('Project')
  await expect(page.getByTestId('portfolio-card')).toHaveCount(4)
  await project.click()
  const itemPage = page.getByTestId('portfolio-item-page')
  await expect(itemPage).toContainText('Project · 3 stages')
  await expect(itemPage.getByTestId('item-score')).toHaveText(PASSED)
  const stages = itemPage.getByTestId('project-stages').getByRole('button')
  await expect(stages).toHaveCount(3)
  await stages.nth(1).click()
  await expect(
    page.getByTestId('portfolio-item-page').getByRole('heading', {
      name: 'Quarter close, stage 2: Q1 against budget',
    }),
  ).toBeVisible()
})
