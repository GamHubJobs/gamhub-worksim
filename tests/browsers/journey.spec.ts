import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

async function start(page: Page, career = /Office Administration/) {
  await page.goto('/')
  await page.getByRole('radio', { name: career }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
}

async function toComputer(page: Page) {
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Use your computer/ })
    .click()
  await expect(page.getByRole('navigation', { name: 'Apps' })).toBeVisible({
    timeout: 60_000,
  })
}

/** Opens an app in its own window, closing the others first (one app at a time). */
async function app(page: Page, name: string) {
  const close = page.locator(
    '[data-window] [data-testid="window-title-bar"] button[aria-label^="Close "]',
  )
  for (let n = await close.count(); n > 0; n = await close.count()) {
    await close.first().dispatchEvent('click')
    await expect(close).toHaveCount(n - 1)
  }
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: new RegExp(`^${name}`) })
    .click()
}

async function waitUntilSaved(page: Page) {
  await expect(page.getByTestId('save-indicator')).toHaveAttribute(
    'data-state',
    /saved|idle/,
    { timeout: 15_000 },
  )
}

test('the core journey: office, mail, Sheets, Docs, Slides, and saving across a reload', async ({
  page,
}) => {
  await start(page)
  // The office works with or without 3D (some test browsers have no WebGL).
  await expect(page.getByTestId('office-panel').getByRole('heading')).toHaveText(
    'Reception',
  )
  await toComputer(page)

  await app(page, 'Mail')
  await page.getByRole('button', { name: /Welcome to Cobalt Ridge/ }).click()
  await expect(page.getByTestId('mail-message')).toContainText('Welcome')

  // Sheets: a value and a formula.
  await app(page, 'Sheets')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  await page.locator('[data-address="A1"]').click()
  await page.keyboard.type('1250')
  await page.keyboard.press('Enter')
  await page.keyboard.type('=A1*2')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-address="A2"]')).toHaveText('2500', {
    timeout: 30_000,
  })
  await waitUntilSaved(page)

  // Docs: a heading and text.
  await app(page, 'Docs')
  await page.getByRole('button', { name: /Blank document/ }).click()
  await page.getByTestId('doc-body').locator('.ProseMirror').click()
  await page.keyboard.type('A report typed in this browser')
  await waitUntilSaved(page)

  // Slides: a presentation opens and its slides show.
  await app(page, 'Slides')
  await page.getByRole('button', { name: /Monthly business review/ }).click()
  await expect(page.getByTestId('slide-canvas')).toContainText('business review')

  // Everything is still there after a reload.
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Apps' })).toBeVisible({
    timeout: 60_000,
  })
  await app(page, 'Sheets')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  await expect(page.locator('[data-address="A2"]')).toHaveText('2500', {
    timeout: 30_000,
  })
})

test('backup and restore between two browser profiles, and switching career', async ({
  page,
  browser,
}) => {
  await start(page)
  await toComputer(page)
  await app(page, 'Sheets')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  await page.locator('[data-address="A1"]').click()
  await page.keyboard.type('kept in the backup')
  await page.keyboard.press('Enter')
  await waitUntilSaved(page)
  await page.getByRole('button', { name: /Storage & backup/ }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const text = await readFile(await (await download).path(), 'utf8')
  expect(text).toContain('gamhub-worksim-backup')
  await page.keyboard.press('Escape')

  // Switching career keeps the first one.
  await app(page, 'Career')
  await page
    .getByTestId('career-accounting')
    .getByRole('button', { name: 'Start this career' })
    .click()
  await expect(page.getByTestId('office-panel').getByRole('heading')).toHaveText(
    'Reception',
    { timeout: 60_000 },
  )

  // A fresh profile restores the backup.
  const fresh = await browser.newContext()
  const other = await fresh.newPage()
  await start(other)
  await toComputer(other)
  await other.getByRole('button', { name: /Storage & backup/ }).click()
  await other.getByTestId('backup-file-input').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  })
  const safety = other.waitForEvent('download')
  // The restore ends by reloading the page: wait for that, not just the download.
  const reloaded = other.waitForEvent('load', { timeout: 60_000 })
  await other.getByRole('button', { name: 'Replace my data with this backup' }).click()
  await safety
  await reloaded
  await expect(other.getByRole('navigation', { name: 'Apps' })).toBeVisible({
    timeout: 60_000,
  })
  await other
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Sheets/ })
    .click()
  await other.getByRole('button', { name: /Practice Workbook/ }).click()
  await expect(other.locator('[data-address="A1"]')).toHaveText('kept in the backup', {
    timeout: 30_000,
  })
  await fresh.close()
})

test('the offline app: the service worker installs and WorkSim starts offline', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'Playwright WebKit on Windows does not run service workers; Safari itself does.',
  )
  await start(page)
  await page.reload()
  await page.waitForFunction(
    'navigator.serviceWorker.ready.then((reg) => !!reg.active && !!navigator.serviceWorker.controller)',
    undefined,
    { timeout: 60_000 },
  )
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('offline-status')).toBeVisible()
  await context.setOffline(false)
})
