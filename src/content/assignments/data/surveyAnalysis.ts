import type { AssignmentInput } from '../../schemas'

/**
 * Data 3 (Data Analyst): analyse a client satisfaction survey by team, find
 * the weakest team and what goes with it, and write an insight memo.
 * Teaches: AVERAGEIF, COUNTIFS for rates, MEDIAN, percentages from counts,
 * and explaining a finding with its evidence and its limits.
 */
const teams = ['Advisory', 'Audit', 'Tax']
const answers: Record<string, Array<[number, number, string]>> = {
  // score (1 to 5), days to resolve the client's request, would recommend
  Advisory: [
    [5, 2, 'Yes'],
    [4, 3, 'Yes'],
    [4, 2, 'Yes'],
    [5, 1, 'Yes'],
    [3, 4, 'No'],
    [4, 2, 'Yes'],
    [5, 3, 'Yes'],
    [4, 2, 'Yes'],
  ],
  Audit: [
    [3, 6, 'No'],
    [2, 8, 'No'],
    [4, 4, 'Yes'],
    [3, 7, 'Yes'],
    [2, 9, 'No'],
    [3, 5, 'No'],
    [4, 4, 'Yes'],
    [2, 8, 'No'],
  ],
  Tax: [
    [4, 3, 'Yes'],
    [5, 2, 'Yes'],
    [3, 5, 'No'],
    [4, 3, 'Yes'],
    [4, 3, 'Yes'],
    [5, 1, 'Yes'],
    [3, 4, 'No'],
    [4, 3, 'Yes'],
  ],
}
/** Responses in the order they arrived: the teams interleaved. */
const responses = answers.Advisory.flatMap((_, i) =>
  teams.map((team) => [team, ...answers[team][i]] as const),
)

const header = { bold: true, fill: 'gray' } as const
const last = responses.length + 1 // 25
const col = (c: string) => `Survey!$${c}$2:$${c}$${last}`
const lastTeam = teams.length + 1 // 4
const overall = lastTeam + 1 // 5

export const surveyAnalysis: AssignmentInput = {
  id: 'survey-analysis',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'data-analyst',
  order: 4,
  title: 'What the client survey says',
  summary:
    'Analyse satisfaction by team, find the weakest team and what explains it, and write an insight memo.',
  estimatedMinutes: 45,
  from: 'manager',
  briefing: {
    subject: 'Client survey results: what do they tell us?',
    body: `Hi {name},

The client satisfaction survey has closed. Each response scores us from 1 to 5, and the workbook also has how many days we took to resolve the client’s request and whether they would recommend us.

{director} wants to know how each team is doing and, more importantly, **why**. Please:
• summarise each team and the company overall: average score, the share of satisfied clients (4 or 5), average days to resolve and the share who would recommend us,
• find the lowest-scoring team, and the median score overall,
• chart the average score by team,
• write a short **insight memo** in Word Craft: the finding, the evidence, a recommendation, and one honest caveat.

Amara`,
  },
  whyItMatters:
    'Numbers become valuable when they explain something and lead to action. A good analyst finds the pattern, backs it with evidence, says what to do about it, and is honest about what the data cannot prove.',
  objectives: [
    'Calculate averages and rates by group with AVERAGEIF and COUNTIFS',
    'Find the weakest group and a likely explanation',
    'Write an insight memo with evidence, a recommendation and a caveat',
  ],
  steps: [
    {
      id: 'teams',
      title: 'Summarise each team',
      instructions: `On **Summary**, for each team (rows 2 to ${lastTeam}):
- **F** responses: \`=COUNTIF(${col('B')}, A2)\`
- **B** average score: \`=AVERAGEIF(${col('B')}, A2, ${col('C')})\`
- **C** satisfied: \`=COUNTIFS(${col('B')}, A2, ${col('C')}, ">=4")/F2\`
- **D** average days to resolve: \`=AVERAGEIF(${col('B')}, A2, ${col('D')})\`
- **E** would recommend: \`=COUNTIFS(${col('B')}, A2, ${col('E')}, "Yes")/F2\``,
    },
    {
      id: 'overall',
      title: 'The company overall',
      instructions: `In row ${overall}, the same measures for every response: e.g. **B${overall}** \`=AVERAGE(Survey!C2:C${last})\`, **C${overall}** \`=COUNTIF(Survey!C2:C${last}, ">=4")/F${overall}\`, **F${overall}** \`=COUNT(Survey!C2:C${last})\`. Format the shares in C and E as **%**.`,
      hint: 'Work the overall rates out from all the responses, not by averaging the three team rates.',
    },
    {
      id: 'lowest',
      title: 'Lowest team, median and chart',
      instructions: `**B7**: \`=INDEX(A2:A${lastTeam}, MATCH(MIN(B2:B${lastTeam}), B2:B${lastTeam}, 0))\`. **B8**: \`=MEDIAN(Survey!C2:C${last})\`. Then select **A1:B${lastTeam}** and add a chart.`,
    },
    {
      id: 'memo',
      title: 'Write the insight memo',
      instructions:
        'In **Word Craft**, open **Client survey insights**. Say which team scores lowest, with its share of satisfied clients and its average days to resolve, compared with the company overall. Recommend what to do, and add one caveat about what the data can and cannot show. 120 to 400 words.',
      hint: 'Look at days to resolve next to the scores: is there a pattern? A survey of 24 clients shows a link, not proof of the cause.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions: 'Reply to {manager}’s email with the workbook and the memo attached.',
    },
  ],
  workbook: {
    title: 'Client satisfaction survey',
    sheets: [
      {
        name: 'Survey',
        columnWidths: { A: 80, B: 90, C: 70, D: 120, E: 140 },
        cells: {
          A1: { input: 'Response', format: header },
          B1: { input: 'Team', format: header },
          C1: { input: 'Score', format: { ...header, align: 'right' } },
          D1: { input: 'Days to resolve', format: { ...header, align: 'right' } },
          E1: { input: 'Would recommend', format: header },
          ...Object.fromEntries(
            responses.flatMap(([team, score, days, recommend], i) => {
              const r = i + 2
              return [
                [`A${r}`, `R-${String(i + 1).padStart(3, '0')}`],
                [`B${r}`, team],
                [`C${r}`, String(score)],
                [`D${r}`, String(days)],
                [`E${r}`, recommend],
              ]
            }),
          ),
        },
      },
      {
        name: 'Summary',
        columnWidths: { A: 170, B: 110, C: 90, D: 150, E: 130, F: 90 },
        cells: {
          A1: { input: 'Team', format: header },
          B1: { input: 'Average score', format: { ...header, align: 'right' } },
          C1: { input: 'Satisfied', format: { ...header, align: 'right' } },
          D1: { input: 'Average days to resolve', format: { ...header, align: 'right' } },
          E1: { input: 'Would recommend', format: { ...header, align: 'right' } },
          F1: { input: 'Responses', format: { ...header, align: 'right' } },
          ...Object.fromEntries(teams.map((team, i) => [`A${i + 2}`, team])),
          [`A${overall}`]: { input: 'Overall', format: { bold: true } },
          A7: { input: 'Lowest-scoring team', format: { bold: true } },
          A8: { input: 'Median score', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Summary: {
      ...Object.fromEntries(
        teams.flatMap((_, i) => {
          const r = i + 2
          return [
            [`B${r}`, `=AVERAGEIF(${col('B')}, A${r}, ${col('C')})`],
            [`C${r}`, `=COUNTIFS(${col('B')}, A${r}, ${col('C')}, ">=4")/F${r}`],
            [`D${r}`, `=AVERAGEIF(${col('B')}, A${r}, ${col('D')})`],
            [`E${r}`, `=COUNTIFS(${col('B')}, A${r}, ${col('E')}, "Yes")/F${r}`],
            [`F${r}`, `=COUNTIF(${col('B')}, A${r})`],
          ]
        }),
      ),
      [`B${overall}`]: `=AVERAGE(Survey!C2:C${last})`,
      [`C${overall}`]: `=COUNTIF(Survey!C2:C${last}, ">=4")/F${overall}`,
      [`D${overall}`]: `=AVERAGE(Survey!D2:D${last})`,
      [`E${overall}`]: `=COUNTIF(Survey!E2:E${last}, "Yes")/F${overall}`,
      [`F${overall}`]: `=COUNT(Survey!C2:C${last})`,
      B7: `=INDEX(A2:A${lastTeam}, MATCH(MIN(B2:B${lastTeam}), B2:B${lastTeam}, 0))`,
      B8: `=MEDIAN(Survey!C2:C${last})`,
    },
  },
  scenarios: [
    {
      description: 'A late response arrives for Tax',
      changes: { 'Survey!C4': '1', 'Survey!E4': 'No' },
    },
  ],
  checks: [
    {
      id: 'teams',
      type: 'values',
      title: 'Each team summarised',
      cells: [`Summary!B2:F${lastTeam}`],
      requireFormula: true,
      functions: ['AVERAGEIF', 'AVERAGEIFS', 'COUNTIF', 'COUNTIFS'],
      points: 30,
      why: 'Comparing teams side by side is what shows where the problem is.',
      hint: 'B2 =AVERAGEIF(team range, A2, score range); C2 =COUNTIFS(team range, A2, score range, ">=4")/F2.',
    },
    {
      id: 'overall',
      type: 'values',
      title: 'The company overall',
      cells: [`Summary!B${overall}:F${overall}`],
      requireFormula: true,
      points: 15,
      why: 'Each team needs a benchmark to be compared against.',
      hint: `Use every response: B${overall} =AVERAGE(Survey!C2:C${last}), and rates from counts.`,
    },
    {
      id: 'lowest',
      type: 'values',
      title: 'Lowest team and median',
      cells: ['Summary!B7:B8'],
      requireFormula: true,
      points: 10,
      why: 'The weakest team is where improvement matters most.',
      hint: 'B7 =INDEX(A2:A4, MATCH(MIN(B2:B4), B2:B4, 0)); B8 =MEDIAN(Survey!C2:C25).',
    },
    {
      id: 'rates-format',
      type: 'format',
      title: 'Shares shown as percentages',
      cells: [`Summary!C2:C${overall}`, `Summary!E2:E${overall}`],
      format: { numberFormat: 'percent' },
      points: 5,
      why: '0.25 means nothing to most readers; 25% does.',
      hint: `Select C2:C${overall} and E2:E${overall} and click %.`,
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'Average score by team',
      cells: [`Summary!A1:B${lastTeam}`],
      points: 5,
      why: 'The gap between the teams is obvious at a glance.',
      hint: 'Select A1:B4 on Summary and add a chart.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Responses left unchanged',
      cells: [`Survey!A1:E${last}`],
      points: 5,
      why: 'Survey answers are what clients told us, and must never be edited.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Client survey insights',
      template: 'memo',
      checks: [
        {
          id: 'memo-finding',
          type: 'mentions',
          title: 'The finding and a recommendation',
          terms: [['Audit'], ['recommend', 'suggest', 'propose']],
          points: 10,
          why: 'Lead with what you found and what to do about it.',
          hint: 'Name the lowest-scoring team, and recommend an action.',
        },
        {
          id: 'memo-evidence',
          type: 'figures',
          title: 'The evidence',
          figures: [
            {
              label: 'share of satisfied Audit clients',
              cell: 'Summary!C3',
              percent: true,
            },
            {
              label: 'company-wide share of satisfied clients',
              cell: `Summary!C${overall}`,
              percent: true,
            },
            {
              label: 'average days Audit takes to resolve a request',
              cell: 'Summary!D3',
            },
          ],
          points: 15,
          why: 'A finding without numbers is an opinion.',
          hint: 'Quote Audit’s satisfied share (C3) against the overall share, and its average days to resolve (D3).',
        },
        {
          id: 'memo-caveat',
          type: 'mentions',
          title: 'An honest caveat',
          terms: [
            [
              'caveat',
              'limitation',
              'however',
              'cannot prove',
              'small sample',
              'only 24',
              'correlation',
            ],
          ],
          points: 5,
          why: 'Saying what the data cannot show is what makes the rest believable.',
          hint: 'Mention a limit: for example, 24 responses show a link but do not prove the cause.',
        },
        {
          id: 'memo-length',
          type: 'length',
          min: 120,
          max: 400,
          title: 'Length',
          points: 5,
          why: 'Short enough to be read, long enough to convince.',
          hint: 'Aim for 120 to 400 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 160,
  skills: {
    'data-analysis': 35,
    'insight-communication': 35,
    'data-visualisation': 10,
    formulas: 15,
  },
  feedback: {
    excellent: `Hi {name},

This is exactly what insight looks like: Audit takes twice as long to resolve requests and scores far lower, you said what to do, and you were honest about the limits. {director} has asked Audit to set a response-time target.

Amara`,
    good: `Hi {name},

Good analysis; a few points to tighten before it goes upstairs. See the notes.

Amara`,
    pass: `Hi {name},

The numbers are partly there, but the story isn’t clear yet. The notes explain.

Amara`,
    fail: `Hi {name},

Not yet. Build the team summary first, then look at what stands out.

Amara`,
  },
}
