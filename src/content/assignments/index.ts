/** All assignments, checked against the content blueprint when the app starts. */
import { departmentFor, fill, type Department } from '../departments'
import { getTool } from '../../tools/registry'
import { AssignmentSchema, type Assignment } from '../schemas'
import { bankReconciliation } from './accounting/bankReconciliation'
import { booksBankRec } from './accounting/booksBankRec'
import { booksJournals } from './accounting/booksJournals'
import { booksMonthEndClose } from './accounting/booksMonthEndClose'
import { booksPayroll } from './accounting/booksPayroll'
import { booksSalesPurchases } from './accounting/booksSalesPurchases'
import { depreciation } from './accounting/depreciation'
import { journalEntries } from './accounting/journalEntries'
import { monthEnd } from './accounting/monthEnd'
import {
  quarterCloseAdjustments,
  quarterCloseBoardPack,
  quarterCloseVariances,
} from './accounting/projectQuarterClose'
import { cleanCustomers } from './data/cleanCustomers'
import { churnClean, churnDashboard, churnFindings } from './data/projectChurn'
import { studioCleaning } from './data/studioCleaning'
import { studioDashboard } from './data/studioDashboard'
import { studioSql } from './data/studioSql'
import { studioStatistics } from './data/studioStatistics'
import { portfolioReview } from './data/portfolioReview'
import { salesSummary } from './data/salesSummary'
import { surveyAnalysis } from './data/surveyAnalysis'
import { apiTesting } from './dev/apiTesting'
import { billingReport } from './dev/billingReport'
import { debugNaN } from './dev/debugNaN'
import { gitFirstFix } from './dev/gitFirstFix'
import { invoiceBug } from './dev/invoiceBug'
import { timesheetValidation } from './dev/timesheetValidation'
import { workingDaysTests } from './dev/workingDaysTests'
import { directoryJoiner } from './it/directoryJoiner'
import { directoryLeaver } from './it/directoryLeaver'
import { majorIncident } from './it/majorIncident'
import { networkIntranet } from './it/networkIntranet'
import { networkPrinting } from './it/networkPrinting'
import { abTest } from './marketing/abTest'
import { campaignBudget } from './marketing/campaignBudget'
import { funnelAnalysis } from './marketing/funnelAnalysis'
import { seoFixes } from './marketing/seoFixes'
import { socialLaunch } from './marketing/socialLaunch'
import { campaignMetrics } from './marketing/campaignMetrics'
import { contentCalendar } from './marketing/contentCalendar'
import { quarterlyReport } from './marketing/quarterlyReport'
import { recurringProblem } from './it/recurringProblem'
import { triageQueue } from './it/triageQueue'
import { userReplies } from './it/userReplies'
import { budgetReport } from './budgetReport'
import { expenseSummary } from './expenseSummary'
import { invoiceCheck } from './invoiceCheck'
import { paymentRun } from './paymentRun'
import { performanceReport } from './performanceReport'
import { pettyCash } from './pettyCash'
import { savingsProposal } from './savingsProposal'
import { suppliesOrder } from './suppliesOrder'

const SOURCES = [
  suppliesOrder,
  expenseSummary,
  invoiceCheck,
  budgetReport,
  paymentRun,
  pettyCash,
  performanceReport,
  savingsProposal,
  // Accounting
  journalEntries,
  booksJournals,
  booksSalesPurchases,
  booksBankRec,
  booksPayroll,
  booksMonthEndClose,
  bankReconciliation,
  depreciation,
  monthEnd,
  quarterCloseAdjustments,
  quarterCloseVariances,
  quarterCloseBoardPack,
  // IT Help Desk
  triageQueue,
  userReplies,
  recurringProblem,
  majorIncident,
  directoryJoiner,
  directoryLeaver,
  networkPrinting,
  networkIntranet,
  // Digital Marketing
  campaignMetrics,
  contentCalendar,
  abTest,
  quarterlyReport,
  socialLaunch,
  seoFixes,
  campaignBudget,
  funnelAnalysis,
  // Data Analysis
  cleanCustomers,
  salesSummary,
  surveyAnalysis,
  portfolioReview,
  studioCleaning,
  studioSql,
  studioDashboard,
  studioStatistics,
  churnClean,
  churnDashboard,
  churnFindings,
  // Software Development
  invoiceBug,
  timesheetValidation,
  workingDaysTests,
  billingReport,
  gitFirstFix,
  debugNaN,
  apiTesting,
]

/** Every text in a value with role names filled in for a department. */
function fillAll<T>(value: T, department: Department): T {
  if (typeof value === 'string') return fill(value, department) as T
  if (Array.isArray(value)) return value.map((v) => fillAll(v, department)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fillAll(v, department)]),
    ) as T
  }
  return value
}

/**
 * A task done in a professional tool: its starting file, model answer and
 * checks are checked against the tool's own schemas (defaults filled in).
 */
function withToolData(assignment: Assignment): Assignment {
  if (assignment.kind !== 'tool') return assignment
  const task = assignment.tool
  const tool = task && getTool(task.id)
  if (!task || !tool) throw new Error(`${assignment.id}: unknown tool ${task?.id}`)
  return {
    ...assignment,
    tool: {
      ...task,
      start: tool.state.parse(task.start),
      solution: tool.state.parse(task.solution),
      checks: task.checks.map((check) => tool.check.parse(check)),
    },
  }
}

export const ASSIGNMENTS: Assignment[] = SOURCES.map((source) => {
  const assignment = withToolData(AssignmentSchema.parse(source))
  // {manager}, {senior} and {director} become the names in this career's department.
  return fillAll(assignment, departmentFor(assignment.careerId))
}).sort((a, b) => a.order - b.order)

export function getAssignment(id: string): Assignment | undefined {
  return ASSIGNMENTS.find((assignment) => assignment.id === id)
}
