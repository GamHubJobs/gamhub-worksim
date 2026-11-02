/**
 * Everything specific to the office-admin-finance career: its tasks, cases and readiness
 * assessments. Loaded only when a save of this career is opened (see `loader.ts`).
 */
import type { CareerPack } from '../loader'
import { budgetReport } from '../assignments/budgetReport'
import { expenseSummary } from '../assignments/expenseSummary'
import { invoiceCheck } from '../assignments/invoiceCheck'
import { paymentRun } from '../assignments/paymentRun'
import { performanceReport } from '../assignments/performanceReport'
import { pettyCash } from '../assignments/pettyCash'
import { savingsProposal } from '../assignments/savingsProposal'
import {
  budgetConsolidate,
  budgetPresentation,
  budgetReview,
} from '../assignments/projectBudgetPack'
import { suppliesOrder } from '../assignments/suppliesOrder'
import { FINANCE_CASES } from '../cases/finance'
import { OPERATIONS_FINANCE } from '../cases/operations/finance'
import { WORKFLOW_FINANCE } from '../cases/workflows/finance'
import { MEETING_FINANCE } from '../cases/meetings/finance'
import { INCIDENT_FINANCE } from '../cases/incidents/finance'
import { LEADERSHIP_FINANCE } from '../cases/leadership/finance'
import { PROGRAMME_FINANCE } from '../cases/programme/finance'
import { ADVANCED_FINANCE } from '../cases/advanced/finance'
import { ASSESSMENTS_FINANCE } from '../assessments/finance'

export const PACK: CareerPack = {
  careerId: 'office-admin-finance',
  assignments: [
    budgetReport,
    expenseSummary,
    invoiceCheck,
    paymentRun,
    performanceReport,
    pettyCash,
    savingsProposal,
    budgetConsolidate,
    budgetPresentation,
    budgetReview,
    suppliesOrder,
  ],
  cases: [
    ...FINANCE_CASES,
    ...OPERATIONS_FINANCE,
    ...WORKFLOW_FINANCE,
    ...MEETING_FINANCE,
    ...INCIDENT_FINANCE,
    ...LEADERSHIP_FINANCE,
    ...PROGRAMME_FINANCE,
    ...ADVANCED_FINANCE,
  ],
  assessments: ASSESSMENTS_FINANCE,
}
