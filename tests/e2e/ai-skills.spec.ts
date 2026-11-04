import { expect, test, type Page } from '@playwright/test'
import { openApp, sitAtComputer, startCareerIfNeeded } from './helpers.ts'

// Using AI at work: prompt tips, a pause before personal data is shared, the
// manager's AI policy, the AI cases, and AI competencies shown from evidence.

const ai = (page: Page) => page.getByTestId('window-ai')

async function ask(page: Page, text: string) {
  await ai(page).getByLabel('Your question').fill(text)
  await page.keyboard.press('Enter')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await sitAtComputer(page)
})

test('prompt tips, the personal-data pause, the policy email and AI skills', async ({
  page,
}) => {
  await openApp(page, 'WorkSim AI')

  // A vague prompt in Learning mode gets a tip.
  await ask(page, 'help')
  await expect(ai(page).getByTestId('ai-prompt-tip')).toContainText(
    'Start with what you want',
  )

  // Personal data: WorkSim AI pauses before anything is asked.
  await ask(page, 'Draft a reply to karen.holt@meadow.example about her invoice')
  const warning = ai(page).getByTestId('ai-privacy-warning')
  await expect(warning).toContainText('an email address')
  await expect(ai(page).getByTestId('ai-turn')).toHaveCount(1)
  await warning.getByRole('button', { name: 'Edit my question' }).click()
  await expect(warning).toHaveCount(0)
  await expect(ai(page).getByLabel('Your question')).toHaveValue(
    /karen\.holt@meadow\.example/,
  )
  await ask(
    page,
    'Draft a polite reply to the supplier about her overdue invoice, under 100 words',
  )
  await expect(ai(page).getByTestId('ai-turn')).toHaveCount(2)
  await expect(ai(page).getByTestId('ai-prompt-tip')).toHaveCount(1)

  // The manager sets out the company's expectations on first use.
  await openApp(page, 'Mail')
  await page.getByRole('button', { name: /Using WorkSim AI: what we expect/ }).click()
  await expect(page.getByTestId('mail-message')).toContainText('Never put personal data')

  // The Career app shows AI competencies from evidence, not from use.
  await openApp(page, 'Career')
  const skills = page.getByTestId('ai-skills')
  await expect(skills).toContainText('Asking more questions does not raise these')
  await expect(skills.getByTestId('ai-skill-responsible')).toContainText('Strong')
  await expect(skills.getByTestId('ai-skill-prompting')).toContainText('Not shown yet')
  await expect(page.getByTestId('skill-ai-use')).toContainText('Using AI at work')
})

test('the AI cases: checking an AI summary is graded like any case', async ({ page }) => {
  const caseId = 'office-admin-finance-ai-verify'
  await openApp(page, 'Mail')
  await page.evaluate(`window.__worksim.arriveCase('${caseId}')`)
  await page.getByRole('button', { name: /Quick check before the board pack/ }).click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open case' })
    .click()
  const detail = page.getByTestId('case-detail')
  await expect(
    detail.getByRole('heading', {
      name: 'Check an AI summary before it goes to the board',
    }),
  ).toBeVisible()
  await expect(detail).toContainText('West grew 12% on the previous quarter')
  await page.evaluate(`window.__worksim.answerCase('${caseId}')`)
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')
})
