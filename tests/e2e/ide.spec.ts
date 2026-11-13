/**
 * The Code app as a full editor: files in folders, search, problems,
 * Source Control, the step-through debugger, extensions and the palette.
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'
import { editorReady, setCode } from './codeEditor.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function openFirstCodeTask(page: Page) {
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
  await editorReady(page.getByTestId('code-editor'))
}

const HELPER = `export function total(items, taxRate) {
  let sum = 0
  for (const item of items) {
    sum += item.price * item.qty
  }
  const tax = sum * taxRate
  return sum + tax
}
`

test('the editor: folders, search, problems, Git, debugging and extensions', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openFirstCodeTask(page)
  const app = page.getByTestId('code-app')
  const editor = page.getByTestId('code-editor')
  await expect(page.getByTestId('status-bar')).toContainText('Ln 1, Col 1')

  // A new file in a folder, from the Explorer.
  await app.getByRole('button', { name: 'New file' }).click()
  await app.getByLabel('New file name').fill('lib/helpers.js')
  await app.getByLabel('New file name').press('Enter')
  await expect(app.getByRole('navigation', { name: 'Files' })).toContainText('lib')
  await expect(app.getByRole('tab', { name: /helpers\.js/ })).toBeVisible()
  await expect(editor).toHaveAttribute('data-file', 'lib/helpers.js')

  // A mistake shows in Problems; fixing it clears them.
  await setCode(editor, 'export function total(items {\n')
  await app.getByRole('tab', { name: /Problems/ }).click()
  await expect(app.getByTestId('problems')).toContainText('lib/helpers.js', {
    timeout: 15_000,
  })
  await setCode(editor, HELPER)
  await expect(app.getByTestId('problems')).toContainText('No problems', {
    timeout: 15_000,
  })

  // Search every file.
  await app.getByRole('button', { name: 'Search', exact: true }).click()
  await app.getByLabel('Search files').fill('taxRate')
  await expect(app.getByTestId('search-summary')).toHaveText(/2 results in 1 file/)

  // The command palette.
  await app.getByRole('button', { name: 'Search commands' }).click()
  await page.getByRole('combobox', { name: 'Command' }).fill('>show source')
  await page.keyboard.press('Enter')
  await expect(app.getByTestId('source-control')).toBeVisible()

  // Source Control: a repository, a commit, and the history.
  await app.getByRole('button', { name: 'Initialize Repository' }).click()
  await expect(app.getByTestId('source-control')).toContainText('Nothing to commit')
  await setCode(editor, `${HELPER}// rounded later\n`)
  await app.getByRole('button', { name: 'Stage lib/helpers.js' }).click()
  await app.getByLabel('Commit message').fill('Add a note to the helper')
  await app.getByRole('button', { name: 'Commit', exact: true }).click()
  await expect(app.getByRole('region', { name: 'History' })).toContainText(
    'Add a note to the helper',
  )
  await expect(page.getByTestId('status-bar')).toContainText('main')

  // A breakpoint, then step through a recorded run.
  await editor.locator('.view-line').nth(3).click()
  await page.keyboard.press('F9')
  await app.getByRole('button', { name: 'Run and Debug' }).click()
  await expect(app.getByRole('region', { name: 'Breakpoints' })).toContainText(
    'lib/helpers.js:4',
  )
  await app
    .getByRole('combobox', { name: 'Function', exact: true })
    .selectOption({ label: 'lib/helpers.js › total' })
  await app
    .getByLabel('Arguments to debug with')
    .fill('[[{"price": 10, "qty": 2}, {"price": 5, "qty": 1}], 0.1]')
  await app.getByRole('button', { name: /Start debugging/ }).click()
  await expect(app.getByTestId('debug-position')).toContainText('line 4')
  await expect(app.getByTestId('debug-variables')).toContainText('sum')
  await expect(editor.locator('.ide-debug-line')).toHaveCount(1)
  await page.screenshot({ path: `${shots}/ide/debugging.png` })
  await app.getByRole('button', { name: /Step over/ }).click()
  await expect(app.getByTestId('debug-position')).toContainText('Step 4 of 6')
  await app.getByRole('button', { name: /Continue/ }).click()
  await expect(app.getByTestId('debug-outcome')).toHaveText('total returned 27.5')

  // Extensions switch on real editor features.
  await app.getByRole('button', { name: 'Extensions' }).click()
  await app.getByRole('button', { name: 'Install Code Overview' }).click()
  await expect(editor.locator('.minimap')).toBeVisible()
  await page.screenshot({ path: `${shots}/ide/extensions.png` })

  // The simulated terminal says so.
  await app.getByRole('tab', { name: 'Terminal' }).click()
  await expect(app.getByRole('region', { name: 'Terminal' })).toContainText(
    'Simulated terminal',
  )
})
