import { expect, test, type Page } from '@playwright/test'
import { openApp, startCareerIfNeeded } from './helpers.ts'

const panel = (page: Page) => page.getByTestId('office-panel')
const dialogue = (page: Page) => page.getByTestId('office-dialogue')

async function goTo(page: Page, place: string) {
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: place })
    .click()
  await expect(panel(page).getByRole('heading')).toHaveText(place)
}

test('getting to know colleagues builds trust, shown in the Career app', async ({
  page,
}) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')

  // Marcus is wary of the new intern; genuine curiosity wins him over a little.
  await goTo(page, 'Your desk')
  await panel(page)
    .getByRole('button', { name: /Talk to Marcus/ })
    .click()
  await expect(dialogue(page)).toContainText('So you are the new starter')
  await dialogue(page)
    .getByRole('button', { name: /Ask about Marcus’s work/ })
    .click()
  await expect(dialogue(page)).toContainText('Marcus: trust +5')
  await expect(dialogue(page)).toContainText('Workplace tip')
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()

  // Nina invites the player to lunch with the team on the second chat.
  await goTo(page, 'Reception')
  await panel(page)
    .getByRole('button', { name: /Talk to Nina/ })
    .click()
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()
  await panel(page)
    .getByRole('button', { name: /Talk to Nina/ })
    .click()
  await expect(dialogue(page)).toContainText('a few of us eat together')
  await dialogue(page)
    .getByRole('button', { name: /would love to/ })
    .click()
  await expect(dialogue(page)).toContainText('Nina: trust +4')
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()

  // The Career app shows the team, their personalities and how they see the player.
  await openApp(page, 'Career')
  const team = page.getByTestId('team')
  await expect(team).toContainText('Professional reputation')
  await expect(page.getByTestId('colleague-senior')).toContainText('Marcus Webb')
  await expect(page.getByTestId('colleague-senior')).toContainText('Friendly')
  // Nina: 55 to start, +2 and +1 for two chats, +4 for accepting her invitation.
  await expect(
    page.getByRole('progressbar', { name: 'Trust: Nina Patel' }),
  ).toHaveAttribute('aria-valuenow', '62')
})
