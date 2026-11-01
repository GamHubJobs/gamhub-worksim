import { describe, expect, it } from 'vitest'
import type { Assignment } from '../content/schemas'
import type { PortfolioItem, Profile } from '../persistence/schemas'
import { careerAssignments, newProfileData, recordSubmission } from './career'
import type { GradeResult } from './grading'
import { checkCatalogue, decideCapture } from './portfolio'
import { progressReport } from './progressReport'

/** A grade where the first `failing` checks fail and the rest pass. */
function grade(task: Assignment, score: number, failing = 0): GradeResult {
  const checks = [...checkCatalogue(task)].map(([id, info], i) => ({
    id,
    ...info,
    status: i < failing ? ('failed' as const) : ('passed' as const),
    earned: i < failing ? 0 : 10,
    points: 10,
    problems: [],
  }))
  const passed = score >= task.passScore
  return {
    score,
    rating: passed ? 'excellent' : 'fail',
    passed,
    earned: 0,
    maxPoints: 0,
    checks,
  }
}

/** Plays a career: each entry submits the next task with that score. */
function play(careerId: string, scores: number[][]) {
  let profile = { ...newProfileData('Alex', 1, careerId), id: 'p' } as unknown as Profile
  const items: PortfolioItem[] = []
  const tasks = careerAssignments(careerId).sort((a, b) => a.order - b.order)
  let now = 10
  for (const [index, attempts] of scores.entries()) {
    const task = tasks[index]
    profile = {
      ...profile,
      assignments: {
        ...profile.assignments,
        [task.id]: {
          assignmentId: task.id,
          assignmentVersion: task.version,
          documentId: `doc-${index}`,
          startedAt: now,
          completedSteps: [],
          attempts: [],
        },
      },
    }
    for (const score of attempts) {
      now += 1
      const result = grade(task, score, score >= task.passScore ? 0 : 1)
      profile = {
        ...profile,
        ...recordSubmission(profile, task, result, now).profile,
      } as Profile
      const decision = decideCapture({
        profileId: profile.id,
        assignment: task,
        grade: result,
        attempts: profile.assignments[task.id].attempts,
        submittedAt: now,
        files: [],
        existing: items.find((i) => i.assignmentId === task.id),
      })
      if (decision.action === 'evidence') {
        items.push({ ...decision.evidence, id: `item-${index}` } as PortfolioItem)
      }
    }
  }
  return { profile, items, tasks }
}

describe('progress report', () => {
  it('a new career: nothing claimed, and the first task recommended', () => {
    const { profile, tasks } = play('accounting', [])
    const report = progressReport(profile, [])
    expect(report.summary).toMatch(/has not passed a task yet/)
    expect(report.strongest).toEqual([])
    expect(report.competencies.every((c) => c.level === 'not-yet')).toBe(true)
    expect(report.recommendations[0]).toMatchObject({
      title: `Do your next task: “${tasks[0].title}”`,
      action: { kind: 'task', assignmentId: tasks[0].id },
    })
  })

  it('a failed task comes first, naming the checks not passed', () => {
    const { profile, items, tasks } = play('accounting', [[100], [40]])
    const report = progressReport(profile, items)
    const first = report.recommendations[0]
    expect(first.title).toBe(`Resubmit “${tasks[1].title}”`)
    const failedCheck = [...checkCatalogue(tasks[1]).values()][0].title
    expect(first.reason).toContain(failedCheck)
    expect(report.improvements[0]).toMatchObject({ needsRevision: true })
  })

  it('describes only passed work, and every claim links to an item', () => {
    const { profile, items } = play('accounting', [[100], [60, 90]])
    const report = progressReport(profile, items)
    expect(report.summary).toContain('with 2 passed tasks')
    expect(report.experience.tasksCompleted).toBe(2)
    expect(report.experience.attempts).toBe(3)
    const ids = new Set(items.map((i) => i.id))
    for (const skill of report.competencies) {
      for (const e of skill.evidence) expect(ids.has(e.itemId)).toBe(true)
    }
  })

  it('suggests unlocked tools never used in passed work', () => {
    const { profile, items } = play('accounting', [[100]])
    const titles = progressReport(profile, items).recommendations.map((r) => r.title)
    expect(titles).toContain('Get to know Books')
  })

  it('suggests practising a skill shown once, unless the next task trains it', () => {
    const { profile, items } = play('accounting', [[100]])
    const report = progressReport(profile, items)
    const titles = report.recommendations.map((r) => r.title)
    expect(report.recommendations.length).toBeLessThanOrEqual(5)
    // Bookkeeping: the next task trains it, so that recommendation covers it.
    expect(titles[0]).toMatch(/^Do your next task/)
    expect(report.recommendations[0].reason).toContain('Bookkeeping is at “Demonstrated”')
    expect(titles).not.toContain('Practise Bookkeeping')
    const formulas = report.recommendations.find(
      (r) => r.title === 'Practise Spreadsheet formulas',
    )!
    expect(formulas.reason).toBe(
      'It has been shown in 1 passed task. “Reconcile the bank account” trains it (it opens after the tasks before it).',
    )
  })
})
