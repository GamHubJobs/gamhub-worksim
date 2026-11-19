/**
 * Jobicy (jobicy.com): remote jobs from the last seven days, free and without a
 * key (https://jobicy.com/jobs-rss-feed). Its terms: credit Jobicy with a link
 * (on every advert) and keep the apply link pointing at the job on Jobicy. It
 * filters by where applicants may live (a country it lists, or EMEA, APAC,
 * LATAM) and by industry; at most one request a second, answers kept an hour.
 * It also says whether an advert has closed (`statusUrl`).
 */
import { jobicyGeo, readWhere } from '../geo'
import { htmlToText, oneLine, safeUrl } from '../text'
import type { JobListing } from '../types'
import {
  employmentFrom,
  isoDate,
  levelFrom,
  salaryFrom,
  strings,
  type Provider,
} from './common'

export const jobicy: Provider = {
  id: 'jobicy',
  name: 'Jobicy',
  home: 'https://jobicy.com',
  coverage:
    'Remote jobs from the last 7 days, filtered by where applicants may live (many countries, or EMEA, APAC and Latin America).',
  remoteOnly: true,
  cacheMinutes: 60,
  gapMs: 1_100,
  timeoutMs: 25_000,
  enabled: () => true,
  relevant: (q) => q.arrangements.length === 0 || q.arrangements.includes('remote'),
  requests(q, field) {
    const params = new URLSearchParams({ count: '100' })
    const geo = jobicyGeo(q.country)
    if (geo) params.set('geo', geo)
    if (field?.jobicy && !q.keywords.trim()) params.set('industry', field.jobicy)
    // Its word search takes 3 to 50 characters.
    const words = q.keywords.trim().slice(0, 50)
    if (words.length >= 3) params.set('tag', words)
    return [`https://jobicy.com/api/jobs?${params}`]
  },
  parse(body) {
    const jobs = (body as { jobs?: unknown })?.jobs
    // No adverts for a filter comes back without a list.
    if (jobs === undefined && (body as { success?: unknown })?.success === false)
      return []
    if (!Array.isArray(jobs)) throw new Error('Jobicy sent something unexpected')
    return jobs.flatMap((raw): JobListing[] => {
      const j = raw as Record<string, unknown>
      const url = safeUrl(j.url)
      const title = oneLine(j.jobTitle)
      const id = j.id === undefined ? '' : String(j.id)
      if (!url || !title || !id) return []
      const location = oneLine(j.jobGeo)
      const where = readWhere(location)
      return [
        {
          id: `jobicy:${id}`,
          provider: 'jobicy',
          sourceId: id,
          title,
          company: oneLine(j.companyName) || 'Company not named',
          logo: safeUrl(j.companyLogo),
          location: location || 'Remote',
          countries: where.countries,
          regions: where.regions,
          worldwide: where.worldwide,
          arrangement: 'remote',
          employment: employmentFrom(strings(j.jobType)),
          level: levelFrom(
            typeof j.jobLevel === 'string' ? j.jobLevel : undefined,
            title,
          ),
          salary: salaryFrom(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod),
          categories: strings(j.jobIndustry).map((c) => oneLine(c)),
          tags: [],
          description: htmlToText(String(j.jobDescription ?? j.jobExcerpt ?? '')),
          posted: isoDate(j.pubDate),
          url,
        },
      ]
    })
  },
}

/** Whether Jobicy adverts are still open (up to 100 at a time; free). */
export function jobicyStatusUrl(ids: string[]): string {
  return `https://jobicy.com/api/jobs/status?ids=${ids.slice(0, 100).map(encodeURIComponent).join(',')}`
}

/** Its answer: the adverts that have closed. */
export function closedJobicy(body: unknown): string[] {
  const jobs = (body as { jobs?: unknown })?.jobs
  if (!Array.isArray(jobs)) return []
  return jobs.flatMap((j) => {
    const r = j as { id?: unknown; status?: unknown }
    return r.status === 'closed' && r.id !== undefined ? [String(r.id)] : []
  })
}
