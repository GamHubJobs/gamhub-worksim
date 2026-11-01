import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import type { Attempt, PortfolioItem, Profile } from '../persistence/schemas'
import { competencies, experienceRecord, improvementAreas } from './competencies'

let next = 0
function item(skills: Record<string, number>, fields: Partial<PortfolioItem> = {}) {
  next += 1
  return {
    id: `item-${next}`,
    type: 'task',
    title: `Task ${next}`,
    skills,
    score: 90,
    levelIndex: 1,
    levelTitle: 'Intern',
    completedAt: next,
    tools: ['sheets'],
    attempts: [{ submittedAt: next, score: 90 }],
    ...fields,
  } as PortfolioItem
}

const levelOf = (items: PortfolioItem[]) => competencies(items, ['formulas'])[0]

describe('competency levels', () => {
  it('starts at "not yet": no evidence, or only minor use', () => {
    expect(levelOf([]).level).toBe('not-yet')
    expect(levelOf([]).reasons).toEqual(['No passed task has trained this skill yet.'])
    const minor = levelOf([item({ formulas: 10 })])
    expect(minor.level).toBe('not-yet')
    expect(minor.reasons[0]).toMatch(/not yet as a main skill/)
    expect(minor.evidence).toHaveLength(1)
  })

  it('one main task demonstrates; two practise', () => {
    expect(levelOf([item({ formulas: 20 })]).level).toBe('demonstrated')
    const practised = levelOf([item({ formulas: 25 }), item({ formulas: 30 })])
    expect(practised.level).toBe('practised')
    expect(practised.reasons).toContain(
      'For Proficient: 1 more task, a task at level 2 or above.',
    )
  })

  it('proficient needs three tasks, one at level 2 or above, and an 80% average', () => {
    const three = [
      item({ formulas: 25 }),
      item({ formulas: 25 }),
      item({ formulas: 25 }, { levelIndex: 2 }),
    ]
    const proficient = levelOf(three)
    expect(proficient.level).toBe('proficient')
    expect(proficient.reasons[0]).toBe(
      'Shown in 3 passed tasks, average score 90%, including 1 at level 2 or above.',
    )
    // All at level 1: not enough.
    expect(levelOf(three.map((i) => ({ ...i, levelIndex: 1 }))).level).toBe('practised')
    // A low average: not enough.
    const low = levelOf(three.map((i) => ({ ...i, score: 70 })))
    expect(low.level).toBe('practised')
    expect(low.reasons[1]).toContain('an average of 80% or more')
  })

  it('other skills’ work does not count', () => {
    expect(levelOf([item({ bookkeeping: 50 })]).evidence).toEqual([])
  })
})

const assignment = getAssignment('supplies-order')!
const attempt = (score: number, statuses: Array<'passed' | 'partial' | 'failed'>) =>
  ({
    submittedAt: score,
    score,
    rating: score >= assignment.passScore ? 'pass' : 'fail',
    checks: statuses.map((status, i) => ({
      id: assignment.checks[i].id,
      status,
      earned: 0,
      points: 10,
      problems: [],
    })),
    xpEarned: 0,
    skillXpEarned: {},
  }) as Attempt

function profileWith(attempts: Attempt[]): Profile {
  return {
    id: 'p',
    name: 'Alex',
    careerId: assignment.careerId,
    levelId: 'intern',
    assignments: {
      [assignment.id]: {
        assignmentId: assignment.id,
        assignmentVersion: 1,
        documentId: 'd',
        startedAt: 0,
        completedSteps: [],
        attempts,
      },
    },
  } as unknown as Profile
}

describe('improvement areas', () => {
  it('lists the checks not passed in the latest attempt, and tasks to revise', () => {
    const failing = improvementAreas(profileWith([attempt(40, ['passed', 'failed'])]))
    expect(failing).toEqual([
      expect.objectContaining({
        assignmentId: assignment.id,
        needsRevision: true,
        checks: [{ title: assignment.checks[1].title, status: 'failed' }],
      }),
    ])
  })

  it('is empty once the latest attempt passes every check', () => {
    const statuses = assignment.checks.map(() => 'passed' as const)
    expect(
      improvementAreas(profileWith([attempt(40, ['failed']), attempt(100, statuses)])),
    ).toEqual([])
  })
})

describe('experience record', () => {
  it('counts only passed work, and tools used in it', () => {
    const items = [
      item({ formulas: 20 }, { tools: ['sheets', 'docs'], assignmentId: assignment.id }),
      item({ formulas: 20 }, { tools: ['sheets'] }),
    ]
    const record = experienceRecord(items, [])
    expect(record.tasksCompleted).toBe(2)
    expect(record.attempts).toBe(2)
    expect(record.tools).toEqual({ sheets: 2, docs: 1 })
    expect(record.estimatedMinutes).toBe(assignment.estimatedMinutes)
  })
})
