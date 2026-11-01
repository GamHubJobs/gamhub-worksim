/**
 * The programme board: where every department's workstream stands. The
 * player's own workstream follows their programme cases; the others are
 * delivered by simulated colleagues as the working days pass.
 */
import { getCase, CASES } from '../content/cases'
import { getOrgDepartment } from '../content/organisation'
import { PROGRAMME } from '../content/programme'
import type { ProfileData } from './career'

export type WorkstreamStatus = 'not started' | 'in progress' | 'delivered' | 'done'

export interface BoardRow {
  department: string
  title: string
  owner: string
  delivers: string
  status: WorkstreamStatus
  /** True for the player's own workstream. */
  yours: boolean
}

/** The day the programme started for this career save (its first case arrived). */
export function programmeStartDay(profile: ProfileData): number | null {
  const arrivals = Object.values(profile.work.cases)
    .filter((c) => getCase(c.caseId)?.kind === 'programme')
    .map((c) => Math.floor(c.arrivedAt / (24 * 60)) + 1)
  return arrivals.length > 0 ? Math.min(...arrivals) : null
}

export function programmeBoard(profile: ProfileData): BoardRow[] {
  const start = programmeStartDay(profile)
  const own = CASES.filter(
    (c) => c.kind === 'programme' && c.careerId === profile.careerId,
  )
  return PROGRAMME.workstreams.map((w) => {
    const yours = 'careerId' in w && w.careerId === profile.careerId
    let status: WorkstreamStatus
    if (yours) {
      const done = own.filter(
        (c) => profile.work.cases[c.id]?.status === 'submitted',
      ).length
      const arrived = own.some((c) => profile.work.cases[c.id])
      status =
        done === own.length
          ? 'done'
          : done > 0
            ? 'delivered'
            : arrived
              ? 'in progress'
              : 'not started'
    } else if (start === null) {
      status = 'not started'
    } else {
      status = profile.work.day - start >= w.doneAfterDays ? 'done' : 'in progress'
    }
    return {
      department: getOrgDepartment(w.department)?.name ?? w.department,
      title: w.title,
      owner: yours ? 'You' : w.owner,
      delivers: w.delivers,
      status,
      yours,
    }
  })
}
