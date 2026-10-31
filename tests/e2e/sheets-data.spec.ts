import { expect, test, type Page } from '@playwright/test'
import { cell, enterValue, openWorkbook, waitUntilSaved } from './helpers.ts'

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Formatting' })
const panel = (page: Page) => page.getByTestId('data-panel')

async function enterTable(page: Page) {
  const rows = [
    ['Category', 'Amount'],
    ['Travel', '300'],
    ['Meals', '50'],
    ['Training', '200'],
  ]
  for (const [r, [a, b]] of rows.entries()) {
    await enterValue(page, `A${r + 1}`, a)
    await enterValue(page, `B${r + 1}`, b)
  }
}

test('sorting, filtering and a live chart', async ({ page }) => {
  await openWorkbook(page)
  await enterTable(page)

  // Sort by Amount, smallest first: the header row stays at the top.
  await cell(page, 'B2').click()
  await toolbar(page).getByRole('button', { name: 'Sort A to Z' }).click()
  await expect(cell(page, 'A1')).toHaveText('Category')
  await expect(cell(page, 'A2')).toHaveText('Meals')
  await expect(cell(page, 'A4')).toHaveText('Travel')

  // Filter out Meals.
  await toolbar(page).getByRole('button', { name: 'Filter' }).click()
  await page.getByRole('button', { name: 'Filter column A' }).click()
  const menu = page.getByTestId('filter-menu')
  await menu.getByLabel('Meals').uncheck()
  await menu.getByRole('button', { name: 'Apply' }).click()
  await expect(cell(page, 'A2')).toHaveCount(0)
  await expect(cell(page, 'A3')).toHaveText('Training')

  // A chart of the table, drawn from the data.
  await toolbar(page).getByRole('button', { name: 'Charts' }).click()
  await expect(panel(page).getByLabel('Data range')).toHaveValue('A1:B4')
  await panel(page).getByLabel('Title').fill('Spending by category')
  await panel(page).getByRole('button', { name: 'Add chart' }).click()
  await expect(panel(page).getByTestId('sheet-chart')).toHaveCount(1)
  await expect(
    panel(page).getByRole('img', { name: /Spending by category/ }),
  ).toBeVisible()

  // Everything is saved with the workbook.
  await waitUntilSaved(page)
  await page.reload()
  await expect(cell(page, 'A3')).toHaveText('Training')
  await expect(cell(page, 'A2')).toHaveCount(0)
  await toolbar(page).getByRole('button', { name: 'Charts' }).click()
  await expect(panel(page).getByTestId('sheet-chart')).toHaveCount(1)
})

test('conditional formatting and data validation', async ({ page }) => {
  await openWorkbook(page)
  await enterTable(page)

  // Highlight amounts over 100.
  await cell(page, 'B2').click()
  await toolbar(page).getByRole('button', { name: /Rules/ }).click()
  const formats = panel(page).locator('form').first()
  await formats.getByLabel('Cells').fill('B2:B4')
  await formats.getByLabel('When the value').selectOption('gt')
  await formats.getByLabel('Value', { exact: true }).fill('100')
  await formats.getByLabel('Highlight colour').selectOption('red')
  await formats.getByRole('button', { name: 'Add formatting rule' }).click()
  await expect(cell(page, 'B2')).toHaveClass(/bg-red/)
  await expect(cell(page, 'B3')).not.toHaveClass(/bg-red/)

  // Only "Yes" or "No" in C2:C4.
  const validation = panel(page).locator('form').nth(1)
  await validation.getByLabel('Cells').fill('C2:C4')
  await validation.getByLabel(/Choices/).fill('Yes, No')
  await validation.getByRole('button', { name: 'Add validation' }).click()
  await expect(panel(page).getByTestId('validations')).toContainText('one of: Yes, No')

  await cell(page, 'C2').click()
  await page.keyboard.type('Maybe')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('input-problem')).toContainText('Choose one of: Yes, No.')
  await page.keyboard.press('Escape')
  await expect(cell(page, 'C2')).toHaveText('')

  // Typing in any case is accepted and tidied; the dropdown offers the choices.
  await enterValue(page, 'C2', 'yes', 'Yes')
  await cell(page, 'C3').click()
  await page.getByRole('button', { name: 'Choose a value' }).click()
  await page
    .getByRole('listbox', { name: 'Allowed values' })
    .getByRole('option', { name: 'No', exact: true })
    .click()
  await expect(cell(page, 'C3')).toHaveText('No')
})

test('a chart and a table from Sheets go into a report in Docs', async ({ page }) => {
  await openWorkbook(page)
  await enterTable(page)
  await cell(page, 'A1').click()
  await toolbar(page).getByRole('button', { name: 'Charts' }).click()
  await panel(page).getByLabel('Title').fill('Spending by category')
  await panel(page).getByRole('button', { name: 'Add chart' }).click()
  await waitUntilSaved(page)

  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Docs/ })
    .click()
  await page.getByRole('button', { name: /Blank document/ }).click()
  const body = page.getByTestId('doc-body').locator('.ProseMirror')
  await body.click()
  await page.keyboard.type('Spending this month')

  await toolbar(page).getByRole('button', { name: 'Insert chart from Sheets' }).click()
  const picker = page.getByTestId('sheets-picker')
  await picker.getByRole('button', { name: /Practice Workbook/ }).click()
  await expect(body.getByRole('img', { name: /Spending by category/ })).toBeVisible()

  await toolbar(page).getByRole('button', { name: 'Insert table from Sheets' }).click()
  await expect(picker.getByTestId('table-preview')).toContainText('Training')
  await picker.getByRole('button', { name: 'Insert table' }).click()
  await expect(body.locator('table')).toContainText('Travel')
  await expect(body.locator('table th').first()).toHaveText('Category')

  // Both are saved with the document.
  await waitUntilSaved(page)
  await page.reload()
  await expect(body.getByRole('img', { name: /Spending by category/ })).toBeVisible()
  await expect(body.locator('table')).toContainText('Training')
})
