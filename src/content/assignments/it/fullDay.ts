import type { AssignmentInput } from '../../schemas'
import { companyDevices } from '../../../tools/devices/data'
import {
  connect,
  diskCleanup,
  disconnect,
  endProcess,
  installApp,
  repairApp,
  restartService,
} from '../../../tools/devices/model'
import type { Device, DevicesState } from '../../../tools/devices/schema'
import { IT_CATEGORIES, PRIORITY_GUIDE, WRITING_GUIDE } from './knowledge'

/**
 * IT Help Desk (Service Desk Lead): a whole office day on the desk. Two
 * tickets are waiting in the morning and three more come in during the day,
 * each with an SLA for its priority, measured on the office clock. Teaches:
 * working by priority and deadline rather than in arrival order, keeping an
 * eye on the SLA, and leaving nothing open at the end of the day.
 */
function start(): DevicesState {
  const base = companyDevices()
  let devices = base.devices
  const set = (name: string, fn: (d: Device) => Device) => {
    devices = devices.map((d) => (d.name === name ? fn(d) : d))
  }
  set('LT-0171', (d) => ({
    ...d,
    processes: [
      ...d.processes,
      {
        name: 'ReportBuilder',
        cpu: 88,
        memoryMb: 1900,
        system: false,
        description: 'Stuck report export',
      },
    ],
  }))
  set('LT-0161', (d) => ({
    ...d,
    apps: d.apps.map((a) =>
      a.name === 'LedgerPro' ? { ...a, state: 'crashing', fault: 'corrupt' } : a,
    ),
    events: [
      ...d.events,
      {
        time: '10:28',
        level: 'error',
        source: 'Application',
        message: 'LedgerPro.exe stopped working: ledgercore.dll is damaged.',
      },
    ],
  }))
  set('DT-0180', (d) => ({
    ...d,
    services: d.services.map((s) =>
      s.name === 'Print Spooler' ? { ...s, running: false } : s,
    ),
    printQueue: [{ document: 'Board papers.pdf', stuck: true }],
  }))
  set('LT-0170', (d) => ({ ...d, storage: { totalGb: 256, usedGb: 240, tempGb: 26 } }))
  return { ...base, devices }
}

const devices = start()

function solution(): DevicesState {
  let s = devices
  const steps: Array<(x: DevicesState) => { state: DevicesState; problems: string[] }> = [
    (x) => connect(x, 'LT-0171'),
    (x) => endProcess(x, 'LT-0171', 'ReportBuilder'),
    (x) => connect(x, 'LT-0163'),
    (x) => installApp(x, 'LT-0163', 'DataViz Studio'),
    (x) => connect(x, 'LT-0161'),
    (x) => repairApp(x, 'LT-0161', 'LedgerPro'),
    (x) => connect(x, 'DT-0180'),
    (x) => restartService(x, 'DT-0180', 'Print Spooler'),
    (x) => connect(x, 'LT-0170'),
    (x) => diskCleanup(x, 'LT-0170'),
    (x) => disconnect(x),
  ]
  for (const step of steps) {
    const r = step(s)
    if (r.problems.length) throw new Error(r.problems.join(' '))
    s = r.state
  }
  return s
}

export const fullDay: AssignmentInput = {
  id: 'full-day',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-lead',
  order: 18,
  kind: 'tickets',
  title: 'A full day on the desk',
  summary:
    'Tickets keep coming in all day, each with an SLA for its priority. Work by priority and deadline, and leave nothing overdue.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'You have the desk today',
    body: `Hi {name},

You’re running the desk on your own today. Two tickets are waiting, and more will come in during the day: new ones appear in the queue when they arrive.

Every ticket has a **service level (SLA)** for its priority: how soon someone must start on it, and how soon it must be fixed, on the office clock. Set the priority as each one arrives, keep an eye on the time left, and work by priority and deadline, not in the order things arrive. The Overview and **Reports** show how the day is going.

Ravi`,
  },
  whyItMatters:
    'A real service desk never has one ticket at a time. Agreeing response and resolution times, and meeting them, is how IT earns the trust of the business, and a P2 that arrives at lunchtime can matter more than a P4 that has waited all morning.',
  objectives: [
    'Set each ticket’s priority as it arrives',
    'Work by priority and SLA, not arrival order',
    'Resolve every ticket within its target',
    'Use the reports to see how the day went',
  ],
  steps: [
    {
      id: 'morning',
      title: 'The morning’s tickets',
      instructions:
        'Assign and prioritise the two waiting tickets. The SLA shows on each one: start on them before the response time runs out.',
    },
    {
      id: 'arrivals',
      title: 'New arrivals',
      instructions:
        'Three more tickets arrive during the day. Prioritise each as it comes in; a P2 jumps ahead of the P3 and P4 work.',
      hint: 'Payroll and the board papers cannot wait; a full disk and a software request can, a little.',
    },
    {
      id: 'fix',
      title: 'Fix them remotely',
      instructions:
        'Each problem is on the person’s computer: use Device Management and Remote Desktop. Disconnect when you are done.',
    },
    {
      id: 'review',
      title: 'Look at the report, then hand it in',
      instructions:
        'Open **Reports** to see your day: resolved, overdue, first-contact resolution. Then click **Submit to {manager}**.',
    },
  ],
  queue: {
    title: 'Service desk: the whole day',
    categories: IT_CATEGORIES,
    knowledge: [PRIORITY_GUIDE, WRITING_GUIDE],
    tickets: [
      {
        id: 'INC-3801',
        from: 'Owen Price',
        department: 'Finance',
        received: '08:30',
        subject: 'Laptop crawling since a report export',
        body: 'I started a big report export yesterday and my laptop (LT-0171) has been slow ever since. I can still work, just slowly.',
        requester: 'backR',
        conditions: [{ type: 'device-performance', device: 'LT-0171', maxCpu: 50 }],
        impact: { service: 'Laptop', people: 1 },
      },
      {
        id: 'INC-3802',
        from: 'Leila Haddad',
        department: 'Accounting',
        received: '08:40',
        subject: 'Please install DataViz Studio',
        body: 'Could I have DataViz Studio on my laptop (LT-0163)? It’s in the company catalogue. Whenever you can.',
        requester: 'backM',
        conditions: [{ type: 'app-working', device: 'LT-0163', app: 'DataViz Studio' }],
        impact: { service: 'Software request', people: 1 },
      },
      {
        id: 'INC-3803',
        from: 'Carmen Ruiz',
        department: 'Finance',
        received: '10:30',
        arrivesLater: true,
        subject: 'LedgerPro crashes: payroll checks today',
        body: 'LedgerPro closes as soon as I open the payroll ledger, and the payroll checks are due this afternoon. Laptop LT-0161.',
        requester: 'front2',
        conditions: [{ type: 'app-working', device: 'LT-0161', app: 'LedgerPro' }],
        impact: { service: 'Payroll checks', people: 3, deadline: 'This afternoon' },
      },
      {
        id: 'INC-3804',
        from: 'Dana Kowalski',
        department: 'Operations',
        received: '11:45',
        arrivesLater: true,
        subject: 'Board papers won’t print',
        body: 'The board papers are stuck in the print queue on my PC (DT-0180) and the board meets at 14:00.',
        requester: 'coordinator',
        conditions: [
          { type: 'device-service', device: 'DT-0180', service: 'Print Spooler' },
          { type: 'print-queue-clear', device: 'DT-0180' },
        ],
        impact: { service: 'Printing', people: 8, deadline: 'Board meeting at 14:00' },
      },
      {
        id: 'INC-3805',
        from: 'Grace Mensah',
        department: 'Accounting',
        received: '14:00',
        arrivesLater: true,
        subject: 'Disk almost full',
        body: 'My laptop (LT-0170) keeps warning that the disk is almost full. Everything still works for now.',
        requester: 'backL',
        conditions: [{ type: 'disk-free', device: 'LT-0170', minGb: 30 }],
        impact: { service: 'Laptop', people: 1 },
      },
    ],
    environment: {
      devices: {
        start: devices,
        solution: solution(),
        checks: [
          {
            id: 'disconnected',
            type: 'disconnected',
            title: 'Disconnected when done',
            points: 10,
            why: 'A remote session left open is a risk.',
            hint: 'Disconnect in Remote Desktop.',
          },
        ],
      },
    },
  },
  ticketSolution: {
    'INC-3801': { priority: 'P3', status: 'resolved' },
    'INC-3802': { priority: 'P4', status: 'resolved' },
    'INC-3803': { priority: 'P2', status: 'resolved' },
    'INC-3804': { priority: 'P2', status: 'resolved' },
    'INC-3805': { priority: 'P3', status: 'resolved' },
  },
  ticketChecks: [
    {
      id: 'priorities',
      type: 'field',
      field: 'priority',
      title: 'Each ticket prioritised as it arrived',
      points: 20,
      why: 'Payroll and the board papers are P2: a team’s key work with a deadline. A slow laptop or a full disk is P3; a software request is P4.',
      hint: 'Use each ticket’s business impact and the priority matrix.',
    },
    ...(
      [
        ['owen-fixed', 'INC-3801'],
        ['leila-fixed', 'INC-3802'],
        ['carmen-fixed', 'INC-3803'],
        ['dana-fixed', 'INC-3804'],
        ['grace-fixed', 'INC-3805'],
      ] as const
    ).map(([id, ticket]) => ({
      id,
      type: 'fixed' as const,
      ticket,
      points: 10,
      title: `${ticket} fixed`,
      why: 'The device itself works again.',
      hint: 'Use Remote Desktop on the computer the ticket names.',
    })),
    {
      id: 'sla',
      type: 'sla',
      tickets: ['INC-3801', 'INC-3802', 'INC-3803', 'INC-3804', 'INC-3805'],
      title: 'Every ticket resolved within its SLA',
      points: 20,
      why: 'Meeting the agreed resolution times is what the business counts on.',
      hint: 'Work by priority and the time left on each ticket.',
    },
  ],
  passScore: 70,
  xp: 200,
  skills: { 'incident-management': 45, troubleshooting: 35, 'customer-service': 15 },
  feedback: {
    excellent: `Hi {name},

A clean day: everything prioritised as it came in, payroll and the board papers first, and nothing overdue. That is what running the desk looks like.

Ravi`,
    good: `Hi {name},

A good day on the desk; a little to tighten. See the notes.

Ravi`,
    pass: `Hi {name},

The work got done, but some things went past their SLA. Work by priority and the time left.

Ravi`,
    fail: `Hi {name},

Let’s go through the day. Start with the priorities: which tickets could not wait?

Ravi`,
  },
}
