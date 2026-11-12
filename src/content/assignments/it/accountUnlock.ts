import type { AssignmentInput } from '../../schemas'
import { sampleDirectory } from '../../../tools/directory/data'
import { unlockUser } from '../../../tools/directory/model'
import type { DirectoryState, User } from '../../../tools/directory/schema'
import {
  callBack,
  checkAnswer,
  requestApproval,
  startVerification,
  withClock,
} from '../../../tools/directory/security'
import { IT_CATEGORIES, WRITING_GUIDE } from './knowledge'

/**
 * IT Help Desk (Service Desk Analyst): three people locked out, and a
 * directory with a security policy. Each account may only be changed once
 * the person is verified against the records, and, for a privileged
 * account, approved by their manager on record. Teaches: identity before
 * action, calling back on the number on record, authorisation is separate
 * from identity, and when to stop.
 *
 * - Leila Haddad: her badge number matches. Verify, then unlock.
 * - Carmen Ruiz: verified, but she has payroll access (a privileged group),
 *   so Priya Raman, her manager on record, must approve the unlock.
 * - Owen Price: gives an old badge number, and is not at his desk to take a
 *   callback (he offers his mobile instead). He cannot be verified today: the
 *   account stays as it is, and he is asked to bring his badge.
 *
 * All people, numbers and badges are fictional simulation data.
 */
const base = sampleDirectory()

/** Records the directory keeps for verification (fictional). */
const records: Record<string, Partial<User>> = {
  u3: { employeeId: 'E-1003', badge: 'B-40103', extension: '2203' },
  u4: { employeeId: 'E-1004', badge: 'B-40104', extension: '2204' },
  u5: { employeeId: 'E-1005', badge: 'B-40105', extension: '2205' },
  // The other Owen (Consulting): calling him proves nothing about Owen Price.
  u14: { employeeId: 'E-1014', badge: 'B-40114', extension: '2140' },
}

const people: User[] = [
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
    signInLocation: 'Office, floor 1 (10.20.1.0/24)',
    employeeId: 'E-1017',
    badge: 'B-40417',
    extension: '2417',
    manager: 'u5',
  },
  {
    id: 'u18',
    name: 'Carmen Ruiz',
    username: 'carmen.ruiz',
    department: 'Finance',
    title: 'Payroll Officer',
    status: 'active',
    locked: true,
    mfa: true,
    mustChangePassword: false,
    groups: ['g-all', 'g-fin', 'g-payroll'],
    lastSignIn: '2026-03-27 16:48',
    failedSignIns: 5,
    signInLocation: 'Office, floor 2 (10.20.2.0/24)',
    employeeId: 'E-1018',
    badge: 'B-40518',
    extension: '2231',
    manager: 'u3',
  },
  {
    id: 'u19',
    name: 'Owen Price',
    username: 'owen.price',
    department: 'Finance',
    title: 'Financial Analyst',
    status: 'active',
    locked: true,
    mfa: true,
    mustChangePassword: false,
    groups: ['g-all', 'g-fin'],
    lastSignIn: '2026-03-27 18:20',
    failedSignIns: 6,
    signInLocation: 'Office, floor 1 (10.20.1.0/24)',
    employeeId: 'E-1019',
    badge: 'B-40691',
    extension: '2264',
    manager: 'u4',
  },
]

const start: DirectoryState = {
  ...base,
  users: [...base.users.map((u) => ({ ...u, ...records[u.id] })), ...people],
  groups: base.groups.map((g) =>
    g.id === 'g-payroll'
      ? { ...g, owner: 'u3' }
      : g.id === 'g-admin'
        ? { ...g, owner: 'u1' }
        : g,
  ),
  security: {
    clock: 0,
    sessionMinutes: 10,
    maxAttempts: 3,
    methods: ['employee-id', 'badge', 'callback'],
    policy: {},
    declines: [],
    requests: [
      {
        ticket: 'INC-3201',
        speaker: 'u17',
        says: { badge: 'B-40417' },
        offers: '',
        atDesk: true,
      },
      {
        ticket: 'INC-3202',
        speaker: 'u18',
        says: { 'employee-id': 'E-1018' },
        offers: '',
        atDesk: true,
      },
      {
        // An old badge number, away from his desk, and a mobile number instead.
        ticket: 'INC-3203',
        speaker: 'u19',
        says: { badge: 'B-31960' },
        offers: '07700 900412',
        atDesk: false,
      },
    ],
    sessions: [],
    events: [],
  },
}

/** The model answer, done as the player would (at a fixed time). */
function solution(): DirectoryState {
  const at = Date.UTC(2026, 2, 30, 9, 30)
  let s = start
  const run = (r: { state: DirectoryState; problems: string[] }) => {
    if (r.problems.length > 0) throw new Error(r.problems.join(' '))
    s = r.state
  }
  // Leila: badge number checked against her record, then unlock.
  const leila = startVerification(
    s,
    { ticket: 'INC-3201', user: 'u17', operations: ['unlock'] },
    at,
  )
  run(leila)
  run(checkAnswer(s, leila.id, 'badge', 'B-40417', at))
  run(unlockUser(withClock(s, at), 'u17'))
  // Carmen: verified, then approved by her manager on record (payroll access).
  const carmen = startVerification(
    s,
    { ticket: 'INC-3202', user: 'u18', operations: ['unlock'] },
    at,
  )
  run(carmen)
  run(checkAnswer(s, carmen.id, 'employee-id', 'E-1018', at))
  run(requestApproval(s, carmen.id, 'u3', at))
  run(unlockUser(withClock(s, at), 'u18'))
  // Owen: the badge does not match, and nobody answers his extension. Stop there.
  const owen = startVerification(
    s,
    { ticket: 'INC-3203', user: 'u19', operations: ['unlock', 'reset-password'] },
    at,
  )
  run(owen)
  run(checkAnswer(s, owen.id, 'badge', 'B-31960', at))
  run(callBack(s, owen.id, 'record', at))
  return s
}

export const accountUnlock: AssignmentInput = {
  id: 'account-unlock',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 8,
  kind: 'tickets',
  title: 'The Account Unlock Request',
  summary:
    'Three people locked out. Verify who you are talking to, get approval where the policy needs it, and only then change the account.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Three lockouts, and our security policy',
    body: `Hi {name},

Three people are locked out this morning: Leila, Carmen and Owen.

Our **Directory** now enforces the security policy. Before you unlock or reset anyone’s account, you must **verify that the person asking really is the account holder**, using the records we hold (employee number, badge number, or a callback to the extension on record). Some accounts need **approval** as well: Carmen has payroll access, so her manager has to approve.

The Directory refuses any change that is not verified, and records the attempt. If someone cannot be verified, do not change their account: tell them what they need to do.

Ravi`,
  },
  whyItMatters:
    'Most account takeovers start with a convincing call to the service desk. Knowing how to unlock an account is easy; making sure it is the right person, and that the change is allowed, is the job. A service desk that skips verification hands accounts to attackers.',
  objectives: [
    'Identify the right account before changing it',
    'Verify identity against the records, not what the caller says',
    'Call back on the number on record, never a number the caller gives',
    'Get approval where the policy needs it: identity is not permission',
    'Stop, and say why, when someone cannot be verified',
  ],
  steps: [
    {
      id: 'take',
      title: 'Take the tickets',
      instructions:
        'In the **Help Desk**, open each ticket and click **Assign to me**. Each one has an **Identity verification** section.',
    },
    {
      id: 'leila',
      title: 'Verify Leila, then unlock her',
      instructions:
        'In Leila’s ticket, choose **her** account and **Unlock account**, and start a verification. Ask for her badge number and check it against the record. Then unlock her account in the **Directory** tab, and watch her ticket.',
      hint: 'The Directory shows what each change needs under the policy. Changes that are not verified are refused.',
    },
    {
      id: 'carmen',
      title: 'Carmen: identity and approval',
      instructions:
        'Verify Carmen the same way. Her account is in a privileged group (Payroll Data), so the policy also needs her **manager on record** to approve the unlock. Her manager is shown in her account in the Directory.',
      hint: 'Approval must come from the person the records name, not anyone senior.',
    },
    {
      id: 'owen',
      title: 'Owen: when verification fails',
      instructions:
        'Owen is in a hurry. Check what he gives you against his record, and call him back, on the right number. If he cannot be verified, do not change his account: set the ticket to **Waiting for information** and reply with what he needs to do.',
      hint: 'A number the caller gives proves nothing. And there are two people called Owen.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  queue: {
    title: 'Service desk: account lockouts',
    categories: IT_CATEGORIES,
    knowledge: [
      {
        title: 'Verifying who you are talking to',
        body: `Never change an account on someone’s word. Verify first:

1. **Find the right account.** Check the full name and the department: names are often shared.
2. **Check what they give you against the record**: their employee number or staff badge number. The records are not shown to you; the Directory says whether it matches.
3. **Or call them back on the extension on record.** Never on a number they give you: anyone can give a number.
4. **Three wrong answers** end the verification. Do not change the account on that request.

A verification covers one person and the changes they asked for, and expires after 10 minutes.`,
      },
      {
        title: 'Authorisation: when identity is not enough',
        body: `Some changes need approval as well as identity:

- **Privileged accounts** (in a group such as Payroll Data or Domain Admins): unlocking or resetting needs their **manager on record** to approve.
- **Disabling or enabling** an account: their manager approves.
- **Group changes**: identity and their manager; for a privileged group, two checks and the group’s owner.

Only the person the records name can approve: not a senior colleague, not the requester.`,
      },
      {
        title: 'When someone cannot be verified',
        body: `Stay polite and firm. Do not unlock or reset. Set the ticket to Waiting for information and tell them how to verify: bring their staff badge to the IT desk, or be at their desk for a callback on their extension. If you suspect someone is pretending to be a colleague, tell IT security.`,
      },
      WRITING_GUIDE,
    ],
    tickets: [
      {
        id: 'INC-3201',
        from: 'Leila Haddad',
        department: 'Accounting',
        received: '09:02',
        subject: 'Locked out this morning',
        body: 'Hi, I mistyped my password a few times and now my account is locked. I know the password, I just need it unlocking. I’m at my desk.',
        requester: 'backM',
        conditions: [{ type: 'account-unlocked', user: 'u17' }],
      },
      {
        id: 'INC-3202',
        from: 'Carmen Ruiz',
        department: 'Finance',
        received: '09:06',
        subject: 'Urgent: locked out, payroll run at 11',
        body: 'My account is locked and I have to start the payroll run by 11. Please unlock it as soon as you can! I’m at my desk on floor 2.',
        requester: 'front2',
        conditions: [{ type: 'account-unlocked', user: 'u18' }],
      },
      {
        id: 'INC-3203',
        from: 'Owen Price',
        department: 'Finance',
        received: '09:11',
        subject: 'Locked out and forgot my password',
        body: 'I’ve come down to the IT desk. I’m locked out and I can’t remember my password, can you reset it and unlock me? I have a meeting in five minutes. If you need to call me, use my mobile, 07700 900412.',
        requester: 'backR',
        conditions: [
          { type: 'account-unlocked', user: 'u19' },
          { type: 'password-reset', user: 'u19' },
        ],
      },
    ],
    environment: {
      directory: {
        start,
        solution: solution(),
        checks: [
          {
            id: 'leila-verified',
            type: 'verified',
            name: 'Leila Haddad',
            operation: 'unlock',
            title: 'Leila verified, then unlocked',
            points: 20,
            why: 'Her badge number matched her record before her account was changed.',
            hint: 'Start a verification from her ticket, check her badge number, then unlock.',
          },
          {
            id: 'carmen-verified',
            type: 'verified',
            name: 'Carmen Ruiz',
            operation: 'unlock',
            approver: 'Priya Raman',
            title: 'Carmen verified, and the unlock approved',
            points: 20,
            why: 'Payroll access is privileged: identity, and approval from her manager on record.',
            hint: 'Her manager is in her Directory record. Ask them for approval in her ticket.',
          },
          {
            id: 'owen-not-verified',
            type: 'verification-failed',
            name: 'Owen Price',
            title: 'Owen’s identity checked, and not accepted',
            points: 10,
            why: 'His badge number did not match, and nobody answered his extension: he is not verified.',
            hint: 'Check his badge number against the record, and call back on the extension on record.',
          },
          {
            id: 'owen-unchanged',
            type: 'account',
            name: 'Owen Price',
            expect: { locked: true, mustChangePassword: false },
            title: 'Owen’s account left as it was',
            points: 5,
            why: 'An account is not changed for someone who could not be verified.',
            hint: 'Do not unlock or reset Owen’s account today.',
          },
          {
            id: 'policy',
            type: 'compliance',
            title: 'No breach of the security policy',
            points: 10,
            why: 'Every account change was covered by a verification, and nothing was attempted without one.',
            hint: 'Verify first; the Directory shows what each change needs.',
          },
        ],
      },
    },
  },
  ticketSolution: {
    'INC-3201': { status: 'resolved' },
    'INC-3202': { status: 'resolved' },
    'INC-3203': { status: 'pending' },
  },
  ticketChecks: [
    {
      id: 'leila-fixed',
      type: 'fixed',
      ticket: 'INC-3201',
      title: 'Leila can sign in',
      points: 10,
      why: 'Her account is unlocked, so her ticket resolved itself.',
      hint: 'Unlock her account once she is verified.',
    },
    {
      id: 'carmen-fixed',
      type: 'fixed',
      ticket: 'INC-3202',
      title: 'Carmen can run payroll',
      points: 10,
      why: 'Unlocked after approval: the ticket resolved itself.',
      hint: 'Approval first, then unlock.',
    },
    {
      id: 'owen-waiting',
      type: 'field',
      field: 'status',
      tickets: ['INC-3203'],
      title: 'Owen’s ticket waits for him',
      points: 5,
      why: 'It is not fixed, and not his fault: it waits for him to verify.',
      hint: 'Set INC-3203 to Waiting for information.',
    },
    {
      id: 'owen-reply',
      type: 'reply',
      ticket: 'INC-3203',
      mentions: [
        ['badge', 'desk', 'extension'],
        ['verify', 'verified', 'verification', 'confirm', 'identity'],
      ],
      minWords: 25,
      title: 'Owen knows what to do',
      points: 10,
      why: 'Firm and helpful: why you could not change his account, and how he can verify.',
      hint: 'Explain that you could not verify him, and ask him to bring his staff badge or be at his desk for a callback.',
    },
  ],
  passScore: 70,
  xp: 150,
  skills: { 'access-control': 50, 'customer-service': 25, 'incident-management': 15 },
  feedback: {
    excellent: `Hi {name},

Exactly right. Leila and Carmen were verified before anything changed, Priya approved Carmen’s unlock, and you did not give in to Owen’s hurry. That is how accounts stay safe.

Ravi`,
    good: `Hi {name},

Good, careful work; a detail or two to tidy up. See the notes.

Ravi`,
    pass: `Hi {name},

The accounts are in the right state, but the process matters as much as the result here. Read the notes on the policy.

Ravi`,
    fail: `Hi {name},

Let’s go through it. Identity first, then approval where it is needed, and only then the change. If someone cannot be verified, the answer is no, politely.

Ravi`,
  },
}
