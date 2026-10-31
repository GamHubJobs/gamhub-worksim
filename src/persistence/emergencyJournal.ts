/**
 * Emergency journal: a last line of defence for the newest unsaved changes.
 *
 * Autosave writes to IndexedDB about a second after changes stop. If the
 * browser crashes or the tab is closed inside that second, those changes could
 * be lost, because browsers do not guarantee that a database write started
 * while closing will finish.
 *
 * So every change is also written immediately to LocalStorage, which saves
 * instantly (synchronously). After a successful autosave the journal entry is
 * removed. If an entry is still there on the next start and it is newer than
 * the saved document, it is recovered.
 */
import { z } from 'zod'
import { TimestampSchema, type AnyDocument } from './schemas'

const KEY_PREFIX = 'gamhub-worksim:journal:'

const JournalEntrySchema = z.object({
  documentId: z.string(),
  content: z.unknown(),
  writtenAt: TimestampSchema,
})

export type JournalEntry = z.infer<typeof JournalEntrySchema>

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null // e.g. storage blocked by browser settings
  }
}

/** Writes the latest unsaved content. Returns false if it could not be written. */
export function writeJournal(
  documentId: string,
  content: unknown,
  storage: Storage | null = defaultStorage(),
): boolean {
  if (!storage) return false
  const entry: JournalEntry = { documentId, content, writtenAt: Date.now() }
  try {
    storage.setItem(KEY_PREFIX + documentId, JSON.stringify(entry))
    return true
  } catch {
    return false // e.g. storage full
  }
}

export function readJournal(
  documentId: string,
  storage: Storage | null = defaultStorage(),
): JournalEntry | null {
  if (!storage) return null
  try {
    const text = storage.getItem(KEY_PREFIX + documentId)
    if (text === null) return null
    const result = JournalEntrySchema.safeParse(JSON.parse(text))
    return result.success && result.data.documentId === documentId ? result.data : null
  } catch {
    return null // damaged entry
  }
}

export function clearJournal(
  documentId: string,
  storage: Storage | null = defaultStorage(),
) {
  try {
    storage?.removeItem(KEY_PREFIX + documentId)
  } catch {
    // Nothing else we can do; a stale entry is ignored later anyway.
  }
}

/**
 * Decides whether a journal entry holds changes that never reached the
 * database. Returns the content to recover, or null if there is nothing to do.
 */
export function findRecoverableContent<D extends AnyDocument>(
  document: D,
  entry: JournalEntry | null,
  contentSchema: z.ZodType<D['content']>,
): D['content'] | null {
  if (!entry || entry.documentId !== document.id) return null
  // Saved after the journal was written: the database already has it.
  if (entry.writtenAt <= document.updatedAt) return null

  const parsed = contentSchema.safeParse(entry.content)
  if (!parsed.success) return null
  if (JSON.stringify(parsed.data) === JSON.stringify(document.content)) return null
  return parsed.data
}
