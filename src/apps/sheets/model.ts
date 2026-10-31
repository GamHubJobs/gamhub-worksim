/**
 * Spreadsheet model: pure functions for cell addresses and sheet content.
 * No React, no database. Every function returns new data instead of changing
 * the old data, which makes undo, autosave and version history simple.
 */
import { createId } from '../../lib/ids'
import type { Sheet, SheetContent } from '../../persistence/schemas'

/** Grid size for Phase 0. Will grow (and become virtualised) in Phase 1. */
export const DEFAULT_COLUMN_COUNT = 26
export const DEFAULT_ROW_COUNT = 50

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

/**
 * Returns new content with one cell changed. Setting a cell to an empty value
 * removes it, so only filled cells are ever stored.
 */
export function setCellInput(
  content: SheetContent,
  sheetId: string,
  address: string,
  input: string,
): SheetContent {
  return {
    ...content,
    sheets: content.sheets.map((sheet) => {
      if (sheet.id !== sheetId) return sheet
      const cells = { ...sheet.cells }
      if (input === '') {
        delete cells[address]
      } else {
        cells[address] = { ...cells[address], input }
      }
      return { ...sheet, cells }
    }),
  }
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
