/**
 * Management and leadership: cases that only arrive at a career's top level.
 * The player now leads: delegating by strengths and capacity, reviewing a
 * team member's work, resolving disagreements and making fair, ethical
 * decisions, and giving constructive feedback.
 */
import type { CaseInput } from './schema'

const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks: good leadership, with a couple of things to think about.

${sender}`,
  pass: `Hi {name},

Thanks. Some of these calls need another look.

${sender}`,
  fail: `Hi {name},

I’m not comfortable with how this was handled. Let’s talk it through.

${sender}`,
})

const FEEDBACK_AVOID = [
  {
    terms: ['careless', 'lazy', 'useless', 'disappointed in you'],
    why: 'Criticise the work, never the person.',
  },
]

// ---------------------------------------------------------------------------
// Finance & Admin (Finance Officer)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Accounting (Senior Accountant)
// ---------------------------------------------------------------------------

const accLead: CaseInput = {
  id: 'lead-acc-review',
  version: 1,
  careerId: 'accounting',
  kind: 'leadership',
  minLevel: 4,
  title: 'Review the team’s work and settle a disagreement',
  summary: 'Two team members disagree about an accrual; another’s journal needs review.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'books-month-end-close' },
  deadlineHours: 8,
  email: {
    subject: 'Over to you: reviews and a disagreement',
    body: `Hi {name},

As Senior Accountant you now review the team’s journals and sort out disagreements. Ola has posted the insurance journal for your review, and Jay and Ola disagree about whether to accrue the March cleaning invoice. Can you handle both, and the quarter’s work allocation?

Daniel`,
  },
  whyItMatters:
    'Senior accountants are judged by the quality of the team’s work, not just their own. Reviewing carefully, deciding disagreements on the principles, and explaining why, is how a team improves.',
  objectives: [
    'Review a junior’s journal',
    'Decide a disagreement on principle',
    'Allocate work fairly',
  ],
  evidence: [
    {
      id: 'journal',
      title: 'Ola’s journal: annual insurance paid 1 March',
      table: {
        head: ['Account', 'Debit', 'Credit'],
        rows: [
          ['6700 Professional fees (insurance)', '£4,800', ''],
          ['1200 Bank', '', '£4,800'],
        ],
      },
    },
    {
      id: 'cleaning',
      title: 'The disagreement',
      text: 'Cleaning for March (£650) was done in March but the invoice will arrive in April. **Jay**: “Accrue it in March.” **Ola**: “Book it when the invoice arrives; that’s simpler.”',
    },
  ],
  steps: [
    {
      id: 'allocate',
      kind: 'assign',
      title: 'Allocate the quarter-end work',
      prompt: 'Give each piece of quarter-end work to the right person.',
      points: 10,
      members: [
        {
          id: 'ola',
          name: 'Ola Bakare',
          strengths: 'Junior; journals, learning accruals',
          capacity: 1,
        },
        {
          id: 'jay',
          name: 'Jay Patel',
          strengths: 'Reconciliations and VAT',
          capacity: 2,
        },
        {
          id: 'ruth',
          name: 'Ruth Adeyemi',
          strengths: 'Part-time bookkeeper; supplier statements',
          capacity: 1,
        },
      ],
      items: [
        {
          id: 'bank',
          label: 'Bank and credit card reconciliations',
          best: ['jay'],
          why: 'Reconciliations are Jay’s strength.',
        },
        {
          id: 'vat',
          label: 'The quarterly VAT return',
          best: ['jay'],
          why: 'Jay handles VAT.',
        },
        {
          id: 'statements',
          label: 'Supplier statement checks',
          best: ['ruth'],
          why: 'Ruth checks supplier statements.',
        },
        {
          id: 'journals',
          label: 'Routine month-end journals',
          best: ['ola'],
          why: 'Routine journals build Ola’s experience, with your review.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Ola’s journal',
      prompt: 'Which of these are true?',
      points: 20,
      findings: [
        {
          id: 'prepay',
          text: 'Eleven months of the insurance belong to later months and should be a prepayment.',
          issue: true,
          why: 'Only March’s £400 is a March cost; £4,400 is prepaid.',
        },
        {
          id: 'bank',
          text: 'The bank side of the journal is right.',
          issue: true,
          why: '£4,800 did leave the bank.',
        },
        {
          id: 'fine',
          text: 'Booking the whole year as a March cost is fine because it was paid in March.',
          issue: false,
          why: 'Costs belong to the period they relate to, not when they are paid.',
        },
      ],
    },
    {
      id: 'prepaid',
      kind: 'figure',
      title: 'The prepayment',
      prompt: 'How much should be moved to prepayments?',
      points: 15,
      answer: 4400,
      tolerance: 0.5,
      unit: '£',
      why: '£4,800 ÷ 12 = £400 a month; 11 months are prepaid: £4,400.',
    },
    {
      id: 'disagreement',
      kind: 'decide',
      title: 'Settle the disagreement',
      prompt: 'Who is right about the cleaning invoice, and how do you decide it?',
      points: 20,
      options: [
        {
          id: 'principle',
          label:
            'Accrue it in March, and explain the accruals principle to both so it’s a shared rule, not a win for Jay',
          verdict: 'best',
          why: 'The cost belongs to March; explaining the principle settles future cases too and keeps both on side.',
          effects: { trust: { senior: 2 } },
        },
        {
          id: 'simpler',
          label: 'Book it in April: simpler is better',
          verdict: 'poor',
          why: 'March’s profit would be overstated by £650.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'split',
          label: 'Ask them to agree between themselves',
          verdict: 'acceptable',
          why: 'Avoids taking sides, but there is a right answer and it’s your job to give it.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Ola',
      title: 'Feedback for Ola',
      prompt: 'Give Ola constructive feedback on the journal.',
      points: 35,
      minWords: 50,
      mentions: [
        ['prepayment', 'prepaid'],
        ['4,400', '4400'],
        ['good', 'thank', 'well'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Ola, thanks for posting the insurance journal so promptly; the bank side is spot on. One thing to change: the policy covers twelve months, so only £400 is a March cost. Please move the other £4,400 to prepayments, and release £400 each month. It is a really common one to miss, and once you have done it once it sticks. Happy to go through it together. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3, senior: 2 }, reputation: 4, indicators: { risk: -2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -4 },
  },
  replies: replies(
    'Daniel',
    'Exactly how I’d have handled it. Ola said it was the most useful feedback she’s had.',
  ),
  lapseLog: 'The team’s journals waited for review, and the disagreement simmered.',
  skills: { 'financial-reporting': 25, bookkeeping: 15 },
  xp: 150,
}

// ---------------------------------------------------------------------------
// IT Help Desk (Service Desk Lead)
// ---------------------------------------------------------------------------

const itLead: CaseInput = {
  id: 'lead-it-queue',
  version: 1,
  careerId: 'it-support',
  kind: 'leadership',
  minLevel: 4,
  title: 'Run the service desk for a week',
  summary:
    'Assign the week’s work, review an analyst’s ticket replies, and handle a complaint about a colleague.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'outage-triage' },
  deadlineHours: 8,
  email: {
    subject: 'The desk is yours this week',
    body: `Hi {name},

I’m at the suppliers’ conference all week, so you’re leading the desk. Please assign the week’s work, review Tom’s ticket replies (a user complained), and let me know how it goes.

Ravi`,
  },
  whyItMatters:
    'Service desk leads balance the queue, the team’s skills and its wellbeing, and protect the quality of what users hear. How they handle a complaint about a colleague shapes the whole team’s trust.',
  objectives: [
    'Assign work by skill and capacity',
    'Review a team member’s replies to users',
    'Handle a complaint about a colleague fairly',
  ],
  evidence: [
    {
      id: 'reply',
      title: 'Tom’s reply on INC-4410 (the complaint)',
      text: '“It’s a known issue. Restart your laptop.” (The user had already said they restarted twice. Ticket closed.)',
    },
    {
      id: 'complaint',
      title: 'The user’s complaint',
      text: '“Rude and unhelpful. He closed my ticket without reading it.”',
    },
  ],
  steps: [
    {
      id: 'assign',
      kind: 'assign',
      title: 'Assign the week’s work',
      prompt: 'Give each piece of work to the right person.',
      points: 25,
      members: [
        {
          id: 'tom',
          name: 'Tom Hughes',
          strengths: 'Fast at hardware fixes; brief with users',
          capacity: 2,
        },
        {
          id: 'maya',
          name: 'Nadia Okoye',
          strengths: 'Patient, great with users; learning networks',
          capacity: 1,
        },
        { id: 'ben', name: 'Ben Carter', strengths: 'Network specialist', capacity: 1 },
      ],
      items: [
        {
          id: 'vip',
          label: 'Set up the directors’ new laptops in person',
          best: ['maya'],
          why: 'Face-to-face work with senior users suits Nadia’s patience.',
        },
        {
          id: 'switch',
          label: 'Replace the floor 2 switch',
          best: ['ben'],
          why: 'Network hardware needs the specialist.',
        },
        {
          id: 'hardware',
          label: 'Clear the hardware repair backlog',
          best: ['tom'],
          why: 'Tom is fastest at hardware fixes.',
        },
        {
          id: 'printers',
          label: 'Swap the toner and drums on four printers',
          best: ['tom'],
          why: 'Quick hardware jobs suit Tom.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Tom’s reply',
      prompt: 'Which of these are real problems with how INC-4410 was handled?',
      points: 25,
      findings: [
        {
          id: 'read',
          text: 'The reply ignored that the user had already restarted twice.',
          issue: true,
          why: 'It shows the ticket wasn’t read.',
        },
        {
          id: 'closed',
          text: 'The ticket was closed without the user confirming it was fixed.',
          issue: true,
          why: 'Tickets close when the user agrees it’s fixed.',
        },
        {
          id: 'known',
          text: 'Saying it’s a known issue was wrong in itself.',
          issue: false,
          why: 'Telling users about a known issue is helpful if you also say what happens next.',
        },
      ],
    },
    {
      id: 'complaint',
      kind: 'decide',
      title: 'The complaint about Tom',
      prompt: 'How do you handle it?',
      points: 20,
      options: [
        {
          id: 'private',
          label:
            'Reopen the ticket and help the user today, then talk to Tom privately about the reply, with the facts',
          verdict: 'best',
          why: 'The user is helped first, and Tom gets fair, private, specific feedback.',
          effects: { indicators: { satisfaction: 3 } },
        },
        {
          id: 'public',
          label: 'Share the complaint in the team chat as an example of what not to do',
          verdict: 'poor',
          why: 'Public criticism humiliates a colleague and makes the whole team defensive.',
          effects: { reputation: -2 },
        },
        {
          id: 'ignore',
          label: 'Ignore it: Tom is the fastest fixer on the team',
          verdict: 'poor',
          why: 'Speed doesn’t excuse how users are treated, and the user still isn’t helped.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Tom Hughes',
      title: 'Feedback for Tom',
      prompt: 'Give Tom constructive, specific feedback.',
      points: 30,
      minWords: 50,
      mentions: [
        ['fast', 'quick', 'good at'],
        ['read', 'restarted'],
        ['close', 'confirm'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Tom, thanks for clearing so much of the hardware backlog; you are the quickest fixer on the team. One thing I would like you to work on: on INC-4410 the user had already restarted twice, so the reply missed what she had told us, and the ticket was closed before she confirmed it was fixed. Please read the whole ticket first and only close it once the user agrees. Shall we look at a couple of replies together on Thursday? {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { satisfaction: 2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -4, indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Ravi',
    'Great week. The user complaint turned into a thank-you, and Tom has asked to do more user-facing work.',
  ),
  lapseLog: 'The desk drifted without direction while Ravi was away.',
  skills: { 'incident-management': 25, 'customer-service': 20 },
  xp: 150,
}

// ---------------------------------------------------------------------------
// Digital Marketing (Digital Marketing Manager)
// ---------------------------------------------------------------------------

const mktLead: CaseInput = {
  id: 'lead-mkt-team',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'leadership',
  minLevel: 4,
  title: 'Share out the campaigns and review a draft',
  summary:
    'Allocate next quarter’s campaigns, review a junior’s ad copy and handle a request about credit.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'launch-analytics' },
  deadlineHours: 8,
  email: {
    subject: 'Your team’s campaigns for next quarter',
    body: `Hi {name},

As Marketing Manager you now run the campaign team. Please allocate next quarter’s campaigns, review Jade’s ad copy before it goes live, and decide on Leo’s request about the award entry.

Sofia`,
  },
  whyItMatters:
    'Marketing managers succeed through their team: the right campaigns for the right people, copy that is accurate and legal, and fair credit for the people who did the work.',
  objectives: [
    'Allocate campaigns by strengths and capacity',
    'Review copy for accuracy and rules',
    'Give credit fairly',
  ],
  evidence: [
    {
      id: 'copy',
      title: 'Jade’s ad copy (draft)',
      text: '“The UK’s No. 1 cash-flow service. Guaranteed savings of 30%! Book a free Health Check today.”',
    },
    {
      id: 'facts',
      title: 'What we can prove',
      text: 'No ranking data exists. Clients saved between 5% and 30%, average 12%. The Health Check is free.',
    },
    {
      id: 'award',
      title: 'Leo’s request',
      text: 'Leo asks to enter the spring campaign for an industry award under his name only. Jade wrote most of the winning copy.',
    },
  ],
  steps: [
    {
      id: 'allocate',
      kind: 'assign',
      title: 'Allocate the campaigns',
      prompt: 'Give each campaign to the right person.',
      points: 25,
      members: [
        {
          id: 'leo',
          name: 'Leo Hart',
          strengths: 'Paid search and budgets',
          capacity: 2,
        },
        {
          id: 'jade',
          name: 'Jade Thompson',
          strengths: 'Copy and social media; junior',
          capacity: 1,
        },
        { id: 'sana', name: 'Sana Iqbal', strengths: 'Email and analytics', capacity: 1 },
      ],
      items: [
        {
          id: 'search',
          label: 'Summer search campaign',
          best: ['leo'],
          why: 'Paid search is Leo’s strength.',
        },
        {
          id: 'budget',
          label: 'Quarterly budget tracking',
          best: ['leo'],
          why: 'Leo manages budgets.',
        },
        {
          id: 'social',
          label: 'Social launch posts',
          best: ['jade'],
          why: 'Social copy suits Jade.',
        },
        {
          id: 'newsletter',
          label: 'Client newsletter with results',
          best: ['sana'],
          why: 'Email and analytics are Sana’s strengths.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Jade’s copy',
      prompt: 'Which claims must change before it goes live?',
      points: 25,
      findings: [
        {
          id: 'no1',
          text: '“The UK’s No. 1 cash-flow service”',
          issue: true,
          why: 'There is no evidence for the ranking: it can’t be claimed.',
        },
        {
          id: 'guarantee',
          text: '“Guaranteed savings of 30%”',
          issue: true,
          why: 'Savings ranged from 5% to 30% and aren’t guaranteed: misleading.',
        },
        {
          id: 'free',
          text: '“Book a free Health Check today”',
          issue: false,
          why: 'True: the Health Check is free.',
        },
      ],
    },
    {
      id: 'credit',
      kind: 'decide',
      title: 'The award entry',
      prompt: 'What do you say to Leo?',
      points: 20,
      options: [
        {
          id: 'team',
          label: 'Enter it as a team entry, naming Jade and Leo for their parts',
          verdict: 'best',
          why: 'Credit goes to the people who did the work; that is what keeps a team motivated.',
          effects: { reputation: 2 },
        },
        {
          id: 'leo-only',
          label: 'Let Leo enter under his name: he’s more senior',
          verdict: 'poor',
          why: 'Taking credit for a junior’s work is unfair and destroys trust.',
          effects: { reputation: -3 },
        },
        {
          id: 'no-entry',
          label: 'Don’t enter at all to avoid the issue',
          verdict: 'acceptable',
          why: 'Avoids unfairness, but loses deserved recognition for the team.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Jade Thompson',
      title: 'Feedback for Jade',
      prompt: 'Give Jade constructive feedback on the copy.',
      points: 30,
      minWords: 50,
      mentions: [
        ['energy', 'great', 'good', 'love'],
        ['No. 1', 'number one', 'ranking'],
        ['guarantee'],
        ['12%', 'up to 30%', 'average'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Jade, I love the energy in this copy, and the call to book a free Health Check is spot on. Two claims need to change before it goes live: we can’t say “No. 1” because we have no ranking evidence, and savings aren’t guaranteed, so “guaranteed 30%” would mislead. Try “clients save 12% on average, and up to 30%”. Send me the next draft whenever you’re ready. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4 },
    fail: { reputation: -1 },
    lapse: { reputation: -4 },
  },
  replies: replies(
    'Sofia',
    'The team entry won the award. Jade was over the moon, and the copy is live and accurate.',
  ),
  lapseLog: 'Next quarter’s campaigns started late, with no one assigned.',
  skills: { 'content-strategy': 25, copywriting: 20 },
  xp: 150,
}

// ---------------------------------------------------------------------------
// Data Analysis (Lead Data Analyst)
// ---------------------------------------------------------------------------

const dataLead: CaseInput = {
  id: 'lead-data-team',
  version: 1,
  careerId: 'data-analytics',
  kind: 'leadership',
  minLevel: 4,
  title: 'Prioritise the team’s requests and review an analysis',
  summary:
    'Too many requests, too few analysts. Prioritise, review a junior’s analysis and give feedback.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'churn-clean' },
  deadlineHours: 8,
  email: {
    subject: 'The team’s work queue',
    body: `Hi {name},

As Lead Analyst you now run the team’s queue. Four requests are waiting and we have three analysts this week. Please allocate them, review Priyanka’s first analysis before it goes to Operations, and give her feedback.

Amara`,
  },
  whyItMatters:
    'Data teams always have more requests than people. Leads decide what matters most, match work to people, and protect the quality of what leaves the team.',
  objectives: [
    'Allocate analysts to requests',
    'Review an analysis for errors',
    'Coach a new analyst',
  ],
  evidence: [
    {
      id: 'analysis',
      title: 'Priyanka’s analysis: “Training made staff 18% more productive”',
      text: 'Compared output of staff who attended training with those who didn’t. Attenders chose to attend. Sample: 14 attenders, 6 non-attenders. Clear charts and well-commented SQL.',
    },
  ],
  steps: [
    {
      id: 'allocate',
      kind: 'assign',
      title: 'Allocate the requests',
      prompt: 'Give each request to the right analyst.',
      points: 25,
      members: [
        {
          id: 'priyanka',
          name: 'Priyanka Shah',
          strengths: 'New; strong SQL, learning statistics',
          capacity: 1,
        },
        {
          id: 'owen',
          name: 'Owen Bell',
          strengths: 'Statistics and experiments',
          capacity: 1,
        },
        {
          id: 'leah',
          name: 'Leah Moss',
          strengths: 'Dashboards; works with the board',
          capacity: 2,
        },
      ],
      items: [
        {
          id: 'board',
          label: 'Board KPI dashboard refresh (due tomorrow)',
          best: ['leah'],
          why: 'Leah builds the board dashboards and knows what they need.',
        },
        {
          id: 'experiment',
          label: 'Design the pricing experiment',
          best: ['owen'],
          why: 'Experiments need statistics expertise.',
        },
        {
          id: 'extract',
          label: 'Customer data extract for Sales',
          best: ['priyanka'],
          why: 'A well-defined SQL task suits a new analyst with strong SQL.',
        },
        {
          id: 'dash2',
          label: 'Delivery dashboard tweaks',
          best: ['leah'],
          why: 'More dashboard work for Leah, who has room for two.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Priyanka’s analysis',
      prompt: 'Which of these are real problems with the conclusion?',
      points: 30,
      findings: [
        {
          id: 'selection',
          text: 'Staff chose to attend, so attenders may have been more productive anyway.',
          issue: true,
          why: 'Self-selection means the comparison can’t show the training caused the difference.',
        },
        {
          id: 'sample',
          text: 'Six non-attenders is too few to support a precise 18%.',
          issue: true,
          why: 'Small samples make precise figures misleading.',
        },
        {
          id: 'charts',
          text: 'The charts and SQL are poor.',
          issue: false,
          why: 'They are clear and well commented: worth praising.',
        },
      ],
    },
    {
      id: 'scope',
      kind: 'decide',
      title: 'What goes to Operations',
      prompt: 'Operations wants the result today. What do you do?',
      points: 15,
      options: [
        {
          id: 'reframe',
          label:
            'Send it today as an early indication with the limits stated, and offer a proper comparison next month',
          verdict: 'best',
          why: 'Operations gets something useful today without a claim the data can’t support.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'send',
          label: 'Send it as it is: it’s a positive story',
          verdict: 'poor',
          why: 'An unsupported 18% could drive real spending decisions.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'hold',
          label: 'Hold it until it can be redone properly',
          verdict: 'acceptable',
          why: 'Safe, but an honest early indication is more useful than nothing.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Priyanka Shah',
      title: 'Feedback for Priyanka',
      prompt: 'Give Priyanka constructive feedback that helps her grow.',
      points: 30,
      minWords: 50,
      mentions: [
        ['charts', 'SQL'],
        ['chose', 'self-selection', 'choose'],
        ['sample'],
        ['help', 'together', 'show you'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Priyanka, great first analysis: the charts are clear and your SQL is beautifully commented. One thing to learn from: staff chose whether to attend, so attenders may have been more productive anyway, and with only six non-attenders the sample is too small for a precise 18%. Let’s send Operations an early indication with those limits, and next week I will show you how we can design a fairer comparison together. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { risk: -2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -4 },
  },
  replies: replies(
    'Amara',
    'The board dashboard was on time, and Priyanka said your feedback was the best she’s had. That’s leadership.',
  ),
  lapseLog: 'The team’s requests piled up without priorities.',
  skills: { 'insight-communication': 25, 'data-analysis': 15 },
  xp: 150,
}

// ---------------------------------------------------------------------------
// Software Development (Lead Developer)
// ---------------------------------------------------------------------------

const devLead: CaseInput = {
  id: 'lead-dev-team',
  version: 1,
  careerId: 'software-development',
  kind: 'leadership',
  minLevel: 4,
  title: 'Plan the sprint and review a pull request',
  summary:
    'Plan the sprint with the team’s capacity, review a junior’s code change and handle a disagreement.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'mileage-tests' },
  deadlineHours: 8,
  email: {
    subject: 'Sprint planning is yours',
    body: `Hi {name},

As Lead Developer you now plan the sprint. Please assign the work, review Aisha’s pull request for the invoice export, and settle the testing argument between Kai and Aisha.

Samuel`,
  },
  whyItMatters:
    'Lead developers multiply the team: planning within real capacity, reviewing code to raise quality without crushing people, and setting standards everyone agrees with.',
  objectives: [
    'Plan work within capacity',
    'Review a pull request constructively',
    'Set a team standard fairly',
  ],
  evidence: [
    {
      id: 'pr',
      title: 'Aisha’s pull request: invoice export',
      text: 'Adds CSV export of invoices. Clear function names. **No tests.** Builds the CSV by joining fields with commas, so a client name like “Smith, Jones & Co” breaks the columns. Uses the existing date helper correctly.',
    },
    {
      id: 'argument',
      title: 'The disagreement',
      text: '**Kai**: “Every pull request must have tests.” **Aisha**: “Tests slow us down; we can test by hand.”',
    },
  ],
  steps: [
    {
      id: 'plan',
      kind: 'assign',
      title: 'Plan the sprint',
      prompt: 'Give each item to the right developer.',
      points: 25,
      members: [
        {
          id: 'kai',
          name: 'Kai Morgan',
          strengths: 'Senior; payments and security',
          capacity: 2,
        },
        {
          id: 'aisha',
          name: 'Aisha Rahman',
          strengths: 'Junior; front-end, learning testing',
          capacity: 1,
        },
        {
          id: 'noah',
          name: 'Noah Wells',
          strengths: 'Databases and performance',
          capacity: 1,
        },
      ],
      items: [
        {
          id: 'payments',
          label: 'Online payments integration',
          best: ['kai'],
          why: 'Payments need the most experienced developer.',
        },
        {
          id: 'security',
          label: 'Fix the login rate-limit issue',
          best: ['kai'],
          why: 'Security work suits Kai.',
        },
        {
          id: 'query',
          label: 'Speed up the slow reports query',
          best: ['noah'],
          why: 'Database performance is Noah’s strength.',
        },
        {
          id: 'ui',
          label: 'Booking form improvements',
          best: ['aisha'],
          why: 'Front-end work suits Aisha.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review the pull request',
      prompt: 'Which of these should be fixed before merging?',
      points: 30,
      findings: [
        {
          id: 'tests',
          text: 'There are no tests for the export.',
          issue: true,
          why: 'Without tests, the next change could break exports silently.',
        },
        {
          id: 'commas',
          text: 'Names containing commas break the CSV columns.',
          issue: true,
          why: 'CSV fields with commas must be quoted.',
        },
        {
          id: 'names',
          text: 'The function names are unclear.',
          issue: false,
          why: 'They are clear: say so in the review.',
        },
      ],
    },
    {
      id: 'standard',
      kind: 'decide',
      title: 'The testing disagreement',
      prompt: 'How do you settle it?',
      points: 15,
      options: [
        {
          id: 'agree',
          label:
            'Agree a team standard together: tests for every change to business logic, with pairing to help anyone new to testing',
          verdict: 'best',
          why: 'A standard the team agrees on sticks, and pairing makes it achievable.',
          effects: { reputation: 2 },
        },
        {
          id: 'kai-wins',
          label: 'Tell Aisha Kai is right and move on',
          verdict: 'acceptable',
          why: 'The outcome is right, but imposing it without support leaves Aisha behind.',
        },
        {
          id: 'manual',
          label: 'Allow manual testing to keep things fast',
          verdict: 'poor',
          why: 'Bugs like the comma problem reach clients when testing is skipped.',
          effects: { indicators: { risk: 3 } },
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Aisha Rahman',
      title: 'Review comments for Aisha',
      prompt: 'Write your review: what’s good, what to fix, and how you’ll help.',
      points: 30,
      minWords: 50,
      mentions: [
        ['clear', 'good', 'nice'],
        ['test'],
        ['comma', 'quote'],
        ['pair', 'help', 'together'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Aisha, nice work on the export: the function names are clear and you used the date helper exactly right. Two things before we merge: names with commas, like “Smith, Jones & Co”, break the columns, so fields need quoting; and please add tests, including one for a name with a comma, so it can’t break again. Happy to pair on the tests this afternoon if that helps. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { risk: -2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -4 },
  },
  replies: replies(
    'Samuel',
    'A well-planned sprint, and the team has adopted the testing standard. Aisha’s export now has its first tests.',
  ),
  lapseLog: 'The sprint started without a plan.',
  skills: { 'software-design': 25, 'software-testing': 20 },
  xp: 150,
}

export const LEADERSHIP_CASES: CaseInput[] = [
  faLead,
  accLead,
  itLead,
  mktLead,
  dataLead,
  devLead,
]
