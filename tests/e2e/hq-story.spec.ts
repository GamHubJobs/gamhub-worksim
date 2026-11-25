/**
 * "The Headquarters Transformation" (Architecture & Interior Design), played in
 * the real app: chosen on the first screen, missions done in person, a reload
 * part way, the first design task handed in and marked in Space Studio moving
 * the story on, then the board presentation and the promotion it leads to.
 */
import { expect, test, type Page } from '@playwright/test'
import { closeAllWindows, sitAtComputer } from './helpers.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'
const scene = (page: Page) => page.getByTestId('story-scene')
const tracker = (page: Page) => page.getByTestId('story-tracker')
const finished = (page: Page) => page.getByTestId('story-finished')

const talkTo = (page: Page, id: string) =>
  page.evaluate(`window.__worksimTalk(${JSON.stringify(id)})`)

async function play(page: Page, person: string, sceneId: string, choice: RegExp) {
  await expect
    .poll(
      () =>
        page.evaluate<boolean>(
          `(window.__worksimPeople?.() ?? []).some((p) => p.id === ${JSON.stringify(person)})`,
        ),
      { timeout: 120_000 },
    )
    .toBe(true)
  await talkTo(page, person)
  // A chapter's first or last scene opens like a film: skipped here.
  const film = page.getByTestId('cinematic')
  await expect(film.or(scene(page)).first()).toBeVisible({ timeout: 120_000 })
  if (await film.isVisible())
    await film.getByRole('button', { name: 'Skip (Esc)' }).click()
  await expect(scene(page)).toHaveAttribute('data-scene', sceneId, { timeout: 120_000 })
  await scene(page).getByRole('button', { name: choice }).click()
  await scene(page).getByRole('button', { name: 'Carry on' }).click()
  await expect(scene(page)).toHaveCount(0)
}

async function carryOn(page: Page, title: string) {
  await expect(finished(page)).toContainText(title, { timeout: 60_000 })
  await finished(page).getByRole('button', { name: 'Carry on' }).click()
}

async function startFromPanel(page: Page, missionId: string) {
  await page.getByTestId('story-button').click()
  const panel = page.getByTestId('story-panel')
  await panel
    .getByTestId(`mission-${missionId}`)
    .getByRole('button', { name: 'Start' })
    .click()
  await panel.getByRole('button', { name: 'Close' }).first().click()
}

test('The Headquarters Transformation: from the first day to the board and the promotion', async ({
  page,
}) => {
  test.setTimeout(900_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('/')
  await page.getByRole('radio', { name: /^Architecture & Interior Design/ }).check()
  await page.getByRole('radio', { name: /Story Mode/ }).check()
  await page.getByLabel('Your first name').fill('Robin')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await expect(tracker(page)).toContainText('A scale rule and a desk')
  await expect(tracker(page)).toContainText('Meet Marguerite')

  // Chapter 1: Marguerite, then Tobias.
  await play(page, 'manager', 'hq-meet-marguerite', /Trace the route/)
  await expect(tracker(page)).toContainText('Ask Tobias')
  await play(page, 'senior', 'hq-meet-tobias', /three rules/)
  await carryOn(page, 'A scale rule and a desk')

  // The first plan: started from the Story screen; still there after a reload.
  await startFromPanel(page, 'first-plan')
  await expect(tracker(page)).toContainText(
    'Plan Harbour Housing’s flat B in Space Studio',
  )
  await page.reload()
  await expect(tracker(page)).toContainText(
    'Plan Harbour Housing’s flat B in Space Studio',
    {
      timeout: 60_000,
    },
  )

  // The task, started in Tasks and handed in from Space Studio.
  await sitAtComputer(page)
  await closeAllWindows(page)
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await page
    .getByRole('button', { name: /A two-bedroom flat for Harbour Housing/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('studio')).toBeVisible({ timeout: 30_000 })
  await closeAllWindows(page)
  expect(await page.evaluate("window.__worksim.solveTask('arch-two-bed')")).toBe(true)
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Space Studio/ })
    .click()
  await page
    .getByTestId('tool-home-studio')
    .getByRole('button', { name: /Harbour Housing flat B/ })
    .click()
  await expect(page.getByTestId('studio').getByTestId('room-label').first()).toBeVisible({
    timeout: 30_000,
  })
  await page.getByRole('button', { name: /Submit to Marguerite/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
    {
      timeout: 30_000,
    },
  )
  await page
    .getByTestId('submission-results')
    .getByRole('button', { name: /Back to Space Studio|Close/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Leave desk' }).click()

  // The story noticed the design was passed: on to Sana.
  await expect(tracker(page)).toContainText('Go through your plan with Sana', {
    timeout: 60_000,
  })
  await play(page, 'backM', 'hq-sana-critique', /go through all of it/)
  await carryOn(page, 'Your first plan')
  await page.getByTestId('story-button').click()
  await expect(
    page.getByTestId('story-panel').getByTestId('mission-first-plan'),
  ).toHaveAttribute('data-status', 'done')
  await expect(
    page.getByTestId('story-panel').getByTestId('mission-hq-announce'),
  ).toHaveAttribute('data-status', 'open')
  await page
    .getByTestId('story-panel')
    .getByRole('button', { name: 'Close' })
    .first()
    .click()

  // The board presentation, after a sound set of decisions along the way.
  await page.evaluate(
    "window.__worksim.storyAt('hq-board', ['hq-listened', 'hq-storage', 'hq-riser-moved', 'hq-phased', 'hq-honest'])",
  )
  await expect(tracker(page)).toContainText('Present the east zone to the board', {
    timeout: 60_000,
  })
  await talkTo(page, 'manager')
  await expect(scene(page)).toHaveAttribute('data-scene', 'hq-board', {
    timeout: 120_000,
  })
  await expect(scene(page)).toContainText('asks for your cost plan')
  await page.screenshot({ path: `${shots}/story/hq-board.png` })
  await scene(page)
    .getByRole('button', { name: /Own the weak points/ })
    .click()
  await scene(page).getByRole('button', { name: 'Carry on' }).click()
  await carryOn(page, 'The board')

  // The morning after: the promotion opportunity, and the end of the story.
  await startFromPanel(page, 'hq-next')
  await play(page, 'manager', 'hq-next', /Thank her/)
  await carryOn(page, 'What comes next')
  await page.getByTestId('story-button').click()
  await expect(page.getByTestId('story-ending')).toContainText(
    'put you forward for Senior Designer',
  )
  await page.screenshot({ path: `${shots}/story/hq-ending.png` })
})
