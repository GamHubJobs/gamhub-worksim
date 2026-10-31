/** All assignments, checked against the content blueprint when the app starts. */
import { departmentFor, fill, type Department } from '../departments'
import { AssignmentSchema, type Assignment } from '../schemas'
import { bankReconciliation } from './accounting/bankReconciliation'
import { depreciation } from './accounting/depreciation'
import { journalEntries } from './accounting/journalEntries'
import { monthEnd } from './accounting/monthEnd'
import { cleanCustomers } from './data/cleanCustomers'
import { portfolioReview } from './data/portfolioReview'
import { salesSummary } from './data/salesSummary'
import { surveyAnalysis } from './data/surveyAnalysis'
import { billingReport } from './dev/billingReport'
import { invoiceBug } from './dev/invoiceBug'
import { timesheetValidation } from './dev/timesheetValidation'
import { workingDaysTests } from './dev/workingDaysTests'
import { majorIncident } from './it/majorIncident'
import { abTest } from './marketing/abTest'
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
  bankReconciliation,
  depreciation,
  monthEnd,
  // IT Help Desk
  triageQueue,
  userReplies,
  recurringProblem,
  majorIncident,
  // Digital Marketing
  campaignMetrics,
  contentCalendar,
  abTest,
  quarterlyReport,
  // Data Analysis
  cleanCustomers,
  salesSummary,
  surveyAnalysis,
  portfolioReview,
  // Software Development
  invoiceBug,
  timesheetValidation,
  workingDaysTests,
  billingReport,
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

export const ASSIGNMENTS: Assignment[] = SOURCES.map((source) => {
  const assignment = AssignmentSchema.parse(source)
  // {manager}, {senior} and {director} become the names in this career's department.
  return fillAll(assignment, departmentFor(assignment.careerId))
}).sort((a, b) => a.order - b.order)

export function getAssignment(id: string): Assignment | undefined {
  return ASSIGNMENTS.find((assignment) => assignment.id === id)
}
