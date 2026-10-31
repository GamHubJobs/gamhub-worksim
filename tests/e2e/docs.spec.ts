import { expect, test, type Page } from '@playwright/test'
import { openApp, startCareerIfNeeded, waitUntilSaved } from './helpers.ts'

const body = (page: Page) => page.getByTestId('doc-body').locator('.ProseMirror')
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Formatting' })

test('a document can be written, formatted, renamed and reopened', async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await openApp(page, 'Docs')
  await page.getByRole('button', { name: /Blank document/ }).click()

  // A heading, a formatted paragraph and a bulleted list.
  await body(page).click()
  await toolbar(page).getByLabel('Text style').selectOption('h1')
  await page.keyboard.type('Supplier review')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Three suppliers were ')
  await page.keyboard.press('Control+b')
  await page.keyboard.type('late')
  await page.keyboard.press('Control+b')
  await page.keyboard.type(' this month.')
  await page.keyboard.press('Enter')
  await toolbar(page).getByRole('button', { name: 'Bulleted list' }).click()
  await page.keyboard.type('Brightline')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Northwind')

  await expect(body(page).locator('h1')).toHaveText('Supplier review')
  await expect(body(page).locator('strong')).toHaveText('late')
  await expect(body(page).locator('ul li')).toHaveCount(2)
  await expect(page.getByRole('navigation', { name: 'Outline' })).toContainText(
    'Supplier review',
  )

  // A table from the Table menu.
  await toolbar(page).getByRole('button', { name: 'Table' }).click()
  await page.getByRole('menuitem', { name: /Insert table/ }).click()
  await expect(body(page).locator('table tr')).toHaveCount(3)

  // Rename it.
  await page.getByTestId('document-title').click()
  await page.getByLabel('Title').fill('Supplier review, October')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('document-title')).toHaveText('Supplier review, October')

  // Everything is saved automatically and is there after a reload.
  await waitUntilSaved(page)
  await page.reload()
  await expect(body(page).locator('h1')).toHaveText('Supplier review')
  await expect(body(page).locator('strong')).toHaveText('late')
  await expect(body(page).locator('table')).toHaveCount(1)
  await expect(page.getByTestId('document-title')).toHaveText('Supplier review, October')

  // Keep a version, then find the file in the list.
  await page.getByRole('button', { name: 'Version history' }).click()
  await page.getByRole('button', { name: /Keep a copy of the current version/ }).click()
  await expect(page.getByTestId('version-history')).toContainText('Saved by you')
  await page.getByRole('button', { name: 'Files' }).click()
  await expect(page.getByTestId('doc-files')).toContainText('Supplier review, October')
  await expect(page.getByTestId('doc-files')).toContainText(/\d+ words/)
})

test('templates give a professional starting point, and files can be deleted', async ({
  page,
}) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Lee')
  await openApp(page, 'Docs')
  await page.getByRole('button', { name: /Meeting minutes/ }).click()
  await expect(body(page)).toContainText('Minutes: [Meeting name]')
  await expect(body(page)).toContainText('Minutes taken by')
  await expect(body(page)).toContainText('Sam Lee')
  await expect(body(page).locator('table')).toHaveCount(2)

  await page.getByRole('button', { name: 'Files' }).click()
  const files = page.getByTestId('doc-files')
  await expect(files).toContainText('Meeting minutes')
  await files.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(files).toContainText('Nothing here yet')
})
