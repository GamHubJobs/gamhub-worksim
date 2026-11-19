import { beforeEach, describe, expect, it } from 'vitest'
import {
  coverLetter,
  cvText,
  interviewQuestions,
  PRACTICE_HEADING,
  PRACTICE_NOTE,
} from './documents'
import { feed, FeedError, getJson, resetFeeds } from './feeds'
import { fieldFit, getField } from './fields'
import { jobicyGeo, openTo, readWhere } from './geo'
import { compareSkills, recommend } from './match'
import { adzuna } from './providers/adzuna'
import { arbeitnow } from './providers/arbeitnow'
import { closedJobicy, jobicy, jobicyStatusUrl } from './providers/jobicy'
import { remoteok } from './providers/remoteok'
import { remotive } from './providers/remotive'
import type { Provider } from './providers'
import { dedupe, feedsFor, filterJobs, searchJobs } from './search'
import { htmlToText, safeUrl } from './text'
import { EMPTY_QUERY, type JobListing } from './types'

// Shaped as each feed's real answers (captured 19 November 2026), cut down.
const REMOTIVE = {
  '0-legal-notice': 'Legal warning…',
  'job-count': 1,
  jobs: [
    {
      id: 2069746,
      url: 'https://remotive.com/remote-jobs/software-development/tech-lead-full-stack-rails-engineer-2069746',
      title: 'Tech Lead Full-Stack Rails Engineer',
      company_name: 'Mitre Media',
      company_logo: 'https://remotive.com/job/2069746/logo',
      category: 'Software Development',
      tags: ['api', 'react', 'ruby/rails'],
      job_type: 'full_time',
      publication_date: '2026-11-14T20:33:53',
      candidate_required_location: 'USA, Canada, USA timezones',
      salary: '$170k - $200k',
      description:
        '<p class="h1">About us</p><ul><li>Ship &amp; review code</li><li>Mentor</li></ul><script>alert(1)</script>',
    },
  ],
}
const JOBICY = {
  apiVersion: '2.2.22',
  success: true,
  jobs: [
    {
      id: 159743,
      url: 'https://jobicy.com/jobs/159743-people-partner-gtm',
      jobTitle: 'People Partner GTM',
      companyName: 'Elevenlabs',
      companyLogo: 'https://jobicy.com/data/logo.png',
      jobIndustry: ['HR &amp; Recruiting'],
      jobType: ['Full-Time'],
      jobGeo: 'EMEA',
      jobLevel: 'Senior',
      jobDescription: '<h3>About</h3><p>Hello</p>',
      pubDate: '2026-11-19T03:45:08+00:00',
      salaryMin: 60000,
      salaryMax: 80000,
      salaryCurrency: 'EUR',
      salaryPeriod: 'yearly',
    },
  ],
}
const REMOTEOK = [
  { last_updated: 1795082282, legal: 'API Terms of Service: Please link back…' },
  {
    slug: 'remote-software-engineer-ai-tooling-supabase-1137793',
    id: '1137793',
    date: '2026-11-13T00:00:15+00:00',
    company: 'Supabase',
    company_logo: '',
    position: 'Software Engineer AI Tooling',
    tags: ['dev', 'typescript'],
    description: '<p>Build things</p>',
    location: '',
    salary_min: 0,
    salary_max: 0,
    url: 'https://remoteOK.com/remote-jobs/remote-software-engineer-ai-tooling-supabase-1137793',
  },
]
const ARBEITNOW = {
  data: [
    {
      slug: 'it-support-berlin-1',
      company_name: 'DiCommerce GmbH',
      title: 'IT-Support Mitarbeiter (m/w/d)',
      description: '<p>Du unterstützt unsere Teams</p>',
      remote: false,
      url: 'https://www.arbeitnow.com/jobs/companies/dicommerce-gmbh/it-support-berlin-1',
      tags: ['IT'],
      job_types: ['Vollzeit', 'Berufseinsteiger'],
      location: 'Berlin',
      created_at: 1795078889,
    },
  ],
  links: {},
  meta: {},
}
const ADZUNA = {
  country: 'gb',
  results: [
    {
      id: '5012345678',
      title: 'Graduate Civil Engineer',
      company: { display_name: 'Bridge &amp; Co' },
      location: {
        display_name: 'Manchester, Greater Manchester',
        area: ['UK', 'North West England'],
      },
      salary_min: 28000,
      salary_max: 32000,
      salary_is_predicted: '0',
      contract_time: 'full_time',
      contract_type: 'permanent',
      created: '2026-11-17T09:00:00Z',
      redirect_url: 'https://www.adzuna.co.uk/jobs/land/ad/5012345678',
      description: 'Join our structures team…',
      category: { label: 'Engineering Jobs' },
    },
    {
      id: '5012345679',
      title: 'Site Engineer',
      company: { display_name: 'Build Ltd' },
      location: { display_name: 'Leeds' },
      salary_min: 35000,
      salary_max: 35000,
      salary_is_predicted: '1',
      created: '2026-11-17T09:00:00Z',
      redirect_url: 'https://www.adzuna.co.uk/jobs/land/ad/5012345679',
      description: 'Site work',
    },
  ],
}

const job = (over: Partial<JobListing>): JobListing => ({
  id: `test:${over.title ?? 'x'}`,
  provider: 'jobicy',
  sourceId: '1',
  title: 'Job',
  company: 'Co',
  location: '',
  countries: [],
  regions: [],
  worldwide: false,
  employment: [],
  categories: [],
  tags: [],
  description: '',
  posted: new Date().toISOString(),
  url: 'https://example.org/job',
  ...over,
})

describe('advert text', () => {
  it('becomes plain text: no scripts or tags, entities read, lists as bullets', () => {
    const t = htmlToText(REMOTIVE.jobs[0].description)
    expect(t).not.toMatch(/<|alert/)
    expect(t).toContain('• Ship & review code')
    expect(t.split('\n')[0]).toBe('About us')
  })
  it('only web addresses are links', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl('data:text/html,x')).toBeUndefined()
    expect(safeUrl('https://jobicy.com/jobs/1')).toBe('https://jobicy.com/jobs/1')
  })
})

describe('each feed, as it answers', () => {
  it('Remotive: remote, where applicants may live, pay as written', () => {
    const [l] = remotive.parse(REMOTIVE)
    expect(l).toMatchObject({
      id: 'remotive:2069746',
      title: 'Tech Lead Full-Stack Rails Engineer',
      company: 'Mitre Media',
      arrangement: 'remote',
      employment: ['full-time'],
      countries: expect.arrayContaining(['US', 'CA']),
      url: REMOTIVE.jobs[0].url,
    })
    expect(l.salary?.text).toBe('$170k - $200k')
    expect(l.salary).toMatchObject({ min: 170000, max: 200000, currency: 'USD' })
    expect(l.posted).toBe('2026-11-14T20:33:53.000Z')
    expect(l.level).toBe('lead')
  })
  it('Jobicy: its region, level and pay with currency; whether an advert has closed', () => {
    const [l] = jobicy.parse(JOBICY)
    expect(l).toMatchObject({
      id: 'jobicy:159743',
      regions: expect.arrayContaining(['europe', 'africa']),
      level: 'senior',
    })
    expect(l.categories).toEqual(['HR & Recruiting'])
    expect(l.salary).toMatchObject({
      min: 60000,
      max: 80000,
      currency: 'EUR',
      period: 'year',
    })
    expect(jobicy.parse({ success: false })).toEqual([])
    expect(jobicyStatusUrl(['1', '2'])).toBe('https://jobicy.com/api/jobs/status?ids=1,2')
    expect(
      closedJobicy({
        jobs: [
          { id: 1, status: 'closed' },
          { id: 2, status: 'active' },
        ],
      }),
    ).toEqual(['1'])
  })
  it('Remote OK: its legal notice is not a job; no pay when it says 0', () => {
    const list = remoteok.parse(REMOTEOK)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      company: 'Supabase',
      arrangement: 'remote',
      salary: undefined,
    })
    expect(list[0].url.toLowerCase()).toContain('remoteok.com/remote-jobs/')
  })
  it('Arbeitnow: on site in Germany, German job types read', () => {
    const [l] = arbeitnow.parse(ARBEITNOW)
    expect(l).toMatchObject({
      arrangement: 'onsite',
      countries: ['DE'],
      employment: ['full-time'],
      level: 'entry',
    })
  })
  it('Adzuna: pay Adzuna estimated itself is left out', () => {
    const [a, b] = adzuna.parse(ADZUNA)
    expect(a).toMatchObject({
      countries: ['GB'],
      company: 'Bridge & Co',
      level: 'graduate',
    })
    expect(a.salary).toMatchObject({ min: 28000, max: 32000, currency: 'GBP' })
    expect(b.salary).toBeUndefined()
  })
  it('a malformed answer is an error, not adverts', () => {
    for (const p of [remotive, jobicy, remoteok, arbeitnow, adzuna])
      expect(() => p.parse({ nope: 1 })).toThrow()
    // Adverts missing a title or a link are left out.
    expect(
      remotive.parse({ jobs: [{ id: 1, title: 'x', url: 'javascript:1' }] }),
    ).toEqual([])
  })
})

describe('where a job is open to', () => {
  it('reads the adverts’ own words', () => {
    expect(readWhere('USA, Canada, USA timezones')).toMatchObject({
      countries: ['US', 'CA'],
      worldwide: false,
    })
    expect(readWhere('Worldwide').worldwide).toBe(true)
    expect(readWhere('Remote - Germany').countries).toEqual(['DE'])
    expect(readWhere('UK or Ireland').countries.sort()).toEqual(['GB', 'IE'])
  })
  it('someone in The Gambia: EMEA and worldwide jobs, not US-only ones', () => {
    expect(openTo(readWhere('EMEA'), 'GM')).toBe(true)
    expect(openTo(readWhere('Anywhere'), 'GM')).toBe(true)
    expect(openTo(readWhere('Africa'), 'GM')).toBe(true)
    expect(openTo(readWhere('USA'), 'GM')).toBe(false)
    // Saying nothing is not "open to all".
    expect(openTo(readWhere(''), 'GM')).toBe(false)
  })
  it('asks Jobicy for the country it lists, or the part of the world', () => {
    expect(jobicyGeo('DE')).toBe('germany')
    expect(jobicyGeo('GB')).toBe('uk')
    expect(jobicyGeo('GM')).toBe('emea')
    expect(jobicyGeo('IN')).toBe('apac')
    expect(jobicyGeo('CO')).toBe('latam')
  })
})

describe('career fields: relevant, not just a word in common', () => {
  const it_ = getField('it-support')!
  const eng = getField('engineering-services')!
  it('IT support: service desk yes, customer support agent or DevOps no', () => {
    expect(fieldFit(it_, 'Service Desk Analyst', [])).toBe(2)
    expect(fieldFit(it_, 'IT-Support Mitarbeiter (m/w/d)', [])).toBe(2)
    expect(fieldFit(it_, 'Customer Support Agent', [])).toBeLessThanOrEqual(0)
    expect(fieldFit(it_, 'Senior DevOps Engineer', [])).toBe(0)
  })
  it('engineering: civil yes, software engineer no', () => {
    expect(fieldFit(eng, 'Graduate Civil Engineer', [])).toBe(2)
    expect(fieldFit(eng, 'Software Engineer AI Tooling', [])).toBe(-1)
  })
  it('recommendations rank the player’s kind of work at their level, open to them', () => {
    const recs = recommend(
      [
        job({
          id: 'a',
          title: 'Senior Service Desk Manager',
          level: 'lead',
          worldwide: true,
        }),
        job({
          id: 'b',
          title: 'Junior IT Support Technician',
          level: 'entry',
          regions: ['africa'],
          description: 'Troubleshooting and ITIL ticketing',
        }),
        job({ id: 'c', title: 'Customer Support Agent', worldwide: true }),
        job({
          id: 'd',
          title: 'IT Support Analyst',
          level: 'entry',
          countries: ['US'],
          arrangement: 'remote',
        }),
      ].map((l) => ({ ...l, arrangement: l.arrangement ?? 'remote' })),
      {
        careerId: 'it-support',
        levelIndex: 0,
        skills: { troubleshooting: 100 },
        country: 'GM',
      },
    )
    expect(recs.map((r) => r.listing.id)).not.toContain('c')
    // A lead role is not suggested to someone starting out.
    expect(recs.map((r) => r.listing.id)).not.toContain('a')
    expect(recs[0].listing.id).toBe('b')
    // (Seen live: "IT-Administrator" is IT support, not finance and administration.)
    expect(
      fieldFit(getField('office-admin-finance')!, 'IT-Administrator (m/w/d)', []),
    ).toBe(-1)
    expect(fieldFit(getField('office-admin-finance')!, 'Office Administrator', [])).toBe(
      2,
    )
    expect(recs[0].why.join(' ')).toMatch(/open to applicants where you live/i)
    expect(recs[0].why.join(' ')).toMatch(/troubleshooting/i)
  })
  it('skills: practised in the game, not yet, and real requirements kept apart', () => {
    const m = compareSkills(
      job({
        description:
          'You will use Excel and VLOOKUP daily. ITIL certification preferred. Bachelor’s degree. 2+ years of experience.',
      }),
      { skills: { formulas: 50 } },
    )
    expect(m.practised.map((s) => s.id)).toEqual(['formulas'])
    expect(m.toPractise.map((s) => s.id)).toContain('lookups')
    expect(m.real).toEqual(
      expect.arrayContaining(['A degree', 'ITIL certification (or knowledge)']),
    )
    expect(m.experience[0]).toMatch(/^2\+ years/)
  })
})

describe('searching', () => {
  const now = Date.parse('2026-11-19T12:00:00Z')
  const list = [
    job({
      id: '1',
      title: 'IT Support Technician',
      arrangement: 'onsite',
      countries: ['DE'],
      location: 'Berlin',
      employment: ['full-time'],
      posted: '2026-11-18T00:00:00Z',
    }),
    job({
      id: '2',
      title: 'IT Support Analyst',
      arrangement: 'remote',
      regions: ['europe', 'africa', 'middle-east'],
      salary: { min: 30000, max: 40000, currency: 'EUR', period: 'year', text: '€30k' },
      posted: '2026-10-01T00:00:00Z',
    }),
    job({
      id: '3',
      title: 'Paralegal',
      arrangement: 'onsite',
      countries: ['GB'],
      posted: '2026-09-01T00:00:00Z',
    }),
  ]
  it('on site: in the country; remote: open to someone living there', () => {
    expect(
      filterJobs(list, { ...EMPTY_QUERY, country: 'DE' }, undefined, now).map(
        (l) => l.id,
      ),
    ).toEqual(['1', '2'])
    expect(
      filterJobs(list, { ...EMPTY_QUERY, country: 'GM' }, undefined, now).map(
        (l) => l.id,
      ),
    ).toEqual(['2'])
  })
  it('words, field, type, pay and date filters', () => {
    expect(
      filterJobs(list, { ...EMPTY_QUERY, keywords: 'it support' }, undefined, now),
    ).toHaveLength(2)
    expect(
      filterJobs(list, { ...EMPTY_QUERY, field: 'legal' }, undefined, now).map(
        (l) => l.id,
      ),
    ).toEqual(['3'])
    expect(
      filterJobs(list, { ...EMPTY_QUERY, employment: ['full-time'] }, undefined, now).map(
        (l) => l.id,
      ),
    ).toEqual(['1'])
    expect(
      filterJobs(list, { ...EMPTY_QUERY, minSalary: 1 }, undefined, now).map((l) => l.id),
    ).toEqual(['2'])
    expect(
      filterJobs(list, { ...EMPTY_QUERY, postedWithinDays: 7 }, undefined, now).map(
        (l) => l.id,
      ),
    ).toEqual(['1'])
    expect(
      filterJobs(list, { ...EMPTY_QUERY, arrangements: ['remote'] }, undefined, now).map(
        (l) => l.id,
      ),
    ).toEqual(['2'])
    expect(
      filterJobs(list, { ...EMPTY_QUERY, place: 'berlin' }, undefined, now).map(
        (l) => l.id,
      ),
    ).toEqual(['1', '2'])
  })
  it('the same job twice is shown once, the fuller advert kept', () => {
    const a = job({ id: 'x:1', title: 'Paralegal (m/w/d)', company: 'Law GmbH' })
    const b = job({
      id: 'y:1',
      title: 'Paralegal',
      company: 'Law',
      salary: { text: '£25k' },
    })
    expect(dedupe([a, b]).map((l) => l.id)).toEqual(['y:1'])
  })
  it('only feeds with something for the search are asked', () => {
    const { use, skipped } = feedsFor({
      ...EMPTY_QUERY,
      country: 'JP',
      arrangements: ['onsite'],
    })
    expect(use.map((p) => p.id)).toEqual([])
    expect(skipped.find((s) => s.provider === 'adzuna')?.note).toMatch(/proxy/)
    expect(skipped.find((s) => s.provider === 'remotive')?.note).toMatch(
      /remote jobs only/,
    )
  })
})

describe('asking the feeds', () => {
  beforeEach(() => resetFeeds())
  const fake = (id: string, over: Partial<Provider> = {}): Provider => ({
    ...jobicy,
    id: id as Provider['id'],
    gapMs: 0,
    cacheMinutes: 60,
    ...over,
  })
  const answer = (body: unknown, status = 200) =>
    (async () =>
      new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

  it('kept for as long as the feed asks; asked again after', async () => {
    let calls = 0
    const counting = (async () => {
      calls++
      return new Response(JSON.stringify(JOBICY))
    }) as unknown as typeof fetch
    let t = 1_000_000
    const p = fake('jobicy')
    const first = await feed(p, 'https://jobicy.test/a', {
      fetch: counting,
      now: () => t,
    })
    const again = await feed(p, 'https://jobicy.test/a', {
      fetch: counting,
      now: () => t + 10 * 60_000,
    })
    expect([first.fromCache, again.fromCache, calls]).toEqual([false, true, 1])
    t += 61 * 60_000
    await feed(p, 'https://jobicy.test/a', { fetch: counting, now: () => t })
    expect(calls).toBe(2)
  })
  it('a feed that fails says why in plain words, and what it gave before is still shown', async () => {
    await expect(getJson('https://x.test', 1000, answer({}, 429))).rejects.toThrow(/busy/)
    await expect(getJson('https://x.test', 1000, answer({}, 500))).rejects.toBeInstanceOf(
      FeedError,
    )
    const failing = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(getJson('https://x.test', 1000, failing)).rejects.toThrow(
      /could not be reached/,
    )
    const p = fake('jobicy')
    await feed(p, 'https://jobicy.test/b', { fetch: answer(JOBICY), now: () => 0 })
    const later = await feed(p, 'https://jobicy.test/b', {
      fetch: failing,
      now: () => 10 * 3_600_000,
    })
    expect(later).toMatchObject({ fromCache: true })
    expect(later.listings).toHaveLength(1)
  })
  it('one feed down: the others are shown, and the down one named', async () => {
    const ok = fake('jobicy', { requests: () => ['https://ok.test'] })
    const down = fake('remotive', {
      requests: () => ['https://down.test'],
      parse: remotive.parse,
    })
    const fetchBoth = (async (url: string) =>
      url.includes('down')
        ? new Response('{}', { status: 503 })
        : new Response(JSON.stringify(JOBICY))) as unknown as typeof fetch
    const r = await searchJobs(EMPTY_QUERY, { fetch: fetchBoth, providers: [ok, down] })
    expect(r.listings).toHaveLength(1)
    expect(r.sources.find((s) => s.provider === 'remotive')).toMatchObject({
      state: 'error',
    })
    expect(r.sources.find((s) => s.provider === 'jobicy')).toMatchObject({
      state: 'ok',
      count: 1,
    })
  })
})

describe('getting ready to apply', () => {
  const player = {
    name: 'Sam Taylor',
    careerId: 'it-support',
    skills: { troubleshooting: 130, 'customer-service': 50 },
    tasksPassed: ['Reset a password'],
  }
  const cv = {
    headline: 'IT support technician',
    contact: 'sam@example.org',
    summary: 'I like fixing things. More here.',
    experience: '',
    education: 'College',
    qualifications: '',
    includePractice: true,
  }
  it('the CV shows practice in the game only as practice', () => {
    const t = cvText(cv, player)
    expect(t).toContain(PRACTICE_HEADING.toUpperCase())
    expect(t).toContain(PRACTICE_NOTE)
    expect(t).toContain('Troubleshooting (competent in the game)')
    // The player's own sections are theirs; the game adds no jobs or qualifications.
    expect(t).not.toMatch(/QUALIFICATIONS AND CERTIFICATES/)
    expect(cvText({ ...cv, includePractice: false }, player)).not.toContain('GamHub')
  })
  it('a cover letter names the job and company, and leaves the real parts to the player', () => {
    const [l] = jobicy.parse(JOBICY)
    const letter = coverLetter(
      { ...l, description: 'Troubleshooting skills needed' },
      cv,
      player,
    )
    expect(letter).toContain('People Partner GTM')
    expect(letter).toContain('at Elevenlabs')
    expect(letter).toContain('advertised on Jobicy')
    expect(letter).toMatch(/workplace simulation/)
    expect(letter).toContain('[')
    expect(interviewQuestions(l, player)[0]).toMatch(/People Partner GTM/)
  })
})
