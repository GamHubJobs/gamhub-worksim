/**
 * Going to the construction site in person: the journey takes office time,
 * the site works in working hours, and what the engineer does there (measure,
 * talk to the team, watch the work) takes time too. Inspections can only be
 * measured on site. Pure.
 */
import { HOURS } from '../content/workday'
import type { ProfileData } from '../game/career'
import { formatTime } from '../game/clock'
import { log, passTime } from '../game/workday'
import { getBrief } from './briefs'
import { engineeringOf, measureItem, projectOf } from './engine'

/** Minutes each way between the office and each site. */
export const SITE_TRAVEL: Record<string, number> = {
  'yard-store': 3,
  'mill-footbridge': 25,
  'workshop-office': 20,
}

/** How long measuring one inspection item takes (minutes). */
export const MEASURE_MINUTES = 4

export function travelTo(id: string): number {
  return SITE_TRAVEL[id] ?? 15
}

/** Where the player is: on which site, or null in the office. */
export function onSite(profile: ProfileData): string | null {
  return engineeringOf(profile).onSite
}

/** Why the player cannot go to the site now, or null. */
export function canGoToSite(profile: ProfileData, id: string): string | null {
  const work = profile.work
  const project = projectOf(profile, id)
  if (!project || project.status !== 'construction')
    return 'Work has not started on site.'
  if (work.dayOver) return 'The working day is over.'
  if (onSite(profile)) return 'You are already on site.'
  const arrival = work.minute + travelTo(id)
  if (arrival >= HOURS.end)
    return `The site closes at ${formatTime(HOURS.end)}: there is not time to get there today.`
  return null
}

function setOnSite(profile: ProfileData, id: string | null): ProfileData {
  const e = engineeringOf(profile)
  return { ...profile, work: { ...profile.work, engineering: { ...e, onSite: id } } }
}

export function goToSite(profile: ProfileData, id: string): ProfileData {
  if (canGoToSite(profile, id)) return profile
  const brief = getBrief(id)!
  const minutes = travelTo(id)
  const there = setOnSite(passTime(profile, minutes, 'walk'), id)
  return {
    ...there,
    work: log(
      there.work,
      `Went to the ${brief.title.toLowerCase()} site (${minutes} min)`,
    ),
  }
}

export function backFromSite(profile: ProfileData): ProfileData {
  const id = onSite(profile)
  if (!id) return profile
  const minutes = travelTo(id)
  const back = setOnSite(passTime(profile, minutes, 'walk'), null)
  return {
    ...back,
    work: log(back.work, `Back at the office from site (${minutes} min)`),
  }
}

/** Watching the work for a while (the site moves on with the clock). */
export function watchWork(profile: ProfileData, minutes = 30): ProfileData {
  if (!onSite(profile)) return profile
  return passTime(profile, minutes, 'work')
}

/** Measures an inspection item on site: takes a few minutes. */
export function measureOnSite(
  profile: ProfileData,
  inspection: string,
  item: string,
): ProfileData {
  const id = onSite(profile)
  if (!id) return profile
  const measured = measureItem(profile, id, inspection, item)
  if (measured === profile) return profile
  return passTime(measured, MEASURE_MINUTES, 'work')
}
