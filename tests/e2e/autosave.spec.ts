import { expect, test } from '@playwright/test'
import { cell, enterValue, openWorkbook, waitUntilSaved } from './helpers.ts'

test('typed values are saved automatically and survive a reload', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'Item')
  await enterValue(page, 'B1', 'Cost')
  await enterValue(page, 'B2', '120.50')
  await waitUntilSaved(page)

  await page.reload()
  await expect(cell(page, 'A1')).toHaveText('Item')
  await expect(cell(page, 'B1')).toHaveText('Cost')
  await expect(cell(page, 'B2')).toHaveText('120.50')
})

test('clearing a cell is saved too', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'C3', 'temporary')
  await waitUntilSaved(page)

  await cell(page, 'C3').click()
  await page.keyboard.press('Delete')
  await expect(cell(page, 'C3')).toHaveText('')
  await waitUntilSaved(page)

  await page.reload()
  await expect(cell(page, 'C3')).toHaveText('')
})

test('keyboard editing: Escape cancels, Tab moves right', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'keep me')

  await cell(page, 'A1').click()
  await page.keyboard.type('discard me')
  await page.keyboard.press('Escape')
  await expect(cell(page, 'A1')).toHaveText('keep me')

  await page.keyboard.type('next')
  await page.keyboard.press('Tab')
  await expect(page.getByTestId('selected-address')).toHaveText('B1')
})

test('clicking another cell while editing saves the edited cell', async ({ page }) => {
  await openWorkbook(page)
  await cell(page, 'A1').click()
  await page.keyboard.type('typed in A1')
  await cell(page, 'D4').click()

  await expect(cell(page, 'A1')).toHaveText('typed in A1')
  await expect(cell(page, 'D4')).toHaveText('')
  await expect(page.getByTestId('selected-address')).toHaveText('D4')
})
