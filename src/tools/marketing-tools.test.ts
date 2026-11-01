import { describe, expect, it } from 'vitest'
import { springTraffic } from './analytics/data'
import { breakdown, totals } from './analytics/model'
import { aprilAccount } from './campaigns/data'
import { metrics, pacing, setDailyBudget, setStatus } from './campaigns/model'
import { companySite } from './seo/data'
import { addRedirect, crawl, findIssues, updatePage } from './seo/model'
import { launchWeek } from './social/definition'
import { addPost, schedulePost, updatePost } from './social/model'

describe('Social Planner', () => {
  it('refuses posts that break a channel’s rules', () => {
    const base = launchWeek()
    const x = addPost(base, 'x')
    const long = updatePost(x.state, x.id, { text: 'a'.repeat(281) })
    expect(schedulePost(long, x.id, '2026-04-20T12:30').problems).toEqual([
      'X allows 280 characters; this post has 281.',
    ])
    const insta = addPost(base, 'instagram')
    const noImage = updatePost(insta.state, insta.id, { text: 'Spring! Link in bio.' })
    expect(schedulePost(noImage, insta.id, '2026-04-21T18:30').problems).toEqual([
      'Instagram posts need an image.',
    ])
    const ok = updatePost(x.state, x.id, { text: 'Book now' })
    expect(schedulePost(ok, x.id, '2026-04-22T11:30').problems[0]).toContain(
      'maintenance',
    )
    expect(schedulePost(ok, x.id, '2026-04-25T12:00').problems).toEqual([
      'Schedule it on a working day of this week.',
    ])
  })

  it('keeps posts on one channel two hours apart, and edits send a post back to draft', () => {
    let s = launchWeek()
    const a = addPost(s, 'x')
    s = updatePost(a.state, a.id, { text: 'First' })
    s = schedulePost(s, a.id, '2026-04-20T12:00').state
    const b = addPost(s, 'x')
    s = updatePost(b.state, b.id, { text: 'Second' })
    expect(schedulePost(s, b.id, '2026-04-20T13:30').problems[0]).toContain(
      'within two hours',
    )
    s = updatePost(s, a.id, { text: 'First, edited' })
    expect(s.posts.find((p) => p.id === a.id)?.status).toBe('draft')
  })
})

describe('SEO Audit', () => {
  it('finds the seeded issues, and fixes clear them on the next crawl', () => {
    let s = crawl(companySite())
    expect(s.crawl?.issues).toHaveLength(15)
    s = addRedirect(s, '/spring-offer-2025', '/spring-offer').state
    s = addRedirect(s, '/resources/cashflow-guide', '/services/training').state
    expect(findIssues(s).filter((i) => i.type === 'broken-link')).toEqual([])
    // The tool's list only changes when the site is crawled again.
    expect(s.crawl?.issues.filter((i) => i.type === 'broken-link')).toHaveLength(3)
    s = crawl(s)
    expect(s.crawl?.issues.filter((i) => i.type === 'broken-link')).toEqual([])
  })

  it('catches duplicate titles and refuses unsafe redirects', () => {
    let s = companySite()
    s = updatePage(s, '/about', {
      title: 'Contact Cobalt Ridge Consulting: book a free review',
    }).state
    expect(
      findIssues(s)
        .filter((i) => i.type === 'duplicate-title')
        .map((i) => i.page),
    ).toEqual(['/services', '/services/advisory', '/about', '/contact'])
    expect(addRedirect(s, '/about', '/').problems[0]).toContain('live page')
    expect(addRedirect(s, '/spring-offer-2025', '/nowhere').problems[0]).toContain(
      'exists',
    )
  })
})

describe('Ad Campaigns', () => {
  it('projects the month from spend so far and the active budgets', () => {
    const s = aprilAccount()
    const p = pacing(s)
    expect(p.daily).toBe(730)
    expect(p.remainingDays).toBe(16)
    expect(p.projected).toBeCloseTo(p.spent + 730 * 16, 2)
    expect(p.over).toBeGreaterThan(3000)
  })

  it('pausing and reallocating changes the projection; the daily limit holds', () => {
    let s = aprilAccount()
    for (const id of ['social-lookalike', 'display-news', 'social-jobtitles']) {
      s = setStatus(s, id, 'paused').state
    }
    s = setDailyBudget(s, 'search-advisory', 300).state
    const p = pacing(s)
    expect(p.daily).toBe(470)
    expect(p.projected / p.budget).toBeGreaterThan(0.95)
    expect(p.projected).toBeLessThanOrEqual(18000)
    expect(setDailyBudget(s, 'search-advisory', 900).problems[0]).toContain('daily limit')
    expect(s.changes).toHaveLength(4)
  })

  it('works out ratios from totals', () => {
    const m = metrics([
      {
        date: '2026-04-01',
        impressions: 1000,
        clicks: 10,
        spend: 20,
        conversions: 1,
        revenue: 10,
      },
      {
        date: '2026-04-02',
        impressions: 1000,
        clicks: 30,
        spend: 20,
        conversions: 3,
        revenue: 90,
      },
    ])
    expect(m.ctr).toBe(0.02)
    expect(m.cpa).toBe(10)
    expect(m.roas).toBe(2.5)
  })
})

describe('Site Analytics', () => {
  it('hides a broken mobile booking form in consistent data', () => {
    const s = springTraffic()
    const device = Object.fromEntries(breakdown(s, 'device').map((r) => [r.value, r]))
    expect(device.mobile.formCompletion).toBeLessThan(0.05)
    expect(device.desktop.formCompletion).toBeGreaterThan(0.35)
    const all = totals(s.rows)
    expect(breakdown(s, 'source').reduce((sum, r) => sum + r.sessions, 0)).toBe(
      all.sessions,
    )
  })
})
