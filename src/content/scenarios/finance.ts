/**
 * Finance & Administration: a supplier's account manager calls in at the
 * post and print room about an invoice "unpaid for 60 days". The player
 * checks the three documents (order, delivery, invoice), finds the invoice
 * was paid already, deals with a request to change the supplier's bank
 * details (a classic fraud), and holds a department head to the approval
 * limits. Fictional supplier and figures.
 */
import { SMART, SUIT } from './looks'
import type { Scenario } from './types'

const TABLE = { x: 8.2, z: 4.6 }

export const SUPPLIER_VISIT: Scenario = {
  id: 'fin-supplier-visit',
  careerId: 'office-admin-finance',
  title: 'A supplier calls in: the unpaid invoice',
  summary:
    'A supplier says an invoice is 60 days overdue and asks to change their bank details. Check the documents, spot the risk, keep to the rules.',
  workplace: 'postroom',
  room: 'The post & print room',
  minLevel: 1,
  player: { at: { x: 7.2, z: 3.25 }, faces: TABLE },
  camera: { from: [5.0, 3.0, 1.2], looks: [9.4, 1.0, 5.0] },
  cast: [
    {
      id: 'gareth',
      name: 'Gareth Lowe',
      role: 'Account manager, Brightline Office Supplies',
      look: SUIT(1, 'side', 2, '#334155', { tie: '#15803d' }),
      at: { x: 8.95, z: 3.0 },
      faces: { x: 7.3, z: 3.3 },
    },
    {
      id: 'priya',
      name: 'Priya Raman',
      role: 'Finance & Administration Manager',
      look: SMART(3, 'long', 0, '#7c2d12'),
      at: { x: 6.7, z: 5.5 },
      faces: TABLE,
      personId: 'manager',
    },
    {
      id: 'marcus',
      name: 'Marcus Webb',
      role: 'Head of Operations',
      look: SUIT(4, 'short', 0, '#1e3a8a'),
      at: { x: 9.7, z: 6.1 },
      faces: { x: 7.6, z: 4.2 },
      moves: [{ from: 'chairs', at: { x: 9.2, z: 5.7 }, faces: { x: 7.4, z: 3.5 } }],
    },
  ],
  exhibits: [
    {
      id: 'po',
      title: 'Purchase order PO-5512',
      text: '200 reams A4 paper, 40 toner cartridges. Total £2,960. Approved by P. Raman, 3 Feb.',
    },
    {
      id: 'grn',
      title: 'Goods received note GRN-0871',
      text: '200 reams A4, 40 toner received 10 Feb. Signed: reception.',
    },
    {
      id: 'ledger',
      title: 'Purchase ledger: Brightline',
      text: 'INV-30418 £2,960 paid 12 Mar by BACS (ref BL30418). INV-30418-R £2,960 received 2 Apr: unpaid.',
    },
    {
      id: 'letter',
      title: 'Letter: “change of bank details”',
      text: 'Brightline headed paper. “Please pay all future invoices to our new account, sort code 40-12-77, account 31842201. Call 07700 900231 with any queries.”',
    },
  ],
  beats: [
    {
      id: 'arrive',
      kind: 'say',
      who: 'gareth',
      gesture: 'talk',
      text: 'Thanks for seeing me. Invoice 30418, two thousand nine hundred and sixty pounds, sixty days unpaid. My finance team are chasing me hard.',
    },
    {
      id: 'match',
      kind: 'choose',
      prompt: 'How do you check whether Cobalt Ridge owes this?',
      points: 15,
      options: [
        {
          id: 'three-way',
          label:
            'Match the three documents: the purchase order, the goods received note and the invoice, then check the purchase ledger for payment.',
          score: 1,
          reply: [
            {
              who: 'priya',
              text: 'Exactly. Order, delivery, invoice, ledger.',
              gesture: 'talk',
            },
          ],
          lesson:
            'A three-way match (order, delivery, invoice) proves an invoice is due; the ledger shows if it is paid.',
        },
        {
          id: 'pay',
          label: 'Apologise and pay it today to keep the supplier happy.',
          score: 0,
          reply: [
            {
              who: 'priya',
              text: 'Never pay before checking. Let’s look first.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson:
            'Paying under pressure without checking is how duplicates and frauds get paid.',
        },
      ],
    },
    {
      id: 'paid',
      kind: 'exhibit',
      who: 'priya',
      prompt: 'Which document shows what has happened to invoice 30418?',
      points: 15,
      items: ['po', 'grn', 'ledger'],
      correct: 'ledger',
      right: [
        {
          who: 'narrator',
          text: 'INV-30418 was paid on 12 March. A second copy, INV-30418-R, arrived in April: the same invoice again.',
        },
      ],
      wrong: [
        { who: 'priya', text: 'That shows it was ordered and delivered. Was it paid?' },
      ],
      lesson: 'The purchase ledger is where payments are recorded.',
    },
    {
      id: 'tell',
      kind: 'choose',
      who: 'gareth',
      prompt: 'Gareth: “So when will you pay?”',
      points: 15,
      options: [
        {
          id: 'evidence',
          label:
            '“We paid it on 12 March by BACS, reference BL30418. The April invoice is a duplicate, so we won’t pay it twice. I can send you the remittance.”',
          score: 1,
          reply: [
            {
              who: 'gareth',
              text: 'Ah. Our system must have reissued it. Send the remittance and I’ll sort it.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Answer with evidence: date, method and reference. Duplicates are refused, politely.',
        },
        {
          id: 'pay-again',
          label: 'Pay the April one too, to be safe.',
          score: 0,
          reply: [
            {
              who: 'priya',
              text: 'That would pay them twice! We’d have to chase it back.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson: 'Paying a duplicate costs money and time to recover.',
        },
      ],
    },
    {
      id: 'bank',
      kind: 'say',
      who: 'gareth',
      gesture: 'reach',
      text: 'One more thing: this came to our office for you. We’ve changed banks. Could you update our details today?',
    },
    {
      id: 'fraud',
      kind: 'choose',
      prompt: 'A letter asking to change the supplier’s bank details. What do you do?',
      points: 20,
      options: [
        {
          id: 'verify',
          label:
            'Do not change anything yet: verify by calling Brightline on the number already on file (not the number on the letter), and get a second person to approve the change.',
          score: 1,
          reply: [
            {
              who: 'priya',
              text: 'Exactly right. That’s our procedure.',
              gesture: 'talk',
            },
            {
              who: 'gareth',
              text: 'Hang on: I didn’t send that. We haven’t changed banks!',
            },
          ],
          effects: { reputation: 2 },
          lesson:
            'Bank-detail changes are a top fraud route: verify on a known number, with two people.',
        },
        {
          id: 'update',
          label: 'Update the details now: Gareth is standing right here.',
          score: 0,
          reply: [
            {
              who: 'gareth',
              text: 'Wait, that isn’t our letter. We haven’t changed banks.',
            },
            {
              who: 'priya',
              text: 'That would have sent our next payment to a fraudster.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -3 }, reputation: -2 },
          lesson: 'A letter, an email or even a visitor is not verification.',
        },
        {
          id: 'call-letter',
          label: 'Call the number on the letter to confirm.',
          score: 0.2,
          reply: [
            {
              who: 'priya',
              text: 'That number could be the fraudster’s. Use the one on file.',
            },
          ],
          lesson: 'Never verify using contact details from the request itself.',
        },
      ],
    },
    {
      id: 'chairs',
      kind: 'say',
      who: 'marcus',
      gesture: 'talk',
      text: 'While you’re both here: I need twelve new office chairs, £4,800. Can you raise the order today? I’ll sign it.',
    },
    {
      id: 'limit',
      kind: 'choose',
      prompt:
        'Department heads can approve orders up to £2,500; above that the finance director must approve.',
      points: 10,
      options: [
        {
          id: 'route',
          label:
            'Explain the approval limit, raise the order and send it to the finance director for approval, with a quote attached.',
          score: 1,
          reply: [
            {
              who: 'marcus',
              text: 'Fine, I’ll get her to sign it off.',
              gesture: 'talk',
            },
          ],
          lesson: 'Approval limits exist so large spending gets the right scrutiny.',
        },
        {
          id: 'split',
          label: 'Split it into two orders of £2,400 so Marcus can approve both.',
          score: 0,
          reply: [
            {
              who: 'priya',
              text: 'Splitting orders to get round a limit is a breach of the rules.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson:
            'Splitting purchases to dodge approval limits is a control breach, and looks like fraud.',
        },
      ],
    },
    {
      id: 'meeting-decision',
      kind: 'choose',
      who: 'marcus',
      prompt:
        'Marcus: “Travel is £1,100 over budget this quarter. Just cut the training budget to cover it.” (The overspend came from booking trains late.)',
      points: 15,
      options: [
        {
          id: 'fix-cause',
          label:
            'Suggest fixing the cause instead: book travel in advance, which would have saved £1,100',
          score: 1,
          reply: [
            {
              who: 'priya',
              text: 'Good answer. It solves the overspend without losing training the team needs.',
              gesture: 'talk',
            },
          ],
          lesson: 'It solves the overspend without losing training the team needs.',
        },
        {
          id: 'agree',
          label: 'Agree: training was underspent anyway',
          score: 0.4,
          reply: [
            {
              who: 'priya',
              text: 'It balances this month, but the overspend will happen again.',
              gesture: 'talk',
            },
          ],
          lesson: 'It balances this month, but the overspend will happen again.',
        },
        {
          id: 'dismiss',
          label: 'Say that’s not your decision and move on',
          score: 0,
          reply: [
            {
              who: 'priya',
              text: 'You know the cause; sharing it is exactly why you are presenting.',
              gesture: 'talk',
            },
          ],
          lesson: 'You know the cause; sharing it is exactly why you are presenting.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'speak',
      who: 'priya',
      prompt:
        'Write a short note for the file in your own words: the duplicate, the bank-details letter, and what you did.',
      points: 25,
      minWords: 30,
      mentions: [
        ['duplicate', 'paid', '12 March', 'BL30418'],
        ['bank', 'letter'],
        ['verif', 'number on file', 'known number', 'called'],
      ],
      model:
        'Brightline visit: INV-30418 was paid on 12 March (BACS ref BL30418); the April invoice is a duplicate and was not paid. A letter asking to change Brightline’s bank details was not actioned; Gareth confirmed by phone on our known number that Brightline has not changed banks. Reported as attempted fraud.',
      good: [
        {
          who: 'priya',
          text: 'Good. I’ll send the fraud report to the bank too.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'priya',
          text: 'Put the facts in: what was paid, the letter, and how you checked.',
        },
      ],
      lesson: 'A clear file note protects the company if questions come later.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'No duplicate paid, a fraud attempt stopped, the rules kept',
      feedback:
        'You checked before paying, stopped a fraud and kept to the approval limits. Excellent.',
      effects: { trust: { manager: 3 }, reputation: 3 },
    },
    good: {
      verdict: 'No money lost',
      feedback: 'Good checks. A couple of answers needed prompting.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'No money lost, thanks to the manager',
      feedback:
        'We got there, but I had to step in. Let’s go through our payment controls.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Payment controls breached',
      feedback:
        'Some of today could have cost us real money. Let’s retrain on controls together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 110,
  skills: { 'finance-basics': 30, accuracy: 20, 'data-analysis': 10 },
  caseLink: {
    caseId: 'mtg-fa-team',
    answers: [
      {
        beat: 'meeting-decision',
        step: 'question',
        options: { 'fix-cause': 'fix-cause', agree: 'agree', dismiss: 'dismiss' },
      },
    ],
  },
}
