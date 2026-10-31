/**
 * Version history: frozen copies of a document that the player can browse and
 * restore.
 *
 * - Up to `MAX_AUTOMATIC_VERSIONS` automatic versions are kept per document;
 *   older ones are removed. Versions marked "keep" are never removed.
 * - Restoring first saves the current state as a version, so a restore can
 *   always be undone.
 */
import { Dexie } from 'dexie'
import { z } from 'zod'
import { createId } from '../lib/ids'
import { db as defaultDb, getDeviceId, recordChange, type WorkSimDatabase } from './db'
import { upgradeDocument } from './documentMigrations'
import { getDocument, updateDocument } from './documentsRepo'
import { RecordNotFoundError } from './errors'
import {
  DocumentVersionSchema,
  type AnyDocument,
  type DocumentVersion,
  type VersionReason,
} from './schemas'

export const MAX_AUTOMATIC_VERSIONS = 20

function parseStoredVersion(raw: DocumentVersion): DocumentVersion | null {
  const result = DocumentVersionSchema.safeParse({
    ...raw,
    snapshot: upgradeDocument(raw.snapshot),
  })
  if (!result.success) {
    console.error(`Skipping damaged version ${raw.id}:\n${z.prettifyError(result.error)}`)
    return null
  }
  return result.data
}

/** Saves a frozen copy of the document. */
export async function createVersion(
  document: AnyDocument,
  reason: VersionReason,
  options: { keep?: boolean } = {},
  database: WorkSimDatabase = defaultDb,
): Promise<DocumentVersion> {
  const deviceId = await getDeviceId(database)
  const now = Date.now()
  const version = DocumentVersionSchema.parse({
    id: createId(),
    createdAt: now,
    updatedAt: now,
    rev: 1,
    deviceId,
    deleted: false,
    documentId: document.id,
    reason,
    keep: options.keep ?? false,
    snapshot: document,
  })

  await database.transaction(
    'rw',
    database.documentVersions,
    database.outbox,
    async () => {
      await database.documentVersions.add(version)
      await recordChange(database, 'documentVersions', version)
      await pruneVersions(document.id, database)
    },
  )
  return version
}

/** Returns a document's versions, newest first. Damaged versions are skipped. */
export async function listVersions(
  documentId: string,
  database: WorkSimDatabase = defaultDb,
): Promise<DocumentVersion[]> {
  const rows = await database.documentVersions
    .where('[documentId+createdAt]')
    .between([documentId, Dexie.minKey], [documentId, Dexie.maxKey])
    .reverse()
    .toArray()

  return rows
    .map(parseStoredVersion)
    .filter((version): version is DocumentVersion => version !== null && !version.deleted)
}

/** Removes the oldest automatic versions beyond the limit. Kept versions stay. */
export async function pruneVersions(
  documentId: string,
  database: WorkSimDatabase = defaultDb,
): Promise<void> {
  const versions = await database.documentVersions
    .where('[documentId+createdAt]')
    .between([documentId, Dexie.minKey], [documentId, Dexie.maxKey])
    .reverse()
    .toArray()

  const removable = versions.filter((version) => !version.keep)
  const toRemove = removable.slice(MAX_AUTOMATIC_VERSIONS).map((version) => version.id)
  if (toRemove.length > 0) {
    await database.documentVersions.bulkDelete(toRemove)
  }
}

/** Marks a version as kept (never removed automatically) or not. */
export async function setVersionKept(
  versionId: string,
  keep: boolean,
  database: WorkSimDatabase = defaultDb,
): Promise<void> {
  await database.transaction(
    'rw',
    database.documentVersions,
    database.outbox,
    async () => {
      const version = await database.documentVersions.get(versionId)
      if (!version) throw new RecordNotFoundError('documentVersions', versionId)
      const next = {
        ...version,
        keep,
        rev: version.rev + 1,
        updatedAt: Math.max(Date.now(), version.updatedAt + 1),
      }
      await database.documentVersions.put(next)
      await recordChange(database, 'documentVersions', next)
      if (!keep) await pruneVersions(version.documentId, database)
    },
  )
}

/**
 * Restores a document to an earlier version and returns the restored document.
 * The current state is saved as a "before-restore" version first, so this can
 * be undone by restoring that version.
 */
export async function restoreVersion(
  documentId: string,
  versionId: string,
  database: WorkSimDatabase = defaultDb,
): Promise<AnyDocument> {
  return database.transaction(
    'rw',
    [database.meta, database.documents, database.documentVersions, database.outbox],
    async () => {
      const current = await getDocument(documentId, database)
      if (!current) throw new RecordNotFoundError('documents', documentId)

      const raw = await database.documentVersions.get(versionId)
      const version = raw ? parseStoredVersion(raw) : null
      if (!version || version.deleted || version.documentId !== documentId) {
        throw new RecordNotFoundError('documentVersions', versionId)
      }

      await createVersion(current, 'before-restore', {}, database)
      return updateDocument(
        documentId,
        { title: version.snapshot.title, content: version.snapshot.content },
        database,
      )
    },
  )
}
