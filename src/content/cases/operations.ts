/**
 * Business operations cases (one per career, from the second level): budgets,
 * purchase requests, approvals, suppliers and corrective action. Approval
 * decisions are not fixed answers: each request is judged against policy, the
 * player's approval limit and the department's remaining budget (see
 * `expectedDecision` in `game/cases.ts`).
 */
import type { CaseInput } from './schema'

const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks, that’s mostly sorted. A couple of points to tidy up; see the notes.

${sender}`,
  pass: `Hi {name},

Thanks. Some of these decisions need another look.

${sender}`,
  fail: `Hi {name},

Several of these decisions aren’t right. Let’s go through them together.

${sender}`,
})

const finance: CaseInput = {
  id: 'ops-fa-purchases',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'operations',
  minLevel: 2,
  title: 'This week’s purchase requests',
  summary:
    'Five purchase requests are waiting for a decision, and one requester needs an answer.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'budget-report' },
  deadlineHours: 7,
  email: {
    subject: 'Purchase requests for you to decide',
    body: `Hi {name},

From this week you approve purchase requests up to your limit. Five are waiting in the queue. For each one: **approve** it if it is within policy, your limit and the department’s remaining budget; **reject** it if it breaks the policy; **escalate** it to me if it is above your limit or the budget.

Then let Ben know about his request, kindly.

Priya`,
  },
  whyItMatters:
    'Approvals are how organisations control spending. Applying the same rules to everyone, staying within your authority and explaining decisions kindly keeps money safe without slowing the business down.',
  objectives: [
    'Apply the purchasing policy',
    'Stay within your approval limit and the budget',
    'Explain a refusal helpfully',
  ],
  evidence: [
    {
      id: 'policy',
      title: 'Purchasing policy (extract)',
      text: 'Company money is **not** spent on alcohol. Personal items are not company purchases. Purchases over **£1,000** need **two quotes**. Requests above your approval limit, or above the department’s remaining budget, go to the budget holder.',
    },
  ],
  steps: [
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Decide each request',
      prompt: 'Approve, reject or escalate each request.',
      points: 60,
      requests: [
        {
          id: 'stationery',
          summary: 'Stationery restock (Facilities)',
          department: 'finance',
          amount: 180,
          why: 'Routine supplies within policy.',
        },
        {
          id: 'chair',
          summary: 'Ergonomic chair (medical note attached)',
          department: 'people',
          amount: 420,
          why: 'A reasonable adjustment, within policy.',
        },
        {
          id: 'wine',
          summary: 'Team celebration: dinner and wine',
          department: 'operations',
          amount: 350,
          policyBreach: 'Company money is not spent on alcohol.',
          why: '',
        },
        {
          id: 'printer',
          summary: 'Replacement printer, two quotes attached',
          department: 'finance',
          amount: 1450,
          why: 'Within policy, with quotes.',
        },
        {
          id: 'tablet',
          summary: 'Tablet for a manager’s home use',
          department: 'operations',
          amount: 480,
          policyBreach: 'Personal items are not company purchases.',
          why: '',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Ben Adeyemi, Operations',
      title: 'Tell Ben about the team dinner',
      prompt:
        'Explain why the dinner request can’t be approved as it is, and what he can do.',
      points: 40,
      minWords: 40,
      mentions: [['alcohol', 'wine'], ['policy'], ['resubmit', 'without', 'food']],
      avoid: [
        {
          terms: ['you should know', 'obviously'],
          why: 'Be kind: the rule isn’t well known.',
        },
      ],
      model:
        'Hi Ben, thanks for organising a celebration for the team. I can’t approve this request as it is, because the purchasing policy doesn’t allow company money to be spent on alcohol. If you resubmit it for the meal without the wine, I will approve it straight away. Sorry I can’t do more! {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { indicators: { satisfaction: -3, discipline: -2 } },
  },
  replies: replies(
    'Priya',
    'Spot on: the right ones approved, the rest rejected or sent to me with the reasons. Ben has resubmitted without the wine.',
  ),
  lapseLog:
    'Purchase requests waited all week for a decision: the requesters complained to {manager}.',
  skills: { 'finance-basics': 30, accuracy: 20 },
  xp: 90,
}

const accounting: CaseInput = {
  id: 'ops-acc-payment-run',
  version: 1,
  careerId: 'accounting',
  kind: 'operations',
  minLevel: 2,
  title: 'Approve the payment run, and spot the fraud',
  summary: 'Four supplier payments are ready. Two of them should not be paid.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'depreciation-schedule' },
  deadlineHours: 6,
  email: {
    subject: 'Payment run: your approval please',
    body: `Hi {name},

The weekly payment run is ready for approval. Please check each payment before it goes: **approve**, **reject** (it should not be paid) or **escalate** (it needs me).

Daniel`,
  },
  whyItMatters:
    'Payment runs are where companies lose money to duplicates and fraud. Checking every payment against the ledger, and never trusting bank details changed by email, are basic controls every accountant applies.',
  objectives: [
    'Check payments against the ledger before they go',
    'Recognise duplicate payments and payment fraud',
    'Stay within your authority',
  ],
  evidence: [
    {
      id: 'run',
      title: 'Payment run, Friday',
      table: {
        head: ['Supplier', 'Invoice', 'Amount', 'Notes'],
        rows: [
          ['Meadow Office Supplies', 'MOS-2310', '£264', 'Approved invoice'],
          [
            'Clearline Telecom',
            'CL-88410',
            '£3,200',
            'Paid on 3 March (same invoice number)',
          ],
          [
            'Ferris & Co Solicitors',
            'FC-2240',
            '£1,860',
            'Bank details changed last week, by email',
          ],
          ['Northbridge IT Hardware', 'NB-7721', '£2,280', 'Approved invoice, laptops'],
        ],
      },
    },
    {
      id: 'controls',
      title: 'Payment controls',
      text: 'Never pay the same invoice twice. Changes to a supplier’s bank details must be **confirmed by phone** using the number we already hold before any payment.',
    },
  ],
  steps: [
    {
      id: 'warnings',
      kind: 'review',
      title: 'Warning signs',
      prompt: 'Which of these are warning signs in this run?',
      points: 30,
      findings: [
        {
          id: 'duplicate',
          text: 'CL-88410 was already paid on 3 March.',
          issue: true,
          why: 'Paying it again is a duplicate payment.',
        },
        {
          id: 'bank-email',
          text: 'Ferris & Co’s bank details were changed by email.',
          issue: true,
          why: 'This is the classic invoice-fraud pattern; confirm by phone first.',
        },
        {
          id: 'laptops',
          text: 'Northbridge’s invoice is for laptops.',
          issue: false,
          why: 'An approved invoice for equipment is normal.',
        },
      ],
    },
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Approve the payments',
      prompt: 'Approve, reject or escalate each payment.',
      points: 50,
      requests: [
        {
          id: 'meadow',
          summary: 'Meadow Office Supplies MOS-2310',
          department: 'accounting',
          amount: 264,
          why: 'An approved invoice, not yet paid.',
        },
        {
          id: 'clearline',
          summary: 'Clearline Telecom CL-88410',
          department: 'accounting',
          amount: 3200,
          policyBreach:
            'This invoice was already paid on 3 March: paying it again is a duplicate.',
          why: '',
        },
        {
          id: 'ferris',
          summary: 'Ferris & Co Solicitors FC-2240',
          department: 'accounting',
          amount: 1860,
          policyBreach:
            'The bank details were changed by email and not confirmed by phone: hold the payment.',
          why: '',
        },
        {
          id: 'northbridge',
          summary: 'Northbridge IT Hardware NB-7721',
          department: 'accounting',
          amount: 2280,
          why: 'An approved invoice, not yet paid.',
        },
      ],
    },
    {
      id: 'next',
      kind: 'decide',
      title: 'The changed bank details',
      prompt: 'What do you do about Ferris & Co?',
      points: 20,
      options: [
        {
          id: 'phone',
          label: 'Phone Ferris & Co on the number already on file to confirm the change',
          verdict: 'best',
          why: 'It checks the request through a channel a fraudster doesn’t control.',
          effects: { indicators: { risk: -4 } },
        },
        {
          id: 'reply-email',
          label: 'Reply to the email asking them to confirm',
          verdict: 'poor',
          why: 'If the email account is compromised, the fraudster confirms it.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'pay-new',
          label: 'Pay to the new details: the email came from their domain',
          verdict: 'poor',
          why: 'Domains can be spoofed or hacked; this is how companies lose money.',
          effects: { indicators: { risk: 8 } },
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Daniel',
    'Well caught. I phoned Ferris & Co: they never changed their bank details. That email was a fraud attempt.',
  ),
  lapseLog: 'The payment run was late: suppliers were paid after their due dates.',
  skills: { bookkeeping: 25, accuracy: 25, reconciliation: 10 },
  xp: 90,
}

const it: CaseInput = {
  id: 'ops-it-equipment',
  version: 1,
  careerId: 'it-support',
  kind: 'operations',
  minLevel: 2,
  title: 'Equipment requests and the IT budget',
  summary: 'Four equipment requests are waiting. The UPS battery can’t wait long.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'directory-leaver' },
  deadlineHours: 6,
  email: {
    subject: 'Equipment requests for your approval',
    body: `Hi {name},

You can now approve equipment requests up to your limit. Four are waiting: approve, reject or escalate each one. And the server room UPS has started warning that its battery is failing; tell me what you think we should do.

Ravi`,
  },
  whyItMatters:
    'IT budgets are limited, and equipment requests compete with risks like ageing infrastructure. Approving the right things quickly and escalating big risks with a clear recommendation keeps people working and systems safe.',
  objectives: [
    'Approve equipment within policy and your authority',
    'Recognise requests that aren’t business needs',
    'Escalate infrastructure risks with a recommendation',
  ],
  evidence: [
    {
      id: 'policy',
      title: 'IT equipment policy',
      text: 'Standard equipment only, for work use. Personal or gaming equipment is not provided. Requests above your approval limit or the remaining IT budget go to the IT Service Desk Manager.',
    },
    {
      id: 'ups',
      title: 'UPS status alert',
      text: 'Server room UPS: battery health 12%. Runtime on battery: under 2 minutes. If mains power fails, servers will shut down without warning.',
    },
  ],
  steps: [
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Decide each request',
      prompt: 'Approve, reject or escalate each request.',
      points: 50,
      requests: [
        {
          id: 'keyboard',
          summary: 'Replacement keyboard (broken key)',
          department: 'it',
          amount: 45,
          why: 'Standard equipment, within policy.',
        },
        {
          id: 'headset',
          summary: 'Gaming headset for “after-work use”',
          department: 'it',
          amount: 180,
          policyBreach: 'Personal or gaming equipment is not provided.',
          why: '',
        },
        {
          id: 'laptops',
          summary: 'Two laptops for new starters',
          department: 'it',
          amount: 1700,
          why: 'Standard equipment for new staff.',
        },
        {
          id: 'ups',
          summary: 'Replacement UPS battery pack',
          department: 'it',
          amount: 3200,
          why: 'A genuine infrastructure need.',
        },
      ],
    },
    {
      id: 'risk',
      kind: 'decide',
      title: 'The UPS',
      prompt: 'What do you recommend about the failing UPS battery?',
      points: 25,
      options: [
        {
          id: 'urgent',
          label:
            'Treat it as urgent: escalate today with the risk and the cost, and plan the swap out of hours',
          verdict: 'best',
          why: 'A power cut would take every server down without warning; the fix is affordable and planned.',
          effects: { indicators: { risk: -5 } },
        },
        {
          id: 'wait',
          label: 'Add it to next quarter’s budget',
          verdict: 'poor',
          why: 'Two minutes of battery means any power cut is an outage now.',
          effects: { indicators: { risk: 6 } },
        },
        {
          id: 'ignore',
          label: 'Ignore the alert unless it gets worse',
          verdict: 'poor',
          why: '12% is already a failure; waiting gambles with every system.',
          effects: { indicators: { risk: 8 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Ravi Menon',
      title: 'Your recommendation to Ravi',
      prompt: 'Summarise your decisions and your UPS recommendation.',
      points: 25,
      minWords: 40,
      mentions: [
        ['UPS', 'battery'],
        ['3,200', '3200'],
        ['risk', 'outage', 'shut down'],
      ],
      avoid: [
        { terms: ['not urgent'], why: 'It is urgent: under 2 minutes of runtime.' },
      ],
      model:
        'Hi Ravi, I approved the keyboard, rejected the gaming headset under the equipment policy, and sent the laptops and the UPS battery to you where they were above my limit. The UPS is urgent: the battery is at 12% with under 2 minutes of runtime, so a power cut would shut down every server without warning. I recommend approving the £3,200 battery pack now and swapping it out of hours this week. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { risk: -2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -3, risk: 3 } },
  },
  replies: replies(
    'Ravi',
    'Agreed on all of it. The UPS battery is ordered and we’ll swap it on Saturday morning.',
  ),
  lapseLog: 'Equipment requests and the UPS alert went unanswered.',
  skills: { troubleshooting: 20, 'incident-management': 20 },
  xp: 90,
}

const marketing: CaseInput = {
  id: 'ops-mkt-agency',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'operations',
  minLevel: 2,
  title: 'Agency invoices and spending requests',
  summary:
    'An agency has billed more hours than agreed, and other requests need decisions.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'seo-fixes' },
  deadlineHours: 6,
  email: {
    subject: 'Marketing spend for your approval',
    body: `Hi {name},

A few spending decisions for you this week. The agency invoice looks high to me; please check it against the agreement before anything is paid.

Sofia`,
  },
  whyItMatters:
    'Marketing spends a lot through suppliers. Checking invoices against agreements, insisting on contracts, and staying within budget is what lets a marketing team keep its budget.',
  objectives: [
    'Check a supplier invoice against the agreement',
    'Apply contract and budget rules to spending',
    'Stay within your approval limit',
  ],
  evidence: [
    {
      id: 'agreement',
      title: 'Agency agreement: Brightwave Media',
      text: 'Up to **25 hours** a month at **£60 an hour**. Extra hours need written approval in advance.',
    },
    {
      id: 'invoice',
      title: 'Brightwave Media invoice BW-0412',
      text: '40 hours of campaign management at £60 an hour: **£2,400**. No extra hours were approved.',
    },
    {
      id: 'policy',
      title: 'Marketing spending rules',
      text: 'Influencer and creator work needs a **signed contract** before any payment.',
    },
  ],
  steps: [
    {
      id: 'over',
      kind: 'figure',
      title: 'The overcharge',
      prompt: 'How much has the agency charged above the agreement?',
      points: 25,
      answer: 900,
      tolerance: 0.5,
      unit: '£',
      why: '15 hours above the 25 agreed, at £60 an hour: £900.',
    },
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Decide each request',
      prompt: 'Approve, reject or escalate each request.',
      points: 50,
      requests: [
        {
          id: 'photos',
          summary: 'Stock photos for the spring offer',
          department: 'marketing',
          amount: 120,
          why: 'Routine, within policy.',
        },
        {
          id: 'boost',
          summary: 'Ad spend top-up for the best campaign',
          department: 'marketing',
          amount: 400,
          why: 'Within budget and policy.',
        },
        {
          id: 'agency',
          summary: 'Brightwave Media invoice BW-0412 as billed',
          department: 'marketing',
          amount: 2400,
          policyBreach:
            '15 of the hours were never approved: ask for a corrected invoice of £1,500.',
          why: '',
        },
        {
          id: 'influencer',
          summary: 'Influencer post, no contract yet',
          department: 'marketing',
          amount: 2500,
          policyBreach: 'Influencer work needs a signed contract before payment.',
          why: '',
        },
        {
          id: 'video',
          summary: 'Product video production, three quotes attached',
          department: 'marketing',
          amount: 6000,
          why: 'Within policy and budget.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Brightwave Media',
      title: 'Write to the agency',
      prompt: 'Ask for a corrected invoice, politely and clearly.',
      points: 25,
      minWords: 40,
      mentions: [
        ['25 hours'],
        ['1,500', '1500'],
        ['corrected', 'revised', 'new invoice'],
      ],
      avoid: [
        {
          terms: ['dishonest', 'cheating'],
          why: 'Stay professional: it may be a mistake.',
        },
      ],
      model:
        'Hello, thank you for invoice BW-0412. Our agreement covers up to 25 hours a month at £60 an hour, and no extra hours were approved this month. Could you send a corrected invoice for 25 hours, £1,500? If more time is needed next month, please ask us in advance and we will approve it in writing. Kind regards, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { indicators: { discipline: -3 } },
  },
  replies: replies(
    'Sofia',
    'Brightwave apologised and sent a corrected invoice for £1,500. That’s £900 back in our budget.',
  ),
  lapseLog:
    'Marketing’s spending decisions waited all week, and the agency invoice went unchallenged.',
  skills: { 'campaign-analytics': 20, 'content-strategy': 15 },
  xp: 90,
}

const data: CaseInput = {
  id: 'ops-data-purchases',
  version: 1,
  careerId: 'data-analytics',
  kind: 'operations',
  minLevel: 2,
  title: 'Data and tool purchases',
  summary: 'Requests for data and tools are waiting, and one involves personal data.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'studio-sql' },
  deadlineHours: 6,
  email: {
    subject: 'Purchases for your approval',
    body: `Hi {name},

Four purchase requests for data and tools are in the queue. Please decide each one. Take care with anything involving personal data.

Amara`,
  },
  whyItMatters:
    'Data teams buy data and tools all the time. Personal data brings legal duties, and budgets are tight; good analysts check both before saying yes.',
  objectives: [
    'Apply data protection rules to purchases',
    'Decide tool requests within budget and authority',
  ],
  evidence: [
    {
      id: 'rules',
      title: 'Data purchasing rules',
      text: 'Any purchase of **personal data** needs a signed **data protection agreement** with the supplier. Requests above your limit or the team budget go to the Head of Data.',
    },
  ],
  steps: [
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Decide each request',
      prompt: 'Approve, reject or escalate each request.',
      points: 60,
      requests: [
        {
          id: 'licences',
          summary: 'Three BI tool licences for a month',
          department: 'data',
          amount: 90,
          why: 'Routine, within budget.',
        },
        {
          id: 'contacts',
          summary:
            'List of 5,000 business contacts with names and emails, no data protection agreement',
          department: 'data',
          amount: 450,
          policyBreach: 'Personal data needs a signed data protection agreement first.',
          why: '',
        },
        {
          id: 'panel',
          summary: 'Survey panel of 400 responses',
          department: 'data',
          amount: 600,
          why: 'Within policy.',
        },
        {
          id: 'warehouse',
          summary: 'Cloud data warehouse, first quarter',
          department: 'data',
          amount: 2200,
          why: 'Within policy.',
        },
      ],
    },
    {
      id: 'contacts',
      kind: 'decide',
      title: 'The contact list',
      prompt: 'What do you tell the person who asked for the contact list?',
      points: 40,
      options: [
        {
          id: 'agreement',
          label:
            'It can go ahead once the supplier signs a data protection agreement and confirms the contacts consented',
          verdict: 'best',
          why: 'It keeps the legal safeguards and still meets the need if the data is lawful.',
          effects: { indicators: { risk: -3 } },
        },
        {
          id: 'buy',
          label: 'Buy it now: business contacts aren’t really personal data',
          verdict: 'poor',
          why: 'Names and email addresses of people are personal data, at work or not.',
          effects: { indicators: { risk: 8 } },
        },
        {
          id: 'never',
          label: 'Never buy contact lists',
          verdict: 'acceptable',
          why: 'Safe, but lawful data with the right agreement can be bought.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Amara',
    'Exactly right, and thank you for stopping the contact list until there’s a proper agreement.',
  ),
  lapseLog: 'Data purchase requests waited without a decision.',
  skills: { 'data-analysis': 20, accuracy: 15 },
  xp: 85,
}

const dev: CaseInput = {
  id: 'ops-dev-cloud',
  version: 1,
  careerId: 'software-development',
  kind: 'operations',
  minLevel: 2,
  title: 'The cloud bill is over budget',
  summary:
    'Engineering’s cloud costs have jumped. Find the cause and decide the tool requests.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'working-days-tests' },
  deadlineHours: 6,
  email: {
    subject: 'Cloud bill and tool requests',
    body: `Hi {name},

Our cloud bill this month is well over budget and Finance have asked why. Please find what happened and fix it. There are also three tool requests waiting for a decision.

Samuel`,
  },
  whyItMatters:
    'Cloud costs grow quietly. Developers who read the bill, find waste and decide tool spending sensibly are trusted with budgets.',
  objectives: [
    'Find the cause of a cost overrun',
    'Take corrective action',
    'Decide tool requests within policy and budget',
  ],
  evidence: [
    {
      id: 'bill',
      title: 'Cloud bill this month',
      table: {
        head: ['Item', 'Last month', 'This month'],
        rows: [
          ['Production servers', '£1,100', '£1,120'],
          ['Test environment', '£300', '£310'],
          ['“load-test-temp” servers (16 machines)', '£0', '£1,840'],
          ['Storage', '£200', '£210'],
          ['Total', '£1,600', '£3,480'],
        ],
      },
    },
    {
      id: 'note',
      title: 'Team chat, three weeks ago',
      text: '“Spinning up 16 machines for the load test, will tear them down after.”',
    },
    {
      id: 'tools',
      title: 'Tools we already pay for',
      text: 'Error monitoring (company-wide plan), code hosting, CI pipelines.',
    },
  ],
  steps: [
    {
      id: 'over',
      kind: 'figure',
      title: 'The overspend',
      prompt: 'How much more is this month’s bill than last month’s?',
      points: 20,
      answer: 1880,
      tolerance: 0.5,
      unit: '£',
      why: '£3,480 − £1,600 = £1,880, almost all from the forgotten load-test servers.',
    },
    {
      id: 'fix',
      kind: 'decide',
      title: 'Corrective action',
      prompt: 'What do you do?',
      points: 30,
      options: [
        {
          id: 'teardown',
          label:
            'Shut down the load-test servers today, and add a budget alert and an expiry tag for temporary machines',
          verdict: 'best',
          why: 'It stops the cost now and prevents it happening again.',
          effects: { indicators: { discipline: 4 }, spend: { engineering: -1840 } },
        },
        {
          id: 'teardown-only',
          label: 'Shut down the load-test servers',
          verdict: 'acceptable',
          why: 'It stops the cost, but nothing stops the next forgotten test.',
          effects: { indicators: { discipline: 2 }, spend: { engineering: -1840 } },
        },
        {
          id: 'raise',
          label: 'Ask Finance to raise the cloud budget',
          verdict: 'poor',
          why: 'The money is being wasted; more budget would just fund the waste.',
          effects: { indicators: { discipline: -4 } },
        },
      ],
    },
    {
      id: 'decisions',
      kind: 'approve',
      title: 'Tool requests',
      prompt: 'Approve, reject or escalate each request.',
      points: 50,
      requests: [
        {
          id: 'monitoring',
          summary: 'A second error-monitoring service for one team',
          department: 'engineering',
          amount: 240,
          policyBreach:
            'We already have a company-wide error-monitoring plan; duplicate tools waste money.',
          why: '',
        },
        {
          id: 'test-env',
          summary: 'Extra test environment for a month',
          department: 'engineering',
          amount: 300,
          why: 'A real need, within policy.',
        },
        {
          id: 'database',
          summary: 'Database upgrade for production',
          department: 'engineering',
          amount: 1800,
          why: 'A real need, within policy.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { indicators: { discipline: -4 } },
  },
  replies: replies(
    'Samuel',
    'Great work: the servers are gone, the alert is set up, and Finance are happy with the explanation.',
  ),
  lapseLog: 'The cloud overspend carried on for another week: nobody acted on it.',
  skills: { 'software-design': 20, debugging: 15 },
  xp: 85,
}

export const OPERATIONS_CASES: CaseInput[] = [
  finance,
  accounting,
  it,
  marketing,
  data,
  dev,
]
