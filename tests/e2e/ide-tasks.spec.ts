/**
 * Tasks that need the Code editor's IDE features, played for real: a
 * breakpoint and stepping (Software Development), and a support script in
 * the IT Help Desk career.
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'
import { editorReady, getCode, setCode } from './codeEditor.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function startTask(page: Page, career: RegExp, id: string, title: RegExp) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: career }).check()
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
  await expect(page.getByTestId('code-app')).toBeVisible()
  await editorReady(page.getByTestId('code-editor'))
}

async function submit(page: Page) {
  await page.getByRole('button', { name: /^Submit to / }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  return page.getByTestId('submission-results').getByTestId('score')
}

async function terminal(page: Page, command: string) {
  await page.getByRole('tab', { name: 'Terminal' }).click()
  const input = page.getByLabel('Terminal command')
  await expect(input).toBeEnabled()
  await input.fill(command)
  await input.press('Enter')
  await expect(page.getByTestId('terminal-output')).toContainText(`$ ${command}`)
}

test('Software Development: the discount found by stepping from a breakpoint, marked 100%', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(
    page,
    /Software Development/,
    'dev-step-discount',
    /The discount is too big/,
  )
  const app = page.getByTestId('code-app')
  const editor = page.getByTestId('code-editor')

  // A breakpoint on the discount line (line 12), then a run of two items.
  await editor.locator('.view-line').nth(11).click()
  await page.keyboard.press('F9')
  await app.getByRole('button', { name: 'Run and Debug' }).click()
  await expect(app.getByRole('region', { name: 'Breakpoints' })).toContainText(
    'basket.js:12',
  )
  await app
    .getByRole('combobox', { name: 'Function', exact: true })
    .selectOption({ label: 'basket.js › basketTotal' })
  await app
    .getByLabel('Arguments to debug with')
    .fill(
      '[[{"price": 10, "qty": 2, "discountable": false}, {"price": 5, "qty": 1, "discountable": true}], 10]',
    )
  await app.getByRole('button', { name: /Start debugging/ }).click()
  await expect(app.getByTestId('debug-position')).toContainText('line 12')
  // Paused on the second item: the running total (25) is about to be discounted.
  await expect(app.getByTestId('debug-variables')).toContainText('25')
  await page.screenshot({ path: `${shots}/ide/task-stepping.png` })
  await app.getByRole('button', { name: /Continue/ }).click()
  await expect(app.getByTestId('debug-outcome')).toHaveText('basketTotal returned 22.5')

  const code = await getCode(editor)
  await setCode(
    editor,
    code.replace(
      'discount += total * (loyaltyPercent / 100)',
      'discount += line * (loyaltyPercent / 100)',
    ),
  )
  await terminal(page, 'git commit -am "Fix loyalty discount: take it off each line"')
  await expect(page.getByTestId('terminal-output')).toContainText('1 file changed')
  await expect(await submit(page)).toHaveText('100%')
})

test('IT Help Desk: the ticket-sorting script fixed in Code, marked 100%', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(page, /IT Help Desk/, 'it-ticket-router', /The ticket-sorting script/)
  await page.getByRole('tab', { name: 'Debug' }).click()
  await page.getByLabel('Debug function').selectOption('routeTicket')
  await page.getByLabel('Debug arguments').fill('["Floor 2 Wi-Fi keeps dropping"]')
  await page.getByRole('button', { name: 'Call', exact: true }).click()
  await expect(page.getByTestId('debug-result')).toContainText('returned Access', {
    timeout: 30_000,
  })

  const editor = page.getByTestId('code-editor')
  const code = await getCode(editor)
  await setCode(
    editor,
    code
      .replace("'wifi', 'vpn'", "'wifi', 'wi-fi', 'vpn'")
      .replace(
        'export function routeTicket(subject) {\n',
        'export function routeTicket(subject) {\n  const text = subject.toLowerCase()\n',
      )
      .replace('subject.includes(word)', 'text.includes(word)')
      .replace("return 'Access'\n}", "return 'Triage'\n}"),
  )
  await page.getByRole('button', { name: 'Call', exact: true }).click()
  await expect(page.getByTestId('debug-result')).toContainText('returned Network')
  await page.screenshot({ path: `${shots}/ide/it-script.png` })
  await terminal(
    page,
    'git commit -am "Route tickets regardless of capitals; Wi-Fi; unknown to Triage"',
  )
  await expect(await submit(page)).toHaveText('100%')
})
