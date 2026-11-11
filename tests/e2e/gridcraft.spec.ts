import { expect, test, type Frame, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { openApp, sitAtComputer, waitUntilSaved } from './helpers.ts'

// Grid Craft, the office's spreadsheet app (docs/CRAFT_APPS.md): the real app
// in the workbook window. Its interface is drawn on a canvas, so the work is
// done here through its own command API, as an agent would. In this test
// browser (no graphics card) each command takes about a second.

test.beforeEach(async ({ page }) => {
  // The development build uses the basic editor under test; these tests use Grid Craft.
  await page.addInitScript(() => sessionStorage.setItem('worksim.crafts', 'on'))
})

/** Grid Craft in the window in front, once the workbook is open in it. */
async function gridCraft(page: Page): Promise<Frame> {
  await expect(page.getByTestId('gridcraft-editor')).toHaveAttribute(
    'data-phase',
    'ready',
    {
      timeout: 120_000,
    },
  )
  const frame = page.frame({ url: /crafts\/gridcraft\/index\.html/ })
  expect(frame).not.toBeNull()
  return frame!
}

interface PageApi {
  execute: (command: string, params: object) => Promise<unknown>
  request: (method: string, params: object) => Promise<{ values: unknown[][] }>
  docInspect: () => Promise<{ sheets: Array<{ name: string }> }>
}

/** Runs one of Grid Craft's commands. */
const run = (frame: Frame, command: string, params: object = {}) =>
  frame.evaluate(
    ([command, params]) =>
      (globalThis as unknown as { gridcraft: PageApi }).gridcraft.execute(
        command,
        params,
      ),
    [command, params] as const,
  )

/** The values (or formulas) of a range, on the active sheet or the one named. */
const read = (frame: Frame, range: string, formulas = false, sheet?: string) =>
  frame.evaluate(
    (params) =>
      (globalThis as unknown as { gridcraft: PageApi }).gridcraft.request(
        'sheet.read',
        params,
      ),
    { range, formulas, ...(sheet ? { sheet } : {}) },
  )

const inspect = (frame: Frame) =>
  frame.evaluate(() =>
    (globalThis as unknown as { gridcraft: PageApi }).gridcraft.docInspect(),
  )

async function submit(page: Page) {
  await page.getByRole('button', { name: /Submit( again)? to Priya/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Submit', exact: true })
    .click()
  await expect(page.getByTestId('submission-results')).toBeVisible({ timeout: 60_000 })
}

test('the first task in Grid Craft: the starting workbook, the work, full marks', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Alex Morgan')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await sitAtComputer(page)
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open task' })
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()

  // The task's workbook, built in Grid Craft: Tom's data, its formatting, both sheets.
  const frame = await gridCraft(page)
  await expect(page.getByTestId('workbook-title')).toBeVisible()
  expect((await read(frame, 'A1:E2')).values).toEqual([
    ['Item', 'Category', 'Quantity', 'Unit price', 'Line total'],
    ['Printer paper A4, box of 5 reams', 'Paper', 6, 24.99, null],
  ])
  await waitUntilSaved(page)
  await page.screenshot({ path: 'docs/screenshots/crafts/gridcraft-task.png' })

  // Nothing done yet: the same feedback as ever.
  await submit(page)
  const results = page.getByTestId('submission-results')
  await expect(results).toContainText('Not there yet')
  await expect(results.getByTestId('check-results')).toContainText('E2 is empty.')
  await results.getByRole('button', { name: 'Back to my workbook' }).click()

  // The work, in Grid Craft: line totals, the order total, money as currency.
  await run(frame, 'range.setValues', {
    range: 'E2',
    values: Array.from({ length: 10 }, (_, i) => [`=C${i + 2}*D${i + 2}`]),
  })
  await run(frame, 'cell.set', { cell: 'E13', input: '=SUM(E2:E11)' })
  await run(frame, 'home.numberFormat', { range: 'D2:E11,E13', format: 'Currency' })
  expect((await read(frame, 'E13')).values).toEqual([[638.54]])
  // Submitting saves Grid Craft's latest work first (saving by itself is tested below).
  await waitUntilSaved(page)

  await submit(page)
  await expect(results.getByTestId('score')).toHaveText('100%')
  await expect(results.getByTestId('rewards')).toContainText('+100 XP')
  await page.screenshot({ path: 'docs/screenshots/crafts/gridcraft-graded.png' })
  await results.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByTestId('xp')).toHaveText('100 XP')
})

test('the practice workbook: work done in Grid Craft is there after a reload, as an .xlsx', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Grid Craft')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  let frame = await gridCraft(page)

  await run(frame, 'range.setValues', {
    range: 'A1',
    values: [
      ['Item', 'Cost'],
      ['Rent', 1200.5],
      ['Power', 150],
      ['Total', '=SUM(B2:B3)'],
    ],
  })
  await run(frame, 'home.bold', { range: 'A1:B1', on: true })
  await run(frame, 'home.numberFormat', { range: 'B2:B4', format: 'Currency' })
  await run(frame, 'home.insertSheet', { name: 'Notes' })
  // Not saved until Grid Craft's change is kept (it reports changes as it draws).
  await expect(page.getByTestId('save-indicator').first()).toHaveAttribute(
    'data-state',
    'pending',
    {
      timeout: 30_000,
    },
  )
  await waitUntilSaved(page)

  // A download of the real file.
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download .xlsx' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/)

  // After a reload the workbook opens again, as it was (from the kept file).
  await page.reload()
  frame = await gridCraft(page)
  expect((await read(frame, 'A1:B4', true, 'Sheet1')).values).toEqual([
    ['Item', 'Cost'],
    ['Rent', 1200.5],
    ['Power', 150],
    ['Total', '=SUM(B2:B3)'],
  ])
  const sheets = await inspect(frame)
  expect(sheets.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Notes'])
  await page.screenshot({ path: 'docs/screenshots/crafts/gridcraft-practice.png' })
})

test('without Grid Craft (not installed, or it cannot start), the basic editor opens the same workbook', async ({
  page,
}) => {
  await page.route('**/crafts/gridcraft/craft.json', (route) =>
    route.fulfill({ status: 404 }),
  )
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Grid Craft')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  await expect(page.locator('[data-address="A1"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('gridcraft-editor')).toHaveCount(0)
})

test('the round trip, live: everything WorkSim keeps is built in Grid Craft and read back the same', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.goto('/crafts/gridcraft/index.html?host=parent')
  await page.waitForFunction(
    () => !!(globalThis as unknown as { gridcraft?: PageApi }).gridcraft?.execute,
    null,
    { timeout: 120_000 },
  )
  // In the page: WorkSim's converter (from the development server) and the real app.
  const result = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path)
    const { workbookCommands, readWorkbook } = await load(
      '/src/apps/sheets/gridcraft/convert.ts',
    )
    const { EVERYTHING } = await load('/src/apps/sheets/gridcraft/fixtures/everything.ts')
    const api = (globalThis as unknown as { gridcraft: PageApi }).gridcraft
    const commands = workbookCommands(EVERYTHING) as Array<[string, object]>
    const replies = await Promise.all(
      commands.map(([command, params]) =>
        api.execute(command, params).then(
          () => null,
          (error: unknown) => `${command}: ${String(error)}`,
        ),
      ),
    )
    const saved = (await api.execute('file.saveBytes', { format: 'json' })) as {
      base64: string
    }
    const text = new TextDecoder().decode(
      Uint8Array.from(atob(saved.base64), (c) => c.charCodeAt(0)),
    )
    const book = JSON.parse(text)
    return {
      failed: replies.filter((r) => r !== null),
      book,
      expected: EVERYTHING,
      back: readWorkbook(book, EVERYTHING),
    }
  })
  expect(result.failed).toEqual([])
  // `npm run crafts:fixture` keeps this as the unit tests' fixture (after updating Grid Craft).
  if (process.env.WRITE_CRAFT_FIXTURE)
    writeFileSync(
      'src/apps/sheets/gridcraft/fixtures/everything.gridcraft.json',
      JSON.stringify(result.book, null, 1),
    )
  type Sheet = {
    name: string
    cells: Record<string, { input: string; format?: object }>
    columnWidths?: object
    charts?: object[]
  }
  const sorted = (o?: object) => JSON.stringify(Object.entries(o ?? {}).sort())
  for (const sheet of result.expected.sheets as Sheet[]) {
    const read = (result.back.sheets as Sheet[]).find((s) => s.name === sheet.name)!
    for (const [address, cell] of Object.entries(sheet.cells)) {
      expect(read.cells[address]?.input, `${sheet.name}!${address}`).toBe(cell.input)
      expect(sorted(read.cells[address]?.format), `${sheet.name}!${address}`).toBe(
        sorted(cell.format),
      )
    }
    expect(read.columnWidths).toEqual(sheet.columnWidths)
    expect(read.charts).toEqual(sheet.charts)
  }
})

test('a player who chooses the basic editor (Settings → Office apps) gets it, with the same file', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('gamhub-worksim:basic-editors', '1'),
  )
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Grid Craft')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  await expect(page.locator('[data-address="A1"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('gridcraft-editor')).toHaveCount(0)
})

test('WorkSim AI in Grid Craft: it sees the cell the player is on, and applies a formula only when chosen', async ({
  page,
}) => {
  test.setTimeout(300_000)
  const ai = page.getByTestId('window-ai')
  const fromMenu = async (item: string | RegExp) => {
    await page
      .getByTestId('window-sheets')
      .getByRole('button', { name: 'WorkSim AI', exact: true })
      .click()
    await page.getByRole('menuitem', { name: item }).click()
    await expect(ai).toBeVisible()
  }
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Sam')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Grid Craft')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  const frame = await gridCraft(page)
  await run(frame, 'range.setValues', { range: 'B2', values: [[100], [250], [50]] })
  await run(frame, 'cell.set', { cell: 'C2', input: '=B2/0' })
  await waitUntilSaved(page)

  await run(frame, 'selection.set', { range: 'C2' })
  await page.waitForTimeout(2500)
  await fromMenu('Why is this formula not working?')
  await expect(ai.getByTestId('ai-answer').last()).toContainText('divides by zero')

  await ai.getByRole('radio', { name: 'Professional' }).click()
  await page.getByTestId('window-sheets').getByTestId('window-title-bar').click()
  await run(frame, 'selection.set', { range: 'B5' })
  await page.waitForTimeout(2500)
  await fromMenu('Suggest a formula for this cell')
  const proposal = ai.getByTestId('ai-proposal')
  await expect(proposal).toContainText('Proposed formula for cell B5')
  await expect(proposal).toContainText('=SUM(B2:B4)')
  expect((await read(frame, 'B5')).values).toEqual([[null]])
  await proposal.getByRole('button', { name: 'Apply' }).click()
  await expect(proposal).toContainText('Applied')
  await expect
    .poll(async () => (await read(frame, 'B5')).values, { timeout: 30_000 })
    .toEqual([[400]])
})
