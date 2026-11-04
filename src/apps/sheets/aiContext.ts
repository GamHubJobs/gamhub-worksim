/**
 * What a sheet offers WorkSim AI: the active cell (its formula, what it
 * shows, and the numbers next to it, for a formula suggestion) and the
 * selected table (as text, and as columns of numbers for the built-in
 * analysis). Kept small: at most 30 rows and 8 columns of the table.
 */
import type { ContextItem } from '../../ai/types'
import type { Sheet } from '../../persistence/schemas'
import { displayValue } from './engine/format'
import { isError, type CellValue } from './engine/values'
import type { WorkbookCalculator } from './engine/workbook'
import { columnToLetters, toAddress, type CellPosition, type CellRange } from './model'

const MAX_ROWS = 30
const MAX_COLUMNS = 8

function shown(sheet: Sheet, calculator: WorkbookCalculator, address: string): string {
  const cell = sheet.cells[address]
  return displayValue(
    calculator.getValue(sheet.id, address),
    cell?.input ?? '',
    cell?.format,
  ).text
}

/** The run of numbers directly next to a cell (above, or to the left), if two or more. */
function numberRun(
  sheet: Sheet,
  calculator: WorkbookCalculator,
  from: CellPosition,
  step: CellPosition,
): string | null {
  const cells: CellPosition[] = []
  let at = { row: from.row + step.row, column: from.column + step.column }
  while (at.row >= 0 && at.column >= 0 && cells.length < 1000) {
    if (typeof calculator.getValue(sheet.id, toAddress(at)) !== 'number') break
    cells.push(at)
    at = { row: at.row + step.row, column: at.column + step.column }
  }
  if (cells.length < 2) return null
  return `${toAddress(cells[cells.length - 1])}:${toAddress(cells[0])}`
}

export function sheetAiContext(
  sheet: Sheet,
  calculator: WorkbookCalculator,
  active: CellPosition,
  table: CellRange,
): ContextItem[] {
  const address = toAddress(active)
  const input = sheet.cells[address]?.input ?? ''
  const value = calculator.getValue(sheet.id, address)
  const text = shown(sheet, calculator, address)
  const items: ContextItem[] = [
    {
      kind: 'formula',
      label: `Cell ${address}`,
      text: input
        ? `Cell ${address} on sheet "${sheet.name}" contains ${input}${input.startsWith('=') ? `, which shows ${text || 'nothing'}` : ''}.`
        : `Cell ${address} on sheet "${sheet.name}" is empty.`,
      data: {
        address,
        formula: input.startsWith('=') ? input : undefined,
        value: isError(value) ? value.code : undefined,
        above: numberRun(sheet, calculator, active, { row: -1, column: 0 }),
        left: numberRun(sheet, calculator, active, { row: 0, column: -1 }),
      },
    },
  ]

  const bottom = Math.min(table.bottom, table.top + MAX_ROWS - 1)
  const right = Math.min(table.right, table.left + MAX_COLUMNS - 1)
  if (bottom > table.top || right > table.left) {
    const rows: string[][] = []
    const values: CellValue[][] = []
    for (let row = table.top; row <= bottom; row++) {
      const shownRow: string[] = []
      const valueRow: CellValue[] = []
      for (let column = table.left; column <= right; column++) {
        const at = toAddress({ row, column })
        shownRow.push(shown(sheet, calculator, at))
        valueRow.push(calculator.getValue(sheet.id, at))
      }
      rows.push(shownRow)
      values.push(valueRow)
    }
    // A first row of text is the header.
    const header =
      values[0].every((v) => typeof v === 'string' || v === null) && values.length > 1
    const body = header ? values.slice(1) : values
    const columns = values[0].map((_, i) => ({
      name: header
        ? String(values[0][i] ?? columnToLetters(table.left + i))
        : columnToLetters(table.left + i),
      values: body.map((row) => (typeof row[i] === 'number' ? (row[i] as number) : null)),
    }))
    const labels = body.map((row) => (typeof row[0] === 'string' ? row[0] : ''))
    const range = `${toAddress({ row: table.top, column: table.left })}:${toAddress({ row: bottom, column: right })}`
    const cut =
      table.bottom > bottom || table.right > right ? ' (the first part only)' : ''
    items.push({
      kind: 'cells',
      label: `Cells ${range}`,
      text: `Cells ${range} on sheet "${sheet.name}"${cut}:\n${rows.map((r) => r.join('\t')).join('\n')}`,
      data: { range, columns, labels },
    })
  }
  return items
}
