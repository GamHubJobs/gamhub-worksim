import type { AssignmentInput } from '../schemas'

/**
 * Assignment 7 (Junior Finance Assistant): the monthly departmental
 * performance report. The first task that uses three apps: analyse the
 * figures in Grid Craft (variances, a chart), write a report in Docs and prepare
 * slides for the management meeting, then email all three to Priya.
 */
const departments: Array<[string, string, string]> = [
  ['Sales', '48000', '51240'],
  ['Marketing', '36000', '33150'],
  ['Operations', '62000', '64870'],
  ['IT', '41000', '38920'],
  ['HR', '18000', '17640'],
  ['Finance', '22000', '21480'],
]

const header = { bold: true, fill: 'gray' } as const
const last = departments.length + 1 // row 7

const rows = (make: (row: number) => Array<[string, string]>) =>
  Object.fromEntries(departments.map((_, i) => make(i + 2)).flat())

export const performanceReport: AssignmentInput = {
  id: 'performance-report',
  version: 1,
  careerId: 'office-admin-finance',
  levelId: 'junior',
  order: 7,
  title: 'Monthly departmental performance report',
  summary:
    'Analyse each department’s spending against budget, then report it in writing and on slides.',
  estimatedMinutes: 60,
  from: 'manager',
  briefing: {
    subject: 'October performance report for the management meeting',
    body: `Hi {name},

The directors want our **monthly departmental performance report** for Thursday’s management meeting, and I’d like you to prepare it this month. It has three parts, so it is your biggest piece of work so far.

**1. The analysis (Grid Craft).** The workbook has each department’s budget and actual spending for October. Work out each department’s variance (actual minus budget), the percentage of budget used, and whether it is over or under budget; add the totals, and make a chart comparing budget and actual by department.

**2. The report (Docs).** A short written report with an executive summary, your findings and your recommendations. Give the key figures (total budget, total actual spending, and the biggest overspend), name the departments that went over budget, and include your chart.

**3. The slides (Slides).** Four to eight slides I can present on Thursday, with the chart and the headline figure.

I’ve set up the three files for you; you’ll find them in Grid Craft, Docs and Slides. When you’re done, **reply to this email and attach all three files**.

Thanks,

Priya`,
  },
  whyItMatters:
    'Reporting performance against budget is a monthly routine in almost every organisation. The analysis only creates value when it reaches decision-makers clearly: a short written report for the record and a few slides for the meeting. Doing all three well, with the same figures everywhere, is what makes people trust your work.',
  objectives: [
    'Analyse budget variances and summarise them with totals and a chart',
    'Write a structured business report that leads with the key message',
    'Present the same findings on a few clear slides',
    'Keep figures consistent across the workbook, the report and the slides',
    'Hand in work professionally by email with attachments',
  ],
  steps: [
    {
      id: 'analyse',
      title: 'Analyse the figures in Grid Craft',
      instructions: `In the workbook (Grid Craft), for each department in rows 2 to ${last}:
- **D** Variance: \`=C2-B2\` (positive means over budget)
- **E** % of budget used: \`=C2/B2\`, formatted with **%**
- **F** Status: \`=IF(C2>B2, "Over budget", "Within budget")\`

Fill them down, then add the totals in row 9: \`=SUM(B2:B${last})\` and \`=SUM(C2:C${last})\` in B9 and C9, \`=C9-B9\` in D9 and \`=C9/B9\` in E9.`,
    },
    {
      id: 'chart',
      title: 'Make a chart',
      instructions: `Select **A1:C${last}** (department, budget, actual) and click **Chart** in the toolbar. Give it a clear title, such as “Budget vs actual by department”, and add it.`,
      hint: 'A column chart with two series (budget and actual) makes over-spending easy to see at a glance.',
    },
    {
      id: 'report',
      title: 'Write the report in Docs',
      instructions: `Open **Docs** and the file **October performance report**. Replace the [placeholders]:
- **Executive summary**: one or two sentences with the headline: total spending against total budget.
- **Findings**: which departments were over budget and by how much; which were under.
- **Recommendations**: what should happen next.

Insert your chart with **Chart** in the toolbar. Aim for 150 to 600 words.`,
      hint: 'Lead with the conclusion. Busy directors may only read the first paragraph.',
    },
    {
      id: 'slides',
      title: 'Prepare the slides',
      instructions: `Open **Slides** and **October performance review**. Keep 4 to 8 slides: a title slide, the headline figures, the chart (use **Chart** in the toolbar), what went well and what needs attention, and next steps. Delete slides you don’t need.`,
    },
    {
      id: 'send',
      title: 'Email your work to Priya',
      instructions: `In **Mail**, open Priya’s email and click **Reply**. Attach the workbook, the report and the presentation, write a short message, and click **Send**. Your work is checked straight away and Priya replies with feedback.`,
    },
  ],
  workbook: {
    title: 'October departmental performance',
    sheets: [
      {
        name: 'Departments',
        columnWidths: { A: 120, B: 100, C: 100, D: 100, E: 110, F: 120 },
        cells: {
          A1: { input: 'Department', format: header },
          B1: { input: 'Budget', format: { ...header, align: 'right' } },
          C1: { input: 'Actual', format: { ...header, align: 'right' } },
          D1: { input: 'Variance', format: { ...header, align: 'right' } },
          E1: { input: '% of budget', format: { ...header, align: 'right' } },
          F1: { input: 'Status', format: header },
          ...rows((row) => {
            const [name, budget, actual] = departments[row - 2]
            return [
              [`A${row}`, name],
              [`B${row}`, budget],
              [`C${row}`, actual],
            ]
          }),
          A9: { input: 'Total', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Departments: {
      ...rows((row) => [
        [`D${row}`, `=C${row}-B${row}`],
        [`E${row}`, `=C${row}/B${row}`],
        [`F${row}`, `=IF(C${row}>B${row}, "Over budget", "Within budget")`],
      ]),
      B9: `=SUM(B2:B${last})`,
      C9: `=SUM(C2:C${last})`,
      D9: '=C9-B9',
      E9: '=C9/B9',
    },
  },
  scenarios: [
    {
      description: 'IT receives a late invoice',
      changes: { 'Departments!C5': '41900' },
    },
  ],
  checks: [
    {
      id: 'variance',
      type: 'values',
      title: 'Variances',
      cells: [`Departments!D2:D${last}`],
      requireFormula: true,
      points: 10,
      why: 'The variance is the number every department head asks about first.',
      hint: 'In D2 type =C2-B2 and fill it down.',
    },
    {
      id: 'percent-used',
      type: 'values',
      title: 'Percentage of budget used',
      cells: [`Departments!E2:E${last}`],
      requireFormula: true,
      points: 5,
      why: 'Percentages make departments of different sizes comparable.',
      hint: 'In E2 type =C2/B2 and fill it down.',
    },
    {
      id: 'status',
      type: 'values',
      title: 'Over or within budget',
      cells: [`Departments!F2:F${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 10,
      why: 'The flags tell the directors where to look.',
      hint: 'In F2 type =IF(C2>B2, "Over budget", "Within budget") and fill it down.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Totals',
      cells: ['Departments!B9:E9'],
      requireFormula: true,
      points: 10,
      why: 'The totals are the headline of the whole report.',
      hint: 'B9 =SUM(B2:B7), C9 =SUM(C2:C7), D9 =C9-B9, E9 =C9/B9.',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of budget and actual',
      cells: [`Departments!A1:C${last}`],
      points: 10,
      why: 'A chart shows in a second what a table takes a minute to read.',
      hint: 'Select A1:C7 and click Chart in the toolbar.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Budgets and actuals left unchanged',
      cells: [`Departments!A1:C${last}`],
      points: 5,
      why: 'The figures come from the accounts system; a report must never change them.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'October performance report',
      template: 'report',
      checks: [
        {
          id: 'report-sections',
          type: 'sections',
          title: 'Report structure',
          sections: [
            ['Executive summary', 'Summary'],
            ['Findings'],
            ['Recommendations', 'Recommendation'],
          ],
          points: 15,
          why: 'A predictable structure lets busy readers find what they need.',
          hint: 'Keep the headings from the template: Executive summary, Findings, Recommendations.',
        },
        {
          id: 'report-figures',
          type: 'figures',
          title: 'Key figures in the report',
          figures: [
            { label: 'total budget', cell: 'Departments!B9' },
            { label: 'total actual spending', cell: 'Departments!C9' },
            { label: 'overspend of the Sales department', cell: 'Departments!D2' },
          ],
          points: 20,
          why: 'A report without figures is an opinion. The figures must match the analysis exactly.',
          hint: 'Copy the totals from row 9 of the workbook and the Sales variance from D2.',
        },
        {
          id: 'report-mentions',
          type: 'mentions',
          title: 'Departments over budget named',
          terms: [['Sales'], ['Operations']],
          points: 10,
          why: 'The directors need to know who to talk to.',
          hint: 'Check column F of the workbook: which departments are “Over budget”?',
        },
        {
          id: 'report-chart',
          type: 'charts',
          min: 1,
          title: 'Chart in the report',
          points: 10,
          why: 'A picture of budget against actual makes the findings obvious.',
          hint: 'In Docs, click Chart in the toolbar and choose your chart.',
        },
        {
          id: 'report-length',
          type: 'length',
          min: 150,
          max: 600,
          title: 'Length',
          points: 5,
          why: 'Long enough to explain, short enough to be read.',
          hint: 'Aim for 150 to 600 words; replace or remove the template’s placeholder text.',
        },
      ],
    },
    {
      kind: 'slides',
      title: 'October performance review',
      template: 'business-review',
      checks: [
        {
          id: 'slides-length',
          type: 'length',
          min: 4,
          max: 8,
          title: 'Number of slides',
          points: 5,
          why: 'A ten-minute slot needs a handful of slides, not a deck of thirty.',
          hint: 'Keep between 4 and 8 slides. Delete the ones you do not need.',
        },
        {
          id: 'slides-chart',
          type: 'charts',
          min: 1,
          title: 'Chart on a slide',
          points: 10,
          why: 'In a meeting, the chart is what people remember.',
          hint: 'In Slides, click Chart in the toolbar and choose your chart.',
        },
        {
          id: 'slides-figures',
          type: 'figures',
          title: 'Headline figure on the slides',
          figures: [{ label: 'total actual spending', cell: 'Departments!C9' }],
          points: 10,
          why: 'Your slides and your report must tell the same story with the same numbers.',
          hint: 'Put the total actual spending (C9) on the key figures slide.',
        },
        {
          id: 'slides-mentions',
          type: 'mentions',
          title: 'Biggest overspend named',
          terms: [['Sales']],
          points: 5,
          why: 'The meeting needs to know where the money went.',
          hint: 'Which department has the largest variance?',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 260,
  skills: {
    formulas: 20,
    'data-analysis': 40,
    presentation: 45,
    accuracy: 25,
    'finance-basics': 30,
  },
  feedback: {
    excellent: `Hi {name},

This is exactly what I needed: the analysis is right, the report leads with the headline and the slides tell the same story. I’ll present it as it is on Thursday. Thank you!

Priya`,
    good: `Hi {name},

Good work, thank you. A few things to tidy up before Thursday; see the notes in your task results.

Priya`,
    pass: `Hi {name},

Thanks. The basics are there, but I had to fix a few things before I could present it. Have a look at the feedback, especially the figures in the report and on the slides.

Priya`,
    fail: `Hi {name},

I can’t take this to the directors yet. The notes in your task results explain what is missing; send it back when it’s ready.

Priya`,
  },
}
