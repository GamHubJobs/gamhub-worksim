import type { AssignmentInput } from '../../schemas'

/**
 * Accounting 1 (Accounts Trainee): record a week of transactions with
 * double-entry bookkeeping, then turn the journal into ledger balances.
 * Teaches: debits and credits, the accounting equation, SUMIF with locked
 * ranges, and checking that the books balance.
 */
const transactions: Array<[string, string, string, string, string]> = [
  [
    '02 Oct',
    'Bought office supplies, paid from the bank',
    '240',
    'Office supplies',
    'Bank',
  ],
  [
    '03 Oct',
    'Invoiced Northwind for consulting work',
    '4800',
    'Accounts receivable',
    'Consulting revenue',
  ],
  ['04 Oct', 'Paid October rent', '2500', 'Rent expense', 'Bank'],
  ['06 Oct', 'Northwind paid its invoice', '4800', 'Bank', 'Accounts receivable'],
  [
    '09 Oct',
    'Invoice from Kestrel IT, to pay later',
    '650',
    'IT expense',
    'Accounts payable',
  ],
  ['12 Oct', 'Paid the Kestrel IT invoice', '650', 'Accounts payable', 'Bank'],
  [
    '16 Oct',
    'Invoiced Harbour Group for consulting work',
    '3200',
    'Accounts receivable',
    'Consulting revenue',
  ],
  ['20 Oct', 'Reimbursed staff travel expenses', '380', 'Travel expense', 'Bank'],
]

const accounts: Array<[string, string]> = [
  ['Bank', 'Asset'],
  ['Accounts receivable', 'Asset'],
  ['Accounts payable', 'Liability'],
  ['Consulting revenue', 'Income'],
  ['Rent expense', 'Expense'],
  ['Office supplies', 'Expense'],
  ['IT expense', 'Expense'],
  ['Travel expense', 'Expense'],
]

const header = { bold: true, fill: 'gray' } as const
const lastJournal = transactions.length + 1 // 9
const lastAccount = accounts.length + 1 // 9

export const journalEntries: AssignmentInput = {
  id: 'journal-entries',
  version: 1,
  careerId: 'accounting',
  levelId: 'accounts-trainee',
  order: 1,
  title: 'Record the week’s transactions',
  summary:
    'Record eight transactions with debits and credits, then work out the ledger balances.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Your first task: the October journal',
    body: `Hi {name},

Welcome to Accounting! Let’s start with the foundation of everything we do: **double-entry bookkeeping**.

The workbook lists eight transactions from the first weeks of October. For each one, please choose the account to **debit** and the account to **credit** (the dropdowns list our accounts). Then, on the **Ledger** sheet, work out each account’s total debits, total credits and balance.

If you’ve done it right, total debits will equal total credits. That is the whole point of double entry: the books always balance.

Ask if anything is unclear.

Daniel`,
  },
  whyItMatters:
    'Every financial report, tax return and audit starts with correctly recorded transactions. Double-entry bookkeeping records each one twice, as a debit and an equal credit, which is why the books can be checked: if debits and credits do not match, something is wrong.',
  objectives: [
    'Decide which account to debit and which to credit',
    'Understand that assets and expenses increase with debits, income and liabilities with credits',
    'Turn a journal into ledger balances with SUMIF',
    'Check that the books balance',
  ],
  steps: [
    {
      id: 'rules',
      title: 'The two rules',
      instructions: `Every transaction changes at least two accounts, by the same amount.

- **Debit** (left): an asset goes up (more money in the bank, a customer owes us) or an expense goes up.
- **Credit** (right): income goes up, a liability goes up (we owe a supplier), or an asset goes down (money leaves the bank).

Example: *paid rent from the bank* → debit **Rent expense** (an expense goes up), credit **Bank** (the bank balance goes down).`,
    },
    {
      id: 'journal',
      title: 'Choose the accounts',
      instructions: `On the **Journal** sheet, fill in **Debit account** (D) and **Credit account** (E) for rows 2 to ${lastJournal}. Click a cell and use the ▾ button to pick from the list.`,
      hint: 'When a customer pays an invoice, money comes into the bank (debit Bank) and they no longer owe us (credit Accounts receivable).',
    },
    {
      id: 'ledger',
      title: 'Work out the ledger',
      instructions: `On the **Ledger** sheet, for each account in column A:

- **B** Debits: \`=SUMIF(Journal!$D$2:$D$${lastJournal}, A2, Journal!$C$2:$C$${lastJournal})\`
- **C** Credits: \`=SUMIF(Journal!$E$2:$E$${lastJournal}, A2, Journal!$C$2:$C$${lastJournal})\`
- **D** Balance: \`=B2-C2\`

Fill them down to row ${lastAccount}.`,
    },
    {
      id: 'balance',
      title: 'Check that it balances',
      instructions: `In row 11, add up the columns: \`=SUM(B2:B${lastAccount})\` in B11, the same for C11 and D11. Total debits (B11) must equal total credits (C11), so the total balance (D11) is 0.`,
      hint: 'If D11 is not 0, look for a row where the debit and credit accounts are the same, or empty.',
    },
  ],
  workbook: {
    title: 'October journal',
    sheets: [
      {
        name: 'Journal',
        columnWidths: { A: 70, B: 300, C: 90, D: 170, E: 170 },
        cells: {
          A1: { input: 'Date', format: header },
          B1: { input: 'Description', format: header },
          C1: { input: 'Amount', format: { ...header, align: 'right' } },
          D1: { input: 'Debit account', format: header },
          E1: { input: 'Credit account', format: header },
          ...Object.fromEntries(
            transactions.flatMap(([date, description, amount], i) => [
              [`A${i + 2}`, date],
              [`B${i + 2}`, description],
              [`C${i + 2}`, amount],
            ]),
          ),
        },
        validations: [
          { range: `D2:E${lastJournal}`, items: accounts.map(([name]) => name) },
        ],
      },
      {
        name: 'Ledger',
        columnWidths: { A: 170, B: 100, C: 100, D: 100 },
        cells: {
          A1: { input: 'Account', format: header },
          B1: { input: 'Debits', format: { ...header, align: 'right' } },
          C1: { input: 'Credits', format: { ...header, align: 'right' } },
          D1: { input: 'Balance', format: { ...header, align: 'right' } },
          ...Object.fromEntries(accounts.map(([name], i) => [`A${i + 2}`, name])),
          A11: { input: 'Total', format: { bold: true } },
        },
      },
      {
        name: 'Accounts',
        columnWidths: { A: 170, B: 100 },
        cells: {
          A1: { input: 'Account', format: header },
          B1: { input: 'Type', format: header },
          ...Object.fromEntries(
            accounts.flatMap(([name, type], i) => [
              [`A${i + 2}`, name],
              [`B${i + 2}`, type],
            ]),
          ),
        },
      },
    ],
  },
  solution: {
    Journal: Object.fromEntries(
      transactions.flatMap(([, , , debit, credit], i) => [
        [`D${i + 2}`, debit],
        [`E${i + 2}`, credit],
      ]),
    ),
    Ledger: {
      ...Object.fromEntries(
        accounts.flatMap((_, i) => {
          const row = i + 2
          return [
            [
              `B${row}`,
              `=SUMIF(Journal!$D$2:$D$${lastJournal}, A${row}, Journal!$C$2:$C$${lastJournal})`,
            ],
            [
              `C${row}`,
              `=SUMIF(Journal!$E$2:$E$${lastJournal}, A${row}, Journal!$C$2:$C$${lastJournal})`,
            ],
            [`D${row}`, `=B${row}-C${row}`],
          ]
        }),
      ),
      B11: `=SUM(B2:B${lastAccount})`,
      C11: `=SUM(C2:C${lastAccount})`,
      D11: `=SUM(D2:D${lastAccount})`,
    },
  },
  scenarios: [
    { description: 'The rent was 2,600, not 2,500', changes: { 'Journal!C4': '2600' } },
  ],
  checks: [
    {
      id: 'accounts',
      type: 'values',
      title: 'Debit and credit accounts',
      cells: [`Journal!D2:E${lastJournal}`],
      points: 40,
      why: 'Choosing the right accounts is the heart of bookkeeping. One wrong account and every report built on it is wrong.',
      hint: 'Ask two questions for each transaction: what came in (debit) and where did it come from (credit)?',
    },
    {
      id: 'ledger',
      type: 'values',
      title: 'Ledger debits and credits',
      cells: [`Ledger!B2:C${lastAccount}`],
      requireFormula: true,
      functions: ['SUMIF', 'SUMIFS'],
      points: 30,
      why: 'The ledger shows how much has gone through each account, the basis of the trial balance and the accounts.',
      hint: `In B2 type =SUMIF(Journal!$D$2:$D$${lastJournal}, A2, Journal!$C$2:$C$${lastJournal}); do the same with column E in C2. Fill down.`,
    },
    {
      id: 'balances',
      type: 'values',
      title: 'Account balances',
      cells: [`Ledger!D2:D${lastAccount}`],
      requireFormula: true,
      points: 10,
      why: 'The balance is what the account is worth (or owes) right now.',
      hint: 'D2 =B2-C2, filled down.',
    },
    {
      id: 'totals',
      type: 'values',
      title: 'The books balance',
      cells: ['Ledger!B11:D11'],
      requireFormula: true,
      points: 10,
      why: 'Equal total debits and credits are the first proof that the books are right.',
      hint: 'B11 =SUM(B2:B9), C11 =SUM(C2:C9), D11 =SUM(D2:D9). D11 should be 0.',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Transactions left unchanged',
      cells: [`Journal!A1:C${lastJournal}`],
      points: 10,
      why: 'The transactions come from source documents; a bookkeeper never changes them.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  passScore: 70,
  xp: 100,
  skills: { bookkeeping: 45, formulas: 20, accuracy: 25 },
  feedback: {
    excellent: `Hi {name},

Perfect: every entry is right and the books balance to the cent. That is exactly the habit I want you to keep.

Daniel`,
    good: `Hi {name},

Good work. A couple of entries need another look; the notes explain which.

Daniel`,
    pass: `Hi {name},

The books don’t quite tell the right story yet. Check the entries the feedback mentions: for each, ask what came in and where it came from.

Daniel`,
    fail: `Hi {name},

Not yet. Read the two rules in the first step again, then try the entries the feedback mentions. It clicks with practice.

Daniel`,
  },
}
