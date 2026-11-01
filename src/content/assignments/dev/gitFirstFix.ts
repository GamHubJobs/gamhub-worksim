import type { AssignmentInput } from '../../schemas'
import { initRepository } from '../../../game/code/git'
import { runTerminal } from '../../../game/code/terminal'

/**
 * Software Development (Junior Developer): the team's Git workflow. Fix a
 * small bug on its own branch, run the tests, commit with a clear message,
 * and merge it into main. Teaches: branches, staging, commits, merging, and
 * a clean working tree.
 */
const fees = `/**
 * Late fees on unpaid invoices:
 *   - 5% when an invoice is paid 30 or more days late,
 *   - 10% when it is 60 or more days late.
 * Fees are rounded to pennies.
 */
export function lateFee(amount, daysLate) {
  if (daysLate > 60) return round(amount * 0.1)
  if (daysLate > 30) return round(amount * 0.05)
  return 0
}

function round(n) {
  return Math.round(n * 100) / 100
}
`

const fixed = fees
  .replace('daysLate > 60', 'daysLate >= 60')
  .replace('daysLate > 30', 'daysLate >= 30')

const tests = `import { lateFee } from './fees.js'

test('no fee when paid on time', () => {
  expect(lateFee(1000, 10)).toBe(0)
})

test('5% from 30 days late', () => {
  expect(lateFee(1000, 30)).toBe(50)
})

test('10% from 60 days late', () => {
  expect(lateFee(1000, 60)).toBe(100)
})
`

const hidden = `import { lateFee } from './fees.js'

test('just under the limits', () => {
  expect(lateFee(1000, 29)).toBe(0)
  expect(lateFee(1000, 59)).toBe(50)
})

test('well past the limits', () => {
  expect(lateFee(240.5, 45)).toBe(12.03)
  expect(lateFee(240.5, 90)).toBe(24.05)
})
`

function solution() {
  const files: Record<string, string> = { 'fees.js': fees, 'fees.test.js': tests }
  let state = { files, git: initRepository(files) }
  const run = (line: string) => {
    const r = runTerminal(state.files, state.git, line)
    state = { files: r.files, git: r.git }
  }
  run('git checkout -b fix/late-fees')
  state.files = { ...state.files, 'fees.js': fixed }
  run('git add fees.js')
  run('git commit -m "Fix late fees on exactly 30 and 60 days"')
  run('git checkout main')
  run('git merge fix/late-fees')
  return {
    language: 'javascript' as const,
    files: [
      { name: 'fees.js', text: state.files['fees.js'], readOnly: false },
      { name: 'fees.test.js', text: state.files['fees.test.js'], readOnly: true },
    ],
    git: state.git,
  }
}

export const gitFirstFix: AssignmentInput = {
  id: 'git-first-fix',
  version: 1,
  careerId: 'software-development',
  levelId: 'junior-developer',
  order: 3,
  kind: 'code',
  title: 'Your first branch, commit and merge',
  summary: 'Fix a bug the way the team does: on a branch, tested, committed and merged.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'How we ship a fix (with Git)',
    body: `Hi {name},

Until now you’ve handed code straight to me. From today you work like the rest of the team, with **Git** in the **Terminal** (the tab under the editor).

Finance reports that invoices paid exactly 30 days late get no late fee, and those paid exactly 60 days late get 5% instead of 10%. Please:
1. create a branch for the fix: \`git checkout -b fix/late-fees\`,
2. fix fees.js and run \`npm test\` until it passes,
3. stage and commit it with a message that says what you fixed: \`git add fees.js\`, then \`git commit -m "…"\`,
4. switch back to main and merge your branch: \`git checkout main\`, then \`git merge fix/late-fees\`.

We check what is committed on **main**, not what is in your editor, so make sure it’s merged. Type \`help\` in the terminal for every command.

Samuel`,
  },
  whyItMatters:
    'Every software team uses version control. Working on a branch keeps main safe while you change things; small commits with clear messages tell the team (and future you) what changed and why; merging puts finished, tested work into the product.',
  objectives: [
    'Work on a branch and keep main safe',
    'Stage and commit with a clear message',
    'Merge finished work into main',
  ],
  steps: [
    {
      id: 'branch',
      title: 'Create a branch',
      instructions:
        'Open the **Terminal** tab and run `git checkout -b fix/late-fees`. Then `git status` to see where you are.',
    },
    {
      id: 'fix',
      title: 'Fix and test',
      instructions:
        'Read the comment in fees.js: “30 **or more** days”. Fix the two conditions, then run `npm test` in the terminal.',
      hint: '> means “more than”; >= means “more than or equal to”.',
    },
    {
      id: 'commit',
      title: 'Commit',
      instructions:
        '`git diff` shows your change. Then `git add fees.js` and `git commit -m "Fix late fees on exactly 30 and 60 days"`. `git log --oneline` shows the history.',
    },
    {
      id: 'merge',
      title: 'Merge into main',
      instructions:
        '`git checkout main`, then `git merge fix/late-fees`. `git status` should say the working tree is clean.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  project: {
    title: 'Billing: late fees',
    git: true,
    files: [
      { name: 'fees.js', text: fees },
      { name: 'fees.test.js', text: tests, readOnly: true },
    ],
  },
  codeSolution: { 'fees.js': fixed },
  codeSolutionProject: solution(),
  codeChecks: [
    {
      id: 'main-tests',
      type: 'tests',
      file: 'fees.test.js',
      on: 'main',
      title: 'The fix is on main, and the tests pass',
      points: 25,
      why: 'Only what is merged into main reaches Finance.',
      hint: 'Fix fees.js, commit it, and merge your branch into main.',
    },
    {
      id: 'main-edges',
      type: 'tests',
      file: 'review.test.js',
      source: hidden,
      on: 'main',
      title: 'Our extra tests pass on main',
      points: 15,
      why: 'The fix must work just below and well past the limits too.',
      hint: '30 or more days: >=, not >. The same for 60.',
    },
    {
      id: 'commit',
      type: 'commits',
      messageIncludes: ['fee', 'late', '30', '60'],
      title: 'A commit with a clear message',
      points: 20,
      why: 'Commit messages are how the team knows what changed and why.',
      hint: 'git add fees.js, then git commit -m "Fix late fees on exactly 30 and 60 days".',
    },
    {
      id: 'merged',
      type: 'branch-merged',
      title: 'Done on a branch, then merged',
      points: 25,
      why: 'Branches keep main working while a change is in progress.',
      hint: 'git checkout -b fix/late-fees before you change anything; git merge fix/late-fees on main at the end.',
    },
    {
      id: 'clean',
      type: 'clean',
      title: 'Everything committed, back on main',
      points: 15,
      why: 'Uncommitted changes exist only on your machine.',
      hint: 'git status should say: nothing to commit, working tree clean (on branch main).',
    },
  ],
  passScore: 70,
  xp: 110,
  skills: {
    programming: 25,
    debugging: 25,
    'software-testing': 15,
    'software-design': 15,
  },
  feedback: {
    excellent: `Hi {name},

Textbook: a branch, a tested fix, a clear commit message and a clean merge. That’s how every change here ships.

Samuel`,
    good: `Hi {name},

Nearly; one step of the workflow is missing. See the notes.

Samuel`,
    pass: `Hi {name},

The fix may be right, but it isn’t on main the way it should be. The notes explain.

Samuel`,
    fail: `Hi {name},

Start in the Terminal: git checkout -b fix/late-fees.

Samuel`,
  },
}
