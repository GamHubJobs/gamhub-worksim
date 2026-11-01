import { describe, expect, it } from 'vitest'
import { CAREERS } from '../content/careers'
import { getCase } from '../content/cases'
import { HOURS } from '../content/workday'
import { modelAnswers } from './caseModel'
import {
  advanceCareer,
  careerAssignments,
  newProfileData,
  type ProfileData,
} from './career'
import { careerRecord, type RecordSection } from './careerRecord'
import { arriveCase, caseContext, gradeCase, recordCaseResult } from './cases'
import { skipToAssignment } from './devTools'

function profileFor(careerId: string): ProfileData {
  const base = newProfileData('Alex', 1, careerId)
  return { ...base, work: { ...base.work, minute: HOURS.start + 60 } }
}

/** Brings a case and submits the model answers (or the answers given). */
function complete(
  profile: ProfileData,
  caseId: string,
  submittedAt = 5000,
  change: (answers: Record<string, unknown>) => Record<string, unknown> = (a) => a,
): ProfileData {
  const def = getCase(caseId)!
  const arrived = arriveCase(profile, def, 1)
  const answers = change(modelAnswers(def, caseContext(arrived)))
  const withAnswers: ProfileData = {
    ...arrived,
    work: {
      ...arrived.work,
      cases: {
        ...arrived.work.cases,
        [def.id]: { ...arrived.work.cases[def.id]!, answers },
      },
    },
  }
  const result = gradeCase(def, answers, {}, caseContext(withAnswers))
  return recordCaseResult(withAnswers, def, result, submittedAt)
}

const stat = (section: RecordSection | undefined, label: string) =>
  section?.stats.find((s) => s.label === label)

describe('the career-wide performance record', () => {
  it('starts empty, with every figure explained', () => {
    const record = careerRecord(profileFor('accounting'))
    expect(record.sections.map((s) => s.id)).toEqual([
      'customers',
      'budgets',
      'incidents',
      'meetings',
      'handoffs',
      'leadership',
      'relationships',
      'progression',
    ])
    for (const section of record.sections)
      for (const s of section.stats) expect(s.source.length).toBeGreaterThan(10)
    const customers = record.sections.find((s) => s.id === 'customers')
    expect(stat(customers, 'Customer cases handled')?.value).toBe('0')
    expect(stat(customers, 'Client satisfaction')?.value).toBe('70')
    expect(record.periods).toHaveLength(1)
    expect(record.periods[0]).toMatchObject({ fromDay: 1, tasksPassed: 0 })
    const leadership = record.sections.find((s) => s.id === 'leadership')
    expect(leadership?.stats[0].source).toMatch(/^Leading a team starts at /)
  })

  it('counts customer cases and their scores', () => {
    const done = complete(profileFor('office-admin-finance'), 'fa-short-delivery')
    const customers = careerRecord(done).sections.find((s) => s.id === 'customers')
    expect(stat(customers, 'Customer cases handled')?.value).toBe('1')
    expect(stat(customers, 'Average score')?.value).toBe('100%')
  })

  it('totals the approval decisions from the answers given', () => {
    const def = getCase('ops-fa-purchases')!
    const step = def.steps.find((s) => s.kind === 'approve')!
    const levelled = skipToAssignment(profileFor(def.careerId), 'savings-proposal')
    const done = complete(levelled, def.id)
    const budgets = careerRecord(done).sections.find((s) => s.id === 'budgets')
    const decisions = done.work.cases[def.id]!.answers[step.id] as Record<string, string>
    const approved =
      step.kind === 'approve'
        ? step.requests
            .filter((r) => decisions[r.id] === 'approve')
            .reduce((sum, r) => sum + r.amount, 0)
        : 0
    expect(stat(budgets, 'Requests decided')?.value).toBe(
      String(Object.keys(decisions).length),
    )
    expect(stat(budgets, 'Value you approved')?.value).toBe(
      `£${approved.toLocaleString('en-GB')}`,
    )
    expect(stat(budgets, 'Decisions within policy and authority')?.value).toBe('100%')
    expect(stat(budgets, 'Your spending limit')?.value).not.toBe('None yet')
  })

  it('counts hand-offs right first time, and follow-ups when they were not', () => {
    const def = getCase('wf-fa-purchase-order')!
    const handoff = def.steps.find((s) => s.kind === 'handoff')!
    const right = complete(profileFor(def.careerId), def.id)
    let section = careerRecord(right).sections.find((s) => s.id === 'handoffs')
    expect(stat(section, 'Right first time')?.value).toBe('1 of 1')
    const wrong = complete(profileFor(def.careerId), def.id, 5000, (answers) => ({
      ...answers,
      [handoff.id]: {},
    }))
    section = careerRecord(wrong).sections.find((s) => s.id === 'handoffs')
    expect(stat(section, 'Right first time')?.value).toBe('0 of 1')
  })

  it('records promotions with the day, and keeps each level’s work in its own period', () => {
    const career = CAREERS.find((c) => c.id === 'office-admin-finance')!
    let profile = profileFor(career.id)
    profile = { ...profile, work: { ...profile.work, day: 3 } }
    // Pass the first level's tasks (at time 1000), with enough XP for promotion.
    const firstLevel = careerAssignments(career.id).filter(
      (a) => a.levelId === career.levels[0].id,
    )
    for (const a of firstLevel) {
      profile = {
        ...profile,
        xp: profile.xp + a.xp,
        assignments: {
          ...profile.assignments,
          [a.id]: {
            assignmentId: a.id,
            assignmentVersion: a.version,
            documentId: '00000000-0000-4000-8000-000000000000',
            startedAt: 900,
            completedSteps: [],
            attempts: [
              {
                submittedAt: 1000,
                score: 90,
                rating: 'excellent',
                checks: [],
                xpEarned: a.xp,
                skillXpEarned: {},
              },
            ],
          },
        },
      }
    }
    const promoted = advanceCareer(profile, 2000).profile
    expect(promoted.levelId).toBe(career.levels[1].id)
    expect(promoted.work.record.promotions).toEqual([
      { levelId: career.levels[1].id, day: 3, at: 2000, xp: promoted.xp },
    ])
    const later = complete(promoted, 'fa-short-delivery', 3000)
    const periods = careerRecord(later).periods
    expect(periods.map((p) => [p.tasksPassed, p.casesSubmitted])).toEqual([
      [firstLevel.length, 0],
      [0, 1],
    ])
    expect(periods[0].averageTaskScore).toBe(90)
    expect(periods[1]).toMatchObject({ fromDay: 3, averageCaseScore: 100 })
  })

  it('works the same way in every career', () => {
    for (const career of CAREERS) {
      const record = careerRecord(profileFor(career.id))
      expect(record.sections).toHaveLength(8)
      expect(record.sections.find((s) => s.id === 'budgets')!.stats).toHaveLength(5)
    }
  })
})
