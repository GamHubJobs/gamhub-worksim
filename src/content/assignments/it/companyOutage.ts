import type { AssignmentInput } from '../../schemas'
import {
  addFinding,
  restartDevice,
  restartService,
  runConsole,
  setDnsRecord,
} from '../../../tools/network/actions'
import { companyOutageScenario } from '../../../tools/network/data'
import type { NetworkState } from '../../../tools/network/schema'
import { IT_CATEGORIES, PRIORITY_GUIDE, WRITING_GUIDE } from './knowledge'

/**
 * IT Help Desk (Service Desk Lead): a Monday morning when IT problems reach
 * across the company. Finance, Accounting and the data team lose the shared
 * drive; Engineering loses its development server before a release;
 * Marketing cannot publish a campaign; and two everyday requests arrive in
 * the middle of it. Teaches: business impact and priority (not every ticket
 * is urgent), finding which tickets share a cause, fixing the biggest impact
 * first, and telling people what happened. The departments are the company's
 * own (the same people as the other careers).
 */
const network = companyOutageScenario()

function solution(): NetworkState {
  let s = network
  const run = (r: { state: NetworkState; problems: string[] }) => {
    if (r.problems.length) throw new Error(r.problems.join(' '))
    s = r.state
  }
  s = runConsole(s, 'LT-0161', 'portcheck file-01 445')
  run(
    addFinding(s, {
      device: 'FILE-01',
      fault: 'service-stopped',
      note: 'File sharing (SMB, port 445) had stopped on FILE-01: portcheck from LT-0161 failed while the server answered ping.',
    }),
  )
  run(restartService(s, 'FILE-01', 445))
  s = runConsole(s, 'LT-0161', 'portcheck file-01 445')
  run(
    addFinding(s, {
      device: 'DEV-01',
      fault: 'device-crashed',
      note: 'DEV-01 did not answer ping; it had crashed and came back after a remote restart.',
    }),
  )
  run(restartDevice(s, 'DEV-01'))
  run(
    addFinding(s, {
      device: 'DC-01',
      fault: 'wrong-dns-record',
      note: 'The intranet record still pointed at the old server INTRA-01 (10.20.0.25) instead of INTRA-02 (10.20.0.21).',
    }),
  )
  run(setDnsRecord(s, 'intranet', '10.20.0.21'))
  return s
}

export const companyOutage: AssignmentInput = {
  id: 'company-outage',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-lead',
  order: 19,
  kind: 'tickets',
  title: 'One morning, five departments',
  summary:
    'Problems across the company at once: prioritise by business impact, find the causes, fix the biggest first, and keep people informed.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Monday morning: it’s everywhere',
    body: `Hi {name},

It’s one of those mornings. Finance, Accounting and the data team can’t get to the shared drive, Engineering has lost its development server before a release, Marketing can’t publish a campaign, and the everyday requests keep coming.

You’re leading the desk today. Set every ticket’s **priority by business impact**: who is affected, how many, and what is at risk (each ticket shows it). Then find the causes: several tickets may share one. Fix the biggest impact first, and tell Carmen and Sofia what happened.

The Overview shows the business impact of what is still broken.

Ravi`,
  },
  whyItMatters:
    'When everything is on fire, the service desk decides what the company gets back first. Priority by business impact (people, key services, deadlines), not by who shouts loudest or what arrived first, is what keeps payroll, releases and campaigns on time.',
  objectives: [
    'Set priorities from impact and urgency across departments',
    'Spot that several departments’ tickets share one cause',
    'Fix the causes in the order of business impact',
    'Explain the outage in plain words to the people affected',
  ],
  steps: [
    {
      id: 'triage',
      title: 'Triage everything first',
      instructions:
        'Read every ticket and its **business impact**. Set each one’s priority with the matrix: a key service down for several departments is not the same as a new keyboard.',
    },
    {
      id: 'causes',
      title: 'Find the causes',
      instructions:
        'In **Network Tools**, test from the users’ laptops. Which tickets share a cause? Record a **finding** for each cause on the device where it lives.',
      hint: 'portcheck file-01 445 from a Finance laptop; ping dev-01; nslookup intranet.',
    },
    {
      id: 'fix',
      title: 'Fix, biggest impact first',
      instructions:
        'Fix each cause at its source. Watch the Overview’s business impact shrink and the tickets resolve.',
    },
    {
      id: 'tell',
      title: 'Tell people',
      instructions:
        'Reply to Carmen (the shared drive) and Sofia (the campaign): what happened, and that it is working.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  queue: {
    title: 'Service desk: Monday morning',
    categories: IT_CATEGORIES,
    knowledge: [PRIORITY_GUIDE, WRITING_GUIDE],
    tickets: [
      {
        id: 'INC-3601',
        from: 'Carmen Ruiz',
        department: 'Finance',
        received: '08:46',
        subject: 'Shared drive gone: payroll files',
        body: 'The finance shared drive says it is not available. The payroll files are on it and the run is at noon.',
        requester: 'front2',
        conditions: [{ type: 'can-reach', from: 'LT-0161', host: 'file-01', port: 445 }],
        impact: {
          service: 'Shared drive (Finance)',
          people: 14,
          deadline: 'Payroll run at 12:00',
        },
      },
      {
        id: 'INC-3602',
        from: 'Grace Mensah',
        department: 'Accounting',
        received: '08:49',
        subject: 'Can’t open month-end folder',
        body: 'None of us in Accounting can open the month-end folder on the shared drive.',
        requester: 'backL',
        conditions: [{ type: 'can-reach', from: 'LT-0170', host: 'file-01', port: 445 }],
        impact: {
          service: 'Shared drive (Accounting)',
          people: 6,
          deadline: 'Month-end close at 17:00',
        },
      },
      {
        id: 'INC-3603',
        from: 'Arjun Mehta',
        department: 'Data & Insights',
        received: '08:52',
        subject: 'Datasets folder unavailable',
        body: 'The datasets on the shared drive won’t load for the board dashboard I’m building.',
        requester: 'analyst',
        conditions: [{ type: 'can-reach', from: 'LT-0162', host: 'file-01', port: 445 }],
        impact: {
          service: 'Shared drive (datasets)',
          people: 4,
          deadline: 'Board dashboard at 15:00',
        },
      },
      {
        id: 'INC-3604',
        from: 'Rosa Ferreira',
        department: 'Engineering',
        received: '08:55',
        subject: 'Development server down',
        body: 'Nobody in Engineering can reach dev-01: no builds, no tests. We release this afternoon.',
        conditions: [
          { type: 'device-up', device: 'DEV-01' },
          { type: 'can-reach', from: 'LT-0180', host: 'dev-01', port: 443 },
        ],
        impact: {
          service: 'Development server',
          people: 9,
          deadline: 'Release this afternoon',
        },
      },
      {
        id: 'INC-3605',
        from: 'Sofia Alvarez',
        department: 'Marketing',
        received: '09:01',
        subject: 'Can’t publish the spring campaign',
        body: 'The publishing tool on the intranet won’t load, and the spring campaign is meant to go live at 11:00.',
        conditions: [{ type: 'can-reach', from: 'LT-0175', host: 'intranet', port: 443 }],
        impact: {
          service: 'Intranet publishing',
          people: 5,
          deadline: 'Campaign live at 11:00',
        },
      },
      {
        id: 'INC-3606',
        from: 'Ben Carter',
        department: 'Operations',
        received: '09:03',
        subject: 'New keyboard please',
        body: 'Could I have a new keyboard? A couple of keys stick. No rush.',
        impact: { service: 'Equipment request', people: 1 },
      },
      {
        id: 'INC-3607',
        from: 'Leila Haddad',
        department: 'Accounting',
        received: '09:05',
        subject: 'Second monitor flickers',
        body: 'My second monitor flickers now and then. I can work on the laptop screen meanwhile.',
        impact: { service: 'Monitor', people: 1 },
      },
    ],
    environment: {
      network: {
        start: network,
        solution: solution(),
        checks: [
          {
            id: 'finding-file',
            type: 'finding',
            device: 'FILE-01',
            fault: 'service-stopped',
            title: 'The shared drive’s cause recorded',
            points: 5,
            why: 'Three departments, one cause: file sharing on FILE-01.',
            hint: 'The server answers ping, but portcheck file-01 445 fails.',
          },
          {
            id: 'finding-dev',
            type: 'finding',
            device: 'DEV-01',
            fault: 'device-crashed',
            title: 'The development server’s cause recorded',
            points: 5,
            why: 'DEV-01 had crashed: a remote restart brings it back.',
            hint: 'ping dev-01 from your PC.',
          },
          {
            id: 'finding-dns',
            type: 'finding',
            device: 'DC-01',
            fault: 'wrong-dns-record',
            title: 'The intranet name’s cause recorded',
            points: 5,
            why: 'The name still pointed at the old server.',
            hint: 'nslookup intranet, and compare with INTRA-02’s address.',
          },
          {
            id: 'evidence',
            type: 'evidence',
            items: [
              {
                description:
                  'tested the shared drive from a Finance laptop after the fix',
                from: 'LT-0161',
                pattern: '^portcheck\\s+file-01\\s+445',
                output: 'TcpTestSucceeded: True',
              },
            ],
            title: 'The fix verified where the users are',
            points: 5,
            why: 'Fixed means it works for them.',
            hint: 'portcheck file-01 445 from LT-0161 once file sharing is back.',
          },
        ],
      },
    },
  },
  ticketSolution: {
    'INC-3601': { priority: 'P1', status: 'resolved' },
    'INC-3602': { priority: 'P1', status: 'resolved' },
    'INC-3603': { priority: 'P1', status: 'resolved' },
    'INC-3604': { priority: 'P2', status: 'resolved' },
    'INC-3605': { priority: 'P2', status: 'resolved' },
    'INC-3606': { priority: 'P4' },
    'INC-3607': { priority: 'P3' },
  },
  ticketChecks: [
    {
      id: 'priorities',
      type: 'field',
      field: 'priority',
      title: 'Priorities set by business impact',
      points: 20,
      why: 'The shared drive is a key service down for three departments (P1); a team without its server or campaign is P2; one person with a workaround is P3; a request is P4.',
      hint: 'Use each ticket’s business impact and the priority matrix.',
    },
    ...(
      [
        ['finance-fixed', 'INC-3601', 10, 'Finance has its shared drive'],
        ['accounts-fixed', 'INC-3602', 5, 'Accounting has its shared drive'],
        ['data-fixed', 'INC-3603', 5, 'The data team has its datasets'],
        ['engineering-fixed', 'INC-3604', 10, 'Engineering can build again'],
        ['marketing-fixed', 'INC-3605', 10, 'Marketing can publish'],
      ] as const
    ).map(([id, ticket, points, title]) => ({
      id,
      type: 'fixed' as const,
      ticket,
      points,
      title,
      why: 'It works for them: the ticket resolved when the cause was fixed.',
      hint: 'Fix the cause at its source, in Network Tools.',
    })),
    {
      id: 'carmen-reply',
      type: 'reply',
      ticket: 'INC-3601',
      mentions: [
        ['shared drive', 'file'],
        ['restarted', 'back', 'working'],
      ],
      minWords: 20,
      title: 'Carmen knows the drive is back',
      points: 10,
      why: 'Payroll needs to know they can run.',
      hint: 'What stopped, that it is back, and that the payroll files are there.',
    },
    {
      id: 'sofia-reply',
      type: 'reply',
      ticket: 'INC-3605',
      mentions: [['intranet', 'address', 'name', 'dns']],
      minWords: 20,
      title: 'Sofia knows why and that she can publish',
      points: 10,
      why: 'Plain words: the intranet’s address had not been updated after a move.',
      hint: 'Explain the old address, without jargon.',
    },
  ],
  passScore: 70,
  xp: 220,
  skills: { 'incident-management': 55, troubleshooting: 35, 'customer-service': 15 },
  feedback: {
    excellent: `Hi {name},

That is how a lead runs a bad morning. The shared drive first, because three departments and payroll depended on it; Engineering and Marketing next; the keyboard can wait. Every department back before its deadline.

Ravi`,
    good: `Hi {name},

Good work under pressure; a couple of things to tighten. See the notes.

Ravi`,
    pass: `Hi {name},

Things got fixed, but look again at the priorities: business impact decides what comes first.

Ravi`,
    fail: `Hi {name},

Let’s go through it. Start with the business impact on each ticket, then look for what the shared-drive tickets have in common.

Ravi`,
  },
}
