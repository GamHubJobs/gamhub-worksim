import { expect, test, type Page } from '@playwright/test'
import { openApp, sitAtComputer } from './helpers.ts'

// Story Mode, played: started from the first screen, missions done in person
// (walking up to the people they are about, a case answered on the computer),
// a decision that changes what is said later, saved across a reload, and the
// career's free play still there.

const talkTo = (page: Page, id: string) =>
  page.evaluate(
    (who) =>
      (globalThis as unknown as { __worksimTalk: (id: string) => void }).__worksimTalk(
        who,
      ),
    id,
  )
const scene = (page: Page) => page.getByTestId('story-scene')
const tracker = (page: Page) => page.getByTestId('story-tracker')

async function play(
  page: Page,
  person: string,
  sceneId: string,
  choice: string | RegExp,
) {
  // (The person must be in the office: wait until they are.)
  await expect
    .poll(
      () =>
        page.evaluate(
          (id) =>
            (globalThis as unknown as { __worksimPeople?: () => Array<{ id: string }> })
              .__worksimPeople?.()
              .some((p) => p.id === id) ?? false,
          person,
        ),
      { timeout: 120_000 },
    )
    .toBe(true)
  await talkTo(page, person)
  await expect(scene(page)).toHaveAttribute('data-scene', sceneId, { timeout: 120_000 })
  await scene(page).getByRole('button', { name: choice }).click()
  await scene(page).getByRole('button', { name: 'Carry on' }).click()
  await expect(scene(page)).toHaveCount(0)
}

test('a story from the first screen: the first morning and the missing invoice, played in person', async ({
  page,
}) => {
  test.setTimeout(600_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Office Administration/ }).check()
  await page.getByRole('radio', { name: /Story Mode/ }).check()
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await expect(tracker(page)).toContainText('First morning')
  await expect(tracker(page)).toContainText('Check in with Nina')

  // Nina at reception: her welcome, in person.
  await talkTo(page, 'reception')
  await expect(scene(page)).toHaveAttribute('data-scene', 'nina-welcome', {
    timeout: 120_000,
  })
  await expect(scene(page)).toContainText('You must be Sam!')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/story/nina-welcome.png`,
  })
  await scene(page).getByRole('button', { name: 'Admit you are nervous' }).click()
  await expect(scene(page)).toContainText('glass door')
  await scene(page).getByRole('button', { name: 'Carry on' }).click()
  await expect(tracker(page)).toContainText('Meet Priya')

  // Priya, then the mission is complete.
  const xp = Number((await page.getByTestId('xp').textContent())!.replace(/\D/g, ''))
  await play(page, 'manager', 'priya-first', /good first month/)
  await expect(page.getByTestId('story-finished')).toContainText('First morning')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/story/mission-complete.png`,
  })
  await page
    .getByTestId('story-finished')
    .getByRole('button', { name: 'Carry on' })
    .click()
  await expect(page.getByTestId('xp')).toHaveText(`${xp + 20} XP`)

  // The missing invoice, chosen from the Story screen.
  await page.getByTestId('story-button').click()
  const panel = page.getByTestId('story-panel')
  await expect(panel.getByTestId('mission-first-morning')).toHaveAttribute(
    'data-status',
    'done',
  )
  await expect(panel.getByTestId('mission-month-end')).toHaveAttribute(
    'data-status',
    'locked',
  )
  await panel
    .getByTestId('mission-missing-invoice')
    .getByRole('button', { name: 'Start' })
    .click()
  await panel.getByRole('button', { name: 'Close' }).first().click()
  await expect(tracker(page)).toContainText('Ask Marcus about the Meadow order')

  // A reload part way: the story carries on where it was.
  await page.reload()
  await expect(tracker(page)).toContainText('Ask Marcus about the Meadow order', {
    timeout: 60_000,
  })
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })

  // Marcus asks the player to keep quiet; the player suggests fixing it together.
  await play(page, 'senior', 'marcus-invoice', /tell Priya together/)
  await expect(tracker(page)).toContainText('Ben')
  await play(page, 'admin', 'ben-files', 'Thank Ben')
  await expect(tracker(page)).toContainText('Answer Meadow')

  // The case, answered on the computer.
  await sitAtComputer(page)
  await openApp(page, 'Cases')
  await page.evaluate("window.__worksim.answerCase('fa-short-delivery')")
  await page.getByRole('list', { name: 'Cases' }).getByRole('button').first().click()
  const detail = page.getByTestId('case-detail')
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Leave desk' }).click()
  // (Not over the work computer's screen: back in the office, the tracker shows.)
  await expect(tracker(page)).toContainText('Tell Priya what happened', {
    timeout: 60_000,
  })
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })

  // What Priya says follows from the decision: they came together.
  await talkTo(page, 'manager')
  await expect(scene(page)).toHaveAttribute('data-scene', 'priya-invoice', {
    timeout: 120_000,
  })
  await expect(scene(page)).toContainText('You came together')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/story/priya-decision.png`,
  })
  await scene(page)
    .getByRole('button', { name: /as it happened/ })
    .click()
  await scene(page).getByRole('button', { name: 'Carry on' }).click()
  await expect(page.getByTestId('story-finished')).toContainText('The missing invoice')
  await expect(page.getByTestId('story-finished')).toContainText('new check')
  await page
    .getByTestId('story-finished')
    .getByRole('button', { name: 'Carry on' })
    .click()

  // The Story screen: decisions remembered; month-end now open.
  await page.getByTestId('story-button').click()
  await expect(panel.getByTestId('story-decisions')).toContainText('tell Priya together')
  await expect(panel.getByTestId('mission-month-end')).toHaveAttribute(
    'data-status',
    'open',
  )
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/story/story-screen.png`,
  })
})

test('free play is unchanged: no story unless chosen, and the Story screen offers one', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await expect(tracker(page)).toHaveCount(0)
  await page.getByTestId('story-button').click()
  await expect(page.getByTestId('story-panel')).toContainText('Short Delivery')
  await page
    .getByTestId('story-panel')
    .getByRole('button', { name: 'Start the story' })
    .click()
  await expect(tracker(page)).toContainText('Check in with Nina')
})

async function newFinanceCareer(page: Page) {
  await page.goto('/')
  await page.getByRole('radio', { name: /Office Administration/ }).check()
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
}

test('chapters 2 and 3: the supplier review with new people, and an ending that follows the choices', async ({
  page,
}) => {
  test.setTimeout(600_000)
  await newFinanceCareer(page)
  await page.evaluate("window.__worksim.storyAt('supplier-review', ['knows-gap'])")
  await expect(tracker(page)).toContainText('Ask Leila')
  await play(page, 'backM', 'leila-suppliers', /who chose Brightline/)
  await play(page, 'admin', 'ben-contracts', /sign it out/)
  // Dana, the coordinator, in the story for the first time.
  await play(page, 'coordinator', 'dana-brightline', /export the log/)
  await talkTo(page, 'manager')
  await expect(scene(page)).toHaveAttribute('data-scene', 'priya-review', {
    timeout: 120_000,
  })
  await expect(scene(page)).toContainText('Dana’s log')
  await scene(page)
    .getByRole('button', { name: /Credit the team/ })
    .click()
  await scene(page).getByRole('button', { name: 'Carry on' }).click()
  await expect(page.getByTestId('story-finished')).toContainText('The supplier review')
  await page
    .getByTestId('story-finished')
    .getByRole('button', { name: 'Carry on' })
    .click()

  // The last mission: Priya's offer depends on what happened with Marcus and the café.
  await page.evaluate(
    "window.__worksim.storyAt('next-step', ['marcus-tells', 'helped-maya', 'audit-truth'])",
  )
  await talkTo(page, 'manager')
  await expect(scene(page)).toHaveAttribute('data-scene', 'priya-offer', {
    timeout: 120_000,
  })
  await expect(scene(page)).toContainText('Marcus came to see me')
  await expect(scene(page)).toContainText('café on the corner')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/story/priya-offer.png`,
  })
  await scene(page)
    .getByRole('button', { name: /Put Marcus forward/ })
    .click()
  await scene(page).getByRole('button', { name: 'Carry on' }).click()
  await expect(page.getByTestId('story-finished')).toContainText('Marcus stays')
  await page
    .getByTestId('story-finished')
    .getByRole('button', { name: 'Carry on' })
    .click()
  await page.getByTestId('story-button').click()
  await expect(page.getByTestId('story-ending')).toContainText(
    'The end of “Short Delivery”',
  )
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/story/the-end.png`,
  })
})

test('a side mission in town: helping Maya with her books at the café, after work', async ({
  page,
}) => {
  test.setTimeout(600_000)
  await newFinanceCareer(page)
  await page.evaluate("window.__worksim.storyAt('bakery-books', ['bakery-offer'])")
  await expect(tracker(page)).toContainText('Help Maya')
  // Out of the office, home, and into town (free to go anywhere between missions).
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 30_000 })
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  const city = page.getByTestId('city')
  await city.getByTestId('place-cafe').click()
  await expect(city.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect(tracker(page)).toContainText('Help Maya')
  await play(page, 'cafe:barista', 'maya-books', /simple system/)
  await expect(page.getByTestId('story-finished')).toContainText('Shoeboxes of receipts')
  await expect(page.getByTestId('story-finished')).toContainText('banana bread')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/story/maya-books.png`,
  })
})

test('every career has a story: IT Help Desk, “Ticket Zero”, from the first screen', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByRole('radio', { name: /Story Mode: Ticket Zero/ }).check()
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await expect(tracker(page)).toContainText('First login')
  await play(page, 'manager', 'it-ravi', /worst thing/)
  await play(page, 'senior', 'it-jess', /ticket zero/)
  await expect(page.getByTestId('story-finished')).toContainText('First login')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/story/it-first-login.png`,
  })
})
