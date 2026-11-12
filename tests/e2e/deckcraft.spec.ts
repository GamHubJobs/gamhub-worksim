import { readFile } from 'node:fs/promises'
import { expect, test, type Frame, type Page } from '@playwright/test'
import { openApp, sitAtComputer, startCareerIfNeeded } from './helpers.ts'

// Deck Craft, the office's presentation app (docs/CRAFT_APPS.md): the real app
// in the presentation window. Its interface is drawn on a canvas, so the work
// is done here through its own command API, as an agent would, and what the
// graders read is checked in the save itself.

test.beforeEach(async ({ page }) => {
  // The development build uses the basic editors under test; these tests use the apps.
  await page.addInitScript(() => sessionStorage.setItem('worksim.crafts', 'on'))
})

interface PageApi {
  execute: (command: string, params: object) => Promise<unknown>
  request: (method: string, params: object) => Promise<unknown>
  docInspect: () => Promise<unknown>
  uiInspect: () => Promise<unknown>
}

/** Deck Craft in the window in front, once the presentation is open in it. */
async function deckCraft(page: Page): Promise<Frame> {
  await expect(page.getByTestId('deckcraft-editor')).toHaveAttribute(
    'data-phase',
    'ready',
    { timeout: 180_000 },
  )
  return page.frame({ url: /crafts\/deckcraft\/index\.html/ })!
}

/** Runs one Deck Craft command and returns its reply. */
function run(frame: Frame, command: string, params: object = {}) {
  return frame.evaluate(
    ([command, params]) =>
      (globalThis as unknown as { deckcraft: PageApi }).deckcraft.execute(
        command,
        params,
      ),
    [command, params] as const,
  )
}

interface Deck {
  dirty: boolean
  path: string | null
  slides: Array<{ title: string; layout: string; notes: string }>
}
const deck = (frame: Frame) =>
  frame.evaluate(() =>
    (globalThis as unknown as { deckcraft: PageApi }).deckcraft.docInspect(),
  ) as Promise<Deck>
const ui = (frame: Frame) =>
  frame.evaluate(() =>
    (globalThis as unknown as { deckcraft: PageApi }).deckcraft.uiInspect(),
  ) as Promise<{ backstage: unknown; showing: { slide: number } | null }>

interface Shape {
  id: number
  kind: string
  placeholder?: string
  text?: string
  chart?: { categories: string[] }
}
interface InspectedSlide {
  shapes: Shape[]
  animations: unknown[]
  transition: { kind: string } | null
  notes: string
}
const slide = (frame: Frame, index: number) =>
  run(frame, 'slide.inspect', { index }) as Promise<InspectedSlide>

interface SavedElement {
  type: string
  role?: string
  text?: string
  chart?: { labels: string[]; series: Array<{ values: number[] }> }
}
interface SavedDeck {
  slides: Array<{ elements: SavedElement[]; notes: string }>
  file?: { format: string; app: string }
}

/** A presentation as saved (what the graders read), found by its title. */
async function savedDeck(page: Page, title: string) {
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
  })`)) as SavedDeck | null
}

/** The slide titles, as the graders read them. */
const titles = (saved: SavedDeck) =>
  saved.slides.map(
    (s) => s.elements.find((e) => e.type === 'text' && e.role === 'title')?.text ?? '',
  )
const charts = (saved: SavedDeck) =>
  saved.slides.flatMap((s) => s.elements.filter((e) => e.type === 'chart'))

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

async function newPresentation(page: Page, template: RegExp) {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await sitAtComputer(page)
  await openApp(page, 'Deck Craft')
  await page.getByRole('button', { name: template }).click()
}

const REVIEW_TITLES = [
  '[Month] business review',
  'Highlights',
  'Key figures',
  'What went well, what did not',
  'Next steps',
  'Questions?',
]

test('a template in Deck Craft: its slides, then slides added, duplicated, moved and deleted, with a chart, notes, a transition and an animation; kept as .pptx, graded as read, and there after a reload', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await newPresentation(page, /Monthly business review/)
  let frame = await deckCraft(page)
  await expect(page.getByText('Deck Craft 0.18.1, based on DeckCraft')).toBeVisible()
  // The slides are shown (not Deck Craft's own File screen), each in its layout.
  expect((await ui(frame)).backstage).toBeNull()
  const opened = await deck(frame)
  expect(opened.slides.map((s) => s.title)).toEqual(REVIEW_TITLES)
  expect(opened.slides.map((s) => s.layout)).toEqual([
    'Title Slide',
    'Title and Content',
    'Title Only',
    'Two Content',
    'Title and Content',
    'Section Header',
  ])
  expect(opened.path).toBe('Monthly business review.pptx')
  await waitUntilKept(page)
  const first = (await savedDeck(page, 'Monthly business review'))!
  expect(first.file).toMatchObject({ format: 'pptx', app: 'deckcraft' })
  expect(titles(first)).toEqual(REVIEW_TITLES)

  // A title changed; a slide added with a chart, notes, a transition and an animation.
  const title = (await slide(frame, 1)).shapes.find((s) => s.placeholder === 'title')!
  // (Commands work on the slide that is shown.)
  await run(frame, 'slide.go', { index: 1 })
  await run(frame, 'text.set', { id: title.id, text: 'Highlights for October' })
  await run(frame, 'slide.new', {
    layout: 'titleAndContent',
    at: 6,
    title: 'Budget vs actual',
    body: 'Spending was $300 over budget',
  })
  await run(frame, 'slide.go', { index: 6 })
  const chart = (await run(frame, 'insert.chart', {
    type: 'column',
    rect: [480, 150, 420, 300],
    categories: ['Sales', 'Operations', 'IT'],
    series: [{ name: 'Actual', values: [3240, 2870, -1200] }],
  })) as { id: number }
  await run(frame, 'slide.notes', { text: 'Start with the total.', index: 6 })
  await run(frame, 'transition.set', { kind: 'fade', index: 6 })
  await run(frame, 'edit.select', { ids: [chart.id] })
  await run(frame, 'animation.add', { effect: 'fade' })
  // Duplicated, moved to the end and deleted again: back to seven slides.
  await run(frame, 'slide.duplicate', { index: 1 })
  expect((await deck(frame)).slides).toHaveLength(8)
  await run(frame, 'slide.move', { from: 2, to: 7 })
  expect((await deck(frame)).slides.map((s) => s.title)[7]).toBe('Highlights for October')
  await run(frame, 'slide.delete', { index: 7 })
  await waitUntilKept(page)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/crafts/deckcraft-presentation.png`,
  })

  // What the graders read: the titles, the slide count, the chart with its data, the notes.
  const saved = (await savedDeck(page, 'Monthly business review'))!
  expect(titles(saved)).toEqual([
    '[Month] business review',
    'Highlights for October',
    'Key figures',
    'What went well, what did not',
    'Next steps',
    'Questions?',
    'Budget vs actual',
  ])
  expect(charts(saved)).toHaveLength(1)
  expect(charts(saved)[0].chart).toMatchObject({
    labels: ['Sales', 'Operations', 'IT'],
    series: [{ values: [3240, 2870, -1200] }],
  })
  expect(saved.slides[6].notes).toBe('Start with the total.')
  expect(JSON.stringify(saved.slides[6])).toContain('Spending was $300 over budget')

  // After a reload it opens again from the kept .pptx, with what WorkSim does
  // not read (the transition, the animation) still there.
  await page.reload()
  frame = await deckCraft(page)
  expect((await deck(frame)).slides.map((s) => s.title)).toEqual(titles(saved))
  const last = await slide(frame, 6)
  expect(last.transition?.kind).toBe('fade')
  expect(last.animations.length).toBeGreaterThan(0)
  expect(last.shapes.some((s) => s.kind === 'chart')).toBe(true)
})

test('presenting in Deck Craft: the slide show moves on with the keyboard and Escape ends it', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await newPresentation(page, /Project update/)
  const frame = await deckCraft(page)
  await waitUntilKept(page)
  await page
    .getByTestId('deckcraft-editor')
    .getByRole('button', { name: 'Present', exact: true })
    .click()
  await expect
    .poll(async () => (await ui(frame)).showing?.slide, { timeout: 30_000 })
    .toBe(0)
  await page.waitForTimeout(1000)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/crafts/deckcraft-show.png`,
  })
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(async () => (await ui(frame)).showing?.slide, { timeout: 30_000 })
    .toBe(1)
  // Escape leaves full screen (if the browser gave it) and ends the show.
  await page.keyboard.press('Escape')
  await expect
    .poll(
      async () => {
        const showing = (await ui(frame)).showing
        if (showing) await page.keyboard.press('Escape')
        return showing
      },
      { timeout: 30_000, intervals: [1000] },
    )
    .toBeNull()
  // Present from this slide starts where the player is.
  await run(frame, 'slide.go', { index: 3 })
  await page
    .getByTestId('deckcraft-editor')
    .getByRole('button', { name: 'Present from this slide' })
    .click()
  await expect
    .poll(async () => (await ui(frame)).showing?.slide, { timeout: 30_000 })
    .toBe(3)
  await run(frame, 'show.end')
})

test('Download .pptx and Export PDF give real files; a .pptx imported opens in place and is kept', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await newPresentation(page, /Proposal/)
  let frame = await deckCraft(page)
  await waitUntilKept(page)
  const bar = page.getByTestId('deckcraft-editor')

  const pptx = page.waitForEvent('download')
  await bar.getByRole('button', { name: 'Download .pptx' }).click()
  const pptxFile = await pptx
  expect(pptxFile.suggestedFilename()).toBe('Proposal.pptx')
  const bytes = await readFile(await pptxFile.path())
  expect(bytes.subarray(0, 2).toString()).toBe('PK')

  const pdf = page.waitForEvent('download', { timeout: 120_000 })
  await bar.getByRole('button', { name: 'Export PDF' }).click()
  const pdfFile = await pdf
  expect(pdfFile.suggestedFilename()).toMatch(/\.pdf$/)
  expect((await readFile(await pdfFile.path())).subarray(0, 4).toString()).toBe('%PDF')

  // The .pptx imported into a new, blank presentation.
  await page.getByRole('button', { name: 'Files', exact: true }).click()
  await page.getByRole('button', { name: /Blank presentation/ }).click()
  frame = await deckCraft(page)
  await waitUntilKept(page)
  page.once('dialog', (dialog) => void dialog.accept())
  await bar.getByLabel('Import a presentation file').setInputFiles({
    name: 'Proposal.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    buffer: bytes,
  })
  await expect(bar).toContainText('Proposal.pptx was imported.', { timeout: 60_000 })
  await waitUntilKept(page)
  const saved = (await savedDeck(page, 'Untitled presentation'))!
  expect(titles(saved)).toEqual([
    '[Proposal title]',
    'The problem',
    'Our proposal',
    'Costs and benefits',
    'Recommendation',
  ])
  expect((await deck(frame)).path).toBe('Untitled presentation.pptx')
})

test('WorkSim AI in Deck Craft sees the presentation', async ({ page }) => {
  test.setTimeout(300_000)
  await newPresentation(page, /Monthly business review/)
  await deckCraft(page)
  await waitUntilKept(page)
  await page
    .getByTestId('window-slides')
    .getByRole('button', { name: 'WorkSim AI', exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Review my presentation' }).click()
  await expect(page.getByTestId('window-ai')).toContainText('6 slide(s).', {
    timeout: 30_000,
  })
})

test('a presentation made in the basic editor before Deck Craft opens in Deck Craft, and its work is kept', async ({
  page,
}) => {
  test.setTimeout(300_000)
  // Made and edited with the apps off, as before Deck Craft.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('made')) sessionStorage.setItem('worksim.crafts', 'off')
  })
  await newPresentation(page, /Project update/)
  await expect(page.getByTestId('slide-canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('save-indicator').first()).toHaveAttribute(
    'data-state',
    /saved|idle/,
    { timeout: 30_000 },
  )
  // Then opened with Deck Craft.
  await page.evaluate(() => {
    sessionStorage.setItem('made', '1')
    sessionStorage.setItem('worksim.crafts', 'on')
  })
  await page.reload()
  const frame = await deckCraft(page)
  expect((await deck(frame)).slides.map((s) => s.title)).toEqual([
    '[Project name]: update',
    'Status at a glance',
    'Progress',
    'Risks and issues',
    'Decisions needed',
  ])
  await waitUntilKept(page)
  const saved = (await savedDeck(page, 'Project update'))!
  expect(saved.file?.format).toBe('pptx')
  expect(titles(saved)[0]).toBe('[Project name]: update')
})

test('without Deck Craft (not installed, or it cannot start), the basic editor opens the same presentation', async ({
  page,
}) => {
  await page.route('**/crafts/deckcraft/craft.json', (route) =>
    route.fulfill({ status: 404 }),
  )
  await newPresentation(page, /Blank presentation/)
  await expect(page.getByTestId('slide-canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('deckcraft-editor')).toHaveCount(0)
})

test('a player who chooses the basic editors (Settings → Office apps) gets the basic Slides editor', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('gamhub-worksim:basic-editors', '1'),
  )
  await newPresentation(page, /Blank presentation/)
  await expect(page.getByTestId('slide-canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('deckcraft-editor')).toHaveCount(0)
})
