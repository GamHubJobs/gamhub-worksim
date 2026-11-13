import { describe, expect, it } from 'vitest'
import { docContent, h, p } from '../apps/docs/templates'
import { ASSESSMENT_VERSIONS, ASSESSMENTS, VERSION_IDS } from '../content/assessments'
import { CAREERS } from '../content/careers'
import type { Case } from '../content/cases/schema'
import { HOURS } from '../content/workday'
import type { DocContent } from '../persistence/schemas'
import {
  assessmentAtLevel,
  attemptsOf,
  canStart,
  careerAssessments,
  checkAssessments,
  feedbackOf,
  hasPassed,
  openAttempt,
  recordAssessmentResult,
  saveAssessmentAnswer,
  startAssessment,
  versionFor,
} from './assessments'
import { modelAnswers } from './caseModel'
import { newProfileData, promotionProgress, type ProfileData } from './career'
import { gradeCase, NO_AUTHORITY } from './cases'

/** A report that meets every check of a document step. */
function reportFor(def: Case): Record<string, DocContent> {
  const out: Record<string, DocContent> = {}
  for (const step of def.steps) {
    if (step.kind !== 'document') continue
    const blocks = [h(1, step.deliverable.title)]
    for (const check of step.deliverable.checks) {
      if (check.type === 'sections')
        for (const s of check.sections) blocks.push(h(2, s[0]))
      if (check.type === 'figures')
        for (const f of check.figures)
          blocks.push(
            p(`The figure for ${f.label} is ${f.value?.toLocaleString('en-GB')}.`),
          )
      if (check.type === 'mentions')
        blocks.push(p(check.terms.map((t) => t[0]).join('; ')))
    }
    blocks.push(
      p('This short report explains the findings clearly for its readers. '.repeat(10)),
    )
    out[step.id] = docContent(blocks)
  }
  return out
}

/** The practical work done in full (it is graded in its tool; see practical.test.ts). */
const DONE = { practical: { fraction: 1, notes: [] } }

const ALL = Object.entries(ASSESSMENT_VERSIONS).flatMap(([id, versions]) =>
  versions.map((def, i) => ({ id, version: VERSION_IDS[i], def })),
)

const figures = (def: Case) =>
  def.steps.flatMap((s) => (s.kind === 'figure' ? [s.answer] : []))

describe('readiness assessment content', () => {
  it('gives every career an assessment at level 2 and at level 3 (IT also a final one)', () => {
    for (const career of CAREERS) {
      // IT support also ends with a final readiness assessment at its last level.
      expect(careerAssessments(career.id).map((a) => a.minLevel)).toEqual(
        career.id === 'it-support' ? [2, 3, 4] : [2, 3],
      )
      expect(career.levels.length).toBeGreaterThanOrEqual(4)
    }
    expect(ASSESSMENTS).toHaveLength(17)
  })

  it.each(ALL.map((a) => [`${a.id} version ${a.version}`, a] as const))(
    '%s is practical, timed and fully solvable',
    (_, { def }) => {
      expect(def.kind).toBe('assessment')
      expect(def.deadlineHours).toBe(3)
      expect(def.steps.map((s) => s.kind)).toEqual([
        'practical',
        'review',
        'figure',
        'decide',
        'document',
        'reply',
      ])
      expect(def.steps.reduce((sum, s) => sum + s.points, 0)).toBe(100)
      const result = gradeCase(
        def,
        modelAnswers(def, NO_AUTHORITY),
        reportFor(def),
        NO_AUTHORITY,
        true,
        DONE,
      )
      expect(result.steps.filter((s) => s.earned < s.points)).toEqual([])
      expect(result.score).toBe(100)
      // Without the report, it cannot be passed at all.
      expect(
        gradeCase(def, modelAnswers(def, NO_AUTHORITY), {}, NO_AUTHORITY, true, DONE)
          .passed,
      ).toBe(false)
    },
  )

  it('has a second version with different figures, so a retake cannot copy the feedback', () => {
    for (const [id, [a, b]] of Object.entries(ASSESSMENT_VERSIONS)) {
      expect(figures(b), id).not.toEqual(figures(a))
      expect(b.steps.map((s) => [s.id, s.kind, s.points])).toEqual(
        a.steps.map((s) => [s.id, s.kind, s.points]),
      )
      const copied = gradeCase(b, modelAnswers(a, NO_AUTHORITY), reportFor(a))
      expect(copied.score, id).toBeLessThan(100)
    }
  })

  it('never claims to be a qualification', () => {
    const text = JSON.stringify(ASSESSMENTS).toLowerCase()
    for (const word of ['certif', 'qualified', 'accredit', 'diploma'])
      expect(text).not.toContain(word)
  })
})

describe('taking an assessment', () => {
  const id = 'ready-it-practitioner'
  function atLevel2(seed = 0): ProfileData {
    const base = newProfileData('Alex', 1, 'it-support', seed)
    return {
      ...base,
      levelId: 'service-desk-analyst',
      work: { ...base.work, minute: HOURS.start + 60 },
    }
  }

  it('opens at its level, for its career, once at a time', () => {
    const intern = newProfileData('Alex', 1, 'it-support')
    expect(canStart(intern, id, 1)).toEqual({
      ok: false,
      reason: 'This assessment opens when you reach its level.',
    })
    expect(canStart(atLevel2(), 'ready-fa-practitioner', 2).ok).toBe(false)
    const started = startAssessment(atLevel2(), id, 2)
    expect(openAttempt(started, id)).toMatchObject({
      attempt: 1,
      variant: 'a',
      status: 'open',
      due: openAttempt(started, id)!.arrivedAt + 180,
    })
    expect(canStart(started, id, 2).ok).toBe(false)
    expect(startAssessment(started, id, 2)).toBe(started)
  })

  it('is graded on the work handed in, explains strengths and improvements, and allows a retake in the other version', () => {
    let profile = startAssessment(atLevel2(), id, 2)
    const def = ASSESSMENT_VERSIONS[id][0]
    // A weak attempt: only the decision is right.
    profile = saveAssessmentAnswer(profile, id, 'decide', 'rollback')
    const weak = gradeCase(def, openAttempt(profile, id)!.answers)
    expect(weak.passed).toBe(false)
    const feedback = feedbackOf(weak.steps)
    expect(feedback.strengths).toEqual(['The fix'])
    expect(feedback.improvements.map((i) => i.step)).toContain('Write the report')
    profile = recordAssessmentResult(profile, id, weak, 100)
    expect(hasPassed(profile, id)).toBe(false)
    expect(profile.xp).toBe(0)

    // The retake is the other version, and the first attempt is kept.
    profile = startAssessment(profile, id, 2)
    const retake = openAttempt(profile, id)!
    expect(retake).toMatchObject({ attempt: 2, variant: 'b' })
    const second = ASSESSMENT_VERSIONS[id][1]
    const good = gradeCase(
      second,
      modelAnswers(second, NO_AUTHORITY),
      reportFor(second),
      NO_AUTHORITY,
      true,
      DONE,
    )
    profile = recordAssessmentResult(profile, id, good, 200)
    expect(hasPassed(profile, id)).toBe(true)
    expect(attemptsOf(profile, id).map((a) => [a.attempt, a.result?.score])).toEqual([
      [1, weak.score],
      [2, 100],
    ])
    expect(profile.xp).toBe(second.xp)
    expect(canStart(profile, id, 2)).toEqual({
      ok: false,
      reason: 'You have already passed it.',
    })
  })

  it('runs out of time like a deadline, and can then be taken again', () => {
    let profile = startAssessment(atLevel2(), id, 2)
    profile = { ...profile, work: { ...profile.work, minute: profile.work.minute + 181 } }
    const lapsed = checkAssessments(profile)
    expect(attemptsOf(lapsed, id)[0].status).toBe('lapsed')
    expect(lapsed.work.today.log.at(-1)?.text).toContain('You can take it again')
    expect(canStart(lapsed, id, 2).ok).toBe(true)
  })

  it('starts each save on a version chosen by its seed, then alternates', () => {
    expect(versionFor(0, id, 1)).toBe('a')
    expect(versionFor(0, id, 2)).toBe('b')
    expect(versionFor(0, id, 3)).toBe('a')
    const seeds = Array.from({ length: 40 }, (_, i) => versionFor(i + 1, id, 1))
    expect(new Set(seeds)).toEqual(new Set(['a', 'b']))
  })
})

describe('readiness and promotion', () => {
  it('the next promotion from level 2 waits for the level’s assessment', () => {
    for (const career of CAREERS) {
      const base = newProfileData('Alex', 1, career.id)
      const profile: ProfileData = { ...base, levelId: career.levels[1].id }
      const progress = promotionProgress(profile)
      expect(progress.assessment?.id).toBe(assessmentAtLevel(career.id, 2)!.id)
      expect(progress.assessmentMet).toBe(false)
      expect(progress.eligible).toBe(false)
    }
  })

  it('the first level and the top level need no assessment', () => {
    for (const career of CAREERS) {
      const first = newProfileData('Alex', 1, career.id)
      expect(promotionProgress(first).assessment).toBeNull()
      const top = { ...first, levelId: career.levels.at(-1)!.id }
      expect(promotionProgress(top).assessment).toBeNull()
    }
  })
})

describe('after an update changes an assessment', () => {
  it('an attempt started on the old version is closed without marking, and can be started again', () => {
    const base = newProfileData('Alex', 1, 'it-support')
    let profile: ProfileData = {
      ...base,
      levelId: 'service-desk-analyst',
      work: { ...base.work, minute: HOURS.start + 60 },
    }
    profile = startAssessment(profile, 'ready-it-practitioner', 2)
    // As if it had been started before the practical step was added.
    profile = {
      ...profile,
      work: {
        ...profile.work,
        record: {
          ...profile.work.record,
          assessments: profile.work.record.assessments.map((a) => ({ ...a, version: 1 })),
        },
      },
    }
    const checked = checkAssessments(profile)
    const [attempt] = attemptsOf(checked, 'ready-it-practitioner')
    expect(attempt.status).toBe('lapsed')
    expect(attempt.result).toBeUndefined()
    expect(checked.work.today.log.at(-1)?.text).toContain('changed in an update')
    expect(canStart(checked, 'ready-it-practitioner', 2).ok).toBe(true)
  })
})
