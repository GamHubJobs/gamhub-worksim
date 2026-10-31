import type { AssignmentInput } from '../../schemas'
import {
  CATEGORY_GUIDE,
  IT_CATEGORIES,
  PRIORITY_GUIDE,
  STATUS_GUIDE,
  WRITING_GUIDE,
} from './knowledge'

/**
 * IT 3 (Service Desk Analyst): five users report the same Outlook problem.
 * Spot the pattern, resolve every ticket with the fix, and write a
 * knowledge-base article so it never needs a ticket again. Teaches: problem
 * management, consistent resolution, and technical writing for users.
 */
const outlook: Array<[string, string, string, string, string]> = [
  [
    'INC-2201',
    'Maria Lopez',
    'Sales',
    '08:12',
    'Maria here. Since this morning Outlook says “Disconnected” in the bottom corner and no new mail arrives. Webmail works.',
  ],
  [
    'INC-2202',
    'James Carter',
    'Finance',
    '08:20',
    'My Outlook stopped receiving emails after the update last night. It just says Disconnected.',
  ],
  [
    'INC-2203',
    'Aisha Bello',
    'HR',
    '08:31',
    'Outlook is not syncing. Calendar is stuck on yesterday too.',
  ],
  [
    'INC-2204',
    'Daniel Kim',
    'Sales',
    '08:47',
    'No new emails in Outlook today, but my phone gets them fine.',
  ],
  [
    'INC-2205',
    'Chloe Martin',
    'Marketing',
    '09:05',
    'Outlook says “Disconnected” and “Trying to connect…” for an hour now.',
  ],
]

export const recurringProblem: AssignmentInput = {
  id: 'recurring-problem',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-analyst',
  order: 3,
  title: 'One problem, many tickets',
  summary:
    'Spot a recurring Outlook problem, resolve every ticket, and write a knowledge-base article.',
  estimatedMinutes: 40,
  from: 'manager',
  kind: 'tickets',
  briefing: {
    subject: 'Outlook tickets are piling up',
    body: `Hi {name},

Congratulations on becoming a Service Desk Analyst. Analysts don’t just fix tickets: they spot **patterns**.

Five people have reported the same Outlook problem since last night’s update. {senior} found the cause and the fix (it’s in the knowledge base under “Engineer’s note”). Please:
• triage the queue: priority and category (several people are affected now),
• reply to each Outlook user with the fix, and resolve their tickets,
• write a short **knowledge-base article in Docs** (symptoms, cause, resolution) so users can fix it themselves next time.

There’s one ticket in the queue that has nothing to do with Outlook. Don’t let it hide.

Ravi`,
  },
  whyItMatters:
    'When many tickets share one cause, fixing them one at a time wastes everyone’s time. Recognising a pattern, applying one tested fix consistently, and documenting it for self-service is how a service desk scales.',
  objectives: [
    'Recognise several tickets as one problem',
    'Apply and communicate a fix consistently',
    'Write a clear knowledge-base article for users',
  ],
  steps: [
    {
      id: 'triage',
      title: 'Triage the queue',
      instructions:
        'Read the **Engineer’s note** in the knowledge base. Set the priority and category of every ticket. Five people with the same problem is more than “one person with a workaround”.',
      hint: 'Several people affected: P2. The odd one out is a request.',
    },
    {
      id: 'resolve',
      title: 'Reply and resolve',
      instructions:
        'Reply to each Outlook user with the fix in numbered steps, and set their tickets to **Resolved**.',
    },
    {
      id: 'article',
      title: 'Write the knowledge-base article',
      instructions:
        'In **Docs**, open **KB: Outlook says Disconnected** and write the article with three headings: **Symptoms**, **Cause** and **Resolution** (numbered steps). 120 to 500 words.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions:
        'Reply to {manager}’s email with the ticket queue and the article attached.',
    },
  ],
  queue: {
    title: 'Service desk: Thursday morning',
    categories: IT_CATEGORIES,
    knowledge: [
      PRIORITY_GUIDE,
      CATEGORY_GUIDE,
      STATUS_GUIDE,
      WRITING_GUIDE,
      {
        title: 'Engineer’s note: Outlook “Disconnected” after the update',
        body: `Cause: last night’s Office update reset Outlook’s connection settings on some laptops.
Fix (tested):
1. Close Outlook completely and open it again.
2. If it still says Disconnected: File > Account Settings > Account Settings, select the account and click Repair.
3. Restart Outlook when the repair finishes. Mail and calendars sync within a few minutes.
Webmail and phones are not affected and can be used meanwhile.`,
      },
    ],
    tickets: [
      ...outlook.map(([id, from, department, received, body]) => ({
        id,
        from,
        department,
        received,
        subject: 'Outlook not receiving email',
        body,
      })),
      {
        id: 'INC-2206',
        from: 'Omar Haddad',
        department: 'Operations',
        received: '09:12',
        subject: 'Request: a second monitor',
        body: 'Could I get a second monitor for my desk? Whenever there is one spare.',
      },
    ],
  },
  ticketSolution: {
    ...Object.fromEntries(
      outlook.map(([id]) => [
        id,
        { priority: 'P2' as const, category: 'Email', status: 'resolved' as const },
      ]),
    ),
    'INC-2206': { priority: 'P4', category: 'Hardware' },
  },
  ticketChecks: [
    {
      id: 'priorities',
      type: 'field',
      field: 'priority',
      title: 'Priorities',
      points: 15,
      why: 'Five people with the same fault is a bigger problem than one.',
      hint: 'Several people affected is P2; a request for a monitor is P4.',
    },
    {
      id: 'categories',
      type: 'field',
      field: 'category',
      title: 'Categories',
      points: 10,
      why: 'Grouping the Outlook tickets under Email shows the pattern in the reports.',
      hint: 'Outlook problems are Email; a monitor is Hardware.',
    },
    {
      id: 'resolved',
      type: 'field',
      field: 'status',
      tickets: outlook.map(([id]) => id),
      title: 'Outlook tickets resolved',
      points: 10,
      why: 'Closing the tickets tells the users, and the team, that it is fixed.',
      hint: 'Set the five Outlook tickets to Resolved after replying.',
    },
    {
      id: 'fix-reply',
      type: 'reply',
      ticket: 'INC-2201',
      mentions: [
        ['Hi Maria', 'Hello Maria', 'Dear Maria'],
        ['Repair'],
        ['Account Settings'],
        ['restart', 'close', 'open it again'],
      ],
      minWords: 40,
      title: 'The fix explained (to Maria)',
      points: 15,
      why: 'A complete, numbered fix means the user does not have to come back.',
      hint: 'Give the three steps from the engineer’s note, including Account Settings and Repair.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'KB: Outlook says Disconnected',
      template: 'blank',
      checks: [
        {
          id: 'kb-sections',
          type: 'sections',
          title: 'Article structure',
          sections: [['Symptoms'], ['Cause'], ['Resolution', 'Fix', 'Solution']],
          points: 20,
          why: 'Users scan for “is this my problem?” (symptoms) and then “what do I do?” (resolution).',
          hint: 'Use three headings: Symptoms, Cause and Resolution.',
        },
        {
          id: 'kb-steps',
          type: 'mentions',
          title: 'The steps that fix it',
          terms: [['Repair'], ['Account Settings'], ['webmail', 'phone']],
          points: 15,
          why: 'The article must be enough to fix it without calling the desk.',
          hint: 'Include the repair steps, and mention that webmail or phones work in the meantime.',
        },
        {
          id: 'kb-length',
          type: 'length',
          min: 120,
          max: 500,
          title: 'Length',
          points: 5,
          why: 'Knowledge-base articles are read in a hurry. Short and complete.',
          hint: 'Aim for 120 to 500 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 160,
  skills: {
    'incident-management': 35,
    'technical-writing': 35,
    troubleshooting: 20,
    'customer-service': 15,
  },
  feedback: {
    excellent: `Hi {name},

That is how analysts work: pattern spotted, every user sorted, and an article that will stop the next twenty tickets. I’m publishing it today.

Ravi`,
    good: `Hi {name},

Good handling. A few details to tidy; see the notes.

Ravi`,
    pass: `Hi {name},

The pattern is right, but some tickets or the article need more work. Check the notes.

Ravi`,
    fail: `Hi {name},

Not yet. Start with the engineer’s note and work through the queue ticket by ticket.

Ravi`,
  },
}
