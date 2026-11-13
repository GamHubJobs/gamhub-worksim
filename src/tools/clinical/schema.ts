/**
 * Ward Systems: a hospital's clinical and administrative systems in one
 * console, as ward and support staff use them every day: the patient record
 * (EHR), appointments, clinical notes, the laboratory system, pharmacy and
 * medicines, and beds and admissions.
 *
 * SIMULATION ONLY. Every patient, clinician, medicine and test range here is
 * fictional and for learning. Nothing here is medical advice; the player
 * never diagnoses or prescribes: prescriptions come from the (fictional)
 * doctors, and the player's job is the safe process around them.
 */
import { z } from 'zod'

const Id = z.string().min(1).max(40)
const Time = z.string().regex(/^\d{2}:\d{2}$/)
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const PatientSchema = z.object({
  /** The hospital number (medical record number), e.g. "RCH-104233". */
  id: Id,
  name: z.string().min(1).max(80),
  dob: DateSchema,
  sex: z.enum(['female', 'male', 'other']),
  status: z.enum(['outpatient', 'admitted', 'discharged']),
  /** The bed, when admitted. */
  bed: z.string().max(20).nullable().default(null),
  /** Allergies: a substance group (e.g. "Penicillins") and the reaction. */
  allergies: z
    .array(z.object({ substance: z.string().max(60), reaction: z.string().max(80) }))
    .max(10)
    .default([]),
  /** Alerts shown on the banner, e.g. "Falls risk". */
  alerts: z.array(z.string().max(60)).max(10).default([]),
  /** On the player's own list (their care team): no reason needed to open the record. */
  careTeam: z.boolean().default(true),
  /** Why they are here, in plain words (written by the fictional doctors). */
  reason: z.string().max(200).default(''),
})

export const VitalsSchema = z.object({
  id: Id,
  patientId: Id,
  at: Time,
  /** Breaths per minute. */
  resp: z.number().min(0).max(80),
  /** Oxygen saturation, %. */
  spo2: z.number().min(50).max(100),
  /** °C */
  temp: z.number().min(30).max(44),
  sys: z.number().min(40).max(260),
  dia: z.number().min(20).max(160),
  pulse: z.number().min(20).max(220),
  /** Alert, or new confusion / responds only to voice, pain, or not at all. */
  alert: z.boolean(),
  /** The early-warning score, worked out when recorded. */
  score: z.number().int().min(0).max(20),
  by: z.string().max(60),
})

export const NoteSchema = z.object({
  id: Id,
  patientId: Id,
  kind: z.enum(['nursing', 'handover', 'escalation', 'admission', 'discharge', 'call']),
  text: z.string().max(4000),
  at: Time,
  by: z.string().max(60),
  signed: z.boolean(),
})

export const AppointmentSchema = z.object({
  id: Id,
  patientId: Id,
  clinic: z.string().max(60),
  clinician: z.string().max(60),
  date: DateSchema,
  time: Time,
  status: z.enum(['booked', 'arrived', 'seen', 'cancelled', 'no-show']),
})

export const LabResultSchema = z.object({
  value: z.number(),
  unit: z.string().max(20),
  low: z.number(),
  high: z.number(),
  flag: z.enum(['normal', 'low', 'high', 'critical']),
})

export const LabOrderSchema = z.object({
  id: Id,
  patientId: Id,
  test: z.string().max(60),
  specimen: z.enum(['blood', 'urine', 'swab']),
  orderedBy: z.string().max(60),
  status: z.enum(['ordered', 'collected', 'received', 'resulted', 'rejected']),
  /** What the specimen label says (checked against the patient when received). */
  label: z
    .object({ name: z.string().max(80), dob: z.string().max(10) })
    .nullable()
    .default(null),
  rejectReason: z.string().max(200).default(''),
  result: LabResultSchema.nullable().default(null),
  /** The result was seen and acted on, and (for a critical result) who was told. */
  acknowledged: z.boolean().default(false),
  calledTo: z.string().max(80).default(''),
})

export const AdministrationSchema = z.object({
  at: Time,
  outcome: z.enum(['given', 'withheld']),
  reason: z.string().max(200).default(''),
  by: z.string().max(60),
})

export const MedOrderSchema = z.object({
  id: Id,
  patientId: Id,
  /** A fictional medicine (see MEDICINES in data.ts). */
  drug: z.string().max(60),
  dose: z.string().max(40),
  route: z.string().max(30),
  frequency: z.string().max(40),
  /** When the next dose is due. */
  due: Time,
  prescriber: z.string().max(60),
  status: z.enum(['awaiting-verification', 'verified', 'queried', 'dispensed']),
  query: z.string().max(400).default(''),
  administrations: z.array(AdministrationSchema).max(50).default([]),
})

export const BedSchema = z.object({
  id: Id,
  ward: z.string().max(40),
  patientId: Id.nullable(),
  /** Cleaned since the last patient left. */
  clean: z.boolean(),
})

export const AuditSchema = z.object({
  at: Time,
  action: z.string().max(80),
  patientId: Id.nullable(),
  detail: z.string().max(300).default(''),
})

export const ClinicalStateSchema = z.object({
  /** The hospital's name (fictional). */
  hospital: z.string().max(80),
  /** The time on the ward, in minutes since midnight. */
  clock: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 - 1),
  /** Who is signed in. */
  user: z.object({ name: z.string().max(60), role: z.string().max(60) }),
  patients: z.array(PatientSchema).max(60),
  vitals: z.array(VitalsSchema).max(300).default([]),
  notes: z.array(NoteSchema).max(300).default([]),
  appointments: z.array(AppointmentSchema).max(200).default([]),
  labs: z.array(LabOrderSchema).max(200).default([]),
  meds: z.array(MedOrderSchema).max(200).default([]),
  beds: z.array(BedSchema).max(60).default([]),
  audit: z.array(AuditSchema).max(1000).default([]),
})

export type Patient = z.infer<typeof PatientSchema>
export type Vitals = z.infer<typeof VitalsSchema>
export type Note = z.infer<typeof NoteSchema>
export type Appointment = z.infer<typeof AppointmentSchema>
export type LabOrder = z.infer<typeof LabOrderSchema>
export type MedOrder = z.infer<typeof MedOrderSchema>
export type Bed = z.infer<typeof BedSchema>
export type ClinicalState = z.infer<typeof ClinicalStateSchema>

export const NOTE_KINDS: Record<Note['kind'], string> = {
  nursing: 'Nursing note',
  handover: 'Handover',
  escalation: 'Escalation (SBAR)',
  admission: 'Admission',
  discharge: 'Discharge summary',
  call: 'Telephone call',
}
