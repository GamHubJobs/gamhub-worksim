/**
 * Adzuna (adzuna.com): jobs of every kind, on site and remote, in many
 * countries, searched by words, place and distance. It needs a free key
 * (developer.adzuna.com), which must never be in the game's code: the game
 * asks a small proxy that holds the key (server/jobs-proxy, set up by whoever
 * runs the game, with VITE_JOBS_PROXY pointing at it). Without one this feed
 * is off and the Jobs app says so.
 *
 * Its terms: each advert is labelled "Adzuna", linked to Adzuna (done on every
 * advert); non-commercial use is free, commercial use needs Adzuna's licence.
 */
import { readWhere } from '../geo'
import { htmlToText, oneLine, safeUrl } from '../text'
import type { JobListing } from '../types'
import { employmentFrom, isoDate, levelFrom, salaryFrom, type Provider } from './common'

/** The countries Adzuna searches (its country codes; GB is "gb"). */
export const ADZUNA_COUNTRIES = new Set([
  'GB',
  'US',
  'AT',
  'AU',
  'BE',
  'BR',
  'CA',
  'CH',
  'DE',
  'ES',
  'FR',
  'IN',
  'IT',
  'MX',
  'NL',
  'NZ',
  'PL',
  'SG',
  'ZA',
])

/** Adzuna's currency, by country (its pay figures carry none). */
const CURRENCY: Record<string, string> = {
  GB: 'GBP',
  US: 'USD',
  AT: 'EUR',
  AU: 'AUD',
  BE: 'EUR',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  DE: 'EUR',
  ES: 'EUR',
  FR: 'EUR',
  IN: 'INR',
  IT: 'EUR',
  MX: 'MXN',
  NL: 'EUR',
  NZ: 'NZD',
  PL: 'PLN',
  SG: 'SGD',
  ZA: 'ZAR',
}

function proxy(): string {
  const url = (import.meta.env?.VITE_JOBS_PROXY as string | undefined) ?? ''
  return url.replace(/\/+$/, '')
}

export const adzuna: Provider = {
  id: 'adzuna',
  name: 'Adzuna',
  home: 'https://www.adzuna.com',
  coverage:
    'Jobs of every kind, on site and remote, in 19 countries (including the UK, the US, India, South Africa, Australia and much of Europe), searched by place and distance. Needs the jobs proxy.',
  remoteOnly: false,
  cacheMinutes: 60,
  gapMs: 1_500,
  timeoutMs: 25_000,
  enabled: () => !!proxy(),
  relevant: (q) => ADZUNA_COUNTRIES.has(q.country.toUpperCase()),
  requests(q, field) {
    const country = q.country.toLowerCase()
    const params = new URLSearchParams({ results_per_page: '50' })
    const what = q.keywords.trim() || field?.what || ''
    if (what) params.set('what', what.slice(0, 100))
    if (q.place.trim()) {
      params.set('where', q.place.trim().slice(0, 80))
      params.set('distance', String(Math.max(1, Math.min(200, Math.round(q.radiusKm)))))
    }
    if (q.postedWithinDays > 0) params.set('max_days_old', String(q.postedWithinDays))
    return [`${proxy()}/adzuna/${country}?${params}`]
  },
  parse(body) {
    const results = (body as { results?: unknown })?.results
    const country = String((body as { country?: unknown })?.country ?? '').toUpperCase()
    if (!Array.isArray(results)) throw new Error('Adzuna sent something unexpected')
    return results.flatMap((raw): JobListing[] => {
      const j = raw as Record<string, unknown>
      const url = safeUrl(j.redirect_url)
      const title = oneLine(j.title)
      const id = j.id === undefined ? '' : String(j.id)
      if (!url || !title || !id) return []
      const loc = j.location as { display_name?: unknown } | undefined
      const location = oneLine(loc?.display_name)
      const where = readWhere(location)
      const text = htmlToText(String(j.description ?? ''))
      const remote = /\bremote\b/i.test(`${title} ${text}`)
      // Pay Adzuna estimated itself ("predicted") is not the advert's: left out.
      const predicted = String(j.salary_is_predicted ?? '0') === '1'
      return [
        {
          id: `adzuna:${id}`,
          provider: 'adzuna',
          sourceId: id,
          title,
          company:
            oneLine(
              (j.company as { display_name?: unknown } | undefined)?.display_name,
            ) || 'Company not named',
          location,
          countries: country
            ? [...new Set([country, ...where.countries])]
            : where.countries,
          regions: where.regions,
          worldwide: false,
          arrangement: remote ? 'remote' : 'onsite',
          employment: employmentFrom([j.contract_time, j.contract_type]),
          level: levelFrom(undefined, title),
          salary: predicted
            ? undefined
            : salaryFrom(j.salary_min, j.salary_max, CURRENCY[country], 'year'),
          categories: [
            oneLine((j.category as { label?: unknown } | undefined)?.label),
          ].filter(Boolean),
          tags: [],
          // Adzuna gives the start of the advert; the rest is on the advert's page.
          description: text,
          posted: isoDate(j.created),
          url,
        },
      ]
    })
  },
}
