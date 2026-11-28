import { expect, test, type Page } from '@playwright/test'
import { openApp, waitUntilSaved } from './helpers.ts'

// The professional tools' work used elsewhere: Books' reports go into a
// report in Word Craft, and WorkSim AI reads the open Books file (its own
// figures and guide), all in the real app with the built-in guide.

const apps = (page: Page) => page.getByRole('navigation', { name: 'Apps' })
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Formatting' })
const ai = (page: Page) => page.getByTestId('window-ai')

async function openBooksPractice(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /Accounting/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 30_000 })
  await openApp(page, 'Tasks')
  await apps(page)
    .getByRole('button', { name: /^Books/ })
    .click()
  await page.getByRole('button', { name: 'Open the practice file' }).click()
  await expect(page.getByTestId('books')).toBeVisible({ timeout: 30_000 })
  // The practice file is kept as soon as it is opened.
  await expect(page.getByTestId('save-indicator').first()).toHaveText('All changes saved')
}

test('WorkSim AI knows the open Books file and answers from its guide', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await openBooksPractice(page)
  await apps(page)
    .getByRole('button', { name: /^WorkSim AI/ })
    .click()
  await expect(ai(page).getByTestId('ai-app')).toBeVisible()
  const context = ai(page).getByTestId('ai-context')
  await expect(context).toContainText('Books')
  await expect(context).not.toContainText('a professional tool')

  await ai(page).getByLabel('Your question').fill('How do I record a journal?')
  await page.keyboard.press('Enter')
  const answer = ai(page).getByTestId('ai-answer').first()
  await expect(answer).toContainText('Books: Record a journal')
  await expect(answer.getByTestId('ai-source')).toContainText('not an AI model')
})

test("Books' reports and charts go into a report in Word Craft", async ({ page }) => {
  test.setTimeout(180_000)
  await openBooksPractice(page)
  await apps(page)
    .getByRole('button', { name: /^Word Craft/ })
    .click()
  await page.getByRole('button', { name: /Blank document/ }).click()
  const body = page.getByTestId('doc-body').locator('.ProseMirror')
  await body.click()
  await page.keyboard.type('Month-end figures')

  // A table: the trial balance, worked out from the books.
  await toolbar(page)
    .getByRole('button', { name: 'Data: insert a table from Grid Craft' })
    .click()
  const picker = page.getByTestId('sheets-picker')
  await picker.getByRole('tab', { name: 'From a professional tool' }).click()
  const outputs = picker.getByTestId('tool-outputs')
  await expect(outputs).toContainText('Books')
  await outputs.getByRole('button', { name: /^.*Trial balance/ }).click()
  await expect(body.locator('table').first()).toContainText('Total')
  await expect(body.locator('table th').first()).toHaveText('Code')

  // A chart: expenses by account.
  await toolbar(page)
    .getByRole('button', { name: 'Insert chart from Grid Craft' })
    .click()
  await picker.getByRole('tab', { name: 'From a professional tool' }).click()
  await outputs.getByRole('button', { name: /Expenses by account/ }).click()
  await expect(body.getByRole('img', { name: /Expenses by account/ })).toBeVisible()

  // Both are kept with the document.
  await waitUntilSaved(page)
  await page.reload()
  await expect(body.locator('table').first()).toContainText('Total')
  await expect(body.getByRole('img', { name: /Expenses by account/ })).toBeVisible()
})
