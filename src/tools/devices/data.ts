/**
 * The company's devices: one computer for each person in the office (the
 * same people as the office and Directory), a printer, and a laptop that is
 * away from the office. Healthy to start with: scenarios add the faults.
 * All names, addresses and serial details are fictional.
 */
import type { App, Device, DevicesState } from './schema'

const STANDARD = { dns: '10.20.0.10', proxy: '' }

const system = (name: string, cpu: number, memoryMb: number, description: string) => ({
  name,
  cpu,
  memoryMb,
  system: true,
  description,
})

const app = (name: string, version: string, extra: Partial<App> = {}): App => ({
  name,
  version,
  latest: version,
  state: 'working',
  fault: 'none',
  approved: true,
  sizeGb: 1.5,
  ...extra,
})

function computer(
  name: string,
  owner: string,
  ownerId: string,
  person: string,
  department: string,
  ip: string,
  extra: Partial<Device> = {},
): Device {
  const laptop = name.startsWith('LT')
  return {
    name,
    type: laptop ? 'laptop' : 'desktop',
    owner,
    ownerId,
    person,
    department,
    os: 'Windows 11 Pro 23H2',
    model: laptop ? 'Latitude 14 Pro' : 'OptiPlex 7010',
    ip,
    status: 'online',
    memoryGb: 16,
    storage: { totalGb: 256, usedGb: 118, tempGb: 3.2 },
    network: {
      mode: 'automatic',
      dns: STANDARD.dns,
      proxy: STANDARD.proxy,
      connection: laptop ? 'Wi-Fi' : 'Ethernet',
    },
    apps: [
      app('Office Suite', '16.0.17'),
      app('Web Browser', '124.0'),
      app('Company Chat', '3.2'),
      app('DataViz Studio', '5.1', { state: 'not-installed', sizeGb: 4 }),
      app('Torrent Client', '2.9', { state: 'not-installed', approved: false }),
    ],
    services: [
      { name: 'Windows Update', running: true, startup: 'automatic' },
      { name: 'Windows Installer', running: true, startup: 'manual' },
      { name: 'Print Spooler', running: true, startup: 'automatic' },
      { name: 'DNS Client', running: true, startup: 'automatic' },
      { name: 'Endpoint Protection', running: true, startup: 'automatic' },
    ],
    processes: [
      system('System', 1, 160, 'Windows kernel'),
      system('Desktop Window Manager', 2, 140, 'Draws the screen'),
      system('Endpoint Protection', 1, 220, 'Antivirus'),
      system('Explorer', 1, 110, 'The desktop and taskbar'),
      {
        name: 'Office Suite',
        cpu: 3,
        memoryMb: 620,
        system: false,
        description: 'Documents and email',
      },
      {
        name: 'Company Chat',
        cpu: 2,
        memoryMb: 480,
        system: false,
        description: 'Messages',
      },
    ],
    updates: [
      {
        id: 'KB5034441',
        title: '2026-03 Cumulative Update for Windows 11',
        state: 'installed',
        error: '',
      },
    ],
    events: [
      {
        time: '08:41',
        level: 'information',
        source: 'Windows',
        message: 'The computer started normally.',
      },
    ],
    printQueue: [],
    restartPending: false,
    ...extra,
  }
}

export function companyDevices(): DevicesState {
  return {
    standard: STANDARD,
    session: null,
    log: [],
    devices: [
      computer('LT-0131', 'Ravi Menon', 'u1', 'manager', 'IT Services', '10.20.1.31'),
      computer('LT-0134', 'Jess Taylor', 'u2', 'senior', 'IT Services', '10.20.1.34'),
      computer('LT-0161', 'Carmen Ruiz', 'u18', 'front2', 'Finance', '10.20.2.61', {
        apps: [
          app('Office Suite', '16.0.17'),
          app('Web Browser', '124.0'),
          app('LedgerPro', '8.4'),
        ],
      }),
      computer(
        'LT-0162',
        'Arjun Mehta',
        'u20',
        'analyst',
        'Data & Insights',
        '10.20.2.62',
      ),
      computer('LT-0163', 'Leila Haddad', 'u17', 'backM', 'Accounting', '10.20.1.63'),
      computer('LT-0170', 'Grace Mensah', 'u21', 'backL', 'Accounting', '10.20.1.70'),
      computer('LT-0171', 'Owen Price', 'u19', 'backR', 'Finance', '10.20.1.71', {
        apps: [
          app('Office Suite', '16.0.17'),
          app('Web Browser', '124.0'),
          app('LedgerPro', '8.4'),
        ],
      }),
      computer(
        'DT-0180',
        'Dana Kowalski',
        'u22',
        'coordinator',
        'Operations',
        '10.20.1.80',
      ),
      computer('DT-0181', 'Ben Carter', 'u23', 'admin', 'Operations', '10.20.1.81'),
      computer('LT-0190', 'Hannah Lin', 'u15', '', 'Operations', '10.20.1.90', {
        status: 'offline',
        events: [
          {
            time: 'Fri 17:58',
            level: 'information',
            source: 'Windows',
            message: 'The computer went to sleep.',
          },
        ],
      }),
      {
        name: 'PRN-FL1',
        type: 'printer',
        owner: '',
        ownerId: '',
        person: '',
        department: 'Shared (floor 1)',
        os: 'Printer firmware 4.2',
        model: 'LaserJet M480',
        ip: '10.20.1.200',
        status: 'online',
        memoryGb: 1,
        storage: { totalGb: 8, usedGb: 1, tempGb: 0 },
        network: {
          mode: 'automatic',
          dns: STANDARD.dns,
          proxy: '',
          connection: 'Ethernet',
        },
        apps: [],
        services: [],
        processes: [],
        updates: [],
        events: [],
        printQueue: [],
        restartPending: false,
      },
    ],
  }
}
