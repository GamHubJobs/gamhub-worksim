/**
 * Going to court from the office (a law career's hearings at Westmark County
 * Court, see court/): the journey there and back takes office time, and the
 * court only hears cases while it sits. Pure.
 */
import type { Scenario } from '../content/scenarios/types'
import type { ProfileData } from './career'
import { formatTime as clock } from './clock'
import { log, passTime } from './workday'

export const COURT_NAME = 'Westmark County Court'
/** Minutes each way between the office and the court. */
export const COURT_TRAVEL = 20
/** The court hears cases from and until (minutes since midnight). */
export const COURT_SITS: [number, number] = [10 * 60, 16 * 60]

/** Why the player cannot go to court now, or null. */
export function canGoToCourt(profile: ProfileData): string | null {
  const work = profile.work
  if (work.dayOver) return 'The working day is over.'
  const arrival = work.minute + COURT_TRAVEL
  if (arrival < COURT_SITS[0])
    return `The court sits from ${clock(COURT_SITS[0])}: leave after ${clock(COURT_SITS[0] - COURT_TRAVEL)}.`
  if (arrival >= COURT_SITS[1])
    return `The court has finished hearing cases for today (it sits until ${clock(COURT_SITS[1])}).`
  return null
}

/** Travels from the office to the court for a hearing. */
export function goToCourt(profile: ProfileData, scenario: Scenario): ProfileData {
  if (canGoToCourt(profile)) return profile
  const there = passTime(profile, COURT_TRAVEL, 'walk')
  return {
    ...there,
    work: log(
      there.work,
      `Went to ${COURT_NAME} for ${scenario.title.replace(/^At court: /, '')} (${COURT_TRAVEL} min)`,
    ),
  }
}

/** Travels back to the office. */
export function backFromCourt(profile: ProfileData): ProfileData {
  const back = passTime(profile, COURT_TRAVEL, 'walk')
  return {
    ...back,
    work: log(back.work, `Back at the office from court (${COURT_TRAVEL} min)`),
  }
}
