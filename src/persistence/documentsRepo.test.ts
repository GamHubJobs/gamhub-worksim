import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createId } from '../lib/ids'
import { getDeviceId, WorkSimDatabase } from './db'
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
  type NewDocument,
} from './documentsRepo'
import { InvalidRecordError, NewerFormatError, RecordNotFoundError } from './errors'
import { DOCUMENT_FORMAT_VERSIONS } from './schemas'

let database: WorkSimDatabase

beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})

afterEach(async () => {
  await database.delete()
})

function newSheet(title = 'Budget'): NewDocument {
  return {
    kind: 'sheet',
    title,
    content: {
      sheets: [{ id: createId(), name: 'Sheet1', cells: { A1: { input: 'Hello' } } }],
    },
  }
}

describe('createDocument', () => {
  it('creates a document with all automatic fields filled in', async () => {
    const document = await createDocument(newSheet(), database)
    expect(document.rev).toBe(1)
    expect(document.deleted).toBe(false)
    expect(document.formatVersion).toBe(DOCUMENT_FORMAT_VERSIONS.sheet)
    expect(document.deviceId).toBe(await getDeviceId(database))
    expect(document.createdAt).toBe(document.updatedAt)
  })

  it('saves the document so it can be loaded again', async () => {
    const created = await createDocument(newSheet(), database)
    expect(await getDocument(created.id, database)).toEqual(created)
  })

  it('records the change in the outbox', async () => {
    const created = await createDocument(newSheet(), database)
    const outbox = await database.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0]).toMatchObject({ table: 'documents', recordId: created.id, rev: 1 })
  })

  it('refuses to save invalid data', async () => {
    await expect(createDocument(newSheet(''), database)).rejects.toThrow()
    expect(await database.documents.count()).toBe(0)
  })
})

describe('updateDocument', () => {
  it('saves new content and raises the revision number', async () => {
    const created = await createDocument(newSheet(), database)
    const content = {
      sheets: [{ ...created.content.sheets[0], cells: { B2: { input: '42' } } }],
    }

    const updated = await updateDocument(created.id, { content }, database)
    expect(updated.rev).toBe(2)
    expect(updated.content).toEqual(content)
    expect(updated.updatedAt).toBeGreaterThan(created.updatedAt)
    expect(await getDocument(created.id, database)).toEqual(updated)
  })

  it('adds one outbox entry per change', async () => {
    const created = await createDocument(newSheet(), database)
    await updateDocument(created.id, { title: 'Second' }, database)
    await updateDocument(created.id, { title: 'Third' }, database)
    const revisions = (await database.outbox.toArray()).map((entry) => entry.rev)
    expect(revisions).toEqual([1, 2, 3])
  })

  it('refuses invalid changes and keeps the saved document unchanged', async () => {
    const created = await createDocument(newSheet(), database)
    await expect(updateDocument(created.id, { title: '' }, database)).rejects.toThrow()
    expect(await getDocument(created.id, database)).toEqual(created)
    expect(await database.outbox.count()).toBe(1)
  })

  it('fails clearly for a document that does not exist', async () => {
    await expect(
      updateDocument(createId(), { title: 'X' }, database),
    ).rejects.toBeInstanceOf(RecordNotFoundError)
  })
})

describe('deleteDocument', () => {
  it('hides the document but keeps the record for syncing', async () => {
    const created = await createDocument(newSheet(), database)
    await deleteDocument(created.id, database)

    expect(await getDocument(created.id, database)).toBeUndefined()
    expect(await listDocuments(database)).toEqual([])
    const stored = await database.documents.get(created.id)
    expect(stored?.deleted).toBe(true)
    expect(stored?.rev).toBe(2)
  })

  it('does not allow changing a deleted document', async () => {
    const created = await createDocument(newSheet(), database)
    await deleteDocument(created.id, database)
    await expect(
      updateDocument(created.id, { title: 'X' }, database),
    ).rejects.toBeInstanceOf(RecordNotFoundError)
  })
})

describe('listDocuments', () => {
  it('lists documents with the most recently changed first', async () => {
    const first = await createDocument(newSheet('First'), database)
    await createDocument(newSheet('Second'), database)
    await updateDocument(first.id, { title: 'First (edited)' }, database)

    const titles = (await listDocuments(database)).map((document) => document.title)
    expect(titles).toEqual(['First (edited)', 'Second'])
  })

  it('skips a damaged document instead of failing completely', async () => {
    const good = await createDocument(newSheet('Good'), database)
    const bad = await createDocument(newSheet('Bad'), database)
    await database.documents.update(bad.id, { rev: -5 })

    const originalError = console.error
    console.error = () => {}
    try {
      const documents = await listDocuments(database)
      expect(documents.map((document) => document.id)).toEqual([good.id])
    } finally {
      console.error = originalError
    }
  })
})

describe('loading damaged or newer data', () => {
  it('reports a damaged document clearly', async () => {
    const created = await createDocument(newSheet(), database)
    await database.documents.update(created.id, { title: '' })
    await expect(getDocument(created.id, database)).rejects.toBeInstanceOf(
      InvalidRecordError,
    )
  })

  it('reports a document saved by a newer version of the app', async () => {
    const created = await createDocument(newSheet(), database)
    await database.documents.update(created.id, { formatVersion: 99 })
    await expect(getDocument(created.id, database)).rejects.toBeInstanceOf(
      NewerFormatError,
    )
  })
})
