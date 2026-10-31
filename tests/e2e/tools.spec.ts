import { expect, test, type Page } from '@playwright/test'
import { openApp, waitUntilSaved } from './helpers.ts'

async function startCareer(page: Page, career: string) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: new RegExp(career) }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
}

const apps = (page: Page) => page.getByRole('navigation', { name: 'Apps' })

/** Records and posts a journal in Books. */
async function postJournal(
  page: Page,
  date: string,
  memo: string,
  lines: Array<[account: string, debit: number, credit: number]>,
) {
  await page.getByRole('button', { name: 'New journal' }).click()
  const editor = page.getByTestId('journal-editor')
  await editor.getByLabel('Journal date').fill(date)
  await editor.getByLabel('Journal description').fill(memo)
  for (const [i, [account, debit, credit]] of lines.entries()) {
    if (i >= 2) await editor.getByRole('button', { name: 'Add line' }).click()
    await editor.getByLabel(`Line ${i + 1} account`).selectOption(account)
    if (debit) await editor.getByLabel(`Line ${i + 1} debit`).fill(String(debit))
    if (credit) await editor.getByLabel(`Line ${i + 1} credit`).fill(String(credit))
  }
  await editor.getByLabel('Journal description').click() // leave the last box
  await expect(editor.getByTestId('journal-balance')).toHaveText(
    'Balanced: debits equal credits.',
  )
  await editor.getByRole('button', { name: 'Post journal' }).click()
  await expect(editor).toContainText('Posted')
}

test('Books: an Accounting task done in the accounting software, end to end', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await startCareer(page, 'Accounting')
  await openApp(page, 'Tasks')
  // Books is on the Accounting dock.
  await expect(apps(page).getByRole('button', { name: /^Books/ })).toBeVisible()
  await page.evaluate("window.__worksim.skipTo('books-journals')")
  await page
    .getByRole('button', { name: /Post March’s journals in Books/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('books')).toBeVisible()

  // The overview shows the draft a colleague left; it does not balance.
  await expect(page.getByTestId('books-overview')).toContainText('1 draft journal')
  await page.getByRole('button', { name: /Journal 2: Software subscriptions/ }).click()
  const editor = page.getByTestId('journal-editor')
  await editor.getByRole('button', { name: 'Post journal' }).click()
  await expect(page.getByRole('alert')).toContainText('must be equal')
  await editor.getByLabel('Line 2 credit').fill('418.80')
  await editor.getByLabel('Journal description').click()
  await expect(editor.getByTestId('journal-balance')).toHaveText(
    'Balanced: debits equal credits.',
  )
  await editor.getByRole('button', { name: 'Post journal' }).click()
  await expect(editor).toContainText('Posted')
  await editor.getByRole('button', { name: 'Close' }).click()

  // The month's transactions.
  await postJournal(page, '2026-03-02', 'March office rent', [
    ['6000', 2400, 0],
    ['1200', 0, 2400],
  ])
  await postJournal(page, '2026-03-09', 'New laptop', [
    ['1500', 1150, 0],
    ['1200', 0, 1150],
  ])
  await postJournal(page, '2026-03-16', 'Transfer from deposit', [
    ['1200', 5000, 0],
    ['1210', 0, 5000],
  ])
  await postJournal(page, '2026-03-31', 'Deposit interest', [
    ['1210', 18.4, 0],
    ['4900', 0, 18.4],
  ])
  await postJournal(page, '2026-03-31', 'Electricity accrual', [
    ['6100', 310, 0],
    ['2300', 0, 310],
  ])

  // The ledger and reports are calculated from the journals.
  const sections = page.getByRole('navigation', { name: 'Books sections' })
  await sections.getByRole('button', { name: 'Chart of accounts' }).click()
  await page.getByRole('row', { name: /1200 Bank current account/ }).click()
  await expect(page.getByTestId('account-ledger')).toContainText('£49,281.20')
  await sections.getByRole('button', { name: 'Reports' }).click()
  await expect(page.getByTestId('trial-balance')).toContainText(
    'The trial balance balances.',
  )

  // The built-in guide.
  await page.getByRole('button', { name: 'Guide', exact: true }).click()
  await expect(page.getByTestId('tool-guide')).toContainText('Debit or credit?')
  await page.getByRole('button', { name: 'Task', exact: true }).click()

  await page.getByRole('button', { name: /Submit to Daniel/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
})

test('Books: the practice file and saved work survive a reload', async ({ page }) => {
  test.setTimeout(180_000)
  await startCareer(page, 'Accounting')
  await openApp(page, 'Tasks')
  await apps(page)
    .getByRole('button', { name: /^Books/ })
    .click()
  await expect(page.getByTestId('tool-home-books')).toContainText('Accounting software')
  await page.getByRole('button', { name: 'Open the practice file' }).click()
  await expect(page.getByTestId('books')).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Books sections' })
    .getByRole('button', { name: 'Journals' })
    .click()
  await postJournal(page, '2026-03-03', 'Practice: office supplies', [
    ['6400', 45.5, 0],
    ['1200', 0, 45.5],
  ])
  // Undo and redo work on tool files too: one step back un-posts the journal.
  const editor = page.getByTestId('journal-editor')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(editor).toContainText('Draft')
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(editor).toContainText('Posted')
  await waitUntilSaved(page)

  // The work is saved: it is still there after a reload.
  await page.reload()
  await expect(page.getByTestId('books')).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Books sections' })
    .getByRole('button', { name: 'Journals' })
    .click()
  await expect(page.getByText('Practice: office supplies')).toBeVisible()
})
