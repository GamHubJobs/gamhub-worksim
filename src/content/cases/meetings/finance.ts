/** Meetings cases: office-admin-finance. */
import type { CaseInput } from '../schema'
import { replies, people } from './shared'

const faTeam: CaseInput = {
  id: 'mtg-fa-team',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'meeting',
  minLevel: 2,
  title: 'Present the month at the team meeting',
  summary:
    'Prepare three slides on last month’s spending, present them, and record the actions.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'performance-report' },
  deadlineHours: 8,
  meeting: {
    title: 'Finance & Admin monthly meeting',
    inHours: 3,
    minutes: 45,
    room: 'Meeting room 2',
  },
  email: {
    subject: 'Monthly meeting: can you present the spending update?',
    body: `Hi {name},

At this month’s team meeting (in about three hours, meeting room 2) I’d like you to present the spending update: **3 to 5 slides** on spending against budget, the overspend in **travel** (£4,200 against £3,000) and what you recommend. Then please take the minutes and the actions.

Priya`,
  },
  whyItMatters:
    'Presenting to your team builds trust and visibility. Meetings only change anything if decisions become actions with owners and dates, which is why good minute-takers are so valued.',
  objectives: [
    'Prepare a short, clear update',
    'Handle questions in a meeting',
    'Record actions with the right owners',
  ],
  evidence: [
    {
      id: 'figures',
      title: 'Spending against budget, last month',
      table: {
        head: ['Line', 'Budget', 'Actual'],
        rows: [
          ['Travel', '£3,000', '£4,200'],
          ['Supplies', '£1,800', '£1,650'],
          ['Training', '£2,500', '£2,100'],
        ],
      },
    },
    {
      id: 'travel',
      title: 'Why travel was over',
      text: 'Two last-minute train bookings for the Steelway Engineering workshops cost £1,100 more than advance fares would have.',
    },
  ],
  steps: [
    {
      id: 'slides',
      kind: 'document',
      phase: 'prepare',
      title: 'Prepare the slides',
      prompt:
        'Make 3 to 5 slides: spending against budget, the travel overspend and its cause, and your recommendation.',
      points: 35,
      deliverable: {
        kind: 'slides',
        title: 'Spending update',
        template: 'business-review',
        checks: [
          {
            id: 'length',
            type: 'length',
            min: 3,
            max: 5,
            title: 'Three to five slides',
            points: 10,
            why: 'A short slot.',
            hint: 'Delete the slides you don’t need.',
          },
          {
            id: 'travel',
            type: 'mentions',
            title: 'The travel overspend explained',
            terms: [
              ['travel'],
              ['4,200', '4200'],
              ['advance', 'last-minute', 'last minute'],
            ],
            points: 15,
            why: 'The team needs the cause, not just the number.',
            hint: 'Give the figure and the reason.',
          },
          {
            id: 'recommend',
            type: 'mentions',
            title: 'A recommendation',
            terms: [['recommend', 'book ahead', 'in advance']],
            points: 10,
            why: 'An update should end with what to do.',
            hint: 'Recommend booking travel in advance.',
          },
        ],
      },
    },
    {
      id: 'question',
      kind: 'decide',
      phase: 'meeting',
      title: 'A question in the meeting',
      prompt:
        'Marcus says: “Just cut the training budget to cover travel.” What do you say?',
      points: 20,
      options: [
        {
          id: 'fix-cause',
          label:
            'Suggest fixing the cause instead: book travel in advance, which would have saved £1,100',
          verdict: 'best',
          why: 'It solves the overspend without losing training the team needs.',
          effects: { trust: { manager: 2 } },
        },
        {
          id: 'agree',
          label: 'Agree: training was underspent anyway',
          verdict: 'acceptable',
          why: 'It balances this month, but the overspend will happen again.',
        },
        {
          id: 'dismiss',
          label: 'Say that’s not your decision and move on',
          verdict: 'poor',
          why: 'You know the cause; sharing it is exactly why you are presenting.',
          effects: { trust: { manager: -1 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action from the meeting the right owner.',
      points: 30,
      people: people(['me', 'You'], ['marcus', 'Marcus Webb'], ['priya', 'Priya Raman']),
      items: [
        {
          id: 'policy',
          label: 'Update the travel policy: book at least 2 weeks ahead',
          owner: 'priya',
          why: 'Policy changes belong to the manager who owns the policy.',
        },
        {
          id: 'minutes',
          label: 'Circulate the minutes by tomorrow',
          owner: 'me',
          why: 'You took the minutes.',
        },
        {
          id: 'bookings',
          label: 'Book the May workshop trains this week',
          owner: 'marcus',
          why: 'Marcus arranges the team’s travel.',
        },
      ],
    },
    {
      id: 'follow-up',
      kind: 'reply',
      phase: 'after',
      to: 'The Finance & Admin team',
      title: 'Send the minutes',
      prompt: 'Write the short summary of decisions and actions for the team.',
      points: 15,
      minWords: 40,
      mentions: [['travel'], ['Marcus'], ['Priya'], ['action']],
      avoid: [],
      model:
        'Hi all, thanks for a good meeting. Summary: travel was £1,200 over budget, mostly last-minute train bookings. Actions: Priya will update the travel policy so trains are booked at least 2 weeks ahead; Marcus will book the May workshop trains this week; I will circulate these minutes today. {name}',
    },
  ],
  outcomes: {
    pass: {
      trust: { manager: 3, senior: 1 },
      reputation: 3,
      indicators: { discipline: 2 },
    },
    fail: { reputation: -1 },
    lapse: { reputation: -3, trust: { manager: -2 } },
  },
  replies: replies(
    'Priya',
    'A great first presentation, and the actions are already moving. Thank you for the minutes.',
  ),
  lapseLog: 'The team meeting went ahead without your spending update.',
  skills: { presentation: 30, 'finance-basics': 15 },
  xp: 110,
}

export const MEETING_FINANCE: CaseInput[] = [faTeam]
