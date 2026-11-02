/** Advanced cases: office-admin-finance. */
import type { CaseInput } from '../schema'
import { replies, OUTCOMES } from './shared'

/** Finance & Admin: a contractor raises its price without the notice the contract needs. */
const faContract: CaseInput = {
  id: 'adv-fa-contract-price',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'client',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'A contractor’s price rise',
  summary:
    'The cleaning contractor has billed a higher weekly rate than the contract allows.',
  from: {
    name: 'Gareth Pryce',
    role: 'Accounts Manager',
    organisation: 'Sparkle Facility Services',
  },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Quarterly invoice SFS-5520 (£7,452.00)',
    body: `Hello,

Please find attached our invoice **SFS-5520** for the quarter: **£7,452.00** including VAT. Our rates have gone up this quarter in line with our costs.

Payment is due within 14 days.

Best regards,

Gareth Pryce
Accounts Manager, Sparkle Facility Services`,
  },
  whyItMatters:
    'Contracts protect both sides. Checking an invoice against the contract (not just against last quarter) stops the company paying for changes it never agreed, while paying what is properly due keeps a good supplier on side.',
  objectives: [
    'Check an invoice against the terms of a contract',
    'Work out what is properly due',
    'Challenge a supplier firmly and fairly',
  ],
  evidence: [
    {
      id: 'invoice',
      title: 'Invoice SFS-5520 (13 weeks)',
      text: 'All prices exclude VAT; VAT is charged at 20%.',
      table: {
        head: ['Item', 'Quantity', 'Rate', 'Line total'],
        rows: [
          ['Weekly office cleaning', '13', '£450.00', '£5,850.00'],
          ['Deep clean (kitchen and meeting rooms)', '2', '£180.00', '£360.00'],
          ['Net total', '', '', '£6,210.00'],
          ['VAT (20%)', '', '', '£1,242.00'],
          ['Total due', '', '', '£7,452.00'],
        ],
      },
    },
    {
      id: 'contract',
      title: 'Cleaning contract (signed last year), clause 6',
      text: 'Weekly cleaning: **£420.00** a week. The supplier may change its rates once a year, with **60 days’ written notice**. Extra work is charged at the agreed rates when ordered in writing.',
    },
    {
      id: 'orders',
      title: 'Facilities records',
      text: 'Two deep cleans were ordered in writing by Facilities this quarter, at the agreed £180 each. No notice of a price change has been received from Sparkle.',
    },
  ],
  steps: [
    {
      id: 'check',
      kind: 'review',
      title: 'Check the invoice against the contract',
      prompt: 'Tick every statement that is a problem with this invoice.',
      points: 30,
      findings: [
        {
          id: 'rate',
          text: 'Weekly cleaning is charged at £450.00, not the contract’s £420.00.',
          issue: true,
          why: 'The contract allows a rise only with 60 days’ written notice, and none was received.',
        },
        {
          id: 'deep-cleans',
          text: 'Two deep cleans are charged at £180.00 each.',
          issue: false,
          why: 'They were ordered in writing at the agreed rate, so they are properly due.',
        },
        {
          id: 'vat',
          text: 'VAT is charged at 20% on the net total.',
          issue: false,
          why: 'Cleaning services are standard-rated, so 20% is right.',
        },
        {
          id: 'notice',
          text: 'The email says rates “have gone up this quarter”, but no notice was given.',
          issue: true,
          why: 'A rise without the notice the contract requires does not apply yet.',
        },
      ],
    },
    {
      id: 'due',
      kind: 'figure',
      title: 'What is properly due',
      prompt: 'How much should we pay, including VAT, under the contract as it stands?',
      points: 20,
      answer: 6984,
      tolerance: 0.5,
      unit: '£',
      why: '13 weeks at £420 is £5,460, plus £360 of deep cleans makes £5,820 net; with 20% VAT, £6,984.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'How do you respond?',
      points: 25,
      options: [
        {
          id: 'pay-contract',
          label:
            'Pay £6,984 on time, ask for a corrected invoice, and tell Sparkle that any rise needs 60 days’ written notice',
          verdict: 'best',
          why: 'You pay what is due promptly, keep the contract’s protection, and leave the door open to a properly notified rise.',
          effects: { indicators: { discipline: 2 } },
        },
        {
          id: 'pay-all',
          label: 'Pay the full £7,452: costs are rising everywhere',
          verdict: 'poor',
          why: 'You would pay £468 the company never agreed to, and accept a price change that skipped the contract.',
          effects: { indicators: { discipline: -3 }, spend: { finance: 468 } },
        },
        {
          id: 'hold-all',
          label: 'Hold the whole payment until Sparkle sends a new invoice',
          verdict: 'acceptable',
          why: 'The company’s position is protected, but holding money that is clearly due damages a supplier who did the work.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Gareth Pryce, Sparkle Facility Services',
      title: 'Reply to the supplier',
      prompt:
        'Write to Gareth: what you are paying and why, and what the contract requires for a price change.',
      points: 25,
      minWords: 50,
      model:
        'Dear Gareth, thank you for invoice SFS-5520. We have checked it against our contract: the deep cleans are due, but weekly cleaning is still £420 a week, because clause 6 requires 60 days’ written notice of a change and we have not received any. We are paying £6,984 today. Please send a corrected invoice, and written notice if you would like to change your rates. Kind regards, {name}',
      mentions: [
        ['6,984', '6984'],
        ['notice'],
        ['corrected invoice', 'credit note', 'revised invoice'],
      ],
      avoid: [
        {
          terms: ['rip-off', 'dishonest', 'trying it on'],
          why: 'Stay professional: the supplier may simply have forgotten the notice clause.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Gareth',
    'You are quite right, and apologies: the notice letter was never sent. A corrected invoice is attached, and you will have our formal notice next week.',
  ),
  lapseLog: 'The contractor’s invoice went unanswered and its payment date passed.',
  skills: { 'finance-basics': 25, accuracy: 20 },
  xp: 140,
}

export const ADVANCED_FINANCE: CaseInput[] = [faContract]
