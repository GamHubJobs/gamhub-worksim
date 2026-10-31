import type { AssignmentInput } from '../../schemas'

/**
 * Data 1 (Junior Data Analyst): clean a messy CRM export. Teaches: keeping
 * raw data untouched, TRIM, PROPER, LOWER, VALUE and SUBSTITUTE, finding
 * duplicates with COUNTIF, and summarising clean data.
 */
const customers: Array<[string, string, string, string, string]> = [
  // ID, name, email, region, spend: exactly as the export gave them
  [
    'C-1001',
    '  ana pereira',
    'Ana.Pereira@harbourfoods.example ',
    'north',
    '1,250.00 GBP',
  ],
  ['C-1002', 'JAMES OKAFOR', 'james@okaforbuild.example', ' South', '980.50 GBP'],
  ['C-1003', 'li  wei', 'LI.WEI@brightpath.example', 'West ', '2,400.00 GBP'],
  ['C-1004', 'Maria Gonzalez ', 'maria@gonzalezdesign.example', 'NORTH', '640.00 GBP'],
  ['C-1005', 'peter hughes', 'p.hughes@hughesmotors.example', 'south', '3,100.00 GBP'],
  ['C-1006', 'Ana Pereira', ' ana.pereira@harbourfoods.example', 'North', '1,250.00 GBP'],
  ['C-1007', 'fatima begum', 'Fatima@begumtextiles.example', 'West', '1,875.25 GBP'],
  [
    'C-1008',
    '  DAVID  CLARKE',
    'david.clarke@clarkelegal.example',
    ' west',
    '720.00 GBP',
  ],
  ['C-1009', 'sara lind', 'SARA@lindstudio.example', 'South ', '455.75 GBP'],
  ['C-1010', 'Peter Hughes', 'P.Hughes@HughesMotors.example', 'South', '3,100.00 GBP'],
  ['C-1011', 'omar haddad', 'omar@haddadtrading.example', 'north ', '2,050.00 GBP'],
  ['C-1012', 'Chloe Martin', 'chloe.martin@martinbakery.example', 'WEST', '1,330.00 GBP'],
]

const regions = ['North', 'South', 'West']
const header = { bold: true, fill: 'gray' } as const
const last = customers.length + 1 // 13
const col = (c: string) => `Customers!$${c}$2:$${c}$${last}`

export const cleanCustomers: AssignmentInput = {
  id: 'clean-customers',
  version: 1,
  careerId: 'data-analytics',
  levelId: 'junior-data-analyst',
  order: 1,
  title: 'Clean the customer export',
  summary: 'Tidy a messy CRM export, find the duplicates and summarise the clean data.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Your first task: the customer export is a mess',
    body: `Hi {name},

Welcome to Data & Insights! Your first job is the one every analyst starts with: cleaning data.

The workbook is this month’s export of active customers from the CRM. Names and regions are typed in every possible way, emails have stray spaces, the spend has come through as text with “GBP” on the end, and some customers appear twice.

Please clean it **in new columns** (never overwrite the raw export), flag the duplicates, and fill in the summary: how many rows, how many are duplicates, total spend, and customers and spend by region.

Amara`,
  },
  whyItMatters:
    'Every analysis is only as good as its data. Inconsistent spellings split one region into three, text that looks like a number adds up to zero, and duplicates double-count customers. Cleaning carefully, in a way others can check, is the foundation of the job.',
  objectives: [
    'Clean text with TRIM, PROPER and LOWER',
    'Turn text into numbers with SUBSTITUTE and VALUE',
    'Find duplicates with COUNTIF, and summarise clean data',
  ],
  steps: [
    {
      id: 'text',
      title: 'Clean the text',
      instructions: `In the clean columns on **Customers**, for rows 2 to ${last}:
- **G** name: \`=PROPER(TRIM(B2))\`
- **H** email: \`=LOWER(TRIM(C2))\`
- **I** region: \`=PROPER(TRIM(D2))\``,
      hint: 'TRIM removes extra spaces; PROPER capitalises each word; LOWER makes emails consistent.',
    },
    {
      id: 'numbers',
      title: 'Turn spend into numbers',
      instructions: `In **J2**: \`=VALUE(SUBSTITUTE(E2, " GBP", ""))\`, filled down. SUBSTITUTE removes the “ GBP”, and VALUE turns what is left into a number you can add up.`,
    },
    {
      id: 'duplicates',
      title: 'Flag duplicates',
      instructions: `In **K2**: \`=IF(COUNTIF($H$2:$H$${last}, H2)>1, "Duplicate", "Unique")\`, filled down. The same email twice means the same customer twice. Use the **clean** email, or the stray spaces and capitals hide the duplicates.`,
    },
    {
      id: 'summary',
      title: 'Summarise',
      instructions: `On **Summary**:
- **B1** rows: \`=COUNTA(Customers!A2:A${last})\`
- **B2** rows flagged as duplicates: \`=COUNTIF(Customers!K2:K${last}, "Duplicate")\`
- **B3** total spend: \`=SUM(Customers!J2:J${last})\`
- **B6:B8** customers per region: \`=COUNTIF(${col('I')}, A6)\`
- **C6:C8** spend per region: \`=SUMIF(${col('I')}, A6, ${col('J')})\``,
    },
  ],
  workbook: {
    title: 'CRM customer export',
    sheets: [
      {
        name: 'Customers',
        columnWidths: {
          A: 70,
          B: 130,
          C: 250,
          D: 70,
          E: 110,
          F: 20,
          G: 130,
          H: 250,
          I: 80,
          J: 90,
          K: 90,
        },
        cells: {
          A1: { input: 'ID', format: header },
          B1: { input: 'Name (raw)', format: header },
          C1: { input: 'Email (raw)', format: header },
          D1: { input: 'Region (raw)', format: header },
          E1: { input: 'Spend (raw)', format: header },
          G1: { input: 'Name', format: header },
          H1: { input: 'Email', format: header },
          I1: { input: 'Region', format: header },
          J1: { input: 'Spend', format: { ...header, align: 'right' } },
          K1: { input: 'Duplicate?', format: header },
          ...Object.fromEntries(
            customers.flatMap((row, i) =>
              row.map((value, c) => [`${'ABCDE'[c]}${i + 2}`, value]),
            ),
          ),
        },
      },
      {
        name: 'Summary',
        columnWidths: { A: 220, B: 100, C: 100 },
        cells: {
          A1: { input: 'Rows in the export', format: { bold: true } },
          A2: { input: 'Rows flagged as duplicates', format: { bold: true } },
          A3: { input: 'Total spend', format: { bold: true } },
          A5: { input: 'Region', format: header },
          B5: { input: 'Customers', format: { ...header, align: 'right' } },
          C5: { input: 'Spend', format: { ...header, align: 'right' } },
          ...Object.fromEntries(regions.map((region, i) => [`A${i + 6}`, region])),
        },
      },
    ],
  },
  solution: {
    Customers: Object.fromEntries(
      customers.flatMap((_, i) => {
        const r = i + 2
        return [
          [`G${r}`, `=PROPER(TRIM(B${r}))`],
          [`H${r}`, `=LOWER(TRIM(C${r}))`],
          [`I${r}`, `=PROPER(TRIM(D${r}))`],
          [`J${r}`, `=VALUE(SUBSTITUTE(E${r}, " GBP", ""))`],
          [`K${r}`, `=IF(COUNTIF($H$2:$H$${last}, H${r})>1, "Duplicate", "Unique")`],
        ]
      }),
    ),
    Summary: {
      B1: `=COUNTA(Customers!A2:A${last})`,
      B2: `=COUNTIF(Customers!K2:K${last}, "Duplicate")`,
      B3: `=SUM(Customers!J2:J${last})`,
      ...Object.fromEntries(
        regions.flatMap((_, i) => {
          const r = i + 6
          return [
            [`B${r}`, `=COUNTIF(${col('I')}, A${r})`],
            [`C${r}`, `=SUMIF(${col('I')}, A${r}, ${col('J')})`],
          ]
        }),
      ),
    },
  },
  scenarios: [
    {
      description: 'A late correction to one customer’s spend',
      changes: { 'Customers!E4': '2,650.00 GBP' },
    },
    {
      description: 'A customer moves region',
      changes: { 'Customers!D9': 'north' },
    },
  ],
  checks: [
    {
      id: 'clean-text',
      type: 'values',
      title: 'Names, emails and regions cleaned',
      cells: [`Customers!G2:I${last}`],
      requireFormula: true,
      functions: ['TRIM'],
      points: 25,
      why: 'Consistent text is what makes counting, matching and grouping work.',
      hint: 'G2 =PROPER(TRIM(B2)), H2 =LOWER(TRIM(C2)), I2 =PROPER(TRIM(D2)), filled down.',
    },
    {
      id: 'clean-spend',
      type: 'values',
      title: 'Spend turned into numbers',
      cells: [`Customers!J2:J${last}`],
      requireFormula: true,
      functions: ['VALUE', 'SUBSTITUTE'],
      points: 20,
      why: 'Text that looks like a number is ignored by SUM: the total would be zero.',
      hint: 'J2 =VALUE(SUBSTITUTE(E2, " GBP", "")), filled down.',
    },
    {
      id: 'duplicates',
      type: 'values',
      title: 'Duplicates flagged',
      cells: [`Customers!K2:K${last}`],
      requireFormula: true,
      functions: ['COUNTIF', 'COUNTIFS'],
      points: 20,
      why: 'Duplicate customers inflate every count and every total.',
      hint: `K2 =IF(COUNTIF($H$2:$H$${last}, H2)>1, "Duplicate", "Unique"), using the clean email.`,
    },
    {
      id: 'summary',
      type: 'values',
      title: 'Summary of the clean data',
      cells: ['Summary!B1:B3', 'Summary!B6:C8'],
      requireFormula: true,
      points: 25,
      why: 'The summary is what people will actually read, so it must come from the clean columns.',
      hint: 'Count and add up the clean columns I and J, not the raw ones.',
    },
    {
      id: 'raw-unchanged',
      type: 'unchanged',
      title: 'Raw export left untouched',
      cells: [`Customers!A1:E${last}`],
      points: 10,
      why: 'Keeping the raw data lets anyone check exactly what your cleaning did.',
      hint: 'Use Undo or Version history to get the original export back.',
    },
  ],
  passScore: 70,
  xp: 100,
  skills: { 'data-cleaning': 50, formulas: 25, accuracy: 20 },
  feedback: {
    excellent: `Hi {name},

Spotless. Every region lines up, the duplicates are flagged and the raw export is untouched, so anyone can check the work. {senior} was impressed, and that does not happen often.

Amara`,
    good: `Hi {name},

Good cleaning; a few values still need attention. See the notes.

Amara`,
    pass: `Hi {name},

Some of the data is still messy, so the summary is off. The notes show where.

Amara`,
    fail: `Hi {name},

Not yet. Start with the clean columns: TRIM first, then the rest follows.

Amara`,
  },
}
