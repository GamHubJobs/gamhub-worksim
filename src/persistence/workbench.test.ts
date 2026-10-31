import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createId } from '../lib/ids'
import { WorkSimDatabase } from './db'
import { deleteDocument, getDocument } from './documentsRepo'
import { openWorkbenchDocument } from './workbench'

let database: WorkSimDatabase

beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})

afterEach(async () => {
  await database.delete()
})

describe('openWorkbenchDocument', () => {
  it('creates an empty practice workbook the first time', async () => {
    const id = await openWorkbenchDocument(database)
    const document = await getDocument(id, database)
    expect(document?.title).toBe('Practice Workbook')
    expect(document?.kind).toBe('sheet')
  })

  it('opens the same workbook every time', async () => {
    const first = await openWorkbenchDocument(database)
    expect(await openWorkbenchDocument(database)).toBe(first)
  })

  it('creates only one workbook when opened twice at the same moment', async () => {
    const [first, second] = await Promise.all([
      openWorkbenchDocument(database),
      openWorkbenchDocument(database),
    ])
    expect(second).toBe(first)
    expect(await database.documents.count()).toBe(1)
  })

  it('creates a new workbook if the old one was deleted', async () => {
    const first = await openWorkbenchDocument(database)
    await deleteDocument(first, database)
    expect(await openWorkbenchDocument(database)).not.toBe(first)
  })
})
