/**
 * The documents repository: the single place where documents are saved and loaded.
 *
 * - Every change raises `rev`, stamps `updatedAt` and `deviceId`, and is
 *   recorded in the outbox, all in one transaction (all or nothing).
 * - Nothing invalid is ever written: data is validated before saving.
 * - Everything loaded is upgraded to the current format and validated.
 * - Deleting only marks a document as deleted, so the deletion can be synced.
 */
import { z } from 'zod'
import { createId } from '../lib/ids'
import { db as defaultDb, getDeviceId, recordChange, type WorkSimDatabase } from './db'
import { upgradeDocument } from './documentMigrations'
import { InvalidRecordError, RecordNotFoundError } from './errors'
import {
  DOCUMENT_FORMAT_VERSIONS,
  DocumentSchema,
  type AnyDocument,
  type SyncFields,
} from './schemas'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** What is needed to create a document: everything except the automatic fields. */
export type NewDocument = DistributiveOmit<
  AnyDocument,
  keyof SyncFields | 'formatVersion'
>

/** The parts of a document that can be changed. */
export type DocumentChanges = Partial<Pick<AnyDocument, 'title' | 'content'>>

/** Checks and upgrades a document loaded from storage. Throws if it is invalid. */
export function parseStoredDocument(raw: unknown, id: string): AnyDocument {
  const result = DocumentSchema.safeParse(upgradeDocument(raw))
  if (!result.success) {
    throw new InvalidRecordError('documents', id, z.prettifyError(result.error))
  }
  return result.data
}

export async function createDocument(
  input: NewDocument,
  database: WorkSimDatabase = defaultDb,
): Promise<AnyDocument> {
  const deviceId = await getDeviceId(database)
  const now = Date.now()
  const document = DocumentSchema.parse({
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
    rev: 1,
    deviceId,
    deleted: false,
    formatVersion: DOCUMENT_FORMAT_VERSIONS[input.kind],
  })

  await database.transaction('rw', database.documents, database.outbox, async () => {
    await database.documents.add(document)
    await recordChange(database, 'documents', document)
  })
  return document
}

/** Returns the document, or `undefined` if it does not exist or was deleted. */
export async function getDocument(
  id: string,
  database: WorkSimDatabase = defaultDb,
): Promise<AnyDocument | undefined> {
  const raw = await database.documents.get(id)
  if (raw === undefined) return undefined
  const document = parseStoredDocument(raw, id)
  return document.deleted ? undefined : document
}

/**
 * Returns all documents that are not deleted, most recently changed first.
 * Damaged documents are skipped (and reported in the console) so that one bad
 * record can never hide the others.
 */
export async function listDocuments(
  database: WorkSimDatabase = defaultDb,
): Promise<AnyDocument[]> {
  const rows = await database.documents.orderBy('updatedAt').reverse().toArray()
  const documents: AnyDocument[] = []
  for (const row of rows) {
    try {
      const document = parseStoredDocument(row, row.id)
      if (!document.deleted) documents.push(document)
    } catch (error) {
      console.error(error)
    }
  }
  return documents
}

async function writeChange(
  id: string,
  change: (current: AnyDocument) => Record<string, unknown>,
  database: WorkSimDatabase,
): Promise<AnyDocument> {
  const deviceId = await getDeviceId(database)
  return database.transaction('rw', database.documents, database.outbox, async () => {
    const raw = await database.documents.get(id)
    if (raw === undefined) throw new RecordNotFoundError('documents', id)
    const current = parseStoredDocument(raw, id)
    if (current.deleted) throw new RecordNotFoundError('documents', id)

    const next = DocumentSchema.parse({
      ...current,
      ...change(current),
      rev: current.rev + 1,
      // Never go backwards in time, even if the computer clock was changed.
      updatedAt: Math.max(Date.now(), current.updatedAt + 1),
      deviceId,
    })
    await database.documents.put(next)
    await recordChange(database, 'documents', next)
    return next
  })
}

/** Saves changes to a document and returns the updated document. */
export function updateDocument(
  id: string,
  changes: DocumentChanges,
  database: WorkSimDatabase = defaultDb,
): Promise<AnyDocument> {
  return writeChange(id, () => changes, database)
}

/** Marks a document as deleted. It disappears from the app but is kept for syncing. */
export async function deleteDocument(
  id: string,
  database: WorkSimDatabase = defaultDb,
): Promise<void> {
  await writeChange(id, () => ({ deleted: true }), database)
}
