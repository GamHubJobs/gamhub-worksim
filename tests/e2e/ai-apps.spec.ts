import { expect, test, type Page } from '@playwright/test'
import {
  cell,
  enterValue,
  openApp,
  sitAtComputer,
  startCareerIfNeeded,
} from './helpers.ts'

// WorkSim AI inside the apps: each app's "WorkSim AI" menu asks about what is
// open there, and proposed changes are applied only when the player says so.
// Models are simulated; no test calls a real AI provider.

const ai = (page: Page) => page.getByTestId('window-ai')

async function fromMenu(page: Page, windowKey: string, item: string | RegExp) {
  await page
    .getByTestId(`window-${windowKey}`)
    .getByRole('button', { name: 'WorkSim AI', exact: true })
    .click()
  await page.getByRole('menuitem', { name: item }).click()
  await expect(ai(page)).toBeVisible()
}

/** Pretends to be the AI bridge, answering every chat with `reply`. */
async function simulateBridge(page: Page, reply: (body: { system: string }) => string) {
  await page.route('http://127.0.0.1:8787/**', async (route) => {
    const request = route.request()
    const headers = {
      'access-control-allow-origin': request.headers().origin ?? '*',
      'access-control-allow-headers': 'content-type',
      'content-type': 'application/json',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    return route.fulfill({
      headers,
      body: JSON.stringify({ text: reply(request.postDataJSON()), model: 'test-model' }),
    })
  })
  await page.evaluate(() =>
    localStorage.setItem(
      'gamhub-worksim:ai-settings',
      JSON.stringify({ engine: 'bridge', consent: true, mode: 'professional' }),
    ),
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await sitAtComputer(page)
})

test('Mail and Tasks: summarise, list requests, and plan the task', async ({ page }) => {
  await openApp(page, 'Mail')
  await page.getByRole('button', { name: /Your first task/ }).click()
  await fromMenu(page, 'mail', 'What does it ask me to do?')
  await expect(ai(page).getByTestId('ai-answer').last()).toContainText(
    'add the order total at the bottom',
  )

  // The reply: the built-in guide reviews the draft (it cannot rewrite it).
  await openApp(page, 'Mail')
  await page.getByRole('button', { name: /Your first task/ }).click()
  await page.getByTestId('window-mail').getByRole('button', { name: 'Reply' }).click()
  await page
    .getByTestId('window-mail')
    .getByLabel('Message', { exact: true })
    .fill('hey Priya, gonna do this asap!! thanks')
  await fromMenu(page, 'mail', 'Review my draft')
  await expect(ai(page).getByTestId('ai-answer').last()).toContainText('Informal wording')

  await openApp(page, 'Tasks')
  await page.getByRole('list', { name: 'Tasks' }).getByRole('button').first().click()
  await fromMenu(page, 'tasks', 'How should I approach this task?')
  await expect(ai(page).getByTestId('ai-answer').last()).toContainText(
    'Work through it one step at a time',
  )
})

test('Sheets: explain an error, and apply a suggested formula only when chosen', async ({
  page,
}) => {
  await openApp(page, 'Sheets')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  await enterValue(page, 'B2', '100')
  await enterValue(page, 'B3', '250')
  await enterValue(page, 'B4', '50')
  await enterValue(page, 'C2', '=B2/0', '#DIV/0!')

  await cell(page, 'C2').click()
  await fromMenu(page, 'sheets', 'Why is this formula not working?')
  await expect(ai(page).getByTestId('ai-answer').last()).toContainText('divides by zero')

  // Learning mode gives a hint; Professional mode proposes the formula.
  await page.getByTestId('window-sheets').getByTestId('window-title-bar').click()
  await cell(page, 'B5').click()
  await fromMenu(page, 'sheets', 'Suggest a formula for this cell')
  await expect(ai(page).getByTestId('ai-answer').last()).toContainText(
    'Try writing it yourself',
  )
  await expect(ai(page).getByTestId('ai-proposal')).toHaveCount(0)

  await ai(page).getByRole('radio', { name: 'Professional' }).click()
  await page.getByTestId('window-sheets').getByTestId('window-title-bar').click()
  await cell(page, 'B5').click()
  await fromMenu(page, 'sheets', 'Suggest a formula for this cell')
  const proposal = ai(page).getByTestId('ai-proposal')
  await expect(proposal).toContainText('Proposed formula for cell B5')
  await expect(proposal).toContainText('=SUM(B2:B4)')
  // Nothing has changed until the player applies it.
  await expect(cell(page, 'B5')).toHaveText('')
  await proposal.getByRole('button', { name: 'Apply' }).click()
  await expect(proposal).toContainText('Applied')
  await expect(cell(page, 'B5')).toHaveText('400')

  await page.getByTestId('window-sheets').getByTestId('window-title-bar').click()
  await cell(page, 'A1').click()
  await page.mouse.down()
  await cell(page, 'B4').hover()
  await page.mouse.up()
  await fromMenu(page, 'sheets', 'Analyse the selected data')
  await expect(ai(page).getByTestId('ai-answer').last()).toContainText('total 400')
})

test('Docs: a model’s rewrite of the selection is applied only after review', async ({
  page,
}) => {
  await simulateBridge(page, (body) =>
    body.system.includes('rewrite the selected text')
      ? 'The quarterly figures are ready for review.'
      : 'Fine.',
  )
  await page.reload()
  await sitAtComputer(page)
  await openApp(page, 'Docs')
  await page.getByRole('button', { name: /Blank document/ }).click()
  const body = page.getByTestId('doc-body').locator('.ProseMirror')
  await body.click()
  await page.keyboard.type('the numbers is done now, have a look')
  await page.keyboard.press('Control+a')

  await fromMenu(page, 'docs', 'Rewrite the selected text professionally')
  const proposal = ai(page).getByTestId('ai-proposal')
  await expect(proposal).toContainText('The quarterly figures are ready for review.')
  await expect(ai(page).getByTestId('ai-source').last()).toContainText(
    'Written by an AI model',
  )
  await expect(body).toContainText('the numbers is done now')
  await proposal.getByRole('button', { name: 'Apply' }).click()
  await expect(body).toContainText('The quarterly figures are ready for review.')
  await expect(body).not.toContainText('the numbers is done now')
})
