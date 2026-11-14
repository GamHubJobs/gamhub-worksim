/** Every live workplace scenario, by career (see types.ts). */
import { CLIENT_REVIEW } from './accounting'
import { AUDIT_VISIT } from './accountingAudit'
import { FINDINGS } from './data'
import { DATA_INCIDENT } from './dataQuality'
import { RELEASE } from './dev'
import { PLANNING } from './devPlanning'
import { SAFETY_WALK } from './engineering'
import { DESIGN_REVIEW } from './engineeringReview'
import { SUPPLIER_VISIT } from './finance'
import { EXPENSES } from './financeExpenses'
import { WARD_ROUND } from './healthcare'
import { ADMISSION } from './healthcareAdmission'
import { DESK_SIDE } from './it'
import { MAJOR_INCIDENT } from './itIncident'
import { HEARING } from './legal'
import { CLIENT_INTERVIEW } from './legalInterview'
import { CAMPAIGN_REVIEW } from './marketing'
import { PHOTO_SHOOT } from './marketingShoot'
import type { Scenario } from './types'

export const SCENARIOS: Scenario[] = [
  SUPPLIER_VISIT,
  EXPENSES,
  CLIENT_REVIEW,
  AUDIT_VISIT,
  DESK_SIDE,
  MAJOR_INCIDENT,
  CAMPAIGN_REVIEW,
  PHOTO_SHOOT,
  FINDINGS,
  DATA_INCIDENT,
  RELEASE,
  PLANNING,
  WARD_ROUND,
  ADMISSION,
  HEARING,
  CLIENT_INTERVIEW,
  SAFETY_WALK,
  DESIGN_REVIEW,
]

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}

/** A career's scenarios, in the order they are offered. */
export function scenariosFor(careerId: string): Scenario[] {
  return SCENARIOS.filter((s) => s.careerId === careerId)
}

export type { Scenario } from './types'
