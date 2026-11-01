import type { AssignmentInput } from '../../schemas'
import {
  addFinding,
  restartService,
  runConsole,
  switchToAutomaticSettings,
} from '../../../tools/network/actions'
import { printingScenario } from '../../../tools/network/data'
import type { NetworkState } from '../../../tools/network/schema'

/**
 * IT Help Desk (Service Desk Analyst): first job in Network Tools. Printing
 * is down for everyone, and one user can't reach anything beyond her floor.
 * Teaches: testing from the user's computer, ping versus port checks,
 * reading ipconfig, and fixing remotely.
 */
const start = printingScenario()

function solution(): NetworkState {
  let s = start
  for (const [from, command] of [
    ['IT-PC-07', 'ping print-01'],
    ['IT-PC-07', 'portcheck print-01 631'],
    ['LT-0153', 'ipconfig'],
    ['LT-0153', 'ping 10.20.2.1'],
  ] as const) {
    s = runConsole(s, from, command)
  }
  s = addFinding(s, {
    device: 'PRINT-01',
    fault: 'service-stopped',
    note: 'Ping works, but portcheck print-01 631 fails: the print spooler has stopped.',
  }).state
  s = addFinding(s, {
    device: 'LT-0153',
    fault: 'wrong-gateway',
    note: 'ipconfig shows gateway 10.20.2.254 typed in by hand; floor 2 uses 10.20.2.1.',
  }).state
  s = restartService(s, 'PRINT-01', 631).state
  s = switchToAutomaticSettings(s, 'LT-0153').state
  return s
}

export const networkPrinting: AssignmentInput = {
  id: 'network-printing',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 6,
  kind: 'tool',
  title: 'Nobody can print, and Maya can’t get online',
  summary:
    'Use Network Tools to find out why printing is down and why one laptop can’t reach anything.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Two network tickets: please investigate',
    body: `Hi {name},

Now that you’re an Analyst, you have **Network Tools**: a console that runs the usual diagnostic commands (from your PC, or from a user’s computer over a remote session), the network map, and a place to record findings.

**Ticket 1** (lots of them, actually): nobody on either floor can print since about 8:30. The printers themselves show “Ready”.

**Ticket 2**: Maya Patel (laptop **LT-0153**, floor 2) can print to the floor 2 printer by IP address but can’t reach anything else: no email, no shared drives, no internet. She was working at a client’s office last week.

For each one: find the cause with the console, record a finding (device and fault, with your evidence), fix it if it can be fixed remotely, and test again.

Ravi`,
  },
  whyItMatters:
    'Most network problems look the same to users: “it doesn’t work”. Support analysts find the real cause by testing step by step from where the user is, and a correct diagnosis stops people restarting things at random and making it worse.',
  objectives: [
    'Test from the user’s computer as well as your own',
    'Tell an unreachable server from a stopped service',
    'Spot settings typed in by hand, and fix them remotely',
  ],
  steps: [
    {
      id: 'printing',
      title: 'Why can’t anyone print?',
      instructions:
        'In the **Console**, `ping print-01`: does the print server answer? Then `portcheck print-01 631` (631 is the printing service). If the server answers but the service doesn’t, the service has stopped.',
    },
    {
      id: 'maya',
      title: 'Why can’t Maya reach anything?',
      instructions:
        'Choose **LT-0153** in **Run from** and run `ipconfig`. Compare her gateway with floor 2’s gateway on the **Network map** (10.20.2.1). Try `ping 10.20.0.20` from her laptop and read the answer.',
      hint: '“Destination host unreachable” from her own address means her laptop doesn’t know the way out.',
    },
    {
      id: 'findings',
      title: 'Record your findings',
      instructions:
        'In **Findings**, add one for each cause: the device, what is wrong, and the evidence.',
    },
    {
      id: 'fix',
      title: 'Fix and test',
      instructions:
        'On the **Network map**, restart the print spooler on PRINT-01, and switch LT-0153 to automatic settings. Then run your tests again: from your PC and from Maya’s laptop.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  tool: {
    id: 'network',
    title: 'Network Tools: printing and LT-0153',
    start,
    solution: solution(),
    checks: [
      {
        id: 'finding-print',
        type: 'finding',
        device: 'PRINT-01',
        fault: 'service-stopped',
        title: 'Printing problem diagnosed',
        points: 15,
        why: 'The server was up all along: the cause was the service, and the ticket must say so.',
        hint: 'ping print-01 works; portcheck print-01 631 doesn’t.',
      },
      {
        id: 'finding-maya',
        type: 'finding',
        device: 'LT-0153',
        fault: 'wrong-gateway',
        title: 'Maya’s problem diagnosed',
        points: 15,
        why: 'Her laptop, not the network, was the problem: a gateway typed in at a client’s office.',
        hint: 'Run ipconfig from LT-0153 and compare the gateway with floor 2’s.',
      },
      {
        id: 'printing-works',
        type: 'service',
        from: 'IT-PC-07',
        host: 'print-01',
        port: 631,
        title: 'Printing works again',
        points: 20,
        why: 'The fix is only done when the service answers again.',
        hint: 'Restart the print spooler on PRINT-01 from the Network map.',
      },
      {
        id: 'maya-works',
        type: 'service',
        from: 'LT-0153',
        host: 'print-01',
        port: 631,
        title: 'Maya can reach the servers',
        points: 20,
        why: 'Test from the user’s computer: that is where the problem was.',
        hint: 'Switch LT-0153 to automatic settings.',
      },
      {
        id: 'evidence',
        type: 'evidence',
        items: [
          {
            description: 'checked the printing service with a port check',
            from: '',
            pattern: 'portcheck\\s+(print-01|10\\.20\\.0\\.20)\\s+631',
          },
          {
            description: 'ran ipconfig on Maya’s laptop',
            from: 'LT-0153',
            pattern: '^ipconfig',
          },
        ],
        title: 'The evidence behind the diagnosis',
        points: 30,
        why: 'Diagnose with tests, not guesses: the next person will rely on your evidence.',
        hint: 'Run portcheck print-01 631, and ipconfig from LT-0153.',
      },
    ],
  },
  passScore: 70,
  xp: 140,
  skills: { troubleshooting: 55, 'incident-management': 20, 'technical-writing': 15 },
  feedback: {
    excellent: `Hi {name},

Textbook. The print server was fine, the spooler wasn’t; and Maya’s laptop still had a gateway from her client’s office. Both diagnosed with evidence, fixed remotely and tested. Twelve tickets closed.

Ravi`,
    good: `Hi {name},

Good investigation; something is missing in the findings or tests. See the notes.

Ravi`,
    pass: `Hi {name},

Part of this is still broken or undiagnosed. The notes show what.

Ravi`,
    fail: `Hi {name},

Let’s go through it together. Start with ping print-01, then portcheck print-01 631.

Ravi`,
  },
}
