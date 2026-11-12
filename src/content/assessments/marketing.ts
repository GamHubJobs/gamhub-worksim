/** Readiness assessments: digital-marketing. */
import type { CaseInput } from '../cases/schema'
import { gbp, forms, assessment, report } from './shared'

/** Level 2: campaign performance and budget moves. */
function mktCampaign(p: {
  version: string
  practical: string
  a: [number, number]
  b: [number, number]
  c: [number, number]
  target: number
}) {
  const spend = p.a[0] + p.b[0] + p.c[0]
  const conversions = p.a[1] + p.b[1] + p.c[1]
  const cpa = Math.round((spend / conversions) * 100) / 100
  const cpaB = p.b[0] / p.b[1]
  return assessment({
    practical: p.practical,
    id: 'ready-mkt-practitioner',
    careerId: 'digital-marketing',
    level: 2,
    title: 'Readiness assessment: fix the campaign',
    summary: 'Analyse a campaign, find the problems, adjust the spend and recommend.',
    brief: `This assessment checks that you can manage campaign performance.

Analyse the search campaign’s three ad groups, work out its cost per conversion, decide how to move the budget, write your recommendations in Word Craft, and update the client. You have 3 hours.`,
    whyItMatters:
      'Executives at the next level are trusted with clients’ budgets. Reading performance correctly and moving money to what works is the core of the job.',
    objectives: [
      'Analyse ad group performance',
      'Work out cost per conversion',
      'Recommend budget changes',
    ],
    evidence: [
      {
        id: 'groups',
        title: 'Search campaign, last 30 days',
        table: {
          head: ['Ad group', 'Spend', 'Conversions', 'Cost per conversion'],
          rows: [
            ['A: brand', gbp(p.a[0]), String(p.a[1]), gbp(p.a[0] / p.a[1])],
            ['B: generic', gbp(p.b[0]), String(p.b[1]), gbp(cpaB)],
            ['C: competitor', gbp(p.c[0]), String(p.c[1]), gbp(p.c[0] / p.c[1])],
          ],
        },
      },
      {
        id: 'target',
        title: 'The client’s target',
        text: `A cost per conversion of ${gbp(p.target)} or less across the campaign.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Read the performance',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'b-high',
            text: 'Ad group B costs more than twice the target per conversion.',
            issue: true,
            why: `${gbp(cpaB)} against a ${gbp(p.target)} target.`,
          },
          {
            id: 'c-best',
            text: 'Ad group C has the lowest cost per conversion.',
            issue: true,
            why: `${gbp(p.c[0] / p.c[1])}, the lowest of the three.`,
          },
          {
            id: 'pause-a',
            text: 'Ad group A should be paused.',
            issue: false,
            why: 'It converts below target: pausing it would lose good conversions.',
          },
          {
            id: 'all-bad',
            text: 'Every ad group is above target.',
            issue: false,
            why: 'Only B is; A and C are below target.',
          },
        ],
      },
      {
        id: 'cpa',
        kind: 'figure',
        title: 'The campaign’s cost per conversion',
        prompt: 'What is the cost per conversion across the whole campaign?',
        points: 15,
        answer: cpa,
        tolerance: 0.01,
        unit: '£',
        why: `${gbp(spend)} ÷ ${conversions} conversions = ${gbp(cpa)}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The budget',
        prompt: 'What do you change?',
        points: 15,
        options: [
          {
            id: 'move',
            label:
              'Move half of B’s budget to A and C, and test new keywords and ads in B',
            verdict: 'best',
            why: 'Money moves to what works now, while B gets a fair chance to improve.',
          },
          {
            id: 'raise-all',
            label: 'Increase every ad group’s budget by 20%',
            verdict: 'poor',
            why: 'It puts more money into the worst performer too.',
          },
          {
            id: 'pause-b',
            label: 'Pause ad group B completely',
            verdict: 'acceptable',
            why: 'It stops the waste, but gives up the generic searches B could win with better ads.',
          },
        ],
      },
      report(
        'Campaign recommendations',
        [
          ['Performance', 'Results'],
          ['Recommendations', 'Next steps'],
        ],
        [
          { label: 'the campaign cost per conversion', value: cpa },
          { label: 'ad group B’s cost per conversion', value: cpaB },
        ],
        [
          ['group B', 'ad group B', 'generic'],
          ['test', 'keywords'],
        ],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the client',
        title: 'Update the client',
        prompt:
          'Write to the client: how the campaign is doing, the problem and what you are changing.',
        points: 20,
        minWords: 40,
        model: `Hi, the campaign is running at ${gbp(cpa)} per conversion. Brand and competitor ads are doing well; generic ads (group B) cost ${gbp(cpaB)} per conversion, well above your ${gbp(p.target)} target. I am moving half of B’s budget to the stronger groups and testing new keywords and ads in B. I will report back in two weeks. Best, {name}`,
        mentions: [[String(cpa), gbp(cpa)], ['group B', 'generic'], ['test']],
        avoid: [
          { terms: ['guarantee'], why: 'Never promise results you cannot control.' },
        ],
      },
    ],
    skills: { 'campaign-analytics': 30, 'content-strategy': 15 },
  })
}

/** Level 3: planning next quarter's budget across channels. */
function mktPlan(p: {
  version: string
  practical: string
  budget: number
  email: number
  search: number
  social: number
  returns: [number, number, number]
}) {
  const [re, rs, rso] = p.returns
  const revenue = p.email * re + p.search * rs + p.social * rso
  return assessment({
    practical: p.practical,
    id: 'ready-mkt-senior',
    careerId: 'digital-marketing',
    level: 3,
    title: 'Readiness assessment: plan next quarter’s budget',
    summary: 'Recommend how to split next quarter’s budget across channels, and why.',
    brief: `This assessment checks that you can plan a marketing budget.

Assess the channels’ returns and limits, work out the expected revenue of the draft plan, decide what to recommend, write the budget plan in Word Craft, and send it to the Head of Marketing. You have 3 hours.`,
    whyItMatters:
      'Specialists plan budgets, not just campaigns. That means understanding returns, limits and risk, and explaining the trade-offs.',
    objectives: [
      'Compare channel returns',
      'Estimate expected revenue',
      'Recommend and justify a plan',
    ],
    evidence: [
      {
        id: 'channels',
        title: 'Channel returns (last two quarters)',
        table: {
          head: ['Channel', 'Revenue per £1 spent', 'Notes'],
          rows: [
            ['Email', gbp(re), `Our list can absorb about ${gbp(p.email)} a quarter`],
            ['Search', gbp(rs), 'Returns fall slowly as spend rises'],
            ['Social', gbp(rso), 'Builds awareness; helps search and email conversions'],
          ],
        },
      },
      {
        id: 'draft',
        title: 'The draft plan',
        text: `Budget ${gbp(p.budget)}: email ${gbp(p.email)}, search ${gbp(p.search)}, social ${gbp(p.social)}.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Assess the channels',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'email-best',
            text: 'Email returns the most per pound.',
            issue: true,
            why: `${gbp(re)} per £1, the highest.`,
          },
          {
            id: 'email-all',
            text: 'The whole budget should go into email.',
            issue: false,
            why: `The list can only absorb about ${gbp(p.email)}; more would just annoy subscribers.`,
          },
          {
            id: 'diminishing',
            text: 'The last pounds spent in a channel usually earn less than the average.',
            issue: true,
            why: 'Diminishing returns: the best opportunities are bought first.',
          },
          {
            id: 'social-none',
            text: 'Social has no value because its return is lowest.',
            issue: false,
            why: 'It builds awareness that helps other channels convert.',
          },
        ],
      },
      {
        id: 'revenue',
        kind: 'figure',
        title: 'Expected revenue',
        prompt: 'What revenue does the draft plan expect, using the channel returns?',
        points: 15,
        answer: revenue,
        tolerance: 0.5,
        unit: '£',
        why: `${gbp(p.email)} × ${re} + ${gbp(p.search)} × ${rs} + ${gbp(p.social)} × ${rso} = ${gbp(revenue)}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your recommendation',
        prompt: 'What do you recommend?',
        points: 15,
        options: [
          {
            id: 'plan-test',
            label:
              'Approve the plan, and test a smaller social budget in one region to measure its effect on search and email',
            verdict: 'best',
            why: 'It funds what works, respects channel limits, and measures the channel whose value is least certain.',
          },
          {
            id: 'all-search',
            label:
              'Move everything except email into search, which returns more than social',
            verdict: 'poor',
            why: 'It ignores diminishing returns and the help social gives other channels.',
          },
          {
            id: 'same',
            label: 'Keep last quarter’s split without changes',
            verdict: 'acceptable',
            why: 'Safe, but it learns nothing about the channel whose value is uncertain.',
          },
        ],
      },
      report(
        'Budget plan: next quarter',
        [
          ['Summary'],
          ['Channels', 'Allocation', 'Budget'],
          ['Recommendations', 'Recommendation'],
        ],
        [{ label: 'the expected revenue', value: revenue }],
        [['email'], ['test', 'measure']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the Head of Marketing',
        title: 'Send the plan',
        prompt:
          'Write to the Head of Marketing: the plan, the expected revenue and the test you propose.',
        points: 20,
        minWords: 40,
        model: `Hi, the budget plan is attached. The draft split of ${gbp(p.budget)} is expected to bring in about ${gbp(revenue)}. Email returns the most but is capped by our list size, and search returns fall as spend rises. I recommend approving it, with a test of a smaller social budget in one region to measure what social adds. Thanks, {name}`,
        mentions: [forms(revenue), ['email'], ['test', 'measure']],
        avoid: [
          {
            terms: ['guaranteed'],
            why: 'Expected revenue is an estimate, not a promise.',
          },
        ],
      },
    ],
    skills: { 'campaign-analytics': 25, 'content-strategy': 25 },
  })
}

export const ASSESSMENTS_MARKETING: Record<string, CaseInput[]> = {
  'ready-mkt-practitioner': [
    mktCampaign({
      version: 'a',
      practical: 'campaign-budget',
      a: [1200, 48],
      b: [900, 12],
      c: [600, 30],
      target: 30,
    }),
    mktCampaign({
      version: 'b',
      practical: 'seo-fixes',
      a: [1500, 60],
      b: [1000, 10],
      c: [700, 35],
      target: 35,
    }),
  ],
  'ready-mkt-senior': [
    mktPlan({
      version: 'a',
      practical: 'funnel-analysis',
      budget: 20000,
      email: 2000,
      search: 12000,
      social: 6000,
      returns: [6, 4, 2.5],
    }),
    mktPlan({
      version: 'b',
      practical: 'quarterly-campaign-report',
      budget: 25000,
      email: 3000,
      search: 15000,
      social: 7000,
      returns: [5, 4, 2],
    }),
  ],
}
