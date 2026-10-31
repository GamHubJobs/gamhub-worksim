/**
 * Calculates a parsed formula. Cell values come from an `EvaluationContext`,
 * so the same code works for the live workbook, for grading and for tests.
 */
import { FUNCTIONS, suggestFunctionName } from './functions'
import type { CellRef, Node } from './parser'
import {
  compareValues,
  isError,
  isRange,
  makeError,
  toNumber,
  toText,
  type Argument,
  type CellValue,
  type ErrorValue,
  type RangeValue,
} from './values'

export interface EvaluationContext {
  /** The value of one cell. `sheet` is undefined for the formula's own sheet. */
  getCell(sheet: string | undefined, ref: CellRef): CellValue
  /** The values of a block of cells (corners included). */
  getRange(
    sheet: string | undefined,
    start: CellRef,
    end: CellRef,
    wholeColumns: boolean,
  ): RangeValue | ErrorValue
}

/** Calculates a node. Ranges are returned as ranges, for functions to use. */
export function evaluateNode(node: Node, context: EvaluationContext): Argument {
  switch (node.type) {
    case 'number':
    case 'string':
    case 'boolean':
      return node.value
    case 'empty':
      return null
    case 'error':
      return makeError(node.code)
    case 'name':
      return makeError(
        '#NAME?',
        `"${node.name}" is not a cell, function or value the spreadsheet recognises. ` +
          'Text in a formula must be written in "double quotes".',
      )
    case 'ref':
      return context.getCell(node.sheet, node.ref)
    case 'range':
      return context.getRange(node.sheet, node.start, node.end, node.wholeColumns)
    case 'unary': {
      const value = toNumber(single(evaluateNode(node.operand, context)))
      if (isError(value)) return value
      return node.operator === '-' ? -value : value
    }
    case 'percent': {
      const value = toNumber(single(evaluateNode(node.operand, context)))
      return isError(value) ? value : value / 100
    }
    case 'binary':
      return evaluateBinary(node, context)
    case 'call':
      return evaluateCall(node, context)
  }
}

/** Only single values can be used with operators such as + or =. */
function single(value: Argument): CellValue {
  if (!isRange(value)) return value
  return makeError(
    '#VALUE!',
    'A range of cells (such as A1:A5) cannot be used here. Use a function such as SUM to combine them.',
  )
}

function evaluateBinary(
  node: Extract<Node, { type: 'binary' }>,
  context: EvaluationContext,
): CellValue {
  const left = single(evaluateNode(node.left, context))
  const right = single(evaluateNode(node.right, context))
  if (isError(left)) return left
  if (isError(right)) return right

  switch (node.operator) {
    case '&': {
      return `${toText(left) as string}${toText(right) as string}`
    }
    case '=':
      return compareValues(left, right) === 0
    case '<>':
      return compareValues(left, right) !== 0
    case '<':
      return compareValues(left, right) < 0
    case '>':
      return compareValues(left, right) > 0
    case '<=':
      return compareValues(left, right) <= 0
    case '>=':
      return compareValues(left, right) >= 0
  }

  const a = toNumber(left)
  if (isError(a)) return a
  const b = toNumber(right)
  if (isError(b)) return b
  let result: number
  switch (node.operator) {
    case '+':
      result = a + b
      break
    case '-':
      result = a - b
      break
    case '*':
      result = a * b
      break
    case '/':
      if (b === 0) return makeError('#DIV/0!')
      result = a / b
      break
    case '^':
      result = a ** b
      break
  }
  return Number.isFinite(result) ? result : makeError('#NUM!')
}

function evaluateCall(
  node: Extract<Node, { type: 'call' }>,
  context: EvaluationContext,
): CellValue {
  const definition = FUNCTIONS.get(node.name)
  if (!definition) {
    const suggestion = suggestFunctionName(node.name)
    return makeError(
      '#NAME?',
      `There is no function called ${node.name}.` +
        (suggestion ? ` Did you mean ${suggestion}?` : ''),
    )
  }
  const count = node.args.length
  if (count < definition.minArgs || count > definition.maxArgs) {
    const expected =
      definition.minArgs === definition.maxArgs
        ? `${definition.minArgs}`
        : definition.maxArgs === Number.POSITIVE_INFINITY
          ? `at least ${definition.minArgs}`
          : `${definition.minArgs} to ${definition.maxArgs}`
    return makeError(
      '#ERROR!',
      `${node.name} needs ${expected} value${expected === '1' ? '' : 's'} but got ${count}. ` +
        `Use it like this: ${definition.syntax}`,
    )
  }

  let result: CellValue
  if (definition.evaluateLazy) {
    result = definition.evaluateLazy(
      node.args.map((arg) => () => evaluateNode(arg, context)),
    )
  } else {
    const args: Argument[] = []
    for (const arg of node.args) {
      const value = evaluateNode(arg, context)
      // An error passed straight into a function makes the result an error.
      if (isError(value)) return value
      args.push(value)
    }
    result = definition.evaluate!(args)
  }
  if (typeof result === 'number' && !Number.isFinite(result)) return makeError('#NUM!')
  return result
}

/** Calculates a whole formula; the result is always a single value. */
export function evaluateTree(node: Node, context: EvaluationContext): CellValue {
  const result = evaluateNode(node, context)
  if (isRange(result)) {
    // A formula such as =B2:B5 shows a single cell's worth only in old
    // spreadsheets; we ask for a function instead, which is clearer.
    return single(result)
  }
  // A formula pointing at an empty cell shows 0, as in real spreadsheets.
  return result === null ? 0 : result
}
