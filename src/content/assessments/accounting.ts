/** Readiness assessments: accounting. */
import type { CaseInput } from '../cases/schema'
import { gbp, forms, assessment, report } from './shared'

/** Level 2: a bank reconciliation with a keying error. */
function accReconciliation(p: {
  version: string
  practical: string
  bank: number
  cheque: number
  deposit: number
  charges: number
  paid: number
  keyed: number
  supplier: string
}) {
  const adjustedBank = p.bank - p.cheque + p.deposit
  const error = p.paid - p.keyed
  const ledger = adjustedBank + p.charges + error
  return assessment({
    practical: p.practical,
    id: 'ready-acc-practitioner',
    careerId: 'accounting',
    level: 2,
    title: 'Readiness assessment: reconcile the bank',
    summary: 'Reconcile the cash book to the bank statement, find the errors and report.',
    brief: `This assessment checks that you can reconcile accounts and explain discrepancies.

Reconcile the cash book to the bank statement, work out the correct cash book balance, decide how to correct it, write the reconciliation report in Docs, and explain your findings to {manager}. You have 3 hours.`,
    whyItMatters:
      'Reconciliations are how accountants prove the books are right. At the next level you will sign them off yourself.',
    objectives: [
      'Separate timing differences from errors',
      'Correct the cash book',
      'Explain the findings',
    ],
    evidence: [
      {
        id: 'balances',
        title: 'Balances at 31 March',
        table: {
          head: ['Source', 'Balance'],
          rows: [
            ['Bank statement', gbp(p.bank)],
            ['Cash book', gbp(ledger)],
          ],
        },
      },
      {
        id: 'items',
        title: 'Items found when ticking the statement to the cash book',
        text: `Cheque 100482 for ${gbp(p.cheque)} is in the cash book but not yet on the statement. A deposit of ${gbp(p.deposit)} paid in on 31 March is in the cash book but not yet on the statement. Bank charges of ${gbp(p.charges)} are on the statement but not in the cash book. The payment to ${p.supplier} shows as ${gbp(p.paid)} on the statement and the remittance, but ${gbp(p.keyed)} in the cash book.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Timing differences and errors',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'cheque',
            text: 'The unpresented cheque is a timing difference, not an error.',
            issue: true,
            why: 'It will clear the bank in a few days; it belongs on the reconciliation, not in a correction.',
          },
          {
            id: 'charges',
            text: 'The bank charges must be entered in the cash book.',
            issue: true,
            why: 'They are a real cost the cash book does not yet show.',
          },
          {
            id: 'keying',
            text: `The ${p.supplier} payment was keyed wrongly in the cash book.`,
            issue: true,
            why: `The statement and remittance agree on ${gbp(p.paid)}; the cash book's ${gbp(p.keyed)} is a keying error of ${gbp(error)}.`,
          },
          {
            id: 'deposit',
            text: 'The deposit not on the statement shows the bank has made a mistake.',
            issue: false,
            why: 'A deposit paid in on the last day often appears the next working day: a timing difference.',
          },
        ],
      },
      {
        id: 'corrected',
        kind: 'figure',
        title: 'The corrected cash book balance',
        prompt: 'What is the cash book balance after correcting the errors?',
        points: 15,
        answer: adjustedBank,
        tolerance: 0.5,
        unit: '£',
        why: `${gbp(ledger)} − ${gbp(p.charges)} charges − ${gbp(error)} keying error = ${gbp(adjustedBank)}, which agrees with the bank: ${gbp(p.bank)} − ${gbp(p.cheque)} + ${gbp(p.deposit)}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The correction',
        prompt: 'How do you correct the records?',
        points: 15,
        options: [
          {
            id: 'correct',
            label:
              'Post the bank charges and correct the keying error in the cash book; keep the timing differences on the reconciliation',
            verdict: 'best',
            why: 'Errors are corrected where they happened, and timing differences clear on their own.',
          },
          {
            id: 'suspense',
            label:
              'Put the whole difference into a suspense account to look at next month',
            verdict: 'poor',
            why: 'The causes are known; parking them hides errors and lets them build up.',
          },
          {
            id: 'charges-only',
            label:
              'Post the bank charges now and ask a colleague to look at the rest later',
            verdict: 'acceptable',
            why: 'A start, but the keying error has been found and should be fixed now.',
          },
        ],
      },
      report(
        'Bank reconciliation, 31 March',
        [['Reconciliation'], ['Adjustments', 'Corrections', 'Errors']],
        [
          { label: 'the corrected balance', value: adjustedBank },
          { label: 'the keying error', value: error },
        ],
        [['keying', 'keyed', 'entered'], ['timing']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: '{manager}',
        title: 'Explain the findings',
        prompt:
          'Write to {manager}: the corrected balance, the errors, and the timing differences.',
        points: 20,
        minWords: 40,
        model: `Hi {manager}, the March bank reconciliation is done. After posting ${gbp(p.charges)} of bank charges and correcting a keying error of ${gbp(error)} on the ${p.supplier} payment, the cash book balance is ${gbp(adjustedBank)}. The remaining differences are timing: an unpresented cheque and a late deposit. The reconciliation is attached. Thanks, {name}`,
        mentions: [forms(adjustedBank), ['keying', 'keyed'], ['timing', 'unpresented']],
        avoid: [
          { terms: ['plug', 'fudge'], why: 'Never force a reconciliation to balance.' },
        ],
      },
    ],
    skills: { reconciliation: 30, bookkeeping: 25 },
  })
}

/** Level 3: management accounts with a one-off cost. */
function accVariance(p: {
  version: string
  practical: string
  revenue: number
  cos: number
  overheads: number
  oneOff: number
}) {
  const budget = { revenue: 240000, cos: 96000, overheads: 80000 }
  const budgetProfit = budget.revenue - budget.cos - budget.overheads
  const profit = p.revenue - p.cos - p.overheads
  const gap = budgetProfit - profit
  const revenueGap = budget.revenue - p.revenue
  return assessment({
    practical: p.practical,
    id: 'ready-acc-senior',
    careerId: 'accounting',
    level: 3,
    title: 'Readiness assessment: explain the month’s results',
    summary: 'Prepare the management accounts commentary for a month below budget.',
    brief: `This assessment checks that you can prepare financial reports and explain them.

Analyse the month against budget, work out the profit shortfall, decide how to present the one-off cost, write the management accounts commentary in Docs, and brief the Finance Director. You have 3 hours.`,
    whyItMatters:
      'Senior accountants explain what the numbers mean. Separating one-offs from the underlying trend is what lets directors make the right decisions.',
    objectives: [
      'Analyse variances',
      'Separate one-off items',
      'Explain results to a director',
    ],
    evidence: [
      {
        id: 'results',
        title: 'Results for May',
        table: {
          head: ['Line', 'Budget', 'Actual'],
          rows: [
            ['Revenue', gbp(budget.revenue), gbp(p.revenue)],
            ['Cost of sales', gbp(budget.cos), gbp(p.cos)],
            ['Overheads', gbp(budget.overheads), gbp(p.overheads)],
            ['Profit', gbp(budgetProfit), gbp(profit)],
          ],
        },
      },
      {
        id: 'notes',
        title: 'Notes from the ledger',
        text: `Overheads include a one-off legal fee of ${gbp(p.oneOff)} for a contract dispute, now settled.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Analyse the variances',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'revenue',
            text: `Revenue is ${gbp(revenueGap)} below budget.`,
            issue: true,
            why: `${gbp(budget.revenue)} − ${gbp(p.revenue)} = ${gbp(revenueGap)}.`,
          },
          {
            id: 'one-off',
            text: 'Without the legal fee, overheads would be within budget.',
            issue: true,
            why: `${gbp(p.overheads)} − ${gbp(p.oneOff)} = ${gbp(p.overheads - p.oneOff)}, within the ${gbp(budget.overheads)} budget.`,
          },
          {
            id: 'volume',
            text: 'Cost of sales went up because more was sold.',
            issue: false,
            why: 'Revenue fell while cost of sales rose, so the margin fell: that needs investigating.',
          },
          {
            id: 'loss',
            text: 'The company made a loss this month.',
            issue: false,
            why: `Profit was ${gbp(profit)}: lower than budget, but a profit.`,
          },
        ],
      },
      {
        id: 'gap',
        kind: 'figure',
        title: 'The profit shortfall',
        prompt: 'By how much is profit below budget?',
        points: 15,
        answer: gap,
        tolerance: 0.5,
        unit: '£',
        why: `Budgeted profit ${gbp(budgetProfit)} − actual ${gbp(profit)} = ${gbp(gap)}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Presenting the one-off',
        prompt: 'How do you present the legal fee?',
        points: 15,
        options: [
          {
            id: 'separate',
            label:
              'Show the full result, with the one-off legal fee shown separately and the falling margin flagged',
            verdict: 'best',
            why: 'Directors see both the true result and the underlying trend, and what needs looking into.',
          },
          {
            id: 'leave-out',
            label: 'Leave the legal fee out of the overheads so the month looks normal',
            verdict: 'poor',
            why: 'The accounts would be wrong. One-offs are explained, never removed.',
          },
          {
            id: 'total-only',
            label: 'Report the total figures without comment',
            verdict: 'acceptable',
            why: 'Accurate, but it leaves directors to work out what matters.',
          },
        ],
      },
      report(
        'Management accounts commentary: May',
        [
          ['Summary'],
          ['Variances', 'Variance analysis'],
          ['Recommendations', 'Next steps'],
        ],
        [
          { label: 'the profit shortfall', value: gap },
          { label: 'the one-off legal fee', value: p.oneOff },
        ],
        [['one-off', 'one off'], ['margin']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the Finance Director',
        title: 'Brief the Finance Director',
        prompt:
          'Write to the Finance Director: the shortfall, the main causes, and what you recommend.',
        points: 20,
        minWords: 40,
        model: `Hi, May’s profit is ${gbp(gap)} below budget. Revenue is ${gbp(revenueGap)} short, overheads include a one-off legal fee of ${gbp(p.oneOff)}, and the gross margin has fallen, which I recommend we investigate with the sales team. The commentary is attached. Thanks, {name}`,
        mentions: [forms(gap), ['one-off', 'one off', 'legal'], ['margin']],
        avoid: [
          { terms: ['nothing to worry about'], why: 'Do not play down a shortfall.' },
        ],
      },
    ],
    skills: { 'financial-reporting': 30, bookkeeping: 15, reconciliation: 10 },
  })
}

export const ASSESSMENTS_ACCOUNTING: Record<string, CaseInput[]> = {
  'ready-acc-practitioner': [
    accReconciliation({
      version: 'a',
      practical: 'books-bank-rec',
      bank: 18420,
      cheque: 1200,
      deposit: 950,
      charges: 35,
      paid: 1450,
      keyed: 1180,
      supplier: 'Ferris Components',
    }),
    accReconciliation({
      version: 'b',
      practical: 'books-sales-purchases',
      bank: 22310,
      cheque: 2400,
      deposit: 1150,
      charges: 42,
      paid: 2730,
      keyed: 2370,
      supplier: 'Lumen Packaging',
    }),
  ],
  'ready-acc-senior': [
    accVariance({
      version: 'a',
      practical: 'books-payroll',
      revenue: 228000,
      cos: 98000,
      overheads: 86000,
      oneOff: 9000,
    }),
    accVariance({
      version: 'b',
      practical: 'month-end-close',
      revenue: 226000,
      cos: 97000,
      overheads: 89000,
      oneOff: 11000,
    }),
  ],
}
