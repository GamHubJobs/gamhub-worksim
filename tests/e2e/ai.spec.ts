import { expect, test, type Page } from '@playwright/test'
import { closeAllWindows, sitAtComputer, startCareerIfNeeded } from './helpers.ts'

// WorkSim AI: the built-in guide by default, context from the player's work,
// assistance modes, and an AI bridge that is used only with consent. The
// bridge is simulated here: no test ever calls a real AI provider.

const taskbar = (page: Page) => page.getByRole('navigation', { name: 'Apps' })
const ai = (page: Page) => page.getByTestId('window-ai')

async function openAi(page: Page) {
  await taskbar(page)
    .getByRole('button', { name: /^WorkSim AI/ })
    .click()
  await expect(ai(page).getByTestId('ai-app')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Muhammed Baba Suno')
  await sitAtComputer(page)
})

test('the built-in guide answers from the email and task the player has open', async ({
  page,
}) => {
  // Open Priya's email, then ask WorkSim AI about it.
  await page.getByRole('button', { name: /Your first task/ }).click()
  await openAi(page)
  const context = ai(page).getByTestId('ai-context')
  await expect(context).toContainText('Email: Your first task')
  await expect(context).toContainText('Task: Price the office supplies order')
  await expect(context).toContainText('Your role')
  // The player's own name is never part of what the assistant is given.
  await expect(context).not.toContainText('Muhammed')
  await expect(ai(page).getByTestId('ai-engine')).toContainText('Built-in guide')

  await ai(page)
    .getByRole('button', { name: 'What does this email ask me to do?' })
    .click()
  const first = ai(page).getByTestId('ai-answer').first()
  await expect(first).toContainText('work out the line total for every item')
  await expect(first.getByTestId('ai-source')).toContainText('not an AI model')

  // Learning mode: one step at a time.
  await ai(page).getByLabel('Your question').fill('How should I approach this task?')
  await page.keyboard.press('Enter')
  const second = ai(page).getByTestId('ai-answer').nth(1)
  await expect(second).toContainText('Work through it one step at a time')

  // Professional mode: the whole plan.
  await ai(page).getByRole('radio', { name: 'Professional' }).click()
  await ai(page).getByLabel('Your question').fill('How should I approach this task?')
  await page.keyboard.press('Enter')
  await expect(ai(page).getByTestId('ai-answer').nth(2)).toContainText(
    'The steps, in order',
  )

  // Leaving context out: untick the email and it is no longer shared.
  await ai(page)
    .getByRole('checkbox', { name: /Email: Your first task/ })
    .uncheck()
  await ai(page).getByLabel('Your question').fill('Summarise this email')
  await page.keyboard.press('Enter')
  await expect(ai(page).getByTestId('ai-answer').nth(3)).toContainText('Open the email')
})

test('nothing is sent to a model without consent; with it, answers are labelled', async ({
  page,
}) => {
  let requests = 0
  await page.route('http://127.0.0.1:8787/**', async (route) => {
    const request = route.request()
    const headers = {
      'access-control-allow-origin': request.headers().origin ?? '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'content-type': 'application/json',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    requests += 1
    if (request.url().endsWith('/v1/status'))
      return route.fulfill({
        headers,
        body: JSON.stringify({
          providers: { anthropic: { ready: true, model: 'test-model' } },
          limit: 10,
          used: 0,
        }),
      })
    const body = request.postDataJSON() as { system: string; messages: unknown[] }
    // Only the minimum: no player name, the mode's rules, the question.
    expect(body.system).not.toContain('Muhammed')
    expect(body.system).toContain('Mode: Learning')
    return route.fulfill({
      headers,
      body: JSON.stringify({ text: 'Start by reading the order.', model: 'test-model' }),
    })
  })

  await closeAllWindows(page)
  await openAi(page)
  await ai(page).getByRole('button', { name: 'Settings' }).click()
  const settings = ai(page).getByTestId('ai-settings')
  await settings.getByRole('radio', { name: /cloud model/ }).check()
  await settings.getByRole('button', { name: 'Done' }).click()

  // Chosen but not agreed: the built-in guide still answers, and nothing is sent.
  await expect(ai(page).getByTestId('ai-engine')).toContainText('Built-in guide')
  await ai(page).getByLabel('Your question').fill('How do I write a good prompt?')
  await page.keyboard.press('Enter')
  await expect(ai(page).getByTestId('ai-source').first()).toContainText('not an AI model')
  expect(requests).toBe(0)

  // Agreed: the question goes to the (simulated) bridge.
  await ai(page).getByRole('button', { name: 'Settings' }).click()
  await settings.getByRole('checkbox', { name: /I agree/ }).check()
  await settings.getByRole('button', { name: 'Check the connection' }).click()
  await expect(settings.getByRole('status')).toHaveText('Ready to answer.')
  await settings.getByRole('button', { name: 'Done' }).click()
  await expect(ai(page).getByTestId('ai-engine')).toContainText(
    'Anthropic via the bridge',
  )
  await ai(page)
    .getByRole('button', { name: /Show what will be sent/ })
    .click()
  await expect(ai(page).getByTestId('ai-preview')).toContainText('Your role')
  await ai(page).getByLabel('Your question').fill('Where should I start?')
  await page.keyboard.press('Enter')
  const answer = ai(page).getByTestId('ai-answer').nth(1)
  await expect(answer).toContainText('Start by reading the order.')
  await expect(answer.getByTestId('ai-source')).toContainText(
    'Written by an AI model (Anthropic · test-model)',
  )
  expect(requests).toBe(2)

  // The bridge stops: WorkSim says so and the built-in guide answers.
  await page.unroute('http://127.0.0.1:8787/**')
  await page.route('http://127.0.0.1:8787/**', (route) => route.abort())
  await ai(page).getByLabel('Your question').fill('How do I write a good prompt?')
  await page.keyboard.press('Enter')
  const fallback = ai(page).getByTestId('ai-answer').nth(2)
  await expect(fallback).toContainText('The WorkSim AI bridge is not running')
  await expect(fallback.getByTestId('ai-source')).toContainText('not an AI model')
})

test('WorkSim AI is on the desktop, in Start and in search', async ({ page }) => {
  await closeAllWindows(page)
  await page.getByRole('option', { name: 'WorkSim AI' }).dblclick()
  await expect(ai(page)).toBeVisible()
  await closeAllWindows(page)
  await page.getByPlaceholder('Type here to search').fill('worksim ai')
  await page.keyboard.press('Enter')
  await expect(ai(page)).toBeVisible()
  // Settings are kept on this computer.
  await ai(page).getByRole('radio', { name: 'Expert' }).click()
  await page.reload()
  await expect(ai(page).getByRole('radio', { name: 'Expert' })).toHaveAttribute(
    'aria-checked',
    'true',
    { timeout: 30_000 },
  )
})
