import type { AssignmentInput } from '../../schemas'

/**
 * Development 3 (Software Developer): write the tests for a date function.
 * Grading runs the player's tests against the real code (they must pass)
 * and against broken copies of it (they must fail): good tests catch bugs.
 * Teaches: choosing test cases, edges, and what a test is for.
 */
const workingDays = `/**
 * Counts the working days from start to end, including both days.
 * Saturdays, Sundays and the given holidays are not working days.
 * Dates are written 'YYYY-MM-DD'. If end is before start, the result is 0.
 *
 * Used for invoice due dates and for holiday requests.
 */
export function workingDays(start, end, holidays = []) {
  const from = toDate(start)
  const to = toDate(end)
  if (to < from) return 0
  const off = new Set(holidays)
  let count = 0
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const weekday = day.getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    if (off.has(format(day))) continue
    count++
  }
  return count
}

function toDate(text) {
  const [year, month, day] = text.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function format(date) {
  return date.toISOString().slice(0, 10)
}
`

const starterTests = `import { workingDays } from './workingDays.js'

// 2 March 2026 is a Monday.

test('a single weekday counts as one working day', () => {
  expect(workingDays('2026-03-02', '2026-03-02')).toBe(1)
})

// Add your tests below. Think about what could go wrong.
`

const solutionTests = `import { workingDays } from './workingDays.js'

test('a single weekday counts as one working day', () => {
  expect(workingDays('2026-03-02', '2026-03-02')).toBe(1)
})

test('a full week has five working days', () => {
  expect(workingDays('2026-03-02', '2026-03-08')).toBe(5)
})

test('Saturdays do not count', () => {
  expect(workingDays('2026-03-07', '2026-03-07')).toBe(0)
})

test('Sundays do not count', () => {
  expect(workingDays('2026-03-08', '2026-03-08')).toBe(0)
})

test('holidays do not count', () => {
  expect(workingDays('2026-03-02', '2026-03-06', ['2026-03-04'])).toBe(4)
})

test('the end date is included', () => {
  expect(workingDays('2026-03-02', '2026-03-03')).toBe(2)
})

test('an end before the start gives 0', () => {
  expect(workingDays('2026-03-06', '2026-03-02')).toBe(0)
})
`

export const workingDaysTests: AssignmentInput = {
  id: 'working-days-tests',
  version: 1,
  careerId: 'software-development',
  levelId: 'software-developer',
  order: 3,
  kind: 'code',
  title: 'Write the tests for working days',
  summary: 'Write tests good enough to catch the bugs that slip into date code.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'workingDays needs proper tests',
    body: `Hi {name},

Last month a change to workingDays started counting Saturdays, and nobody noticed until a client complained that an invoice was due on a weekend. The function is correct again now, but it has only one test.

Please write tests in workingDays.test.js that would catch that kind of mistake: weekends, holidays, the first and last day, ranges that make no sense. **Don’t change workingDays.js**: it is correct.

To check your tests, we will run them against the real code (they must all pass) and against copies of it with bugs planted in them (your tests should fail on each). That is how we know tests are worth having.

Samuel`,
  },
  whyItMatters:
    'Tests are only valuable if they would fail when the code is wrong. Choosing the cases that matter (the edges, the special days, the inputs nobody expects) is a skill that separates code that works today from code that keeps working.',
  objectives: [
    'Choose test cases that cover the rules and their edges',
    'Write clear tests with one behaviour each',
    'Judge tests by the bugs they catch',
  ],
  steps: [
    {
      id: 'read',
      title: 'Read the rules',
      instructions:
        'Read the comment above workingDays. Every sentence is a rule that a test can check: both days included, weekends and holidays excluded, and an end before the start gives 0.',
    },
    {
      id: 'write',
      title: 'Write the tests',
      instructions:
        "Write **at least six** tests, one behaviour each, with names that say what they check, e.g. `test('Saturdays do not count', () => { expect(workingDays('2026-03-07', '2026-03-07')).toBe(0) })`. 7 March 2026 is a Saturday.",
      hint: 'Test Saturday and Sunday separately: a bug might break only one of them.',
    },
    {
      id: 'run',
      title: 'Run them',
      instructions:
        'Click **Run tests**. They must all pass on the real code. If one fails, check your expected value by counting on a calendar.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  project: {
    title: 'Dates: working days',
    files: [
      { name: 'workingDays.js', text: workingDays, readOnly: true },
      { name: 'workingDays.test.js', text: starterTests },
    ],
  },
  codeSolution: { 'workingDays.test.js': solutionTests },
  codeChecks: [
    {
      id: 'own-tests',
      type: 'own-tests',
      file: 'workingDays.test.js',
      minTests: 6,
      title: 'At least six tests, all passing on the real code',
      points: 30,
      why: 'A test that fails on correct code just gets in everyone’s way.',
      hint: 'Write six or more tests and run them: they must all pass.',
    },
    {
      id: 'catches-bugs',
      type: 'mutants',
      file: 'workingDays.test.js',
      target: 'workingDays.js',
      mutants: [
        {
          description: 'Saturdays are counted as working days',
          find: 'weekday === 0 || weekday === 6',
          replace: 'weekday === 0',
        },
        {
          description: 'Sundays are counted as working days',
          find: 'weekday === 0 || weekday === 6',
          replace: 'weekday === 6',
        },
        {
          description: 'Holidays are ignored',
          find: 'if (off.has(format(day))) continue',
          replace: '',
        },
        {
          description: 'The end date is left out',
          find: 'day <= to',
          replace: 'day < to',
        },
        {
          description: 'An end before the start gives -1',
          find: 'if (to < from) return 0',
          replace: 'if (to < from) return -1',
        },
      ],
      title: 'Your tests catch planted bugs',
      points: 70,
      why: 'This is what tests are for: failing when someone breaks the code.',
      hint: 'Cover Saturdays, Sundays, holidays, the last day of the range, and an end before the start.',
    },
  ],
  passScore: 70,
  xp: 160,
  skills: { 'software-testing': 60, programming: 20, debugging: 15 },
  feedback: {
    excellent: `Hi {name},

Your tests caught every planted bug. That is exactly the safety net we were missing, and it would have stopped last month’s problem before it reached a client.

Samuel`,
    good: `Hi {name},

Good tests; one or two bugs still slip past them. See the notes.

Samuel`,
    pass: `Hi {name},

Some planted bugs get through your tests. The notes say which ones.

Samuel`,
    fail: `Hi {name},

Not yet. Write a test for each rule in the comment, then run them.

Samuel`,
  },
}
