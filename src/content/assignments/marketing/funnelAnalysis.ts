import type { AssignmentInput } from '../../schemas'
import { springTraffic } from '../../../tools/analytics/data'
import { answer, breakdown, saveReport } from '../../../tools/analytics/model'
import type { AnalyticsState } from '../../../tools/analytics/schema'

/**
 * Digital Marketing (Digital Marketing Specialist): find out why the spring
 * campaign brings visitors but few bookings. Explore the traffic in Site
 * Analytics, find the broken step of the funnel, size the problem, and
 * recommend what to do. Teaches: segmenting, funnels, sizing an
 * opportunity, and turning analysis into a decision.
 */
const base = springTraffic()
const byDevice = breakdown(base, 'device')
const mobile = byDevice.find((r) => r.value === 'mobile')!
const desktop = byDevice.find((r) => r.value === 'desktop')!
const lowestEngagement = [...breakdown(base, 'source')].sort(
  (a, b) => a.engagementRate - b.engagementRate,
)[0]
/** Bookings lost on phones, if the form worked there as it does on desktop. */
const missed = Math.round(mobile.formStarts * desktop.formCompletion - mobile.bookings)

const start: AnalyticsState = {
  ...base,
  questions: [
    {
      id: 'device',
      question:
        'On which device do people who start the booking form most often give up?',
      kind: 'choice',
      options: ['desktop', 'mobile', 'tablet'],
      unit: '',
      answer: '',
    },
    {
      id: 'mobile-completion',
      question: 'What percentage of booking forms started on mobile end in a booking?',
      kind: 'number',
      options: [],
      unit: '%',
      answer: '',
    },
    {
      id: 'missed',
      question:
        'If the form worked on mobile as well as it does on desktop, about how many more bookings would we have had in these two weeks?',
      kind: 'number',
      options: [],
      unit: 'bookings',
      answer: '',
    },
    {
      id: 'source',
      question: 'Which traffic source has the lowest engagement rate?',
      kind: 'choice',
      options: [...new Set(base.rows.map((r) => r.source))].sort(),
      unit: '',
      answer: '',
    },
  ],
}

function solution(): AnalyticsState {
  let s = saveReport(start, {
    name: 'Funnel by device',
    dimension: 'device',
    filters: {},
  }).state
  s = saveReport(s, { name: 'Traffic sources', dimension: 'source', filters: {} }).state
  s = answer(s, 'device', 'mobile')
  s = answer(s, 'mobile-completion', (mobile.formCompletion * 100).toFixed(1))
  s = answer(s, 'missed', String(missed))
  s = answer(s, 'source', lowestEngagement.value)
  return s
}

export const funnelAnalysis: AssignmentInput = {
  id: 'funnel-analysis',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'digital-marketing-specialist',
  order: 7,
  kind: 'tool',
  title: 'Where do the bookings go?',
  summary:
    'The campaign brings plenty of visitors but few bookings. Find out why in Site Analytics, and recommend a fix.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Lots of visitors, not many bookings: why?',
    body: `Hi {name},

The spring campaign is bringing people to the website, but bookings are well below what we expected. Before we spend another pound on ads, I want to know where we’re losing people.

You now have **Site Analytics**. Please:
• look at traffic by device and by source, and at the **booking funnel**, and save the views you use,
• answer the questions in the **Questions** section,
• write me a short **memo** in Word Craft: what is going wrong, how big the problem is (with figures), and what you recommend we do first.

Reply to this email with the analytics file and the memo.

Sofia`,
  },
  whyItMatters:
    'More traffic is useless if something on the way to the goal is broken. Breaking results down by segment, following the funnel step by step, and sizing what a fix is worth is how marketers decide where the next effort goes, often with a bigger effect than any campaign.',
  objectives: [
    'Segment traffic by device and source',
    'Find the step of a funnel where visitors give up',
    'Size the opportunity and recommend the first fix',
  ],
  steps: [
    {
      id: 'explore',
      title: 'Break it down',
      instructions:
        'In **Explore**, look at the traffic by **Device**, then by **Traffic source**. Compare the form completion column (bookings ÷ form starts). Save each view with **Save report**.',
    },
    {
      id: 'funnel',
      title: 'Follow the funnel',
      instructions:
        'Open **Booking funnel** and use the device filter: compare each step on desktop and on mobile. Where is the difference?',
    },
    {
      id: 'size',
      title: 'Size the problem',
      instructions:
        'If mobile form starts were completed at the desktop rate, how many bookings would there be? Subtract the bookings mobile actually got.',
      hint: 'Mobile form starts × desktop form completion − mobile bookings.',
    },
    {
      id: 'answer',
      title: 'Answer the questions',
      instructions: 'Fill in every answer in **Questions**.',
    },
    {
      id: 'memo',
      title: 'Write the memo',
      instructions:
        'In **Word Craft**, open **Booking funnel findings**: the problem, the evidence (form completion on mobile and on desktop), what it costs us, and your recommendation. Mention anything else you noticed about the traffic sources. 120 to 400 words.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions:
        'Reply to {manager}’s email with the analytics file and the memo attached.',
    },
  ],
  tool: {
    id: 'analytics',
    title: 'Site Analytics: spring campaign',
    start,
    solution: solution(),
    checks: [
      {
        id: 'reports',
        type: 'report',
        dimension: 'device',
        title: 'Traffic analysed by device',
        points: 10,
        why: 'Device is where the difference hides: save the view as evidence.',
        hint: 'Explore → Device, then Save report.',
      },
      {
        id: 'reports-source',
        type: 'report',
        dimension: 'source',
        title: 'Traffic analysed by source',
        points: 10,
        why: 'Sources show which campaigns bring the right visitors.',
        hint: 'Explore → Traffic source, then Save report.',
      },
      {
        id: 'answers',
        type: 'answers',
        items: [
          { id: 'device', value: 'mobile', tolerance: 0 },
          {
            id: 'mobile-completion',
            value: Math.round(mobile.formCompletion * 1000) / 10,
            tolerance: 0.6,
          },
          { id: 'missed', value: missed, tolerance: 8 },
          { id: 'source', value: lowestEngagement.value, tolerance: 0 },
        ],
        title: 'The questions answered correctly',
        points: 40,
        why: 'Each answer is a step of the diagnosis: where, how bad, how much it costs, and what else to watch.',
        hint: 'Compare form completion by device in Explore; work out the missed bookings from mobile form starts.',
      },
    ],
  },
  deliverables: [
    {
      kind: 'doc',
      title: 'Booking funnel findings',
      template: 'memo',
      checks: [
        {
          id: 'memo-evidence',
          type: 'figures',
          title: 'The evidence',
          figures: [
            {
              label: 'mobile form completion',
              value: mobile.formCompletion,
              percent: true,
            },
            {
              label: 'desktop form completion',
              value: desktop.formCompletion,
              percent: true,
            },
          ],
          points: 15,
          why: 'The gap between the two numbers is the whole argument.',
          hint: 'Quote form completion on mobile and on desktop as percentages.',
        },
        {
          id: 'memo-recommendation',
          type: 'mentions',
          title: 'The problem and a recommendation',
          terms: [['mobile'], ['form'], ['recommend', 'suggest', 'propose']],
          points: 15,
          why: 'Name the problem and what to do about it first.',
          hint: 'Say the booking form fails on mobile, and recommend fixing and testing it before more ad spend.',
        },
        {
          id: 'memo-length',
          type: 'length',
          min: 120,
          max: 400,
          title: 'Length',
          points: 10,
          why: 'A memo the team will read before the meeting.',
          hint: 'Aim for 120 to 400 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 180,
  skills: {
    'campaign-analytics': 45,
    'data-analysis': 35,
    'content-strategy': 15,
    copywriting: 10,
  },
  feedback: {
    excellent: `Hi {name},

Brilliant detective work. Half our visitors are on phones and the booking form almost never works there: about ${missed} bookings lost in two weeks. {senior}’s team tested it and found the date picker broken on mobile. It’s fixed, and we’re pausing the extra ad spend until we see the results.

Sofia`,
    good: `Hi {name},

Good analysis; some answers or figures need another look. See the notes.

Sofia`,
    pass: `Hi {name},

The diagnosis isn’t complete yet. The notes show what’s missing.

Sofia`,
    fail: `Hi {name},

Start in Explore: compare the form completion by device.

Sofia`,
  },
}
