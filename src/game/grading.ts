/**
 * Automatic grading. The player's workbook is compared with the model answer:
 *
 * 1. Values: each checked cell must show the same result as the model answer.
 * 2. Formulas: where required, the cell must contain a formula (and use the
 *    required function), not a typed-in result.
 * 3. Robustness: the data is changed as described in the assignment's
 *    scenarios (e.g. a different quantity) and both workbooks are
 *    recalculated. A formula that hides fixed numbers, or points at the wrong
 *    cells, gives a different result and is caught.
 *
 * Every problem is described in plain words, cell by cell, so the player knows
 * exactly what to fix.
 */
import { parseRange, rangeAddresses } from '../apps/sheets/model'
import type { Node } from '../apps/sheets/engine/parser'
import { FormulaParseError } from '../apps/sheets/engine/parser'
import {
  isError,
  isFormula,
  parseNumber,
  toText,
  type CellValue,
} from '../apps/sheets/engine/values'
import {
  createCalculator,
  parseCached,
  type WorkbookCalculator,
} from '../apps/sheets/engine/workbook'
import type { Assignment, Check } from '../content/schemas'
import type { CellFormat, SheetContent } from '../persistence/schemas'
import {
  applyScenario,
  buildSolutionContent,
  buildStartingContent,
  findSheet,
  splitSheetAddress,
} from './workbooks'
import { fill } from '../content/departments'
import { gradeDeliverables, type SubmittedFiles } from './deliverables'

export type CheckStatus = 'passed' | 'partial' | 'failed'
export type Rating = 'excellent' | 'good' | 'pass' | 'fail'

export interface CheckResult {
  id: string
  title: string
  why: string
  hint: string
  status: CheckStatus
  earned: number
  points: number
  /** What is wrong, cell by cell (at most a few, then a count). */
  problems: string[]
}

export interface GradeResult {
  /** 0–100. */
  score: number
  rating: Rating
  passed: boolean
  earned: number
  maxPoints: number
  checks: CheckResult[]
}

const MAX_PROBLEMS_SHOWN = 4

interface CellRef {
  sheet: string
  address: string
}

/** Every cell named by a check, e.g. ["Order!E2:E4"] → E2, E3, E4 on "Order". */
export function expandCells(ranges: string[]): CellRef[] {
  return ranges.flatMap((reference) => {
    const { sheet, address } = splitSheetAddress(reference)
    const range = parseRange(address)
    return range ? rangeAddresses(range).map((a) => ({ sheet, address: a })) : []
  })
}

function inputOf(content: SheetContent, ref: CellRef): string | null {
  const sheet = findSheet(content, ref.sheet)
  return sheet ? (sheet.cells[ref.address]?.input ?? '') : null
}

function valueOf(
  calculator: WorkbookCalculator,
  content: SheetContent,
  ref: CellRef,
): CellValue | undefined {
  const sheet = findSheet(content, ref.sheet)
  return sheet ? calculator.getValue(sheet.id, ref.address) : undefined
}

function sameValue(actual: CellValue, expected: CellValue, tolerance: number): boolean {
  if (isError(actual) || isError(expected)) {
    return isError(actual) && isError(expected) && actual.code === expected.code
  }
  if (typeof expected === 'number') {
    return typeof actual === 'number' && Math.abs(actual - expected) <= tolerance + 1e-9
  }
  if (typeof expected === 'string') {
    return (
      typeof actual === 'string' &&
      actual.trim().toLowerCase() === expected.trim().toLowerCase()
    )
  }
  return actual === expected
}

function describeValue(value: CellValue): string {
  if (value === null || value === '') return 'nothing'
  if (isError(value)) return `the error ${value.code}`
  if (typeof value === 'string') return `"${value}"`
  return String(toText(value))
}

/** Names of all functions used in a formula. */
export function functionsUsed(input: string): Set<string> {
  const names = new Set<string>()
  if (!isFormula(input)) return names
  const parsed = parseCached(input)
  if (parsed instanceof FormulaParseError) return names
  const visit = (node: Node) => {
    if (node.type === 'call') {
      names.add(node.name)
      node.args.forEach(visit)
    } else if (node.type === 'binary') {
      visit(node.left)
      visit(node.right)
    } else if (node.type === 'unary' || node.type === 'percent') {
      visit(node.operand)
    }
  }
  visit(parsed)
  return names
}

function listOr(names: string[]): string {
  return names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`
}

const FORMAT_DESCRIPTIONS: Record<keyof CellFormat, (value: unknown) => string> = {
  bold: () => 'bold',
  italic: () => 'italic',
  underline: () => 'underlined',
  textColor: (value) => `in ${String(value)} text`,
  align: (value) => `aligned ${String(value)}`,
  numberFormat: (value) =>
    value === 'currency'
      ? 'formatted as currency'
      : value === 'percent'
        ? 'formatted as a percentage'
        : 'formatted as a number',
  decimals: (value) => `shown with ${String(value)} decimal places`,
  fill: (value) => `filled ${String(value)}`,
}

interface Workbooks {
  player: SheetContent
  start: SheetContent
  solution: SheetContent
  playerCalc: WorkbookCalculator
  solutionCalc: WorkbookCalculator
  scenarios: Array<{
    description: string
    player: SheetContent
    solution: SheetContent
    playerCalc: WorkbookCalculator
    solutionCalc: WorkbookCalculator
  }>
}

function gradeCheck(check: Check, books: Workbooks): CheckResult {
  if (check.type === 'chart') return gradeChartCheck(check, books)
  const cells = expandCells(check.cells)
  const problems: string[] = []
  let correct = 0
  const missingSheets = new Set<string>()

  for (const ref of cells) {
    if (!findSheet(books.player, ref.sheet)) {
      missingSheets.add(ref.sheet)
      continue
    }
    const problem = cellProblem(check, ref, books)
    if (problem) problems.push(problem)
    else correct++
  }

  const shown = [
    ...[...missingSheets].map(
      (sheet) => `The sheet "${sheet}" is missing. Was it renamed or deleted?`,
    ),
    ...problems.slice(0, MAX_PROBLEMS_SHOWN),
  ]
  if (problems.length > MAX_PROBLEMS_SHOWN) {
    shown.push(`…and ${problems.length - MAX_PROBLEMS_SHOWN} more cells like this.`)
  }

  const allOrNothing = check.type === 'unchanged'
  const fraction = cells.length === 0 ? 0 : correct / cells.length
  const earned = allOrNothing
    ? fraction === 1
      ? check.points
      : 0
    : Math.round(check.points * fraction)
  const status: CheckStatus =
    earned === check.points ? 'passed' : earned === 0 ? 'failed' : 'partial'
  return {
    id: check.id,
    title: check.title,
    why: check.why,
    hint: check.hint,
    status,
    earned,
    points: check.points,
    problems: status === 'passed' ? [] : shown,
  }
}

/** The sheet must have a chart drawn from (part of) the checked cells. */
function gradeChartCheck(
  check: Extract<Check, { type: 'chart' }>,
  books: Workbooks,
): CheckResult {
  const [first] = check.cells
  const [sheetName, rangeText] = first.split('!')
  const target = parseRange(rangeText)
  const sheet = findSheet(books.player, sheetName)
  const found = (sheet?.charts ?? []).some((chart) => {
    const range = parseRange(chart.range)
    return (
      !!range &&
      !!target &&
      range.left <= target.right &&
      range.right >= target.left &&
      range.top <= target.bottom &&
      range.bottom >= target.top
    )
  })
  return {
    id: check.id,
    title: check.title,
    why: check.why,
    hint: check.hint,
    status: found ? 'passed' : 'failed',
    earned: found ? check.points : 0,
    points: check.points,
    problems: found
      ? []
      : [`There is no chart of ${rangeText} on the ${sheetName} sheet.`],
  }
}

/** What is wrong with one cell, or null if it is right. */
function cellProblem(check: Check, ref: CellRef, books: Workbooks): string | null {
  const { address } = ref
  const input = inputOf(books.player, ref) ?? ''

  if (check.type === 'unchanged') {
    const original = inputOf(books.start, ref) ?? ''
    if (input === original) return null
    if (original === '') return `${address} was empty but now contains "${input}".`
    if (input === '') return `${address} was cleared (it contained "${original}").`
    return `${address} was changed from "${original}" to "${input}".`
  }

  if (check.type === 'format') {
    const format = findSheet(books.player, ref.sheet)?.cells[address]?.format ?? {}
    const missing = (Object.keys(check.format) as Array<keyof CellFormat>).filter(
      (key) => format[key] !== check.format[key],
    )
    if (missing.length === 0) return null
    return `${address} is not ${missing
      .map((key) => FORMAT_DESCRIPTIONS[key](check.format[key]))
      .join(' and ')}.`
  }

  // Values (charts are graded separately)
  if (check.type === 'chart') return null
  const actual = valueOf(books.playerCalc, books.player, ref) ?? null
  const expected = valueOf(books.solutionCalc, books.solution, ref) ?? null
  if (!sameValue(actual, expected, check.tolerance)) {
    if (actual === null || actual === '') return `${address} is empty.`
    if (isError(actual)) return `${address} shows ${actual.code}: ${actual.message}`
    return `${address} shows ${describeValue(actual)}, which is not the right result.`
  }
  if (check.requireFormula && !isFormula(input)) {
    return `${address} has the right number, but it was typed in. Use a formula so it updates when the data changes.`
  }
  if (check.functions.length > 0) {
    const used = functionsUsed(input)
    if (!check.functions.some((name) => used.has(name))) {
      return `${address} gives the right result, but should use ${listOr(check.functions)}.`
    }
  }
  if (check.requireFormula) {
    for (const scenario of books.scenarios) {
      const scenarioActual = valueOf(scenario.playerCalc, scenario.player, ref) ?? null
      const scenarioExpected =
        valueOf(scenario.solutionCalc, scenario.solution, ref) ?? null
      if (!sameValue(scenarioActual, scenarioExpected, check.tolerance)) {
        return `${address} is right for now, but went wrong when we tested a change to the data (${scenario.description.toLowerCase()}). Make sure the formula refers to the right cells instead of fixed numbers.`
      }
    }
  }
  return null
}

export function ratingFor(score: number, passScore: number): Rating {
  if (score < passScore) return 'fail'
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  return 'pass'
}

/**
 * Grades the player's work for an assignment: the workbook, and the report
 * and presentation when the task has them. A workbook that was not handed in
 * (null) scores nothing on the workbook checks.
 */
export function gradeAssignment(
  assignment: Assignment,
  handedIn: SheetContent | null,
  files: SubmittedFiles = {},
): GradeResult {
  const start = buildStartingContent(assignment)
  const solution = buildSolutionContent(assignment)
  const player = handedIn ?? start
  const books: Workbooks = {
    player,
    start,
    solution,
    playerCalc: createCalculator(player),
    solutionCalc: createCalculator(solution),
    scenarios: [...assignment.scenarios, changeAllNumbers(start)].map((scenario) => {
      const changedPlayer = applyScenario(player, scenario.changes)
      const changedSolution = applyScenario(solution, scenario.changes)
      return {
        description: scenario.description,
        player: changedPlayer,
        solution: changedSolution,
        playerCalc: createCalculator(changedPlayer),
        solutionCalc: createCalculator(changedSolution),
      }
    }),
  }

  const sheetChecks = assignment.checks.map((check) =>
    handedIn
      ? gradeCheck(check, books)
      : {
          id: check.id,
          title: check.title,
          why: check.why,
          hint: check.hint,
          status: 'failed' as const,
          earned: 0,
          points: check.points,
          problems: [
            fill('The workbook was not attached. Attach it to your email to {manager}.'),
          ],
        },
  )
  const fileChecks = gradeDeliverables(assignment.deliverables, files, {
    calculator: books.solutionCalc,
    content: solution,
  })
  const checks = [...sheetChecks, ...fileChecks]
  const earned = checks.reduce((total, check) => total + check.earned, 0)
  const maxPoints = checks.reduce((total, check) => total + check.points, 0)
  const score = maxPoints === 0 ? 0 : Math.round((100 * earned) / maxPoints)
  const rating = ratingFor(score, assignment.passScore)
  return { score, rating, passed: rating !== 'fail', earned, maxPoints, checks }
}

/**
 * A scenario that changes every number in the starting data. Any formula that
 * contains a typed-in number instead of a cell reference gives a different
 * result from the model answer.
 */
export function changeAllNumbers(start: SheetContent): {
  description: string
  changes: Record<string, string>
} {
  const changes: Record<string, string> = {}
  for (const sheet of start.sheets) {
    for (const [address, cell] of Object.entries(sheet.cells)) {
      const number = parseNumber(cell.input)
      if (!number || isFormula(cell.input)) continue
      const value = number.value
      const changed = Number.isInteger(value)
        ? value + 3
        : Math.round((value * 1.1 + 0.37) * 100) / 100
      changes[`${sheet.name}!${address}`] = String(changed)
    }
  }
  return { description: 'We changed the numbers in the source data', changes }
}
