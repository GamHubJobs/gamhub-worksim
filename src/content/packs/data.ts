/**
 * Everything specific to the data-analytics career: its tasks, cases and readiness
 * assessments. Loaded only when a save of this career is opened (see `loader.ts`).
 */
import type { CareerPack } from '../loader'
import { cleanCustomers } from '../assignments/data/cleanCustomers'
import {
  churnClean,
  churnDashboard,
  churnFindings,
} from '../assignments/data/projectChurn'
import { studioCleaning } from '../assignments/data/studioCleaning'
import { studioDashboard } from '../assignments/data/studioDashboard'
import { studioSql } from '../assignments/data/studioSql'
import { studioStatistics } from '../assignments/data/studioStatistics'
import { portfolioReview } from '../assignments/data/portfolioReview'
import { salesSummary } from '../assignments/data/salesSummary'
import { surveyAnalysis } from '../assignments/data/surveyAnalysis'
import { DATA_CASES } from '../cases/data'
import { OPERATIONS_DATA } from '../cases/operations/data'
import { WORKFLOW_DATA } from '../cases/workflows/data'
import { MEETING_DATA } from '../cases/meetings/data'
import { INCIDENT_DATA } from '../cases/incidents/data'
import { LEADERSHIP_DATA } from '../cases/leadership/data'
import { PROGRAMME_DATA } from '../cases/programme/data'
import { ADVANCED_DATA } from '../cases/advanced/data'
import { ASSESSMENTS_DATA } from '../assessments/data'

export const PACK: CareerPack = {
  careerId: 'data-analytics',
  assignments: [
    cleanCustomers,
    churnClean,
    churnDashboard,
    churnFindings,
    studioCleaning,
    studioDashboard,
    studioSql,
    studioStatistics,
    portfolioReview,
    salesSummary,
    surveyAnalysis,
  ],
  cases: [
    ...DATA_CASES,
    ...OPERATIONS_DATA,
    ...WORKFLOW_DATA,
    ...MEETING_DATA,
    ...INCIDENT_DATA,
    ...LEADERSHIP_DATA,
    ...PROGRAMME_DATA,
    ...ADVANCED_DATA,
  ],
  assessments: ASSESSMENTS_DATA,
}
