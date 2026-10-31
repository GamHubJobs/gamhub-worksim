/**
 * How a calculated value is shown in a cell: number formats, alignment and
 * error codes.
 */
import type { CellFormat } from '../../../persistence/schemas'
import {
  formatGeneralNumber,
  isError,
  isFormula,
  parseLiteral,
  type CellValue,
  type ImpliedFormat,
} from './values'

/** The currency symbol used by the simulated company. */
export const CURRENCY_SYMBOL = '$'

export const DEFAULT_DECIMALS = { number: 2, currency: 2, percent: 0 } as const

export interface DisplayValue {
  text: string
  align: 'left' | 'center' | 'right'
  isError: boolean
}

function withSeparators(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Decimal places needed to show a number fully (up to `max`). */
function neededDecimals(value: number, max: number): number {
  const text = formatGeneralNumber(value)
  if (text.includes('E')) return max
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : Math.min(max, text.length - dot - 1)
}

export function formatNumber(
  value: number,
  numberFormat: CellFormat['numberFormat'],
  decimals?: number,
  implied?: ImpliedFormat,
): string {
  const kind = numberFormat ?? implied
  switch (kind) {
    case 'number':
      return withSeparators(value, decimals ?? DEFAULT_DECIMALS.number)
    case 'currency': {
      const text = withSeparators(Math.abs(value), decimals ?? DEFAULT_DECIMALS.currency)
      return `${value < 0 ? '-' : ''}${CURRENCY_SYMBOL}${text}`
    }
    case 'percent':
      return `${withSeparators(
        value * 100,
        decimals ??
          (numberFormat ? DEFAULT_DECIMALS.percent : neededDecimals(value * 100, 4)),
      )}%`
    case 'thousands':
      return withSeparators(value, decimals ?? neededDecimals(value, 6))
    default:
      return formatGeneralNumber(value)
  }
}

/**
 * What a cell shows. `input` is what was typed, so a typed "15%" keeps
 * showing as 15% even without a number format.
 */
export function displayValue(
  value: CellValue,
  input: string,
  format: CellFormat | undefined,
): DisplayValue {
  if (value === null) return { text: '', align: format?.align ?? 'left', isError: false }
  if (isError(value)) {
    return { text: value.code, align: format?.align ?? 'center', isError: true }
  }
  if (typeof value === 'boolean') {
    return {
      text: value ? 'TRUE' : 'FALSE',
      align: format?.align ?? 'center',
      isError: false,
    }
  }
  if (typeof value === 'number') {
    const implied = isFormula(input) ? undefined : parseLiteral(input).impliedFormat
    // "4,500.00" keeps showing two decimal places, as typed.
    const typedDecimals =
      implied === 'thousands' && !format?.numberFormat
        ? (/\.(\d+)/.exec(input)?.[1].length ?? 0)
        : undefined
    return {
      text: formatNumber(
        value,
        format?.numberFormat,
        format?.decimals ?? typedDecimals,
        implied,
      ),
      align: format?.align ?? 'right',
      isError: false,
    }
  }
  return { text: value, align: format?.align ?? 'left', isError: false }
}
