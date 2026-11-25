/**
 * Grading a patient-case task from the saved attempts. Kept apart from the
 * case library and the engine, because Ward Systems' definition (loaded for
 * every career) needs it.
 */
import { getAction } from './actions'
import type { Difficulty } from './model'
import type { CasesState } from './schema'

export const DIFF_RANK: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
}

export interface CaseCheckResult {
  fraction: number
  problems: string[]
}

/** Grades "pass this case at this difficulty or harder" from the saved attempts (light: no case library). */
export function gradeAttempts(
  cases: CasesState | undefined,
  caseId: string,
  difficulty: Difficulty,
  title: string,
): CaseCheckResult {
  const attempts = (cases?.attempts ?? []).filter(
    (a) => a.caseId === caseId && DIFF_RANK[a.difficulty] >= DIFF_RANK[difficulty],
  )
  if (!attempts.length)
    return {
      fraction: 0,
      problems: [
        `The patient case "${title}" has not been completed at ${difficulty} level or harder.`,
      ],
    }
  if (attempts.some((a) => a.passed)) return { fraction: 1, problems: [] }
  const best = attempts.reduce((b, a) => (a.score > b.score ? a : b))
  const missed = best.criticalMissed.map((id) => getAction(id)?.label ?? id)
  const harmful = best.harmful.map((id) => getAction(id)?.label ?? id)
  return {
    fraction: Math.min(0.6, best.score / 100),
    problems: [
      `Best attempt at "${title}": ${best.score}%, not yet a pass.`,
      ...harmful.map((h) => `Harmful: ${h}.`),
      ...missed.map((m) => `Missed: ${m}.`),
    ],
  }
}
