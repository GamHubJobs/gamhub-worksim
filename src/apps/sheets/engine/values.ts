/**
 * Values the formula engine works with, and the rules for converting between
 * them. These follow the behaviour of common spreadsheet programs, so that what
 * players learn here works in the tools they will use at work.
 */

/** The error codes real spreadsheets use, each with a plain-language explanation. */
export const ERROR_EXPLANATIONS = {
  '#DIV/0!': 'This formula divides by zero (or by an empty cell).',
  '#VALUE!':
    'This formula uses the wrong type of value, for example text where a number is needed.',
  '#REF!': 'This formula refers to a cell that does not exist.',
  '#NAME?':
    'This formula uses a function name the spreadsheet does not recognise. Check the spelling.',
  '#N/A': 'A lookup could not find the value it was looking for.',
  '#NUM!': 'This formula produced a number that is not valid.',
  '#ERROR!': 'This formula could not be understood. Check brackets, commas and quotes.',
} as const

export type ErrorCode = keyof typeof ERROR_EXPLANATIONS

export interface ErrorValue {
  kind: 'error'
  code: ErrorCode
  /** A specific explanation of what went wrong in this cell. */
  message: string
}

/** The value of one cell. `null` means the cell is empty. */
export type CellValue = number | string | boolean | ErrorValue | null

/** A rectangular block of values, row by row, e.g. the result of `A1:C3`. */
export interface RangeValue {
  kind: 'range'
  rows: CellValue[][]
}

/** What a function receives for each argument: a single value or a range. */
export type Argument = CellValue | RangeValue

export function makeError(code: ErrorCode, message?: string): ErrorValue {
  return { kind: 'error', code, message: message ?? ERROR_EXPLANATIONS[code] }
}

export function isError(value: unknown): value is ErrorValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'error'
  )
}

export function isRange(value: Argument): value is RangeValue {
  return typeof value === 'object' && value !== null && value.kind === 'range'
}

/** All values of a range, row by row, in one list. */
export function flattenRange(range: RangeValue): CellValue[] {
  return range.rows.flat()
}

// ---------------------------------------------------------------------------
// Reading what the player typed
// ---------------------------------------------------------------------------

/** How a typed number was written, so it can be shown the same way. */
export type ImpliedFormat = 'percent' | 'currency' | 'thousands'

export interface Literal {
  value: CellValue
  impliedFormat?: ImpliedFormat
}

const NUMBER_PATTERN =
  /^([+-])?\s*([$£€])?\s*(\d{1,3}(?:,\d{3})+|\d+)?(\.\d+)?(?:[eE]([+-]?\d+))?\s*(%)?$/

/**
 * Converts text such as "1,250.50", "$99", "15%" or "-3e2" into a number.
 * Returns null for anything that is not a number.
 */
export function parseNumber(
  text: string,
): { value: number; impliedFormat?: ImpliedFormat } | null {
  const match = NUMBER_PATTERN.exec(text.trim())
  if (!match) return null
  const [, sign, currency, whole, fraction, exponent, percent] = match
  if (whole === undefined && fraction === undefined) return null
  if (currency && exponent) return null

  let value = Number(`${(whole ?? '0').replaceAll(',', '')}${fraction ?? ''}`)
  if (exponent) value *= 10 ** Number(exponent)
  if (sign === '-') value = -value
  if (percent) value /= 100
  if (!Number.isFinite(value)) return null

  const impliedFormat: ImpliedFormat | undefined = percent
    ? 'percent'
    : currency
      ? 'currency'
      : whole?.includes(',')
        ? 'thousands'
        : undefined
  return impliedFormat ? { value, impliedFormat } : { value }
}

/**
 * The value of a cell that is not a formula: a number, TRUE/FALSE or text.
 * A leading apostrophe forces text, e.g. `'00123` stays "00123".
 */
export function parseLiteral(input: string): Literal {
  if (input === '') return { value: null }
  if (input.startsWith("'")) return { value: input.slice(1) }
  const upper = input.trim().toUpperCase()
  if (upper === 'TRUE') return { value: true }
  if (upper === 'FALSE') return { value: false }
  const number = parseNumber(input)
  if (number) return number
  return { value: input }
}

export function isFormula(input: string): boolean {
  return input.length > 1 && input.startsWith('=')
}

// ---------------------------------------------------------------------------
// Conversions used by operators and functions
// ---------------------------------------------------------------------------

/** For arithmetic: TRUE is 1, empty is 0, number-like text is converted. */
export function toNumber(value: CellValue): number | ErrorValue {
  if (value === null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    if (value.trim() === '') return 0
    const number = parseNumber(value)
    if (number) return number.value
    return makeError('#VALUE!', `"${value}" is text, but a number is needed here.`)
  }
  return value
}

export function toText(value: CellValue): string | ErrorValue {
  if (value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') return formatGeneralNumber(value)
  return value
}

export function toBoolean(value: CellValue): boolean | ErrorValue {
  if (value === null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase()
    if (upper === 'TRUE') return true
    if (upper === 'FALSE') return false
    return makeError('#VALUE!', `"${value}" is text, but TRUE or FALSE is needed here.`)
  }
  return value
}

/**
 * Shows a number without formatting: up to 10 significant digits, so tiny
 * rounding noise (0.1 + 0.2 = 0.30000000000000004) is hidden, as in real
 * spreadsheets.
 */
export function formatGeneralNumber(value: number): string {
  if (Object.is(value, -0) || value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e11 || abs < 1e-9) {
    return value
      .toExponential(5)
      .replace(/\.?0+e/, 'E')
      .replace('e', 'E')
  }
  return String(Number(value.toPrecision(10)))
}

/**
 * Compares two values the way spreadsheets do: numbers come before text, text
 * before TRUE/FALSE, and text is compared without regard to upper/lower case.
 * Returns a negative number, zero or a positive number.
 */
export function compareValues(a: CellValue, b: CellValue): number {
  const left = normaliseForComparison(a, b)
  const right = normaliseForComparison(b, a)
  const rank = (value: number | string | boolean) =>
    typeof value === 'number' ? 0 : typeof value === 'string' ? 1 : 2
  const rankDifference = rank(left) - rank(right)
  if (rankDifference !== 0) return rankDifference
  if (typeof left === 'string' && typeof right === 'string') {
    const l = left.toLowerCase()
    const r = right.toLowerCase()
    return l < r ? -1 : l > r ? 1 : 0
  }
  return Number(left) - Number(right)
}

/** An empty cell counts as 0 next to a number, "" next to text, FALSE next to TRUE/FALSE. */
function normaliseForComparison(
  value: CellValue,
  other: CellValue,
): number | string | boolean {
  if (value === null) {
    if (typeof other === 'string') return ''
    if (typeof other === 'boolean') return false
    return 0
  }
  if (isError(value)) return 0
  return value
}

/** Equality as used by `=` and lookups: case-insensitive for text. */
export function valuesEqual(a: CellValue, b: CellValue): boolean {
  return compareValues(a, b) === 0
}
