import { expect, test, type Frame, type Page } from '@playwright/test'
import { openApp, sitAtComputer, startCareerIfNeeded } from './helpers.ts'

// Word Craft, the office's word processor (docs/CRAFT_APPS.md): the real app
// in the document window. Its interface is drawn on a canvas, so the work is
// done here through its own command API, as an agent would, and what the
// graders read is checked in the save itself.

test.beforeEach(async ({ page }) => {
  // The development build uses the basic editors under test; these tests use the apps.
  await page.addInitScript(() => sessionStorage.setItem('worksim.crafts', 'on'))
})

interface PageApi {
  execute: (command: string, params: object) => Promise<unknown>
  request: (method: string, params: object) => Promise<unknown>
}

/** Word Craft in the window in front, once the document is open in it. */
async function wordCraft(page: Page): Promise<Frame> {
  await expect(page.getByTestId('wordcraft-editor')).toHaveAttribute(
    'data-phase',
    'ready',
    {
      timeout: 180_000,
    },
  )
  return page.frame({ url: /crafts\/wordcraft\/index\.html/ })!
}

/** Runs Word Craft commands in order. */
async function run(frame: Frame, ...commands: Array<[string, object?]>) {
  for (const [command, params] of commands)
    await frame.evaluate(
      ([command, params]) =>
        (globalThis as unknown as { wordcraft: PageApi }).wordcraft.execute(
          command,
          params,
        ),
      [command, params ?? {}] as const,
    )
}

/** The paragraphs (and tables) Word Craft has open: their style and text. */
async function blocks(frame: Frame) {
  const inspect = (await frame.evaluate(() =>
    (globalThis as unknown as { wordcraft: PageApi }).wordcraft.request(
      'document.inspect',
      {
        text: true,
      },
    ),
  )) as { blocks: Array<{ type: string; style?: string; text?: string }> }
  return inspect.blocks
}

interface Node {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  content?: Node[]
}

/** A document as saved (what the graders read), found by its title. */
async function savedDoc(page: Page, title: string) {
  return (await page.evaluate(`new Promise((resolve, reject) => {
    const open = indexedDB.open('gamhub-worksim')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const all = open.result.transaction('documents').objectStore('documents').getAll()
      all.onsuccess = () => {
        const found = all.result.filter((d) => d.title === ${JSON.stringify(title)} && !d.deleted).at(-1)
        resolve(found ? found.content : null)
      }
    }
  })`)) as { body: Node; file?: { format: string } } | null
}

const textOf = (node: Node): string =>
  node.type === 'text' ? (node.text ?? '') : (node.content ?? []).map(textOf).join(' ')
const all = (node: Node, type: string): Node[] => [
  ...(node.type === type ? [node] : []),
  ...(node.content ?? []).flatMap((c) => all(c, type)),
]

/**
 * Until the app's latest change is kept: the app reports a change as it draws
 * (about once a second in this test browser), and it is saved 1.5 s later; so
 * wait for "saved" to hold for two seconds.
 */
async function waitUntilKept(page: Page) {
  const state = () =>
    page.getByTestId('save-indicator').first().getAttribute('data-state')
  await page.waitForTimeout(1500)
  let steady = 0
  await expect
    .poll(
      async () => {
        steady = (await state()) === 'saved' ? steady + 1 : 0
        return steady
      },
      { timeout: 90_000, intervals: [500] },
    )
    .toBeGreaterThanOrEqual(4)
}

async function newDocument(page: Page, template: RegExp) {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await sitAtComputer(page)
  await openApp(page, 'Word Craft')
  await page.getByRole('button', { name: template }).click()
}

test('a new document in Word Craft: written, styled, kept as a .docx and read for grading, and there after a reload', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await newDocument(page, /Blank document/)
  let frame = await wordCraft(page)
  await expect(page.getByText('Word Craft 0.18.0, based on WordCraft')).toBeVisible()
  // The document is shown (not Word Craft's own File screen).
  const ui = (await frame.evaluate(() =>
    (
      globalThis as unknown as {
        wordcraft: { uiInspect: () => Promise<{ ui: { backstage: boolean } }> }
      }
    ).wordcraft.uiInspect(),
  )) as { ui: { backstage: boolean } }
  expect(ui.ui.backstage).toBe(false)

  await run(
    frame,
    ['select.all'],
    ['text.insert', { text: 'Budget review' }],
    ['para.style', { style: 'Heading 1' }],
    ['text.newParagraph'],
    ['para.style', { style: 'Normal' }],
    ['text.insert', { text: 'Costs rose by 12% to £1,350 this quarter.' }],
    ['select.text', { text: 'rose' }],
    ['format.bold'],
  )
  await waitUntilKept(page)
  await page.screenshot({ path: 'docs/screenshots/crafts/wordcraft-document.png' })

  // What the graders read: the heading, the text, the bold word.
  const saved = (await savedDoc(page, 'Untitled document'))!
  expect(saved.file?.format).toBe('docx')
  const [heading, paragraph] = saved.body.content!
  expect(heading).toMatchObject({ type: 'heading', attrs: { level: 1 } })
  expect(textOf(heading)).toBe('Budget review')
  expect(textOf(paragraph).replace(/\s+/g, ' ')).toContain('Costs rose by 12% to £1,350')
  expect(JSON.stringify(paragraph)).toContain('"bold"')

  // After a reload it opens again, from the kept .docx.
  await page.reload()
  frame = await wordCraft(page)
  const texts = (await blocks(frame)).map((b) => `${b.style}:${b.text}`)
  expect(texts).toContain('Heading1:Budget review')
  expect(texts.some((t) => t.includes('Costs rose by 12%'))).toBe(true)
})

test('a WorkSim template opens in Word Craft with its headings and table; a chart from Grid Craft counts as a chart', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await newDocument(page, /Business report/)
  const frame = await wordCraft(page)
  const kinds = (await blocks(frame)).map((b) => b.type)
  expect(kinds).toContain('table')
  await expect(page.getByTestId('save-indicator').first()).toHaveAttribute(
    'data-state',
    'saved',
    { timeout: 60_000 },
  )
  const before = (await savedDoc(page, 'Business report'))!
  const headingsBefore = all(before.body, 'heading').map(textOf)
  expect(headingsBefore.length).toBeGreaterThan(2)
  expect(all(before.body, 'table')).toHaveLength(1)

  // A chart, inserted as "Insert chart from Grid Craft" does it: a picture that carries it.
  // (Drawn in the game's page, where WorkSim's code runs; inserted in Word Craft.)
  const picture = (await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path)
    const { chartAlt } = await load('/src/apps/docs/wordcraft/convert.ts')
    const { chartPng } = await load('/src/ui/chartImage.ts')
    const chart = {
      type: 'column',
      title: 'Spending by month',
      labels: ['Jan', 'Feb', 'Mar'],
      series: [{ name: 'Spending', values: [1200, 950, 1430] }],
    }
    const png: string = await chartPng(chart)
    return { data: png.slice(png.indexOf(',') + 1), alt: chartAlt(chart) as string }
  })) as { data: string; alt: string }
  await run(
    frame,
    ['caret.docEnd'],
    ['text.newParagraph'],
    ['insert.picture', { data: picture.data, width: 360, alt: picture.alt }],
  )
  await waitUntilKept(page)
  await page.screenshot({ path: 'docs/screenshots/crafts/wordcraft-report.png' })
  const after = (await savedDoc(page, 'Business report'))!
  expect(all(after.body, 'heading').map(textOf)).toEqual(headingsBefore)
  expect(all(after.body, 'table')).toHaveLength(1)
  const charts = all(after.body, 'chart')
  expect(charts).toHaveLength(1)
  expect(charts[0].attrs?.spec).toMatchObject({ title: 'Spending by month' })

  // A chart put inside a line of text (here, the title): the line keeps its text,
  // and the chart is read as a block after it.
  await run(
    frame,
    ['caret.docStart'],
    ['insert.picture', { data: picture.data, width: 360, alt: picture.alt }],
  )
  await waitUntilKept(page)
  const again = (await savedDoc(page, 'Business report'))!
  expect(all(again.body, 'heading').map(textOf)).toEqual(headingsBefore)
  expect(all(again.body, 'chart')).toHaveLength(2)
  expect(again.body.content![1].type).toBe('chart')
})

test('WorkSim AI in Word Craft: a rewrite of the selected text is applied only after review', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.route('http://127.0.0.1:8787/**', async (route) => {
    const request = route.request()
    const headers = {
      'access-control-allow-origin': request.headers().origin ?? '*',
      'access-control-allow-headers': 'content-type',
      'content-type': 'application/json',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const body = request.postDataJSON() as { system: string }
    return route.fulfill({
      headers,
      body: JSON.stringify({
        text: body.system.includes('rewrite the selected text')
          ? 'The quarterly figures are ready for review.'
          : 'Fine.',
        model: 'test-model',
      }),
    })
  })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await page.evaluate(() =>
    localStorage.setItem(
      'gamhub-worksim:ai-settings',
      JSON.stringify({ engine: 'bridge', consent: true, mode: 'professional' }),
    ),
  )
  await page.reload()
  await sitAtComputer(page)
  await openApp(page, 'Word Craft')
  await page.getByRole('button', { name: /Blank document/ }).click()
  const frame = await wordCraft(page)
  await run(
    frame,
    ['select.all'],
    ['text.insert', { text: 'the numbers is done now, have a look' }],
  )
  await waitUntilKept(page)
  await run(frame, ['select.all'])
  await page.waitForTimeout(2500)

  const ai = page.getByTestId('window-ai')
  await page
    .getByTestId('window-docs')
    .getByRole('button', { name: 'WorkSim AI', exact: true })
    .click()
  await page
    .getByRole('menuitem', { name: 'Rewrite the selected text professionally' })
    .click()
  const proposal = ai.getByTestId('ai-proposal')
  await expect(proposal).toContainText('The quarterly figures are ready for review.')
  expect((await blocks(frame)).map((b) => b.text).join(' ')).toContain(
    'the numbers is done now',
  )
  await proposal.getByRole('button', { name: 'Apply' }).click()
  await expect
    .poll(async () => (await blocks(frame)).map((b) => b.text).join(' '), {
      timeout: 30_000,
    })
    .toContain('The quarterly figures are ready for review.')
  expect((await blocks(frame)).map((b) => b.text).join(' ')).not.toContain(
    'the numbers is',
  )
})

test('without Word Craft (not installed, or it cannot start), the basic editor opens the same document', async ({
  page,
}) => {
  await page.route('**/crafts/wordcraft/craft.json', (route) =>
    route.fulfill({ status: 404 }),
  )
  await newDocument(page, /Blank document/)
  await expect(page.getByTestId('doc-body')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('wordcraft-editor')).toHaveCount(0)
})

test('the connected office: analysis in Grid Craft, the report in Word Craft with its chart, handed in and graded', async ({
  page,
}) => {
  test.setTimeout(600_000)
  const apps = page.getByRole('navigation', { name: 'Apps' })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await sitAtComputer(page)
  await page.evaluate("window.__worksim.skipTo('performance-report')")
  await openApp(page, 'Mail')
  await page
    .getByRole('button', { name: /October performance report for the management/ })
    .click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open task' })
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()

  // 1. The analysis, in Grid Craft: variances, totals and a chart.
  await expect(page.getByTestId('gridcraft-editor')).toHaveAttribute(
    'data-phase',
    'ready',
    {
      timeout: 180_000,
    },
  )
  const grid = page.frame({ url: /crafts\/gridcraft\/index\.html/ })!
  const sheet = (command: string, params: object) =>
    grid.evaluate(
      ([command, params]) =>
        (globalThis as unknown as { gridcraft: PageApi }).gridcraft.execute(
          command,
          params,
        ),
      [command, params] as const,
    )
  await sheet('range.setValues', {
    range: 'D2',
    values: Array.from({ length: 6 }, (_, i) => [
      `=C${i + 2}-B${i + 2}`,
      `=C${i + 2}/B${i + 2}`,
      `=IF(C${i + 2}>B${i + 2}, "Over budget", "Within budget")`,
    ]),
  })
  await sheet('range.setValues', {
    range: 'B9',
    values: [['=SUM(B2:B7)', '=SUM(C2:C7)', '=C9-B9', '=C9/B9']],
  })
  await sheet('insert.chart', {
    range: 'A1:C7',
    type: 'column',
    title: 'Budget vs actual',
  })
  await waitUntilKept(page)

  // 2. The report, in Word Craft, opened from the task.
  await apps.getByRole('button', { name: /^Tasks/ }).click()
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /October performance report/ })
    .click()
  const word = await wordCraft(page)
  const section = (heading: string, text: string): Array<[string, object?]> => [
    ['para.style', { style: 'Heading 2' }],
    ['text.insert', { text: heading }],
    ['text.newParagraph'],
    ['para.style', { style: 'Normal' }],
    ['text.insert', { text }],
    ['text.newParagraph'],
  ]
  await run(
    word,
    ['select.all'],
    ['text.delete'],
    ...section(
      'Executive summary',
      'In October the six departments spent $227,300 against a total budget of $227,000, so overall spending was $300 over budget. Two departments overspent and four stayed within their budgets.',
    ),
    ...section(
      'Findings',
      'Sales was the largest overspend at $3,240 above budget, followed by Operations at $2,870 over. Marketing, IT, HR and Finance all spent less than planned, which almost balanced the overspends. The chart below compares budget and actual spending for each department, and shows that the overspends are concentrated in the two largest operational areas.',
    ),
  )
  // The chart, from Grid Craft, with the button above the document.
  await page.getByRole('button', { name: 'Insert chart from Grid Craft' }).click()
  await page
    .getByTestId('sheets-picker')
    .getByRole('button', { name: /October departmental performance/ })
    .click()
  // In, and kept with the report (the picture is drawn, then inserted).
  await expect
    .poll(
      async () =>
        all((await savedDoc(page, 'October performance report'))!.body, 'chart').length,
      { timeout: 90_000, intervals: [1000] },
    )
    .toBe(1)
  await run(
    word,
    ['caret.docEnd'],
    ['text.newParagraph'],
    ...section(
      'Recommendations',
      'Sales and Operations should review their forecasts for November and explain the main causes of the overspend at the next management meeting. Finance will monitor both budgets weekly until the end of the quarter, and the underspends in Marketing and IT should be confirmed before they are released to other departments.',
    ),
  )
  await waitUntilKept(page)
  await page.screenshot({ path: 'docs/screenshots/crafts/wordcraft-task-report.png' })
  const report = (await savedDoc(page, 'October performance report'))!
  expect(all(report.body, 'chart')).toHaveLength(1)

  // 3. The slides (the basic Slides editor until Deck Craft).
  await apps.getByRole('button', { name: /^Tasks/ }).click()
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /October performance review/ })
    .click()
  const thumbnails = page.getByRole('navigation', { name: 'Slides' })
  await thumbnails.getByRole('button', { name: 'Slide 3', exact: true }).click()
  const tools = page.getByRole('toolbar', { name: 'Slide tools' })
  await tools.getByRole('button', { name: 'Text box' }).click()
  await page
    .getByLabel('Slide text')
    .fill('Total spending: $227,300 (Sales $3,240 over budget)')
  await page.keyboard.press('Escape')
  await tools.getByRole('button', { name: 'Chart from Grid Craft' }).click()
  await page
    .getByTestId('sheets-picker')
    .getByRole('button', { name: /October departmental performance/ })
    .click()
  await expect(page.getByTestId('slide-canvas').getByTestId('element-chart')).toHaveCount(
    1,
  )
  await expect(page.getByTestId('save-indicator').first()).toHaveAttribute(
    'data-state',
    'saved',
    { timeout: 30_000 },
  )

  // 4. Hand in by email: graded on the workbook, the report and the slides.
  await apps.getByRole('button', { name: /^Tasks/ }).click()
  await page
    .getByTestId('task-files')
    .getByRole('button', { name: /Reply to Priya/ })
    .click()
  const compose = page.getByTestId('compose')
  await expect(
    compose.getByRole('list', { name: 'Attached files' }).getByRole('listitem'),
  ).toHaveCount(3)
  await compose.getByRole('button', { name: 'Send' }).click()
  const results = page.getByTestId('submission-results')
  await expect(results).toBeVisible({ timeout: 60_000 })
  await page.screenshot({ path: 'docs/screenshots/crafts/wordcraft-task-graded.png' })
  await expect(results.getByTestId('score')).toHaveText('100%')
})

test('a player who chooses the basic editors (Settings → Office apps) gets the basic Docs editor', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('gamhub-worksim:basic-editors', '1'),
  )
  await newDocument(page, /Blank document/)
  await expect(page.getByTestId('doc-body')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('wordcraft-editor')).toHaveCount(0)
})
