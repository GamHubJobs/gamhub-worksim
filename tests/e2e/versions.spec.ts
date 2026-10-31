import { expect, test } from '@playwright/test'
import { cell, enterValue, openWorkbook, waitUntilSaved } from './helpers.ts'

test('restore an older version, then undo the restore', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'first draft')
  await waitUntilSaved(page)

  await page.getByRole('button', { name: 'Version history' }).click()
  await page.getByRole('button', { name: /Keep a copy of the current version/ }).click()
  const history = page.getByTestId('version-history')
  await expect(history.getByText('Saved by you')).toBeVisible()

  await enterValue(page, 'A1', 'second draft')
  await waitUntilSaved(page)

  // Preview the kept version: read-only, shows the old value.
  await history.getByText('Saved by you').click()
  await expect(page.getByTestId('preview-bar')).toBeVisible()
  await expect(cell(page, 'A1')).toHaveText('first draft')

  // Restore it.
  await page.getByRole('button', { name: 'Restore this version' }).click()
  await expect(page.getByTestId('preview-bar')).toHaveCount(0)
  await expect(cell(page, 'A1')).toHaveText('first draft')

  // Undo: restore the safety copy made just before.
  await history.getByText('Before a restore').click()
  await page.getByRole('button', { name: 'Restore this version' }).click()
  await expect(cell(page, 'A1')).toHaveText('second draft')

  // Survives a reload.
  await page.reload()
  await expect(cell(page, 'A1')).toHaveText('second draft')
})

test('previewing a version does not change the workbook', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'old')
  await waitUntilSaved(page)
  await page.getByRole('button', { name: 'Version history' }).click()
  await page.getByRole('button', { name: /Keep a copy/ }).click()
  await enterValue(page, 'A1', 'new')
  await waitUntilSaved(page)

  await page.getByTestId('version-history').getByText('Saved by you').click()
  await expect(cell(page, 'A1')).toHaveText('old')
  await page.getByRole('button', { name: 'Back to current' }).click()
  await expect(cell(page, 'A1')).toHaveText('new')
})

test('automatic versions are taken while working', async ({ page }) => {
  // Shortened interval (development builds only) so the test is quick.
  await openWorkbook(page, '/?versionIntervalSeconds=1')
  await enterValue(page, 'A1', 'one')
  await waitUntilSaved(page)
  await page.waitForTimeout(1100)
  await enterValue(page, 'A1', 'two')
  await waitUntilSaved(page)

  await page.getByRole('button', { name: 'Version history' }).click()
  await expect(page.getByTestId('version-item')).toHaveCount(2)
  await expect(
    page.getByTestId('version-history').getByText('Automatic').first(),
  ).toBeVisible()
})
