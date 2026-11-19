/**
 * Real-world job discovery (docs/JOBS.md): vacancies from public job feeds,
 * shown in the Jobs app on the work computer and the phone. Everything here is
 * a real advert from a named source, with its own link to apply; nothing is
 * made up, and nothing is ever applied for on the player's behalf.
 */

/** The job feeds the game can read (see providers/). */
export type ProviderId = 'remotive' | 'jobicy' | 'remoteok' | 'arbeitnow' | 'adzuna'

export type Arrangement = 'remote' | 'hybrid' | 'onsite'

export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'temporary'
  | 'internship'
  | 'freelance'
  | 'apprenticeship'

/** How senior: as the advert says, or read from its title. */
export type Level = 'internship' | 'graduate' | 'entry' | 'mid' | 'senior' | 'lead'

/** Only ever what the advert says: never estimated by the game. */
export interface Salary {
  min?: number
  max?: number
  currency?: string
  period?: 'year' | 'month' | 'week' | 'day' | 'hour'
  /** As shown in the advert, e.g. "$170k - $200k". */
  text: string
}

export interface JobListing {
  /** `${provider}:${sourceId}`, unique across feeds. */
  id: string
  provider: ProviderId
  sourceId: string
  title: string
  company: string
  logo?: string
  /** Where, as the advert puts it ("Berlin", "USA, Canada", "Worldwide"); '' if not said. */
  location: string
  /** Countries it is open to (ISO 3166 codes), where the advert says. */
  countries: string[]
  /** Regions it is open to, where the advert says (see geo.ts). */
  regions: string[]
  /** Open to applicants anywhere (a remote job with no country limit stated). */
  worldwide: boolean
  arrangement?: Arrangement
  employment: EmploymentType[]
  level?: Level
  salary?: Salary
  /** The feed's own categories (industry, department). */
  categories: string[]
  tags: string[]
  /** The advert's text, as plain paragraphs (its HTML is never put on the page). */
  description: string
  /** When it was published (ISO date-time). */
  posted: string
  /** The closing date, where the advert gives one. */
  deadline?: string
  /** The original advert, where the player reads it in full and applies. */
  url: string
}

/** What the player is looking for. */
export interface JobQuery {
  /** Job title, profession, company or keywords. */
  keywords: string
  /** Where they want to work (ISO country code), or '' for anywhere. */
  country: string
  /** A town or city, for feeds that search by place. */
  place: string
  /** Kilometres around the place, for feeds that support it. */
  radiusKm: number
  /** Remote, hybrid, on-site: those wanted ([] = all). */
  arrangements: Arrangement[]
  /** Only remote jobs open to someone living in this country (ISO), '' for any. */
  livingIn: string
  employment: EmploymentType[]
  levels: Level[]
  /** A career's field (see careerSearch.ts), or '' for all. */
  field: string
  /** Lowest yearly pay wanted, in the advert's own currency (adverts without pay are kept). */
  minSalary: number
  /** Published in the last so many days (0 = any time). */
  postedWithinDays: number
}

export const EMPTY_QUERY: JobQuery = {
  keywords: '',
  country: '',
  place: '',
  radiusKm: 25,
  arrangements: [],
  livingIn: '',
  employment: [],
  levels: [],
  field: '',
  minSalary: 0,
  postedWithinDays: 0,
}

/** How a feed's request went, for the "sources" line under the results. */
export interface SourceStatus {
  provider: ProviderId
  state: 'ok' | 'cached' | 'error' | 'skipped' | 'waiting'
  /** How many adverts it gave (before filtering). */
  count: number
  /** For errors and skipped feeds: why, in plain words. */
  note?: string
  /** When its adverts were fetched (ms since 1970). */
  fetchedAt?: number
}
