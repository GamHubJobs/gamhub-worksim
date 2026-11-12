import type { AssignmentInput } from '../../schemas'
import { companyDevices } from '../../../tools/devices/data'
import {
  connect,
  diskCleanup,
  disconnect,
  endProcess,
  installApp,
  installUpdates,
  repairApp,
  resetNetwork,
  restartDevice,
  restartService,
} from '../../../tools/devices/model'
import type { Device, DevicesState } from '../../../tools/devices/schema'
import { IT_CATEGORIES, WRITING_GUIDE } from './knowledge'

/**
 * IT Help Desk (Service Desk Analyst): six people with computer problems,
 * fixed remotely. Each ticket resolves when the device itself is fixed
 * (Devices: Remote Desktop and Device Management). Teaches: finding the
 * cause with the computer's own tools, fixing the cause rather than the
 * symptom, and disconnecting when done.
 */
function start(): DevicesState {
  const base = companyDevices()
  let devices = base.devices
  const set = (name: string, fn: (d: Device) => Device) => {
    devices = devices.map((d) => (d.name === name ? fn(d) : d))
  }
  // Grace: an old sync tool stuck at full speed, and a nearly full disk.
  set('LT-0170', (d) => ({
    ...d,
    storage: { totalGb: 256, usedGb: 238, tempGb: 21.5 },
    processes: [
      ...d.processes,
      {
        name: 'SyncHelper',
        cpu: 86,
        memoryMb: 2300,
        system: false,
        description: 'Old file sync tool',
      },
    ],
    events: [
      ...d.events,
      {
        time: '08:52',
        level: 'warning',
        source: 'Storage',
        message: 'Low disk space on C: (7% free).',
      },
      {
        time: '08:55',
        level: 'warning',
        source: 'SyncHelper',
        message: 'Sync stuck retrying the same folder.',
      },
    ],
  }))
  // Owen: LedgerPro's files are damaged.
  set('LT-0171', (d) => ({
    ...d,
    apps: d.apps.map((a) =>
      a.name === 'LedgerPro' ? { ...a, state: 'crashing', fault: 'corrupt' } : a,
    ),
    events: [
      ...d.events,
      {
        time: '09:03',
        level: 'error',
        source: 'Application',
        message:
          'LedgerPro.exe stopped working. Faulting module: ledgercore.dll (file damaged).',
      },
    ],
  }))
  // Dana: the print spooler has stopped, with a job stuck.
  set('DT-0180', (d) => ({
    ...d,
    services: d.services.map((s) =>
      s.name === 'Print Spooler' ? { ...s, running: false } : s,
    ),
    printQueue: [{ document: 'Staff rota March.xlsx', stuck: true }],
    events: [
      ...d.events,
      {
        time: '09:07',
        level: 'error',
        source: 'Service Control',
        message: 'The Print Spooler service terminated unexpectedly.',
      },
    ],
  }))
  // Ben: an old proxy typed in by hand.
  set('DT-0181', (d) => ({
    ...d,
    network: { ...d.network, mode: 'manual', proxy: '10.20.9.9:8080' },
    events: [
      ...d.events,
      {
        time: '09:10',
        level: 'warning',
        source: 'Network',
        message: 'Proxy 10.20.9.9:8080 did not respond.',
      },
    ],
  }))
  // Arjun: the installer service is disabled, so the install failed.
  set('LT-0162', (d) => ({
    ...d,
    apps: d.apps.map((a) =>
      a.name === 'DataViz Studio' ? { ...a, state: 'install-failed' } : a,
    ),
    services: d.services.map((s) =>
      s.name === 'Windows Installer' ? { ...s, running: false, startup: 'disabled' } : s,
    ),
    events: [
      ...d.events,
      {
        time: '09:12',
        level: 'error',
        source: 'Installer',
        message:
          'DataViz Studio 5.1: installation failed. The Windows Installer service could not be accessed.',
      },
    ],
  }))
  // Leila: updates fail because the update service is stopped.
  set('LT-0163', (d) => ({
    ...d,
    services: d.services.map((s) =>
      s.name === 'Windows Update' ? { ...s, running: false, startup: 'disabled' } : s,
    ),
    updates: [
      ...d.updates,
      {
        id: 'KB5035853',
        title: '2026-04 Cumulative Update for Windows 11',
        state: 'failed',
        error: 'Error 0x80070422: the Windows Update service is not running.',
      },
    ],
  }))
  return { ...base, devices }
}

const devices = start()

function solution(): DevicesState {
  let s = devices
  const run = (r: { state: DevicesState; problems: string[] }) => {
    if (r.problems.length > 0) throw new Error(r.problems.join(' '))
    s = r.state
  }
  run(connect(s, 'LT-0170'))
  run(endProcess(s, 'LT-0170', 'SyncHelper'))
  run(diskCleanup(s, 'LT-0170'))
  run(connect(s, 'LT-0171'))
  run(repairApp(s, 'LT-0171', 'LedgerPro'))
  run(connect(s, 'DT-0180'))
  run(restartService(s, 'DT-0180', 'Print Spooler'))
  run(connect(s, 'DT-0181'))
  run(resetNetwork(s, 'DT-0181'))
  run(connect(s, 'LT-0162'))
  run(restartService(s, 'LT-0162', 'Windows Installer'))
  run(installApp(s, 'LT-0162', 'DataViz Studio'))
  run(connect(s, 'LT-0163'))
  run(restartService(s, 'LT-0163', 'Windows Update'))
  run(installUpdates(s, 'LT-0163'))
  run(restartDevice(s, 'LT-0163'))
  run(disconnect(s))
  return s
}

export const deviceSupport: AssignmentInput = {
  id: 'device-support',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 9,
  kind: 'tickets',
  title: 'Slow laptops and stubborn apps',
  summary:
    'Six computer problems, fixed remotely: each ticket resolves when the device itself is fixed.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'A morning of computer problems',
    body: `Hi {name},

Six tickets about people’s computers came in at once: slow, crashing, not printing, not installing, not updating, and one that can’t browse.

In the **Help Desk**, **Device Management** shows every company device and its health, and **Remote Desktop** lets you connect to a user’s computer and use its own tools: Task Manager, Storage, Services, Apps, Network settings, Windows Update, the Event Viewer.

Find the cause on each computer and fix that, not the symptom. The tickets resolve when the device really works. Disconnect when you are done, and tell Grace and Ben what was wrong.

Ravi`,
  },
  whyItMatters:
    'Most service desk work is fixing one person’s computer without walking to their desk. The computer’s own tools tell you what is wrong; fixing the cause, not the symptom, stops the same ticket coming back tomorrow.',
  objectives: [
    'Connect to a user’s computer remotely, and disconnect when done',
    'Use Task Manager, Storage, Services and the Event Viewer to find the cause',
    'Repair, install and update software the right way',
    'Set a computer back to the company standard settings',
  ],
  steps: [
    {
      id: 'inventory',
      title: 'Look at the devices',
      instructions:
        'Open **Device Management** in the Help Desk. Filter to devices **with issues**: which ones match the tickets?',
    },
    {
      id: 'grace',
      title: 'Grace: a slow laptop',
      instructions:
        'Connect to **LT-0170** in **Remote Desktop**. Open **Task Manager** and **Storage**: what is using the processor, and how much space is free?',
      hint: 'An old sync tool is stuck at full speed, and temporary files fill the disk.',
    },
    {
      id: 'apps',
      title: 'Owen and Arjun: apps',
      instructions:
        'Owen’s LedgerPro crashes: the **Event Viewer** says why. Arjun’s install failed: check **Services** before you install again.',
    },
    {
      id: 'others',
      title: 'Dana, Ben and Leila',
      instructions:
        'Dana cannot print (Printers, Services). Ben cannot browse while his colleagues can (Network settings). Leila’s updates keep failing (Windows Update, Services; a restart finishes them).',
    },
    {
      id: 'finish',
      title: 'Disconnect, reply, hand in',
      instructions:
        'Disconnect from the last computer. Reply to Grace and Ben with what was wrong and what you did, then click **Submit to {manager}**.',
    },
  ],
  queue: {
    title: 'Service desk: computer problems',
    categories: IT_CATEGORIES,
    knowledge: [
      {
        title: 'Remote support etiquette',
        body: `Tell the user you are connecting. Change only what the ticket needs. Never end a Windows process. Disconnect when you are done, and record what you changed in the ticket.`,
      },
      WRITING_GUIDE,
    ],
    tickets: [
      {
        id: 'INC-3301',
        from: 'Grace Mensah',
        department: 'Accounting',
        received: '09:01',
        subject: 'Laptop really slow',
        body: 'My laptop (LT-0170) has been crawling all morning. Everything takes ages to open and the fan is going mad. It also keeps saying the disk is almost full.',
        requester: 'backL',
        conditions: [
          { type: 'device-performance', device: 'LT-0170', maxCpu: 50 },
          { type: 'disk-free', device: 'LT-0170', minGb: 30 },
        ],
      },
      {
        id: 'INC-3302',
        from: 'Owen Price',
        department: 'Finance',
        received: '09:04',
        subject: 'LedgerPro keeps crashing',
        body: 'LedgerPro closes on its own as soon as I open a ledger. I need it for month end. Laptop LT-0171.',
        requester: 'backR',
        conditions: [{ type: 'app-working', device: 'LT-0171', app: 'LedgerPro' }],
      },
      {
        id: 'INC-3303',
        from: 'Dana Kowalski',
        department: 'Operations',
        received: '09:08',
        subject: 'Can’t print the rota',
        body: 'Nothing comes out of the printer from my PC (DT-0180). The rota is stuck in the queue and I need it on the wall by ten.',
        requester: 'coordinator',
        conditions: [
          { type: 'device-service', device: 'DT-0180', service: 'Print Spooler' },
          { type: 'print-queue-clear', device: 'DT-0180' },
        ],
      },
      {
        id: 'INC-3304',
        from: 'Ben Carter',
        department: 'Operations',
        received: '09:11',
        subject: 'No websites on my PC',
        body: 'No website will load on my PC (DT-0181), but the person next to me is fine. I did change some settings last week following an old guide…',
        requester: 'admin',
        conditions: [{ type: 'network-standard', device: 'DT-0181' }],
      },
      {
        id: 'INC-3305',
        from: 'Arjun Mehta',
        department: 'Data & Insights',
        received: '09:13',
        subject: 'DataViz Studio install failed',
        body: 'I tried to install DataViz Studio from the company catalogue on LT-0162 and it failed with an installer error. I need it for this afternoon’s dashboard.',
        requester: 'analyst',
        conditions: [{ type: 'app-working', device: 'LT-0162', app: 'DataViz Studio' }],
      },
      {
        id: 'INC-3306',
        from: 'Leila Haddad',
        department: 'Accounting',
        received: '09:15',
        subject: 'Updates keep failing',
        body: 'My laptop (LT-0163) keeps telling me an update failed and to try again. It has done this for days.',
        requester: 'backM',
        conditions: [{ type: 'updates-installed', device: 'LT-0163' }],
      },
    ],
    environment: {
      devices: {
        start: devices,
        solution: solution(),
        checks: [
          {
            id: 'cleanup',
            type: 'action',
            device: 'LT-0170',
            action: 'Disk Cleanup',
            title: 'Grace’s disk cleaned up safely',
            points: 5,
            why: 'Temporary files go first; never the user’s own files.',
            hint: 'Storage on LT-0170: Clean up temporary files.',
          },
          {
            id: 'disconnected',
            type: 'disconnected',
            title: 'Disconnected when done',
            points: 5,
            why: 'A remote session left open is a security risk and confuses the user.',
            hint: 'Click Disconnect in Remote Desktop.',
          },
        ],
      },
    },
  },
  ticketSolution: {
    'INC-3301': { status: 'resolved' },
    'INC-3302': { status: 'resolved' },
    'INC-3303': { status: 'resolved' },
    'INC-3304': { status: 'resolved' },
    'INC-3305': { status: 'resolved' },
    'INC-3306': { status: 'resolved' },
  },
  ticketChecks: [
    ...(
      [
        [
          'grace-fixed',
          'INC-3301',
          15,
          'Grace’s laptop is fast again',
          'The stuck process ended and the disk has room.',
        ],
        [
          'owen-fixed',
          'INC-3302',
          10,
          'LedgerPro works',
          'A repair fixes damaged files.',
        ],
        [
          'dana-fixed',
          'INC-3303',
          10,
          'Dana can print',
          'The spooler runs and the queue is clear.',
        ],
        [
          'ben-fixed',
          'INC-3304',
          10,
          'Ben can browse',
          'His PC is back on the company’s standard settings.',
        ],
        [
          'arjun-fixed',
          'INC-3305',
          10,
          'DataViz Studio is installed',
          'The installer service had to run first.',
        ],
        [
          'leila-fixed',
          'INC-3306',
          15,
          'Leila’s updates are installed',
          'The update service, the updates, then a restart.',
        ],
      ] as const
    ).map(([id, ticket, points, title, why]) => ({
      id,
      type: 'fixed' as const,
      ticket,
      points,
      title,
      why,
      hint: 'Connect with Remote Desktop and use the computer’s own tools.',
    })),
    {
      id: 'grace-reply',
      type: 'reply',
      ticket: 'INC-3301',
      mentions: [
        ['SyncHelper', 'sync', 'process'],
        ['temporary', 'disk', 'space', 'storage'],
      ],
      minWords: 20,
      title: 'Grace knows what happened',
      points: 10,
      why: 'Plain words: what slowed it down, and what you did.',
      hint: 'Mention the stuck sync tool and the temporary files.',
    },
    {
      id: 'ben-reply',
      type: 'reply',
      ticket: 'INC-3304',
      mentions: [['proxy', 'settings']],
      minWords: 20,
      title: 'Ben knows not to change it again',
      points: 10,
      why: 'Explain the cause so it does not happen again.',
      hint: 'Tell him the old proxy setting stopped his browsing, and that you set it back to automatic.',
    },
  ],
  passScore: 70,
  xp: 160,
  skills: { troubleshooting: 55, 'customer-service': 20, 'technical-writing': 15 },
  feedback: {
    excellent: `Hi {name},

Six computers fixed without leaving your desk, each at the cause. Grace’s sync tool, Owen’s damaged files, Dana’s spooler, Ben’s proxy, Arjun’s installer and Leila’s updates. That is a good morning.

Ravi`,
    good: `Hi {name},

Good work; a detail or two to tidy up. See the notes.

Ravi`,
    pass: `Hi {name},

Some of these are still not working. The tickets show what: have a look.

Ravi`,
    fail: `Hi {name},

Let’s go through it. Start in Device Management with the devices that have issues, then connect to each and use its own tools.

Ravi`,
  },
}
