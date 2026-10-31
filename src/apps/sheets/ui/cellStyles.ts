/** Shared visual styles for cells. Class names are written out in full so Tailwind includes them. */
import type { FillColor } from '../../../persistence/schemas'

export const FILL_CLASSES: Record<FillColor, string> = {
  yellow: 'bg-yellow-100',
  green: 'bg-green-100',
  blue: 'bg-sky-100',
  red: 'bg-red-100',
  gray: 'bg-slate-200',
}

/** Colours for the references in a formula being edited, in order of appearance. */
export const REFERENCE_COLORS = [
  'border-blue-600 bg-blue-500/10',
  'border-rose-600 bg-rose-500/10',
  'border-violet-600 bg-violet-500/10',
  'border-emerald-600 bg-emerald-500/10',
  'border-amber-600 bg-amber-500/10',
]
