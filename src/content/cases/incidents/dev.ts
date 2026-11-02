/** Incidents cases: software-development. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const devReport: CaseInput = {
  id: 'inc-dev-wrong-report',
  version: 1,
  careerId: 'software-development',
  kind: 'incident',
  minLevel: 3,
  title: 'A client says our report is wrong',
  summary:
    'Harbour Foods’ monthly usage report double-counts some days. Investigate and put it right.',
  from: { name: 'Martin Ellis', role: 'Finance Manager', organisation: 'Harbour Foods' },
  trigger: { afterAssignment: 'billing-report' },
  deadlineHours: 4,
  email: {
    subject: 'Your monthly report is wrong',
    body: `Hello,

Your system’s usage report for March shows **33 days** of usage and charges us for them. March has 31 days. We’re not paying until this is explained.

Martin Ellis
Harbour Foods`,
  },
  whyItMatters:
    'Bugs that reach clients’ bills damage trust fast. Finding the root cause, fixing it for everyone affected and explaining it honestly is what professional engineering teams do.',
  objectives: [
    'Find the root cause of a reporting bug',
    'Fix it for every affected client',
    'Explain it to a client honestly',
  ],
  evidence: [
    {
      id: 'data',
      title: 'Usage records for Harbour Foods, March',
      text: 'Days 30 and 31 March appear twice: once as UTC and once as UK summer time, after the clocks changed on 30 March.',
    },
    {
      id: 'scope',
      title: 'Other clients',
      text: '11 clients had usage on 30–31 March; all their reports have the same duplication.',
    },
  ],
  steps: [
    {
      id: 'cause',
      kind: 'review',
      title: 'The root cause',
      prompt: 'Which of these are true?',
      points: 25,
      findings: [
        {
          id: 'dst',
          text: 'The report groups days by local time and UTC inconsistently, so days after the clock change are counted twice.',
          issue: true,
          why: 'The duplicated days are exactly those after the clocks changed.',
        },
        {
          id: 'others',
          text: 'Other clients are affected too.',
          issue: true,
          why: 'All 11 clients with usage on those days have the same duplication.',
        },
        {
          id: 'client-data',
          text: 'Harbour Foods entered their usage twice.',
          issue: false,
          why: 'Usage is recorded by our system, not entered by clients.',
        },
      ],
    },
    {
      id: 'fix',
      kind: 'decide',
      title: 'Put it right',
      prompt: 'What do you do?',
      points: 40,
      options: [
        {
          id: 'all',
          label:
            'Fix the date grouping with a test for clock changes, regenerate all 11 reports, credit the overcharges and tell every affected client',
          verdict: 'best',
          why: 'Every client is put right, not just the one who noticed, and the test stops it coming back.',
          effects: { indicators: { satisfaction: 4, risk: -4 } },
        },
        {
          id: 'one',
          label: 'Correct Harbour Foods’ report and invoice',
          verdict: 'poor',
          why: 'Ten other clients would still be overcharged without knowing.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'manual',
          label: 'Fix the reports by hand each month around clock changes',
          verdict: 'poor',
          why: 'A manual fix will be forgotten; the bug must be fixed in the code.',
          effects: { indicators: { risk: 3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Martin Ellis, Harbour Foods',
      title: 'Reply to the client',
      prompt: 'Apologise, explain the cause simply and say what happens now.',
      points: 35,
      minWords: 50,
      mentions: [
        ['sorry', 'apologise', 'apologies'],
        ['clock', 'summer time'],
        ['31 days', 'corrected'],
        ['credit'],
      ],
      avoid: [{ terms: ['your data', 'your mistake'], why: 'The bug was ours.' }],
      model:
        'Dear Martin, you are right, and I am sorry. A bug in our report counted the days after the clocks changed on 30 March twice, so your report showed 33 days instead of 31. We have fixed the bug and added a test so it cannot happen again, and you will receive a corrected report and a credit for the overcharge this week. Thank you for raising it. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -3 } },
    lapse: { reputation: -3, indicators: { satisfaction: -5 } },
  },
  replies: replies(
    'Martin',
    'Thank you for the clear explanation and the credit. We’ve paid the corrected invoice.',
  ),
  lapseLog:
    'Harbour Foods withheld payment: nobody answered their complaint about the report.',
  skills: { debugging: 30, 'software-testing': 20 },
  xp: 120,
}

export const INCIDENT_DEV: CaseInput[] = [devReport]
