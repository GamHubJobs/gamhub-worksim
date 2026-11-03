import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createId } from '../lib/ids'
import { createBackup, readBackupFile } from './backup'
import { WorkSimDatabase } from './db'
import {
  createProfile,
  getActiveProfile,
  updateProfile,
  type ProfileFields,
} from './profiles'
import {
  listSafetyCopies,
  protectBeforeUpgrade,
  restoreSafetyCopy,
  restoreWithSafetyCopy,
  SAFETY_COPIES_KEPT,
  takeSafetyCopy,
} from './safety'
import { startingWorkState } from './workState'

let database: WorkSimDatabase
beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})
afterEach(async () => {
  database.close()
  await Dexie.delete(database.name)
})

const fields = (name: string, xp = 0): ProfileFields => ({
  name,
  careerId: 'accounting',
  levelId: 'accounts-trainee',
  xp,
  skills: {},
  assignments: {},
  inbox: [],
  work: startingWorkState(),
})

describe('safety copies', () => {
  it('a restore keeps a copy of the data it replaces, and can be undone', async () => {
    const original = await createProfile(fields('Alex', 120), database)
    // A backup from somewhere else, with different progress.
    const other = new WorkSimDatabase(`test-${createId()}`)
    await createProfile(fields('Sam', 900), other)
    const preview = await readBackupFile(JSON.stringify(await createBackup(other)))
    other.close()
    await Dexie.delete(other.name)

    await restoreWithSafetyCopy(preview, database)
    expect((await getActiveProfile(database))?.name).toBe('Sam')
    const [copy] = await listSafetyCopies(database)
    expect(copy.reason).toBe('Before restoring a backup')

    // Undo: Alex's progress is back, exactly.
    await restoreSafetyCopy(copy.id, database)
    const restored = await database.profiles.get(original.id)
    expect(restored).toMatchObject({ name: 'Alex', xp: 120 })
    // Putting it back kept a copy too, so that can be undone as well.
    expect((await listSafetyCopies(database)).length).toBe(2)
  })

  it('keeps only the newest copies, and never puts them in backups', async () => {
    await createProfile(fields('Alex'), database)
    for (let i = 0; i < SAFETY_COPIES_KEPT + 2; i++)
      await takeSafetyCopy(`copy ${i}`, database)
    const copies = await listSafetyCopies(database)
    expect(copies.map((c) => c.reason)).toEqual(['copy 4', 'copy 3', 'copy 2'])
    const backup = await createBackup(database)
    expect(Object.keys(backup.data)).not.toContain('safetyCopies')
  })

  it('a backup restore never removes the safety copies', async () => {
    await createProfile(fields('Alex'), database)
    await takeSafetyCopy('kept', database)
    const preview = await readBackupFile(JSON.stringify(await createBackup(database)))
    await restoreWithSafetyCopy(preview, database)
    expect((await listSafetyCopies(database)).map((c) => c.reason)).toContain('kept')
  })

  it('keeps one copy before saves in an older format are upgraded', async () => {
    const profile = await createProfile(fields('Alex', 50), database)
    // Make it a format 4 save from before this version.
    const raw = (await database.profiles.get(profile.id))!
    await database.profiles.put({ ...raw, formatVersion: 3 } as never)
    expect(await protectBeforeUpgrade(database)).toBe(true)
    expect(await protectBeforeUpgrade(database)).toBe(false)
    const [copy] = await listSafetyCopies(database)
    expect(copy.reason).toMatch(/^Before upgrading saves to format \d+$/)
    // The copy holds the save as it was, in its old format.
    const stored = await database.safetyCopies.get(copy.id)
    const data = JSON.parse(stored!.data) as {
      data: { profiles: Array<{ formatVersion: number }> }
    }
    expect(data.data.profiles[0].formatVersion).toBe(3)
  })

  it('takes no copy when every save is already current', async () => {
    const profile = await createProfile(fields('Alex'), database)
    await updateProfile(profile.id, (p) => ({ ...p, xp: 10 }), database)
    expect(await protectBeforeUpgrade(database)).toBe(false)
    expect(await listSafetyCopies(database)).toEqual([])
  })
})
