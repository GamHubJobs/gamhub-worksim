/**
 * Career content is loaded on demand: the app starts with what every career
 * shares (careers, departments, the office, tools) and loads a career's own
 * tasks, cases and readiness assessments when a save of that career is
 * opened. Each career is loaded once; a failed load can be tried again.
 */
import { registerAssignments } from './assignments'
import { registerAssessments } from './assessments'
import { registerCases } from './cases'
import type { CaseInput } from './cases/schema'

export interface CareerPack {
  careerId: string
  assignments: unknown[]
  cases: CaseInput[]
  assessments: Record<string, CaseInput[]>
}

const PACKS: Record<string, () => Promise<{ PACK: CareerPack }>> = {
  'office-admin-finance': () => import('./packs/finance'),
  accounting: () => import('./packs/accounting'),
  'it-support': () => import('./packs/it'),
  'digital-marketing': () => import('./packs/marketing'),
  'data-analytics': () => import('./packs/data'),
  'software-development': () => import('./packs/dev'),
  healthcare: () => import('./packs/healthcare'),
  legal: () => import('./packs/legal'),
}

export const CAREER_IDS = Object.keys(PACKS)

const loading = new Map<string, Promise<void>>()
const loaded = new Set<string>()

/** Adds a career's content to the registries (used by the loader, and by tests). */
export function registerCareerPack(pack: CareerPack): void {
  registerAssignments(pack.assignments)
  registerCases(pack.cases)
  registerAssessments(pack.assessments)
  loaded.add(pack.careerId)
}

export function isCareerLoaded(careerId: string): boolean {
  return loaded.has(careerId)
}

/** Loads a career's content (once). Rejects if it cannot be loaded; calling again retries. */
export function loadCareerContent(careerId: string): Promise<void> {
  const load = PACKS[careerId]
  if (!load) return Promise.reject(new Error(`There is no career called “${careerId}”.`))
  let promise = loading.get(careerId)
  if (!promise) {
    promise = load().then(
      ({ PACK }) => registerCareerPack(PACK),
      (error: unknown) => {
        // Forget the failure, so the next attempt tries again.
        loading.delete(careerId)
        throw error
      },
    )
    loading.set(careerId, promise)
  }
  return promise
}

/** Loads the content of several careers. */
export async function loadCareers(careerIds: Iterable<string>): Promise<void> {
  await Promise.all([...new Set(careerIds)].map(loadCareerContent))
}

export function loadAllCareerContent(): Promise<void> {
  return loadCareers(CAREER_IDS)
}
