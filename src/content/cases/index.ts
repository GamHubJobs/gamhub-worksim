/** All cases, checked against the case blueprint when the app starts. */
import { fill, departmentFor } from '../departments'
import { CaseSchema, type Case, type CaseInput } from './schema'
import { FINANCE_CASES } from './finance'

const SOURCES: CaseInput[] = [...FINANCE_CASES]

/** Every text with role names filled in for the case's department. */
function fillAll<T>(value: T, careerId: string): T {
  const department = departmentFor(careerId)
  const walk = (v: unknown): unknown =>
    typeof v === 'string'
      ? fill(v, department)
      : Array.isArray(v)
        ? v.map(walk)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
          : v
  return walk(value) as T
}

export const CASES: Case[] = SOURCES.map((source) => {
  const parsed = CaseSchema.parse(source)
  return fillAll(parsed, parsed.careerId)
})

export function getCase(id: string): Case | undefined {
  return CASES.find((c) => c.id === id)
}
