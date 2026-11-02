/**
 * The assignments of the careers loaded so far (see `content/loader.ts`), checked
 * against the content blueprint as each career's content is registered.
 */
import { departmentFor, fill, type Department } from '../departments'
import { getTool } from '../../tools/registry'
import { AssignmentSchema, type Assignment } from '../schemas'

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

/** Every assignment of the loaded careers, in order. */
export const ASSIGNMENTS: Assignment[] = []

/** Adds a career's assignments (once), checked and with role names filled in. */
export function registerAssignments(sources: unknown[]): void {
  for (const source of sources) {
    const assignment = withToolData(AssignmentSchema.parse(source))
    if (ASSIGNMENTS.some((a) => a.id === assignment.id)) continue
    // {manager}, {senior} and {director} become the names in this career's department.
    ASSIGNMENTS.push(fillAll(assignment, departmentFor(assignment.careerId)))
  }
  ASSIGNMENTS.sort((a, b) => a.order - b.order)
}

export function getAssignment(id: string): Assignment | undefined {
  return ASSIGNMENTS.find((assignment) => assignment.id === id)
}
