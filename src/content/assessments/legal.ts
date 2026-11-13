/**
 * Readiness assessments: legal. Fictional jurisdiction (Westmark) and
 * clients; a simulation for learning, not legal advice.
 */
import type { CaseInput } from '../cases/schema'
import { billableHours } from '../../tools/legal/jurisdiction'
import { assessment, report } from './shared'

/** Level 2: a timesheet that overcharges. */
function timesheet(p: {
  version: string
  practical: string
  entries: Array<[string, number, boolean]>
  rate: number
}) {
  const hours =
    Math.round(
      p.entries.filter(([, , b]) => b).reduce((s, [, m]) => s + billableHours(m), 0) * 10,
    ) / 10
  const total = Math.round(hours * p.rate)
  return assessment({
    practical: p.practical,
    id: 'ready-law-paralegal',
    careerId: 'legal',
    level: 2,
    title: 'Readiness assessment: the month’s timesheet',
    summary: 'Check a timesheet, work out the correct bill, and explain the corrections.',
    brief: `This assessment checks that you can record and bill time accurately and honestly.

Check the timesheet, work out the correct billable hours, decide what to do, write a short billing note in Word Craft, and explain it to the client. You have 3 hours. (Fictional client; six-minute billing units.)`,
    whyItMatters:
      'Paralegals at the next level run matters’ billing. Honest, accurate bills are part of acting in the client’s best interests.',
    objectives: [
      'Apply billing units',
      'Keep non-billable time off the bill',
      'Explain a bill clearly',
    ],
    evidence: [
      {
        id: 'entries',
        title: `Timesheet (rate £${p.rate} an hour)`,
        table: {
          head: ['Work', 'Minutes', 'Billable?'],
          rows: p.entries.map(([work, minutes, billable]) => [
            work,
            String(minutes),
            billable ? 'Yes' : 'No (our own error)',
          ]),
        },
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Check the timesheet',
        prompt: 'Tick every statement that is true.',
        points: 15,
        findings: [
          {
            id: 'units',
            text: 'Each entry is rounded up to the next six minutes.',
            issue: true,
            why: 'Westmark billing is in six-minute units.',
          },
          {
            id: 'errors',
            text: 'Time spent correcting our own errors is billed to the client.',
            issue: false,
            why: 'Clients do not pay for the firm’s mistakes.',
          },
          {
            id: 'describe',
            text: 'Each entry should describe the work done.',
            issue: true,
            why: 'Clients are entitled to see what they pay for.',
          },
        ],
      },
      {
        id: 'hours',
        kind: 'figure',
        title: 'Billable hours',
        prompt: 'How many billable hours (in billing units)?',
        points: 10,
        answer: hours,
        tolerance: 0.05,
        unit: 'hours',
        why: `Rounding each billable entry up to six minutes gives ${hours} hours.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'What do you do?',
        prompt: 'The draft bill includes the correction time. What do you do?',
        points: 10,
        options: [
          {
            id: 'remove',
            label: 'Remove it and re-issue the draft bill',
            verdict: 'best',
            why: 'The client is billed only for work done for them.',
          },
          {
            id: 'leave',
            label: 'Leave it: it was work on the file',
            verdict: 'poor',
            why: 'Correcting our own mistakes is not the client’s cost.',
          },
        ],
      },
      report(
        'Billing note',
        [['Entries'], ['Corrections'], ['Total']],
        [{ label: 'the total in pounds', value: total }],
        [['unit', 'six minutes'], ['correct']],
      ),
      {
        id: 'explain',
        kind: 'reply',
        to: 'the client',
        title: 'Explain the bill',
        prompt: 'Explain the bill to the client: the total and what it covers.',
        points: 10,
        minWords: 35,
        mentions: [[total.toLocaleString('en-GB'), String(total)], ['hours']],
        model: `Dear client, this month’s bill is £${total.toLocaleString('en-GB')} for ${hours} hours of work at £${p.rate} an hour, recorded in six-minute units. It covers the work listed; time we spent correcting our own error is not charged. {name}`,
      },
    ],
    skills: { 'case-management': 30, 'professional-ethics': 20 },
  })
}

/** Level 3: a new matter with a deadline problem. */
function deadlineRisk(p: {
  wrong: string
  version: string
  practical: string
  days: number
  served: string
  due: string
}) {
  const late = Math.round((Date.parse(p.wrong) - Date.parse(p.due)) / 86_400_000)
  return assessment({
    practical: p.practical,
    id: 'ready-law-senior',
    careerId: 'legal',
    level: 3,
    title: 'Readiness assessment: the deadline that nearly slipped',
    summary:
      'Find a deadline that was calendared wrongly, fix it, and report what to change.',
    brief: `This assessment checks that you can manage deadlines and lead improvement.

A claim was served on ${p.served}; the defence was calendared wrongly. Work out the correct deadline, decide what to do, write a short report in Word Craft, and brief the partner. You have 3 hours. (Fictional jurisdiction; Westmark rules.)`,
    whyItMatters:
      'Senior paralegals keep the firm’s deadlines safe. Finding and fixing a slipped deadline, and the cause, protects clients.',
    objectives: [
      'Calculate a deadline with the rules',
      'Fix the cause, not just the date',
    ],
    evidence: [
      {
        id: 'rules',
        title: 'Westmark rules',
        text: `A defence is due ${p.days} days after service. A deadline on a weekend or a public holiday moves to the next working day.`,
      },
      {
        id: 'calendar',
        title: 'What was calendared',
        text: `Someone counted ${p.days} working days instead of calendar days, so the calendar shows ${p.wrong}. The real deadline is ${p.due}.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'What went wrong?',
        prompt: 'Tick every statement that is true.',
        points: 15,
        findings: [
          {
            id: 'calendar-days',
            text: 'The rule counts calendar days, not working days.',
            issue: true,
            why: 'Only the final day moves if it is a weekend or holiday.',
          },
          {
            id: 'later',
            text: 'A later date in the calendar is safe.',
            issue: false,
            why: 'Filing on the later date would be late.',
          },
          {
            id: 'check',
            text: 'A second person checking every deadline would catch this.',
            issue: true,
            why: 'A two-person check catches miscounts.',
          },
        ],
      },
      {
        id: 'days',
        kind: 'figure',
        title: 'How late?',
        prompt: 'How many days after the real deadline is the date in the calendar?',
        points: 10,
        answer: late,
        tolerance: 0,
        unit: 'days',
        why: `${p.wrong} is ${late} days after ${p.due}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'What do you do?',
        prompt: 'What do you do first?',
        points: 10,
        options: [
          {
            id: 'fix',
            label:
              'Correct the calendar now, tell the partner, and check every other deadline set the same way',
            verdict: 'best',
            why: 'Fixes this date and finds any others.',
          },
          {
            id: 'quiet',
            label: 'Correct it quietly',
            verdict: 'poor',
            why: 'Others may have been miscounted too, and the partner must know.',
          },
        ],
      },
      report(
        'Deadline report',
        [['What happened'], ['Correction'], ['Prevention']],
        [{ label: 'the defence period in days', value: p.days }],
        [['calendar days'], ['second', 'check']],
      ),
      {
        id: 'brief',
        kind: 'reply',
        to: 'the partner',
        title: 'Brief the partner',
        prompt: 'Brief the partner: the correct deadline and what you have changed.',
        points: 10,
        minWords: 35,
        mentions: [[p.due], ['calendar days'], ['check']],
        model: `Hi Eleanor, the defence deadline was miscounted in working days instead of calendar days. The correct deadline is ${p.due}; I have fixed the calendar and checked the other deadlines set the same week. I suggest a second person checks every new deadline. {name}`,
      },
    ],
    skills: { 'case-management': 30, accuracy: 20 },
  })
}

export const ASSESSMENTS_LEGAL: Record<string, CaseInput[]> = {
  'ready-law-paralegal': [
    timesheet({
      version: 'a',
      practical: 'legal-deadlines',
      rate: 160,
      entries: [
        ['Drafting a letter', 50, true],
        ['Call with the client', 14, true],
        ['Re-doing a misfiled form', 20, false],
        ['Reviewing documents', 33, true],
      ],
    }),
    timesheet({
      version: 'b',
      practical: 'legal-research',
      rate: 180,
      entries: [
        ['Research on quality', 40, true],
        ['Correcting a date I entered wrongly', 15, false],
        ['Meeting with the client', 61, true],
        ['Email to the other side', 8, true],
      ],
    }),
  ],
  'ready-law-senior': [
    deadlineRisk({
      version: 'a',
      practical: 'legal-contract',
      days: 21,
      served: '2026-03-02',
      wrong: '2026-03-31',
      due: '2026-03-23',
    }),
    deadlineRisk({
      version: 'b',
      practical: 'legal-disclosure',
      days: 21,
      served: '2026-03-07',
      wrong: '2026-04-08',
      due: '2026-03-30',
    }),
  ],
}
