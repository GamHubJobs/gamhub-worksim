import { expect, test, type Page } from '@playwright/test'
import { openApp, startCareerIfNeeded } from './helpers.ts'

const panel = (page: Page) => page.getByTestId('office-panel')
const dialogue = (page: Page) => page.getByTestId('office-dialogue')

test('Friday’s one-to-one is a performance review, kept in the Career app', async ({
  page,
}) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')

  // Jump to Friday afternoon (a development-only hook, so tests need not wait).
  await page.evaluate('window.__worksim.setTime(5, 15 * 60 + 25)')
  await expect(page.getByTestId('workday-bar')).toContainText('Friday')
  await expect(page.getByTestId('meeting-now')).toContainText('One-to-one with Priya')
  await panel(page)
    .getByRole('button', { name: /Go to Priya’s office/ })
    .click()
  await panel(page)
    .getByRole('button', { name: /Join the one-to-one/ })
    .click()

  await expect(dialogue(page)).toContainText('Let’s look at your week')
  await expect(dialogue(page)).toContainText('Quality of work')
  await dialogue(page)
    .getByRole('button', { name: /ask what would make the biggest difference/ })
    .click()
  await expect(dialogue(page)).toContainText('Priya: trust +2')
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()

  // The review arrives in writing and is kept in the Career app.
  await openApp(page, 'Mail')
  await expect(page.getByRole('button', { name: /Your week 1 review/ })).toBeVisible()
  await openApp(page, 'Career')
  await expect(page.getByTestId('reviews')).toContainText('Week 1:')
  await expect(page.getByTestId('reviews')).toContainText('Reliability')
})
