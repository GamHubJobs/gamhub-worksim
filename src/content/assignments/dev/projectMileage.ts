import type { AssignmentInput } from '../../schemas'
import { initRepository } from '../../../game/code/git'
import { runTerminal } from '../../../game/code/terminal'

/**
 * Software Development integrated project (Lead Developer): ship Finance's
 * new mileage rates. Three linked stages:
 *
 * 1. Code: cover the current rules with tests before touching them.
 * 2. Code and Git: implement the new rules on a branch, test, merge.
 * 3. Code, Git and Word Craft: the changelog, the release commit and the notes.
 *
 * Teaches: safety nets before changes, changing behaviour deliberately
 * (and updating tests with it), and shipping with clear release notes.
 */
const PROJECT = 'mileage-release'

const feedback = (excellent: string) => ({
  excellent: `Hi {name},

${excellent}

Samuel`,
  good: `Hi {name},

Nearly; one part needs fixing. See the notes.

Samuel`,
  pass: `Hi {name},

Part of this isn’t right yet. The notes explain.

Samuel`,
  fail: `Hi {name},

Not yet. Have a look at the notes and try again.

Samuel`,
})

const oldRules = `/**
 * Mileage allowance for business journeys in a personal car:
 *   - 45p a mile for the first 10,000 business miles in the tax year,
 *   - 25p a mile after that.
 * milesSoFar is how many business miles were already claimed this year.
 * The result is in pounds, rounded to pennies.
 */
export function mileageAllowance(miles, milesSoFar) {
  const LIMIT = 10000
  const atHigh = Math.max(0, Math.min(miles, LIMIT - milesSoFar))
  const atLow = miles - atHigh
  return round(atHigh * 0.45 + atLow * 0.25)
}

function round(n) {
  return Math.round(n * 100) / 100
}
`

const newRules = `/**
 * Mileage allowance for business journeys in a personal car (from 2026):
 *   - 50p a mile for the first 10,000 business miles in the tax year,
 *   - 30p a mile after that,
 *   - plus 5p a mile for each colleague carried as a passenger.
 * milesSoFar is how many business miles were already claimed this year.
 * The result is in pounds, rounded to pennies.
 */
export function mileageAllowance(miles, milesSoFar, passengers = 0) {
  const LIMIT = 10000
  const atHigh = Math.max(0, Math.min(miles, LIMIT - milesSoFar))
  const atLow = miles - atHigh
  return round(atHigh * 0.5 + atLow * 0.3 + miles * passengers * 0.05)
}

function round(n) {
  return Math.round(n * 100) / 100
}
`

// ---------------------------------------------------------------------------
// Stage 1: tests before changes
// ---------------------------------------------------------------------------

const emptyTests = `import { mileageAllowance } from './mileage.js'

// Write tests for the current rules here. For example:
// test('a short trip early in the year', () => {
//   expect(mileageAllowance(100, 0)).toBe(45)
// })
`

const ownTests = `import { mileageAllowance } from './mileage.js'

test('a short trip early in the year', () => {
  expect(mileageAllowance(100, 0)).toBe(45)
})

test('a trip after the limit', () => {
  expect(mileageAllowance(100, 12000)).toBe(25)
})

test('a trip that crosses the limit', () => {
  expect(mileageAllowance(200, 9900)).toBe(70)
})

test('exactly at the limit', () => {
  expect(mileageAllowance(100, 9900)).toBe(45)
})

test('no miles, no money', () => {
  expect(mileageAllowance(0, 500)).toBe(0)
})

test('pennies are rounded', () => {
  expect(mileageAllowance(7, 0)).toBe(3.15)
})
`

export const mileageTests: AssignmentInput = {
  id: 'mileage-tests',
  version: 1,
  careerId: 'software-development',
  levelId: 'lead-developer',
  order: 8,
  projectId: PROJECT,
  stage: 1,
  kind: 'code',
  title: 'Mileage release, stage 1: a safety net first',
  summary: 'Cover today’s mileage rules with tests before anyone changes them.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Project: the new mileage rates',
    body: `Hi {name},

Finance are changing the **mileage allowance** for business journeys from next month, and as Lead Developer you’re shipping it, in three stages:

1. **A safety net** (this email): tests for today’s rules, before we change anything.
2. **The change**: the new rules, on a branch, tested and merged.
3. **The release**: the changelog, the release commit and release notes for Finance.

mileage.js has no tests at all, which is how bugs slip in. Please write **at least six tests** in mileage.test.js that describe today’s rules (they must all pass), and that would catch mistakes: the rates, the 10,000-mile limit, and trips that cross it.

Samuel`,
  },
  whyItMatters:
    'Changing code without tests means you can’t tell whether you broke something. Writing tests for the current behaviour first (a safety net) is how experienced developers change important rules with confidence.',
  objectives: [
    'Describe existing behaviour with tests',
    'Test the edges: limits and trips that cross them',
    'Write tests that catch real mistakes',
  ],
  steps: [
    {
      id: 'read',
      title: 'Read the rules',
      instructions:
        'Read the comment in **mileage.js**: two rates, and a limit of 10,000 miles a year.',
    },
    {
      id: 'tests',
      title: 'Write the tests',
      instructions:
        'In **mileage.test.js**, write at least six tests: a trip before the limit, after it, one that crosses it, exactly at it, no miles, and rounding. Run them with **Run tests**.',
      hint: 'A trip of 200 miles starting at 9,900 is 100 miles at 45p and 100 at 25p: £70.',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Click **Submit to {manager}**.',
    },
  ],
  project: {
    title: 'Expenses: mileage',
    files: [
      { name: 'mileage.js', text: oldRules, readOnly: true },
      { name: 'mileage.test.js', text: emptyTests },
    ],
  },
  codeSolution: { 'mileage.test.js': ownTests },
  codeChecks: [
    {
      id: 'own-tests',
      type: 'own-tests',
      file: 'mileage.test.js',
      minTests: 6,
      title: 'At least six tests, all passing on today’s rules',
      points: 40,
      why: 'A safety net must describe what the code does now.',
      hint: 'Write six or more tests and run them: they must all pass.',
    },
    {
      id: 'catches',
      type: 'mutants',
      file: 'mileage.test.js',
      target: 'mileage.js',
      mutants: [
        {
          description: 'the first rate is wrong (40p)',
          find: 'atHigh * 0.45',
          replace: 'atHigh * 0.4',
        },
        {
          description: 'the second rate is wrong (45p)',
          find: 'atLow * 0.25',
          replace: 'atLow * 0.45',
        },
        {
          description: 'miles already claimed are ignored',
          find: 'LIMIT - milesSoFar',
          replace: 'LIMIT',
        },
        {
          description: 'trips after the limit go negative',
          find: 'Math.max(0, Math.min(miles, LIMIT - milesSoFar))',
          replace: 'Math.min(miles, LIMIT - milesSoFar)',
        },
      ],
      title: 'Your tests catch mistakes',
      points: 60,
      why: 'A test that passes whatever the code does protects nothing.',
      hint: 'Test both rates, a trip after the limit, and one that crosses it.',
    },
  ],
  passScore: 70,
  xp: 150,
  skills: { 'software-testing': 45, programming: 15 },
  feedback: feedback(
    'A real safety net: every mistake we tried, your tests caught. Now we can change the rules with confidence. Stage 2 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 2: the change, on a branch
// ---------------------------------------------------------------------------

const teamTests = `import { mileageAllowance } from './mileage.js'

test('50p a mile up to the limit', () => {
  expect(mileageAllowance(100, 0)).toBe(50)
})

test('30p a mile after the limit', () => {
  expect(mileageAllowance(100, 12000)).toBe(30)
})

test('a trip that crosses the limit', () => {
  expect(mileageAllowance(200, 9900)).toBe(80)
})

test('5p a mile for each passenger', () => {
  expect(mileageAllowance(100, 0, 2)).toBe(60)
})
`

const hidden = `import { mileageAllowance } from './mileage.js'

test('no passengers by default', () => {
  expect(mileageAllowance(40, 0)).toBe(20)
})

test('passengers after the limit', () => {
  expect(mileageAllowance(10, 20000, 1)).toBe(3.5)
})

test('pennies are rounded', () => {
  expect(mileageAllowance(7, 9995, 1)).toBe(3.45)
})
`

function changeSolution() {
  const files: Record<string, string> = {
    'mileage.js': oldRules,
    'mileage.test.js': teamTests,
  }
  let state = { files, git: initRepository(files) }
  const run = (line: string) => {
    const r = runTerminal(state.files, state.git, line)
    state = { files: r.files, git: r.git }
  }
  run('git checkout -b feature/mileage-2026')
  state.files = { ...state.files, 'mileage.js': newRules }
  run('git add mileage.js')
  run('git commit -m "New mileage rates: 50p and 30p, plus 5p per passenger"')
  run('git checkout main')
  run('git merge feature/mileage-2026')
  return {
    language: 'javascript' as const,
    files: [
      { name: 'mileage.js', text: state.files['mileage.js'], readOnly: false },
      { name: 'mileage.test.js', text: state.files['mileage.test.js'], readOnly: true },
    ],
    git: state.git,
  }
}

export const mileageChange: AssignmentInput = {
  id: 'mileage-change',
  version: 1,
  careerId: 'software-development',
  levelId: 'lead-developer',
  order: 9,
  projectId: PROJECT,
  stage: 2,
  kind: 'code',
  title: 'Mileage release, stage 2: the new rules',
  summary: 'Implement the new rates and the passenger rate on a branch, test and merge.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Mileage release, stage 2: the change',
    body: `Hi {name},

Finance have confirmed the **new rules**:
• **50p** a mile for the first 10,000 business miles in the tax year (was 45p),
• **30p** a mile after that (was 25p),
• plus **5p a mile for each passenger** (a colleague on the same trip), a new optional argument that defaults to none.

The team has updated the tests in mileage.test.js to the new rules, so they fail for now. Please:
1. create a branch: \`git checkout -b feature/mileage-2026\`,
2. change mileage.js (including its comment) until \`npm test\` passes,
3. commit with a clear message, then merge into main.

Samuel`,
  },
  whyItMatters:
    'Changing business rules is everyday work for developers. Doing it on a branch, with tests that describe the new rules, means the change can be reviewed and nothing half-finished reaches the product.',
  objectives: [
    'Change behaviour deliberately, guided by tests',
    'Add an optional argument without breaking old calls',
    'Ship the change through a branch and a merge',
  ],
  steps: [
    {
      id: 'branch',
      title: 'Branch',
      instructions: 'In the **Terminal**: `git checkout -b feature/mileage-2026`.',
    },
    {
      id: 'change',
      title: 'Change and test',
      instructions:
        'Change the rates, add `passengers = 0` as a third argument and add `miles * passengers * 0.05`. Update the comment. Run `npm test`.',
      hint: '`passengers = 0` gives the argument a default, so existing calls with two arguments still work.',
    },
    {
      id: 'merge',
      title: 'Commit and merge',
      instructions:
        '`git add mileage.js`, `git commit -m "New mileage rates: …"`, `git checkout main`, `git merge feature/mileage-2026`.',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Click **Submit to {manager}**.',
    },
  ],
  project: {
    title: 'Expenses: mileage',
    git: true,
    files: [
      { name: 'mileage.js', text: oldRules },
      { name: 'mileage.test.js', text: teamTests, readOnly: true },
    ],
  },
  codeSolution: { 'mileage.js': newRules },
  codeSolutionProject: changeSolution(),
  codeChecks: [
    {
      id: 'main-tests',
      type: 'tests',
      file: 'mileage.test.js',
      on: 'main',
      title: 'The new rules are on main, and the tests pass',
      points: 30,
      why: 'Only what is merged into main reaches Finance.',
      hint: 'Change mileage.js, commit it, and merge your branch into main.',
    },
    {
      id: 'main-edges',
      type: 'tests',
      file: 'review.test.js',
      source: hidden,
      on: 'main',
      title: 'Our extra tests pass on main',
      points: 20,
      why: 'Passengers default to none, and pennies are still rounded.',
      hint: 'Give passengers a default of 0 and keep the rounding.',
    },
    {
      id: 'commit',
      type: 'commits',
      messageIncludes: ['mileage'],
      title: 'A commit with a clear message',
      points: 15,
      why: 'The message is what reviewers and future you will read.',
      hint: 'git commit -m "New mileage rates: 50p and 30p, plus 5p per passenger".',
    },
    {
      id: 'merged',
      type: 'branch-merged',
      title: 'Done on a branch, then merged',
      points: 20,
      why: 'Main keeps working while the change is in progress.',
      hint: 'Create the branch before changing anything; merge it at the end.',
    },
    {
      id: 'clean',
      type: 'clean',
      title: 'Everything committed, back on main',
      points: 15,
      why: 'Uncommitted changes exist only on your machine.',
      hint: 'git status should say: nothing to commit, working tree clean.',
    },
  ],
  passScore: 70,
  xp: 170,
  skills: { programming: 35, 'software-testing': 20, 'software-design': 20 },
  feedback: feedback(
    'The new rules are on main, tested, through a branch with a clear commit. Stage 3 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 3: the release
// ---------------------------------------------------------------------------

const changelog = `# Changelog

## 1.4.0
- Expense claims can include a receipt photo.

## 1.3.2
- Fixed: late fees on invoices paid exactly 30 or 60 days late.
`

const releasedChangelog = changelog.replace(
  '# Changelog\n',
  `# Changelog

## 2.0.0
- New mileage rates: 50p a mile up to 10,000 miles, then 30p.
- New: 5p a mile for each passenger.
`,
)

function releaseSolution() {
  const files: Record<string, string> = {
    'mileage.js': newRules,
    'mileage.test.js': teamTests,
    'CHANGELOG.md': changelog,
  }
  let state = { files, git: initRepository(files) }
  const run = (line: string) => {
    const r = runTerminal(state.files, state.git, line)
    state = { files: r.files, git: r.git }
  }
  state.files = { ...state.files, 'CHANGELOG.md': releasedChangelog }
  run('git add CHANGELOG.md')
  run('git commit -m "Release 2.0.0: new mileage rates"')
  return {
    language: 'javascript' as const,
    files: [
      { name: 'mileage.js', text: newRules, readOnly: true },
      { name: 'mileage.test.js', text: teamTests, readOnly: true },
      { name: 'CHANGELOG.md', text: state.files['CHANGELOG.md'], readOnly: false },
    ],
    git: state.git,
  }
}

export const mileageRelease: AssignmentInput = {
  id: 'mileage-release',
  version: 1,
  careerId: 'software-development',
  levelId: 'lead-developer',
  order: 10,
  projectId: PROJECT,
  stage: 3,
  kind: 'code',
  title: 'Mileage release, stage 3: ship it',
  summary:
    'Update the changelog, commit the release, and write the release notes for Finance.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Mileage release, stage 3: the release',
    body: `Hi {name},

Last stage: shipping it.

1. In **CHANGELOG.md**, add a **2.0.0** entry at the top saying what changed.
2. Commit it on main with the message **“Release 2.0.0: new mileage rates”**, and leave the working tree clean.
3. Write the **release notes** for Finance in Word Craft: what changes for people claiming mileage, with the new rates (**50p**, **30p** after **10,000** miles, and the **passenger** rate), and when it applies.

Reply to this email with the project and the release notes attached.

Samuel`,
  },
  whyItMatters:
    'A change is only finished when the people affected know about it. The changelog tells developers; release notes tell users, in their words, what changes for them.',
  objectives: [
    'Keep a changelog for every release',
    'Mark a release with a clear commit',
    'Explain a change to non-developers',
  ],
  steps: [
    {
      id: 'changelog',
      title: 'Changelog',
      instructions:
        'Add a `## 2.0.0` section at the top of **CHANGELOG.md** with the changes.',
    },
    {
      id: 'commit',
      title: 'Release commit',
      instructions:
        '`git add CHANGELOG.md`, then `git commit -m "Release 2.0.0: new mileage rates"`. `git status` should be clean.',
    },
    {
      id: 'notes',
      title: 'Release notes',
      instructions:
        'In **Word Craft**, open **Release notes: mileage rates**. Plain English for Finance and everyone who claims mileage. 80 to 400 words.',
    },
    {
      id: 'send',
      title: 'Hand in',
      instructions:
        'Reply to {manager}’s email with the project and the release notes attached.',
    },
  ],
  project: {
    title: 'Expenses: mileage',
    git: true,
    files: [
      { name: 'mileage.js', text: newRules, readOnly: true },
      { name: 'mileage.test.js', text: teamTests, readOnly: true },
      { name: 'CHANGELOG.md', text: changelog },
    ],
  },
  codeSolution: { 'CHANGELOG.md': releasedChangelog },
  codeSolutionProject: releaseSolution(),
  codeChecks: [
    {
      id: 'tests',
      type: 'tests',
      file: 'mileage.test.js',
      on: 'main',
      title: 'The release still passes its tests',
      points: 15,
      why: 'Never release something that fails its tests.',
      hint: 'Leave mileage.js as it is.',
    },
    {
      id: 'release-commit',
      type: 'commits',
      messageIncludes: ['2.0.0'],
      title: 'The release commit',
      points: 40,
      why: 'The release commit is how everyone finds this version later.',
      hint: 'git commit -m "Release 2.0.0: new mileage rates".',
    },
    {
      id: 'clean',
      type: 'clean',
      title: 'Everything committed, on main',
      points: 15,
      why: 'A release must contain exactly what was committed.',
      hint: 'git status should say: nothing to commit, working tree clean.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Release notes: mileage rates',
      template: 'memo',
      checks: [
        {
          id: 'notes-rates',
          type: 'mentions',
          title: 'The new rules',
          terms: [['50p'], ['30p'], ['10,000', '10000'], ['passenger']],
          points: 30,
          why: 'Claimants need the exact new rates.',
          hint: 'Give both rates, the 10,000-mile limit and the passenger rate.',
        },
        {
          id: 'notes-length',
          type: 'length',
          min: 80,
          max: 400,
          title: 'Length',
          points: 15,
          why: 'Release notes are read quickly.',
          hint: 'Aim for 80 to 400 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: { 'technical-writing': 35, 'software-design': 15, programming: 15 },
  feedback: feedback(
    'Shipped: tested, merged, released and explained. Finance have sent the notes round to everyone who claims mileage. That’s the whole job, done well.',
  ),
}
