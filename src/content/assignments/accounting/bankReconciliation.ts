import type { AssignmentInput } from '../../schemas'

/**
 * Accounting 2 (Accounts Trainee): a bank reconciliation. Match the cash book
 * with the bank statement, find what is on one but not the other, and prove
 * that the two balances agree once the differences are explained.
 * Teaches: COUNTIF to match references, IF, SUMIF with conditions, and the
 * logic of a reconciliation.
 */
const cashbook: Array<[string, string, string]> = [
  ['DEP-01', 'Northwind payment', '4800'],
  ['CHQ-311', 'Brightline Office Supply', '-240'],
  ['CHQ-312', 'October rent', '-2500'],
  ['CHQ-313', 'Kestrel IT', '-650'],
  ['DEP-02', 'Harbour Group payment', '3200'],
  ['CHQ-314', 'Staff travel', '-380'],
  ['CHQ-315', 'Atlas Couriers', '-145'],
]

const statement: Array<[string, string, string]> = [
  ['DEP-01', 'NORTHWIND LTD', '4800'],
  ['CHQ-311', 'CHEQUE 311', '-240'],
  ['CHQ-312', 'CHEQUE 312', '-2500'],
  ['CHQ-313', 'CHEQUE 313', '-650'],
  ['CHQ-314', 'CHEQUE 314', '-380'],
  ['FEE-10', 'MONTHLY ACCOUNT FEE', '-35'],
]

const header = { bold: true, fill: 'gray' } as const
const lastCash = cashbook.length + 1 // 8
const lastBank = statement.length + 1 // 7

const rows = (data: Array<[string, string, string]>) =>
  Object.fromEntries(
    data.flatMap(([ref, description, amount], i) => [
      [`A${i + 2}`, ref],
      [`B${i + 2}`, description],
      [`C${i + 2}`, amount],
    ]),
  )

export const bankReconciliation: AssignmentInput = {
  id: 'bank-reconciliation',
  version: 1,
  careerId: 'accounting',
  levelId: 'accounts-trainee',
  order: 2,
  title: 'Reconcile the bank account',
  summary: 'Match the cash book with the bank statement and explain every difference.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'October bank reconciliation',
    body: `Hi {name},

Every month we prove that our records and the bank agree. The **cash book** is what we recorded; the **bank statement** is what the bank recorded. They never match exactly, because of timing: cheques we have written but the supplier hasn’t cashed yet, deposits the bank hasn’t processed, and bank fees we haven’t recorded.

Please:
• mark which cash book lines appear on the statement, and which statement lines appear in the cash book,
• work out both balances and adjust them for the differences,
• show that the adjusted balances agree.

Both accounts started October with **10,000.00**.

Daniel`,
  },
  whyItMatters:
    'A bank reconciliation is one of the most important controls in accounting. It catches errors, missing entries and fraud, and auditors always ask for it. A reconciled bank account is the first sign that a company’s books can be trusted.',
  objectives: [
    'Match two lists by reference with COUNTIF',
    'Identify timing differences: unpresented cheques and outstanding deposits',
    'Adjust both balances and prove they agree',
  ],
  steps: [
    {
      id: 'match',
      title: 'Match the two lists',
      instructions: `On **Cashbook**, in **D2** type:

\`=IF(COUNTIF(Bank!$A$2:$A$${lastBank}, A2)>0, "Yes", "No")\`

and fill down to D${lastCash}. “No” means the bank hasn’t processed it yet.

Do the same on **Bank** (column D) against \`Cashbook!$A$2:$A$${lastCash}\`. “No” there means something the bank did that we haven’t recorded.`,
    },
    {
      id: 'outstanding',
      title: 'Outstanding items',
      instructions: `On **Cashbook**, in **E2**: \`=IF(D2="No", C2, 0)\`, filled down. This shows the amount of each item the bank hasn’t processed yet.`,
    },
    {
      id: 'reconcile',
      title: 'Reconcile',
      instructions: `On **Reconcile** (B1 holds the opening balance):
- **B3** cash book balance: \`=B1+SUM(Cashbook!C2:C${lastCash})\`
- **B4** bank items not in the cash book: \`=SUMIF(Bank!D2:D${lastBank}, "No", Bank!C2:C${lastBank})\`
- **B5** adjusted cash book balance: \`=B3+B4\`
- **B7** bank statement balance: \`=B1+SUM(Bank!C2:C${lastBank})\`
- **B8** outstanding deposits: \`=SUMIF(Cashbook!E2:E${lastCash}, ">0")\`
- **B9** unpresented cheques: \`=SUMIF(Cashbook!E2:E${lastCash}, "<0")\`
- **B10** adjusted bank balance: \`=B7+B8+B9\`
- **B12** difference: \`=B5-B10\` and **B13**: \`=IF(ROUND(B12, 2)=0, "Reconciled", "Investigate")\``,
      hint: 'If the difference is not 0, check that both match columns use the right sheet and that the ranges are locked with $.',
    },
  ],
  workbook: {
    title: 'October bank reconciliation',
    sheets: [
      {
        name: 'Cashbook',
        columnWidths: { A: 80, B: 220, C: 100, D: 120, E: 110 },
        cells: {
          A1: { input: 'Ref', format: header },
          B1: { input: 'Description', format: header },
          C1: { input: 'Amount', format: { ...header, align: 'right' } },
          D1: { input: 'On statement?', format: header },
          E1: { input: 'Outstanding', format: { ...header, align: 'right' } },
          ...rows(cashbook),
        },
      },
      {
        name: 'Bank',
        columnWidths: { A: 80, B: 220, C: 100, D: 130 },
        cells: {
          A1: { input: 'Ref', format: header },
          B1: { input: 'Description', format: header },
          C1: { input: 'Amount', format: { ...header, align: 'right' } },
          D1: { input: 'In cash book?', format: header },
          ...rows(statement),
        },
      },
      {
        name: 'Reconcile',
        columnWidths: { A: 300, B: 120 },
        cells: {
          A1: { input: 'Opening balance (both)', format: { bold: true } },
          B1: '10000',
          A3: 'Cash book balance',
          A4: 'Bank items not in the cash book',
          A5: { input: 'Adjusted cash book balance', format: { bold: true } },
          A7: 'Bank statement balance',
          A8: 'Add: outstanding deposits',
          A9: 'Less: unpresented cheques',
          A10: { input: 'Adjusted bank balance', format: { bold: true } },
          A12: 'Difference',
          A13: 'Status',
        },
      },
    ],
  },
  solution: {
    Cashbook: Object.fromEntries(
      cashbook.flatMap((_, i) => {
        const row = i + 2
        return [
          [`D${row}`, `=IF(COUNTIF(Bank!$A$2:$A$${lastBank}, A${row})>0, "Yes", "No")`],
          [`E${row}`, `=IF(D${row}="No", C${row}, 0)`],
        ]
      }),
    ),
    Bank: Object.fromEntries(
      statement.map((_, i) => [
        `D${i + 2}`,
        `=IF(COUNTIF(Cashbook!$A$2:$A$${lastCash}, A${i + 2})>0, "Yes", "No")`,
      ]),
    ),
    Reconcile: {
      B3: `=B1+SUM(Cashbook!C2:C${lastCash})`,
      B4: `=SUMIF(Bank!D2:D${lastBank}, "No", Bank!C2:C${lastBank})`,
      B5: '=B3+B4',
      B7: `=B1+SUM(Bank!C2:C${lastBank})`,
      B8: `=SUMIF(Cashbook!E2:E${lastCash}, ">0")`,
      B9: `=SUMIF(Cashbook!E2:E${lastCash}, "<0")`,
      B10: '=B7+B8+B9',
      B12: '=B5-B10',
      B13: '=IF(ROUND(B12, 2)=0, "Reconciled", "Investigate")',
    },
  },
  scenarios: [
    {
      description: 'The bank processes the Harbour Group deposit',
      changes: { 'Bank!A7': 'DEP-02', 'Bank!B7': 'HARBOUR GROUP', 'Bank!C7': '3200' },
    },
  ],
  checks: [
    {
      id: 'matching',
      type: 'values',
      title: 'Items matched',
      cells: [`Cashbook!D2:D${lastCash}`, `Bank!D2:D${lastBank}`],
      requireFormula: true,
      functions: ['IF'],
      points: 30,
      why: 'Matching item by item is how the differences are found, rather than guessed.',
      hint: `Cashbook!D2 =IF(COUNTIF(Bank!$A$2:$A$${lastBank}, A2)>0, "Yes", "No"); Bank!D2 the same against Cashbook!$A$2:$A$${lastCash}.`,
    },
    {
      id: 'outstanding',
      type: 'values',
      title: 'Outstanding amounts',
      cells: [`Cashbook!E2:E${lastCash}`],
      requireFormula: true,
      points: 10,
      why: 'These are the timing differences that explain why the balances differ.',
      hint: 'E2 =IF(D2="No", C2, 0), filled down.',
    },
    {
      id: 'cash-side',
      type: 'values',
      title: 'Adjusted cash book balance',
      cells: ['Reconcile!B3:B5'],
      requireFormula: true,
      points: 20,
      why: 'Bank fees we have not recorded yet must be added to our books.',
      hint: 'B3 =B1+SUM(Cashbook!C2:C8), B4 =SUMIF(Bank!D2:D7, "No", Bank!C2:C7), B5 =B3+B4.',
    },
    {
      id: 'bank-side',
      type: 'values',
      title: 'Adjusted bank balance',
      cells: ['Reconcile!B7:B10'],
      requireFormula: true,
      points: 20,
      why: 'Deposits and cheques in transit explain the rest of the difference.',
      hint: 'B7 =B1+SUM(Bank!C2:C7), B8 =SUMIF(Cashbook!E2:E8, ">0"), B9 =SUMIF(Cashbook!E2:E8, "<0"), B10 =B7+B8+B9.',
    },
    {
      id: 'reconciled',
      type: 'values',
      title: 'Difference and status',
      cells: ['Reconcile!B12:B13'],
      requireFormula: true,
      points: 10,
      why: 'A reconciliation is only finished when the difference is zero, or explained.',
      hint: 'B12 =B5-B10, B13 =IF(ROUND(B12, 2)=0, "Reconciled", "Investigate").',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Records left unchanged',
      cells: [`Cashbook!A1:C${lastCash}`, `Bank!A1:C${lastBank}`, 'Reconcile!B1'],
      points: 10,
      why: 'A reconciliation that edits the records to make them match is a cover-up.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 120,
  skills: { reconciliation: 45, formulas: 25, accuracy: 25 },
  feedback: {
    excellent: `Hi {name},

Reconciled to the cent, with every difference explained. I’ll record the bank fee and file this for the auditors. Excellent.

Daniel`,
    good: `Hi {name},

Nearly there. A couple of figures need fixing; see the notes.

Daniel`,
    pass: `Hi {name},

The idea is right, but some of the adjustments are off. Work through the notes one by one.

Daniel`,
    fail: `Hi {name},

This doesn’t reconcile yet. Start with the matching: which items are on one list but not the other?

Daniel`,
  },
}
