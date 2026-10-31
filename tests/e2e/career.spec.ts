import { expect, test, type Page } from '@playwright/test'
import { cell, openApp, sitAtComputer } from './helpers.ts'

/** Types a value into a cell and confirms it with Enter. */
async function type(page: Page, address: string, value: string) {
  await cell(page, address).click()
  await page.keyboard.type(value)
  await page.keyboard.press('Enter')
}

async function submit(page: Page) {
  await page.getByRole('button', { name: /Submit( again)? to Priya/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Submit', exact: true })
    .click()
  await expect(page.getByTestId('submission-results')).toBeVisible()
}

test('first day: read the task, do the work, get feedback, XP and the next task', async ({
  page,
}) => {
  await page.goto('/')

  // Onboarding
  await page.getByLabel('Your first name').fill('Alex Morgan')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await sitAtComputer(page) // new starters arrive at reception

  // The newest email is the first task from the manager.
  const message = page.getByTestId('mail-message')
  await expect(message).toContainText('Your first task: this month’s supplies order')
  await expect(message).toContainText('Hi Alex,')
  await expect(page.getByRole('button', { name: /^Mail/ })).toContainText('1') // welcome still unread

  // Open the task and start it.
  await message.getByRole('button', { name: 'Open task' }).click()
  const detail = page.getByTestId('task-detail')
  await expect(detail).toContainText('Why this matters at work')
  await detail.getByRole('button', { name: 'Start task' }).click()

  // The workbook opens with Tom's data and the instructions next to it.
  await expect(cell(page, 'A2')).toHaveText('Printer paper A4, box of 5 reams')
  const pane = page.getByTestId('assignment-pane')
  await expect(pane).toContainText('Calculate the first line total')

  // Submitting without doing anything fails, with clear feedback and no XP.
  await submit(page)
  const results = page.getByTestId('submission-results')
  await expect(results).toContainText('Not there yet')
  await expect(results.getByTestId('check-results')).toContainText('E2 is empty.')
  await expect(results).toContainText('How to fix it')
  await expect(results.getByTestId('rewards')).toHaveCount(0)
  await results.getByRole('button', { name: 'Back to my workbook' }).click()

  // Do the work the way the steps describe.
  await type(page, 'E2', '=C2*D2')
  await expect(cell(page, 'E2')).toHaveText('149.94')
  await cell(page, 'E2').click()
  await cell(page, 'E11').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+D')
  await type(page, 'E13', '=SUM(E2:E11)')
  await expect(cell(page, 'E13')).toHaveText('638.54')
  await cell(page, 'D2').click()
  await cell(page, 'E13').click({ modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Currency format' }).click()
  await expect(cell(page, 'E13')).toHaveText('$638.54')

  // Tick off a step: it is remembered.
  await pane.getByRole('checkbox', { name: 'Mark step 1 as done' }).click()
  await expect(
    pane.getByRole('checkbox', { name: 'Mark step 1 as done' }),
  ).toHaveAttribute('aria-checked', 'true')

  // Submit again: full marks, XP and the next task is unlocked.
  await submit(page)
  await expect(results.getByTestId('score')).toHaveText('100%')
  await expect(results).toContainText('Excellent work!')
  await expect(results.getByTestId('rewards')).toContainText('+100 XP')
  await results.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByTestId('xp')).toHaveText('100 XP')

  // The manager replied by email.
  await openApp(page, 'Mail')
  await page.getByRole('button', { name: /Re: Your first task.*\(100%\)/ }).click()
  await expect(page.getByTestId('mail-message')).toContainText('spot on')

  // The career page shows progress and skills.
  await openApp(page, 'Career')
  await expect(page.getByTestId('career-title')).toHaveText('Finance & Admin Intern')
  await expect(page.getByTestId('skill-formulas')).toContainText('Level 1')

  // Everything is still there after a reload.
  await page.reload()
  await expect(page.getByTestId('xp')).toHaveText('100 XP')
  await openApp(page, 'Tasks')
  await expect(
    page.getByRole('button', { name: /Price the office supplies order/ }),
  ).toContainText('Best: 100%')
})

test('typed-in results are caught and explained', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Tasks')
  await page.getByRole('button', { name: 'Start task' }).click()

  // Calculate in your head and type the result: looks right, but is not a formula.
  await type(page, 'E2', '149.94')
  await submit(page)
  await expect(page.getByTestId('check-results')).toContainText(
    'E2 has the right number, but it was typed in',
  )
})
