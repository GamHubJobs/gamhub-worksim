import type { AssignmentInput } from '../../schemas'
import { launchTraffic } from '../../../tools/analytics/data'
import { answer, breakdown, saveReport } from '../../../tools/analytics/model'
import type { AnalyticsState } from '../../../tools/analytics/schema'
import { launchAccount } from '../../../tools/campaigns/data'
import {
  allAdSets,
  metrics,
  pacing,
  setDailyBudget,
  setStatus,
} from '../../../tools/campaigns/model'

/**
 * Digital Marketing integrated project (Digital Marketing Manager): rescue
 * the Cash-flow Health Check launch. Three linked stages:
 *
 * 1. Site Analytics: find why visits don't become bookings.
 * 2. Ad Campaigns: stop the waste and bring the month back on budget.
 * 3. Grid Craft, Docs and Slides: the launch scorecard and the revised plan.
 *
 * Teaches: diagnosing a funnel before spending more, cutting waste without
 * cutting what works, and presenting a recovery plan.
 */
const PROJECT = 'launch-rescue'

const feedback = (excellent: string) => ({
  excellent: `Hi {name},

${excellent}

Sofia`,
  good: `Hi {name},

Good work; a few things need fixing. See the notes.

Sofia`,
  pass: `Hi {name},

The basics are there, but some results are not right yet. The notes explain which.

Sofia`,
  fail: `Hi {name},

Not yet. Have a look at the notes and try again.

Sofia`,
})

// ---------------------------------------------------------------------------
// Stage 1: Site Analytics
// ---------------------------------------------------------------------------

const traffic = launchTraffic()
const byLanding = breakdown(traffic, 'landing')
const launchPage = byLanding.find((r) => r.value === '/health-check')!
const worstEngagement = [...breakdown(traffic, 'source')].sort(
  (a, b) => a.engagementRate - b.engagementRate,
)[0]

const analyticsStart: AnalyticsState = {
  ...traffic,
  questions: [
    {
      id: 'page',
      question:
        'Which landing page sends the smallest share of its visitors on to pricing?',
      kind: 'choice',
      options: byLanding.map((r) => r.value).sort(),
      unit: '',
      answer: '',
    },
    {
      id: 'sessions',
      question: 'How many sessions landed on the Health Check page in these two weeks?',
      kind: 'number',
      options: [],
      unit: 'sessions',
      answer: '',
    },
    {
      id: 'source',
      question: 'Which traffic source has the lowest engagement rate?',
      kind: 'choice',
      options: [...new Set(traffic.rows.map((r) => r.source))].sort(),
      unit: '',
      answer: '',
    },
  ],
}

function analyticsSolution(): AnalyticsState {
  let s = saveReport(analyticsStart, {
    name: 'Landing pages',
    dimension: 'landing',
    filters: {},
  }).state
  s = saveReport(s, { name: 'Traffic sources', dimension: 'source', filters: {} }).state
  s = answer(s, 'page', '/health-check')
  s = answer(s, 'sessions', String(launchPage.sessions))
  s = answer(s, 'source', worstEngagement.value)
  return s
}

export const launchAnalytics: AssignmentInput = {
  id: 'launch-analytics',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'digital-marketing-manager',
  order: 9,
  projectId: PROJECT,
  stage: 1,
  kind: 'tool',
  title: 'Launch rescue, stage 1: why visits don’t book',
  summary: 'Use Site Analytics to find where the launch traffic gets stuck.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Project: rescuing the Health Check launch',
    body: `Hi {name},

Two weeks into the **Cash-flow Health Check** launch, we have plenty of visitors but very few bookings, and the ad budget is running far ahead. As Marketing Manager, please lead the rescue in three stages:

1. **Diagnose** in Site Analytics (this email).
2. **Fix the spending** in Ad Campaigns.
3. **The revised plan**: a scorecard, a short plan and slides for {director}.

First, before we spend another pound: in **Site Analytics**, save a report **by landing page** and one **by source**, and answer the three questions.

Sofia`,
  },
  whyItMatters:
    'More traffic cannot fix a broken page. Finding where visitors stop, before raising budgets, is the difference between a rescue and an expensive mistake.',
  objectives: [
    'Compare landing pages through the funnel',
    'Find the sources that bring visits but no engagement',
    'Size the problem before acting',
  ],
  steps: [
    {
      id: 'landing',
      title: 'By landing page',
      instructions:
        'Save a report by **landing page**. Compare how many visitors of each page go on to **pricing**.',
      hint: 'A page that gets lots of visits but sends almost nobody to pricing has a problem on the page itself.',
    },
    {
      id: 'source',
      title: 'By source',
      instructions: 'Save a report by **source** and compare the engagement rates.',
    },
    {
      id: 'answer',
      title: 'Answer and hand in',
      instructions: 'Answer the questions, then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'analytics',
    title: 'Site Analytics: Health Check launch',
    start: analyticsStart,
    solution: analyticsSolution(),
    checks: [
      {
        id: 'landing-report',
        type: 'report',
        dimension: 'landing',
        title: 'Report by landing page',
        points: 20,
        why: 'The landing page is where the launch visitors arrive.',
        hint: 'Save a report with the dimension set to landing page.',
      },
      {
        id: 'source-report',
        type: 'report',
        dimension: 'source',
        title: 'Report by source',
        points: 20,
        why: 'Sources show which spending brings real visitors.',
        hint: 'Save a report with the dimension set to source.',
      },
      {
        id: 'answers',
        type: 'answers',
        items: [
          { id: 'page', value: '/health-check', tolerance: 0 },
          { id: 'sessions', value: launchPage.sessions, tolerance: 0 },
          { id: 'source', value: worstEngagement.value, tolerance: 0 },
        ],
        title: 'The diagnosis',
        points: 60,
        why: 'These three facts decide what to fix first.',
        hint: 'Read them from your two reports.',
      },
    ],
  },
  passScore: 70,
  xp: 160,
  skills: { 'campaign-analytics': 40, 'data-analysis': 30 },
  feedback: feedback(
    `Found it: the Health Check page sends almost nobody to pricing (the “See prices” button was broken; it’s fixed now), and ${worstEngagement.value} brings visits that do nothing. Stage 2 is in your inbox.`,
  ),
}

// ---------------------------------------------------------------------------
// Stage 2: Ad Campaigns
// ---------------------------------------------------------------------------

const account = launchAccount()
const WASTE = ['social-broad', 'display-launch']
const KEEP = ['search-healthcheck', 'search-brand-launch', 'social-retarget-launch']

function campaignSolution() {
  let s = account
  for (const id of WASTE) s = setStatus(s, id, 'paused').state
  // Put what is left of the month's budget behind the best ad set.
  const p = pacing(s)
  const others = allAdSets(s)
    .filter((a) => a.status === 'active' && a.id !== 'search-healthcheck')
    .reduce((sum, a) => sum + a.dailyBudget, 0)
  const best = Math.floor((p.budget * 0.99 - p.spent) / p.remainingDays - others)
  return setDailyBudget(s, 'search-healthcheck', best).state
}
const campaignsEnd = campaignSolution()

export const launchCampaigns: AssignmentInput = {
  id: 'launch-campaigns',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'digital-marketing-manager',
  order: 10,
  projectId: PROJECT,
  stage: 2,
  kind: 'tool',
  title: 'Launch rescue, stage 2: fix the spending',
  summary: 'Pause what wastes money, back what works, and land June on budget.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Launch rescue, stage 2: the ad spending',
    body: `Hi {name},

The page is fixed. Now the money: at this rate June will go far over its **£16,500** budget. In **Ad Campaigns**:

• **Pause** the ad sets that return less than they cost.
• **Keep** the ones that work running, and give the best one (search for cash-flow help) the room it deserves.
• Make sure the month **lands on budget**: projected spend between 95% and 100% of £16,500.

Sofia`,
  },
  whyItMatters:
    'Rescuing a campaign is not about cutting everything: it is moving money from what doesn’t work to what does, and ending the month on budget.',
  objectives: [
    'Judge ad sets by return, not by volume',
    'Move budget to the best opportunity',
    'Land the month on budget',
  ],
  steps: [
    {
      id: 'review',
      title: 'Review',
      instructions: 'In **Ad sets**, compare each ad set’s ROAS (revenue ÷ spend).',
    },
    {
      id: 'pause',
      title: 'Pause the waste',
      instructions: 'Pause the ad sets with ROAS well below 1.',
    },
    {
      id: 'budget',
      title: 'Back the best and pace',
      instructions:
        'Raise the daily budget of **Search: cash-flow help** until **Pacing** shows the month between £15,675 and £16,500. Then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'campaigns',
    title: 'Ad Campaigns: June',
    start: account,
    solution: campaignsEnd,
    checks: [
      {
        id: 'paused',
        type: 'status',
        status: 'paused',
        adSets: WASTE,
        title: 'Money-losing ad sets paused',
        points: 30,
        why: 'Every pound there brings back far less than a pound.',
        hint: 'The broad social audience and the display ads.',
      },
      {
        id: 'kept',
        type: 'status',
        status: 'active',
        adSets: KEEP,
        title: 'What works kept running',
        points: 20,
        why: 'Cutting what works to save money loses more than it saves.',
        hint: 'Keep every ad set with ROAS of 1 or more switched on.',
      },
      {
        id: 'backed',
        type: 'budget',
        adSet: 'search-healthcheck',
        min: 220,
        title: 'Budget moved to the best ad set',
        points: 20,
        why: 'Cash-flow search earns several pounds for every pound: it can use more.',
        hint: 'Raise Search: cash-flow help above £220 a day.',
      },
      {
        id: 'pacing',
        type: 'pacing',
        min: 0.95,
        max: 1,
        title: 'June lands on budget',
        points: 30,
        why: 'Over budget breaks the agreement with Finance; well under wastes the launch.',
        hint: 'Projected spend between £15,675 and £16,500.',
      },
    ],
  },
  passScore: 70,
  xp: 160,
  skills: { 'campaign-analytics': 45, 'data-analysis': 20, accuracy: 10 },
  feedback: feedback(
    'June is back on budget, and the money now goes where the bookings come from. Stage 3 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 3: the scorecard and the revised plan
// ---------------------------------------------------------------------------

const header = { bold: true, fill: 'gray' } as const
const right = { ...header, align: 'right' } as const
const scorecard = allAdSets(account).map((a) => {
  const m = metrics(a.results)
  return { name: a.name, spend: Math.round(m.spend), revenue: Math.round(m.revenue) }
})
const last = scorecard.length + 1

export const launchPlan: AssignmentInput = {
  id: 'launch-plan',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'digital-marketing-manager',
  order: 11,
  projectId: PROJECT,
  stage: 3,
  title: 'Launch rescue, stage 3: the revised plan',
  summary: 'Score the first two weeks, then write the revised plan and present it.',
  estimatedMinutes: 50,
  from: 'manager',
  briefing: {
    subject: 'Launch rescue, stage 3: the revised plan',
    body: `Hi {name},

Last stage: {director} wants to see the recovery.

**1. The scorecard (Grid Craft).** The first two weeks by ad set. Add each ad set’s **ROAS** (revenue ÷ spend), a decision (**“Keep”** when ROAS is 1 or more, otherwise “Pause”), the totals and the overall ROAS, and a chart.

**2. The plan (Docs).** What went wrong (the launch page and the wasted spending), what you changed, the **total spend** and **overall ROAS** of the first two weeks, and what happens next.

**3. The slides.** 3 to 6 slides with the same story.

Reply with all three files.

Sofia`,
  },
  whyItMatters:
    'A rescue only counts when the people who fund it understand it: what went wrong, what changed, and why the next two weeks will be different.',
  objectives: [
    'Score ad sets by return',
    'Explain a recovery plan in writing',
    'Present it with the same figures',
  ],
  steps: [
    {
      id: 'scorecard',
      title: 'The scorecard',
      instructions: `Rows 2 to ${last}: **D** \`=C2/B2\`, **E** \`=IF(D2>=1, "Keep", "Pause")\`. Row ${last + 1}: totals of spend and revenue, and the overall ROAS.`,
    },
    {
      id: 'chart',
      title: 'Chart',
      instructions: `Select **A1:C${last}** and add a chart of spend and revenue by ad set.`,
    },
    {
      id: 'plan',
      title: 'The plan and the slides',
      instructions:
        'In **Docs**, open **Health Check: revised launch plan**; in **Slides**, **Health Check: recovery**.',
    },
    {
      id: 'send',
      title: 'Hand in',
      instructions: 'Reply to {manager}’s email with the three files attached.',
    },
  ],
  workbook: {
    title: 'Health Check launch scorecard',
    sheets: [
      {
        name: 'Ad sets',
        columnWidths: { A: 230, B: 100, C: 100, D: 80, E: 90 },
        cells: {
          A1: { input: 'Ad set', format: header },
          B1: { input: 'Spend', format: right },
          C1: { input: 'Revenue', format: right },
          D1: { input: 'ROAS', format: right },
          E1: { input: 'Decision', format: header },
          ...Object.fromEntries(
            scorecard.flatMap((row, i) => [
              [`A${i + 2}`, row.name],
              [`B${i + 2}`, String(row.spend)],
              [`C${i + 2}`, String(row.revenue)],
            ]),
          ),
          [`A${last + 1}`]: { input: 'Total', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    'Ad sets': {
      ...Object.fromEntries(
        scorecard.flatMap((_, i) => [
          [`D${i + 2}`, `=C${i + 2}/B${i + 2}`],
          [`E${i + 2}`, `=IF(D${i + 2}>=1, "Keep", "Pause")`],
        ]),
      ),
      [`B${last + 1}`]: `=SUM(B2:B${last})`,
      [`C${last + 1}`]: `=SUM(C2:C${last})`,
      [`D${last + 1}`]: `=C${last + 1}/B${last + 1}`,
    },
  },
  scenarios: [
    {
      description: 'Late bookings are credited to the display ads',
      changes: { [`Ad sets!C${last}`]: String(scorecard[last - 2].revenue + 1500) },
    },
  ],
  checks: [
    {
      id: 'roas',
      type: 'values',
      title: 'ROAS by ad set',
      cells: [`Ad sets!D2:D${last}`],
      requireFormula: true,
      points: 15,
      why: 'ROAS is how marketing money is judged.',
      hint: 'D2 =C2/B2, filled down.',
    },
    {
      id: 'decisions',
      type: 'values',
      title: 'Keep or pause',
      cells: [`Ad sets!E2:E${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 10,
      why: 'The decisions match what you did in stage 2.',
      hint: 'E2 =IF(D2>=1, "Keep", "Pause"), filled down.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Totals and overall ROAS',
      cells: [`Ad sets!B${last + 1}:D${last + 1}`],
      requireFormula: true,
      points: 10,
      why: 'The overall return is the headline of the plan.',
      hint: `B${last + 1} and C${last + 1} =SUM(…), D${last + 1} =C${last + 1}/B${last + 1}.`,
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of the ad sets',
      cells: [`Ad sets!A1:C${last}`],
      points: 5,
      why: 'The slides need it.',
      hint: `Select A1:C${last} and add a chart.`,
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Health Check: revised launch plan',
      template: 'report',
      checks: [
        {
          id: 'plan-sections',
          type: 'sections',
          title: 'Plan structure',
          sections: [
            ['Executive summary', 'Summary'],
            ['Findings'],
            ['Recommendations', 'Recommendation'],
          ],
          points: 10,
          why: 'The director reads the summary and the recommendations first.',
          hint: 'Keep the headings: Executive summary, Findings, Recommendations.',
        },
        {
          id: 'plan-figures',
          type: 'figures',
          title: 'The key figures',
          figures: [
            { label: 'total spend in the first two weeks', cell: `Ad sets!B${last + 1}` },
            { label: 'overall ROAS', cell: `Ad sets!D${last + 1}` },
          ],
          points: 20,
          why: 'Every figure must match the scorecard.',
          hint: `B${last + 1} and D${last + 1} of the scorecard.`,
        },
        {
          id: 'plan-causes',
          type: 'mentions',
          title: 'What went wrong, and what changed',
          terms: [
            ['landing page', 'Health Check page', 'launch page'],
            ['pause', 'paused'],
            ['budget'],
          ],
          points: 10,
          why: 'The plan must explain both problems and both fixes.',
          hint: 'The landing page, the paused ad sets and the budget.',
        },
      ],
    },
    {
      kind: 'slides',
      title: 'Health Check: recovery',
      template: 'project-update',
      checks: [
        {
          id: 'slides-length',
          type: 'length',
          min: 3,
          max: 6,
          title: 'Number of slides',
          points: 10,
          why: 'A short update for a busy director.',
          hint: 'Keep 3 to 6 slides.',
        },
        {
          id: 'slides-chart',
          type: 'charts',
          min: 1,
          title: 'A chart on a slide',
          points: 10,
          why: 'The chart shows where the money went.',
          hint: 'In Slides, click Chart in the toolbar and choose your chart.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 220,
  skills: { 'campaign-analytics': 30, presentation: 25, 'content-strategy': 25 },
  feedback: feedback(
    'The launch is back on track: the page works, the money goes where bookings come from, and {director} has signed off the plan. A real rescue. Well done.',
  ),
}
