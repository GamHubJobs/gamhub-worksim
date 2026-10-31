/**
 * Session marker: detects whether WorkSim closed normally last time.
 *
 * When the app starts, it marks the session as "open". When the page is closed
 * normally, it marks it as "closed". If the marker still says "open" on the
 * next start, the browser or computer crashed (or the tab was killed), and we
 * can reassure the player about what was recovered.
 */
import { z } from 'zod'

const KEY = 'gamhub-worksim:session'

const SessionMarkerSchema = z.object({
  open: z.boolean(),
  startedAt: z.number(),
})

export interface SessionStart {
  /** True if the previous session did not close normally. */
  previousSessionCrashed: boolean
}

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function writeMarker(storage: Storage | null, open: boolean) {
  try {
    storage?.setItem(KEY, JSON.stringify({ open, startedAt: Date.now() }))
  } catch {
    // Not critical: we only lose the crash message.
  }
}

/** Starts a session and reports whether the previous one crashed. */
export function beginSession(storage: Storage | null = defaultStorage()): SessionStart {
  let previousSessionCrashed = false
  try {
    const text = storage?.getItem(KEY)
    if (text) {
      const marker = SessionMarkerSchema.safeParse(JSON.parse(text))
      previousSessionCrashed = marker.success && marker.data.open
    }
  } catch {
    // Damaged marker: treat as a normal start.
  }
  writeMarker(storage, true)
  return { previousSessionCrashed }
}

/** Marks the session as closed normally. Call when the page is being closed. */
export function endSession(storage: Storage | null = defaultStorage()) {
  writeMarker(storage, false)
}

/** Marks the session as open again, e.g. when the page is restored from the back/forward cache. */
export function resumeSession(storage: Storage | null = defaultStorage()) {
  writeMarker(storage, true)
}
