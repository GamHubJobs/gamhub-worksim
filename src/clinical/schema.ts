/**
 * What a patient case saves: the encounter in progress (the engine's
 * authoritative record of what happened, on the case clock) and every
 * finished attempt. Kept inside the Ward Systems file, so autosave, versions
 * and backups work as for every file; old files read with no cases.
 */
import { z } from 'zod'

const Id = z.string().min(1).max(60)
const Minute = z
  .number()
  .min(0)
  .max(24 * 60)

export const EventSchema = z.object({
  t: Minute,
  kind: z.enum([
    'action',
    'said',
    'patient',
    'change',
    'referred',
    'measure',
    'finding',
    'result',
    'note',
    'escalation',
    'team',
    'conduct',
    'hint',
    'end',
  ]),
  text: z.string().max(2000),
  action: z.string().max(60).optional(),
  phase: z.string().max(60).optional(),
})

export const MeasurementSchema = z.object({
  t: Minute,
  measure: z.enum(['resp', 'spo2', 'temp', 'bp', 'pulse', 'avpu', 'pain', 'glucose']),
  value: z.string().max(40),
  phase: z.string().max(60),
})

export const WrittenSchema = z.object({
  t: Minute,
  kind: z.enum(['note', 'escalation', 'handover']),
  to: z.string().max(60).default(''),
  text: z.string().max(4000),
})

export const SpecimenSchema = z.object({
  kind: z.enum(['blood', 'urine', 'swab', 'stool', 'sputum']),
  t: Minute,
  sent: Minute.nullable().default(null),
})

export const EncounterSchema = z.object({
  caseId: Id,
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  role: z.number().int().min(0).max(3),
  /** The ward clock (minutes since midnight) when the case began. */
  startClock: Minute,
  /** Minutes since the case began. */
  t: Minute,
  phase: Id,
  phaseSince: Minute,
  /** Every stage the patient has been in, with when it began. */
  phases: z.array(z.object({ id: Id, t: Minute })).max(40),
  log: z.array(EventSchema).max(600),
  /** Action → every time it was done. */
  done: z.record(z.string(), z.array(Minute)),
  /** Actions beyond the player's role that they asked the right person to do. */
  referred: z.record(z.string(), Minute),
  /** Fact → when the patient told the player. */
  asked: z.record(z.string(), Minute),
  measurements: z.array(MeasurementSchema).max(300),
  written: z.array(WrittenSchema).max(60),
  specimens: z.array(SpecimenSchema).max(20),
  /** What was said, for patient communication (word counts, jargon). */
  speech: z.object({
    lines: z.number().int(),
    open: z.number().int(),
    jargon: z.array(z.string().max(40)).max(40),
  }),
  /** The patient is assigned by an educator or Grace, with a due date (game day). */
  assignment: z.string().max(60).default(''),
  ended: z
    .object({ t: Minute, reason: z.enum(['finished', 'time', 'abandoned']) })
    .nullable()
    .default(null),
})

export const AttemptSchema = z.object({
  id: Id,
  caseId: Id,
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  role: z.number().int().min(0).max(3),
  /** Game day and the ward clock when it ended. */
  day: z.number().int().min(0),
  at: z.string().max(10),
  minutes: Minute,
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  rubric: z.record(z.string(), z.number().min(0).max(100)),
  criticalMissed: z.array(z.string().max(60)).max(40),
  harmful: z.array(z.string().max(60)).max(40),
  /** The encounter as it ended, for the replay and the debrief (kept for recent attempts only). */
  encounter: EncounterSchema.nullable().default(null),
})

/** A case assigned to the player by an educator or supervisor. */
export const CaseAssignmentSchema = z.object({
  id: Id,
  caseId: Id,
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  by: z.string().max(60),
  /** Game day it is due by. */
  due: z.number().int().min(0),
  note: z.string().max(300).default(''),
  /** Set when an attempt after assigning passed. */
  completed: Id.nullable().default(null),
})

export const CasesStateSchema = z.object({
  active: EncounterSchema.nullable().default(null),
  attempts: z.array(AttemptSchema).max(200).default([]),
  assigned: z.array(CaseAssignmentSchema).max(60).default([]),
})

export type CaseEvent = z.infer<typeof EventSchema>
export type Measurement = z.infer<typeof MeasurementSchema>
export type Written = z.infer<typeof WrittenSchema>
export type Encounter = z.infer<typeof EncounterSchema>
export type Attempt = z.infer<typeof AttemptSchema>
export type CaseAssignment = z.infer<typeof CaseAssignmentSchema>
export type CasesState = z.infer<typeof CasesStateSchema>

export const emptyCases = (): CasesState => ({ active: null, attempts: [], assigned: [] })
