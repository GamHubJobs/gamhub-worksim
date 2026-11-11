/**
 * Between Grid Craft's workbooks and WorkSim's own sheet format.
 *
 * - `readWorkbook`: Grid Craft's workbook (its JSON, `file.saveBytes
 *   {format: 'json'}`) as WorkSim sheets: what each cell holds (the value
 *   typed, or the formula), its format, the column widths and the charts. The
 *   graders, WorkSim AI and the exports read this, so they work the same
 *   whichever editor was used. The workbook itself is kept as an .xlsx file.
 * - `workbookCommands`: the commands that build a WorkSim workbook in a blank
 *   Grid Craft workbook (a task's starting workbook, or one made in the basic
 *   editor).
 *
 * Grid Craft can do much more than WorkSim's format holds (borders, fonts,
 * merged cells, pivot tables…). That is all kept in the .xlsx file; only what
 * the format holds is read here.
 */
import { createId } from '../../../lib/ids'
import type {
  Cell,
  CellFormat,
  ConditionalFormat,
  DataValidation,
  Sheet,
  SheetChart,
  SheetContent,
} from '../../../persistence/schemas'
import { FILL_COLORS, TEXT_COLORS } from '../../../persistence/schemas'
import { DEFAULT_DECIMALS } from '../engine/format'
import { isFormula, parseLiteral } from '../engine/values'
import { columnToLetters, lettersToColumn, parseRange, rangeToText } from '../model'

// ---------------------------------------------------------------------------
// Grid Craft's workbook JSON (the parts read here)
// ---------------------------------------------------------------------------

export type GcColor =
  'Auto' | { Rgb: number } | { Theme: [number, number] } | { Indexed: number } | null

export interface GcStyle {
  font?: { bold?: boolean; italic?: boolean; underline?: string; color?: GcColor }
  fill?: { pattern?: string; fg?: GcColor }
  align?: { h?: string }
  num_fmt?: string
}

export interface GcCell {
  value?: { t: string; v?: unknown } | null
  formula?: { text: string } | null
  style?: number
}

export interface GcChart {
  id: number
  kind: string
  title?: string | null
  series?: Array<{
    name?: string | null
    categories?: string | null
    values?: string | null
  }>
}

export interface GcSheet {
  name: string
  cells?: { bands?: Record<string, { rows?: Record<string, Record<string, GcCell>> }> }
  cols?: Record<string, { size?: number; custom?: boolean }>
  default_col_width?: number
  charts?: GcChart[]
}

export interface GcWorkbook {
  sheets: GcSheet[]
  styles?: { styles?: GcStyle[] }
  theme?: { colors?: number[] }
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

type Rgb = [number, number, number]

/** What WorkSim's colours are in Grid Craft (light fills, readable text). */
export const FILL_RGB: Record<(typeof FILL_COLORS)[number], string> = {
  yellow: '#FFF2A8',
  green: '#C6EFCE',
  blue: '#DDEBF7',
  red: '#FFC7CE',
  gray: '#E7E6E6',
}
export const TEXT_RGB: Record<(typeof TEXT_COLORS)[number], string> = {
  red: '#C00000',
  green: '#00803C',
  blue: '#0B5CAD',
  amber: '#B45309',
  gray: '#6B7280',
}

const toRgb = (value: number): Rgb => [
  (value >> 16) & 255,
  (value >> 8) & 255,
  value & 255,
]

/** A theme colour, lightened or darkened by its tint (thousandths, -1000 to 1000). */
function themeRgb(theme: number[] | undefined, index: number, tint: number): Rgb | null {
  const base = theme?.[index]
  if (base === undefined) return null
  const t = tint / 1000
  return toRgb(base).map((c) =>
    Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t),
  ) as Rgb
}

function rgbOf(color: GcColor | undefined, theme: number[] | undefined): Rgb | null {
  if (!color || color === 'Auto') return null
  if ('Rgb' in color) return toRgb(color.Rgb)
  if ('Theme' in color) return themeRgb(theme, color.Theme[0], color.Theme[1])
  return null
}

/** Hue (0–360), saturation and lightness (0–1). */
function hsl([r, g, b]: Rgb): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === rr
      ? ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60
      : max === gg
        ? ((bb - rr) / d + 2) * 60
        : ((rr - gg) / d + 4) * 60
  return [h, s, l]
}

/** The WorkSim colour a Grid Craft colour is closest to (by hue), or none for white/black. */
function nearest<T extends string>(
  rgb: Rgb | null,
  pick: (hue: number) => T,
  gray: T | null,
): T | undefined {
  if (!rgb) return undefined
  const [h, s, l] = hsl(rgb)
  if (s < 0.15 || l > 0.97 || l < 0.08)
    return l > 0.97 || l < 0.08 ? undefined : (gray ?? undefined)
  return pick(h)
}

const fillOf = (rgb: Rgb | null) =>
  nearest<(typeof FILL_COLORS)[number]>(
    rgb,
    (h) => (h < 20 || h >= 290 ? 'red' : h < 75 ? 'yellow' : h < 170 ? 'green' : 'blue'),
    'gray',
  )

const textColorOf = (rgb: Rgb | null) =>
  nearest<(typeof TEXT_COLORS)[number]>(
    rgb,
    (h) => (h < 15 || h >= 290 ? 'red' : h < 60 ? 'amber' : h < 170 ? 'green' : 'blue'),
    'gray',
  )

// ---------------------------------------------------------------------------
// Number formats
// ---------------------------------------------------------------------------

/** The format code for a WorkSim number format ("$"#,##0.00, 0%, #,##0.00). */
export function numberFormatCode(format: CellFormat): string | null {
  const kind = format.numberFormat
  if (!kind) return null
  const decimals = format.decimals ?? DEFAULT_DECIMALS[kind]
  const fraction = decimals > 0 ? `.${'0'.repeat(decimals)}` : ''
  if (kind === 'percent') return `0${fraction}%`
  if (kind === 'currency') return `"$"#,##0${fraction}`
  return `#,##0${fraction}`
}

/** What a Grid Craft format code means in WorkSim's terms (nothing for dates, text, General). */
export function numberFormatOf(
  code: string | undefined,
): Pick<CellFormat, 'numberFormat' | 'decimals'> {
  if (!code || code === 'General' || code === '@') return {}
  const first = code.split(';')[0]
  // Literal text and colours/locales do not decide the kind, except a currency locale.
  const currencyLocale = /\[\$[^\]-]*[$€£¥][^\]]*\]/.test(first)
  const bare = first.replace(/"[^"]*"|\\.|\[[^\]]*\]|_.|\*./g, (part) =>
    /^"[$€£¥]"$/.test(part) || /^\\[$€£¥]$/.test(part) ? '$' : '',
  )
  if (/[ymdhs]/i.test(bare.replace(/E[+-]/gi, ''))) return {}
  if (!/[0#?]/.test(bare)) return {}
  const decimals = (bare.match(/\.([0#?]*)/)?.[1] ?? '').replace(/[#?]/g, '').length
  const kind: NonNullable<CellFormat['numberFormat']> = bare.includes('%')
    ? 'percent'
    : currencyLocale || /[$€£¥]/.test(bare)
      ? 'currency'
      : 'number'
  return decimals === DEFAULT_DECIMALS[kind]
    ? { numberFormat: kind }
    : { numberFormat: kind, decimals }
}

// ---------------------------------------------------------------------------
// Reading Grid Craft's workbook
// ---------------------------------------------------------------------------

function formatOf(
  style: GcStyle | undefined,
  theme: number[] | undefined,
): CellFormat | undefined {
  if (!style) return undefined
  const format: CellFormat = {}
  if (style.font?.bold) format.bold = true
  if (style.font?.italic) format.italic = true
  if (style.font?.underline && style.font.underline !== 'None') format.underline = true
  const text = textColorOf(rgbOf(style.font?.color, theme))
  if (text) format.textColor = text
  if (style.fill?.pattern && style.fill.pattern !== 'None') {
    const fill = fillOf(rgbOf(style.fill.fg, theme))
    if (fill) format.fill = fill
  }
  const h = style.align?.h
  if (h === 'Left' || h === 'Center' || h === 'Right')
    format.align = h.toLowerCase() as CellFormat['align']
  Object.assign(format, numberFormatOf(style.num_fmt))
  return Object.keys(format).length ? format : undefined
}

/** What the player typed, as WorkSim keeps it ("42", "=SUM(A1:A3)", "TRUE"). */
function inputOf(cell: GcCell): string {
  if (cell.formula?.text) return `=${cell.formula.text}`
  const value = cell.value
  if (!value) return ''
  switch (value.t) {
    case 'Number':
      return typeof value.v === 'number' && Number.isFinite(value.v)
        ? String(value.v)
        : ''
    case 'Bool':
      return value.v ? 'TRUE' : 'FALSE'
    case 'Text': {
      const text = typeof value.v === 'string' ? value.v : String(value.v ?? '')
      // Text WorkSim would read as something else ("00123", "TRUE", "=x") keeps an apostrophe.
      return text !== '' && (isFormula(text) || parseLiteral(text).value !== text)
        ? `'${text}`
        : text
    }
    case 'Error':
      return typeof value.v === 'string' ? value.v : String(value.v ?? '')
    default:
      return typeof value.v === 'string' || typeof value.v === 'number'
        ? String(value.v)
        : ''
  }
}

/** A formula without the spaces and case that do not change it (text in quotes kept). */
const formulaKey = (input: string) =>
  input.replace(/"[^"]*"|[^"]+/g, (part) =>
    part.startsWith('"') ? part : part.replace(/\s+/g, '').toUpperCase(),
  )

/**
 * The input to keep for a cell: the one saved before when it means the same
 * (Grid Craft keeps 1200.50 as 1200.5, and writes formulas in capitals), so a
 * cell the player did not touch is exactly as it was.
 */
function keepInput(before: string | undefined, now: string): string {
  if (before === undefined || before === now) return now
  if (isFormula(before) || isFormula(now))
    return isFormula(before) && isFormula(now) && formulaKey(before) === formulaKey(now)
      ? before
      : now
  const a = parseLiteral(before).value
  const b = parseLiteral(now).value
  if (typeof a === 'number' && typeof b === 'number')
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)) ? before : now
  return a === b ? before : now
}

/** "'My Sheet'!$A$2:$B$9" → the sheet and the range (without $). */
export function splitReference(
  ref: string,
): { sheet: string | null; range: string } | null {
  const match = /^(?:(?:'((?:[^']|'')+)'|([^!]+))!)?(.+)$/.exec(ref.trim())
  if (!match) return null
  const sheet = match[1]?.replace(/''/g, "'") ?? match[2] ?? null
  const range = match[3].replace(/\$/g, '')
  return parseRange(range) ? { sheet, range } : null
}

const CHART_KINDS: Array<[RegExp, SheetChart['type']]> = [
  [/^Bar/, 'bar'],
  [/^Line/, 'line'],
  [/^(Pie|Doughnut)/, 'pie'],
]

/** A Grid Craft chart: its type, title and the cells it is drawn from (all of them). */
function chartOf(chart: GcChart, sheetName: string, id: string): SheetChart | null {
  const ranges = (chart.series ?? [])
    .flatMap((s) => [s.categories, s.values, s.name])
    .flatMap((ref) => (ref ? [splitReference(ref)] : []))
    .filter(
      (r): r is NonNullable<typeof r> => !!r && (r.sheet ?? sheetName) === sheetName,
    )
    .map((r) => parseRange(r.range)!)
  if (ranges.length === 0) return null
  const range = rangeToText({
    top: Math.min(...ranges.map((r) => r.top)),
    left: Math.min(...ranges.map((r) => r.left)),
    bottom: Math.max(...ranges.map((r) => r.bottom)),
    right: Math.max(...ranges.map((r) => r.right)),
  })
  const type = CHART_KINDS.find(([pattern]) => pattern.test(chart.kind))?.[1] ?? 'column'
  return { id, type, title: (chart.title ?? '').slice(0, 200), range }
}

/**
 * Grid Craft's workbook in WorkSim's format. `previous` is what was saved
 * before: sheets and charts keep their ids, and what Grid Craft does not
 * report here (conditional formats, validations, filters) is kept from it.
 */
export function readWorkbook(book: GcWorkbook, previous?: SheetContent): SheetContent {
  const styles = book.styles?.styles ?? []
  const theme = book.theme?.colors
  const used = new Set<string>()
  const sheets: Sheet[] = book.sheets.map((gc, index) => {
    const before =
      previous?.sheets.find((s) => s.name === gc.name && !used.has(s.id)) ??
      (previous?.sheets[index] && !used.has(previous.sheets[index].id)
        ? previous.sheets[index]
        : undefined)
    if (before) used.add(before.id)

    const cells: Record<string, Cell> = {}
    for (const band of Object.values(gc.cells?.bands ?? {}))
      for (const [row, columns] of Object.entries(band.rows ?? {}))
        for (const [column, cell] of Object.entries(columns)) {
          const address = `${columnToLetters(Number(column))}${Number(row) + 1}`
          const input = keepInput(before?.cells[address]?.input, inputOf(cell))
          const format = formatOf(styles[cell.style ?? 0], theme)
          if (input === '' && !format) continue
          cells[address] = format ? { input, format } : { input }
        }

    const widths: Record<string, number> = {}
    const fallback = gc.default_col_width ?? 64
    for (const [column, info] of Object.entries(gc.cols ?? {})) {
      const size = Math.round(info.size ?? fallback)
      if (size !== Math.round(fallback) || info.custom)
        widths[columnToLetters(Number(column))] = Math.min(800, Math.max(20, size))
    }

    const charts = (gc.charts ?? [])
      .map((chart, i) => chartOf(chart, gc.name, before?.charts?.[i]?.id ?? createId()))
      .filter((c): c is SheetChart => !!c)

    const sheet: Sheet = {
      id: before?.id ?? createId(),
      name: gc.name.slice(0, 100) || `Sheet${index + 1}`,
      cells,
    }
    if (Object.keys(widths).length) sheet.columnWidths = widths
    if (charts.length) sheet.charts = charts
    if (before?.conditionalFormats?.length)
      sheet.conditionalFormats = before.conditionalFormats
    if (before?.validations?.length) sheet.validations = before.validations
    if (before?.filter) sheet.filter = before.filter
    return sheet
  })
  return { sheets: sheets.length ? sheets : (previous?.sheets ?? []) }
}

// ---------------------------------------------------------------------------
// Building a WorkSim workbook in Grid Craft
// ---------------------------------------------------------------------------

export type Command = [command: string, params: Record<string, unknown>]

const CF_OPERATORS: Partial<Record<ConditionalFormat['rule']['op'], string>> = {
  gt: 'greater',
  gte: 'greaterOrEqual',
  lt: 'less',
  lte: 'lessOrEqual',
  eq: 'equal',
  neq: 'notEqual',
  between: 'between',
}

/** A rule's value as Grid Craft takes it: a number, or a quoted text. */
const ruleValue = (value: string) =>
  value.trim() !== '' && Number.isFinite(Number(value))
    ? value.trim()
    : `"${value.replace(/"/g, '""')}"`

function conditionalFormatCommand(cf: ConditionalFormat): Command {
  const style: Record<string, unknown> = {}
  if (cf.style.fill) style.fill = FILL_RGB[cf.style.fill]
  if (cf.style.bold || cf.style.textColor)
    style.font = {
      ...(cf.style.bold ? { bold: true } : {}),
      ...(cf.style.textColor ? { color: TEXT_RGB[cf.style.textColor] } : {}),
    }
  const { op, value, value2 } = cf.rule
  const rule: Record<string, unknown> =
    op === 'contains'
      ? { type: 'containsText', text: value }
      : op === 'blank'
        ? { type: 'blanks' }
        : op === 'notBlank'
          ? { type: 'noBlanks' }
          : {
              type: 'cellIs',
              operator: CF_OPERATORS[op],
              value: ruleValue(value),
              ...(op === 'between' ? { value2: ruleValue(value2 ?? value) } : {}),
            }
  return ['home.conditionalFormat', { range: cf.range, rule: { ...rule, style } }]
}

function validationCommand(v: DataValidation): Command {
  if (v.rule.type === 'list')
    return [
      'data.validation',
      {
        range: v.range,
        type: 'list',
        formula1: `"${v.rule.items.map((item) => item.replace(/"/g, '""')).join(',')}"`,
        dropdown: true,
      },
    ]
  const { min, max, wholeNumber } = v.rule
  const type = wholeNumber ? 'whole' : 'decimal'
  if (min !== undefined && max !== undefined)
    return [
      'data.validation',
      {
        range: v.range,
        type,
        operator: 'between',
        formula1: String(min),
        formula2: String(max),
      },
    ]
  if (min !== undefined)
    return [
      'data.validation',
      { range: v.range, type, operator: 'greaterOrEqual', formula1: String(min) },
    ]
  if (max !== undefined)
    return [
      'data.validation',
      { range: v.range, type, operator: 'lessOrEqual', formula1: String(max) },
    ]
  return [
    'data.validation',
    { range: v.range, type, operator: 'greaterOrEqual', formula1: '-1E+307' },
  ]
}

/** Cells that share a value of one format property, as one multi-area range per value. */
function groups(
  sheet: Sheet,
  value: (format: CellFormat) => string | boolean | undefined,
) {
  const byValue = new Map<string | boolean, string[]>()
  for (const [address, cell] of Object.entries(sheet.cells)) {
    const v = cell.format ? value(cell.format) : undefined
    if (v === undefined || v === false) continue
    byValue.set(v, [...(byValue.get(v) ?? []), address])
  }
  return [...byValue].map(([v, addresses]) => [v, addresses.join(',')] as const)
}

/** A typed input as the value WorkSim gives it (a formula stays a formula). */
function typedValue(input: string): string | number | boolean {
  if (isFormula(input)) return input
  const value = parseLiteral(input).value
  return value === null ? '' : typeof value === 'object' ? input : value
}

const ALIGN_COMMANDS = {
  left: 'home.alignLeft',
  center: 'home.alignCenter',
  right: 'home.alignRight',
}

/**
 * The commands that build this workbook in a new, blank Grid Craft workbook
 * (which has one sheet, "Sheet1"). They run in order.
 */
export function workbookCommands(content: SheetContent): Command[] {
  const commands: Command[] = []
  content.sheets.forEach((sheet, index) => {
    commands.push(
      index === 0
        ? ['sheet.rename', { sheet: 0, name: sheet.name }]
        : ['home.insertSheet', { name: sheet.name, before: index }],
    )
  })
  for (const sheet of content.sheets) {
    commands.push(['sheet.activate', { sheet: sheet.name }])
    // Every value and formula at once, as typed.
    const positions = Object.keys(sheet.cells).flatMap((address) => {
      const match = /^([A-Z]+)(\d+)$/.exec(address)
      return match
        ? [{ address, row: Number(match[2]) - 1, column: lettersToColumn(match[1]) }]
        : []
    })
    const filled = positions.filter((p) => sheet.cells[p.address].input !== '')
    if (filled.length) {
      const rows = Math.max(...filled.map((p) => p.row)) + 1
      const columns = Math.max(...filled.map((p) => p.column)) + 1
      const values: Array<Array<string | number | boolean | null>> = Array.from(
        { length: rows },
        () => Array<string | number | boolean | null>(columns).fill(null),
      )
      for (const p of filled)
        values[p.row][p.column] = typedValue(sheet.cells[p.address].input)
      // As WorkSim reads them: numbers and TRUE/FALSE as such, all other text as it is.
      commands.push(['range.setValues', { range: 'A1', values, parse: false }])
    }
    // Formats, one command per kind of formatting.
    for (const [, range] of groups(sheet, (f) => f.bold))
      commands.push(['home.bold', { range, on: true }])
    for (const [, range] of groups(sheet, (f) => f.italic))
      commands.push(['home.italic', { range, on: true }])
    for (const [, range] of groups(sheet, (f) => f.underline))
      commands.push(['home.underline', { range, on: true }])
    for (const [fill, range] of groups(sheet, (f) => f.fill))
      commands.push([
        'home.fillColor',
        { range, color: FILL_RGB[fill as keyof typeof FILL_RGB] },
      ])
    for (const [color, range] of groups(sheet, (f) => f.textColor))
      commands.push([
        'home.fontColor',
        { range, color: TEXT_RGB[color as keyof typeof TEXT_RGB] },
      ])
    for (const [align, range] of groups(sheet, (f) => f.align))
      commands.push([ALIGN_COMMANDS[align as keyof typeof ALIGN_COMMANDS], { range }])
    for (const [code, range] of groups(sheet, (f) => numberFormatCode(f) ?? undefined))
      commands.push(['home.numberFormat', { range, code }])
    for (const [letters, width] of Object.entries(sheet.columnWidths ?? {}))
      commands.push(['home.columnWidth', { cols: `${letters}:${letters}`, width }])
    for (const validation of sheet.validations ?? [])
      commands.push(validationCommand(validation))
    for (const cf of sheet.conditionalFormats ?? [])
      commands.push(conditionalFormatCommand(cf))
    if (sheet.filter) commands.push(['data.filter', { range: sheet.filter.range }])
    for (const chart of sheet.charts ?? [])
      commands.push([
        'insert.chart',
        { range: chart.range, type: chart.type, title: chart.title },
      ])
  }
  if (content.sheets.length) {
    commands.push(['sheet.activate', { sheet: content.sheets[0].name }])
    commands.push(['selection.set', { range: 'A1' }])
  }
  return commands
}

/**
 * A short fingerprint of a workbook's sheets, to know whether the kept .xlsx
 * file still matches them (it does not after an edit in the basic editor, or
 * a version restored from before Grid Craft).
 */
export function fingerprint(content: SheetContent): string {
  const text = JSON.stringify(content.sheets)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
