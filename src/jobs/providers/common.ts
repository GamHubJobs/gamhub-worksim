/**
 * Shared by the job feeds: reading job types, seniority and pay from what each
 * advert says. Nothing is estimated: pay is shown only when the advert gives
 * it, and seniority only when the advert or its title says it.
 */
import type { JobQuery } from '../types'
import type { EmploymentType, JobListing, Level, ProviderId, Salary } from '../types'

/** A feed the Jobs app can search (one file each in this folder). */
export interface Provider {
  id: ProviderId
  /** As credited on every advert ("Remotive"). */
  name: string
  /** The source's own site, linked from every advert it gave. */
  home: string
  /** What it covers, in plain words, for the sources list. */
  coverage: string
  /** Only remote jobs. */
  remoteOnly: boolean
  /** How long its answers are kept before asking again (the sources ask for this). */
  cacheMinutes: number
  /** The least time between two requests to it. */
  gapMs: number
  /** How long to wait for an answer. */
  timeoutMs: number
  /** Whether it can be used here (a feed needing the jobs proxy is off without one). */
  enabled: () => boolean
  /** Whether it has anything for this search (a German feed, for a search in Japan: no). */
  relevant: (query: JobQuery) => boolean
  /** The addresses to ask, for this search. */
  requests: (query: JobQuery, field: FieldTerms | undefined) => string[]
  /** Its answer, as adverts (anything malformed is left out). */
  parse: (body: unknown) => JobListing[]
}

/** What each feed calls a career's field (careerSearch.ts). */
export interface FieldTerms {
  remotive?: string
  jobicy?: string
  remoteok?: string
  /** For feeds that search by words (Adzuna), and the German feed. */
  what?: string
}

export function employmentFrom(values: unknown[]): EmploymentType[] {
  const out = new Set<EmploymentType>()
  for (const v of values) {
    if (typeof v !== 'string') continue
    const s = v.toLowerCase()
    if (/full[\s_-]?time|vollzeit|unbefristet|permanent/.test(s)) out.add('full-time')
    if (/part[\s_-]?time|teilzeit/.test(s)) out.add('part-time')
    if (/contract|befristet|fixed[\s_-]?term/.test(s) && !/unbefristet/.test(s))
      out.add('contract')
    if (/temporary|temp\b|aushilfe/.test(s)) out.add('temporary')
    if (/intern|praktikum|werkstudent|working student/.test(s)) out.add('internship')
    if (/freelance|freiberuf|self[\s_-]?employed/.test(s)) out.add('freelance')
    if (/apprentice|ausbildung|trainee/.test(s)) out.add('apprenticeship')
  }
  return [...out]
}

/** Seniority: the feed's own word, else the title's. */
export function levelFrom(feed: string | undefined, title: string): Level | undefined {
  const f = (feed ?? '').toLowerCase()
  if (/intern|praktik/.test(f)) return 'internship'
  if (/entry|junior|berufseinsteiger/.test(f)) return 'entry'
  if (/mid|intermediate|berufserfahren/.test(f)) return 'mid'
  if (/senior/.test(f)) return 'senior'
  if (/lead|principal|director|head|manager|executive/.test(f)) return 'lead'
  const t = title.toLowerCase()
  if (/\b(intern|internship|praktikum|praktikant|werkstudent)/.test(t))
    return 'internship'
  if (/\b(graduate|grad scheme|trainee|apprentice|azubi|ausbildung)\b/.test(t))
    return 'graduate'
  if (/\b(junior|jr\.?|entry[\s-]level|associate|assistant)\b/.test(t)) return 'entry'
  if (/\b(senior|sr\.?|staff)\b/.test(t)) return 'senior'
  if (/\b(lead|principal|head of|director|manager|vp|chief)\b/.test(t)) return 'lead'
  return undefined
}

const SYMBOLS: Record<string, string> = {
  $: 'USD',
  '£': 'GBP',
  '€': 'EUR',
  '₹': 'INR',
  '¥': 'JPY',
}

/** Pay from numbers the feed gives (0 or missing: not given). */
export function salaryFrom(
  min: unknown,
  max: unknown,
  currency?: unknown,
  period?: unknown,
): Salary | undefined {
  const lo = typeof min === 'number' && min > 0 ? min : Number(min) > 0 ? Number(min) : 0
  const hi = typeof max === 'number' && max > 0 ? max : Number(max) > 0 ? Number(max) : 0
  if (!lo && !hi) return undefined
  const cur =
    typeof currency === 'string' && currency.trim()
      ? currency.trim().toUpperCase()
      : undefined
  const per = periodFrom(typeof period === 'string' ? period : '')
  const fmt = (n: number) => formatAmount(n, cur)
  const text = lo && hi && lo !== hi ? `${fmt(lo)} – ${fmt(hi)}` : fmt(lo || hi)
  return {
    ...(lo ? { min: lo } : {}),
    ...(hi ? { max: hi } : {}),
    ...(cur ? { currency: cur } : {}),
    ...(per ? { period: per } : {}),
    text: per ? `${text} a ${per}` : text,
  }
}

/** Pay as the advert words it ("$170k - $200k"): kept as text, numbers read where clear. */
export function salaryFromText(text: unknown): Salary | undefined {
  if (typeof text !== 'string') return undefined
  const t = text.trim()
  if (!t || !/\d/.test(t)) return undefined
  const symbol = /[$£€₹¥]/.exec(t)?.[0]
  const code = /\b(USD|GBP|EUR|CAD|AUD|INR|CHF|SEK|NOK|DKK|PLN|ZAR|NGN|KES|GHS)\b/i.exec(
    t,
  )?.[1]
  const amounts = [...t.matchAll(/(\d[\d,.]*)\s*(k|K)?/g)]
    .map(([, n, k]) => Number(n.replace(/,/g, '')) * (k ? 1000 : 1))
    .filter((n) => Number.isFinite(n) && n > 0)
  const per = periodFrom(t)
  return {
    ...(amounts[0] ? { min: amounts[0] } : {}),
    ...(amounts[1] ? { max: amounts[1] } : {}),
    ...(code
      ? { currency: code.toUpperCase() }
      : symbol
        ? { currency: SYMBOLS[symbol] }
        : {}),
    ...(per ? { period: per } : {}),
    text: t.length > 80 ? `${t.slice(0, 79)}…` : t,
  }
}

function periodFrom(s: string): Salary['period'] | undefined {
  const p = s.toLowerCase()
  if (/hour|\/h\b|per h\b|hourly/.test(p)) return 'hour'
  if (/day|daily/.test(p)) return 'day'
  if (/week/.test(p)) return 'week'
  if (/month|\/mo\b|monthly/.test(p)) return 'month'
  if (/year|annual|annum|\/yr|p\.a\.|yearly/.test(p)) return 'year'
  return undefined
}

function formatAmount(n: number, currency?: string): string {
  try {
    if (currency && /^[A-Z]{3}$/.test(currency))
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(n)
  } catch {
    // An unknown currency code: the number alone.
  }
  return `${new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n)}${currency ? ` ${currency}` : ''}`
}

/** A date the feed gives (ISO text, or seconds since 1970) as ISO, or '' if unreadable. */
export function isoDate(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v))
    return new Date(v < 1e12 ? v * 1000 : v).toISOString()
  if (typeof v === 'string' && v.trim()) {
    // "2026-11-14T20:33:53" has no zone: the feeds mean UTC.
    const s = /T\d\d:\d\d(:\d\d)?$/.test(v.trim()) ? `${v.trim()}Z` : v.trim()
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return ''
}

export const strings = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && !!x.trim())
    : []
