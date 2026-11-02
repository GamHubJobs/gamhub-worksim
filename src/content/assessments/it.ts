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

Investigate why the Finance team cannot reach the shared drive, work out the time left on the target, decide how to resolve it, write the incident report in Docs, and update the affected users. You have 3 hours.`,
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

Analyse last month’s tickets, estimate the time a fix would save, decide what to propose, write the problem report in Docs, and send your proposal to the IT manager. You have 3 hours.`,
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
}
