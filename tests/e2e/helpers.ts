import { expect, type Page } from '@playwright/test'

export function cell(page: Page, address: string) {
  return page.locator(`[data-address="${address}"]`)
}

/** Completes the first-day screen if it is shown. */
export async function startCareerIfNeeded(page: Page, name = 'Alex') {
  const onboarding = page.getByTestId('onboarding')
  const desktop = page.getByTestId('desktop')
  await expect(onboarding.or(desktop)).toBeVisible({ timeout: 20_000 })
  if (await onboarding.isVisible()) {
    await page.getByLabel('Your first name').fill(name)
    await page.getByRole('button', { name: 'Start my first day' }).click()
    await expect(desktop).toBeVisible({ timeout: 20_000 })
  }
  // Activities played in 3D (walking over, doing them) go faster in tests
  // (development builds only; the built app ignores this).
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
}

/** If the player is walking around the office, goes to their desk and uses the computer. */
export async function sitAtComputer(page: Page) {
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
  // The desktop loads after the start screen: wait until the office or the
  // computer is showing before deciding which one it is.
  const office = page.getByTestId('office')
  await expect(
    office.or(page.getByRole('navigation', { name: 'Apps' })).first(),
  ).toBeVisible({
    timeout: 30_000,
  })
  if (await office.isVisible()) {
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

/**
 * Closes every window on the work computer (minimised ones too), as the
 * player would with each window's close button.
 */
export async function closeAllWindows(page: Page) {
  const close = page.locator(
    '[data-window] [data-testid="window-title-bar"] button[aria-label^="Close "]',
  )
  for (let n = await close.count(); n > 0; n = await close.count()) {
    // A minimised window's button is hidden, but it can still be pressed.
    await close.first().dispatchEvent('click')
    await expect(close).toHaveCount(n - 1)
  }
}

/**
 * Opens a taskbar app such as "Mail" or "Sheets", in a window of its own:
 * other windows are closed first, so each test sees one app at a time.
 */
export async function openApp(
  page: Page,
  name:
    | 'Mail'
    | 'Tasks'
    | 'Grid Craft'
    | 'Docs'
    | 'Slides'
    | 'Career'
    | 'Readiness'
    | 'Portfolio'
    | 'Cases'
    | 'WorkSim AI',
) {
  await sitAtComputer(page)
  await closeAllWindows(page)
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
  // Wait until the app has loaded far enough to tell where the player is.
  await expect(
    grid
      .or(page.getByTestId('office'))
      .or(page.getByRole('navigation', { name: 'Apps' }))
      .first(),
  ).toBeVisible({ timeout: 30_000 })
  if (!(await grid.isVisible())) {
    await openApp(page, 'Grid Craft')
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

/**
 * Brings an app's window to the front (opening it if needed), without
 * closing other windows. Its taskbar button would minimise it if it were
 * already in front, so it is only pressed when it is not.
 */
export async function showApp(page: Page, name: string) {
  const button = page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: new RegExp(`^${name}`) })
  if ((await button.getAttribute('aria-current')) !== 'page') await button.click()
  await expect(button).toHaveAttribute('aria-current', 'page')
}

/** The window in front on the work computer (several apps can be open at once). */
export function activeWindow(page: Page) {
  return page.locator('[data-window][data-active="true"]')
}

/** Waits until the save indicator (in the window in front) reports that everything is saved. */
export async function waitUntilSaved(page: Page) {
  await expect(activeWindow(page).getByTestId('save-indicator')).toHaveAttribute(
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
  await closeAllWindows(page)
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
