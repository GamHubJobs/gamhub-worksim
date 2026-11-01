/**
 * Sample ad account: Cobalt Ridge's April campaigns. Daily results are
 * generated from each ad set's typical performance with a small, repeatable
 * day-to-day variation, so the numbers look real and never change.
 */
import type { AdSet, CampaignsState, DayResult } from './schema'

interface Profile {
  /** Click-through rate, cost per click, conversion rate, revenue per conversion. */
  ctr: number
  cpc: number
  conversionRate: number
  value: number
}

/** A repeatable "random" number between -1 and 1. */
const wobble = (seed: number) =>
  Math.sin(seed * 12.9898) * 0.5 + Math.sin(seed * 4.1414) * 0.5

function results(
  seed: number,
  budget: number,
  profile: Profile,
  firstDay: string,
  days: number,
): DayResult[] {
  const start = new Date(`${firstDay}T00:00:00Z`)
  let carry = 0
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10)
    const w = wobble(seed * 31 + i)
    const spend = Math.round(budget * (0.97 + 0.03 * w) * 100) / 100
    const cpc = profile.cpc * (1 + 0.06 * wobble(seed * 17 + i))
    const clicks = Math.max(0, Math.round(spend / cpc))
    const impressions = Math.round(clicks / (profile.ctr * (1 + 0.05 * w)))
    // Conversions are whole numbers: carry the fractions over to the next day.
    const exact =
      clicks * profile.conversionRate * (1 + 0.15 * wobble(seed * 7 + i)) + carry
    const conversions = Math.max(0, Math.floor(exact))
    carry = exact - conversions
    const revenue = Math.round(
      conversions * profile.value * (1 + 0.05 * wobble(seed * 3 + i)),
    )
    return { date, impressions, clicks, spend, conversions, revenue }
  })
}

function adSet(
  seed: number,
  id: string,
  name: string,
  channel: string,
  audience: string,
  dailyBudget: number,
  profile: Profile,
): AdSet {
  return {
    id,
    name,
    channel,
    audience,
    status: 'active',
    dailyBudget,
    results: results(seed, dailyBudget, profile, '2026-04-01', 14),
  }
}

/** April, half way through: the spring campaign is overspending. */
export function aprilAccount(): CampaignsState {
  return {
    account: 'Cobalt Ridge Consulting · Ads',
    today: '2026-04-15',
    monthDays: 30,
    monthBudget: 18000,
    spentBefore: 0,
    dailyCap: 800,
    campaigns: [
      {
        id: 'spring',
        name: 'Spring advisory offer',
        objective: 'Leads: booked free reviews',
        adSets: [
          adSet(
            1,
            'search-advisory',
            'Search: advisory services',
            'Search',
            'People searching for business advisory and finance help',
            180,
            { ctr: 0.052, cpc: 3.1, conversionRate: 0.065, value: 210 },
          ),
          adSet(
            2,
            'search-brand',
            'Search: brand name',
            'Search',
            'People searching for Cobalt Ridge by name',
            40,
            { ctr: 0.18, cpc: 0.9, conversionRate: 0.11, value: 75 },
          ),
          adSet(
            3,
            'social-lookalike',
            'Social: lookalike audience',
            'Social',
            'People similar to our existing clients',
            150,
            { ctr: 0.009, cpc: 1.4, conversionRate: 0.012, value: 70 },
          ),
          adSet(
            4,
            'social-retargeting',
            'Social: website visitors',
            'Social',
            'People who visited the spring offer page',
            60,
            { ctr: 0.021, cpc: 1.1, conversionRate: 0.04, value: 85 },
          ),
          adSet(
            5,
            'display-news',
            'Display: business news sites',
            'Display',
            'Readers of business news websites',
            140,
            { ctr: 0.0021, cpc: 0.8, conversionRate: 0.006, value: 55 },
          ),
        ],
      },
      {
        id: 'workshops',
        name: 'Training workshops',
        objective: 'Sales: workshop bookings',
        adSets: [
          adSet(
            6,
            'search-workshops',
            'Search: finance workshops',
            'Search',
            'People searching for finance training',
            70,
            { ctr: 0.041, cpc: 2.2, conversionRate: 0.024, value: 200 },
          ),
          adSet(
            7,
            'social-jobtitles',
            'Social: finance job titles',
            'Social',
            'Finance managers and accountants',
            90,
            { ctr: 0.006, cpc: 3.4, conversionRate: 0.018, value: 170 },
          ),
        ],
      },
    ],
    changes: [],
  }
}
