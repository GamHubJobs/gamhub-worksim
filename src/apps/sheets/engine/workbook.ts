/**
 * Calculates every cell of a workbook. Values are worked out on demand and
 * remembered, so only the cells that are actually shown or needed are
 * calculated. A new calculator is made whenever the content changes; since
 * content is never changed in place, nothing can ever be out of date.
 */
import type { Sheet, SheetContent } from '../../../persistence/schemas'
import { parseAddress, toAddress } from '../model'
import { evaluateTree, type EvaluationContext } from './evaluate'
import { FormulaParseError, parseFormula, type Node } from './parser'
import {
  isFormula,
  makeError,
  parseLiteral,
  type CellValue,
  type ErrorValue,
  type RangeValue,
} from './values'

/** Ranges larger than this are refused, to keep the app responsive. */
export const MAX_RANGE_CELLS = 200_000

// Parsing the same formula text twice gives the same result, so remember it.
const parseCache = new Map<string, Node | FormulaParseError>()

export function parseCached(input: string): Node | FormulaParseError {
  let parsed = parseCache.get(input)
  if (parsed === undefined) {
    try {
      parsed = parseFormula(input)
    } catch (error) {
      if (!(error instanceof FormulaParseError)) throw error
      parsed = error
    }
    if (parseCache.size > 20_000) parseCache.clear()
    parseCache.set(input, parsed)
  }
  return parsed
}

export interface WorkbookCalculator {
  /** The calculated value of a cell. */
  getValue(sheetId: string, address: string): CellValue
}

interface SheetInfo {
  sheet: Sheet
  values: Map<string, CellValue>
  /** Highest used row index (0-based), for whole-column ranges such as A:A. */
  lastRow: number
}

export function createCalculator(content: SheetContent): WorkbookCalculator {
  const byId = new Map<string, SheetInfo>()
  const byName = new Map<string, SheetInfo>()
  for (const sheet of content.sheets) {
    let lastRow = -1
    for (const address of Object.keys(sheet.cells)) {
      const position = parseAddress(address)
      if (position && position.row > lastRow) lastRow = position.row
    }
    const info: SheetInfo = { sheet, values: new Map(), lastRow }
    byId.set(sheet.id, info)
    byName.set(sheet.name.toLowerCase(), info)
  }
  /** Cells being calculated right now: meeting one again means a circular reference. */
  const inProgress = new Set<string>()
  let depth = 0

  function resolveSheet(
    current: SheetInfo,
    name: string | undefined,
  ): SheetInfo | ErrorValue {
    if (name === undefined) return current
    return (
      byName.get(name.toLowerCase()) ??
      makeError('#REF!', `There is no sheet called "${name}" in this workbook.`)
    )
  }

  function valueOf(info: SheetInfo, address: string): CellValue {
    const cached = info.values.get(address)
    if (cached !== undefined) return cached
    const input = info.sheet.cells[address]?.input ?? ''
    if (!isFormula(input)) return parseLiteral(input).value

    const key = `${info.sheet.id}!${address}`
    if (inProgress.has(key)) {
      return makeError(
        '#REF!',
        `Circular reference: the formula in ${address} ends up depending on itself.`,
      )
    }
    // A very long chain of formulas (e.g. a running total over thousands of
    // rows) would overflow the call stack. Stop here; `getValue` calculates
    // this cell first and then tries again.
    if (depth >= MAX_DEPTH) throw new TooDeep(info, address)

    inProgress.add(key)
    depth++
    let value: CellValue
    try {
      const parsed = parseCached(input)
      value =
        parsed instanceof FormulaParseError
          ? makeError('#ERROR!', parsed.message)
          : evaluateTree(parsed, contextFor(info))
    } finally {
      depth--
      inProgress.delete(key)
    }
    info.values.set(address, value)
    return value
  }

  function contextFor(info: SheetInfo): EvaluationContext {
    return {
      getCell(sheetName, ref) {
        const target = resolveSheet(info, sheetName)
        if ('kind' in target) return target
        return valueOf(target, toAddress(ref))
      },
      getRange(sheetName, start, end, wholeColumns): RangeValue | ErrorValue {
        const target = resolveSheet(info, sheetName)
        if ('kind' in target) return target
        const firstRow = wholeColumns ? 0 : start.row
        const lastRow = wholeColumns ? target.lastRow : end.row
        const height = lastRow - firstRow + 1
        const width = end.column - start.column + 1
        if (height * width > MAX_RANGE_CELLS) {
          return makeError(
            '#VALUE!',
            'This range is too large. Use a smaller range of cells.',
          )
        }
        const rows: CellValue[][] = []
        for (let row = firstRow; row <= lastRow; row++) {
          const values: CellValue[] = []
          for (let column = start.column; column <= end.column; column++) {
            values.push(valueOf(target, toAddress({ row, column })))
          }
          rows.push(values)
        }
        return { kind: 'range', rows }
      },
    }
  }

  /**
   * Calculates a cell, first calculating any cells deep down its chain of
   * formulas. Each step remembers its results, so every retry gets further.
   */
  function calculate(info: SheetInfo, address: string): CellValue {
    const pending: Array<[SheetInfo, string]> = [[info, address]]
    for (;;) {
      const [pendingInfo, pendingAddress] = pending[pending.length - 1]
      try {
        const value = valueOf(pendingInfo, pendingAddress)
        pending.pop()
        if (pending.length === 0) return value
      } catch (error) {
        if (!(error instanceof TooDeep)) throw error
        const alreadyPending = pending.some(
          ([i, a]) => i === error.info && a === error.address,
        )
        if (alreadyPending) {
          // We came back to a cell we are already waiting for: a long loop.
          error.info.values.set(
            error.address,
            makeError(
              '#REF!',
              `Circular reference: the formula in ${error.address} ends up depending on itself.`,
            ),
          )
        } else {
          pending.push([error.info, error.address])
        }
      }
    }
  }

  return {
    getValue(sheetId, address) {
      const info = byId.get(sheetId)
      return info ? calculate(info, address) : null
    },
  }
}

/** How many formulas deep one calculation may go before it continues in steps. */
const MAX_DEPTH = 200

class TooDeep {
  readonly info: SheetInfo
  readonly address: string
  constructor(info: SheetInfo, address: string) {
    this.info = info
    this.address = address
  }
}

/** Convenience for a single sheet, e.g. in tests: the value at `address`. */
export function calculateCell(
  content: SheetContent,
  address: string,
  sheetIndex = 0,
): CellValue {
  return createCalculator(content).getValue(content.sheets[sheetIndex].id, address)
}
