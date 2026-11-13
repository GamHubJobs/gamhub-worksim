import type { AssignmentInput } from '../../schemas'
import {
  declineMatter,
  openMatter,
  runConflictCheck,
  sendEngagement,
  verifyClient,
} from '../../../tools/legal/model'
import { CHECK_NO_CONFLICT, firm, must } from './common'

/**
 * Law (trainee): two new enquiries. Teaches the conflict check, identity
 * checks, the engagement letter, and declining when the firm cannot act.
 */
const start = firm()

function solution() {
  let s = must(runConflictCheck(start, 'M-2042'))
  s = must(verifyClient(s, 'c2', 'Passport, seen in person at reception'))
  s = must(sendEngagement(s, 'c2'))
  s = must(openMatter(s, 'M-2042'))
  s = must(runConflictCheck(s, 'M-2043'))
  s = must(
    declineMatter(
      s,
      'M-2043',
      'Conflict of interest: we act for Brightwater Bakery Ltd, the other side, in M-2041.',
    ),
  )
  return s
}

export const legalIntake: AssignmentInput = {
  id: 'legal-intake',
  version: 1,
  careerId: 'legal',
  levelId: 'legal-trainee',
  order: 1,
  kind: 'tool',
  title: 'Two new enquiries',
  summary:
    'Run the conflict checks on two new matters, open the one we can take, and decline the other.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Two new enquiries for you',
    body: `Hi {name},

Welcome to Kestrel & Vane. Two enquiries came in overnight; both are at intake in **Matter Desk**:

**M-2042: Jonah Pell** says he was dismissed without notice by Harrowgate Hotels. He is at reception now with his passport.
**M-2043: Corvid Logistics** want to sue a customer for unpaid deliveries.

For each one: run the **conflict check** first. If the firm can act, verify the client’s identity (note the document you saw), send the **engagement letter**, and open the matter. If we cannot act, **decline** it and record why.

Don’t ask either of them for details of their case until the conflict check is clear.

Eleanor`,
  },
  whyItMatters:
    'A firm owes loyalty to every current client. Checking conflicts before learning anything confidential, knowing who the client really is, and agreeing the terms in writing protect the client, the firm and you.',
  objectives: [
    'Run a conflict check before taking on a matter',
    'Verify identity and send the engagement letter',
    'Decline a matter where the firm has a conflict',
  ],
  steps: [
    {
      id: 'pell-check',
      title: 'Jonah Pell: conflict check',
      instructions:
        'In **Matters and intake**, run the conflict check on M-2042 and read the result.',
    },
    {
      id: 'pell-open',
      title: 'Jonah Pell: identity, engagement, open',
      instructions:
        'Record the identity document you saw, send the engagement letter, then **Open the matter**.',
    },
    {
      id: 'corvid',
      title: 'Corvid Logistics',
      instructions:
        'Run the conflict check on M-2043. If it shows a current client on the other side, decline with the reason.',
      hint: 'Who is Corvid suing? Is that someone we already act for?',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Check the **Audit log**, then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'legal',
    title: 'Matter Desk: new enquiries',
    start,
    solution: solution(),
    checks: [
      {
        id: 'pell-client',
        type: 'client',
        client: 'c2',
        idVerified: true,
        engagementSent: true,
        title: 'Jonah’s identity checked and engagement letter sent',
        points: 20,
        why: 'Knowing who the client is and agreeing the scope and fees in writing come before any work.',
        hint: 'Record the passport, then send the engagement letter.',
      },
      {
        id: 'pell-open',
        type: 'matter',
        matter: 'M-2042',
        status: 'open',
        title: 'M-2042 opened',
        points: 25,
        why: 'There is no conflict, and the client is verified and engaged: the firm can act.',
        hint: 'Open M-2042 after the three steps.',
      },
      {
        id: 'corvid-declined',
        type: 'matter',
        matter: 'M-2043',
        status: 'declined',
        reasonMentions: [['conflict'], ['Brightwater']],
        title: 'M-2043 declined because of the conflict',
        points: 35,
        why: 'Corvid wants to sue Brightwater Bakery, a current client. The firm cannot act against its own client.',
        hint: 'Run the check on M-2043, then decline it with the reason (the conflict with Brightwater).',
      },
      CHECK_NO_CONFLICT,
    ],
  },
  passScore: 70,
  xp: 100,
  skills: { 'professional-ethics': 40, 'case-management': 25, 'customer-service': 15 },
  feedback: {
    excellent: `Hi {name},

Exactly right. Jonah is our client now, properly, and you spotted that Corvid would have had us suing our own client. That is the most important check we make.

Eleanor`,
    good: `Hi {name},

Good intake; a detail or two to fix. See the notes.

Eleanor`,
    pass: `Hi {name},

Some of the intake isn’t right yet. Read the notes carefully.

Eleanor`,
    fail: `Hi {name},

Not yet. Start with the conflict checks: they come first, always.

Eleanor`,
  },
}
