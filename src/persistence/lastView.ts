/**
 * Remembers which app and workbook were open, so that reloading the page (or
 * recovering from a crash) returns the player to where they were.
 * Stored in LocalStorage: it is a small convenience, not game data, and it is
 * deliberately not included in backups.
 */
import { z } from 'zod'

const KEY = 'gamhub-worksim:view'

export const ViewSchema = z.object({
  /** 'office' is the 3D office; the others are apps on the work computer. */
  app: z.enum(['office', 'mail', 'tasks', 'sheets', 'docs', 'slides', 'career']),
  /** In the office: where the player is standing. */
  spot: z.enum(['reception', 'desk', 'manager', 'breakroom']).optional(),
  /** In the office: a workplace event to open straight away. */
  event: z.string().optional(),
  /**
   * In Sheets: an open workbook ID, or "practice" for the practice workbook.
   * In Docs and Slides: the open file.
   */
  document: z.string().optional(),
  /** In Tasks: the selected assignment. */
  assignmentId: z.string().optional(),
  /** In Mail: the selected message. */
  mailId: z.string().optional(),
})

export type View = z.infer<typeof ViewSchema>

/** New players arrive at reception. */
export const DEFAULT_VIEW: View = { app: 'office', spot: 'reception' }

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readLastView(store: Storage | null = storage()): View | null {
  try {
    const raw = store?.getItem(KEY)
    if (!raw) return null
    const result = ViewSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function writeLastView(view: View, store: Storage | null = storage()): void {
  try {
    store?.setItem(KEY, JSON.stringify(view))
  } catch {
    // Storage full or blocked: losing the last view is harmless.
  }
}
