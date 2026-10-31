import type { AssignmentInput } from '../../schemas'

/**
 * Development 4 (Senior Developer): build the billing report feature from a
 * specification, with tests, and write a short design note. Teaches:
 * designing a function's behaviour (including errors), grouping and
 * sorting data, testing your own code, and explaining design decisions.
 */
const starter = `/**
 * The monthly billing report: what each client owes for the time we worked.
 *
 * entries: timesheet entries, e.g.
 *   { person: 'ana', client: 'Harbour Foods', hours: 7.5, billable: true }
 * rates: each person's hourly rate, e.g. { ana: 120, james: 95 }
 *
 * See the task email for exactly what the report must contain.
 */
export function buildBillingReport(entries, rates) {
  // TODO
}
`

const solution = `export function buildBillingReport(entries, rates) {
  const byClient = new Map()
  for (const entry of entries) {
    if (!entry.billable) continue
    const rate = rates[entry.person]
    if (rate === undefined) throw new Error('No rate for ' + entry.person)
    const line = byClient.get(entry.client) ?? { client: entry.client, hours: 0, amount: 0 }
    line.hours += entry.hours
    line.amount += entry.hours * rate
    byClient.set(entry.client, line)
  }
  const clients = [...byClient.values()]
    .map((line) => ({ ...line, amount: Math.round(line.amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount || a.client.localeCompare(b.client))
  const total = Math.round(clients.reduce((sum, line) => sum + line.amount, 0) * 100) / 100
  return { clients, total }
}
`

const starterTests = `import { buildBillingReport } from './billing.js'

test('one billable entry', () => {
  const report = buildBillingReport(
    [{ person: 'ana', client: 'Harbour Foods', hours: 2, billable: true }],
    { ana: 120 },
  )
  expect(report).toEqual({
    clients: [{ client: 'Harbour Foods', hours: 2, amount: 240 }],
    total: 240,
  })
})

// Add your own tests for the rest of the specification.
`

const solutionTests = `${starterTests}
const rates = { ana: 120, james: 95 }

test('groups by client and leaves out non-billable time', () => {
  const report = buildBillingReport(
    [
      { person: 'ana', client: 'A', hours: 1, billable: true },
      { person: 'james', client: 'A', hours: 2, billable: true },
      { person: 'ana', client: 'A', hours: 5, billable: false },
    ],
    rates,
  )
  expect(report.clients).toEqual([{ client: 'A', hours: 3, amount: 310 }])
})

test('sorts by amount, largest first', () => {
  const report = buildBillingReport(
    [
      { person: 'james', client: 'Small', hours: 1, billable: true },
      { person: 'ana', client: 'Big', hours: 3, billable: true },
    ],
    rates,
  )
  expect(report.clients.map((c) => c.client)).toEqual(['Big', 'Small'])
})

test('a missing rate is an error', () => {
  expect(() =>
    buildBillingReport([{ person: 'zoe', client: 'A', hours: 1, billable: true }], rates),
  ).toThrow('No rate for zoe')
})

test('no entries gives an empty report', () => {
  expect(buildBillingReport([], rates)).toEqual({ clients: [], total: 0 })
})
`

const reviewTests = `import { buildBillingReport } from './billing.js'

const rates = { ana: 120, james: 95, li: 87.5 }

test('a month of entries', () => {
  const report = buildBillingReport(
    [
      { person: 'ana', client: 'Harbour Foods', hours: 7.5, billable: true },
      { person: 'james', client: 'Northgate Motors', hours: 6, billable: true },
      { person: 'li', client: 'Harbour Foods', hours: 4.25, billable: true },
      { person: 'ana', client: 'Internal', hours: 3, billable: false },
      { person: 'james', client: 'Brightpath Clinics', hours: 1.5, billable: true },
      { person: 'li', client: 'Northgate Motors', hours: 2, billable: true },
    ],
    rates,
  )
  expect(report).toEqual({
    clients: [
      { client: 'Harbour Foods', hours: 11.75, amount: 1271.88 },
      { client: 'Northgate Motors', hours: 8, amount: 745 },
      { client: 'Brightpath Clinics', hours: 1.5, amount: 142.5 },
    ],
    total: 2159.38,
  })
})

test('non-billable time never appears, even for an unknown person', () => {
  const report = buildBillingReport(
    [
      { person: 'ana', client: 'A', hours: 1, billable: true },
      { person: 'visitor', client: 'B', hours: 4, billable: false },
    ],
    rates,
  )
  expect(report.clients).toEqual([{ client: 'A', hours: 1, amount: 120 }])
})

test('equal amounts are sorted by client name', () => {
  const report = buildBillingReport(
    [
      { person: 'ana', client: 'Zephyr', hours: 1, billable: true },
      { person: 'ana', client: 'Acorn', hours: 1, billable: true },
    ],
    rates,
  )
  expect(report.clients.map((c) => c.client)).toEqual(['Acorn', 'Zephyr'])
})

test('an unknown rate names the person', () => {
  expect(() =>
    buildBillingReport([{ person: 'omar', client: 'A', hours: 2, billable: true }], rates),
  ).toThrow('No rate for omar')
})

test('an empty month', () => {
  expect(buildBillingReport([], rates)).toEqual({ clients: [], total: 0 })
})
`

export const billingReport: AssignmentInput = {
  id: 'billing-report',
  version: 1,
  careerId: 'software-development',
  levelId: 'senior-developer',
  order: 4,
  kind: 'code',
  title: 'Build the billing report',
  summary:
    'Build a new feature from a specification, test it, and write a short design note.',
  estimatedMinutes: 60,
  from: 'manager',
  briefing: {
    subject: 'New feature: the monthly billing report',
    body: `Hi {name},

As a Senior Developer, you now own features from start to finish. Finance wants a monthly billing report from the timesheet app: what each client owes for the time we worked.

**The specification** for buildBillingReport(entries, rates) in billing.js:
• only **billable** entries count; non-billable time is left out completely,
• each client’s line has its **client** name, total **hours** and **amount** (hours × the person’s hourly rate, added up, rounded to pennies),
• clients are sorted by amount, **largest first**; equal amounts are sorted by client name,
• **total** is the sum of the amounts,
• if a billable entry is for someone with no rate, throw an error with the message “No rate for <person>”, so nobody is billed at zero by mistake,
• no entries gives { clients: [], total: 0 }.

Write tests for it in billing.test.js (at least five, all passing), and a short **design note** in Docs, with the headings Problem, Approach and Testing, explaining how it works and the decisions you made (why an error for a missing rate, for example).

Samuel`,
  },
  whyItMatters:
    'Senior developers turn a specification into a feature that others can trust and maintain: correct in every case, covered by tests, and explained well enough that the next person understands why it works the way it does.',
  objectives: [
    'Build a feature from a written specification',
    'Group, total and sort data, and fail loudly on bad input',
    'Test your own code and explain your design decisions',
  ],
  steps: [
    {
      id: 'group',
      title: 'Group by client',
      instructions:
        'Loop over the entries, skip non-billable ones, look up the rate, and add hours and hours × rate to that client’s line. A `Map` or a plain object keyed by client name works well.',
    },
    {
      id: 'errors',
      title: 'Missing rates',
      instructions:
        "If a billable entry’s person has no rate, `throw new Error('No rate for ' + entry.person)`.",
    },
    {
      id: 'sort',
      title: 'Round, sort and total',
      instructions:
        'Round each amount to pennies (`Math.round(amount * 100) / 100`), sort largest first (then by name), and add up the total.',
    },
    {
      id: 'tests',
      title: 'Write the tests',
      instructions:
        'In billing.test.js, write at least five tests covering the specification: non-billable time, sorting, the missing-rate error and an empty month. Run them.',
    },
    {
      id: 'note',
      title: 'Write the design note',
      instructions:
        'In **Docs**, open **Billing report design note**. Use the headings **Problem**, **Approach** and **Testing**. Explain the rules, why a missing rate is an error, and how you tested it. 150 to 600 words.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions:
        'Reply to {manager}’s email with the project and the design note attached.',
    },
  ],
  project: {
    title: 'Timesheets: billing report',
    files: [
      { name: 'billing.js', text: starter },
      { name: 'billing.test.js', text: starterTests },
    ],
  },
  codeSolution: { 'billing.js': solution, 'billing.test.js': solutionTests },
  codeChecks: [
    {
      id: 'review-tests',
      type: 'tests',
      file: 'review.test.js',
      source: reviewTests,
      title: 'The feature meets the specification',
      points: 50,
      why: 'Finance will send real invoices from this report. Every rule matters.',
      hint: 'Check each bullet of the specification: billable only, rounding, sorting, the error message and the empty case.',
    },
    {
      id: 'own-tests',
      type: 'own-tests',
      file: 'billing.test.js',
      minTests: 5,
      title: 'Your own tests: five or more, all passing',
      points: 15,
      why: 'A feature without tests is a feature nobody dares to change.',
      hint: 'Write at least five tests in billing.test.js and make sure they pass.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Billing report design note',
      template: 'blank',
      checks: [
        {
          id: 'note-sections',
          type: 'sections',
          title: 'Problem, approach and testing',
          sections: [['Problem'], ['Approach', 'Design'], ['Testing', 'Tests']],
          points: 15,
          why: 'Reviewers look for the why, the how and the proof, in that order.',
          hint: 'Add the headings Problem, Approach and Testing.',
        },
        {
          id: 'note-decisions',
          type: 'mentions',
          title: 'The key decisions explained',
          terms: [['billable'], ['rate'], ['error', 'throw'], ['sort']],
          points: 10,
          why: 'Explaining the decisions stops the next developer from undoing them.',
          hint: 'Explain billable time, rates, the missing-rate error and the sorting.',
        },
        {
          id: 'note-length',
          type: 'length',
          min: 150,
          max: 600,
          title: 'Length',
          points: 10,
          why: 'Long enough to explain, short enough to be read in a review.',
          hint: 'Aim for 150 to 600 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: {
    programming: 35,
    'software-design': 35,
    'software-testing': 20,
    'technical-writing': 20,
  },
  feedback: {
    excellent: `Hi {name},

Correct, tested and clearly explained. Finance ran this month’s invoices from it without a single query, and {senior} is using your design note as the example for the team.

Samuel`,
    good: `Hi {name},

A solid feature; a few details to fix before release. See the notes.

Samuel`,
    pass: `Hi {name},

It mostly works, but some of the specification is missed, or the tests or note need work. The notes explain.

Samuel`,
    fail: `Hi {name},

Not ready yet. Go through the specification one bullet at a time, with a test for each.

Samuel`,
  },
}
