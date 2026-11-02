/** Meetings cases: accounting. */
import type { CaseInput } from '../schema'
import { replies, people } from './shared'

const accClient: CaseInput = {
  id: 'mtg-acc-client',
  version: 1,
  careerId: 'accounting',
  kind: 'meeting',
  minLevel: 3,
  title: 'A client meeting about late payments',
  summary: 'Northgate Motors pays late every month. Prepare, meet them and agree a plan.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'books-payroll' },
  deadlineHours: 8,
  meeting: {
    title: 'Meeting with Northgate Motors',
    inHours: 2,
    minutes: 40,
    room: 'Client room',
  },
  email: {
    subject: 'Northgate Motors meeting this afternoon',
    body: `Hi {name},

Northgate Motors owe us **£19,400**, most of it over 60 days. Their finance director is coming in this afternoon. Please prepare a one-page briefing (the balance, how late, what we want) and lead the conversation. We need a payment plan, not a fight: they are a good client.

Daniel`,
  },
  whyItMatters:
    'Credit control is about relationships as much as numbers. Preparing the facts, being firm about what is owed and flexible about how it is paid is what gets money in and keeps the client.',
  objectives: [
    'Prepare a client briefing',
    'Negotiate a payment plan',
    'Record the agreement and the actions',
  ],
  evidence: [
    {
      id: 'aged',
      title: 'Northgate Motors: aged debt',
      table: {
        head: ['Age', 'Amount'],
        rows: [
          ['0–30 days', '£4,200'],
          ['31–60 days', '£3,200'],
          ['61–90 days', '£7,000'],
          ['Over 90 days', '£5,000'],
          ['Total', '£19,400'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'briefing',
      kind: 'document',
      phase: 'prepare',
      title: 'The briefing',
      prompt:
        'Write a one-page briefing for the meeting: the balance, the overdue amounts and what we want.',
      points: 30,
      deliverable: {
        kind: 'doc',
        title: 'Briefing: Northgate Motors',
        template: 'memo',
        checks: [
          {
            id: 'figures',
            type: 'figures',
            title: 'The key figures',
            figures: [
              { label: 'total balance', value: 19400 },
              { label: 'amount over 60 days', value: 12000 },
            ],
            points: 15,
            why: 'You need the facts at your fingertips.',
            hint: '£19,400 in total; £12,000 over 60 days.',
          },
          {
            id: 'goal',
            type: 'mentions',
            title: 'What we want',
            terms: [
              ['payment plan', 'instalments'],
              ['30 days', 'on time'],
            ],
            points: 10,
            why: 'Go in knowing your goal.',
            hint: 'A payment plan for the old debt, and future invoices paid on time.',
          },
          {
            id: 'length',
            type: 'length',
            min: 80,
            max: 400,
            title: 'One page',
            points: 5,
            why: 'A briefing is short.',
            hint: '80 to 400 words.',
          },
        ],
      },
    },
    {
      id: 'offer',
      kind: 'decide',
      phase: 'meeting',
      title: 'Their proposal',
      prompt:
        'Their finance director offers to pay the £12,000 over 60 days “when cash allows”. What do you say?',
      points: 25,
      options: [
        {
          id: 'plan',
          label:
            'Propose three monthly instalments of £4,000, with new invoices paid within 30 days',
          verdict: 'best',
          why: 'Firm about what is owed, realistic for them, and it stops the debt growing.',
          effects: { indicators: { risk: -3, satisfaction: 2 } },
        },
        {
          id: 'accept',
          label: 'Accept “when cash allows” to keep them happy',
          verdict: 'poor',
          why: 'Vague promises are how debts become bad debts.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'stop',
          label: 'Say we will stop all work until everything is paid',
          verdict: 'acceptable',
          why: 'A real option if talks fail, but leading with it damages a good client relationship.',
          effects: { indicators: { satisfaction: -3 } },
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
        ['northgate', 'Northgate Motors'],
        ['daniel', 'Daniel Okoro'],
      ),
      items: [
        {
          id: 'confirm',
          label: 'Confirm the payment plan in writing today',
          owner: 'me',
          why: 'You led the meeting and agreed the plan.',
        },
        {
          id: 'first',
          label: 'Pay the first £4,000 instalment by the 30th',
          owner: 'northgate',
          why: 'The client pays the instalments.',
        },
        {
          id: 'terms',
          label: 'Approve the plan as an exception to standard terms',
          owner: 'daniel',
          why: 'Exceptions to credit terms need the manager’s approval.',
        },
      ],
    },
    {
      id: 'confirm',
      kind: 'reply',
      phase: 'after',
      to: 'Northgate Motors finance director',
      title: 'Confirm the agreement',
      prompt: 'Confirm what was agreed, in writing.',
      points: 20,
      minWords: 40,
      mentions: [['4,000', '4000'], ['30 days'], ['thank']],
      avoid: [],
      model:
        'Thank you for meeting us today. To confirm what we agreed: the £12,000 over 60 days will be paid in three monthly instalments of £4,000, the first by the 30th, and new invoices will be paid within 30 days. Please let me know if anything here is not as you understood it. Kind regards, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3, indicators: { risk: 3 } },
  },
  replies: replies(
    'Daniel',
    'Excellent. Northgate paid the first instalment early, and they were complimentary about how you handled it.',
  ),
  lapseLog: 'The Northgate Motors meeting went ahead unprepared.',
  skills: { 'financial-reporting': 20, reconciliation: 10, accuracy: 10 },
  xp: 110,
}

export const MEETING_ACCOUNTING: CaseInput[] = [accClient]
