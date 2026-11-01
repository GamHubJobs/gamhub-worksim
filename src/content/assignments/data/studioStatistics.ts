import type { AssignmentInput } from '../../schemas'
import { training } from '../../../tools/datastudio/data'
import type { DataStudioState, Step } from '../../../tools/datastudio/schema'
import { correlation, numbers, summarise } from '../../../tools/datastudio/stats'
import { cleanTable } from '../../../tools/datastudio/transform'

/**
 * Data Analysis (Senior Data Analyst): did the training programme work?
 * Compare improvement between those who attended and those who didn't,
 * measure the link between hours and improvement, and conclude honestly.
 * Teaches: calculated columns, group comparisons, correlation, and the
 * difference between correlation and cause (voluntary attendance).
 */
const STEP: Step = {
  kind: 'calculate',
  name: 'improvement',
  left: 'score_after',
  op: '-',
  right: 'score_before',
}
const data = training()
const table = cleanTable({ ...data, steps: [STEP] }).table
const attended = table.columns.findIndex((c) => c.name === 'attended')
const yes = summarise(numbers(table, 'improvement', (r) => r[attended] === 'yes'))
const no = summarise(numbers(table, 'improvement', (r) => r[attended] === 'no'))
const r = correlation(table, 'hours', 'improvement').r
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d

const CONCLUSIONS = [
  'The training caused the improvement',
  'Those who trained improved more, but attendance was voluntary, so we cannot be sure the training caused it',
  'The training made no difference',
]

const start: DataStudioState = {
  datasets: [data],
  queries: [],
  dashboard: { title: 'Dashboard', tiles: [] },
  questions: [
    {
      id: 'yes',
      question: 'Average improvement (points) of those who attended',
      kind: 'number',
      options: [],
      unit: 'points',
      answer: '',
    },
    {
      id: 'no',
      question: 'Average improvement (points) of those who did not attend',
      kind: 'number',
      options: [],
      unit: 'points',
      answer: '',
    },
    {
      id: 'r',
      question: 'Correlation (r) between training hours and improvement',
      kind: 'number',
      options: [],
      unit: '',
      answer: '',
    },
    {
      id: 'conclusion',
      question: 'What can we honestly conclude?',
      kind: 'choice',
      options: CONCLUSIONS,
      unit: '',
      answer: '',
    },
  ],
}

const solution: DataStudioState = {
  ...start,
  datasets: [{ ...data, steps: [STEP] }],
  questions: start.questions.map((q) => ({
    ...q,
    answer:
      {
        yes: String(round(yes.mean, 1)),
        no: String(round(no.mean, 1)),
        r: String(round(r, 2)),
        conclusion: CONCLUSIONS[1],
      }[q.id] ?? '',
  })),
}

export const studioStatistics: AssignmentInput = {
  id: 'studio-statistics',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'senior-data-analyst',
  order: 8,
  kind: 'tool',
  title: 'Did the training work?',
  summary:
    'Compare scores before and after the training programme, and say honestly what the data shows.',
  estimatedMinutes: 50,
  from: 'manager',
  briefing: {
    subject: 'The board wants to know if training is worth it',
    body: `Hi {name},

The board is deciding whether to double the training budget, and {director} has asked us whether the spring programme worked.

The **training** dataset has every employee’s skills test score before and after the programme, whether they attended, and how many hours they did. Attendance was **voluntary**.

Please:
• add an **improvement** column (score after minus score before),
• compare the average improvement of those who attended and those who didn’t,
• measure the correlation between hours of training and improvement,
• answer the questions in **Questions**, and
• write a short **memo** in Docs with your findings, your recommendation and the limits of what this data can prove.

Reply to this email with the Data Studio file and the memo.

Amara`,
  },
  whyItMatters:
    'Decisions worth money are made on analyses like this. The numbers matter, but so does honesty about what they can and cannot prove: when people choose whether to take part, the keenest may be the ones who improve anyway. Senior analysts are trusted because they say so.',
  objectives: [
    'Create a calculated column and compare groups',
    'Measure and interpret a correlation',
    'Separate correlation from cause, and say so clearly',
  ],
  steps: [
    {
      id: 'calculate',
      title: 'Add the improvement column',
      instructions:
        'In **Data**, add a step: **Calculated column**, named improvement = score_after − score_before.',
    },
    {
      id: 'compare',
      title: 'Compare the groups',
      instructions:
        'In **Statistics**, summarise improvement split by attended. Note the mean, but also the median, spread and how many people are in each group.',
    },
    {
      id: 'correlate',
      title: 'Hours and improvement',
      instructions: 'In **Correlation**, choose hours and improvement and read r.',
    },
    {
      id: 'conclude',
      title: 'Conclude honestly',
      instructions:
        'Answer the questions. Then write the memo in **Docs** (**Training programme findings**): the difference, the correlation, a recommendation, and a caveat about voluntary attendance. 120 to 400 words.',
      hint: 'A fair test would assign training at random, or compare similar people. Suggest one for next time.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions:
        'Reply to {manager}’s email with the Data Studio file and the memo attached.',
    },
  ],
  tool: {
    id: 'datastudio',
    title: 'Data Studio: training results',
    start,
    solution,
    checks: [
      {
        id: 'improvement',
        type: 'cleaned',
        dataset: 'training',
        types: { improvement: 'number' },
        title: 'Improvement calculated',
        points: 15,
        why: 'The question is about change, so the change has to be measured.',
        hint: 'Calculated column: improvement = score_after − score_before.',
      },
      {
        id: 'figures',
        type: 'answers',
        items: [
          { id: 'yes', value: round(yes.mean, 1), tolerance: 0.15 },
          { id: 'no', value: round(no.mean, 1), tolerance: 0.15 },
          { id: 'r', value: round(r, 2), tolerance: 0.02 },
        ],
        title: 'The comparison and the correlation',
        points: 30,
        why: 'These are the facts the board will weigh.',
        hint: 'Statistics: improvement split by attended (means); correlation of hours and improvement.',
      },
      {
        id: 'conclusion',
        type: 'answers',
        items: [{ id: 'conclusion', value: CONCLUSIONS[1], tolerance: 0 }],
        title: 'An honest conclusion',
        points: 15,
        why: 'People chose to attend: the keenest may have improved anyway.',
        hint: 'Correlation is not cause, especially when people choose to take part.',
      },
    ],
  },
  deliverables: [
    {
      kind: 'doc',
      title: 'Training programme findings',
      template: 'memo',
      checks: [
        {
          id: 'memo-figures',
          type: 'figures',
          title: 'The key figures',
          figures: [
            { label: 'average improvement of those who attended', value: yes.mean },
            { label: 'average improvement of those who did not', value: no.mean },
          ],
          points: 15,
          why: 'The memo must carry the evidence, not just the opinion.',
          hint: 'Quote both average improvements.',
        },
        {
          id: 'memo-caveat',
          type: 'mentions',
          title: 'The limits, and a recommendation',
          terms: [
            ['voluntary', 'chose', 'self-select', 'volunteer'],
            ['caus', 'prove'],
            ['recommend', 'suggest', 'propose'],
          ],
          points: 15,
          why: 'Saying what the data can’t prove is what makes the rest believable.',
          hint: 'Explain that attendance was voluntary, that this doesn’t prove cause, and recommend a next step.',
        },
        {
          id: 'memo-length',
          type: 'length',
          min: 120,
          max: 400,
          title: 'Length',
          points: 10,
          why: 'A memo the board will actually read.',
          hint: 'Aim for 120 to 400 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 180,
  skills: { 'data-analysis': 40, 'insight-communication': 45, 'data-visualisation': 10 },
  feedback: {
    excellent: `Hi {name},

Exactly the analysis the board needed: a big difference, a strong link with hours, and a clear warning that keen people chose to attend. {director} has agreed to fund a fair test next term before doubling the budget.

Amara`,
    good: `Hi {name},

Good work; a figure or the caveat needs another look. See the notes.

Amara`,
    pass: `Hi {name},

The comparison or the conclusion isn’t right yet. The notes explain.

Amara`,
    fail: `Hi {name},

Start by adding the improvement column, then compare the groups in Statistics.

Amara`,
  },
}
