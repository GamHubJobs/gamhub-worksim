/** Meetings cases: software-development. */
import type { CaseInput } from '../schema'
import { replies, people } from './shared'

const devReview: CaseInput = {
  id: 'mtg-dev-sprint-review',
  version: 1,
  careerId: 'software-development',
  kind: 'meeting',
  minLevel: 3,
  title: 'Demo the sprint to the stakeholders',
  summary: 'Prepare the sprint review, demo it, and handle a late change request.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'billing-report' },
  deadlineHours: 8,
  meeting: { title: 'Sprint review', inHours: 3, minutes: 45, room: 'Meeting room 1' },
  email: {
    subject: 'Sprint review this afternoon',
    body: `Hi {name},

You’re running the sprint review this afternoon. Please prepare **3 to 5 slides**: what we finished (the **billing report** and **timesheet validation**), what we didn’t (**CSV export**, moved to next sprint) and what’s next.

Samuel`,
  },
  whyItMatters:
    'Sprint reviews keep stakeholders and developers aligned. Being honest about what wasn’t finished and handling new requests through the backlog protects the team’s focus and the stakeholders’ trust.',
  objectives: [
    'Present progress honestly',
    'Handle a late request through the backlog',
    'Agree owners for follow-ups',
  ],
  evidence: [
    {
      id: 'sprint',
      title: 'Sprint summary',
      table: {
        head: ['Item', 'Status'],
        rows: [
          ['Billing report', 'Done'],
          ['Timesheet validation', 'Done'],
          ['CSV export', 'Not finished: moved to next sprint'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'deck',
      kind: 'document',
      phase: 'prepare',
      title: 'The review slides',
      prompt: 'Prepare 3 to 5 slides: done, not done, and next.',
      points: 35,
      deliverable: {
        kind: 'slides',
        title: 'Sprint review',
        template: 'project-update',
        checks: [
          {
            id: 'length',
            type: 'length',
            min: 3,
            max: 5,
            title: 'Three to five slides',
            points: 10,
            why: 'Short and focused.',
            hint: 'Keep 3 to 5 slides.',
          },
          {
            id: 'done',
            type: 'mentions',
            title: 'Done and not done',
            terms: [['billing report'], ['timesheet'], ['CSV']],
            points: 15,
            why: 'Be clear about what was and wasn’t finished.',
            hint: 'Mention all three items.',
          },
          {
            id: 'next',
            type: 'mentions',
            title: 'What’s next',
            terms: [['next sprint']],
            points: 10,
            why: 'Stakeholders want to know what’s coming.',
            hint: 'Say what happens next sprint.',
          },
        ],
      },
    },
    {
      id: 'late',
      kind: 'decide',
      phase: 'meeting',
      title: 'A late request',
      prompt:
        'Finance asks: “Can you also add PDF export to the billing report before Friday?” What do you say?',
      points: 25,
      options: [
        {
          id: 'backlog',
          label:
            'Add it to the backlog to be prioritised for next sprint, after the CSV export already promised',
          verdict: 'best',
          why: 'It respects the plan and the commitment already made, and the request will be considered properly.',
          effects: { indicators: { satisfaction: 1, risk: -2 } },
        },
        {
          id: 'yes',
          label: 'Say yes, it’s small',
          verdict: 'poor',
          why: 'Unplanned work pushes back promised work, and “small” is often wrong.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'no',
          label: 'Say no: the sprint is fixed',
          verdict: 'acceptable',
          why: 'Protects the sprint, but the request deserves a place in the backlog.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action the right owner.',
      points: 25,
      people: people(
        ['me', 'You'],
        ['finance', 'Finance (Marcus)'],
        ['samuel', 'Samuel Adeyemi'],
      ),
      items: [
        {
          id: 'story',
          label: 'Write the PDF export request as a backlog item',
          owner: 'me',
          why: 'You took the request in the review.',
        },
        {
          id: 'examples',
          label: 'Send example PDFs Finance needs',
          owner: 'finance',
          why: 'The requester knows what they need.',
        },
        {
          id: 'priority',
          label: 'Prioritise next sprint’s backlog',
          owner: 'samuel',
          why: 'The engineering manager sets priorities.',
        },
      ],
    },
    {
      id: 'recap',
      kind: 'reply',
      phase: 'after',
      to: 'Sprint review attendees',
      title: 'Send the summary',
      prompt: 'Summarise the review and the actions.',
      points: 15,
      minWords: 35,
      mentions: [['CSV'], ['PDF'], ['backlog']],
      avoid: [
        {
          terms: ['by Friday'],
          why: 'Don’t promise the PDF export by Friday: it hasn’t been planned.',
        },
      ],
      model:
        'Thanks all. This sprint we finished the billing report and timesheet validation; the CSV export moves to next sprint. Finance’s PDF export request is now on the backlog: Marcus will send example PDFs, and Samuel will prioritise it with next sprint’s work. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -1 } },
    fail: { reputation: -1 },
    lapse: { reputation: -3, indicators: { satisfaction: -2 } },
  },
  replies: replies(
    'Samuel',
    'A really professional review, and the PDF request went exactly where it should.',
  ),
  lapseLog: 'The sprint review went ahead without you.',
  skills: { 'software-design': 20, 'technical-writing': 20 },
  xp: 110,
}

export const MEETING_DEV: CaseInput[] = [devReview]
