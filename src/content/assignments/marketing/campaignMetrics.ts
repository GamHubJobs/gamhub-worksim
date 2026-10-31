import type { AssignmentInput } from '../../schemas'

/**
 * Marketing 1 (Marketing Assistant): campaign metrics by channel. Teaches:
 * CTR, CPC, conversion rate, CPA and ROAS, flagging channels that lose money,
 * and finding the best channel with INDEX and MATCH.
 */
const channels: Array<[string, string, string, string, string, string]> = [
  // channel, impressions, clicks, spend, conversions, revenue
  ['Search ads', '120000', '4800', '3600', '192', '23040'],
  ['Social ads', '250000', '3750', '2250', '75', '7500'],
  ['Email', '40000', '2400', '300', '120', '14400'],
  ['Display', '400000', '1600', '2000', '16', '1600'],
  ['Partner referrals', '15000', '900', '900', '54', '9720'],
]

const header = { bold: true, fill: 'gray' } as const
const last = channels.length + 1 // 6
const total = last + 2 // 8

const metrics = (r: number | string) => ({
  G: `=C${r}/B${r}`,
  H: `=D${r}/C${r}`,
  I: `=E${r}/C${r}`,
  J: `=D${r}/E${r}`,
  K: `=F${r}/D${r}`,
})

export const campaignMetrics: AssignmentInput = {
  id: 'campaign-metrics',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'marketing-assistant',
  order: 1,
  title: 'Campaign performance by channel',
  summary:
    'Work out the key metrics for each channel and find where the money is made and lost.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Your first task: how did the autumn campaign do?',
    body: `Hi {name},

Welcome to Marketing! Before we plan anything new, we look at what worked. The workbook has the autumn campaign’s results for each channel: impressions, clicks, spend, conversions (new client enquiries) and the revenue they led to.

Please work out the five metrics every marketer uses, for each channel and in total, flag any channel that loses money, and tell me which channel gave the best return.

Sofia`,
  },
  whyItMatters:
    'Marketing budgets are spent where the numbers say they work. Click-through rate shows whether an ad gets attention; conversion rate whether the traffic is right; cost per acquisition and return on ad spend whether it pays. These five metrics are the language of every marketing meeting.',
  objectives: [
    'Calculate CTR, CPC, conversion rate, CPA and ROAS',
    'Spot channels that cost more than they earn',
    'Find the best performer with INDEX and MATCH',
  ],
  steps: [
    {
      id: 'metrics',
      title: 'The five metrics',
      instructions: `For each channel (rows 2 to ${last}):
- **G** CTR (click-through rate): \`=C2/B2\`
- **H** CPC (cost per click): \`=D2/C2\`
- **I** Conversion rate: \`=E2/C2\`
- **J** CPA (cost per acquisition): \`=D2/E2\`
- **K** ROAS (return on ad spend): \`=F2/D2\`

Fill them down, and format CTR and conversion rate as **%**.`,
    },
    {
      id: 'totals',
      title: 'The whole campaign',
      instructions: `In row ${total}, add up columns B to F with SUM, and use the same five formulas on the totals (e.g. G${total} \`=C${total}/B${total}\`).`,
      hint: 'Do not average the percentages: work them out from the totals, or big and small channels count the same.',
    },
    {
      id: 'flags',
      title: 'Flag what loses money',
      instructions: `In **L2**: \`=IF(K2<1, "Losing money", "Profitable")\`. A ROAS below 1 means each pound spent brought back less than a pound.`,
    },
    {
      id: 'best',
      title: 'The best channel',
      instructions: `In **B10**: \`=INDEX(A2:A${last}, MATCH(MAX(K2:K${last}), K2:K${last}, 0))\`. MAX finds the highest ROAS, MATCH finds its row, and INDEX returns the channel’s name.`,
    },
  ],
  workbook: {
    title: 'Autumn campaign results',
    sheets: [
      {
        name: 'Channels',
        columnWidths: {
          A: 140,
          B: 100,
          C: 80,
          D: 80,
          E: 100,
          F: 90,
          G: 70,
          H: 70,
          I: 100,
          J: 80,
          K: 70,
          L: 120,
        },
        cells: {
          A1: { input: 'Channel', format: header },
          B1: { input: 'Impressions', format: { ...header, align: 'right' } },
          C1: { input: 'Clicks', format: { ...header, align: 'right' } },
          D1: { input: 'Spend', format: { ...header, align: 'right' } },
          E1: { input: 'Conversions', format: { ...header, align: 'right' } },
          F1: { input: 'Revenue', format: { ...header, align: 'right' } },
          G1: { input: 'CTR', format: { ...header, align: 'right' } },
          H1: { input: 'CPC', format: { ...header, align: 'right' } },
          I1: { input: 'Conv. rate', format: { ...header, align: 'right' } },
          J1: { input: 'CPA', format: { ...header, align: 'right' } },
          K1: { input: 'ROAS', format: { ...header, align: 'right' } },
          L1: { input: 'Verdict', format: header },
          ...Object.fromEntries(
            channels.flatMap((row, i) =>
              row.map((value, c) => [`${'ABCDEF'[c]}${i + 2}`, value]),
            ),
          ),
          [`A${total}`]: { input: 'Total', format: { bold: true } },
          A10: { input: 'Best channel (ROAS)', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Channels: {
      ...Object.fromEntries(
        channels.flatMap((_, i) => {
          const r = i + 2
          return [
            ...Object.entries(metrics(r)).map(([col, f]) => [`${col}${r}`, f]),
            [`L${r}`, `=IF(K${r}<1, "Losing money", "Profitable")`],
          ]
        }),
      ),
      ...Object.fromEntries(
        'BCDEF'.split('').map((c) => [`${c}${total}`, `=SUM(${c}2:${c}${last})`]),
      ),
      ...Object.fromEntries(
        Object.entries(metrics(total)).map(([col, f]) => [`${col}${total}`, f]),
      ),
      B10: `=INDEX(A2:A${last}, MATCH(MAX(K2:K${last}), K2:K${last}, 0))`,
    },
  },
  scenarios: [
    {
      description: 'Late revenue arrives for social ads',
      changes: { 'Channels!F3': '30000' },
    },
  ],
  checks: [
    {
      id: 'metrics',
      type: 'values',
      title: 'The five metrics per channel',
      cells: [`Channels!G2:K${last}`],
      requireFormula: true,
      points: 40,
      why: 'These metrics decide where next season’s budget goes.',
      hint: 'G =C/B, H =D/C, I =E/C, J =D/E, K =F/D, row by row.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'Campaign totals',
      cells: [`Channels!B${total}:K${total}`],
      requireFormula: true,
      points: 15,
      why: 'The overall result is what the commercial director asks about first.',
      hint: `SUM columns B to F in row ${total}, then use the same metric formulas on the totals.`,
    },
    {
      id: 'verdicts',
      type: 'values',
      title: 'Channels that lose money',
      cells: [`Channels!L2:L${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 15,
      why: 'Money-losing channels are the first thing to fix or stop.',
      hint: 'L2 =IF(K2<1, "Losing money", "Profitable"), filled down.',
    },
    {
      id: 'best',
      type: 'values',
      title: 'Best channel',
      cells: ['Channels!B10'],
      requireFormula: true,
      functions: ['INDEX', 'XLOOKUP'],
      points: 15,
      why: 'Naming the winner automatically means the answer updates when the data does.',
      hint: 'B10 =INDEX(A2:A6, MATCH(MAX(K2:K6), K2:K6, 0)).',
    },
    {
      id: 'rates-format',
      type: 'format',
      title: 'Rates shown as percentages',
      cells: [`Channels!G2:G${last}`, `Channels!I2:I${last}`],
      format: { numberFormat: 'percent' },
      points: 10,
      why: 'Rates are read as percentages in every marketing report.',
      hint: 'Select G2:G6 and I2:I6 and click %.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Results left unchanged',
      cells: [`Channels!A1:F${last}`],
      points: 5,
      why: 'Campaign data comes from the ad platforms and must stay as reported.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 100,
  skills: { 'campaign-analytics': 50, formulas: 25, 'data-analysis': 20 },
  feedback: {
    excellent: `Hi {name},

Exactly right. Email is our best channel by far, and display loses money: that changes next season’s plan. Great start.

Sofia`,
    good: `Hi {name},

Good work; a couple of metrics need fixing. See the notes.

Sofia`,
    pass: `Hi {name},

Some of the metrics are off. Check which number divides which: the notes explain.

Sofia`,
    fail: `Hi {name},

Not yet. Start with CTR (clicks ÷ impressions) and work across.

Sofia`,
  },
}
