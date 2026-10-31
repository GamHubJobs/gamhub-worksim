import type { AssignmentInput } from '../../schemas'
import { createPayRun, postPayRun, saveEmployee } from '../../../tools/books/payroll'
import { marchBooks } from '../../../tools/books/scenario'
import type { BooksState } from '../../../tools/books/schema'

/**
 * Accounting (Accountant): run the monthly payroll in Books. Process a new
 * starter and a pay rise, check the payslips, and post the pay run. Teaches:
 * gross to net, deductions, payroll liabilities, and checking before paying.
 */
const start = marchBooks()

function solution(): BooksState {
  let state = saveEmployee(start, {
    name: 'Ines Duarte',
    role: 'Junior Consultant',
    annualSalary: 28000,
    pensionRate: 0.05,
  }).state
  const maya = state.employees.find((e) => e.name === 'Maya Patel')!
  state = saveEmployee(state, { ...maya, annualSalary: 39000 }).state
  const run = createPayRun(state, '2026-03', '2026-03-27')
  return postPayRun(run.state, run.id).state
}

export const booksPayroll: AssignmentInput = {
  id: 'books-payroll',
  version: 1,
  careerId: 'accounting',
  levelId: 'accountant',
  order: 7,
  kind: 'tool',
  title: 'Run March’s payroll',
  summary: 'Process a new starter and a pay rise, then run and post the monthly payroll.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Payroll for March: changes from HR',
    body: `Hi {name},

Congratulations on your promotion. Payroll is yours from this month, and it is one job where every mistake lands in someone’s bank account.

HR has sent two changes for March:
• **New starter**: Ines Duarte, Junior Consultant, salary **£28,000** a year, pension contribution **5%**, started on 1 March.
• **Pay rise**: Maya Patel’s salary goes up to **£39,000** a year from March.

Please update the employees in **Payroll**, create the pay run for **March 2026** with a pay date of **27 March**, check every payslip, and post it.

Daniel`,
  },
  whyItMatters:
    'Payroll has to be right first time, every time: people pay their rent from it, and the tax office expects its share on time. The accounts also need it: wages are usually a company’s biggest cost, and the tax and pension deducted are money the company owes until it pays them over.',
  objectives: [
    'Keep employee records up to date',
    'Run a payroll from gross to net',
    'Understand the journal behind a pay run',
  ],
  steps: [
    {
      id: 'employees',
      title: 'Update the employees',
      instructions:
        'Open **Payroll**. Click **Add employee** for Ines Duarte, and **Edit** for Maya Patel’s new salary. Enter the pension as a percentage (5 for 5%).',
    },
    {
      id: 'run',
      title: 'Create the pay run',
      instructions:
        'Choose the month **2026-03** and the pay date **27 March**, then click **Create pay run**. Books works out each payslip: gross pay is the salary ÷ 12; tax and NI are taken from what is above the tax-free amounts; pension is a percentage of gross.',
      hint: 'If you change an employee after creating the run, click Recalculate.',
    },
    {
      id: 'check',
      title: 'Check the payslips',
      instructions:
        'Check Maya’s gross pay (£39,000 ÷ 12 = £3,250) and that Ines is there. Ruth works part-time: her pay is below the thresholds, so she pays no tax or NI.',
    },
    {
      id: 'post',
      title: 'Post it',
      instructions:
        'Click **Post pay run**. Then open **Chart of accounts** and look at 7000 Wages, 2210 PAYE and NI payable and 2220 Pension payable: that is the journal it posted.',
    },
    {
      id: 'submit',
      title: 'Hand it in',
      instructions: 'Click **Submit to {manager}** in the task pane.',
    },
  ],
  tool: {
    id: 'books',
    title: 'Cobalt Ridge payroll: March',
    start,
    solution: solution(),
    checks: [
      {
        id: 'employees',
        type: 'employees',
        items: [
          { name: 'Ines Duarte', annualSalary: 28000, pensionRate: 0.05 },
          { name: 'Maya Patel', annualSalary: 39000 },
        ],
        title: 'New starter and pay rise',
        points: 25,
        why: 'Payroll is only as right as the employee records behind it.',
        hint: 'Add Ines Duarte at £28,000 with 5% pension; change Maya Patel to £39,000.',
      },
      {
        id: 'payrun',
        type: 'payrun',
        period: '2026-03',
        title: 'March pay run posted with the right totals',
        points: 45,
        why: 'Every payslip, and the totals paid to staff, the tax office and the pension provider, must be right.',
        hint: 'Create the run for 2026-03 after updating the employees (or click Recalculate), then post it.',
      },
      {
        id: 'balances',
        type: 'balances',
        accounts: ['1200', '2210', '2220', '7000'],
        title: 'Wages, liabilities and bank',
        points: 30,
        why: 'These are the figures the accounts will show for March’s payroll.',
        hint: 'Post the pay run once, on 27 March.',
      },
    ],
  },
  passScore: 70,
  xp: 160,
  skills: { 'finance-basics': 35, accuracy: 35, bookkeeping: 25 },
  feedback: {
    excellent: `Hi {name},

Payroll perfect first time: Ines is set up, Maya’s rise is in, and every payslip checks out. Six people paid correctly, and the liabilities are ready to pay over in April.

Daniel`,
    good: `Hi {name},

Nearly right, but nearly isn’t good enough for payroll. See the notes before anyone is paid.

Daniel`,
    pass: `Hi {name},

Some payslips are wrong. The notes show what to fix.

Daniel`,
    fail: `Hi {name},

Not yet. Update the employees first, then create the pay run.

Daniel`,
  },
}
