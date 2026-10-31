import { describe, expect, it } from 'vitest'
import { createId } from '../lib/ids'
import {
  CellAddressSchema,
  DocumentSchema,
  DocumentVersionSchema,
  type SheetDocument,
} from './schemas'

/** A valid spreadsheet document to start each test from. */
function makeSheetDocument(): SheetDocument {
  const now = Date.now()
  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    rev: 1,
    deviceId: createId(),
    deleted: false,
    kind: 'sheet',
    title: 'Q3 Expenses',
    formatVersion: 1,
    content: {
      sheets: [
        {
          id: createId(),
          name: 'Sheet1',
          cells: {
            A1: { input: 'Item' },
            B1: { input: 'Cost' },
            B2: { input: '120.50' },
            B3: { input: '=SUM(B2:B2)' },
          },
        },
      ],
    },
  }
}

describe('DocumentSchema', () => {
  it('accepts a valid spreadsheet document', () => {
    const result = DocumentSchema.safeParse(makeSheetDocument())
    expect(result.success).toBe(true)
  })

  it('accepts a spreadsheet with no filled cells', () => {
    const doc = makeSheetDocument()
    doc.content.sheets[0].cells = {}
    expect(DocumentSchema.safeParse(doc).success).toBe(true)
  })

  it('rejects a document with a missing field', () => {
    const { title: _title, ...withoutTitle } = makeSheetDocument()
    expect(DocumentSchema.safeParse(withoutTitle).success).toBe(false)
  })

  it('rejects a document with a field of the wrong type', () => {
    const doc = { ...makeSheetDocument(), rev: 'one' }
    expect(DocumentSchema.safeParse(doc).success).toBe(false)
  })

  it('rejects an invalid revision number', () => {
    expect(DocumentSchema.safeParse({ ...makeSheetDocument(), rev: 0 }).success).toBe(
      false,
    )
    expect(DocumentSchema.safeParse({ ...makeSheetDocument(), rev: 1.5 }).success).toBe(
      false,
    )
  })

  it('rejects an invalid ID', () => {
    const doc = { ...makeSheetDocument(), id: 'not-an-id' }
    expect(DocumentSchema.safeParse(doc).success).toBe(false)
  })

  it('rejects an unknown document kind', () => {
    const doc = { ...makeSheetDocument(), kind: 'video' }
    expect(DocumentSchema.safeParse(doc).success).toBe(false)
  })

  it('rejects a spreadsheet with no sheets', () => {
    const doc = makeSheetDocument()
    doc.content.sheets = []
    expect(DocumentSchema.safeParse(doc).success).toBe(false)
  })

  it('rejects a cell stored under an invalid address', () => {
    const doc = makeSheetDocument()
    const cells: Record<string, unknown> = doc.content.sheets[0].cells
    cells['not a cell'] = { input: 'oops' }
    expect(DocumentSchema.safeParse(doc).success).toBe(false)
  })

  it('rejects a cell with a missing input', () => {
    const doc = makeSheetDocument()
    const cells: Record<string, unknown> = doc.content.sheets[0].cells
    cells.C1 = {}
    expect(DocumentSchema.safeParse(doc).success).toBe(false)
  })

  it('rejects completely broken data', () => {
    expect(DocumentSchema.safeParse(null).success).toBe(false)
    expect(DocumentSchema.safeParse('hello').success).toBe(false)
    expect(DocumentSchema.safeParse({}).success).toBe(false)
  })
})

describe('CellAddressSchema', () => {
  it('accepts normal cell addresses', () => {
    for (const address of ['A1', 'Z99', 'AB300', 'XFD1048576']) {
      expect(CellAddressSchema.safeParse(address).success).toBe(true)
    }
  })

  it('rejects invalid cell addresses', () => {
    for (const address of ['', 'A', '1', 'A0', 'a1', '1A', 'A-1', 'ABCD1']) {
      expect(CellAddressSchema.safeParse(address).success).toBe(false)
    }
  })
})

describe('DocumentVersionSchema', () => {
  it('accepts a valid version snapshot', () => {
    const doc = makeSheetDocument()
    const version = {
      id: createId(),
      createdAt: doc.updatedAt,
      updatedAt: doc.updatedAt,
      rev: 1,
      deviceId: doc.deviceId,
      deleted: false,
      documentId: doc.id,
      reason: 'auto',
      keep: false,
      snapshot: doc,
    }
    expect(DocumentVersionSchema.safeParse(version).success).toBe(true)
  })

  it('rejects an unknown version reason', () => {
    const doc = makeSheetDocument()
    const version = {
      id: createId(),
      createdAt: doc.updatedAt,
      updatedAt: doc.updatedAt,
      rev: 1,
      deviceId: doc.deviceId,
      deleted: false,
      documentId: doc.id,
      reason: 'because',
      keep: false,
      snapshot: doc,
    }
    expect(DocumentVersionSchema.safeParse(version).success).toBe(false)
  })
})
