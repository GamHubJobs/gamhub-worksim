import { expect, test } from '@playwright/test'
import { cell, enterValue, openWorkbook, waitUntilSaved } from './helpers.ts'

test('a second tab cannot edit while the first one is open', async ({
  context,
  page,
}) => {
  await openWorkbook(page)

  const second = await context.newPage()
  await second.goto('/')
  await expect(second.getByTestId('other-tab-screen')).toContainText('already open')
  await expect(second.getByTestId('sheet-grid')).toHaveCount(0)
})

test('"use here" moves WorkSim to the new tab without losing work', async ({
  context,
  page,
}) => {
  await openWorkbook(page)
  // Typed but not yet autosaved when the other tab takes over.
  await enterValue(page, 'A1', 'typed in tab one')

  const second = await context.newPage()
  await second.goto('/')
  await second.getByRole('button', { name: 'Use WorkSim in this tab' }).click()

  await expect(cell(second, 'A1')).toHaveText('typed in tab one')
  await expect(page.getByTestId('other-tab-screen')).toContainText(
    'now open in another tab',
  )
  // A normal hand-over is not mistaken for a crash.
  await expect(second.getByTestId('recovery-banner')).toHaveCount(0)

  // Editing continues in the new tab, and the first tab can take it back.
  await enterValue(second, 'A2', 'typed in tab two')
  await page.getByRole('button', { name: 'Use WorkSim in this tab' }).click()
  await expect(cell(page, 'A2')).toHaveText('typed in tab two')
  await expect(second.getByTestId('other-tab-screen')).toBeVisible()
})

test('a waiting tab takes over automatically when the first tab closes', async ({
  context,
  page,
}) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'saved before closing')
  await waitUntilSaved(page)

  const second = await context.newPage()
  await second.goto('/')
  await expect(second.getByTestId('other-tab-screen')).toBeVisible()

  await page.close()
  await expect(cell(second, 'A1')).toHaveText('saved before closing')
})
