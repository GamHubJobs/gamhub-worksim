import type { AssignmentInput } from '../../schemas'

/**
 * Data Analysis, in the Code editor: the monthly survey export is cleaned by
 * hand in Grid Craft every month. Write the cleaning once, as a function,
 * with tests, so it is the same every time. Teaches: the cleaning rules an
 * analyst applies (trim, consistent case, numbers from text, valid ranges,
 * duplicates), written as code that can be checked and reused.
 */
const clean = `/**
 * The monthly customer survey export, cleaned for analysis.
 * Each row: { email, region, score } exactly as the survey tool sends it.
 */
export function cleanRows(rows) {
  return rows.map((row) => ({
    email: row.email,
    region: row.region,
    score: row.score,
  }))
}
`

const cleanFixed = `/**
 * The monthly customer survey export, cleaned for analysis.
 * Each row: { email, region, score } exactly as the survey tool sends it.
 */
export function cleanRows(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const email = String(row.email ?? '').trim().toLowerCase()
    const score = Number(row.score)
    if (!email || String(row.score ?? '').trim() === '') continue
    if (!Number.isFinite(score) || score < 0 || score > 10) continue
    if (seen.has(email)) continue
    seen.add(email)
    const region = String(row.region ?? '').trim().toLowerCase()
    out.push({
      email,
      region: region.charAt(0).toUpperCase() + region.slice(1),
      score,
    })
  }
  return out
}
`

const tests = `import { cleanRows } from './clean.js'

test('spaces and capitals tidied; the score is a number', () => {
  expect(cleanRows([{ email: ' Ana@Example.com ', region: ' north', score: '8' }])).toEqual([
    { email: 'ana@example.com', region: 'North', score: 8 },
  ])
})

test('a duplicate email counts once (the first answer)', () => {
  const rows = [
    { email: 'ben@example.com', region: 'South', score: 6 },
    { email: 'BEN@example.com', region: 'South', score: 9 },
  ]
  expect(cleanRows(rows)).toEqual([{ email: 'ben@example.com', region: 'South', score: 6 }])
})
`

const hidden = `import { cleanRows } from './clean.js'

test('rows that cannot be used are left out', () => {
  const rows = [
    { email: '', region: 'East', score: 7 },
    { email: 'cy@example.com', region: 'East', score: '' },
    { email: 'di@example.com', region: 'East', score: 11 },
    { email: 'ed@example.com', region: 'East', score: 'n/a' },
    { email: 'fo@example.com', region: 'EAST ', score: '0' },
  ]
  expect(cleanRows(rows)).toEqual([{ email: 'fo@example.com', region: 'East', score: 0 }])
})

test('the order of the answers is kept', () => {
  const rows = [
    { email: 'b@example.com', region: 'west', score: 3 },
    { email: 'a@example.com', region: 'West', score: 10 },
  ]
  expect(cleanRows(rows).map((r) => r.email)).toEqual(['b@example.com', 'a@example.com'])
})
`

export const cleanScript: AssignmentInput = {
  id: 'data-clean-script',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'lead-data-analyst',
  order: 12,
  kind: 'code',
  title: 'Clean the survey export with code',
  summary:
    'Write the monthly survey cleaning once, as a tested function in Code, instead of by hand every month.',
  estimatedMinutes: 40,
  from: 'senior',
  briefing: {
    subject: 'Can we stop cleaning the survey by hand?',
    body: `Hi {name},

Every month someone spends a morning cleaning the customer survey export in Grid Craft, and every month it is done slightly differently, so the months do not compare.

The engineers have set up a small project for us in the **Code** app (clean.js). Could you write **cleanRows** so it does what we do by hand:
• **email**: spaces trimmed, lower case; rows with no email are left out,
• **region**: trimmed, with a capital first letter (“ north” → “North”),
• **score**: a number from 0 to 10; rows with no score, text that is not a number, or a score outside 0–10 are left out,
• **duplicates**: the same email (whatever its capitals) counts once, keeping the first answer.

Try it on a few rows in the **Debug** console as you go, and run the tests.

{senior}`,
  },
  whyItMatters:
    'Cleaning written as code is the same every month, can be checked by tests, and records exactly what was done to the data. It is how analysts make their work repeatable and trustworthy.',
  objectives: [
    'Turn cleaning rules into code: trim, case, numbers, ranges, duplicates',
    'Try the function on real rows as you build it',
    'Prove it with tests',
  ],
  steps: [
    {
      id: 'try',
      title: 'Look at what it does now',
      instructions:
        'In the **Debug** tab, call cleanRows with `[[{"email": " Ana@Example.com ", "region": " north", "score": "8"}]]`. Nothing is cleaned yet.',
    },
    {
      id: 'write',
      title: 'Write the rules',
      instructions:
        'Go through the rows with a loop. For each: tidy the email and region, turn the score into a number (`Number(row.score)`), skip the row if it cannot be used, and skip an email you have already seen (a `Set` remembers them).',
      hint: 'Number("") is 0, not "missing": check for an empty score before turning it into a number.',
    },
    {
      id: 'test',
      title: 'Test',
      instructions:
        'Run the tests, and try the awkward rows from the email in the Debug console.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {senior}** in the task pane.',
    },
  ],
  project: {
    title: 'Survey: monthly cleaning',
    files: [
      { name: 'clean.js', text: clean },
      { name: 'clean.test.js', text: tests, readOnly: true },
    ],
  },
  codeSolution: { 'clean.js': cleanFixed },
  codeSolutionProject: {
    language: 'javascript',
    files: [
      { name: 'clean.js', text: cleanFixed, readOnly: false },
      { name: 'clean.test.js', text: tests, readOnly: true },
    ],
    debug: [
      {
        file: 'clean.js',
        fn: 'cleanRows',
        args: '[[{"email":" Ana@Example.com ","region":" north","score":"8"}]]',
        value: '[{"email":"ana@example.com","region":"North","score":8}]',
        error: null,
      },
    ],
  },
  codeChecks: [
    {
      id: 'tried',
      type: 'debugged',
      fn: 'cleanRows',
      title: 'Tried on real rows in the Debug console',
      points: 15,
      why: 'Looking at real output as you go catches mistakes early.',
      hint: 'Call cleanRows in the Debug tab with a row from the email.',
    },
    {
      id: 'tests',
      type: 'tests',
      file: 'clean.test.js',
      title: 'Tidying and duplicates work',
      points: 35,
      why: 'Inconsistent emails and regions split one customer into several.',
      hint: 'Trim and lower-case the email; give the region a capital first letter; skip emails already seen.',
    },
    {
      id: 'review',
      type: 'tests',
      file: 'review.test.js',
      source: hidden,
      title: 'Unusable rows are left out, and the order is kept',
      points: 50,
      why: 'A blank or impossible score would quietly drag the average down.',
      hint: 'Leave out rows with no email, an empty or non-numeric score, or a score outside 0–10.',
    },
  ],
  passScore: 70,
  xp: 180,
  skills: { 'data-cleaning': 55, 'data-analysis': 25 },
  feedback: {
    excellent: `Hi {name},

That will save a morning every month, and the months will finally compare. Lovely, tested work.

{senior}`,
    good: `Hi {name},

Nearly: a few rows still slip through. See the notes.

{senior}`,
    pass: `Hi {name},

Some of the rules are missing. The notes show which.

{senior}`,
    fail: `Hi {name},

Start by trying cleanRows in the Debug tab with a messy row.

{senior}`,
  },
}
