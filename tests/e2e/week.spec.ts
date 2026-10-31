import { expect, test, type Page } from '@playwright/test'
import { cell, sitAtComputer } from './helpers.ts'

async function type(page: Page, address: string, value: string) {
  await cell(page, address).click()
  await page.keyboard.type(value)
  await page.keyboard.press('Enter')
}

async function selectRange(page: Page, from: string, to: string) {
  await cell(page, from).click()
  await cell(page, to).click({ modifiers: ['Shift'] })
}

async function submitAndExpectFullMarks(page: Page) {
  await page.getByRole('button', { name: /Submit( again)? to Priya/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Submit', exact: true })
    .click()
  const results = page.getByTestId('submission-results')
  await expect(results.getByTestId('score')).toHaveText('100%')
  return results
}

test('a full first week: three tasks, every key function, and a promotion', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Jordan')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await sitAtComputer(page)
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open task' })
    .click()
  await page.getByRole('button', { name: 'Start task' }).click()

  // Task 1: multiplication, fill down, SUM, currency.
  await type(page, 'E2', '=C2*D2')
  await selectRange(page, 'E2', 'E11')
  await page.keyboard.press('Control+D')
  await type(page, 'E13', '=SUM(E2:E11)')
  await selectRange(page, 'D2', 'E13')
  await page.getByRole('button', { name: 'Currency format' }).click()
  let results = await submitAndExpectFullMarks(page)
  await expect(results).toContainText('New task unlocked: Summarise the expense claims')
  await results.getByRole('button', { name: 'Go to the next task' }).click()
  await page.getByRole('button', { name: 'Start task' }).click()

  // Task 2: IF, SUM, COUNT, AVERAGE, MAX, MIN, COUNTIF.
  await expect(cell(page, 'A2')).toHaveText('CL-1041')
  await type(page, 'F2', '=IF(E2>250, "Yes", "No")')
  await selectRange(page, 'F2', 'F15')
  await page.keyboard.press('Control+D')
  await expect(cell(page, 'F15')).toHaveText('No') // exactly $250.00 is not "over $250"
  await type(page, 'I3', '=SUM(E2:E15)')
  await type(page, 'I4', '=COUNT(E2:E15)')
  await type(page, 'I5', '=AVERAGE(E2:E15)')
  await type(page, 'I6', '=MAX(E2:E15)')
  await type(page, 'I7', '=MIN(E2:E15)')
  await type(page, 'I8', '=COUNTIF(F2:F15, "Yes")')
  await expect(cell(page, 'I8')).toHaveText('3') // $395.00, $289.00 and $251.30
  await cell(page, 'I3').click()
  await page.getByRole('button', { name: 'Currency format' }).click()
  await selectRange(page, 'I5', 'I7')
  await page.getByRole('button', { name: 'Currency format' }).click()
  results = await submitAndExpectFullMarks(page)
  await results.getByRole('button', { name: 'Go to the next task' }).click()
  await page.getByRole('button', { name: 'Start task' }).click()

  // Task 3: VLOOKUP on another sheet, IF comparison, COUNTIF.
  await expect(cell(page, 'A2')).toHaveText('BL-210')
  await page.getByRole('tab', { name: 'Prices' }).click()
  await expect(cell(page, 'A2')).toHaveText('BL-305')
  await page.getByRole('tab', { name: 'Invoice' }).click()
  await type(page, 'E2', '=VLOOKUP(A2, Prices!A:C, 3, FALSE)')
  await type(page, 'F2', '=IF(D2=E2, "OK", "Check")')
  await type(page, 'G2', '=C2*E2')
  await selectRange(page, 'E2', 'G9')
  await page.keyboard.press('Control+D')
  await expect(cell(page, 'F3')).toHaveText('Check') // gel pens invoiced at 9.80, agreed 8.90
  await type(page, 'G11', '=SUM(G2:G9)')
  await type(page, 'G12', '=COUNTIF(F2:F9, "Check")')
  await expect(cell(page, 'G12')).toHaveText('3')
  results = await submitAndExpectFullMarks(page)

  // Promotion!
  await expect(results).toContainText('Promotion!')
  await expect(results).toContainText('Junior Finance Assistant')
  await results.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByTestId('player-chip')).toContainText('Junior Finance Assistant')
  await expect(page.getByTestId('xp')).toHaveText('396 XP') // 110 + 132 + 154
})
