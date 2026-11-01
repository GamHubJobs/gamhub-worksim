import type { AssignmentInput } from '../../schemas'
import { sampleDirectory } from '../../../tools/directory/data'
import {
  addToGroup,
  assignAsset,
  createUser,
  registerMfa,
  reportLost,
  resetMfa,
} from '../../../tools/directory/model'
import type { DirectoryState } from '../../../tools/directory/schema'

/**
 * IT Help Desk (Service Desk Trainee): a new starter and a lost phone, in
 * Directory. Teaches: setting up an account with only the access asked
 * for, MFA, issuing equipment from stock, and handling a lost device.
 */
const start = sampleDirectory()

function solution(): DirectoryState {
  const ok = (r: { state: DirectoryState; problems: string[] }) => {
    if (r.problems.length > 0) throw new Error(r.problems.join(' '))
    return r.state
  }
  const created = createUser(start, {
    name: 'Ines Duarte',
    username: 'ines.duarte',
    department: 'Consulting',
    title: 'Junior Consultant',
  })
  let s = created.state
  for (const group of ['g-all', 'g-cons', 'g-vpn'])
    s = ok(addToGroup(s, created.id, group))
  s = ok(registerMfa(s, created.id))
  s = ok(assignAsset(s, 'CR-LT-0157', created.id))
  s = ok(assignAsset(s, 'CR-PH-0070', created.id))
  // Maya's lost phone.
  s = ok(reportLost(s, 'CR-PH-0064'))
  s = ok(resetMfa(s, 'u13'))
  s = ok(registerMfa(s, 'u13'))
  s = ok(assignAsset(s, 'CR-PH-0071', 'u13'))
  return s
}

export const directoryJoiner: AssignmentInput = {
  id: 'directory-joiner',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-trainee',
  order: 3,
  kind: 'tool',
  title: 'A new starter and a lost phone',
  summary: 'Set up a new starter’s account and equipment, and deal with a lost phone.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Two requests for you in Directory',
    body: `Hi {name},

Time to use **Directory**, where we manage accounts, access and equipment. Two requests came in this morning.

**1. New starter.** Ines Duarte joins Consulting on Monday as a **Junior Consultant**. Please:
• create her account (our usernames are first.last),
• add her to **All Staff**, **Consultants** and **VPN Users**, and nothing else,
• register her MFA (she is coming to the service desk at 9 to do it with you),
• issue her laptop **CR-LT-0157** and phone **CR-PH-0070** from stock.

**2. Lost phone.** Maya Patel left her work phone (**CR-PH-0064**) on a train last night. She is at the desk now with ID. Please report the phone lost, reset her MFA (the lost phone holds her sign-in app) and register it again on her replacement, **CR-PH-0071**, which you should issue to her.

Ravi`,
  },
  whyItMatters:
    'Joiners, movers and leavers are the most common service desk requests, and the ones where security is won or lost. Giving exactly the access that was asked for, and closing the door on a lost device straight away, is what keeps accounts and data safe.',
  objectives: [
    'Create an account with only the access requested',
    'Register MFA and issue equipment from stock',
    'Handle a lost device: report it, reset MFA, replace it',
  ],
  steps: [
    {
      id: 'account',
      title: 'Create the account',
      instructions:
        'In **Users**, click **New account**. Enter Ines’s full name; check the suggested username (ines.duarte), choose Consulting and enter the job title. Click **Create account**.',
    },
    {
      id: 'groups',
      title: 'Groups and MFA',
      instructions:
        'With Ines selected, add the three groups one by one with **Add to a group**. Then click **Register MFA**.',
      hint: 'Groups marked with a shield are privileged: she should not be in any of them.',
    },
    {
      id: 'equipment',
      title: 'Issue her equipment',
      instructions:
        'Open **Assets**, show the devices **In stock**, and assign CR-LT-0157 and CR-PH-0070 to Ines.',
    },
    {
      id: 'lost',
      title: 'Maya’s lost phone',
      instructions:
        'In **Assets**, find CR-PH-0064 and click **Report lost**. In **Users**, open Maya Patel: **Reset MFA**, then **Register MFA**. Then assign her CR-PH-0071.',
    },
    {
      id: 'submit',
      title: 'Check and hand in',
      instructions:
        'Look at the **Audit log** to check every change, then click **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'directory',
    title: 'Directory: Monday requests',
    start,
    solution: solution(),
    checks: [
      {
        id: 'account',
        type: 'account',
        name: 'Ines Duarte',
        expect: { status: 'active', department: 'Consulting', mfa: true },
        title: 'Ines’s account created',
        points: 20,
        why: 'The account is her identity for every system on day one.',
        hint: 'Create the account in Users, in Consulting, and register MFA.',
      },
      {
        id: 'access',
        type: 'account',
        name: 'Ines Duarte',
        expect: { onlyGroups: ['All Staff', 'Consultants', 'VPN Users'] },
        title: 'Exactly the access requested',
        points: 20,
        why: 'Every extra group is access she doesn’t need, and a risk if her account is ever misused.',
        hint: 'All Staff, Consultants and VPN Users: no more, no less.',
      },
      {
        id: 'laptop',
        type: 'asset',
        tag: 'CR-LT-0157',
        status: 'in-use',
        assignedTo: 'Ines Duarte',
        title: 'Laptop issued',
        points: 10,
        why: 'Recording who has which device is how companies know where their data is.',
        hint: 'Assign CR-LT-0157 to Ines in Assets.',
      },
      {
        id: 'phone',
        type: 'asset',
        tag: 'CR-PH-0070',
        status: 'in-use',
        assignedTo: 'Ines Duarte',
        title: 'Phone issued',
        points: 10,
        why: 'Her phone also carries her sign-in app.',
        hint: 'Assign CR-PH-0070 to Ines in Assets.',
      },
      {
        id: 'lost',
        type: 'asset',
        tag: 'CR-PH-0064',
        status: 'lost',
        assignedTo: '',
        title: 'Lost phone reported',
        points: 15,
        why: 'A lost device must never stay on someone’s record as if it were safe.',
        hint: 'Click Report lost on CR-PH-0064.',
      },
      {
        id: 'mfa-reset',
        type: 'action',
        action: 'Reset MFA',
        target: 'Maya Patel',
        title: 'Maya’s MFA reset',
        points: 15,
        why: 'Whoever finds the phone must not be able to approve sign-ins with it.',
        hint: 'Reset Maya’s MFA, then register it again with her.',
      },
      {
        id: 'replacement',
        type: 'asset',
        tag: 'CR-PH-0071',
        status: 'in-use',
        assignedTo: 'Maya Patel',
        title: 'Replacement phone issued',
        points: 10,
        why: 'She needs a working phone to sign in and to work.',
        hint: 'Assign CR-PH-0071 to Maya.',
      },
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { 'customer-service': 25, troubleshooting: 30, accuracy: 30 },
  feedback: {
    excellent: `Hi {name},

Perfect: Ines has exactly the access she needs and her kit is ready, and Maya’s lost phone can’t be used to get into her account. That is the service desk at its best.

Ravi`,
    good: `Hi {name},

Good work; a couple of details to fix. See the notes.

Ravi`,
    pass: `Hi {name},

Some access or equipment isn’t right yet. The notes show what.

Ravi`,
    fail: `Hi {name},

Not yet. Start by creating Ines’s account in Users.

Ravi`,
  },
}
