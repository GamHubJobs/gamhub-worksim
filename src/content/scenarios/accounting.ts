/**
 * Accounting: a month-end review with a client at the records room's ledger
 * desk. The bank reconciliation does not agree; the client wants an invoice
 * backdated into last year to cut the tax bill; there is an accrual to
 * explain and a variance to account for. Ethics, accuracy and explaining
 * accounts in plain words. Fictional client and figures.
 */
import { SMART, SUIT } from './looks'
import type { Scenario } from './types'

const DESK = { x: 8.1, z: 5.0 }

export const CLIENT_REVIEW: Scenario = {
  id: 'acc-client-review',
  careerId: 'accounting',
  title: 'Month-end review with a client',
  summary:
    'Sit down with a client over the month-end: a reconciliation that will not agree, a request to backdate an invoice, and an accrual to explain.',
  workplace: 'records',
  room: 'The records room',
  minLevel: 1,
  player: { at: { x: 7.15, z: 3.7 }, faces: DESK },
  camera: { from: [5.0, 3.0, 1.4], looks: [9.4, 1.0, 5.0] },
  cast: [
    {
      id: 'joy',
      name: 'Joy Okonjo',
      role: 'Client: owner, Okonjo Catering',
      look: SMART(5, 'curly', 0, '#b45309'),
      at: { x: 8.95, z: 3.4 },
      faces: { x: 7.2, z: 3.8 },
    },
    {
      id: 'helen',
      name: 'Helen Park',
      role: 'Senior Accountant',
      look: SMART(2, 'bob', 1, '#334155', { glasses: true }),
      at: { x: 6.6, z: 5.3 },
      faces: DESK,
      personId: 'senior',
    },
    {
      id: 'daniel',
      name: 'Daniel Okoro',
      role: 'Accounting Manager',
      look: SUIT(4, 'short', 0, '#1f2937'),
      at: { x: 9.6, z: 6.6 },
      faces: { x: 8, z: 4.4 },
      personId: 'manager',
    },
  ],
  exhibits: [
    {
      id: 'rec',
      title: 'Bank reconciliation, 31 March',
      text: 'Balance per bank £24,610. Balance per cash book £23,370. Difference £1,240. Unpresented cheque 1043 (£1,240, issued 29 March to Fresh Fields Produce).',
    },
    {
      id: 'invoice',
      title: 'Sales invoice SI-2207',
      text: 'Okonjo Catering to Harbour Events: wedding catering on 14 April. £6,000 + VAT. Dated 2 April.',
    },
    {
      id: 'tb',
      title: 'Trial balance extract',
      text: 'Electricity: 2 bills received (Jan, Feb). March bill not yet received; usage about £450.',
    },
  ],
  beats: [
    {
      id: 'hello',
      kind: 'say',
      who: 'joy',
      gesture: 'talk',
      text: 'Thanks for seeing me. My bank says I’ve got £24,610 and your figures say £23,370. Who’s wrong?',
    },
    {
      id: 'rec',
      kind: 'exhibit',
      prompt: 'Find what explains the difference.',
      points: 15,
      items: ['invoice', 'rec', 'tb'],
      correct: 'rec',
      right: [
        {
          who: 'narrator',
          text: 'Cheque 1043 for £1,240 was issued on 29 March and had not cleared the bank by 31 March.',
        },
      ],
      wrong: [
        {
          who: 'helen',
          text: 'That doesn’t explain a bank difference. Look at the reconciliation.',
        },
      ],
      lesson:
        'Reconciling items like unpresented cheques explain timing differences between bank and books.',
    },
    {
      id: 'explain',
      kind: 'choose',
      who: 'joy',
      prompt: 'Explain the £1,240 difference to Joy.',
      points: 15,
      options: [
        {
          id: 'timing',
          label:
            '“Nobody’s wrong: it’s timing. You wrote cheque 1043 to Fresh Fields for £1,240 on 29 March, but they hadn’t banked it by the 31st. Once it clears, the two will agree.”',
          score: 1,
          reply: [
            {
              who: 'joy',
              text: 'Oh, that makes sense. I did post it late.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Explain accounts in the client’s terms: what happened, and when it will resolve.',
        },
        {
          id: 'jargon',
          label: '“It’s an unpresented item on the bank rec.”',
          score: 0.4,
          reply: [{ who: 'joy', text: 'I don’t know what that means.' }],
          lesson: 'Accurate but unexplained jargon leaves the client none the wiser.',
        },
        {
          id: 'adjust',
          label: 'Adjust the cash book up by £1,240 so it matches the bank.',
          score: 0,
          reply: [
            {
              who: 'helen',
              text: 'No! The cheque has been paid out. Never force a reconciliation.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -2 } },
          lesson: 'Forcing the books to agree hides real transactions and errors.',
        },
      ],
    },
    {
      id: 'backdate-ask',
      kind: 'say',
      who: 'joy',
      gesture: 'talk',
      text: 'While I’m here: could you date the Harbour Events invoice the 30th of March instead? It’d help my tax bill this year.',
    },
    {
      id: 'backdate',
      kind: 'choose',
      prompt: 'The wedding is on 14 April and the invoice is dated 2 April.',
      points: 20,
      options: [
        {
          id: 'refuse',
          label:
            'Decline clearly and kindly: income belongs in the period the work is done, so backdating would misstate the accounts and the tax return. Offer to look at legitimate ways to plan for tax.',
          score: 1,
          reply: [
            {
              who: 'joy',
              text: 'I didn’t realise that was a problem. Yes, let’s talk about planning.',
              gesture: 'talk',
            },
            { who: 'daniel', text: 'Well handled.' },
          ],
          effects: { reputation: 2 },
          lesson:
            'Accountants must not misstate accounts: integrity is a professional duty, not a preference.',
        },
        {
          id: 'agree',
          label: 'Agree: it’s only a few days and she’s a good client.',
          score: 0,
          reply: [
            {
              who: 'daniel',
              text: 'We can’t do that, Joy. It would misstate your accounts. I’ll talk it through with you.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -3 }, reputation: -2 },
          lesson:
            'Backdating to move income between years is misstatement, whatever the amount.',
        },
        {
          id: 'manager',
          label: 'Say you will have to ask your manager.',
          score: 0.5,
          reply: [
            {
              who: 'daniel',
              text: 'The answer is no, and you can say so yourself next time.',
            },
          ],
          lesson:
            'Some questions you can answer with confidence: misstatement is always a no.',
        },
      ],
    },
    {
      id: 'accrual-ask',
      kind: 'say',
      who: 'joy',
      gesture: 'talk',
      text: 'And why have you added £450 for electricity? I haven’t had a March bill.',
    },
    {
      id: 'accrual',
      kind: 'choose',
      prompt: 'Explain the accrual.',
      points: 15,
      options: [
        {
          id: 'used',
          label:
            '“You used the electricity in March, so March’s profit should include its cost, even though the bill comes later. We estimate it at £450 from your usage.”',
          score: 1,
          reply: [
            {
              who: 'joy',
              text: 'So the profit is right for the month. Got it.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Accruals match costs to the period they relate to, not when the bill arrives.',
        },
        {
          id: 'rule',
          label: '“It’s an accounting rule.”',
          score: 0.3,
          reply: [{ who: 'joy', text: 'But why?' }],
          lesson: 'Explain the reason (matching), not just the rule.',
        },
      ],
    },
    {
      id: 'variance',
      kind: 'choose',
      who: 'daniel',
      prompt:
        'Daniel: “Food costs were £3,100 over budget in March. What do you tell Joy?”',
      points: 15,
      options: [
        {
          id: 'investigate',
          label:
            'Explain the variance by its causes: compare quantities and prices with the budget, and check whether sales were also higher (more events, more food).',
          score: 1,
          reply: [
            {
              who: 'joy',
              text: 'We did six weddings instead of four. That’ll be it.',
              gesture: 'talk',
            },
            { who: 'daniel', text: 'So it’s volume, not overspending. Good.' },
          ],
          lesson:
            'A variance is a question: split it into volume and price before judging it.',
        },
        {
          id: 'blame',
          label: 'Tell Joy she has overspent and must cut food costs.',
          score: 0.2,
          reply: [{ who: 'joy', text: 'But we had more events than planned!' }],
          lesson: 'Judging a variance without its causes can give the wrong advice.',
        },
      ],
    },
    {
      id: 'meeting-decision',
      kind: 'choose',
      who: 'joy',
      prompt:
        'Joy: “About the £12,000 we owe your firm: could we pay it over 60 days, when cash allows?”',
      points: 15,
      options: [
        {
          id: 'plan',
          label:
            'Propose three monthly instalments of £4,000, with new invoices paid within 30 days',
          score: 1,
          reply: [
            {
              who: 'daniel',
              text: 'Good answer. Firm about what is owed, realistic for them, and it stops the debt growing.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Firm about what is owed, realistic for them, and it stops the debt growing.',
        },
        {
          id: 'accept',
          label: 'Accept “when cash allows” to keep them happy',
          score: 0,
          reply: [
            {
              who: 'daniel',
              text: 'Vague promises are how debts become bad debts.',
              gesture: 'talk',
            },
          ],
          lesson: 'Vague promises are how debts become bad debts.',
        },
        {
          id: 'stop',
          label: 'Say we will stop all work until everything is paid',
          score: 0.4,
          reply: [
            {
              who: 'daniel',
              text: 'A real option if talks fail, but leading with it damages a good client relationship.',
              gesture: 'talk',
            },
          ],
          lesson:
            'A real option if talks fail, but leading with it damages a good client relationship.',
        },
      ],
    },
    {
      id: 'email',
      kind: 'speak',
      who: 'daniel',
      prompt:
        'Write Joy a short follow-up note in your own words: the difference, the invoice date, and the accrual.',
      points: 20,
      minWords: 35,
      mentions: [
        ['cheque', '1043', 'timing'],
        ['April', 'invoice date', 'period', 'backdat'],
        ['accrual', 'accrue', 'electricity'],
      ],
      model:
        'Hi Joy, thanks for today. The £1,240 difference is cheque 1043 to Fresh Fields, which had not cleared by 31 March: a timing difference that will resolve. The Harbour Events invoice stays dated 2 April, as the work is in April, and we will look at tax planning together. We accrued £450 for March electricity because it was used in March.',
      good: [{ who: 'helen', text: 'Clear and complete. Send it.', gesture: 'talk' }],
      weak: [{ who: 'helen', text: 'Cover all three points so Joy has it in writing.' }],
      lesson: 'Confirm advice in writing: it protects the client and the firm.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Accounts agreed; the client understands them and trusts your advice',
      feedback:
        'You explained everything clearly and held the line on the invoice. Joy left happier than she came.',
      effects: { trust: { manager: 3, senior: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Accounts agreed',
      feedback: 'Good review. A little more plain English next time.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Accounts agreed, with corrections',
      feedback:
        'We got there, but Helen and I had to step in. Let’s practise explaining reconciliations.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Review taken over by the manager',
      feedback:
        'Some of today would have misstated the accounts. Let’s go through the principles together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 110,
  skills: { reconciliation: 25, 'financial-reporting': 20, accuracy: 15 },
  caseLink: {
    caseId: 'mtg-acc-client',
    answers: [
      {
        beat: 'meeting-decision',
        step: 'offer',
        options: { plan: 'plan', accept: 'accept', stop: 'stop' },
      },
    ],
  },
}
