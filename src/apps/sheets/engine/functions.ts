/**
 * The spreadsheet functions players can use, with the help text shown while
 * they type a formula. Behaviour follows common spreadsheet programs.
 */
import {
  compareValues,
  flattenRange,
  isError,
  isRange,
  makeError,
  parseNumber,
  toBoolean,
  toNumber,
  toText,
  valuesEqual,
  type Argument,
  type CellValue,
  type ErrorValue,
  type RangeValue,
} from './values'

export type FunctionCategory = 'Math' | 'Statistics' | 'Logic' | 'Lookup' | 'Text'

export interface FunctionDefinition {
  name: string
  category: FunctionCategory
  /** e.g. "SUM(value1, [value2, ...])". Square brackets mark optional values. */
  syntax: string
  description: string
  example: string
  minArgs: number
  maxArgs: number
  /** Most functions receive their arguments already calculated. */
  evaluate?: (args: Argument[]) => CellValue
  /** IF and IFERROR only calculate the arguments they actually need. */
  evaluateLazy?: (args: Array<() => Argument>) => CellValue
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RANGE_NOT_ALLOWED = (name: string) =>
  makeError('#VALUE!', `${name} needs a single value here, not a range of cells.`)

/** A single value from an argument; ranges are not allowed. */
function scalar(arg: Argument, name: string): CellValue {
  return isRange(arg) ? RANGE_NOT_ALLOWED(name) : arg
}

function asRange(arg: Argument): RangeValue {
  return isRange(arg) ? arg : { kind: 'range', rows: [[arg]] }
}

function numberArg(arg: Argument, name: string): number | ErrorValue {
  const value = scalar(arg, name)
  return isError(value) ? value : toNumber(value)
}

function textArg(arg: Argument, name: string): string | ErrorValue {
  const value = scalar(arg, name)
  return isError(value) ? value : toText(value)
}

function checkNumber(value: number): number | ErrorValue {
  return Number.isFinite(value) ? value : makeError('#NUM!')
}

/**
 * The numbers in a list of arguments, following spreadsheet rules: inside
 * ranges, only real numbers count (text and empty cells are skipped); values
 * typed directly into the function are converted where possible.
 */
function collectNumbers(args: Argument[]): number[] | ErrorValue {
  const numbers: number[] = []
  for (const arg of args) {
    if (isRange(arg)) {
      for (const value of flattenRange(arg)) {
        if (isError(value)) return value
        if (typeof value === 'number') numbers.push(value)
      }
    } else if (arg !== null) {
      const number = toNumber(arg)
      if (isError(number)) return number
      numbers.push(number)
    }
  }
  return numbers
}

function roundHalfAwayFromZero(value: number, digits: number): number {
  const factor = 10 ** Math.trunc(digits)
  // toPrecision removes binary noise, so 1.005 rounds to 1.01 as people expect.
  const shifted = Number((Math.abs(value) * factor).toPrecision(15))
  return (Math.sign(value) * Math.round(shifted)) / factor
}

function roundWith(method: (x: number) => number) {
  return (args: Argument[]): CellValue => {
    const value = numberArg(args[0], 'ROUND')
    if (isError(value)) return value
    const digits = args.length > 1 ? numberArg(args[1], 'ROUND') : 0
    if (isError(digits)) return digits
    const factor = 10 ** Math.trunc(digits)
    const shifted = Number((Math.abs(value) * factor).toPrecision(15))
    return (Math.sign(value) * method(shifted)) / factor
  }
}

// --- Criteria for SUMIF, COUNTIF and AVERAGEIF -----------------------------

type Matcher = (value: CellValue) => boolean

function wildcardRegex(pattern: string): RegExp {
  let source = ''
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '~' && i + 1 < pattern.length) {
      source += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (char === '*') source += '.*'
    else if (char === '?') source += '.'
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${source}$`, 'i')
}

/** Turns a condition such as ">100", "<>Paid", "North" or 5 into a test. */
function makeMatcher(criterion: CellValue): Matcher {
  if (typeof criterion === 'number' || typeof criterion === 'boolean') {
    return (value) => value === criterion
  }
  const text = criterion === null || isError(criterion) ? '' : criterion
  const match = /^(<=|>=|<>|<|>|=)?(.*)$/s.exec(text)
  const operator = match?.[1] ?? '='
  const operandText = match?.[2] ?? ''
  const number = parseNumber(operandText)
  const upper = operandText.toUpperCase()
  const operand: CellValue = number
    ? number.value
    : upper === 'TRUE' || upper === 'FALSE'
      ? upper === 'TRUE'
      : operandText

  const equals: Matcher =
    typeof operand === 'string'
      ? operand === ''
        ? (value) => value === null || value === ''
        : (() => {
            const regex = wildcardRegex(operand)
            return (value) => typeof value === 'string' && regex.test(value)
          })()
      : (value) =>
          value === operand ||
          (typeof operand === 'number' &&
            typeof value === 'string' &&
            parseNumber(value)?.value === operand)

  if (operator === '=') return equals
  if (operator === '<>') return (value) => !equals(value)

  return (value) => {
    if (value === null || isError(value)) return false
    if (typeof value !== typeof operand) return false
    const difference = compareValues(value, operand)
    if (operator === '<') return difference < 0
    if (operator === '>') return difference > 0
    if (operator === '<=') return difference <= 0
    return difference >= 0
  }
}

/** The values to add up for each cell that matches, for SUMIF and AVERAGEIF. */
function matchingValues(args: Argument[], name: string): number[] | ErrorValue {
  const range = asRange(args[0])
  const criterion = scalar(args[1], name)
  if (isError(criterion)) return criterion
  const valuesRange = args[2] !== undefined && args[2] !== null ? asRange(args[2]) : range
  const matches = makeMatcher(criterion)
  const numbers: number[] = []
  range.rows.forEach((row, r) =>
    row.forEach((value, c) => {
      if (!matches(value)) return
      const target = valuesRange.rows[r]?.[c] ?? null
      if (typeof target === 'number') numbers.push(target)
    }),
  )
  return numbers
}

/**
 * The values to use for SUMIFS and AVERAGEIFS, or the matching cells for
 * COUNTIFS: a cell counts only when every range meets its own condition.
 * All the ranges must be the same size.
 */
function multiMatch(
  args: Argument[],
  name: string,
  valuesFirst: boolean,
): Array<CellValue> | ErrorValue {
  const pairs = valuesFirst ? args.slice(1) : args
  if (pairs.length % 2 !== 0) {
    return makeError('#VALUE!', `${name} needs a range and a condition for each test.`)
  }
  const values = valuesFirst ? asRange(args[0]) : null
  const tests: Array<{ range: RangeValue; matches: Matcher }> = []
  for (let i = 0; i < pairs.length; i += 2) {
    const criterion = scalar(pairs[i + 1], name)
    if (isError(criterion)) return criterion
    tests.push({ range: asRange(pairs[i]), matches: makeMatcher(criterion) })
  }
  const shape = values ?? tests[0].range
  const height = shape.rows.length
  const width = shape.rows[0]?.length ?? 0
  const sameShape = (range: RangeValue) =>
    range.rows.length === height && (range.rows[0]?.length ?? 0) === width
  if (!tests.every((test) => sameShape(test.range))) {
    return makeError('#VALUE!', `All the ranges in ${name} must be the same size.`)
  }
  const result: CellValue[] = []
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (tests.every((test) => test.matches(test.range.rows[r][c] ?? null))) {
        result.push(shape.rows[r][c] ?? null)
      }
    }
  }
  return result
}

function numbersOnly(values: CellValue[]): number[] {
  return values.filter((value): value is number => typeof value === 'number')
}

// --- Lookups ---------------------------------------------------------------

function sameKind(a: CellValue, b: CellValue): boolean {
  return typeof a === typeof b && a !== null && !isError(a)
}

function lookupMatches(candidate: CellValue, key: CellValue): boolean {
  if (typeof key === 'string' && /[*?]/.test(key)) {
    return typeof candidate === 'string' && wildcardRegex(key).test(candidate)
  }
  return sameKind(candidate, key) && valuesEqual(candidate, key)
}

/**
 * Position (0-based) of `key` in `values`, or -1.
 * mode 0: exact match. mode 1: largest value that is less than or equal to
 * the key (list sorted ascending). mode -1: smallest value that is greater
 * than or equal (list sorted descending).
 */
function findPosition(values: CellValue[], key: CellValue, mode: 0 | 1 | -1): number {
  if (mode === 0) return values.findIndex((value) => lookupMatches(value, key))
  let found = -1
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (!sameKind(value, key)) continue
    const difference = compareValues(value, key)
    if (difference === 0) return i
    if (mode === 1 ? difference < 0 : difference > 0) found = i
    else break
  }
  return found
}

function describe(value: CellValue): string {
  return typeof value === 'string' ? `"${value}"` : String(toText(value))
}

function lookup(args: Argument[], name: 'VLOOKUP' | 'HLOOKUP'): CellValue {
  const key = scalar(args[0], name)
  if (isError(key)) return key
  const table = asRange(args[1])
  const index = numberArg(args[2], name)
  if (isError(index)) return index
  let approximate: boolean | ErrorValue = true
  if (args.length > 3 && args[3] !== null) {
    approximate = toBoolean(scalar(args[3], name))
    if (isError(approximate)) return approximate
  }

  const lines =
    name === 'VLOOKUP'
      ? table.rows
      : (table.rows[0] ?? []).map((_, c) => table.rows.map((row) => row[c]))
  const width = lines[0]?.length ?? 0
  const column = Math.trunc(index)
  const direction = name === 'VLOOKUP' ? 'column' : 'row'
  if (column < 1) {
    return makeError('#VALUE!', `The ${direction} number in ${name} must be 1 or more.`)
  }
  if (column > width) {
    return makeError(
      '#REF!',
      `${name} asks for ${direction} ${column}, but the range only has ${width} ${direction}s.`,
    )
  }

  const firstValues = lines.map((line) => line[0])
  const position = findPosition(firstValues, key, approximate ? 1 : 0)
  if (position === -1) {
    return makeError(
      '#N/A',
      `${name} could not find ${describe(key)} in the first ${direction} of the range.` +
        (approximate
          ? ' Tip: add FALSE as the last value to look for an exact match.'
          : ''),
    )
  }
  return lines[position][column - 1] ?? null
}

// --- Misc ------------------------------------------------------------------

function textFunction(name: string, transform: (text: string) => string) {
  return (args: Argument[]): CellValue => {
    const text = textArg(args[0], name)
    return isError(text) ? text : transform(text)
  }
}

function logical(args: Argument[], name: string, combine: 'and' | 'or'): CellValue {
  const values: boolean[] = []
  for (const arg of args) {
    if (isRange(arg)) {
      for (const value of flattenRange(arg)) {
        if (isError(value)) return value
        if (typeof value === 'boolean') values.push(value)
        else if (typeof value === 'number') values.push(value !== 0)
      }
    } else {
      const value = toBoolean(arg)
      if (isError(value)) return value
      values.push(value)
    }
  }
  if (values.length === 0) {
    return makeError('#VALUE!', `${name} needs at least one TRUE or FALSE value.`)
  }
  return combine === 'and' ? values.every(Boolean) : values.some(Boolean)
}

const MANY = Number.POSITIVE_INFINITY

// ---------------------------------------------------------------------------
// The functions
// ---------------------------------------------------------------------------

const DEFINITIONS: FunctionDefinition[] = [
  // --- Math ---
  {
    name: 'SUM',
    category: 'Math',
    syntax: 'SUM(value1, [value2, ...])',
    description: 'Adds numbers together. Text and empty cells in a range are ignored.',
    example: '=SUM(B2:B10)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      const numbers = collectNumbers(args)
      return isError(numbers) ? numbers : numbers.reduce((a, b) => a + b, 0)
    },
  },
  {
    name: 'PRODUCT',
    category: 'Math',
    syntax: 'PRODUCT(value1, [value2, ...])',
    description: 'Multiplies numbers together.',
    example: '=PRODUCT(B2, C2)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      const numbers = collectNumbers(args)
      if (isError(numbers)) return numbers
      return numbers.length === 0 ? 0 : checkNumber(numbers.reduce((a, b) => a * b, 1))
    },
  },
  {
    name: 'ROUND',
    category: 'Math',
    syntax: 'ROUND(value, [decimal_places])',
    description: 'Rounds a number to a number of decimal places (0 if not given).',
    example: '=ROUND(B2*0.2, 2)',
    minArgs: 1,
    maxArgs: 2,
    evaluate: (args) => {
      const value = numberArg(args[0], 'ROUND')
      if (isError(value)) return value
      const digits = args.length > 1 ? numberArg(args[1], 'ROUND') : 0
      if (isError(digits)) return digits
      return roundHalfAwayFromZero(value, digits)
    },
  },
  {
    name: 'ROUNDUP',
    category: 'Math',
    syntax: 'ROUNDUP(value, [decimal_places])',
    description: 'Rounds a number away from zero.',
    example: '=ROUNDUP(B2/12, 0)',
    minArgs: 1,
    maxArgs: 2,
    evaluate: roundWith(Math.ceil),
  },
  {
    name: 'ROUNDDOWN',
    category: 'Math',
    syntax: 'ROUNDDOWN(value, [decimal_places])',
    description: 'Rounds a number towards zero.',
    example: '=ROUNDDOWN(B2, 1)',
    minArgs: 1,
    maxArgs: 2,
    evaluate: roundWith(Math.floor),
  },
  {
    name: 'ABS',
    category: 'Math',
    syntax: 'ABS(value)',
    description: 'The number without its minus sign.',
    example: '=ABS(C2-B2)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) => {
      const value = numberArg(args[0], 'ABS')
      return isError(value) ? value : Math.abs(value)
    },
  },
  {
    name: 'INT',
    category: 'Math',
    syntax: 'INT(value)',
    description: 'Rounds a number down to a whole number.',
    example: '=INT(B2)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) => {
      const value = numberArg(args[0], 'INT')
      return isError(value) ? value : Math.floor(value)
    },
  },
  {
    name: 'MOD',
    category: 'Math',
    syntax: 'MOD(value, divisor)',
    description: 'The remainder after dividing.',
    example: '=MOD(B2, 7)',
    minArgs: 2,
    maxArgs: 2,
    evaluate: (args) => {
      const value = numberArg(args[0], 'MOD')
      if (isError(value)) return value
      const divisor = numberArg(args[1], 'MOD')
      if (isError(divisor)) return divisor
      if (divisor === 0) return makeError('#DIV/0!')
      return value - divisor * Math.floor(value / divisor)
    },
  },
  {
    name: 'SQRT',
    category: 'Math',
    syntax: 'SQRT(value)',
    description: 'The square root of a number.',
    example: '=SQRT(B2)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) => {
      const value = numberArg(args[0], 'SQRT')
      if (isError(value)) return value
      return value < 0
        ? makeError('#NUM!', 'SQRT cannot take the square root of a negative number.')
        : Math.sqrt(value)
    },
  },

  // --- Statistics ---
  {
    name: 'AVERAGE',
    category: 'Statistics',
    syntax: 'AVERAGE(value1, [value2, ...])',
    description: 'The average (mean) of numbers. Text and empty cells are ignored.',
    example: '=AVERAGE(B2:B10)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      const numbers = collectNumbers(args)
      if (isError(numbers)) return numbers
      if (numbers.length === 0) {
        return makeError('#DIV/0!', 'AVERAGE found no numbers to average.')
      }
      return numbers.reduce((a, b) => a + b, 0) / numbers.length
    },
  },
  {
    name: 'MEDIAN',
    category: 'Statistics',
    syntax: 'MEDIAN(value1, [value2, ...])',
    description: 'The middle value of a set of numbers.',
    example: '=MEDIAN(B2:B10)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      const numbers = collectNumbers(args)
      if (isError(numbers)) return numbers
      if (numbers.length === 0) return makeError('#NUM!', 'MEDIAN found no numbers.')
      const sorted = [...numbers].sort((a, b) => a - b)
      const middle = Math.floor(sorted.length / 2)
      return sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2
    },
  },
  {
    name: 'MIN',
    category: 'Statistics',
    syntax: 'MIN(value1, [value2, ...])',
    description: 'The smallest number.',
    example: '=MIN(B2:B10)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      const numbers = collectNumbers(args)
      if (isError(numbers)) return numbers
      return numbers.length === 0 ? 0 : Math.min(...numbers)
    },
  },
  {
    name: 'MAX',
    category: 'Statistics',
    syntax: 'MAX(value1, [value2, ...])',
    description: 'The largest number.',
    example: '=MAX(B2:B10)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      const numbers = collectNumbers(args)
      if (isError(numbers)) return numbers
      return numbers.length === 0 ? 0 : Math.max(...numbers)
    },
  },
  {
    name: 'COUNT',
    category: 'Statistics',
    syntax: 'COUNT(value1, [value2, ...])',
    description: 'Counts how many cells contain numbers.',
    example: '=COUNT(B2:B10)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      let count = 0
      for (const arg of args) {
        if (isRange(arg)) {
          count += flattenRange(arg).filter((value) => typeof value === 'number').length
        } else if (typeof arg === 'number' || typeof arg === 'boolean') {
          count++
        } else if (typeof arg === 'string' && parseNumber(arg)) {
          count++
        }
      }
      return count
    },
  },
  {
    name: 'COUNTA',
    category: 'Statistics',
    syntax: 'COUNTA(value1, [value2, ...])',
    description: 'Counts how many cells are not empty (numbers, text and anything else).',
    example: '=COUNTA(A2:A10)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      let count = 0
      for (const arg of args) {
        if (isRange(arg))
          count += flattenRange(arg).filter((value) => value !== null).length
        else if (arg !== null) count++
      }
      return count
    },
  },
  {
    name: 'COUNTBLANK',
    category: 'Statistics',
    syntax: 'COUNTBLANK(range)',
    description: 'Counts how many cells in a range are empty.',
    example: '=COUNTBLANK(C2:C10)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) =>
      flattenRange(asRange(args[0])).filter((value) => value === null || value === '')
        .length,
  },
  {
    name: 'COUNTIF',
    category: 'Statistics',
    syntax: 'COUNTIF(range, condition)',
    description:
      'Counts the cells that meet a condition, such as "Paid", ">100" or "<>Cancelled".',
    example: '=COUNTIF(D2:D10, "Paid")',
    minArgs: 2,
    maxArgs: 2,
    evaluate: (args) => {
      const criterion = scalar(args[1], 'COUNTIF')
      if (isError(criterion)) return criterion
      const matches = makeMatcher(criterion)
      return flattenRange(asRange(args[0])).filter(matches).length
    },
  },
  {
    name: 'SUMIF',
    category: 'Math',
    syntax: 'SUMIF(range, condition, [sum_range])',
    description:
      'Adds the values for the cells that meet a condition. If sum_range is given, the matching values are taken from it.',
    example: '=SUMIF(B2:B10, "Travel", C2:C10)',
    minArgs: 2,
    maxArgs: 3,
    evaluate: (args) => {
      const numbers = matchingValues(args, 'SUMIF')
      return isError(numbers) ? numbers : numbers.reduce((a, b) => a + b, 0)
    },
  },
  {
    name: 'AVERAGEIF',
    category: 'Statistics',
    syntax: 'AVERAGEIF(range, condition, [average_range])',
    description: 'The average of the values for the cells that meet a condition.',
    example: '=AVERAGEIF(B2:B10, "Travel", C2:C10)',
    minArgs: 2,
    maxArgs: 3,
    evaluate: (args) => {
      const numbers = matchingValues(args, 'AVERAGEIF')
      if (isError(numbers)) return numbers
      if (numbers.length === 0) {
        return makeError('#DIV/0!', 'AVERAGEIF found no matching numbers to average.')
      }
      return numbers.reduce((a, b) => a + b, 0) / numbers.length
    },
  },
  {
    name: 'COUNTIFS',
    category: 'Statistics',
    syntax: 'COUNTIFS(range1, condition1, [range2, condition2, ...])',
    description:
      'Counts the rows that meet every condition, each tested in its own range.',
    example: '=COUNTIFS(B2:B10, "North", D2:D10, ">100")',
    minArgs: 2,
    maxArgs: MANY,
    evaluate: (args) => {
      const matches = multiMatch(args, 'COUNTIFS', false)
      return isError(matches) ? matches : matches.length
    },
  },
  {
    name: 'SUMIFS',
    category: 'Math',
    syntax: 'SUMIFS(sum_range, range1, condition1, [range2, condition2, ...])',
    description:
      'Adds the values in sum_range for the rows that meet every condition. Note that the values to add come first.',
    example: '=SUMIFS(D2:D10, B2:B10, "North", C2:C10, "Laptops")',
    minArgs: 3,
    maxArgs: MANY,
    evaluate: (args) => {
      const matches = multiMatch(args, 'SUMIFS', true)
      if (isError(matches)) return matches
      return numbersOnly(matches).reduce((a, b) => a + b, 0)
    },
  },
  {
    name: 'AVERAGEIFS',
    category: 'Statistics',
    syntax: 'AVERAGEIFS(average_range, range1, condition1, [range2, condition2, ...])',
    description:
      'The average of the values in average_range for the rows that meet every condition.',
    example: '=AVERAGEIFS(D2:D10, B2:B10, "North", C2:C10, "Laptops")',
    minArgs: 3,
    maxArgs: MANY,
    evaluate: (args) => {
      const matches = multiMatch(args, 'AVERAGEIFS', true)
      if (isError(matches)) return matches
      const numbers = numbersOnly(matches)
      if (numbers.length === 0) {
        return makeError('#DIV/0!', 'AVERAGEIFS found no matching numbers to average.')
      }
      return numbers.reduce((a, b) => a + b, 0) / numbers.length
    },
  },

  // --- Logic ---
  {
    name: 'IF',
    category: 'Logic',
    syntax: 'IF(condition, value_if_true, [value_if_false])',
    description: 'Gives one value if a condition is true and another if it is false.',
    example: '=IF(C2>1000, "Needs approval", "OK")',
    minArgs: 2,
    maxArgs: 3,
    evaluateLazy: (args) => {
      const condition = args[0]()
      if (isRange(condition)) return RANGE_NOT_ALLOWED('IF')
      const result = toBoolean(condition)
      if (isError(result)) return result
      if (result) return scalar(args[1](), 'IF')
      return args.length > 2 ? scalar(args[2](), 'IF') : false
    },
  },
  {
    name: 'IFERROR',
    category: 'Logic',
    syntax: 'IFERROR(value, value_if_error)',
    description: 'Shows the value, or a replacement if it is an error such as #N/A.',
    example: '=IFERROR(VLOOKUP(A2, F:G, 2, FALSE), "Not found")',
    minArgs: 2,
    maxArgs: 2,
    evaluateLazy: (args) => {
      const value = scalar(args[0](), 'IFERROR')
      return isError(value) ? scalar(args[1](), 'IFERROR') : value
    },
  },
  {
    name: 'AND',
    category: 'Logic',
    syntax: 'AND(condition1, [condition2, ...])',
    description: 'TRUE if all conditions are true.',
    example: '=AND(C2>0, D2="Approved")',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => logical(args, 'AND', 'and'),
  },
  {
    name: 'OR',
    category: 'Logic',
    syntax: 'OR(condition1, [condition2, ...])',
    description: 'TRUE if at least one condition is true.',
    example: '=OR(D2="Late", D2="Missing")',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => logical(args, 'OR', 'or'),
  },
  {
    name: 'NOT',
    category: 'Logic',
    syntax: 'NOT(condition)',
    description: 'Turns TRUE into FALSE and FALSE into TRUE.',
    example: '=NOT(D2="Paid")',
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) => {
      const value = toBoolean(scalar(args[0], 'NOT'))
      return isError(value) ? value : !value
    },
  },

  // --- Lookup ---
  {
    name: 'VLOOKUP',
    category: 'Lookup',
    syntax: 'VLOOKUP(search_value, range, column_number, [approximate])',
    description:
      'Finds a value in the first column of a range and returns the value from another column in the same row. Use FALSE as the last value for an exact match.',
    example: '=VLOOKUP(A2, Prices!A:C, 3, FALSE)',
    minArgs: 3,
    maxArgs: 4,
    evaluate: (args) => lookup(args, 'VLOOKUP'),
  },
  {
    name: 'HLOOKUP',
    category: 'Lookup',
    syntax: 'HLOOKUP(search_value, range, row_number, [approximate])',
    description:
      'Like VLOOKUP, but searches the first row of a range and returns a value from a row below.',
    example: '=HLOOKUP("Q2", B1:E5, 3, FALSE)',
    minArgs: 3,
    maxArgs: 4,
    evaluate: (args) => lookup(args, 'HLOOKUP'),
  },
  {
    name: 'MATCH',
    category: 'Lookup',
    syntax: 'MATCH(search_value, range, [match_type])',
    description:
      'The position of a value in a single row or column. Use 0 as match_type for an exact match.',
    example: '=MATCH("Travel", A2:A10, 0)',
    minArgs: 2,
    maxArgs: 3,
    evaluate: (args) => {
      const key = scalar(args[0], 'MATCH')
      if (isError(key)) return key
      const range = asRange(args[1])
      if (range.rows.length > 1 && (range.rows[0]?.length ?? 0) > 1) {
        return makeError('#N/A', 'MATCH needs a single row or a single column.')
      }
      const typeArg = args.length > 2 ? numberArg(args[2], 'MATCH') : 1
      if (isError(typeArg)) return typeArg
      const mode = typeArg === 0 ? 0 : typeArg > 0 ? 1 : -1
      const position = findPosition(flattenRange(range), key, mode)
      return position === -1
        ? makeError('#N/A', `MATCH could not find ${describe(key)}.`)
        : position + 1
    },
  },
  {
    name: 'INDEX',
    category: 'Lookup',
    syntax: 'INDEX(range, row_number, [column_number])',
    description: 'The value at a given row and column inside a range.',
    example: '=INDEX(B2:D10, 3, 2)',
    minArgs: 2,
    maxArgs: 3,
    evaluate: (args) => {
      const range = asRange(args[0])
      const first = numberArg(args[1], 'INDEX')
      if (isError(first)) return first
      const second =
        args.length > 2 && args[2] !== null ? numberArg(args[2], 'INDEX') : null
      if (isError(second)) return second
      let row = Math.trunc(first)
      let column = second === null ? 1 : Math.trunc(second)
      // A single row with one number given: the number picks the column.
      if (second === null && range.rows.length === 1) {
        column = row
        row = 1
      }
      if (row < 1 || column < 1) {
        return makeError('#VALUE!', 'INDEX needs row and column numbers of 1 or more.')
      }
      const value = range.rows[row - 1]?.[column - 1]
      return value === undefined
        ? makeError('#REF!', 'INDEX asks for a position outside the range.')
        : value
    },
  },

  // --- Text ---
  {
    name: 'CONCATENATE',
    category: 'Text',
    syntax: 'CONCATENATE(text1, [text2, ...])',
    description: 'Joins pieces of text together. You can also use the & operator.',
    example: '=CONCATENATE(A2, " ", B2)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      let result = ''
      for (const arg of args) {
        const text = textArg(arg, 'CONCATENATE')
        if (isError(text)) return text
        result += text
      }
      return result
    },
  },
  {
    name: 'CONCAT',
    category: 'Text',
    syntax: 'CONCAT(text1, [text2, ...])',
    description: 'Joins pieces of text together, including all cells of a range.',
    example: '=CONCAT(A2:C2)',
    minArgs: 1,
    maxArgs: MANY,
    evaluate: (args) => {
      let result = ''
      for (const value of args.flatMap((arg) =>
        isRange(arg) ? flattenRange(arg) : [arg],
      )) {
        const text = toText(value)
        if (isError(text)) return text
        result += text
      }
      return result
    },
  },
  {
    name: 'LEN',
    category: 'Text',
    syntax: 'LEN(text)',
    description: 'The number of characters in a piece of text.',
    example: '=LEN(A2)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) => {
      const text = textArg(args[0], 'LEN')
      return isError(text) ? text : text.length
    },
  },
  {
    name: 'UPPER',
    category: 'Text',
    syntax: 'UPPER(text)',
    description: 'Converts text to CAPITAL LETTERS.',
    example: '=UPPER(A2)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: textFunction('UPPER', (text) => text.toUpperCase()),
  },
  {
    name: 'LOWER',
    category: 'Text',
    syntax: 'LOWER(text)',
    description: 'Converts text to lower case.',
    example: '=LOWER(A2)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: textFunction('LOWER', (text) => text.toLowerCase()),
  },
  {
    name: 'PROPER',
    category: 'Text',
    syntax: 'PROPER(text)',
    description: 'Capitalises The First Letter Of Each Word.',
    example: '=PROPER(A2)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: textFunction('PROPER', (text) =>
      text
        .toLowerCase()
        .replace(
          /(^|[^a-z])([a-z])/g,
          (_, before: string, letter: string) => `${before}${letter.toUpperCase()}`,
        ),
    ),
  },
  {
    name: 'TRIM',
    category: 'Text',
    syntax: 'TRIM(text)',
    description: 'Removes extra spaces from text, leaving single spaces between words.',
    example: '=TRIM(A2)',
    minArgs: 1,
    maxArgs: 1,
    evaluate: textFunction('TRIM', (text) => text.trim().replace(/ {2,}/g, ' ')),
  },
  {
    name: 'SUBSTITUTE',
    category: 'Text',
    syntax: 'SUBSTITUTE(text, old_text, new_text)',
    description:
      'Replaces every copy of old_text with new_text. Useful for cleaning data, such as removing currency signs.',
    example: '=SUBSTITUTE(A2, "£", "")',
    minArgs: 3,
    maxArgs: 3,
    evaluate: (args) => {
      const text = textArg(args[0], 'SUBSTITUTE')
      if (isError(text)) return text
      const find = textArg(args[1], 'SUBSTITUTE')
      if (isError(find)) return find
      const replacement = textArg(args[2], 'SUBSTITUTE')
      if (isError(replacement)) return replacement
      return find === '' ? text : text.split(find).join(replacement)
    },
  },
  {
    name: 'VALUE',
    category: 'Text',
    syntax: 'VALUE(text)',
    description:
      'Turns text that looks like a number, such as "1,200", into a real number.',
    example: '=VALUE(TRIM(A2))',
    minArgs: 1,
    maxArgs: 1,
    evaluate: (args) => {
      const value = scalar(args[0], 'VALUE')
      if (isError(value)) return value
      if (typeof value === 'string' && value.trim() === '') {
        return makeError('#VALUE!', 'VALUE needs some text that looks like a number.')
      }
      return toNumber(value)
    },
  },
  {
    name: 'LEFT',
    category: 'Text',
    syntax: 'LEFT(text, [number_of_characters])',
    description: 'The first characters of a piece of text.',
    example: '=LEFT(A2, 3)',
    minArgs: 1,
    maxArgs: 2,
    evaluate: (args) => {
      const text = textArg(args[0], 'LEFT')
      if (isError(text)) return text
      const count = args.length > 1 ? numberArg(args[1], 'LEFT') : 1
      if (isError(count)) return count
      if (count < 0)
        return makeError('#VALUE!', 'LEFT needs a number of characters of 0 or more.')
      return text.slice(0, Math.trunc(count))
    },
  },
  {
    name: 'RIGHT',
    category: 'Text',
    syntax: 'RIGHT(text, [number_of_characters])',
    description: 'The last characters of a piece of text.',
    example: '=RIGHT(A2, 4)',
    minArgs: 1,
    maxArgs: 2,
    evaluate: (args) => {
      const text = textArg(args[0], 'RIGHT')
      if (isError(text)) return text
      const count = args.length > 1 ? numberArg(args[1], 'RIGHT') : 1
      if (isError(count)) return count
      if (count < 0)
        return makeError('#VALUE!', 'RIGHT needs a number of characters of 0 or more.')
      const n = Math.trunc(count)
      return n === 0 ? '' : text.slice(-n)
    },
  },
  {
    name: 'MID',
    category: 'Text',
    syntax: 'MID(text, start, number_of_characters)',
    description:
      'Characters from the middle of a piece of text, starting at position start.',
    example: '=MID(A2, 4, 2)',
    minArgs: 3,
    maxArgs: 3,
    evaluate: (args) => {
      const text = textArg(args[0], 'MID')
      if (isError(text)) return text
      const start = numberArg(args[1], 'MID')
      if (isError(start)) return start
      const count = numberArg(args[2], 'MID')
      if (isError(count)) return count
      if (start < 1 || count < 0) {
        return makeError(
          '#VALUE!',
          'MID needs a start of 1 or more and a length of 0 or more.',
        )
      }
      const from = Math.trunc(start) - 1
      return text.slice(from, from + Math.trunc(count))
    },
  },
]

export const FUNCTIONS: ReadonlyMap<string, FunctionDefinition> = new Map(
  DEFINITIONS.map((definition) => [definition.name, definition]),
)

export const FUNCTION_NAMES: readonly string[] = DEFINITIONS.map((d) => d.name).sort()

/** The closest known function name, to suggest when a name is misspelled. */
export function suggestFunctionName(name: string): string | null {
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of FUNCTION_NAMES) {
    const distance = editDistance(name, candidate)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return bestDistance <= Math.max(1, Math.floor(name.length / 3)) ? best : null
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j]
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diagonal = above
    }
  }
  return previous[b.length]
}
