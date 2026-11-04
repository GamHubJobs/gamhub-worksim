/**
 * The work computer's windows: which apps are open, where, how big, which is
 * in front, and which are minimised or maximised. Pure functions, so the
 * behaviour is easy to test; the Desktop component holds the state.
 *
 * Each app has at most one window. Opening an app that already has a window
 * brings that window to the front (restoring it if it was minimised) and shows
 * what was asked for in it, exactly as switching apps did before windows.
 *
 * The layout is remembered per career save in LocalStorage: a convenience like
 * the last view (see lastView.ts), not game data, and never in backups.
 */
import { z } from 'zod'
import { ViewSchema, type View } from '../../persistence/lastView'

/** Built-in windows of the computer itself (not WorkSim apps). */
export const SYSTEM_WINDOWS = ['settings', 'recycle-bin'] as const
export type SystemWindow = (typeof SYSTEM_WINDOWS)[number]

const WindowSchema = z.object({
  key: z.string(),
  /** The app and what it shows (for app windows). */
  view: ViewSchema.optional(),
  /** For the computer's own windows. */
  system: z.enum(SYSTEM_WINDOWS).optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minimized: z.boolean(),
  maximized: z.boolean(),
  /** Stacking order: the highest is in front. */
  z: z.number(),
})

export type AppWindow = z.infer<typeof WindowSchema>

const DeskSchema = z.object({ windows: z.array(WindowSchema) })
export type Desk = z.infer<typeof DeskSchema>

export const EMPTY_DESK: Desk = { windows: [] }

/** The space windows can use (the desktop above the taskbar). */
export interface Area {
  w: number
  h: number
}

export const MIN_SIZE = { w: 420, h: 300 }

/** One window per app; each professional tool is its own app. */
export function keyOf(view: View): string {
  return view.app === 'tool' ? `tool:${view.tool ?? ''}` : view.app
}

function topZ(desk: Desk): number {
  return desk.windows.reduce((max, w) => Math.max(max, w.z), 0)
}

/** The window in front (the one with focus), if any is showing. */
export function focusedWindow(desk: Desk): AppWindow | undefined {
  return desk.windows
    .filter((w) => !w.minimized)
    .reduce<AppWindow | undefined>(
      (best, w) => (!best || w.z > best.z ? w : best),
      undefined,
    )
}

/** Where a new window goes: large, and a little lower and to the right of the last. */
function placeNew(
  desk: Desk,
  area: Area,
): Pick<AppWindow, 'x' | 'y' | 'w' | 'h' | 'maximized'> {
  const step = desk.windows.length % 6
  const w = Math.max(MIN_SIZE.w, Math.min(1180, Math.round(area.w * 0.8)))
  const h = Math.max(MIN_SIZE.h, Math.min(area.h - 40, Math.round(area.h * 0.92)))
  return {
    // Clear of the first column of desktop icons where there is room.
    x: Math.max(0, Math.min(area.w - w, 96 + step * 26)),
    y: Math.max(0, Math.min(area.h - h, 12 + step * 22)),
    w,
    h,
    // Small screens: windows fill the screen, as on a laptop.
    maximized: area.w < 900 || area.h < 560,
  }
}

function withWindow(
  desk: Desk,
  key: string,
  change: (window: AppWindow) => AppWindow,
): Desk {
  return { windows: desk.windows.map((w) => (w.key === key ? change(w) : w)) }
}

/** Opens an app (or brings its window to the front) showing this view. */
export function openWindow(desk: Desk, view: View, area: Area): Desk {
  const key = keyOf(view)
  const z = topZ(desk) + 1
  if (desk.windows.some((w) => w.key === key))
    return withWindow(desk, key, (w) => ({ ...w, view, minimized: false, z }))
  return {
    windows: [
      ...desk.windows,
      { key, view, ...placeNew(desk, area), minimized: false, z },
    ],
  }
}

/** Opens one of the computer's own windows (or brings it to the front). */
export function openSystemWindow(desk: Desk, system: SystemWindow, area: Area): Desk {
  const key = `system:${system}`
  const z = topZ(desk) + 1
  if (desk.windows.some((w) => w.key === key))
    return withWindow(desk, key, (w) => ({ ...w, minimized: false, z }))
  const place = placeNew(desk, area)
  const w = Math.min(place.w, 560)
  const h = Math.min(place.h, 440)
  return {
    windows: [
      ...desk.windows,
      { key, system, ...place, w, h, maximized: false, minimized: false, z },
    ],
  }
}

export function focusWindow(desk: Desk, key: string): Desk {
  const current = focusedWindow(desk)
  if (current?.key === key) return desk
  const z = topZ(desk) + 1
  return withWindow(desk, key, (w) => ({ ...w, minimized: false, z }))
}

export function minimizeWindow(desk: Desk, key: string): Desk {
  return withWindow(desk, key, (w) => ({ ...w, minimized: true }))
}

/** "Show desktop": every window goes down to the taskbar. */
export function minimizeAll(desk: Desk): Desk {
  return { windows: desk.windows.map((w) => ({ ...w, minimized: true })) }
}

export function toggleMaximize(desk: Desk, key: string): Desk {
  return withWindow(desk, key, (w) => ({ ...w, maximized: !w.maximized }))
}

export function closeWindow(desk: Desk, key: string): Desk {
  return { windows: desk.windows.filter((w) => w.key !== key) }
}

/** Moves a window, keeping its title bar on the desktop so it can always be grabbed. */
export function moveWindow(
  desk: Desk,
  key: string,
  x: number,
  y: number,
  area: Area,
): Desk {
  return withWindow(desk, key, (w) => ({
    ...w,
    x: Math.round(Math.max(-w.w + 120, Math.min(area.w - 120, x))),
    y: Math.round(Math.max(0, Math.min(area.h - 40, y))),
  }))
}

export function resizeWindow(
  desk: Desk,
  key: string,
  w: number,
  h: number,
  area: Area,
): Desk {
  return withWindow(desk, key, (win) => ({
    ...win,
    w: Math.round(Math.max(MIN_SIZE.w, Math.min(area.w - Math.max(0, win.x), w))),
    h: Math.round(Math.max(MIN_SIZE.h, Math.min(area.h - win.y, h))),
  }))
}

/**
 * What a taskbar button does, as in Windows: opens the app if it has no window,
 * brings it forward if it is behind or minimised, and minimises it if it is
 * already in front.
 */
export function taskbarClick(desk: Desk, view: View, area: Area): Desk {
  const key = keyOf(view)
  const window = desk.windows.find((w) => w.key === key)
  if (!window) return openWindow(desk, view, area)
  if (focusedWindow(desk)?.key === key) return minimizeWindow(desk, key)
  return focusWindow(desk, key)
}

/** Keeps every window reachable when the screen gets smaller. */
export function fitToArea(desk: Desk, area: Area): Desk {
  return {
    windows: desk.windows.map((w) => {
      const width = Math.max(MIN_SIZE.w, Math.min(w.w, area.w))
      const height = Math.max(MIN_SIZE.h, Math.min(w.h, area.h))
      return {
        ...w,
        w: width,
        h: height,
        x: Math.max(-width + 120, Math.min(area.w - 120, w.x)),
        y: Math.max(0, Math.min(area.h - 40, w.y)),
      }
    }),
  }
}

const deskKey = (profileId: string) => `gamhub-worksim:desk:${profileId}`

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readDesk(
  profileId: string,
  store: Storage | null = storage(),
): Desk | null {
  try {
    const raw = store?.getItem(deskKey(profileId))
    if (!raw) return null
    const result = DeskSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function writeDesk(
  profileId: string,
  desk: Desk,
  store: Storage | null = storage(),
): void {
  try {
    store?.setItem(deskKey(profileId), JSON.stringify(desk))
  } catch {
    // Storage full or blocked: losing the window layout is harmless.
  }
}
