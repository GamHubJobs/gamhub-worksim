/** Leadership cases: office-admin-finance. */
import type { CaseInput } from '../schema'
import { replies, FEEDBACK_AVOID } from './shared'

const faLead: CaseInput = {
  id: 'lead-fa-month-end',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'leadership',
  minLevel: 4,
  title: 'Lead the team through month-end',
  summary: 'Delegate month-end work, review a junior’s reconciliation and give feedback.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'budget-consolidate' },
  deadlineHours: 8,
  email: {
    subject: 'Month-end: over to you',
    body: `Hi {name},

As Finance Officer you’re leading the team through month-end for the first time. Please share out the work, check Sam’s petty cash reconciliation before it goes to the auditors, and give him feedback. I’m on leave until Monday, so it’s your call.

Priya`,
  },
  whyItMatters:
    'Leaders get work done through others: matching work to people’s strengths and time, checking quality without taking over, and giving feedback that helps people grow.',
  objectives: [
    'Delegate by strengths and capacity',
    'Review a team member’s work',
    'Give constructive feedback',
  ],
  evidence: [
    {
      id: 'rec',
      title: 'Sam’s petty cash reconciliation',
      table: {
        head: ['Line', 'Amount'],
        rows: [
          ['Float at start', '£200.00'],
          ['Receipts (12)', '£143.60'],
          ['Cash counted', '£50.40'],
          ['Difference', '£6.00 (marked “rounding”)'],
          ['Receipt for £18 taxi', 'Missing (“will find it”)'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'delegate',
      kind: 'assign',
      title: 'Share out the month-end work',
      prompt: 'Give each piece of work to the right person.',
      points: 30,
      members: [
        {
          id: 'marcus',
          name: 'Marcus Webb',
          strengths: 'Experienced; supplier payments and accruals',
          capacity: 2,
        },
        {
          id: 'sam',
          name: 'Sam Fletcher',
          strengths: 'New; careful with checklists, learning reconciliations',
          capacity: 1,
        },
        {
          id: 'hannah',
          name: 'Hannah Lin',
          strengths: 'Office manager; expenses and staff queries',
          capacity: 1,
        },
      ],
      items: [
        {
          id: 'accruals',
          label: 'Post the month-end accruals',
          best: ['marcus'],
          why: 'Accruals need judgement: give them to the most experienced person.',
        },
        {
          id: 'payments',
          label: 'Final supplier payment run',
          best: ['marcus'],
          why: 'Marcus runs supplier payments.',
        },
        {
          id: 'expenses',
          label: 'Chase missing expense receipts',
          best: ['hannah'],
          why: 'Hannah handles expenses and staff queries.',
        },
        {
          id: 'checklist',
          label: 'Work through the month-end checklist',
          best: ['sam'],
          why: 'A structured checklist suits someone careful who is learning.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Sam’s reconciliation',
      prompt: 'Which of these are real problems?',
      points: 30,
      findings: [
        {
          id: 'difference',
          text: 'A £6 difference is labelled “rounding”.',
          issue: true,
          why: 'Cash doesn’t round: £6 is a real difference to find, not to explain away.',
        },
        {
          id: 'receipt',
          text: 'An £18 receipt is missing.',
          issue: true,
          why: 'Every payment needs its receipt before the auditors see it.',
        },
        {
          id: 'float',
          text: 'The float at the start is £200.',
          issue: false,
          why: 'That is the agreed float.',
        },
      ],
    },
    {
      id: 'fair',
      kind: 'decide',
      title: 'Overtime',
      prompt:
        'Marcus offers to work the weekend to finish everything himself. What do you do?',
      points: 15,
      options: [
        {
          id: 'share',
          label:
            'Thank him, but keep the work shared so nobody works the weekend; ask him to coach Sam on the reconciliation',
          verdict: 'best',
          why: 'It protects Marcus’s wellbeing and builds Sam’s skills: a team, not a hero.',
          effects: { trust: { senior: 2 } },
        },
        {
          id: 'accept',
          label: 'Accept: it gets it done',
          verdict: 'acceptable',
          why: 'It works once, but relying on one person’s weekends burns people out and teaches nobody.',
        },
        {
          id: 'insist',
          label: 'Tell him weekend work is expected at month-end',
          verdict: 'poor',
          why: 'Unpaid pressure to work weekends is unfair and drives good people away.',
          effects: { trust: { senior: -3 } },
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Sam Fletcher',
      title: 'Feedback for Sam',
      prompt:
        'Give Sam constructive feedback: what was good, what to fix, and how you’ll help.',
      points: 25,
      minWords: 50,
      mentions: [
        ['good', 'well done', 'thank'],
        ['£6', 'difference'],
        ['receipt'],
        ['help', 'show you', 'together'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Sam, thanks for getting the petty cash reconciliation done so quickly; the layout is clear and the receipts are well organised. Two things to fix before it goes to the auditors: the £6 difference needs finding rather than calling it rounding, because cash doesn’t round, and the £18 taxi receipt needs to be attached. Marcus will go through the count with you tomorrow, and I am happy to help too. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3, senior: 2 }, reputation: 4 },
    fail: { reputation: -1 },
    lapse: { reputation: -4, trust: { manager: -2 } },
  },
  replies: replies(
    'Priya',
    'Back from leave to a finished month-end and a team that’s still smiling. Sam found the £6 too. Thank you.',
  ),
  lapseLog: 'Month-end slipped while the team waited for direction.',
  skills: { 'finance-basics': 25, accuracy: 15 },
  xp: 150,
}

export const LEADERSHIP_FINANCE: CaseInput[] = [faLead]
