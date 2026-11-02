/** Advanced cases: data-analytics. */
import type { CaseInput } from '../schema'
import { replies, OUTCOMES } from './shared'

/** Data Analysis: a director wants to present a biased survey as everyone's view. */
const dataBias: CaseInput = {
  id: 'adv-data-survey-bias',
  version: 1,
  careerId: 'data-analytics',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: '“Customers love the app”',
  summary: 'Sales wants to tell the board that 92% of customers are happy with the app.',
  from: { name: 'Gemma Ward', role: 'Sales Director', organisation: 'Sales' },
  trigger: {},
  deadlineHours: 5,
  email: {
    subject: 'Headline for the board: 92% love the app',
    body: `Hi,

Great news from the in-app survey: **92% satisfied**! Can you put “92% of customers are satisfied with the app” on the first slide of tomorrow’s board pack?

Gemma`,
  },
  whyItMatters:
    'Who answered a survey decides what it can tell you. An in-app survey only hears from people still using the app. Analysts protect decision-makers from conclusions the data cannot support, and still give them the useful finding.',
  objectives: [
    'Spot a biased sample',
    'Say exactly what the data shows',
    'Suggest how to get a fair answer',
  ],
  evidence: [
    {
      id: 'survey',
      title: 'The in-app survey',
      table: {
        head: ['Measure', 'Value'],
        rows: [
          ['Customers', '12,000'],
          ['Customers using the app this month', '2,000'],
          ['Survey responses (shown inside the app)', '250'],
          ['Satisfied or very satisfied', '230 (92%)'],
        ],
      },
    },
    {
      id: 'complaints',
      title: 'Complaints log',
      text: '140 complaints about the app this month, mostly from customers who say they have stopped using it.',
    },
  ],
  steps: [
    {
      id: 'sample',
      kind: 'review',
      title: 'Who answered?',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'app-only',
          text: 'Only customers who use the app could answer the survey.',
          issue: true,
          why: 'It was shown inside the app, so non-users never saw it.',
        },
        {
          id: 'all-customers',
          text: '92% of all customers are satisfied with the app.',
          issue: false,
          why: 'The 92% is of 250 app users who answered, not of 12,000 customers.',
        },
        {
          id: 'leavers',
          text: 'Customers who stopped using the app could not be asked.',
          issue: true,
          why: 'Those are the people most likely to be unhappy, and the complaints log suggests there are many.',
        },
        {
          id: 'too-few',
          text: '250 responses are too few to say anything at all.',
          issue: false,
          why: 'They say something useful about people who still use the app; they just cannot speak for everyone.',
        },
      ],
    },
    {
      id: 'rate',
      kind: 'figure',
      title: 'Response rate',
      prompt: 'What percentage of this month’s app users answered the survey?',
      points: 20,
      answer: 12.5,
      tolerance: 0.05,
      unit: '%',
      why: '250 ÷ 2,000 = 12.5%.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What goes on the slide',
      prompt: 'What do you put in the board pack?',
      points: 25,
      options: [
        {
          id: 'qualified',
          label:
            '“92% of app users who answered are satisfied”, with the sample and the complaints shown, and a proposal to survey all customers',
          verdict: 'best',
          why: 'The board gets the good news and its limits, and a way to find out what all customers think.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'headline',
          label: '“92% of customers are satisfied with the app”, as Gemma asked',
          verdict: 'poor',
          why: 'It tells the board something the data does not show, and they may decide on it.',
          effects: { indicators: { risk: 5 }, reputation: -2 },
        },
        {
          id: 'nothing',
          label: 'Leave the survey out of the pack: it is biased',
          verdict: 'acceptable',
          why: 'You avoid misleading anyone, but throw away a useful finding about current users.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Gemma Ward, Sales',
      title: 'Reply to the Sales Director',
      prompt:
        'Write to Gemma: what the survey shows, what it cannot show, and what you propose.',
      points: 25,
      minWords: 50,
      model:
        'Hi Gemma, it is a good result for people who use the app, and I will put it in the pack. I need to word it as “92% of app users who answered”, though: the survey was only shown in the app, and only 12.5% of users answered, so it misses customers who have stopped using it, and we have 140 complaints from them this month. I suggest we survey a sample of all customers next month. Best, {name}',
      mentions: [
        ['app users', 'use the app'],
        ['12.5'],
        ['all customers', 'sample', 'representative'],
      ],
      avoid: [
        {
          terms: ['fake', 'lying', 'misleading on purpose'],
          why: 'Gemma is sharing good news, not trying to deceive: explain the limits, do not accuse.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Gemma',
    'Fair enough, and better that I hear it from you than from the board. Your wording is on the slide, and they approved the survey of all customers.',
  ),
  lapseLog:
    'The board pack went out with Gemma’s headline because nobody replied in time.',
  skills: { 'insight-communication': 25, 'data-analysis': 20 },
  xp: 140,
}

/** Data Analysis: an overall figure that hides what happens in each group. */
const dataSegments: CaseInput = {
  id: 'adv-data-segments',
  version: 1,
  careerId: 'data-analytics',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'The new checkout looks worse',
  summary:
    'Overall conversion fell after a change, but the change may not be the reason.',
  from: { name: 'Rob Turner', role: 'Product Manager', organisation: 'Digital' },
  trigger: {},
  deadlineHours: 5,
  email: {
    subject: 'New checkout: conversion down, roll back?',
    body: `Hi,

Since the new checkout went live, overall conversion has dropped from 5.0% to 4.4%. I’m minded to roll it back tomorrow. Can you confirm the numbers?

Rob`,
  },
  whyItMatters:
    'An overall rate can fall even when every group improves, if the mix of visitors changes. Checking the groups before acting stops a business undoing a change that works.',
  objectives: [
    'Compare rates within groups as well as overall',
    'Explain a change in mix',
    'Advise on a decision with evidence',
  ],
  evidence: [
    {
      id: 'before-after',
      title: 'Conversion by device, two weeks before and after',
      table: {
        head: ['Period', 'Device', 'Visitors', 'Orders', 'Conversion'],
        rows: [
          ['Before', 'Desktop', '6,000', '420', '7.0%'],
          ['Before', 'Mobile', '4,000', '80', '2.0%'],
          ['After', 'Desktop', '4,000', '300', '7.5%'],
          ['After', 'Mobile', '6,000', '140', '2.3%'],
        ],
      },
    },
    {
      id: 'context',
      title: 'Marketing note',
      text: 'A mobile-only social campaign started the same week as the new checkout.',
    },
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'Read the numbers',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'both-up',
          text: 'Conversion rose on both desktop and mobile after the change.',
          issue: true,
          why: 'Desktop went from 7.0% to 7.5% and mobile from 2.0% to 2.3%.',
        },
        {
          id: 'mix',
          text: 'More of the visitors were on mobile after the change, where conversion is lower.',
          issue: true,
          why: 'Mobile went from 4,000 of 10,000 visitors to 6,000, because of the mobile campaign.',
        },
        {
          id: 'checkout-worse',
          text: 'The new checkout made conversion worse.',
          issue: false,
          why: 'Within each device it did better; the overall fall comes from the change in mix.',
        },
        {
          id: 'overall',
          text: 'Overall conversion did fall from 5.0% to 4.4%.',
          issue: true,
          why: '500 orders from 10,000 visitors before; 440 from 10,000 after.',
        },
      ],
    },
    {
      id: 'mobile',
      kind: 'figure',
      title: 'The mobile improvement',
      prompt: 'By how many percentage points did mobile conversion rise?',
      points: 20,
      answer: 0.3,
      tolerance: 0.05,
      unit: 'points',
      why: 'From 2.0% to 2.3%: up 0.3 percentage points.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'Your advice',
      prompt: 'What do you advise Rob?',
      points: 25,
      options: [
        {
          id: 'keep',
          label:
            'Keep the new checkout: it converts better on each device; the overall fall comes from the extra mobile visitors',
          verdict: 'best',
          why: 'It reads the evidence correctly and avoids undoing an improvement.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'rollback',
          label: 'Roll it back: overall conversion fell',
          verdict: 'poor',
          why: 'It would remove a change that improved conversion everywhere.',
          effects: { indicators: { satisfaction: -2, risk: 2 } },
        },
        {
          id: 'wait',
          label: 'Wait another month before saying anything',
          verdict: 'acceptable',
          why: 'Cautious, but the evidence already answers the question, and Rob may roll back meanwhile.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Rob Turner, Digital',
      title: 'Reply to the product manager',
      prompt:
        'Write to Rob: what the numbers show, why the overall rate fell, and your advice.',
      points: 25,
      minWords: 45,
      model:
        'Hi Rob, the overall figure is right, but it is misleading: conversion went up on both devices, desktop from 7.0% to 7.5% and mobile by 0.3 points to 2.3%. The overall rate fell because the mobile campaign brought many more mobile visitors, who convert less. I advise keeping the new checkout. Best, {name}',
      mentions: [
        ['mobile'],
        ['0.3', '2.3'],
        ['keep', 'not roll back', "don't roll back"],
      ],
      avoid: [
        {
          terms: ['you are wrong', 'misread'],
          why: 'Rob read the overall figure correctly: explain what it hides.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Rob',
    'Glad I asked before rolling back! I’ll share your breakdown with the team, and we’re keeping the new checkout.',
  ),
  lapseLog: 'Rob rolled the checkout back before hearing from you.',
  skills: { 'insight-communication': 25, 'data-analysis': 20 },
  xp: 140,
}

export const ADVANCED_DATA: CaseInput[] = [dataBias, dataSegments]
