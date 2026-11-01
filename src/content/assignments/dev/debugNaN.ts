import type { AssignmentInput } from '../../schemas'
import { initRepository } from '../../../game/code/git'
import { runTerminal } from '../../../game/code/terminal'

/**
 * Software Development (Software Developer): the weekly report shows "NaN"
 * and odd numbers. Reproduce it in the debug console, fix both causes, and
 * commit. Teaches: reproducing a bug with real inputs, reading what code
 * actually returns, type coercion in JavaScript, and edge cases.
 */
const report = `/**
 * The weekly utilisation report.
 * Entries come from the timesheet app and, for some teams, the old system,
 * which sends hours as text (e.g. "7.5").
 */
export function averageHours(entries) {
  let total = 0
  for (const entry of entries) {
    total += entry.hours
  }
  return total / entries.length
}

/** Hours worked as a percentage of the person's capacity, rounded. */
export function utilisation(entries, capacityHours) {
  let total = 0
  for (const entry of entries) {
    total += entry.hours
  }
  return Math.round((total / capacityHours) * 100)
}
`

const fixed = report
  .replace(
    `  let total = 0
  for (const entry of entries) {
    total += entry.hours
  }
  return total / entries.length`,
    `  if (entries.length === 0) return 0
  let total = 0
  for (const entry of entries) {
    total += Number(entry.hours)
  }
  return total / entries.length`,
  )
  .replace(
    `    total += entry.hours
  }
  return Math.round`,
    `    total += Number(entry.hours)
  }
  return Math.round`,
  )

const tests = `import { averageHours, utilisation } from './report.js'

test('average of a normal week', () => {
  expect(averageHours([{ hours: 8 }, { hours: 6 }])).toBe(7)
})

test('no entries: average is 0, not NaN', () => {
  expect(averageHours([])).toBe(0)
})
`

const hidden = `import { averageHours, utilisation } from './report.js'

test('hours sent as text by the old system', () => {
  expect(averageHours([{ hours: '7.5' }, { hours: '6' }])).toBe(6.75)
  expect(utilisation([{ hours: '30' }, { hours: 7.5 }], 37.5)).toBe(100)
})

test('utilisation of a normal week', () => {
  expect(utilisation([{ hours: 20 }], 37.5)).toBe(53)
})
`

function solution() {
  const files: Record<string, string> = { 'report.js': report, 'report.test.js': tests }
  let state = { files, git: initRepository(files) }
  state.files = { ...state.files, 'report.js': fixed }
  const r = runTerminal(
    state.files,
    state.git,
    'git commit -am "Fix NaN average for empty weeks and hours sent as text"',
  )
  state = { files: r.files, git: r.git }
  return {
    language: 'javascript' as const,
    files: [
      { name: 'report.js', text: state.files['report.js'], readOnly: false },
      { name: 'report.test.js', text: state.files['report.test.js'], readOnly: true },
    ],
    git: state.git,
    debug: [
      { file: 'report.js', fn: 'averageHours', args: '[[]]', value: 'NaN', error: null },
      {
        file: 'report.js',
        fn: 'averageHours',
        args: '[[{"hours":"7.5"},{"hours":"6"}]]',
        value: '3.78',
        error: null,
      },
    ],
  }
}

export const debugNaN: AssignmentInput = {
  id: 'debug-nan',
  version: 1,
  careerId: 'software-development',
  levelId: 'software-developer',
  order: 5,
  kind: 'code',
  title: 'Why does the report say NaN?',
  summary: 'Reproduce a bug in the debug console, fix both of its causes, and commit.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'The weekly report says “NaN”',
    body: `Hi {name},

Two complaints about the weekly utilisation report:
• for people with no entries this week, the average shows **NaN**,
• for the Audit team (whose hours still come from the old system), the averages are **nonsense**: 3.78 hours for someone who worked 7.5 and 6.

Before you change anything, **reproduce** both problems in the **Debug** tab: call averageHours with the data that goes wrong and look at what it really returns. Then fix report.js (both functions), run the tests, and commit the fix on main with a clear message.

Samuel`,
  },
  whyItMatters:
    'The fastest way to fix a bug is to reproduce it with the exact input that breaks it, then watch what the code really does. JavaScript quietly turns numbers into text and produces NaN rather than errors, so these bugs are common and easy to miss without checking.',
  objectives: [
    'Reproduce a bug with the input that breaks it',
    'Understand NaN and text-number mix-ups in JavaScript',
    'Fix every place the cause occurs, and commit',
  ],
  steps: [
    {
      id: 'reproduce',
      title: 'Reproduce it',
      instructions:
        'In the **Debug** tab, call averageHours with `[[]]` (one argument: an empty list). Then with `[[{"hours": "7.5"}, {"hours": "6"}]]`. Read what comes back.',
      hint: '0 + "7.5" is the text "07.5" in JavaScript, not 7.5. And 0 ÷ 0 is NaN.',
    },
    {
      id: 'fix',
      title: 'Fix both causes',
      instructions:
        'Return 0 when there are no entries, and turn hours into numbers with `Number(entry.hours)`. utilisation adds hours the same way: fix it too.',
    },
    {
      id: 'test',
      title: 'Test',
      instructions:
        'Run `npm test` in the Terminal (or Run tests), and call the function again in Debug.',
    },
    {
      id: 'commit',
      title: 'Commit',
      instructions:
        '`git commit -am "…"` with a message that says what you fixed. `git status` should then be clean.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  project: {
    title: 'Reports: weekly utilisation',
    git: true,
    files: [
      { name: 'report.js', text: report },
      { name: 'report.test.js', text: tests, readOnly: true },
    ],
  },
  codeSolution: { 'report.js': fixed },
  codeSolutionProject: solution(),
  codeChecks: [
    {
      id: 'reproduced',
      type: 'debugged',
      fn: 'averageHours',
      title: 'The bug reproduced in the debug console',
      points: 15,
      why: 'Seeing what the code really returns is the start of every good fix.',
      hint: 'Call averageHours in the Debug tab with the data that goes wrong.',
    },
    {
      id: 'tests',
      type: 'tests',
      file: 'report.test.js',
      on: 'main',
      title: 'The project’s tests pass on main',
      points: 20,
      why: 'Empty weeks must show 0, not NaN.',
      hint: 'Return 0 when there are no entries; commit the fix.',
    },
    {
      id: 'review',
      type: 'tests',
      file: 'review.test.js',
      source: hidden,
      on: 'main',
      title: 'Hours sent as text handled everywhere',
      points: 35,
      why: 'The same cause was in two functions: fixing one leaves the report half wrong.',
      hint: 'Use Number(entry.hours) in both averageHours and utilisation.',
    },
    {
      id: 'commit',
      type: 'commits',
      messageIncludes: ['nan', 'average', 'hours', 'text', 'empty'],
      title: 'Committed with a clear message',
      points: 15,
      why: 'The message is how the team finds this fix later.',
      hint: 'git commit -am "Fix NaN average for empty weeks and hours sent as text".',
    },
    {
      id: 'clean',
      type: 'clean',
      title: 'Nothing left uncommitted',
      points: 15,
      why: 'Uncommitted work never reaches the report.',
      hint: 'git status should be clean, on main.',
    },
  ],
  passScore: 70,
  xp: 140,
  skills: { debugging: 55, programming: 25, 'software-testing': 15 },
  feedback: {
    excellent: `Hi {name},

Reproduced, explained and fixed in both places. Text hours from the old system are a classic. The report is right again for every team.

Samuel`,
    good: `Hi {name},

Good fix; something is still missing. See the notes.

Samuel`,
    pass: `Hi {name},

Part of the problem remains. The notes show where.

Samuel`,
    fail: `Hi {name},

Start in the Debug tab: call averageHours with an empty list.

Samuel`,
  },
}
