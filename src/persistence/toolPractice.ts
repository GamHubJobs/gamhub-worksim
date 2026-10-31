/**
 * Each tool has a practice file per career save: the tool with realistic
 * sample data, for exploring without affecting a task.
 */
import { db as defaultDb, type WorkSimDatabase } from './db'
import { createDocument } from './documentsRepo'
import { getMetaValue, setMetaValue } from './meta'
import { IdSchema } from './schemas'

export async function openPracticeFile(
  profileId: string,
  tool: { id: string; name: string; practice: () => unknown },
  database: WorkSimDatabase = defaultDb,
): Promise<string> {
  const key = `practice:${profileId}:${tool.id}`
  return database.transaction(
    'rw',
    [database.meta, database.documents, database.outbox],
    async () => {
      const existingId = await getMetaValue(key, IdSchema, database)
      if (existingId) {
        const existing = await database.documents.get(existingId)
        if (existing && !existing.deleted) return existingId
      }
      const document = await createDocument(
        {
          kind: 'tool',
          title: `${tool.name} practice`,
          content: { tool: tool.id, state: tool.practice() },
          owner: profileId,
        },
        database,
      )
      await setMetaValue(key, document.id, database)
      return document.id
    },
  )
}
