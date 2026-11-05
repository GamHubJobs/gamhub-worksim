import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Career life on the laptop at home: applying for a job (and the employer's
// answer next evening), a side business, and asking for a rise.

const home = (page: Page) => page.getByTestId('home')
const laptop = (page: Page) => page.getByTestId('career')

async function goHomeOn(page: Page, day: number) {
  await page.evaluate(`window.__worksim.setTime(${day}, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 15_000 })
}

async function rooms(page: Page, name: string) {
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name })
    .click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

test('the laptop: a job application, a side business and a pay talk', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('synchronously unmount'))
      errors.push(m.text())
  })
  await goHomeOn(page, 1)
  await home(page).getByRole('button', { name: 'Open your laptop' }).click()

  // Jobs: apply to the housing trust; the answer comes another evening.
  await laptop(page)
    .getByTestId('job-larkspur')
    .getByRole('button', { name: /Apply/ })
    .click()
  await expect(laptop(page).getByTestId('job-larkspur')).toContainText('Applied')

  // A side business: set up tutoring and do an evening of it.
  await laptop(page).getByRole('button', { name: 'Side business' }).click()
  await laptop(page)
    .getByTestId('business-tutoring')
    .getByRole('button', { name: 'Start it' })
    .click()
  await expect(laptop(page).getByTestId('business')).toContainText('Evening tutoring')
  await laptop(page)
    .getByRole('button', { name: /Work on it/ })
    .click()
  await expect(laptop(page).getByTestId('business')).toContainText('earned £18.00')
  await expect(home(page).getByTestId('balance')).toHaveText('£285.50')

  // Pay: ask for a rise with no review yet behind it.
  await laptop(page).getByRole('button', { name: 'Pay' }).click()
  await laptop(page).getByTestId('pay-ask-3').click()
  await expect(laptop(page).getByTestId('pay')).toContainText(
    'will reply on another evening',
  )
  await laptop(page).getByRole('button', { name: 'Close the laptop' }).click()

  // Next evening: both answers, with reasons.
  await rooms(page, 'Bedroom')
  await home(page)
    .getByRole('button', { name: /Go to bed/ })
    .click()
  await rooms(page, 'Front door')
  await home(page).locator('[data-commute="bus"]').click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await goHomeOn(page, 2)
  await expect(home(page).getByTestId('home-log')).toContainText(
    'Larkspur Housing Trust replied',
  )
  await home(page).getByRole('button', { name: 'Open your laptop' }).click()
  await expect(laptop(page).getByTestId('job-larkspur')).toContainText('Not shortlisted')
  await expect(laptop(page).getByTestId('job-larkspur')).toContainText('at least 2')
  await laptop(page).getByRole('button', { name: 'Pay' }).click()
  await expect(laptop(page).getByTestId('pay-answer')).toContainText('not now')
  expect(errors).toEqual([])
})

test('WorkSim AI at home: budget, plan and learning from the built-in guide', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://localhost') &&
      !r.url().startsWith('http://127.0.0.1')
    )
      requests.push(r.url())
  })
  await goHomeOn(page, 1)
  await home(page).getByRole('button', { name: 'Open your laptop' }).click()
  await laptop(page).getByRole('button', { name: 'WorkSim AI' }).click()
  const ai = page.getByTestId('life-ai')
  await expect(ai).toContainText('not an AI model')

  await ai.getByRole('button', { name: 'Check my budget' }).click()
  await expect(ai.getByTestId('life-ai-answer').last()).toContainText(
    'Your budget this week',
  )
  await expect(ai.getByTestId('life-ai-source').last()).toHaveText(
    'Built-in guide: WorkSim’s own rules, not an AI model.',
  )
  await ai.getByRole('button', { name: 'Plan my evening' }).click()
  await expect(ai.getByTestId('life-ai-answer').last()).toContainText('Be in bed by')
  await ai.getByLabel('Ask WorkSim AI').fill('How do I get promoted?')
  await ai.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(ai.getByTestId('life-ai-answer').last()).toContainText('For promotion to')

  // What it is given: no name, and nothing has left the computer.
  await ai.getByRole('button', { name: /what WorkSim AI is given/ }).click()
  await expect(ai.getByTestId('life-ai-shared')).toContainText('Balance:')
  await expect(ai.getByTestId('life-ai-shared')).not.toContainText('Sam')
  expect(requests).toEqual([])
})
