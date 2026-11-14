import type { AssignmentInput } from '../../schemas'
import { initRepository } from '../../../game/code/git'
import { runTerminal } from '../../../game/code/terminal'

/**
 * Software Development: two tasks that need the Code editor's IDE features.
 *
 * - "The discount is too big" (from the senior colleague): a bug that only
 *   shows when the loop runs more than once. Set a breakpoint, step through
 *   the loop in Run and Debug, and watch the discount grow.
 * - "Tidy the money helpers into a folder" (from the manager): move a file
 *   into a folder in the Explorer, rename a function everywhere with Search
 *   and replace, and commit.
 */

/** Commits the files as the player would: stage everything, then commit. */
function committed(
  start: Record<string, string>,
  end: Record<string, string>,
  message: string,
) {
  const git = initRepository(start)
  const staged = runTerminal(end, git, 'git add -A')
  const done = runTerminal(staged.files, staged.git, `git commit -m "${message}"`)
  return { files: done.files, git: done.git }
}

// ---------------------------------------------------------------------------
// 1. The discount is too big: breakpoints and stepping
// ---------------------------------------------------------------------------

const basket = `/**
 * The staff shop's basket total. Members get their loyalty discount on the
 * items marked "discountable" (not on gift cards or postage).
 */
export function basketTotal(items, loyaltyPercent) {
  let total = 0
  let discount = 0
  for (const item of items) {
    const line = item.price * item.qty
    total += line
    if (item.discountable) {
      discount += total * (loyaltyPercent / 100)
    }
  }
  return Math.round((total - discount) * 100) / 100
}
`

const basketFixed = basket.replace(
  'discount += total * (loyaltyPercent / 100)',
  'discount += line * (loyaltyPercent / 100)',
)

const basketTests = `import { basketTotal } from './basket.js'

test('one discountable item: 10% off', () => {
  expect(basketTotal([{ price: 20, qty: 1, discountable: true }], 10)).toBe(18)
})

test('nothing discountable: full price', () => {
  expect(basketTotal([{ price: 5, qty: 2, discountable: false }], 10)).toBe(10)
})
`

const basketHidden = `import { basketTotal } from './basket.js'

test('postage first, then a discountable mug', () => {
  expect(
    basketTotal(
      [
        { price: 10, qty: 2, discountable: false },
        { price: 5, qty: 1, discountable: true },
      ],
      10,
    ),
  ).toBe(24.5)
})

test('two discountable lines', () => {
  expect(
    basketTotal(
      [
        { price: 4, qty: 3, discountable: true },
        { price: 8, qty: 1, discountable: true },
      ],
      25,
    ),
  ).toBe(15)
})
`

function basketSolution() {
  const start = { 'basket.js': basket, 'basket.test.js': basketTests }
  const done = committed(
    start,
    { ...start, 'basket.js': basketFixed },
    'Fix loyalty discount: take it off each line, not the running total',
  )
  return {
    language: 'javascript' as const,
    files: [
      { name: 'basket.js', text: done.files['basket.js'], readOnly: false },
      { name: 'basket.test.js', text: done.files['basket.test.js'], readOnly: true },
    ],
    git: done.git,
    ide: {
      tabs: ['basket.js'],
      breakpoints: [{ file: 'basket.js', line: 12 }],
      extensions: [],
      stepped: [{ file: 'basket.js', fn: 'basketTotal', line: 12 }],
    },
  }
}

export const stepDiscount: AssignmentInput = {
  id: 'dev-step-discount',
  version: 1,
  careerId: 'software-development',
  levelId: 'lead-developer',
  order: 11,
  kind: 'code',
  title: 'The discount is too big',
  summary:
    'Step through a loop with a breakpoint in Run and Debug, find the wrong line, fix it and commit.',
  estimatedMinutes: 35,
  from: 'senior',
  briefing: {
    subject: 'Staff shop: discounts too big on bigger baskets',
    body: `Hi {name},

The staff shop says members get **far too much** off when they buy several things. One item is always right, which is why our tests never caught it.

Reading the code has not found it for me. Could you **step through it** instead? In Code, click left of a line number inside basketTotal to set a **breakpoint** (or press F9), then open **Run and Debug**, choose basketTotal and run it with a basket of two items, e.g. \`[[{"price": 10, "qty": 2, "discountable": false}, {"price": 5, "qty": 1, "discountable": true}], 10]\`. Watch **total** and **discount** change at each step.

Fix it, run the tests and commit on main.

{senior}`,
  },
  whyItMatters:
    'Some bugs only appear on the second or third time round a loop. Stepping through with a breakpoint shows every variable at every line, so you see the moment a value goes wrong instead of guessing from the code.',
  objectives: [
    'Set a breakpoint and step through a loop in the debugger',
    'Read the variables at each step to find where a value goes wrong',
    'Fix it, test it, and commit with a clear message',
  ],
  steps: [
    {
      id: 'breakpoint',
      title: 'Set a breakpoint',
      instructions:
        'Open basket.js. Click left of the line number of `discount += …` (or put the cursor there and press **F9**). A red dot appears.',
    },
    {
      id: 'step',
      title: 'Step through the loop',
      instructions:
        'In **Run and Debug** (the ▷ button on the left), choose basketTotal, enter the two-item basket from the email as the arguments, and press **Start**. The run pauses at your breakpoint. Use **Step over** and watch **line**, **total** and **discount** in Variables.',
      hint: 'On the second item, is the discount worked out from that item, or from everything so far?',
    },
    {
      id: 'fix',
      title: 'Fix the line',
      instructions:
        'The discount must be worked out from each discountable **line**, not the running **total**.',
    },
    {
      id: 'commit',
      title: 'Test and commit',
      instructions:
        'Run the tests, then commit on main (Source Control or `git commit -am "…"`) with a message that says what was wrong.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {senior}** in the task pane.',
    },
  ],
  project: {
    title: 'Staff shop: basket totals',
    git: true,
    files: [
      { name: 'basket.js', text: basket },
      { name: 'basket.test.js', text: basketTests, readOnly: true },
    ],
  },
  codeSolution: { 'basket.js': basketFixed },
  codeSolutionProject: basketSolution(),
  codeChecks: [
    {
      id: 'stepped',
      type: 'stepped',
      fn: 'basketTotal',
      title: 'Stepped through basketTotal from a breakpoint',
      points: 25,
      why: 'Watching the values change is how this kind of bug is found.',
      hint: 'Set a breakpoint inside basketTotal, then run it in Run and Debug.',
    },
    {
      id: 'tests',
      type: 'tests',
      file: 'basket.test.js',
      on: 'main',
      title: 'The project’s tests still pass on main',
      points: 15,
      why: 'The one-item baskets that worked must keep working.',
      hint: 'Commit the fix on main.',
    },
    {
      id: 'review',
      type: 'tests',
      file: 'review.test.js',
      source: basketHidden,
      on: 'main',
      title: 'Baskets of several items are right',
      points: 35,
      why: 'This is the case members complained about.',
      hint: 'Use the line’s price × quantity for its discount, not the running total.',
    },
    {
      id: 'commit',
      type: 'commits',
      messageIncludes: ['discount', 'line', 'total', 'loyalty'],
      title: 'Committed with a clear message',
      points: 15,
      why: 'The message tells the team what was wrong.',
      hint: 'git commit -am "Fix loyalty discount: take it off each line".',
    },
    {
      id: 'clean',
      type: 'clean',
      title: 'Nothing left uncommitted',
      points: 10,
      why: 'Uncommitted work never reaches the shop.',
      hint: 'git status should be clean, on main.',
    },
  ],
  passScore: 70,
  xp: 160,
  skills: { debugging: 55, programming: 25, 'software-testing': 15 },
  feedback: {
    excellent: `Hi {name},

That’s it: the running total was being discounted again on every item. Stepping through it was quicker than any amount of reading. Fixed, tested and committed.

{senior}`,
    good: `Hi {name},

The fix works; something is missing. See the notes.

{senior}`,
    pass: `Hi {name},

Nearly. The notes show what is left.

{senior}`,
    fail: `Hi {name},

Start with a breakpoint on the discount line, and step through a basket of two items.

{senior}`,
  },
}

// ---------------------------------------------------------------------------
// 2. Tidy the money helpers into a folder: Explorer, Search, rename
// ---------------------------------------------------------------------------

const utils = `/** Money helpers. Amounts are in pence. */
export function fmt(pence) {
  return '£' + (pence / 100).toFixed(2)
}

export function vat(pence) {
  return Math.round(pence * 0.2)
}
`

const invoice = `import { fmt, vat } from './utils.js'

/** One line of an invoice, e.g. "Desk lamp: £24.00 + VAT £4.80". */
export function invoiceLine(name, pence) {
  return name + ': ' + fmt(pence) + ' + VAT ' + fmt(vat(pence))
}
`

const receipt = `import { fmt } from './utils.js'

/** The total at the bottom of a receipt. */
export function receiptTotal(lines) {
  const pence = lines.reduce((sum, line) => sum + line, 0)
  return 'Total ' + fmt(pence)
}
`

const docsTests = `import { invoiceLine } from './invoice.js'
import { receiptTotal } from './receipt.js'

test('an invoice line', () => {
  expect(invoiceLine('Desk lamp', 2400)).toBe('Desk lamp: £24.00 + VAT £4.80')
})

test('a receipt total', () => {
  expect(receiptTotal([250, 199])).toBe('Total £4.49')
})
`

const tidyHidden = `import { formatMoney, vat } from './lib/money.js'
import { invoiceLine } from './invoice.js'
import { receiptTotal } from './receipt.js'

test('the helpers live in lib/money.js, with the clearer name', () => {
  expect(formatMoney(1234)).toBe('£12.34')
  expect(vat(1000)).toBe(200)
})

test('everything still works after the move', () => {
  expect(invoiceLine('Chair', 9000)).toBe('Chair: £90.00 + VAT £18.00')
  expect(receiptTotal([100, 5])).toBe('Total £1.05')
})
`

const money = utils.replace('export function fmt(', 'export function formatMoney(')
const invoiceTidy = invoice
  .replace(
    "import { fmt, vat } from './utils.js'",
    "import { formatMoney, vat } from './lib/money.js'",
  )
  .replaceAll('fmt(', 'formatMoney(')
const receiptTidy = receipt
  .replace(
    "import { fmt } from './utils.js'",
    "import { formatMoney } from './lib/money.js'",
  )
  .replaceAll('fmt(', 'formatMoney(')

function tidySolution() {
  const start = {
    'utils.js': utils,
    'invoice.js': invoice,
    'receipt.js': receipt,
    'documents.test.js': docsTests,
  }
  const end = {
    'lib/money.js': money,
    'invoice.js': invoiceTidy,
    'receipt.js': receiptTidy,
    'documents.test.js': docsTests,
  }
  const done = committed(
    start,
    end,
    'Move money helpers to lib/money.js and rename fmt to formatMoney',
  )
  return {
    language: 'javascript' as const,
    files: [
      { name: 'lib/money.js', text: done.files['lib/money.js'], readOnly: false },
      { name: 'invoice.js', text: done.files['invoice.js'], readOnly: false },
      { name: 'receipt.js', text: done.files['receipt.js'], readOnly: false },
      {
        name: 'documents.test.js',
        text: done.files['documents.test.js'],
        readOnly: true,
      },
    ],
    git: done.git,
  }
}

export const tidyFolders: AssignmentInput = {
  id: 'dev-tidy-folders',
  version: 1,
  careerId: 'software-development',
  levelId: 'lead-developer',
  order: 12,
  kind: 'code',
  title: 'Tidy the money helpers into a folder',
  summary:
    'Move a file into a folder, rename a function everywhere with Search and replace, and commit.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Small tidy-up before the new starters arrive',
    body: `Hi {name},

Two new developers start next month and the documents project confuses everyone: the money helpers are in a file called **utils.js**, and the function that formats money is called **fmt**.

Please:
• move them to **lib/money.js** (in the Explorer: a new folder, or a new file named \`lib/money.js\`),
• rename **fmt** to **formatMoney** everywhere it is used (**Search**, with Replace),
• point the imports at the new file and delete utils.js,
• run the tests and commit on main.

Nothing should behave differently afterwards: only the names and the place change.

{manager}`,
  },
  whyItMatters:
    'Clear names and a tidy folder structure make code easier for the next person to read. Renaming by hand misses places; searching the whole project and replacing every use, then running the tests, proves nothing was broken.',
  objectives: [
    'Organise files into folders in the Explorer',
    'Rename a function across a project with Search and replace',
    'Prove with the tests that the behaviour did not change',
  ],
  steps: [
    {
      id: 'folder',
      title: 'Make lib/money.js',
      instructions:
        'In the **Explorer**, make a new file named `lib/money.js` (the folder is made with it) and move the two helpers into it from utils.js.',
    },
    {
      id: 'rename',
      title: 'Rename fmt everywhere',
      instructions:
        'Open **Search** (the ⌕ button, or Ctrl+Shift+F), search for `fmt`, and **Replace all** with `formatMoney`. Check each file it changed.',
      hint: 'Turn on **Match whole word** so nothing else that contains “fmt” is changed.',
    },
    {
      id: 'imports',
      title: 'Fix the imports, delete utils.js',
      instructions:
        "invoice.js and receipt.js should import from `'./lib/money.js'`. Then delete utils.js (right-click it in the Explorer). The **Problems** panel shows any import left broken.",
    },
    {
      id: 'commit',
      title: 'Test and commit',
      instructions:
        'Run the tests, then commit everything on main: in Source Control, stage all the changes (including the new and deleted files) and commit.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  project: {
    title: 'Documents: invoices and receipts',
    git: true,
    files: [
      { name: 'utils.js', text: utils },
      { name: 'invoice.js', text: invoice },
      { name: 'receipt.js', text: receipt },
      { name: 'documents.test.js', text: docsTests, readOnly: true },
    ],
  },
  codeSolution: { 'invoice.js': invoiceTidy, 'receipt.js': receiptTidy },
  codeSolutionProject: tidySolution(),
  codeChecks: [
    {
      id: 'review',
      type: 'tests',
      file: 'review.test.js',
      source: tidyHidden,
      on: 'main',
      title: 'formatMoney and vat are in lib/money.js, and everything uses them',
      points: 45,
      why: 'This is the tidy-up that was asked for.',
      hint: 'Make lib/money.js, rename fmt to formatMoney, and import from ./lib/money.js.',
    },
    {
      id: 'tests',
      type: 'tests',
      file: 'documents.test.js',
      on: 'main',
      title: 'Invoices and receipts work exactly as before',
      points: 20,
      why: 'A tidy-up must not change what the code does.',
      hint: 'Run the tests after the rename: a missed use of fmt breaks them.',
    },
    {
      id: 'commit',
      type: 'commits',
      messageIncludes: ['move', 'rename', 'formatmoney', 'lib', 'money', 'tidy'],
      title: 'Committed with a clear message',
      points: 20,
      why: 'Say what moved and what was renamed, so nobody looks for the old names.',
      hint: 'Stage all changes (new, changed and deleted files) and commit.',
    },
    {
      id: 'clean',
      type: 'clean',
      title: 'Nothing left uncommitted',
      points: 15,
      why: 'A half-committed move breaks the project for everyone else.',
      hint: 'git status should be clean, on main.',
    },
  ],
  passScore: 70,
  xp: 150,
  skills: { programming: 45, debugging: 15, 'software-testing': 20 },
  feedback: {
    excellent: `Hi {name},

Much clearer, and the tests prove nothing changed. The new starters will thank you.

{manager}`,
    good: `Hi {name},

Nearly there. See the notes.

{manager}`,
    pass: `Hi {name},

Part of the tidy-up is missing. The notes show what.

{manager}`,
    fail: `Hi {name},

Start by making lib/money.js in the Explorer, then use Search to rename fmt.

{manager}`,
  },
}
