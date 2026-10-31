/** All assignments, checked against the content blueprint when the app starts. */
import { AssignmentSchema, type Assignment } from '../schemas'
import { expenseSummary } from './expenseSummary'
import { invoiceCheck } from './invoiceCheck'
import { suppliesOrder } from './suppliesOrder'

const SOURCES = [suppliesOrder, expenseSummary, invoiceCheck]

export const ASSIGNMENTS: Assignment[] = SOURCES.map((source) =>
  AssignmentSchema.parse(source),
).sort((a, b) => a.order - b.order)

export function getAssignment(id: string): Assignment | undefined {
  return ASSIGNMENTS.find((assignment) => assignment.id === id)
}
