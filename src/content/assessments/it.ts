/** Readiness assessments: it-support. */
import type { CaseInput } from '../cases/schema'
import { assessment, report } from './shared'

/** Level 2: an outage after a change. */
function itOutage(p: {
  version: string
  practical: string
  change: string
  users: number
  startedAgo: number
}) {
  const left = 240 - p.startedAgo
  return assessment({
    practical: p.practical,
    id: 'ready-it-practitioner',
    careerId: 'it-support',
    level: 2,
    title: 'Readiness assessment: an incident to resolve',
    summary: 'Investigate an outage, find its cause, resolve it and document it.',
    brief: `This assessment checks that you can handle an incident from start to finish.

Investigate why the Finance team cannot reach the shared drive, work out the time left on the target, decide how to resolve it, write the incident report in Word Craft, and update the affected users. You have 3 hours.`,
    whyItMatters:
      'Analysts at the next level own incidents end to end: diagnosis from evidence, a safe fix, clear communication and a record others can learn from.',
    objectives: [
      'Diagnose from evidence',
      'Resolve safely through the change process',
      'Document and communicate',
    ],
    evidence: [
      {
        id: 'ticket',
        title: 'The incident',
        text: `${p.users} people in Finance cannot open the shared drive (\\\\files01\\finance) since 9:10. It was logged ${p.startedAgo} minutes ago as P2 (4-hour target). People working over the VPN at home can open it.`,
      },
      {
        id: 'checks',
        title: 'What you have checked',
        table: {
          head: ['Check', 'Result'],
          rows: [
            ['Ping files01 by name', 'Name not found'],
            ['Ping files01 by IP address', 'Replies'],
            ['Change log', `${p.change} at 9:05: office DNS server settings updated`],
          ],
        },
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Diagnose',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'change',
            text: `The outage began just after change ${p.change}.`,
            issue: true,
            why: 'The DNS change at 9:05 was five minutes before the first failures.',
          },
          {
            id: 'server-up',
            text: 'The file server itself is running.',
            issue: true,
            why: 'It answers by IP address; only finding it by name fails, which points to DNS.',
          },
          {
            id: 'vpn',
            text: 'People on the VPN are affected too.',
            issue: false,
            why: 'They can open the drive, because the VPN uses different DNS servers.',
          },
          {
            id: 'restart',
            text: 'Restarting everyone’s laptop will fix it.',
            issue: false,
            why: 'The fault is in the office DNS settings, not the laptops.',
          },
        ],
      },
      {
        id: 'left',
        kind: 'figure',
        title: 'Time left',
        prompt: 'How many minutes are left within the 4-hour target?',
        points: 15,
        answer: left,
        tolerance: 0.5,
        unit: 'minutes',
        why: `4 hours is 240 minutes; ${p.startedAgo} have gone, so ${left} are left.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The fix',
        prompt: 'What do you do?',
        points: 15,
        options: [
          {
            id: 'rollback',
            label: `Ask the change owner to roll back ${p.change} through the emergency change process, then confirm the drive opens`,
            verdict: 'best',
            why: 'It fixes the cause quickly and safely, with the change properly recorded.',
          },
          {
            id: 'restart',
            label: 'Ask everyone in Finance to restart their laptops',
            verdict: 'poor',
            why: 'It wastes everyone’s time and cannot fix a DNS fault.',
          },
          {
            id: 'ip',
            label:
              'Map the drive by IP address on each laptop while you look for the cause',
            verdict: 'acceptable',
            why: 'A workaround that helps today, but it hides the real fault and must be undone later.',
          },
        ],
      },
      report(
        `Incident report: Finance shared drive`,
        [['Summary'], ['Cause', 'Root cause'], ['Resolution', 'Fix']],
        [{ label: 'the number of people affected', value: p.users }],
        [[p.change], ['DNS']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the Finance team',
        title: 'Update the users',
        prompt:
          'Write to the Finance team: what happened, that it is fixed, and what to do if it is not.',
        points: 20,
        minWords: 35,
        model: `Hi all, sorry for the trouble this morning. A change to the office network settings stopped computers finding the shared drive by name. We have reversed it and the shared drive is working again. If you still cannot open it, please restart your browser or reply to this email and we will help straight away. Thanks, {name}`,
        mentions: [
          ['sorry', 'apolog'],
          ['shared drive'],
          ['working', 'fixed', 'restored'],
        ],
        avoid: [
          {
            terms: ['DNS resolver', 'A record'],
            why: 'Users need plain words, not jargon.',
          },
        ],
      },
    ],
    skills: { troubleshooting: 25, 'incident-management': 20, 'technical-writing': 10 },
  })
}

/** Level 3: problem management from ticket trends. */
function itTrends(p: {
  version: string
  practical: string
  resets: number
  minutes: number
  printer: string
}) {
  const hours = Math.round(((p.resets * p.minutes * 0.75) / 60) * 10) / 10
  return assessment({
    practical: p.practical,
    id: 'ready-it-senior',
    careerId: 'it-support',
    level: 3,
    title: 'Readiness assessment: stop the repeat tickets',
    summary:
      'Find the patterns in last month’s tickets and propose fixes that remove them.',
    brief: `This assessment checks that you can improve the service, not just answer tickets.

Analyse last month’s tickets, estimate the time a fix would save, decide what to propose, write the problem report in Word Craft, and send your proposal to the IT manager. You have 3 hours.`,
    whyItMatters:
      'Senior analysts look for the causes behind repeated tickets. Removing a whole category of work frees the desk for problems that need people.',
    objectives: [
      'Find patterns in tickets',
      'Estimate the benefit of a fix',
      'Make a proposal',
    ],
    evidence: [
      {
        id: 'tickets',
        title: 'Last month’s tickets by category',
        table: {
          head: ['Category', 'Tickets', 'Average handling time', 'Priority'],
          rows: [
            ['Password resets', String(p.resets), `${p.minutes} minutes`, 'P3'],
            [`Printer (${p.printer})`, '22', '20 minutes', 'P4'],
            ['New starter set-up', '9', '90 minutes', 'P3'],
            ['Other', '31', 'varies', 'mixed'],
          ],
        },
      },
      {
        id: 'notes',
        title: 'Notes',
        text: `A self-service password reset tool (included in the company’s licences) is expected to remove about three quarters of reset tickets. All 22 printer tickets were for the same printer, ${p.printer}, which is 7 years old.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Find the patterns',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'resets',
            text: 'Password resets are the biggest single category.',
            issue: true,
            why: `${p.resets} tickets, more than any other category.`,
          },
          {
            id: 'printer',
            text: 'The printer tickets come from one printer.',
            issue: true,
            why: `All 22 were for ${p.printer}: a problem with one device, not with printing.`,
          },
          {
            id: 'all-resets',
            text: 'Self-service would remove every password ticket.',
            issue: false,
            why: 'About three quarters; some people will still need help.',
          },
          {
            id: 'p1',
            text: 'Most tickets are urgent (P1).',
            issue: false,
            why: 'None of these categories is P1: they are routine, which is why they can be removed.',
          },
        ],
      },
      {
        id: 'saved',
        kind: 'figure',
        title: 'Time saved',
        prompt:
          'About how many hours a month would self-service password reset save the desk? (One decimal place.)',
        points: 15,
        answer: hours,
        tolerance: 0.1,
        unit: 'hours',
        why: `${p.resets} tickets × ${p.minutes} minutes × 75% ÷ 60 = ${hours} hours.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your proposal',
        prompt: 'What do you propose?',
        points: 15,
        options: [
          {
            id: 'both',
            label: `Roll out self-service password reset and replace ${p.printer}`,
            verdict: 'best',
            why: 'Both remove the cause of a whole category of tickets, at little cost.',
          },
          {
            id: 'staff',
            label: 'Ask for another analyst to handle the volume',
            verdict: 'poor',
            why: 'It pays people to keep doing work that could be removed.',
          },
          {
            id: 'printer-only',
            label: `Replace ${p.printer} and leave password resets as they are`,
            verdict: 'acceptable',
            why: 'A good fix, but it leaves the biggest category untouched.',
          },
        ],
      },
      report(
        'Problem report: repeat tickets',
        [['Findings'], ['Recommendations', 'Proposal']],
        [{ label: 'the hours saved each month', value: hours }],
        [['self-service', 'self service'], [p.printer]],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the IT manager',
        title: 'Send your proposal',
        prompt:
          'Write to the IT manager: what you found, what you propose and the benefit.',
        points: 20,
        minWords: 40,
        model: `Hi, I have analysed last month’s tickets. Password resets are the biggest category, and self-service reset would save about ${hours} hours a month. All 22 printer tickets came from ${p.printer}, which is 7 years old, so I propose replacing it. The full problem report is attached. Thanks, {name}`,
        mentions: [[String(hours)], ['self-service', 'self service'], [p.printer]],
        avoid: [
          {
            terms: ['users are stupid', 'user error'],
            why: 'Describe the pattern, not the people.',
          },
        ],
      },
    ],
    skills: { 'incident-management': 25, troubleshooting: 15, 'technical-writing': 15 },
  })
}

/**
 * Level 4 (the final level): running the desk for a shift. Practical work in
 * the Help Desk (a cross-department outage, or a security incident) and the
 * judgement around it: priority, verification, containment, SLAs, handover.
 */
function itShift(p: {
  version: string
  practical: string
  received: string
  now: string
  minutesLeft: number
}) {
  return assessment({
    practical: p.practical,
    id: 'ready-it-lead',
    careerId: 'it-support',
    level: 4,
    title: 'Readiness assessment: run the service desk',
    summary:
      'Run the desk through a difficult shift: the practical work in the Help Desk, the decisions around it, and the handover.',
    brief: `This final assessment checks that you can run the service desk on your own.

Do the practical work in the Help Desk without the guide, judge what matters most in the shift below, work out the time left on a service level, decide what comes first, write the shift report in Word Craft, and hand over to the next lead. You have 3 hours.`,
    whyItMatters:
      'A service desk lead keeps the whole company working: the right thing first, safely, on time, and with everyone informed. This is everything the career has built up to.',
    objectives: [
      'Resolve real problems in the systems, unguided',
      'Prioritise by business impact and SLA',
      'Keep security procedure under pressure',
      'Hand over clearly',
    ],
    evidence: [
      {
        id: 'shift',
        title: 'The shift so far',
        table: {
          head: ['Ticket', 'What', 'Priority', 'Received'],
          rows: [
            [
              'INC-4101',
              'Shared drive down for Finance and Accounting',
              'P1',
              p.received,
            ],
            [
              'INC-4102',
              'A caller asks for a password reset “urgently, from the CEO’s office”',
              'P2',
              '09:20',
            ],
            ['INC-4103', 'One laptop slow, user can still work', 'P3', '08:50'],
            ['INC-4104', 'Request: second monitor', 'P4', '08:40'],
          ],
        },
      },
      {
        id: 'targets',
        title: 'Service levels',
        text: `P1: respond within 15 minutes, fix within 4 hours. P2: 1 hour and 8 hours. P3: 4 hours and 3 days. P4: 2 days and 5 days. It is now ${p.now}.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Judge the shift',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'p1-first',
            text: 'The shared drive comes first: a key service is down for two departments.',
            issue: true,
            why: 'Business impact decides: many people and a key service is P1.',
          },
          {
            id: 'verify',
            text: 'The caller must be verified before any reset, whoever they say they are.',
            issue: true,
            why: 'Urgency and seniority are classic pressure tactics; verification is never skipped.',
          },
          {
            id: 'oldest',
            text: 'The monitor request should be done first because it arrived first.',
            issue: false,
            why: 'Arrival order is not priority: it is P4.',
          },
          {
            id: 'contain-all',
            text: 'If an account might be compromised, disabling every account in Finance is the safe choice.',
            issue: false,
            why: 'Contain only what the evidence shows: blanket action stops people working and destroys trust.',
          },
        ],
      },
      {
        id: 'time-left',
        kind: 'figure',
        title: 'Time left on the P1',
        prompt: `INC-4101 arrived at ${p.received}. It is now ${p.now}. How many minutes are left before its resolution target?`,
        points: 15,
        answer: p.minutesLeft,
        tolerance: 0,
        unit: 'minutes',
        why: `A P1 must be fixed within 4 hours (240 minutes) of ${p.received}; at ${p.now} that leaves ${p.minutesLeft} minutes.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'What next',
        prompt: 'You are alone on the desk. What do you do next?',
        points: 15,
        options: [
          {
            id: 'p1-and-verify',
            label:
              'Work the shared drive, tell the caller you will call back on the extension on record to verify them, and update Finance and Accounting',
            verdict: 'best',
            why: 'The biggest impact first, security kept, and people informed.',
          },
          {
            id: 'reset-first',
            label: 'Reset the caller’s password first, since it is for the CEO’s office',
            verdict: 'poor',
            why: 'An unverified reset under pressure is how accounts are taken over.',
          },
          {
            id: 'in-order',
            label: 'Work the tickets in the order they arrived',
            verdict: 'acceptable',
            why: 'Everything gets done eventually, but the P1 waits behind a monitor request.',
          },
        ],
      },
      report(
        'Shift report',
        [['Summary', 'Overview'], ['Incidents'], ['Next steps', 'Handover']],
        [{ label: 'the minutes left on the P1 target', value: p.minutesLeft }],
        [['shared drive', 'file'], ['verif']],
      ),
      {
        id: 'handover',
        kind: 'reply',
        to: 'the next shift lead',
        title: 'Hand over',
        prompt:
          'Write the handover to the next shift lead: what is fixed, what is open and its SLA, and anything to watch.',
        points: 20,
        minWords: 40,
        model:
          'Hi, handover from today’s shift. The shared drive for Finance and Accounting (INC-4101, P1) is fixed and confirmed from a user’s laptop. The password reset request (INC-4102) is waiting: the caller could not be verified yet, so I will call back on the extension on record; please do not reset it on a call. The slow laptop and the monitor request are within their SLAs. The shift report is attached. Thanks, {name}',
        mentions: [['INC-4101', 'shared drive'], ['verif'], ['SLA', 'target']],
        avoid: [
          {
            terms: ['reset it anyway', 'just reset'],
            why: 'A handover must not pass on an unsafe shortcut.',
          },
        ],
      },
    ],
    skills: { 'incident-management': 25, 'access-control': 15, 'technical-writing': 15 },
  })
}

export const ASSESSMENTS_IT: Record<string, CaseInput[]> = {
  'ready-it-practitioner': [
    itOutage({
      version: 'a',
      practical: 'network-printing',
      change: 'CHG-221',
      users: 35,
      startedAgo: 90,
    }),
    itOutage({
      version: 'b',
      practical: 'directory-leaver',
      change: 'CHG-348',
      users: 28,
      startedAgo: 75,
    }),
  ],
  'ready-it-senior': [
    itTrends({
      version: 'a',
      practical: 'network-intranet',
      resets: 48,
      minutes: 12,
      printer: 'PR-2F-07',
    }),
    itTrends({
      version: 'b',
      practical: 'major-incident',
      resets: 60,
      minutes: 10,
      printer: 'PR-1G-03',
    }),
  ],
  'ready-it-lead': [
    // 09:05 to 11:20 is 135 minutes: 240 − 135 = 105 left.
    itShift({
      version: 'a',
      practical: 'company-outage',
      received: '09:05',
      now: '11:20',
      minutesLeft: 105,
    }),
    // 08:45 to 10:15 is 90 minutes: 240 − 90 = 150 left.
    itShift({
      version: 'b',
      practical: 'security-incident',
      received: '08:45',
      now: '10:15',
      minutesLeft: 150,
    }),
  ],
}
