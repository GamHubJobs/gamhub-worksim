/**
 * Remotive (remotive.com): remote jobs worldwide, free and without a key
 * (https://github.com/remotive-com/remote-jobs-api). Its terms: link back to
 * each job on Remotive and name Remotive as the source (done on every advert),
 * and ask no more than a few times a day (answers are kept for six hours).
 * Its adverts appear a day after they are published there.
 */
import { readWhere } from '../geo'
import { htmlToText, oneLine, safeUrl } from '../text'
import type { JobListing } from '../types'
import {
  employmentFrom,
  isoDate,
  levelFrom,
  salaryFromText,
  strings,
  type Provider,
} from './common'

export const remotive: Provider = {
  id: 'remotive',
  name: 'Remotive',
  home: 'https://remotive.com',
  coverage:
    'Remote jobs, worldwide. Each says where applicants may live. Shown a day after they are published.',
  remoteOnly: true,
  cacheMinutes: 6 * 60,
  gapMs: 31_000,
  timeoutMs: 30_000,
  enabled: () => true,
  relevant: (q) => q.arrangements.length === 0 || q.arrangements.includes('remote'),
  requests(q, field) {
    const base = 'https://remotive.com/api/remote-jobs?limit=150'
    const words = q.keywords.trim()
    if (words) return [`${base}&search=${encodeURIComponent(words.slice(0, 60))}`]
    if (field?.remotive) return [`${base}&category=${encodeURIComponent(field.remotive)}`]
    return [base]
  },
  parse(body) {
    const jobs = (body as { jobs?: unknown })?.jobs
    if (!Array.isArray(jobs)) throw new Error('Remotive sent something unexpected')
    return jobs.flatMap((raw): JobListing[] => {
      const j = raw as Record<string, unknown>
      const url = safeUrl(j.url)
      const title = oneLine(j.title)
      const id = j.id === undefined ? '' : String(j.id)
      if (!url || !title || !id) return []
      const location = oneLine(j.candidate_required_location)
      const where = readWhere(location)
      const type = typeof j.job_type === 'string' ? j.job_type : ''
      return [
        {
          id: `remotive:${id}`,
          provider: 'remotive',
          sourceId: id,
          title,
          company: oneLine(j.company_name) || 'Company not named',
          logo: safeUrl(j.company_logo_url) ?? safeUrl(j.company_logo),
          location: location || 'Remote',
          countries: where.countries,
          regions: where.regions,
          worldwide: where.worldwide,
          arrangement: 'remote',
          employment: employmentFrom([type.replace('_', '-')]),
          level: levelFrom(undefined, title),
          salary: salaryFromText(j.salary),
          categories: strings([j.category]),
          tags: strings(j.tags).slice(0, 20),
          description: htmlToText(String(j.description ?? '')),
          posted: isoDate(j.publication_date),
          url,
        },
      ]
    })
  },
}
