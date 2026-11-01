import { expect, type Page } from '@playwright/test'

export function cell(page: Page, address: string) {
  return page.locator(`[data-address="${address}"]`)
}

/** Completes the first-day screen if it is shown. */
export async function startCareerIfNeeded(page: Page, name = 'Alex') {
  const onboarding = page.getByTestId('onboarding')
  const desktop = page.getByTestId('desktop')
  await expect(onboarding.or(desktop)).toBeVisible()
  if (await onboarding.isVisible()) {
    await page.getByLabel('Your first name').fill(name)
    await page.getByRole('button', { name: 'Start my first day' }).click()
    await expect(desktop).toBeVisible()
  }
}

/** If the player is walking around the office, goes to their desk and uses the computer. */
export async function sitAtComputer(page: Page) {
  if (await page.getByTestId('office').isVisible()) {
    await page
      .getByRole('navigation', { name: 'Places' })
      .getByRole('button', { name: 'Your desk' })
      .click()
    await page
      .getByTestId('office-panel')
      .getByRole('button', { name: /Use your computer/ })
      .click()
  }
  // Drawing the 3D office can be slow when several test browsers run at once.
  await expect(page.getByRole('navigation', { name: 'Apps' })).toBeVisible({
    timeout: 15_000,
  })
}

/** Opens a dock app such as "Mail" or "Sheets". */
export async function openApp(
  page: Page,
  name: 'Mail' | 'Tasks' | 'Sheets' | 'Docs' | 'Slides' | 'Career' | 'Portfolio',
) {
  await sitAtComputer(page)
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: new RegExp(`^${name}`) })
    .click()
}

/**
 * Opens the app and the Practice Workbook (starting a career first if needed),
 * and waits until the workbook is ready for editing. After a reload, the app
 * returns to the workbook by itself.
 */
export async function openWorkbook(page: Page, path = '/') {
  await page.goto(path)
  await startCareerIfNeeded(page)
  const grid = page.getByTestId('sheet-grid')
  if (!(await grid.isVisible())) {
    await openApp(page, 'Sheets')
    await page.getByRole('button', { name: /Practice Workbook/ }).click()
  }
  await expect(grid).toBeVisible()
}

/** Selects a cell, types a value and confirms it with Enter. `shown` is what the cell displays. */
export async function enterValue(
  page: Page,
  address: string,
  value: string,
  shown = value,
) {
  await cell(page, address).click()
  await page.keyboard.type(value)
  await page.keyboard.press('Enter')
  await expect(cell(page, address)).toHaveText(shown)
}

/**
 * Crashes the tab's renderer process, like a real tab crash or "End task".
 * No close events run, so nothing gets a last chance to save.
 */
export async function crashTab(page: Page) {
  await page.goto('chrome://crash').catch(() => {
    // Navigation fails because the tab crashed: that is the point.
  })
}

/** Waits until the save indicator reports that everything is saved. */
export async function waitUntilSaved(page: Page) {
  await expect(page.getByTestId('save-indicator')).toHaveAttribute(
    'data-state',
    'saved',
    {
      timeout: 10_000,
    },
  )
}

/**
 * After a passing submission: closes the results, opens the task in the
 * Portfolio app and shows its main file as handed in. Returns the viewer.
 */
export async function openMainFileInPortfolio(page: Page, title: string | RegExp) {
  await page
    .getByTestId('submission-results')
    .getByRole('button', { name: /^(Close|Back to )/ })
    .click()
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Portfolio/ })
    .click()
  await page.getByTestId('portfolio-card').filter({ hasText: title }).click()
  const itemPage = page.getByTestId('portfolio-item-page')
  await expect(itemPage.getByText('Completed (passed)')).toBeVisible()
  await itemPage.getByRole('button', { name: /^Main file:/ }).click()
  return itemPage.getByTestId('evidence-viewer')
}
