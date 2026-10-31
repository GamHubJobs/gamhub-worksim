import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createId } from '../lib/ids'
import { WorkSimDatabase } from './db'
import { createDocument, getDocument, updateDocument } from './documentsRepo'
import type { AnyDocument, SheetContent } from './schemas'
import {
  createVersion,
  listVersions,
  MAX_AUTOMATIC_VERSIONS,
  restoreVersion,
  setVersionKept,
} from './versions'

/** The sheets of a document that is known to be a workbook. */
const sheetsOf = (document: { content: unknown }) =>
  (document.content as SheetContent).sheets

let database: WorkSimDatabase

beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})

afterEach(async () => {
  vi.useRealTimers()
  await database.delete()
})

function contentWithValidSheetId(sheetId: string, value: string): SheetContent {
  return { sheets: [{ id: sheetId, name: 'Sheet1', cells: { A1: { input: value } } }] }
}

async function newDocument(value = 'first'): Promise<AnyDocument> {
  const sheetId = createId()
  return createDocument(
    { kind: 'sheet', title: 'Budget', content: contentWithValidSheetId(sheetId, value) },
    database,
  )
}

function editedContent(document: AnyDocument, value: string): SheetContent {
  return contentWithValidSheetId(sheetsOf(document)[0].id, value)
}

/** Makes every call to Date.now() return a later time, so versions have distinct times. */
function useAdvancingClock() {
  let time = Date.now()
  vi.spyOn(Date, 'now').mockImplementation(() => (time += 1000))
}

describe('createVersion and listVersions', () => {
  it('stores a frozen copy of the document', async () => {
    const document = await newDocument('first')
    await createVersion(document, 'auto', {}, database)
    await updateDocument(
      document.id,
      { content: editedContent(document, 'second') },
      database,
    )

    const versions = await listVersions(document.id, database)
    expect(versions).toHaveLength(1)
    expect(sheetsOf(versions[0].snapshot)[0].cells.A1.input).toBe('first')
    expect(versions[0].reason).toBe('auto')
  })

  it('lists versions newest first, only for the requested document', async () => {
    useAdvancingClock()
    const document = await newDocument()
    const other = await newDocument()
    await createVersion(document, 'auto', {}, database)
    await createVersion(other, 'auto', {}, database)
    await createVersion(document, 'close', {}, database)

    const versions = await listVersions(document.id, database)
    expect(versions.map((version) => version.reason)).toEqual(['close', 'auto'])
  })
})

describe('automatic clean-up', () => {
  it(`keeps only the newest ${MAX_AUTOMATIC_VERSIONS} automatic versions`, async () => {
    useAdvancingClock()
    const document = await newDocument()
    for (let i = 0; i < MAX_AUTOMATIC_VERSIONS + 5; i++) {
      await createVersion(document, 'auto', {}, database)
    }
    expect(await listVersions(document.id, database)).toHaveLength(MAX_AUTOMATIC_VERSIONS)
  })

  it('never removes kept versions', async () => {
    useAdvancingClock()
    const document = await newDocument()
    const kept = await createVersion(document, 'manual', { keep: true }, database)
    for (let i = 0; i < MAX_AUTOMATIC_VERSIONS + 5; i++) {
      await createVersion(document, 'auto', {}, database)
    }
    const versions = await listVersions(document.id, database)
    expect(versions).toHaveLength(MAX_AUTOMATIC_VERSIONS + 1)
    expect(versions.some((version) => version.id === kept.id)).toBe(true)
  })

  it('can mark and unmark a version as kept', async () => {
    const document = await newDocument()
    const version = await createVersion(document, 'auto', {}, database)
    await setVersionKept(version.id, true, database)
    expect((await listVersions(document.id, database))[0].keep).toBe(true)
    await setVersionKept(version.id, false, database)
    expect((await listVersions(document.id, database))[0].keep).toBe(false)
  })
})

describe('restoreVersion', () => {
  it('brings back the old content as a new revision', async () => {
    useAdvancingClock()
    const document = await newDocument('original')
    const version = await createVersion(document, 'auto', {}, database)
    await updateDocument(
      document.id,
      { content: editedContent(document, 'changed') },
      database,
    )

    const restored = await restoreVersion(document.id, version.id, database)
    expect(sheetsOf(restored)[0].cells.A1.input).toBe('original')
    expect(restored.rev).toBe(3)
    expect(await getDocument(document.id, database)).toEqual(restored)
  })

  it('saves the current state first, so the restore can be undone', async () => {
    useAdvancingClock()
    const document = await newDocument('original')
    const version = await createVersion(document, 'auto', {}, database)
    await updateDocument(
      document.id,
      { content: editedContent(document, 'latest') },
      database,
    )
    await restoreVersion(document.id, version.id, database)

    const [safetyCopy] = await listVersions(document.id, database)
    expect(safetyCopy.reason).toBe('before-restore')
    expect(sheetsOf(safetyCopy.snapshot)[0].cells.A1.input).toBe('latest')

    const undone = await restoreVersion(document.id, safetyCopy.id, database)
    expect(sheetsOf(undone)[0].cells.A1.input).toBe('latest')
  })

  it("refuses to restore another document's version", async () => {
    const document = await newDocument()
    const other = await newDocument()
    const otherVersion = await createVersion(other, 'auto', {}, database)
    await expect(restoreVersion(document.id, otherVersion.id, database)).rejects.toThrow()
  })
})
