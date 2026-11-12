import type { AssignmentInput } from '../../schemas'
import {
  addFinding,
  restartService,
  runConsole,
  switchToAutomaticSettings,
} from '../../../tools/network/actions'
import { changeDevice, officeNetwork } from '../../../tools/network/data'
import type { NetworkState } from '../../../tools/network/schema'
import { IT_CATEGORIES, PRIORITY_GUIDE, STATUS_GUIDE, WRITING_GUIDE } from './knowledge'

/**
 * IT Help Desk integrated project (Service Desk Lead): the Thursday outage.
 * Three linked stages:
 *
 * 1. Help Desk: triage the flood of tickets and update the users.
 * 2. Network Tools: find the three causes with evidence and fix what can be
 *    fixed remotely.
 * 3. Help Desk, Word Craft and Deck Craft: close the incident, write the review and
 *    brief management.
 *
 * Teaches: leading an incident from the first ticket to the lessons learnt.
 */
const PROJECT = 'thursday-outage'

const feedback = (excellent: string) => ({
  excellent: `Hi {name},

${excellent}

Ravi`,
  good: `Hi {name},

Good work; a few things need tidying up. See the notes.

Ravi`,
  pass: `Hi {name},

Part of this isn’t right yet. The notes show what.

Ravi`,
  fail: `Hi {name},

Not yet. Have a look at the notes and try again.

Ravi`,
})

// ---------------------------------------------------------------------------
// Stage 1: the flood of tickets
// ---------------------------------------------------------------------------

const drives: Array<[string, string, string, string, string]> = [
  [
    'INC-3101',
    'Chloe Martin',
    'Sales',
    '09:02',
    'The S: drive has gone. I can’t open any of our proposals.',
  ],
  [
    'INC-3102',
    'Omar Haddad',
    'Finance',
    '09:04',
    'Shared drives not available. Month-end files are all on there.',
  ],
  [
    'INC-3103',
    'Hannah Fischer',
    'Marketing',
    '09:06',
    'Windows says the network path was not found for every shared folder.',
  ],
  [
    'INC-3104',
    'Ben Adeyemi',
    'Operations',
    '09:09',
    'Our whole team has lost the shared drives.',
  ],
]
const internet: Array<[string, string, string, string, string]> = [
  [
    'INC-3105',
    'Maya Patel',
    'Advisory',
    '09:11',
    'No websites load at all, and the client portal is down too.',
  ],
  [
    'INC-3106',
    'Sam Doyle',
    'Advisory',
    '09:13',
    'Internet is down on floor 2. Teams calls with clients keep dropping.',
  ],
]
const outage = [...drives, ...internet]
const ticket = (
  [id, from, department, received, body]: (typeof outage)[number],
  subject: string,
) => ({
  id,
  from,
  department,
  received,
  subject,
  body,
})

const queue = {
  title: 'Service desk: Thursday morning',
  categories: IT_CATEGORIES,
  knowledge: [PRIORITY_GUIDE, STATUS_GUIDE, WRITING_GUIDE],
  tickets: [
    ...drives.map((t) => ticket(t, 'Shared drives missing')),
    ...internet.map((t) => ticket(t, 'No internet')),
    {
      id: 'INC-3107',
      from: 'Ruth Adeyemi',
      department: 'Finance',
      received: '09:15',
      subject: 'New mouse please',
      body: 'My mouse’s scroll wheel has stopped working. Not urgent.',
    },
  ],
}

export const outageTriage: AssignmentInput = {
  id: 'outage-triage',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-lead',
  order: 14,
  projectId: PROJECT,
  stage: 1,
  kind: 'tickets',
  title: 'Thursday outage, stage 1: the flood of tickets',
  summary: 'Triage the outage tickets as one incident and tell users what is happening.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Project: the Thursday outage',
    body: `Hi {name},

It’s 09:15 and the phones haven’t stopped: **the shared drives are down for everyone**, and **floor 2 has no internet**. As Service Desk Lead, you’re running this incident from start to finish, in three stages:

1. **The queue** (now): triage the flood and update the users.
2. **The diagnosis**: find the causes in Network Tools and fix what you can.
3. **The review**: close the incident, write the review and brief management.

For now: the outage tickets are one incident affecting many people, so triage them accordingly (**P1**, **Network**, kept **Open**). The other ticket is unrelated: triage it normally. Then reply to **Chloe (INC-3101)**, who reported it first, with an update.

Ravi`,
  },
  whyItMatters:
    'In the first minutes of an outage, the service desk sets the tone: consistent triage shows the scale, and a clear update stops dozens of “is it just me?” calls while the engineers work.',
  objectives: [
    'Triage many tickets as one incident',
    'Tell unrelated problems apart',
    'Write a calm, useful update to users',
  ],
  steps: [
    {
      id: 'triage',
      title: 'Triage',
      instructions:
        'Set every shared-drive and internet ticket to **P1**, **Network**, **Open**. Triage the mouse ticket on its own merits.',
    },
    {
      id: 'update',
      title: 'Update the users',
      instructions:
        'Reply to **Chloe (INC-3101)**: we know, we are investigating, what to do meanwhile (save work locally, use phones), and when the next update is.',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Click **Submit to {manager}**.',
    },
  ],
  queue,
  ticketSolution: {
    ...Object.fromEntries(
      outage.map(([id]) => [
        id,
        { priority: 'P1' as const, category: 'Network', status: 'open' as const },
      ]),
    ),
    'INC-3107': { priority: 'P4', category: 'Hardware' },
  },
  ticketChecks: [
    {
      id: 'priorities',
      type: 'field',
      field: 'priority',
      title: 'Priorities',
      points: 30,
      why: 'Everyone losing the shared drives is the highest priority; a scroll wheel can wait.',
      hint: 'All the outage tickets are P1; the mouse is P4.',
    },
    {
      id: 'categories',
      type: 'field',
      field: 'category',
      title: 'Categories',
      points: 20,
      why: 'Grouping the tickets shows the size of the incident.',
      hint: 'The outage tickets are Network; the mouse is Hardware.',
    },
    {
      id: 'open',
      type: 'field',
      field: 'status',
      tickets: outage.map(([id]) => id),
      title: 'Outage tickets kept open',
      points: 15,
      why: 'They stay open until users confirm things work again.',
      hint: 'Set the six outage tickets to Open.',
    },
    {
      id: 'update',
      type: 'reply',
      ticket: 'INC-3101',
      mentions: [
        ['Hi Chloe', 'Hello Chloe', 'Dear Chloe'],
        ['investigating', 'working on', 'aware'],
        ['update'],
        ['locally', 'phone', 'meanwhile', 'in the meantime'],
      ],
      minWords: 40,
      title: 'Update to users',
      points: 35,
      why: 'A good update buys the engineers time and keeps users productive.',
      hint: 'Say we know, we are working on it, what to do meanwhile, and when the next update is.',
    },
  ],
  passScore: 70,
  xp: 150,
  skills: { 'incident-management': 35, 'customer-service': 30, troubleshooting: 10 },
  feedback: feedback(
    'The queue is under control and users know what’s happening. Now let’s find out why. Stage 2 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 2: the diagnosis in Network Tools
// ---------------------------------------------------------------------------

const networkStart = [
  // The file sharing service stopped after last night's updates.
  changeDevice('FILE-01', (d) => ({
    ...d,
    services: d.services.map((s) => (s.port === 445 ? { ...s, running: false } : s)),
  })),
  // The internet provider's line is down: only they can fix it.
  changeDevice('ISP-LINK', (d) => ({ ...d, up: false, restartable: false })),
  // Reception's PC was set up by hand with the wrong gateway yesterday.
  changeDevice('PC-RECEPTION', (d) => ({
    ...d,
    config: { gateway: '10.20.1.254', dns: '10.20.0.10', static: true },
  })),
].reduce((s, c) => c(s), officeNetwork())

function networkSolution(): NetworkState {
  let s = networkStart
  for (const [from, command] of [
    ['IT-PC-07', 'ping file-01'],
    ['IT-PC-07', 'portcheck file-01 445'],
    ['IT-PC-07', 'tracert 8.8.8.8'],
    ['PC-RECEPTION', 'ipconfig'],
  ] as const) {
    s = runConsole(s, from, command)
  }
  s = addFinding(s, {
    device: 'FILE-01',
    fault: 'service-stopped',
    note: 'FILE-01 answers ping but not port 445: the file sharing service stopped.',
  }).state
  s = addFinding(s, {
    device: 'ISP-LINK',
    fault: 'internet-down',
    note: 'tracert stops at the firewall: the provider’s line is down. Reported to the provider.',
  }).state
  s = addFinding(s, {
    device: 'PC-RECEPTION',
    fault: 'wrong-gateway',
    note: 'ipconfig shows gateway 10.20.1.254 set by hand; floor 1’s is 10.20.1.1.',
  }).state
  s = restartService(s, 'FILE-01', 445).state
  s = switchToAutomaticSettings(s, 'PC-RECEPTION').state
  return s
}

export const outageDiagnosis: AssignmentInput = {
  id: 'outage-diagnosis',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-lead',
  order: 15,
  projectId: PROJECT,
  stage: 2,
  kind: 'tool',
  title: 'Thursday outage, stage 2: find the causes',
  summary:
    'Separate the causes with evidence, fix what you can and pass on what you can’t.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Thursday outage, stage 2: the diagnosis',
    body: `Hi {name},

Thanks for getting the queue under control. Now the causes. In **Network Tools**:

• **Shared drives**: the file server is **FILE-01** (file sharing is port **445**).
• **Internet**: nothing loads from any floor.
• Reception has just called too: their PC (**PC-RECEPTION**) can’t reach anything at all, not even the shared drives once they’re back.

Find each cause with evidence, record a finding for each, fix what can be fixed remotely, and make sure the rest goes to the right people.

Ravi`,
  },
  whyItMatters:
    'Outages often have more than one cause, and the same symptom (“nothing works”) can come from the server, the network or one computer. Leads separate them with tests and know which ones only a supplier can fix.',
  objectives: [
    'Separate several causes of one outage with evidence',
    'Fix stopped services and wrong settings remotely',
    'Recognise problems that belong to a supplier',
  ],
  steps: [
    {
      id: 'drives',
      title: 'The shared drives',
      instructions:
        '`ping file-01`, then `portcheck file-01 445`. A server that answers ping but not the port has a stopped service.',
    },
    {
      id: 'internet',
      title: 'The internet',
      instructions:
        '`tracert 8.8.8.8`: where does the route stop? The line beyond the firewall belongs to the provider.',
    },
    {
      id: 'reception',
      title: 'Reception',
      instructions:
        'Run `ipconfig` from **PC-RECEPTION** and compare its gateway with floor 1’s on the map.',
    },
    {
      id: 'fix',
      title: 'Findings and fixes',
      instructions:
        'Add a finding for each cause. Restart file sharing on FILE-01 and switch PC-RECEPTION to automatic settings; the internet line is for the provider. Then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'network',
    title: 'Network Tools: the Thursday outage',
    start: networkStart,
    solution: networkSolution(),
    checks: [
      {
        id: 'finding-drives',
        type: 'finding',
        device: 'FILE-01',
        fault: 'service-stopped',
        title: 'Shared drives diagnosed',
        points: 15,
        why: 'The server was up: the service had stopped.',
        hint: 'ping file-01 works; portcheck file-01 445 doesn’t.',
      },
      {
        id: 'finding-internet',
        type: 'finding',
        device: 'ISP-LINK',
        fault: 'internet-down',
        title: 'Internet outage diagnosed',
        points: 15,
        why: 'Knowing it is the provider’s line sends the call to the right people at once.',
        hint: 'tracert 8.8.8.8 stops at the firewall.',
      },
      {
        id: 'finding-reception',
        type: 'finding',
        device: 'PC-RECEPTION',
        fault: 'wrong-gateway',
        title: 'Reception diagnosed',
        points: 15,
        why: 'One PC with wrong settings looks like part of the outage, but isn’t.',
        hint: 'ipconfig from PC-RECEPTION shows the gateway.',
      },
      {
        id: 'drives-work',
        type: 'service',
        from: 'IT-PC-07',
        host: 'file-01',
        port: 445,
        title: 'Shared drives back',
        points: 20,
        why: 'The fix is done when the service answers again.',
        hint: 'Restart file sharing on FILE-01 from the Network map.',
      },
      {
        id: 'reception-works',
        type: 'service',
        from: 'PC-RECEPTION',
        host: 'file-01',
        port: 445,
        title: 'Reception can reach the drives',
        points: 15,
        why: 'Test from the user’s computer: that is where the problem was.',
        hint: 'Switch PC-RECEPTION to automatic settings.',
      },
      {
        id: 'evidence',
        type: 'evidence',
        items: [
          {
            description: 'checked the file sharing port',
            from: '',
            pattern: 'portcheck\\s+(file-01|10\\.20\\.0\\.15)\\s+445',
          },
          {
            description: 'traced the route to the internet',
            from: '',
            pattern: '^tracert',
          },
          {
            description: 'ran ipconfig on the reception PC',
            from: 'PC-RECEPTION',
            pattern: '^ipconfig',
          },
        ],
        title: 'The evidence',
        points: 20,
        why: 'The review will rely on what you tested.',
        hint: 'portcheck file-01 445, tracert 8.8.8.8, and ipconfig from PC-RECEPTION.',
      },
    ],
  },
  passScore: 70,
  xp: 160,
  skills: { troubleshooting: 50, 'incident-management': 20 },
  feedback: feedback(
    'Three causes, three findings with evidence: the drives are back, reception is fixed and the provider has the internet fault. Stage 3 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 3: close the incident, the review and the briefing
// ---------------------------------------------------------------------------

const timeline = `Engineers’ timeline: the Thursday outage
08:55 Overnight updates restart FILE-01; the file sharing service does not start again.
09:02 First report (INC-3101): shared drives missing.
09:05 The provider’s line fails (unrelated, a cable cut by roadworks).
09:30 File sharing restarted on FILE-01; drives back for everyone.
09:35 Reception PC fixed (gateway set by hand the day before).
11:20 Provider repairs the line; internet back.
Impact: about 120 staff without shared drives for 28 minutes; no internet for 2 hours 15 minutes.
Actions: alert when a service fails to start after updates; a backup internet line; no hand-typed network settings.`

export const outageReview: AssignmentInput = {
  id: 'outage-review',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-lead',
  order: 16,
  projectId: PROJECT,
  stage: 3,
  kind: 'tickets',
  title: 'Thursday outage, stage 3: the review',
  summary: 'Resolve the tickets, write the incident review and brief management.',
  estimatedMinutes: 50,
  from: 'manager',
  briefing: {
    subject: 'Thursday outage, stage 3: closing it',
    body: `Hi {name},

Everything is working again. Last stage:

1. **The queue**: resolve the six outage tickets (users have confirmed).
2. **The review (Word Craft)**: an incident review with a summary, the timeline, the impact, the causes and the actions to stop it happening again. The engineers’ timeline is in the knowledge base.
3. **The briefing (Deck Craft)**: 3 to 6 slides for {director}.

Reply to this email with the queue, the review and the briefing attached.

Ravi`,
  },
  whyItMatters:
    'The review is how an outage becomes an improvement. Written honestly (several causes, what went well and what didn’t), it is what stops the same morning happening again.',
  objectives: [
    'Close an incident properly',
    'Write a structured incident review',
    'Brief management on impact, causes and actions',
  ],
  steps: [
    {
      id: 'resolve',
      title: 'Resolve the tickets',
      instructions: 'Set the six outage tickets to **Resolved**.',
    },
    {
      id: 'review',
      title: 'The review',
      instructions:
        'In **Word Craft**, open **Incident review: Thursday outage**: summary, timeline, impact, causes (all three), and actions.',
    },
    {
      id: 'briefing',
      title: 'The briefing',
      instructions:
        'In **Deck Craft**, open **Thursday outage briefing**: 3 to 6 slides with the impact and the actions.',
    },
    {
      id: 'send',
      title: 'Hand in',
      instructions:
        'Reply to {manager}’s email with the queue, the review and the briefing attached.',
    },
  ],
  queue: {
    ...queue,
    knowledge: [
      ...queue.knowledge,
      { title: 'Engineers’ timeline: the Thursday outage', body: timeline },
    ],
  },
  ticketSolution: Object.fromEntries(
    outage.map(([id]) => [id, { status: 'resolved' as const }]),
  ),
  ticketChecks: [
    {
      id: 'resolved',
      type: 'field',
      field: 'status',
      tickets: outage.map(([id]) => id),
      title: 'Outage tickets resolved',
      points: 15,
      why: 'Open tickets after a fix make the desk look busier than it is and hide real problems.',
      hint: 'Set the six outage tickets to Resolved.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Incident review: Thursday outage',
      template: 'report',
      checks: [
        {
          id: 'review-sections',
          type: 'sections',
          title: 'Review structure',
          sections: [
            ['Summary', 'Executive summary'],
            ['Timeline'],
            ['Impact'],
            ['Cause', 'Causes', 'Root cause'],
            ['Actions', 'Recommendations'],
          ],
          points: 20,
          why: 'A standard structure makes reviews comparable over time.',
          hint: 'Headings: Summary, Timeline, Impact, Causes, Actions.',
        },
        {
          id: 'review-causes',
          type: 'mentions',
          title: 'All three causes',
          terms: [
            ['FILE-01', 'file server', 'file sharing'],
            ['provider', 'internet line'],
            ['reception', 'gateway'],
          ],
          points: 20,
          why: 'An outage with three causes needs three sets of actions.',
          hint: 'Name the file sharing service, the provider’s line and the reception PC.',
        },
        {
          id: 'review-length',
          type: 'length',
          min: 200,
          max: 900,
          title: 'Length',
          points: 10,
          why: 'Complete, but readable.',
          hint: 'Aim for 200 to 900 words.',
        },
      ],
    },
    {
      kind: 'slides',
      title: 'Thursday outage briefing',
      template: 'business-review',
      checks: [
        {
          id: 'slides-length',
          type: 'length',
          min: 3,
          max: 6,
          title: 'Number of slides',
          points: 15,
          why: 'Management want the essentials in a few minutes.',
          hint: 'Keep 3 to 6 slides.',
        },
        {
          id: 'slides-actions',
          type: 'mentions',
          title: 'Impact and actions',
          terms: [
            ['impact', 'affected'],
            ['action', 'next step', 'prevent'],
          ],
          points: 20,
          why: 'Management need to know what happened to people and what will change.',
          hint: 'Have a slide on the impact and one on the actions.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: { 'incident-management': 35, 'technical-writing': 35, troubleshooting: 10 },
  feedback: feedback(
    'A complete incident, from the first ticket to the lessons learnt: three causes found, fixed or passed on, and a review that will stop it happening again. Well led.',
  ),
}
