import type { AssignmentInput } from '../../schemas'
import {
  CATEGORY_GUIDE,
  IT_CATEGORIES,
  PRIORITY_GUIDE,
  SECURITY_GUIDE,
  STATUS_GUIDE,
  WRITING_GUIDE,
} from './knowledge'

/**
 * IT 1 (Service Desk Trainee): triage the morning queue. Set each ticket's
 * priority and category with the desk's rules, and handle a phishing report
 * properly. Teaches: impact and urgency, categorising, security first.
 */
const tickets: Array<
  [string, string, string, string, string, string, 'P1' | 'P2' | 'P3' | 'P4', string]
> = [
  [
    'INC-2041',
    'Maria Lopez',
    'Sales',
    '08:34',
    'Nobody on the 3rd floor has internet',
    'None of us on the third floor can get online since about half eight: around 25 people. Wired and Wi-Fi both. We have client calls from ten.',
    'P1',
    'Network',
  ],
  [
    'INC-2042',
    'James Carter',
    'Finance',
    '08:41',
    'Locked out of my account',
    'I typed my password wrong too many times and now I am locked out. I have the payroll run to finish by noon today.',
    'P2',
    'Access',
  ],
  [
    'INC-2043',
    'Aisha Bello',
    'HR',
    '08:52',
    'Second monitor flickers',
    'My second screen flickers now and then. I can still work on the laptop screen, so no rush.',
    'P3',
    'Hardware',
  ],
  [
    'INC-2044',
    'Liam O’Brien',
    'Operations',
    '09:03',
    'Suspicious email asking for my password',
    'I got an email from “IT Support” asking me to confirm my password at a link. It looks odd so I have not clicked anything. Is it real?',
    'P1',
    'Security',
  ],
  [
    'INC-2045',
    'Sophie Turner',
    'Marketing',
    '09:10',
    'Request: Canva desktop app',
    'Could I have the Canva desktop app installed when someone has time? Not urgent at all.',
    'P4',
    'Software',
  ],
  [
    'INC-2046',
    'Daniel Kim',
    'Sales',
    '09:18',
    'Shared calendars missing in Outlook',
    'Since yesterday I cannot see the team’s shared calendar in Outlook. It still shows in the web version, so I am using that.',
    'P3',
    'Email',
  ],
  [
    'INC-2047',
    'Grace Okafor',
    'People & Culture',
    '09:25',
    'VPN keeps dropping at home',
    'When I work from home the VPN disconnects every ten minutes or so. I reconnect and carry on, but it is annoying.',
    'P3',
    'Network',
  ],
  [
    'INC-2048',
    'Tom Becker',
    'Facilities',
    '09:31',
    'New starter on Monday',
    'Ella Watts starts in Facilities next Monday. Could she have a laptop and an account ready please?',
    'P4',
    'Access',
  ],
]

export const triageQueue: AssignmentInput = {
  id: 'triage-queue',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-trainee',
  order: 1,
  title: 'Triage the morning queue',
  summary:
    'Set the priority and category of every ticket, and deal with a phishing report.',
  estimatedMinutes: 25,
  from: 'manager',
  kind: 'tickets',
  briefing: {
    subject: 'Your first task: the morning queue',
    body: `Hi {name},

Welcome to the service desk! Every morning starts the same way: **triage**. Before anyone fixes anything, each new ticket gets a priority (how urgent and how big is it?) and a category (which kind of problem?), so the right person picks up the right ticket first.

Open the Help Desk and go through this morning’s eight tickets. The knowledge base on the right has our rules. One of them looks like a phishing email: handle that one properly, and reply to the person who reported it.

Ravi`,
  },
  whyItMatters:
    'Triage decides what gets fixed first. A wrong priority can leave a whole floor offline while someone installs an app, and a missed security report can turn into a breach. Getting priority and category right is the first skill of every support role.',
  objectives: [
    'Set priority by impact and urgency',
    'Categorise tickets so they reach the right team',
    'Recognise and escalate a security incident',
    'Reply to a user clearly and reassuringly',
  ],
  steps: [
    {
      id: 'read',
      title: 'Read the rules',
      instructions:
        'In the **Help Desk**, open the **Knowledge base** on the right and read “How to set the priority” and “Choosing the category”.',
    },
    {
      id: 'triage',
      title: 'Triage every ticket',
      instructions:
        'For each of the eight tickets, set the **Priority** and the **Category**. Ask: how many people are affected, and can they still work?',
      hint: 'A whole floor offline is P1; one person blocked on work due today is P2; one person with a workaround is P3; a request is P4.',
    },
    {
      id: 'phishing',
      title: 'Handle the phishing report',
      instructions:
        'For INC-2044, follow “Phishing reports”: set it to **P1**, **Security**, status **Escalated**, and reply to Liam.',
      hint: 'Thank Liam, tell him to delete the email without clicking anything, and remind him IT never asks for passwords.',
    },
    {
      id: 'submit',
      title: 'Submit',
      instructions: 'Open the **Task** pane and submit your triage to {manager}.',
    },
  ],
  queue: {
    title: 'Service desk: Tuesday morning',
    categories: IT_CATEGORIES,
    knowledge: [
      PRIORITY_GUIDE,
      CATEGORY_GUIDE,
      STATUS_GUIDE,
      SECURITY_GUIDE,
      WRITING_GUIDE,
    ],
    tickets: tickets.map(([id, from, department, received, subject, body]) => ({
      id,
      from,
      department,
      received,
      subject,
      body,
    })),
  },
  ticketSolution: Object.fromEntries(
    tickets.map(([id, , , , , , priority, category]) => [
      id,
      id === 'INC-2044'
        ? { priority, category, status: 'escalated' }
        : { priority, category },
    ]),
  ),
  ticketChecks: [
    {
      id: 'priorities',
      type: 'field',
      field: 'priority',
      title: 'Priorities',
      points: 35,
      why: 'Priority decides what gets fixed first, and how fast.',
      hint: 'Use the priority guide: impact (how many people) and urgency (can they still work?).',
    },
    {
      id: 'categories',
      type: 'field',
      field: 'category',
      title: 'Categories',
      points: 30,
      why: 'The category sends the ticket to the team that can fix it.',
      hint: 'Use the category guide in the knowledge base.',
    },
    {
      id: 'escalation',
      type: 'field',
      field: 'status',
      tickets: ['INC-2044'],
      title: 'Security incident escalated',
      points: 15,
      why: 'Phishing is handled by the Security team, immediately.',
      hint: 'Set INC-2044 to Escalated.',
    },
    {
      id: 'phishing-reply',
      type: 'reply',
      ticket: 'INC-2044',
      mentions: [['thank'], ['delete'], ['never ask', 'will never', 'never request']],
      minWords: 30,
      title: 'Reply to the phishing report',
      points: 20,
      why: 'A good reply protects the user and encourages people to keep reporting.',
      hint: 'Thank Liam, tell him to delete the email, and that IT will never ask for his password.',
    },
  ],
  passScore: 70,
  xp: 100,
  skills: {
    troubleshooting: 30,
    'incident-management': 30,
    'customer-service': 20,
    accuracy: 15,
  },
  feedback: {
    excellent: `Hi {name},

Textbook triage. The third floor got sorted first, payroll was saved, and the phishing report went straight to Security with a perfect reply to Liam. Welcome to the desk.

Ravi`,
    good: `Hi {name},

Good triage. A couple of tickets landed in the wrong place; see the notes.

Ravi`,
    pass: `Hi {name},

Some priorities need another look. Remember: the number of people affected matters most.

Ravi`,
    fail: `Hi {name},

Not yet. Read the priority guide again and have another go; it becomes second nature quickly.

Ravi`,
  },
}
