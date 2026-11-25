/**
 * Helpers for writing cases: true observations in one line, the judgements
 * every case shares (clean hands, introductions, identity, permission, the
 * call bell), and the facts every patient can tell you (allergies, how they
 * feel). A case lists only what is particular to it, and can override any of
 * these. Every case is fictional and simplified for learning.
 */
import type { CaseAction, CaseDef, Fact, PatientProfile, Vitals } from '../model'

/** True observations: breathing, saturation, temperature, BP, pulse, alert, pain, glucose. */
export function V(
  resp: number,
  spo2: number,
  temp: number,
  bp: string,
  pulse: number,
  alert = true,
  pain = 0,
  glucose = 5.6,
): Vitals {
  const [sys, dia] = bp.split('/').map(Number)
  return { resp, spo2, temp, sys, dia, pulse, alert, pain, glucose }
}

export const NURSE = 'Owen Fraser, the nurse in charge'
export const DOCTOR = 'Dr Felix Moreau'
export const MANAGER = 'Grace Mbeki'

const BASE: Record<string, CaseAction> = {
  'hand-hygiene': {
    as: 'recommended',
    rubric: 'infection',
    why: 'Clean hands before touching a patient or their surroundings stop infections spreading.',
    within: { minutes: 5 },
  },
  introduce: {
    as: 'recommended',
    rubric: 'communication',
    why: 'Saying who you are and what you do puts patients at ease and is the start of consent.',
  },
  'check-id': {
    as: 'recommended',
    rubric: 'safety',
    why: 'Checking name and date of birth against the wristband makes sure the right patient gets the right care.',
  },
  consent: {
    as: 'recommended',
    rubric: 'conduct',
    why: 'Patients have the right to agree to care first, even something as simple as observations.',
  },
  'call-bell': {
    as: 'recommended',
    rubric: 'safety',
    why: 'Before you leave, a patient must be able to call for help.',
  },
}

function allergyFact(p: PatientProfile): Fact {
  return {
    id: 'allergies',
    topics: ['allergies', 'allergic', 'allergy', 'react to'],
    answers: [
      p.allergies.length
        ? `Yes: ${p.allergies.map((a) => `${a.substance}, it gives me ${a.reaction}`).join('; ')}.`
        : 'No, no allergies that I know of.',
    ],
    key: true,
    inNotes: true,
  }
}

export type CaseInput = Omit<CaseDef, 'limit'> & { limit?: number }

/** Completes a case with the shared judgements and facts (the case's own win). */
export function makeCase(input: CaseInput): CaseDef {
  const own = new Set(input.facts.map((f) => f.id))
  const facts = [...input.facts]
  if (!own.has('allergies')) facts.push(allergyFact(input.patient))
  if (!own.has('callme'))
    facts.push({
      id: 'callme',
      topics: ['call you', 'like to be called', 'prefer to be called'],
      answers: [`Please, call me ${input.patient.callMe}.`],
    })
  return { limit: 30, ...input, facts, actions: { ...BASE, ...input.actions } }
}
