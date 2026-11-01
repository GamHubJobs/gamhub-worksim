import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

/** Reads every row of a table straight from the browser's database. */
function readTable(page: Page, table: string): Promise<unknown[]> {
  // Runs in the page, where indexedDB exists (the tests have no browser types).
  return page.evaluate(`new Promise((resolve, reject) => {
    const open = indexedDB.open('gamhub-worksim')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const request = db.transaction('${table}').objectStore('${table}').getAll()
      request.onsuccess = () => {
        resolve(request.result)
        db.close()
      }
      request.onerror = () => reject(request.error)
    }
  })`)
}

async function submitCode(page: Page, code: string) {
  await page.getByTestId('code-editor').fill(code)
  await page.getByRole('button', { name: /Submit (again )?to Samuel/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  const score = page.getByTestId('submission-results').getByTestId('score')
  await expect(score).toBeVisible()
  const text = await score.textContent()
  await page.getByRole('button', { name: 'Back to the code' }).click()
  return text
}

test('passing a task captures exactly what was handed in, once', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Software Development/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Tasks')
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('code-app')).toBeVisible()
  const original = await page.getByTestId('code-editor').inputValue()
  const fixed = original
    .replace('let i = 1', 'let i = 0')
    .replace('quantity + lines', 'quantity * lines')
    .replace('subtotal * discountPercent', 'subtotal * (discountPercent / 100)')

  // A failing attempt is not evidence.
  expect(await submitCode(page, original)).not.toBe('100%')
  expect(await readTable(page, 'portfolioItems')).toEqual([])

  // A pass is captured, with the code exactly as submitted.
  expect(await submitCode(page, `${fixed}\n// passed version`)).toBe('100%')
  let items = (await readTable(page, 'portfolioItems')) as Array<{
    title: string
    score: number
    attempts: unknown[]
    files: Array<{ fileId: string; kind: string }>
  }>
  expect(items).toHaveLength(1)
  expect(items[0]).toMatchObject({ title: 'Fix the invoice totals', score: 100 })
  expect(items[0].attempts).toHaveLength(2)
  const files = (await readTable(page, 'portfolioFiles')) as Array<{
    id: string
    snapshot: { kind: string; content: { files: Array<{ name: string; text: string }> } }
  }>
  expect(files).toHaveLength(1)
  const invoice = files[0].snapshot.content.files.find((f) => f.name === 'invoice.js')
  expect(invoice?.text).toContain('// passed version')

  // Editing and submitting again doesn't duplicate, and a lower score keeps the evidence.
  expect(await submitCode(page, original)).not.toBe('100%')
  items = (await readTable(page, 'portfolioItems')) as typeof items
  expect(items).toHaveLength(1)
  expect(items[0].score).toBe(100)
  expect(items[0].attempts).toHaveLength(3)
  expect(await readTable(page, 'portfolioFiles')).toHaveLength(1)

  // Everything survives a reload.
  await page.reload()
  await expect(page.getByTestId('desktop')).toBeVisible()
  expect(await readTable(page, 'portfolioItems')).toHaveLength(1)

  // The Portfolio app shows the item, how it was checked, and the code as handed in.
  await openApp(page, 'Portfolio')
  await expect(page.getByTestId('portfolio-card')).toHaveCount(1)
  await page.getByTestId('portfolio-card').click()
  const itemPage = page.getByTestId('portfolio-item-page')
  await expect(
    itemPage.getByRole('heading', { name: 'Fix the invoice totals' }),
  ).toBeVisible()
  await expect(itemPage.getByTestId('item-score')).toHaveText('100%')
  await expect(itemPage.getByTestId('item-attempts').getByRole('listitem')).toHaveCount(3)
  await itemPage.getByRole('button', { name: /^Main file/ }).click()
  const viewer = itemPage.getByTestId('evidence-viewer')
  await expect(viewer.getByTestId('code-editor')).toHaveValue(/\/\/ passed version/)
  await expect(viewer.getByTestId('code-editor')).not.toBeEditable()

  // A note and the include choice are kept; the score cannot be changed here.
  await itemPage.getByLabel('Your note').fill('Found three bugs with the tests.')
  await itemPage.getByLabel('Include in my portfolio exports').uncheck()
  await page.reload()
  await expect(page.getByTestId('portfolio-item-page')).toBeVisible()
  await expect(page.getByLabel('Your note')).toHaveValue(
    'Found three bugs with the tests.',
  )
  await expect(page.getByLabel('Include in my portfolio exports')).not.toBeChecked()

  // Back to the list: the "Included only" filter now hides it.
  await page.getByRole('button', { name: 'All work' }).click()
  await page.getByLabel('Included only').check()
  await expect(page.getByTestId('portfolio-card')).toHaveCount(0)
  await expect(page.getByText('No work matches these filters.')).toBeVisible()
})

test('passed work missing from the portfolio is added back when WorkSim opens', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Software Development/ }).check()
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Tasks')
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  const original = await page.getByTestId('code-editor').inputValue()
  const fixed = original
    .replace('let i = 1', 'let i = 0')
    .replace('quantity + lines', 'quantity * lines')
    .replace('subtotal * discountPercent', 'subtotal * (discountPercent / 100)')
  expect(await submitCode(page, fixed)).toBe('100%')

  // Like a save from before the portfolio existed: the record is not there.
  await page.evaluate(`new Promise((resolve) => {
    const open = indexedDB.open('gamhub-worksim')
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction(['portfolioItems', 'portfolioFiles'], 'readwrite')
      tx.objectStore('portfolioItems').clear()
      tx.objectStore('portfolioFiles').clear()
      tx.oncomplete = () => {
        db.close()
        resolve(true)
      }
    }
  })`)
  expect(await readTable(page, 'portfolioItems')).toEqual([])

  await page.reload()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await expect.poll(async () => (await readTable(page, 'portfolioItems')).length).toBe(1)
  expect(await readTable(page, 'portfolioFiles')).toHaveLength(1)

  // Rebuilding again changes nothing.
  await page.getByRole('button', { name: /Storage & backup/ }).click()
  const panel = page.getByTestId('storage-panel')
  await panel.getByRole('button', { name: 'Rebuild portfolio' }).click()
  await expect(panel.getByTestId('rebuilt')).toHaveText(
    'Your portfolio was already complete.',
  )
  expect(await readTable(page, 'portfolioItems')).toHaveLength(1)
})
