import { beforeEach, describe, expect, it } from 'vitest'
import { createId } from '../lib/ids'
import {
  clearJournal,
  findRecoverableContent,
  readJournal,
  writeJournal,
  type JournalEntry,
} from './emergencyJournal'
import { SheetContentSchema, type SheetDocument } from './schemas'
import { MemoryStorage } from '../test/memoryStorage'

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
})

function sheetDocument(value: string, updatedAt: number): SheetDocument {
  return {
    id: 'doc-1',
    createdAt: 0,
    updatedAt,
    rev: 1,
    deviceId: createId(),
    deleted: false,
    kind: 'sheet',
    title: 'Budget',
    formatVersion: 1,
    content: {
      sheets: [{ id: createId(), name: 'Sheet1', cells: { A1: { input: value } } }],
    },
  }
}

function journalFor(
  document: SheetDocument,
  value: string,
  writtenAt: number,
): JournalEntry {
  const sheet = document.content.sheets[0]
  return {
    documentId: document.id,
    content: { sheets: [{ ...sheet, cells: { A1: { input: value } } }] },
    writtenAt,
  }
}

describe('journal storage', () => {
  it('writes, reads and clears an entry', () => {
    expect(writeJournal('doc-1', { hello: 'world' }, storage)).toBe(true)
    expect(readJournal('doc-1', storage)?.content).toEqual({ hello: 'world' })
    clearJournal('doc-1', storage)
    expect(readJournal('doc-1', storage)).toBeNull()
  })

  it('keeps entries for different documents separate', () => {
    writeJournal('doc-1', 'one', storage)
    writeJournal('doc-2', 'two', storage)
    expect(readJournal('doc-1', storage)?.content).toBe('one')
    expect(readJournal('doc-2', storage)?.content).toBe('two')
  })

  it('ignores a damaged entry', () => {
    storage.setItem('gamhub-worksim:journal:doc-1', '{not json')
    expect(readJournal('doc-1', storage)).toBeNull()
  })

  it('reports failure instead of crashing when storage is full or missing', () => {
    storage.failWrites = true
    expect(writeJournal('doc-1', 'x', storage)).toBe(false)
    expect(writeJournal('doc-1', 'x', null)).toBe(false)
  })
})

describe('findRecoverableContent', () => {
  it('recovers changes written after the last save', () => {
    const document = sheetDocument('saved', 1_000)
    const entry = journalFor(document, 'unsaved', 2_000)
    const recovered = findRecoverableContent(document, entry, SheetContentSchema)
    expect(recovered?.sheets[0].cells.A1.input).toBe('unsaved')
  })

  it('ignores changes that were already saved', () => {
    const document = sheetDocument('saved', 3_000)
    const entry = journalFor(document, 'older', 2_000)
    expect(findRecoverableContent(document, entry, SheetContentSchema)).toBeNull()
  })

  it('ignores an entry identical to the saved content', () => {
    const document = sheetDocument('same', 1_000)
    const entry = journalFor(document, 'same', 2_000)
    expect(findRecoverableContent(document, entry, SheetContentSchema)).toBeNull()
  })

  it('ignores an entry with invalid content', () => {
    const document = sheetDocument('saved', 1_000)
    const entry = { documentId: document.id, content: { sheets: [] }, writtenAt: 2_000 }
    expect(findRecoverableContent(document, entry, SheetContentSchema)).toBeNull()
  })

  it('ignores an entry for another document', () => {
    const document = sheetDocument('saved', 1_000)
    const entry = { ...journalFor(document, 'unsaved', 2_000), documentId: 'doc-2' }
    expect(findRecoverableContent(document, entry, SheetContentSchema)).toBeNull()
  })
})
