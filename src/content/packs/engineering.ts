/**
 * Everything specific to the engineering-services career: its tasks, cases and
 * readiness assessments. Loaded only when a save of this career is opened
 * (see `loader.ts`). Standard formulas with simplified data: for learning.
 */
import type { CareerPack } from '../loader'
import { aiCases } from '../cases/ai'
import { ENGINEERING_TASKS } from '../assignments/engineeringServices/tasks'
import { ENGINEERING_CASES } from '../cases/engineeringServices/more'
import { ASSESSMENTS_ENGINEERING } from '../assessments/engineeringServices'

export const PACK: CareerPack = {
  careerId: 'engineering-services',
  assignments: ENGINEERING_TASKS,
  cases: [...aiCases('engineering-services'), ...ENGINEERING_CASES],
  assessments: ASSESSMENTS_ENGINEERING,
}
