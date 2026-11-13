/** Ward Systems: its registration with the tools framework (checks, grading, guide). */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { sampleClinical } from './data'
import { latestVitals, medicineAlerts, patientById, privacyBreaches } from './model'
import { ClinicalStateSchema, type ClinicalState } from './schema'

const Mentions = z.array(z.array(z.string()).min(1)).default([])

export const ClinicalCheckSchema = z.discriminatedUnion('type', [
  /** No record was opened without a reason for a patient outside the care team. */
  FileCheckBaseSchema.extend({ type: z.literal('privacy') }),
  /** Observations were recorded for a patient (with a score at least this high, if given). */
  FileCheckBaseSchema.extend({
    type: z.literal('observations'),
    patient: z.string(),
    minScore: z.number().int().optional(),
  }),
  /** A note of this kind was signed for the patient, mentioning each group of words (any one of each). */
  FileCheckBaseSchema.extend({
    type: z.literal('note'),
    patient: z.string(),
    kind: z.enum(['nursing', 'handover', 'escalation', 'admission', 'discharge', 'call']),
    mentions: Mentions,
  }),
  /** A prescription ended in this state, with these doses recorded. */
  FileCheckBaseSchema.extend({
    type: z.literal('medicine'),
    order: z.string(),
    status: z
      .enum(['awaiting-verification', 'verified', 'queried', 'dispensed'])
      .optional(),
    /** 'none' = no dose may be recorded as given. */
    dose: z.enum(['given', 'withheld', 'none']).optional(),
    /** Words the query must contain (any of each group). */
    queryMentions: Mentions,
  }),
  /** A laboratory request ended in this state. */
  FileCheckBaseSchema.extend({
    type: z.literal('lab'),
    order: z.string(),
    status: z
      .enum(['ordered', 'collected', 'received', 'resulted', 'rejected'])
      .optional(),
    acknowledged: z.boolean().optional(),
    /** The critical result was phoned to someone whose name contains this. */
    calledTo: z.string().optional(),
    /** A repeat request was made after the rejection. */
    repeated: z.boolean().optional(),
  }),
  /** An appointment ended in this state (by patient and clinic, or by ID). */
  FileCheckBaseSchema.extend({
    type: z.literal('appointment'),
    patient: z.string(),
    clinic: z.string().optional(),
    status: z.enum(['booked', 'arrived', 'seen', 'cancelled', 'no-show']),
    clinician: z.string().optional(),
  }),
  /** A patient is admitted to a bed (any bed on the ward if none given), or discharged. */
  FileCheckBaseSchema.extend({
    type: z.literal('patient'),
    patient: z.string(),
    status: z.enum(['outpatient', 'admitted', 'discharged']),
    bed: z.string().optional(),
  }),
  /** No medicine with a safety alert was verified, dispensed or given. */
  FileCheckBaseSchema.extend({ type: z.literal('no-unsafe-medicine') }),
])

export type ClinicalCheck = z.infer<typeof ClinicalCheckSchema>

const has = (text: string, groups: string[][]) =>
  groups.filter(
    (words) => !words.some((w) => text.toLowerCase().includes(w.toLowerCase())),
  )

function gradeCheck(check: ClinicalCheck, s: ClinicalState) {
  switch (check.type) {
    case 'privacy': {
      const breaches = privacyBreaches(s)
      return checkResult(
        check,
        breaches.length ? 0 : 1,
        breaches.map(
          (id) =>
            `The record of ${patientById(s, id)?.name ?? id} was opened without a reason.`,
        ),
      )
    }
    case 'observations': {
      const v = latestVitals(s, check.patient)
      const name = patientById(s, check.patient)?.name ?? check.patient
      if (!v || v.by === 'Night staff')
        return checkResult(check, 0, [`No new observations were recorded for ${name}.`])
      if (check.minScore !== undefined && v.score < check.minScore)
        return checkResult(check, 0.5, [
          `${name}’s observations give a score of ${v.score}; check the numbers you entered.`,
        ])
      return checkResult(check, 1, [])
    }
    case 'note': {
      const name = patientById(s, check.patient)?.name ?? check.patient
      const notes = s.notes.filter(
        (n) =>
          n.patientId === check.patient &&
          n.kind === check.kind &&
          n.by !== 'Night staff',
      )
      if (!notes.length)
        return checkResult(check, 0, [`There is no ${check.kind} note for ${name}.`])
      const signed = notes.filter((n) => n.signed)
      if (!signed.length)
        return checkResult(check, 0.5, [
          'The note was saved as a draft but never signed.',
        ])
      const best = signed
        .map((n) => has(n.text, check.mentions))
        .sort((a, b) => a.length - b.length)[0]
      const fraction = check.mentions.length ? 1 - best.length / check.mentions.length : 1
      return checkResult(
        check,
        fraction,
        best.map((words) => `The note does not mention ${words[0]}.`),
      )
    }
    case 'medicine': {
      const order = s.meds.find((m) => m.id === check.order)
      if (!order)
        return checkResult(check, 0, [`Prescription ${check.order} is missing.`])
      const problems: string[] = []
      if (check.status && order.status !== check.status)
        problems.push(
          `${order.drug} (${order.id}) is “${order.status}”, not “${check.status}”.`,
        )
      const last = order.administrations.at(-1)
      if (
        check.dose === 'none' &&
        order.administrations.some((a) => a.outcome === 'given')
      )
        problems.push(
          `A dose of ${order.drug} was recorded as given; it should not have been.`,
        )
      if (
        (check.dose === 'given' || check.dose === 'withheld') &&
        last?.outcome !== check.dose
      )
        problems.push(`The ${order.drug} dose is not recorded as ${check.dose}.`)
      const missing = has(order.query, check.queryMentions)
      if (check.queryMentions.length && missing.length)
        problems.push(...missing.map((w) => `The query does not mention ${w[0]}.`))
      const parts = 1 + (check.dose ? 1 : 0) + (check.queryMentions.length ? 1 : 0)
      return checkResult(check, Math.max(0, 1 - problems.length / parts), problems)
    }
    case 'lab': {
      const lab = s.labs.find((l) => l.id === check.order)
      if (!lab) return checkResult(check, 0, [`Test request ${check.order} is missing.`])
      const problems: string[] = []
      if (check.status && lab.status !== check.status)
        problems.push(
          `${lab.test} (${lab.id}) is “${lab.status}”, not “${check.status}”.`,
        )
      if (check.acknowledged !== undefined && lab.acknowledged !== check.acknowledged)
        problems.push(
          check.acknowledged
            ? 'The result was not acknowledged.'
            : 'The result should not have been acknowledged.',
        )
      if (
        check.calledTo &&
        !lab.calledTo.toLowerCase().includes(check.calledTo.toLowerCase())
      )
        problems.push(
          `The critical result was not recorded as phoned to ${check.calledTo}.`,
        )
      if (check.repeated && !s.labs.some((l) => l.id === `${lab.id}-R`))
        problems.push('No new specimen was requested.')
      return checkResult(
        check,
        problems.length ? Math.max(0, 1 - problems.length / 2) : 1,
        problems,
      )
    }
    case 'appointment': {
      const name = patientById(s, check.patient)?.name ?? check.patient
      const found = s.appointments.filter(
        (a) =>
          a.patientId === check.patient &&
          (!check.clinic || a.clinic === check.clinic) &&
          (!check.clinician || a.clinician === check.clinician),
      )
      if (!found.length)
        return checkResult(check, 0, [
          `There is no ${check.clinic ?? ''} appointment for ${name}.`,
        ])
      return found.some((a) => a.status === check.status)
        ? checkResult(check, 1, [])
        : checkResult(check, 0, [
            `${name}’s appointment is “${found.at(-1)?.status}”, not “${check.status}”.`,
          ])
    }
    case 'patient': {
      const p = patientById(s, check.patient)
      if (!p) return checkResult(check, 0, [`Patient ${check.patient} is missing.`])
      if (p.status !== check.status)
        return checkResult(check, 0, [`${p.name} is ${p.status}, not ${check.status}.`])
      if (check.bed && p.bed !== check.bed)
        return checkResult(check, 0.5, [`${p.name} is in ${p.bed}, not ${check.bed}.`])
      return checkResult(check, 1, [])
    }
    case 'no-unsafe-medicine': {
      const unsafe = s.meds.filter(
        (m) =>
          medicineAlerts(s, m).length > 0 &&
          (m.status === 'verified' ||
            m.status === 'dispensed' ||
            m.administrations.some((a) => a.outcome === 'given')),
      )
      return checkResult(
        check,
        unsafe.length ? 0 : 1,
        unsafe.map(
          (m) => `${m.drug} (${m.id}) went ahead despite: ${medicineAlerts(s, m)[0]}`,
        ),
      )
    }
  }
}

export const clinical: ToolDefinition<ClinicalState, ClinicalCheck> = {
  id: 'clinical',
  name: 'Ward Systems',
  category: 'Hospital clinical and administration systems (simulation)',
  icon: 'medical',
  sections: [
    {
      id: 'record',
      name: 'Patient record',
      description:
        'The electronic health record: banner, observations, notes and the medicines chart.',
    },
    {
      id: 'clinics',
      name: 'Appointments',
      description: 'Clinic lists: booking, arrivals and outcomes.',
    },
    {
      id: 'lab',
      name: 'Laboratory',
      description: 'Test requests, specimens, results and critical results.',
    },
    {
      id: 'pharmacy',
      name: 'Pharmacy',
      description: 'Verifying, querying and dispensing prescriptions.',
    },
    {
      id: 'beds',
      name: 'Beds and admissions',
      description: 'The bed board: admissions, moves, cleaning and discharge.',
    },
    {
      id: 'audit',
      name: 'Audit log',
      description: 'Every action, who did it and when: records are checked.',
    },
  ],
  state: ClinicalStateSchema,
  practice: sampleClinical,
  summary: (s) => {
    const admitted = s.patients.filter((p) => p.status === 'admitted').length
    return `${admitted} patient${admitted === 1 ? '' : 's'} on the ward · ${s.audit.length} actions logged`
  },
  check: ClinicalCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['Nothing was done in Ward Systems.']),
    ),
  guide: {
    intro:
      'Ward Systems brings together the systems hospital staff use every day: the electronic patient record, clinic appointments, the laboratory system, pharmacy and the bed board. It is a simulation: every patient, medicine and number is fictional, and nothing here is medical advice. Your part is the safe process: the right patient, the right checks, clear notes, and asking for help early.',
    topics: [
      {
        title: 'Opening a record',
        body: 'Patients on your list open straight away. For anyone else you must give a reason, which is recorded: looking at a record you have no need to see is a privacy breach, even out of kindness or curiosity.',
      },
      {
        title: 'Observations and escalation',
        body: 'Enter the observations exactly as measured. The early-warning score adds points for each one outside the usual range; the higher the score, the sooner someone more senior must see the patient. Escalate with SBAR: Situation, Background, Assessment, Recommendation.',
      },
      {
        title: 'Medicines',
        body: 'Pharmacy verifies each prescription. Read the alerts first: an allergy or a duplicate means you query it with the prescriber, never verify it. At the bedside, confirm who the patient is (ask, and check the wristband) and their allergies before giving anything; if you do not give a dose, record why.',
      },
      {
        title: 'Specimens and results',
        body: 'Label specimens at the bedside from what the patient tells you. The laboratory rejects any specimen whose label does not match the request exactly, and a new one is taken. A critical result is phoned through to the doctor responsible straight away, and you record who you told.',
      },
      {
        title: 'Beds and discharge',
        body: 'A bed is cleaned after every patient before anyone else uses it. A patient goes home only after the discharge summary is written and signed, so their GP and the next team know what happened.',
      },
    ],
    glossary: [
      {
        term: 'EHR',
        meaning:
          'Electronic health record: the patient’s record in the hospital’s system.',
      },
      {
        term: 'Hospital number',
        meaning:
          'The number that identifies a patient in this hospital (with name and date of birth, how you confirm identity).',
      },
      {
        term: 'Early-warning score',
        meaning:
          'Points from the observations that show how unwell a patient may be, and how urgently to escalate. This one is simplified for learning.',
      },
      {
        term: 'SBAR',
        meaning:
          'Situation, Background, Assessment, Recommendation: a clear way to pass on a concern.',
      },
      {
        term: 'Medicines chart',
        meaning: 'Where each dose is recorded as given or not given, with the reason.',
      },
      {
        term: 'Critical result',
        meaning:
          'A test result so far outside the usual range that it must be acted on at once.',
      },
    ],
  },
}
