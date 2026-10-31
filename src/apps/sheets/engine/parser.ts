/**
 * Formula parser: turns formula text such as `=SUM(A1:A3)*2` into a tree
 * that the evaluator can calculate.
 *
 * Supported: numbers, "text", TRUE/FALSE, cell references (A1, $A$1,
 * Sheet2!A1, 'My sheet'!A1), ranges (A1:B5, A:A), function calls, the
 * operators + - * / ^ & = <> < > <= >= and percent (50%).
 */
import { lettersToColumn } from '../model'
import { ERROR_EXPLANATIONS, type ErrorCode } from './values'

/** Largest row and column numbers a reference may use. */
export const MAX_ROWS = 1_000_000
export const MAX_COLUMNS = 18_278 // "ZZZ"

export interface CellRef {
  /** 0-based. */
  row: number
  /** 0-based. */
  column: number
  /** True when written with `$`, e.g. `A$1`: the row does not change when copied. */
  rowAbsolute: boolean
  columnAbsolute: boolean
}

export type Node =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'empty' } // a missing argument, e.g. the middle of IF(A1,,2)
  | { type: 'ref'; sheet?: string; ref: CellRef }
  | {
      type: 'range'
      sheet?: string
      start: CellRef
      end: CellRef
      /** Whole columns such as `A:B`: rows are ignored. */
      wholeColumns: boolean
    }
  | { type: 'name'; name: string } // an unknown word: evaluates to #NAME?
  | { type: 'error'; code: ErrorCode } // an error typed into a formula, e.g. #REF!
  | { type: 'unary'; operator: '-' | '+'; operand: Node }
  | { type: 'percent'; operand: Node }
  | { type: 'binary'; operator: BinaryOperator; left: Node; right: Node }
  | { type: 'call'; name: string; args: Node[] }

export type BinaryOperator =
  '+' | '-' | '*' | '/' | '^' | '&' | '=' | '<>' | '<' | '>' | '<=' | '>='

export class FormulaParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FormulaParseError'
  }
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

export type Token =
  | { type: 'number'; value: number; start: number; end: number }
  | { type: 'string'; value: string; start: number; end: number }
  /** A reference or range. `text` is the part after any sheet prefix. */
  | { type: 'ref'; sheet?: string; text: string; start: number; end: number }
  | { type: 'name'; value: string; start: number; end: number }
  | { type: 'operator'; value: string; start: number; end: number }
  | { type: 'open'; start: number; end: number }
  | { type: 'close'; start: number; end: number }
  | { type: 'comma'; start: number; end: number }
  | { type: 'error'; value: ErrorCode; start: number; end: number }

const CELL = String.raw`\$?[A-Za-z]{1,3}\$?\d+`
const COLUMN = String.raw`\$?[A-Za-z]{1,3}`
const REFERENCE = new RegExp(
  String.raw`^(?:${CELL}(?::${CELL})?|${COLUMN}:${COLUMN})(?![A-Za-z0-9_.(!])`,
)
const SHEET_PREFIX = /^(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_.]*))!/
const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
const NAME = /^[A-Za-z_][A-Za-z0-9_.]*/
const ERROR_CODES = Object.keys(ERROR_EXPLANATIONS) as ErrorCode[]
const OPERATORS = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '&', '=', '<', '>', '%']

/** Splits formula text (without the leading `=`) into tokens. */
export function tokenize(text: string, offset = 0): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    const start = i + offset

    if (/^\s/.test(rest)) {
      i++
      continue
    }

    if (rest.startsWith('"')) {
      let value = ''
      let j = 1
      for (;;) {
        if (j >= rest.length)
          throw new FormulaParseError('A text value is missing its closing quote (").')
        if (rest[j] === '"') {
          if (rest[j + 1] === '"') {
            value += '"'
            j += 2
            continue
          }
          break
        }
        value += rest[j]
        j++
      }
      i += j + 1
      tokens.push({ type: 'string', value, start, end: i + offset })
      continue
    }

    const errorCode = ERROR_CODES.find((code) => rest.toUpperCase().startsWith(code))
    if (errorCode) {
      i += errorCode.length
      tokens.push({ type: 'error', value: errorCode, start, end: i + offset })
      continue
    }

    const sheetMatch = SHEET_PREFIX.exec(rest)
    if (sheetMatch) {
      const sheet = sheetMatch[1]?.replaceAll("''", "'") ?? sheetMatch[2]
      const afterSheet = rest.slice(sheetMatch[0].length)
      const refMatch = REFERENCE.exec(afterSheet)
      if (!refMatch)
        throw new FormulaParseError(`Expected a cell reference after "${sheetMatch[0]}".`)
      i += sheetMatch[0].length + refMatch[0].length
      tokens.push({
        type: 'ref',
        sheet,
        text: refMatch[0].toUpperCase(),
        start,
        end: i + offset,
      })
      continue
    }

    const refMatch = REFERENCE.exec(rest)
    if (refMatch) {
      i += refMatch[0].length
      tokens.push({
        type: 'ref',
        text: refMatch[0].toUpperCase(),
        start,
        end: i + offset,
      })
      continue
    }

    const numberMatch = NUMBER.exec(rest)
    if (numberMatch) {
      i += numberMatch[0].length
      tokens.push({
        type: 'number',
        value: Number(numberMatch[0]),
        start,
        end: i + offset,
      })
      continue
    }

    const nameMatch = NAME.exec(rest)
    if (nameMatch) {
      i += nameMatch[0].length
      tokens.push({
        type: 'name',
        value: nameMatch[0].toUpperCase(),
        start,
        end: i + offset,
      })
      continue
    }

    if (rest[0] === '(' || rest[0] === ')' || rest[0] === ',') {
      i++
      const type = rest[0] === '(' ? 'open' : rest[0] === ')' ? 'close' : 'comma'
      tokens.push({ type, start, end: i + offset })
      continue
    }

    const operator = OPERATORS.find((op) => rest.startsWith(op))
    if (operator) {
      i += operator.length
      tokens.push({ type: 'operator', value: operator, start, end: i + offset })
      continue
    }

    throw new FormulaParseError(`The character "${rest[0]}" is not allowed in a formula.`)
  }
  return tokens
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

/** Reads "B3", "$B$3" or "B" (column only) into a CellRef. */
export function parseCellRef(text: string): CellRef {
  const match = /^(\$?)([A-Z]{1,3})(?:(\$?)(\d+))?$/.exec(text)
  if (!match) throw new FormulaParseError(`"${text}" is not a valid cell reference.`)
  const [, columnDollar, letters, rowDollar, digits] = match
  const row = digits === undefined ? 0 : Number(digits) - 1
  if (digits !== undefined && (row < 0 || row >= MAX_ROWS)) {
    throw new FormulaParseError(`"${text}" is not a valid cell reference.`)
  }
  return {
    row,
    column: lettersToColumn(letters),
    rowAbsolute: rowDollar === '$',
    columnAbsolute: columnDollar === '$',
  }
}

function referenceNode(token: Extract<Token, { type: 'ref' }>): Node {
  const [first, second] = token.text.split(':')
  if (second === undefined)
    return { type: 'ref', sheet: token.sheet, ref: parseCellRef(first) }
  const a = parseCellRef(first)
  const b = parseCellRef(second)
  const wholeColumns = !/\d/.test(token.text)
  // Store ranges with the top-left corner first, as spreadsheets do.
  const start = {
    row: Math.min(a.row, b.row),
    column: Math.min(a.column, b.column),
    rowAbsolute: a.row <= b.row ? a.rowAbsolute : b.rowAbsolute,
    columnAbsolute: a.column <= b.column ? a.columnAbsolute : b.columnAbsolute,
  }
  const end = {
    row: Math.max(a.row, b.row),
    column: Math.max(a.column, b.column),
    rowAbsolute: a.row <= b.row ? b.rowAbsolute : a.rowAbsolute,
    columnAbsolute: a.column <= b.column ? b.columnAbsolute : a.columnAbsolute,
  }
  return { type: 'range', sheet: token.sheet, start, end, wholeColumns }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const COMPARISON = ['=', '<>', '<', '>', '<=', '>=']

/** Parses formula text, with or without the leading `=`. */
export function parseFormula(input: string): Node {
  const text = input.startsWith('=') ? input.slice(1) : input
  const tokens = tokenize(text)
  if (tokens.length === 0) throw new FormulaParseError('The formula is empty.')
  let position = 0

  const peek = (): Token | undefined => tokens[position]
  const isOperator = (values: string[]) => {
    const token = peek()
    return token?.type === 'operator' && values.includes(token.value)
  }

  function binaryLevel(operators: string[], next: () => Node): Node {
    let left = next()
    while (isOperator(operators)) {
      const operator = (tokens[position++] as { value: string }).value as BinaryOperator
      left = { type: 'binary', operator, left, right: next() }
    }
    return left
  }

  const expression = (): Node => binaryLevel(COMPARISON, concatenation)
  const concatenation = (): Node => binaryLevel(['&'], additive)
  const additive = (): Node => binaryLevel(['+', '-'], multiplicative)
  const multiplicative = (): Node => binaryLevel(['*', '/'], power)
  const power = (): Node => binaryLevel(['^'], unary)

  function unary(): Node {
    if (isOperator(['-', '+'])) {
      const operator = (tokens[position++] as { value: string }).value as '-' | '+'
      return { type: 'unary', operator, operand: unary() }
    }
    let node = primary()
    while (isOperator(['%'])) {
      position++
      node = { type: 'percent', operand: node }
    }
    return node
  }

  function primary(): Node {
    const token = tokens[position++]
    if (!token)
      throw new FormulaParseError(
        'The formula ends too early. Is something missing at the end?',
      )
    switch (token.type) {
      case 'number':
        return { type: 'number', value: token.value }
      case 'string':
        return { type: 'string', value: token.value }
      case 'error':
        return { type: 'error', code: token.value }
      case 'ref':
        return referenceNode(token)
      case 'open': {
        const inner = expression()
        if (peek()?.type !== 'close')
          throw new FormulaParseError('A closing bracket ")" is missing.')
        position++
        return inner
      }
      case 'name': {
        if (peek()?.type === 'open') {
          position++
          return { type: 'call', name: token.value, args: argumentList(token.value) }
        }
        if (token.value === 'TRUE') return { type: 'boolean', value: true }
        if (token.value === 'FALSE') return { type: 'boolean', value: false }
        return { type: 'name', name: token.value }
      }
      case 'close':
        throw new FormulaParseError(
          'There is a closing bracket ")" without a matching "(".',
        )
      case 'comma':
        throw new FormulaParseError('There is a comma in an unexpected place.')
      case 'operator':
        throw new FormulaParseError(`The "${token.value}" is in an unexpected place.`)
    }
  }

  function argumentList(functionName: string): Node[] {
    const args: Node[] = []
    if (peek()?.type === 'close') {
      position++
      return args
    }
    for (;;) {
      const token = peek()
      if (token?.type === 'comma' || token?.type === 'close') {
        args.push({ type: 'empty' })
      } else {
        args.push(expression())
      }
      const separator = tokens[position++]
      if (separator?.type === 'close') return args
      if (separator?.type !== 'comma') {
        throw new FormulaParseError(
          `The ${functionName}( function is missing a closing bracket ")".`,
        )
      }
    }
  }

  const result = expression()
  if (position < tokens.length) {
    const token = tokens[position]
    throw new FormulaParseError(
      token.type === 'close'
        ? 'There is a closing bracket ")" without a matching "(".'
        : 'Something unexpected follows the formula. Is an operator such as + or a comma missing?',
    )
  }
  return result
}
