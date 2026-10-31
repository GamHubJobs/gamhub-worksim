/** All assignments, checked against the content blueprint when the app starts. */
import { AssignmentSchema, type Assignment } from '../schemas'
import { budgetReport } from './budgetReport'
import { expenseSummary } from './expenseSummary'
import { invoiceCheck } from './invoiceCheck'
import { paymentRun } from './paymentRun'
import { pettyCash } from './pettyCash'
import { suppliesOrder } from './suppliesOrder'

const SOURCES = [
  suppliesOrder,
  expenseSummary,
  invoiceCheck,
  budgetReport,
  paymentRun,
  pettyCash,
]

export const ASSIGNMENTS: Assignment[] = SOURCES.map((source) =>
  AssignmentSchema.parse(source),
).sort((a, b) => a.order - b.order)

export function getAssignment(id: string): Assignment | undefined {
  return ASSIGNMENTS.find((assignment) => assignment.id === id)
}
