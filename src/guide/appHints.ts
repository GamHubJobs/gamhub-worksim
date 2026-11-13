/**
 * Live next-action hints from what is on screen. A screen that knows exactly
 * what the player should do next (the cable still missing on the bench, the
 * screw still in, the ticket nobody has opened) publishes it while it is
 * shown; the next-step bar (GuideBar) shows the most recent one, which is
 * always about what the player is looking at. Screens that publish nothing
 * fall back to the game's own next step (game/nextStep.ts).
 */
import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'

/** Whether the screen is shown (a minimised or background window publishes nothing). */
export const HintScope = createContext(true)

export interface AppHint {
  /** The next action, in a short sentence: "Connect the network lead to the dock". */
  text: string
  /** More detail for beginners, or on request. */
  detail?: string
  /** Keys that do it, e.g. ['E']. */
  keys?: string[]
}

interface Entry {
  id: number
  hint: AppHint
  at: number
}

let entries: Entry[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The hint from the screen shown most recently, if any. */
export function currentAppHint(): AppHint | null {
  return entries.length ? entries.reduce((a, b) => (b.at >= a.at ? b : a)).hint : null
}

export function useCurrentAppHint(): AppHint | null {
  return useSyncExternalStore(subscribe, currentAppHint, () => null)
}

/**
 * Publishes a hint while the calling screen is shown (null: nothing to say).
 * The hint is compared by its text, so screens can call this on every render.
 */
export function useAppHint(hint: AppHint | null): void {
  const shown = useContext(HintScope)
  const text = shown ? (hint?.text ?? null) : null
  const detail = hint?.detail ?? ''
  const keys = hint?.keys?.join(' ') ?? ''
  useEffect(() => {
    if (!text) return
    const id = ++seq
    entries = [
      ...entries,
      {
        id,
        at: id,
        hint: {
          text,
          ...(detail ? { detail } : {}),
          ...(keys ? { keys: keys.split(' ') } : {}),
        },
      },
    ]
    emit()
    return () => {
      entries = entries.filter((e) => e.id !== id)
      emit()
    }
  }, [text, detail, keys])
}

/** For tests: forget every hint. */
export function resetAppHints() {
  entries = []
  emit()
}
