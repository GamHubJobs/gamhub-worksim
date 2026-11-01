import type { AssignmentInput } from '../../schemas'

/**
 * Data 4 (Senior Data Analyst): the annual client portfolio review. Two
 * years of revenue by client and sector: growth, revenue per hour, the
 * declining clients, a sector summary, a report and a deck. Teaches:
 * growth rates, efficiency measures, SUMIF and COUNTIFS by sector, and
 * telling one consistent story in writing and on slides.
 */
const clients: Array<[string, string, number, number, number]> = [
  // client, sector, revenue 2024, revenue 2025, hours 2025
  ['Harbour Foods', 'Retail', 84000, 96600, 610],
  ['Northgate Motors', 'Manufacturing', 120000, 102000, 980],
  ['Brightpath Clinics', 'Healthcare', 65000, 81250, 420],
  ['Lind Studio', 'Retail', 22000, 19800, 190],
  ['Meadow Care Homes', 'Healthcare', 48000, 57600, 350],
  ['Okafor Build', 'Manufacturing', 95000, 99750, 700],
  ['Begum Textiles', 'Manufacturing', 56000, 47600, 520],
  ['Martin Bakery', 'Retail', 31000, 37200, 230],
  ['Riverside Dental', 'Healthcare', 27000, 32400, 180],
  ['Gonzalez Design', 'Retail', 40000, 36000, 330],
  ['Haddad Trading', 'Retail', 73000, 80300, 560],
  ['Steelway Engineering', 'Manufacturing', 110000, 115500, 820],
]

const sectors = ['Retail', 'Manufacturing', 'Healthcare']
const header = { bold: true, fill: 'gray' } as const
const last = clients.length + 1 // 13
const col = (c: string) => `Clients!$${c}$2:$${c}$${last}`
const lastSector = sectors.length + 1 // 4
const total = lastSector + 1 // 5

export const portfolioReview: AssignmentInput = {
  id: 'portfolio-review',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'senior-data-analyst',
  order: 7,
  title: 'Annual client portfolio review',
  summary:
    'Analyse two years of client revenue by sector, find where we grow and where we shrink, and present it.',
  estimatedMinutes: 60,
  from: 'manager',
  briefing: {
    subject: 'The annual portfolio review for the board',
    body: `Hi {name},

As a Senior Data Analyst, you now lead the **annual client portfolio review** for {director} and the board.

The workbook has revenue for 2024 and 2025 and the hours we worked in 2025 for each of our key clients. The board wants to know where the business is growing, where it is shrinking, and where our time earns the most. Please:
• work out each client’s growth, revenue per hour and whether they are growing or declining,
• summarise by sector: revenue both years, growth, hours, revenue per hour and the number of declining clients, with totals,
• name the fastest-growing client and sector, and chart revenue by sector for both years,
• write the **review in Docs** (summary, findings, recommendations), and
• prepare **4 to 8 slides** for the board.

Amara`,
  },
  whyItMatters:
    'Portfolio reviews shape strategy: which sectors to invest in, which clients need attention, and where people’s time is best spent. The analyst’s job is to find the pattern behind the numbers and present it so clearly that the decision is obvious.',
  objectives: [
    'Calculate growth and revenue per hour',
    'Summarise by sector with SUMIF and COUNTIFS',
    'Present one consistent story in a report and a deck',
  ],
  steps: [
    {
      id: 'clients',
      title: 'Each client',
      instructions: `On **Clients**, for rows 2 to ${last}:
- **F** growth: \`=(D2-C2)/C2\`
- **G** revenue per hour: \`=D2/E2\`
- **H** status: \`=IF(F2<0, "Declining", "Growing")\`

Format growth as **%**.`,
    },
    {
      id: 'sectors',
      title: 'Summarise by sector',
      instructions: `On **Sectors**, for each sector (rows 2 to ${lastSector}):
- **B** revenue 2024: \`=SUMIF(${col('B')}, A2, ${col('C')})\`, and **C** revenue 2025 (column D of Clients)
- **D** growth: \`=(C2-B2)/B2\`
- **E** hours: SUMIF on column E of Clients
- **F** revenue per hour: \`=C2/E2\`
- **G** declining clients: \`=COUNTIFS(${col('B')}, A2, ${col('H')}, "Declining")\`

Totals in row ${total} (SUM for B, C, E and G; the same formulas for D and F). Format growth as **%**.`,
      hint: 'Work out the total growth and revenue per hour from the totals, not by averaging the sectors.',
    },
    {
      id: 'best',
      title: 'The leaders and the chart',
      instructions: `**B7** fastest-growing client: \`=INDEX(Clients!A2:A${last}, MATCH(MAX(Clients!F2:F${last}), Clients!F2:F${last}, 0))\`. **B8** fastest-growing sector, the same way on D2:D${lastSector}. Then select **A1:C${lastSector}** and add a chart.`,
    },
    {
      id: 'report',
      title: 'Write the review',
      instructions:
        'In **Docs**, open **Client portfolio review**: an executive summary, findings and recommendations, with total 2025 revenue, overall growth, the sector to invest in and the sector that needs attention, and your chart. 250 to 900 words.',
    },
    {
      id: 'deck',
      title: 'Prepare the board slides',
      instructions:
        'In **Slides**, open **Portfolio review for the board**: 4 to 8 slides with the chart, the headline figures and your recommendation.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions:
        'Reply to {manager}’s email with the workbook, the review and the slides attached.',
    },
  ],
  workbook: {
    title: 'Client portfolio 2024 to 2025',
    sheets: [
      {
        name: 'Clients',
        columnWidths: { A: 170, B: 120, C: 110, D: 110, E: 90, F: 80, G: 130, H: 100 },
        cells: {
          A1: { input: 'Client', format: header },
          B1: { input: 'Sector', format: header },
          C1: { input: 'Revenue 2024', format: { ...header, align: 'right' } },
          D1: { input: 'Revenue 2025', format: { ...header, align: 'right' } },
          E1: { input: 'Hours 2025', format: { ...header, align: 'right' } },
          F1: { input: 'Growth', format: { ...header, align: 'right' } },
          G1: { input: 'Revenue per hour', format: { ...header, align: 'right' } },
          H1: { input: 'Status', format: header },
          ...Object.fromEntries(
            clients.flatMap((row, i) =>
              row.map((value, c) => [`${'ABCDE'[c]}${i + 2}`, String(value)]),
            ),
          ),
        },
      },
      {
        name: 'Sectors',
        columnWidths: { A: 200, B: 110, C: 110, D: 80, E: 80, F: 130, G: 130 },
        cells: {
          A1: { input: 'Sector', format: header },
          B1: { input: 'Revenue 2024', format: { ...header, align: 'right' } },
          C1: { input: 'Revenue 2025', format: { ...header, align: 'right' } },
          D1: { input: 'Growth', format: { ...header, align: 'right' } },
          E1: { input: 'Hours', format: { ...header, align: 'right' } },
          F1: { input: 'Revenue per hour', format: { ...header, align: 'right' } },
          G1: { input: 'Declining clients', format: { ...header, align: 'right' } },
          ...Object.fromEntries(sectors.map((sector, i) => [`A${i + 2}`, sector])),
          [`A${total}`]: { input: 'Total', format: { bold: true } },
          A7: { input: 'Fastest-growing client', format: { bold: true } },
          A8: { input: 'Fastest-growing sector', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Clients: Object.fromEntries(
      clients.flatMap((_, i) => {
        const r = i + 2
        return [
          [`F${r}`, `=(D${r}-C${r})/C${r}`],
          [`G${r}`, `=D${r}/E${r}`],
          [`H${r}`, `=IF(F${r}<0, "Declining", "Growing")`],
        ]
      }),
    ),
    Sectors: {
      ...Object.fromEntries(
        sectors.flatMap((_, i) => {
          const r = i + 2
          return [
            [`B${r}`, `=SUMIF(${col('B')}, A${r}, ${col('C')})`],
            [`C${r}`, `=SUMIF(${col('B')}, A${r}, ${col('D')})`],
            [`D${r}`, `=(C${r}-B${r})/B${r}`],
            [`E${r}`, `=SUMIF(${col('B')}, A${r}, ${col('E')})`],
            [`F${r}`, `=C${r}/E${r}`],
            [`G${r}`, `=COUNTIFS(${col('B')}, A${r}, ${col('H')}, "Declining")`],
          ]
        }),
      ),
      [`B${total}`]: `=SUM(B2:B${lastSector})`,
      [`C${total}`]: `=SUM(C2:C${lastSector})`,
      [`D${total}`]: `=(C${total}-B${total})/B${total}`,
      [`E${total}`]: `=SUM(E2:E${lastSector})`,
      [`F${total}`]: `=C${total}/E${total}`,
      [`G${total}`]: `=SUM(G2:G${lastSector})`,
      B7: `=INDEX(Clients!A2:A${last}, MATCH(MAX(Clients!F2:F${last}), Clients!F2:F${last}, 0))`,
      B8: `=INDEX(A2:A${lastSector}, MATCH(MAX(D2:D${lastSector}), D2:D${lastSector}, 0))`,
    },
  },
  scenarios: [
    {
      description: 'A retail client’s final invoice is revised down',
      changes: { 'Clients!D2': '80000' },
    },
  ],
  checks: [
    {
      id: 'clients',
      type: 'values',
      title: 'Growth, revenue per hour and status',
      cells: [`Clients!F2:H${last}`],
      requireFormula: true,
      points: 20,
      why: 'Each client’s trend is the raw material of the review.',
      hint: 'F2 =(D2-C2)/C2, G2 =D2/E2, H2 =IF(F2<0, "Declining", "Growing").',
    },
    {
      id: 'sectors',
      type: 'values',
      title: 'Revenue and hours by sector',
      cells: [`Sectors!B2:C${lastSector}`, `Sectors!E2:E${lastSector}`],
      requireFormula: true,
      functions: ['SUMIF', 'SUMIFS'],
      points: 12,
      why: 'The board decides by sector, not client by client.',
      hint: `B2 =SUMIF(${col('B')}, A2, ${col('C')}); C and E the same way on columns D and E of Clients.`,
    },
    {
      id: 'sector-measures',
      type: 'values',
      title: 'Growth, revenue per hour and declining clients by sector',
      cells: [`Sectors!D2:D${lastSector}`, `Sectors!F2:G${lastSector}`],
      requireFormula: true,
      points: 8,
      why: 'Size shows where we are today; growth and efficiency show where to go next.',
      hint: `D2 =(C2-B2)/B2; F2 =C2/E2; G2 =COUNTIFS(${col('B')}, A2, ${col('H')}, "Declining").`,
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Portfolio totals',
      cells: [`Sectors!B${total}:G${total}`],
      requireFormula: true,
      points: 10,
      why: 'The headline numbers of the year.',
      hint: `SUM B, C, E and G; D${total} =(C${total}-B${total})/B${total}; F${total} =C${total}/E${total}.`,
    },
    {
      id: 'leaders',
      type: 'values',
      title: 'Fastest-growing client and sector',
      cells: ['Sectors!B7:B8'],
      requireFormula: true,
      functions: ['INDEX', 'XLOOKUP'],
      points: 5,
      why: 'The board will ask “who is growing fastest?” in the first minute.',
      hint: 'INDEX and MATCH on the highest growth.',
    },
    {
      id: 'growth-format',
      type: 'format',
      title: 'Growth shown as percentages',
      cells: [`Clients!F2:F${last}`, `Sectors!D2:D${total}`],
      format: { numberFormat: 'percent' },
      points: 5,
      why: 'Growth is always read as a percentage.',
      hint: 'Select the growth columns and click %.',
    },
    {
      id: 'chart',
      type: 'chart',
      title: 'Revenue by sector, both years',
      cells: [`Sectors!A1:C${lastSector}`],
      points: 5,
      why: 'The change between the years is the story; a chart shows it instantly.',
      hint: 'Select A1:C4 on Sectors and add a chart.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Client data left unchanged',
      cells: [`Clients!A1:E${last}`],
      points: 5,
      why: 'Revenue and hours come from the finance and time systems.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Client portfolio review',
      template: 'report',
      checks: [
        {
          id: 'report-sections',
          type: 'sections',
          title: 'Report structure',
          sections: [['Executive summary', 'Summary'], ['Findings'], ['Recommendation']],
          points: 5,
          why: 'Board members read the summary and the recommendations first.',
          hint: 'Keep the headings: Executive summary, Findings, Recommendations.',
        },
        {
          id: 'report-figures',
          type: 'figures',
          title: 'Headline figures',
          figures: [
            { label: 'total revenue for 2025', cell: `Sectors!C${total}` },
            { label: 'overall growth', cell: `Sectors!D${total}`, percent: true },
            { label: 'growth in healthcare', cell: 'Sectors!D4', percent: true },
          ],
          points: 10,
          why: 'Every number in the review must match the analysis.',
          hint: `Quote C${total}, D${total} and the healthcare growth (D4) from the Sectors sheet.`,
        },
        {
          id: 'report-sectors',
          type: 'mentions',
          title: 'Where to invest, and what needs attention',
          terms: [['Healthcare'], ['Manufacturing']],
          points: 5,
          why: 'The review must point the board at both the opportunity and the risk.',
          hint: 'Which sector grows fastest, and which one is shrinking?',
        },
        {
          id: 'report-chart',
          type: 'charts',
          min: 1,
          title: 'Chart in the review',
          points: 5,
          why: 'One good chart tells the story faster than a page of text.',
          hint: 'Insert your chart with Chart in the Docs toolbar.',
        },
        {
          id: 'report-length',
          type: 'length',
          min: 250,
          max: 900,
          title: 'Length',
          points: 5,
          why: 'Complete, but readable before the board meeting.',
          hint: 'Aim for 250 to 900 words.',
        },
      ],
    },
    {
      kind: 'slides',
      title: 'Portfolio review for the board',
      template: 'business-review',
      checks: [
        {
          id: 'deck-length',
          type: 'length',
          min: 4,
          max: 8,
          title: 'Number of slides',
          points: 5,
          why: 'The board gives each item ten minutes.',
          hint: 'Keep 4 to 8 slides.',
        },
        {
          id: 'deck-chart',
          type: 'charts',
          min: 1,
          title: 'Chart on a slide',
          points: 5,
          why: 'The chart is what the board will remember.',
          hint: 'Add your chart with Chart in the Slides toolbar.',
        },
        {
          id: 'deck-figures',
          type: 'figures',
          title: 'Headline figures on the slides',
          figures: [{ label: 'total revenue for 2025', cell: `Sectors!C${total}` }],
          points: 5,
          why: 'The report and the slides must tell the same story.',
          hint: `Put C${total} on your key figures slide.`,
        },
        {
          id: 'deck-sector',
          type: 'mentions',
          title: 'The recommendation on the slides',
          terms: [['Healthcare']],
          points: 5,
          why: 'Lead the board to the decision.',
          hint: 'Name the sector to invest in on a slide.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 200,
  skills: {
    'data-analysis': 30,
    'insight-communication': 35,
    'data-visualisation': 20,
    presentation: 25,
  },
  feedback: {
    excellent: `Hi {name},

Outstanding. Healthcare is growing over 20% and earns the most per hour, manufacturing is shrinking, and your review makes the decision obvious. {director} is taking your recommendation to the board unchanged.

Amara`,
    good: `Hi {name},

A strong review; a few details to fix before the board sees it. See the notes.

Amara`,
    pass: `Hi {name},

The analysis is there, but the review or the slides need more work. The notes explain.

Amara`,
    fail: `Hi {name},

Not ready yet. Start with each client’s growth, then build the sector summary from it.

Amara`,
  },
}
