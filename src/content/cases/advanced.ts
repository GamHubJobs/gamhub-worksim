/**
 * Advanced customer cases, one per career, from the third career level. Each
 * mixes investigation, a calculation, a judgement under pressure and a written
 * reply, with more competing considerations than the earlier cases.
 */
import type { CaseInput } from './schema'

const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thank you. That mostly resolves it; one or two points still need tidying up.

${sender}`,
  pass: `Hi {name},

Thanks. I am not sure this is fully resolved yet; could you take another look?

${sender}`,
  fail: `Hi {name},

I am afraid this does not solve our problem. I will raise it with your manager.

${sender}`,
})

const OUTCOMES = {
  pass: {
    trust: { manager: 3 },
    reputation: 3,
    indicators: { satisfaction: 2, risk: -2 },
  },
  fail: { reputation: -1, indicators: { risk: 2 } },
  lapse: { reputation: -2, indicators: { satisfaction: -3, risk: 2 } },
}

/** Finance & Admin: a contractor raises its price without the notice the contract needs. */
const faContract: CaseInput = {
  id: 'adv-fa-contract-price',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'client',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'A contractor’s price rise',
  summary:
    'The cleaning contractor has billed a higher weekly rate than the contract allows.',
  from: {
    name: 'Gareth Pryce',
    role: 'Accounts Manager',
    organisation: 'Sparkle Facility Services',
  },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Quarterly invoice SFS-5520 (£7,452.00)',
    body: `Hello,

Please find attached our invoice **SFS-5520** for the quarter: **£7,452.00** including VAT. Our rates have gone up this quarter in line with our costs.

Payment is due within 14 days.

Best regards,

Gareth Pryce
Accounts Manager, Sparkle Facility Services`,
  },
  whyItMatters:
    'Contracts protect both sides. Checking an invoice against the contract (not just against last quarter) stops the company paying for changes it never agreed, while paying what is properly due keeps a good supplier on side.',
  objectives: [
    'Check an invoice against the terms of a contract',
    'Work out what is properly due',
    'Challenge a supplier firmly and fairly',
  ],
  evidence: [
    {
      id: 'invoice',
      title: 'Invoice SFS-5520 (13 weeks)',
      text: 'All prices exclude VAT; VAT is charged at 20%.',
      table: {
        head: ['Item', 'Quantity', 'Rate', 'Line total'],
        rows: [
          ['Weekly office cleaning', '13', '£450.00', '£5,850.00'],
          ['Deep clean (kitchen and meeting rooms)', '2', '£180.00', '£360.00'],
          ['Net total', '', '', '£6,210.00'],
          ['VAT (20%)', '', '', '£1,242.00'],
          ['Total due', '', '', '£7,452.00'],
        ],
      },
    },
    {
      id: 'contract',
      title: 'Cleaning contract (signed last year), clause 6',
      text: 'Weekly cleaning: **£420.00** a week. The supplier may change its rates once a year, with **60 days’ written notice**. Extra work is charged at the agreed rates when ordered in writing.',
    },
    {
      id: 'orders',
      title: 'Facilities records',
      text: 'Two deep cleans were ordered in writing by Facilities this quarter, at the agreed £180 each. No notice of a price change has been received from Sparkle.',
    },
  ],
  steps: [
    {
      id: 'check',
      kind: 'review',
      title: 'Check the invoice against the contract',
      prompt: 'Tick every statement that is a problem with this invoice.',
      points: 30,
      findings: [
        {
          id: 'rate',
          text: 'Weekly cleaning is charged at £450.00, not the contract’s £420.00.',
          issue: true,
          why: 'The contract allows a rise only with 60 days’ written notice, and none was received.',
        },
        {
          id: 'deep-cleans',
          text: 'Two deep cleans are charged at £180.00 each.',
          issue: false,
          why: 'They were ordered in writing at the agreed rate, so they are properly due.',
        },
        {
          id: 'vat',
          text: 'VAT is charged at 20% on the net total.',
          issue: false,
          why: 'Cleaning services are standard-rated, so 20% is right.',
        },
        {
          id: 'notice',
          text: 'The email says rates “have gone up this quarter”, but no notice was given.',
          issue: true,
          why: 'A rise without the notice the contract requires does not apply yet.',
        },
      ],
    },
    {
      id: 'due',
      kind: 'figure',
      title: 'What is properly due',
      prompt: 'How much should we pay, including VAT, under the contract as it stands?',
      points: 20,
      answer: 6984,
      tolerance: 0.5,
      unit: '£',
      why: '13 weeks at £420 is £5,460, plus £360 of deep cleans makes £5,820 net; with 20% VAT, £6,984.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'How do you respond?',
      points: 25,
      options: [
        {
          id: 'pay-contract',
          label:
            'Pay £6,984 on time, ask for a corrected invoice, and tell Sparkle that any rise needs 60 days’ written notice',
          verdict: 'best',
          why: 'You pay what is due promptly, keep the contract’s protection, and leave the door open to a properly notified rise.',
          effects: { indicators: { discipline: 2 } },
        },
        {
          id: 'pay-all',
          label: 'Pay the full £7,452: costs are rising everywhere',
          verdict: 'poor',
          why: 'You would pay £468 the company never agreed to, and accept a price change that skipped the contract.',
          effects: { indicators: { discipline: -3 }, spend: { finance: 468 } },
        },
        {
          id: 'hold-all',
          label: 'Hold the whole payment until Sparkle sends a new invoice',
          verdict: 'acceptable',
          why: 'The company’s position is protected, but holding money that is clearly due damages a supplier who did the work.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Gareth Pryce, Sparkle Facility Services',
      title: 'Reply to the supplier',
      prompt:
        'Write to Gareth: what you are paying and why, and what the contract requires for a price change.',
      points: 25,
      minWords: 50,
      model:
        'Dear Gareth, thank you for invoice SFS-5520. We have checked it against our contract: the deep cleans are due, but weekly cleaning is still £420 a week, because clause 6 requires 60 days’ written notice of a change and we have not received any. We are paying £6,984 today. Please send a corrected invoice, and written notice if you would like to change your rates. Kind regards, {name}',
      mentions: [
        ['6,984', '6984'],
        ['notice'],
        ['corrected invoice', 'credit note', 'revised invoice'],
      ],
      avoid: [
        {
          terms: ['rip-off', 'dishonest', 'trying it on'],
          why: 'Stay professional: the supplier may simply have forgotten the notice clause.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Gareth',
    'You are quite right, and apologies: the notice letter was never sent. A corrected invoice is attached, and you will have our formal notice next week.',
  ),
  lapseLog: 'The contractor’s invoice went unanswered and its payment date passed.',
  skills: { 'finance-basics': 25, accuracy: 20 },
  xp: 140,
}

/** Accounting: a client wants a January sale counted in December. */
const accCutoff: CaseInput = {
  id: 'adv-acc-year-end-sale',
  version: 1,
  careerId: 'accounting',
  kind: 'client',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'A sale in the wrong year',
  summary: 'A client wants a January sale counted in December to meet its bank’s target.',
  from: {
    name: 'Fiona Marsh',
    role: 'Finance Director',
    organisation: 'Alder Engineering',
  },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Year-end accounts: one more sale for December',
    body: `Hi,

Before you finalise our year-end accounts, please include the **£48,000** order for Calder Pumps in December. We invoiced it on 30 December. Our bank needs December revenue of at least **£1,300,000**, and this gets us there.

Thanks,

Fiona Marsh
Finance Director, Alder Engineering`,
  },
  whyItMatters:
    'Revenue belongs to the period in which the goods are delivered, not when an invoice is dated. Moving it to hit a target misleads the bank, and the accountant who books it shares the responsibility. The professional answer is accurate accounts, plus help with the real problem.',
  objectives: [
    'Apply the cut-off rule: revenue when the goods are delivered',
    'Work out the true position',
    'Say no to a client clearly and help them with the real problem',
  ],
  evidence: [
    {
      id: 'order',
      title: 'The Calder Pumps order',
      table: {
        head: ['Event', 'Date', 'Amount'],
        rows: [
          ['Order signed', '12 December', '£48,000'],
          ['Deposit received (recorded as deferred income)', '15 December', '£4,800'],
          ['Invoice dated', '30 December', '£48,000'],
          ['Goods despatched and delivered', '3 January', ''],
        ],
      },
    },
    {
      id: 'revenue',
      title: 'December revenue (draft)',
      text: 'Recorded December revenue, without the Calder Pumps order: **£1,260,000**. Year end: 31 December. The bank covenant requires at least £1,300,000.',
    },
  ],
  steps: [
    {
      id: 'cutoff',
      kind: 'review',
      title: 'Apply the cut-off rule',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'january',
          text: 'The sale belongs in January, because the goods were delivered on 3 January.',
          issue: true,
          why: 'Revenue is recognised when the customer gets the goods, which was after the year end.',
        },
        {
          id: 'invoice-date',
          text: 'Dating the invoice 30 December makes it December revenue.',
          issue: false,
          why: 'The invoice date does not decide the period; delivery does.',
        },
        {
          id: 'deposit',
          text: 'The £4,800 deposit is rightly recorded as deferred income, not revenue.',
          issue: true,
          why: 'Money received before delivery is owed back as goods, so it is a liability until delivery.',
        },
        {
          id: 'draft',
          text: 'The draft December revenue of £1,260,000 is wrong because it leaves the order out.',
          issue: false,
          why: 'Leaving the order out is correct: £1,260,000 is the right December figure.',
        },
      ],
    },
    {
      id: 'gap',
      kind: 'figure',
      title: 'The real position',
      prompt:
        'By how much is December revenue, recorded correctly, short of the bank’s £1,300,000?',
      points: 20,
      answer: 40000,
      tolerance: 0.5,
      unit: '£',
      why: '£1,300,000 − £1,260,000 = £40,000 short.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'How do you handle the request?',
      points: 25,
      options: [
        {
          id: 'january',
          label:
            'Record the sale in January, explain why, and suggest Fiona talks to the bank now about the £40,000 shortfall',
          verdict: 'best',
          why: 'The accounts are right, and Fiona gets help with her real problem: banks deal far better with early honesty than with surprises.',
          effects: { indicators: { risk: -2, discipline: 2 } },
        },
        {
          id: 'include',
          label:
            'Include it in December: the invoice is dated December and it is only four days',
          verdict: 'poor',
          why: 'It overstates revenue to mislead a lender. That is misstatement, whoever asks for it, and you would share the responsibility.',
          effects: { indicators: { risk: 6 }, reputation: -3 },
        },
        {
          id: 'january-only',
          label: 'Record it in January and leave the bank to Fiona',
          verdict: 'acceptable',
          why: 'The accounting is right, but the client is left alone with a problem you could help her face.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Fiona Marsh, Alder Engineering',
      title: 'Reply to the client',
      prompt:
        'Write to Fiona: what you will do, why, and how you can help with the bank.',
      points: 25,
      minWords: 50,
      model:
        'Dear Fiona, thank you. I cannot include the Calder Pumps sale in December: the goods were delivered on 3 January, so under the cut-off rules it is January revenue, whatever the invoice date. Recorded correctly, December revenue is £1,260,000, £40,000 short of the covenant. I suggest we speak to the bank now, before the accounts are final; I am happy to help prepare the figures and the January order book. Kind regards, {name}',
      mentions: [['January'], ['40,000', '40000'], ['bank', 'lender', 'covenant']],
      avoid: [
        {
          terms: ['no problem', 'happy to include'],
          why: 'Do not suggest the sale could be moved: it cannot.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Fiona',
    'Thank you for being straight with me. I called the bank this morning; they have agreed to look at the January order book, and we are fine.',
  ),
  lapseLog: 'The year-end accounts were held up waiting for an answer to the client.',
  skills: { 'financial-reporting': 25, bookkeeping: 20 },
  xp: 140,
}

/** IT Help Desk: a director's request against an outage affecting 40 people. */
const itPriority: CaseInput = {
  id: 'adv-it-priority-pressure',
  version: 1,
  careerId: 'it-support',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'Pressure to jump the queue',
  summary:
    'The CEO’s office wants a monitor fixed first while email is failing for 40 people.',
  from: {
    name: 'Paula Reid',
    role: 'Executive Assistant to the CEO',
    organisation: 'Executive Office',
  },
  trigger: {},
  deadlineHours: 4,
  email: {
    subject: 'URGENT: CEO’s monitor (INC-3102)',
    body: `Hi,

The CEO’s second monitor keeps flickering and she has a board presentation tomorrow. I need someone up here **now**, please. Can you make this your top priority?

Paula Reid
Executive Assistant to the CEO`,
  },
  whyItMatters:
    'A service desk prioritises by impact and urgency, not by who is asking. Saying so politely, and still helping senior people quickly with a workaround, is what keeps the desk trusted by everyone.',
  objectives: [
    'Prioritise work by impact and urgency',
    'Find a workaround that helps without delaying critical work',
    'Say no to a senior person politely, with a plan',
  ],
  evidence: [
    {
      id: 'queue',
      title: 'Your queue',
      table: {
        head: ['Ticket', 'Problem', 'People affected', 'Priority', 'Logged'],
        rows: [
          [
            'INC-3101',
            'Email not syncing for the Sales team',
            '40',
            'P2 (4-hour target)',
            '2.5 hours ago',
          ],
          [
            'INC-3102',
            'CEO’s second monitor flickers',
            '1',
            'P4 (3-day target)',
            '10 minutes ago',
          ],
          ['INC-3103', 'One user cannot print', '1', 'P4 (3-day target)', 'Yesterday'],
        ],
      },
    },
    {
      id: 'stock',
      title: 'Spare equipment',
      text: 'Two spare 24-inch monitors are in the IT store. A colleague, Sam, is free in 20 minutes and can deliver one.',
    },
  ],
  steps: [
    {
      id: 'triage',
      kind: 'review',
      title: 'Triage the queue',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'email-first',
          text: 'INC-3101 affects the most people and should be worked on first.',
          issue: true,
          why: 'Forty people without email is far greater impact than one flickering monitor.',
        },
        {
          id: 'seniority',
          text: 'A ticket from the CEO’s office automatically goes to the top of the queue.',
          issue: false,
          why: 'Priority comes from impact and urgency, not seniority, or the desk loses everyone else’s trust.',
        },
        {
          id: 'workaround',
          text: 'INC-3102 can get a quick workaround (a spare monitor) without delaying INC-3101.',
          issue: true,
          why: 'Sam can deliver a spare while you keep working on the outage.',
        },
        {
          id: 'breached',
          text: 'INC-3101 has already missed its 4-hour target.',
          issue: false,
          why: 'It was logged 2.5 hours ago, so there are 1.5 hours left.',
        },
      ],
    },
    {
      id: 'left',
      kind: 'figure',
      title: 'Time left on the outage',
      prompt: 'How many hours are left to fix INC-3101 within its target?',
      points: 20,
      answer: 1.5,
      tolerance: 0.01,
      unit: 'hours',
      why: 'A 4-hour target, logged 2.5 hours ago: 1.5 hours left.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'How do you handle the two tickets?',
      points: 25,
      options: [
        {
          id: 'workaround',
          label:
            'Keep working on the email outage; ask Sam to take the CEO a spare monitor in 20 minutes and fix the old one after',
          verdict: 'best',
          why: 'The biggest problem gets fixed first, and the CEO is sorted well before her presentation.',
          effects: { indicators: { satisfaction: 2 }, trust: { manager: 2 } },
        },
        {
          id: 'ceo-first',
          label: 'Go up to the CEO’s office now and come back to the email afterwards',
          verdict: 'poor',
          why: 'Forty people lose more working time, the outage may miss its target, and the desk is seen to serve rank, not need.',
          effects: { indicators: { satisfaction: -3, risk: 3 } },
        },
        {
          id: 'later',
          label:
            'Fix the email first and look at the monitor tomorrow, as its priority allows',
          verdict: 'acceptable',
          why: 'The priorities are right, but a cheap workaround was available today, before an important presentation.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Paula Reid, Executive Office',
      title: 'Reply to the CEO’s office',
      prompt:
        'Write to Paula: what will happen, when, and why the email outage comes first.',
      points: 25,
      minWords: 45,
      model:
        'Hi Paula, thanks for letting us know. Right now email is down for 40 people in Sales, so I need to keep working on that first. So the CEO is not held up, my colleague Sam will bring up a spare monitor in about 20 minutes, and we will fix the original after the presentation. Thanks for understanding, {name}',
      mentions: [
        ['email', '40'],
        ['spare', 'loan', 'replacement'],
        ['20 minutes', 'this morning', 'shortly'],
      ],
      avoid: [
        {
          terms: ['not important', 'low priority', 'can wait'],
          why: 'Explain the priority without belittling the request.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Paula',
    'The spare monitor is perfect, thank you, and thanks for explaining. The CEO said the same thing would have annoyed her if it were her email.',
  ),
  lapseLog: 'The CEO’s office heard nothing back and escalated to the IT manager.',
  skills: { 'incident-management': 25, 'customer-service': 20 },
  xp: 140,
}

/** Digital Marketing: a client wants to cut a channel that last-click under-credits. */
const mktAttribution: CaseInput = {
  id: 'adv-mkt-attribution',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'client',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'Cut social media?',
  summary: 'A client wants to stop social ads because they seem to bring few bookings.',
  from: {
    name: 'Victor Hale',
    role: 'Marketing Director',
    organisation: 'Hollow Oak Hotels',
  },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Stop the social ads from next week',
    body: `Hi,

I have looked at last quarter’s report. Social media brought us **20 bookings** for £5,000. That is £250 a booking, ten times what email costs. Please stop all social ads from next week and move the money to search.

Victor Hale
Marketing Director, Hollow Oak Hotels`,
  },
  whyItMatters:
    'Last-click reports give all the credit to the final click. Channels that start the customer’s journey can look useless while they are doing real work. Good marketers question the measure before cutting the spend, and test before betting the budget.',
  objectives: [
    'Read a channel report critically',
    'Compare costs with assisted conversions counted',
    'Recommend a test instead of a guess',
  ],
  evidence: [
    {
      id: 'report',
      title: 'Last quarter by channel',
      table: {
        head: ['Channel', 'Spend', 'Last-click bookings', 'Assisted bookings'],
        rows: [
          ['Search', '£8,000', '300', '60'],
          ['Social media', '£5,000', '20', '180'],
          ['Email', '£1,000', '80', '40'],
        ],
      },
    },
    {
      id: 'note',
      title: 'How the report counts',
      text: '“Last-click” bookings give all the credit to the last ad clicked. “Assisted” bookings are those where the channel appeared earlier in the customer’s journey.',
    },
  ],
  steps: [
    {
      id: 'read',
      kind: 'review',
      title: 'Read the report critically',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'assists',
          text: 'Social media appeared earlier in the journey of 180 bookings that ended on another channel.',
          issue: true,
          why: 'That is what “assisted” means: social started many journeys that search or email finished.',
        },
        {
          id: 'last-click',
          text: 'Last-click reporting gives all the credit to the final channel.',
          issue: true,
          why: 'It ignores every earlier touch, which is why social looks weak.',
        },
        {
          id: 'no-effect',
          text: 'Social brought only 20 bookings, so it has no effect on sales.',
          issue: false,
          why: 'It played a part in 180 more bookings, so the report understates it.',
        },
        {
          id: 'email-cheapest',
          text: 'Email has the lowest cost per last-click booking.',
          issue: true,
          why: '£1,000 ÷ 80 = £12.50, against £26.67 for search and £250 for social.',
        },
      ],
    },
    {
      id: 'assisted-cost',
      kind: 'figure',
      title: 'Social’s cost with assists counted',
      prompt:
        'What does social cost per booking if its assisted bookings are counted too?',
      points: 20,
      answer: 25,
      tolerance: 0.01,
      unit: '£',
      why: '£5,000 ÷ (20 + 180) bookings = £25 a booking.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'What do you recommend?',
      points: 25,
      options: [
        {
          id: 'test',
          label:
            'Halve social spend in two regions for four weeks and compare bookings with the other regions before deciding',
          verdict: 'best',
          why: 'A controlled test shows what social really adds, at little risk, and gives Victor evidence instead of a guess.',
          effects: { indicators: { satisfaction: 2 } },
        },
        {
          id: 'cut',
          label: 'Do as Victor asks and stop all social ads next week',
          verdict: 'poor',
          why: 'If social starts many journeys, bookings through search and email may fall too, and nobody will know why.',
          effects: { indicators: { satisfaction: -3 } },
        },
        {
          id: 'refuse',
          label: 'Keep everything as it is: the report is wrong',
          verdict: 'acceptable',
          why: 'You are right about the report, but refusing to act ignores a fair question about value for money.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Victor Hale, Hollow Oak Hotels',
      title: 'Reply to the client',
      prompt:
        'Write to Victor: what the report misses, what social really costs, and what you suggest.',
      points: 25,
      minWords: 55,
      model:
        'Dear Victor, thanks, it is a fair question. The report only credits the last click: social also appeared earlier in the journey of 180 bookings that finished on search or email. Counting those, social costs about £25 a booking, not £250. Before cutting it, I suggest a four-week test: halve social in two regions and compare bookings with the rest. That will show what it really adds. Best regards, {name}',
      mentions: [
        ['assist', 'journey', 'earlier'],
        ['25'],
        ['test', 'trial', 'experiment'],
      ],
      avoid: [
        {
          terms: ['you are wrong', 'misunderstood'],
          why: 'The client read the report correctly: the report is what misleads. Say so without blaming him.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Victor',
    'I had no idea the report worked like that. Let’s run the test; I will tell the board we are measuring properly before we cut anything.',
  ),
  lapseLog: 'The client stopped the social ads himself before hearing back.',
  skills: { 'campaign-analytics': 25, 'content-strategy': 20 },
  xp: 140,
}

/** Data Analysis: a director wants to present a biased survey as everyone's view. */
const dataBias: CaseInput = {
  id: 'adv-data-survey-bias',
  version: 1,
  careerId: 'data-analytics',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: '“Customers love the app”',
  summary: 'Sales wants to tell the board that 92% of customers are happy with the app.',
  from: { name: 'Gemma Ward', role: 'Sales Director', organisation: 'Sales' },
  trigger: {},
  deadlineHours: 5,
  email: {
    subject: 'Headline for the board: 92% love the app',
    body: `Hi,

Great news from the in-app survey: **92% satisfied**! Can you put “92% of customers are satisfied with the app” on the first slide of tomorrow’s board pack?

Gemma`,
  },
  whyItMatters:
    'Who answered a survey decides what it can tell you. An in-app survey only hears from people still using the app. Analysts protect decision-makers from conclusions the data cannot support, and still give them the useful finding.',
  objectives: [
    'Spot a biased sample',
    'Say exactly what the data shows',
    'Suggest how to get a fair answer',
  ],
  evidence: [
    {
      id: 'survey',
      title: 'The in-app survey',
      table: {
        head: ['Measure', 'Value'],
        rows: [
          ['Customers', '12,000'],
          ['Customers using the app this month', '2,000'],
          ['Survey responses (shown inside the app)', '250'],
          ['Satisfied or very satisfied', '230 (92%)'],
        ],
      },
    },
    {
      id: 'complaints',
      title: 'Complaints log',
      text: '140 complaints about the app this month, mostly from customers who say they have stopped using it.',
    },
  ],
  steps: [
    {
      id: 'sample',
      kind: 'review',
      title: 'Who answered?',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'app-only',
          text: 'Only customers who use the app could answer the survey.',
          issue: true,
          why: 'It was shown inside the app, so non-users never saw it.',
        },
        {
          id: 'all-customers',
          text: '92% of all customers are satisfied with the app.',
          issue: false,
          why: 'The 92% is of 250 app users who answered, not of 12,000 customers.',
        },
        {
          id: 'leavers',
          text: 'Customers who stopped using the app could not be asked.',
          issue: true,
          why: 'Those are the people most likely to be unhappy, and the complaints log suggests there are many.',
        },
        {
          id: 'too-few',
          text: '250 responses are too few to say anything at all.',
          issue: false,
          why: 'They say something useful about people who still use the app; they just cannot speak for everyone.',
        },
      ],
    },
    {
      id: 'rate',
      kind: 'figure',
      title: 'Response rate',
      prompt: 'What percentage of this month’s app users answered the survey?',
      points: 20,
      answer: 12.5,
      tolerance: 0.05,
      unit: '%',
      why: '250 ÷ 2,000 = 12.5%.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What goes on the slide',
      prompt: 'What do you put in the board pack?',
      points: 25,
      options: [
        {
          id: 'qualified',
          label:
            '“92% of app users who answered are satisfied”, with the sample and the complaints shown, and a proposal to survey all customers',
          verdict: 'best',
          why: 'The board gets the good news and its limits, and a way to find out what all customers think.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'headline',
          label: '“92% of customers are satisfied with the app”, as Gemma asked',
          verdict: 'poor',
          why: 'It tells the board something the data does not show, and they may decide on it.',
          effects: { indicators: { risk: 5 }, reputation: -2 },
        },
        {
          id: 'nothing',
          label: 'Leave the survey out of the pack: it is biased',
          verdict: 'acceptable',
          why: 'You avoid misleading anyone, but throw away a useful finding about current users.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Gemma Ward, Sales',
      title: 'Reply to the Sales Director',
      prompt:
        'Write to Gemma: what the survey shows, what it cannot show, and what you propose.',
      points: 25,
      minWords: 50,
      model:
        'Hi Gemma, it is a good result for people who use the app, and I will put it in the pack. I need to word it as “92% of app users who answered”, though: the survey was only shown in the app, and only 12.5% of users answered, so it misses customers who have stopped using it, and we have 140 complaints from them this month. I suggest we survey a sample of all customers next month. Best, {name}',
      mentions: [
        ['app users', 'use the app'],
        ['12.5'],
        ['all customers', 'sample', 'representative'],
      ],
      avoid: [
        {
          terms: ['fake', 'lying', 'misleading on purpose'],
          why: 'Gemma is sharing good news, not trying to deceive: explain the limits, do not accuse.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Gemma',
    'Fair enough, and better that I hear it from you than from the board. Your wording is on the slide, and they approved the survey of all customers.',
  ),
  lapseLog:
    'The board pack went out with Gemma’s headline because nobody replied in time.',
  skills: { 'insight-communication': 25, 'data-analysis': 20 },
  xp: 140,
}

/** Software Development: a report got slow after a release. */
const devPerformance: CaseInput = {
  id: 'adv-dev-slow-report',
  version: 1,
  careerId: 'software-development',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'The month-end report got slow',
  summary:
    'Since the last release, Finance’s month-end report takes 9 minutes instead of 40 seconds.',
  from: {
    name: 'Irene Shaw',
    role: 'Financial Controller',
    organisation: 'Finance & Administration',
  },
  trigger: {},
  deadlineHours: 6,
  email: {
    subject: 'Month-end report: 9 minutes!',
    body: `Hi,

Since Tuesday’s release, the month-end report takes **9 minutes** to run instead of 40 seconds. Month-end close is on Friday and we run it many times a day. Can you fix it?

Irene Shaw
Financial Controller`,
  },
  whyItMatters:
    'Performance problems are bugs. Finding the cause from evidence (what changed, and by how much) beats guessing, and a test that measures speed stops the same problem coming back.',
  objectives: [
    'Find the cause of a slowdown from the evidence',
    'Estimate the cost of a design choice',
    'Fix it properly and protect it with a test',
  ],
  evidence: [
    {
      id: 'timings',
      title: 'Report run times',
      table: {
        head: ['Release', 'Invoices in report', 'Run time'],
        rows: [
          ['4.1', '6,000', '40 seconds'],
          ['4.2 (Tuesday)', '6,000', '9 minutes'],
        ],
      },
    },
    {
      id: 'changes',
      title: 'Changes in release 4.2',
      text: '1. Each invoice line now shows its amount in pounds, using the exchange rates service: one call for each invoice (about 85 ms per call). 2. A new font for the PDF. 3. Extra logging when the report starts and ends.',
    },
  ],
  steps: [
    {
      id: 'diagnose',
      kind: 'review',
      title: 'Find the cause',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'started',
          text: 'The slowdown started with release 4.2.',
          issue: true,
          why: 'The same 6,000 invoices took 40 seconds on 4.1 and 9 minutes on 4.2.',
        },
        {
          id: 'font',
          text: 'The new font is the most likely cause.',
          issue: false,
          why: 'A font changes the PDF once, not per invoice; it cannot add minutes.',
        },
        {
          id: 'rates',
          text: 'Calling the exchange rates service once per invoice accounts for most of the slowdown.',
          issue: true,
          why: '6,000 calls at about 85 ms is about 8.5 minutes, almost exactly the difference.',
        },
        {
          id: 'rollback',
          text: 'Rolling back release 4.2 would also remove the currency feature Finance asked for.',
          issue: true,
          why: 'That is why a fix is better than a rollback, unless the fix takes too long.',
        },
      ],
    },
    {
      id: 'cost',
      kind: 'figure',
      title: 'The cost of one call per invoice',
      prompt: 'How many seconds do 6,000 calls of 85 ms each add?',
      points: 20,
      answer: 510,
      tolerance: 0.5,
      unit: 'seconds',
      why: '6,000 × 0.085 s = 510 seconds, or 8.5 minutes.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'The fix',
      prompt: 'What do you do?',
      points: 25,
      options: [
        {
          id: 'cache',
          label:
            'Fetch each currency’s rate once per report and reuse it, and add a test that fails if the report takes more than a minute',
          verdict: 'best',
          why: 'It removes thousands of calls, keeps the feature, and the test stops the problem returning.',
          effects: { indicators: { risk: -2 }, trust: { manager: 2 } },
        },
        {
          id: 'overnight',
          label: 'Ask Finance to run the report overnight instead',
          verdict: 'poor',
          why: 'It hides the defect and does not work for a team that runs the report many times a day at month end.',
          effects: { indicators: { satisfaction: -3 } },
        },
        {
          id: 'rollback',
          label: 'Roll back release 4.2 until there is time to look into it',
          verdict: 'acceptable',
          why: 'It restores speed quickly, but removes a feature Finance needs and leaves the real problem unsolved.',
          effects: { indicators: { satisfaction: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Irene Shaw, Finance & Administration',
      title: 'Reply to Finance',
      prompt:
        'Write to Irene: the cause, the fix, when, and how you will stop it happening again.',
      points: 25,
      minWords: 50,
      model:
        'Hi Irene, sorry about this, and thanks for the clear report. The new currency feature calls the exchange rate service once for every invoice: 6,000 calls add about 8.5 minutes. I will fetch each rate once per report and reuse it, which should bring it back under a minute, and add a test that fails if the report slows down again. You will have the fix tomorrow, well before Friday. Best, {name}',
      mentions: [
        ['exchange rate', 'currency', 'rates'],
        ['once', 'reuse', 'cache'],
        ['test'],
      ],
      avoid: [
        {
          terms: ['works on my machine', 'not a bug'],
          why: 'A nine-minute report is a defect; own it.',
        },
      ],
    },
  ],
  outcomes: OUTCOMES,
  replies: replies(
    'Irene',
    'The report runs in 35 seconds now, quicker than before. Thank you, and for explaining it so clearly.',
  ),
  lapseLog: 'Finance spent the day waiting nine minutes for every report run.',
  skills: { debugging: 25, 'software-testing': 20 },
  xp: 140,
}

export const ADVANCED_CASES: CaseInput[] = [
  faContract,
  accCutoff,
  itPriority,
  mktAttribution,
  dataBias,
  devPerformance,
]
