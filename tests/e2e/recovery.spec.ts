import { expect, test } from '@playwright/test'
import { cell, crashTab, enterValue, openWorkbook, waitUntilSaved } from './helpers.ts'

test('changes made just before a tab crash are recovered', async ({ context, page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'saved earlier')
  await waitUntilSaved(page)

  // Type and crash immediately, before autosave's one-second wait is over.
  await enterValue(page, 'A2', 'typed right before the crash')
  await crashTab(page)

  const reopened = await context.newPage()
  await openWorkbook(reopened)
  await expect(cell(reopened, 'A1')).toHaveText('saved earlier')
  await expect(cell(reopened, 'A2')).toHaveText('typed right before the crash')
  await expect(reopened.getByTestId('recovery-banner')).toContainText(
    'recovered your unsaved changes',
  )
  // The recovered change is then saved properly.
  await waitUntilSaved(reopened)
})

test('a crash without unsaved work shows a reassuring message', async ({
  context,
  page,
}) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'all saved')
  await waitUntilSaved(page)
  await crashTab(page)

  const reopened = await context.newPage()
  await openWorkbook(reopened)
  await expect(cell(reopened, 'A1')).toHaveText('all saved')
  await expect(reopened.getByTestId('recovery-banner')).toContainText('nothing was lost')
})

test('text still being typed is kept when the page is closed', async ({ page }) => {
  await openWorkbook(page)
  await cell(page, 'B2').click()
  await page.keyboard.type('not confirmed with Enter')
  await page.reload()

  await expect(cell(page, 'B2')).toHaveText('not confirmed with Enter')
})

test('a normal reload shows no recovery message', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'normal')
  await waitUntilSaved(page)
  await page.reload()

  await expect(cell(page, 'A1')).toHaveText('normal')
  await expect(page.getByTestId('recovery-banner')).toHaveCount(0)
})
