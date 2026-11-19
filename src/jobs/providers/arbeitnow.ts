/**
 * Arbeitnow (arbeitnow.com): jobs in Germany and nearby, on site and remote,
 * from employers' own hiring systems; free and without a key
 * (https://www.arbeitnow.com/blog/job-board-api). It asks not to be overused
 * and appreciates a link back (every advert links to it); answers are kept
 * for six hours. Many adverts are in German.
 */
import { readWhere } from '../geo'
import { htmlToText, oneLine, safeUrl } from '../text'
import type { JobListing } from '../types'
import { employmentFrom, isoDate, levelFrom, strings, type Provider } from './common'

/** Where it has on-site jobs (and remote ones open more widely). */
const NEAR = new Set(['', 'DE', 'AT', 'CH'])

export const arbeitnow: Provider = {
  id: 'arbeitnow',
  name: 'Arbeitnow',
  home: 'https://www.arbeitnow.com',
  coverage:
    'Jobs in Germany (on site, hybrid and remote), with some in Austria and Switzerland. Many adverts are in German.',
  remoteOnly: false,
  cacheMinutes: 6 * 60,
  gapMs: 30_000,
  // Its one page of adverts is large (several megabytes).
  timeoutMs: 60_000,
  enabled: () => true,
  relevant: (q) =>
    NEAR.has(q.country.toUpperCase()) ||
    q.arrangements.length === 0 ||
    q.arrangements.includes('remote'),
  requests: () => ['https://www.arbeitnow.com/api/job-board-api?page=1'],
  parse(body) {
    const jobs = (body as { data?: unknown })?.data
    if (!Array.isArray(jobs)) throw new Error('Arbeitnow sent something unexpected')
    return jobs.flatMap((raw): JobListing[] => {
      const j = raw as Record<string, unknown>
      const url = safeUrl(j.url)
      const title = oneLine(j.title)
      const id = typeof j.slug === 'string' ? j.slug : ''
      if (!url || !title || !id) return []
      const location = oneLine(j.location)
      const remote = j.remote === true
      const where = readWhere(location, { country: 'DE' })
      const types = strings(j.job_types)
      return [
        {
          id: `arbeitnow:${id}`,
          provider: 'arbeitnow',
          sourceId: id,
          title,
          company: oneLine(j.company_name) || 'Company not named',
          location: location || (remote ? 'Remote' : ''),
          countries: where.countries,
          regions: where.regions,
          worldwide: false,
          arrangement: remote ? 'remote' : 'onsite',
          employment: employmentFrom(types),
          level: levelFrom(types.join(' '), title),
          categories: [],
          tags: strings(j.tags).slice(0, 20),
          description: htmlToText(String(j.description ?? ''), 5000),
          posted: isoDate(j.created_at),
          url,
        },
      ]
    })
  },
}
