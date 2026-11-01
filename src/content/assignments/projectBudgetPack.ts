import type { AssignmentInput } from '../schemas'

/**
 * Finance & Admin integrated project (Finance Officer): the year-end budget
 * pack. Three linked stages in Sheets and Slides:
 *
 * 1. Consolidate three departments' spending with cross-sheet formulas.
 * 2. Compare next year's proposed budgets with this year and flag big rises.
 * 3. Key figures and a presentation for the directors.
 *
 * Teaches: consolidating workbooks with references (never retyping), budget
 * review against a threshold, and presenting one consistent set of numbers.
 */
const PROJECT = 'budget-pack'
const header = { bold: true, fill: 'gray' } as const
const right = { ...header, align: 'right' } as const
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const QCOLS = ['B', 'C', 'D', 'E']

const departments: Array<{ name: string; lines: Array<[string, number[]]> }> = [
  {
    name: 'Sales',
    lines: [
      ['Salaries', [61000, 61500, 62000, 63500]],
      ['Travel', [8200, 9100, 7400, 9900]],
      ['Events', [5000, 12000, 3500, 8500]],
      ['Software', [2100, 2100, 2300, 2300]],
    ],
  },
  {
    name: 'Operations',
    lines: [
      ['Salaries', [72000, 72000, 74500, 74500]],
      ['Facilities', [18500, 18200, 18900, 19400]],
      ['Supplies', [4300, 3900, 4700, 5100]],
      ['Software', [3400, 3400, 3600, 3600]],
    ],
  },
  {
    name: 'IT',
    lines: [
      ['Salaries', [48000, 48000, 49500, 49500]],
      ['Hardware', [9500, 4200, 3800, 14600]],
      ['Licences', [7800, 7800, 8100, 8100]],
      ['Support contracts', [3900, 3900, 3900, 4200]],
    ],
  },
]

const totalRow = 6 // after four lines
const yearTotal = (d: (typeof departments)[number]) =>
  d.lines.reduce((sum, [, q]) => sum + q.reduce((a, b) => a + b, 0), 0)

const feedback = (excellent: string) => ({
  excellent: `Hi {name},

${excellent}

Priya`,
  good: `Hi {name},

Good work; a few figures need fixing before the directors see it. See the notes.

Priya`,
  pass: `Hi {name},

The basics are there, but some results are not right yet. The notes explain which.

Priya`,
  fail: `Hi {name},

Not yet. Have a look at the notes and try again.

Priya`,
})

// ---------------------------------------------------------------------------
// Stage 1: consolidate the departments
// ---------------------------------------------------------------------------

const departmentSheet = (d: (typeof departments)[number]) => ({
  name: d.name,
  columnWidths: { A: 150, B: 90, C: 90, D: 90, E: 90, F: 100 },
  cells: {
    A1: { input: 'Line', format: header },
    ...Object.fromEntries(
      QUARTERS.map((q, i) => [`${QCOLS[i]}1`, { input: q, format: right }]),
    ),
    F1: { input: 'Year', format: right },
    ...Object.fromEntries(
      d.lines.flatMap(([name, values], r) => [
        [`A${r + 2}`, name],
        ...values.map((v, i) => [`${QCOLS[i]}${r + 2}`, String(v)]),
      ]),
    ),
    [`A${totalRow}`]: { input: 'Total', format: { bold: true } },
  },
})

export const budgetConsolidate: AssignmentInput = {
  id: 'budget-consolidate',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'officer',
  order: 9,
  projectId: PROJECT,
  stage: 1,
  title: 'Budget pack, stage 1: consolidate the year',
  summary: 'Total each department’s year and bring them together on one summary sheet.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Project: the year-end budget pack',
    body: `Hi {name},

As Finance Officer, you’re preparing this year’s **budget pack** for the directors. It’s a project in three stages; each opens when the one before is done:

1. **Consolidate** this year’s spending (this email).
2. **Review** next year’s proposed budgets.
3. **Present** the key figures to the directors.

The workbook has a sheet for each department (Sales, Operations, IT) with this year’s spending by quarter. Please:
• On each department sheet, add the **Year** total for each line (column F) and the **Total** row (row ${totalRow}).
• On **Summary**, bring each department’s quarterly and yearly totals across **with references to the department sheets** (for example \`=Sales!B${totalRow}\`), never by retyping, and add the company total in row 5.

Priya`,
  },
  whyItMatters:
    'Consolidating with references means the summary updates when a department corrects its figures, and anyone can trace every number back to its source. Retyped numbers go stale and nobody can check them.',
  objectives: [
    'Total rows and columns consistently',
    'Consolidate several sheets with cross-sheet references',
    'Build a summary that updates when the sources change',
  ],
  steps: [
    {
      id: 'departments',
      title: 'Department totals',
      instructions: `On each department sheet: F2 \`=SUM(B2:E2)\` filled down to F5, and row ${totalRow} \`=SUM(B2:B5)\` filled across to F${totalRow}.`,
    },
    {
      id: 'summary',
      title: 'The summary',
      instructions: `On **Summary**: B2 \`=Sales!B${totalRow}\` across to F2; row 3 from Operations and row 4 from IT the same way. Row 5: \`=SUM(B2:B4)\` across to F5.`,
      hint: 'Type = then click the other sheet’s tab and the cell: the reference is written for you.',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Click **Submit to {manager}**.',
    },
  ],
  workbook: {
    title: 'Budget pack: this year',
    sheets: [
      {
        name: 'Summary',
        columnWidths: { A: 150, B: 90, C: 90, D: 90, E: 90, F: 100 },
        cells: {
          A1: { input: 'Department', format: header },
          ...Object.fromEntries(
            QUARTERS.map((q, i) => [`${QCOLS[i]}1`, { input: q, format: right }]),
          ),
          F1: { input: 'Year', format: right },
          ...Object.fromEntries(departments.map((d, i) => [`A${i + 2}`, d.name])),
          A5: { input: 'Company total', format: { bold: true } },
        },
      },
      ...departments.map(departmentSheet),
    ],
  },
  solution: {
    ...Object.fromEntries(
      departments.map((d) => [
        d.name,
        {
          ...Object.fromEntries([2, 3, 4, 5].map((r) => [`F${r}`, `=SUM(B${r}:E${r})`])),
          ...Object.fromEntries(
            [...QCOLS, 'F'].map((c) => [`${c}${totalRow}`, `=SUM(${c}2:${c}5)`]),
          ),
        },
      ]),
    ),
    Summary: {
      ...Object.fromEntries(
        departments.flatMap((d, i) =>
          [...QCOLS, 'F'].map((c) => [`${c}${i + 2}`, `=${d.name}!${c}${totalRow}`]),
        ),
      ),
      ...Object.fromEntries([...QCOLS, 'F'].map((c) => [`${c}5`, `=SUM(${c}2:${c}4)`])),
    },
  },
  scenarios: [
    {
      description: 'IT corrects its Q4 hardware spending',
      changes: { 'IT!E3': '12900' },
    },
  ],
  checks: [
    {
      id: 'department-totals',
      type: 'values',
      title: 'Department totals',
      cells: departments.flatMap((d) => [
        `${d.name}!F2:F5`,
        `${d.name}!B${totalRow}:F${totalRow}`,
      ]),
      requireFormula: true,
      points: 30,
      why: 'Each department’s total is what its head will be asked about.',
      hint: `F2 =SUM(B2:E2) down to F5; row ${totalRow} =SUM(B2:B5) across.`,
    },
    {
      id: 'summary',
      type: 'values',
      title: 'The summary, by reference',
      cells: ['Summary!B2:F4'],
      requireFormula: true,
      points: 40,
      why: 'References keep the summary right when a department corrects its figures.',
      hint: `B2 =Sales!B${totalRow}, and so on across and down.`,
    },
    {
      id: 'company',
      type: 'values',
      title: 'Company total',
      cells: ['Summary!B5:F5'],
      requireFormula: true,
      points: 20,
      why: 'The company total is the headline of the pack.',
      hint: '=SUM(B2:B4) across to F5.',
    },
    {
      id: 'unchanged',
      type: 'unchanged',
      title: 'Department figures left unchanged',
      cells: departments.map((d) => `${d.name}!A1:E5`),
      points: 10,
      why: 'The figures come from the accounts.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 180,
  skills: { formulas: 35, lookups: 20, accuracy: 25 },
  feedback: feedback(
    'A clean consolidation: every figure on the summary traces back to its department, and it updated straight away when IT corrected Q4. Stage 2 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 2: next year's proposed budgets
// ---------------------------------------------------------------------------

const proposals: Array<[string, number]> = [
  ['Sales', 352000],
  ['Operations', 438000],
  ['IT', 282000],
]

export const budgetReview: AssignmentInput = {
  id: 'budget-review',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'officer',
  order: 10,
  projectId: PROJECT,
  stage: 2,
  title: 'Budget pack, stage 2: review next year’s budgets',
  summary: 'Compare each department’s proposed budget with this year and flag big rises.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Budget pack, stage 2: the proposals',
    body: `Hi {name},

The departments have sent their **proposed budgets for next year**. Next to this year’s actual spending (from your consolidation), please work out the **change** (proposal minus this year), the **change as a %**, and a flag: **“Review”** when a department asks for more than **8%** more, otherwise “OK”. Add the totals and a chart of this year against next year.

Priya`,
  },
  whyItMatters:
    'Budget rounds are where spending is decided. A clear comparison with a threshold shows the directors which requests need a conversation and which can simply be approved.',
  objectives: [
    'Compare proposals with actual spending',
    'Flag requests above a threshold',
    'Summarise the effect on the company total',
  ],
  steps: [
    {
      id: 'compare',
      title: 'Compare',
      instructions:
        'For rows 2 to 4: D `=C2-B2`, E `=D2/B2` (format as %), F `=IF(E2>0.08, "Review", "OK")`. Fill them down.',
    },
    {
      id: 'totals',
      title: 'Totals',
      instructions: 'Row 5: `=SUM(B2:B4)`, `=SUM(C2:C4)`, `=C5-B5` and `=D5/B5`.',
    },
    {
      id: 'chart',
      title: 'Chart',
      instructions: 'Select **A1:C4** and add a chart of this year against next year.',
    },
    {
      id: 'submit',
      title: 'Hand in',
      instructions: 'Click **Submit to {manager}**.',
    },
  ],
  workbook: {
    title: 'Budget pack: next year',
    sheets: [
      {
        name: 'Proposals',
        columnWidths: { A: 130, B: 110, C: 110, D: 100, E: 90, F: 90 },
        cells: {
          A1: { input: 'Department', format: header },
          B1: { input: 'This year', format: right },
          C1: { input: 'Proposed', format: right },
          D1: { input: 'Change', format: right },
          E1: { input: 'Change %', format: right },
          F1: { input: 'Flag', format: header },
          ...Object.fromEntries(
            proposals.flatMap(([name, proposed], i) => [
              [`A${i + 2}`, name],
              [`B${i + 2}`, String(yearTotal(departments.find((d) => d.name === name)!))],
              [`C${i + 2}`, String(proposed)],
            ]),
          ),
          A5: { input: 'Total', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Proposals: {
      ...Object.fromEntries(
        [2, 3, 4].flatMap((r) => [
          [`D${r}`, `=C${r}-B${r}`],
          [`E${r}`, `=D${r}/B${r}`],
          [`F${r}`, `=IF(E${r}>0.08, "Review", "OK")`],
        ]),
      ),
      B5: '=SUM(B2:B4)',
      C5: '=SUM(C2:C4)',
      D5: '=C5-B5',
      E5: '=D5/B5',
    },
  },
  scenarios: [
    {
      description: 'Operations revises its proposal',
      changes: { 'Proposals!C3': '440000' },
    },
  ],
  checks: [
    {
      id: 'change',
      type: 'values',
      title: 'Change and change %',
      cells: ['Proposals!D2:E4'],
      requireFormula: true,
      points: 30,
      why: 'The size of each request, in pounds and as a share, is what the directors weigh.',
      hint: 'D2 =C2-B2 and E2 =D2/B2, filled down.',
    },
    {
      id: 'flags',
      type: 'values',
      title: 'Requests to review',
      cells: ['Proposals!F2:F4'],
      requireFormula: true,
      functions: ['IF'],
      points: 25,
      why: 'The flags are the agenda for the budget meeting.',
      hint: 'F2 =IF(E2>0.08, "Review", "OK"), filled down.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Totals',
      cells: ['Proposals!B5:E5'],
      requireFormula: true,
      points: 25,
      why: 'The total change is what the company has to fund.',
      hint: 'Row 5: SUM, SUM, C5-B5 and D5/B5.',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of this year and next',
      cells: ['Proposals!A1:C4'],
      points: 10,
      why: 'Side by side, the big requests stand out.',
      hint: 'Select A1:C4 and add a chart.',
    },
    {
      id: 'unchanged',
      type: 'unchanged',
      title: 'Figures left unchanged',
      cells: ['Proposals!A1:C4'],
      points: 10,
      why: 'The proposals are the departments’ own.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 180,
  skills: { formulas: 25, 'data-analysis': 30, 'finance-basics': 25 },
  feedback: feedback(
    'Clear: two requests to review and one that can go straight through. Stage 3 is in your inbox.',
  ),
}

// ---------------------------------------------------------------------------
// Stage 3: key figures and the presentation
// ---------------------------------------------------------------------------

const companyThisYear = departments.reduce((sum, d) => sum + yearTotal(d), 0)
const companyProposed = proposals.reduce((sum, [, p]) => sum + p, 0)

export const budgetPresentation: AssignmentInput = {
  id: 'budget-presentation',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'officer',
  order: 11,
  projectId: PROJECT,
  stage: 3,
  title: 'Budget pack, stage 3: present to the directors',
  summary: 'Summarise the budget round in key figures and present it on slides.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Budget pack, stage 3: the presentation',
    body: `Hi {name},

Last stage: the directors’ meeting. In the workbook, complete the **key figures**: the increase in the total budget (in £ and as a %), and the share of next year’s budget for each department. Then prepare **4 to 7 slides** with the headline figures, a chart, the requests to review (Sales and Operations) and a recommendation.

Reply to this email with the workbook and the presentation attached.

Priya`,
  },
  whyItMatters:
    'The budget pack ends in a meeting where decisions are made in minutes. A few figures that agree with the analysis, and slides that lead to a clear recommendation, are what get a budget approved.',
  objectives: [
    'Calculate the headline figures of a budget round',
    'Present a recommendation on a few slides',
    'Keep the same figures across the workbook and the slides',
  ],
  steps: [
    {
      id: 'figures',
      title: 'Key figures',
      instructions:
        'B4 `=B3-B2` (increase), B5 `=B4/B2` (as %). For each department (rows 8 to 10): C `=B8/$B$11` (share of next year’s budget), and B11 `=SUM(B8:B10)`.',
      hint: 'The $ signs keep the reference to the total fixed when you fill down.',
    },
    {
      id: 'chart',
      title: 'Chart',
      instructions:
        'Select **A7:B10** and add a pie or column chart of next year’s budget by department.',
    },
    {
      id: 'slides',
      title: 'Slides',
      instructions:
        'In **Slides**, open **Budget round: next year**: 4 to 7 slides with the total increase, your chart, the two requests to review and your recommendation.',
    },
    {
      id: 'send',
      title: 'Hand in',
      instructions:
        'Reply to {manager}’s email with the workbook and the presentation attached.',
    },
  ],
  workbook: {
    title: 'Budget pack: key figures',
    sheets: [
      {
        name: 'Key figures',
        columnWidths: { A: 190, B: 120, C: 120 },
        cells: {
          A1: { input: 'Company', format: header },
          B1: { input: '', format: header },
          A2: 'This year’s spending',
          B2: String(companyThisYear),
          A3: 'Next year’s budget',
          B3: String(companyProposed),
          A4: { input: 'Increase', format: { bold: true } },
          A5: { input: 'Increase %', format: { bold: true } },
          A7: { input: 'Department', format: header },
          B7: { input: 'Next year', format: right },
          C7: { input: 'Share', format: right },
          ...Object.fromEntries(
            proposals.flatMap(([name, proposed], i) => [
              [`A${i + 8}`, name],
              [`B${i + 8}`, String(proposed)],
            ]),
          ),
          A11: { input: 'Total', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    'Key figures': {
      B4: '=B3-B2',
      B5: '=B4/B2',
      C8: '=B8/$B$11',
      C9: '=B9/$B$11',
      C10: '=B10/$B$11',
      B11: '=SUM(B8:B10)',
    },
  },
  scenarios: [
    {
      description: 'IT trims its proposal',
      changes: { 'Key figures!B10': '240000' },
    },
  ],
  checks: [
    {
      id: 'increase',
      type: 'values',
      title: 'The increase',
      cells: ['Key figures!B4:B5'],
      requireFormula: true,
      points: 15,
      why: 'The total increase is the first question in the room.',
      hint: 'B4 =B3-B2, B5 =B4/B2.',
    },
    {
      id: 'shares',
      type: 'values',
      title: 'Each department’s share',
      cells: ['Key figures!C8:C10', 'Key figures!B11'],
      requireFormula: true,
      points: 15,
      why: 'Shares show where the money goes at a glance.',
      hint: 'C8 =B8/$B$11 filled down; B11 =SUM(B8:B10).',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of next year’s budget',
      cells: ['Key figures!A7:B10'],
      points: 10,
      why: 'The slides need it.',
      hint: 'Select A7:B10 and add a chart.',
    },
  ],
  deliverables: [
    {
      kind: 'slides',
      title: 'Budget round: next year',
      template: 'business-review',
      checks: [
        {
          id: 'slides-length',
          type: 'length',
          min: 4,
          max: 7,
          title: 'Number of slides',
          points: 10,
          why: 'A short slot needs a handful of slides.',
          hint: 'Keep 4 to 7 slides.',
        },
        {
          id: 'slides-chart',
          type: 'charts',
          min: 1,
          title: 'A chart on a slide',
          points: 15,
          why: 'In a meeting, the chart is what people remember.',
          hint: 'In Slides, click Chart in the toolbar and choose your chart.',
        },
        {
          id: 'slides-figures',
          type: 'figures',
          title: 'The headline figures',
          figures: [
            { label: 'next year’s total budget', cell: 'Key figures!B3' },
            { label: 'increase in the total budget', cell: 'Key figures!B4' },
          ],
          points: 20,
          why: 'The slides must use the same figures as the workbook.',
          hint: 'Put B3 and B4 on the headline slide.',
        },
        {
          id: 'slides-review',
          type: 'mentions',
          title: 'The requests to review',
          terms: [['Sales'], ['Operations'], ['recommend']],
          points: 15,
          why: 'The directors need to know what to discuss and what you suggest.',
          hint: 'Name the two departments to review and give a recommendation.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 220,
  skills: { presentation: 40, 'finance-basics': 25, formulas: 15 },
  feedback: feedback(
    'The directors approved IT’s budget on the spot and asked Sales and Operations for a breakdown, exactly as you recommended. A complete budget pack. Well done.',
  ),
}
