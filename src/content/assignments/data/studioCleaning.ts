import type { AssignmentInput } from '../../schemas'
import { bookingsRaw, CLIENT_NAMES } from '../../../tools/datastudio/data'
import type { DataStudioState, Step } from '../../../tools/datastudio/schema'
import { numbers } from '../../../tools/datastudio/stats'
import { cleanTable } from '../../../tools/datastudio/transform'

/**
 * Data Analysis (Junior Data Analyst): clean a messy export in Data Studio
 * with applied steps. Teaches: profiling columns, repeatable cleaning
 * steps (instead of editing by hand), types, duplicates and test rows.
 */
const STEPS: Step[] = [
  { kind: 'remove-blank', column: 'client' },
  { kind: 'dedupe', columns: ['booking_id'] },
  { kind: 'trim', column: 'client' },
  { kind: 'case', column: 'client', to: 'proper' },
  { kind: 'trim', column: 'region' },
  { kind: 'case', column: 'region', to: 'proper' },
  { kind: 'case', column: 'status', to: 'proper' },
  { kind: 'type', column: 'value', to: 'number' },
  { kind: 'type', column: 'booked_on', to: 'date' },
]

const raw = bookingsRaw()
const clean = cleanTable({ ...raw, steps: STEPS }).table
const total = numbers(clean, 'value').reduce((s, v) => s + v, 0)

const start: DataStudioState = {
  datasets: [raw],
  queries: [],
  dashboard: { title: 'Dashboard', tiles: [] },
  questions: [
    {
      id: 'rows',
      question: 'How many real bookings are there once the data is clean?',
      kind: 'number',
      options: [],
      unit: 'bookings',
      answer: '',
    },
    {
      id: 'total',
      question: 'What is the total value of those bookings?',
      kind: 'number',
      options: [],
      unit: '£',
      answer: '',
    },
  ],
}

const solution: DataStudioState = {
  ...start,
  datasets: [{ ...raw, steps: STEPS }],
  questions: start.questions.map((q) => ({
    ...q,
    answer: q.id === 'rows' ? String(clean.rows.length) : String(total),
  })),
}

export const studioCleaning: AssignmentInput = {
  id: 'studio-cleaning',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'junior-data-analyst',
  order: 3,
  kind: 'tool',
  title: 'Clean the bookings export in Data Studio',
  summary:
    'Use repeatable cleaning steps to turn a messy export into a table you can trust.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Same mess, better tool: the bookings export',
    body: `Hi {name},

You cleaned the customer export in a spreadsheet. Now meet **Data Studio**, where we clean data with **applied steps**: each change is recorded, so next month the same steps clean the new export in seconds, and anyone can check exactly what was done.

The **bookings** dataset is the website’s export of free-review bookings. It has the usual problems: spaces and capitals in names and regions, values as text with pound signs, two date formats, a test booking with no client, and some bookings exported twice.

Please clean it with steps so that:
• every booking appears once (booking_id is unique) and the test row is gone,
• client and region names are tidy and consistent,
• status is just “Confirmed” or “Cancelled”,
• value is a number and booked_on is a date.

Then answer the two questions in **Questions**.

Amara`,
  },
  whyItMatters:
    'Analysts spend most of their time preparing data. Doing it with recorded steps instead of by hand makes the work repeatable, checkable and fast the next time, which is how professional data tools (and teams) work.',
  objectives: [
    'Profile a dataset to find its problems',
    'Clean with recorded, repeatable steps',
    'Set the right types so numbers and dates can be used',
  ],
  steps: [
    {
      id: 'profile',
      title: 'Find the problems',
      instructions:
        'In **Data**, look at the column profiles above the table: blanks, and how many distinct values. 12 clients shouldn’t show as 30 different names. Text with spaces around it is highlighted.',
    },
    {
      id: 'rows',
      title: 'Remove the bad rows',
      instructions:
        'Add **Remove blank rows** on client (the test booking), then **Remove duplicates** by booking_id.',
    },
    {
      id: 'text',
      title: 'Tidy the text',
      instructions:
        '**Trim spaces** and **Change capitals** (Capitalise Each Word) on client and region; change capitals on status too.',
    },
    {
      id: 'types',
      title: 'Fix the types',
      instructions:
        '**Change type** of value to number (the £ signs and commas are handled) and of booked_on to date (both formats are understood).',
      hint: 'If a step goes wrong, remove it and add it again: the raw data is never changed.',
    },
    {
      id: 'answer',
      title: 'Answer the questions',
      instructions:
        'The clean table’s row count is on the Clean tab; the total of value is in its column profile. Fill both in **Questions**, then **Submit to {manager}**.',
    },
  ],
  tool: {
    id: 'datastudio',
    title: 'Data Studio: bookings',
    start,
    solution,
    checks: [
      {
        id: 'rows',
        type: 'cleaned',
        dataset: 'bookings',
        rows: clean.rows.length,
        unique: 'booking_id',
        noBlanks: ['client'],
        title: 'Every booking once, and no test rows',
        points: 25,
        why: 'Duplicates and test rows inflate every count and total.',
        hint: 'Remove blank rows on client, then remove duplicates by booking_id.',
      },
      {
        id: 'text',
        type: 'cleaned',
        dataset: 'bookings',
        allowed: [
          { column: 'client', values: CLIENT_NAMES },
          { column: 'region', values: ['North', 'South', 'West'] },
          { column: 'status', values: ['Confirmed', 'Cancelled'] },
        ],
        title: 'Consistent names, regions and statuses',
        points: 30,
        why: '“north”, “ North” and “North” must count as one region, or every summary splits it three ways.',
        hint: 'Trim spaces and capitalise each word in client and region; capitalise status.',
      },
      {
        id: 'types',
        type: 'cleaned',
        dataset: 'bookings',
        types: { value: 'number', booked_on: 'date' },
        title: 'Numbers and dates',
        points: 25,
        why: 'Text can’t be added up or sorted by date.',
        hint: 'Change type: value to number, booked_on to date.',
      },
      {
        id: 'answers',
        type: 'answers',
        items: [
          { id: 'rows', value: clean.rows.length, tolerance: 0 },
          { id: 'total', value: total, tolerance: 1 },
        ],
        title: 'The questions answered',
        points: 20,
        why: 'The point of cleaning is numbers you can report with confidence.',
        hint: 'Use the clean table’s row count and the total in the value column’s profile.',
      },
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { 'data-cleaning': 55, accuracy: 25, 'data-analysis': 10 },
  feedback: {
    excellent: `Hi {name},

Clean, consistent and repeatable. Next month we run the same steps on the new export and it’s done. That’s exactly why we work this way.

Amara`,
    good: `Hi {name},

Nearly clean; a few values still slip through. See the notes.

Amara`,
    pass: `Hi {name},

The data isn’t clean enough to report from yet. The notes say what’s left.

Amara`,
    fail: `Hi {name},

Start with the column profiles: they show exactly what needs cleaning.

Amara`,
  },
}
