/** Incidents cases: digital-marketing. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const mktOverspend: CaseInput = {
  id: 'inc-mkt-overspend',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'incident',
  minLevel: 3,
  title: 'A campaign spent far more than approved',
  summary:
    'A client campaign overspent by £3,000 overnight, and IT and Marketing blame each other.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'funnel-analysis' },
  deadlineHours: 4,
  email: {
    subject: 'Okafor Build campaign: £3,000 overspend',
    body: `Hi {name},

Okafor Build’s campaign spent **£3,400 yesterday against a £400 daily budget**. Our ads team says the website tag broke so the platform couldn’t see conversions and spent more; IT says the ads were set up wrong. The client doesn’t know yet. Please find out what happened and handle it.

Sofia`,
  },
  whyItMatters:
    'Overspending a client’s money is serious. Finding the real cause instead of joining the blame, telling the client honestly and putting it right is what keeps the client and stops a repeat.',
  objectives: [
    'Find the cause of an overspend from evidence',
    'Settle a disagreement with facts',
    'Tell a client about a mistake honestly',
  ],
  evidence: [
    {
      id: 'changes',
      title: 'Campaign change history',
      table: {
        head: ['When', 'Who', 'Change'],
        rows: [
          [
            'Mon 17:40',
            'Marketing (ads team)',
            'Daily budget changed from £400 to £4,000',
          ],
          ['Mon 17:41', 'Marketing (ads team)', 'Note: “£400/day for May”'],
        ],
      },
    },
    {
      id: 'tag',
      title: 'Website tag status',
      text: 'Conversion tag working all week (IT check). Conversions recorded yesterday: 14.',
    },
    {
      id: 'contract',
      title: 'Client agreement',
      text: 'Okafor Build’s approved budget: £400 a day. Any spend above the approved budget is our responsibility.',
    },
  ],
  steps: [
    {
      id: 'cause',
      kind: 'review',
      title: 'What really happened',
      prompt: 'Which of these does the evidence support?',
      points: 25,
      findings: [
        {
          id: 'typo',
          text: 'The daily budget was typed as £4,000 instead of £400.',
          issue: true,
          why: 'The change history shows £4,000 with a note saying £400.',
        },
        {
          id: 'tag-ok',
          text: 'The website tag was working.',
          issue: true,
          why: 'IT’s check and 14 recorded conversions show it was.',
        },
        {
          id: 'it-fault',
          text: 'IT caused the overspend.',
          issue: false,
          why: 'The change was made in the ads account by the ads team.',
        },
      ],
    },
    {
      id: 'over',
      kind: 'figure',
      title: 'The overspend',
      prompt: 'How much did the campaign spend above the approved budget yesterday?',
      points: 15,
      answer: 3000,
      tolerance: 0.5,
      unit: '£',
      why: '£3,400 − £400 = £3,000.',
    },
    {
      id: 'client',
      kind: 'decide',
      title: 'The client',
      prompt: 'What do you do about Okafor Build?',
      points: 30,
      options: [
        {
          id: 'honest',
          label:
            'Fix the budget now, tell the client what happened today, and credit the £3,000 (it’s our responsibility under the agreement)',
          verdict: 'best',
          why: 'Honest, fair under the agreement, and the client keeps trusting you.',
          effects: {
            indicators: { satisfaction: 3, discipline: 2 },
            spend: { marketing: 3000 },
          },
        },
        {
          id: 'quiet',
          label: 'Fix the budget and say nothing: the extra spend brought some leads',
          verdict: 'poor',
          why: 'Hiding it breaks trust and the agreement; clients find out from their invoices.',
          effects: { indicators: { satisfaction: -6, risk: 5 } },
        },
        {
          id: 'charge',
          label: 'Tell the client but charge them, since they got the leads',
          verdict: 'poor',
          why: 'They never approved that spend, and the agreement says it’s ours.',
          effects: { indicators: { satisfaction: -4 } },
        },
      ],
    },
    {
      id: 'tell',
      kind: 'reply',
      to: 'Daniel Okafor, Okafor Build',
      title: 'Tell the client',
      prompt: 'Explain the mistake, what you have done and how it won’t happen again.',
      points: 30,
      minWords: 50,
      mentions: [
        ['sorry', 'apologise', 'apologies'],
        ['£400', '400'],
        ['credit'],
        ['check', 'second person', 'approval'],
      ],
      avoid: [
        {
          terms: ['IT’s fault', 'the website'],
          why: 'The evidence shows our ads team made the change: don’t blame others.',
        },
      ],
      model:
        'Hi Daniel, I am sorry to tell you we made a mistake: yesterday your daily budget was entered as £4,000 instead of £400, so the campaign spent £3,400. We fixed it this morning, and we will credit the £3,000 above your approved budget on this month’s invoice. From now on every budget change will be checked by a second person before it goes live. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -3 } },
    lapse: { reputation: -4, indicators: { satisfaction: -6, discipline: -4 } },
  },
  replies: replies(
    'Sofia',
    'Daniel thanked us for being straight with him and renewed for six months. The ads team now has a second-person check on budget changes.',
  ),
  lapseLog:
    'Okafor Build found the £3,400 charge on their invoice before anyone told them.',
  skills: { 'campaign-analytics': 25, 'content-strategy': 10, copywriting: 10 },
  xp: 120,
}

export const INCIDENT_MARKETING: CaseInput[] = [mktOverspend]
