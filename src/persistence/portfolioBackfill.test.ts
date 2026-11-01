import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ASSIGNMENTS, getAssignment } from '../content/assignments'
import { CAREERS } from '../content/careers'
import { recordSubmission } from '../game/career'
import { skipToAssignment } from '../game/devTools'
import { gradeAssignment, type GradeResult } from '../game/grading'
import { checkCatalogue, portfolioKey } from '../game/portfolio'
import { buildSolutionContent } from '../game/workbooks'
import { createId } from '../lib/ids'
import { createBackup, importBackup, readBackupFile } from './backup'
import { WorkSimDatabase } from './db'
import { getDocument } from './documentsRepo'
import { findPortfolioItem, loadPortfolioFiles } from './portfolio'
import { backfillPortfolio } from './portfolioBackfill'
import {
  createProfile,
  saveSubmission,
  startAssignment,
  updateProfile,
  type ProfileFields,
} from './profiles'
import type { AnyDocument, Profile, SheetContent } from './schemas'
import { startingWorkState } from './workState'

let database: WorkSimDatabase

async function sha256(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

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

/** Submits the workbook as a Phase 4 save would have: no portfolio capture. */
async function submitWithoutCapture(
  profileId: string,
  documentId: string,
  content: SheetContent,
): Promise<{ profile: Profile; grade: GradeResult }> {
  const stored = (await getDocument(documentId, database))!
  const document = { ...stored, content } as AnyDocument
  const grade = gradeAssignment(assignment, content)
  const now = Date.now()
  const profile = await saveSubmission(
    profileId,
    [document],
    (p, versionId) => recordSubmission(p, assignment, grade, now, versionId).profile,
    database,
  )
  return { profile, grade }
}

async function setUp() {
  const profile = await createProfile(fields, database)
  const { documentId } = await startAssignment(
    profile.id,
    {
      assignmentId: assignment.id,
      assignmentVersion: assignment.version,
      title: 'Supplies order',
      content: buildSolutionContent(assignment),
    },
    database,
  )
  return { profile, documentId }
}

describe('portfolio backfill', () => {
  it('adds passed work from an older save, with the submitted file and check titles', async () => {
    const { profile, documentId } = await setUp()
    const solution = buildSolutionContent(assignment)
    const { grade } = await submitWithoutCapture(profile.id, documentId, solution)
    expect(grade.passed).toBe(true)
    expect(await database.portfolioItems.count()).toBe(0)

    expect(await backfillPortfolio(database)).toBe(1)
    const item = (await findPortfolioItem(
      portfolioKey(profile.id, assignment.id),
      database,
    ))!
    expect(item).toMatchObject({ score: grade.score, title: assignment.title })
    expect(item.checks.map((c) => c.title)).toEqual(grade.checks.map((c) => c.title))
    expect(item.files).toEqual([
      expect.objectContaining({ role: 'main', kind: 'sheet', available: true }),
    ])
    const [file] = await loadPortfolioFiles(item, database)
    expect(file.snapshot.content).toEqual(solution)
  })

  it('is safe to run again: nothing is duplicated or changed', async () => {
    const { profile, documentId } = await setUp()
    await submitWithoutCapture(profile.id, documentId, buildSolutionContent(assignment))
    await backfillPortfolio(database)
    const before = await database.portfolioItems.toArray()
    expect(await backfillPortfolio(database)).toBe(0)
    expect(await database.portfolioItems.toArray()).toEqual(before)
    expect(await database.portfolioFiles.count()).toBe(1)
  })

  it('ignores failed work', async () => {
    const { profile, documentId } = await setUp()
    const empty = { sheets: [{ id: createId(), name: 'Order', cells: {} }] }
    const { grade } = await submitWithoutCapture(profile.id, documentId, empty)
    expect(grade.passed).toBe(false)
    expect(await backfillPortfolio(database)).toBe(0)
  })

  it('ignores tasks skipped with the development shortcut', async () => {
    const profile = await createProfile(fields, database)
    const later = ASSIGNMENTS.filter((a) => a.careerId === assignment.careerId)[3]
    await updateProfile(profile.id, (p) => skipToAssignment(p, later.id), database)
    expect(await backfillPortfolio(database)).toBe(0)
  })

  it('keeps the record when the submitted copy is gone, marked “not available”', async () => {
    const { profile, documentId } = await setUp()
    await submitWithoutCapture(profile.id, documentId, buildSolutionContent(assignment))
    await database.documentVersions.clear()
    expect(await backfillPortfolio(database)).toBe(1)
    const item = (await findPortfolioItem(
      portfolioKey(profile.id, assignment.id),
      database,
    ))!
    expect(item.files).toEqual([
      expect.objectContaining({ role: 'main', available: false, bytes: 0 }),
    ])
    expect(await database.portfolioFiles.count()).toBe(0)
  })

  it('a backup made before the portfolio existed restores, then gets its portfolio', async () => {
    const { profile, documentId } = await setUp()
    await submitWithoutCapture(profile.id, documentId, buildSolutionContent(assignment))
    // A Phase 4 backup: database version 3, no portfolio tables.
    const backup = await createBackup(database)
    delete backup.data.portfolioItems
    delete backup.data.portfolioFiles
    backup.databaseVersion = 3
    backup.checksum = await sha256(JSON.stringify(backup.data))
    await importBackup(await readBackupFile(JSON.stringify(backup)), database)
    expect(await database.portfolioItems.count()).toBe(0)
    expect(await backfillPortfolio(database)).toBe(1)
  })
})

describe('check titles', () => {
  it.each(ASSIGNMENTS.map((a) => [a.id, a] as const))(
    '%s: every check has a title',
    (_, task) => {
      const catalogue = checkCatalogue(task)
      expect(catalogue.size).toBeGreaterThan(0)
      for (const info of catalogue.values()) expect(info.title.length).toBeGreaterThan(0)
    },
  )
})
