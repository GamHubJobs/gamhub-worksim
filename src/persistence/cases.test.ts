import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getCase } from '../content/cases'
import { arriveCase, gradeCase, recordCaseResult, saveCaseAnswer } from '../game/cases'
import { caseRecordContent } from '../game/caseRecord'
import { modelAnswers } from '../game/caseModel'
import { caseKey, decideCaseCapture, projectKey } from '../game/portfolio'
import { createId } from '../lib/ids'
import { createBackup, importBackup, readBackupFile } from './backup'
import { WorkSimDatabase } from './db'
import { findPortfolioItem, loadPortfolioFiles } from './portfolio'
import {
  createProfile,
  saveSubmission,
  updateProfile,
  type ProfileFields,
} from './profiles'
import { DOCUMENT_FORMAT_VERSIONS, type AnyDocument } from './schemas'
import { startingWorkState } from './workState'

let database: WorkSimDatabase
beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})
afterEach(async () => {
  database.close()
  await Dexie.delete(database.name)
})

const def = getCase('fa-short-delivery')!
const fields: ProfileFields = {
  name: 'Alex',
  careerId: def.careerId,
  levelId: 'intern',
  xp: 0,
  skills: {},
  assignments: {},
  inbox: [],
  work: startingWorkState(),
}

async function sha256(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

describe('cases in saves', () => {
  it('a backup from before Phase 6 restores, with no cases and ordinary indicators', async () => {
    const profile = await createProfile(fields, database)
    const backup = await createBackup(database)
    // Make it look like a Phase 5 backup: profile format 2, no cases or organisation.
    backup.data.profiles = backup.data.profiles.map((row) => {
      const {
        cases: _c,
        org: _o,
        ...work
      } = (row as { work: Record<string, unknown> }).work
      return { ...(row as object), formatVersion: 2, work }
    })
    backup.checksum = await sha256(JSON.stringify(backup.data))
    await importBackup(await readBackupFile(JSON.stringify(backup)), database)
    const restored = (await database.profiles.get(profile.id))!
    expect(restored.formatVersion).toBe(4)
    expect(restored.work.cases).toEqual({})
    expect(restored.work.org.indicators).toEqual({
      satisfaction: 70,
      risk: 30,
      discipline: 70,
    })
  })

  it('submitting a case saves the result and its portfolio evidence together', async () => {
    const profile = await createProfile(fields, database)
    await updateProfile(
      profile.id,
      (p) => {
        let next = arriveCase(p, def, 1)
        for (const [stepId, answer] of Object.entries(modelAnswers(def))) {
          next = saveCaseAnswer(next, def.id, stepId, answer)
        }
        return next
      },
      database,
    )
    const current = (await database.profiles.get(profile.id))!
    const answers = current.work.cases[def.id].answers
    const result = gradeCase(def, answers)
    const record = {
      id: createId(),
      createdAt: 1,
      updatedAt: 1,
      rev: 1,
      deviceId: createId(),
      deleted: false,
      title: `Case record: ${def.title}`,
      owner: profile.id,
      formatVersion: DOCUMENT_FORMAT_VERSIONS.doc,
      kind: 'doc',
      content: caseRecordContent(def, answers, result, 'Alex'),
    } as AnyDocument
    await saveSubmission(
      profile.id,
      [],
      (latest) => recordCaseResult(latest, def, result, 5000),
      database,
      {
        key: caseKey(profile.id, def.id),
        decide: () =>
          decideCaseCapture({
            profileId: profile.id,
            def,
            result,
            level: { id: 'intern', title: 'Intern', index: 1 },
            submittedAt: 5000,
            files: [{ role: 'main', document: record }],
          }),
      },
    )
    const saved = (await database.profiles.get(profile.id))!
    expect(saved.work.cases[def.id].status).toBe('submitted')
    const item = (await findPortfolioItem(caseKey(profile.id, def.id), database))!
    expect(item).toMatchObject({ type: 'case', caseId: def.id, score: 100 })
    const [file] = await loadPortfolioFiles(item, database)
    expect(JSON.stringify(file.snapshot.content)).toContain('Pay £552 today')
  })
})

describe('the programme in the portfolio', () => {
  it('both programme cases passed become one project linking the two case records', async () => {
    const profile = await createProfile({ ...fields, levelId: 'assistant' }, database)
    for (const id of ['prog-fa-budget', 'prog-fa-review']) {
      const stage = getCase(id)!
      await updateProfile(
        profile.id,
        (p) => {
          let next = arriveCase(p, stage, 1)
          for (const [stepId, answer] of Object.entries(modelAnswers(stage))) {
            next = saveCaseAnswer(next, stage.id, stepId, answer)
          }
          return next
        },
        database,
      )
      const answers = (await database.profiles.get(profile.id))!.work.cases[id].answers
      const result = gradeCase(stage, answers)
      const record = {
        id: createId(),
        createdAt: 1,
        updatedAt: 1,
        rev: 1,
        deviceId: createId(),
        deleted: false,
        title: `Case record: ${stage.title}`,
        owner: profile.id,
        formatVersion: DOCUMENT_FORMAT_VERSIONS.doc,
        kind: 'doc',
        content: caseRecordContent(stage, answers, result, 'Alex'),
      } as AnyDocument
      await saveSubmission(
        profile.id,
        [],
        (latest) => recordCaseResult(latest, stage, result, 5000),
        database,
        {
          key: caseKey(profile.id, id),
          projectId: stage.projectId,
          decide: () =>
            decideCaseCapture({
              profileId: profile.id,
              def: stage,
              result,
              level: { id: 'assistant', title: 'Assistant', index: 3 },
              submittedAt: 5000,
              files: [{ role: 'main', document: record }],
            }),
        },
      )
    }
    const project = (await findPortfolioItem(
      projectKey(profile.id, 'expansion-office-admin-finance'),
      database,
    ))!
    expect(project).toMatchObject({
      type: 'project',
      title: 'Opening the Manchester office',
      score: 100,
    })
    expect(project.stages!.map((s) => s.assignmentId)).toEqual([
      'prog-fa-budget',
      'prog-fa-review',
    ])
    const first = await findPortfolioItem(caseKey(profile.id, 'prog-fa-budget'), database)
    expect(project.stages![0].itemId).toBe(first!.id)
  })
})
