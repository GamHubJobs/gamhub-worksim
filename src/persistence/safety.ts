/**
 * Safety copies: before WorkSim does anything that replaces saved data (a
 * restore from a backup) or changes its format (upgrading older saves), it
 * keeps a complete copy of the data as it was, on this device. The newest few
 * are kept; any of them can be put back from Storage & backup.
 *
 * Safety copies are not backups: they live in the same browser storage as the
 * saves, so they are lost if the browser's data is cleared. Download backups
 * to keep a copy elsewhere.
 */
import { createId } from '../lib/ids'
import { createBackup, importBackup, readBackupFile } from './backup'
import { db as defaultDb, type SafetyCopy, type WorkSimDatabase } from './db'
import { PROFILE_FORMAT_VERSION } from './schemas'

/** How many safety copies are kept (the oldest is removed first). */
export const SAFETY_COPIES_KEPT = 3

export async function takeSafetyCopy(
  reason: string,
  database: WorkSimDatabase = defaultDb,
): Promise<SafetyCopy> {
  const backup = await createBackup(database)
  const copy: SafetyCopy = {
    id: createId(),
    createdAt: Date.now(),
    reason,
    data: JSON.stringify(backup),
  }
  await database.transaction('rw', database.safetyCopies, async () => {
    await database.safetyCopies.put(copy)
    const all = await database.safetyCopies.orderBy('createdAt').toArray()
    const extra = all.slice(0, Math.max(0, all.length - SAFETY_COPIES_KEPT))
    await database.safetyCopies.bulkDelete(extra.map((c) => c.id))
  })
  return copy
}

/** The safety copies on this device, newest first (without their data). */
export async function listSafetyCopies(
  database: WorkSimDatabase = defaultDb,
): Promise<Array<Omit<SafetyCopy, 'data'>>> {
  const all = await database.safetyCopies.orderBy('createdAt').reverse().toArray()
  return all.map(({ id, createdAt, reason }) => ({ id, createdAt, reason }))
}

/**
 * Restores a backup, keeping a safety copy of the current data first, so the
 * restore can be undone.
 */
export async function restoreWithSafetyCopy(
  preview: Awaited<ReturnType<typeof readBackupFile>>,
  database: WorkSimDatabase = defaultDb,
): Promise<void> {
  await takeSafetyCopy('Before restoring a backup', database)
  await importBackup(preview, database)
}

/** Puts a safety copy back (itself keeping a safety copy of the data it replaces). */
export async function restoreSafetyCopy(
  id: string,
  database: WorkSimDatabase = defaultDb,
): Promise<void> {
  const copy = await database.safetyCopies.get(id)
  if (!copy) throw new Error('This safety copy no longer exists.')
  const preview = await readBackupFile(copy.data)
  await restoreWithSafetyCopy(preview, database)
}

/**
 * Before saves in an older format are upgraded (which happens as they are next
 * saved), keeps one safety copy of them as they were.
 */
export async function protectBeforeUpgrade(
  database: WorkSimDatabase = defaultDb,
): Promise<boolean> {
  const profiles = await database.profiles.toArray()
  const oldest = Math.min(
    ...profiles.map((p) => (p as { formatVersion?: number }).formatVersion ?? 1),
  )
  if (!(oldest < PROFILE_FORMAT_VERSION)) return false
  const reason = `Before upgrading saves to format ${PROFILE_FORMAT_VERSION}`
  const existing = await database.safetyCopies.toArray()
  if (existing.some((c) => c.reason === reason)) return false
  await takeSafetyCopy(reason, database)
  return true
}
