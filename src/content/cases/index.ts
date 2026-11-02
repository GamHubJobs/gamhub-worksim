/** The cases of the careers loaded so far (see `content/loader.ts`). */
import { fill, departmentFor } from '../departments'
import { CaseSchema, type Case, type CaseInput } from './schema'

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

/** Every case of the loaded careers. */
export const CASES: Case[] = []

/** Adds a career's cases (once), checked and with role names filled in. */
export function registerCases(sources: CaseInput[]): void {
  for (const source of sources) {
    const parsed = CaseSchema.parse(source)
    if (CASES.some((c) => c.id === parsed.id)) continue
    CASES.push(fillAll(parsed, parsed.careerId))
  }
}

export function getCase(id: string): Case | undefined {
  return CASES.find((c) => c.id === id)
}
