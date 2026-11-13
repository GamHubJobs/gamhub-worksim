/**
 * Cases for the legal career at Kestrel & Vane LLP, in the fictional
 * jurisdiction of Westmark. Fictional people and situations, for learning:
 * not legal advice.
 */
import type { CaseInput } from '../schema'
import { replies } from '../incidents/shared'
import { MORE_LEGAL_CASES } from './more'

const FIRM = 'Kestrel & Vane LLP'
const at = (name: string, role: string, personId?: string, organisation = FIRM) => ({
  name,
  role,
  organisation,
  ...(personId ? { personId } : {}),
})

/** Foundation: a client asks whether they will win. */
const willIWin: CaseInput = {
  id: 'law-will-i-win',
  version: 1,
  careerId: 'legal',
  kind: 'client',
  minLevel: 1,
  title: '“Can you promise we’ll win?”',
  summary: 'An anxious client wants a guarantee. Reply honestly and helpfully.',
  from: at(
    'Maya Brightwater',
    'Director, Brightwater Bakery Ltd',
    undefined,
    'Brightwater Bakery Ltd',
  ),
  trigger: { afterAssignment: 'legal-intake' },
  deadlineHours: 3,
  email: {
    subject: 'Are we going to win?',
    body: `Hi,

I’m losing sleep over this Millstone case. Can you just tell me we’re going to win? If you can promise that, I’ll stop worrying.

Maya`,
  },
  whyItMatters:
    'Clients deserve honest advice. Promising an outcome nobody can guarantee misleads them and can lead to bad decisions; explaining strengths, risks and next steps builds real trust.',
  objectives: [
    'Be honest about uncertainty',
    'Reassure without promising',
    'Stay within your role',
  ],
  steps: [
    {
      id: 'reply',
      kind: 'reply',
      to: 'Maya Brightwater',
      title: 'Reply to Maya',
      prompt:
        'Reply kindly: no promises, what is strong about her case, and what happens next.',
      points: 100,
      minWords: 50,
      mentions: [
        [
          'cannot promise',
          'can’t promise',
          'cannot guarantee',
          'can’t guarantee',
          'no guarantee',
        ],
        ['strong', 'good evidence', 'evidence'],
        ['next', 'Eleanor', 'partner'],
      ],
      avoid: [
        {
          terms: ['you will win', 'definitely win', 'guarantee you'],
          why: 'Nobody can guarantee the result of a case.',
        },
        {
          terms: ['you will lose', 'hopeless'],
          why: 'Don’t frighten the client, and don’t give advice beyond your role.',
        },
      ],
      model:
        'Dear Maya, I completely understand why this is worrying. Nobody can promise the outcome of a case, so I can’t guarantee a win, but your claim has good evidence: the delivery note and the email showing the mould. Eleanor will go through the strengths and the risks with you at your meeting next week, and we will keep you updated at every step. {name}',
    },
  ],
  outcomes: {
    pass: { reputation: 3, indicators: { satisfaction: 3 } },
    fail: { indicators: { satisfaction: -3, risk: 2 } },
    lapse: { indicators: { satisfaction: -2 } },
  },
  replies: replies(
    'Maya',
    'Thank you for being straight with me. I feel better knowing what happens next.',
  ),
  lapseLog: 'Maya Brightwater’s worried email went unanswered.',
  skills: { 'customer-service': 35, 'professional-ethics': 15 },
  xp: 75,
}

/** Foundation: checking the courier and court fee costs. */
const disbursements: CaseInput = {
  id: 'law-disbursements',
  version: 1,
  careerId: 'legal',
  kind: 'internal',
  minLevel: 1,
  title: 'The disbursements don’t add up',
  summary: 'Check the costs paid out on the client’s behalf before they go on the bill.',
  from: at('Owen Gallagher', 'Billing Coordinator'),
  trigger: { afterAssignment: 'legal-research' },
  deadlineHours: 3,
  email: {
    subject: 'Disbursements for M-2041',
    body: `Hi {name},

Before the bill goes out, can you check the disbursements on M-2041 (court fees and couriers paid on the client’s behalf)? One of the receipts looks like a duplicate.

Owen`,
  },
  whyItMatters:
    'Clients reimburse disbursements at cost. Charging a receipt twice, even by accident, is overcharging the client.',
  objectives: ['Check costs against receipts', 'Catch a duplicate'],
  evidence: [
    {
      id: 'list',
      title: 'Disbursements recorded on M-2041',
      table: {
        head: ['Date', 'Item', 'Receipt', 'Amount'],
        rows: [
          ['2026-02-10', 'Court issue fee', 'WDC-5521', '£455'],
          ['2026-02-12', 'Courier to Millstone', 'CR-118', '£35'],
          ['2026-02-12', 'Courier to Millstone', 'CR-118', '£35'],
          ['2026-02-20', 'Copying the bundle', 'CP-902', '£60'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'total',
      kind: 'figure',
      title: 'The correct total',
      prompt: 'What is the correct total of disbursements to bill?',
      points: 50,
      answer: 550,
      tolerance: 0,
      unit: '£',
      why: 'CR-118 appears twice: £455 + £35 + £60 = £550.',
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you do?',
      prompt: 'How do you deal with the duplicate?',
      points: 20,
      options: [
        {
          id: 'remove',
          label: 'Remove the duplicate and tell Owen which receipt it was',
          verdict: 'best',
          why: 'The bill is right, and Owen can check how it happened.',
        },
        {
          id: 'leave',
          label: 'Leave it: it’s only £35',
          verdict: 'poor',
          why: 'Overcharging a client is never acceptable, whatever the amount.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Owen Gallagher',
      title: 'Reply to Owen',
      prompt: 'Tell Owen the correct total and what was wrong.',
      points: 30,
      minWords: 25,
      mentions: [['550'], ['CR-118', 'duplicate', 'twice']],
      model:
        'Hi Owen, the courier receipt CR-118 (£35) was entered twice. Without the duplicate, the disbursements on M-2041 come to £550. I have removed the second entry. {name}',
    },
  ],
  outcomes: {
    pass: { indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Owen', 'Good catch: the bill went out right.'),
  lapseLog: 'The disbursements on M-2041 were not checked.',
  skills: { accuracy: 30, 'case-management': 10 },
  xp: 70,
}

/** Operations: requests against the team budget. */
const teamRequests: CaseInput = {
  id: 'law-team-requests',
  version: 1,
  careerId: 'legal',
  kind: 'operations',
  minLevel: 2,
  title: 'Team requests to approve',
  summary: 'Research, training and other requests against the team budget.',
  from: at('Eleanor Vane', 'Partner', 'manager'),
  trigger: { afterAssignment: 'legal-contract' },
  deadlineHours: 4,
  email: {
    subject: 'Please decide this week’s requests',
    body: `Hi {name},

While I am in court, please decide this week’s requests against the team budget. Our policy: client work, research and training are fine; personal items and client entertaining without approval are not; anything above your limit comes to me.

Eleanor`,
  },
  whyItMatters:
    'Spending within policy and authority keeps the firm’s money, and its reputation, in order.',
  objectives: ['Apply the spending policy', 'Stay within your approval limit'],
  steps: [
    {
      id: 'approve',
      kind: 'approve',
      title: 'Decide the requests',
      prompt: 'Approve, reject or escalate each request.',
      points: 70,
      requests: [
        {
          id: 'database',
          summary: 'A month of access to the Westmark law reports database',
          department: 'law',
          amount: 220,
          why: 'Research for client work is in policy.',
        },
        {
          id: 'expert',
          summary: 'A food safety expert’s report for Brightwater v Millstone',
          department: 'law',
          amount: 3200,
          why: 'Client work in policy, but above a paralegal’s limit: the partner decides.',
        },
        {
          id: 'tickets',
          summary: 'Football tickets for a prospective client',
          department: 'law',
          amount: 180,
          policyBreach:
            'Client entertaining needs the partner’s approval in advance, under the firm’s anti-bribery policy.',
        },
        {
          id: 'course',
          summary: 'A court skills course for the trainee',
          department: 'law',
          amount: 150,
          why: 'Training is in policy.',
        },
      ],
    },
    {
      id: 'expert-now',
      kind: 'decide',
      title: 'The expert’s deadline',
      prompt:
        'The expert needs instructions by Friday and Eleanor is in court until Thursday night. What do you do?',
      points: 30,
      options: [
        {
          id: 'message',
          label: 'Send Eleanor a short note now so she can approve it between hearings',
          verdict: 'best',
          why: 'The decision stays with the person who has the authority, in time.',
        },
        {
          id: 'approve',
          label: 'Approve it yourself: it’s for the client',
          verdict: 'poor',
          why: 'Good reasons don’t change your limit.',
        },
        {
          id: 'wait',
          label: 'Wait until Friday',
          verdict: 'acceptable',
          why: 'Within your authority, but it risks missing the expert’s deadline.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -3 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Eleanor', 'Thank you: I approved the expert between hearings.'),
  lapseLog: 'The team’s requests waited another week.',
  skills: { accuracy: 20, 'professional-ethics': 25 },
  xp: 85,
}

/** Workflow: handing a filing to the court filing team. */
const courtFiling: CaseInput = {
  id: 'law-court-filing',
  version: 1,
  careerId: 'legal',
  kind: 'workflow',
  minLevel: 2,
  title: 'Filing the defence to counterclaim',
  summary: 'Give the court filing team what they need to file on time.',
  from: at('Tobias Kestrel', 'Senior Associate', 'senior'),
  trigger: { afterAssignment: 'legal-contract' },
  deadlineHours: 3,
  email: {
    subject: 'Filing: defence to counterclaim',
    body: `Hi {name},

The defence to Millstone’s counterclaim is signed. Please fill in the court filing team’s request so they file it on time. Details are in the file.

Tobias`,
  },
  whyItMatters:
    'Court filings are rejected for small errors: a wrong case number or a missing document can mean missing the deadline.',
  objectives: ['Pass on exact filing details', 'Make sure the deadline is met'],
  evidence: [
    {
      id: 'file',
      title: 'Brightwater v Millstone: court details',
      text: 'Court: Westmark District Court. Case number WDC-2026-0412. Defence to counterclaim due 23 March 2026. To file: the defence (signed) and a statement of truth.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      to: 'Court filing team',
      title: 'The filing request',
      prompt: 'Fill in the request.',
      points: 70,
      fields: [
        {
          id: 'number',
          label: 'Case number',
          kind: 'text',
          accept: ['WDC-2026-0412'],
          why: 'The court files by case number; a wrong one is rejected.',
        },
        {
          id: 'court',
          label: 'Court',
          kind: 'choice',
          options: ['Westmark District Court', 'Westmark Court of Appeal'],
          answer: 'Westmark District Court',
          why: 'The claim is in the District Court.',
        },
        {
          id: 'due',
          label: 'File by',
          kind: 'text',
          accept: ['2026-03-23', '23 March 2026', '23/03/2026'],
          why: 'The deadline from the calendar.',
        },
        {
          id: 'documents',
          label: 'Number of documents to file',
          kind: 'number',
          answer: 2,
          why: 'The signed defence and the statement of truth.',
        },
      ],
    },
    {
      id: 'late',
      kind: 'decide',
      title: 'If the portal is down',
      prompt:
        'On the 23rd at 3 pm the court’s filing portal is down. What should the filing team do?',
      points: 30,
      options: [
        {
          id: 'email',
          label:
            'File by the court’s backup method (email to the registry) the same day, and keep the proof',
          verdict: 'best',
          why: 'The deadline still counts; the backup method meets it.',
        },
        {
          id: 'tomorrow',
          label: 'Try again tomorrow',
          verdict: 'poor',
          why: 'Filing late without permission can mean judgment against the client.',
        },
        {
          id: 'ask',
          label: 'Ask Tobias what to do',
          verdict: 'acceptable',
          why: 'Sensible, but the team should know the backup method.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { senior: 3 }, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { indicators: { risk: 3 } },
  },
  replies: replies('Tobias', 'Filed with a day to spare. Thank you.'),
  lapseLog: 'The defence to counterclaim nearly missed its filing deadline.',
  skills: { 'case-management': 30, accuracy: 20 },
  xp: 85,
}

const courtFilingFix: CaseInput = {
  id: 'law-court-filing-fix',
  version: 1,
  careerId: 'legal',
  kind: 'workflow',
  minLevel: 2,
  title: 'The court rejected the filing',
  summary:
    'The filing was rejected because of a detail in the request. Put it right today.',
  from: at('Court filing team', 'Filing clerk'),
  trigger: {
    afterCase: 'law-court-filing',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 1,
  email: {
    subject: 'Filing rejected: WDC-2026-0412',
    body: `Hi,

The court rejected our filing for Brightwater v Millstone: a detail in the request didn’t match the court’s records. The deadline is today. Can you check and send the correct details?

Filing team`,
  },
  whyItMatters:
    'Mistakes happen; correcting them fast, and honestly, is what keeps the client safe.',
  objectives: ['Own and correct the mistake quickly'],
  steps: [
    {
      id: 'response',
      kind: 'decide',
      title: 'What do you do?',
      prompt: 'How do you respond?',
      points: 50,
      options: [
        {
          id: 'fix',
          label: 'Check the file, send the correct details now, and tell Tobias',
          verdict: 'best',
          why: 'Fast correction, and the supervisor knows.',
        },
        {
          id: 'blame',
          label: 'Say the filing team must have typed it wrong',
          verdict: 'poor',
          why: 'Blame wastes the time the client does not have.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'the filing team',
      title: 'Send the correct details',
      prompt: 'Send the correct filing details, with an apology.',
      points: 50,
      minWords: 25,
      mentions: [
        ['sorry', 'apolog'],
        ['WDC-2026-0412'],
        ['today', '23 March', '2026-03-23'],
      ],
      model:
        'Sorry, my mistake. The correct details: Westmark District Court, case WDC-2026-0412, two documents (the signed defence and the statement of truth), to be filed today, 23 March 2026. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { senior: 1 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { risk: 3 } },
  },
  replies: replies('Filing team', 'Re-filed and accepted. All good.'),
  lapseLog: 'The rejected filing was not corrected.',
  skills: { 'case-management': 20, accuracy: 10 },
  xp: 45,
}

export const LEGAL_CASES: CaseInput[] = [
  willIWin,
  disbursements,
  teamRequests,
  courtFiling,
  courtFilingFix,
  ...MORE_LEGAL_CASES,
]
