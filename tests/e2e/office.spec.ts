import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

const places = (page: Page) => page.getByRole('navigation', { name: 'Places' })
const panel = (page: Page) => page.getByTestId('office-panel')
const dialogue = (page: Page) => page.getByTestId('office-dialogue')

async function goTo(page: Page, place: string) {
  await places(page).getByRole('button', { name: place }).click()
  await expect(panel(page).getByRole('heading')).toHaveText(place)
}

test('a new starter arrives at reception in the 3D office and finds their way', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')

  // Arrival: reception, with the 3D office drawn.
  await expect(page.getByTestId('office')).toBeVisible()
  await expect(panel(page).getByRole('heading')).toHaveText('Reception')
  await expect(page.locator('[data-testid="office"] canvas')).toBeVisible({
    timeout: 60_000,
  })

  // Nina welcomes the new starter and explains where things are.
  await panel(page).getByRole('button', { name: 'Talk to Nina' }).click()
  await expect(dialogue(page)).toContainText('welcome to Cobalt Ridge, Alex')
  await dialogue(page).getByRole('button', { name: 'Thanks!' }).click()

  // The team whiteboard shows the week's work.
  await goTo(page, 'Your desk')
  await expect(
    panel(page).getByRole('button', { name: /Use your computer/ }),
  ).toContainText('2 new')
  await panel(page).getByRole('button', { name: 'Read the team whiteboard' }).click()
  await expect(dialogue(page)).toContainText('Price the office supplies order: new')
  await dialogue(page).getByRole('button', { name: 'Close' }).click()

  // Break room: coffee and a tip from Tom.
  await goTo(page, 'Break room')
  await panel(page).getByRole('button', { name: 'Make a coffee' }).click()
  await expect(dialogue(page)).toContainText('fresh coffee')
  await panel(page).getByRole('button', { name: 'Chat with Tom' }).click()
  await expect(dialogue(page)).toContainText('Here’s a tip')
  await panel(page).getByRole('button', { name: 'Read the notice board' }).click()
  await expect(dialogue(page)).toContainText('Welcome to the team: Alex Morgan')

  // Priya points to the first task and opens it on the computer.
  await goTo(page, 'Priya’s office')
  await panel(page).getByRole('button', { name: 'Talk to Priya' }).click()
  await expect(dialogue(page)).toContainText('Price the office supplies order')
  await dialogue(page).getByRole('button', { name: 'Open the task' }).click()
  await expect(page.getByTestId('task-detail')).toContainText(
    'Price the office supplies order',
  )

  // Leaving the desk returns to the office, next to the computer.
  await page.getByRole('button', { name: 'Leave desk' }).click()
  await expect(panel(page).getByRole('heading')).toHaveText('Your desk')

  // The office remembers where the player was.
  await goTo(page, 'Break room')
  await page.reload()
  await expect(panel(page).getByRole('heading')).toHaveText('Break room')
})

test('work done at the computer is reflected in the office', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam')
  await goTo(page, 'Your desk')
  await panel(page)
    .getByRole('button', { name: /Use your computer/ })
    .click()

  // Start the first task at the computer.
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await page.getByRole('button', { name: 'Start task' }).click()
  await expect(page.getByTestId('sheet-grid')).toBeVisible()
  await page.getByRole('button', { name: 'Leave desk' }).click()

  // Priya now asks how it is going; the whiteboard agrees.
  await goTo(page, 'Priya’s office')
  await panel(page).getByRole('button', { name: 'Talk to Priya' }).click()
  await expect(dialogue(page)).toContainText(
    'How is “Price the office supplies order” going?',
  )
  await dialogue(page).getByRole('button', { name: 'Continue the task' }).click()
  await expect(page.getByTestId('task-detail')).toBeVisible()
})

test('computers without 3D graphics get a simple floor plan', async ({ page }) => {
  // Pretend this computer cannot draw 3D (no WebGL).
  await page.addInitScript(`
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args)
    }
  `)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Robin')

  const plan = page.getByTestId('floor-plan')
  await expect(plan).toBeVisible()
  await expect(page.locator('[data-testid="office"] canvas')).toHaveCount(0)
  await plan.getByRole('button', { name: /Break room/ }).click()
  await expect(panel(page).getByRole('heading')).toHaveText('Break room')
  await panel(page).getByRole('button', { name: 'Chat with Tom' }).click()
  await expect(dialogue(page)).toBeVisible()
})
