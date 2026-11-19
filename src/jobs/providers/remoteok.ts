/**
 * Remote OK (remoteok.com): remote jobs worldwide, free and without a key. Its
 * terms: link to the job on Remote OK (a normal, followed link) and mention
 * Remote OK as the source, without using its logo; done on every advert.
 * It filters by one tag; answers are kept for six hours.
 */
import { readWhere } from '../geo'
import { htmlToText, oneLine, safeUrl } from '../text'
import type { JobListing } from '../types'
import { isoDate, levelFrom, salaryFrom, strings, type Provider } from './common'

export const remoteok: Provider = {
  id: 'remoteok',
  name: 'Remote OK',
  home: 'https://remoteok.com',
  coverage: 'Remote jobs, worldwide, mostly in technology, design and marketing.',
  remoteOnly: true,
  cacheMinutes: 6 * 60,
  gapMs: 31_000,
  timeoutMs: 30_000,
  enabled: () => true,
  relevant: (q) => q.arrangements.length === 0 || q.arrangements.includes('remote'),
  requests(q, field) {
    // One tag: the keywords' first word that is a tag-like word, else the field's.
    const word = q.keywords
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .find((w) => /^[a-z][a-z+#.-]{1,24}$/.test(w))
    const tag = word ?? field?.remoteok
    return [
      tag
        ? `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`
        : 'https://remoteok.com/api',
    ]
  },
  parse(body) {
    if (!Array.isArray(body)) throw new Error('Remote OK sent something unexpected')
    // The first item is its legal notice, not a job.
    return body.flatMap((raw): JobListing[] => {
      const j = raw as Record<string, unknown>
      if (j.legal !== undefined) return []
      const url = safeUrl(j.url) ?? safeUrl(j.apply_url)
      const title = oneLine(j.position)
      const id = j.id === undefined ? '' : String(j.id)
      if (!url || !title || !id) return []
      const location = oneLine(j.location)
      const where = location
        ? readWhere(location)
        : { countries: [], regions: [], worldwide: false }
      const tags = strings(j.tags)
      return [
        {
          id: `remoteok:${id}`,
          provider: 'remoteok',
          sourceId: id,
          title,
          company: oneLine(j.company) || 'Company not named',
          logo: safeUrl(j.company_logo) ?? safeUrl(j.logo),
          location: location || 'Remote',
          countries: where.countries,
          regions: where.regions,
          worldwide: where.worldwide,
          arrangement: 'remote',
          employment: [],
          level: levelFrom(undefined, title),
          // Remote OK gives yearly pay in US dollars, or 0 when not said.
          salary: salaryFrom(j.salary_min, j.salary_max, 'USD', 'year'),
          categories: [],
          tags: tags.slice(0, 20),
          description: htmlToText(String(j.description ?? '')),
          posted: isoDate(j.date ?? j.epoch),
          url,
        },
      ]
    })
  },
}
