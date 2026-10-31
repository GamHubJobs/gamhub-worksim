import type { AssignmentInput } from '../../schemas'

/**
 * Development 1 (Junior Developer): fix the bugs in the invoice totals.
 * Teaches: reading failing tests, expected versus received values, and
 * changing one thing at a time.
 */
const invoice = `/**
 * Works out the totals for an invoice.
 *
 * Each line has a description, a quantity and a unit price. A discount is a
 * percentage (10 means 10%) taken off the subtotal. VAT is then added to what
 * is left. Every amount is rounded to pennies.
 */
export function invoiceTotals(lines, discountPercent, vatRate) {
  let subtotal = 0
  for (let i = 1; i < lines.length; i++) {
    subtotal += lines[i].quantity + lines[i].unitPrice
  }
  const discount = subtotal * discountPercent
  const net = subtotal - discount
  const vat = net * vatRate
  return {
    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    vat: roundMoney(vat),
    total: roundMoney(net + vat),
  }
}

function roundMoney(amount) {
  return Math.round(amount * 100) / 100
}
`

const fixed = invoice
  .replace(
    'for (let i = 1; i < lines.length; i++)',
    'for (let i = 0; i < lines.length; i++)',
  )
  .replace(
    'lines[i].quantity + lines[i].unitPrice',
    'lines[i].quantity * lines[i].unitPrice',
  )
  .replace('subtotal * discountPercent', 'subtotal * (discountPercent / 100)')

const visibleTests = `import { invoiceTotals } from './invoice.js'

const lines = [
  { description: 'Advisory day', quantity: 2, unitPrice: 650 },
  { description: 'Travel', quantity: 1, unitPrice: 120 },
]

test('adds up every line', () => {
  expect(invoiceTotals(lines, 0, 0.2).subtotal).toBe(1420)
})

test('takes the discount as a percentage', () => {
  expect(invoiceTotals(lines, 10, 0.2).discount).toBe(142)
})

test('adds VAT after the discount', () => {
  const totals = invoiceTotals(lines, 10, 0.2)
  expect(totals.vat).toBe(255.6)
  expect(totals.total).toBe(1533.6)
})
`

const hiddenTests = `import { invoiceTotals } from './invoice.js'

test('an invoice with one line', () => {
  expect(invoiceTotals([{ description: 'Review', quantity: 3, unitPrice: 19.99 }], 0, 0.2)).toEqual({
    subtotal: 59.97,
    discount: 0,
    vat: 11.99,
    total: 71.96,
  })
})

test('an empty invoice is all zeros', () => {
  expect(invoiceTotals([], 10, 0.2)).toEqual({ subtotal: 0, discount: 0, vat: 0, total: 0 })
})

test('many lines with a discount', () => {
  const lines = [
    { description: 'A', quantity: 1, unitPrice: 100 },
    { description: 'B', quantity: 4, unitPrice: 25 },
    { description: 'C', quantity: 10, unitPrice: 5 },
  ]
  expect(invoiceTotals(lines, 5, 0.2)).toEqual({
    subtotal: 250,
    discount: 12.5,
    vat: 47.5,
    total: 285,
  })
})

test('no VAT for exempt clients', () => {
  const lines = [{ description: 'Workshop', quantity: 1, unitPrice: 800 }]
  expect(invoiceTotals(lines, 25, 0).total).toBe(600)
})
`

export const invoiceBug: AssignmentInput = {
  id: 'invoice-bug',
  version: 1,
  careerId: 'software-development',
  levelId: 'junior-developer',
  order: 1,
  kind: 'code',
  title: 'Fix the invoice totals',
  summary: 'Clients are being invoiced the wrong amounts. Find and fix the bugs.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Your first task: the invoice totals are wrong',
    body: `Hi {name},

Welcome to Engineering! Your first job is a real bug report. Finance says invoices from the new billing code come out wrong: some lines are missing and the discounts are enormous.

Open the project in **Code**. invoice.js has the function, and invoice.test.js has tests that describe what it should do. Run the tests, read what fails, and fix the code until every test passes. Don’t change the tests: they are right.

When everything is green, hand it in from the task pane. We also run a few extra tests of our own, so fix the cause, not just the symptoms.

Samuel`,
  },
  whyItMatters:
    'Most of a developer’s time is spent reading and fixing existing code, not writing new code. Tests tell you what the code should do; a failing test, with its expected and received values, tells you where to look. Fixing the cause rather than the symptom is what stops a bug coming back.',
  objectives: [
    'Run tests and read their failures',
    'Find bugs by comparing expected and received values',
    'Fix the cause without changing the tests',
  ],
  steps: [
    {
      id: 'run',
      title: 'Run the tests',
      instructions:
        'In **Code**, click **Run tests**. Three tests fail. Read each message: “Expected 1420, received …” tells you what the code should give and what it gives now.',
    },
    {
      id: 'loop',
      title: 'Check the loop',
      instructions:
        'Read the loop in invoiceTotals line by line. Does it visit every line, starting with the first? Does it work out each line’s amount correctly (quantity **times** unit price)?',
      hint: 'Arrays start at index 0.',
    },
    {
      id: 'discount',
      title: 'Check the discount',
      instructions:
        'A discount of 10 means 10%. What does the code multiply the subtotal by? Fix it, then run the tests again.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions:
        'When all the tests pass, click **Submit to {manager}** in the task pane.',
    },
  ],
  project: {
    title: 'Billing: invoice totals',
    files: [
      { name: 'invoice.js', text: invoice },
      { name: 'invoice.test.js', text: visibleTests, readOnly: true },
    ],
  },
  codeSolution: { 'invoice.js': fixed },
  codeChecks: [
    {
      id: 'visible-tests',
      type: 'tests',
      file: 'invoice.test.js',
      title: 'The project’s tests pass',
      points: 50,
      why: 'The tests describe what Finance needs. Every one must pass.',
      hint: 'Click Run tests and fix the code until all three pass.',
    },
    {
      id: 'hidden-tests',
      type: 'tests',
      file: 'review.test.js',
      source: hiddenTests,
      title: 'Our extra tests pass',
      points: 50,
      why: 'Fixing the cause, not just the three cases in the tests, is what makes a fix last.',
      hint: 'Make sure the code works for any invoice: one line, no lines, any discount and any VAT rate.',
    },
  ],
  passScore: 70,
  xp: 100,
  skills: { debugging: 50, programming: 30, 'software-testing': 10 },
  feedback: {
    excellent: `Hi {name},

All green, including our extra tests. Three bugs in one function, and you found every one. Finance will be very relieved.

Samuel`,
    good: `Hi {name},

Nearly there; a case or two still comes out wrong. See the notes.

Samuel`,
    pass: `Hi {name},

Some of the tests still fail. Read the expected and received values: the notes show which.

Samuel`,
    fail: `Hi {name},

Not yet. Run the tests and start with the first failure.

Samuel`,
  },
}
