/** All assignments, checked against the content blueprint when the app starts. */
import { AssignmentSchema, type Assignment } from '../schemas'
import { suppliesOrder } from './suppliesOrder'

const SOURCES = [suppliesOrder]

export const ASSIGNMENTS: Assignment[] = SOURCES.map((source) =>
  AssignmentSchema.parse(source),
).sort((a, b) => a.order - b.order)

export function getAssignment(id: string): Assignment | undefined {
  return ASSIGNMENTS.find((assignment) => assignment.id === id)
}
