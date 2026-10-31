/** Helpers for tools' graders: turning a fraction of success into a check result. */
import type { CheckResult, CheckStatus } from '../game/grading'

export interface CheckInfo {
  id: string
  title: string
  why: string
  hint: string
  points: number
}

/** The result of a check that got `fraction` (0–1) right, with what is wrong. */
export function checkResult(
  check: CheckInfo,
  fraction: number,
  problems: string[],
): CheckResult {
  const earned = Math.round(check.points * Math.max(0, Math.min(1, fraction)))
  const status: CheckStatus =
    earned === check.points ? 'passed' : earned === 0 ? 'failed' : 'partial'
  return {
    id: check.id,
    title: check.title,
    why: check.why,
    hint: check.hint,
    status,
    earned,
    points: check.points,
    problems: status === 'passed' ? [] : problems.slice(0, 5),
  }
}

/** Money is compared to the penny. */
export function sameMoney(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005
}

export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}£${Math.abs(amount).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
