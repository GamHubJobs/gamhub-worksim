/** Ad Campaigns: metrics, pacing and the changes a marketer can make. */
import type { AdSet, CampaignsState, DayResult } from './schema'

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export interface Metrics {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  conversionRate: number
  cpa: number
  roas: number
}

/** Totals and ratios for a set of daily results (ratios from totals, not averages). */
export function metrics(results: DayResult[]): Metrics {
  const sum = (key: keyof Omit<DayResult, 'date'>) =>
    results.reduce((s, r) => s + r[key], 0)
  const impressions = sum('impressions')
  const clicks = sum('clicks')
  const spend = round2(sum('spend'))
  const conversions = sum('conversions')
  const revenue = round2(sum('revenue'))
  const div = (a: number, b: number) => (b === 0 ? 0 : a / b)
  return {
    impressions,
    clicks,
    spend,
    conversions,
    revenue,
    ctr: div(clicks, impressions),
    cpc: round2(div(spend, clicks)),
    conversionRate: div(conversions, clicks),
    cpa: round2(div(spend, conversions)),
    roas: round2(div(revenue, spend)),
  }
}

/** The last `days` days of an ad set's results. */
export function recent(adSet: AdSet, days: number): DayResult[] {
  return adSet.results.slice(-days)
}

export function allAdSets(state: CampaignsState): AdSet[] {
  return state.campaigns.flatMap((c) => c.adSets)
}

export function findAdSet(state: CampaignsState, id: string): AdSet | undefined {
  return allAdSets(state).find((a) => a.id === id)
}

/** Total daily budget of the active ad sets. */
export function activeDailyBudget(state: CampaignsState): number {
  return round2(
    allAdSets(state)
      .filter((a) => a.status === 'active')
      .reduce((s, a) => s + a.dailyBudget, 0),
  )
}

/**
 * Month pacing: what has been spent, and what the month will cost if the
 * active budgets stay as they are for the remaining days.
 */
export function pacing(state: CampaignsState) {
  const shown = round2(allAdSets(state).reduce((s, a) => s + metrics(a.results).spend, 0))
  const spent = round2(state.spentBefore + shown)
  const dayOfMonth = Number(state.today.slice(8, 10))
  const remainingDays = state.monthDays - dayOfMonth + 1
  const daily = activeDailyBudget(state)
  const projected = round2(spent + daily * remainingDays)
  return {
    spent,
    remainingDays,
    daily,
    projected,
    budget: state.monthBudget,
    over: round2(projected - state.monthBudget),
    /** Daily budget that would land the month exactly on budget. */
    sustainableDaily: round2(Math.max(0, state.monthBudget - spent) / remainingDays),
  }
}

type Result = { state: CampaignsState; problems: string[] }

function changeAdSet(
  state: CampaignsState,
  id: string,
  change: (a: AdSet) => AdSet,
  description: string,
): Result {
  if (!findAdSet(state, id)) return { state, problems: ['That ad set no longer exists.'] }
  return {
    state: {
      ...state,
      campaigns: state.campaigns.map((c) => ({
        ...c,
        adSets: c.adSets.map((a) => (a.id === id ? change(a) : a)),
      })),
      changes: [...state.changes, { adSet: id, change: description }],
    },
    problems: [],
  }
}

export function setStatus(
  state: CampaignsState,
  id: string,
  status: AdSet['status'],
): Result {
  const adSet = findAdSet(state, id)
  if (status === 'active' && adSet && adSet.status === 'paused') {
    const total = activeDailyBudget(state) + adSet.dailyBudget
    if (total > state.dailyCap + 0.001) {
      return {
        state,
        problems: [
          `Turning it on takes the account to £${round2(total)} a day, over its £${state.dailyCap} limit.`,
        ],
      }
    }
  }
  return changeAdSet(
    state,
    id,
    (a) => ({ ...a, status }),
    status === 'paused' ? 'Paused' : 'Turned on',
  )
}

export function setDailyBudget(
  state: CampaignsState,
  id: string,
  budget: number,
): Result {
  if (!(budget >= 0)) return { state, problems: ['Enter a daily budget of £0 or more.'] }
  const adSet = findAdSet(state, id)
  if (!adSet) return { state, problems: ['That ad set no longer exists.'] }
  const others =
    activeDailyBudget(state) - (adSet.status === 'active' ? adSet.dailyBudget : 0)
  if (adSet.status === 'active' && others + budget > state.dailyCap + 0.001) {
    return {
      state,
      problems: [
        `That takes the account to £${round2(others + budget)} a day, over its £${state.dailyCap} daily limit.`,
      ],
    }
  }
  return changeAdSet(
    state,
    id,
    (a) => ({ ...a, dailyBudget: round2(budget) }),
    `Daily budget £${adSet.dailyBudget} → £${round2(budget)}`,
  )
}
