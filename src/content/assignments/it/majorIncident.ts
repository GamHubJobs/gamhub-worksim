import type { AssignmentInput } from '../../schemas'
import { IT_CATEGORIES, PRIORITY_GUIDE, STATUS_GUIDE, WRITING_GUIDE } from './knowledge'

/**
 * IT 4 (Senior Support Analyst): a major incident. Email is down for the
 * whole company. Triage the flood of tickets, keep users informed, and after
 * the fix write the incident report and brief management. Teaches: major
 * incident handling, communication under pressure, post-incident reviews.
 */
const reports: Array<[string, string, string, string, string]> = [
  [
    'INC-2301',
    'Maria Lopez',
    'Sales',
    '09:05',
    'Email is completely down for me. Outlook and webmail both say “cannot connect to server”.',
  ],
  ['INC-2302', 'James Carter', 'Finance', '09:07', 'No email at all. Is it just me?'],
  [
    'INC-2303',
    'Sophie Turner',
    'Marketing',
    '09:09',
    'Webmail shows a certificate warning, then fails. Our campaign goes out at 11!',
  ],
  [
    'INC-2304',
    'Liam O’Brien',
    'Operations',
    '09:12',
    'Email down for the whole operations team.',
  ],
  [
    'INC-2305',
    'Grace Okafor',
    'People & Culture',
    '09:15',
    'Can’t send or receive. I have interview confirmations to send.',
  ],
  [
    'INC-2306',
    'Daniel Kim',
    'Sales',
    '09:21',
    'Clients say their emails to us are bouncing back!',
  ],
]

export const majorIncident: AssignmentInput = {
  id: 'major-incident',
  version: 1,
  careerId: 'it-support',
  levelId: 'senior-support-analyst',
  order: 10,
  title: 'Major incident: email outage',
  summary:
    'Run the service desk side of a company-wide outage, then report it and brief management.',
  estimatedMinutes: 60,
  from: 'manager',
  kind: 'tickets',
  briefing: {
    subject: 'MAJOR INCIDENT: email down',
    body: `Hi {name},

Email is down for the whole company: Outlook, webmail, and mail from outside. This is a major incident and, as a Senior Support Analyst, you’re running the service desk side while {senior} and the infrastructure team fix it.

1. **The queue**: tickets are pouring in. Triage them (this is as critical as it gets), keep them open, and send one clear update to Maria, who reported it first, saying what we know, what users can do meanwhile, and when the next update will be.
2. **The report**: it’s now fixed. The engineers’ timeline and cause are in the knowledge base. Write the **incident report in Word Craft**: summary, timeline, impact, root cause and actions to stop it happening again.
3. **The briefing**: {director} wants a short **briefing in Deck Craft** for the management meeting.

Reply with all three files when you’re done.

Ravi`,
  },
  whyItMatters:
    'Major incidents are where a service desk earns its reputation. Fast triage, calm and regular communication, and an honest post-incident review that prevents a repeat matter more to the business than the technical fix itself.',
  objectives: [
    'Triage a flood of tickets as one major incident',
    'Communicate clearly to users during an outage',
    'Write a structured post-incident report',
    'Brief management on cause, impact and prevention',
  ],
  steps: [
    {
      id: 'triage',
      title: 'Triage and communicate',
      instructions:
        'Set every outage ticket to **P1**, **Email**, status **Open**. The other ticket is unrelated: triage it normally. Reply to **Maria (INC-2301)** with an update.',
      hint: 'A good update says: we know, we are working on it, what to use meanwhile (phones, Teams), and when the next update is.',
    },
    {
      id: 'report',
      title: 'Write the incident report',
      instructions:
        'In **Word Craft**, open **Incident report: email outage**. Use headings for the summary, timeline, impact, root cause and actions. Use the engineers’ timeline from the knowledge base.',
    },
    {
      id: 'briefing',
      title: 'Prepare the briefing',
      instructions:
        'In **Deck Craft**, open **Email outage briefing**: 3 to 6 slides, including a timeline and next steps.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions:
        'Reply to {manager}’s email with the queue, the report and the briefing attached.',
    },
  ],
  queue: {
    title: 'Service desk: major incident',
    categories: IT_CATEGORIES,
    knowledge: [
      PRIORITY_GUIDE,
      STATUS_GUIDE,
      WRITING_GUIDE,
      {
        title: 'Engineers’ timeline: email outage',
        body: `09:00 Mail server security certificate expires; Outlook, webmail and incoming mail fail.
09:05 First user report (INC-2301).
09:20 Infrastructure team identifies the expired certificate.
10:10 New certificate installed; mail starts flowing.
10:40 All queued mail delivered; service confirmed normal.
Impact: about 120 staff without email for 70 minutes; external mail delayed (none lost).
Cause: the certificate renewal reminder went to the inbox of an engineer who left in the summer.
Actions: automatic certificate renewal; certificate expiry monitoring with alerts to the team mailbox.`,
      },
    ],
    tickets: [
      ...reports.map(([id, from, department, received, body]) => ({
        id,
        from,
        department,
        received,
        subject: 'Email not working',
        body,
      })),
      {
        id: 'INC-2307',
        from: 'Ben Adeyemi',
        department: 'Finance',
        received: '09:24',
        subject: 'Keyboard missing a key',
        body: 'The “E” key came off my keyboard. I can still type with it. Could I have a new keyboard when things calm down?',
      },
    ],
  },
  ticketSolution: {
    ...Object.fromEntries(
      reports.map(([id]) => [
        id,
        { priority: 'P1' as const, category: 'Email', status: 'open' as const },
      ]),
    ),
    'INC-2307': { priority: 'P4', category: 'Hardware' },
  },
  ticketChecks: [
    {
      id: 'priorities',
      type: 'field',
      field: 'priority',
      title: 'Priorities',
      points: 10,
      why: 'Company-wide email failure is P1; everything else waits.',
      hint: 'All the outage tickets are P1. The keyboard is P4.',
    },
    {
      id: 'categories',
      type: 'field',
      field: 'category',
      title: 'Categories',
      points: 5,
      why: 'Grouped tickets show the scale of the incident.',
      hint: 'Outage tickets are Email; the keyboard is Hardware.',
    },
    {
      id: 'open',
      type: 'field',
      field: 'status',
      tickets: reports.map(([id]) => id),
      title: 'Outage tickets kept open',
      points: 5,
      why: 'Tickets stay open until users confirm email works again.',
      hint: 'Set the six outage tickets to Open.',
    },
    {
      id: 'update',
      type: 'reply',
      ticket: 'INC-2301',
      mentions: [
        ['Hi Maria', 'Hello Maria', 'Dear Maria'],
        ['working on', 'investigating', 'aware'],
        ['update'],
        ['phone', 'Teams', 'meanwhile', 'in the meantime'],
      ],
      minWords: 40,
      title: 'Update to users',
      points: 15,
      why: 'During an outage, regular updates stop the flood of “is it just me?” tickets.',
      hint: 'Say we know about it and are working on it, suggest what to use meanwhile, and when the next update will be.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Incident report: email outage',
      template: 'report',
      checks: [
        {
          id: 'report-sections',
          type: 'sections',
          title: 'Incident report structure',
          sections: [
            ['Summary'],
            ['Timeline'],
            ['Impact'],
            ['Root cause', 'Cause'],
            ['Actions', 'Next steps', 'Recommendations'],
          ],
          points: 20,
          why: 'Every post-incident review answers the same five questions.',
          hint: 'Use headings: Summary, Timeline, Impact, Root cause, Actions.',
        },
        {
          id: 'report-facts',
          type: 'mentions',
          title: 'The facts of the incident',
          terms: [
            ['certificate'],
            ['70 minutes', '70 min'],
            ['120'],
            ['09:00', '9:00'],
            ['10:40'],
          ],
          points: 15,
          why: 'Reports are trusted when they are precise: when, how long, how many, why.',
          hint: 'Use the engineers’ timeline: the cause, the start and end times, the duration and the number of people affected.',
        },
        {
          id: 'report-prevention',
          type: 'mentions',
          title: 'Preventing a repeat',
          terms: [
            ['automatic', 'automate'],
            ['monitor', 'alert'],
          ],
          points: 10,
          why: 'An incident report is only useful if it stops the next incident.',
          hint: 'Include the two actions: automatic renewal and expiry monitoring.',
        },
      ],
    },
    {
      kind: 'slides',
      title: 'Email outage briefing',
      template: 'project-update',
      checks: [
        {
          id: 'briefing-length',
          type: 'length',
          min: 3,
          max: 6,
          title: 'Number of slides',
          points: 5,
          why: 'Management wants the story in a few minutes.',
          hint: 'Keep 3 to 6 slides; delete the template slides you do not need.',
        },
        {
          id: 'briefing-sections',
          type: 'sections',
          title: 'Timeline and next steps',
          sections: [['Timeline'], ['Next steps', 'Actions']],
          points: 10,
          why: 'Managers ask two questions: what happened, and what are we doing about it?',
          hint: 'Have a slide titled “Timeline” and one titled “Next steps”.',
        },
        {
          id: 'briefing-cause',
          type: 'mentions',
          title: 'The cause in plain words',
          terms: [['certificate']],
          points: 5,
          why: 'The cause should be clear to non-technical people too.',
          hint: 'Explain the expired certificate in one simple sentence.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: {
    'incident-management': 45,
    'technical-writing': 30,
    'customer-service': 20,
    troubleshooting: 10,
  },
  feedback: {
    excellent: `Hi {name},

A model incident: calm triage, a clear update to users, and a report and briefing that will make sure this never happens again. {director} was impressed.

Ravi`,
    good: `Hi {name},

Well handled. A few points to tighten in the write-up; see the notes.

Ravi`,
    pass: `Hi {name},

The incident was handled, but the report or briefing needs work before it goes upstairs. Check the notes.

Ravi`,
    fail: `Hi {name},

Not ready yet. Start with the queue, then build the report from the engineers’ timeline.

Ravi`,
  },
}
