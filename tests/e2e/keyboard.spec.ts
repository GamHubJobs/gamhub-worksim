import { expect, test, type Locator, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

/** Presses Tab until the control has focus, as a keyboard user would. */
async function tabTo(page: Page, target: Locator, limit = 80) {
  for (let i = 0; i < limit; i++) {
    if (
      await target
        .evaluate((el) => el === el.ownerDocument.activeElement)
        .catch(() => false)
    )
      return
    await page.keyboard.press('Tab')
  }
  throw new Error('Could not reach the control with the Tab key')
}

test('a working session with the keyboard only: start, the office, a conversation, mail and a case', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.goto('/')

  // Start a career.
  await tabTo(page, page.getByLabel('Your first name'))
  await page.keyboard.type('Alex')
  await tabTo(page, page.getByRole('radio').first())
  await page.keyboard.press('Space')
  await tabTo(page, page.getByRole('button', { name: 'Start my first day' }))
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('office')).toBeVisible()

  // The focus ring is clearly visible.
  const talk = page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Talk to Nina/ })
  await tabTo(page, talk)
  expect(
    await talk.evaluate(
      (el) => el.ownerDocument.defaultView!.getComputedStyle(el).outlineWidth,
    ),
  ).toBe('3px')

  // A conversation: focus moves into it, and Escape returns to the button.
  await page.keyboard.press('Enter')
  const dialogue = page.getByTestId('office-dialogue')
  await expect(dialogue).toBeFocused()
  await expect(dialogue).toContainText('welcome to Cobalt Ridge')
  await page.keyboard.press('Escape')
  await expect(dialogue).toHaveCount(0)
  await expect(talk).toBeFocused()

  // Walk to the desk and use the computer, without the 3D view.
  await tabTo(
    page,
    page
      .getByRole('navigation', { name: 'Places' })
      .getByRole('button', { name: 'Your desk' }),
  )
  await page.keyboard.press('Enter')
  await tabTo(page, page.getByRole('button', { name: /Use your computer/ }))
  await page.keyboard.press('Enter')

  // Read the first email: the computer opens with Mail in front.
  const apps = page.getByRole('navigation', { name: 'Apps' })
  await expect(page.getByTestId('window-mail')).toHaveAttribute('data-active', 'true')
  await tabTo(page, page.getByRole('button', { name: /Welcome to Cobalt Ridge/ }))
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('mail-message')).toContainText('Welcome')

  // A case, worked and submitted from the keyboard.
  await page.evaluate("window.__worksim.arriveCase('fa-short-delivery')")
  await tabTo(page, apps.getByRole('button', { name: /^Cases/ }))
  await page.keyboard.press('Enter')
  await tabTo(
    page,
    page
      .getByRole('list', { name: 'Cases' })
      .getByRole('button', { name: /unpaid invoice/ }),
  )
  await page.keyboard.press('Enter')
  const detail = page.getByTestId('case-detail')
  await tabTo(page, detail.getByLabel(/charges for 6 toner cartridges/))
  await page.keyboard.press('Space')
  await tabTo(page, detail.getByLabel(/5 days past its 30-day terms/))
  await page.keyboard.press('Space')
  await tabTo(page, detail.getByTestId('step-owed').getByRole('textbox'))
  await page.keyboard.type('552')
  await tabTo(page, detail.getByLabel(/Pay £552 today/))
  await page.keyboard.press('Space')
  await tabTo(page, detail.getByRole('textbox', { name: /Reply to Karen Holt/ }))
  await page.keyboard.type(
    'Dear Karen, thank you. We checked invoice MOS-2291 against the purchase order and your delivery note: only 4 of the 6 toner cartridges were delivered. We are paying £552 today for what was delivered. Please send the two missing cartridges or a credit note. Kind regards, Alex',
  )
  await tabTo(page, detail.getByRole('button', { name: /^Submit to / }))
  await page.keyboard.press('Enter')
  await tabTo(page, detail.getByRole('button', { name: 'Send my answer' }))
  await page.keyboard.press('Enter')
  await expect(detail.getByTestId('case-score')).toHaveText('100%')
})

test('players who ask for less motion get no animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const start = page.getByRole('button', { name: 'Start my first day' })
  await expect(start).toBeVisible()
  const duration = await start.evaluate(
    (el) => el.ownerDocument.defaultView!.getComputedStyle(el).transitionDuration,
  )
  expect(parseFloat(duration)).toBeLessThan(0.001)
  await page.getByLabel('Your first name').fill('Alex')
  await start.click()
  // The office still works fully (the 3D view simply stays still).
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await expect(page.getByTestId('office-panel').getByRole('heading')).toHaveText(
    'Your desk',
  )
})

test('the spreadsheet and slide editors with the keyboard: cells are announced, slide elements can be selected and moved', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()

  // Sheets: moving with the arrow keys announces each cell.
  await openApp(page, 'Sheets')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  const grid = page.getByRole('grid')
  await grid.focus()
  await page.keyboard.type('1250')
  await page.keyboard.press('Enter')
  await page.keyboard.type('=A1*2')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowUp')
  await expect(page.getByTestId('cell-announcer')).toHaveText('A2: 2500, formula =A1*2')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('cell-announcer')).toHaveText('B2: empty')

  // Slides: Tab selects an element; the arrow keys move it; Enter edits it.
  await openApp(page, 'Slides')
  await page.getByRole('button', { name: /Monthly business review/ }).click()
  const canvas = page.getByTestId('slide-canvas')
  const title = canvas.getByRole('button', { name: /^Text: \[Month\] business review/ })
  await tabTo(page, title)
  await expect(title).toHaveAttribute('aria-pressed', 'true')
  const left = await title.evaluate(
    (el) => (el as unknown as { style: { left: string } }).style.left,
  )
  await page.keyboard.press('Shift+ArrowRight')
  await expect
    .poll(() =>
      title.evaluate((el) => (el as unknown as { style: { left: string } }).style.left),
    )
    .not.toBe(left)
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Slide text')).toBeFocused()
  await page.keyboard.press('Escape')
})

test('first steps: the start screen says what WorkSim is, and Help answers questions from the keyboard', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByText('Before you start').click()
  await expect(
    page.getByText('it does not give certificates or qualifications'),
  ).toBeVisible()
  await expect(page.getByText(/on this device only/)).toBeVisible()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible()

  const help = page.getByRole('button', { name: 'Help', exact: true })
  await tabTo(page, help)
  await page.keyboard.press('Enter')
  const panel = page.getByTestId('help-panel')
  await expect(panel).toBeFocused()
  await expect(panel).toContainText('What WorkSim is (and is not)')
  await tabTo(page, panel.getByRole('button', { name: 'Saving, backups and recovery' }))
  await page.keyboard.press('Enter')
  await expect(panel).toContainText('safety copy')
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(help).toBeFocused()
})
