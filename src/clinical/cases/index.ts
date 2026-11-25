/**
 * The case library: every patient case, in a sensible order for learning.
 * All patients are fictional; every case is simplified for learning.
 */
import type { CaseDef, Difficulty, Role } from '../model'
import { DIFFICULTIES } from '../model'
import {
  ABDOMINAL_PAIN,
  ALLERGIC_REACTION,
  BLEEDING_WOUND,
  BREATHLESS,
  CHEST_PAIN,
  LOW_SUGAR,
  NIGHT_HANDOVER,
  SEPSIS_SIGNS,
  STROKE_SIGNS,
} from './acute'
import { CLINIC_HIGH_BP, FAINT_COLLECTION, ISOLATION_STOOL, URINE_SAMPLE } from './clinic'
import {
  CONFUSED_FEVER,
  DEHYDRATION,
  FALL_ON_WARD,
  NIL_BY_MOUTH,
  POSTOP_BLEED,
  PRESSURE_AREA,
  REFUSES_OBS,
  ROUTINE_OBS,
  WRONG_WRISTBAND,
} from './ward'

export const CASES: CaseDef[] = [
  ROUTINE_OBS,
  URINE_SAMPLE,
  PRESSURE_AREA,
  NIL_BY_MOUTH,
  DEHYDRATION,
  ISOLATION_STOOL,
  REFUSES_OBS,
  WRONG_WRISTBAND,
  FALL_ON_WARD,
  CONFUSED_FEVER,
  POSTOP_BLEED,
  LOW_SUGAR,
  BLEEDING_WOUND,
  CLINIC_HIGH_BP,
  FAINT_COLLECTION,
  CHEST_PAIN,
  BREATHLESS,
  STROKE_SIGNS,
  SEPSIS_SIGNS,
  ABDOMINAL_PAIN,
  ALLERGIC_REACTION,
  NIGHT_HANDOVER,
]

const BY_ID = new Map(CASES.map((c) => [c.id, c]))

export function getCase(id: string): CaseDef | undefined {
  return BY_ID.get(id)
}

/** Cases written for the player's role or below, easiest first. */
export function casesFor(role: Role): CaseDef[] {
  return CASES.filter((c) => c.role <= role).sort(
    (a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty),
  )
}

export function byDifficulty(d: Difficulty): CaseDef[] {
  return CASES.filter((c) => c.difficulty === d)
}
