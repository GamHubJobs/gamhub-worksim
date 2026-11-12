import { readFile } from 'node:fs/promises'
import { expect, test, type Frame, type Page } from '@playwright/test'

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

interface GridCraftApi {
  execute: (command: string, params: object) => Promise<unknown>
  request: (method: string, params: object) => Promise<{ values: unknown[][] }>
}

/** Grid Craft (the office spreadsheet) in the window, once the workbook is open in it. */
async function gridCraft(page: Page): Promise<Frame> {
  await expect(page.getByTestId('gridcraft-editor')).toHaveAttribute(
    'data-phase',
    'ready',
    {
      timeout: 180_000,
    },
  )
  return page.frame({ url: /crafts\/gridcraft\/index\.html/ })!
}

/** Types into a cell of Grid Craft with the keyboard, as a player does. */
async function typeIn(page: Page, frame: Frame, address: string, ...entries: string[]) {
  // Into the app (its status bar, away from the cells), then to the cell.
  const box = (await page.getByTestId('craft-gridcraft').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 8)
  await frame.evaluate(
    (range) =>
      (globalThis as unknown as { gridcraft: GridCraftApi }).gridcraft.execute(
        'selection.set',
        { range },
      ),
    address,
  )
  const ui = () =>
    frame.evaluate(() =>
      (globalThis as unknown as { gridcraft: GridCraftApi }).gridcraft
        .request('ui.inspect', {})
        .then((ui) => ui as unknown as { mode: string; editor: { text: string } | null }),
    )
  // Playwright's WebKit on Windows draws the app about once a second here, and
  // its keys reach the canvas unreliably (some are lost at any typing speed).
  // There the entries go in through the app's command API instead; real Safari
  // is not tested (docs/CRAFT_APPS.md).
  if (test.info().project.name === 'webkit') {
    const [column, row] = [address.replace(/\d+/, ''), Number(address.replace(/\D+/, ''))]
    for (const [i, entry] of entries.entries())
      await frame.evaluate(
        ([cell, input]) =>
          (globalThis as unknown as { gridcraft: GridCraftApi }).gridcraft.execute(
            'cell.set',
            {
              cell,
              input,
            },
          ),
        [`${column}${row + i}`, entry] as const,
      )
    return
  }
  for (const entry of entries) {
    // Open the cell for typing (F2) and wait until it is open: in a test browser
    // without a graphics card the app draws about once a second, and keys sent
    // while it switches to typing can be lost.
    await page.keyboard.press('F2')
    await expect
      .poll(async () => (await ui()).editor !== null, { timeout: 30_000 })
      .toBe(true)
    // At a person's pace, then Enter once the app has every key.
    await page.keyboard.type(entry, { delay: 80 })
    await expect
      .poll(async () => (await ui()).editor?.text, { timeout: 30_000 })
      .toBe(entry)
    await page.keyboard.press('Enter')
    // The entry is in once the app is back to Ready (not editing).
    await expect.poll(async () => (await ui()).mode, { timeout: 30_000 }).toBe('Ready')
  }
}

const valueOf = async (frame: Frame, range: string) =>
  (
    await frame.evaluate(
      (range) =>
        (globalThis as unknown as { gridcraft: GridCraftApi }).gridcraft.request(
          'sheet.read',
          { range },
        ),
      range,
    )
  ).values[0][0]

async function waitUntilSaved(page: Page) {
  await expect(page.getByTestId('save-indicator')).toHaveAttribute(
    'data-state',
    /saved|idle/,
    { timeout: 15_000 },
  )
}

test('the core journey: office, mail, Grid Craft, Word Craft, Slides, and saving across a reload', async ({
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

  // Grid Craft: a value and a formula, typed.
  await app(page, 'Grid Craft')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  let frame = await gridCraft(page)
  await typeIn(page, frame, 'A1', '1250', '=A1*2')
  await expect.poll(() => valueOf(frame, 'A1'), { timeout: 30_000 }).toBe(1250)
  await expect.poll(() => valueOf(frame, 'A2'), { timeout: 30_000 }).toBe(2500)
  await waitUntilSaved(page)

  // Word Craft: text typed into the document.
  await app(page, 'Word Craft')
  await page.getByRole('button', { name: /Blank document/ }).click()
  await expect(page.getByTestId('wordcraft-editor')).toHaveAttribute(
    'data-phase',
    'ready',
    {
      timeout: 180_000,
    },
  )
  const word = page.frame({ url: /crafts\/wordcraft\/index\.html/ })!
  const wordApi = (command: string, params: object) =>
    word.evaluate(
      ([command, params]) =>
        (globalThis as unknown as { wordcraft: GridCraftApi }).wordcraft.request(
          command,
          params,
        ),
      [command, params] as const,
    )
  const typed = 'A report typed in this browser'
  if (test.info().project.name === 'webkit') {
    // As for Grid Craft: keys reach the canvas unreliably in Playwright's WebKit here.
    await wordApi('engine.execute', { command: 'text.insert', params: { text: typed } })
  } else {
    // Into the page (the middle of the app), then typed at a person's pace.
    const box = (await page.getByTestId('craft-wordcraft').boundingBox())!
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.keyboard.type(typed, { delay: 80 })
  }
  await expect
    .poll(
      async () =>
        JSON.stringify(
          (
            (await wordApi('document.inspect', { text: true })) as unknown as {
              blocks: unknown
            }
          ).blocks,
        ),
      { timeout: 60_000 },
    )
    .toContain(typed)
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
  await app(page, 'Grid Craft')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  frame = await gridCraft(page)
  expect(await valueOf(frame, 'A2')).toBe(2500)
})

test('backup and restore between two browser profiles, and switching career', async ({
  page,
  browser,
}) => {
  // Two profiles, each drawing Grid Craft without a graphics card (WebKit is the slowest).
  test.setTimeout(360_000)
  await start(page)
  await toComputer(page)
  await app(page, 'Grid Craft')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  await typeIn(page, await gridCraft(page), 'A1', 'kept in the backup')
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
    .getByRole('button', { name: /^Grid Craft/ })
    .click()
  await other.getByRole('button', { name: /Practice Workbook/ }).click()
  expect(await valueOf(await gridCraft(other), 'A1')).toBe('kept in the backup')
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
