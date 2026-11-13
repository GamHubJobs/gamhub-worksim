/**
 * Helpers for the healthcare tasks: each task starts from the ward's
 * practice data with its own changes, and its model answer is built with
 * the same actions the player uses (so it is always reachable).
 *
 * Simulation only: fictional patients and medicines, no medical advice.
 */
import { sampleClinical } from '../../../tools/clinical/data'
import type { Result } from '../../../tools/clinical/model'
import type { ClinicalState, LabOrder, MedOrder } from '../../../tools/clinical/schema'

/** Applies an action that must work (a mistake in the task, if it does not). */
export function must(result: Result): ClinicalState {
  if (result.problems.length) throw new Error(result.problems.join(' '))
  return result.state
}

export function ward(
  change: (s: ClinicalState) => ClinicalState = (s) => s,
): ClinicalState {
  return change(sampleClinical())
}

export const lab = (
  input: Partial<LabOrder> & Pick<LabOrder, 'id' | 'patientId' | 'test'>,
): LabOrder => ({
  specimen: 'blood',
  orderedBy: 'Dr Felix Moreau',
  status: 'ordered',
  label: null,
  rejectReason: '',
  result: null,
  acknowledged: false,
  calledTo: '',
  ...input,
})

export const med = (
  input: Partial<MedOrder> & Pick<MedOrder, 'id' | 'patientId' | 'drug' | 'dose'>,
): MedOrder => ({
  route: 'By mouth',
  frequency: 'Once a day',
  due: '08:00',
  prescriber: 'Dr Hana Ito',
  status: 'awaiting-verification',
  query: '',
  administrations: [],
  ...input,
})

export const CHECK_PRIVACY = {
  id: 'privacy',
  type: 'privacy' as const,
  title: 'Only the records you needed',
  points: 10,
  why: 'Every look at a health record is logged. Opening one you have no need to see is a breach of confidentiality, even with good intentions.',
  hint: 'Only open records of patients on your list, or give a real reason.',
}
