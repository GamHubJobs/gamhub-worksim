/**
 * Explains a spreadsheet formula in plain words, using the spreadsheet's own
 * parser and function descriptions. Deterministic: the same formula always
 * gets the same explanation.
 */
import { FUNCTIONS } from '../../apps/sheets/engine/functions'
import {
  FormulaParseError,
  parseFormula,
  type CellRef,
  type Node,
} from '../../apps/sheets/engine/parser'
import { ERROR_EXPLANATIONS, type ErrorCode } from '../../apps/sheets/engine/values'

function columnName(column: number): string {
  let name = ''
  let n = column + 1
  while (n > 0) {
    const rest = (n - 1) % 26
    name = String.fromCharCode(65 + rest) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function address(ref: CellRef): string {
  return `${ref.columnAbsolute ? '$' : ''}${columnName(ref.column)}${ref.rowAbsolute ? '$' : ''}${ref.row + 1}`
}

const OPERATORS: Record<string, string> = {
  '+': 'plus',
  '-': 'minus',
  '*': 'multiplied by',
  '/': 'divided by',
  '^': 'to the power of',
  '&': 'joined to',
  '=': 'equals',
  '<>': 'is not equal to',
  '<': 'is less than',
  '>': 'is greater than',
  '<=': 'is at most',
  '>=': 'is at least',
}

/** A short description of one part of a formula. */
function describe(node: Node): string {
  switch (node.type) {
    case 'number':
      return String(node.value)
    case 'string':
      return `the text "${node.value}"`
    case 'boolean':
      return node.value ? 'TRUE' : 'FALSE'
    case 'empty':
      return 'nothing'
    case 'ref':
      return `${node.sheet ? `${node.sheet}!` : ''}${address(node.ref)}`
    case 'range':
      return node.wholeColumns
        ? `columns ${columnName(node.start.column)} to ${columnName(node.end.column)}`
        : `${node.sheet ? `${node.sheet}!` : ''}${address(node.start)}:${address(node.end)}`
    case 'name':
      return `"${node.name}" (not a function or cell the spreadsheet knows)`
    case 'error':
      return node.code
    case 'unary':
      return node.operator === '-'
        ? `minus ${describe(node.operand)}`
        : describe(node.operand)
    case 'percent':
      return `${describe(node.operand)} per cent`
    case 'binary':
      return `${describe(node.left)} ${OPERATORS[node.operator]} ${describe(node.right)}`
    case 'call':
      return `${node.name}(${node.args.map(describe).join(', ')})`
  }
}

function functionsIn(node: Node, found = new Set<string>()): Set<string> {
  if (node.type === 'call') {
    found.add(node.name.toUpperCase())
    node.args.forEach((arg) => functionsIn(arg, found))
  } else if (node.type === 'binary') {
    functionsIn(node.left, found)
    functionsIn(node.right, found)
  } else if (node.type === 'unary' || node.type === 'percent')
    functionsIn(node.operand, found)
  return found
}

function hasAbsolute(node: Node): boolean {
  switch (node.type) {
    case 'ref':
      return node.ref.rowAbsolute || node.ref.columnAbsolute
    case 'range':
      return [node.start, node.end].some((r) => r.rowAbsolute || r.columnAbsolute)
    case 'call':
      return node.args.some(hasAbsolute)
    case 'binary':
      return hasAbsolute(node.left) || hasAbsolute(node.right)
    case 'unary':
    case 'percent':
      return hasAbsolute(node.operand)
    default:
      return false
  }
}

export interface FormulaExplanation {
  /** Plain-words reading of the whole formula. */
  reading: string
  /** One line per function used. */
  functions: string[]
  /** Things worth knowing (absolute references, unknown names…). */
  notes: string[]
  /** Set when the formula cannot be read at all. */
  problem?: string
}

export function explainFormula(formula: string): FormulaExplanation {
  const text = formula.trim().startsWith('=') ? formula.trim() : `=${formula.trim()}`
  let tree: Node
  try {
    tree = parseFormula(text)
  } catch (error) {
    return {
      reading: '',
      functions: [],
      notes: [],
      problem:
        error instanceof FormulaParseError
          ? `The formula cannot be read: ${error.message}`
          : 'The formula cannot be read. Check brackets, commas and quotes.',
    }
  }
  const functions = [...functionsIn(tree)].map((name) => {
    const definition = FUNCTIONS.get(name)
    return definition
      ? `${definition.name}: ${definition.description} Written as ${definition.syntax}.`
      : `${name} is not a function this spreadsheet knows: check the spelling (it will show #NAME?).`
  })
  const notes: string[] = []
  if (hasAbsolute(tree))
    notes.push(
      'The $ signs make parts of the references absolute: they stay the same when the formula is copied to other cells.',
    )
  else if (tree.type !== 'number' && tree.type !== 'string')
    notes.push(
      'All references are relative: copied down a column, they move with the formula (B2 becomes B3, and so on).',
    )
  return { reading: describe(tree), functions, notes }
}

export function explainError(code: string): string | null {
  return code in ERROR_EXPLANATIONS ? ERROR_EXPLANATIONS[code as ErrorCode] : null
}
