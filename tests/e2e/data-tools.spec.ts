import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

async function startTask(page: Page, id: string, title: RegExp) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /Data Analysis/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('${id}')`)
  await page.getByRole('button', { name: title }).first().click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('datastudio')).toBeVisible()
}

async function submit(page: Page) {
  await page.getByRole('button', { name: /Submit to Amara/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  return page.getByTestId('submission-results').getByTestId('score')
}

const section = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Data Studio sections' })
    .getByRole('button', { name, exact: true })
    .click()

test('Data Studio: four sales questions answered with real SQL', async ({ page }) => {
  test.setTimeout(240_000)
  await startTask(page, 'studio-sql', /Answer the sales questions with SQL/)
  await section(page, 'SQL')
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
  // A mistake first: the error comes back from SQLite.
  await page.getByLabel('SQL', { exact: true }).fill('SELECT * FORM orders')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('syntax error')

  for (const [name, sql] of queries) {
    await page.getByRole('button', { name: '+ New query' }).click()
    await page.getByLabel('SQL', { exact: true }).fill(sql)
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await expect(page.getByTestId('sql-result')).toBeVisible()
    await page.getByLabel('Query name').fill(name)
    await page.getByRole('button', { name: 'Save query' }).click()
    await expect(page.getByTestId('saved-query').filter({ hasText: name })).toBeVisible()
  }
  await expect(page.getByTestId('sql-result')).toContainText('Lind Studio')
  await expect(await submit(page)).toHaveText('100%')
})

test('Data Studio: the bookings export cleaned with applied steps', async ({ page }) => {
  test.setTimeout(240_000)
  await startTask(page, 'studio-cleaning', /Clean the bookings export in Data Studio/)
  const add = page.getByTestId('add-step')
  const step = async (kind: string, column: string, extra?: () => Promise<unknown>) => {
    await add.getByLabel('Step', { exact: true }).selectOption({ label: kind })
    await add.getByLabel('Step column').selectOption(column)
    if (extra) await extra()
    await add.getByRole('button', { name: 'Add step' }).click()
  }
  await step('Remove blank rows', 'client')
  await step('Remove duplicates', 'booking_id')
  for (const column of ['client', 'region']) {
    await step('Trim spaces', column)
    await step('Change capitals', column)
  }
  await step('Change capitals', 'status')
  await step('Change type', 'value', () =>
    add.getByLabel('New type').selectOption('number'),
  )
  await step('Change type', 'booked_on', () =>
    add.getByLabel('New type').selectOption('date'),
  )
  await expect(page.getByTestId('step')).toHaveCount(9)
  await expect(page.getByRole('tab', { name: /Clean \(36 rows\)/ })).toBeVisible()
  await expect(page.getByTestId('profiles')).toContainText('total 43,200')

  await section(page, 'Questions')
  await page
    .getByLabel('How many real bookings are there once the data is clean?')
    .fill('36')
  await page.getByLabel('What is the total value of those bookings?').fill('43200')
  await page
    .getByLabel('How many real bookings are there once the data is clean?')
    .click()
  await expect(await submit(page)).toHaveText('100%')
})

test('Data Studio: SQL and statistics unlock with promotions', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: /Data Analysis/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Tasks')
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Data Studio/ })
    .click()
  await page.getByRole('button', { name: 'Open the practice file' }).click()
  const nav = page.getByRole('navigation', { name: 'Data Studio sections' })
  await expect(nav.getByRole('button', { name: 'Data' })).toBeEnabled()
  await expect(nav.getByRole('button', { name: 'SQL' })).toBeDisabled()
  await expect(nav.getByRole('button', { name: 'Statistics' })).toBeDisabled()
})
