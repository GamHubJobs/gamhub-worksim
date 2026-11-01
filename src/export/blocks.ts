/**
 * Turns any saved file into simple blocks (headings, paragraphs, lists,
 * tables, charts, code) that every export format can write: PDF, Markdown,
 * HTML and CSV. Pure functions: the same input always gives the same blocks,
 * and nothing is taken from the screen.
 */
import { createCalculator } from '../apps/sheets/engine/workbook'
import { displayValue } from '../apps/sheets/engine/format'
import { columnToLetters, parseAddress } from '../apps/sheets/model'
import { plainText } from '../apps/docs/text'
import type {
  AnyDocument,
  ChartSpec,
  CodeContent,
  RichNode,
  SheetContent,
  SlidesContent,
  TicketsContent,
} from '../persistence/schemas'
import { getTool } from '../tools/registry'

export interface ExportTable {
  title: string
  head: string[]
  rows: string[][]
}

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; table: ExportTable }
  | { kind: 'chart'; chart: ChartSpec }
  | { kind: 'code'; title: string; text: string }

/** Tables bigger than this are cut in reports (the original files keep everything). */
export const MAX_REPORT_ROWS = 200

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

/** Each sheet's used area as a table of the values shown (formulas calculated). */
export function sheetTables(content: SheetContent): ExportTable[] {
  const calculator = createCalculator(content)
  return content.sheets.map((sheet) => {
    let rows = 0
    let columns = 0
    for (const address of Object.keys(sheet.cells)) {
      const position = parseAddress(address)
      if (!position) continue
      rows = Math.max(rows, position.row + 1)
      columns = Math.max(columns, position.column + 1)
    }
    const head = Array.from({ length: columns }, (_, c) => columnToLetters(c))
    const body = Array.from({ length: rows }, (_, r) =>
      head.map((letters) => {
        const address = `${letters}${r + 1}`
        const cell = sheet.cells[address]
        if (!cell) return ''
        return displayValue(
          calculator.getValue(sheet.id, address),
          cell.input,
          cell.format,
        ).text
      }),
    )
    return { title: sheet.name, head, rows: body }
  })
}

/** Every formula in the workbook: where it is, what it says, what it shows. */
export function sheetFormulas(content: SheetContent): ExportTable {
  const calculator = createCalculator(content)
  const rows: string[][] = []
  for (const sheet of content.sheets) {
    for (const [address, cell] of Object.entries(sheet.cells)) {
      if (!cell.input.startsWith('=')) continue
      const shown = displayValue(
        calculator.getValue(sheet.id, address),
        cell.input,
        cell.format,
      )
      rows.push([sheet.name, address, cell.input, shown.text])
    }
  }
  return { title: 'Formulas', head: ['Sheet', 'Cell', 'Formula', 'Shows'], rows }
}

// ---------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------

function docNodeBlocks(node: RichNode): Block[] {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1))) as 1 | 2 | 3
      return [{ kind: 'heading', level, text: plainText(node).trim() }]
    }
    case 'paragraph': {
      const text = plainText(node).trim()
      return text ? [{ kind: 'paragraph', text }] : []
    }
    case 'bulletList':
    case 'orderedList':
      return [
        {
          kind: 'list',
          ordered: node.type === 'orderedList',
          items: (node.content ?? []).map((item) => plainText(item).trim()),
        },
      ]
    case 'table': {
      const rows = (node.content ?? []).map((row) =>
        (row.content ?? []).map((c) => plainText(c).trim()),
      )
      const header = node.content?.[0]?.content?.every((c) => c.type === 'tableHeader')
      return [
        {
          kind: 'table',
          table: {
            title: '',
            head: header ? (rows[0] ?? []) : [],
            rows: header ? rows.slice(1) : rows,
          },
        },
      ]
    }
    case 'chart': {
      const chart = node.attrs?.spec as ChartSpec | null | undefined
      return chart ? [{ kind: 'chart', chart }] : []
    }
    case 'pageBreak':
    case 'horizontalRule':
      return []
    default:
      return (node.content ?? []).flatMap(docNodeBlocks)
  }
}

export function docBlocks(body: RichNode): Block[] {
  return (body.content ?? []).flatMap(docNodeBlocks)
}

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------

export function slideBlocks(content: SlidesContent): Block[] {
  return content.slides.flatMap((slide, index) => {
    const texts = slide.elements.flatMap((e) => (e.type === 'text' ? [e] : []))
    const title = texts.find((t) => t.role === 'title')?.text.trim()
    const blocks: Block[] = [
      {
        kind: 'heading',
        level: 3,
        text: `Slide ${index + 1}${title ? `: ${title}` : ''}`,
      },
    ]
    for (const element of slide.elements) {
      if (element.type === 'text' && element.role !== 'title' && element.text.trim()) {
        const lines = element.text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        blocks.push(
          lines.length > 1
            ? { kind: 'list', ordered: false, items: lines }
            : { kind: 'paragraph', text: lines[0] },
        )
      } else if (element.type === 'chart') {
        blocks.push({ kind: 'chart', chart: element.chart })
      }
    }
    if (slide.notes.trim()) {
      blocks.push({ kind: 'paragraph', text: `Speaker notes: ${slide.notes.trim()}` })
    }
    return blocks
  })
}

// ---------------------------------------------------------------------------
// Help Desk, Code and the professional tools
// ---------------------------------------------------------------------------

export function ticketTable(content: TicketsContent): ExportTable {
  return {
    title: 'Tickets',
    head: [
      'Ticket',
      'From',
      'Subject',
      'Priority',
      'Category',
      'Status',
      'Reply',
      'Note',
    ],
    rows: content.tickets.map((t) => [
      t.id,
      t.from,
      t.subject,
      t.priority ?? '',
      t.category ?? '',
      t.status,
      t.reply,
      t.note,
    ]),
  }
}

export function codeBlocks(content: CodeContent): Block[] {
  const blocks: Block[] = content.files.map((file) => ({
    kind: 'code',
    title: file.name,
    text: file.text,
  }))
  const commits = content.git?.commits ?? []
  if (commits.length > 0) {
    blocks.push({
      kind: 'list',
      ordered: false,
      items: commits.map((c) => `${c.id.slice(0, 7)} ${c.message}`),
    })
  }
  return blocks
}

/** "payRuns" → "Pay runs". */
export function humanise(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase()
}

const isScalar = (v: unknown) =>
  v === null || ['string', 'number', 'boolean'].includes(typeof v)

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (isScalar(value)) return String(value)
  if (Array.isArray(value) && value.every(isScalar)) return value.join(', ')
  const json = JSON.stringify(value)
  return json.length > 120 ? `${json.slice(0, 117)}...` : json
}

/**
 * Any tool's saved data as tables: each list of records becomes a table, and
 * the simple values become a "Details" table. Works for every tool, so new
 * tools are exported without extra code.
 */
export function dataTables(state: unknown, title = 'Details'): ExportTable[] {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return []
  const details: string[][] = []
  const tables: ExportTable[] = []
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined) continue
    if (isScalar(value) || (Array.isArray(value) && value.every(isScalar))) {
      details.push([humanise(key), cellText(value)])
    } else if (Array.isArray(value)) {
      const records = value.filter(
        (v): v is Record<string, unknown> =>
          !!v && typeof v === 'object' && !Array.isArray(v),
      )
      if (records.length === 0) continue
      const head = [...new Set(records.flatMap((r) => Object.keys(r)))]
      tables.push({
        title: humanise(key),
        head: head.map(humanise),
        rows: records.map((r) => head.map((k) => cellText(r[k]))),
      })
    } else {
      tables.push(...dataTables(value, humanise(key)))
    }
  }
  return details.length > 0
    ? [{ title, head: ['Field', 'Value'], rows: details }, ...tables]
    : tables
}

// ---------------------------------------------------------------------------
// Any file
// ---------------------------------------------------------------------------

const table = (t: ExportTable): Block => ({ kind: 'table', table: t })

/**
 * For reading: when a sheet's first row is all labels (as headers usually
 * are), it becomes the table's header instead of the column letters.
 */
export function withHeaderRow(t: ExportTable): ExportTable {
  const first = t.rows[0]
  const isLabel = (v: string) =>
    v.trim() !== '' && Number.isNaN(Number(v.replace(/[,%£$€]/g, '')))
  if (!first || t.rows.length < 2 || !first.every(isLabel)) return t
  return { ...t, head: first, rows: t.rows.slice(1) }
}

/** The blocks that show a file's content. */
export function documentBlocks(document: AnyDocument): Block[] {
  switch (document.kind) {
    case 'sheet':
      return sheetTables(document.content).map((t) => table(withHeaderRow(t)))
    case 'doc':
      return docBlocks(document.content.body)
    case 'slides':
      return slideBlocks(document.content)
    case 'tickets':
      return [table(ticketTable(document.content))]
    case 'code':
      return codeBlocks(document.content)
    case 'tool': {
      const tool = getTool(document.content.tool)
      const parsed = tool?.state.safeParse(document.content.state)
      const state = parsed?.success ? parsed.data : document.content.state
      const summary = tool?.summary && parsed?.success ? tool.summary(parsed.data) : ''
      return [
        ...(summary ? [{ kind: 'paragraph' as const, text: summary }] : []),
        ...dataTables(state).map(table),
      ]
    }
  }
}
