import { describe, expect, it } from 'vitest'
import { PACK } from '../content/packs/healthcare'
import type { AssignmentInput } from '../content/schemas'
import { sampleClinical } from '../tools/clinical/data'
import { clinical } from '../tools/clinical/definition'
import { latestVitals } from '../tools/clinical/model'
import { ClinicalStateSchema, type ClinicalState } from '../tools/clinical/schema'
import { EQUIPMENT, poseFor } from '../tools/clinical/bedside'
import { getAction } from './actions'
import { getCase } from './cases'
import { goodCare } from './demo'
import { phaseOf } from './engine'
import {
  activeCase,
  caseAct,
  caseSay,
  caseWait,
  casesOf,
  dashboard,
  finishCase,
  gradeCase,
  graceAssigns,
  KEEP_REPLAYS,
  solvedState,
  startCase,
} from './ward'

const TASKS = PACK.assignments as AssignmentInput[]

const ok = (r: { state: ClinicalState; problems: string[] }) => {
  expect(r.problems).toEqual([])
  return r.state
}

describe('patient cases in Ward Systems', () => {
  it('reads older files with no cases, and keeps them unchanged', () => {
    const old = sampleClinical()
    const parsed = ClinicalStateSchema.parse(JSON.parse(JSON.stringify(old)))
    expect(parsed).toEqual(old)
    expect('cases' in parsed).toBe(false)
    expect(casesOf(parsed)).toEqual({ active: null, attempts: [], assigned: [] })
  })

  it('puts the case patient in the record, and refuses a second case or one above the role', () => {
    let s = ok(
      startCase(sampleClinical(), 'routine-obs', 'beginner', 'healthcare-trainee'),
    )
    expect(s.patients.some((p) => p.name === 'Margaret Ellis' && p.careTeam)).toBe(true)
    expect(s.audit.at(-1)!.action).toBe('Started a patient case')
    expect(
      startCase(s, 'chest-pain', 'advanced', 'healthcare-assistant').problems[0],
    ).toMatch(/Finish or leave/)
    expect(
      startCase(sampleClinical(), 'sepsis-signs', 'advanced', 'healthcare-trainee')
        .problems[0],
    ).toMatch(/senior healthcare assistant/)
    s = ok(finishCase(s, 1, 'abandoned'))
    expect(casesOf(s).active).toBeNull()
  })

  it('writes the bedside into the shared record: chart, notes, laboratory, clock, audit', () => {
    let s = ok(
      startCase(
        { ...sampleClinical(), clock: 600 },
        'confused-fever',
        'intermediate',
        'healthcare-assistant',
      ),
    )
    const pid = getCase('confused-fever')!.patient.id
    s = ok(caseAct(s, 'collect-urine'))
    s = ok(caseAct(s, 'send-specimen'))
    const lab = s.labs.find((l) => l.patientId === pid)!
    expect(lab.status).toBe('received')
    s = ok(caseAct(s, 'full-obs'))
    s = ok(caseAct(s, 'record-obs'))
    const v = latestVitals(s, pid)!
    expect(v.temp).toBe(38.4)
    expect(v.alert).toBe(false)
    expect(v.score).toBeGreaterThanOrEqual(7)
    s = ok(
      caseAct(
        s,
        'tell-nurse',
        'Situation: Edie is newly confused, temperature 38.4, score 8. Please review now.',
      ),
    )
    expect(
      s.notes.some(
        (n) => n.patientId === pid && n.kind === 'escalation' && /38.4/.test(n.text),
      ),
    ).toBe(true)
    s = ok(caseWait(s, 10))
    expect(s.labs.find((l) => l.id === lab.id)!.status).toBe('resulted')
    expect(s.clock).toBeGreaterThan(600)
    expect(s.audit.some((a) => a.action === 'Patient condition changed')).toBe(true)
    expect(
      s.audit.some((a) => a.action === 'Bedside: Take a full set of observations'),
    ).toBe(true)
  })

  it('needs a written note for notes and handovers, and records referrals', () => {
    let s = ok(
      startCase(sampleClinical(), 'breathless', 'advanced', 'healthcare-assistant'),
    )
    expect(caseAct(s, 'write-note', 'short').problems[0]).toMatch(/in full/)
    s = ok(caseAct(s, 'give-oxygen'))
    expect(s.audit.at(-1)!.action).toBe('Asked a qualified colleague')
    expect(activeCase(s)!.enc.referred['give-oxygen']).toBeDefined()
  })

  it('talks to the patient and survives a save and reload mid-case', () => {
    let s = ok(
      startCase(sampleClinical(), 'chest-pain', 'advanced', 'healthcare-assistant'),
    )
    const r = caseSay(s, 'When did the pain start?')
    expect(r.reply).toMatch(/twenty minutes/)
    s = ok(r)
    const reloaded = ClinicalStateSchema.parse(JSON.parse(JSON.stringify(s)))
    expect(reloaded).toEqual(s)
    expect(activeCase(reloaded)!.enc.asked.when).toBe(0)
  })

  it('keeps every attempt, and the full record of the recent ones', () => {
    let s = sampleClinical()
    for (let i = 0; i < KEEP_REPLAYS + 2; i++) {
      s = ok(startCase(s, 'routine-obs', 'beginner', 'healthcare-trainee'))
      s = ok(finishCase(s, 1))
    }
    const attempts = casesOf(s).attempts
    expect(attempts.length).toBe(KEEP_REPLAYS + 2)
    expect(attempts.filter((a) => a.encounter).length).toBe(KEEP_REPLAYS)
    expect(attempts[0].encounter).toBeNull()
    expect(ClinicalStateSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })
})

describe('grading patient-case tasks', () => {
  it('passes only for a passed attempt at that difficulty or harder', () => {
    const s0 = sampleClinical()
    expect(gradeCase(s0, 'routine-obs', 'beginner').fraction).toBe(0)
    let failed = ok(startCase(s0, 'routine-obs', 'beginner', 'healthcare-trainee'))
    failed = ok(finishCase(failed, 1))
    const f = gradeCase(failed, 'routine-obs', 'beginner')
    expect(f.fraction).toBeLessThan(1)
    expect(f.problems.join(' ')).toMatch(/Missed: Take a full set of observations/)
    const passed = solvedState(s0, 'routine-obs', 'intermediate', 'healthcare-trainee')
    expect(gradeCase(passed, 'routine-obs', 'beginner').fraction).toBe(1)
    expect(gradeCase(passed, 'routine-obs', 'advanced').fraction).toBe(0)
  })

  it.each(
    TASKS.filter(
      (a) =>
        a.id.startsWith('ward-') &&
        a.tool?.checks.some((c) => (c as { type: string }).type === 'case'),
    ).map((a) => [a.id, a] as const),
  )('%s: its model answer scores full marks, and its start scores nothing', (_id, a) => {
    const tool = a.tool!
    const full = clinical.grade(tool.checks as never, tool.solution as ClinicalState, {
      start: tool.start as ClinicalState,
      solution: tool.solution as ClinicalState,
    })
    expect(full.every((r) => r.earned === r.points)).toBe(true)
    const none = clinical.grade(tool.checks as never, tool.start as ClinicalState, {
      start: tool.start as ClinicalState,
      solution: tool.solution as ClinicalState,
    })
    expect(none.every((r) => r.earned === 0)).toBe(true)
  })

  it('keeps the healthcare path in order, with the existing tasks unchanged', () => {
    const orders = TASKS.map((a) => a.order).sort((x, y) => x - y)
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    for (const id of [
      'ward-observations',
      'ward-specimens',
      'ward-clinics',
      'ward-medicines',
      'ward-beds',
    ])
      expect(TASKS.some((a) => a.id === id)).toBe(true)
  })
})

describe('Grace and the dashboard', () => {
  it('assigns cases for the weakest area, due in two days, and marks them done on a pass', () => {
    let s = ok(
      startCase(sampleClinical(), 'routine-obs', 'beginner', 'healthcare-trainee'),
    )
    s = ok(finishCase(s, 3))
    s = ok(graceAssigns(s, 'healthcare-trainee', 3))
    const assigned = casesOf(s).assigned
    expect(assigned.length).toBe(2)
    expect(assigned.every((a) => a.due === 5 && a.by === 'Grace Mbeki')).toBe(true)
    expect(graceAssigns(s, 'healthcare-trainee', 3).problems[0]).toMatch(/already/)
    const first = assigned[0]
    const done = solvedState(s, first.caseId, first.difficulty, 'healthcare-trainee', 4)
    expect(
      casesOf(done).assigned.find((a) => a.id === first.id)!.completed,
    ).not.toBeNull()
    const d = dashboard(done, 'healthcare-trainee', 6)
    expect(d.assignments.find((a) => a.id === first.id)!.status).toBe('done')
    expect(d.assignments.find((a) => a.id !== first.id)!.status).toBe('overdue')
  })

  it('shows first, latest and best, the weakest areas and recurring gaps from real attempts', () => {
    let s = sampleClinical()
    for (let i = 0; i < 2; i++) {
      s = ok(startCase(s, 'nil-by-mouth', 'beginner', 'healthcare-trainee'))
      s = ok(caseAct(s, 'offer-drink'))
      s = ok(finishCase(s, 1))
    }
    s = solvedState(s, 'nil-by-mouth', 'beginner', 'healthcare-trainee', 2)
    const d = dashboard(s, 'healthcare-trainee', 2)
    const row = d.rows.find((r) => r.def.id === 'nil-by-mouth')!
    expect(row.count).toBe(3)
    expect(row.first!.passed).toBe(false)
    expect(row.best!.passed).toBe(true)
    expect(row.latest!.id).toBe(row.best!.id)
    expect(d.gaps.map((g) => g.action)).toContain('offer-drink')
    expect(d.weakest.length).toBeGreaterThan(0)
    expect(d.passed).toBe(1)
  })
})

describe('the bedside equipment', () => {
  it('each piece does a real action, and the patient is posed by their condition', () => {
    for (const e of EQUIPMENT) expect(getAction(e.action), e.id).toBeTruthy()
    const fall = getCase('fall-on-ward')!
    expect(poseFor(fall, phaseOf(fall, 'on-floor'))).toBe('floor')
    const clinic = getCase('urine-sample')!
    expect(poseFor(clinic, phaseOf(clinic, 'stable'))).toBe('chair')
    const edie = getCase('confused-fever')!
    expect(poseFor(edie, phaseOf(edie, 'confused'))).toBe('lying')
    expect(goodCare(getCase('breathless')!).ended).not.toBeNull()
  })
})
