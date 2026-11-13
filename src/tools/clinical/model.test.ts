import { describe, expect, it } from 'vitest'
import { sampleClinical } from './data'
import {
  acknowledgeResult,
  addNote,
  admitToBed,
  bookAppointment,
  collectSpecimen,
  discharge,
  enterResult,
  escalate,
  escalationFor,
  markBedClean,
  medicineAlerts,
  openRecord,
  privacyBreaches,
  queryMedicine,
  receiveSpecimen,
  recordDose,
  recordVitals,
  rejectSpecimen,
  setAppointmentStatus,
  verifyMedicine,
  warningScore,
} from './model'
import { ClinicalStateSchema, type ClinicalState, type MedOrder } from './schema'

const start = () => sampleClinical()
const normal = {
  resp: 16,
  spo2: 97,
  temp: 36.8,
  sys: 124,
  dia: 78,
  pulse: 72,
  alert: true,
}

describe('Ward Systems', () => {
  it('has valid, fictional practice data', () => {
    expect(() => ClinicalStateSchema.parse(start())).not.toThrow()
  })

  it('needs a reason to open the record of a patient outside your care', () => {
    const s = start()
    expect(openRecord(s, 'RCH-104233').problems).toEqual([])
    expect(openRecord(s, 'RCH-101777').problems[0]).toMatch(/not under your care/)
    const withReason = openRecord(s, 'RCH-101777', 'Asked to cover Ward 3 at lunch')
    expect(withReason.problems).toEqual([])
    expect(privacyBreaches(withReason.state)).toEqual([])
  })

  it('scores observations and says when to escalate', () => {
    expect(warningScore(normal).score).toBe(0)
    const unwell = {
      resp: 25,
      spo2: 91,
      temp: 39.4,
      sys: 98,
      dia: 60,
      pulse: 118,
      alert: true,
    }
    const { score, anyThree } = warningScore(unwell)
    expect(score).toBe(3 + 3 + 2 + 2 + 2)
    expect(escalationFor(score, anyThree).level).toBe('emergency')
    expect(escalationFor(1, false).level).toBe('inform')
    expect(escalationFor(3, true).level).toBe('urgent')
    const r = recordVitals(start(), 'RCH-104233', unwell)
    expect(r.state.vitals.at(-1)?.score).toBe(12)
    expect(
      recordVitals(start(), 'RCH-104233', { ...normal, dia: 130 }).problems,
    ).toHaveLength(1)
  })

  it('escalates in SBAR form, every part filled in', () => {
    const missing = escalate(start(), 'RCH-104233', 'Dr Moreau', {
      situation: 'Score 7',
      background: '',
      assessment: 'Getting worse',
      recommendation: 'Review now',
    })
    expect(missing.problems[0]).toMatch(/background/)
    const done = escalate(start(), 'RCH-104233', 'Dr Moreau', {
      situation: 'Score 7, breathing fast',
      background: 'Chest infection, day 2',
      assessment: 'Getting worse',
      recommendation: 'Please review now',
    })
    expect(done.state.notes.at(-1)?.kind).toBe('escalation')
  })

  it('books appointments without double-booking, and moves them on in order', () => {
    const clash = bookAppointment(start(), {
      patientId: 'RCH-106731',
      clinic: 'Diabetes clinic',
      clinician: 'Dr Hana Ito',
      date: '2026-03-02',
      time: '09:30',
    })
    expect(clash.problems[0]).toMatch(/already has a patient/)
    expect(setAppointmentStatus(start(), 'a1', 'seen').problems).toHaveLength(1)
    const arrived = setAppointmentStatus(start(), 'a1', 'arrived')
    expect(setAppointmentStatus(arrived.state, 'a1', 'seen').problems).toEqual([])
  })

  it('never tests a mislabelled specimen, and phones critical results through', () => {
    let s = collectSpecimen(start(), 'L-5001', {
      name: 'George Whitfield',
      dob: '1937-10-30',
    }).state
    expect(receiveSpecimen(s, 'L-5001').problems[0]).toMatch(/does not match/)
    s = rejectSpecimen(s, 'L-5001', 'Date of birth on the label is wrong').state
    expect(s.labs[0].status).toBe('rejected')

    s = collectSpecimen(start(), 'L-5001', {
      name: 'George Whitfield',
      dob: '1937-01-30',
    }).state
    s = receiveSpecimen(s, 'L-5001').state
    s = enterResult(s, 'L-5001', 6.8).state
    expect(s.labs[0].result?.flag).toBe('critical')
    expect(acknowledgeResult(s, 'L-5001').problems[0]).toMatch(/phoned through/)
    expect(acknowledgeResult(s, 'L-5001', 'Dr Moreau').state.labs[0].calledTo).toBe(
      'Dr Moreau',
    )
  })

  it('shows allergy and duplicate alerts, and only gives checked, dispensed medicines', () => {
    const s: ClinicalState = start()
    const order: MedOrder = {
      id: 'M-400',
      patientId: 'RCH-104233',
      drug: 'Amoxivan',
      dose: '500 mg',
      route: 'By mouth',
      frequency: 'Three times a day',
      due: '12:00',
      prescriber: 'Dr Felix Moreau',
      status: 'awaiting-verification',
      query: '',
      administrations: [],
    }
    const withOrder = { ...s, meds: [...s.meds, order] }
    expect(medicineAlerts(withOrder, order)[0]).toMatch(/ALLERGY/)
    const queried = queryMedicine(
      withOrder,
      'M-400',
      'Patient is allergic to penicillins; please choose another antibiotic.',
    )
    expect(queried.state.meds.at(-1)?.status).toBe('queried')
    expect(
      recordDose(queried.state, 'M-400', 'given', { identity: true, allergies: true })
        .problems,
    ).toHaveLength(1)

    expect(
      recordDose(s, 'M-302', 'given', { identity: false, allergies: true }).problems[0],
    ).toMatch(/confirm who the patient is/)
    expect(
      recordDose(s, 'M-302', 'given', { identity: true, allergies: true }).problems,
    ).toEqual([])
    expect(
      recordDose(s, 'M-302', 'withheld', { identity: true, allergies: true }).problems,
    ).toHaveLength(1)
    expect(verifyMedicine(withOrder, 'M-400').state.meds.at(-1)?.status).toBe('verified')
  })

  it('admits only to a clean, empty bed, and discharges with a signed summary', () => {
    let s = start()
    expect(admitToBed(s, 'RCH-106731', '4A-6').problems[0]).toMatch(/not been cleaned/)
    s = markBedClean(s, '4A-6').state
    s = admitToBed(s, 'RCH-106731', '4A-6').state
    expect(s.patients.find((p) => p.id === 'RCH-106731')?.bed).toBe('4A-6')

    expect(discharge(s, 'RCH-104871').problems[0]).toMatch(/discharge summary/)
    s = addNote(
      s,
      'RCH-104871',
      'discharge',
      'Knee healing well; walking with crutches. GP to remove stitches in 10 days.',
    ).state
    s = discharge(s, 'RCH-104871').state
    expect(s.beds.find((b) => b.id === '4A-2')).toMatchObject({
      patientId: null,
      clean: false,
    })
  })
})

describe('Ward Systems grading', () => {
  it('passes safe work and catches unsafe work', async () => {
    const { clinical } = await import('./definition')
    const base = { title: 't', why: 'w', hint: 'h', points: 10 }
    const checks = clinical.check.array().parse([
      { ...base, id: 'privacy', type: 'privacy' },
      { ...base, id: 'safe', type: 'no-unsafe-medicine' },
      { ...base, id: 'obs', type: 'observations', patient: 'RCH-104233', minScore: 5 },
    ])
    let s = start()
    s = openRecord(s, 'RCH-101777', '').state // refused, so not logged
    s = recordVitals(s, 'RCH-104233', {
      resp: 25,
      spo2: 92,
      temp: 38.6,
      sys: 104,
      dia: 66,
      pulse: 112,
      alert: true,
    }).state
    const good = clinical.grade(checks, s, { start: start(), solution: s })
    expect(good.map((r) => r.status)).toEqual(['passed', 'passed', 'passed'])

    const breach = {
      ...s,
      audit: [
        ...s.audit,
        { at: '08:10', action: 'Opened record', patientId: 'RCH-101777', detail: '' },
      ],
    }
    expect(
      clinical.grade(checks, breach, { start: start(), solution: s })[0].status,
    ).toBe('failed')
  })
})
