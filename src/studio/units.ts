/**
 * Lengths shown and typed in the player's units. The model always stores
 * millimetres; these only convert at the edges.
 */
import type { Units } from './model'

export const MM_PER_INCH = 25.4
export const MM_PER_FOOT = 304.8

export const UNIT_NAMES: Record<Units, string> = {
  mm: 'Millimetres',
  cm: 'Centimetres',
  m: 'Metres',
  'ft-in': 'Feet and inches',
}

/** A length for display, e.g. "3600 mm", "360 cm", "3.60 m", "11' 9¾\"". */
export function formatLength(mm: number, units: Units): string {
  const sign = mm < 0 ? '-' : ''
  const v = Math.abs(mm)
  switch (units) {
    case 'mm':
      return `${sign}${Math.round(v)} mm`
    case 'cm':
      return `${sign}${trim(v / 10, 1)} cm`
    case 'm':
      return `${sign}${(v / 1000).toFixed(2)} m`
    case 'ft-in': {
      const totalQuarters = Math.round((v / MM_PER_INCH) * 4)
      const feet = Math.floor(totalQuarters / 48)
      const quarters = totalQuarters - feet * 48
      const inches = Math.floor(quarters / 4)
      const frac = ['', '¼', '½', '¾'][quarters % 4]
      return `${sign}${feet}' ${inches}${frac}"`
    }
  }
}

/** The number alone in the player's units, for an input field. */
export function lengthValue(mm: number, units: Units): string {
  switch (units) {
    case 'mm':
      return String(Math.round(mm))
    case 'cm':
      return trim(mm / 10, 1)
    case 'm':
      return trim(mm / 1000, 3)
    case 'ft-in':
      return formatLength(mm, 'ft-in')
  }
}

/** The short name of the unit typed into fields. */
export function unitSuffix(units: Units): string {
  return units === 'ft-in' ? 'ft-in' : units
}

/**
 * Reads a typed length. A bare number is in the player's units; a unit can be
 * typed: "3600", "360cm", "3.6 m", "12'", "11' 6\"", "11ft 6in", "40in".
 * Returns millimetres, or null if it cannot be read.
 */
export function parseLength(text: string, units: Units): number | null {
  const s = text.trim().toLowerCase().replace(/,/g, '.')
  if (!s) return null
  const feetInches = s.match(
    /^(-?\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?)?$/,
  )
  if (feetInches) {
    const feet = Number(feetInches[1])
    const inches = feetInches[2] ? Number(feetInches[2]) : 0
    return round(
      Math.sign(feet || 1) * (Math.abs(feet) * MM_PER_FOOT + inches * MM_PER_INCH),
    )
  }
  const withUnit = s.match(/^(-?\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch|inches|")$/)
  if (withUnit) {
    const n = Number(withUnit[1])
    const u = withUnit[2]
    if (u === 'mm') return round(n)
    if (u === 'cm') return round(n * 10)
    if (u === 'm') return round(n * 1000)
    return round(n * MM_PER_INCH)
  }
  if (/^-?\d+(?:\.\d+)?$/.test(s)) {
    const n = Number(s)
    switch (units) {
      case 'mm':
        return round(n)
      case 'cm':
        return round(n * 10)
      case 'm':
        return round(n * 1000)
      case 'ft-in':
        return round(n * MM_PER_FOOT)
    }
  }
  return null
}

/** An area for display: m² (or ft² for imperial). */
export function formatArea(mm2: number, units: Units): string {
  if (units === 'ft-in') return `${(mm2 / (MM_PER_FOOT * MM_PER_FOOT)).toFixed(1)} ft²`
  return `${(mm2 / 1_000_000).toFixed(2)} m²`
}

export function formatMoney(pounds: number): string {
  return `£${Math.round(pounds).toLocaleString('en-GB')}`
}

const round = (n: number) => Math.round(n * 10) / 10
function trim(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)))
}
