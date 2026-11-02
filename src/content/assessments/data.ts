/** Readiness assessments: data-analytics. */
import type { CaseInput } from '../cases/schema'
import { gbp, forms, assessment, report } from './shared'

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

export const ASSESSMENTS_DATA: Record<string, CaseInput[]> = {
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
}
