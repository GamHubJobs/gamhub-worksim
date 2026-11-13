import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'
import { expectCode, getCode, setCode } from './codeEditor.ts'

async function startTask(page: Page, id: string, title: RegExp, testId: string) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /Software Development/ }).check()
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
  await expect(page.getByTestId(testId)).toBeVisible()
}

async function submit(page: Page) {
  await page.getByRole('button', { name: /Submit to Samuel/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  return page.getByTestId('submission-results').getByTestId('score')
}

async function terminal(page: Page, command: string) {
  const input = page.getByLabel('Terminal command')
  await expect(input).toBeEnabled()
  await input.fill(command)
  await input.press('Enter')
  await expect(page.getByTestId('terminal-output')).toContainText(`$ ${command}`)
}

test('Git: a fix on a branch, tested, committed and merged', async ({ page }) => {
  test.setTimeout(240_000)
  await startTask(
    page,
    'git-first-fix',
    /Your first branch, commit and merge/,
    'code-app',
  )
  await page.getByRole('tab', { name: 'Terminal' }).click()
  const out = page.getByTestId('terminal-output')
  await terminal(page, 'git checkout -b fix/late-fees')
  await expect(out).toContainText("Switched to a new branch 'fix/late-fees'")

  const editor = page.getByTestId('code-editor')
  const original = await getCode(editor)
  await setCode(
    editor,

    original
      .replace('daysLate > 60', 'daysLate >= 60')
      .replace('daysLate > 30', 'daysLate >= 30'),
  )
  await terminal(page, 'npm test')
  await expect(out).toContainText('Tests: 0 failed, 3 passed, 3 total')
  await terminal(page, 'git status')
  await expect(out).toContainText('modified:   fees.js')
  await terminal(page, 'git add fees.js')
  await terminal(page, 'git commit -m "Fix late fees on exactly 30 and 60 days"')
  await expect(out).toContainText('[fix/late-fees ')
  await terminal(page, 'git checkout main')
  // main still has the old code until the branch is merged.
  await expectCode(editor, original)
  await terminal(page, 'git merge fix/late-fees')
  await expect(out).toContainText('Fast-forward')
  await expect.poll(() => getCode(editor)).not.toBe(original)
  await terminal(page, 'git status')
  await expect(out).toContainText('nothing to commit, working tree clean')
  await expect(await submit(page)).toHaveText('100%')
})

test('Debug console: reproduce NaN, fix it, commit', async ({ page }) => {
  test.setTimeout(240_000)
  await startTask(page, 'debug-nan', /Why does the report say NaN/, 'code-app')
  await page.getByRole('tab', { name: 'Debug' }).click()
  await page.getByLabel('Debug function').selectOption('averageHours')
  await page.getByLabel('Debug arguments').fill('[[]]')
  await page.getByRole('button', { name: 'Call', exact: true }).click()
  await expect(page.getByTestId('debug-result')).toContainText('returned NaN')
  await page.getByLabel('Debug arguments').fill('[[{"hours": "7.5"}, {"hours": "6"}]]')
  await page.getByRole('button', { name: 'Call', exact: true }).click()
  await expect(page.getByTestId('debug-result')).toContainText('returned 3.78')

  const editor = page.getByTestId('code-editor')
  const code = await getCode(editor)
  await setCode(
    editor,

    code
      .replace(
        '  let total = 0\n  for (const entry of entries) {\n    total += entry.hours\n  }\n  return total / entries.length',
        '  if (entries.length === 0) return 0\n  let total = 0\n  for (const entry of entries) {\n    total += Number(entry.hours)\n  }\n  return total / entries.length',
      )
      .replaceAll('total += entry.hours', 'total += Number(entry.hours)'),
  )
  await page.getByRole('button', { name: 'Call', exact: true }).click()
  await expect(page.getByTestId('debug-result')).toContainText('returned 6.75')
  await page.getByRole('tab', { name: 'Terminal' }).click()
  await terminal(
    page,
    'git commit -am "Fix NaN average for empty weeks and hours sent as text"',
  )
  await expect(page.getByTestId('terminal-output')).toContainText('1 file changed')
  await expect(await submit(page)).toHaveText('100%')
})

test('API Client: the timesheet API tested, and its bug reported', async ({ page }) => {
  test.setTimeout(240_000)
  await startTask(page, 'api-testing', /Test the timesheet API/, 'api')
  const status = page.getByTestId('status')
  const save = async (name: string) => {
    await page.getByLabel('Request name').fill(name)
    await page.getByRole('button', { name: 'Save to collection' }).click()
  }
  const sendRequest = async (
    method: string,
    url: string,
    token: string | null,
    body: string,
    expected: string,
  ) => {
    await page.getByLabel('Method').selectOption(method)
    await page.getByLabel('URL').fill(url)
    if (token === null) {
      if (await page.getByLabel('Remove header 1').count())
        await page.getByLabel('Remove header 1').click()
    } else {
      if ((await page.getByLabel('Header 1 name').count()) === 0)
        await page.getByRole('button', { name: 'Add header' }).click()
      await page.getByLabel('Header 1 name').fill('Authorization')
      await page.getByLabel('Header 1 value').fill(`Bearer {{${token}}}`)
    }
    if (body) await page.getByLabel('Body').fill(body)
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(status).toHaveText(expected)
  }
  const entry = (hours: number) =>
    JSON.stringify({
      person: 'ines.duarte',
      project: 'PRJ-2210',
      date: '2026-03-04',
      hours,
      description: 'Workshop materials',
    })

  await sendRequest('GET', '{{baseUrl}}/v1/projects', 'readToken', '', '200 OK')
  await save('List projects')
  await sendRequest(
    'POST',
    '{{baseUrl}}/v1/timesheets',
    'writeToken',
    entry(7.5),
    '201 Created',
  )
  await save('Create entry')
  await sendRequest(
    'POST',
    '{{baseUrl}}/v1/timesheets',
    'writeToken',
    entry(14),
    '422 Unprocessable Entity',
  )
  await expect(page.getByTestId('response-body')).toContainText(
    'hours must be more than 0 and no more than 12',
  )
  await save('Invalid hours')
  await sendRequest(
    'POST',
    '{{baseUrl}}/v1/timesheets',
    'readToken',
    entry(7.5),
    '403 Forbidden',
  )
  await save('Read token cannot write')
  await sendRequest(
    'PATCH',
    '{{baseUrl}}/v1/timesheets/1',
    'writeToken',
    '{"hours": 20}',
    '200 OK',
  )
  await save('PATCH accepts 20 hours')
  await sendRequest('GET', '{{baseUrl}}/v1/timesheets', null, '', '401 Unauthorized')
  await save('No token')
  await expect(page.getByTestId('saved-request')).toHaveCount(6)

  await page
    .getByRole('navigation', { name: 'API Client sections' })
    .getByRole('button', { name: 'Bug report' })
    .click()
  await page
    .getByLabel('Bug report')
    .fill(
      'PATCH /v1/timesheets/1 with the body {"hours": 20} and a write token returns 200 and saves 20 hours. The reference says PATCH follows the same rules as POST, so it should refuse it with 422 and "hours must be more than 0 and no more than 12", as POST does for 14 hours.',
    )
  await page.getByLabel('Bug report').blur()
  await expect(await submit(page)).toHaveText('100%')
})
