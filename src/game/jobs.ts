/**
 * The player's real job search, in their save (life.jobs): adverts saved and
 * shortlisted, how each application stands (as the player records it: the
 * game never applies for anything), notes, reminders, where they want to
 * work, and their own CV details. Dates are real calendar days (YYYY-MM-DD).
 */
import type { JobListing } from '../jobs/types'
import type { Life } from '../persistence/schemas'
import type { ProfileData } from './career'
import { withLife } from './lifeTime'

export type Jobs = Life['jobs']
export type SavedJob = Jobs['saved'][number]
export type JobStatus = SavedJob['status']
export type JobPrefs = Jobs['prefs']
export type CvDetails = Jobs['cv']

export const STATUS_NAMES: Record<JobStatus, string> = {
  saved: 'Saved',
  preparing: 'Preparing to apply',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Not successful',
  withdrawn: 'Withdrawn',
}

/** Finished with: no reminders for these. */
export const FINAL: JobStatus[] = ['offer', 'rejected', 'withdrawn']

export const MAX_SAVED = 200

/** Today's date where the player is, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function withJobs(profile: ProfileData, jobs: Jobs): ProfileData {
  return withLife(profile, { ...profile.work.life, jobs })
}

/** The advert, trimmed to what is kept in the save. */
export function snapshot(l: JobListing): SavedJob['listing'] {
  return {
    id: l.id.slice(0, 300),
    provider: l.provider,
    sourceId: l.sourceId.slice(0, 300),
    title: l.title.slice(0, 300),
    company: l.company.slice(0, 200),
    ...(l.logo && l.logo.length <= 1000 ? { logo: l.logo } : {}),
    location: l.location.slice(0, 300),
    countries: l.countries.slice(0, 60),
    regions: l.regions.slice(0, 10),
    worldwide: l.worldwide,
    ...(l.arrangement ? { arrangement: l.arrangement } : {}),
    employment: l.employment.slice(0, 10),
    ...(l.level ? { level: l.level } : {}),
    ...(l.salary ? { salary: { ...l.salary, text: l.salary.text.slice(0, 120) } } : {}),
    categories: l.categories.slice(0, 10).map((c) => c.slice(0, 80)),
    tags: l.tags.slice(0, 20).map((t) => t.slice(0, 60)),
    description:
      l.description.length > 2500 ? `${l.description.slice(0, 2499)}…` : l.description,
    posted: l.posted.slice(0, 40),
    ...(l.deadline ? { deadline: l.deadline.slice(0, 40) } : {}),
    url: l.url.slice(0, 2000),
  }
}

/** The saved advert back as a listing (for the same views as search results). */
export function asListing(s: SavedJob): JobListing {
  return s.listing as JobListing
}

export function isSaved(life: Pick<Life, 'jobs'>, id: string): boolean {
  return life.jobs.saved.some((s) => s.listing.id === id)
}

export function canSave(life: Pick<Life, 'jobs'>): boolean {
  return life.jobs.saved.length < MAX_SAVED
}

/** Saves an advert (once; the newest first). */
export function saveJob(
  profile: ProfileData,
  listing: JobListing,
  now = Date.now(),
): ProfileData {
  const jobs = profile.work.life.jobs
  if (isSaved(profile.work.life, listing.id) || !canSave(profile.work.life))
    return profile
  const saved: SavedJob = {
    listing: snapshot(listing),
    savedAt: now,
    shortlisted: false,
    status: 'saved',
    notes: '',
    closed: false,
  }
  return withJobs(profile, { ...jobs, saved: [saved, ...jobs.saved] })
}

export function removeJob(profile: ProfileData, id: string): ProfileData {
  const jobs = profile.work.life.jobs
  if (!isSaved(profile.work.life, id)) return profile
  return withJobs(profile, {
    ...jobs,
    saved: jobs.saved.filter((s) => s.listing.id !== id),
  })
}

export type JobChange = Partial<
  Pick<
    SavedJob,
    | 'status'
    | 'appliedOn'
    | 'notes'
    | 'remindOn'
    | 'remindWhat'
    | 'letter'
    | 'shortlisted'
  >
>

/** Changes what the player recorded about a saved job. */
export function updateJob(
  profile: ProfileData,
  id: string,
  change: JobChange,
  today: string = todayIso(),
): ProfileData {
  const jobs = profile.work.life.jobs
  if (!isSaved(profile.work.life, id)) return profile
  const saved = jobs.saved.map((s) => {
    if (s.listing.id !== id) return s
    const next: SavedJob = { ...s, ...change }
    // Marked as applied: on today, unless they said another day.
    if (change.status === 'applied' && !next.appliedOn) next.appliedOn = today
    // Cleared fields are left out, not saved empty.
    if (change.remindOn === '') {
      delete next.remindOn
      delete next.remindWhat
    }
    if (change.appliedOn === '') delete next.appliedOn
    if (next.notes.length > 4000) next.notes = next.notes.slice(0, 4000)
    if (next.letter && next.letter.length > 8000) next.letter = next.letter.slice(0, 8000)
    return next
  })
  return withJobs(profile, { ...jobs, saved })
}

/** Adverts their source says have closed (and when that was checked). */
export function markClosed(
  profile: ProfileData,
  closedIds: string[],
  checkedIds: string[],
  now = Date.now(),
): ProfileData {
  const jobs = profile.work.life.jobs
  const closed = new Set(closedIds)
  const checked = new Set(checkedIds)
  if (!checked.size) return profile
  const saved = jobs.saved.map((s) =>
    checked.has(s.listing.id)
      ? { ...s, closed: s.closed || closed.has(s.listing.id), checkedAt: now }
      : s,
  )
  return withJobs(profile, { ...jobs, saved })
}

export function setJobPrefs(profile: ProfileData, prefs: Partial<JobPrefs>): ProfileData {
  const jobs = profile.work.life.jobs
  return withJobs(profile, { ...jobs, prefs: { ...jobs.prefs, ...prefs } })
}

export function setCv(profile: ProfileData, cv: Partial<CvDetails>): ProfileData {
  const jobs = profile.work.life.jobs
  return withJobs(profile, { ...jobs, cv: { ...jobs.cv, ...cv } })
}

/** Reminders due today or earlier, for jobs still under way (soonest first). */
export function dueReminders(
  life: Pick<Life, 'jobs'>,
  today: string = todayIso(),
): SavedJob[] {
  return life.jobs.saved
    .filter((s) => s.remindOn && s.remindOn <= today && !FINAL.includes(s.status))
    .sort((a, b) => (a.remindOn! < b.remindOn! ? -1 : 1))
}

/** How many saved jobs are at each stage. */
export function pipeline(life: Pick<Life, 'jobs'>): Record<JobStatus, number> {
  const out = Object.fromEntries(Object.keys(STATUS_NAMES).map((k) => [k, 0])) as Record<
    JobStatus,
    number
  >
  for (const s of life.jobs.saved) out[s.status]++
  return out
}
