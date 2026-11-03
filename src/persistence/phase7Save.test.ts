import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getCase } from '../content/cases'
import { caseFor } from '../game/caseVariants'
import { careerRecord } from '../game/careerRecord'
import { createId } from '../lib/ids'
import { createBackup, importBackup, readBackupFile } from './backup'
import { WorkSimDatabase } from './db'
import {
  createProfile,
  getActiveProfile,
  updateProfile,
  type ProfileFields,
} from './profiles'
import { protectBeforeUpgrade } from './safety'
import { startingWorkState } from './workState'

let database: WorkSimDatabase
beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})
afterEach(async () => {
  database.close()
  await Dexie.delete(database.name)
})

async function sha256(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** A career save as Phase 7 left it: format 4, a case with no variant, a passed assessment. */
function phase7Fields(): ProfileFields {
  const work = startingWorkState(0)
  return {
    name: 'Alex',
    careerId: 'office-admin-finance',
    levelId: 'assistant',
    xp: 1500,
    skills: { 'finance-basics': 120 },
    assignments: {},
    inbox: [],
    work: {
      ...work,
      cases: {
        'fa-short-delivery': {
          caseId: 'fa-short-delivery',
          version: 1,
          status: 'submitted',
          arrivedAt: 600,
          due: 960,
          answers: { owed: '552' },
          files: {},
          result: { submittedAt: 5, score: 100, rating: 'excellent', steps: [] },
        },
      },
      record: {
        ...work.record,
        seed: 777,
        promotions: [{ levelId: 'junior', day: 3, at: 4, xp: 400 }],
        assessments: [
          {
            caseId: 'ready-fa-practitioner',
            version: 1,
            variant: 'a',
            attempt: 1,
            status: 'submitted',
            arrivedAt: 700,
            due: 880,
            answers: {},
            files: {},
            result: { submittedAt: 6, score: 92, rating: 'excellent', steps: [] },
          },
        ],
      },
    },
  }
}

describe('a save from before Phase 8', () => {
  it('restores from a Phase 7 backup and keeps everything: cases, assessments, promotions and the seed', async () => {
    await createProfile(phase7Fields(), database)
    const backup = await createBackup(database)
    // Make it a Phase 7 backup: database version 4, without the safety copies table.
    backup.databaseVersion = 4
    backup.checksum = await sha256(JSON.stringify(backup.data))
    await database.profiles.clear()

    await importBackup(await readBackupFile(JSON.stringify(backup)), database)
    const restored = (await getActiveProfile(database))!
    expect(restored.formatVersion).toBe(4)
    expect(restored.work.record.seed).toBe(777)
    expect(restored.work.record.promotions).toHaveLength(1)
    expect(restored.work.record.assessments[0]).toMatchObject({
      status: 'submitted',
      version: 1,
    })

    // A case received before variants existed is still the original wording.
    expect(restored.work.cases['fa-short-delivery']?.variant).toBeUndefined()
    expect(caseFor(restored, 'fa-short-delivery')).toBe(getCase('fa-short-delivery'))
    // The career record reads it as before.
    const customers = careerRecord(restored).sections.find((s) => s.id === 'customers')
    expect(customers?.stats[0].value).toBe('1')
  })

  it('keeps working: a change is saved in the current format, and no safety copy is needed', async () => {
    const profile = await createProfile(phase7Fields(), database)
    expect(await protectBeforeUpgrade(database)).toBe(false)
    const updated = await updateProfile(
      profile.id,
      (p) => ({ ...p, xp: p.xp + 10 }),
      database,
    )
    expect(updated.xp).toBe(1510)
    expect(updated.work.record.assessments[0].result?.score).toBe(92)
  })
})
