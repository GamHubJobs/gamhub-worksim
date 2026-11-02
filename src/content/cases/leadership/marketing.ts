/** Leadership cases: digital-marketing. */
import type { CaseInput } from '../schema'
import { replies, FEEDBACK_AVOID } from './shared'

const mktLead: CaseInput = {
  id: 'lead-mkt-team',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'leadership',
  minLevel: 4,
  title: 'Share out the campaigns and review a draft',
  summary:
    'Allocate next quarter’s campaigns, review a junior’s ad copy and handle a request about credit.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'launch-analytics' },
  deadlineHours: 8,
  email: {
    subject: 'Your team’s campaigns for next quarter',
    body: `Hi {name},

As Marketing Manager you now run the campaign team. Please allocate next quarter’s campaigns, review Jade’s ad copy before it goes live, and decide on Leo’s request about the award entry.

Sofia`,
  },
  whyItMatters:
    'Marketing managers succeed through their team: the right campaigns for the right people, copy that is accurate and legal, and fair credit for the people who did the work.',
  objectives: [
    'Allocate campaigns by strengths and capacity',
    'Review copy for accuracy and rules',
    'Give credit fairly',
  ],
  evidence: [
    {
      id: 'copy',
      title: 'Jade’s ad copy (draft)',
      text: '“The UK’s No. 1 cash-flow service. Guaranteed savings of 30%! Book a free Health Check today.”',
    },
    {
      id: 'facts',
      title: 'What we can prove',
      text: 'No ranking data exists. Clients saved between 5% and 30%, average 12%. The Health Check is free.',
    },
    {
      id: 'award',
      title: 'Leo’s request',
      text: 'Leo asks to enter the spring campaign for an industry award under his name only. Jade wrote most of the winning copy.',
    },
  ],
  steps: [
    {
      id: 'allocate',
      kind: 'assign',
      title: 'Allocate the campaigns',
      prompt: 'Give each campaign to the right person.',
      points: 25,
      members: [
        {
          id: 'leo',
          name: 'Leo Hart',
          strengths: 'Paid search and budgets',
          capacity: 2,
        },
        {
          id: 'jade',
          name: 'Jade Thompson',
          strengths: 'Copy and social media; junior',
          capacity: 1,
        },
        { id: 'sana', name: 'Sana Iqbal', strengths: 'Email and analytics', capacity: 1 },
      ],
      items: [
        {
          id: 'search',
          label: 'Summer search campaign',
          best: ['leo'],
          why: 'Paid search is Leo’s strength.',
        },
        {
          id: 'budget',
          label: 'Quarterly budget tracking',
          best: ['leo'],
          why: 'Leo manages budgets.',
        },
        {
          id: 'social',
          label: 'Social launch posts',
          best: ['jade'],
          why: 'Social copy suits Jade.',
        },
        {
          id: 'newsletter',
          label: 'Client newsletter with results',
          best: ['sana'],
          why: 'Email and analytics are Sana’s strengths.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Jade’s copy',
      prompt: 'Which claims must change before it goes live?',
      points: 25,
      findings: [
        {
          id: 'no1',
          text: '“The UK’s No. 1 cash-flow service”',
          issue: true,
          why: 'There is no evidence for the ranking: it can’t be claimed.',
        },
        {
          id: 'guarantee',
          text: '“Guaranteed savings of 30%”',
          issue: true,
          why: 'Savings ranged from 5% to 30% and aren’t guaranteed: misleading.',
        },
        {
          id: 'free',
          text: '“Book a free Health Check today”',
          issue: false,
          why: 'True: the Health Check is free.',
        },
      ],
    },
    {
      id: 'credit',
      kind: 'decide',
      title: 'The award entry',
      prompt: 'What do you say to Leo?',
      points: 20,
      options: [
        {
          id: 'team',
          label: 'Enter it as a team entry, naming Jade and Leo for their parts',
          verdict: 'best',
          why: 'Credit goes to the people who did the work; that is what keeps a team motivated.',
          effects: { reputation: 2 },
        },
        {
          id: 'leo-only',
          label: 'Let Leo enter under his name: he’s more senior',
          verdict: 'poor',
          why: 'Taking credit for a junior’s work is unfair and destroys trust.',
          effects: { reputation: -3 },
        },
        {
          id: 'no-entry',
          label: 'Don’t enter at all to avoid the issue',
          verdict: 'acceptable',
          why: 'Avoids unfairness, but loses deserved recognition for the team.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Jade Thompson',
      title: 'Feedback for Jade',
      prompt: 'Give Jade constructive feedback on the copy.',
      points: 30,
      minWords: 50,
      mentions: [
        ['energy', 'great', 'good', 'love'],
        ['No. 1', 'number one', 'ranking'],
        ['guarantee'],
        ['12%', 'up to 30%', 'average'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Jade, I love the energy in this copy, and the call to book a free Health Check is spot on. Two claims need to change before it goes live: we can’t say “No. 1” because we have no ranking evidence, and savings aren’t guaranteed, so “guaranteed 30%” would mislead. Try “clients save 12% on average, and up to 30%”. Send me the next draft whenever you’re ready. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4 },
    fail: { reputation: -1 },
    lapse: { reputation: -4 },
  },
  replies: replies(
    'Sofia',
    'The team entry won the award. Jade was over the moon, and the copy is live and accurate.',
  ),
  lapseLog: 'Next quarter’s campaigns started late, with no one assigned.',
  skills: { 'content-strategy': 25, copywriting: 20 },
  xp: 150,
}

export const LEADERSHIP_MARKETING: CaseInput[] = [mktLead]
