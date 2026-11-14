/**
 * Accounting: the external auditor's visit to the records room. Pull the
 * sample from the filing cabinets, be honest about a missing approval,
 * spot a cut-off error, keep independence when a manager wants it smoothed
 * over, and summarise the findings. Fictional company and auditor.
 */
import { SMART, SUIT } from './looks'
import type { Scenario } from './types'

const CABINETS = { x: 11.6, z: 4.4 }

export const AUDIT_VISIT: Scenario = {
  id: 'acc-audit-visit',
  careerId: 'accounting',
  title: 'The auditor’s visit',
  summary:
    'The external auditor is testing a sample in the records room: find the documents, be honest about what is missing, and spot a cut-off error.',
  workplace: 'records',
  room: 'The records room',
  minLevel: 1,
  player: { at: { x: 10.3, z: 4.4 }, faces: CABINETS },
  camera: { from: [7.0, 3.4, 1.4], looks: [11.0, 1.0, 4.6] },
  cast: [
    {
      id: 'martin',
      name: 'Martin Shaw',
      role: 'Audit senior, Holloway & Partners',
      look: SUIT(0, 'short', 1, '#334155', { glasses: true }),
      at: { x: 10.7, z: 2.55 },
      faces: { x: 10.3, z: 4.3 },
    },
    {
      id: 'helen',
      name: 'Helen Park',
      role: 'Senior Accountant',
      look: SMART(2, 'bob', 1, '#334155', { glasses: true }),
      at: { x: 9.5, z: 5.65 },
      faces: { x: 10.3, z: 4.5 },
      personId: 'senior',
    },
    {
      id: 'daniel',
      name: 'Daniel Okoro',
      role: 'Accounting Manager',
      look: SUIT(4, 'short', 0, '#1f2937'),
      at: { x: 8.2, z: 6.8 },
      faces: { x: 10, z: 4.6 },
      personId: 'manager',
      moves: [{ from: 'smooth', at: { x: 9.0, z: 6.2 }, faces: { x: 10.2, z: 4.6 } }],
    },
  ],
  exhibits: [
    {
      id: 'inv-4471',
      title: 'Purchase invoice PI-4471',
      text: 'Stationery Direct, £3,250. Approval box: blank. Posted 14 February.',
    },
    {
      id: 'inv-5012',
      title: 'Purchase invoice PI-5012',
      text: 'Northline Freight, £8,900, for deliveries made 2–4 April. Posted to March.',
    },
    {
      id: 'cash',
      title: 'Petty cash count, 31 March',
      text: 'Counted £186.40; book balance £186.40. Signed by two people.',
    },
  ],
  beats: [
    {
      id: 'hello',
      kind: 'say',
      who: 'martin',
      gesture: 'talk',
      text: 'Morning. I’ve picked a sample of five purchase invoices from the ledger. Could I see the originals, with their approvals?',
    },
    {
      id: 'provide',
      kind: 'choose',
      prompt: 'How do you deal with the auditor’s request?',
      points: 10,
      options: [
        {
          id: 'promptly',
          label:
            'Pull all five from the cabinets now, exactly as they are filed, and log what was provided.',
          score: 1,
          reply: [
            {
              who: 'martin',
              text: 'Thank you. That’s quick and complete.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Give auditors complete, unaltered records promptly: it builds trust and shortens the audit.',
        },
        {
          id: 'tidy',
          label: 'Say you need a day to “tidy them up” first.',
          score: 0.1,
          reply: [{ who: 'martin', text: 'I need to see them as they are, please.' }],
          lesson: 'Tidying records before an auditor sees them looks like concealment.',
        },
      ],
    },
    {
      id: 'missing',
      kind: 'say',
      who: 'martin',
      gesture: 'present',
      text: 'Invoice 4471 for £3,250 has no approval signature. Who approved it?',
    },
    {
      id: 'honest',
      kind: 'choose',
      prompt: 'The approval box on PI-4471 is blank.',
      points: 20,
      options: [
        {
          id: 'truth',
          label:
            'Say honestly that it isn’t approved on file, find out what happened, and suggest a fix: no payment without a recorded approval.',
          score: 1,
          reply: [
            {
              who: 'martin',
              text: 'I appreciate the honesty. I’ll note it as a control finding with your fix.',
              gesture: 'talk',
            },
            { who: 'helen', text: 'Good. That’s what the audit is for.' },
          ],
          lesson:
            'Report control gaps honestly with a fix: findings are how controls improve.',
        },
        {
          id: 'sign',
          label: 'Quietly get it signed now and hand it back.',
          score: 0,
          reply: [
            {
              who: 'helen',
              text: 'We can’t sign it now and pretend it was approved before. That’s falsifying a record.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -3 }, reputation: -2 },
          lesson:
            'Adding an approval after the event and presenting it as original is falsification.',
        },
      ],
    },
    {
      id: 'cutoff',
      kind: 'exhibit',
      who: 'martin',
      prompt: 'Martin: “Is there anything in the sample in the wrong period?”',
      points: 15,
      items: ['inv-4471', 'inv-5012', 'cash'],
      correct: 'inv-5012',
      right: [
        {
          who: 'martin',
          text: 'Deliveries in April, posted to March: a cut-off error. It overstates March costs by £8,900.',
          gesture: 'talk',
        },
      ],
      wrong: [
        {
          who: 'martin',
          text: 'That one is in the right period. Look at the dates of service.',
        },
      ],
      lesson: 'Cut-off: costs belong in the period the goods or services were received.',
    },
    {
      id: 'smooth',
      kind: 'say',
      who: 'daniel',
      gesture: 'talk',
      text: 'Martin, these are small points. Could we keep them out of your report to keep the board happy?',
    },
    {
      id: 'independence',
      kind: 'choose',
      prompt: 'Your manager asks the auditor to leave the findings out.',
      points: 20,
      options: [
        {
          id: 'support',
          label:
            'Say the findings are fair and you would rather fix them openly: propose posting the £8,900 to April and adding the approval check.',
          score: 1,
          reply: [
            {
              who: 'daniel',
              text: 'You’re right. Let’s correct them and move on.',
              gesture: 'talk',
            },
            {
              who: 'martin',
              text: 'With those corrections I’ll report them as resolved.',
            },
          ],
          effects: { reputation: 2 },
          lesson:
            'Auditors must be independent; the best response to findings is to correct them.',
        },
        {
          id: 'agree',
          label: 'Back your manager: they really are small.',
          score: 0,
          reply: [
            {
              who: 'martin',
              text: 'I can’t leave findings out of my report.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -1 } },
          lesson:
            'Pressuring an auditor undermines their independence and the accounts’ credibility.',
        },
      ],
    },
    {
      id: 'summary',
      kind: 'speak',
      who: 'helen',
      prompt:
        'Write the summary of the audit findings for Daniel in your own words, with the fix for each.',
      points: 35,
      minWords: 35,
      mentions: [
        ['4471', 'approval', 'unapproved'],
        ['5012', 'cut-off', 'April'],
        ['8,900', '£8,900'],
        ['petty cash', 'agreed', 'no issue'],
      ],
      model:
        'Audit sample: PI-4471 (£3,250) had no recorded approval; fix: no payment without a recorded approval, and a retrospective review. PI-5012 (£8,900) was for April deliveries but posted to March: a cut-off error, now moved to April. Petty cash agreed to the book balance with no issues.',
      good: [
        {
          who: 'helen',
          text: 'Clear and complete. Daniel will want that today.',
          gesture: 'talk',
        },
      ],
      weak: [
        { who: 'helen', text: 'List each finding with its fix, and what was fine.' },
      ],
      lesson: 'Summarise findings with the fix for each, and say what was clean.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'A clean audit outcome: findings corrected openly',
      feedback: 'Prompt, honest and accurate. The auditor will remember that.',
      effects: { trust: { manager: 2, senior: 3 }, reputation: 3 },
    },
    good: {
      verdict: 'Audit closed with minor findings',
      feedback: 'Good handling. A little firmer on the cut-off next time.',
      effects: { trust: { senior: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Audit closed with findings outstanding',
      feedback:
        'We got through, but some findings are still open. Let’s fix them this week.',
      effects: { trust: { senior: 1 } },
    },
    poor: {
      verdict: 'Audit escalated to the finance director',
      feedback:
        'Some of today damaged the auditor’s trust in our records. Let’s go through the principles.',
      effects: { trust: { senior: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { reconciliation: 15, 'financial-reporting': 25, accuracy: 20 },
}
