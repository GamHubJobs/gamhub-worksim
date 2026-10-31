import type { AssignmentInput } from '../../schemas'

/**
 * Marketing 4 (Digital Marketing Specialist): the quarterly campaign report.
 * Summarise three months of results by channel, chart them, and present the
 * findings in a report and a deck for the commercial director.
 */
const data: Record<string, Array<[string, string, string]>> = {
  // channel: [spend, revenue, leads] for Jan, Feb, Mar
  'Search ads': [
    ['3000', '16000', '80'],
    ['3200', '17500', '86'],
    ['3400', '18400', '90'],
  ],
  'Social ads': [
    ['2000', '6000', '40'],
    ['2200', '7100', '45'],
    ['2400', '8300', '52'],
  ],
  Email: [
    ['300', '9000', '60'],
    ['300', '9600', '64'],
    ['350', '11200', '71'],
  ],
  'Partner referrals': [
    ['800', '7200', '30'],
    ['900', '8100', '34'],
    ['1000', '9900', '41'],
  ],
  Webinars: [
    ['1500', '4500', '50'],
    ['1500', '5200', '58'],
    ['1500', '6100', '66'],
  ],
}
const months = ['January', 'February', 'March']
const channels = Object.keys(data)
const rows = months.flatMap((month, m) =>
  channels.map((channel) => [month, channel, ...data[channel][m]] as const),
)

const header = { bold: true, fill: 'gray' } as const
const lastRow = rows.length + 1 // 16
const lastChannel = channels.length + 1 // 6
const total = lastChannel + 2 // 8
const monthly = (col: string) => `Monthly!$${col}$2:$${col}$${lastRow}`

export const quarterlyReport: AssignmentInput = {
  id: 'quarterly-campaign-report',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'digital-marketing-specialist',
  order: 4,
  title: 'Quarterly campaign report',
  summary:
    'Summarise a quarter of campaigns by channel, then report and present what worked.',
  estimatedMinutes: 60,
  from: 'manager',
  briefing: {
    subject: 'Q1 campaign report for the commercial director',
    body: `Hi {name},

As our Digital Marketing Specialist, you now own the **quarterly campaign report** for {director}.

The workbook has spend, revenue and leads for each channel and month of the first quarter. Please:
• summarise the quarter by channel: spend, revenue, leads, return on ad spend (ROAS) and cost per lead, with totals,
• name the channel with the best ROAS, and make a chart comparing spend and revenue by channel,
• write the **report in Docs** (summary, findings, recommendations) with the key figures and the chart,
• prepare **4 to 8 slides** for the quarterly review, with the chart and the headline numbers.

Reply with all three files.

Sofia`,
  },
  whyItMatters:
    'Quarterly reporting decides next quarter’s budget. The skill is not just calculating the numbers, but turning them into a clear story, in writing and on slides, that leads to a decision.',
  objectives: [
    'Summarise monthly data by channel with SUMIF',
    'Compare channels by ROAS and cost per lead',
    'Present findings consistently in a report and a deck',
  ],
  steps: [
    {
      id: 'summary',
      title: 'Summarise by channel',
      instructions: `On **Summary**, for each channel (rows 2 to ${lastChannel}): **B** spend \`=SUMIF(${monthly('B')}, A2, ${monthly('C')})\`, **C** revenue (column D of Monthly), **D** leads (column E). Then **E** ROAS \`=C2/B2\` and **F** cost per lead \`=B2/D2\`. Totals in row ${total} (SUM for B to D, the same formulas for E and F).`,
    },
    {
      id: 'best',
      title: 'Best channel and chart',
      instructions: `In **B10**: \`=INDEX(A2:A${lastChannel}, MATCH(MAX(E2:E${lastChannel}), E2:E${lastChannel}, 0))\`. Then select **A1:C${lastChannel}** and add a chart of spend and revenue.`,
    },
    {
      id: 'report',
      title: 'Write the report',
      instructions:
        'In **Docs**, open **Q1 campaign report**: executive summary, findings and recommendations, with total spend, total revenue and the best channel, and your chart. 200 to 800 words.',
    },
    {
      id: 'deck',
      title: 'Prepare the slides',
      instructions:
        'In **Slides**, open **Q1 campaign review**: 4 to 8 slides with the chart, the total revenue and your recommendation.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions:
        'Reply to {manager}’s email with the workbook, the report and the slides attached.',
    },
  ],
  workbook: {
    title: 'Q1 campaign results',
    sheets: [
      {
        name: 'Monthly',
        columnWidths: { A: 90, B: 140, C: 80, D: 90, E: 70 },
        cells: {
          A1: { input: 'Month', format: header },
          B1: { input: 'Channel', format: header },
          C1: { input: 'Spend', format: { ...header, align: 'right' } },
          D1: { input: 'Revenue', format: { ...header, align: 'right' } },
          E1: { input: 'Leads', format: { ...header, align: 'right' } },
          ...Object.fromEntries(
            rows.flatMap((row, i) => row.map((v, c) => [`${'ABCDE'[c]}${i + 2}`, v])),
          ),
        },
      },
      {
        name: 'Summary',
        columnWidths: { A: 140, B: 90, C: 90, D: 70, E: 70, F: 110 },
        cells: {
          A1: { input: 'Channel', format: header },
          B1: { input: 'Spend', format: { ...header, align: 'right' } },
          C1: { input: 'Revenue', format: { ...header, align: 'right' } },
          D1: { input: 'Leads', format: { ...header, align: 'right' } },
          E1: { input: 'ROAS', format: { ...header, align: 'right' } },
          F1: { input: 'Cost per lead', format: { ...header, align: 'right' } },
          ...Object.fromEntries(channels.map((c, i) => [`A${i + 2}`, c])),
          [`A${total}`]: { input: 'Total', format: { bold: true } },
          A10: { input: 'Best channel (ROAS)', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Summary: {
      ...Object.fromEntries(
        channels.flatMap((_, i) => {
          const r = i + 2
          return [
            [`B${r}`, `=SUMIF(${monthly('B')}, A${r}, ${monthly('C')})`],
            [`C${r}`, `=SUMIF(${monthly('B')}, A${r}, ${monthly('D')})`],
            [`D${r}`, `=SUMIF(${monthly('B')}, A${r}, ${monthly('E')})`],
            [`E${r}`, `=C${r}/B${r}`],
            [`F${r}`, `=B${r}/D${r}`],
          ]
        }),
      ),
      [`B${total}`]: `=SUM(B2:B${lastChannel})`,
      [`C${total}`]: `=SUM(C2:C${lastChannel})`,
      [`D${total}`]: `=SUM(D2:D${lastChannel})`,
      [`E${total}`]: `=C${total}/B${total}`,
      [`F${total}`]: `=B${total}/D${total}`,
      B10: `=INDEX(A2:A${lastChannel}, MATCH(MAX(E2:E${lastChannel}), E2:E${lastChannel}, 0))`,
    },
  },
  scenarios: [
    {
      description: 'March webinar revenue is revised up',
      changes: { 'Monthly!D16': '9100' },
    },
  ],
  checks: [
    {
      id: 'by-channel',
      type: 'values',
      title: 'Spend, revenue and leads by channel',
      cells: [`Summary!B2:D${lastChannel}`],
      requireFormula: true,
      functions: ['SUMIF', 'SUMIFS'],
      points: 20,
      why: 'Three months of data only becomes useful once it is summarised by channel.',
      hint: `B2 =SUMIF(Monthly!$B$2:$B$${lastRow}, A2, Monthly!$C$2:$C$${lastRow}); use D and E for revenue and leads.`,
    },
    {
      id: 'efficiency',
      type: 'values',
      title: 'ROAS and cost per lead',
      cells: [`Summary!E2:F${lastChannel}`],
      requireFormula: true,
      points: 10,
      why: 'Efficiency, not size, decides where the next pound goes.',
      hint: 'E2 =C2/B2, F2 =B2/D2.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Quarter totals',
      cells: [`Summary!B${total}:F${total}`],
      requireFormula: true,
      points: 10,
      why: 'The headline numbers of the quarter.',
      hint: `SUM B to D in row ${total}; E${total} =C${total}/B${total}, F${total} =B${total}/D${total}.`,
    },
    {
      id: 'best',
      type: 'values',
      title: 'Best channel',
      cells: ['Summary!B10'],
      requireFormula: true,
      functions: ['INDEX', 'XLOOKUP'],
      points: 5,
      why: 'The answer to “where should we spend more?”',
      hint: 'B10 =INDEX(A2:A6, MATCH(MAX(E2:E6), E2:E6, 0)).',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'A chart of spend and revenue',
      cells: [`Summary!A1:C${lastChannel}`],
      points: 5,
      why: 'Directors read charts before tables.',
      hint: 'Select A1:C6 on Summary and add a chart.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Monthly data left unchanged',
      cells: [`Monthly!A1:E${lastRow}`],
      points: 5,
      why: 'Results come from the ad platforms and the CRM.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Q1 campaign report',
      template: 'report',
      checks: [
        {
          id: 'report-sections',
          type: 'sections',
          title: 'Report structure',
          sections: [['Executive summary', 'Summary'], ['Findings'], ['Recommendation']],
          points: 10,
          why: 'Directors read the summary and the recommendations first.',
          hint: 'Keep the headings: Executive summary, Findings, Recommendations.',
        },
        {
          id: 'report-figures',
          type: 'figures',
          title: 'Headline figures',
          figures: [
            { label: 'total spend', cell: `Summary!B${total}` },
            { label: 'total revenue', cell: `Summary!C${total}` },
          ],
          points: 15,
          why: 'Numbers in the report must match the analysis.',
          hint: `Quote B${total} and C${total} from the Summary sheet.`,
        },
        {
          id: 'report-best',
          type: 'mentions',
          title: 'The best channel named',
          terms: [['Email']],
          points: 5,
          why: 'The finding that should change the budget.',
          hint: 'Which channel has the highest ROAS?',
        },
        {
          id: 'report-chart',
          type: 'charts',
          min: 1,
          title: 'Chart in the report',
          points: 5,
          why: 'One good chart tells the story faster than a page of text.',
          hint: 'Insert your chart with Chart in the Docs toolbar.',
        },
        {
          id: 'report-length',
          type: 'length',
          min: 200,
          max: 800,
          title: 'Length',
          points: 5,
          why: 'Complete, but readable in five minutes.',
          hint: 'Aim for 200 to 800 words.',
        },
      ],
    },
    {
      kind: 'slides',
      title: 'Q1 campaign review',
      template: 'business-review',
      checks: [
        {
          id: 'deck-length',
          type: 'length',
          min: 4,
          max: 8,
          title: 'Number of slides',
          points: 5,
          why: 'A quarterly review slot is short.',
          hint: 'Keep 4 to 8 slides.',
        },
        {
          id: 'deck-chart',
          type: 'charts',
          min: 1,
          title: 'Chart on a slide',
          points: 5,
          why: 'The chart is what the room will remember.',
          hint: 'Add your chart with Chart in the Slides toolbar.',
        },
        {
          id: 'deck-revenue',
          type: 'figures',
          title: 'Total revenue on the slides',
          figures: [{ label: 'total revenue', cell: `Summary!C${total}` }],
          points: 5,
          why: 'The report and the slides must tell the same story.',
          hint: `Put C${total} on your key figures slide.`,
        },
        {
          id: 'deck-best',
          type: 'mentions',
          title: 'The best channel on the slides',
          terms: [['Email']],
          points: 5,
          why: 'Lead the room to the decision.',
          hint: 'Name the best channel on a slide.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: {
    'campaign-analytics': 35,
    'content-strategy': 30,
    presentation: 30,
    'data-analysis': 15,
  },
  feedback: {
    excellent: `Hi {name},

Superb: the numbers, the story and the slides all line up, and the case for moving budget into email is impossible to miss. {director} has signed it off.

Sofia`,
    good: `Hi {name},

Strong report; a few details to fix before it goes upstairs. See the notes.

Sofia`,
    pass: `Hi {name},

The analysis is there, but the report or slides need more work. Check the notes.

Sofia`,
    fail: `Hi {name},

Not ready yet. Start with the channel summary, then build the story from it.

Sofia`,
  },
}
