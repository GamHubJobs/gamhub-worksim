import type { AssignmentInput } from '../../schemas'
import { deadline, limitationDate } from '../../../tools/legal/jurisdiction'
import { addKeyDate, logTime } from '../../../tools/legal/model'
import { CHECK_NO_CONFLICT, firm, must } from './common'

/**
 * Law (trainee): deadlines and time. Teaches calculating court and
 * limitation deadlines by the rules, and recording time accurately.
 */
const start = firm((s) => ({
  ...s,
  matters: s.matters.map((m) =>
    m.id === 'M-2042' ? { ...m, status: 'open' as const, conflictChecked: true } : m,
  ),
  clients: s.clients.map((c) =>
    c.id === 'c2'
      ? { ...c, idVerified: true, idDocument: 'Passport', engagementSent: true }
      : c,
  ),
}))

const DEFENCE = deadline('2026-03-02', 21)
const LIMITATION = limitationDate('2026-01-19', 'employment')

function solution() {
  let s = must(addKeyDate(start, 'M-2041', 'Defence to counterclaim due', DEFENCE))
  s = must(addKeyDate(s, 'M-2042', 'Limitation: last day to bring the claim', LIMITATION))
  s = must(logTime(s, 'M-2041', 14, 'Reading Millstone’s counterclaim', true))
  s = must(
    logTime(s, 'M-2041', 60, 'Call with Maya Brightwater about the counterclaim', true),
  )
  s = must(
    logTime(
      s,
      'M-2041',
      30,
      'Correcting the date I entered wrongly in the calendar',
      false,
    ),
  )
  return s
}

export const legalDeadlines: AssignmentInput = {
  id: 'legal-deadlines',
  version: 1,
  careerId: 'legal',
  levelId: 'legal-trainee',
  order: 3,
  kind: 'tool',
  title: 'Two deadlines and a morning’s time',
  summary:
    'Calendar a court deadline and a limitation date by the rules, and record your time.',
  estimatedMinutes: 25,
  from: 'senior',
  briefing: {
    subject: 'Deadlines, and your timesheet',
    body: `Hi {name},

Two dates to calendar in **Matter Desk → Calendar**, worked out by the Westmark rules (use the calculator):

1. **M-2041:** Millstone served a counterclaim on **2 March 2026**. Our defence to it is due **21 days** after service. Calendar it as the “Defence to counterclaim due”.
2. **M-2042:** Jonah Pell was dismissed on **19 January 2026**. Employment claims must be brought within the limitation period. Calendar the last day as “Limitation”.

Then record this morning’s time on **M-2041** in **Time and billing**:
- 14 minutes reading Millstone’s counterclaim,
- 60 minutes on a call with Maya Brightwater about it,
- 30 minutes correcting a date you had entered wrongly: that one is **not billable** (we don’t charge clients for our own mistakes).

Tobias`,
  },
  whyItMatters:
    'Missed deadlines are the most common cause of claims against lawyers: a defence filed late can mean losing without a hearing. And accurate, honest time records are what clients pay on.',
  objectives: [
    'Calculate a court deadline with the rules',
    'Work out a limitation date',
    'Record time in billing units, and keep your own mistakes off the bill',
  ],
  steps: [
    {
      id: 'defence',
      title: 'The defence deadline',
      instructions:
        'Use the calculator: from 2026-03-02, 21 days. Check whether it lands on a weekend or holiday, then add it to M-2041.',
    },
    {
      id: 'limitation',
      title: 'The limitation date',
      instructions:
        'Choose M-2042: the calculator shows its limitation date. Add it to the calendar.',
    },
    {
      id: 'time',
      title: 'Your time',
      instructions:
        'Record the three entries on M-2041; untick **Billable** for the correction.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {senior}**.' },
  ],
  tool: {
    id: 'legal',
    title: 'Matter Desk: deadlines and time',
    start,
    solution: solution(),
    checks: [
      {
        id: 'defence',
        type: 'key-date',
        matter: 'M-2041',
        label: ['defence'],
        date: DEFENCE,
        title: 'Defence deadline calendared correctly',
        points: 30,
        why: `21 days from 2 March 2026 is ${DEFENCE}. A wrong date here can lose the case.`,
        hint: 'Use the calculator with 2026-03-02 and 21 days.',
      },
      {
        id: 'limitation',
        type: 'key-date',
        matter: 'M-2042',
        label: ['limitation'],
        date: LIMITATION,
        title: 'Limitation date calendared',
        points: 25,
        why: `Employment claims in Westmark must be brought within one year: by ${LIMITATION}.`,
        hint: 'Choose M-2042 in the calendar: the limitation date is shown under the calculator.',
      },
      {
        id: 'time',
        type: 'time',
        matter: 'M-2041',
        billableHours: 1.3,
        nonBillableMinutes: 30,
        title: 'Time recorded accurately',
        points: 35,
        why: '14 minutes is 0.3 hours in six-minute units, plus 1 hour: 1.3 hours billable. The correction is yours, not the client’s.',
        hint: 'Three entries; untick Billable for the 30 minutes correcting your mistake.',
      },
      CHECK_NO_CONFLICT,
    ],
  },
  passScore: 70,
  xp: 100,
  skills: { 'case-management': 45, accuracy: 30, 'professional-ethics': 10 },
  feedback: {
    excellent: `Hi {name},

Both dates right, and an honest timesheet. That is a good morning’s work.

Tobias`,
    good: `Hi {name},

Nearly; one detail to fix. See the notes.

Tobias`,
    pass: `Hi {name},

Check the dates again: deadlines have no margin for error.

Tobias`,
    fail: `Hi {name},

Not yet. Start with the defence deadline in the calculator.

Tobias`,
  },
}
