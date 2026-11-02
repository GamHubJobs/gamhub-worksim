/** Advanced cases: it-support. */
import type { CaseInput } from '../schema'
import { replies, OUTCOMES } from './shared'

/** IT Help Desk: a director's request against an outage affecting 40 people. */
const itPriority: CaseInput = {
  id: 'adv-it-priority-pressure',
  version: 1,
  careerId: 'it-support',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'Pressure to jump the queue',
  summary:
    'The CEO’s office wants a monitor fixed first while email is failing for 40 people.',
  from: {
    name: 'Paula Reid',
    role: 'Executive Assistant to the CEO',
    organisation: 'Executive Office',
  },
  trigger: {},
  deadlineHours: 4,
  email: {
    subject: 'URGENT: CEO’s monitor (INC-3102)',
    body: `Hi,

The CEO’s second monitor keeps flickering and she has a board presentation tomorrow. I need someone up here **now**, please. Can you make this your top priority?

Paula Reid
Executive Assistant to the CEO`,
  },
  whyItMatters:
    'A service desk prioritises by impact and urgency, not by who is asking. Saying so politely, and still helping senior people quickly with a workaround, is what keeps the desk trusted by everyone.',
  objectives: [
    'Prioritise work by impact and urgency',
    'Find a workaround that helps without delaying critical work',
    'Say no to a senior person politely, with a plan',
  ],
  evidence: [
    {
      id: 'queue',
      title: 'Your queue',
      table: {
        head: ['Ticket', 'Problem', 'People affected', 'Priority', 'Logged'],
        rows: [
          [
            'INC-3101',
            'Email not syncing for the Sales team',
            '40',
            'P2 (4-hour target)',
            '2.5 hours ago',
          ],
          [
            'INC-3102',
            'CEO’s second monitor flickers',
            '1',
            'P4 (3-day target)',
            '10 minutes ago',
          ],
          ['INC-3103', 'One user cannot print', '1', 'P4 (3-day target)', 'Yesterday'],
        ],
      },
    },
    {
      id: 'stock',
      title: 'Spare equipment',
      text: 'Two spare 24-inch monitors are in the IT store. A colleague, Sam, is free in 20 minutes and can deliver one.',
    },
  ],
  steps: [
    {
      id: 'triage',
      kind: 'review',
      title: 'Triage the queue',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'email-first',
          text: 'INC-3101 affects the most people and should be worked on first.',
          issue: true,
          why: 'Forty people without email is far greater impact than one flickering monitor.',
        },
        {
          id: 'seniority',
          text: 'A ticket from the CEO’s office automatically goes to the top of the queue.',
          issue: false,
          why: 'Priority comes from impact and urgency, not seniority, or the desk loses everyone else’s trust.',
        },
        {
          id: 'workaround',
          text: 'INC-3102 can get a quick workaround (a spare monitor) without delaying INC-3101.',
          issue: true,
          why: 'Sam can deliver a spare while you keep working on the outage.',
        },
        {
          id: 'breached',
          text: 'INC-3101 has already missed its 4-hour target.',
          issue: false,
          why: 'It was logged 2.5 hours ago, so there are 1.5 hours left.',
        },
      ],
    },
    {
      id: 'left',
      kind: 'figure',
      title: 'Time left on the outage',
      prompt: 'How many hours are left to fix INC-3101 within its target?',
      points: 20,
      answer: 1.5,
      tolerance: 0.01,
      unit: 'hours',
      why: 'A 4-hour target, logged 2.5 hours ago: 1.5 hours left.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'How do you handle the two tickets?',
      points: 25,
      options: [
        {
          id: 'workaround',
          label:
            'Keep working on the email outage; ask Sam to take the CEO a spare monitor in 20 minutes and fix the old one after',
          verdict: 'best',
          why: 'The biggest problem gets fixed first, and the CEO is sorted well before her presentation.',
          effects: { indicators: { satisfaction: 2 }, trust: { manager: 2 } },
        },
        {
          id: 'ceo-first',
          label: 'Go up to the CEO’s office now and come back to the email afterwards',
          verdict: 'poor',
          why: 'Forty people lose more working time, the outage may miss its target, and the desk is seen to serve rank, not need.',
          effects: { indicators: { satisfaction: -3, risk: 3 } },
        },
        {
          id: 'later',
          label:
            'Fix the email first and look at the monitor tomorrow, as its priority allows',
          verdict: 'acceptable',
          why: 'The priorities are right, but a cheap workaround was available today, before an important presentation.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Paula Reid, Executive Office',
      title: 'Reply to the CEO’s office',
      prompt:
        'Write to Paula: what will happen, when, and why the email outage comes first.',
      points: 25,
      minWords: 45,
      model:
        'Hi Paula, thanks for letting us know. Right now email is down for 40 people in Sales, so I need to keep working on that first. So the CEO is not held up, my colleague Sam will bring up a spare monitor in about 20 minutes, and we will fix the original after the presentation. Thanks for understanding, {name}',
      mentions: [
        ['email', '40'],
        ['spare', 'loan', 'replacement'],
        ['20 minutes', 'this morning', 'shortly'],
      ],
      avoid: [
        {
          terms: ['not important', 'low priority', 'can wait'],
          why: 'Explain the priority without belittling the request.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Paula',
    'The spare monitor is perfect, thank you, and thanks for explaining. The CEO said the same thing would have annoyed her if it were her email.',
  ),
  lapseLog: 'The CEO’s office heard nothing back and escalated to the IT manager.',
  skills: { 'incident-management': 25, 'customer-service': 20 },
  xp: 140,
}

/** IT Help Desk: a phishing email, and how far it got. */
const itPhishing: CaseInput = {
  id: 'adv-it-phishing',
  version: 1,
  careerId: 'it-support',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'A convincing phishing email',
  summary: 'Staff report a “password expiry” email; some people have already clicked it.',
  from: { name: 'Dev Malhotra', role: 'Office Manager', organisation: 'Operations' },
  trigger: {},
  deadlineHours: 4,
  email: {
    subject: 'Is this password email real?',
    body: `Hi,

Several people have had an email saying their password expires today, with a link to “keep your password”. A couple of us clicked it before we noticed the address looked odd. Is it real?

Dev`,
  },
  whyItMatters:
    'Phishing works because it looks routine. A fast, calm response (finding who is affected, securing their accounts, warning everyone without blame) limits the damage and makes people more willing to report the next one.',
  objectives: [
    'Assess how far a phishing attack got',
    'Secure the affected accounts',
    'Warn staff clearly and without blame',
  ],
  evidence: [
    {
      id: 'mail-log',
      title: 'Mail and sign-in logs (this morning)',
      table: {
        head: ['Measure', 'Value'],
        rows: [
          ['Recipients of the email', '64'],
          ['People who clicked the link', '9'],
          ['People who then entered their password', '4'],
          ['Sign-ins from an unknown country since', '1 (account j.ellis)'],
        ],
      },
    },
    {
      id: 'sender',
      title: 'The email',
      text: 'Sent from “it-support@cobaltridge-helpdesk.com” (our real address ends in cobaltridge.example). The link goes to a copy of our sign-in page.',
    },
  ],
  steps: [
    {
      id: 'assess',
      kind: 'review',
      title: 'How far did it get?',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'fake',
          text: 'The email is phishing: the sender’s domain is not ours.',
          issue: true,
          why: 'It imitates our help desk from a look-alike domain, and links to a fake sign-in page.',
        },
        {
          id: 'four-exposed',
          text: 'The 4 people who entered their password must be treated as compromised.',
          issue: true,
          why: 'Their passwords are now known to the attacker.',
        },
        {
          id: 'clicks-only',
          text: 'Everyone who clicked must have their laptop rebuilt.',
          issue: false,
          why: 'The page only asked for a password; clicking alone did not install anything.',
        },
        {
          id: 'in-use',
          text: 'One stolen password has already been used from outside the country.',
          issue: true,
          why: 'The sign-in log shows j.ellis signing in from an unknown country since the email.',
        },
      ],
    },
    {
      id: 'share',
      kind: 'figure',
      title: 'How many fell for it',
      prompt:
        'What percentage of the recipients entered their password? (One decimal place.)',
      points: 20,
      answer: 6.3,
      tolerance: 0.05,
      unit: '%',
      why: '4 ÷ 64 = 6.25%, or 6.3% to one decimal place.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do first',
      prompt: 'What do you do?',
      points: 25,
      options: [
        {
          id: 'secure',
          label:
            'Reset the 4 passwords and sign them out everywhere, block the sender’s domain, check j.ellis’s account activity, and warn all staff',
          verdict: 'best',
          why: 'It closes the attacker’s access first, stops more emails arriving, and investigates the account already used.',
          effects: { indicators: { risk: -4 }, trust: { manager: 2 } },
        },
        {
          id: 'warn-only',
          label: 'Send everyone a warning not to click the link',
          verdict: 'poor',
          why: 'The 4 stolen passwords still work, and one is already in use by the attacker.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'reset-all',
          label: 'Force a password reset for all 64 recipients today',
          verdict: 'acceptable',
          why: 'Safe, but slower and disruptive: the 4 compromised accounts need securing first, and the sender still needs blocking.',
          effects: { indicators: { satisfaction: -2, risk: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'All staff',
      title: 'Warn the staff',
      prompt:
        'Write to all staff: what the email is, what to do if they clicked, and thanks for reporting it.',
      points: 25,
      minWords: 45,
      model:
        'Hi all, thank you to everyone who reported this morning’s “password expiry” email: it is a phishing email and not from us. Please delete it. If you clicked the link and entered your password, contact the IT help desk now so we can reset it; we have already contacted the people we know about. Nobody is in trouble: reporting it quickly is exactly the right thing to do. Thanks, {name}',
      mentions: [['phishing', 'not from us', 'fake'], ['password'], ['thank', 'report']],
      avoid: [
        {
          terms: ['careless', 'should have known', 'stupid'],
          why: 'Blame makes people hide mistakes; thank them for reporting.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Dev',
    'Thanks, that was quick. Two more people came forward after your email, and their passwords are reset too.',
  ),
  lapseLog:
    'The phishing email stayed in people’s inboxes, and another password was stolen.',
  skills: { 'incident-management': 25, 'customer-service': 20 },
  xp: 140,
}

export const ADVANCED_IT: CaseInput[] = [itPriority, itPhishing]
