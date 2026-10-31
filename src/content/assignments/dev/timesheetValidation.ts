import type { AssignmentInput } from '../../schemas'

/**
 * Development 2 (Junior Developer): validate timesheet entries and total
 * the valid hours per project. Teaches: turning written rules into code,
 * conditions, regular expressions, loops over objects, and building up a
 * result step by step.
 */
const starter = `/**
 * Timesheet rules. Use these exact messages: the app shows them to staff.
 */
export const MESSAGES = {
  date: 'Date must be in the format YYYY-MM-DD',
  project: 'Project code must look like PRJ-1234',
  hours: 'Hours must be more than 0 and no more than 12',
  quarters: 'Hours must be in quarter hours',
  description: 'Description must be at least 5 characters',
}

/**
 * Checks one timesheet entry, e.g.
 *   { date: '2026-03-02', project: 'PRJ-1042', hours: 7.5, description: 'Audit fieldwork' }
 *
 * Returns a list of problems, in the order the rules are listed in MESSAGES.
 * An entry with no problems gives an empty list.
 */
export function validateEntry(entry) {
  const problems = []
  // TODO: check each rule and add its message when the entry breaks it.
  return problems
}

/**
 * Adds up the hours of the VALID entries for each project, e.g.
 *   { 'PRJ-1042': 15, 'PRJ-2001': 3.25 }
 * Invalid entries are left out completely.
 */
export function hoursByProject(entries) {
  const totals = {}
  // TODO
  return totals
}
`

const solution = `export const MESSAGES = {
  date: 'Date must be in the format YYYY-MM-DD',
  project: 'Project code must look like PRJ-1234',
  hours: 'Hours must be more than 0 and no more than 12',
  quarters: 'Hours must be in quarter hours',
  description: 'Description must be at least 5 characters',
}

export function validateEntry(entry) {
  const problems = []
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(entry.date ?? '')) problems.push(MESSAGES.date)
  if (!/^PRJ-\\d{4}$/.test(entry.project ?? '')) problems.push(MESSAGES.project)
  const hours = entry.hours
  if (typeof hours !== 'number' || !(hours > 0 && hours <= 12)) {
    problems.push(MESSAGES.hours)
  } else if (hours * 4 !== Math.round(hours * 4)) {
    problems.push(MESSAGES.quarters)
  }
  if ((entry.description ?? '').trim().length < 5) problems.push(MESSAGES.description)
  return problems
}

export function hoursByProject(entries) {
  const totals = {}
  for (const entry of entries) {
    if (validateEntry(entry).length > 0) continue
    totals[entry.project] = (totals[entry.project] ?? 0) + entry.hours
  }
  return totals
}
`

const visibleTests = `import { MESSAGES, validateEntry, hoursByProject } from './timesheet.js'

const good = { date: '2026-03-02', project: 'PRJ-1042', hours: 7.5, description: 'Audit fieldwork' }

test('a correct entry has no problems', () => {
  expect(validateEntry(good)).toEqual([])
})

test('too many hours', () => {
  expect(validateEntry({ ...good, hours: 14 })).toEqual([MESSAGES.hours])
})

test('a badly written project code', () => {
  expect(validateEntry({ ...good, project: 'prj1042' })).toEqual([MESSAGES.project])
})

test('hours by project', () => {
  expect(hoursByProject([good, { ...good, hours: 2 }])).toEqual({ 'PRJ-1042': 9.5 })
})
`

const hiddenTests = `import { MESSAGES, validateEntry, hoursByProject } from './timesheet.js'

const good = { date: '2026-03-02', project: 'PRJ-1042', hours: 7.5, description: 'Audit fieldwork' }

test('dates must be YYYY-MM-DD', () => {
  expect(validateEntry({ ...good, date: '02/03/2026' })).toEqual([MESSAGES.date])
  expect(validateEntry({ ...good, date: '2026-3-2' })).toEqual([MESSAGES.date])
})

test('project codes need four digits', () => {
  expect(validateEntry({ ...good, project: 'PRJ-104' })).toEqual([MESSAGES.project])
  expect(validateEntry({ ...good, project: 'PRJ-10420' })).toEqual([MESSAGES.project])
})

test('hours at the limits', () => {
  expect(validateEntry({ ...good, hours: 12 })).toEqual([])
  expect(validateEntry({ ...good, hours: 0.25 })).toEqual([])
  expect(validateEntry({ ...good, hours: 0 })).toEqual([MESSAGES.hours])
  expect(validateEntry({ ...good, hours: -2 })).toEqual([MESSAGES.hours])
  expect(validateEntry({ ...good, hours: 12.25 })).toEqual([MESSAGES.hours])
})

test('quarter hours only', () => {
  expect(validateEntry({ ...good, hours: 1.1 })).toEqual([MESSAGES.quarters])
  expect(validateEntry({ ...good, hours: 3.75 })).toEqual([])
})

test('descriptions need five characters, not counting spaces around them', () => {
  expect(validateEntry({ ...good, description: '  ok  ' })).toEqual([MESSAGES.description])
  expect(validateEntry({ ...good, description: 'Calls' })).toEqual([])
})

test('several problems, in order', () => {
  expect(validateEntry({ date: '', project: '', hours: 20, description: '' })).toEqual([
    MESSAGES.date,
    MESSAGES.project,
    MESSAGES.hours,
    MESSAGES.description,
  ])
})

test('hours by project leaves out invalid entries', () => {
  const entries = [
    good,
    { ...good, project: 'PRJ-2001', hours: 3.25 },
    { ...good, hours: 30 },
    { ...good, project: 'PRJ-2001', description: '' },
    { ...good, hours: 7.5 },
  ]
  expect(hoursByProject(entries)).toEqual({ 'PRJ-1042': 15, 'PRJ-2001': 3.25 })
  expect(hoursByProject([])).toEqual({})
})
`

export const timesheetValidation: AssignmentInput = {
  id: 'timesheet-validation',
  version: 1,
  careerId: 'software-development',
  levelId: 'junior-developer',
  order: 2,
  kind: 'code',
  title: 'Check timesheet entries',
  summary: 'Turn the timesheet rules into code, and total the valid hours per project.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Timesheets: stop the bad entries',
    body: `Hi {name},

People keep entering timesheets that break the rules (14-hour days, made-up project codes, “x” as a description), and Finance has to chase every one by hand.

Please write the checks in timesheet.js:
• **validateEntry** returns the list of problems with an entry, using the exact messages in MESSAGES and in the same order,
• **hoursByProject** adds up the hours of the valid entries for each project.

The rules are: a date written as YYYY-MM-DD; a project code like PRJ-1234; hours more than 0 and no more than 12, in quarter hours; and a description of at least 5 characters (not counting spaces at either end).

timesheet.test.js has a few tests to start you off. {senior} will review it, with a set of extra tests.

Samuel`,
  },
  whyItMatters:
    'Turning a written specification into code that handles every case, including the awkward ones at the edges, is the core of a developer’s job. Validating input early saves everyone downstream from chasing mistakes.',
  objectives: [
    'Turn written rules into conditions',
    'Check text formats with regular expressions',
    'Build up a result while looping over data',
  ],
  steps: [
    {
      id: 'format',
      title: 'Dates and project codes',
      instructions:
        'In validateEntry, test each format with a regular expression, e.g. `/^\\d{4}-\\d{2}-\\d{2}$/.test(entry.date)`, and push `MESSAGES.date` when it fails. Project codes are similar: `/^PRJ-\\d{4}$/`.',
      hint: '^ and $ make the pattern match the whole text, not just part of it.',
    },
    {
      id: 'hours',
      title: 'Hours',
      instructions:
        'Hours must be more than 0 and no more than 12. Only if they are in that range, check quarter hours: `hours * 4` must be a whole number (`Number.isInteger(hours * 4)`).',
    },
    {
      id: 'description',
      title: 'Description',
      instructions: 'Trim the description and check it has at least 5 characters.',
    },
    {
      id: 'totals',
      title: 'Hours by project',
      instructions:
        'In hoursByProject, loop over the entries, skip any with problems, and add the hours to `totals[entry.project]` (starting from 0).',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions:
        'Run the tests. When they all pass, click **Submit to {manager}** in the task pane.',
    },
  ],
  project: {
    title: 'Timesheets: entry checks',
    files: [
      { name: 'timesheet.js', text: starter },
      { name: 'timesheet.test.js', text: visibleTests },
    ],
  },
  codeSolution: { 'timesheet.js': solution },
  codeChecks: [
    {
      id: 'visible-tests',
      type: 'tests',
      file: 'timesheet.test.js',
      title: 'The starter tests pass',
      points: 30,
      why: 'The basic cases must work before anything else.',
      hint: 'Click Run tests and work through the failures one at a time.',
    },
    {
      id: 'review-tests',
      type: 'tests',
      file: 'review.test.js',
      source: hiddenTests,
      title: 'The reviewer’s tests pass',
      points: 70,
      why: 'Real input hits every edge: exactly 12 hours, 0, negative numbers, odd formats and several problems at once.',
      hint: 'Check the limits (0, 12, 12.25), quarter hours, trimmed descriptions, and the order of the messages.',
    },
  ],
  passScore: 70,
  xp: 120,
  skills: { programming: 50, 'software-testing': 20, debugging: 20 },
  feedback: {
    excellent: `Hi {name},

Every rule, every edge case, every message in the right order. {senior} approved it without a single comment, which is a first.

Samuel`,
    good: `Hi {name},

Good work; a few edge cases still slip through. See the notes.

Samuel`,
    pass: `Hi {name},

The basics work, but several of the reviewer’s tests fail. The notes say which.

Samuel`,
    fail: `Hi {name},

Not yet. Start with one rule, run the tests, then add the next.

Samuel`,
  },
}
