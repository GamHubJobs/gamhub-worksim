import type { AssignmentInput } from '../../schemas'
import { IT_CATEGORIES, STATUS_GUIDE, WRITING_GUIDE } from './knowledge'

/**
 * IT 2 (Service Desk Trainee): reply to users. Four common requests, each
 * needing a clear, polite reply that solves the problem or asks the right
 * questions. Teaches: written customer service, troubleshooting steps,
 * gathering information, and following policy.
 */
export const userReplies: AssignmentInput = {
  id: 'user-replies',
  version: 1,
  careerId: 'it-support',
  levelId: 'service-desk-trainee',
  order: 2,
  title: 'Reply to users',
  summary:
    'Answer four common requests with clear, polite replies that follow our guides.',
  estimatedMinutes: 30,
  from: 'manager',
  kind: 'tickets',
  briefing: {
    subject: 'Four tickets that need good replies',
    body: `Hi {name},

Great triage yesterday. Today: **replies**. Most tickets are solved by writing, not by walking over to someone’s desk, so how you write matters as much as what you know.

I’ve given you four tickets. Use the knowledge base for each one: a forgotten password, a printer, a VPN error and an access request. Reply to each user, and set each ticket to the right status (if you’re waiting for the user, it’s **Pending**).

Ravi`,
  },
  whyItMatters:
    'Users judge IT by how they are treated as much as by whether the problem is fixed. Clear replies with numbered steps solve problems faster, cut repeat tickets, and make people trust the service desk.',
  objectives: [
    'Write clear, friendly replies with numbered steps',
    'Point users to self-service where it exists',
    'Ask the questions that make diagnosis possible',
    'Follow access and approval policy',
  ],
  steps: [
    {
      id: 'guides',
      title: 'Read the guides',
      instructions:
        'Open the **Knowledge base** and read “Writing to users”, then the guide for each kind of problem.',
    },
    {
      id: 'reply',
      title: 'Reply to each ticket',
      instructions:
        'For each ticket, write a reply that greets the user, explains the steps or asks what you need, and says what happens next.',
      hint: 'For the VPN error you cannot fix anything yet: ask for the exact error message, when it happens, and which connection they use.',
    },
    {
      id: 'status',
      title: 'Set the statuses',
      instructions:
        'You are waiting for the user on all four, so set each one to **Pending**. Then submit from the **Task** pane.',
    },
  ],
  queue: {
    title: 'Service desk: replies',
    categories: IT_CATEGORIES,
    knowledge: [
      WRITING_GUIDE,
      STATUS_GUIDE,
      {
        title: 'Forgotten passwords',
        body: `Users reset their own password at reset.cobaltridge.example: they enter their username and a code sent to their phone. IT never asks for or sets passwords by email. If the phone number is out of date, they come to the service desk with ID.`,
      },
      {
        title: 'Printer shows “offline”',
        body: `1. Check the printer is switched on and has no error on its screen (paper, jam).
2. Switch the printer off and on again, and wait two minutes.
3. On the laptop, remove the printer and add it again: \\\\print01\\Floor2.
If it is still offline, reply to the ticket and we will visit.`,
      },
      {
        title: 'VPN errors',
        body: `Before we can help we need: the exact error message (a screenshot is best), when it happens (always, or at certain times), and which connection they are on (home Wi-Fi, mobile hotspot, hotel).`,
      },
      {
        title: 'Access to shared drives',
        body: `Access to a shared drive needs approval from the user’s manager. Ask the user to have their manager reply to the ticket approving it; we grant access once the approval arrives.`,
      },
    ],
    tickets: [
      {
        id: 'INC-2101',
        from: 'Hannah Fischer',
        department: 'Sales',
        received: '10:02',
        subject: 'Forgot my password',
        body: 'I came back from leave and cannot remember my password. Can you reset it and email me the new one?',
      },
      {
        id: 'INC-2102',
        from: 'Ben Adeyemi',
        department: 'Finance',
        received: '10:15',
        subject: 'Printer says offline',
        body: 'The second-floor printer shows as offline on my laptop, and I need to print invoices this afternoon.',
      },
      {
        id: 'INC-2103',
        from: 'Chloe Martin',
        department: 'Marketing',
        received: '10:24',
        subject: 'VPN error',
        body: 'The VPN gives me an error and won’t connect.',
      },
      {
        id: 'INC-2104',
        from: 'Omar Haddad',
        department: 'Operations',
        received: '10:40',
        subject: 'Access to the Finance shared drive',
        body: 'Could I have access to the Finance shared drive? I need the supplier lists for a project.',
      },
    ],
  },
  ticketSolution: {
    'INC-2101': { status: 'pending' },
    'INC-2102': { status: 'pending' },
    'INC-2103': { status: 'pending' },
    'INC-2104': { status: 'pending' },
  },
  ticketChecks: [
    {
      id: 'password-reply',
      type: 'reply',
      ticket: 'INC-2101',
      mentions: [
        ['Hi Hannah', 'Hello Hannah', 'Dear Hannah'],
        ['reset.cobaltridge.example'],
        ['phone', 'code'],
      ],
      minWords: 30,
      title: 'Password reply',
      points: 20,
      why: 'Self-service is faster for the user, and passwords never travel by email.',
      hint: 'Send Hannah to reset.cobaltridge.example and explain the phone code. Do not offer to email a password.',
    },
    {
      id: 'printer-reply',
      type: 'reply',
      ticket: 'INC-2102',
      mentions: [
        ['Hi Ben', 'Hello Ben', 'Dear Ben'],
        ['off and on', 'restart', 'switch'],
        ['paper', 'jam', 'error'],
        ['print01'],
      ],
      minWords: 40,
      title: 'Printer reply',
      points: 20,
      why: 'Numbered steps let the user fix it in five minutes instead of waiting for a visit.',
      hint: 'Give the three steps from the printer guide, including the address \\\\print01\\Floor2.',
    },
    {
      id: 'vpn-reply',
      type: 'reply',
      ticket: 'INC-2103',
      mentions: [
        ['Hi Chloe', 'Hello Chloe', 'Dear Chloe'],
        ['error message', 'exact error', 'screenshot'],
        ['when', 'what time'],
        ['Wi-Fi', 'wifi', 'connection', 'hotspot'],
      ],
      minWords: 30,
      title: 'VPN reply',
      points: 20,
      why: '“An error” cannot be diagnosed. Asking the right questions first saves everyone time.',
      hint: 'Ask for the exact error (or a screenshot), when it happens, and which connection Chloe uses.',
    },
    {
      id: 'access-reply',
      type: 'reply',
      ticket: 'INC-2104',
      mentions: [['Hi Omar', 'Hello Omar', 'Dear Omar'], ['manager'], ['approv']],
      minWords: 25,
      title: 'Access request reply',
      points: 20,
      why: 'Access to sensitive data needs the manager’s approval, every time.',
      hint: 'Ask Omar to have his manager reply to the ticket approving the access.',
    },
    {
      id: 'statuses',
      type: 'field',
      field: 'status',
      title: 'Statuses',
      points: 20,
      why: 'Pending tells the team that the ball is in the user’s court.',
      hint: 'You are waiting for the user on all four tickets: set them to Pending.',
    },
  ],
  passScore: 70,
  xp: 120,
  skills: { 'customer-service': 40, troubleshooting: 30, 'technical-writing': 20 },
  feedback: {
    excellent: `Hi {name},

These replies are exactly what our users need: friendly, clear and complete. Hannah has already reset her password herself. Great work.

Ravi`,
    good: `Hi {name},

Good replies. One or two are missing something; see the notes.

Ravi`,
    pass: `Hi {name},

The replies need more detail. Use the guides: they tell you exactly what each user needs to hear.

Ravi`,
    fail: `Hi {name},

Not yet. Read “Writing to users” and the guide for each ticket, then reply again.

Ravi`,
  },
}
