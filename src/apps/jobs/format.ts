/** Words for showing adverts in the Jobs app. */
import { countryName } from '../../jobs/geo'
import type { Arrangement, EmploymentType, JobListing, Level } from '../../jobs/types'

export const ARRANGEMENT_NAMES: Record<Arrangement, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On site',
}

export const EMPLOYMENT_NAMES: Record<EmploymentType, string> = {
  'full-time': 'Full time',
  'part-time': 'Part time',
  contract: 'Contract',
  temporary: 'Temporary',
  internship: 'Internship',
  freelance: 'Freelance',
  apprenticeship: 'Apprenticeship / trainee',
}

export const LEVEL_NAMES: Record<Level, string> = {
  internship: 'Internship',
  graduate: 'Graduate / trainee',
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior',
  lead: 'Lead / manager',
}

/** "today", "yesterday", "3 days ago", "12 Oct 2026". */
export function postedAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso)
  if (!t) return 'date not given'
  const days = Math.floor((now - t) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(t).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** A real calendar day (YYYY-MM-DD) for reading: "Thu 19 Nov 2026". */
export function dayName(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "fetched 5 minutes ago" for the sources line. */
export function fetchedAgo(at: number | undefined, now: number = Date.now()): string {
  if (!at) return ''
  const minutes = Math.round((now - at) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'} ago`
}

/** Where, in short: "Remote · open to EMEA" or "Berlin · On site". */
export function whereText(l: JobListing): string {
  const how = l.arrangement ? ARRANGEMENT_NAMES[l.arrangement] : ''
  if (l.arrangement === 'remote') {
    const open = l.worldwide
      ? 'open worldwide'
      : l.location && l.location !== 'Remote'
        ? `from ${l.location}`
        : 'where applicants may live not stated'
    return `${how} · ${open}`
  }
  const place =
    l.location || l.countries.map(countryName).join(', ') || 'place not stated'
  return how ? `${place} · ${how}` : place
}
