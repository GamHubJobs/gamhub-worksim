import type { AssignmentInput } from '../../schemas'

/**
 * Marketing 3 (Digital Marketing Executive): analyse an email A/B test and
 * recommend a winner. Teaches: SUMIF by variant, rates from totals, relative
 * uplift, choosing a winner with IF, and writing a recommendation.
 */
const results: Array<[string, string, string, string, string]> = [
  // segment, variant, sent, opened, clicked
  ['Clients', 'A', '2000', '520', '96'],
  ['Clients', 'B', '2000', '610', '132'],
  ['Prospects', 'A', '3000', '540', '66'],
  ['Prospects', 'B', '3000', '690', '105'],
  ['Partners', 'A', '1000', '310', '40'],
  ['Partners', 'B', '1000', '335', '52'],
]

const header = { bold: true, fill: 'gray' } as const
const last = results.length + 1 // 7
const range = (col: string) => `Results!$${col}$2:$${col}$${last}`

export const abTest: AssignmentInput = {
  id: 'ab-test',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'digital-marketing-executive',
  order: 5,
  title: 'Which subject line won?',
  summary:
    'Analyse an email A/B test, pick the winner on the evidence and recommend what to do.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'A/B test results: newsletter subject lines',
    body: `Hi {name},

Congratulations on becoming a Digital Marketing Executive! Your first analysis in the new role: last week’s newsletter went out with two subject lines.

• **A**: “Our March newsletter”
• **B**: “3 ways to close your month-end faster”

Each was sent to half of each segment. The results are in the workbook. Please work out the open rate, click rate and click-to-open rate for each version, how much better (or worse) B did than A, and which one won. Then write me a short **recommendation memo in Docs**: which subject line style should we use from now on, backed by the numbers.

Reply with both files.

Sofia`,
  },
  whyItMatters:
    'A/B testing replaces opinions with evidence. Knowing how to compare rates from totals, express the difference as an uplift, and turn it into a clear recommendation is central to modern marketing.',
  objectives: [
    'Total results by variant with SUMIF',
    'Calculate open, click and click-to-open rates',
    'Express a difference as relative uplift',
    'Recommend a decision backed by data',
  ],
  steps: [
    {
      id: 'totals',
      title: 'Totals per version',
      instructions: `On **Summary**, rows 2 (A) and 3 (B): sent, opened and clicked with SUMIF, e.g. **B2** \`=SUMIF(${range('B')}, A2, ${range('C')})\`. Use columns D (opened) and E (clicked) of Results for C and D.`,
    },
    {
      id: 'rates',
      title: 'The rates',
      instructions: `For each version: **E** open rate \`=C2/B2\`, **F** click rate \`=D2/B2\`, **G** click-to-open \`=D2/C2\`, formatted as %.`,
    },
    {
      id: 'uplift',
      title: 'Uplift and winner',
      instructions: `In row 5, the uplift of B over A for each rate: **E5** \`=(E3-E2)/E2\`, and the same for F5 and G5 (as %). In **B7**: \`=IF(F3>F2, "B", "A")\` (we judge on click rate: clicks bring enquiries).`,
    },
    {
      id: 'memo',
      title: 'Write the recommendation',
      instructions:
        'In **Docs**, open **A/B test recommendation**: which version won, by how much (B’s open rate, and the uplift in click rate), and what we should do next. 80 to 300 words. Then reply with both files.',
    },
  ],
  workbook: {
    title: 'Newsletter A/B test',
    sheets: [
      {
        name: 'Results',
        columnWidths: { A: 110, B: 70, C: 80, D: 80, E: 80 },
        cells: {
          A1: { input: 'Segment', format: header },
          B1: { input: 'Version', format: header },
          C1: { input: 'Sent', format: { ...header, align: 'right' } },
          D1: { input: 'Opened', format: { ...header, align: 'right' } },
          E1: { input: 'Clicked', format: { ...header, align: 'right' } },
          ...Object.fromEntries(
            results.flatMap((row, i) => row.map((v, c) => [`${'ABCDE'[c]}${i + 2}`, v])),
          ),
        },
      },
      {
        name: 'Summary',
        columnWidths: { A: 120, B: 80, C: 80, D: 80, E: 100, F: 100, G: 120 },
        cells: {
          A1: { input: 'Version', format: header },
          B1: { input: 'Sent', format: { ...header, align: 'right' } },
          C1: { input: 'Opened', format: { ...header, align: 'right' } },
          D1: { input: 'Clicked', format: { ...header, align: 'right' } },
          E1: { input: 'Open rate', format: { ...header, align: 'right' } },
          F1: { input: 'Click rate', format: { ...header, align: 'right' } },
          G1: { input: 'Click-to-open', format: { ...header, align: 'right' } },
          A2: 'A',
          A3: 'B',
          A5: { input: 'Uplift of B', format: { bold: true } },
          A7: { input: 'Winner', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Summary: {
      ...Object.fromEntries(
        [2, 3].flatMap((r) => [
          [`B${r}`, `=SUMIF(${range('B')}, A${r}, ${range('C')})`],
          [`C${r}`, `=SUMIF(${range('B')}, A${r}, ${range('D')})`],
          [`D${r}`, `=SUMIF(${range('B')}, A${r}, ${range('E')})`],
          [`E${r}`, `=C${r}/B${r}`],
          [`F${r}`, `=D${r}/B${r}`],
          [`G${r}`, `=D${r}/C${r}`],
        ]),
      ),
      E5: '=(E3-E2)/E2',
      F5: '=(F3-F2)/F2',
      G5: '=(G3-G2)/G2',
      B7: '=IF(F3>F2, "B", "A")',
    },
  },
  scenarios: [
    {
      description: 'Late clicks are counted for version A',
      changes: { 'Results!E4': '400' },
    },
  ],
  checks: [
    {
      id: 'totals',
      type: 'values',
      title: 'Totals per version',
      cells: ['Summary!B2:D3'],
      requireFormula: true,
      functions: ['SUMIF', 'SUMIFS'],
      points: 20,
      why: 'Rates must be worked out from totals, not averaged across segments.',
      hint: 'B2 =SUMIF(Results!$B$2:$B$7, A2, Results!$C$2:$C$7), and the same with D and E.',
    },
    {
      id: 'rates',
      type: 'values',
      title: 'Open, click and click-to-open rates',
      cells: ['Summary!E2:G3'],
      requireFormula: true,
      points: 20,
      why: 'Each rate answers a different question: did they open, did they click, did the content work?',
      hint: 'E =C/B, F =D/B, G =D/C.',
    },
    {
      id: 'uplift',
      type: 'values',
      title: 'Uplift and winner',
      cells: ['Summary!E5:G5', 'Summary!B7'],
      requireFormula: true,
      points: 20,
      why: '“B was better” is an opinion; “B got 43% more clicks” is a decision.',
      hint: 'E5 =(E3-E2)/E2 (same for F and G); B7 =IF(F3>F2, "B", "A").',
    },
    {
      id: 'rates-format',
      type: 'format',
      title: 'Rates as percentages',
      cells: ['Summary!E2:G3', 'Summary!E5:G5'],
      format: { numberFormat: 'percent' },
      points: 5,
      why: 'Rates and uplifts are always read as percentages.',
      hint: 'Select the rates and uplifts and click %.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Results left unchanged',
      cells: [`Results!A1:E${last}`],
      points: 5,
      why: 'The test results come from the email platform.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'A/B test recommendation',
      template: 'memo',
      checks: [
        {
          id: 'memo-figures',
          type: 'figures',
          title: 'The evidence',
          figures: [
            { label: 'open rate of version B', cell: 'Summary!E3', percent: true },
            { label: 'uplift in click rate', cell: 'Summary!F5', percent: true },
          ],
          points: 20,
          why: 'A recommendation is only as strong as the numbers behind it.',
          hint: 'Quote B’s open rate (E3) and the click-rate uplift (F5) as percentages.',
        },
        {
          id: 'memo-winner',
          type: 'mentions',
          title: 'A clear recommendation',
          terms: [
            ['version B', 'variant B', 'subject line B', 'option B'],
            ['recommend'],
          ],
          points: 10,
          why: 'The reader should know exactly what to do after the first paragraph.',
          hint: 'Say clearly that you recommend version B’s style, and why.',
        },
        {
          id: 'memo-length',
          type: 'length',
          min: 80,
          max: 300,
          title: 'Length',
          points: 5,
          why: 'A memo, not a thesis.',
          hint: 'Aim for 80 to 300 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 160,
  skills: {
    'campaign-analytics': 40,
    copywriting: 20,
    'data-analysis': 25,
    presentation: 10,
  },
  feedback: {
    excellent: `Hi {name},

Clear, correct and convincing: B wins on every measure, and your memo makes the case in a minute. Benefit-led subject lines from now on.

Sofia`,
    good: `Hi {name},

Good analysis; a couple of details to fix. See the notes.

Sofia`,
    pass: `Hi {name},

The conclusion is right, but some numbers need fixing before I can share it.

Sofia`,
    fail: `Hi {name},

Not yet. Start with the totals per version, then the rates.

Sofia`,
  },
}
