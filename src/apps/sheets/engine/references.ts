/**
 * Working with the cell references inside formulas: moving them when a
 * formula is copied, and finding them to highlight while editing.
 */
import { columnToLetters } from '../model'
import { FormulaParseError, MAX_COLUMNS, MAX_ROWS, tokenize, type Token } from './parser'
import { isFormula } from './values'

type RefToken = Extract<Token, { type: 'ref' }>

function refTokens(input: string): RefToken[] | null {
  try {
    return tokenize(input.slice(1), 1).filter(
      (token): token is RefToken => token.type === 'ref',
    )
  } catch (error) {
    if (error instanceof FormulaParseError) return null
    throw error
  }
}

/** Moves one part such as "$B3" or "C" by the given amount; null if it falls off the sheet. */
function shiftPart(part: string, rowOffset: number, columnOffset: number): string | null {
  const match = /^(\$?)([A-Z]{1,3})(?:(\$?)(\d+))?$/.exec(part)
  if (!match) return part
  const [, columnDollar, letters, rowDollar, digits] = match
  let column = 0
  for (const letter of letters) column = column * 26 + (letter.charCodeAt(0) - 64)
  column -= 1
  if (!columnDollar) column += columnOffset
  if (column < 0 || column >= MAX_COLUMNS) return null

  let rowText = ''
  if (digits !== undefined) {
    let row = Number(digits) - 1
    if (!rowDollar) row += rowOffset
    if (row < 0 || row >= MAX_ROWS) return null
    rowText = `${rowDollar}${row + 1}`
  }
  return `${columnDollar}${columnToLetters(column)}${rowText}`
}

/**
 * Adjusts a formula for being copied `rowOffset` rows down and `columnOffset`
 * columns right: `=B2*C2` copied one row down becomes `=B3*C3`. References
 * with `$` stay fixed. References that would fall off the sheet become #REF!.
 * Anything that is not a formula is returned unchanged.
 */
export function shiftFormula(
  input: string,
  rowOffset: number,
  columnOffset: number,
): string {
  if (!isFormula(input) || (rowOffset === 0 && columnOffset === 0)) return input
  const tokens = refTokens(input)
  if (!tokens) return input

  let result = ''
  let cursor = 0
  for (const token of tokens) {
    const prefixEnd = token.end - token.text.length // keeps any "Sheet2!" prefix as typed
    const parts = token.text
      .split(':')
      .map((part) => shiftPart(part, rowOffset, columnOffset))
    result += input.slice(cursor, token.start)
    result += parts.includes(null)
      ? '#REF!'
      : `${input.slice(token.start, prefixEnd)}${parts.join(':')}`
    cursor = token.end
  }
  return result + input.slice(cursor)
}

/** Writes a sheet name for use in a formula, quoting it when needed: 'My sheet'!A1. */
export function sheetPrefix(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) && !/^[A-Za-z]{1,3}\d+$/.test(name)
    ? `${name}!`
    : `'${name.replaceAll("'", "''")}'!`
}

/** Updates references to a renamed sheet, e.g. Sheet2!A1 → Prices!A1. */
export function renameSheetInFormula(
  input: string,
  oldName: string,
  newName: string,
): string {
  if (!isFormula(input)) return input
  const tokens = refTokens(input)
  if (!tokens) return input
  let result = ''
  let cursor = 0
  for (const token of tokens) {
    if (token.sheet?.toLowerCase() !== oldName.toLowerCase()) continue
    result += input.slice(cursor, token.start) + sheetPrefix(newName) + token.text
    cursor = token.end
  }
  return result + input.slice(cursor)
}

export interface FormulaReference {
  /** Position of the reference in the formula text. */
  start: number
  end: number
  /** Sheet name if one was written, e.g. "Prices". */
  sheet?: string
  /** The reference as written, without the sheet, e.g. "B2:B10". */
  text: string
}

/** All cell references in a formula, in order. Empty if the formula can't be read. */
export function findReferences(input: string): FormulaReference[] {
  if (!isFormula(input)) return []
  return (refTokens(input) ?? []).map(({ start, end, sheet, text }) => ({
    start,
    end,
    sheet,
    text,
  }))
}
