/**
 * Everything specific to the software-development career: its tasks, cases and readiness
 * assessments. Loaded only when a save of this career is opened (see `loader.ts`).
 */
import type { CareerPack } from '../loader'
import { apiTesting } from '../assignments/dev/apiTesting'
import { billingReport } from '../assignments/dev/billingReport'
import { debugNaN } from '../assignments/dev/debugNaN'
import { gitFirstFix } from '../assignments/dev/gitFirstFix'
import { invoiceBug } from '../assignments/dev/invoiceBug'
import { timesheetValidation } from '../assignments/dev/timesheetValidation'
import { workingDaysTests } from '../assignments/dev/workingDaysTests'
import {
  mileageChange,
  mileageRelease,
  mileageTests,
} from '../assignments/dev/projectMileage'
import { DEV_CASES } from '../cases/dev'
import { OPERATIONS_DEV } from '../cases/operations/dev'
import { WORKFLOW_DEV } from '../cases/workflows/dev'
import { MEETING_DEV } from '../cases/meetings/dev'
import { INCIDENT_DEV } from '../cases/incidents/dev'
import { LEADERSHIP_DEV } from '../cases/leadership/dev'
import { PROGRAMME_DEV } from '../cases/programme/dev'
import { ADVANCED_DEV } from '../cases/advanced/dev'
import { ASSESSMENTS_DEV } from '../assessments/dev'

export const PACK: CareerPack = {
  careerId: 'software-development',
  assignments: [
    apiTesting,
    billingReport,
    debugNaN,
    gitFirstFix,
    invoiceBug,
    timesheetValidation,
    workingDaysTests,
    mileageChange,
    mileageRelease,
    mileageTests,
  ],
  cases: [
    ...DEV_CASES,
    ...OPERATIONS_DEV,
    ...WORKFLOW_DEV,
    ...MEETING_DEV,
    ...INCIDENT_DEV,
    ...LEADERSHIP_DEV,
    ...PROGRAMME_DEV,
    ...ADVANCED_DEV,
  ],
  assessments: ASSESSMENTS_DEV,
}
