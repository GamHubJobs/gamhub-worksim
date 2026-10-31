/**
 * Spreadsheet model: pure functions for cell addresses and sheet content.
 * No React, no database. Every function returns new data instead of changing
 * the old data, which makes undo, autosave and version history simple.
 */
import { createId } from '../../lib/ids'
import type { Cell, CellFormat, Sheet, SheetContent } from '../../persistence/schemas'
import { renameSheetInFormula } from './engine/references'

/** Grid size. Content can reach further; the grid grows to show it. */
export const DEFAULT_COLUMN_COUNT = 26
export const DEFAULT_ROW_COUNT = 100
export const DEFAULT_COLUMN_WIDTH = 96
export const MIN_COLUMN_WIDTH = 32
export const MAX_COLUMN_WIDTH = 800

export interface CellPosition {
  /** 0-based row index: row "1" is 0. */
  row: number
  /** 0-based column index: column "A" is 0. */
  column: number
}

/** 0 → "A", 25 → "Z", 26 → "AA", 701 → "ZZ", 702 → "AAA". */
export function columnToLetters(column: number): string {
  let n = column + 1
  let letters = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/** "A" → 0, "Z" → 25, "AA" → 26. */
export function lettersToColumn(letters: string): number {
  let n = 0
  for (const letter of letters) {
    n = n * 26 + (letter.charCodeAt(0) - 64)
  }
  return n - 1
}

/** { row: 0, column: 0 } → "A1". */
export function toAddress({ row, column }: CellPosition): string {
  return `${columnToLetters(column)}${row + 1}`
}

/** "B3" → { row: 2, column: 1 }. Returns null for anything that is not an address. */
export function parseAddress(address: string): CellPosition | null {
  const match = /^([A-Z]{1,3})([1-9][0-9]{0,6})$/.exec(address)
  if (!match) return null
  return { column: lettersToColumn(match[1]), row: Number(match[2]) - 1 }
}

/** A new, empty spreadsheet with one sheet. */
export function createSheetContent(): SheetContent {
  return { sheets: [{ id: createId(), name: 'Sheet1', cells: {} }] }
}

export function getCellInput(sheet: Sheet, address: string): string {
  return sheet.cells[address]?.input ?? ''
}

/** Returns new content with one sheet changed. */
function updateSheet(
  content: SheetContent,
  sheetId: string,
  update: (sheet: Sheet) => Sheet,
): SheetContent {
  return {
    ...content,
    sheets: content.sheets.map((sheet) => (sheet.id === sheetId ? update(sheet) : sheet)),
  }
}

/** Removes empty format fields; returns undefined if nothing is left. */
function cleanFormat(format: CellFormat | undefined): CellFormat | undefined {
  if (!format) return undefined
  const cleaned = Object.fromEntries(
    Object.entries(format).filter(([, value]) => value !== undefined && value !== false),
  ) as CellFormat
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

/**
 * Returns new content with several cells replaced. A cell with no value and no
 * formatting is removed, so only cells that matter are ever stored.
 */
export function setCells(
  content: SheetContent,
  sheetId: string,
  changes: Record<string, Cell | null>,
): SheetContent {
  return updateSheet(content, sheetId, (sheet) => {
    const cells = { ...sheet.cells }
    for (const [address, cell] of Object.entries(changes)) {
      const format = cleanFormat(cell?.format)
      if (!cell || (cell.input === '' && !format)) delete cells[address]
      else cells[address] = format ? { input: cell.input, format } : { input: cell.input }
    }
    return { ...sheet, cells }
  })
}

/** Returns new content with one cell's value changed (its formatting is kept). */
export function setCellInput(
  content: SheetContent,
  sheetId: string,
  address: string,
  input: string,
): SheetContent {
  const sheet = content.sheets.find((s) => s.id === sheetId)
  return setCells(content, sheetId, {
    [address]: { input, format: sheet?.cells[address]?.format },
  })
}

/** Number of filled cells across all sheets. */
export function countFilledCells(content: SheetContent): number {
  return content.sheets.reduce(
    (total, sheet) => total + Object.keys(sheet.cells).length,
    0,
  )
}

/** True if the text looks like a plain number, e.g. "42", "-3.5", "1,250.00". */
export function looksNumeric(text: string): boolean {
  return /^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(text.trim())
}

export function getCell(sheet: Sheet, address: string): Cell | undefined {
  return sheet.cells[address]
}

// ---------------------------------------------------------------------------
// Ranges
// ---------------------------------------------------------------------------

/** A rectangle of cells, corners included (0-based). */
export interface CellRange {
  top: number
  left: number
  bottom: number
  right: number
}

/** The range between two corner cells, in any order. */
export function rangeBetween(a: CellPosition, b: CellPosition): CellRange {
  return {
    top: Math.min(a.row, b.row),
    left: Math.min(a.column, b.column),
    bottom: Math.max(a.row, b.row),
    right: Math.max(a.column, b.column),
  }
}

/** "B2:D5", or "B2" for a single cell. */
export function rangeToText(range: CellRange): string {
  const start = toAddress({ row: range.top, column: range.left })
  const end = toAddress({ row: range.bottom, column: range.right })
  return start === end ? start : `${start}:${end}`
}

/** "B2:D5" or "B2" → range. Returns null if the text is not a range. */
export function parseRange(text: string): CellRange | null {
  const [first, second = first, extra] = text.trim().toUpperCase().split(':')
  if (extra !== undefined) return null
  const a = parseAddress(first)
  const b = parseAddress(second)
  return a && b ? rangeBetween(a, b) : null
}

export function rangeContains(range: CellRange, { row, column }: CellPosition): boolean {
  return (
    row >= range.top &&
    row <= range.bottom &&
    column >= range.left &&
    column <= range.right
  )
}

/** Every address in a range, row by row. */
export function rangeAddresses(range: CellRange): string[] {
  const addresses: string[] = []
  for (let row = range.top; row <= range.bottom; row++) {
    for (let column = range.left; column <= range.right; column++) {
      addresses.push(toAddress({ row, column }))
    }
  }
  return addresses
}

/** Clears the values in a range. Formatting stays, as in real spreadsheets. */
export function clearRange(
  content: SheetContent,
  sheetId: string,
  range: CellRange,
): SheetContent {
  const sheet = content.sheets.find((s) => s.id === sheetId)
  if (!sheet) return content
  const changes: Record<string, Cell | null> = {}
  for (const address of rangeAddresses(range)) {
    const cell = sheet.cells[address]
    if (cell?.input) changes[address] = { input: '', format: cell.format }
  }
  return Object.keys(changes).length > 0 ? setCells(content, sheetId, changes) : content
}

/**
 * Changes formatting in a range. Fields set to `undefined` are removed, e.g.
 * `{ bold: undefined }` makes cells not bold.
 */
export function formatRange(
  content: SheetContent,
  sheetId: string,
  range: CellRange,
  patch: Partial<Record<keyof CellFormat, CellFormat[keyof CellFormat] | undefined>>,
): SheetContent {
  const sheet = content.sheets.find((s) => s.id === sheetId)
  if (!sheet) return content
  const changes: Record<string, Cell | null> = {}
  for (const address of rangeAddresses(range)) {
    const cell = sheet.cells[address]
    changes[address] = {
      input: cell?.input ?? '',
      format: { ...cell?.format, ...patch } as CellFormat,
    }
  }
  return setCells(content, sheetId, changes)
}

export function getColumnWidth(sheet: Sheet, column: number): number {
  return sheet.columnWidths?.[columnToLetters(column)] ?? DEFAULT_COLUMN_WIDTH
}

export function setColumnWidth(
  content: SheetContent,
  sheetId: string,
  column: number,
  width: number,
): SheetContent {
  const clamped = Math.round(
    Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width)),
  )
  return updateSheet(content, sheetId, (sheet) => {
    const columnWidths = { ...sheet.columnWidths }
    if (clamped === DEFAULT_COLUMN_WIDTH) delete columnWidths[columnToLetters(column)]
    else columnWidths[columnToLetters(column)] = clamped
    return { ...sheet, columnWidths }
  })
}

/** Rows and columns that contain something, so the grid can grow to show it all. */
export function usedSize(sheet: Sheet): { rows: number; columns: number } {
  let rows = 0
  let columns = 0
  for (const address of Object.keys(sheet.cells)) {
    const position = parseAddress(address)
    if (!position) continue
    rows = Math.max(rows, position.row + 1)
    columns = Math.max(columns, position.column + 1)
  }
  return { rows, columns }
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

export function addSheet(content: SheetContent): {
  content: SheetContent
  sheetId: string
} {
  const names = new Set(content.sheets.map((s) => s.name.toLowerCase()))
  let n = content.sheets.length + 1
  while (names.has(`sheet${n}`)) n++
  const sheet: Sheet = { id: createId(), name: `Sheet${n}`, cells: {} }
  return {
    content: { ...content, sheets: [...content.sheets, sheet] },
    sheetId: sheet.id,
  }
}

/** Checks a new sheet name. Returns an error message, or null if it is fine. */
export function checkSheetName(
  content: SheetContent,
  sheetId: string,
  name: string,
): string | null {
  const trimmed = name.trim()
  if (trimmed === '') return 'A sheet name cannot be empty.'
  if (trimmed.length > 100) return 'A sheet name can be at most 100 characters.'
  if (/[!'[\]*?/\\:]/.test(trimmed)) {
    return "A sheet name cannot contain any of these characters: ! ' [ ] * ? / \\ :"
  }
  const taken = content.sheets.some(
    (s) => s.id !== sheetId && s.name.toLowerCase() === trimmed.toLowerCase(),
  )
  return taken ? `There is already a sheet called "${trimmed}".` : null
}

/** Renames a sheet and updates every formula that refers to it. */
export function renameSheet(
  content: SheetContent,
  sheetId: string,
  name: string,
): SheetContent {
  const newName = name.trim()
  const oldName = content.sheets.find((s) => s.id === sheetId)?.name
  if (oldName === undefined || oldName === newName) return content
  return {
    ...content,
    sheets: content.sheets.map((sheet) => {
      const cells = Object.fromEntries(
        Object.entries(sheet.cells).map(([address, cell]) => [
          address,
          { ...cell, input: renameSheetInFormula(cell.input, oldName, newName) },
        ]),
      )
      return { ...sheet, cells, ...(sheet.id === sheetId ? { name: newName } : {}) }
    }),
  }
}
