/**
 * Career readiness assessments: a practical piece of work showing whether the
 * player can handle the responsibilities of their current level (see
 * `game/assessments.ts`). Each career's assessments live in its own file and
 * are registered when the career's content loads (see `content/loader.ts`).
 *
 * Every assessment comes in two versions with different figures and details,
 * built from parameters so that every figure, explanation and check agrees.
 * These are simulated workplace assessments, not qualifications.
 */
import { CaseSchema, type Case, type CaseInput } from '../cases/schema'
import { departmentFor, fill } from '../departments'

/** Every text with role names filled in for the career's department. */
function fillAll(def: Case): Case {
  const department = departmentFor(def.careerId)
  const walk = (v: unknown): unknown =>
    typeof v === 'string'
      ? fill(v, department)
      : Array.isArray(v)
        ? v.map(walk)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
          : v
  return walk(def) as Case
}

/** The versions of each assessment of the loaded careers, by ID; labelled "a", "b"… */
export const ASSESSMENT_VERSIONS: Record<string, Case[]> = {}

export const VERSION_IDS = ['a', 'b'] as const

/** The first version of each assessment of the loaded careers. */
export const ASSESSMENTS: Case[] = []

/** Adds a career's assessments (once), checked and with role names filled in. */
export function registerAssessments(sources: Record<string, CaseInput[]>): void {
  for (const [id, versions] of Object.entries(sources)) {
    if (ASSESSMENT_VERSIONS[id]) continue
    const parsed = versions.map((v) => fillAll(CaseSchema.parse(v)))
    ASSESSMENT_VERSIONS[id] = parsed
    ASSESSMENTS.push(parsed[0])
  }
}

export function getAssessment(id: string, version = 'a'): Case | undefined {
  const versions = ASSESSMENT_VERSIONS[id]
  if (!versions) return undefined
  const index = VERSION_IDS.indexOf(version as (typeof VERSION_IDS)[number])
  return versions[index >= 0 ? index : 0]
}
