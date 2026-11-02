/** Operations cases: digital-marketing. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const marketing: CaseInput = {
  id: 'ops-mkt-agency',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'operations',
  minLevel: 2,
  title: 'Agency invoices and spending requests',
  summary:
    'An agency has billed more hours than agreed, and other requests need decisions.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'seo-fixes' },
  deadlineHours: 6,
  email: {
    subject: 'Marketing spend for your approval',
    body: `Hi {name},

A few spending decisions for you this week. The agency invoice looks high to me; please check it against the agreement before anything is paid.

Sofia`,
  },
  whyItMatters:
    'Marketing spends a lot through suppliers. Checking invoices against agreements, insisting on contracts, and staying within budget is what lets a marketing team keep its budget.',
  objectives: [
    'Check a supplier invoice against the agreement',
    'Apply contract and budget rules to spending',
    'Stay within your approval limit',
  ],
  evidence: [
    {
      id: 'agreement',
      title: 'Agency agreement: Brightwave Media',
      text: 'Up to **25 hours** a month at **£60 an hour**. Extra hours need written approval in advance.',
    },
    {
      id: 'invoice',
      title: 'Brightwave Media invoice BW-0412',
      text: '40 hours of campaign management at £60 an hour: **£2,400**. No extra hours were approved.',
    },
    {
      id: 'policy',
      title: 'Marketing spending rules',
      text: 'Influencer and creator work needs a **signed contract** before any payment.',
    },
  ],
  steps: [
    {
      id: 'over',
      kind: 'figure',
      title: 'The overcharge',
      prompt: 'How much has the agency charged above the agreement?',
      points: 25,
      answer: 900,
      tolerance: 0.5,
      unit: '£',
      why: '15 hours above the 25 agreed, at £60 an hour: £900.',
    },
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Decide each request',
      prompt: 'Approve, reject or escalate each request.',
      points: 50,
      requests: [
        {
          id: 'photos',
          summary: 'Stock photos for the spring offer',
          department: 'marketing',
          amount: 120,
          why: 'Routine, within policy.',
        },
        {
          id: 'boost',
          summary: 'Ad spend top-up for the best campaign',
          department: 'marketing',
          amount: 400,
          why: 'Within budget and policy.',
        },
        {
          id: 'agency',
          summary: 'Brightwave Media invoice BW-0412 as billed',
          department: 'marketing',
          amount: 2400,
          policyBreach:
            '15 of the hours were never approved: ask for a corrected invoice of £1,500.',
          why: '',
        },
        {
          id: 'influencer',
          summary: 'Influencer post, no contract yet',
          department: 'marketing',
          amount: 2500,
          policyBreach: 'Influencer work needs a signed contract before payment.',
          why: '',
        },
        {
          id: 'video',
          summary: 'Product video production, three quotes attached',
          department: 'marketing',
          amount: 6000,
          why: 'Within policy and budget.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Brightwave Media',
      title: 'Write to the agency',
      prompt: 'Ask for a corrected invoice, politely and clearly.',
      points: 25,
      minWords: 40,
      mentions: [
        ['25 hours'],
        ['1,500', '1500'],
        ['corrected', 'revised', 'new invoice'],
      ],
      avoid: [
        {
          terms: ['dishonest', 'cheating'],
          why: 'Stay professional: it may be a mistake.',
        },
      ],
      model:
        'Hello, thank you for invoice BW-0412. Our agreement covers up to 25 hours a month at £60 an hour, and no extra hours were approved this month. Could you send a corrected invoice for 25 hours, £1,500? If more time is needed next month, please ask us in advance and we will approve it in writing. Kind regards, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { indicators: { discipline: -3 } },
  },
  replies: replies(
    'Sofia',
    'Brightwave apologised and sent a corrected invoice for £1,500. That’s £900 back in our budget.',
  ),
  lapseLog:
    'Marketing’s spending decisions waited all week, and the agency invoice went unchallenged.',
  skills: { 'campaign-analytics': 20, 'content-strategy': 15 },
  xp: 90,
}

export const OPERATIONS_MARKETING: CaseInput[] = [marketing]
