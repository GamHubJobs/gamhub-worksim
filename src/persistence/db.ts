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
} from './schemas'

export const DATABASE_NAME = 'gamhub-worksim'

export class WorkSimDatabase extends Dexie {
  meta!: EntityTable<MetaEntry, 'key'>
  documents!: EntityTable<AnyDocument, 'id'>
  documentVersions!: EntityTable<DocumentVersion, 'id'>
  outbox!: EntityTable<OutboxEntry, 'seq'>

  constructor(name: string = DATABASE_NAME) {
    super(name)

    // Save-format version 1. Each line lists a table's main key first, then
    // the fields we want to search by quickly ("indexes").
    // Never edit an existing version: add a new `this.version(2)` instead.
    this.version(1).stores({
      meta: 'key',
      documents: 'id, kind, updatedAt',
      documentVersions: 'id, documentId, createdAt',
      outbox: '++seq, recordId',
    })
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
