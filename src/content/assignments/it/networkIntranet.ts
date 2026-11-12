import type { AssignmentInput } from '../../schemas'
import {
  addFinding,
  runConsole,
  setDnsRecord,
  switchToAutomaticSettings,
} from '../../../tools/network/actions'
import { intranetScenario } from '../../../tools/network/data'
import type { NetworkState } from '../../../tools/network/schema'

/**
 * IT Help Desk (Senior Support Analyst): Monday morning after a change. The
 * intranet is down for everyone, one laptop can't resolve any names, and
 * floor 2's Wi-Fi is out. Three causes that look alike; teaches separating
 * them with evidence, DNS records versus DNS settings, and knowing what
 * cannot be fixed remotely.
 */
const start = intranetScenario()

function solution(): NetworkState {
  let s = start
  for (const [from, command] of [
    ['IT-PC-07', 'nslookup intranet'],
    ['IT-PC-07', 'ping intra-02'],
    ['LT-0156', 'ipconfig'],
    ['LT-0156', 'nslookup intranet'],
    ['IT-PC-07', 'ping ap-fl2'],
    ['IT-PC-07', 'ping 10.20.2.5'],
  ] as const) {
    s = runConsole(s, from, command)
  }
  s = addFinding(s, {
    device: 'DC-01',
    fault: 'wrong-dns-record',
    note: 'nslookup intranet gives 10.20.0.25 (INTRA-01, switched off on Friday). Should be 10.20.0.21 (INTRA-02).',
  }).state
  s = addFinding(s, {
    device: 'LT-0156',
    fault: 'wrong-dns-server',
    note: 'ipconfig shows DNS server 8.8.8.8 set by hand; names time out, IP addresses work.',
  }).state
  s = addFinding(s, {
    device: 'AP-FL2',
    fault: 'device-offline',
    note: 'No reply to ping and no response to a remote restart: needs someone on site to check power.',
  }).state
  s = setDnsRecord(s, 'intranet', '10.20.0.21').state
  s = switchToAutomaticSettings(s, 'LT-0156').state
  return s
}

export const networkIntranet: AssignmentInput = {
  id: 'network-intranet',
  version: 1,
  careerId: 'it-support',
  levelId: 'senior-support-analyst',
  order: 11,
  kind: 'tool',
  title: 'Monday after the change',
  summary:
    'The intranet is down, a laptop can’t find anything, and floor 2’s Wi-Fi is out: separate the causes and fix what you can.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'URGENT: intranet down after Friday’s change',
    body: `Hi {name},

On Friday evening we moved the intranet from the old server (INTRA-01) to the new one (INTRA-02), and switched the old one off. This morning:

• **Everyone** says the intranet won’t load.
• **Sam Doyle** (laptop **LT-0156**) can’t open anything by name, not even the intranet’s new address by name, but the floor 2 printer works by IP address.
• **Floor 2** says the Wi-Fi in the meeting rooms is down.

They may or may not be related. You’re the senior on shift: find each cause with evidence, record your findings, fix what can be fixed remotely, and make sure the rest goes to the right people. Don’t switch the old server back on: it has been wiped.

Ravi`,
  },
  whyItMatters:
    'After a change, several problems often arrive at once and look like one. Senior analysts separate them with evidence, fix the real causes rather than the symptoms, and know when a problem needs someone on site. Getting DNS right matters especially: one wrong record can take a service away from everyone.',
  objectives: [
    'Separate several problems that look alike',
    'Tell a wrong DNS record from a wrong DNS setting',
    'Fix what can be fixed remotely and escalate the rest',
  ],
  steps: [
    {
      id: 'intranet',
      title: 'The intranet',
      instructions:
        'From your PC, `nslookup intranet`. Which address does the name give, and which server is that on the **Network map**? Then `ping intra-02` and `portcheck intra-02 443`.',
    },
    {
      id: 'sam',
      title: 'Sam’s laptop',
      instructions:
        'Run from **LT-0156**: `ipconfig`, then `nslookup intranet`. Which DNS server does it ask? Compare with your own ipconfig.',
      hint: 'If names time out but IP addresses work, look at the DNS server the computer is set to use.',
    },
    {
      id: 'wifi',
      title: 'The Wi-Fi',
      instructions:
        'Ping the floor 2 access point (AP-FL2, 10.20.2.5). Try restarting it from the Network map. If it doesn’t respond to anything, it needs someone on site.',
    },
    {
      id: 'fix',
      title: 'Record, fix and test',
      instructions:
        'Record a finding for each cause. Correct the **intranet** record in **DNS records**; switch LT-0156 to automatic settings. Test again from your PC and from Sam’s laptop.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  tool: {
    id: 'network',
    title: 'Network Tools: Monday incident',
    start,
    solution: solution(),
    checks: [
      {
        id: 'finding-record',
        type: 'finding',
        device: 'DC-01',
        fault: 'wrong-dns-record',
        title: 'The intranet record diagnosed',
        points: 10,
        why: 'The server was fine; the name still pointed at the old one. Record it against the DNS server, where it is fixed.',
        hint: 'nslookup intranet gives the old server’s address. Records live on DC-01.',
      },
      {
        id: 'finding-sam',
        type: 'finding',
        device: 'LT-0156',
        fault: 'wrong-dns-server',
        title: 'Sam’s laptop diagnosed',
        points: 10,
        why: 'His laptop asks a DNS server outside the office, which knows nothing about our names.',
        hint: 'ipconfig on LT-0156 shows the DNS server it uses.',
      },
      {
        id: 'finding-ap',
        type: 'finding',
        device: 'AP-FL2',
        fault: 'device-offline',
        title: 'The access point escalated',
        points: 10,
        why: 'It can’t be fixed remotely: the finding is what sends someone to it.',
        hint: 'It answers nothing, and a remote restart fails.',
      },
      {
        id: 'intranet-everyone',
        type: 'resolves',
        from: 'IT-PC-07',
        name: 'intranet',
        ip: '10.20.0.21',
        title: 'The intranet works for everyone',
        points: 25,
        why: 'Correcting the record fixes it for the whole company at once.',
        hint: 'Change the intranet record in DNS records to INTRA-02’s address.',
      },
      {
        id: 'intranet-sam',
        type: 'service',
        from: 'LT-0156',
        host: 'intranet',
        port: 443,
        title: 'The intranet works for Sam',
        points: 20,
        why: 'Two causes affected Sam: both had to be fixed.',
        hint: 'Switch LT-0156 to automatic settings, then test from it.',
      },
      {
        id: 'evidence',
        type: 'evidence',
        items: [
          {
            description: 'looked up the intranet name',
            from: '',
            pattern: '^nslookup\\s+intranet',
          },
          {
            description: 'checked Sam’s settings with ipconfig',
            from: 'LT-0156',
            pattern: '^ipconfig',
          },
          {
            description: 'tested the access point',
            from: '',
            pattern: '^(ping|tracert)\\s+(ap-fl2|10\\.20\\.2\\.5)',
          },
        ],
        title: 'The evidence behind the diagnosis',
        points: 25,
        why: 'After an incident, the evidence goes into the review: what you saw, not what you guessed.',
        hint: 'nslookup intranet; ipconfig from LT-0156; ping AP-FL2.',
      },
    ],
  },
  passScore: 70,
  xp: 180,
  skills: { troubleshooting: 50, 'incident-management': 35, 'technical-writing': 10 },
  feedback: {
    excellent: `Hi {name},

Brilliant. Three problems, three causes: a DNS record missed in Friday’s change, Sam’s home DNS setting, and a dead access point (the facilities team found a tripped breaker). Fixed, tested and documented before most people had their coffee.

Ravi`,
    good: `Hi {name},

Mostly there; one cause is undiagnosed or unfixed. See the notes.

Ravi`,
    pass: `Hi {name},

The intranet may still be down for some people. The notes show what is left.

Ravi`,
    fail: `Hi {name},

Start with nslookup intranet and compare the address with the network map.

Ravi`,
  },
}
