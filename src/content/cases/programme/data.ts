/** Programme cases: data-analytics. */
import type { CaseInput } from '../schema'
import { brief, replies, stage } from './shared'

const data1: CaseInput = {
  ...stage('data-analytics', 1),
  id: 'prog-data-case',
  version: 1,
  careerId: 'data-analytics',
  title: 'Manchester office: check the business case',
  summary:
    'Check the business case’s numbers and its assumptions before the board relies on it.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'portfolio-review' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester programme: the business case',
    body: `Hi {name},

Our part of the Manchester programme: check the business case before it goes back to the board (summary attached). Is the payback right, and are the assumptions sound?

Amara`,
  },
  whyItMatters:
    'Business cases drive big decisions. An analyst’s job is to check the arithmetic and, just as important, the assumptions behind it.',
  objectives: ['Check a payback calculation', 'Challenge assumptions with evidence'],
  evidence: [
    brief,
    {
      id: 'case',
      title: 'Business case summary (from Finance)',
      text: 'One-off cost **£420,000**. Expected profit from Manchester **£140,000 a year** from year 2. Assumes the team is fully productive **from day one** and that **all 20 hires** start by 1 September.',
    },
  ],
  steps: [
    {
      id: 'payback',
      kind: 'figure',
      title: 'Payback',
      prompt: 'How many years of £140,000 profit pay back the £420,000?',
      points: 30,
      answer: 3,
      tolerance: 0,
      unit: 'years',
      why: '£420,000 ÷ £140,000 = 3 years.',
    },
    {
      id: 'assumptions',
      kind: 'review',
      title: 'The assumptions',
      prompt: 'Which assumptions are risky?',
      points: 40,
      findings: [
        {
          id: 'day-one',
          text: 'Fully productive from day one.',
          issue: true,
          why: 'New teams take months to ramp up.',
        },
        {
          id: 'all-hires',
          text: 'All 20 hires starting by 1 September.',
          issue: true,
          why: 'Recruitment is already running late for developers.',
        },
        {
          id: 'cost',
          text: 'The one-off cost of £420,000.',
          issue: false,
          why: 'That is the approved budget, with contingency.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'Amara Nwosu',
      title: 'Your note',
      prompt: 'Summarise your check for the board.',
      points: 30,
      minWords: 40,
      mentions: [
        ['3 years', 'three years'],
        ['ramp', 'day one'],
        ['hire', 'recruit'],
      ],
      avoid: [],
      model:
        'The arithmetic is right: £420,000 paid back by £140,000 a year takes 3 years. But two assumptions are optimistic: the team won’t be fully productive from day one, as new teams take months to ramp up, and not all 20 hires will start by 1 September. I suggest the board also sees a cautious case with a slower ramp-up. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Amara',
    'The board asked for the cautious case, and approved the programme knowing the real risks. Exactly our job.',
  ),
  lapseLog: 'The business case went to the board unchecked.',
  skills: { 'data-analysis': 25, 'insight-communication': 20 },
  xp: 140,
}

const data2: CaseInput = {
  ...stage('data-analytics', 2),
  id: 'prog-data-review',
  version: 1,
  careerId: 'data-analytics',
  title: 'Manchester office: measure success fairly',
  summary: 'Leadership wants to compare Manchester with London. Recommend fair measures.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterCase: 'prog-data-case' },
  deadlineHours: 6,
  email: {
    subject: 'Programme review: how do we judge Manchester?',
    body: `Hi {name},

A director wants to judge Manchester by comparing its revenue per person with London’s, after three months. What do you recommend?

Amara`,
  },
  whyItMatters:
    'Unfair comparisons lead to bad decisions about people and offices. Analysts design measures that compare like with like.',
  objectives: ['Design fair success measures', 'Explain why a comparison is unfair'],
  evidence: [
    brief,
    {
      id: 'compare',
      title: 'Revenue per person, last quarter',
      text: 'London: £38,000 (established, 95 staff). Manchester: £11,600 (first quarter, team still hiring).',
    },
  ],
  steps: [
    {
      id: 'measure',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'How should Manchester be judged?',
      points: 50,
      options: [
        {
          id: 'trajectory',
          label:
            'Against its own ramp-up plan, and against London’s first year, not London today',
          verdict: 'best',
          why: 'It compares like with like and shows whether the office is on track.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'london',
          label: 'Against London today: the business needs the same results',
          verdict: 'poor',
          why: 'An established office will always look better than a three-month-old one.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'none',
          label: 'Don’t measure it for a year',
          verdict: 'acceptable',
          why: 'Avoids unfairness, but a new office needs early signs of whether it is on track.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'The programme review',
      title: 'Your note',
      prompt: 'Explain your recommendation.',
      points: 50,
      minWords: 40,
      mentions: [['ramp', 'plan'], ['first year', 'like with like'], ['London']],
      avoid: [{ terms: ['underperforming'], why: 'It isn’t: it is new.' }],
      model:
        'Comparing Manchester with London today isn’t like with like: London is established, Manchester is three months old and still hiring. I recommend we judge Manchester against its own ramp-up plan, and against London’s figures from its own first year. On that basis it is on track. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { reputation: -1 },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Amara',
    'Leadership adopted your measures. The Manchester team felt fairly treated, and they’re ahead of plan.',
  ),
  lapseLog: 'Manchester was judged against London without a fair comparison.',
  skills: { 'insight-communication': 25, 'data-analysis': 15 },
  xp: 120,
}

export const PROGRAMME_DATA: CaseInput[] = [data1, data2]
