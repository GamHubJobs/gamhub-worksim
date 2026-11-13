/**
 * Ward Systems: what each action does, as pure functions. Each returns the
 * new state and the problems that stopped it (empty when it worked), and
 * every action is written to the audit log, as real hospital systems do.
 *
 * The rules teach safe process (who may see a record, checking identity,
 * allergies, escalation, documentation). They are simplified for learning
 * and are not clinical guidance.
 */
import { LAB_TESTS, MEDICINES } from './data'
import type {
  Appointment,
  ClinicalState,
  LabOrder,
  MedOrder,
  Note,
  Patient,
  Vitals,
} from './schema'

export interface Result {
  state: ClinicalState
  problems: string[]
}

const ok = (state: ClinicalState): Result => ({ state, problems: [] })
const fail = (state: ClinicalState, ...problems: string[]): Result => ({
  state,
  problems,
})

export function clockText(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function log(
  state: ClinicalState,
  action: string,
  patientId: string | null,
  detail = '',
): ClinicalState {
  return {
    ...state,
    audit: [
      ...state.audit,
      { at: clockText(state.clock), action, patientId, detail },
    ].slice(-1000),
  }
}

export const patientById = (state: ClinicalState, id: string): Patient | undefined =>
  state.patients.find((p) => p.id === id)

/** Age in whole years on a date (the ward's date for the simulation). */
export function ageOn(dob: string, on = '2026-03-02'): number {
  const [y, m, d] = dob.split('-').map(Number)
  const [ty, tm, td] = on.split('-').map(Number)
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0)
}

// ---------------------------------------------------------------------------
// The patient record: who may open it
// ---------------------------------------------------------------------------

/**
 * Opens a patient's record. Patients outside the player's care team need a
 * reason (it is logged and reviewed): looking without one is a privacy breach.
 */
export function openRecord(state: ClinicalState, patientId: string, reason = ''): Result {
  const patient = patientById(state, patientId)
  if (!patient) return fail(state, 'There is no patient with that hospital number.')
  if (!patient.careTeam && !reason.trim())
    return fail(
      state,
      `${patient.name} is not under your care. Only open the record if you have a reason to, and give it: it is recorded and checked.`,
    )
  return ok(
    log(
      state,
      'Opened record',
      patientId,
      patient.careTeam ? '' : `Reason: ${reason.trim()}`,
    ),
  )
}

/** Searches by name, hospital number or date of birth. */
export function findPatients(state: ClinicalState, query: string): Patient[] {
  const q = query.trim().toLowerCase()
  if (!q) return state.patients
  return state.patients.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.dob.includes(q),
  )
}

// ---------------------------------------------------------------------------
// Observations and the early-warning score
// ---------------------------------------------------------------------------

export type VitalsInput = Omit<Vitals, 'id' | 'patientId' | 'at' | 'score' | 'by'>

/**
 * A simplified early-warning score for teaching, in the style of the charts
 * hospitals use: each observation outside the usual range adds points.
 */
export function warningScore(v: VitalsInput): { score: number; anyThree: boolean } {
  const parts = [
    v.resp <= 8 ? 3 : v.resp <= 11 ? 1 : v.resp <= 20 ? 0 : v.resp <= 24 ? 2 : 3,
    v.spo2 <= 91 ? 3 : v.spo2 <= 93 ? 2 : v.spo2 <= 95 ? 1 : 0,
    v.temp <= 35 ? 3 : v.temp <= 36 ? 1 : v.temp <= 38 ? 0 : v.temp <= 39 ? 1 : 2,
    v.sys <= 90 ? 3 : v.sys <= 100 ? 2 : v.sys <= 110 ? 1 : v.sys <= 219 ? 0 : 3,
    v.pulse <= 40
      ? 3
      : v.pulse <= 50
        ? 1
        : v.pulse <= 90
          ? 0
          : v.pulse <= 110
            ? 1
            : v.pulse <= 130
              ? 2
              : 3,
    v.alert ? 0 : 3,
  ]
  return { score: parts.reduce((a, b) => a + b, 0), anyThree: parts.includes(3) }
}

/** What the score asks for (the ward's escalation plan, simplified). */
export function escalationFor(
  score: number,
  anyThree: boolean,
): {
  level: 'routine' | 'inform' | 'urgent' | 'emergency'
  action: string
} {
  if (score >= 7)
    return {
      level: 'emergency',
      action:
        'Emergency: call the doctor and the outreach team now, and stay with the patient.',
    }
  if (score >= 5 || anyThree)
    return {
      level: 'urgent',
      action:
        'Urgent: tell the nurse in charge and ask a doctor to review the patient now (use SBAR).',
    }
  if (score >= 1)
    return {
      level: 'inform',
      action:
        'Tell the nurse in charge, and check the observations again within 4 hours.',
    }
  return { level: 'routine', action: 'Routine: next observations as planned.' }
}

export function recordVitals(
  state: ClinicalState,
  patientId: string,
  input: VitalsInput,
): Result {
  const patient = patientById(state, patientId)
  if (!patient) return fail(state, 'There is no patient with that hospital number.')
  if (input.dia >= input.sys)
    return fail(
      state,
      'The lower blood pressure must be below the upper one. Check what you typed.',
    )
  const { score } = warningScore(input)
  const vitals: Vitals = {
    ...input,
    id: `v${state.vitals.length + 1}`,
    patientId,
    at: clockText(state.clock),
    score,
    by: state.user.name,
  }
  return ok(
    log(
      { ...state, vitals: [...state.vitals, vitals] },
      'Recorded observations',
      patientId,
      `Score ${score}`,
    ),
  )
}

export const latestVitals = (
  state: ClinicalState,
  patientId: string,
): Vitals | undefined => state.vitals.filter((v) => v.patientId === patientId).at(-1)

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function addNote(
  state: ClinicalState,
  patientId: string,
  kind: Note['kind'],
  text: string,
  sign = true,
): Result {
  if (!patientById(state, patientId))
    return fail(state, 'There is no patient with that hospital number.')
  if (text.trim().length < 10)
    return fail(
      state,
      'Write the note in full: what you saw, what you did, and what happens next.',
    )
  const note: Note = {
    id: `n${state.notes.length + 1}`,
    patientId,
    kind,
    text: text.trim(),
    at: clockText(state.clock),
    by: state.user.name,
    signed: sign,
  }
  return ok(
    log(
      { ...state, notes: [...state.notes, note] },
      sign ? 'Signed a note' : 'Saved a draft note',
      patientId,
      kind,
    ),
  )
}

/** An escalation in SBAR form: Situation, Background, Assessment, Recommendation. */
export function escalate(
  state: ClinicalState,
  patientId: string,
  to: string,
  sbar: {
    situation: string
    background: string
    assessment: string
    recommendation: string
  },
): Result {
  const missing = (Object.entries(sbar) as Array<[string, string]>)
    .filter(([, v]) => v.trim().length < 3)
    .map(([k]) => k)
  if (!to.trim()) return fail(state, 'Say who you escalated to.')
  if (missing.length)
    return fail(state, `Fill in every part of SBAR. Missing: ${missing.join(', ')}.`)
  const text = [
    `Escalated to: ${to.trim()}`,
    `S: ${sbar.situation.trim()}`,
    `B: ${sbar.background.trim()}`,
    `A: ${sbar.assessment.trim()}`,
    `R: ${sbar.recommendation.trim()}`,
  ].join('\n')
  return addNote(state, patientId, 'escalation', text)
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export function bookAppointment(
  state: ClinicalState,
  input: Omit<Appointment, 'id' | 'status'>,
): Result & { id: string } {
  const id = `a${state.appointments.length + 1}`
  if (!patientById(state, input.patientId))
    return { ...fail(state, 'Choose the patient first.'), id }
  const clash = state.appointments.find(
    (a) =>
      a.clinician === input.clinician &&
      a.date === input.date &&
      a.time === input.time &&
      a.status === 'booked',
  )
  if (clash)
    return {
      ...fail(
        state,
        `${input.clinician} already has a patient at ${input.time} on ${input.date}.`,
      ),
      id,
    }
  const appointment: Appointment = { ...input, id, status: 'booked' }
  return {
    ...ok(
      log(
        { ...state, appointments: [...state.appointments, appointment] },
        'Booked an appointment',
        input.patientId,
        `${input.clinic} ${input.date} ${input.time}`,
      ),
    ),
    id,
  }
}

const NEXT_STATUS: Record<Appointment['status'], Array<Appointment['status']>> = {
  booked: ['arrived', 'cancelled', 'no-show'],
  arrived: ['seen'],
  seen: [],
  cancelled: [],
  'no-show': [],
}

export function setAppointmentStatus(
  state: ClinicalState,
  id: string,
  status: Appointment['status'],
): Result {
  const appointment = state.appointments.find((a) => a.id === id)
  if (!appointment) return fail(state, 'There is no such appointment.')
  if (!NEXT_STATUS[appointment.status].includes(status))
    return fail(
      state,
      `An appointment that is “${appointment.status}” cannot become “${status}”.`,
    )
  return ok(
    log(
      {
        ...state,
        appointments: state.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
      },
      `Appointment ${status}`,
      appointment.patientId,
      `${appointment.clinic} ${appointment.time}`,
    ),
  )
}

// ---------------------------------------------------------------------------
// Laboratory
// ---------------------------------------------------------------------------

const updateLab = (
  state: ClinicalState,
  id: string,
  change: (l: LabOrder) => LabOrder,
) => ({
  ...state,
  labs: state.labs.map((l) => (l.id === id ? change(l) : l)),
})

/**
 * Takes the specimen and labels it at the bedside. The label is written
 * from what the patient says (name and date of birth), as it should be.
 */
export function collectSpecimen(
  state: ClinicalState,
  id: string,
  label: { name: string; dob: string },
): Result {
  const lab = state.labs.find((l) => l.id === id)
  if (!lab) return fail(state, 'There is no such test request.')
  if (lab.status !== 'ordered')
    return fail(state, 'This specimen has already been collected.')
  if (!label.name.trim() || !label.dob.trim())
    return fail(
      state,
      'Label the specimen with the patient’s full name and date of birth.',
    )
  return ok(
    log(
      updateLab(state, id, (l) => ({
        ...l,
        status: 'collected',
        label: { name: label.name.trim(), dob: label.dob.trim() },
      })),
      'Collected a specimen',
      lab.patientId,
      lab.test,
    ),
  )
}

/** Whether a specimen's label matches the patient on the request exactly. */
export function labelMatches(state: ClinicalState, lab: LabOrder): boolean {
  const patient = patientById(state, lab.patientId)
  return (
    !!patient &&
    !!lab.label &&
    lab.label.name.trim().toLowerCase() === patient.name.toLowerCase() &&
    lab.label.dob === patient.dob
  )
}

/** The laboratory receives the specimen: a label that does not match must be rejected. */
export function receiveSpecimen(state: ClinicalState, id: string): Result {
  const lab = state.labs.find((l) => l.id === id)
  if (!lab) return fail(state, 'There is no such test request.')
  if (lab.status !== 'collected')
    return fail(state, 'Only a collected specimen can be received.')
  if (!labelMatches(state, lab))
    return fail(
      state,
      'The label does not match the request (name and date of birth). Reject it: a mislabelled specimen is never tested.',
    )
  return ok(
    log(
      updateLab(state, id, (l) => ({ ...l, status: 'received' })),
      'Received a specimen',
      lab.patientId,
      lab.test,
    ),
  )
}

export function rejectSpecimen(state: ClinicalState, id: string, reason: string): Result {
  const lab = state.labs.find((l) => l.id === id)
  if (!lab) return fail(state, 'There is no such test request.')
  if (lab.status !== 'collected')
    return fail(state, 'Only a collected specimen can be rejected.')
  if (!reason.trim())
    return fail(state, 'Give the reason, so the ward can take a new specimen.')
  return ok(
    log(
      updateLab(state, id, (l) => ({
        ...l,
        status: 'rejected',
        rejectReason: reason.trim(),
      })),
      'Rejected a specimen',
      lab.patientId,
      reason.trim(),
    ),
  )
}

/** A new request for the same test (after a rejection). */
export function repeatRequest(state: ClinicalState, id: string): Result {
  const lab = state.labs.find((l) => l.id === id)
  if (!lab || lab.status !== 'rejected')
    return fail(state, 'Only a rejected specimen needs a new request.')
  const copy: LabOrder = {
    ...lab,
    id: `${lab.id}-R`,
    status: 'ordered',
    label: null,
    rejectReason: '',
    result: null,
    acknowledged: false,
    calledTo: '',
  }
  if (state.labs.some((l) => l.id === copy.id))
    return fail(state, 'A new request has already been made.')
  return ok(
    log(
      { ...state, labs: [...state.labs, copy] },
      'Requested a repeat specimen',
      lab.patientId,
      lab.test,
    ),
  )
}

export function flagFor(test: string, value: number): LabOrder['result'] {
  const range = LAB_TESTS[test]
  if (!range) return null
  const critical =
    (range.criticalLow !== undefined && value <= range.criticalLow) ||
    (range.criticalHigh !== undefined && value >= range.criticalHigh)
  const flag = critical
    ? 'critical'
    : value < range.low
      ? 'low'
      : value > range.high
        ? 'high'
        : 'normal'
  return { value, unit: range.unit, low: range.low, high: range.high, flag }
}

/** The analyser's result is entered (laboratory staff). */
export function enterResult(state: ClinicalState, id: string, value: number): Result {
  const lab = state.labs.find((l) => l.id === id)
  if (!lab) return fail(state, 'There is no such test request.')
  if (lab.status !== 'received')
    return fail(state, 'Results are entered only for a received specimen.')
  const result = flagFor(lab.test, value)
  if (!result) return fail(state, `There is no range for ${lab.test}.`)
  return ok(
    log(
      updateLab(state, id, (l) => ({ ...l, status: 'resulted', result })),
      'Entered a result',
      lab.patientId,
      `${lab.test} ${value} (${result.flag})`,
    ),
  )
}

/** The result is seen and acted on. A critical result must be phoned through to a named person. */
export function acknowledgeResult(
  state: ClinicalState,
  id: string,
  calledTo = '',
): Result {
  const lab = state.labs.find((l) => l.id === id)
  if (!lab?.result) return fail(state, 'There is no result to acknowledge yet.')
  if (lab.result.flag === 'critical' && !calledTo.trim())
    return fail(
      state,
      'A critical result must be phoned through to the doctor responsible straight away: record who you told.',
    )
  return ok(
    log(
      updateLab(state, id, (l) => ({
        ...l,
        acknowledged: true,
        calledTo: calledTo.trim(),
      })),
      'Acknowledged a result',
      lab.patientId,
      calledTo ? `Told ${calledTo.trim()}` : '',
    ),
  )
}

// ---------------------------------------------------------------------------
// Medicines (verification, dispensing, giving)
// ---------------------------------------------------------------------------

/** Safety problems with a prescription: allergy, or the same medicine twice. */
export function medicineAlerts(state: ClinicalState, order: MedOrder): string[] {
  const patient = patientById(state, order.patientId)
  const alerts: string[] = []
  const group = MEDICINES[order.drug]?.group
  if (!group) alerts.push(`${order.drug} is not in the hospital’s list of medicines.`)
  for (const allergy of patient?.allergies ?? []) {
    if (group && allergy.substance === group)
      alerts.push(
        `ALLERGY: ${patient?.name} is allergic to ${allergy.substance} (${allergy.reaction}); ${order.drug} is one.`,
      )
  }
  const duplicate = state.meds.find(
    (m) =>
      m.id !== order.id &&
      m.patientId === order.patientId &&
      m.drug === order.drug &&
      m.status !== 'queried',
  )
  if (duplicate)
    alerts.push(`${order.drug} is already prescribed for this patient (${duplicate.id}).`)
  return alerts
}

const updateMed = (
  state: ClinicalState,
  id: string,
  change: (m: MedOrder) => MedOrder,
) => ({
  ...state,
  meds: state.meds.map((m) => (m.id === id ? change(m) : m)),
})

/** Pharmacy verifies a prescription (it is not checked for you: read the alerts). */
export function verifyMedicine(state: ClinicalState, id: string): Result {
  const order = state.meds.find((m) => m.id === id)
  if (!order) return fail(state, 'There is no such prescription.')
  if (order.status !== 'awaiting-verification')
    return fail(state, 'This prescription is not waiting to be verified.')
  return ok(
    log(
      updateMed(state, id, (m) => ({ ...m, status: 'verified' })),
      'Verified a prescription',
      order.patientId,
      `${order.drug} ${order.dose}`,
    ),
  )
}

/** Sends a prescription back to the prescriber with a question. Nothing is given meanwhile. */
export function queryMedicine(
  state: ClinicalState,
  id: string,
  question: string,
): Result {
  const order = state.meds.find((m) => m.id === id)
  if (!order) return fail(state, 'There is no such prescription.')
  if (question.trim().length < 10)
    return fail(state, 'Explain the problem so the prescriber can act on it.')
  return ok(
    log(
      updateMed(state, id, (m) => ({ ...m, status: 'queried', query: question.trim() })),
      'Queried a prescription',
      order.patientId,
      question.trim(),
    ),
  )
}

export function dispenseMedicine(state: ClinicalState, id: string): Result {
  const order = state.meds.find((m) => m.id === id)
  if (!order) return fail(state, 'There is no such prescription.')
  if (order.status !== 'verified')
    return fail(state, 'Only a verified prescription can be dispensed.')
  return ok(
    log(
      updateMed(state, id, (m) => ({ ...m, status: 'dispensed' })),
      'Dispensed a medicine',
      order.patientId,
      order.drug,
    ),
  )
}

/**
 * Records a dose on the medicines chart. Giving it needs the bedside
 * checks: the patient's identity (asked, and on the wristband) and the
 * allergies. Withholding it needs a reason.
 */
export function recordDose(
  state: ClinicalState,
  id: string,
  outcome: 'given' | 'withheld',
  checks: { identity: boolean; allergies: boolean },
  reason = '',
): Result {
  const order = state.meds.find((m) => m.id === id)
  if (!order) return fail(state, 'There is no such prescription.')
  if (outcome === 'given') {
    if (order.status !== 'dispensed')
      return fail(
        state,
        'This medicine has not been verified and dispensed by pharmacy, so it cannot be given.',
      )
    if (!checks.identity || !checks.allergies)
      return fail(
        state,
        'Before giving any medicine: confirm who the patient is (ask their name and date of birth, check the wristband) and check their allergies.',
      )
  } else if (reason.trim().length < 5) {
    return fail(state, 'Record why the dose was not given.')
  }
  const at = clockText(state.clock)
  return ok(
    log(
      updateMed(state, id, (m) => ({
        ...m,
        administrations: [
          ...m.administrations,
          { at, outcome, reason: reason.trim(), by: state.user.name },
        ],
      })),
      outcome === 'given' ? 'Gave a dose' : 'Withheld a dose',
      order.patientId,
      `${order.drug} ${order.dose}${reason ? `: ${reason.trim()}` : ''}`,
    ),
  )
}

// ---------------------------------------------------------------------------
// Beds, admission and discharge
// ---------------------------------------------------------------------------

export function admitToBed(
  state: ClinicalState,
  patientId: string,
  bedId: string,
): Result {
  const patient = patientById(state, patientId)
  const bed = state.beds.find((b) => b.id === bedId)
  if (!patient || !bed) return fail(state, 'Choose a patient and a bed.')
  if (bed.patientId) return fail(state, `Bed ${bed.id} is taken.`)
  if (!bed.clean)
    return fail(state, `Bed ${bed.id} has not been cleaned since its last patient.`)
  const beds = state.beds.map((b) =>
    b.id === bedId
      ? { ...b, patientId }
      : b.patientId === patientId
        ? { ...b, patientId: null, clean: false }
        : b,
  )
  const patients = state.patients.map((p) =>
    p.id === patientId ? { ...p, status: 'admitted' as const, bed: bedId } : p,
  )
  return ok(
    log(
      { ...state, beds, patients },
      patient.status === 'admitted' ? 'Moved to a bed' : 'Admitted',
      patientId,
      bedId,
    ),
  )
}

export function markBedClean(state: ClinicalState, bedId: string): Result {
  const bed = state.beds.find((b) => b.id === bedId)
  if (!bed) return fail(state, 'There is no such bed.')
  if (bed.patientId) return fail(state, 'The bed is in use.')
  return ok(
    log(
      {
        ...state,
        beds: state.beds.map((b) => (b.id === bedId ? { ...b, clean: true } : b)),
      },
      'Bed cleaned',
      null,
      bedId,
    ),
  )
}

/** Discharge needs a signed discharge summary first, so the next team knows what happened. */
export function discharge(state: ClinicalState, patientId: string): Result {
  const patient = patientById(state, patientId)
  if (!patient || patient.status !== 'admitted')
    return fail(state, 'Only an admitted patient can be discharged.')
  if (
    !state.notes.some(
      (n) => n.patientId === patientId && n.kind === 'discharge' && n.signed,
    )
  )
    return fail(state, 'Write and sign the discharge summary first.')
  const pending = state.meds.filter(
    (m) => m.patientId === patientId && m.status === 'awaiting-verification',
  )
  if (pending.length)
    return fail(
      state,
      'Prescriptions are still waiting for pharmacy. Sort them out before the patient leaves.',
    )
  const beds = state.beds.map((b) =>
    b.patientId === patientId ? { ...b, patientId: null, clean: false } : b,
  )
  const patients = state.patients.map((p) =>
    p.id === patientId ? { ...p, status: 'discharged' as const, bed: null } : p,
  )
  return ok(log({ ...state, beds, patients }, 'Discharged', patientId, patient.bed ?? ''))
}

/** Records opened without a reason for patients outside the care team (privacy breaches). */
export function privacyBreaches(state: ClinicalState): string[] {
  return state.audit
    .filter(
      (a) =>
        a.action === 'Opened record' &&
        a.patientId &&
        !patientById(state, a.patientId)?.careTeam &&
        !a.detail.startsWith('Reason:'),
    )
    .map((a) => a.patientId as string)
}
