/** Readiness assessments: office-admin-finance. */
import type { CaseInput } from '../cases/schema'
import { gbp, forms, assessment, report } from './shared'

/** Level 2: expense claims against policy. */
function faClaims(p: {
  version: string
  practical: string
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
    practical: p.practical,
    id: 'ready-fa-practitioner',
    careerId: 'office-admin-finance',
    level: 2,
    title: 'Readiness assessment: process the expense claims',
    summary:
      'Review this week’s expense claims against policy, pay what is due and report.',
    brief: `This assessment checks that you can process expenses accurately and independently.

Review the five claims against the expenses policy, work out what to pay, decide what to do about the problems, write a short expenses report in Word Craft, and tell {manager} what you have done. You have 3 hours.`,
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
  practical: string
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
    practical: p.practical,
    id: 'ready-fa-senior',
    careerId: 'office-admin-finance',
    level: 3,
    title: 'Readiness assessment: the quarterly budget report',
    summary:
      'Report the department’s spending against budget, with a forecast and recommendations.',
    brief: `This assessment checks that you can monitor a budget and advise on it.

Analyse the department’s spending, forecast the quarter end including commitments, decide what to recommend, write the budget report in Word Craft, and brief the department head. You have 3 hours.`,
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

export const ASSESSMENTS_FINANCE: Record<string, CaseInput[]> = {
  'ready-fa-practitioner': [
    faClaims({
      version: 'a',
      practical: 'budget-report',
      meal: 32,
      miles: 120,
      train: 48,
      names: ['Ana Ruiz', 'Ben Cole', 'Kate Moss', 'Raj Patel'],
    }),
    faClaims({
      version: 'b',
      practical: 'petty-cash',
      meal: 38,
      miles: 90,
      train: 56,
      names: ['Lucy Ford', 'Omar Haddad', 'Zoe Baker', 'Ian Reed'],
    }),
  ],
  'ready-fa-senior': [
    faBudget({
      version: 'a',
      practical: 'savings-proposal',
      travel: 7800,
      events: 2400,
      booked: 2000,
    }),
    faBudget({
      version: 'b',
      practical: 'payment-run',
      travel: 8200,
      events: 1900,
      booked: 1800,
    }),
  ],
}
