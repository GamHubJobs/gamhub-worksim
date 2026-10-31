/**
 * The local database: where all important game data is stored in the browser.
 *
 * It uses IndexedDB (built into every modern browser) through Dexie, which
 * makes IndexedDB much easier and safer to use.
 *
 * Only code inside `src/persistence/` should use this file directly.
 */
import { Dexie, type EntityTable } from 'dexie'
import { createId } from '../lib/ids'
import {
  IdSchema,
  type AnyDocument,
  type DocumentVersion,
  type MetaEntry,
  type OutboxEntry,
  type Profile,
} from './schemas'

export const DATABASE_NAME = 'gamhub-worksim'

/**
 * Database structure, one entry per save-format version.
 *
 * Each line lists a table's main key first, then the fields we want to search
 * by quickly ("indexes"). `[a+b]` is a combined index on two fields.
 *
 * RULES: never edit or remove an existing version. To change the structure,
 * add a new version at the end (with an `upgrade` function if existing data
 * must be transformed) and add a test in `migrations.test.ts`.
 */
export const DATABASE_VERSIONS = {
  1: {
    meta: 'key',
    documents: 'id, kind, updatedAt',
    documentVersions: 'id, documentId, createdAt',
    outbox: '++seq, recordId',
  },
  // Version 2: lets version history be listed in time order per document
  // directly by the database, instead of sorting in JavaScript.
  2: {
    documentVersions: 'id, documentId, createdAt, [documentId+createdAt]',
  },
  // Version 3: player profiles (career progress, rewards and mail).
  3: {
    profiles: 'id',
  },
} as const

/** The newest database structure version this app understands. */
export const CURRENT_DATABASE_VERSION = 3

export class WorkSimDatabase extends Dexie {
  meta!: EntityTable<MetaEntry, 'key'>
  documents!: EntityTable<AnyDocument, 'id'>
  documentVersions!: EntityTable<DocumentVersion, 'id'>
  outbox!: EntityTable<OutboxEntry, 'seq'>
  profiles!: EntityTable<Profile, 'id'>

  constructor(name: string = DATABASE_NAME) {
    super(name)
    this.version(1).stores(DATABASE_VERSIONS[1])
    this.version(2).stores(DATABASE_VERSIONS[2])
    this.version(3).stores(DATABASE_VERSIONS[3])
  }
}

/** The database used by the app. Tests create their own separate databases. */
export const db = new WorkSimDatabase()

const DEVICE_ID_KEY = 'deviceId'

/**
 * Returns this device's ID, creating it the first time it is needed.
 * The ID is stamped on every change, so future cloud sync knows where each
 * change came from.
 */
export async function getDeviceId(database: WorkSimDatabase = db): Promise<string> {
  // A read-write transaction makes sure two callers can never create two IDs.
  return database.transaction('rw', database.meta, async () => {
    const entry = await database.meta.get(DEVICE_ID_KEY)
    const existing = IdSchema.safeParse(entry?.value)
    if (existing.success) {
      return existing.data
    }

    const deviceId = createId()
    await database.meta.put({ key: DEVICE_ID_KEY, value: deviceId })
    return deviceId
  })
}

/** Records a saved change in the outbox, for future cloud sync. */
export async function recordChange(
  database: WorkSimDatabase,
  table: string,
  record: { id: string; rev: number; updatedAt: number },
): Promise<void> {
  // Always add a fresh object: Dexie writes the new `seq` number onto it.
  await database.outbox.add({
    table,
    recordId: record.id,
    rev: record.rev,
    changedAt: record.updatedAt,
  })
}
