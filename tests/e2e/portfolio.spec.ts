import { readFile } from 'node:fs/promises'
import { expect, test, type Download, type Page } from '@playwright/test'
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

  // Skills: calculated from the passed work, with reasons and links to it.
  await page
    .getByRole('navigation', { name: 'Portfolio sections' })
    .getByRole('button', { name: 'Skills' })
    .click()
  const skills = page.getByTestId('skills-view')
  await expect(skills.getByTestId('tasks-completed')).toHaveText('1')
  const demonstrated = skills
    .getByTestId('competency')
    .filter({ has: page.getByTestId('competency-level').getByText('Demonstrated') })
  await expect(demonstrated.first()).toContainText(
    'Shown in 1 passed task, average score 100%',
  )
  // The latest (failed) attempt shows what to improve; the task itself stays passed.
  await expect(skills.getByTestId('improvements')).toContainText('Fix the invoice totals')
  await expect(skills.getByTestId('improvements')).not.toContainText('Not passed yet')
  // The section is kept after a reload, and the evidence opens the item.
  await page.reload()
  await demonstrated
    .first()
    .getByRole('button', { name: /Fix the invoice totals/ })
    .click()
  await expect(page.getByTestId('portfolio-item-page')).toBeVisible()

  // The progress report: a summary, reasoned next steps, and the honesty statement.
  await page.getByRole('button', { name: 'All work' }).click()
  await page
    .getByRole('navigation', { name: 'Portfolio sections' })
    .getByRole('button', { name: 'Progress report' })
    .click()
  const report = page.getByTestId('progress-report')
  await expect(report.getByTestId('report-summary')).toContainText('with 1 passed task')
  await expect(report).toContainText('It is not a record of employment')
  const next = report.getByTestId('recommendations').getByRole('listitem').first()
  await expect(next).toContainText('Do your next task')
  await expect(next).toContainText('Why:')
  await next.getByRole('button', { name: 'Open task' }).click()
  await expect(page.getByTestId('task-detail')).toBeVisible()
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

/** The text of a downloaded PDF, read back with pdf.js. */
async function downloadedPdfText(download: Download): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(await readFile(await download.path()))
  expect(new TextDecoder().decode(data.slice(0, 5))).toBe('%PDF-')
  const pdf = await getDocument({ data, verbosity: 0 }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n'
  }
  return text.replace(/[ \t]+/g, ' ')
}

test('the portfolio, the competency report and an item download as PDFs', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Software Development/ }).check()
  await page.getByLabel('Your first name').fill('Robin')
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
  expect(await submitCode(page, `${fixed}\n// exported version`)).toBe('100%')

  await openApp(page, 'Portfolio')
  await page
    .getByRole('navigation', { name: 'Portfolio sections' })
    .getByRole('button', { name: 'Export' })
    .click()
  const view = page.getByTestId('export-view')
  await view.getByLabel('Name on your documents').fill('Robin Ellis')

  let download = page.waitForEvent('download')
  await view.getByRole('button', { name: 'Download portfolio PDF' }).click()
  let file = await download
  expect(file.suggestedFilename()).toBe('Robin Ellis - portfolio.pdf')
  let text = await downloadedPdfText(file)
  expect(text).toContain('Robin Ellis')
  expect(text).toContain('Contents')
  expect(text).toContain('Fix the invoice totals')
  expect(text).toContain('// exported version')
  expect(text).toContain('It is not a record of employment')
  await expect(view.getByTestId('export-done')).toContainText('Portfolio PDF is ready')

  download = page.waitForEvent('download')
  await view.getByRole('button', { name: 'Download competency report' }).click()
  file = await download
  expect(file.suggestedFilename()).toBe('Robin Ellis - competency report.pdf')
  text = await downloadedPdfText(file)
  expect(text).toContain('How levels are decided')
  expect(text).toContain('Demonstrated')

  // One item on its own.
  await page
    .getByRole('navigation', { name: 'Portfolio sections' })
    .getByRole('button', { name: 'Work' })
    .click()
  await page.getByTestId('portfolio-card').click()
  download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download as PDF' }).click()
  file = await download
  expect(file.suggestedFilename()).toBe('Fix the invoice totals.pdf')
  expect(await downloadedPdfText(file)).toContain('How it was checked')
})
