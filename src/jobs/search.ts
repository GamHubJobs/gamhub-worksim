/**
 * A search across the job feeds: each feed that has something for the search
 * is asked (or its kept answer used), their adverts are put together, the same
 * job advertised twice is shown once, and the player's filters are applied.
 * The filters are the player's own: nothing is hidden for any other reason.
 */
import { feed, FeedError } from './feeds'
import { fieldFit, getField, hasPhrase, type Field } from './fields'
import { openTo } from './geo'
import { PROVIDERS, type Provider } from './providers'
import { words } from './text'
import type { JobListing, JobQuery, SourceStatus } from './types'

export interface SearchResult {
  listings: JobListing[]
  sources: SourceStatus[]
}

/** The feeds asked for this search, and those left out and why. */
export function feedsFor(
  query: JobQuery,
  providers: Provider[] = PROVIDERS,
): { use: Provider[]; skipped: SourceStatus[] } {
  const use: Provider[] = []
  const skipped: SourceStatus[] = []
  for (const p of providers) {
    if (!p.enabled())
      skipped.push({
        provider: p.id,
        state: 'skipped',
        count: 0,
        note: 'not set up here (needs the jobs proxy)',
      })
    else if (!p.relevant(query))
      skipped.push({
        provider: p.id,
        state: 'skipped',
        count: 0,
        note: p.remoteOnly ? 'remote jobs only' : 'has no jobs for this country',
      })
    else use.push(p)
  }
  return { use, skipped }
}

/** Asks the feeds and puts their adverts together (then `filterJobs`). */
export async function searchJobs(
  query: JobQuery,
  options: {
    fresh?: boolean
    fetch?: typeof fetch
    providers?: Provider[]
    /** The results so far, each time a feed answers (a slow feed holds up none of the others). */
    onPartial?: (result: SearchResult) => void
  } = {},
): Promise<SearchResult> {
  const field = getField(query.field)
  const { use, skipped } = feedsFor(query, options.providers)
  const done: Array<{ listings: JobListing[]; status: SourceStatus }> = []
  const pending = (p: Provider): SourceStatus => ({
    provider: p.id,
    state: 'waiting',
    count: 0,
  })
  const combine = (answered: typeof done): SearchResult => ({
    listings: filterJobs(dedupe(answered.flatMap((a) => a.listings)), query, field),
    sources: [
      ...use.map(
        (p) => answered.find((a) => a.status.provider === p.id)?.status ?? pending(p),
      ),
      ...skipped,
    ],
  })
  const asked = await Promise.all(
    use.map(async (p): Promise<{ listings: JobListing[]; status: SourceStatus }> => {
      const answer = await askOne(p)
      done.push(answer)
      if (done.length < use.length) options.onPartial?.(combine(done))
      return answer
    }),
  )
  return combine(asked)

  async function askOne(
    p: Provider,
  ): Promise<{ listings: JobListing[]; status: SourceStatus }> {
    try {
      const answers = await Promise.all(
        p
          .requests(query, field?.terms)
          .map((url) => feed(p, url, { fresh: options.fresh, fetch: options.fetch })),
      )
      const listings = answers.flatMap((a) => a.listings)
      const fetchedAt = Math.min(...answers.map((a) => a.fetchedAt))
      const stale = Date.now() - fetchedAt > p.cacheMinutes * 60_000
      return {
        listings,
        status: {
          provider: p.id,
          state: answers.every((a) => a.fromCache) ? 'cached' : 'ok',
          count: listings.length,
          fetchedAt,
          ...(stale
            ? { note: 'could not be refreshed: showing what it gave earlier' }
            : {}),
        },
      }
    } catch (e) {
      return {
        listings: [],
        status: {
          provider: p.id,
          state: 'error',
          count: 0,
          note: e instanceof FeedError ? e.message : 'could not be read',
        },
      }
    }
  }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(
      /\b(m\/w\/d|w\/m\/d|f\/m\/x|m\/f\/d|\(all genders\)|gmbh|inc\.?|ltd\.?|llc|ag|se)\b/g,
      '',
    )
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/**
 * The same job from two feeds (or twice in one) shown once: the same title at
 * the same company. The fuller advert is kept (with pay, the longer text).
 */
export function dedupe(listings: JobListing[]): JobListing[] {
  const best = new Map<string, JobListing>()
  for (const l of listings) {
    const key = `${norm(l.title)}|${norm(l.company)}`
    const had = best.get(key)
    if (!had) best.set(key, l)
    else if (
      (!had.salary && l.salary) ||
      (!!had.salary === !!l.salary && l.description.length > had.description.length * 1.5)
    )
      best.set(key, l)
  }
  return [...best.values()]
}

/** A yearly figure for comparing pay within one currency (never shown). */
function yearly(l: JobListing): number {
  const s = l.salary
  const n = s?.max ?? s?.min ?? 0
  const times = { year: 1, month: 12, week: 52, day: 230, hour: 1800 }[
    s?.period ?? 'year'
  ]
  return n * times
}

/** The player's filters, applied (see JobQuery). */
export function filterJobs(
  listings: JobListing[],
  query: JobQuery,
  field: Field | undefined = getField(query.field),
  now: number = Date.now(),
): JobListing[] {
  const terms = words(query.keywords).filter((w) => w.length > 1)
  const place = query.place.trim().toLowerCase()
  const cutoff =
    query.postedWithinDays > 0 ? now - query.postedWithinDays * 86_400_000 : 0
  return listings.filter((l) => {
    if (terms.length) {
      const head =
        `${l.title} ${l.company} ${l.tags.join(' ')} ${l.categories.join(' ')}`.toLowerCase()
      const body = l.description.toLowerCase()
      // Every word, in the title, company or tags; or the whole phrase in the text.
      if (
        !terms.every((t) => head.includes(t)) &&
        !(
          body.includes(query.keywords.trim().toLowerCase()) &&
          terms.some((t) => head.includes(t))
        )
      )
        return false
    }
    if (field && fieldFit(field, l.title, l.categories) <= 0) return false
    if (
      query.arrangements.length &&
      !(l.arrangement && query.arrangements.includes(l.arrangement))
    )
      return false
    if (query.country) {
      // On site: in the country. Remote: open to someone living there.
      const c = query.country.toUpperCase()
      if (l.arrangement === 'remote') {
        if (!openTo(l, c)) return false
      } else if (!l.countries.includes(c)) return false
    }
    if (
      place &&
      l.arrangement !== 'remote' &&
      !hasPhrase(l.location.toLowerCase(), place) &&
      l.provider !== 'adzuna'
    )
      return false
    if (
      query.employment.length &&
      !l.employment.some((e) => query.employment.includes(e))
    )
      return false
    if (query.levels.length && !(l.level && query.levels.includes(l.level))) return false
    if (query.minSalary > 0 && (!l.salary || yearly(l) < query.minSalary)) return false
    if (cutoff && !(Date.parse(l.posted) >= cutoff)) return false
    return true
  })
}

/** Newest first (adverts with no date last). */
export function newestFirst(listings: JobListing[]): JobListing[] {
  return [...listings].sort(
    (a, b) => (Date.parse(b.posted) || 0) - (Date.parse(a.posted) || 0),
  )
}

/**
 * Best match for words searched: the words in the title first, then in the
 * tags and categories, then only in the text; newest first within each.
 */
export function bestFirst(listings: JobListing[], keywords: string): JobListing[] {
  const terms = words(keywords).filter((w) => w.length > 1)
  if (!terms.length) return listings
  const rank = (l: JobListing) => {
    const title = l.title.toLowerCase()
    const head = `${l.tags.join(' ')} ${l.categories.join(' ')}`.toLowerCase()
    if (terms.every((t) => title.includes(t))) return 0
    if (terms.some((t) => title.includes(t))) return 1
    if (terms.some((t) => head.includes(t))) return 2
    return 3
  }
  return [...listings]
    .map((l) => ({ l, r: rank(l), t: Date.parse(l.posted) || 0 }))
    .sort((a, b) => a.r - b.r || b.t - a.t)
    .map((x) => x.l)
}
