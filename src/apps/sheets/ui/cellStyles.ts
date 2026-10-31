/** Shared visual styles for cells. Class names are written out in full so Tailwind includes them. */
import type { FillColor, TextColor } from '../../../persistence/schemas'

export const FILL_CLASSES: Record<FillColor, string> = {
  yellow: 'bg-yellow-100',
  green: 'bg-green-100',
  blue: 'bg-sky-100',
  red: 'bg-red-100',
  gray: 'bg-slate-200',
}

/** Colours for the references in a formula being edited, in order of appearance. */
/** Text colours. */
export const TEXT_CLASSES: Record<TextColor, string> = {
  red: 'text-red-700',
  green: 'text-emerald-700',
  blue: 'text-blue-700',
  amber: 'text-amber-700',
  gray: 'text-slate-500',
}

export const TEXT_COLOR_NAMES: Record<TextColor, string> = {
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
  amber: 'Amber',
  gray: 'Grey',
}

export const REFERENCE_COLORS = [
  'border-blue-600 bg-blue-500/10',
  'border-rose-600 bg-rose-500/10',
  'border-violet-600 bg-violet-500/10',
  'border-emerald-600 bg-emerald-500/10',
  'border-amber-600 bg-amber-500/10',
]
