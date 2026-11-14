/** Which desks a workplace has (drawn in deskStyles.tsx). */
import type { Theme } from './themeLayout'

export type DeskStyle = 'office' | 'drafting' | 'clinical' | 'legal'

/** The desk style for a workplace's theme (the player's desk keeps a computer). */
export function deskStyleFor(theme: Theme, computer: boolean): DeskStyle {
  if (theme === 'hospital') return 'clinical'
  if (theme === 'law') return 'legal'
  if (theme === 'engineering') return computer ? 'office' : 'drafting'
  return 'office'
}

/** The top's colour for a style (null: the office's wood). */
export function deskTop(style: DeskStyle): string | null {
  if (style === 'clinical') return '#f1f5f9'
  if (style === 'legal') return '#5b3417'
  return null
}
