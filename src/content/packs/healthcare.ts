/**
 * Everything specific to the healthcare career: its tasks, cases and readiness
 * assessments. Loaded only when a save of this career is opened (see `loader.ts`).
 * A simulation with fictional patients: no real diagnosis or prescribing.
 */
import type { CareerPack } from '../loader'
import { aiCases } from '../cases/ai'
import { wardBeds } from '../assignments/healthcare/beds'
import { wardClinics } from '../assignments/healthcare/clinics'
import { wardMedicines } from '../assignments/healthcare/medicines'
import { wardObservations } from '../assignments/healthcare/observations'
import { wardSpecimens } from '../assignments/healthcare/specimens'
import { HEALTHCARE_CASES } from '../cases/healthcare'
import { ASSESSMENTS_HEALTHCARE } from '../assessments/healthcare'

export const PACK: CareerPack = {
  careerId: 'healthcare',
  assignments: [wardObservations, wardSpecimens, wardClinics, wardMedicines, wardBeds],
  cases: [...aiCases('healthcare'), ...HEALTHCARE_CASES],
  assessments: ASSESSMENTS_HEALTHCARE,
}
