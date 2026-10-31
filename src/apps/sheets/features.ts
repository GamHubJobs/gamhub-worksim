/**
 * Spreadsheet features beyond formulas: charts, conditional formatting, data
 * validation, filtering and sorting. Pure functions on the saved content; the
 * editor only displays their results.
 */
import { createId } from '../../lib/ids'
import type {
  ChartSpec,
  ChartType,
  ConditionalFormat,
  DataValidation,
  FillColor,
  Sheet,
  SheetChart,
  SheetContent,
  SheetDocument,
  SheetFilter,
} from '../../persistence/schemas'
import { displayValue } from './engine/format'
import { shiftFormula } from './engine/references'
import { isError, type CellValue } from './engine/values'
import { createCalculator, type WorkbookCalculator } from './engine/workbook'
import {
  parseAddress,
  parseRange,
  rangeContains,
  rangeToText,
  toAddress,
  type CellRange,
} from './model'

function updateSheet(
  content: SheetContent,
  sheetId: string,
  change: (sheet: Sheet) => Sheet,
): SheetContent {
  return {
    ...content,
    sheets: content.sheets.map((sheet) => (sheet.id === sheetId ? change(sheet) : sheet)),
  }
}

function numeric(value: CellValue): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(/[$,%\s]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asText(value: CellValue): string {
  if (value === null) return ''
  if (isError(value)) return value.code
  return String(value)
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

/**
 * The data for a chart from a range: the first column holds the category
 * labels and the first row the series names (each further column is a
 * series). A range of one column charts that column against row numbers.
 */
export function chartData(
  calculator: WorkbookCalculator,
  sheetId: string,
  range: CellRange,
): Pick<ChartSpec, 'labels' | 'series'> {
  const value = (row: number, column: number) =>
    calculator.getValue(sheetId, toAddress({ row, column }))
  const columns = range.right - range.left + 1

  if (columns === 1) {
    const header = value(range.top, range.left)
    const hasHeader = numeric(header) === null && asText(header) !== ''
    const start = hasHeader ? range.top + 1 : range.top
    const labels: string[] = []
    const values: number[] = []
    for (let row = start; row <= range.bottom; row++) {
      const n = numeric(value(row, range.left))
      if (n === null) continue
      labels.push(String(row + 1))
      values.push(n)
    }
    return { labels, series: [{ name: hasHeader ? asText(header) : 'Values', values }] }
  }

  const labels: string[] = []
  const seriesValues: number[][] = Array.from({ length: columns - 1 }, () => [])
  for (let row = range.top + 1; row <= range.bottom; row++) {
    const label = asText(value(row, range.left))
    const numbers = seriesValues.map((_, i) => numeric(value(row, range.left + 1 + i)))
    // Skip empty rows and rows without any numbers (e.g. a blank line or a note).
    if (label === '' && numbers.every((n) => n === null)) continue
    if (numbers.every((n) => n === null)) continue
    labels.push(label)
    numbers.forEach((n, i) => seriesValues[i].push(n ?? 0))
  }
  return {
    labels,
    series: seriesValues.map((values, i) => ({
      name: asText(value(range.top, range.left + 1 + i)) || `Series ${i + 1}`,
      values,
    })),
  }
}

/** A chart's full specification, with the data as it is now. */
export function chartSpec(
  calculator: WorkbookCalculator,
  sheetId: string,
  chart: SheetChart,
): ChartSpec {
  const range = parseRange(chart.range)
  const data = range ? chartData(calculator, sheetId, range) : { labels: [], series: [] }
  // Pie charts show one series.
  const series = chart.type === 'pie' ? data.series.slice(0, 1) : data.series
  return { type: chart.type, title: chart.title, labels: data.labels, series }
}

export function addChart(
  content: SheetContent,
  sheetId: string,
  range: CellRange,
  type: ChartType,
  title: string,
): { content: SheetContent; chartId: string } {
  const chartId = createId()
  const chart: SheetChart = { id: chartId, type, title, range: rangeToText(range) }
  return {
    chartId,
    content: updateSheet(content, sheetId, (sheet) => ({
      ...sheet,
      charts: [...(sheet.charts ?? []), chart],
    })),
  }
}

export function updateChart(
  content: SheetContent,
  sheetId: string,
  chartId: string,
  changes: Partial<Omit<SheetChart, 'id'>>,
): SheetContent {
  return updateSheet(content, sheetId, (sheet) => ({
    ...sheet,
    charts: (sheet.charts ?? []).map((chart) =>
      chart.id === chartId ? { ...chart, ...changes } : chart,
    ),
  }))
}

export function removeChart(
  content: SheetContent,
  sheetId: string,
  chartId: string,
): SheetContent {
  return updateSheet(content, sheetId, (sheet) => ({
    ...sheet,
    charts: (sheet.charts ?? []).filter((chart) => chart.id !== chartId),
  }))
}

// ---------------------------------------------------------------------------
// Conditional formatting
// ---------------------------------------------------------------------------

export const CONDITION_LABELS: Record<ConditionalFormat['rule']['op'], string> = {
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  eq: 'is equal to',
  neq: 'is not equal to',
  between: 'is between',
  contains: 'contains the text',
  blank: 'is empty',
  notBlank: 'is not empty',
}

/** Whether a value meets a rule's condition. */
export function meetsCondition(
  rule: ConditionalFormat['rule'],
  value: CellValue,
): boolean {
  const text = asText(value)
  switch (rule.op) {
    case 'blank':
      return text === ''
    case 'notBlank':
      return text !== ''
    case 'contains':
      return text.toLowerCase().includes(rule.value.toLowerCase())
  }
  const n = numeric(value)
  const target = Number(rule.value)
  const compareAsNumbers =
    n !== null && rule.value.trim() !== '' && Number.isFinite(target)
  switch (rule.op) {
    case 'eq':
      return compareAsNumbers
        ? n === target
        : text.toLowerCase() === rule.value.toLowerCase()
    case 'neq':
      return compareAsNumbers
        ? n !== target
        : text.toLowerCase() !== rule.value.toLowerCase()
  }
  if (!compareAsNumbers) return false
  switch (rule.op) {
    case 'gt':
      return n > target
    case 'gte':
      return n >= target
    case 'lt':
      return n < target
    case 'lte':
      return n <= target
    case 'between': {
      const other = Number(rule.value2)
      if (!Number.isFinite(other)) return false
      return n >= Math.min(target, other) && n <= Math.max(target, other)
    }
  }
}

export interface ConditionalStyle {
  fill?: FillColor
  bold?: boolean
  textColor?: ConditionalFormat['style']['textColor']
}

/**
 * The extra styles conditional formatting gives each cell of a sheet, by
 * address. Later rules win where they overlap.
 */
export function conditionalStyles(
  calculator: WorkbookCalculator,
  sheet: Sheet,
): Map<string, ConditionalStyle> {
  const styles = new Map<string, ConditionalStyle>()
  for (const format of sheet.conditionalFormats ?? []) {
    const range = parseRange(format.range)
    if (!range) continue
    for (let row = range.top; row <= range.bottom; row++) {
      for (let column = range.left; column <= range.right; column++) {
        const address = toAddress({ row, column })
        if (!meetsCondition(format.rule, calculator.getValue(sheet.id, address))) continue
        styles.set(address, { ...styles.get(address), ...format.style })
      }
    }
  }
  return styles
}

export function addConditionalFormat(
  content: SheetContent,
  sheetId: string,
  format: Omit<ConditionalFormat, 'id'>,
): SheetContent {
  return updateSheet(content, sheetId, (sheet) => ({
    ...sheet,
    conditionalFormats: [
      ...(sheet.conditionalFormats ?? []),
      { id: createId(), ...format },
    ],
  }))
}

export function removeConditionalFormat(
  content: SheetContent,
  sheetId: string,
  formatId: string,
): SheetContent {
  return updateSheet(content, sheetId, (sheet) => ({
    ...sheet,
    conditionalFormats: (sheet.conditionalFormats ?? []).filter((f) => f.id !== formatId),
  }))
}

// ---------------------------------------------------------------------------
// Data validation
// ---------------------------------------------------------------------------

/** The validation rule for a cell, if any (the last matching rule wins). */
export function validationFor(sheet: Sheet, address: string): DataValidation | null {
  const position = parseAddress(address)
  if (!position) return null
  let found: DataValidation | null = null
  for (const validation of sheet.validations ?? []) {
    const range = parseRange(validation.range)
    if (range && rangeContains(range, position)) found = validation
  }
  return found
}

/**
 * Checks what the player typed against the cell's rule. Returns a message
 * explaining the problem, or null when the input is allowed. Empty input
 * (clearing a cell) and formulas are always allowed.
 */
export function checkInput(
  validation: DataValidation | null,
  input: string,
): string | null {
  if (!validation || input.trim() === '' || input.startsWith('=')) return null
  const rule = validation.rule
  if (rule.type === 'list') {
    const match = rule.items.some(
      (item) => item.toLowerCase() === input.trim().toLowerCase(),
    )
    return match ? null : `Choose one of: ${rule.items.join(', ')}.`
  }
  const n = Number(input.replace(/[$,\s]/g, ''))
  if (!Number.isFinite(n)) return 'This cell needs a number.'
  if (rule.wholeNumber && !Number.isInteger(n)) return 'This cell needs a whole number.'
  if (rule.min !== undefined && n < rule.min)
    return `The number must be at least ${rule.min}.`
  if (rule.max !== undefined && n > rule.max)
    return `The number must be at most ${rule.max}.`
  return null
}

/** For list rules: the matching item as written in the list ("yes" → "Yes"). */
export function normaliseInput(validation: DataValidation | null, input: string): string {
  if (validation?.rule.type !== 'list') return input
  return (
    validation.rule.items.find(
      (item) => item.toLowerCase() === input.trim().toLowerCase(),
    ) ?? input
  )
}

export function addValidation(
  content: SheetContent,
  sheetId: string,
  validation: Omit<DataValidation, 'id'>,
): SheetContent {
  return updateSheet(content, sheetId, (sheet) => ({
    ...sheet,
    validations: [...(sheet.validations ?? []), { id: createId(), ...validation }],
  }))
}

export function removeValidation(
  content: SheetContent,
  sheetId: string,
  validationId: string,
): SheetContent {
  return updateSheet(content, sheetId, (sheet) => ({
    ...sheet,
    validations: (sheet.validations ?? []).filter((v) => v.id !== validationId),
  }))
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/** The distinct values shown in a filter column, for choosing which to show. */
export function filterValues(
  calculator: WorkbookCalculator,
  sheet: Sheet,
  filter: SheetFilter,
  column: number,
): string[] {
  const range = parseRange(filter.range)
  if (!range) return []
  const values = new Set<string>()
  for (let row = range.top + 1; row <= range.bottom; row++) {
    values.add(asText(calculator.getValue(sheet.id, toAddress({ row, column }))))
  }
  return [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

/** Rows hidden by the sheet's filter (0-based row numbers). */
export function hiddenRows(calculator: WorkbookCalculator, sheet: Sheet): Set<number> {
  const hidden = new Set<number>()
  const filter = sheet.filter
  const range = filter ? parseRange(filter.range) : null
  if (!filter || !range) return hidden
  const conditions = Object.entries(filter.shown)
  if (conditions.length === 0) return hidden
  for (let row = range.top + 1; row <= range.bottom; row++) {
    for (const [letters, allowed] of conditions) {
      const column = parseAddress(`${letters}1`)?.column
      if (column === undefined) continue
      const text = asText(calculator.getValue(sheet.id, toAddress({ row, column })))
      if (!allowed.includes(text)) {
        hidden.add(row)
        break
      }
    }
  }
  return hidden
}

export function setFilter(
  content: SheetContent,
  sheetId: string,
  filter: SheetFilter | undefined,
): SheetContent {
  return updateSheet(content, sheetId, (sheet) => {
    const next = { ...sheet }
    if (filter) next.filter = filter
    else delete next.filter
    return next
  })
}

/**
 * The data block around a cell: from the cell, the surrounding rows and
 * columns that contain something. Used to filter or sort "the table I'm in".
 */
export function dataRegion(sheet: Sheet, start: CellRange): CellRange {
  if (start.top !== start.bottom || start.left !== start.right) return start
  const filled = (row: number, column: number) =>
    (sheet.cells[toAddress({ row, column })]?.input ?? '') !== ''
  const range = { ...start }
  let grew = true
  while (grew) {
    grew = false
    const tryGrow = (next: CellRange, check: (r: number, c: number) => boolean) => {
      if (next.top < 0 || next.left < 0) return
      for (let r = next.top; r <= next.bottom; r++) {
        for (let c = next.left; c <= next.right; c++) {
          if (!rangeContains(range, { row: r, column: c }) && check(r, c)) {
            Object.assign(range, next)
            grew = true
            return
          }
        }
      }
    }
    tryGrow({ ...range, top: range.top - 1 }, filled)
    tryGrow({ ...range, bottom: range.bottom + 1 }, filled)
    tryGrow({ ...range, left: range.left - 1 }, filled)
    tryGrow({ ...range, right: range.right + 1 }, filled)
  }
  return range
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function compareValues(a: CellValue, b: CellValue): number {
  const emptyA = asText(a) === ''
  const emptyB = asText(b) === ''
  // Empty cells always go last.
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  const na = numeric(a)
  const nb = numeric(b)
  if (na !== null && nb !== null) return na - nb
  if (na !== null) return -1
  if (nb !== null) return 1
  return asText(a).localeCompare(asText(b), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

/**
 * Sorts the rows of a range by one column. With `hasHeader`, the first row
 * stays where it is. Whole rows of the range move together, keeping their
 * formatting; formulas are adjusted as if the row had been cut and pasted.
 */
export function sortRange(
  content: SheetContent,
  calculator: WorkbookCalculator,
  sheetId: string,
  range: CellRange,
  column: number,
  direction: 'asc' | 'desc',
  hasHeader: boolean,
): SheetContent {
  const sheet = content.sheets.find((s) => s.id === sheetId)
  if (!sheet) return content
  const first = hasHeader ? range.top + 1 : range.top
  const rows: number[] = []
  for (let row = first; row <= range.bottom; row++) rows.push(row)
  const sorted = [...rows].sort((a, b) => {
    const result = compareValues(
      calculator.getValue(sheetId, toAddress({ row: a, column })),
      calculator.getValue(sheetId, toAddress({ row: b, column })),
    )
    // Stable, and empty cells stay last in both directions.
    if (result === 0) return a - b
    const emptyFirst = asText(calculator.getValue(sheetId, toAddress({ row: a, column })))
    const emptySecond = asText(
      calculator.getValue(sheetId, toAddress({ row: b, column })),
    )
    if (emptyFirst === '' || emptySecond === '') return result
    return direction === 'asc' ? result : -result
  })

  const cells = { ...sheet.cells }
  for (let row = first; row <= range.bottom; row++) {
    for (let c = range.left; c <= range.right; c++)
      delete cells[toAddress({ row, column: c })]
  }
  sorted.forEach((fromRow, index) => {
    const toRow = first + index
    for (let c = range.left; c <= range.right; c++) {
      const cell = sheet.cells[toAddress({ row: fromRow, column: c })]
      if (!cell) continue
      cells[toAddress({ row: toRow, column: c })] = {
        ...cell,
        input: shiftFormula(cell.input, toRow - fromRow, 0),
      }
    }
  })
  return updateSheet(content, sheetId, (s) => ({ ...s, cells }))
}

/** Whether the first row of a range looks like a header (text above numbers). */
export function looksLikeHeader(
  calculator: WorkbookCalculator,
  sheetId: string,
  range: CellRange,
): boolean {
  if (range.bottom <= range.top) return false
  let textAbove = 0
  let numbersBelow = 0
  for (let c = range.left; c <= range.right; c++) {
    const top = calculator.getValue(sheetId, toAddress({ row: range.top, column: c }))
    const below = calculator.getValue(
      sheetId,
      toAddress({ row: range.top + 1, column: c }),
    )
    if (typeof top === 'string' && top !== '' && numeric(top) === null) textAbove++
    if (numeric(below) !== null) numbersBelow++
  }
  return textAbove > 0 && (numbersBelow > 0 || textAbove === range.right - range.left + 1)
}

// ---------------------------------------------------------------------------
// Copying cells into documents
// ---------------------------------------------------------------------------

/** The cells of a range as displayed (formatted), row by row. */
export function rangeAsText(workbook: SheetDocument, sheetId: string, rangeText: string) {
  const range = parseRange(rangeText.trim().toUpperCase())
  const sheet = workbook.content.sheets.find((s) => s.id === sheetId)
  if (!range || !sheet) return null
  const calculator = createCalculator(workbook.content)
  const rows: string[][] = []
  for (let row = range.top; row <= Math.min(range.bottom, range.top + 49); row++) {
    const cells: string[] = []
    for (
      let column = range.left;
      column <= Math.min(range.right, range.left + 11);
      column++
    ) {
      const address = toAddress({ row, column })
      const cell = sheet.cells[address]
      cells.push(
        displayValue(
          calculator.getValue(sheet.id, address),
          cell?.input ?? '',
          cell?.format,
        ).text,
      )
    }
    rows.push(cells)
  }
  return rows
}
