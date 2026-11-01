import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { CAREERS, getSkill } from '../content/careers'
import { CASES, getCase } from '../content/cases'
import type { Case } from '../content/cases/schema'
import { modelAnswers } from './caseModel'
import { HOURS } from '../content/workday'
import { newProfileData, type ProfileData } from './career'
import {
  answerFor,
  caseContext,
  expectedDecision,
  type CaseContext,
  arriveCase,
  checkCases,
  dueCases,
  gradeCase,
  recordCaseResult,
  readNumber,
} from './cases'

/** A career save of this career, at its first level, during working hours. */
function profileFor(careerId: string, changes: Partial<ProfileData> = {}): ProfileData {
  const base = newProfileData('Alex', 1, careerId)
  return { ...base, work: { ...base.work, minute: HOURS.start + 60 }, ...changes }
}

function passed(profile: ProfileData, assignmentId: string): ProfileData {
  const assignment = getAssignment(assignmentId)!
  return {
    ...profile,
    assignments: {
      ...profile.assignments,
      [assignmentId]: {
        assignmentId,
        assignmentVersion: assignment.version,
        documentId: 'd',
        startedAt: 0,
        completedSteps: [],
        attempts: [
          {
            submittedAt: 1,
            score: 100,
            rating: 'excellent',
            checks: [],
            xpEarned: 0,
            skillXpEarned: {},
          },
        ],
      },
    },
  }
}

describe.each(CASES.map((c) => [c.id, c] as const))('case %s', (_, def) => {
  it('gives the model answers full marks (apart from documents)', () => {
    const result = gradeCase(def, modelAnswers(def))
    const wrong = result.steps.filter(
      (s) =>
        s.earned < s.points && def.steps.find((x) => x.id === s.id)!.kind !== 'document',
    )
    expect(wrong).toEqual([])
  })

  it('cannot be passed without doing anything', () => {
    expect(gradeCase(def, {}).passed).toBe(false)
  })

  it('every decision has exactly one best option', () => {
    for (const step of def.steps) {
      if (step.kind !== 'decide') continue
      expect(step.options.filter((o) => o.verdict === 'best')).toHaveLength(1)
    }
  })
})

describe('case arrival and lapsing', () => {
  const def = getCase('fa-short-delivery')!

  it('arrives only once its trigger has happened, during working hours', () => {
    const fresh = profileFor(def.careerId)
    expect(dueCases(fresh).map((c) => c.id)).not.toContain(def.id)
    const ready = passed(fresh, 'invoice-check')
    expect(dueCases(ready).map((c) => c.id)).toContain(def.id)

    const evening = { ...ready, work: { ...ready.work, minute: HOURS.end + 30 } }
    expect(checkCases(evening).work.cases[def.id]).toBeUndefined()

    const arrived = checkCases(ready, 1000)
    expect(arrived.work.cases[def.id]).toMatchObject({ status: 'open', answers: {} })
    expect(arrived.inbox.at(-1)).toMatchObject({ kind: 'case', caseId: def.id })
    // Not twice.
    expect(checkCases(arrived).inbox.filter((m) => m.caseId === def.id)).toHaveLength(1)
  })

  it('lapses after its deadline, with its explained consequence', () => {
    const arrived = arriveCase(passed(profileFor(def.careerId), 'invoice-check'), def, 1)
    const late = {
      ...arrived,
      work: { ...arrived.work, minute: arrived.work.minute + def.deadlineHours * 60 + 1 },
    }
    const lapsed = checkCases(late)
    expect(lapsed.work.cases[def.id].status).toBe('lapsed')
    expect(lapsed.work.org.indicators.satisfaction).toBeLessThan(
      arrived.work.org.indicators.satisfaction,
    )
    expect(lapsed.work.today.log.at(-1)?.text).toContain('on hold')
  })

  it('no more than two cases are open at once', () => {
    let profile = profileFor(def.careerId)
    for (const id of ['a-one', 'a-two']) {
      profile = arriveCase(profile, { ...def, id } as Case, 1)
    }
    profile = passed(profile, 'invoice-check')
    expect(checkCases(profile).work.cases[def.id]).toBeUndefined()
  })
})

describe('grading and consequences', () => {
  const def = getCase('fa-short-delivery')!

  it('explains a poor decision and shows the best one', () => {
    const answers = { ...modelAnswers(def), action: 'pay-full' }
    const step = gradeCase(def, answers).steps.find((s) => s.id === 'action')!
    expect(step.earned).toBe(0)
    expect(step.notes[0]).toContain('You chose')
    expect(step.notes[1]).toContain('The best choice')
  })

  it('reads numbers as people type them', () => {
    expect(readNumber('£1,250.50')).toBe(1250.5)
    expect(readNumber('12.5%')).toBe(12.5)
    expect(readNumber('about 300')).toBeNull()
  })

  it('ignores answers of the wrong shape', () => {
    expect(answerFor('approve', 'yes')).toBeUndefined()
    expect(gradeCase(def, { match: 'toner-short' }).steps[0].earned).toBe(15)
  })

  it('records the result, the decision’s effects, the reply and the reward', () => {
    const arrived = arriveCase(passed(profileFor(def.careerId), 'invoice-check'), def, 1)
    const withAnswers = {
      ...arrived,
      work: {
        ...arrived.work,
        cases: {
          ...arrived.work.cases,
          [def.id]: { ...arrived.work.cases[def.id], answers: modelAnswers(def) },
        },
      },
    }
    const result = gradeCase(def, modelAnswers(def))
    const done = recordCaseResult(withAnswers, def, result, 5000)
    expect(done.work.cases[def.id]).toMatchObject({
      status: 'submitted',
      result: { score: 100, rating: 'excellent' },
    })
    // The chosen option (+2 satisfaction) and the pass outcome (+2 discipline).
    expect(done.work.org.indicators.satisfaction).toBe(72)
    expect(done.work.org.indicators.discipline).toBe(72)
    expect(done.xp).toBe(arrived.xp + def.xp)
    const reply = done.inbox.at(-1)!
    expect(reply.subject).toBe(`Re: ${def.email.subject}`)
    expect(reply.body).toContain('Dear Alex')
    expect(() => recordCaseResult(done, def, result, 6000)).toThrow('not open')
  })
})

describe('case content', () => {
  it('ids are unique, triggers and skills exist, and every career has cases', () => {
    const ids = CASES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const def of CASES) {
      const career = CAREERS.find((c) => c.id === def.careerId)
      expect(career, def.id).toBeDefined()
      expect(def.minLevel).toBeLessThanOrEqual(career!.levels.length)
      if (def.trigger.afterAssignment) {
        expect(getAssignment(def.trigger.afterAssignment)?.careerId, def.id).toBe(
          def.careerId,
        )
      }
      if (def.trigger.afterCase)
        expect(getCase(def.trigger.afterCase), def.id).toBeDefined()
      for (const skill of Object.keys(def.skills))
        expect(getSkill(skill), skill).toBeDefined()
    }
    for (const career of CAREERS) {
      expect(
        CASES.filter((c) => c.careerId === career.id).length,
        career.id,
      ).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('approvals: policy, authority and budgets', () => {
  const def = getCase('ops-fa-purchases')!
  const step = def.steps.find((s) => s.kind === 'approve')!
  if (step.kind !== 'approve') throw new Error('no approve step')
  const request = (id: string) => step.requests.find((r) => r.id === id)!
  const at = (limit: number, remaining = 100_000): CaseContext => ({
    limit,
    remaining: () => remaining,
  })

  it('rejects policy breaches, escalates above the limit or budget, approves the rest', () => {
    expect(expectedDecision(request('wine'), at(10_000)).decision).toBe('reject')
    expect(expectedDecision(request('printer'), at(500)).decision).toBe('escalate')
    expect(expectedDecision(request('printer'), at(2500)).decision).toBe('approve')
    expect(expectedDecision(request('printer'), at(2500, 1000))).toMatchObject({
      decision: 'escalate',
      why: expect.stringContaining('left this quarter'),
    })
    expect(expectedDecision(request('stationery'), at(500)).decision).toBe('approve')
  })

  it('the player’s level sets their limit: interns approve nothing', () => {
    const base = profileFor(def.careerId)
    expect(caseContext(base).limit).toBe(0)
    expect(caseContext({ ...base, levelId: 'junior' }).limit).toBe(500)
    expect(caseContext({ ...base, levelId: 'assistant' }).limit).toBe(2500)
  })

  it('every operations case needs all three kinds of decision at its first level', () => {
    for (const ops of CASES.filter((c) => c.kind === 'operations')) {
      const career = CAREERS.find((c) => c.id === ops.careerId)!
      const profile = profileFor(ops.careerId, {
        levelId: career.levels[ops.minLevel - 1].id,
      })
      const kinds = new Set(
        ops.steps.flatMap((s) =>
          s.kind === 'approve'
            ? s.requests.map((r) => expectedDecision(r, caseContext(profile)).decision)
            : [],
        ),
      )
      expect([...kinds].sort(), ops.id).toEqual(['approve', 'escalate', 'reject'])
    }
  })

  it('approvals commit spending; approving against policy raises risk', () => {
    const junior = profileFor(def.careerId, { levelId: 'junior' })
    const arrived = arriveCase(junior, def, 1)
    const answers = {
      ...modelAnswers(def, caseContext(junior)),
      decisions: {
        ...(modelAnswers(def, caseContext(junior)).decisions as object),
        wine: 'approve',
      },
    }
    const withAnswers = {
      ...arrived,
      work: {
        ...arrived.work,
        cases: {
          ...arrived.work.cases,
          [def.id]: { ...arrived.work.cases[def.id], answers },
        },
      },
    }
    const result = gradeCase(def, answers, {}, caseContext(withAnswers))
    expect(result.steps[0].notes[0]).toContain('alcohol')
    const done = recordCaseResult(withAnswers, def, result, 10)
    expect(done.work.org.spend).toMatchObject({
      finance: 180,
      people: 420,
      operations: 350,
    })
    expect(done.work.org.indicators.risk).toBeGreaterThan(
      arrived.work.org.indicators.risk,
    )
    // The finance budget left is what was not committed, minus what was approved.
    expect(caseContext(done).remaining('finance')).toBe(18000 * 0.2 - 180)
  })
})
