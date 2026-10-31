/**
 * Proves that saved data survives upgrades of the save format.
 * Add a test here for every new database version and document format.
 */
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { createId } from '../lib/ids'
import { CURRENT_DATABASE_VERSION, DATABASE_VERSIONS, WorkSimDatabase } from './db'
import { upgradeDocument, type DocumentMigrations } from './documentMigrations'
import { getDocument } from './documentsRepo'
import { NewerFormatError } from './errors'
import { listVersions } from './versions'

const databasesToDelete: string[] = []

afterEach(async () => {
  for (const name of databasesToDelete.splice(0)) {
    await Dexie.delete(name)
  }
})

function sheetDocument(id: string, deviceId: string) {
  return {
    id,
    createdAt: 1_000,
    updatedAt: 2_000,
    rev: 3,
    deviceId,
    deleted: false,
    kind: 'sheet' as const,
    title: 'Saved with version 1',
    formatVersion: 1,
    content: {
      sheets: [{ id: createId(), name: 'Sheet1', cells: { A1: { input: 'kept' } } }],
    },
  }
}

describe('database versions', () => {
  it('CURRENT_DATABASE_VERSION is the newest defined version', () => {
    const newest = Math.max(...Object.keys(DATABASE_VERSIONS).map(Number))
    expect(CURRENT_DATABASE_VERSION).toBe(newest)
    expect(new WorkSimDatabase('never-opened').verno).toBe(newest)
  })
})

describe('database upgrade from version 1 to version 2', () => {
  it('keeps all existing data and supports the new version-history index', async () => {
    const name = `test-${createId()}`
    databasesToDelete.push(name)
    const documentId = createId()
    const deviceId = createId()
    const document = sheetDocument(documentId, deviceId)

    // 1. Create a database exactly as save-format version 1 defined it.
    const oldDatabase = new Dexie(name)
    oldDatabase.version(1).stores(DATABASE_VERSIONS[1])
    await oldDatabase.table('meta').put({ key: 'deviceId', value: deviceId })
    await oldDatabase.table('documents').put(document)
    await oldDatabase.table('documentVersions').put({
      id: createId(),
      createdAt: 1_500,
      updatedAt: 1_500,
      rev: 1,
      deviceId,
      deleted: false,
      documentId,
      reason: 'auto',
      keep: false,
      snapshot: document,
    })
    oldDatabase.close()

    // 2. Open it with the current app, which upgrades it automatically.
    const database = new WorkSimDatabase(name)
    await database.open()
    expect(database.verno).toBe(2)

    // 3. Everything is still there and readable.
    expect(await getDocument(documentId, database)).toEqual(document)
    const versions = await listVersions(documentId, database)
    expect(versions).toHaveLength(1)
    expect(versions[0].snapshot.title).toBe('Saved with version 1')
    database.close()
  })
})

describe('upgradeDocument', () => {
  const document = {
    kind: 'sheet',
    formatVersion: 1,
    title: 'Old',
    content: { cells: 'v1' },
  }

  it('leaves a current document unchanged', () => {
    expect(upgradeDocument(document)).toEqual(document)
  })

  it('applies upgrade steps one format at a time', () => {
    const migrations: DocumentMigrations = {
      sheet: {
        1: (doc) => ({ ...doc, content: { cells: 'v2' } }),
        2: (doc) => ({ ...doc, title: `${String(doc.title)} (upgraded)` }),
      },
    }
    expect(upgradeDocument(document, { sheet: 3 }, migrations)).toEqual({
      kind: 'sheet',
      formatVersion: 3,
      title: 'Old (upgraded)',
      content: { cells: 'v2' },
    })
  })

  it('fails clearly when an upgrade step is missing', () => {
    expect(() => upgradeDocument(document, { sheet: 2 }, { sheet: {} })).toThrow(
      /No upgrade step/,
    )
  })

  it('refuses documents saved by a newer version of the app', () => {
    expect(() => upgradeDocument({ ...document, formatVersion: 5 })).toThrow(
      NewerFormatError,
    )
  })

  it('passes through data that is not a document, for validation to reject', () => {
    expect(upgradeDocument(null)).toBeNull()
    expect(upgradeDocument('text')).toBe('text')
  })
})
