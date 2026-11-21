/**
 * Everything specific to the architecture-interiors career: its design tasks
 * in Space Studio, its cases and readiness assessments. Loaded only when a
 * save of this career is opened (see `loader.ts`). Simplified, fictional
 * briefs: for learning.
 */
import type { CareerPack } from '../loader'
import { aiCases } from '../cases/ai'
import { ARCHITECTURE_TASKS } from '../assignments/architecture/tasks'
import { ARCHITECTURE_CASES } from '../cases/architecture'
import { ASSESSMENTS_ARCHITECTURE } from '../assessments/architecture'

export const PACK: CareerPack = {
  careerId: 'architecture-interiors',
  assignments: ARCHITECTURE_TASKS,
  cases: [...aiCases('architecture-interiors'), ...ARCHITECTURE_CASES],
  assessments: ASSESSMENTS_ARCHITECTURE,
}
