import type { AssignmentInput } from '../../schemas'
import { sampleDirectory } from '../../../tools/directory/data'
import {
  disableUser,
  removeFromGroup,
  resetPassword,
  returnAsset,
  unlockUser,
} from '../../../tools/directory/model'
import type { DirectoryState } from '../../../tools/directory/schema'

/**
 * IT Help Desk (Service Desk Analyst): a leaver, two lockouts (one of them an
 * attack) and an access request to refuse. Teaches: offboarding, reading
 * the evidence before unlocking, and least privilege.
 */
const base = sampleDirectory()
const start: DirectoryState = {
  ...base,
  users: base.users.map((u) =>
    u.name === 'Hannah Lin'
      ? {
          ...u,
          locked: true,
          failedSignIns: 5,
          signInLocation: 'Office, floor 1 (10.20.1.x)',
        }
      : u.name === 'Priya Raman'
        ? {
            ...u,
            locked: true,
            failedSignIns: 214,
            signInLocation: 'Unknown network abroad (185.220.101.47)',
            lastSignIn: '2026-03-20 18:05',
          }
        : u,
  ),
}

function solution(): DirectoryState {
  let s = start
  const run = (r: { state: DirectoryState; problems: string[] }) => {
    if (r.problems.length > 0) throw new Error(r.problems.join(' '))
    s = r.state
  }
  // Owen leaves today.
  run(disableUser(s, 'u14'))
  for (const g of ['g-cons', 'g-vpn']) run(removeFromGroup(s, 'u14', g))
  run(returnAsset(s, 'CR-LT-0154'))
  // Hannah: back from holiday, forgot her password.
  run(unlockUser(s, 'u15'))
  run(resetPassword(s, 'u15'))
  // Priya: on holiday; 214 attempts from abroad. Keep locked, change the password.
  run(resetPassword(s, 'u3'))
  return s
}

export const directoryLeaver: AssignmentInput = {
  id: 'directory-leaver',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 4,
  kind: 'tool',
  title: 'A leaver, two lockouts and a request',
  summary:
    'Offboard a leaver, handle two locked accounts, and deal with an access request.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Friday in Directory: please read every item carefully',
    body: `Hi {name},

A busy Friday. As an Analyst you can decide on these yourself, but think about each one.

**1. Leaver.** Owen Clarke leaves today. Disable his account, remove him from every group except All Staff, and get his laptop (**CR-LT-0154**) back into stock for wiping.

**2. Lockout.** Hannah Lin phoned from her desk on floor 1: she’s back from holiday, forgot her password and locked herself out. You know her voice and she answered her security questions. Get her working again.

**3. Lockout.** Priya Raman’s account was locked overnight. Priya is on holiday until Monday and hasn’t contacted us. Look at the account before you do anything.

**4. Request.** Leo Brennan in Marketing has asked to be added to **Domain Admins** “so I can install design software without waiting for IT”.

Note what you decided in your head for each one; I’ll ask on Monday.

{senior} can help if you’re unsure. Ravi`,
  },
  whyItMatters:
    'Accounts are the front door to every system. A leaver’s account left open, an attacker’s lockout quietly unlocked, or admin rights handed out for convenience are among the most common ways companies are breached. Service desk staff are the first line of that defence.',
  objectives: [
    'Offboard a leaver completely',
    'Tell a forgotten password from an attack, using the evidence',
    'Apply least privilege to access requests',
  ],
  steps: [
    {
      id: 'leaver',
      title: 'The leaver',
      instructions:
        'In **Users**, open Owen Clarke: **Disable account**, then **Remove** each group except All Staff. Return CR-LT-0154 to stock (from his account, or in **Assets**).',
    },
    {
      id: 'hannah',
      title: 'Hannah’s lockout',
      instructions:
        'Open Hannah Lin. Look at the failed sign-ins: few, from the office. **Unlock** her account and **Reset password** so she can choose a new one.',
    },
    {
      id: 'priya',
      title: 'Priya’s lockout',
      instructions:
        'Open Priya Raman. Read the failed sign-ins and where they came from, and remember she is on holiday. Decide what is safe: an attacker is guessing her password.',
      hint: 'Leave the account locked so the attacker stays out, and reset the password in case they guessed it. Priya can call when she is back.',
    },
    {
      id: 'request',
      title: 'Leo’s request',
      instructions:
        'Domain Admins can change anything in the company. Installing software is not a reason to join it. Don’t add Leo: the right answer is a software request to IT.',
    },
    {
      id: 'submit',
      title: 'Check and hand in',
      instructions: 'Check the **Audit log**, then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'directory',
    title: 'Directory: Friday requests',
    start,
    solution: solution(),
    checks: [
      {
        id: 'leaver-disabled',
        type: 'account',
        name: 'Owen Clarke',
        expect: { status: 'disabled', onlyGroups: ['All Staff'] },
        title: 'Leaver’s account disabled and access removed',
        points: 25,
        why: 'An open account belonging to someone who has left is an easy way in.',
        hint: 'Disable Owen’s account and remove Consultants and VPN Users.',
      },
      {
        id: 'leaver-laptop',
        type: 'asset',
        tag: 'CR-LT-0154',
        status: 'in-stock',
        assignedTo: '',
        title: 'Leaver’s laptop back in stock',
        points: 10,
        why: 'Equipment must be recovered and wiped before it is reissued.',
        hint: 'Return CR-LT-0154 to stock.',
      },
      {
        id: 'hannah',
        type: 'account',
        name: 'Hannah Lin',
        expect: { locked: false, mustChangePassword: true },
        title: 'Hannah back at work',
        points: 15,
        why: 'A verified user with a forgotten password just needs to be unlocked and reset.',
        hint: 'Unlock Hannah’s account and reset her password.',
      },
      {
        id: 'priya-locked',
        type: 'account',
        name: 'Priya Raman',
        expect: { locked: true, mustChangePassword: true },
        title: 'The attacked account kept safe',
        points: 20,
        why: 'Unlocking would let the attacker keep guessing; resetting the password protects the account in case they succeeded.',
        hint: 'Don’t unlock Priya’s account: reset her password and leave it locked.',
      },
      {
        id: 'priya-not-unlocked',
        type: 'action',
        action: 'Unlock account',
        target: 'Priya Raman',
        absent: true,
        title: 'No unlock for an unverified request',
        points: 10,
        why: 'Nobody asked for it, and the evidence points to an attack.',
        hint: 'Priya is on holiday and didn’t call: there was nobody to verify.',
      },
      {
        id: 'least-privilege',
        type: 'account',
        name: 'Leo Brennan',
        expect: { notInGroups: ['Domain Admins'] },
        title: 'No admin rights for convenience',
        points: 20,
        why: 'Admin rights for one installation would be admin rights over the whole company.',
        hint: 'Leave Leo out of Domain Admins.',
      },
    ],
  },
  passScore: 70,
  xp: 130,
  skills: {
    troubleshooting: 30,
    'customer-service': 20,
    accuracy: 30,
    'incident-management': 20,
  },
  feedback: {
    excellent: `Hi {name},

Excellent judgement. Owen is fully offboarded, Hannah is working, and you spotted that Priya’s lockout was an attack. Those 214 attempts came from a known malicious network. I’ve reported it to our security partner. And thank you for not giving Leo the keys to everything.

Ravi`,
    good: `Hi {name},

Mostly right, but one or two decisions need another look. See the notes.

Ravi`,
    pass: `Hi {name},

Some of these could have caused a security problem. Please read the notes.

Ravi`,
    fail: `Hi {name},

Let’s talk this through on Monday. Start with the leaver: disable, remove access, recover the laptop.

Ravi`,
  },
}
