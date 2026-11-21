/**
 * A tool's own projects (Space Studio's buildings): files the player makes,
 * names, duplicates and deletes, besides task files and the practice file.
 * Each is an ordinary `tool` document, so autosave, versions, backups and
 * restore work as for every file. Which documents are projects is kept per
 * career save under `projects:<profile>:<tool>`.
 */
import { z } from 'zod'
import { db as defaultDb, type WorkSimDatabase } from './db'
import {
  createDocument,
  deleteDocument,
  getDocument,
  updateDocument,
} from './documentsRepo'
import { getMetaValue, setMetaValue } from './meta'
import type { AnyDocument } from './schemas'

const IdsSchema = z.array(z.string())
const key = (profileId: string, toolId: string) => `projects:${profileId}:${toolId}`

export interface ToolProject {
  id: string
  title: string
  updatedAt: number
  createdAt: number
  content: unknown
}

const asProject = (d: AnyDocument): ToolProject => ({
  id: d.id,
  title: d.title,
  updatedAt: d.updatedAt,
  createdAt: d.createdAt,
  content: d.kind === 'tool' ? (d.content as { state: unknown }).state : null,
})

/** The player's projects in a tool, most recently changed first. Missing or deleted ones are skipped. */
export async function listToolProjects(
  profileId: string,
  toolId: string,
  database: WorkSimDatabase = defaultDb,
): Promise<ToolProject[]> {
  const ids = (await getMetaValue(key(profileId, toolId), IdsSchema, database)) ?? []
  const out: ToolProject[] = []
  for (const id of ids) {
    try {
      const d = await getDocument(id, database)
      if (d && d.kind === 'tool' && (d.content as { tool?: string }).tool === toolId)
        out.push(asProject(d))
    } catch (error) {
      // One damaged file never hides the others.
      console.error(error)
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Makes a new project from a starting state. Returns its document ID. */
export async function createToolProject(
  profileId: string,
  toolId: string,
  title: string,
  state: unknown,
  database: WorkSimDatabase = defaultDb,
): Promise<string> {
  return database.transaction(
    'rw',
    [database.meta, database.documents, database.outbox],
    async () => {
      const document = await createDocument(
        {
          kind: 'tool',
          title: title.trim() || 'Untitled project',
          content: { tool: toolId, state },
          owner: profileId,
        },
        database,
      )
      const ids = (await getMetaValue(key(profileId, toolId), IdsSchema, database)) ?? []
      await setMetaValue(key(profileId, toolId), [...ids, document.id], database)
      return document.id
    },
  )
}

/** Copies a project (its current content) as a new project, "… (copy)". */
export async function duplicateToolProject(
  profileId: string,
  toolId: string,
  documentId: string,
  named?: (state: unknown, name: string) => unknown,
  database: WorkSimDatabase = defaultDb,
): Promise<string> {
  const d = await getDocument(documentId, database)
  if (!d || d.kind !== 'tool') throw new Error('That project could not be found.')
  const title = `${d.title} (copy)`
  const copy = structuredClone((d.content as { state: unknown }).state)
  return createToolProject(
    profileId,
    toolId,
    title,
    named ? named(copy, title) : copy,
    database,
  )
}

/** Renames a project; `named` also puts the name in its content (where the tool keeps one). */
export async function renameToolProject(
  documentId: string,
  title: string,
  named?: (state: unknown, name: string) => unknown,
  database: WorkSimDatabase = defaultDb,
) {
  const name = title.trim()
  if (!name) throw new Error('A project needs a name.')
  const d = await getDocument(documentId, database)
  if (!d || d.kind !== 'tool') throw new Error('That project could not be found.')
  const content = d.content as { tool: string; state: unknown }
  await updateDocument(
    documentId,
    {
      title: name,
      ...(named ? { content: { ...content, state: named(content.state, name) } } : {}),
    } as Parameters<typeof updateDocument>[1],
    database,
  )
}

/** Deletes a project (marked deleted, as every deleted document is) and drops it from the list. */
export async function deleteToolProject(
  profileId: string,
  toolId: string,
  documentId: string,
  database: WorkSimDatabase = defaultDb,
): Promise<void> {
  await database.transaction(
    'rw',
    [database.meta, database.documents, database.outbox],
    async () => {
      const ids = (await getMetaValue(key(profileId, toolId), IdsSchema, database)) ?? []
      await setMetaValue(
        key(profileId, toolId),
        ids.filter((id) => id !== documentId),
        database,
      )
      if (await getDocument(documentId, database))
        await deleteDocument(documentId, database)
    },
  )
}
