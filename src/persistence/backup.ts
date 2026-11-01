/**
 * Backups: the player's whole save as one file they can keep anywhere.
 *
 * This is the only protection that survives cleared browser data, a broken
 * computer or a change of website address, so it must be reliable:
 * - every table is included automatically (except sync bookkeeping and
 *   values that belong to this device only),
 * - a checksum detects files that were damaged or edited,
 * - importing validates and upgrades everything before changing anything,
 *   then replaces the data in one transaction (all or nothing).
 */
import { z } from 'zod'
import { formatDateTimeForFilename } from '../lib/time'
import {
  CURRENT_DATABASE_VERSION,
  db as defaultDb,
  recordChange,
  type WorkSimDatabase,
} from './db'
import { upgradeDocument } from './documentMigrations'
import { getMetaValue, setMetaValue } from './meta'
import { upgradeProfile } from './profiles'
import {
  DocumentSchema,
  DocumentVersionSchema,
  MetaEntrySchema,
  PortfolioFileSchema,
  PortfolioItemSchema,
  ProfileSchema,
  TimestampSchema,
} from './schemas'

export const BACKUP_FORMAT = 'gamhub-worksim-backup'
export const BACKUP_FORMAT_VERSION = 1

/** Tables that are never backed up: the outbox only matters to this device's sync. */
const EXCLUDED_TABLES = new Set(['outbox'])

const LAST_BACKUP_KEY = 'lastBackupAt'
const REMINDER_SNOOZED_UNTIL_KEY = 'backupReminderSnoozedUntil'
/** Meta values that describe this device, not the player's progress. */
const DEVICE_SPECIFIC_META_KEYS = new Set([
  'deviceId',
  LAST_BACKUP_KEY,
  REMINDER_SNOOZED_UNTIL_KEY,
])

/**
 * How to check each table's rows when importing. A test makes sure every
 * backed-up table has an entry here, so new tables cannot be forgotten.
 */
export const TABLE_VALIDATORS: Record<string, (raw: unknown) => unknown> = {
  meta: (raw) => MetaEntrySchema.parse(raw),
  documents: (raw) => DocumentSchema.parse(upgradeDocument(raw)),
  documentVersions: (raw) => {
    const row = z.object({ snapshot: z.unknown() }).loose().parse(raw)
    return DocumentVersionSchema.parse({
      ...row,
      snapshot: upgradeDocument(row.snapshot),
    })
  },
  profiles: (raw) => ProfileSchema.parse(upgradeProfile(raw)),
  portfolioItems: (raw) => PortfolioItemSchema.parse(raw),
  portfolioFiles: (raw) => {
    const row = z.object({ snapshot: z.unknown() }).loose().parse(raw)
    return PortfolioFileSchema.parse({ ...row, snapshot: upgradeDocument(row.snapshot) })
  },
}

const BackupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().min(1),
  appVersion: z.string(),
  databaseVersion: z.number().int().min(1),
  exportedAt: TimestampSchema,
  checksum: z.string(),
  data: z.record(z.string(), z.array(z.unknown())),
})

export type BackupFile = z.infer<typeof BackupFileSchema>

/** A backup that has been fully checked and is ready to import. */
export interface BackupPreview {
  backup: BackupFile
  exportedAt: number
  appVersion: string
  /** Number of valid items per table. */
  counts: Record<string, number>
  /** Titles of the documents in the backup. */
  documentTitles: string[]
  /** Number of damaged items that will be skipped. */
  skippedCount: number
  /** Validated rows per table. */
  rows: Record<string, unknown[]>
}

/** A backup file cannot be used. The message is written for the player. */
export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function isBackedUpTable(name: string): boolean {
  return !EXCLUDED_TABLES.has(name)
}

/** Collects the player's whole save into a backup object. */
export async function createBackup(
  database: WorkSimDatabase = defaultDb,
): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {}
  await database.transaction('r', database.tables, async () => {
    for (const table of database.tables) {
      if (!isBackedUpTable(table.name)) continue
      let rows: unknown[] = await table.toArray()
      if (table.name === 'meta') {
        rows = rows.filter(
          (row) => !DEVICE_SPECIFIC_META_KEYS.has((row as { key: string }).key),
        )
      }
      data[table.name] = rows
    }
  })

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: __APP_VERSION__,
    databaseVersion: CURRENT_DATABASE_VERSION,
    exportedAt: Date.now(),
    checksum: await sha256(JSON.stringify(data)),
    data,
  }
}

/**
 * Creates a backup file and records the time of this backup.
 * Returns the suggested file name and the file contents.
 */
export async function exportBackup(
  database: WorkSimDatabase = defaultDb,
): Promise<{ fileName: string; text: string }> {
  const backup = await createBackup(database)
  await setMetaValue(LAST_BACKUP_KEY, backup.exportedAt, database)
  return {
    fileName: `gamhub-worksim-backup-${formatDateTimeForFilename(backup.exportedAt)}.json`,
    text: JSON.stringify(backup, null, 2),
  }
}

/** Reads and fully checks a backup file. Nothing is changed yet. */
export async function readBackupFile(text: string): Promise<BackupPreview> {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError(
      'This file is not a GamHub WorkSim backup: it could not be read.',
    )
  }

  const parsed = BackupFileSchema.safeParse(json)
  if (!parsed.success) {
    throw new BackupError('This file is not a GamHub WorkSim backup.')
  }
  const backup = parsed.data

  if (
    backup.formatVersion > BACKUP_FORMAT_VERSION ||
    backup.databaseVersion > CURRENT_DATABASE_VERSION
  ) {
    throw new BackupError(
      `This backup was made by a newer version of GamHub WorkSim (${backup.appVersion}). ` +
        'Please update the app before importing it.',
    )
  }

  if ((await sha256(JSON.stringify(backup.data))) !== backup.checksum) {
    throw new BackupError(
      'This backup file is damaged: its contents changed after it was saved. ' +
        'Try another backup file.',
    )
  }

  const rows: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}
  let skippedCount = 0
  for (const [table, validate] of Object.entries(TABLE_VALIDATORS)) {
    rows[table] = []
    for (const raw of backup.data[table] ?? []) {
      try {
        rows[table].push(validate(raw))
      } catch {
        skippedCount++
      }
    }
    counts[table] = rows[table].length
  }

  const documentTitles = (rows.documents as z.infer<typeof DocumentSchema>[])
    .filter((document) => !document.deleted)
    .map((document) => document.title)

  return {
    backup,
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    counts,
    documentTitles,
    skippedCount,
    rows,
  }
}

/**
 * Replaces all saved data with the backup's data, in one transaction.
 * Values that belong to this device (like its ID) are kept.
 */
export async function importBackup(
  preview: BackupPreview,
  database: WorkSimDatabase = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    for (const table of database.tables) {
      if (!isBackedUpTable(table.name)) continue
      const rows = preview.rows[table.name] ?? []

      if (table.name === 'meta') {
        const existing = await table.toArray()
        const toDelete = existing
          .map((row) => (row as { key: string }).key)
          .filter((key) => !DEVICE_SPECIFIC_META_KEYS.has(key))
        await table.bulkDelete(toDelete)
        const imported = rows.filter(
          (row) => !DEVICE_SPECIFIC_META_KEYS.has((row as { key: string }).key),
        )
        await table.bulkPut(imported)
      } else {
        await table.clear()
        await table.bulkPut(rows)
      }
    }

    // Mark everything imported as changed, so future cloud sync uploads it.
    for (const table of ['documents', 'documentVersions']) {
      for (const row of preview.rows[table] ?? []) {
        await recordChange(
          database,
          table,
          row as { id: string; rev: number; updatedAt: number },
        )
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Backup reminders
// ---------------------------------------------------------------------------

export const BACKUP_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
export const BACKUP_REMINDER_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

export interface BackupReminderInput {
  now: number
  lastBackupAt?: number
  /** When the oldest saved document was created. */
  firstCreatedAt?: number
  /** When anything was last saved. */
  lastChangedAt?: number
  snoozedUntil?: number
}

/** Remind when there are changes that are not in any backup for 7 days or more. */
export function shouldRemindToBackUp(input: BackupReminderInput): boolean {
  const { now, lastBackupAt, firstCreatedAt, lastChangedAt, snoozedUntil } = input
  if (lastChangedAt === undefined) return false
  if (snoozedUntil !== undefined && now < snoozedUntil) return false
  if (lastBackupAt !== undefined && lastChangedAt <= lastBackupAt) return false
  const unprotectedSince = lastBackupAt ?? firstCreatedAt ?? lastChangedAt
  return now - unprotectedSince >= BACKUP_REMINDER_INTERVAL_MS
}

export interface BackupStatus {
  lastBackupAt: number | null
  reminderDue: boolean
}

export async function getBackupStatus(
  database: WorkSimDatabase = defaultDb,
): Promise<BackupStatus> {
  const lastBackupAt = await getMetaValue(LAST_BACKUP_KEY, TimestampSchema, database)
  const snoozedUntil = await getMetaValue(
    REMINDER_SNOOZED_UNTIL_KEY,
    TimestampSchema,
    database,
  )
  const newest = await database.documents.orderBy('updatedAt').last()
  let firstCreatedAt: number | undefined
  await database.documents.each((document) => {
    if (firstCreatedAt === undefined || document.createdAt < firstCreatedAt) {
      firstCreatedAt = document.createdAt
    }
  })

  return {
    lastBackupAt: lastBackupAt ?? null,
    reminderDue: shouldRemindToBackUp({
      now: Date.now(),
      lastBackupAt,
      firstCreatedAt,
      lastChangedAt: newest?.updatedAt,
      snoozedUntil,
    }),
  }
}

/** Hides the backup reminder for a few days. */
export async function snoozeBackupReminder(database: WorkSimDatabase = defaultDb) {
  await setMetaValue(
    REMINDER_SNOOZED_UNTIL_KEY,
    Date.now() + BACKUP_REMINDER_SNOOZE_MS,
    database,
  )
}
