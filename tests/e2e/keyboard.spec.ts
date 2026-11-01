import { expect, test, type Locator, type Page } from '@playwright/test'

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

  // Read the first email.
  const apps = page.getByRole('navigation', { name: 'Apps' })
  await tabTo(page, apps.getByRole('button', { name: /^Mail/ }))
  await page.keyboard.press('Enter')
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
