import { expect, test, type Page } from '@playwright/test'
import { sitAtComputer, startCareerIfNeeded } from './helpers.ts'

const panel = (page: Page) => page.getByTestId('office-panel')
const dialogue = (page: Page) => page.getByTestId('office-dialogue')
const clock = (page: Page) => page.getByTestId('office-clock')

async function goTo(page: Page, place: string) {
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: place })
    .click()
  await expect(panel(page).getByRole('heading')).toHaveText(place)
}

/** Moves the office clock forward (a development-only hook, so tests need not wait). */
async function passTime(page: Page, minutes: number) {
  await page.evaluate(`window.__worksim.passTime(${minutes})`)
}

test('a working day: stand-up, lunch, going home and the next morning', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')

  // Monday morning, a few minutes before work. The day's plan is one click away.
  await expect(clock(page)).toHaveText('8:50 am')
  await page.getByTestId('workday-bar').click()
  const day = page.getByTestId('day-panel')
  await expect(day).toContainText('Team stand-up')
  await expect(page.getByTestId('deadlines')).toContainText(
    'Price the office supplies order',
  )
  await page.keyboard.press('Escape')

  // Walking to the desk takes a couple of minutes.
  await goTo(page, 'Your desk')
  await expect(clock(page)).toHaveText('8:52 am')

  // At the computer, a reminder appears when the stand-up is about to start.
  await sitAtComputer(page)
  await passTime(page, 18)
  await expect(page.getByTestId('notices')).toContainText('stand-up starts at 9:15 am')
  await page.getByRole('button', { name: 'Go to the meeting' }).click()
  await page.getByRole('button', { name: 'Join the team stand-up' }).click()
  await expect(dialogue(page)).toContainText('what are you on today?')
  await dialogue(page)
    .getByRole('button', { name: /Give a clear update/ })
    .click()
  await expect(dialogue(page)).toContainText('Priya: trust +2')
  await expect(dialogue(page)).toContainText('Workplace tip')
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()
  await expect(clock(page)).toHaveText('9:30 am')

  // Lunch is only served at lunchtime.
  await goTo(page, 'Break room')
  await panel(page)
    .getByRole('button', { name: /Have lunch/ })
    .click()
  await expect(dialogue(page)).toContainText('a bit early for lunch')
  await passTime(page, 150)
  await panel(page)
    .getByRole('button', { name: /Have lunch/ })
    .click()
  await expect(dialogue(page)).toContainText('proper break')
  await page.getByTestId('workday-bar').click()
  await expect(page.getByTestId('day-log')).toContainText('Had lunch')
  await expect(page.getByTestId('day-log')).toContainText('Joined the team stand-up')
  await page.keyboard.press('Escape')

  // Leaving early with work unfinished asks first.
  await goTo(page, 'Reception')
  await panel(page).getByRole('button', { name: 'Go home' }).click()
  await expect(dialogue(page)).toContainText('Leaving now will be noticed')
  await dialogue(page).getByRole('button', { name: 'Go home anyway' }).click()

  const end = page.getByTestId('day-end')
  await expect(end).toContainText('Time to go home')
  await expect(end).toContainText('Left early')
  await end.getByRole('button', { name: 'Start Tuesday morning' }).click()

  // Tuesday: back at reception, and the day is remembered after a reload.
  await expect(panel(page).getByRole('heading')).toHaveText('Reception')
  await expect(clock(page)).toHaveText('8:50 am')
  await expect(page.getByTestId('workday-bar')).toContainText('Tuesday')
  await page.reload()
  await expect(page.getByTestId('workday-bar')).toContainText('Tuesday')
})
