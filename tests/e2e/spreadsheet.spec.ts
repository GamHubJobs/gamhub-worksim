import { expect, test, type Page } from '@playwright/test'
import { cell, enterValue, openWorkbook, waitUntilSaved } from './helpers.ts'

const formulaBar = (page: Page) => page.getByRole('textbox', { name: 'Formula bar' })

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test('formulas calculate, update when data changes and survive a reload', async ({
  page,
}) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', '10')
  await enterValue(page, 'A2', '20')
  await enterValue(page, 'A3', '=SUM(A1:A2)', '30')
  await enterValue(page, 'A4', '=AVERAGE(A1:A2)', '15')
  await enterValue(page, 'A5', '=IF(A3>25, "Over budget", "OK")', 'Over budget')

  // The formula bar shows the formula behind the result.
  await cell(page, 'A3').click()
  await expect(formulaBar(page)).toHaveValue('=SUM(A1:A2)')

  // Changing the data updates every formula that depends on it.
  await enterValue(page, 'A1', '1')
  await expect(cell(page, 'A3')).toHaveText('21')
  await expect(cell(page, 'A5')).toHaveText('OK')

  await waitUntilSaved(page)
  await page.reload()
  await expect(cell(page, 'A3')).toHaveText('21')
})

test('errors are explained in plain words', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'B1', '=10/B2', '#DIV/0!')
  await cell(page, 'B1').click()
  await expect(page.getByTestId('error-explanation')).toContainText('divides by zero')

  await enterValue(page, 'B3', '=SUMM(1,2)', '#NAME?')
  await cell(page, 'B3').click()
  await expect(page.getByTestId('error-explanation')).toContainText('Did you mean SUM?')
})

test('typing a formula shows help, and clicking cells inserts references', async ({
  page,
}) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', '5')
  await enterValue(page, 'A2', '7')

  await cell(page, 'C1').click()
  await page.keyboard.type('=SU')
  await expect(page.getByTestId('formula-help')).toContainText('SUM')
  await page.keyboard.press('Tab') // accepts the suggestion: =SUM(
  await expect(page.getByTestId('formula-help')).toContainText('Adds numbers together')

  await cell(page, 'A1').click()
  await page.keyboard.type(',')
  await cell(page, 'A2').click()
  await expect(formulaBar(page)).toHaveValue('=SUM(A1,A2')
  await page.keyboard.press('Enter') // the missing bracket is added automatically
  await expect(cell(page, 'C1')).toHaveText('12')
  await cell(page, 'C1').click()
  await expect(formulaBar(page)).toHaveValue('=SUM(A1,A2)')
})

test('the formula bar can be used to edit a cell', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', '4')
  await cell(page, 'B1').click()
  await formulaBar(page).click()
  await page.keyboard.type('=A1*3')
  await page.keyboard.press('Enter')
  await expect(cell(page, 'B1')).toHaveText('12')
  // Enter moved the selection down.
  await expect(page.getByTestId('selected-address')).toHaveValue('B2')
})

test('copy and paste adjusts formulas; fill down works too', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', '2')
  await enterValue(page, 'B1', '3')
  await enterValue(page, 'A2', '4')
  await enterValue(page, 'B2', '5')
  await enterValue(page, 'A3', '6')
  await enterValue(page, 'B3', '7')
  await enterValue(page, 'C1', '=A1*B1', '6')

  await cell(page, 'C1').click()
  await page.keyboard.press('Control+C')
  await cell(page, 'C2').click()
  await page.keyboard.press('Control+V')
  await expect(cell(page, 'C2')).toHaveText('20')
  await expect(formulaBar(page)).toHaveValue('=A2*B2')

  // Fill down: select C1:C3 and press Ctrl+D.
  await cell(page, 'C1').click()
  await cell(page, 'C3').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+D')
  await expect(cell(page, 'C3')).toHaveText('42')
  await expect(page.getByTestId('status-bar')).toContainText('Sum: 68')
})

test('undo and redo', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'first')
  await enterValue(page, 'A1', 'second')
  await page.keyboard.press('Control+Z')
  await expect(cell(page, 'A1')).toHaveText('first')
  await page.keyboard.press('Control+Y')
  await expect(cell(page, 'A1')).toHaveText('second')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(cell(page, 'A1')).toHaveText('first')

  // Undone changes are saved too.
  await waitUntilSaved(page)
  await page.reload()
  await expect(cell(page, 'A1')).toHaveText('first')
})

test('cell formatting is applied and saved', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'B1', '1200')
  await enterValue(page, 'B2', '0.125')
  await cell(page, 'B1').click()
  await page.getByRole('button', { name: 'Currency format' }).click()
  await expect(cell(page, 'B1')).toHaveText('$1,200.00')
  await page.keyboard.press('Control+B')
  await expect(cell(page, 'B1')).toHaveClass(/font-semibold/)

  await cell(page, 'B2').click()
  await page.getByRole('button', { name: 'Percent format' }).click()
  await expect(cell(page, 'B2')).toHaveText('13%')
  await page.getByRole('button', { name: 'More decimal places' }).click()
  await expect(cell(page, 'B2')).toHaveText('12.5%')

  await waitUntilSaved(page)
  await page.reload()
  await expect(cell(page, 'B1')).toHaveText('$1,200.00')
  await expect(cell(page, 'B1')).toHaveClass(/font-semibold/)
  await expect(cell(page, 'B2')).toHaveText('12.5%')
})

test('sheets can be added and renamed, and formulas can use other sheets', async ({
  page,
}) => {
  await openWorkbook(page)
  // Sheet2 does not exist yet, so the formula shows #REF! until it is added.
  await enterValue(page, 'A1', '=Sheet2!A1*2', '#REF!')
  await page.getByRole('button', { name: 'Add a sheet' }).click()
  await expect(page.getByRole('tab', { name: 'Sheet2' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await enterValue(page, 'A1', '21')

  await page.getByRole('tab', { name: 'Sheet2' }).dblclick()
  await page.getByRole('textbox', { name: 'Sheet name' }).fill('Prices')
  await page.keyboard.press('Enter')

  await page.getByRole('tab', { name: 'Sheet1' }).click()
  await expect(cell(page, 'A1')).toHaveText('42')
  await cell(page, 'A1').click()
  await expect(formulaBar(page)).toHaveValue('=Prices!A1*2')
})

test('text pasted from another program is split into cells', async ({ page }) => {
  await openWorkbook(page)
  // Puts text on the clipboard as if copied from Excel or an email.
  await page.evaluate(
    "navigator.clipboard.writeText('Item\\tCost\\nPaper\\t4.99\\nToner\\t59.00')",
  )
  await cell(page, 'A1').click()
  await page.keyboard.press('Control+V')
  await expect(cell(page, 'B3')).toHaveText('59')
  await expect(cell(page, 'A2')).toHaveText('Paper')
})
