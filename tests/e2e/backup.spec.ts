import { copyFile, readFile, truncate, writeFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { cell, enterValue, openWorkbook, waitUntilSaved } from './helpers.ts'

async function openStoragePanel(page: Page) {
  await page.getByRole('button', { name: /Storage & backup/ }).click()
  await expect(page.getByTestId('storage-panel')).toBeVisible()
}

async function downloadBackup(page: Page): Promise<string> {
  await openStoragePanel(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^gamhub-worksim-backup-.*\.json$/)
  return file.path()
}

test('a backup restores all work on a fresh browser', async ({ page, browser }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'Quarterly report')
  await enterValue(page, 'B2', '4,500.00')
  await waitUntilSaved(page)
  const backupPath = await downloadBackup(page)
  await expect(page.getByTestId('last-backup')).toContainText('Last backup')

  // A completely separate browser profile: like a new computer or cleared data.
  const freshContext = await browser.newContext()
  const fresh = await freshContext.newPage()
  await openWorkbook(fresh)
  await expect(cell(fresh, 'A1')).toHaveText('')

  await openStoragePanel(fresh)
  await fresh.getByTestId('backup-file-input').setInputFiles(backupPath)
  const preview = fresh.getByTestId('backup-preview')
  await expect(preview).toContainText('Practice Workbook')

  // A safety backup of the current (empty) data is downloaded first.
  const safetyDownload = fresh.waitForEvent('download')
  await fresh.getByRole('button', { name: 'Replace my data with this backup' }).click()
  expect((await safetyDownload).suggestedFilename()).toMatch(/before-restore/)

  await expect(cell(fresh, 'A1')).toHaveText('Quarterly report')
  await expect(cell(fresh, 'B2')).toHaveText('4,500.00')

  // The restored work keeps saving normally.
  await enterValue(fresh, 'C3', 'after restore')
  await waitUntilSaved(fresh)
  await fresh.reload()
  await expect(cell(fresh, 'C3')).toHaveText('after restore')
  await freshContext.close()
})

test('a file that is not a backup is rejected without changing anything', async ({
  page,
}) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'precious')
  await waitUntilSaved(page)

  await openStoragePanel(page)
  await page.getByTestId('backup-file-input').setInputFiles({
    name: 'holiday-photos.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"photos": []}'),
  })
  await expect(page.getByRole('alert')).toContainText('not a GamHub WorkSim backup')
  await expect(page.getByTestId('backup-preview')).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(cell(page, 'A1')).toHaveText('precious')
})

test('a damaged backup is rejected', async ({ page }) => {
  await openWorkbook(page)
  await enterValue(page, 'A1', 'original')
  await waitUntilSaved(page)
  const backupPath = await downloadBackup(page)
  const tampered = (await readFile(backupPath, 'utf8')).replace('original', 'tampered')

  await page.getByTestId('backup-file-input').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(tampered),
  })
  await expect(page.getByRole('alert')).toContainText('damaged')
})

test('the storage panel explains how work is stored', async ({ page }) => {
  await openWorkbook(page)
  await openStoragePanel(page)
  const panel = page.getByTestId('storage-panel')
  await expect(panel).toContainText('saves your work automatically in this browser')
  await expect(panel).toContainText('Keep a backup')
  await expect(panel).toContainText('not downloaded a backup')
})

test('a restore keeps a safety copy on this device, and putting it back undoes the restore', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000)
  // A backup made elsewhere: a workbook saying "from the backup".
  const otherContext = await browser.newContext()
  const other = await otherContext.newPage()
  await openWorkbook(other)
  await enterValue(other, 'A1', 'from the backup')
  await waitUntilSaved(other)
  // Kept outside the other browser, which deletes its downloads when it closes.
  const backupPath = test.info().outputPath('other-backup.json')
  await copyFile(await downloadBackup(other), backupPath)
  await otherContext.close()

  // This device has its own work.
  await openWorkbook(page)
  await enterValue(page, 'A1', 'my own work')
  await waitUntilSaved(page)
  await openStoragePanel(page)
  await expect(page.getByTestId('safety-copies')).toContainText('no safety copies yet')
  await page.getByTestId('backup-file-input').setInputFiles(backupPath)
  const safetyDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Replace my data with this backup' }).click()
  await safetyDownload
  await expect(cell(page, 'A1')).toHaveText('from the backup')

  // Undo: the safety copy puts this device's own work back.
  await openStoragePanel(page)
  const copies = page.getByTestId('safety-copies')
  await expect(copies).toContainText('Before restoring a backup')
  await copies.getByRole('button', { name: 'Put back…' }).first().click()
  await copies.getByRole('button', { name: 'Put it back' }).click()
  await expect(cell(page, 'A1')).toHaveText('my own work')
})

test('a file far too large to be a backup is refused before it is read', async ({
  page,
}) => {
  await openWorkbook(page)
  await openStoragePanel(page)
  // 251 MB on disk (created instantly, without writing the contents).
  const huge = test.info().outputPath('huge.json')
  await writeFile(huge, '')
  await truncate(huge, 251 * 1024 * 1024)
  await page.getByTestId('backup-file-input').setInputFiles(huge)
  await expect(page.getByRole('alert')).toContainText(
    'too large to be a GamHub WorkSim backup',
  )
})

test('damaged saved data: a plain explanation, nothing changed, and a way to restore', async ({
  page,
}) => {
  await openWorkbook(page)
  // Damage the career save directly in the browser's storage.
  await page.evaluate(`new Promise((resolve, reject) => {
    const open = indexedDB.open('gamhub-worksim')
    open.onsuccess = () => {
      const store = open.result.transaction('profiles', 'readwrite').objectStore('profiles')
      const all = store.getAll()
      all.onsuccess = () => {
        const profile = all.result[0]
        profile.xp = 'lots'
        store.put(profile).onsuccess = () => resolve(true)
      }
      all.onerror = reject
    }
  })`)
  await page.reload()
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'could not open your saved data' })
  await expect(alert).toContainText('Part of your saved data is damaged')
  await expect(alert).toContainText('stopped before changing anything')
  await alert.getByRole('button', { name: 'Storage & backup' }).click()
  await expect(page.getByTestId('storage-panel')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restore from backup…' })).toBeVisible()
})
