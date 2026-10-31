import { expect, type Page } from '@playwright/test'

export function cell(page: Page, address: string) {
  return page.locator(`[data-address="${address}"]`)
}

/** Opens the app and waits until the workbook is ready for editing. */
export async function openWorkbook(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.getByTestId('sheet-grid')).toBeVisible()
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
