import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { getAssessment } from '../content/assessments'
import { createId } from '../lib/ids'
import { assessmentAtLevel } from './assessments'
import { careerAssignments, newProfileData, type ProfileData } from './career'
import { IT_COMPETENCIES, itCareerComplete, itCompetencies } from './itCompetencies'

/** A profile where these tasks were passed with these check results and hints. */
function passed(
  tasks: Array<{ id: string; failed?: string[]; hints?: number; score?: number }>,
): ProfileData {
  const base = newProfileData('Sam', 0, 'it-support')
  const assignments = Object.fromEntries(
    tasks.map(({ id, failed = [], hints, score = 90 }) => {
      const a = getAssignment(id)!
      const ids = [
        ...a.ticketChecks.map((c) => c.id),
        ...((a.queue?.environment?.network?.checks ?? []) as Array<{ id: string }>).map(
          (c) => c.id,
        ),
        ...((a.queue?.environment?.directory?.checks ?? []) as Array<{ id: string }>).map(
          (c) => c.id,
        ),
        ...((a.queue?.environment?.devices?.checks ?? []) as Array<{ id: string }>).map(
          (c) => c.id,
        ),
        ...((a.queue?.environment?.comms?.checks ?? []) as Array<{ id: string }>).map(
          (c) => c.id,
        ),
        ...((a.queue?.environment?.soc?.checks ?? []) as Array<{ id: string }>).map(
          (c) => c.id,
        ),
      ]
      return [
        id,
        {
          assignmentId: id,
          assignmentVersion: a.version,
          documentId: createId(),
          startedAt: 1,
          completedSteps: [],
          attempts: [
            {
              submittedAt: 2,
              score,
              rating: 'excellent' as const,
              checks: ids.map((c) => ({
                id: c,
                status: failed.includes(c) ? ('failed' as const) : ('passed' as const),
                earned: failed.includes(c) ? 0 : 10,
                points: 10,
                problems: [],
              })),
              xpEarned: 10,
              skillXpEarned: {},
              ...(hints !== undefined ? { hintsUsed: hints } : {}),
            },
          ],
        },
      ]
    }),
  )
  return { ...base, assignments }
}

const level = (p: ProfileData, id: string) =>
  itCompetencies(p).find((c) => c.def.id === id)!

describe('the IT operations competency framework', () => {
  it('has 14 competencies, each shown by tasks and checks that exist', () => {
    expect(IT_COMPETENCIES).toHaveLength(14)
    for (const def of IT_COMPETENCIES)
      for (const source of def.sources) {
        const a = getAssignment(source.task)
        expect(a, `${def.id}: ${source.task}`).toBeDefined()
        const ids = JSON.stringify([a!.ticketChecks, a!.queue?.environment ?? {}])
        for (const check of source.checks ?? [])
          expect(ids, `${def.id}: ${source.task} → ${check}`).toContain(`"id":"${check}"`)
      }
  })

  it('shows nothing before any work is passed', () => {
    expect(
      itCompetencies(newProfileData('Sam', 0, 'it-support')).every(
        (c) => c.level === 'not-yet',
      ),
    ).toBe(true)
  })

  it('counts a task only when the checks that show the competency passed', () => {
    expect(
      level(passed([{ id: 'account-unlock', hints: 0 }]), 'identity-verification').level,
    ).toBe('demonstrated')
    const failed = passed([
      { id: 'account-unlock', failed: ['owen-not-verified'], hints: 0 },
    ])
    expect(level(failed, 'identity-verification').level).toBe('not-yet')
  })

  it('needs two pieces of evidence for practised, and work without hints for proficient', () => {
    const helped = passed([
      { id: 'account-unlock', hints: 2 },
      { id: 'service-desk-comms', hints: 1 },
    ])
    expect(level(helped, 'identity-verification')).toMatchObject({ level: 'practised' })
    const independent = passed([
      { id: 'account-unlock', hints: 0 },
      { id: 'service-desk-comms', hints: 3 },
    ])
    const c = level(independent, 'identity-verification')
    expect(c.level).toBe('proficient')
    expect(c.evidence.map((e) => e.independent)).toEqual([true, false])
  })

  it('does not count a task that was not passed', () => {
    expect(
      level(passed([{ id: 'account-unlock', score: 40 }]), 'identity-verification').level,
    ).toBe('not-yet')
  })
})

describe('career completion and the final assessment', () => {
  const tasks = careerAssignments('it-support').map((a) => a.id)

  it('needs every IT task and the final readiness assessment', () => {
    const all = passed(tasks.map((id) => ({ id })))
    expect(itCareerComplete(all, tasks, false)).toMatchObject({
      complete: false,
      passed: tasks.length,
    })
    expect(itCareerComplete(all, tasks, true).complete).toBe(true)
    const some = passed([{ id: 'triage-queue' }])
    expect(itCareerComplete(some, tasks, true)).toMatchObject({
      complete: false,
      passed: 1,
    })
  })

  it('has a final assessment at the last level, practical in the Help Desk, with correct arithmetic', () => {
    const def = assessmentAtLevel('it-support', 4)!
    expect(def.id).toBe('ready-it-lead')
    for (const version of ['a', 'b']) {
      const v = getAssessment('ready-it-lead', version)!
      const practical = v.steps.find((s) => s.kind === 'practical')!
      expect(['company-outage', 'security-incident']).toContain(
        (practical as { assignmentId: string }).assignmentId,
      )
      const figure = v.steps.find((s) => s.id === 'time-left') as {
        answer: number
        prompt: string
      }
      const [received, now] = [...figure.prompt.matchAll(/(\d{2}):(\d{2})/g)].map(
        (m) => Number(m[1]) * 60 + Number(m[2]),
      )
      expect(figure.answer).toBe(240 - (now - received))
    }
  })
})
