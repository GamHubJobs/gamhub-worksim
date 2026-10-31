import { expect, test, type Page } from '@playwright/test'
import { sitAtComputer, startCareerIfNeeded } from './helpers.ts'

const dialogue = (page: Page) => page.getByTestId('office-dialogue')

test('when the player is overloaded, Priya comes over to check in', async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await sitAtComputer(page)

  // A stressful morning (set directly; the development-only hook saves time).
  await page.evaluate('window.__worksim.passTime(40)')
  await page.evaluate('window.__worksim.setWellbeing({ stress: 85 })')

  // Priya comes to the desk; the reminder does not block work.
  const notices = page.getByTestId('notices')
  await expect(notices).toContainText('Priya has come over to your desk')
  await notices.getByRole('button', { name: 'Talk to Priya' }).click()

  await expect(dialogue(page)).toContainText('under a lot of pressure')
  await dialogue(page)
    .getByRole('button', { name: /Be honest about your workload/ })
    .click()
  await expect(dialogue(page)).toContainText('move your next deadline by a day')
  await expect(dialogue(page)).toContainText('Stress −10')
  await expect(dialogue(page)).toContainText('Deadline moved by one day')
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()
  await expect(page.getByTestId('event-waiting')).toHaveCount(0)
})
