import type { AssignmentInput } from '../../schemas'
import { sampleDirectory } from '../../../tools/directory/data'
import { resetPassword, unlockUser } from '../../../tools/directory/model'
import type { DirectoryState } from '../../../tools/directory/schema'
import { addFinding, restartDevice, runConsole } from '../../../tools/network/actions'
import { wifiScenario } from '../../../tools/network/data'
import type { NetworkState } from '../../../tools/network/schema'
import { IT_CATEGORIES, PRIORITY_GUIDE, WRITING_GUIDE } from './knowledge'

/**
 * IT Help Desk (Service Desk Analyst): tickets tied to the company's systems.
 * Floor 2 has lost its Wi-Fi, and a colleague is locked out. Each ticket
 * resolves when its problem is really fixed in Network Tools or Directory,
 * and the colleagues it held up get back to work. Teaches: finding the one
 * cause behind several tickets, fixing it at the source, testing from where
 * the user is, and that a password reset does not unlock an account.
 */
const network = wifiScenario()

/** Leila Haddad (from the office) has typed her password wrong five times. */
function directoryStart(): DirectoryState {
  const start = sampleDirectory()
  return {
    ...start,
    users: [
      ...start.users,
      {
        id: 'u17',
        name: 'Leila Haddad',
        username: 'leila.haddad',
        department: 'Accounting',
        title: 'Accounts Assistant',
        status: 'active',
        locked: true,
        mfa: true,
        mustChangePassword: false,
        groups: ['g-all', 'g-fin'],
        lastSignIn: '2026-03-27 17:05',
        failedSignIns: 5,
        signInLocation: 'Office (10.20.1.0/24)',
      },
    ],
  }
}
const directory = directoryStart()

function networkSolution(): NetworkState {
  let s = runConsole(network, 'IT-PC-07', 'ping 10.20.2.5')
  s = addFinding(s, {
    device: 'AP-FL2',
    fault: 'device-crashed',
    note: 'AP-FL2 does not answer a ping from IT-PC-07, and every floor 2 laptop on Wi-Fi is off the network. The map shows it as not responding.',
  }).state
  s = restartDevice(s, 'AP-FL2').state
  s = runConsole(s, 'LT-0161', 'ping 10.20.0.15')
  return s
}

function directorySolution(): DirectoryState {
  const ok = (r: { state: DirectoryState; problems: string[] }) => {
    if (r.problems.length > 0) throw new Error(r.problems.join(' '))
    return r.state
  }
  return ok(unlockUser(ok(resetPassword(directory, 'u17')), 'u17'))
}

export const wifiOutage: AssignmentInput = {
  id: 'wifi-outage',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 7,
  kind: 'tickets',
  title: 'Floor 2 has lost its Wi-Fi',
  summary:
    'Three tickets tied to the company’s systems: they resolve only when the problem is really fixed.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Floor 2 Wi-Fi, and a lockout',
    body: `Hi {name},

Two tickets from floor 2 in ten minutes, both about the Wi-Fi, and Leila in Accounts is locked out.

These tickets are tied to our systems. In the **Help Desk**, the **Network Tools** and **Directory** tabs are the real consoles: what you change there is what the tickets see. A ticket is **resolved when its problem is actually fixed**, not when you choose “Resolved”: each ticket shows what still prevents it.

So: take the tickets, find the cause, fix it at the source, and test from where the user is. Then reply to Carmen so she knows what happened, and close what is done.

Ravi`,
  },
  whyItMatters:
    'Users report symptoms, often several people at once. The service desk finds the one cause behind them, fixes it where it lives, and checks that it really works for the person who asked. A ticket marked resolved while the fault is still there is worse than an open one.',
  objectives: [
    'Spot that several tickets have one cause',
    'Fix the cause in the system where it lives',
    'Verify the fix from the user’s computer',
    'Know that a password reset does not unlock an account',
  ],
  steps: [
    {
      id: 'take',
      title: 'Take the tickets',
      instructions:
        'In the **Help Desk**, open each ticket and click **Assign to me**. Read what each one says is still preventing it.',
    },
    {
      id: 'wifi',
      title: 'Find out why floor 2 has no Wi-Fi',
      instructions:
        'Open the **Network Tools** tab. On the **Network map**, look at floor 2: which laptops say “No network”, and what do they connect through? From your PC, `ping` that device’s address in the **Console**.',
      hint: 'Carmen’s and Arjun’s laptops are on, but use Wi-Fi through AP-FL2 (10.20.2.5).',
    },
    {
      id: 'fix',
      title: 'Fix it at the source, and record it',
      instructions:
        'Restart what has stopped responding. Record a **Finding** for it, with your evidence. Then, in the **Console**, choose **LT-0161** (Carmen’s laptop) in **Run from** and test that she can reach the file server: `ping file-01`.',
      hint: 'Restarting the laptops does not help: they are fine, the access point is not.',
    },
    {
      id: 'lockout',
      title: 'Leila’s lockout',
      instructions:
        'In the **Directory** tab, find Leila Haddad. A new password alone is not enough: her account is locked after five wrong attempts. Watch what her ticket says after each change.',
    },
    {
      id: 'close',
      title: 'Reply, then close',
      instructions:
        'Reply to Carmen: what was wrong and what you did. Close the tickets the systems show as resolved.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  queue: {
    title: 'Service desk: floor 2 Wi-Fi',
    categories: IT_CATEGORIES,
    knowledge: [
      PRIORITY_GUIDE,
      {
        title: 'Several users, one fault',
        body: `When several people report the same thing, look for what they have in common before fixing anyone’s computer.

Wi-Fi: laptops on the same floor connect through that floor’s access point. If they are all on, but none can reach anything, test the access point. A device that has crashed can be restarted from the Network map; one with no power needs someone on site.

Always test again from the user’s computer: that is where the problem was.`,
      },
      {
        title: 'Locked accounts',
        body: `An account locks after five wrong passwords. Resetting the password does not unlock it, and unlocking it does not give the user a new password.

If the user has forgotten their password: issue a temporary one (Reset password) and unlock the account. They choose a new password at their next sign-in.`,
      },
      WRITING_GUIDE,
    ],
    tickets: [
      {
        id: 'INC-3101',
        from: 'Carmen Ruiz',
        department: 'Payroll',
        received: '08:57',
        subject: 'No Wi-Fi on floor 2',
        body: 'Hi IT, my laptop says it is connected to nothing since about ten to nine. I can’t open the payroll files on the shared drive and the run is due at noon. Others near me have the same.',
        requester: 'front2',
        conditions: [
          { type: 'device-up', device: 'AP-FL2' },
          { type: 'can-reach', from: 'LT-0161', host: 'file-01', port: 445 },
        ],
      },
      {
        id: 'INC-3102',
        from: 'Arjun Mehta',
        department: 'Data & Insights',
        received: '09:04',
        subject: 'Laptop offline',
        body: 'My laptop can’t get to the intranet or anything else. Restarted it twice, no change. I’m on floor 2 by the data team desks.',
        requester: 'analyst',
        conditions: [{ type: 'can-reach', from: 'LT-0162', host: 'intranet', port: 443 }],
      },
      {
        id: 'INC-3103',
        from: 'Leila Haddad',
        department: 'Accounting',
        received: '09:10',
        subject: 'Locked out after the weekend',
        body: 'I think I typed my old password too many times and now it says my account is locked. I don’t remember the new one either. Can you help? I can’t do any work.',
        requester: 'backM',
        conditions: [
          { type: 'account-unlocked', user: 'u17' },
          { type: 'password-reset', user: 'u17' },
        ],
      },
    ],
    environment: {
      network: {
        start: network,
        solution: networkSolution(),
        checks: [
          {
            id: 'finding-ap',
            type: 'finding',
            device: 'AP-FL2',
            fault: 'device-crashed',
            title: 'The cause found: the access point',
            points: 15,
            why: 'Two tickets, one cause: the access point, not the laptops.',
            hint: 'Every floor 2 laptop on Wi-Fi uses AP-FL2. Ping 10.20.2.5 from your PC.',
          },
          {
            id: 'evidence',
            type: 'evidence',
            items: [
              {
                description: 'tested the access point from your PC',
                from: 'IT-PC-07',
                pattern: '^(ping|tracert)\\s+(ap-fl2|10\\.20\\.2\\.5)\\b',
              },
              {
                description:
                  'tested from Carmen’s laptop once it was back on the network',
                from: 'LT-0161',
                pattern: '^(ping|portcheck|tracert|nslookup)\\b',
                output: '^(Reply from \\S+: bytes|TcpTestSucceeded: True|Trace complete)',
              },
            ],
            title: 'Diagnosed with tests, and the fix verified',
            points: 25,
            why: 'Test the device you suspect, and check the fix from where the user is.',
            hint: 'ping 10.20.2.5 from IT-PC-07; after the restart, ping file-01 from LT-0161.',
          },
        ],
      },
      directory: {
        start: directory,
        solution: directorySolution(),
        checks: [],
      },
    },
  },
  ticketSolution: {
    'INC-3101': { status: 'resolved' },
    'INC-3102': { status: 'resolved' },
    'INC-3103': { status: 'resolved' },
  },
  ticketChecks: [
    {
      id: 'carmen-fixed',
      type: 'fixed',
      ticket: 'INC-3101',
      title: 'Carmen is back on the network',
      points: 20,
      why: 'Fixed means it works for her: the access point is up, and her laptop reaches the file server.',
      hint: 'Restart the access point floor 2’s laptops use.',
    },
    {
      id: 'arjun-fixed',
      type: 'fixed',
      ticket: 'INC-3102',
      title: 'Arjun is back on the network',
      points: 10,
      why: 'The same cause: one fix resolves both tickets.',
      hint: 'His laptop uses the same access point as Carmen’s.',
    },
    {
      id: 'leila-fixed',
      type: 'fixed',
      ticket: 'INC-3103',
      title: 'Leila can sign in',
      points: 20,
      why: 'She needs both: a temporary password and an unlocked account.',
      hint: 'In Directory: Reset password, and Unlock account.',
    },
    {
      id: 'carmen-reply',
      type: 'reply',
      ticket: 'INC-3101',
      mentions: [
        ['access point', 'AP-FL2', 'Wi-Fi'],
        ['restart', 'rebooted', 'reboot'],
      ],
      minWords: 20,
      title: 'Carmen knows what happened',
      points: 10,
      why: 'Document the resolution: what was wrong, and what you did.',
      hint: 'Tell her the floor’s Wi-Fi access point had stopped, and that you restarted it.',
    },
  ],
  passScore: 70,
  xp: 150,
  skills: { troubleshooting: 50, 'incident-management': 30, 'customer-service': 20 },
  feedback: {
    excellent: `Hi {name},

That is how it is done. One access point, two tickets: found with a ping, fixed at the source, and tested from Carmen’s laptop. And you knew a reset alone would not let Leila in. Payroll will go out on time.

Ravi`,
    good: `Hi {name},

Good work; something is missing in the evidence or the write-up. See the notes.

Ravi`,
    pass: `Hi {name},

Part of this is still broken. The tickets show exactly what: have a look.

Ravi`,
    fail: `Hi {name},

Let’s go through it together. Start with what Carmen’s and Arjun’s laptops have in common on the Network map.

Ravi`,
  },
}
