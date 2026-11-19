/**
 * The game's opening (Launch.tsx): how much of it the player wants (Sound &
 * graphics → Opening), and whether they have seen it. Kept on this device.
 *
 * - full: the whole opening every time.
 * - short (the default): the whole opening the first time, then a short one.
 * - off: no logo or flight; only a loading screen, and only while loading.
 */
import { useSyncExternalStore } from 'react'

export type OpeningMode = 'full' | 'short' | 'off'

export const OPENING_KEY = 'worksim.opening.v1'

interface Stored {
  mode: OpeningMode
  seen: boolean
}

const listeners = new Set<() => void>()

function read(): Stored {
  try {
    const raw = globalThis.localStorage?.getItem(OPENING_KEY)
    const v = raw ? (JSON.parse(raw) as Partial<Stored>) : {}
    return {
      mode: v.mode === 'full' || v.mode === 'off' ? v.mode : 'short',
      seen: v.seen === true,
    }
  } catch {
    return { mode: 'short', seen: false }
  }
}

let current: Stored = read()

function write(next: Stored) {
  current = next
  try {
    globalThis.localStorage?.setItem(OPENING_KEY, JSON.stringify(next))
  } catch {
    // Storage blocked: the choice applies until the page closes.
  }
  for (const l of listeners) l()
}

export function openingPrefs(): Stored {
  return current
}

export function setOpeningMode(mode: OpeningMode): void {
  write({ ...current, mode })
}

export function markOpeningSeen(): void {
  if (!current.seen) write({ ...current, seen: true })
}

export function useOpeningPrefs(): Stored {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => current,
  )
}

/** What to play now: the whole opening, a short one, or none (only loading). */
export function openingFor(prefs: Stored, firstTime: boolean): 'full' | 'short' | 'none' {
  if (prefs.mode === 'off') return 'none'
  if (prefs.mode === 'full' || firstTime || !prefs.seen) return 'full'
  return 'short'
}

/**
 * Automated browser tests start without the opening (it would stand between
 * them and the game), unless a test asks for it (`worksim.opening.test`).
 */
export function openingDisabledForTests(): boolean {
  try {
    return (
      globalThis.navigator?.webdriver === true &&
      !['on', 'fly'].includes(
        globalThis.localStorage?.getItem('worksim.opening.test') ?? '',
      )
    )
  } catch {
    return false
  }
}
