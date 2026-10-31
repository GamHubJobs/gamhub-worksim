/** Turning assignment content into real workbooks. */
import { setCells } from '../apps/sheets/model'
import { createId } from '../lib/ids'
import type { Assignment, StartingCell } from '../content/schemas'
import type { Cell, SheetContent } from '../persistence/schemas'

function toCell(cell: StartingCell): Cell {
  return typeof cell === 'string' ? { input: cell } : cell
}

/** The workbook the player starts the assignment with. */
export function buildStartingContent(assignment: Assignment): SheetContent {
  // Tasks without a workbook (Help Desk) grade against an empty one.
  const workbook = assignment.workbook ?? {
    title: assignment.title,
    sheets: [{ name: 'Sheet1', cells: {} }],
  }
  let content: SheetContent = {
    sheets: workbook.sheets.map((sheet) => ({
      id: createId(),
      name: sheet.name,
      cells: {},
      ...(sheet.columnWidths ? { columnWidths: sheet.columnWidths } : {}),
      ...(sheet.validations
        ? {
            validations: sheet.validations.map((v) => ({
              id: createId(),
              range: v.range,
              rule: { type: 'list' as const, items: v.items },
            })),
          }
        : {}),
    })),
  }
  workbook.sheets.forEach((sheet, i) => {
    content = setCells(
      content,
      content.sheets[i].id,
      Object.fromEntries(Object.entries(sheet.cells).map(([a, c]) => [a, toCell(c)])),
    )
  })
  return content
}

export function findSheet(content: SheetContent, name: string) {
  return content.sheets.find((sheet) => sheet.name.toLowerCase() === name.toLowerCase())
}

/** Changes cells given per sheet name, keeping each cell's existing formatting. */
export function applyInputs(
  content: SheetContent,
  inputs: Record<string, Record<string, StartingCell>>,
): SheetContent {
  let result = content
  for (const [sheetName, cells] of Object.entries(inputs)) {
    const sheet = findSheet(result, sheetName)
    if (!sheet) continue
    const changes: Record<string, Cell> = {}
    for (const [address, value] of Object.entries(cells)) {
      const cell = toCell(value)
      changes[address] = {
        input: cell.input,
        format: cell.format ?? sheet.cells[address]?.format,
      }
    }
    result = setCells(result, sheet.id, changes)
  }
  return result
}

/** The starting workbook completed with the model answer. */
export function buildSolutionContent(assignment: Assignment): SheetContent {
  return applyInputs(buildStartingContent(assignment), assignment.solution)
}

/** Splits "Order!E2" into its sheet and address. */
export function splitSheetAddress(reference: string): { sheet: string; address: string } {
  const index = reference.lastIndexOf('!')
  return { sheet: reference.slice(0, index), address: reference.slice(index + 1) }
}

/** Applies a scenario's changes ("Order!C3" → "10") to a workbook. */
export function applyScenario(
  content: SheetContent,
  changes: Record<string, string>,
): SheetContent {
  const bySheet: Record<string, Record<string, string>> = {}
  for (const [reference, input] of Object.entries(changes)) {
    const { sheet, address } = splitSheetAddress(reference)
    bySheet[sheet] = { ...bySheet[sheet], [address]: input }
  }
  return applyInputs(content, bySheet)
}
