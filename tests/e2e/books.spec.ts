import { expect, test, type Page } from '@playwright/test'
import { openApp, openMainFileInPortfolio } from './helpers.ts'

const apps = (page: Page) => page.getByRole('navigation', { name: 'Apps' })

async function startAccounting(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /Accounting/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
}

/** Starts a Books task after skipping the earlier ones (development shortcut). */
async function startBooksTask(page: Page, id: string, title: RegExp) {
  await startAccounting(page)
  await page.evaluate(`window.__worksim.skipTo('${id}')`)
  await page.getByRole('button', { name: title }).first().click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('books')).toBeVisible()
}

const section = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Books sections' })
    .getByRole('button', { name, exact: true })
    .click()

async function submitForFull(page: Page) {
  await page.getByRole('button', { name: /Submit to Daniel/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
}

/** Creates an invoice or bill and fills it in (not yet approved). */
async function newDocument(
  page: Page,
  side: 'sales' | 'purchases',
  input: {
    contact: string
    number?: string
    date: string
    due?: string
    lines: Array<[description: string, quantity: number, price: number, account: string]>
  },
) {
  const area = page.getByTestId(`books-${side}`)
  const word = side === 'sales' ? 'invoice' : 'bill'
  await area.getByRole('button', { name: `New ${word}` }).click()
  await area
    .locator('form')
    .getByLabel(side === 'sales' ? 'Customer' : 'Supplier')
    .selectOption({ label: input.contact })
  await area.locator('form').getByRole('button', { name: 'Create' }).click()
  const editor = page.getByTestId(`${word}-editor`)
  if (input.number) {
    await editor
      .getByLabel(side === 'sales' ? 'Invoice number' : 'Supplier’s reference')
      .fill(input.number)
  }
  await editor
    .getByLabel(side === 'sales' ? 'Invoice date' : 'Bill date')
    .fill(input.date)
  if (input.due) await editor.getByLabel('Due date').fill(input.due)
  for (const [i, [description, quantity, price, account]] of input.lines.entries()) {
    if (i > 0) await editor.getByRole('button', { name: 'Add line' }).click()
    await editor.getByLabel(`Line ${i + 1} description`).fill(description)
    await editor.getByLabel(`Line ${i + 1} quantity`).fill(String(quantity))
    await editor.getByLabel(`Line ${i + 1} unit price`).fill(String(price))
    await editor.getByLabel(`Line ${i + 1} account`).selectOption(account)
  }
  await editor.getByLabel('Line 1 description').click()
  return editor
}

async function recordPayment(
  page: Page,
  side: 'sales' | 'purchases',
  number: string,
  date: string,
) {
  const word = side === 'sales' ? 'invoice' : 'bill'
  await page.getByTestId(`${word}-row`).filter({ hasText: number }).click()
  const editor = page.getByTestId(`${word}-editor`)
  await editor.getByLabel('Payment date').fill(date)
  await editor.getByRole('button', { name: 'Record payment' }).click()
  return editor
}

test('Books: invoices, bills, payments and a duplicate bill caught', async ({ page }) => {
  test.setTimeout(240_000)
  await startBooksTask(page, 'books-sales-purchases', /Invoices, bills and payments/)
  await section(page, 'Sales')

  let editor = await newDocument(page, 'sales', {
    contact: 'Harbour Foods',
    date: '2026-03-31',
    due: '2026-04-30',
    lines: [['Advisory days', 4, 650, '4000']],
  })
  await expect(editor.getByLabel('Invoice number')).toHaveValue('INV-1040')
  await expect(editor.getByTestId('invoice-totals')).toContainText('£3,120.00')
  await editor.getByRole('button', { name: 'Approve invoice' }).click()
  await expect(editor).toContainText('Awaiting payment')
  await editor.getByRole('button', { name: 'Close' }).click()

  editor = await newDocument(page, 'sales', {
    contact: 'Brightpath Clinics',
    date: '2026-03-31',
    due: '2026-04-30',
    lines: [
      ['Workshops', 2, 900, '4100'],
      ['Travel', 1, 180, '4000'],
    ],
  })
  await expect(editor.getByTestId('invoice-totals')).toContainText('£2,376.00')
  await editor.getByRole('button', { name: 'Approve invoice' }).click()
  await editor.getByRole('button', { name: 'Close' }).click()

  editor = await recordPayment(page, 'sales', 'INV-1038', '2026-03-25')
  await expect(editor.getByTestId('payment')).toContainText('£9,600.00')
  await editor.getByRole('button', { name: 'Close' }).click()

  await section(page, 'Purchases')
  editor = await newDocument(page, 'purchases', {
    contact: 'Meadow Office Supplies',
    number: 'MOS-2291',
    date: '2026-03-12',
    lines: [['Paper and toner', 1, 185, '6400']],
  })
  await editor.getByRole('button', { name: 'Approve bill' }).click()
  await editor.getByRole('button', { name: 'Close' }).click()
  editor = await newDocument(page, 'purchases', {
    contact: 'Clearline Telecom',
    number: 'CL-89017',
    date: '2026-03-20',
    lines: [['Broadband and phones', 1, 240, '6100']],
  })
  await editor.getByRole('button', { name: 'Approve bill' }).click()
  await editor.getByRole('button', { name: 'Close' }).click()

  // The reminder is for a bill already in the books: Books says so.
  editor = await newDocument(page, 'purchases', {
    contact: 'Clearline Telecom',
    number: 'CL-88410',
    date: '2026-02-24',
    lines: [['Phone system support', 1, 2666.67, '6100']],
  })
  await editor.getByRole('button', { name: 'Approve bill' }).click()
  await expect(page.getByRole('alert')).toContainText('already entered')
  await editor.getByRole('button', { name: 'Delete draft' }).click()

  editor = await recordPayment(page, 'purchases', 'FC-2207', '2026-03-31')
  await expect(editor.getByTestId('payment')).toContainText('£4,140.00')
  await editor.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: 'Aged payables' }).click()
  await expect(page.getByTestId('aged-purchases')).toContainText('Clearline Telecom')

  await submitForFull(page)

  // The portfolio keeps the Books file as handed in, read-only.
  const viewer = await openMainFileInPortfolio(page, 'Invoices, bills and payments')
  await expect(viewer.getByTestId('books')).toBeVisible()
})

test('Books: a bank reconciliation with a keying error found and fixed', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await startBooksTask(page, 'books-bank-rec', /Reconcile the bank in Books/)
  await section(page, 'Banking')
  const line = (text: string) =>
    page.getByTestId('statement-line').filter({ hasText: text })

  for (const text of ['LANDMARK', 'FERRIS', 'NORTHGATE']) {
    await line(text).getByRole('button', { name: 'Match', exact: true }).last().click()
    await expect(line(text)).toContainText('Matched')
  }
  for (const [text, account, memo] of [
    ['CLOUDSOFT', '6200', 'Cloud storage subscription'],
    ['ACCOUNT FEE', '6500', 'Bank charges'],
  ]) {
    await line(text).getByRole('button', { name: 'Record it' }).click()
    await line(text)
      .getByLabel(/^Account for/)
      .selectOption(account)
    await line(text)
      .getByLabel(/^Description for/)
      .fill(memo)
    await line(text).getByRole('button', { name: 'Record', exact: true }).click()
    await expect(line(text)).toContainText('Matched')
  }

  // Nothing in the books has 1,520.00: the receipt was keyed in as 1,250.00.
  await line('HARBOUR').getByRole('button', { name: 'Match', exact: true }).click()
  await expect(line('HARBOUR')).toContainText('Nothing in Books has this amount')
  await section(page, 'Sales')
  await page.getByTestId('invoice-row').filter({ hasText: 'INV-1039' }).click()
  const invoice = page.getByTestId('invoice-editor')
  await invoice.getByTestId('payment').getByRole('button', { name: 'Remove' }).click()
  await invoice.getByLabel('Payment date').fill('2026-03-30')
  await invoice.getByLabel('Payment amount').fill('1520')
  await invoice.getByLabel('Payment date').click()
  await invoice.getByRole('button', { name: 'Record payment' }).click()
  await expect(invoice.getByTestId('payment')).toContainText('£1,520.00')

  await section(page, 'Banking')
  await line('HARBOUR').getByRole('button', { name: 'Match', exact: true }).last().click()
  await expect(page.getByTestId('reconciliation-status')).toContainText('Reconciled')
  // The Clearline payment of 31 March reaches the bank in April.
  await expect(page.getByTestId('books-banking')).toContainText(
    'not on the statement yet',
  )

  await submitForFull(page)
})

test('Books: payroll with a new starter and a pay rise', async ({ page }) => {
  test.setTimeout(240_000)
  await startBooksTask(page, 'books-payroll', /Run March’s payroll/)
  await section(page, 'Payroll')

  await page.getByRole('button', { name: 'Add employee' }).click()
  let form = page.getByTestId('employee-form')
  await form.getByLabel('Employee name').fill('Ines Duarte')
  await form.getByLabel('Employee role').fill('Junior Consultant')
  await form.getByLabel('Annual salary').fill('28000')
  await form.getByLabel('Pension contribution').fill('5')
  await form.getByLabel('Employee name').click()
  await form.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('button', { name: 'Edit Maya Patel' }).click()
  form = page.getByTestId('employee-form')
  await form.getByLabel('Annual salary').fill('39000')
  await form.getByLabel('Employee name').click()
  await form.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('employee-row')).toHaveCount(6)

  await page.getByLabel('Pay run month').fill('2026-03')
  await page.getByLabel('Pay date').fill('2026-03-27')
  await page.getByRole('button', { name: 'Create pay run' }).click()
  const run = page.getByTestId('payrun')
  await expect(run.getByTestId('payslip')).toHaveCount(6)
  await expect(
    run.getByTestId('payslip').filter({ hasText: 'Maya Patel' }),
  ).toContainText('£3,250.00')
  await run.getByRole('button', { name: 'Post pay run' }).click()
  await expect(run).toContainText('Posted')

  await submitForFull(page)
})

test('Books: sections unlock with promotions', async ({ page }) => {
  await startAccounting(page)
  await apps(page)
    .getByRole('button', { name: /^Books/ })
    .click()
  // As a trainee, payroll is locked and says when it opens.
  await expect(page.getByTestId('tool-home-books')).toContainText(
    'Unlocks when you become Accountant.',
  )
  await page.getByRole('button', { name: 'Open the practice file' }).click()
  const nav = page.getByRole('navigation', { name: 'Books sections' })
  await expect(nav.getByRole('button', { name: 'Payroll' })).toBeDisabled()
  await expect(nav.getByRole('button', { name: 'Journals' })).toBeEnabled()
})
