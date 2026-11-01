/**
 * Cobalt Ridge's office network: a server room, two office floors, the core
 * router, the firewall and the internet link. Scenarios plant faults in it.
 */
import type { Device, NetworkState } from './schema'

const device = (
  name: string,
  kind: Device['kind'],
  ip: string,
  subnet: string,
  location: string,
  extra: Partial<Device> = {},
): Device => ({
  name,
  kind,
  ip,
  subnet,
  location,
  description: '',
  up: true,
  restartable: true,
  services: [],
  ...extra,
})

const client = (gateway: string) => ({ gateway, dns: '10.20.0.10', static: false })

export function officeNetwork(): NetworkState {
  return {
    home: 'IT-PC-07',
    domain: 'cobaltridge.example',
    subnets: [
      {
        id: 'srv',
        name: 'Server room',
        prefix: '10.20.0',
        gateway: '10.20.0.1',
        switch: 'SW-CORE',
      },
      {
        id: 'fl1',
        name: 'Floor 1 offices',
        prefix: '10.20.1',
        gateway: '10.20.1.1',
        switch: 'SW-FL1',
      },
      {
        id: 'fl2',
        name: 'Floor 2 offices',
        prefix: '10.20.2',
        gateway: '10.20.2.1',
        switch: 'SW-FL2',
      },
    ],
    devices: [
      device('RTR-CORE', 'router', '10.20.0.1', 'srv', 'Server room', {
        description: 'Core router between the floors and the server room',
      }),
      device('FW-EDGE', 'firewall', '10.20.0.2', 'srv', 'Server room', {
        description: 'Firewall to the internet',
      }),
      device('SW-CORE', 'switch', '10.20.0.3', 'srv', 'Server room'),
      device('SW-FL1', 'switch', '10.20.1.2', 'fl1', 'Floor 1 comms cupboard'),
      device('SW-FL2', 'switch', '10.20.2.2', 'fl2', 'Floor 2 comms cupboard'),
      device(
        'AP-FL2',
        'access-point',
        '10.20.2.5',
        'fl2',
        'Floor 2 ceiling, by the meeting rooms',
        { description: 'Wi-Fi access point for floor 2' },
      ),
      device('DC-01', 'server', '10.20.0.10', 'srv', 'Server room', {
        description: 'Directory and DNS server',
        services: [
          { port: 53, name: 'DNS', running: true },
          { port: 389, name: 'Directory (LDAP)', running: true },
        ],
      }),
      device('FILE-01', 'server', '10.20.0.15', 'srv', 'Server room', {
        description: 'File server (shared drives)',
        services: [{ port: 445, name: 'File sharing (SMB)', running: true }],
      }),
      device('PRINT-01', 'server', '10.20.0.20', 'srv', 'Server room', {
        description: 'Print server: every office printer is shared from here',
        services: [{ port: 631, name: 'Print spooler (IPP)', running: true }],
      }),
      device('INTRA-02', 'server', '10.20.0.21', 'srv', 'Server room', {
        description: 'Intranet web server (new, live since Friday)',
        services: [{ port: 443, name: 'Intranet (HTTPS)', running: true }],
      }),
      device('INTRA-01', 'server', '10.20.0.25', 'srv', 'Server room', {
        description: 'Old intranet server: switched off on Friday, replaced by INTRA-02',
        up: false,
        restartable: false,
        services: [{ port: 443, name: 'Intranet (HTTPS)', running: false }],
      }),
      device('PRN-FL1-01', 'printer', '10.20.1.50', 'fl1', 'Floor 1, by the kitchen', {
        services: [{ port: 9100, name: 'Printing', running: true }],
      }),
      device('PRN-FL2-01', 'printer', '10.20.2.50', 'fl2', 'Floor 2, open-plan area', {
        services: [{ port: 9100, name: 'Printing', running: true }],
      }),
      device('IT-PC-07', 'pc', '10.20.1.107', 'fl1', 'Service desk, floor 1', {
        description: 'Your computer',
        config: client('10.20.1.1'),
      }),
      device('PC-RECEPTION', 'pc', '10.20.1.20', 'fl1', 'Reception desk', {
        config: client('10.20.1.1'),
      }),
      device('LT-0153', 'laptop', '10.20.2.113', 'fl2', 'Floor 2', {
        description: 'Maya Patel’s laptop',
        config: client('10.20.2.1'),
      }),
      device('LT-0154', 'laptop', '10.20.1.114', 'fl1', 'Floor 1', {
        description: 'Hot-desk laptop',
        config: client('10.20.1.1'),
      }),
      device('LT-0156', 'laptop', '10.20.2.116', 'fl2', 'Floor 2', {
        description: 'Sam Doyle’s laptop',
        config: client('10.20.2.1'),
      }),
      device('ISP-LINK', 'external', '81.2.69.1', '', 'Internet provider', {
        description: 'The office internet connection',
      }),
      device('CLIENT-PORTAL', 'external', '203.0.113.40', '', 'Internet', {
        description: 'A client’s project portal',
        services: [{ port: 443, name: 'HTTPS', running: true }],
      }),
    ],
    dns: {
      server: '10.20.0.10',
      records: [
        { name: 'dc-01', ip: '10.20.0.10' },
        { name: 'file-01', ip: '10.20.0.15' },
        { name: 'print-01', ip: '10.20.0.20' },
        { name: 'intranet', ip: '10.20.0.21' },
        { name: 'intra-01', ip: '10.20.0.25' },
        { name: 'intra-02', ip: '10.20.0.21' },
        { name: 'prn-fl1-01', ip: '10.20.1.50' },
        { name: 'prn-fl2-01', ip: '10.20.2.50' },
        { name: 'portal.clientcloud.example', ip: '203.0.113.40' },
      ],
    },
    console: [],
    findings: [],
    actions: [],
  }
}

type Change = (state: NetworkState) => NetworkState

export const changeDevice =
  (name: string, change: (d: Device) => Device): Change =>
  (state) => ({
    ...state,
    devices: state.devices.map((d) => (d.name === name ? change(d) : d)),
  })

export const changeRecord =
  (name: string, ip: string): Change =>
  (state) => ({
    ...state,
    dns: {
      ...state.dns,
      records: state.dns.records.map((r) => (r.name === name ? { ...r, ip } : r)),
    },
  })

/** Analyst scenario: printing is down for everyone, and Maya can't get online. */
export function printingScenario(): NetworkState {
  return [
    changeDevice('PRINT-01', (d) => ({
      ...d,
      services: d.services.map((s) => (s.port === 631 ? { ...s, running: false } : s)),
    })),
    // Maya typed in settings from a client's network last week.
    changeDevice('LT-0153', (d) => ({
      ...d,
      config: { gateway: '10.20.2.254', dns: '10.20.0.10', static: true },
    })),
  ].reduce((s, c) => c(s), officeNetwork())
}

/** Senior scenario: the intranet is down after Friday's change, and more. */
export function intranetScenario(): NetworkState {
  return [
    // Friday's change moved the intranet to INTRA-02 but missed this record.
    changeRecord('intranet', '10.20.0.25'),
    // Sam set a public DNS server at home and it stuck.
    changeDevice('LT-0156', (d) => ({
      ...d,
      config: { gateway: '10.20.2.1', dns: '8.8.8.8', static: true },
    })),
    // The access point has lost power: someone must go and look.
    changeDevice('AP-FL2', (d) => ({ ...d, up: false, restartable: false })),
  ].reduce((s, c) => c(s), officeNetwork())
}
