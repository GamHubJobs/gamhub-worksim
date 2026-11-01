import type { AssignmentInput } from '../../schemas'
import { aprilAccount } from '../../../tools/campaigns/data'
import { setDailyBudget, setStatus } from '../../../tools/campaigns/model'
import type { CampaignsState } from '../../../tools/campaigns/schema'

/**
 * Digital Marketing (Digital Marketing Executive): the April campaigns are
 * overspending. Pause what loses money, move budget to what earns it, and
 * land the month on budget. Teaches: judging ad sets by ROAS and CPA, budget
 * pacing, and reallocating rather than only cutting.
 */
const start = aprilAccount()

function solution(): CampaignsState {
  let s = start
  for (const id of ['social-lookalike', 'display-news', 'social-jobtitles']) {
    s = setStatus(s, id, 'paused').state
  }
  const result = setDailyBudget(s, 'search-advisory', 300)
  if (result.problems.length > 0) throw new Error(result.problems.join(' '))
  return result.state
}

export const campaignBudget: AssignmentInput = {
  id: 'campaign-budget',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'digital-marketing-executive',
  order: 6,
  kind: 'tool',
  title: 'Rescue the April ad budget',
  summary:
    'Stop the ad sets that lose money and land the month on budget, without wasting it.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'URGENT: April ads are £3,600 over budget',
    body: `Hi {name},

Half way through April, **Ad Campaigns** says we’ll spend about £21,600 against an £18,000 budget. Finance has noticed.

Please fix it today:
• **pause** every ad set that loses money over the last 14 days (ROAS below 1),
• keep the ones that earn their money running,
• move some budget to the ad set that earns well **and** is held back by its budget, so we don’t waste the opportunity,
• land the projected month spend between **95% and 100%** of the £18,000 budget.

Brand search already shows for every search of our name, so more budget there buys nothing. {senior} looks after search and is happy for you to make the call.

Sofia`,
  },
  whyItMatters:
    'Paid media is where marketing money is spent fastest. Knowing which ads earn their keep, cutting the rest quickly, and putting the money where it works (while landing exactly on budget) is a core skill for anyone running campaigns.',
  objectives: [
    'Judge ad sets by ROAS and CPA over a fair period',
    'Pause losers and reallocate budget to winners',
    'Pace the month to land on budget',
  ],
  steps: [
    {
      id: 'review',
      title: 'Review the ad sets',
      instructions:
        'Open **Campaigns** and look at the last 14 days. ROAS is in the last column: below 1 (red) loses money.',
    },
    {
      id: 'pause',
      title: 'Pause the losers',
      instructions:
        'Switch off every ad set with ROAS below 1. Watch the projected spend at the top change.',
    },
    {
      id: 'reallocate',
      title: 'Reallocate',
      instructions:
        'Raise the daily budget of the strong ad set that spends all of its budget every day (Search: advisory services). Aim for a projected month of £17,100–£18,000.',
      hint: 'Projected = spent so far + active daily budgets × days left. The overview shows the daily budget that lands exactly on £18,000.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Check the **Change history**, then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'campaigns',
    title: 'Ad Campaigns: April',
    start,
    solution: solution(),
    checks: [
      {
        id: 'paused',
        type: 'status',
        status: 'paused',
        adSets: ['social-lookalike', 'display-news', 'social-jobtitles'],
        title: 'Money-losing ad sets paused',
        points: 30,
        why: 'Every pound in an ad set with ROAS below 1 brings back less than a pound.',
        hint: 'Lookalike audience (0.58), display (0.40) and finance job titles (0.83).',
      },
      {
        id: 'kept',
        type: 'status',
        status: 'active',
        adSets: [
          'search-advisory',
          'search-brand',
          'social-retargeting',
          'search-workshops',
        ],
        title: 'Profitable ad sets kept running',
        points: 20,
        why: 'Cutting what works to save money loses more than it saves.',
        hint: 'Keep every ad set with ROAS of 1 or more switched on.',
      },
      {
        id: 'reallocated',
        type: 'budget',
        adSet: 'search-advisory',
        min: 250,
        title: 'Budget moved to the best opportunity',
        points: 20,
        why: 'Advisory search earns over £4 for every £1 and spends its whole budget: it can use more.',
        hint: 'Raise Search: advisory services to at least £250 a day.',
      },
      {
        id: 'pacing',
        type: 'pacing',
        min: 0.95,
        max: 1,
        title: 'The month lands on budget',
        points: 30,
        why: 'Over budget breaks the agreement with Finance; well under wastes the opportunity.',
        hint: 'Projected spend between £17,100 and £18,000.',
      },
    ],
  },
  passScore: 70,
  xp: 140,
  skills: { 'campaign-analytics': 55, 'data-analysis': 25, accuracy: 15 },
  feedback: {
    excellent: `Hi {name},

That’s how it’s done: three money-losers off, the budget moved to advisory search where it earns over four times its cost, and April lands just under £18,000. Finance is happy, and so am I.

Sofia`,
    good: `Hi {name},

Nearly; the pacing or the reallocation needs a tweak. See the notes.

Sofia`,
    pass: `Hi {name},

We’re still losing money or missing the budget. The notes show where.

Sofia`,
    fail: `Hi {name},

Start by pausing the ad sets with ROAS below 1, then look at the projected spend.

Sofia`,
  },
}
