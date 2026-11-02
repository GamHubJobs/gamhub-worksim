/** Meetings cases: digital-marketing. */
import type { CaseInput } from '../schema'
import { replies, people } from './shared'

const mktReview: CaseInput = {
  id: 'mtg-mkt-review',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'meeting',
  minLevel: 3,
  title: 'The quarterly review with a client',
  summary: 'Present Brightpath Clinics’ quarter and agree the next quarter’s plan.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'campaign-budget' },
  deadlineHours: 8,
  meeting: {
    title: 'Brightpath Clinics quarterly review',
    inHours: 3,
    minutes: 45,
    room: 'Client room',
  },
  email: {
    subject: 'Brightpath review this afternoon',
    body: `Hi {name},

You’re leading the Brightpath Clinics quarterly review this afternoon. Please prepare **4 to 6 slides**: results against target (**420 bookings** against **400**, at **£31** each against £35), what worked, and the plan for next quarter.

Sofia`,
  },
  whyItMatters:
    'Client reviews keep accounts. Presenting results honestly, handling pressure on budgets with evidence and leaving with clear next steps is what makes clients stay.',
  objectives: [
    'Present results against targets',
    'Handle a budget challenge with evidence',
    'Agree the next steps',
  ],
  evidence: [
    {
      id: 'results',
      title: 'Quarter results',
      table: {
        head: ['Metric', 'Target', 'Result'],
        rows: [
          ['Bookings', '400', '420'],
          ['Cost per booking', '£35', '£31'],
          ['Best channel', '', 'Search (£24 per booking)'],
          ['Weakest channel', '', 'Display (£58 per booking)'],
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
      prompt:
        'Prepare 4 to 6 slides with the results, what worked and next quarter’s plan.',
      points: 35,
      deliverable: {
        kind: 'slides',
        title: 'Brightpath Clinics: quarterly review',
        template: 'business-review',
        checks: [
          {
            id: 'length',
            type: 'length',
            min: 4,
            max: 6,
            title: 'Four to six slides',
            points: 10,
            why: 'A focused review.',
            hint: 'Delete what you don’t need.',
          },
          {
            id: 'results',
            type: 'figures',
            title: 'The results',
            figures: [
              { label: 'bookings', value: 420 },
              { label: 'cost per booking', value: 31 },
            ],
            points: 15,
            why: 'Lead with the results against target.',
            hint: '420 bookings at £31 each.',
          },
          {
            id: 'plan',
            type: 'mentions',
            title: 'What worked and the plan',
            terms: [['search'], ['display'], ['next quarter', 'plan']],
            points: 10,
            why: 'Clients want to know what you will do next.',
            hint: 'Search worked best; display was weakest.',
          },
        ],
      },
    },
    {
      id: 'cut',
      kind: 'decide',
      phase: 'meeting',
      title: 'The client wants to cut the budget',
      prompt:
        'Their marketing lead says: “Great results, so let’s cut the budget by 30%.” What do you say?',
      points: 25,
      options: [
        {
          id: 'reallocate',
          label:
            'Suggest keeping the budget but moving display money into search, which brings bookings at £24',
          verdict: 'best',
          why: 'It answers their wish to spend wisely with evidence, and grows bookings.',
          effects: { indicators: { satisfaction: 4 } },
        },
        {
          id: 'agree',
          label: 'Agree to the 30% cut',
          verdict: 'acceptable',
          why: 'Their choice, but you haven’t shown them the better option.',
          effects: { indicators: { satisfaction: 1 } },
        },
        {
          id: 'refuse',
          label: 'Say a cut would ruin the results',
          verdict: 'poor',
          why: 'Defensive, and it doesn’t offer anything.',
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
        ['client', 'Brightpath Clinics'],
        ['sofia', 'Sofia Alvarez'],
      ),
      items: [
        {
          id: 'plan',
          label: 'Send the revised plan moving display budget to search',
          owner: 'me',
          why: 'You proposed it.',
        },
        {
          id: 'sign',
          label: 'Sign off next quarter’s plan',
          owner: 'client',
          why: 'The client approves their own spend.',
        },
        {
          id: 'contract',
          label: 'Update the contract schedule for next quarter',
          owner: 'sofia',
          why: 'Contract changes go through the account’s manager.',
        },
      ],
    },
    {
      id: 'recap',
      kind: 'reply',
      phase: 'after',
      to: 'Brightpath Clinics',
      title: 'Send the recap',
      prompt: 'Thank them and confirm the agreed next steps.',
      points: 15,
      minWords: 35,
      mentions: [['search'], ['display'], ['thank']],
      avoid: [],
      model:
        'Thank you for a great review today. As agreed, we will keep the budget for next quarter but move the display spend into search, which brought bookings at £24 each. I will send the revised plan this week for you to sign off. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { satisfaction: 3 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { reputation: -3, indicators: { satisfaction: -5 } },
  },
  replies: replies(
    'Sofia',
    'Brightpath signed the revised plan this afternoon. Brilliant review.',
  ),
  lapseLog: 'The Brightpath review happened without your slides.',
  skills: { presentation: 25, 'campaign-analytics': 20 },
  xp: 110,
}

export const MEETING_MARKETING: CaseInput[] = [mktReview]
