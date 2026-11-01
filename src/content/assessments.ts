/**
 * Career readiness assessments: a practical piece of work showing whether the
 * player can handle the responsibilities of their current level. Each combines
 * an investigation, a calculation, a decision, a report written in Docs and a
 * message, within a time limit, and is graded like a case.
 *
 * Every assessment comes in two versions with different figures and details,
 * built from parameters so that every figure, explanation and check agrees.
 * A retake uses the other version, so the feedback from a first attempt cannot
 * simply be copied.
 *
 * These are simulated workplace assessments, not qualifications.
 */
import { CaseSchema, type Case, type CaseInput } from './cases/schema'
import { departmentFor, fill } from './departments'

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
/** A figure as a reply or report might write it: "18,170", "18170". */
const forms = (n: number) => [n.toLocaleString('en-GB'), String(n)]

interface Base {
  id: string
  careerId: string
  /** The level the assessment is taken at; passing it is needed for the next promotion. */
  level: number
  title: string
  summary: string
  brief: string
  whyItMatters: string
  objectives: string[]
  evidence: CaseInput['evidence']
  steps: CaseInput['steps']
  skills: Record<string, number>
}

function assessment(base: Base): CaseInput {
  return {
    id: base.id,
    version: 1,
    careerId: base.careerId,
    kind: 'assessment',
    difficulty: base.level >= 3 ? 'advanced' : 'intermediate',
    minLevel: base.level,
    title: base.title,
    summary: base.summary,
    from: {
      name: 'the readiness panel',
      role: 'Career readiness assessment',
      organisation: 'Cobalt Ridge',
    },
    trigger: {},
    deadlineHours: 3,
    email: { subject: base.title, body: base.brief },
    whyItMatters: base.whyItMatters,
    objectives: base.objectives,
    evidence: base.evidence,
    steps: base.steps,
    // High enough that the report cannot be skipped: everything else is 75 marks.
    passScore: 80,
    outcomes: {},
    replies: {
      excellent:
        'An excellent piece of work: you are ready for the next level’s responsibilities.',
      good: 'A good piece of work: you have shown you are ready for the next level.',
      pass: 'You have shown you are ready, with some points to strengthen.',
      fail: 'Not yet: look at the feedback, practise the areas shown, and take the assessment again.',
    },
    lapseLog: 'The readiness assessment ran out of time before it was submitted.',
    skills: base.skills,
    xp: 150,
  }
}

/** Shared report checks: sections, figures, key terms and a sensible length. */
function report(
  title: string,
  sections: string[][],
  figures: Array<{ label: string; value: number; percent?: boolean }>,
  terms: string[][],
): Extract<CaseInput['steps'][number], { kind: 'document' }> {
  return {
    id: 'report',
    kind: 'document',
    title: 'Write the report',
    prompt: `Write a short report in Docs: ${sections.map((s) => `“${s[0]}”`).join(', ')}, with the key figures and what you recommend.`,
    points: 25,
    deliverable: {
      kind: 'doc',
      title,
      template: 'memo',
      checks: [
        {
          id: 'sections',
          type: 'sections',
          title: 'Clear sections',
          sections,
          points: 7,
          why: 'Readers find what they need when the report is organised.',
          hint: `Use headings: ${sections.map((s) => s[0]).join(', ')}.`,
        },
        {
          id: 'figures',
          type: 'figures',
          title: 'The key figures, correct',
          figures: figures.map((f) => ({ ...f, percent: f.percent ?? false })),
          points: 10,
          why: 'A report is only as good as its numbers.',
          hint: `State ${figures.map((f) => f.label).join(' and ')}.`,
        },
        {
          id: 'terms',
          type: 'mentions',
          title: 'The cause and the recommendation',
          terms,
          points: 5,
          why: 'Explain what happened and what should happen next.',
          hint: 'Name the cause and say what you recommend.',
        },
        {
          id: 'length',
          type: 'length',
          min: 80,
          max: 500,
          title: 'Concise',
          points: 3,
          why: 'A busy reader wants one page.',
          hint: '80 to 500 words.',
        },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Finance & Admin
// ---------------------------------------------------------------------------

/** Level 2: expense claims against policy. */
function faClaims(p: {
  version: string
  meal: number
  miles: number
  train: number
  names: string[]
}) {
  const mileage = Math.round(p.miles * 0.45 * 100) / 100
  const claimedMileage = p.miles * 0.5
  const total = p.train + 25 + mileage + 8
  const [a, b, c, d] = p.names
  return assessment({
    id: 'ready-fa-practitioner',
    careerId: 'office-admin-finance',
    level: 2,
    title: 'Readiness assessment: process the expense claims',
    summary:
      'Review this week’s expense claims against policy, pay what is due and report.',
    brief: `This assessment checks that you can process expenses accurately and independently.

Review the five claims against the expenses policy, work out what to pay, decide what to do about the problems, write a short expenses report in Docs, and tell {manager} what you have done. You have 3 hours.`,
    whyItMatters:
      'At the next level you will process money on your own. Accuracy, applying policy fairly and explaining exceptions clearly are what make that possible.',
    objectives: [
      'Apply an expenses policy to real claims',
      'Calculate what is due',
      'Report exceptions clearly',
    ],
    evidence: [
      {
        id: 'policy',
        title: 'Expenses policy (extract)',
        text: 'Receipts are needed for any claim over £10. Meals are paid up to **£25** per person per day. Mileage is paid at **45p a mile**.',
      },
      {
        id: 'claims',
        title: 'Claims this week',
        table: {
          head: ['Claimant', 'Item', 'Amount', 'Receipt'],
          rows: [
            [a, 'Train to client', gbp(p.train), 'Yes'],
            [b, 'Client dinner (1 person)', gbp(p.meal), 'Yes'],
            [c, 'Taxi', '£14', 'No'],
            [d, `Mileage, ${p.miles} miles at 50p`, gbp(claimedMileage), 'Mileage log'],
            [a, 'Stationery', '£8', 'No'],
          ],
        },
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Check the claims',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'meal',
            text: `${b}’s meal is over the £25 limit.`,
            issue: true,
            why: `${gbp(p.meal)} is above the £25 limit, so £25 is paid.`,
          },
          {
            id: 'stationery',
            text: 'The £8 stationery claim needs a receipt.',
            issue: false,
            why: 'Receipts are needed only over £10.',
          },
          {
            id: 'mileage',
            text: `${d}’s mileage uses the wrong rate.`,
            issue: true,
            why: `Mileage is 45p a mile, so ${p.miles} miles is ${gbp(mileage)}, not ${gbp(claimedMileage)}.`,
          },
          {
            id: 'taxi',
            text: `${c}’s taxi can be paid without a receipt.`,
            issue: false,
            why: 'It is over £10, so it needs a receipt before it can be paid.',
          },
        ],
      },
      {
        id: 'total',
        kind: 'figure',
        title: 'What to pay',
        prompt: 'How much should be paid this week in total, applying the policy?',
        points: 15,
        answer: total,
        tolerance: 0.01,
        unit: '£',
        why: `Train ${gbp(p.train)} + meal £25 + mileage ${gbp(mileage)} + stationery £8 = ${gbp(total)}. The taxi waits for its receipt.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The exceptions',
        prompt: 'How do you handle the claims that break the policy?',
        points: 15,
        options: [
          {
            id: 'apply',
            label:
              'Pay what the policy allows, return the taxi claim for a receipt, and tell each claimant why',
            verdict: 'best',
            why: 'Fair, accurate and transparent: people are paid what is due and know what to do.',
          },
          {
            id: 'pay-all',
            label: 'Pay everything as claimed: the differences are small',
            verdict: 'poor',
            why: 'Small differences add up, and ignoring policy for some is unfair to others.',
          },
          {
            id: 'reject',
            label: 'Reject every claim with a problem until it is resubmitted',
            verdict: 'acceptable',
            why: 'Safe, but it delays money that is properly due and creates extra work.',
          },
        ],
      },
      report(
        'Expenses report',
        [['Summary'], ['Exceptions', 'Adjustments', 'Problems']],
        [{ label: 'the total paid', value: total }],
        [['receipt'], ['mileage', '45p']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: '{manager}',
        title: 'Tell your manager',
        prompt:
          'Write to {manager}: what you paid, the exceptions, and what happens next.',
        points: 20,
        minWords: 40,
        model: `Hi {manager}, I have processed this week’s claims: ${gbp(total)} is being paid. ${b}’s meal is paid at the £25 limit, ${d}’s mileage is corrected to 45p a mile, and ${c}’s taxi is on hold until a receipt arrives. I have told each of them why. The report is attached. Thanks, {name}`,
        mentions: [forms(total), ['receipt'], ['45p', 'mileage']],
        avoid: [
          {
            terms: ['cheating', 'fiddling'],
            why: 'Mistakes in claims are usually honest; describe them neutrally.',
          },
        ],
      },
    ],
    skills: { 'finance-basics': 30, accuracy: 25 },
  })
}

/** Level 3: department budget monitoring with a forecast. */
function faBudget(p: {
  version: string
  travel: number
  events: number
  booked: number
}) {
  const budget = { travel: 6000, supplies: 3000, training: 4000, events: 2000 }
  const spent = { travel: p.travel, supplies: 2100, training: 1500, events: p.events }
  const totalBudget = 15000
  const totalSpent = spent.travel + spent.supplies + spent.training + spent.events
  const forecast = totalSpent + p.booked
  const over = forecast - totalBudget
  const travelOver = spent.travel - budget.travel
  return assessment({
    id: 'ready-fa-senior',
    careerId: 'office-admin-finance',
    level: 3,
    title: 'Readiness assessment: the quarterly budget report',
    summary:
      'Report the department’s spending against budget, with a forecast and recommendations.',
    brief: `This assessment checks that you can monitor a budget and advise on it.

Analyse the department’s spending, forecast the quarter end including commitments, decide what to recommend, write the budget report in Docs, and brief the department head. You have 3 hours.`,
    whyItMatters:
      'Officers are trusted to spot problems in the numbers early and to recommend action, not just to report what has happened.',
    objectives: [
      'Compare spending with budget',
      'Forecast including commitments',
      'Recommend action',
    ],
    evidence: [
      {
        id: 'budget',
        title: 'Quarter to date (two months of three)',
        table: {
          head: ['Line', 'Quarter budget', 'Spent so far'],
          rows: [
            ['Travel', gbp(budget.travel), gbp(spent.travel)],
            ['Supplies', gbp(budget.supplies), gbp(spent.supplies)],
            ['Training', gbp(budget.training), gbp(spent.training)],
            ['Events', gbp(budget.events), gbp(spent.events)],
            ['Total', gbp(totalBudget), gbp(totalSpent)],
          ],
        },
      },
      {
        id: 'commitments',
        title: 'Commitments',
        text: `A training course for the team is booked for next month: ${gbp(p.booked)}. Travel was mostly booked within a week of travelling.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Read the numbers',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'travel',
            text: 'Travel is the biggest overspend.',
            issue: true,
            why: `Travel is ${gbp(travelOver)} over budget, more than any other line.`,
          },
          {
            id: 'training',
            text: `Training looks underspent, but ${gbp(p.booked)} is already committed.`,
            issue: true,
            why: 'Commitments must be counted in the forecast, not just what has been paid.',
          },
          {
            id: 'fine',
            text: 'Spending so far is below the total budget, so no action is needed.',
            issue: false,
            why: 'With a month to go and the booked training, the quarter will end over budget.',
          },
          {
            id: 'supplies',
            text: 'Supplies should be cut further to make up the difference.',
            issue: false,
            why: 'Supplies are already under budget; the problem is travel.',
          },
        ],
      },
      {
        id: 'forecast',
        kind: 'figure',
        title: 'Forecast overspend',
        prompt:
          'If nothing else is spent except the booked training, by how much will the quarter be over budget?',
        points: 15,
        answer: over,
        tolerance: 0.5,
        unit: '£',
        why: `${gbp(totalSpent)} spent + ${gbp(p.booked)} booked = ${gbp(forecast)}, against ${gbp(totalBudget)}: ${gbp(over)} over.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your recommendation',
        prompt: 'What do you recommend?',
        points: 15,
        options: [
          {
            id: 'report',
            label:
              'Report the forecast overspend and recommend booking travel at least two weeks ahead',
            verdict: 'best',
            why: 'It is honest about the position and tackles the cause.',
          },
          {
            id: 'move',
            label: 'Quietly move the training money to cover travel',
            verdict: 'poor',
            why: 'The training is already booked, and hiding the overspend stops anyone fixing it.',
          },
          {
            id: 'cancel',
            label: 'Cancel the training course to stay within budget',
            verdict: 'acceptable',
            why: 'It balances the numbers, but cuts development to pay for avoidable travel costs.',
          },
        ],
      },
      report(
        'Quarterly budget report',
        [['Summary'], ['Recommendations', 'Recommendation', 'Next steps']],
        [
          { label: 'the forecast overspend', value: over },
          { label: 'the travel overspend', value: travelOver },
        ],
        [['travel'], ['in advance', 'ahead', 'earlier']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the department head',
        title: 'Brief the department head',
        prompt:
          'Write to the department head: the forecast, the cause and your recommendation.',
        points: 20,
        minWords: 40,
        model: `Hi, with the booked training the quarter is forecast to end ${gbp(over)} over budget. The cause is travel, already ${gbp(travelOver)} over, mostly booked within a week of travelling. I recommend booking travel at least two weeks ahead from now on. The full report is attached. Thanks, {name}`,
        mentions: [forms(over), ['travel'], ['ahead', 'in advance', 'earlier']],
        avoid: [{ terms: ['blame'], why: 'Focus on the cause and the fix, not on who.' }],
      },
    ],
    skills: { 'finance-basics': 25, 'data-analysis': 20, presentation: 10 },
  })
}

// ---------------------------------------------------------------------------
// Accounting
// ---------------------------------------------------------------------------

/** Level 2: a bank reconciliation with a keying error. */
function accReconciliation(p: {
  version: string
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

// ---------------------------------------------------------------------------
// IT Help Desk
// ---------------------------------------------------------------------------

/** Level 2: an outage after a change. */
function itOutage(p: {
  version: string
  change: string
  users: number
  startedAgo: number
}) {
  const left = 240 - p.startedAgo
  return assessment({
    id: 'ready-it-practitioner',
    careerId: 'it-support',
    level: 2,
    title: 'Readiness assessment: an incident to resolve',
    summary: 'Investigate an outage, find its cause, resolve it and document it.',
    brief: `This assessment checks that you can handle an incident from start to finish.

Investigate why the Finance team cannot reach the shared drive, work out the time left on the target, decide how to resolve it, write the incident report in Docs, and update the affected users. You have 3 hours.`,
    whyItMatters:
      'Analysts at the next level own incidents end to end: diagnosis from evidence, a safe fix, clear communication and a record others can learn from.',
    objectives: [
      'Diagnose from evidence',
      'Resolve safely through the change process',
      'Document and communicate',
    ],
    evidence: [
      {
        id: 'ticket',
        title: 'The incident',
        text: `${p.users} people in Finance cannot open the shared drive (\\\\files01\\finance) since 9:10. It was logged ${p.startedAgo} minutes ago as P2 (4-hour target). People working over the VPN at home can open it.`,
      },
      {
        id: 'checks',
        title: 'What you have checked',
        table: {
          head: ['Check', 'Result'],
          rows: [
            ['Ping files01 by name', 'Name not found'],
            ['Ping files01 by IP address', 'Replies'],
            ['Change log', `${p.change} at 9:05: office DNS server settings updated`],
          ],
        },
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Diagnose',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'change',
            text: `The outage began just after change ${p.change}.`,
            issue: true,
            why: 'The DNS change at 9:05 was five minutes before the first failures.',
          },
          {
            id: 'server-up',
            text: 'The file server itself is running.',
            issue: true,
            why: 'It answers by IP address; only finding it by name fails, which points to DNS.',
          },
          {
            id: 'vpn',
            text: 'People on the VPN are affected too.',
            issue: false,
            why: 'They can open the drive, because the VPN uses different DNS servers.',
          },
          {
            id: 'restart',
            text: 'Restarting everyone’s laptop will fix it.',
            issue: false,
            why: 'The fault is in the office DNS settings, not the laptops.',
          },
        ],
      },
      {
        id: 'left',
        kind: 'figure',
        title: 'Time left',
        prompt: 'How many minutes are left within the 4-hour target?',
        points: 15,
        answer: left,
        tolerance: 0.5,
        unit: 'minutes',
        why: `4 hours is 240 minutes; ${p.startedAgo} have gone, so ${left} are left.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The fix',
        prompt: 'What do you do?',
        points: 15,
        options: [
          {
            id: 'rollback',
            label: `Ask the change owner to roll back ${p.change} through the emergency change process, then confirm the drive opens`,
            verdict: 'best',
            why: 'It fixes the cause quickly and safely, with the change properly recorded.',
          },
          {
            id: 'restart',
            label: 'Ask everyone in Finance to restart their laptops',
            verdict: 'poor',
            why: 'It wastes everyone’s time and cannot fix a DNS fault.',
          },
          {
            id: 'ip',
            label:
              'Map the drive by IP address on each laptop while you look for the cause',
            verdict: 'acceptable',
            why: 'A workaround that helps today, but it hides the real fault and must be undone later.',
          },
        ],
      },
      report(
        `Incident report: Finance shared drive`,
        [['Summary'], ['Cause', 'Root cause'], ['Resolution', 'Fix']],
        [{ label: 'the number of people affected', value: p.users }],
        [[p.change], ['DNS']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the Finance team',
        title: 'Update the users',
        prompt:
          'Write to the Finance team: what happened, that it is fixed, and what to do if it is not.',
        points: 20,
        minWords: 35,
        model: `Hi all, sorry for the trouble this morning. A change to the office network settings stopped computers finding the shared drive by name. We have reversed it and the shared drive is working again. If you still cannot open it, please restart your browser or reply to this email and we will help straight away. Thanks, {name}`,
        mentions: [
          ['sorry', 'apolog'],
          ['shared drive'],
          ['working', 'fixed', 'restored'],
        ],
        avoid: [
          {
            terms: ['DNS resolver', 'A record'],
            why: 'Users need plain words, not jargon.',
          },
        ],
      },
    ],
    skills: { troubleshooting: 25, 'incident-management': 20, 'technical-writing': 10 },
  })
}

/** Level 3: problem management from ticket trends. */
function itTrends(p: {
  version: string
  resets: number
  minutes: number
  printer: string
}) {
  const hours = Math.round(((p.resets * p.minutes * 0.75) / 60) * 10) / 10
  return assessment({
    id: 'ready-it-senior',
    careerId: 'it-support',
    level: 3,
    title: 'Readiness assessment: stop the repeat tickets',
    summary:
      'Find the patterns in last month’s tickets and propose fixes that remove them.',
    brief: `This assessment checks that you can improve the service, not just answer tickets.

Analyse last month’s tickets, estimate the time a fix would save, decide what to propose, write the problem report in Docs, and send your proposal to the IT manager. You have 3 hours.`,
    whyItMatters:
      'Senior analysts look for the causes behind repeated tickets. Removing a whole category of work frees the desk for problems that need people.',
    objectives: [
      'Find patterns in tickets',
      'Estimate the benefit of a fix',
      'Make a proposal',
    ],
    evidence: [
      {
        id: 'tickets',
        title: 'Last month’s tickets by category',
        table: {
          head: ['Category', 'Tickets', 'Average handling time', 'Priority'],
          rows: [
            ['Password resets', String(p.resets), `${p.minutes} minutes`, 'P3'],
            [`Printer (${p.printer})`, '22', '20 minutes', 'P4'],
            ['New starter set-up', '9', '90 minutes', 'P3'],
            ['Other', '31', 'varies', 'mixed'],
          ],
        },
      },
      {
        id: 'notes',
        title: 'Notes',
        text: `A self-service password reset tool (included in the company’s licences) is expected to remove about three quarters of reset tickets. All 22 printer tickets were for the same printer, ${p.printer}, which is 7 years old.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Find the patterns',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'resets',
            text: 'Password resets are the biggest single category.',
            issue: true,
            why: `${p.resets} tickets, more than any other category.`,
          },
          {
            id: 'printer',
            text: 'The printer tickets come from one printer.',
            issue: true,
            why: `All 22 were for ${p.printer}: a problem with one device, not with printing.`,
          },
          {
            id: 'all-resets',
            text: 'Self-service would remove every password ticket.',
            issue: false,
            why: 'About three quarters; some people will still need help.',
          },
          {
            id: 'p1',
            text: 'Most tickets are urgent (P1).',
            issue: false,
            why: 'None of these categories is P1: they are routine, which is why they can be removed.',
          },
        ],
      },
      {
        id: 'saved',
        kind: 'figure',
        title: 'Time saved',
        prompt:
          'About how many hours a month would self-service password reset save the desk? (One decimal place.)',
        points: 15,
        answer: hours,
        tolerance: 0.1,
        unit: 'hours',
        why: `${p.resets} tickets × ${p.minutes} minutes × 75% ÷ 60 = ${hours} hours.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your proposal',
        prompt: 'What do you propose?',
        points: 15,
        options: [
          {
            id: 'both',
            label: `Roll out self-service password reset and replace ${p.printer}`,
            verdict: 'best',
            why: 'Both remove the cause of a whole category of tickets, at little cost.',
          },
          {
            id: 'staff',
            label: 'Ask for another analyst to handle the volume',
            verdict: 'poor',
            why: 'It pays people to keep doing work that could be removed.',
          },
          {
            id: 'printer-only',
            label: `Replace ${p.printer} and leave password resets as they are`,
            verdict: 'acceptable',
            why: 'A good fix, but it leaves the biggest category untouched.',
          },
        ],
      },
      report(
        'Problem report: repeat tickets',
        [['Findings'], ['Recommendations', 'Proposal']],
        [{ label: 'the hours saved each month', value: hours }],
        [['self-service', 'self service'], [p.printer]],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the IT manager',
        title: 'Send your proposal',
        prompt:
          'Write to the IT manager: what you found, what you propose and the benefit.',
        points: 20,
        minWords: 40,
        model: `Hi, I have analysed last month’s tickets. Password resets are the biggest category, and self-service reset would save about ${hours} hours a month. All 22 printer tickets came from ${p.printer}, which is 7 years old, so I propose replacing it. The full problem report is attached. Thanks, {name}`,
        mentions: [[String(hours)], ['self-service', 'self service'], [p.printer]],
        avoid: [
          {
            terms: ['users are stupid', 'user error'],
            why: 'Describe the pattern, not the people.',
          },
        ],
      },
    ],
    skills: { 'incident-management': 25, troubleshooting: 15, 'technical-writing': 15 },
  })
}

// ---------------------------------------------------------------------------
// Digital Marketing
// ---------------------------------------------------------------------------

/** Level 2: campaign performance and budget moves. */
function mktCampaign(p: {
  version: string
  a: [number, number]
  b: [number, number]
  c: [number, number]
  target: number
}) {
  const spend = p.a[0] + p.b[0] + p.c[0]
  const conversions = p.a[1] + p.b[1] + p.c[1]
  const cpa = Math.round((spend / conversions) * 100) / 100
  const cpaB = p.b[0] / p.b[1]
  return assessment({
    id: 'ready-mkt-practitioner',
    careerId: 'digital-marketing',
    level: 2,
    title: 'Readiness assessment: fix the campaign',
    summary: 'Analyse a campaign, find the problems, adjust the spend and recommend.',
    brief: `This assessment checks that you can manage campaign performance.

Analyse the search campaign’s three ad groups, work out its cost per conversion, decide how to move the budget, write your recommendations in Docs, and update the client. You have 3 hours.`,
    whyItMatters:
      'Executives at the next level are trusted with clients’ budgets. Reading performance correctly and moving money to what works is the core of the job.',
    objectives: [
      'Analyse ad group performance',
      'Work out cost per conversion',
      'Recommend budget changes',
    ],
    evidence: [
      {
        id: 'groups',
        title: 'Search campaign, last 30 days',
        table: {
          head: ['Ad group', 'Spend', 'Conversions', 'Cost per conversion'],
          rows: [
            ['A: brand', gbp(p.a[0]), String(p.a[1]), gbp(p.a[0] / p.a[1])],
            ['B: generic', gbp(p.b[0]), String(p.b[1]), gbp(cpaB)],
            ['C: competitor', gbp(p.c[0]), String(p.c[1]), gbp(p.c[0] / p.c[1])],
          ],
        },
      },
      {
        id: 'target',
        title: 'The client’s target',
        text: `A cost per conversion of ${gbp(p.target)} or less across the campaign.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Read the performance',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'b-high',
            text: 'Ad group B costs more than twice the target per conversion.',
            issue: true,
            why: `${gbp(cpaB)} against a ${gbp(p.target)} target.`,
          },
          {
            id: 'c-best',
            text: 'Ad group C has the lowest cost per conversion.',
            issue: true,
            why: `${gbp(p.c[0] / p.c[1])}, the lowest of the three.`,
          },
          {
            id: 'pause-a',
            text: 'Ad group A should be paused.',
            issue: false,
            why: 'It converts below target: pausing it would lose good conversions.',
          },
          {
            id: 'all-bad',
            text: 'Every ad group is above target.',
            issue: false,
            why: 'Only B is; A and C are below target.',
          },
        ],
      },
      {
        id: 'cpa',
        kind: 'figure',
        title: 'The campaign’s cost per conversion',
        prompt: 'What is the cost per conversion across the whole campaign?',
        points: 15,
        answer: cpa,
        tolerance: 0.01,
        unit: '£',
        why: `${gbp(spend)} ÷ ${conversions} conversions = ${gbp(cpa)}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The budget',
        prompt: 'What do you change?',
        points: 15,
        options: [
          {
            id: 'move',
            label:
              'Move half of B’s budget to A and C, and test new keywords and ads in B',
            verdict: 'best',
            why: 'Money moves to what works now, while B gets a fair chance to improve.',
          },
          {
            id: 'raise-all',
            label: 'Increase every ad group’s budget by 20%',
            verdict: 'poor',
            why: 'It puts more money into the worst performer too.',
          },
          {
            id: 'pause-b',
            label: 'Pause ad group B completely',
            verdict: 'acceptable',
            why: 'It stops the waste, but gives up the generic searches B could win with better ads.',
          },
        ],
      },
      report(
        'Campaign recommendations',
        [
          ['Performance', 'Results'],
          ['Recommendations', 'Next steps'],
        ],
        [
          { label: 'the campaign cost per conversion', value: cpa },
          { label: 'ad group B’s cost per conversion', value: cpaB },
        ],
        [
          ['group B', 'ad group B', 'generic'],
          ['test', 'keywords'],
        ],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the client',
        title: 'Update the client',
        prompt:
          'Write to the client: how the campaign is doing, the problem and what you are changing.',
        points: 20,
        minWords: 40,
        model: `Hi, the campaign is running at ${gbp(cpa)} per conversion. Brand and competitor ads are doing well; generic ads (group B) cost ${gbp(cpaB)} per conversion, well above your ${gbp(p.target)} target. I am moving half of B’s budget to the stronger groups and testing new keywords and ads in B. I will report back in two weeks. Best, {name}`,
        mentions: [[String(cpa), gbp(cpa)], ['group B', 'generic'], ['test']],
        avoid: [
          { terms: ['guarantee'], why: 'Never promise results you cannot control.' },
        ],
      },
    ],
    skills: { 'campaign-analytics': 30, 'content-strategy': 15 },
  })
}

/** Level 3: planning next quarter's budget across channels. */
function mktPlan(p: {
  version: string
  budget: number
  email: number
  search: number
  social: number
  returns: [number, number, number]
}) {
  const [re, rs, rso] = p.returns
  const revenue = p.email * re + p.search * rs + p.social * rso
  return assessment({
    id: 'ready-mkt-senior',
    careerId: 'digital-marketing',
    level: 3,
    title: 'Readiness assessment: plan next quarter’s budget',
    summary: 'Recommend how to split next quarter’s budget across channels, and why.',
    brief: `This assessment checks that you can plan a marketing budget.

Assess the channels’ returns and limits, work out the expected revenue of the draft plan, decide what to recommend, write the budget plan in Docs, and send it to the Head of Marketing. You have 3 hours.`,
    whyItMatters:
      'Specialists plan budgets, not just campaigns. That means understanding returns, limits and risk, and explaining the trade-offs.',
    objectives: [
      'Compare channel returns',
      'Estimate expected revenue',
      'Recommend and justify a plan',
    ],
    evidence: [
      {
        id: 'channels',
        title: 'Channel returns (last two quarters)',
        table: {
          head: ['Channel', 'Revenue per £1 spent', 'Notes'],
          rows: [
            ['Email', gbp(re), `Our list can absorb about ${gbp(p.email)} a quarter`],
            ['Search', gbp(rs), 'Returns fall slowly as spend rises'],
            ['Social', gbp(rso), 'Builds awareness; helps search and email conversions'],
          ],
        },
      },
      {
        id: 'draft',
        title: 'The draft plan',
        text: `Budget ${gbp(p.budget)}: email ${gbp(p.email)}, search ${gbp(p.search)}, social ${gbp(p.social)}.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Assess the channels',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'email-best',
            text: 'Email returns the most per pound.',
            issue: true,
            why: `${gbp(re)} per £1, the highest.`,
          },
          {
            id: 'email-all',
            text: 'The whole budget should go into email.',
            issue: false,
            why: `The list can only absorb about ${gbp(p.email)}; more would just annoy subscribers.`,
          },
          {
            id: 'diminishing',
            text: 'The last pounds spent in a channel usually earn less than the average.',
            issue: true,
            why: 'Diminishing returns: the best opportunities are bought first.',
          },
          {
            id: 'social-none',
            text: 'Social has no value because its return is lowest.',
            issue: false,
            why: 'It builds awareness that helps other channels convert.',
          },
        ],
      },
      {
        id: 'revenue',
        kind: 'figure',
        title: 'Expected revenue',
        prompt: 'What revenue does the draft plan expect, using the channel returns?',
        points: 15,
        answer: revenue,
        tolerance: 0.5,
        unit: '£',
        why: `${gbp(p.email)} × ${re} + ${gbp(p.search)} × ${rs} + ${gbp(p.social)} × ${rso} = ${gbp(revenue)}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your recommendation',
        prompt: 'What do you recommend?',
        points: 15,
        options: [
          {
            id: 'plan-test',
            label:
              'Approve the plan, and test a smaller social budget in one region to measure its effect on search and email',
            verdict: 'best',
            why: 'It funds what works, respects channel limits, and measures the channel whose value is least certain.',
          },
          {
            id: 'all-search',
            label:
              'Move everything except email into search, which returns more than social',
            verdict: 'poor',
            why: 'It ignores diminishing returns and the help social gives other channels.',
          },
          {
            id: 'same',
            label: 'Keep last quarter’s split without changes',
            verdict: 'acceptable',
            why: 'Safe, but it learns nothing about the channel whose value is uncertain.',
          },
        ],
      },
      report(
        'Budget plan: next quarter',
        [
          ['Summary'],
          ['Channels', 'Allocation', 'Budget'],
          ['Recommendations', 'Recommendation'],
        ],
        [{ label: 'the expected revenue', value: revenue }],
        [['email'], ['test', 'measure']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the Head of Marketing',
        title: 'Send the plan',
        prompt:
          'Write to the Head of Marketing: the plan, the expected revenue and the test you propose.',
        points: 20,
        minWords: 40,
        model: `Hi, the budget plan is attached. The draft split of ${gbp(p.budget)} is expected to bring in about ${gbp(revenue)}. Email returns the most but is capped by our list size, and search returns fall as spend rises. I recommend approving it, with a test of a smaller social budget in one region to measure what social adds. Thanks, {name}`,
        mentions: [forms(revenue), ['email'], ['test', 'measure']],
        avoid: [
          {
            terms: ['guaranteed'],
            why: 'Expected revenue is an estimate, not a promise.',
          },
        ],
      },
    ],
    skills: { 'campaign-analytics': 25, 'content-strategy': 25 },
  })
}

// ---------------------------------------------------------------------------
// Data Analysis
// ---------------------------------------------------------------------------

/** Level 2: a SQL join counting duplicates. */
function dataDuplicates(p: {
  version: string
  orders: Array<[string, string, number]>
  duplicate: string
}) {
  const correct = p.orders.reduce((s, o) => s + o[2], 0)
  const dupTotal = p.orders
    .filter((o) => o[1] === p.duplicate)
    .reduce((s, o) => s + o[2], 0)
  const reported = correct + dupTotal
  return assessment({
    id: 'ready-data-practitioner',
    careerId: 'data-analytics',
    level: 2,
    title: 'Readiness assessment: the sales total that doesn’t add up',
    summary: 'Find why a SQL query overstates sales, correct it and explain.',
    brief: `This assessment checks that you can clean data, check SQL and communicate findings.

Find out why the quarterly sales query gives too high a total, work out the correct total, decide how to fix it, write an analysis note in Docs, and explain it to the Sales Manager. You have 3 hours.`,
    whyItMatters:
      'Analysts at the next level publish numbers others rely on. Checking joins and duplicates before publishing is what makes them trustworthy.',
    objectives: [
      'Check a query for duplication',
      'Calculate the correct figure',
      'Explain the fix',
    ],
    evidence: [
      {
        id: 'query',
        title: 'The query',
        text:
          "`SELECT SUM(o.amount) FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE c.status = 'active'` returned " +
          gbp(reported) +
          '.',
      },
      {
        id: 'orders',
        title: 'Orders this quarter',
        table: {
          head: ['Order', 'Customer', 'Amount'],
          rows: p.orders.map(([id, customer, amount]) => [id, customer, gbp(amount)]),
        },
      },
      {
        id: 'customers',
        title: 'Customers table (extract)',
        text: `Customer ${p.duplicate} appears twice in the customers table: once as imported from the old system, once as re-created by hand. Every other customer appears once.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Find the problem',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'join',
            text: `The join counts ${p.duplicate}’s orders twice.`,
            issue: true,
            why: 'Each order matches both copies of the customer, so it is added twice.',
          },
          {
            id: 'left-join',
            text: 'Changing the JOIN to a LEFT JOIN would fix it.',
            issue: false,
            why: 'A LEFT JOIN still matches both copies; the duplicate customer must be removed.',
          },
          {
            id: 'orders-fine',
            text: 'The orders table itself has no duplicate orders.',
            issue: true,
            why: 'Each order number appears once; the duplication comes from the customers table.',
          },
          {
            id: 'amounts',
            text: 'Some order amounts must be wrong.',
            issue: false,
            why: 'The amounts are right; they are counted twice by the join.',
          },
        ],
      },
      {
        id: 'total',
        kind: 'figure',
        title: 'The correct total',
        prompt: 'What is the correct sales total for the quarter?',
        points: 15,
        answer: correct,
        tolerance: 0.5,
        unit: '£',
        why: `The orders add up to ${gbp(correct)}; the query added ${p.duplicate}’s ${gbp(dupTotal)} twice, giving ${gbp(reported)}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The fix',
        prompt: 'What do you do?',
        points: 15,
        options: [
          {
            id: 'clean',
            label:
              'Merge the duplicate customer record, add a check for duplicate customers, and rerun the report',
            verdict: 'best',
            why: 'It fixes the cause in the data and stops it happening silently again.',
          },
          {
            id: 'publish',
            label: 'Publish the query result: it came from the database',
            verdict: 'poor',
            why: 'Data from a database can still be wrong; this total is overstated.',
          },
          {
            id: 'subtract',
            label: 'Subtract the duplicated amount by hand in this report',
            verdict: 'acceptable',
            why: 'This report is right, but every other report using the join stays wrong.',
          },
        ],
      },
      report(
        'Analysis note: quarterly sales total',
        [['Method', 'Data'], ['Findings'], ['Limitations', 'Next steps']],
        [{ label: 'the correct total', value: correct }],
        [['duplicate'], ['join']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the Sales Manager',
        title: 'Explain it to Sales',
        prompt:
          'Write to the Sales Manager: the correct total, what went wrong, and what you have fixed.',
        points: 20,
        minWords: 40,
        model: `Hi, the correct sales total for the quarter is ${gbp(correct)}. The earlier figure counted ${p.duplicate}’s orders twice, because that customer had a duplicate record. I have merged the duplicate customer record and added a check so it cannot happen silently again. Thanks, {name}`,
        mentions: [forms(correct), ['duplicate', 'twice'], ['check', 'fixed', 'merged']],
        avoid: [
          {
            terms: ['the database is wrong'],
            why: 'Explain what in the data caused it.',
          },
        ],
      },
    ],
    skills: { 'data-cleaning': 30, 'insight-communication': 20 },
  })
}

/** Level 3: an A/B test read too early. */
function dataTest(p: {
  version: string
  visitors: number
  control: number
  variant: number
  days: number
}) {
  const rc = Math.round((p.control / p.visitors) * 1000) / 10
  const rv = Math.round((p.variant / p.visitors) * 1000) / 10
  const uplift = Math.round(((rv - rc) / rc) * 1000) / 10
  return assessment({
    id: 'ready-data-senior',
    careerId: 'data-analytics',
    level: 3,
    title: 'Readiness assessment: is the new checkout better?',
    summary: 'Interpret an A/B test and advise whether to roll out the new design.',
    brief: `This assessment checks that you can analyse an experiment and advise on a decision.

Interpret the checkout test, calculate the uplift, decide what to advise, write the results summary in Docs, and reply to the product manager. You have 3 hours.`,
    whyItMatters:
      'Senior analysts guard decisions against noisy or incomplete evidence, while still telling people what the data does show.',
    objectives: [
      'Interpret an A/B test',
      'Calculate a relative uplift',
      'Advise on a decision with its uncertainty',
    ],
    evidence: [
      {
        id: 'results',
        title: 'Checkout test results',
        table: {
          head: ['Group', 'Visitors', 'Purchases', 'Conversion rate'],
          rows: [
            [
              'Current checkout',
              p.visitors.toLocaleString('en-GB'),
              String(p.control),
              `${rc}%`,
            ],
            [
              'New checkout',
              p.visitors.toLocaleString('en-GB'),
              String(p.variant),
              `${rv}%`,
            ],
          ],
        },
      },
      {
        id: 'setup',
        title: 'How the test ran',
        text: `Visitors were assigned to a group at random. The test ran for ${p.days} days, Tuesday to ${p.days === 2 ? 'Wednesday' : 'Thursday'}, without a weekend. The product manager wants to roll out the new checkout tomorrow.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Read the test',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'rate',
            text: `The new checkout converted at ${rv}%.`,
            issue: true,
            why: `${p.variant} ÷ ${p.visitors.toLocaleString('en-GB')} = ${rv}%.`,
          },
          {
            id: 'short',
            text: 'The test has not covered a full week, including a weekend.',
            issue: true,
            why: 'Weekend shoppers can behave differently; the result may not hold.',
          },
          {
            id: 'random',
            text: 'Visitors were assigned to the groups at random.',
            issue: true,
            why: 'Random assignment is what makes the comparison fair.',
          },
          {
            id: 'guaranteed',
            text: 'The uplift is guaranteed to continue after rollout.',
            issue: false,
            why: 'A short test can show an uplift by chance or because of the days covered.',
          },
        ],
      },
      {
        id: 'uplift',
        kind: 'figure',
        title: 'The relative uplift',
        prompt:
          'By what percentage did the new checkout improve the conversion rate? (One decimal place.)',
        points: 15,
        answer: uplift,
        tolerance: 0.1,
        unit: '%',
        why: `(${rv}% − ${rc}%) ÷ ${rc}% = ${uplift}%.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your advice',
        prompt: 'What do you advise?',
        points: 15,
        options: [
          {
            id: 'extend',
            label: 'Keep the test running for two full weeks, then decide',
            verdict: 'best',
            why: 'The early result is promising; two full weeks show whether it holds across days and weeks.',
          },
          {
            id: 'rollout',
            label: 'Roll out tomorrow: the new checkout is clearly better',
            verdict: 'poor',
            why: 'It treats a short, incomplete test as proof.',
          },
          {
            id: 'stop',
            label: 'Stop the test: the difference is too small to matter',
            verdict: 'acceptable',
            why: 'Cautious, but it throws away a promising result before it is tested properly.',
          },
        ],
      },
      report(
        'Results summary: checkout test',
        [['Summary'], ['Results', 'Findings'], ['Recommendation', 'Recommendations']],
        [{ label: 'the uplift', value: uplift }],
        [['two weeks', 'full week', 'longer'], ['random']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the product manager',
        title: 'Reply to the product manager',
        prompt:
          'Write to the product manager: the result, the uncertainty and your advice.',
        points: 20,
        minWords: 40,
        model: `Hi, good news so far: the new checkout converted at ${rv}% against ${rc}%, an uplift of ${uplift}%. But the test has run for only ${p.days} days with no weekend, so it could be chance or the days covered. I advise running it for two full weeks before rolling out. Thanks, {name}`,
        mentions: [
          [String(uplift)],
          ['weekend', 'days', 'short'],
          ['two weeks', 'longer', 'full week'],
        ],
        avoid: [
          {
            terms: ['proves', 'definitely'],
            why: 'Do not overstate what a short test shows.',
          },
        ],
      },
    ],
    skills: {
      'insight-communication': 30,
      'data-visualisation': 10,
      'data-cleaning': 10,
    },
  })
}

// ---------------------------------------------------------------------------
// Software Development
// ---------------------------------------------------------------------------

/** Level 2: a discount bug, its tests and its fix. */
function devDiscount(p: {
  version: string
  total: number
  percent: number
  reported: [number, number]
}) {
  const expected = (p.total * (100 - p.percent)) / 100
  const [rt, rp] = p.reported
  const right = (rt * (100 - rp)) / 100
  return assessment({
    id: 'ready-dev-practitioner',
    careerId: 'software-development',
    level: 2,
    title: 'Readiness assessment: fix the discount bug',
    summary:
      'Investigate a defect, decide on the fix and its tests, and document the change.',
    brief: `This assessment checks that you can fix a defect properly.

Investigate the discount bug from the code and the failing test, work out what the function should return, decide on the fix, write the change note in Docs, and reply to the product owner. You have 3 hours.`,
    whyItMatters:
      'Developers at the next level fix defects on their own. That means finding the cause, proving the fix with tests and explaining the change.',
    objectives: [
      'Find the cause of a defect',
      'Decide on a fix and its tests',
      'Document the change',
    ],
    evidence: [
      {
        id: 'code',
        title: 'pricing.ts',
        text: '`export function applyDiscount(total: number, percent: number) { return total - percent }`',
      },
      {
        id: 'test',
        title: 'Test results',
        text: `FAIL: “${rp}% off £${rt} is £${right}”: expected ${right}, received ${rt - rp}.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Find the cause',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'cause',
            text: 'The function subtracts the percentage as if it were pounds.',
            issue: true,
            why: `${rt} − ${rp} treats ${rp}% as £${rp}.`,
          },
          {
            id: 'test-wrong',
            text: 'The test is wrong and should expect the received value.',
            issue: false,
            why: `${rp}% off £${rt} really is £${right}: the test is right.`,
          },
          {
            id: 'every',
            text: 'The bug affects almost every discount, not just this one.',
            issue: true,
            why: 'Any percentage is taken off as pounds, so almost every result is wrong.',
          },
          {
            id: 'zero',
            text: 'A 0% discount also gives the wrong answer.',
            issue: false,
            why: 'Taking off 0 pounds and 0% give the same result, which is why the bug was missed.',
          },
        ],
      },
      {
        id: 'expected',
        kind: 'figure',
        title: 'The right answer',
        prompt: `What should applyDiscount(${p.total}, ${p.percent}) return?`,
        points: 15,
        answer: expected,
        tolerance: 0.01,
        unit: '£',
        why: `${p.total} × (1 − ${p.percent} ÷ 100) = ${expected}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The fix',
        prompt: 'How do you fix it?',
        points: 15,
        options: [
          {
            id: 'fix-tests',
            label:
              'Return total × (1 − percent ÷ 100), and add tests for 0%, a typical discount and 100%',
            verdict: 'best',
            why: 'It fixes the cause and the tests cover the edges, so it cannot quietly break again.',
          },
          {
            id: 'change-test',
            label: 'Change the test to expect the received value',
            verdict: 'poor',
            why: 'It makes the build pass and customers keep getting the wrong price.',
          },
          {
            id: 'fix-only',
            label: 'Fix the formula and release it straight away, without new tests',
            verdict: 'acceptable',
            why: 'The bug is fixed, but nothing protects the edge cases.',
          },
        ],
      },
      report(
        'Change note: discount calculation',
        [
          ['Problem', 'Bug', 'Issue'],
          ['Fix', 'Change'],
          ['Tests', 'Testing'],
        ],
        [{ label: 'the corrected example', value: expected }],
        [['percent', 'percentage'], ['test']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: 'the product owner',
        title: 'Reply to the product owner',
        prompt:
          'Write to the product owner: what was wrong, what you changed, and how it is tested.',
        points: 20,
        minWords: 40,
        model: `Hi, I have found the discount bug: the code took the percentage off as if it were pounds, so ${p.percent}% off £${p.total} gave the wrong price instead of £${expected}. I have fixed the calculation and added tests for 0%, a typical discount and 100%, which all pass. It can go out in today’s release. Thanks, {name}`,
        mentions: [[String(expected)], ['percent', 'percentage', '%'], ['test']],
        avoid: [{ terms: ['not my code'], why: 'Own the fix, whoever wrote the bug.' }],
      },
    ],
    skills: { debugging: 30, 'software-testing': 20 },
  })
}

/** Level 3: reviewing a performance change before release. */
function devReview(p: {
  version: string
  before: number
  after: number
  author: string
}) {
  const reduction = Math.round(((p.before - p.after) / p.before) * 1000) / 10
  return assessment({
    id: 'ready-dev-senior',
    careerId: 'software-development',
    level: 3,
    title: 'Readiness assessment: review a change before release',
    summary:
      'Review a pull request that speeds up pricing, and decide whether it can ship.',
    brief: `This assessment checks that you can review code and make release decisions.

Review ${p.author}’s caching change, calculate the improvement, decide whether it can be released, write the review summary in Docs, and give ${p.author} your feedback. You have 3 hours.`,
    whyItMatters:
      'Senior developers protect quality for the whole team: they weigh benefits against risks and give feedback that helps people improve.',
    objectives: [
      'Review a change for risks',
      'Quantify its benefit',
      'Give constructive feedback',
    ],
    evidence: [
      {
        id: 'pr',
        title: `Pull request by ${p.author}: cache product prices`,
        text: 'Prices are now kept in memory after the first database read. The cache has no expiry and is never cleared when a price changes. No new tests. The plan is to release on Friday at 5 pm.',
      },
      {
        id: 'load',
        title: 'Load test (95th percentile response time)',
        table: {
          head: ['Version', 'Response time'],
          rows: [
            ['Before', `${p.before} ms`],
            ['With the cache', `${p.after} ms`],
          ],
        },
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Review the change',
        prompt: 'Tick every statement that is true.',
        points: 25,
        findings: [
          {
            id: 'stale',
            text: 'Customers could be charged an old price after a price change.',
            issue: true,
            why: 'The cache never expires and is not cleared when prices change.',
          },
          {
            id: 'tests',
            text: 'The change has no tests for price updates.',
            issue: true,
            why: 'Nothing checks that a new price is used after a change.',
          },
          {
            id: 'db',
            text: 'The speed-up comes from a faster database.',
            issue: false,
            why: 'The database is unchanged; reads are skipped by the cache.',
          },
          {
            id: 'friday',
            text: 'Releasing at 5 pm on Friday is a good time for a change like this.',
            issue: false,
            why: 'If it goes wrong, few people are around to notice or fix it.',
          },
        ],
      },
      {
        id: 'reduction',
        kind: 'figure',
        title: 'The improvement',
        prompt: 'By what percentage did the response time fall? (One decimal place.)',
        points: 15,
        answer: reduction,
        tolerance: 0.1,
        unit: '%',
        why: `(${p.before} − ${p.after}) ÷ ${p.before} = ${reduction}%.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your review decision',
        prompt: 'What do you decide?',
        points: 15,
        options: [
          {
            id: 'changes',
            label:
              'Request changes: clear the cache when a price changes, add a short expiry and tests; release on Monday morning',
            verdict: 'best',
            why: 'The team keeps the big speed-up without the risk of wrong prices.',
          },
          {
            id: 'approve',
            label: 'Approve it: the speed-up is too good to wait for',
            verdict: 'poor',
            why: 'Charging customers wrong prices costs far more than slow pages.',
          },
          {
            id: 'reject',
            label: 'Reject caching altogether: it is too risky',
            verdict: 'acceptable',
            why: 'Safe, but it throws away a valuable improvement that can be made safe.',
          },
        ],
      },
      report(
        'Review summary: price caching',
        [['Summary'], ['Risks', 'Issues'], ['Decision', 'Recommendation']],
        [{ label: 'the response time reduction', value: reduction }],
        [['expiry', 'expire', 'invalidat'], ['test']],
      ),
      {
        id: 'message',
        kind: 'reply',
        to: p.author,
        title: `Feedback for ${p.author}`,
        prompt: `Write to ${p.author}: what is good, what must change before release, and why.`,
        points: 20,
        minWords: 45,
        model: `Hi ${p.author}, great work on the caching: response times are down ${reduction}%, which customers will notice. Before it ships, the cache needs clearing when a price changes and a short expiry, otherwise customers could pay an old price, plus tests for price updates. Let’s release on Monday morning rather than Friday at 5 pm. Happy to pair on the tests. Thanks, {name}`,
        mentions: [[String(reduction)], ['expiry', 'expire', 'clear'], ['test']],
        avoid: [
          { terms: ['careless', 'sloppy'], why: 'Criticise the code, never the person.' },
        ],
      },
    ],
    skills: { 'software-design': 25, 'software-testing': 20, programming: 10 },
  })
}

// ---------------------------------------------------------------------------

/** Every assessment, each in its versions (the first is used for a first attempt with seed 0). */
const SOURCES: Record<string, CaseInput[]> = {
  'ready-fa-practitioner': [
    faClaims({
      version: 'a',
      meal: 32,
      miles: 120,
      train: 48,
      names: ['Ana Ruiz', 'Ben Cole', 'Kate Moss', 'Raj Patel'],
    }),
    faClaims({
      version: 'b',
      meal: 38,
      miles: 90,
      train: 56,
      names: ['Lucy Ford', 'Omar Haddad', 'Zoe Baker', 'Ian Reed'],
    }),
  ],
  'ready-fa-senior': [
    faBudget({ version: 'a', travel: 7800, events: 2400, booked: 2000 }),
    faBudget({ version: 'b', travel: 8200, events: 1900, booked: 1800 }),
  ],
  'ready-acc-practitioner': [
    accReconciliation({
      version: 'a',
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
      revenue: 228000,
      cos: 98000,
      overheads: 86000,
      oneOff: 9000,
    }),
    accVariance({
      version: 'b',
      revenue: 226000,
      cos: 97000,
      overheads: 89000,
      oneOff: 11000,
    }),
  ],
  'ready-it-practitioner': [
    itOutage({ version: 'a', change: 'CHG-221', users: 35, startedAgo: 90 }),
    itOutage({ version: 'b', change: 'CHG-348', users: 28, startedAgo: 75 }),
  ],
  'ready-it-senior': [
    itTrends({ version: 'a', resets: 48, minutes: 12, printer: 'PR-2F-07' }),
    itTrends({ version: 'b', resets: 60, minutes: 10, printer: 'PR-1G-03' }),
  ],
  'ready-mkt-practitioner': [
    mktCampaign({ version: 'a', a: [1200, 48], b: [900, 12], c: [600, 30], target: 30 }),
    mktCampaign({ version: 'b', a: [1500, 60], b: [1000, 10], c: [700, 35], target: 35 }),
  ],
  'ready-mkt-senior': [
    mktPlan({
      version: 'a',
      budget: 20000,
      email: 2000,
      search: 12000,
      social: 6000,
      returns: [6, 4, 2.5],
    }),
    mktPlan({
      version: 'b',
      budget: 25000,
      email: 3000,
      search: 15000,
      social: 7000,
      returns: [5, 4, 2],
    }),
  ],
  'ready-data-practitioner': [
    dataDuplicates({
      version: 'a',
      duplicate: 'C-104',
      orders: [
        ['O-501', 'C-101', 4200],
        ['O-502', 'C-104', 1800],
        ['O-503', 'C-102', 3100],
        ['O-504', 'C-104', 600],
        ['O-505', 'C-103', 2500],
      ],
    }),
    dataDuplicates({
      version: 'b',
      duplicate: 'C-217',
      orders: [
        ['O-811', 'C-210', 5200],
        ['O-812', 'C-217', 2300],
        ['O-813', 'C-214', 1900],
        ['O-814', 'C-212', 3600],
        ['O-815', 'C-217', 900],
      ],
    }),
  ],
  'ready-data-senior': [
    dataTest({ version: 'a', visitors: 4000, control: 200, variant: 236, days: 2 }),
    dataTest({ version: 'b', visitors: 5000, control: 300, variant: 345, days: 3 }),
  ],
  'ready-dev-practitioner': [
    devDiscount({ version: 'a', total: 250, percent: 20, reported: [200, 10] }),
    devDiscount({ version: 'b', total: 400, percent: 15, reported: [300, 20] }),
  ],
  'ready-dev-senior': [
    devReview({ version: 'a', before: 800, after: 300, author: 'Jamie' }),
    devReview({ version: 'b', before: 1200, after: 420, author: 'Priyanka' }),
  ],
}

/** Every text with role names filled in for the career's department. */
function fillAll(def: Case): Case {
  const department = departmentFor(def.careerId)
  const walk = (v: unknown): unknown =>
    typeof v === 'string'
      ? fill(v, department)
      : Array.isArray(v)
        ? v.map(walk)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
          : v
  return walk(def) as Case
}

/** The versions of each assessment, by ID; each version is labelled "a", "b"… */
export const ASSESSMENT_VERSIONS: Record<string, Case[]> = Object.fromEntries(
  Object.entries(SOURCES).map(([id, versions]) => [
    id,
    versions.map((v) => fillAll(CaseSchema.parse(v))),
  ]),
)

export const VERSION_IDS = ['a', 'b'] as const

export const ASSESSMENTS: Case[] = Object.values(ASSESSMENT_VERSIONS).map((v) => v[0])

export function getAssessment(id: string, version = 'a'): Case | undefined {
  const versions = ASSESSMENT_VERSIONS[id]
  if (!versions) return undefined
  const index = VERSION_IDS.indexOf(version as (typeof VERSION_IDS)[number])
  return versions[index >= 0 ? index : 0]
}
