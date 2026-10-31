import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createId } from '../lib/ids'
import { createBackup, importBackup, readBackupFile } from './backup'
import { WorkSimDatabase } from './db'
import { getDocument } from './documentsRepo'
import { NewerFormatError, RecordNotFoundError } from './errors'
import {
  createProfile,
  getActiveProfile,
  saveSubmission,
  startAssignment,
  updateProfile,
  type ProfileFields,
} from './profiles'
import type { SheetContent } from './schemas'
import { listVersions } from './versions'

let database: WorkSimDatabase

beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})

afterEach(async () => {
  database.close()
  await Dexie.delete(database.name)
})

const fields: ProfileFields = {
  name: 'Alex',
  careerId: 'office-admin-finance',
  levelId: 'intern',
  xp: 0,
  skills: {},
  assignments: {},
  inbox: [],
}

const content = (): SheetContent => ({
  sheets: [{ id: createId(), name: 'Order', cells: { A1: { input: 'Item' } } }],
})

describe('profiles', () => {
  it('creates a profile and remembers it as the active one', async () => {
    expect(await getActiveProfile(database)).toBeUndefined()
    const profile = await createProfile(fields, database)
    expect(profile.rev).toBe(1)
    expect(profile.formatVersion).toBe(1)
    expect(await getActiveProfile(database)).toEqual(profile)
    expect(await database.outbox.count()).toBe(1)
  })

  it('updates a profile from its latest saved state', async () => {
    const profile = await createProfile(fields, database)
    await Promise.all([
      updateProfile(profile.id, (p) => ({ ...p, xp: p.xp + 10 }), database),
      updateProfile(profile.id, (p) => ({ ...p, xp: p.xp + 5 }), database),
    ])
    const saved = await getActiveProfile(database)
    expect(saved?.xp).toBe(15) // neither change was lost
    expect(saved?.rev).toBe(3)
  })

  it('never saves an invalid profile', async () => {
    const profile = await createProfile(fields, database)
    await expect(
      updateProfile(profile.id, (p) => ({ ...p, xp: -1 }), database),
    ).rejects.toThrow()
    expect((await getActiveProfile(database))?.rev).toBe(1)
  })

  it('refuses a profile saved by a newer app version', async () => {
    const profile = await createProfile(fields, database)
    await database.profiles.update(profile.id, { formatVersion: 99 })
    await expect(getActiveProfile(database)).rejects.toThrow(NewerFormatError)
  })

  it('reports a missing profile', async () => {
    await expect(updateProfile(createId(), (p) => p, database)).rejects.toThrow(
      RecordNotFoundError,
    )
  })
})

describe('assignments', () => {
  it('starting an assignment creates its workbook once', async () => {
    const profile = await createProfile(fields, database)
    const input = {
      assignmentId: 'supplies-order',
      assignmentVersion: 1,
      title: 'Supplies order',
      content: content(),
    }
    const first = await startAssignment(profile.id, input, database)
    const again = await startAssignment(profile.id, input, database)
    expect(again.documentId).toBe(first.documentId)
    expect(await database.documents.count()).toBe(1)

    const document = await getDocument(first.documentId, database)
    expect(document?.title).toBe('Supplies order')
    expect(first.profile.assignments['supplies-order'].documentId).toBe(document?.id)
    // The workbook as received is kept in its version history.
    const versions = await listVersions(first.documentId, database)
    expect(versions).toHaveLength(1)
    expect(versions[0]).toMatchObject({ reason: 'original', keep: true })
  })

  it('a submission keeps a copy of the workbook and updates the profile together', async () => {
    const profile = await createProfile(fields, database)
    const { documentId } = await startAssignment(
      profile.id,
      { assignmentId: 'a', assignmentVersion: 1, title: 'A', content: content() },
      database,
    )
    const document = (await getDocument(documentId, database))!
    const saved = await saveSubmission(
      profile.id,
      document,
      (p, versionId) => ({ ...p, xp: 50, name: `${p.name} ${versionId.length}` }),
      database,
    )
    expect(saved.xp).toBe(50)
    const versions = await listVersions(documentId, database)
    expect(versions.map((v) => v.reason)).toEqual(['submitted', 'original'])
    expect(versions[0].keep).toBe(true)
  })

  it('a failing profile change also undoes the submitted copy', async () => {
    const profile = await createProfile(fields, database)
    const { documentId } = await startAssignment(
      profile.id,
      { assignmentId: 'a', assignmentVersion: 1, title: 'A', content: content() },
      database,
    )
    const document = (await getDocument(documentId, database))!
    await expect(
      saveSubmission(profile.id, document, (p) => ({ ...p, xp: -5 }), database),
    ).rejects.toThrow()
    const versions = await listVersions(documentId, database)
    expect(versions.map((v) => v.reason)).toEqual(['original'])
  })
})

describe('profiles in backups', () => {
  it('are included and restored', async () => {
    const profile = await createProfile({ ...fields, xp: 42 }, database)
    const preview = await readBackupFile(JSON.stringify(await createBackup(database)))
    expect(preview.counts.profiles).toBe(1)

    const fresh = new WorkSimDatabase(`test-${createId()}`)
    try {
      await importBackup(preview, fresh)
      const restored = await getActiveProfile(fresh)
      expect(restored?.id).toBe(profile.id)
      expect(restored?.xp).toBe(42)
    } finally {
      fresh.close()
      await Dexie.delete(fresh.name)
    }
  })
})
