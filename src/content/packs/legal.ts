/**
 * Everything specific to the legal career: its tasks, cases and readiness
 * assessments. Loaded only when a save of this career is opened (see `loader.ts`).
 * Fictional jurisdiction (Westmark); not legal advice.
 */
import type { CareerPack } from '../loader'
import { aiCases } from '../cases/ai'
import { legalContract } from '../assignments/legal/contract'
import { legalDeadlines } from '../assignments/legal/deadlines'
import { legalDisclosure } from '../assignments/legal/disclosure'
import { legalIntake } from '../assignments/legal/intake'
import { legalResearch } from '../assignments/legal/research'
import { LEGAL_CASES } from '../cases/legal'
import { ASSESSMENTS_LEGAL } from '../assessments/legal'

export const PACK: CareerPack = {
  careerId: 'legal',
  assignments: [
    legalIntake,
    legalResearch,
    legalDeadlines,
    legalContract,
    legalDisclosure,
  ],
  cases: [...aiCases('legal'), ...LEGAL_CASES],
  assessments: ASSESSMENTS_LEGAL,
}
