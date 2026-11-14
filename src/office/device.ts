/**
 * What a tool used where it is looks like it is shown on (office/InPlaceTool.tsx):
 * a tablet on the ward, a laptop at the law firm, a rugged tablet in the
 * workshop, a tablet elsewhere.
 */
import type { Theme } from './scene/themeLayout'

export type Device = 'tablet' | 'laptop' | 'rugged'

export function deviceFor(theme: Theme): Device {
  if (theme === 'law') return 'laptop'
  if (theme === 'engineering') return 'rugged'
  return 'tablet'
}

export const DEVICE_NAME: Record<Device, string> = {
  tablet: 'tablet',
  laptop: 'laptop',
  rugged: 'rugged tablet',
}
