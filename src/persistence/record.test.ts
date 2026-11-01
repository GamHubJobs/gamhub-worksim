import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createId } from '../lib/ids'
import { createBackup, importBackup, readBackupFile } from './backup'
import { WorkSimDatabase } from './db'
import { createProfile, getActiveProfile, type ProfileFields } from './profiles'
import { startingWorkState } from './workState'

let database: WorkSimDatabase
beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})
afterEach(async () => {
  database.close()
  await Dexie.delete(database.name)
})

const work = startingWorkState(1234)
const fields: ProfileFields = {
  name: 'Alex',
  careerId: 'digital-marketing',
  levelId: 'marketing-assistant',
  xp: 0,
  skills: {},
  assignments: {},
  inbox: [],
  work: {
    ...work,
    record: {
      ...work.record,
      promotions: [{ levelId: 'x', day: 3, at: 99, xp: 400 }],
      achievements: { 'first-delivery': { day: 2, at: 50 } },
      desk: { plant: 'succulent' },
    },
  },
}

describe('the career record in saves', () => {
  it('is kept by a backup and restored in full', async () => {
    const profile = await createProfile(fields, database)
    const backup = await createBackup(database)
    await database.profiles.clear()
    await importBackup(await readBackupFile(JSON.stringify(backup)), database)
    const restored = (await getActiveProfile(database))!
    expect(restored.id).toBe(profile.id)
    expect(restored.work.record).toEqual(fields.work.record)
  })
})
