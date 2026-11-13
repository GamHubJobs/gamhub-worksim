/**
 * The legal rules Matter Desk uses, for one FICTIONAL jurisdiction: the
 * Commonwealth of Westmark. Everything here is invented and simplified for
 * learning; none of it is the law of any real country, and none of it is
 * legal advice.
 *
 * Kept in this one module so the game can later be localised to a real
 * jurisdiction (for example The Gambia), but only with rules checked
 * against verified, current sources by a qualified person. Never add a
 * real jurisdiction's rules here from memory.
 */

export interface Jurisdiction {
  id: string
  name: string
  /** Shown on every screen. */
  disclaimer: string
  courts: { first: string; appeal: string }
  /** Days to file a defence after a claim is served (calendar days). */
  defenceDays: number
  /** Days to file an appeal after judgment (calendar days). */
  appealDays: number
  /** Years to bring a claim, by kind. */
  limitationYears: Record<'contract' | 'negligence' | 'employment', number>
  /** Deadlines falling on a Saturday or Sunday move to the next Monday. */
  weekendRolls: boolean
  /** Public holidays (deadlines on these move to the next working day). */
  holidays: string[]
  /** The billing unit, in minutes. */
  billingUnitMinutes: number
}

export const WESTMARK: Jurisdiction = {
  id: 'westmark',
  name: 'Commonwealth of Westmark (fictional)',
  disclaimer:
    'Simulation: Westmark is a fictional jurisdiction with simplified, invented rules. This is not the law of any real country and not legal advice.',
  courts: { first: 'Westmark District Court', appeal: 'Westmark Court of Appeal' },
  defenceDays: 21,
  appealDays: 28,
  limitationYears: { contract: 6, negligence: 3, employment: 1 },
  weekendRolls: true,
  holidays: ['2026-04-03', '2026-04-06', '2026-05-04', '2026-12-25', '2026-12-28'],
  billingUnitMinutes: 6,
}

/** Adds days to an ISO date (YYYY-MM-DD). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The deadline: `days` after `from`, moved past weekends and holidays. */
export function deadline(from: string, days: number, j: Jurisdiction = WESTMARK): string {
  let d = addDays(from, days)
  for (let guard = 0; guard < 10; guard++) {
    const day = new Date(`${d}T12:00:00Z`).getUTCDay()
    const weekend = j.weekendRolls && (day === 0 || day === 6)
    if (!weekend && !j.holidays.includes(d)) break
    d = addDays(d, 1)
  }
  return d
}

/** The last day to bring a claim of this kind, from the date it arose. */
export function limitationDate(
  arose: string,
  kind: keyof Jurisdiction['limitationYears'],
  j: Jurisdiction = WESTMARK,
): string {
  const [y, m, d] = arose.split('-').map(Number)
  const years = j.limitationYears[kind]
  return `${y + years}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Minutes rounded up to the billing unit, as hours (e.g. 14 minutes → 0.3 h). */
export function billableHours(minutes: number, j: Jurisdiction = WESTMARK): number {
  const units = Math.ceil(minutes / j.billingUnitMinutes)
  return Math.round(((units * j.billingUnitMinutes) / 60) * 10) / 10
}
