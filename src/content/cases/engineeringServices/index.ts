/**
 * Cases for the engineering career at Northbank Engineering Ltd. Fictional
 * people and numbers; standard formulas, simplified data: for learning.
 */
import type { CaseInput } from '../schema'
import { replies } from '../incidents/shared'

const FIRM = 'Northbank Engineering Ltd'
const at = (name: string, role: string, personId?: string, organisation = FIRM) => ({
  name,
  role,
  organisation,
  ...(personId ? { personId } : {}),
})

/** Foundation: a client wants to add load without a recalculation. */
const clientChange: CaseInput = {
  id: 'eng-client-change',
  version: 1,
  careerId: 'engineering-services',
  kind: 'client',
  minLevel: 1,
  title: '“Can we just put the bigger machine on it?”',
  summary: 'A client wants to put heavier equipment on the mezzanine. Reply safely.',
  from: at('Owen Harte', 'Warehouse Manager', undefined, 'Harte Logistics'),
  trigger: { afterAssignment: 'eng-beam' },
  deadlineHours: 3,
  email: {
    subject: 'Mezzanine: a heavier machine',
    body: `Hi,

We’ve bought a bigger packing machine: about twice the weight of the old one. Can we put it on the new mezzanine? I assume you built in some spare strength.

Owen`,
  },
  whyItMatters:
    'Structures are designed for a stated load. Saying “it will be fine” without a calculation puts people at risk; offering to check is what professionals do.',
  objectives: [
    'Never approve a change without a check',
    'Explain clearly and offer the next step',
  ],
  steps: [
    {
      id: 'reply',
      kind: 'reply',
      to: 'Owen Harte',
      title: 'Reply to Owen',
      prompt: 'Reply: not until it is checked, why, and what you will do.',
      points: 100,
      minWords: 50,
      mentions: [
        ['not', 'until'],
        ['check', 'calculat'],
        ['weight', 'load'],
      ],
      avoid: [
        {
          terms: ['it will be fine', 'should be fine', 'no problem'],
          why: 'Never approve an extra load without a calculation.',
        },
        {
          terms: ['spare strength', 'plenty of margin'],
          why: 'Safety margins are not spare capacity for extra load.',
        },
      ],
      model:
        'Hi Owen, please don’t put the new machine on the mezzanine until we have checked it. The beams were designed for the old machine’s load, and the safety margins are there for safety, not extra weight. If you send us the new machine’s weight and footprint, we will check the design and tell you within two days whether it is safe or what strengthening it needs. {name}',
    },
  ],
  outcomes: {
    pass: { reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 4 } },
    lapse: { indicators: { risk: 2 } },
  },
  replies: replies(
    'Owen',
    'Thanks for being careful. Machine details attached: please check.',
  ),
  lapseLog: 'Owen Harte’s question about the heavier machine went unanswered.',
  skills: { 'design-judgement': 30, 'technical-writing': 20 },
  xp: 75,
}

/** Foundation: ordering steel with a waste allowance. */
const steelOrder: CaseInput = {
  id: 'eng-steel-order',
  version: 1,
  careerId: 'engineering-services',
  kind: 'internal',
  minLevel: 1,
  title: 'How much steel to order?',
  summary:
    'Work out the steel order for the mezzanine, with the usual allowance for cutting.',
  from: at('Tomás Rivera', 'Project Planner'),
  trigger: { afterAssignment: 'eng-circuit' },
  deadlineHours: 3,
  email: {
    subject: 'Steel order for the mezzanine',
    body: `Hi {name},

The mezzanine needs 6 beams of NB-200, each 6 m long. We always order 10% extra for cutting and offcuts. How many metres should I order?

Tomás`,
  },
  whyItMatters:
    'Too little steel stops the job; too much wastes money. A simple, checked calculation gets it right.',
  objectives: ['Calculate an order with an allowance'],
  steps: [
    {
      id: 'metres',
      kind: 'figure',
      title: 'Metres to order',
      prompt: 'How many metres of NB-200 should be ordered?',
      points: 50,
      answer: 39.6,
      tolerance: 0.05,
      unit: 'm',
      why: '6 × 6 m = 36 m, plus 10% = 39.6 m.',
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'The supplier only sells 12 m lengths',
      prompt: 'What do you order?',
      points: 20,
      options: [
        {
          id: 'four',
          label: 'Four 12 m lengths (48 m): each cuts into two 6 m beams with no joints',
          verdict: 'best',
          why: 'Six 6 m beams need three 12 m lengths, plus one spare for the allowance.',
        },
        {
          id: 'three',
          label: 'Three 12 m lengths (36 m)',
          verdict: 'poor',
          why: 'No allowance at all.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Tomás Rivera',
      title: 'Reply to Tomás',
      prompt: 'Tell Tomás what to order and why.',
      points: 30,
      minWords: 25,
      mentions: [['39.6'], ['12 m', '12m']],
      model:
        'Hi Tomás, we need 39.6 m (36 m plus 10%). As the supplier sells 12 m lengths, please order four, which gives us the six beams with a spare. {name}',
    },
  ],
  outcomes: {
    pass: { indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Tomás', 'Ordered. Thanks for thinking about the lengths.'),
  lapseLog: 'The mezzanine steel order waited.',
  skills: { 'engineering-analysis': 25, accuracy: 15 },
  xp: 70,
}

/** Operations: requests against the team budget. */
const requests: CaseInput = {
  id: 'eng-requests',
  version: 1,
  careerId: 'engineering-services',
  kind: 'operations',
  minLevel: 2,
  title: 'Team requests to approve',
  summary: 'Tools, training and safety equipment against the team budget.',
  from: at('Helena Okoye', 'Engineering Manager', 'manager'),
  trigger: { afterAssignment: 'eng-drive-plan' },
  deadlineHours: 4,
  email: {
    subject: 'This week’s requests',
    body: `Hi {name},

While I am at the client, please decide this week’s requests against the team budget. Safety equipment, tools and training are fine; personal items are not; anything over your limit comes to me.

Helena`,
  },
  whyItMatters:
    'Spending within policy and authority keeps the budget honest, and safety spending is never the one to cut.',
  objectives: ['Apply the policy', 'Stay within your limit'],
  steps: [
    {
      id: 'approve',
      kind: 'approve',
      title: 'Decide the requests',
      prompt: 'Approve, reject or escalate each request.',
      points: 70,
      requests: [
        {
          id: 'padlocks',
          summary: 'Ten more lockout padlocks and tags',
          department: 'works',
          amount: 180,
          why: 'Safety equipment is in policy.',
        },
        {
          id: 'meter',
          summary: 'A thermal imaging camera for bearing checks',
          department: 'works',
          amount: 2800,
          why: 'In policy, but above an engineer’s limit: the manager decides.',
        },
        {
          id: 'boots',
          summary: 'Designer trainers for the site visit',
          department: 'works',
          amount: 140,
          policyBreach:
            'Personal items are not paid for; safety boots are issued by stores.',
        },
        {
          id: 'course',
          summary: 'An electrical safety refresher for the apprentice',
          department: 'works',
          amount: 220,
          why: 'Training is in policy.',
        },
      ],
    },
    {
      id: 'camera',
      kind: 'decide',
      title: 'While the camera waits',
      prompt:
        'The camera needs Helena’s approval and she is away until Friday. A bearing check is due tomorrow. What do you do?',
      points: 30,
      options: [
        {
          id: 'hire',
          label:
            'Borrow the site’s hire camera for tomorrow, and leave the purchase for Helena',
          verdict: 'best',
          why: 'The check happens, and the purchase stays with the person with the authority.',
        },
        {
          id: 'buy',
          label: 'Buy it yourself: it is safety equipment',
          verdict: 'poor',
          why: 'Good reasons don’t change your limit.',
        },
        {
          id: 'skip',
          label: 'Skip tomorrow’s check',
          verdict: 'poor',
          why: 'Missing a condition check risks another failure.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -3 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Helena', 'Thanks: I approved the camera this morning.'),
  lapseLog: 'The team’s requests waited another week.',
  skills: { accuracy: 20, 'safe-systems-of-work': 20 },
  xp: 85,
}

/** Workflow: handing over an isolated machine to the night shift. */
const handover: CaseInput = {
  id: 'eng-shift-handover',
  version: 1,
  careerId: 'engineering-services',
  kind: 'workflow',
  minLevel: 2,
  title: 'Handing over a locked-off machine',
  summary:
    'Hand a job over to the night shift so nobody restarts the machine by mistake.',
  from: at('Dmitri Volkov', 'Senior Maintenance Engineer', 'senior'),
  trigger: { afterAssignment: 'eng-drive-plan' },
  deadlineHours: 2,
  email: {
    subject: 'Night shift handover: Press 2',
    body: `Hi {name},

Press 2 is isolated and locked off for a hydraulic seal change that will run into the night shift. Fill in the shift handover so the night team know exactly where it stands.

Dmitri`,
  },
  whyItMatters:
    'Many serious accidents happen at shift changes, when someone does not know a machine is being worked on. A precise handover keeps the isolation in place.',
  objectives: ['Hand over the state of an isolation exactly'],
  evidence: [
    {
      id: 'job',
      title: 'Press 2: job status',
      text: 'Work order WO-327. Isolated at isolator I-14 and locked with Dmitri’s lock (tag D-07). The old seal is out; the new seal is not yet fitted. Hydraulic pressure released: gauge reads 0 bar.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      to: 'Night shift maintenance',
      title: 'The handover',
      prompt: 'Fill in the handover.',
      points: 70,
      fields: [
        {
          id: 'wo',
          label: 'Work order',
          kind: 'text',
          accept: ['WO-327'],
          why: 'The night team find the job by its number.',
        },
        {
          id: 'isolator',
          label: 'Isolated at',
          kind: 'text',
          accept: ['I-14', 'isolator I-14'],
          why: 'They must know which isolator must stay off.',
        },
        {
          id: 'status',
          label: 'Status',
          kind: 'choice',
          options: ['Ready to run', 'Isolated: seal not fitted', 'Faulty: do not repair'],
          answer: 'Isolated: seal not fitted',
          why: 'The seal is out: the press must not run.',
        },
        {
          id: 'pressure',
          label: 'Hydraulic pressure (bar)',
          kind: 'number',
          answer: 0,
          why: 'Stored energy released is part of a safe isolation.',
        },
      ],
    },
    {
      id: 'lock',
      kind: 'decide',
      title: 'Dmitri’s lock',
      prompt: 'Dmitri goes home at 6. His lock is still on the isolator. What happens?',
      points: 30,
      options: [
        {
          id: 'transfer',
          label:
            'The night engineer fits their own lock before Dmitri removes his, so the isolator is never unlocked',
          verdict: 'best',
          why: 'A personal lock transfer keeps the isolation continuous.',
        },
        {
          id: 'leave',
          label: 'Dmitri leaves his lock on and takes the key home',
          verdict: 'acceptable',
          why: 'Safe, but the night team cannot finish the job without him.',
        },
        {
          id: 'remove',
          label: 'Dmitri removes his lock; the night team will lock it later',
          verdict: 'poor',
          why: 'For a moment anyone could switch it on.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { senior: 3 }, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { indicators: { risk: 3 } },
  },
  replies: replies('Dmitri', 'Clear handover. The night team finished the seal safely.'),
  lapseLog: 'Press 2 was left without a shift handover.',
  skills: { 'safe-systems-of-work': 30, 'technical-writing': 15 },
  xp: 85,
}

const handoverFix: CaseInput = {
  id: 'eng-shift-handover-fix',
  version: 1,
  careerId: 'engineering-services',
  kind: 'workflow',
  minLevel: 2,
  title: 'The night shift calls about Press 2',
  summary:
    'The night team found something in the handover that did not match. Put it right now.',
  from: at('Night shift engineer', 'Maintenance Engineer'),
  trigger: {
    afterCase: 'eng-shift-handover',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 1,
  email: {
    subject: 'Press 2 handover: something’s wrong',
    body: `Hi,

Your handover for Press 2 didn’t match what we found on the floor. We have stopped and are not touching it. Can you confirm the correct details?

Night shift`,
  },
  whyItMatters:
    'When a handover is wrong, stopping and checking is exactly right. The fix must be fast and exact.',
  objectives: ['Correct a safety-critical handover quickly'],
  steps: [
    {
      id: 'response',
      kind: 'decide',
      title: 'What do you do?',
      prompt: 'Your response?',
      points: 50,
      options: [
        {
          id: 'fix',
          label: 'Thank them for stopping, and give the correct details now',
          verdict: 'best',
          why: 'Stopping was right; exact details let them continue safely.',
        },
        {
          id: 'carry-on',
          label: 'Tell them to carry on and use their judgement',
          verdict: 'poor',
          why: 'Guessing about an isolation is how accidents happen.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'the night shift',
      title: 'The correct handover',
      prompt: 'Send the correct details.',
      points: 50,
      minWords: 25,
      mentions: [['WO-327'], ['I-14'], ['seal']],
      model:
        'Thank you for stopping. Correct details: WO-327, Press 2 isolated at I-14, the old seal is out and the new one is not fitted, pressure 0 bar. Do not run it until the seal is fitted and tested. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { senior: 1 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { risk: 3 } },
  },
  replies: replies('Night shift', 'Thanks. All clear now.'),
  lapseLog: 'The night shift’s question about Press 2 went unanswered.',
  skills: { 'safe-systems-of-work': 20 },
  xp: 45,
}

export { clientChange, steelOrder, requests, handover, handoverFix }
