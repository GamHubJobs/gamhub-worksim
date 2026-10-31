/**
 * The Phase 0 "workbench": a single practice spreadsheet used to prove that
 * saving, recovery and backups work. Phase 1 replaces it with real
 * assignment documents.
 */
import { createSheetContent } from '../apps/sheets/model'
import { db as defaultDb, type WorkSimDatabase } from './db'
import { createDocument } from './documentsRepo'
import { getMetaValue, setMetaValue } from './meta'
import { IdSchema } from './schemas'

const WORKBENCH_KEY = 'workbenchDocumentId'

/** Returns the ID of the practice workbook, creating the workbook the first time. */
export async function openWorkbenchDocument(
  database: WorkSimDatabase = defaultDb,
): Promise<string> {
  // One transaction, so two callers at the same moment never create two workbooks.
  return database.transaction(
    'rw',
    [database.meta, database.documents, database.outbox],
    async () => {
      const existingId = await getMetaValue(WORKBENCH_KEY, IdSchema, database)
      if (existingId) {
        const existing = await database.documents.get(existingId)
        // A damaged workbook is still returned, so the app can report it
        // instead of silently replacing the player's work.
        if (existing && !existing.deleted) return existingId
      }

      const document = await createDocument(
        { kind: 'sheet', title: 'Practice Workbook', content: createSheetContent() },
        database,
      )
      await setMetaValue(WORKBENCH_KEY, document.id, database)
      return document.id
    },
  )
}
