/**
 * Copy, cut, paste and fill. Pure functions: they take content and return new
 * content.
 *
 * Inside WorkSim, copying keeps formulas and formatting, and formulas are
 * adjusted to their new position (=B2*C2 pasted one row lower becomes
 * =B3*C3). Other programs receive the values as tab-separated text, which
 * Excel, Google Sheets and text editors all understand. Text pasted from other
 * programs is split into cells the same way.
 */
import type { Cell, SheetContent } from '../../persistence/schemas'
import { shiftFormula } from './engine/references'
import {
  rangeAddresses,
  setCells,
  toAddress,
  type CellPosition,
  type CellRange,
} from './model'

export interface CopiedCells {
  sheetId: string
  range: CellRange
  /** The copied cells, row by row; null for empty cells. */
  rows: Array<Array<Cell | null>>
  /** The same cells as text for other programs. */
  text: string
  /** Cut cells are moved (not copied) when pasted. */
  cut: boolean
}

export function copyCells(
  content: SheetContent,
  sheetId: string,
  range: CellRange,
  displayText: (address: string) => string,
  cut = false,
): CopiedCells | null {
  const sheet = content.sheets.find((s) => s.id === sheetId)
  if (!sheet) return null
  const rows: Array<Array<Cell | null>> = []
  const textRows: string[][] = []
  for (let row = range.top; row <= range.bottom; row++) {
    const cells: Array<Cell | null> = []
    const texts: string[] = []
    for (let column = range.left; column <= range.right; column++) {
      const address = toAddress({ row, column })
      cells.push(sheet.cells[address] ?? null)
      texts.push(displayText(address))
    }
    rows.push(cells)
    textRows.push(texts)
  }
  return { sheetId, range, rows, text: toTsv(textRows), cut }
}

export interface PasteResult {
  content: SheetContent
  /** Where the cells were pasted, to select it afterwards. */
  range: CellRange
}

/**
 * Pastes copied cells with their top-left corner at the selection. If the
 * selection is a multiple of the copied size (e.g. one cell copied into ten),
 * the copy is repeated to fill it.
 */
export function pasteCells(
  content: SheetContent,
  sheetId: string,
  selection: CellRange,
  copied: CopiedCells,
): PasteResult {
  const height = copied.rows.length
  const width = copied.rows[0]?.length ?? 0
  const selectedHeight = selection.bottom - selection.top + 1
  const selectedWidth = selection.right - selection.left + 1
  const repeatDown =
    !copied.cut && selectedHeight % height === 0 ? selectedHeight / height : 1
  const repeatRight =
    !copied.cut && selectedWidth % width === 0 ? selectedWidth / width : 1

  const changes: Record<string, Cell | null> = {}

  // A cut moves the cells: the old place is emptied first (pasting may overlap it).
  if (copied.cut) {
    for (const address of rangeAddresses(copied.range)) changes[address] = null
  }

  for (let repeatRow = 0; repeatRow < repeatDown; repeatRow++) {
    for (let repeatColumn = 0; repeatColumn < repeatRight; repeatColumn++) {
      copied.rows.forEach((cells, r) =>
        cells.forEach((cell, c) => {
          const row = selection.top + repeatRow * height + r
          const column = selection.left + repeatColumn * width + c
          const rowOffset = row - (copied.range.top + r)
          const columnOffset = column - (copied.range.left + c)
          changes[toAddress({ row, column })] = cell
            ? {
                // Moved formulas keep pointing at the same cells; copies adjust.
                input: copied.cut
                  ? cell.input
                  : shiftFormula(cell.input, rowOffset, columnOffset),
                format: cell.format,
              }
            : null
        }),
      )
    }
  }

  const range: CellRange = {
    top: selection.top,
    left: selection.left,
    bottom: selection.top + height * repeatDown - 1,
    right: selection.left + width * repeatRight - 1,
  }
  // Cutting from one sheet and pasting into another: clear the source sheet separately.
  if (copied.cut && copied.sheetId !== sheetId) {
    const cleared = Object.fromEntries(rangeAddresses(copied.range).map((a) => [a, null]))
    const withoutSource = setCells(content, copied.sheetId, cleared)
    const pasted = Object.fromEntries(
      Object.entries(changes).filter(([address]) =>
        rangeAddresses(range).includes(address),
      ),
    )
    return { content: setCells(withoutSource, sheetId, pasted), range }
  }
  return { content: setCells(content, sheetId, changes), range }
}

/** Pastes plain text (e.g. from Excel or an email) starting at a cell. */
export function pasteText(
  content: SheetContent,
  sheetId: string,
  at: CellPosition,
  text: string,
): PasteResult {
  const rows = parseTsv(text)
  const sheet = content.sheets.find((s) => s.id === sheetId)
  const changes: Record<string, Cell | null> = {}
  rows.forEach((values, r) =>
    values.forEach((input, c) => {
      const address = toAddress({ row: at.row + r, column: at.column + c })
      changes[address] = { input, format: sheet?.cells[address]?.format }
    }),
  )
  const width = Math.max(1, ...rows.map((row) => row.length))
  return {
    content: setCells(content, sheetId, changes),
    range: {
      top: at.row,
      left: at.column,
      bottom: at.row + Math.max(1, rows.length) - 1,
      right: at.column + width - 1,
    },
  }
}

/**
 * Copies the top row of the range into the rows below it (Ctrl+D), or the
 * left column into the columns to its right (Ctrl+R), adjusting formulas.
 */
export function fill(
  content: SheetContent,
  sheetId: string,
  range: CellRange,
  direction: 'down' | 'right',
): SheetContent {
  const sheet = content.sheets.find((s) => s.id === sheetId)
  if (!sheet) return content
  const changes: Record<string, Cell | null> = {}
  for (let row = range.top; row <= range.bottom; row++) {
    for (let column = range.left; column <= range.right; column++) {
      const sourceRow = direction === 'down' ? range.top : row
      const sourceColumn = direction === 'right' ? range.left : column
      if (row === sourceRow && column === sourceColumn) continue
      const source = sheet.cells[toAddress({ row: sourceRow, column: sourceColumn })]
      changes[toAddress({ row, column })] = source
        ? {
            input: shiftFormula(source.input, row - sourceRow, column - sourceColumn),
            format: source.format,
          }
        : null
    }
  }
  return setCells(content, sheetId, changes)
}

// ---------------------------------------------------------------------------
// Tab-separated text, as used by every spreadsheet program's clipboard
// ---------------------------------------------------------------------------

export function toTsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) =>
          /[\t\n\r"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value,
        )
        .join('\t'),
    )
    .join('\n')
}

/** Reads tab-separated text. Quoted values may contain tabs and line breaks. */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let i = 0
  let quoted = false
  const normalised = text.replace(/\r\n?/g, '\n').replace(/\n$/, '')

  while (i < normalised.length) {
    const char = normalised[i]
    if (quoted) {
      if (char === '"' && normalised[i + 1] === '"') {
        value += '"'
        i += 2
        continue
      }
      if (char === '"') quoted = false
      else value += char
      i++
      continue
    }
    if (char === '"' && value === '') {
      quoted = true
    } else if (char === '\t') {
      row.push(value)
      value = ''
    } else if (char === '\n') {
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
    i++
  }
  row.push(value)
  rows.push(row)
  return rows
}
