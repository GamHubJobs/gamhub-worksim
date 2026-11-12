/**
 * Between Deck Craft's presentations and WorkSim's own presentation format
 * (the one the basic Slides editor edits, and the graders, WorkSim AI and the
 * exports read).
 *
 * - `buildDeck`: a WorkSim presentation built in Deck Craft by its commands
 *   (a task's starting slides, a template, one edited in the basic editor):
 *   each slide in its layout, the text in the layout's placeholders, then the
 *   other text boxes, shapes, pictures and charts where they were, the speaker
 *   notes and the theme. Charts become real Deck Craft charts, with their data.
 * - `deckToSlides`: Deck Craft's presentation read back, slide by slide, from
 *   its own inspection (`slide.inspect`): the titles, the text of every
 *   placeholder, text box, shape and table, the charts with their data and the
 *   notes. That is what the graders read (slide titles, text, charts and the
 *   number of slides). Everything else (animations, transitions, pictures
 *   added in Deck Craft, formatting…) stays in the kept .pptx.
 */
import { fingerprintValue } from '../../../lib/fingerprint'
import { createId } from '../../../lib/ids'
import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  type ChartSpec,
  type Slide,
  type SlideElement,
  type SlideLayout,
  type SlidesContent,
  type SlideTheme,
} from '../../../persistence/schemas'
import { textStyle } from '../model'

// ---------------------------------------------------------------------------
// What Deck Craft reports (slide.inspect)
// ---------------------------------------------------------------------------

export interface InspectedChart {
  type?: string
  title?: string | null
  categories?: unknown[]
  series?: Array<{ name?: unknown; values?: unknown[] }>
}

export interface InspectedShape {
  id: number
  kind: string
  box?: number[]
  placeholder?: string
  preset?: string
  fill?: string
  text?: string
  altText?: string
  chart?: InspectedChart
  table?: { cells?: unknown[][] }
  /** The members of a group. */
  shapes?: InspectedShape[]
}

export interface InspectedSlide {
  layout?: string
  notes?: string
  shapes?: InspectedShape[]
}

// ---------------------------------------------------------------------------
// Layouts and themes
// ---------------------------------------------------------------------------

/** WorkSim's layouts as Deck Craft's layout kinds (slide.new). */
export const LAYOUT_KINDS: Record<SlideLayout, string> = {
  title: 'title',
  'title-content': 'titleAndContent',
  'two-column': 'twoContent',
  section: 'sectionHeader',
  'title-only': 'titleOnly',
  blank: 'blank',
}

/** Deck Craft's layout names as WorkSim's (the nearest one for the others). */
export function layoutFromName(name: string | undefined): SlideLayout {
  switch ((name ?? '').toLowerCase()) {
    case 'title slide':
      return 'title'
    case 'section header':
      return 'section'
    case 'two content':
    case 'comparison':
      return 'two-column'
    case 'title only':
      return 'title-only'
    case 'blank':
      return 'blank'
    default:
      return 'title-content'
  }
}

/** WorkSim's themes as Deck Craft's nearest built-in themes. */
export const THEME_NAMES: Record<SlideTheme, string> = {
  corporate: 'DeckCraft',
  midnight: 'Nocturne',
  fresh: 'Meadow',
  warm: 'Ember',
}

export function themeFromName(
  name: string | undefined,
  previous: SlideTheme,
): SlideTheme {
  const found = (Object.keys(THEME_NAMES) as SlideTheme[]).find(
    (theme) => THEME_NAMES[theme] === name,
  )
  return found ?? previous
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

/** Deck Craft's chart type ("Clustered Column", "Pie"…) as WorkSim's. */
export function chartTypeFromName(name: string | undefined): ChartSpec['type'] {
  const type = (name ?? '').toLowerCase()
  if (/pie|doughnut/.test(type)) return 'pie'
  if (/line/.test(type)) return 'line'
  if (/bar/.test(type)) return 'bar'
  return 'column'
}

const DEFAULT_CHART_TITLE = 'Chart Title'

export function chartFromInspection(chart: InspectedChart): ChartSpec {
  const title =
    typeof chart.title === 'string' && chart.title !== DEFAULT_CHART_TITLE
      ? chart.title.slice(0, 200)
      : ''
  return {
    type: chartTypeFromName(chart.type),
    title,
    labels: (chart.categories ?? [])
      .slice(0, 200)
      .map((c) => String(c ?? '').slice(0, 200)),
    series: (chart.series ?? []).slice(0, 12).map((s) => ({
      name: String(s.name ?? '').slice(0, 200),
      values: (s.values ?? []).slice(0, 200).map((v) => {
        const n = typeof v === 'number' ? v : Number(v)
        return Number.isFinite(n) ? n : 0
      }),
    })),
  }
}

/** A WorkSim chart as `insert.chart`'s parameters. */
export function chartParams(chart: ChartSpec, rect: number[]) {
  return {
    type: chart.type,
    rect,
    categories: chart.labels,
    series: chart.series.map((s) => ({ name: s.name, values: s.values })),
  }
}

// ---------------------------------------------------------------------------
// Deck Craft → WorkSim
// ---------------------------------------------------------------------------

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, Number.isFinite(value) ? value : low))

function boxOf(shape: InspectedShape) {
  const [x = 0, y = 0, w = 100, h = 40] = shape.box ?? []
  return {
    x: clamp(x, -SLIDE_WIDTH, 2 * SLIDE_WIDTH),
    y: clamp(y, -SLIDE_HEIGHT, 2 * SLIDE_HEIGHT),
    w: clamp(w, 4, 2 * SLIDE_WIDTH),
    h: clamp(h, 4, 2 * SLIDE_HEIGHT),
  }
}

const TITLE_PLACEHOLDERS = new Set(['title', 'ctrTitle'])
/** Placeholders whose text is not the slide's (numbers, dates, footers). */
const OTHER_PLACEHOLDERS = new Set(['sldNum', 'dt', 'ftr', 'hdr'])

function shapeKind(
  preset: string | undefined,
): 'rect' | 'rounded' | 'ellipse' | 'arrow' | 'line' {
  const name = (preset ?? '').toLowerCase()
  if (name === 'roundrect' || name.startsWith('round')) return 'rounded'
  if (name === 'ellipse') return 'ellipse'
  if (name.includes('arrow')) return 'arrow'
  if (name === 'line' || name.includes('connector')) return 'line'
  return 'rect'
}

const colorOf = (fill: string | undefined) =>
  fill && /^#[0-9a-f]{6}$/i.test(fill) ? fill.toLowerCase() : null

/** A table's cells as text, a row to a line, for the text checks. */
function tableText(cells: unknown[][]): string {
  return cells
    .map((row) => row.map((cell) => String(cell ?? '').trim()).join('\t'))
    .filter((line) => line.trim())
    .join('\n')
}

/** An element before it has its ID (each kind of element, without `id`). */
type NewElement = SlideElement extends infer E
  ? E extends SlideElement
    ? Omit<E, 'id'>
    : never
  : never

/** One shape as WorkSim's element(s), or none (pictures not from WorkSim, …). */
function elementsOf(
  shape: InspectedShape,
  layout: SlideLayout,
  images: Map<string, string>,
): NewElement[] {
  const box = boxOf(shape)
  switch (shape.kind) {
    case 'group':
      return (shape.shapes ?? []).flatMap((member) => elementsOf(member, layout, images))
    case 'placeholder': {
      const placeholder = shape.placeholder ?? 'body'
      if (OTHER_PLACEHOLDERS.has(placeholder)) return []
      const role = TITLE_PLACEHOLDERS.has(placeholder)
        ? 'title'
        : placeholder === 'subTitle' ||
            ((layout === 'section' || layout === 'title') && placeholder === 'body')
          ? 'subtitle'
          : 'body'
      const style =
        role === 'title'
          ? textStyle({
              size: layout === 'title' ? 48 : layout === 'section' ? 44 : 36,
              bold: true,
              align: layout === 'title' ? 'center' : 'left',
            })
          : role === 'subtitle'
            ? textStyle({ size: 24, align: layout === 'title' ? 'center' : 'left' })
            : textStyle({ size: 24, bullets: true })
      return [
        { type: 'text', ...box, text: (shape.text ?? '').slice(0, 5000), style, role },
      ]
    }
    case 'textBox':
      return [
        {
          type: 'text',
          ...box,
          text: (shape.text ?? '').slice(0, 5000),
          style: textStyle(),
        },
      ]
    case 'shape':
      return [
        {
          type: 'shape',
          ...box,
          shape: shapeKind(shape.preset),
          fill: colorOf(shape.fill),
          stroke: null,
          text: (shape.text ?? '').slice(0, 1000),
        },
      ]
    case 'chart':
      return shape.chart
        ? [{ type: 'chart', ...box, chart: chartFromInspection(shape.chart) }]
        : []
    case 'table': {
      const text = tableText(shape.table?.cells ?? [])
      return text
        ? [
            {
              type: 'text',
              ...box,
              text: text.slice(0, 5000),
              style: textStyle({ size: 18 }),
            },
          ]
        : []
    }
    case 'picture': {
      // Pictures that came from WorkSim are found by their alternative text.
      const src = shape.altText ? images.get(shape.altText) : undefined
      return src ? [{ type: 'image', ...box, src, alt: shape.altText ?? '' }] : []
    }
    default:
      return shape.text
        ? [{ type: 'text', ...box, text: shape.text.slice(0, 5000), style: textStyle() }]
        : []
  }
}

/**
 * Deck Craft's presentation (each slide's `slide.inspect`, and the theme's
 * name) as WorkSim's. IDs are kept from the previous content where a slide or
 * element is in the same place, so they stay the same from save to save.
 */
export function deckToSlides(
  inspected: InspectedSlide[],
  themeName: string | undefined,
  previous: SlidesContent,
): SlidesContent {
  const images = new Map<string, string>()
  for (const slide of previous.slides)
    for (const element of slide.elements)
      if (element.type === 'image' && element.alt) images.set(element.alt, element.src)

  const slides = inspected.slice(0, 200).map((page, i): Slide => {
    const before = previous.slides[i]
    const layout = layoutFromName(page.layout)
    const elements = (page.shapes ?? [])
      .flatMap((shape) => elementsOf(shape, layout, images))
      .slice(0, 100)
      .map((element, n) => {
        const was = before?.elements[n]
        return {
          ...element,
          id: was && was.type === element.type ? was.id : createId(),
        } as SlideElement
      })
    return {
      id: before?.id ?? createId(),
      layout,
      elements,
      notes: (page.notes ?? '').slice(0, 5000),
    }
  })
  return {
    theme: themeFromName(themeName, previous.theme),
    // A presentation always has a slide.
    slides: slides.length
      ? slides
      : [{ id: createId(), layout: 'blank', elements: [], notes: '' }],
  }
}

/**
 * A short fingerprint of a presentation's slides and theme, to know whether
 * the kept .pptx still matches them (an edit in the basic editor, or a
 * restored version, does not). Whatever the order of the keys, which
 * saving changes (fingerprintValue).
 */
export function slidesFingerprint(content: SlidesContent): string {
  return fingerprintValue([content.theme, content.slides])
}

// ---------------------------------------------------------------------------
// WorkSim → Deck Craft
// ---------------------------------------------------------------------------

/** Runs one of Deck Craft's commands and resolves with its reply. */
export type Run = (command: string, params: object) => Promise<unknown>

const rectOf = (e: { x: number; y: number; w: number; h: number }) => [e.x, e.y, e.w, e.h]

const PRESETS: Record<string, string> = {
  rect: 'rect',
  rounded: 'roundRect',
  ellipse: 'ellipse',
  arrow: 'rightArrow',
  line: 'line',
}

const idOf = (reply: unknown) => (reply as { id?: number } | null)?.id

/** Text formatting of a text box that is not a layout's placeholder. */
async function formatText(
  run: Run,
  id: number,
  element: SlideElement & { type: 'text' },
) {
  await run('edit.select', { ids: [id] })
  await run('format.size', { size: element.style.size })
  if (element.style.bold) await run('format.bold', { on: true })
  if (element.style.italic) await run('format.italic', { on: true })
  if (element.style.align !== 'left')
    await run('format.align', { align: element.style.align })
  if (element.style.color)
    await run('format.color', { color: element.style.color.toUpperCase() })
  if (element.style.bullets) await run('format.bullets', { on: true })
}

/**
 * Builds a WorkSim presentation in Deck Craft, in a new, empty presentation
 * that is open and active. Problems with one element are collected (the
 * rest is still built) and returned.
 */
export async function buildDeck(run: Run, content: SlidesContent): Promise<string[]> {
  const problems: string[] = []
  const attempt = async (what: string, step: () => Promise<unknown>) => {
    try {
      await step()
    } catch (error) {
      problems.push(`${what}: ${String(error)}`)
    }
  }
  await attempt('theme', () => run('design.theme', { name: THEME_NAMES[content.theme] }))
  for (const [index, slide] of content.slides.entries()) {
    await run('slide.new', { layout: LAYOUT_KINDS[slide.layout], at: index })
    const placed = (await run('slide.inspect', { index })) as InspectedSlide
    const placeholders = (placed.shapes ?? []).filter((s) => s.kind === 'placeholder')
    const take = (match: (placeholder: string) => boolean) => {
      const at = placeholders.findIndex((s) => match(s.placeholder ?? 'body'))
      return at >= 0 ? placeholders.splice(at, 1)[0] : undefined
    }
    for (const element of slide.elements) {
      const rect = rectOf(element)
      const label = `slide ${index + 1}, ${element.type}`
      if (element.type === 'text') {
        const target =
          element.role === 'title'
            ? take((p) => TITLE_PLACEHOLDERS.has(p))
            : element.role === 'subtitle'
              ? take((p) => p === 'subTitle' || p === 'body')
              : element.role === 'body'
                ? take((p) => !TITLE_PLACEHOLDERS.has(p) && !OTHER_PLACEHOLDERS.has(p))
                : undefined
        if (target) {
          if (element.text)
            await attempt(label, () =>
              run('text.set', { id: target.id, text: element.text }),
            )
          continue
        }
        if (!element.text) continue
        await attempt(label, async () => {
          const id = idOf(await run('insert.textBox', { rect, text: element.text }))
          if (id !== undefined) await formatText(run, id, element)
        })
      } else if (element.type === 'shape') {
        await attempt(label, async () => {
          const id = idOf(
            await run('shape.insert', {
              preset: PRESETS[element.shape],
              rect,
              ...(element.text ? { text: element.text } : {}),
            }),
          )
          if (id !== undefined && element.fill)
            await run('shape.fill', { color: element.fill.toUpperCase(), ids: [id] })
        })
      } else if (element.type === 'image') {
        await attempt(label, async () => {
          const data = element.src.slice(element.src.indexOf(',') + 1)
          const id = idOf(await run('insert.picture', { data, rect }))
          if (id !== undefined && element.alt)
            await run('shape.altText', { text: element.alt, ids: [id] })
        })
      } else {
        await attempt(label, async () => {
          const id = idOf(await run('insert.chart', chartParams(element.chart, rect)))
          if (id !== undefined)
            await run('chart.options', { title: element.chart.title || null, id })
        })
      }
    }
    if (slide.notes)
      await attempt(`slide ${index + 1}, notes`, () =>
        run('slide.notes', { text: slide.notes, index }),
      )
  }
  await run('slide.go', { index: 0 }).catch(() => {})
  await run('edit.deselect', {}).catch(() => {})
  return problems
}
