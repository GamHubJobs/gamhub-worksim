import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { CAREERS } from '../content/careers'
import { getProject } from '../content/projects'
import { recordSubmission } from '../game/career'
import type { GradeResult } from '../game/grading'
import { decideCapture, portfolioKey, projectKey } from '../game/portfolio'
import { createId } from '../lib/ids'
import { WorkSimDatabase } from './db'
import { getDocument } from './documentsRepo'
import { findPortfolioItem } from './portfolio'
import { backfillPortfolio } from './portfolioBackfill'
import {
  createProfile,
  saveSubmission,
  startAssignment,
  type ProfileFields,
} from './profiles'
import type { AnyDocument } from './schemas'
import { startingWorkState } from './workState'

let database: WorkSimDatabase

beforeEach(() => {
  database = new WorkSimDatabase(`test-${createId()}`)
})

afterEach(async () => {
  database.close()
  await Dexie.delete(database.name)
})

const project = getProject('quarter-close')!
const stages = project.stages.map((id) => getAssignment(id)!)

const fields: ProfileFields = {
  name: 'Alex',
  careerId: project.careerId,
  levelId: project.levelId,
  xp: 5000,
  skills: {},
  assignments: {},
  inbox: [],
  work: startingWorkState(),
}

function grade(score: number): GradeResult {
  return {
    score,
    rating: score >= 90 ? 'excellent' : score >= 70 ? 'pass' : 'fail',
    passed: score >= 70,
    earned: score,
    maxPoints: 100,
    checks: [
      {
        id: 'c',
        title: 'Check',
        why: 'Why',
        hint: '',
        status: score >= 70 ? 'passed' : 'failed',
        earned: score,
        points: 100,
        problems: [],
      },
    ],
  }
}

/** Starts (if needed) and submits a stage with a score, capturing as the app does. */
async function submit(profileId: string, stage: number, score: number, capture = true) {
  const task = stages[stage]
  let profile = (await database.profiles.get(profileId))!
  if (!profile.assignments[task.id]) {
    await startAssignment(
      profileId,
      {
        assignmentId: task.id,
        assignmentVersion: task.version,
        title: task.title,
        content: { sheets: [{ id: createId(), name: 'S', cells: {} }] },
      },
      database,
    )
    profile = (await database.profiles.get(profileId))!
  }
  const document = (await getDocument(profile.assignments[task.id].documentId, database))!
  const result = grade(score)
  const now = Date.now()
  return saveSubmission(
    profileId,
    [document as AnyDocument],
    (p, versionId) => recordSubmission(p, task, result, now, versionId).profile,
    database,
    capture
      ? {
          key: portfolioKey(profileId, task.id),
          projectId: task.projectId,
          decide: (saved, existing) =>
            decideCapture({
              profileId,
              assignment: task,
              grade: result,
              attempts: saved.assignments[task.id].attempts,
              submittedAt: now,
              files: [{ role: 'main', document: document as AnyDocument }],
              existing,
            }),
        }
      : undefined,
  )
}

describe('project records', () => {
  it('appear only when every stage has passed, linking the stages', async () => {
    const profile = await createProfile(fields, database)
    const key = projectKey(profile.id, project.id)
    await submit(profile.id, 0, 90)
    await submit(profile.id, 1, 80)
    expect(await findPortfolioItem(key, database)).toBeUndefined()
    await submit(profile.id, 2, 40)
    expect(await findPortfolioItem(key, database)).toBeUndefined()

    await submit(profile.id, 2, 100)
    const item = (await findPortfolioItem(key, database))!
    expect(item).toMatchObject({
      type: 'project',
      projectId: project.id,
      title: project.title,
      score: 90,
      files: [],
    })
    expect(item.stages!.map((s) => s.score)).toEqual([90, 80, 100])
    for (const stage of item.stages!) {
      const stageItem = await findPortfolioItem(
        portfolioKey(profile.id, stage.assignmentId),
        database,
      )
      expect(stageItem?.id).toBe(stage.itemId)
    }
    expect(item.checks.map((c) => c.title)).toEqual(
      stages.map((s, i) => `Stage ${i + 1}: ${s.title}`),
    )
  })

  it('a better stage later updates the project; one record only', async () => {
    const profile = await createProfile(fields, database)
    for (const [i, score] of [80, 80, 80].entries()) await submit(profile.id, i, score)
    const before = (await findPortfolioItem(
      projectKey(profile.id, project.id),
      database,
    ))!
    await submit(profile.id, 1, 98)
    const after = (await findPortfolioItem(projectKey(profile.id, project.id), database))!
    expect(after.id).toBe(before.id)
    expect(after.score).toBe(86)
    expect(
      await database.portfolioItems.filter((i) => i.type === 'project').count(),
    ).toBe(1)
  })

  it('the backfill builds projects from saves made before projects existed', async () => {
    const profile = await createProfile(fields, database)
    for (const i of [0, 1, 2]) await submit(profile.id, i, 95, false)
    expect(await database.portfolioItems.count()).toBe(0)
    expect(await backfillPortfolio(database)).toBe(4)
    expect(
      await findPortfolioItem(projectKey(profile.id, project.id), database),
    ).toBeDefined()
    expect(await backfillPortfolio(database)).toBe(0)
  })
})

describe('project levels', () => {
  it('the project starts at its career’s top levels', () => {
    const career = CAREERS.find((c) => c.id === project.careerId)!
    expect(career.levels.some((l) => l.id === project.levelId)).toBe(true)
  })
})
