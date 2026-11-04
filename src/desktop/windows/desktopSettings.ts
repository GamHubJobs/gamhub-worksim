/**
 * How the player has arranged their computer's desktop: wallpaper, icon size
 * and where each icon sits. Kept in LocalStorage per career save, like the
 * window layout: a personal preference, not game data.
 */
import { z } from 'zod'

export const WALLPAPERS = [
  { id: 'cobalt', name: 'Cobalt light' },
  { id: 'harbour', name: 'Harbour blue' },
  { id: 'plain', name: 'Plain blue' },
] as const
export type WallpaperId = (typeof WALLPAPERS)[number]['id']

export const ICON_SIZES = ['small', 'medium', 'large'] as const
export type IconSize = (typeof ICON_SIZES)[number]

/** The grid cell an icon occupies (columns from the left, or from the right). */
const CellSchema = z.object({
  column: z.number().int().min(0),
  row: z.number().int().min(0),
})
export type Cell = z.infer<typeof CellSchema>

const SettingsSchema = z.object({
  wallpaper: z.enum(['cobalt', 'harbour', 'plain']).default('cobalt'),
  iconSize: z.enum(ICON_SIZES).default('medium'),
  /** Icons the player has moved, by icon ID. Others use their default place. */
  positions: z.record(z.string(), CellSchema).default({}),
})
export type DesktopSettings = z.infer<typeof SettingsSchema>

export const DEFAULT_SETTINGS: DesktopSettings = {
  wallpaper: 'cobalt',
  iconSize: 'medium',
  positions: {},
}

/** The size of a grid cell for each icon size, in pixels. */
export const CELL: Record<IconSize, { w: number; h: number; icon: number }> = {
  small: { w: 76, h: 70, icon: 28 },
  medium: { w: 84, h: 90, icon: 40 },
  large: { w: 104, h: 112, icon: 56 },
}

const key = (profileId: string) => `gamhub-worksim:desktop:${profileId}`

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readSettings(
  profileId: string,
  store: Storage | null = storage(),
): DesktopSettings {
  try {
    const raw = store?.getItem(key(profileId))
    if (!raw) return DEFAULT_SETTINGS
    const result = SettingsSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeSettings(
  profileId: string,
  settings: DesktopSettings,
  store: Storage | null = storage(),
): void {
  try {
    store?.setItem(key(profileId), JSON.stringify(settings))
  } catch {
    // Storage full or blocked: the desktop just goes back to its default layout.
  }
}

/**
 * Where every icon goes, on one grid across the desktop. Moved icons keep their
 * cell (if it is still on screen and free); the rest fill the first free cells
 * of their default side: down the first columns on the left, or down the last
 * columns on the right.
 */
export function layoutIcons(
  icons: Array<{ id: string; side: 'left' | 'right' }>,
  positions: Record<string, Cell>,
  grid: { columns: number; rows: number },
): Record<string, Cell> {
  const result: Record<string, Cell> = {}
  const taken = new Set<string>()
  const id = (cell: Cell) => `${cell.column}:${cell.row}`
  const fits = (cell: Cell) => cell.column < grid.columns && cell.row < grid.rows
  for (const icon of icons) {
    const cell = positions[icon.id]
    if (cell && fits(cell) && !taken.has(id(cell))) {
      result[icon.id] = cell
      taken.add(id(cell))
    }
  }
  for (const icon of icons) {
    if (result[icon.id]) continue
    for (let n = 0; n < grid.columns * grid.rows; n++) {
      const column = Math.floor(n / grid.rows)
      const cell = {
        column: icon.side === 'left' ? column : grid.columns - 1 - column,
        row: n % grid.rows,
      }
      if (!taken.has(id(cell))) {
        result[icon.id] = cell
        taken.add(id(cell))
        break
      }
    }
  }
  return result
}
