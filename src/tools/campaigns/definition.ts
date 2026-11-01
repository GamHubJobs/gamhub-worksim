/** Ad Campaigns, the paid advertising manager: its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult, formatMoney } from '../checks'
import type { ToolDefinition } from '../types'
import { aprilAccount } from './data'
import { findAdSet, pacing } from './model'
import { CampaignsStateSchema, type CampaignsState } from './schema'

export const CampaignsCheckSchema = z.discriminatedUnion('type', [
  /** These ad sets have this status. */
  FileCheckBaseSchema.extend({
    type: z.literal('status'),
    status: z.enum(['active', 'paused']),
    adSets: z.array(z.string()).min(1),
  }),
  /** The month's projected spend is within this share of the budget. */
  FileCheckBaseSchema.extend({
    type: z.literal('pacing'),
    min: z.number().min(0).max(2),
    max: z.number().min(0).max(2),
  }),
  /** An ad set's daily budget is at least (or at most) this amount. */
  FileCheckBaseSchema.extend({
    type: z.literal('budget'),
    adSet: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
])
export type CampaignsCheck = z.infer<typeof CampaignsCheckSchema>

function gradeCheck(check: CampaignsCheck, player: CampaignsState) {
  switch (check.type) {
    case 'status': {
      const wrong = check.adSets.filter(
        (id) => findAdSet(player, id)?.status !== check.status,
      )
      return checkResult(
        check,
        1 - wrong.length / check.adSets.length,
        wrong.map(
          (id) => `${findAdSet(player, id)?.name ?? id} should be ${check.status}.`,
        ),
      )
    }
    case 'pacing': {
      const p = pacing(player)
      const share = p.projected / p.budget
      const ok = share >= check.min - 1e-9 && share <= check.max + 1e-9
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [
              `The month is projected to spend ${formatMoney(p.projected)}: ${Math.round(share * 100)}% of the ${formatMoney(p.budget)} budget (aim for ${Math.round(check.min * 100)}–${Math.round(check.max * 100)}%).`,
            ],
      )
    }
    case 'budget': {
      const adSet = findAdSet(player, check.adSet)
      const budget = adSet?.dailyBudget ?? 0
      const ok =
        !!adSet &&
        adSet.status === 'active' &&
        (check.min === undefined || budget >= check.min) &&
        (check.max === undefined || budget <= check.max)
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [
              `${adSet?.name ?? check.adSet} has ${formatMoney(budget)} a day${adSet?.status === 'paused' ? ' and is paused' : ''}.`,
            ],
      )
    }
  }
}

export const campaigns: ToolDefinition<CampaignsState, CampaignsCheck> = {
  id: 'campaigns',
  name: 'Ad Campaigns',
  category: 'Paid advertising manager',
  icon: 'campaigns',
  sections: [
    {
      id: 'overview',
      name: 'Overview',
      description: 'The month’s budget, spend to date and projected spend.',
    },
    {
      id: 'adsets',
      name: 'Campaigns',
      description: 'Every ad set’s results, status and daily budget.',
    },
    {
      id: 'changes',
      name: 'Change history',
      description: 'Every change made to the account.',
    },
  ],
  state: CampaignsStateSchema,
  practice: () => aprilAccount(),
  summary: (state) => {
    const p = pacing(state)
    return `Projected ${formatMoney(p.projected)} of ${formatMoney(p.budget)}`
  },
  check: CampaignsCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The account was not handed in.']),
    ),
  guide: {
    intro:
      'Ad Campaigns is where paid advertising is run: each campaign has ad sets (an audience on a channel) with a daily budget. A digital marketer’s job here is to keep money flowing to what earns it, stop what doesn’t, and land the month on budget.',
    topics: [
      {
        title: 'Judge an ad set',
        body: 'Look at ROAS (revenue ÷ spend) and CPA (spend ÷ conversions) over a long enough period, at least a week or two, not a single day. ROAS below 1 means each pound spent brings back less than a pound. A high CTR with few conversions means the ad attracts the wrong people.',
      },
      {
        title: 'Pacing',
        body: 'Projected spend = spent so far + (active daily budgets × days left in the month). If it is over the monthly budget, cut or pause; if it is well under, the money is not working for you. The overview shows the daily budget that would land exactly on budget.',
      },
      {
        title: 'Reallocate',
        body: 'Pause what loses money, then move budget to ad sets that earn well and are limited by their budget (they spend all of it every day). Some ad sets can’t use more: brand-name search already appears for everyone searching your name, so more budget buys nothing.',
      },
    ],
    glossary: [
      {
        term: 'Ad set',
        meaning: 'A target audience on one channel, with its own budget.',
      },
      { term: 'CTR', meaning: 'Click-through rate: clicks ÷ impressions.' },
      { term: 'CPC', meaning: 'Cost per click: spend ÷ clicks.' },
      { term: 'CPA', meaning: 'Cost per acquisition: spend ÷ conversions.' },
      {
        term: 'ROAS',
        meaning: 'Return on ad spend: revenue ÷ spend. Below 1 loses money.',
      },
      {
        term: 'Pacing',
        meaning: 'Whether spending is on track to land on the month’s budget.',
      },
    ],
  },
}
