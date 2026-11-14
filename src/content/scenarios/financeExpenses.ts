/**
 * Finance & Administration: a morning at the copier and the post table.
 * The payroll report left in the printer, an expense claim that breaks the
 * policy, a manager asking you to approve their own claim, and a note for
 * the file. Confidentiality, policy and segregation of duties.
 */
import { SMART, SUIT } from './looks'
import type { Scenario } from './types'

const COPIER = { x: 11.3, z: 1.6 }

export const EXPENSES: Scenario = {
  id: 'fin-expenses',
  careerId: 'office-admin-finance',
  title: 'The payroll printout and the expense claims',
  summary:
    'Payroll left on the copier, an expense claim outside the policy, and a request to approve someone’s own claim.',
  workplace: 'postroom',
  room: 'The post & print room',
  minLevel: 1,
  player: { at: { x: 10.2, z: 2.65 }, faces: COPIER },
  camera: { from: [7.0, 3.5, 5.6], looks: [10.8, 1.0, 2.2] },
  cast: [
    {
      id: 'kai',
      name: 'Kai Rowe',
      role: 'Sales consultant',
      look: SMART(3, 'short', 0, '#0369a1'),
      at: { x: 9.1, z: 3.4 },
      faces: { x: 10.2, z: 2.7 },
    },
    {
      id: 'priya',
      name: 'Priya Raman',
      role: 'Finance & Administration Manager',
      look: SMART(3, 'long', 0, '#7c2d12'),
      at: { x: 8.8, z: 1.6 },
      faces: { x: 10.2, z: 2.6 },
      personId: 'manager',
    },
    {
      id: 'marcus',
      name: 'Marcus Webb',
      role: 'Head of Operations',
      look: SUIT(4, 'short', 0, '#1e3a8a'),
      at: { x: 9.3, z: 5.9 },
      faces: { x: 10.2, z: 2.8 },
      moves: [{ from: 'own-claim', at: { x: 9.5, z: 3.9 }, faces: { x: 10.2, z: 2.8 } }],
    },
  ],
  exhibits: [
    {
      id: 'policy',
      title: 'Expenses policy (extract)',
      text: 'Receipts required for every item. Client meals up to £40 a head; alcohol not reimbursed. Claims are approved by the claimant’s line manager, never by the claimant.',
    },
    {
      id: 'claim',
      title: 'Kai’s claim',
      text: 'Client dinner, 2 people: £148 (wine £52). Taxi £24, no receipt. Hotel £96, receipt attached.',
    },
    {
      id: 'payroll',
      title: 'Printout on the copier',
      text: 'Payroll summary, March: names, salaries and bank details for all 42 staff.',
    },
  ],
  beats: [
    {
      id: 'printout',
      kind: 'say',
      who: 'narrator',
      text: 'On the copier tray is a printout nobody has collected: the March payroll, with every salary and bank account.',
    },
    {
      id: 'confidential',
      kind: 'choose',
      prompt: 'What do you do with the payroll printout?',
      points: 20,
      options: [
        {
          id: 'secure',
          label:
            'Take it straight away without reading further, give it to Priya personally (or lock it away), and mention that it was left out so it can be reported if needed.',
          score: 1,
          reply: [
            {
              who: 'priya',
              text: 'Thank you. That’s mine: I’ll use secure print from now on and log it.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Personal data left out is secured at once and reported: it may be a data breach.',
        },
        {
          id: 'leave',
          label: 'Leave it: it isn’t yours.',
          score: 0,
          reply: [{ who: 'kai', text: 'Whoa, is that everyone’s salary?' }],
          lesson: 'Leaving personal data out lets anyone read it.',
        },
        {
          id: 'bin',
          label: 'Put it in the recycling bin.',
          score: 0.2,
          reply: [
            {
              who: 'priya',
              text: 'Not the recycling! Confidential waste goes in the shredder, and I needed that.',
            },
          ],
          lesson:
            'Confidential paper goes in confidential waste, and only once it is no longer needed.',
        },
      ],
    },
    {
      id: 'kai-claim',
      kind: 'say',
      who: 'kai',
      gesture: 'reach',
      text: 'Can you push my expenses through today? Client dinner, a taxi and a hotel.',
    },
    {
      id: 'check',
      kind: 'exhibit',
      who: 'kai',
      prompt: 'What do you check Kai’s claim against?',
      points: 10,
      items: ['payroll', 'policy', 'claim'],
      correct: 'policy',
      right: [
        {
          who: 'narrator',
          text: 'The policy: receipts for everything, £40 a head for meals, no alcohol.',
        },
      ],
      wrong: [{ who: 'kai', text: 'That’s just my claim. What are the rules?' }],
      lesson: 'Check every claim against the written policy, the same way for everyone.',
    },
    {
      id: 'decide',
      kind: 'choose',
      prompt: 'The dinner is £148 for two with £52 of wine, and the taxi has no receipt.',
      points: 20,
      options: [
        {
          id: 'policy',
          label:
            'Pay the hotel; pay the dinner up to the £80 limit without the wine; ask Kai for the taxi receipt (or a signed note if it was truly lost). Explain each point kindly.',
          score: 1,
          reply: [
            {
              who: 'kai',
              text: 'Fair. I didn’t know about the wine. I’ll find the taxi receipt.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Apply the policy consistently and explain it: fairness protects everyone.',
        },
        {
          id: 'pay-all',
          label: 'Pay it all: Kai brings in good clients.',
          score: 0,
          reply: [
            {
              who: 'priya',
              text: 'The policy applies to everyone, however good their sales.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson: 'Exceptions for favoured people undermine the policy for everyone.',
        },
        {
          id: 'reject',
          label: 'Reject the whole claim.',
          score: 0.3,
          reply: [{ who: 'kai', text: 'The whole thing? The hotel had a receipt!' }],
          lesson: 'Reject only what breaks the policy; pay what is valid.',
        },
      ],
    },
    {
      id: 'own-claim',
      kind: 'say',
      who: 'marcus',
      gesture: 'talk',
      text: 'Here’s my claim for the conference. I’ve signed it as approved myself to save time: just pay it.',
    },
    {
      id: 'segregation',
      kind: 'choose',
      prompt: 'Marcus has approved his own claim.',
      points: 20,
      options: [
        {
          id: 'route',
          label:
            'Explain that claims are approved by the claimant’s own manager, and send it to the managing director for approval before paying.',
          score: 1,
          reply: [
            {
              who: 'marcus',
              text: 'Fine, I’ll get it signed properly.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Nobody approves their own spending: segregation of duties protects the person and the company.',
        },
        {
          id: 'pay',
          label: 'Pay it: he’s the Head of Operations.',
          score: 0,
          reply: [
            {
              who: 'priya',
              text: 'Seniority doesn’t change the rule. It needs another approver.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson: 'Self-approval is a control breach whoever does it.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'speak',
      who: 'priya',
      prompt:
        'Write a short note for the file in your own words: the printout, Kai’s claim and Marcus’s claim.',
      points: 30,
      minWords: 30,
      mentions: [
        ['payroll', 'printout'],
        ['wine', 'alcohol', '£80', 'receipt'],
        ['own claim', 'approve', 'managing director'],
      ],
      model:
        'The March payroll printout was found on the copier and handed to Priya; logged for review as a possible data breach. Kai’s claim: hotel paid; dinner paid up to £80, wine excluded; taxi held until a receipt is provided. Marcus had approved his own claim; sent to the managing director for approval before payment.',
      good: [{ who: 'priya', text: 'Exactly what the file needs.', gesture: 'talk' }],
      weak: [
        {
          who: 'priya',
          text: 'Cover all three: the printout, Kai’s claim and Marcus’s.',
        },
      ],
      lesson: 'File notes record decisions and the reasons for them.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Personal data secured, the policy applied fairly, the rules kept',
      feedback: 'You handled three tricky things calmly and by the book.',
      effects: { trust: { manager: 3 }, reputation: 3 },
    },
    good: {
      verdict: 'Handled well',
      feedback: 'Good morning’s work. One or two points needed prompting.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Handled, with corrections',
      feedback:
        'I had to step in. Let’s go through the expenses policy and data handling.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Controls breached',
      feedback:
        'Some of today broke the policy or put personal data at risk. Let’s review together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { 'finance-basics': 30, accuracy: 20, presentation: 10 },
}
