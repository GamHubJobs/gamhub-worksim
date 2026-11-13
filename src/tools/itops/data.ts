/**
 * The Cobalt Ridge IT estate in a healthy state: the starting point for the
 * Help Desk's IT Operations tools and for tasks, which add their own faults.
 * Every company, person, address and domain is fictional; addresses use
 * invented streets, and mail uses reserved example domains.
 */
import type {
  Address,
  Asset,
  ItopsState,
  Licence,
  Mailbox,
  Message,
  Node,
  Person,
} from './schema'

export const DOMAIN = 'cobaltridge.example'

function node(n: Partial<Node> & Pick<Node, 'id' | 'kind' | 'ip' | 'zone'>): Node {
  return {
    name: n.id,
    location: 'Server room, rack A',
    upstream: null,
    status: 'up',
    fault: 'none',
    uptimeDays: 41,
    baseCpu: 0,
    memory: 0,
    services: [],
    users: 0,
    role: '',
    ...n,
  }
}

const svc = (name: string, description = '') => ({
  name,
  state: 'running' as const,
  description,
})

export function companyNodes(): Node[] {
  return [
    node({
      id: 'ISP',
      name: 'Harbor Fiber (internet provider)',
      kind: 'isp',
      ip: '203.0.113.1',
      zone: 'External',
      location: 'Provider network',
      uptimeDays: 212,
      users: 240,
      role: 'The building’s internet connection. Faults here are the provider’s to fix.',
    }),
    node({
      id: 'EDGE-RTR',
      kind: 'router',
      ip: '10.0.0.1',
      zone: 'Core',
      upstream: 'ISP',
      uptimeDays: 96,
      users: 240,
      role: 'The edge router: the last device the company owns before the provider.',
    }),
    node({
      id: 'FW-01',
      kind: 'firewall',
      ip: '10.0.0.254',
      zone: 'Core',
      upstream: 'EDGE-RTR',
      uptimeDays: 96,
      users: 240,
      role: 'The firewall: everything below it is inside the company.',
    }),
    node({
      id: 'SW-SRV',
      kind: 'switch',
      ip: '10.0.20.1',
      zone: 'Server room',
      upstream: 'FW-01',
      uptimeDays: 63,
      users: 240,
      role: 'The server switch (server VLAN 10.0.20.0/24).',
    }),
    node({
      id: 'DC01',
      kind: 'server',
      ip: '10.0.20.10',
      zone: 'Server room',
      upstream: 'SW-SRV',
      baseCpu: 14,
      memory: 46,
      users: 240,
      services: [
        svc('Directory Services', 'Accounts, sign-ins and domain joins'),
        svc('DNS Server', 'Name lookups for the company'),
      ],
      role: 'Domain controller: sign-ins, domain joins and DNS.',
    }),
    node({
      id: 'DC02',
      kind: 'server',
      ip: '10.0.20.11',
      zone: 'Server room',
      location: 'Server room, rack B',
      upstream: 'SW-SRV',
      baseCpu: 9,
      memory: 41,
      users: 240,
      services: [
        svc('Directory Services', 'Accounts, sign-ins and domain joins'),
        svc('DNS Server', 'Name lookups for the company'),
      ],
      role: 'The second domain controller (the pair to DC01).',
    }),
    node({
      id: 'FS01',
      kind: 'server',
      ip: '10.0.20.20',
      zone: 'Server room',
      upstream: 'SW-SRV',
      baseCpu: 18,
      memory: 58,
      users: 180,
      services: [
        svc('File Sharing', 'The shared drives (S: and departmental shares)'),
        svc('Backup Agent', 'Nightly backup to the off-site store'),
      ],
      role: 'File server: the shared drives.',
    }),
    node({
      id: 'MAIL01',
      kind: 'server',
      ip: '10.0.20.30',
      zone: 'Server room',
      upstream: 'SW-SRV',
      baseCpu: 22,
      memory: 64,
      users: 240,
      services: [
        svc('Mail Transport', 'Sends and receives mail'),
        svc('Mailbox Store', 'Holds everyone’s mailboxes'),
        svc('Webmail Access', 'Mail in the browser and on phones'),
      ],
      role: 'Mail server (its console is Mail Admin).',
    }),
    node({
      id: 'PRINT01',
      kind: 'server',
      ip: '10.0.20.40',
      zone: 'Server room',
      location: 'Server room, rack B',
      upstream: 'SW-SRV',
      baseCpu: 6,
      memory: 32,
      users: 160,
      services: [svc('Print Spooler', 'Every shared printer’s queue')],
      role: 'Print server: all shared printers.',
    }),
    node({
      id: 'DEPLOY01',
      kind: 'server',
      ip: '10.0.20.50',
      zone: 'Server room',
      location: 'Server room, rack B',
      upstream: 'SW-SRV',
      baseCpu: 4,
      memory: 28,
      users: 0,
      services: [
        svc('PXE Responder', 'Answers computers that boot from the network'),
        svc('Image Store', 'The corporate Windows images and task sequences'),
      ],
      role: 'Deployment server: network builds (Computer Deployment, Server Imaging).',
    }),
    node({
      id: 'SW-F1',
      kind: 'switch',
      ip: '10.0.11.1',
      zone: 'Floor 1',
      location: 'Floor 1 comms cupboard',
      upstream: 'FW-01',
      uptimeDays: 120,
      users: 70,
      role: 'Floor 1 access switch: Finance, Customer Support (VLAN 10.0.11.0/24).',
    }),
    node({
      id: 'SW-F2',
      kind: 'switch',
      ip: '10.0.12.1',
      zone: 'Floor 2',
      location: 'Floor 2 comms cupboard',
      upstream: 'FW-01',
      uptimeDays: 120,
      users: 80,
      role: 'Floor 2 access switch: Sales, Marketing, Operations (VLAN 10.0.12.0/24).',
    }),
    node({
      id: 'WLC-01',
      kind: 'controller',
      ip: '10.0.30.2',
      zone: 'Wireless',
      upstream: 'FW-01',
      uptimeDays: 77,
      users: 110,
      role: 'Wireless controller: every access point depends on it.',
    }),
    node({
      id: 'AP-LOBBY',
      kind: 'ap',
      ip: '10.0.30.11',
      zone: 'Wireless',
      location: 'Reception',
      upstream: 'WLC-01',
      uptimeDays: 77,
      users: 25,
      role: 'Access point: reception and meeting rooms.',
    }),
    node({
      id: 'AP-CAFE',
      kind: 'ap',
      ip: '10.0.30.12',
      zone: 'Wireless',
      location: 'Café',
      upstream: 'WLC-01',
      uptimeDays: 77,
      users: 40,
      role: 'Access point: the café and Floor 2 breakout area.',
    }),
  ]
}

const addr = (street: string, city: string, region: string, postal: string): Address => ({
  street,
  city,
  region,
  postal,
})

function person(
  id: string,
  name: string,
  department: string,
  title: string,
  extra: Partial<Person> = {},
): Person {
  const [first, last] = name.toLowerCase().split(' ')
  return {
    id,
    name,
    department,
    title,
    email: `${first}.${last}@${DOMAIN}`,
    remote: false,
    addressOnFile: null,
    address: null,
    build: 'imaging',
    ...extra,
  }
}

/** The staff roster, as the directory feed provides it. */
export function companyPeople(): Person[] {
  return [
    person('grace.mensah', 'Grace Mensah', 'Finance', 'Accounts Assistant'),
    person('owen.price', 'Owen Price', 'Finance', 'Finance Manager'),
    person('dana.kowalski', 'Dana Kowalski', 'Operations', 'Operations Coordinator'),
    person('ben.carter', 'Ben Carter', 'Operations', 'Administrator'),
    person('arjun.mehta', 'Arjun Mehta', 'Data & Insights', 'Data Analyst'),
    person('leila.haddad', 'Leila Haddad', 'Finance', 'Payroll Officer'),
    person('rosa.delgado', 'Rosa Delgado', 'Customer Support', 'Support Agent', {
      remote: true,
      addressOnFile: addr('14 Larkspur Row', 'Millbrook', 'OR', '97411'),
      address: addr('7 Juniper Court, Apt 3', 'Fairhaven', 'OR', '97415'),
    }),
    person('tom.okafor', 'Tom Okafor', 'Customer Support', 'Team Lead', {
      remote: true,
      addressOnFile: addr('220 Quarry Lane', 'Ashby Falls', 'WA', '98322'),
      address: addr('220 Quarry Lane', 'Ashby Falls', 'WA', '98322'),
    }),
    person('mei.lin', 'Mei Lin', 'Sales', 'Account Executive', {
      remote: true,
      addressOnFile: addr('9 Ferncliff Way', 'Brightwater', 'CA', '95560'),
      address: addr('9 Ferncliff Way', 'Brightwater', 'CA', '95560'),
    }),
    person('sam.reyes', 'Sam Reyes', 'Warehouse', 'Shift Supervisor', {
      build: 'manual',
    }),
    person('nina.petrova', 'Nina Petrova', 'Marketing', 'Content Lead'),
    person('jordan.blake', 'Jordan Blake', 'Customer Support', 'Support Agent', {
      remote: true,
      addressOnFile: addr('31 Orchard Hill Road', 'Cedar Bend', 'OR', '97433'),
      address: addr('31 Orchard Hill Road', 'Cedar Bend', 'OR', '97433'),
    }),
    person('priya.nair', 'Priya Nair', 'Customer Support', 'Support Agent', {
      remote: true,
      addressOnFile: addr('5 Willow Spur', 'Northgate', 'ID', '83701'),
      address: addr('5 Willow Spur', 'Northgate', 'ID', '83701'),
    }),
    person('marcus.webb', 'Marcus Webb', 'Executive', 'Chief Operating Officer'),
  ]
}

const DEPOT_ADDRESSES = {
  it: addr('1 Cobalt Ridge Plaza, IT Returns', 'Portvale', 'OR', '97201'),
  warehouse: addr('88 Freightway Drive, Unit 4', 'Portvale', 'OR', '97218'),
}
export const RETURN_DEPOTS = DEPOT_ADDRESSES

function computerSet(n: number, holder: Person, laptop: boolean): Asset[] {
  const base = {
    assignedTo: holder.id,
    site: null,
    status: 'deployed' as const,
    onShelf: false,
    notes: '',
    hwFault: null,
  }
  const year = n % 3 === 0 ? 2022 : n % 3 === 1 ? 2024 : 2025
  const bought = `${year}-0${(n % 8) + 1}-15`
  const warranty = `${year + 3}-0${(n % 8) + 1}-15`
  return [
    {
      ...base,
      tag: `A-${n}`,
      type: laptop ? 'laptop' : 'desktop',
      model: laptop ? 'Vantage 14 G5' : 'Vantage Tower 7',
      hostname: `CR-${laptop ? 'L' : 'D'}${n}`,
      build: holder.build,
      purchased: bought,
      warrantyEnd: warranty,
    },
    {
      ...base,
      tag: `A-${n}-MON`,
      type: 'monitor',
      model: 'ClearView 27 QHD',
      hostname: null,
      build: null,
      purchased: bought,
      warrantyEnd: warranty,
    },
    {
      ...base,
      tag: `A-${n}-HST`,
      type: 'headset',
      model: 'Talkline H40',
      hostname: null,
      build: null,
      purchased: bought,
      warrantyEnd: `${year + 1}-0${(n % 8) + 1}-15`,
    },
  ]
}

export function companyAssets(people: Person[]): Asset[] {
  const assets: Asset[] = []
  people.forEach((p, i) => {
    // Sam (Warehouse) uses the shared kiosk; Marcus has two of everything elsewhere.
    if (p.id === 'sam.reyes') return
    assets.push(...computerSet(1001 + i, p, p.remote || i % 2 === 0))
  })
  assets.push(
    {
      tag: 'A-0950',
      type: 'kiosk',
      model: 'Vantage Mini (kiosk)',
      hostname: 'CR-K0950',
      assignedTo: null,
      site: 'Warehouse loading dock',
      status: 'deployed',
      build: 'manual',
      onShelf: false,
      purchased: '2023-05-02',
      warrantyEnd: '2026-05-02',
      notes: 'Shared kiosk for shift sign-in and pick lists.',
      hwFault: null,
    },
    {
      tag: 'A-0961',
      type: 'printer',
      model: 'PrintMax 4200',
      hostname: 'PRN-FL2',
      assignedTo: null,
      site: 'Floor 2 print room',
      status: 'deployed',
      build: null,
      onShelf: false,
      purchased: '2021-11-20',
      warrantyEnd: '2024-11-20',
      notes: '',
      hwFault: null,
    },
    // Spare peripherals in stock.
    ...(['monitor', 'headset', 'dock', 'keyboard', 'mouse'] as const).map(
      (type, i): Asset => ({
        tag: `A-SP${20 + i}`,
        type,
        model:
          type === 'monitor'
            ? 'ClearView 24 FHD'
            : type === 'headset'
              ? 'Talkline H40'
              : type === 'dock'
                ? 'PortHub USB-C Dock'
                : type === 'keyboard'
                  ? 'Keyline K2'
                  : 'Pointer M2',
        hostname: null,
        assignedTo: null,
        site: null,
        status: 'ready',
        build: null,
        onShelf: false,
        purchased: '2025-09-01',
        warrantyEnd: '2028-09-01',
        notes: '',
        hwFault: null,
      }),
    ),
    {
      tag: 'A-0877',
      type: 'laptop',
      model: 'Vantage 14 G3',
      hostname: 'CR-L0877',
      assignedTo: null,
      site: null,
      status: 'decommissioned',
      build: 'imaging',
      onShelf: false,
      purchased: '2020-02-11',
      warrantyEnd: '2023-02-11',
      notes: 'End of life; drive wiped and certificate filed.',
      hwFault: null,
    },
  )
  return assets
}

function mailbox(p: Person, usedGb = 2.4, extra: Partial<Mailbox> = {}): Mailbox {
  return {
    address: p.email,
    person: p.name,
    usedGb,
    quotaGb: 10,
    archive: false,
    archivedGb: 0,
    oldMailGb: 0,
    retention: 'Default 2-year policy',
    rules: [],
    ...extra,
  }
}

export function companyMailboxes(people: Person[]): Mailbox[] {
  return people.map((p, i) => mailbox(p, 1.6 + ((i * 7) % 50) / 10))
}

let messageSeq = 0
export function message(
  m: Omit<Message, 'id' | 'code' | 'released'> & Partial<Message>,
): Message {
  messageSeq += 1
  return { id: `MSG-${4100 + messageSeq}`, code: '', released: false, ...m }
}

export function companyMessages(): Message[] {
  messageSeq = 0
  return [
    message({
      at: '2026-11-13 07:58 UTC',
      hoursAgo: 2,
      from: `marcus.webb@${DOMAIN}`,
      to: `owen.price@${DOMAIN}`,
      subject: 'Q4 forecast review',
      status: 'delivered',
      scl: 0,
      verdict: 'clean',
    }),
    message({
      at: '2026-11-13 06:12 UTC',
      hoursAgo: 4,
      from: 'prizes@lucky-draw.example.net',
      to: `grace.mensah@${DOMAIN}`,
      subject: 'You have WON a $500 gift card!!!',
      status: 'quarantined',
      scl: 9,
      verdict: 'bulk',
    }),
  ]
}

export function companyLicences(): Licence[] {
  return [
    {
      product: 'Office Suite',
      seats: 20,
      assigned: [],
      forDepartments: [],
    },
    {
      product: 'Support Desk Agent',
      seats: 5,
      assigned: ['rosa.delgado', 'tom.okafor', 'jordan.blake', 'priya.nair'],
      forDepartments: ['Customer Support'],
    },
    {
      product: 'DataViz Studio',
      seats: 3,
      assigned: ['arjun.mehta', 'nina.petrova'],
      forDepartments: ['Data & Insights'],
    },
    {
      product: 'DesignPro',
      seats: 2,
      assigned: ['nina.petrova'],
      forDepartments: ['Marketing'],
    },
  ]
}

/** The whole estate, healthy. */
export function companyItops(): ItopsState {
  const people = companyPeople()
  const licences = companyLicences()
  licences[0].assigned = people.map((p) => p.id).slice(0, 14)
  return {
    company: 'Cobalt Ridge',
    nodes: companyNodes(),
    ispChecked: false,
    ispOutage: false,
    people,
    mailboxes: companyMailboxes(people),
    messages: companyMessages(),
    blocked: [
      {
        address: 'lucky-draw.example.net',
        reason: 'bulk',
        note: 'Prize-draw spam to many mailboxes.',
        added: '2026-09-02',
      },
      {
        address: 'invoice-portal.example.org',
        reason: 'phishing',
        note: 'Fake invoice pages that ask for passwords.',
        added: '2026-10-14',
      },
    ],
    assets: companyAssets(people),
    licences,
    shipments: [],
    confirmations: [],
    run: null,
    repairs: [],
    nextAsset: 1100,
    log: [],
  }
}
