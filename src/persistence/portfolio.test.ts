import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ASSIGNMENTS, getAssignment } from '../content/assignments'
import { CAREERS } from '../content/careers'
import { recordSubmission } from '../game/career'
import type { GradeResult } from '../game/grading'
import { decideCapture, portfolioKey } from '../game/portfolio'
import { createId } from '../lib/ids'
import { createBackup, importBackup, readBackupFile } from './backup'
import { WorkSimDatabase } from './db'
import { getDocument } from './documentsRepo'
import {
  findPortfolioItem,
  listPortfolioItems,
  loadPortfolioFiles,
  updatePortfolioPresentation,
} from './portfolio'
import {
  createProfile,
  saveSubmission,
  startAssignment,
  type ProfileFields,
} from './profiles'
import {
  PortfolioItemSchema,
  type AnyDocument,
  type Profile,
  type SheetContent,
} from './schemas'
import { listVersions, setVersionKept } from './versions'
import { startingWorkState } from './workState'

let database: WorkSimDatabase

beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})

afterEach(async () => {
  database.close()
  await Dexie.delete(database.name)
})

const assignment = getAssignment('supplies-order')!

const fields: ProfileFields = {
  name: 'Alex',
  careerId: assignment.careerId,
  levelId: CAREERS.find((c) => c.id === assignment.careerId)!.levels[0].id,
  xp: 0,
  skills: {},
  assignments: {},
  inbox: [],
  work: startingWorkState(),
}

const SHEET_ID = createId()

const workbook = (text: string): SheetContent => ({
  sheets: [{ id: SHEET_ID, name: 'Order', cells: { A1: { input: text } } }],
})

function grade(score: number): GradeResult {
  const passed = score >= assignment.passScore
  return {
    score,
    rating: score >= 90 ? 'excellent' : score >= 80 ? 'good' : passed ? 'pass' : 'fail',
    passed,
    earned: score,
    maxPoints: 100,
    checks: [
      {
        id: 'totals',
        title: 'Totals',
        why: 'Totals must be right.',
        hint: 'Use SUM.',
        status: passed ? 'passed' : 'failed',
        earned: score,
        points: 100,
        problems: [],
      },
    ],
  }
}

async function setUp() {
  const profile = await createProfile(fields, database)
  const { documentId } = await startAssignment(
    profile.id,
    {
      assignmentId: assignment.id,
      assignmentVersion: assignment.version,
      title: 'Supplies order',
      content: workbook('first'),
    },
    database,
  )
  return { profile, documentId }
}

/** Submits the workbook with this text in A1, graded with this score. */
async function submit(
  profileId: string,
  documentId: string,
  score: number,
  text: string,
): Promise<Profile> {
  const stored = (await getDocument(documentId, database))!
  const document = { ...stored, content: workbook(text) } as AnyDocument
  const result = grade(score)
  const now = Date.now()
  return saveSubmission(
    profileId,
    [document],
    (p, versionId) => recordSubmission(p, assignment, result, now, versionId).profile,
    database,
    {
      key: portfolioKey(profileId, assignment.id),
      decide: (saved, existing) =>
        decideCapture({
          profileId,
          assignment,
          grade: result,
          attempts: saved.assignments[assignment.id].attempts,
          submittedAt: now,
          files: [{ role: 'main', document }],
          existing,
        }),
    },
  )
}

const cellText = async (itemKey: string) => {
  const item = (await findPortfolioItem(itemKey, database))!
  const [file] = await loadPortfolioFiles(item, database)
  return (file.snapshot.content as SheetContent).sheets[0].cells.A1.input
}

describe('portfolio capture', () => {
  it('failed work is not evidence; passed work is captured with its exact files', async () => {
    const { profile, documentId } = await setUp()
    const key = portfolioKey(profile.id, assignment.id)
    await submit(profile.id, documentId, 40, 'wrong')
    expect(await findPortfolioItem(key, database)).toBeUndefined()

    await submit(profile.id, documentId, 85, 'right')
    const item = (await findPortfolioItem(key, database))!
    expect(item).toMatchObject({
      type: 'task',
      assignmentId: assignment.id,
      title: assignment.title,
      score: 85,
      rating: 'good',
      included: true,
    })
    expect(item.checks).toEqual([
      expect.objectContaining({ id: 'totals', status: 'passed', title: 'Totals' }),
    ])
    expect(item.attempts.map((a) => a.score)).toEqual([40, 85])
    expect(item.files).toEqual([
      expect.objectContaining({ role: 'main', kind: 'sheet', available: true }),
    ])
    expect(await cellText(key)).toBe('right')
  })

  it('a worse resubmission only adds to the history; a better one replaces the evidence', async () => {
    const { profile, documentId } = await setUp()
    const key = portfolioKey(profile.id, assignment.id)
    await submit(profile.id, documentId, 85, 'good')
    const first = (await findPortfolioItem(key, database))!
    await updatePortfolioPresentation(
      first.id,
      { note: 'My first order', featured: true },
      database,
    )

    await submit(profile.id, documentId, 75, 'worse')
    let item = (await findPortfolioItem(key, database))!
    expect(item.score).toBe(85)
    expect(item.attempts).toHaveLength(2)
    expect(await cellText(key)).toBe('good')

    await submit(profile.id, documentId, 95, 'best')
    item = (await findPortfolioItem(key, database))!
    expect(item.id).toBe(first.id)
    expect(item.score).toBe(95)
    expect(item.note).toBe('My first order')
    expect(item.featured).toBe(true)
    expect(await cellText(key)).toBe('best')
    // One item, and only the latest evidence's file copies.
    expect(await database.portfolioItems.count()).toBe(1)
    expect(await database.portfolioFiles.count()).toBe(1)
  })

  it('a grade is never saved without its evidence, or the other way round', async () => {
    const { profile, documentId } = await setUp()
    const stored = (await getDocument(documentId, database))!
    await expect(
      saveSubmission(
        profile.id,
        [stored],
        (p, versionId) =>
          recordSubmission(p, assignment, grade(90), Date.now(), versionId).profile,
        database,
        {
          key: portfolioKey(profile.id, assignment.id),
          decide: () => {
            throw new Error('capture failed')
          },
        },
      ),
    ).rejects.toThrow('capture failed')
    const saved = (await database.profiles.get(profile.id))!
    expect(saved.assignments[assignment.id].attempts).toEqual([])
    expect(await database.portfolioItems.count()).toBe(0)
    expect((await listVersions(documentId, database)).map((v) => v.reason)).toEqual([
      'original',
    ])
  })

  it('the database refuses a second item for the same task', async () => {
    const { profile, documentId } = await setUp()
    await submit(profile.id, documentId, 90, 'x')
    const item = (await listPortfolioItems(undefined, database))[0]
    await expect(
      database.portfolioItems.add({ ...item, id: createId() }),
    ).rejects.toThrow()
  })

  it('presentation changes cannot touch the evidence', async () => {
    const { profile, documentId } = await setUp()
    await submit(profile.id, documentId, 90, 'x')
    const item = (await listPortfolioItems(undefined, database))[0]
    const changed = await updatePortfolioPresentation(
      item.id,
      { included: false, note: 'n'.repeat(700), score: 100, title: 'Fake' } as never,
      database,
    )
    expect(changed).toMatchObject({ included: false, score: 90, title: assignment.title })
    expect(changed.note).toHaveLength(600)
  })

  it('submitted copies are always kept', async () => {
    const { profile, documentId } = await setUp()
    await submit(profile.id, documentId, 90, 'x')
    const submitted = (await listVersions(documentId, database)).find(
      (v) => v.reason === 'submitted',
    )!
    await expect(setVersionKept(submitted.id, false, database)).rejects.toThrow(
      'always kept',
    )
  })

  it('backups include the portfolio, and restore it exactly', async () => {
    const { profile, documentId } = await setUp()
    await submit(profile.id, documentId, 90, 'kept')
    const key = portfolioKey(profile.id, assignment.id)
    const backup = JSON.stringify(await createBackup(database))
    await database.portfolioItems.clear()
    await database.portfolioFiles.clear()
    await importBackup(await readBackupFile(backup), database)
    expect(await cellText(key)).toBe('kept')
  })
})

describe('every task can become a portfolio item', () => {
  it.each(ASSIGNMENTS.map((a) => [a.id, a] as const))('%s', (_, task) => {
    const document = {
      id: createId(),
      kind: 'sheet',
      title: 'File',
      content: workbook('x'),
    } as unknown as AnyDocument
    const decision = decideCapture({
      profileId: createId(),
      assignment: task,
      grade: { ...grade(100), passed: true, rating: 'excellent', score: 100 },
      attempts: [],
      submittedAt: 1,
      files: [{ role: 'main', document }],
      existing: undefined,
    })
    expect(decision.action).toBe('evidence')
    if (decision.action !== 'evidence') return
    const item = PortfolioItemSchema.parse({
      ...decision.evidence,
      id: createId(),
      createdAt: 1,
      updatedAt: 1,
      rev: 1,
      deviceId: createId(),
      deleted: false,
      files: [],
      included: true,
      featured: false,
      note: '',
      order: 0,
    })
    expect(item.tools.length).toBeGreaterThan(0)
    expect(item.levelIndex).toBeGreaterThanOrEqual(1)
    expect(Object.keys(item.skills).length).toBeGreaterThan(0)
  })
})
