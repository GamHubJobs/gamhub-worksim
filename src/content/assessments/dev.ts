/** Readiness assessments: software-development. */
import type { CaseInput } from '../cases/schema'
import { assessment, report } from './shared'

/** Level 2: a discount bug, its tests and its fix. */
function devDiscount(p: {
  version: string
  practical: string
  total: number
  percent: number
  reported: [number, number]
}) {
  const expected = (p.total * (100 - p.percent)) / 100
  const [rt, rp] = p.reported
  const right = (rt * (100 - rp)) / 100
  return assessment({
    practical: p.practical,
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
  practical: string
  before: number
  after: number
  author: string
}) {
  const reduction = Math.round(((p.before - p.after) / p.before) * 1000) / 10
  return assessment({
    practical: p.practical,
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

export const ASSESSMENTS_DEV: Record<string, CaseInput[]> = {
  'ready-dev-practitioner': [
    devDiscount({
      version: 'a',
      practical: 'working-days-tests',
      total: 250,
      percent: 20,
      reported: [200, 10],
    }),
    devDiscount({
      version: 'b',
      practical: 'debug-nan',
      total: 400,
      percent: 15,
      reported: [300, 20],
    }),
  ],
  'ready-dev-senior': [
    devReview({
      version: 'a',
      practical: 'billing-report',
      before: 800,
      after: 300,
      author: 'Jamie',
    }),
    devReview({
      version: 'b',
      practical: 'api-testing',
      before: 1200,
      after: 420,
      author: 'Priyanka',
    }),
  ],
}
