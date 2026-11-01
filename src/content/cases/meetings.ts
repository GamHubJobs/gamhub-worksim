/**
 * Meetings: prepare a document or slides with the existing apps, join the
 * meeting when it starts (office time passes), make the decisions that come
 * up in the room, then record the actions with owners and follow up.
 */
import type { CaseInput } from './schema'

const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks, a useful meeting.

${sender}`,
  pass: `Hi {name},

Thanks. A few things from the meeting need tidying up.

${sender}`,
  fail: `Hi {name},

That meeting didn’t get us where we needed to be. Let’s talk.

${sender}`,
})

const people = (...names: Array<[string, string]>) =>
  names.map(([id, name]) => ({ id, name }))

// ---------------------------------------------------------------------------
// Finance & Admin: the monthly team meeting
// ---------------------------------------------------------------------------

const faTeam: CaseInput = {
  id: 'mtg-fa-team',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'meeting',
  minLevel: 2,
  title: 'Present the month at the team meeting',
  summary:
    'Prepare three slides on last month’s spending, present them, and record the actions.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'performance-report' },
  deadlineHours: 8,
  meeting: {
    title: 'Finance & Admin monthly meeting',
    inHours: 3,
    minutes: 45,
    room: 'Meeting room 2',
  },
  email: {
    subject: 'Monthly meeting: can you present the spending update?',
    body: `Hi {name},

At this month’s team meeting (in about three hours, meeting room 2) I’d like you to present the spending update: **3 to 5 slides** on spending against budget, the overspend in **travel** (£4,200 against £3,000) and what you recommend. Then please take the minutes and the actions.

Priya`,
  },
  whyItMatters:
    'Presenting to your team builds trust and visibility. Meetings only change anything if decisions become actions with owners and dates, which is why good minute-takers are so valued.',
  objectives: [
    'Prepare a short, clear update',
    'Handle questions in a meeting',
    'Record actions with the right owners',
  ],
  evidence: [
    {
      id: 'figures',
      title: 'Spending against budget, last month',
      table: {
        head: ['Line', 'Budget', 'Actual'],
        rows: [
          ['Travel', '£3,000', '£4,200'],
          ['Supplies', '£1,800', '£1,650'],
          ['Training', '£2,500', '£2,100'],
        ],
      },
    },
    {
      id: 'travel',
      title: 'Why travel was over',
      text: 'Two last-minute train bookings for the Steelway Engineering workshops cost £1,100 more than advance fares would have.',
    },
  ],
  steps: [
    {
      id: 'slides',
      kind: 'document',
      phase: 'prepare',
      title: 'Prepare the slides',
      prompt:
        'Make 3 to 5 slides: spending against budget, the travel overspend and its cause, and your recommendation.',
      points: 35,
      deliverable: {
        kind: 'slides',
        title: 'Spending update',
        template: 'business-review',
        checks: [
          {
            id: 'length',
            type: 'length',
            min: 3,
            max: 5,
            title: 'Three to five slides',
            points: 10,
            why: 'A short slot.',
            hint: 'Delete the slides you don’t need.',
          },
          {
            id: 'travel',
            type: 'mentions',
            title: 'The travel overspend explained',
            terms: [
              ['travel'],
              ['4,200', '4200'],
              ['advance', 'last-minute', 'last minute'],
            ],
            points: 15,
            why: 'The team needs the cause, not just the number.',
            hint: 'Give the figure and the reason.',
          },
          {
            id: 'recommend',
            type: 'mentions',
            title: 'A recommendation',
            terms: [['recommend', 'book ahead', 'in advance']],
            points: 10,
            why: 'An update should end with what to do.',
            hint: 'Recommend booking travel in advance.',
          },
        ],
      },
    },
    {
      id: 'question',
      kind: 'decide',
      phase: 'meeting',
      title: 'A question in the meeting',
      prompt:
        'Marcus says: “Just cut the training budget to cover travel.” What do you say?',
      points: 20,
      options: [
        {
          id: 'fix-cause',
          label:
            'Suggest fixing the cause instead: book travel in advance, which would have saved £1,100',
          verdict: 'best',
          why: 'It solves the overspend without losing training the team needs.',
          effects: { trust: { manager: 2 } },
        },
        {
          id: 'agree',
          label: 'Agree: training was underspent anyway',
          verdict: 'acceptable',
          why: 'It balances this month, but the overspend will happen again.',
        },
        {
          id: 'dismiss',
          label: 'Say that’s not your decision and move on',
          verdict: 'poor',
          why: 'You know the cause; sharing it is exactly why you are presenting.',
          effects: { trust: { manager: -1 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action from the meeting the right owner.',
      points: 30,
      people: people(['me', 'You'], ['marcus', 'Marcus Webb'], ['priya', 'Priya Raman']),
      items: [
        {
          id: 'policy',
          label: 'Update the travel policy: book at least 2 weeks ahead',
          owner: 'priya',
          why: 'Policy changes belong to the manager who owns the policy.',
        },
        {
          id: 'minutes',
          label: 'Circulate the minutes by tomorrow',
          owner: 'me',
          why: 'You took the minutes.',
        },
        {
          id: 'bookings',
          label: 'Book the May workshop trains this week',
          owner: 'marcus',
          why: 'Marcus arranges the team’s travel.',
        },
      ],
    },
    {
      id: 'follow-up',
      kind: 'reply',
      phase: 'after',
      to: 'The Finance & Admin team',
      title: 'Send the minutes',
      prompt: 'Write the short summary of decisions and actions for the team.',
      points: 15,
      minWords: 40,
      mentions: [['travel'], ['Marcus'], ['Priya'], ['action']],
      avoid: [],
      model:
        'Hi all, thanks for a good meeting. Summary: travel was £1,200 over budget, mostly last-minute train bookings. Actions: Priya will update the travel policy so trains are booked at least 2 weeks ahead; Marcus will book the May workshop trains this week; I will circulate these minutes today. {name}',
    },
  ],
  outcomes: {
    pass: {
      trust: { manager: 3, senior: 1 },
      reputation: 3,
      indicators: { discipline: 2 },
    },
    fail: { reputation: -1 },
    lapse: { reputation: -3, trust: { manager: -2 } },
  },
  replies: replies(
    'Priya',
    'A great first presentation, and the actions are already moving. Thank you for the minutes.',
  ),
  lapseLog: 'The team meeting went ahead without your spending update.',
  skills: { presentation: 30, 'finance-basics': 15 },
  xp: 110,
}

// ---------------------------------------------------------------------------
// Accounting: a client meeting about credit terms
// ---------------------------------------------------------------------------

const accClient: CaseInput = {
  id: 'mtg-acc-client',
  version: 1,
  careerId: 'accounting',
  kind: 'meeting',
  minLevel: 3,
  title: 'A client meeting about late payments',
  summary: 'Northgate Motors pays late every month. Prepare, meet them and agree a plan.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'books-payroll' },
  deadlineHours: 8,
  meeting: {
    title: 'Meeting with Northgate Motors',
    inHours: 2,
    minutes: 40,
    room: 'Client room',
  },
  email: {
    subject: 'Northgate Motors meeting this afternoon',
    body: `Hi {name},

Northgate Motors owe us **£19,400**, most of it over 60 days. Their finance director is coming in this afternoon. Please prepare a one-page briefing (the balance, how late, what we want) and lead the conversation. We need a payment plan, not a fight: they are a good client.

Daniel`,
  },
  whyItMatters:
    'Credit control is about relationships as much as numbers. Preparing the facts, being firm about what is owed and flexible about how it is paid is what gets money in and keeps the client.',
  objectives: [
    'Prepare a client briefing',
    'Negotiate a payment plan',
    'Record the agreement and the actions',
  ],
  evidence: [
    {
      id: 'aged',
      title: 'Northgate Motors: aged debt',
      table: {
        head: ['Age', 'Amount'],
        rows: [
          ['0–30 days', '£4,200'],
          ['31–60 days', '£3,200'],
          ['61–90 days', '£7,000'],
          ['Over 90 days', '£5,000'],
          ['Total', '£19,400'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'briefing',
      kind: 'document',
      phase: 'prepare',
      title: 'The briefing',
      prompt:
        'Write a one-page briefing for the meeting: the balance, the overdue amounts and what we want.',
      points: 30,
      deliverable: {
        kind: 'doc',
        title: 'Briefing: Northgate Motors',
        template: 'memo',
        checks: [
          {
            id: 'figures',
            type: 'figures',
            title: 'The key figures',
            figures: [
              { label: 'total balance', value: 19400 },
              { label: 'amount over 60 days', value: 12000 },
            ],
            points: 15,
            why: 'You need the facts at your fingertips.',
            hint: '£19,400 in total; £12,000 over 60 days.',
          },
          {
            id: 'goal',
            type: 'mentions',
            title: 'What we want',
            terms: [
              ['payment plan', 'instalments'],
              ['30 days', 'on time'],
            ],
            points: 10,
            why: 'Go in knowing your goal.',
            hint: 'A payment plan for the old debt, and future invoices paid on time.',
          },
          {
            id: 'length',
            type: 'length',
            min: 80,
            max: 400,
            title: 'One page',
            points: 5,
            why: 'A briefing is short.',
            hint: '80 to 400 words.',
          },
        ],
      },
    },
    {
      id: 'offer',
      kind: 'decide',
      phase: 'meeting',
      title: 'Their proposal',
      prompt:
        'Their finance director offers to pay the £12,000 over 60 days “when cash allows”. What do you say?',
      points: 25,
      options: [
        {
          id: 'plan',
          label:
            'Propose three monthly instalments of £4,000, with new invoices paid within 30 days',
          verdict: 'best',
          why: 'Firm about what is owed, realistic for them, and it stops the debt growing.',
          effects: { indicators: { risk: -3, satisfaction: 2 } },
        },
        {
          id: 'accept',
          label: 'Accept “when cash allows” to keep them happy',
          verdict: 'poor',
          why: 'Vague promises are how debts become bad debts.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'stop',
          label: 'Say we will stop all work until everything is paid',
          verdict: 'acceptable',
          why: 'A real option if talks fail, but leading with it damages a good client relationship.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action the right owner.',
      points: 25,
      people: people(
        ['me', 'You'],
        ['northgate', 'Northgate Motors'],
        ['daniel', 'Daniel Okoro'],
      ),
      items: [
        {
          id: 'confirm',
          label: 'Confirm the payment plan in writing today',
          owner: 'me',
          why: 'You led the meeting and agreed the plan.',
        },
        {
          id: 'first',
          label: 'Pay the first £4,000 instalment by the 30th',
          owner: 'northgate',
          why: 'The client pays the instalments.',
        },
        {
          id: 'terms',
          label: 'Approve the plan as an exception to standard terms',
          owner: 'daniel',
          why: 'Exceptions to credit terms need the manager’s approval.',
        },
      ],
    },
    {
      id: 'confirm',
      kind: 'reply',
      phase: 'after',
      to: 'Northgate Motors finance director',
      title: 'Confirm the agreement',
      prompt: 'Confirm what was agreed, in writing.',
      points: 20,
      minWords: 40,
      mentions: [['4,000', '4000'], ['30 days'], ['thank']],
      avoid: [],
      model:
        'Thank you for meeting us today. To confirm what we agreed: the £12,000 over 60 days will be paid in three monthly instalments of £4,000, the first by the 30th, and new invoices will be paid within 30 days. Please let me know if anything here is not as you understood it. Kind regards, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3, indicators: { risk: 3 } },
  },
  replies: replies(
    'Daniel',
    'Excellent. Northgate paid the first instalment early, and they were complimentary about how you handled it.',
  ),
  lapseLog: 'The Northgate Motors meeting went ahead unprepared.',
  skills: { 'financial-reporting': 20, reconciliation: 10, accuracy: 10 },
  xp: 110,
}

// ---------------------------------------------------------------------------
// IT Help Desk: the change advisory board
// ---------------------------------------------------------------------------

const itCab: CaseInput = {
  id: 'mtg-it-cab',
  version: 1,
  careerId: 'it-support',
  kind: 'meeting',
  minLevel: 3,
  title: 'Present a change to the change advisory board',
  summary:
    'You want to update every laptop’s VPN software. Write the change request and get it approved.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'network-intranet' },
  deadlineHours: 8,
  meeting: {
    title: 'Change advisory board',
    inHours: 3,
    minutes: 30,
    room: 'Meeting room 1',
  },
  email: {
    subject: 'VPN update: take it to the CAB',
    body: `Hi {name},

The VPN software on our laptops has a security flaw, and the vendor has a fix. It’s your change: write the change request and present it at today’s change advisory board (in about three hours). They’ll want to know the risk, the plan, how we test it and how we roll back.

Ravi`,
  },
  whyItMatters:
    'Changes to systems cause most outages. Change advisory boards exist to make sure every change has a plan, a test, a rollback and the right timing, and presenting one well is a key skill for senior support staff.',
  objectives: [
    'Write a change request',
    'Defend a plan under questioning',
    'Agree actions and owners',
  ],
  evidence: [
    {
      id: 'advisory',
      title: 'Vendor advisory',
      text: 'VPN client 5.2 and earlier: a flaw lets an attacker on the same Wi-Fi network intercept connections. Fixed in 5.3. **Severity: high.**',
    },
    {
      id: 'estate',
      title: 'Our laptops',
      text: '118 laptops on VPN 5.2. Updates can be pushed in groups; a restart is needed.',
    },
  ],
  steps: [
    {
      id: 'request',
      kind: 'document',
      phase: 'prepare',
      title: 'The change request',
      prompt:
        'Write the change request: the reason, the plan, the testing and the rollback.',
      points: 35,
      deliverable: {
        kind: 'doc',
        title: 'Change request: VPN 5.3',
        template: 'report',
        checks: [
          {
            id: 'sections',
            type: 'sections',
            title: 'The sections a CAB expects',
            sections: [
              ['Summary', 'Executive summary', 'Reason'],
              ['Plan', 'Findings'],
              ['Rollback', 'Recommendations'],
            ],
            points: 15,
            why: 'The board needs the reason, the plan and the way back.',
            hint: 'Headings for the reason, the plan and the rollback.',
          },
          {
            id: 'content',
            type: 'mentions',
            title: 'Risk, testing and rollback',
            terms: [
              ['5.3'],
              ['pilot', 'test group', 'testing'],
              ['roll back', 'rollback'],
            ],
            points: 15,
            why: 'Every change needs a test and a way back.',
            hint: 'Mention the version, a pilot group and the rollback.',
          },
          {
            id: 'length',
            type: 'length',
            min: 120,
            max: 700,
            title: 'Length',
            points: 5,
            why: 'Complete but readable.',
            hint: '120 to 700 words.',
          },
        ],
      },
    },
    {
      id: 'challenge',
      kind: 'decide',
      phase: 'meeting',
      title: 'A challenge from the board',
      prompt:
        'The Operations Director says: “Do it all tonight, it’s high severity.” What do you say?',
      points: 25,
      options: [
        {
          id: 'pilot',
          label:
            'Pilot on 10 laptops tomorrow, then the rest in two groups over two days, with rollback ready',
          verdict: 'best',
          why: 'It fixes the flaw within days while limiting the damage if the update causes problems.',
          effects: { indicators: { risk: -4 } },
        },
        {
          id: 'tonight',
          label: 'Agree: push it to all 118 tonight',
          verdict: 'poor',
          why: 'An untested update to every laptop at once could stop everyone working tomorrow.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'next-month',
          label: 'Wait for next month’s maintenance window',
          verdict: 'poor',
          why: 'A high-severity flaw shouldn’t stay open for a month.',
          effects: { indicators: { risk: 6 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action the right owner.',
      points: 25,
      people: people(
        ['me', 'You'],
        ['ravi', 'Ravi Menon'],
        ['comms', 'Internal communications'],
      ),
      items: [
        {
          id: 'pilot',
          label: 'Run the pilot on 10 laptops tomorrow',
          owner: 'me',
          why: 'It is your change.',
        },
        {
          id: 'notice',
          label: 'Tell staff a restart will be needed',
          owner: 'comms',
          why: 'Company-wide notices go through internal communications.',
        },
        {
          id: 'approve',
          label: 'Approve the full roll-out after the pilot',
          owner: 'ravi',
          why: 'The change owner’s manager approves the next stage.',
        },
      ],
    },
    {
      id: 'summary',
      kind: 'reply',
      phase: 'after',
      to: 'The change advisory board',
      title: 'Confirm the plan',
      prompt: 'Confirm what the board approved.',
      points: 15,
      minWords: 35,
      mentions: [['pilot'], ['rollback', 'roll back'], ['5.3']],
      avoid: [],
      model:
        'Thanks all. To confirm: the board approved the VPN 5.3 update with a pilot on 10 laptops tomorrow, then the rest in two groups over the next two days, with the rollback to 5.2 ready at each stage. Internal communications will warn staff about the restart. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -3 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -3, indicators: { risk: 4 } },
  },
  replies: replies(
    'Ravi',
    'The CAB approved it first time, and the pilot went perfectly. Well presented.',
  ),
  lapseLog: 'The VPN change missed the change advisory board.',
  skills: { 'incident-management': 20, 'technical-writing': 20, troubleshooting: 10 },
  xp: 110,
}

// ---------------------------------------------------------------------------
// Digital Marketing: a client campaign review
// ---------------------------------------------------------------------------

const mktReview: CaseInput = {
  id: 'mtg-mkt-review',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'meeting',
  minLevel: 3,
  title: 'The quarterly review with a client',
  summary: 'Present Brightpath Clinics’ quarter and agree the next quarter’s plan.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'campaign-budget' },
  deadlineHours: 8,
  meeting: {
    title: 'Brightpath Clinics quarterly review',
    inHours: 3,
    minutes: 45,
    room: 'Client room',
  },
  email: {
    subject: 'Brightpath review this afternoon',
    body: `Hi {name},

You’re leading the Brightpath Clinics quarterly review this afternoon. Please prepare **4 to 6 slides**: results against target (**420 bookings** against **400**, at **£31** each against £35), what worked, and the plan for next quarter.

Sofia`,
  },
  whyItMatters:
    'Client reviews keep accounts. Presenting results honestly, handling pressure on budgets with evidence and leaving with clear next steps is what makes clients stay.',
  objectives: [
    'Present results against targets',
    'Handle a budget challenge with evidence',
    'Agree the next steps',
  ],
  evidence: [
    {
      id: 'results',
      title: 'Quarter results',
      table: {
        head: ['Metric', 'Target', 'Result'],
        rows: [
          ['Bookings', '400', '420'],
          ['Cost per booking', '£35', '£31'],
          ['Best channel', '', 'Search (£24 per booking)'],
          ['Weakest channel', '', 'Display (£58 per booking)'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'deck',
      kind: 'document',
      phase: 'prepare',
      title: 'The review slides',
      prompt:
        'Prepare 4 to 6 slides with the results, what worked and next quarter’s plan.',
      points: 35,
      deliverable: {
        kind: 'slides',
        title: 'Brightpath Clinics: quarterly review',
        template: 'business-review',
        checks: [
          {
            id: 'length',
            type: 'length',
            min: 4,
            max: 6,
            title: 'Four to six slides',
            points: 10,
            why: 'A focused review.',
            hint: 'Delete what you don’t need.',
          },
          {
            id: 'results',
            type: 'figures',
            title: 'The results',
            figures: [
              { label: 'bookings', value: 420 },
              { label: 'cost per booking', value: 31 },
            ],
            points: 15,
            why: 'Lead with the results against target.',
            hint: '420 bookings at £31 each.',
          },
          {
            id: 'plan',
            type: 'mentions',
            title: 'What worked and the plan',
            terms: [['search'], ['display'], ['next quarter', 'plan']],
            points: 10,
            why: 'Clients want to know what you will do next.',
            hint: 'Search worked best; display was weakest.',
          },
        ],
      },
    },
    {
      id: 'cut',
      kind: 'decide',
      phase: 'meeting',
      title: 'The client wants to cut the budget',
      prompt:
        'Their marketing lead says: “Great results, so let’s cut the budget by 30%.” What do you say?',
      points: 25,
      options: [
        {
          id: 'reallocate',
          label:
            'Suggest keeping the budget but moving display money into search, which brings bookings at £24',
          verdict: 'best',
          why: 'It answers their wish to spend wisely with evidence, and grows bookings.',
          effects: { indicators: { satisfaction: 4 } },
        },
        {
          id: 'agree',
          label: 'Agree to the 30% cut',
          verdict: 'acceptable',
          why: 'Their choice, but you haven’t shown them the better option.',
          effects: { indicators: { satisfaction: 1 } },
        },
        {
          id: 'refuse',
          label: 'Say a cut would ruin the results',
          verdict: 'poor',
          why: 'Defensive, and it doesn’t offer anything.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action the right owner.',
      points: 25,
      people: people(
        ['me', 'You'],
        ['client', 'Brightpath Clinics'],
        ['sofia', 'Sofia Alvarez'],
      ),
      items: [
        {
          id: 'plan',
          label: 'Send the revised plan moving display budget to search',
          owner: 'me',
          why: 'You proposed it.',
        },
        {
          id: 'sign',
          label: 'Sign off next quarter’s plan',
          owner: 'client',
          why: 'The client approves their own spend.',
        },
        {
          id: 'contract',
          label: 'Update the contract schedule for next quarter',
          owner: 'sofia',
          why: 'Contract changes go through the account’s manager.',
        },
      ],
    },
    {
      id: 'recap',
      kind: 'reply',
      phase: 'after',
      to: 'Brightpath Clinics',
      title: 'Send the recap',
      prompt: 'Thank them and confirm the agreed next steps.',
      points: 15,
      minWords: 35,
      mentions: [['search'], ['display'], ['thank']],
      avoid: [],
      model:
        'Thank you for a great review today. As agreed, we will keep the budget for next quarter but move the display spend into search, which brought bookings at £24 each. I will send the revised plan this week for you to sign off. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { satisfaction: 3 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { reputation: -3, indicators: { satisfaction: -5 } },
  },
  replies: replies(
    'Sofia',
    'Brightpath signed the revised plan this afternoon. Brilliant review.',
  ),
  lapseLog: 'The Brightpath review happened without your slides.',
  skills: { presentation: 25, 'campaign-analytics': 20 },
  xp: 110,
}

// ---------------------------------------------------------------------------
// Data Analysis: a project review
// ---------------------------------------------------------------------------

const dataReview: CaseInput = {
  id: 'mtg-data-review',
  version: 1,
  careerId: 'data-analytics',
  kind: 'meeting',
  minLevel: 3,
  title: 'Present the client portfolio findings',
  summary:
    'Present the portfolio review to the leadership team and agree what happens next.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'portfolio-review' },
  deadlineHours: 8,
  meeting: {
    title: 'Leadership project review',
    inHours: 3,
    minutes: 40,
    room: 'Board room',
  },
  email: {
    subject: 'Leadership review: your findings',
    body: `Hi {name},

Leadership want the client portfolio findings at today’s project review. Please prepare **4 to 6 slides**: the key finding (**3 clients bring 52% of revenue**), the risk that creates, and your recommendations.

Amara`,
  },
  whyItMatters:
    'Analysis only creates value when leaders understand it and act on it. Presenting a clear message, standing by the evidence and leaving with owned actions is what turns insight into decisions.',
  objectives: [
    'Present findings to leaders',
    'Stand by the evidence under pressure',
    'Turn insight into owned actions',
  ],
  evidence: [
    {
      id: 'findings',
      title: 'Portfolio review: key findings',
      text: '3 of 42 clients bring **52%** of revenue. Losing any one of them would cut revenue by at least 14%. The next 10 clients are growing fastest.',
    },
  ],
  steps: [
    {
      id: 'deck',
      kind: 'document',
      phase: 'prepare',
      title: 'The slides',
      prompt: 'Prepare 4 to 6 slides: the finding, the risk and the recommendations.',
      points: 35,
      deliverable: {
        kind: 'slides',
        title: 'Client portfolio: findings',
        template: 'business-review',
        checks: [
          {
            id: 'length',
            type: 'length',
            min: 4,
            max: 6,
            title: 'Four to six slides',
            points: 10,
            why: 'Leaders have little time.',
            hint: 'Keep 4 to 6 slides.',
          },
          {
            id: 'finding',
            type: 'figures',
            title: 'The key finding',
            figures: [{ label: 'share of revenue from 3 clients', value: 52 }],
            points: 15,
            why: 'Lead with the headline.',
            hint: '3 clients bring 52% of revenue.',
          },
          {
            id: 'recommend',
            type: 'mentions',
            title: 'Risk and recommendations',
            terms: [['risk'], ['recommend']],
            points: 10,
            why: 'Findings need a “so what”.',
            hint: 'Say what the risk is and what to do.',
          },
        ],
      },
    },
    {
      id: 'pressure',
      kind: 'decide',
      phase: 'meeting',
      title: 'A challenge in the room',
      prompt:
        'A director says: “Those three are our best clients; there’s no risk, take that slide out.” What do you do?',
      points: 25,
      options: [
        {
          id: 'evidence',
          label:
            'Keep it, calmly: agree they are valuable, and show that losing one would cut revenue by at least 14%',
          verdict: 'best',
          why: 'You respect the point and stand by the evidence: that is what leaders need from an analyst.',
          effects: { trust: { manager: 2 }, indicators: { risk: -2 } },
        },
        {
          id: 'remove',
          label: 'Take the slide out to avoid conflict',
          verdict: 'poor',
          why: 'Hiding a real risk to please someone is how organisations get surprised.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'argue',
          label: 'Tell the director they are wrong',
          verdict: 'acceptable',
          why: 'The evidence is on your side, but winning the argument matters less than being heard.',
          effects: { trust: { manager: -1 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action the right owner.',
      points: 25,
      people: people(['me', 'You'], ['sales', 'Head of Sales'], ['amara', 'Amara Nwosu']),
      items: [
        {
          id: 'growth',
          label: 'Plan account growth for the 10 fastest-growing clients',
          owner: 'sales',
          why: 'Account plans belong to Sales.',
        },
        {
          id: 'monitor',
          label: 'Add a client-concentration measure to the monthly dashboard',
          owner: 'me',
          why: 'You built the analysis and own the dashboard.',
        },
        {
          id: 'board',
          label: 'Take the risk to the board’s risk register',
          owner: 'amara',
          why: 'The head of the team reports risks to the board.',
        },
      ],
    },
    {
      id: 'recap',
      kind: 'reply',
      phase: 'after',
      to: 'The leadership team',
      title: 'Send the summary',
      prompt: 'Summarise the finding and the agreed actions.',
      points: 15,
      minWords: 35,
      mentions: [['52%', '52 per cent'], ['dashboard'], ['risk register', 'board']],
      avoid: [],
      model:
        'Thank you all. Summary: 3 clients bring 52% of our revenue, so losing one would cut revenue by at least 14%. Actions: Sales will plan growth for our 10 fastest-growing clients; I will add a client-concentration measure to the monthly dashboard; Amara will add the risk to the board’s risk register. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -3 },
  },
  replies: replies(
    'Amara',
    'Leadership adopted every recommendation. And thank you for holding your ground on the risk slide.',
  ),
  lapseLog: 'The project review went ahead without your findings.',
  skills: { 'insight-communication': 30, 'data-visualisation': 15 },
  xp: 110,
}

// ---------------------------------------------------------------------------
// Software Development: the sprint review
// ---------------------------------------------------------------------------

const devReview: CaseInput = {
  id: 'mtg-dev-sprint-review',
  version: 1,
  careerId: 'software-development',
  kind: 'meeting',
  minLevel: 3,
  title: 'Demo the sprint to the stakeholders',
  summary: 'Prepare the sprint review, demo it, and handle a late change request.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'billing-report' },
  deadlineHours: 8,
  meeting: { title: 'Sprint review', inHours: 3, minutes: 45, room: 'Meeting room 1' },
  email: {
    subject: 'Sprint review this afternoon',
    body: `Hi {name},

You’re running the sprint review this afternoon. Please prepare **3 to 5 slides**: what we finished (the **billing report** and **timesheet validation**), what we didn’t (**CSV export**, moved to next sprint) and what’s next.

Samuel`,
  },
  whyItMatters:
    'Sprint reviews keep stakeholders and developers aligned. Being honest about what wasn’t finished and handling new requests through the backlog protects the team’s focus and the stakeholders’ trust.',
  objectives: [
    'Present progress honestly',
    'Handle a late request through the backlog',
    'Agree owners for follow-ups',
  ],
  evidence: [
    {
      id: 'sprint',
      title: 'Sprint summary',
      table: {
        head: ['Item', 'Status'],
        rows: [
          ['Billing report', 'Done'],
          ['Timesheet validation', 'Done'],
          ['CSV export', 'Not finished: moved to next sprint'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'deck',
      kind: 'document',
      phase: 'prepare',
      title: 'The review slides',
      prompt: 'Prepare 3 to 5 slides: done, not done, and next.',
      points: 35,
      deliverable: {
        kind: 'slides',
        title: 'Sprint review',
        template: 'project-update',
        checks: [
          {
            id: 'length',
            type: 'length',
            min: 3,
            max: 5,
            title: 'Three to five slides',
            points: 10,
            why: 'Short and focused.',
            hint: 'Keep 3 to 5 slides.',
          },
          {
            id: 'done',
            type: 'mentions',
            title: 'Done and not done',
            terms: [['billing report'], ['timesheet'], ['CSV']],
            points: 15,
            why: 'Be clear about what was and wasn’t finished.',
            hint: 'Mention all three items.',
          },
          {
            id: 'next',
            type: 'mentions',
            title: 'What’s next',
            terms: [['next sprint']],
            points: 10,
            why: 'Stakeholders want to know what’s coming.',
            hint: 'Say what happens next sprint.',
          },
        ],
      },
    },
    {
      id: 'late',
      kind: 'decide',
      phase: 'meeting',
      title: 'A late request',
      prompt:
        'Finance asks: “Can you also add PDF export to the billing report before Friday?” What do you say?',
      points: 25,
      options: [
        {
          id: 'backlog',
          label:
            'Add it to the backlog to be prioritised for next sprint, after the CSV export already promised',
          verdict: 'best',
          why: 'It respects the plan and the commitment already made, and the request will be considered properly.',
          effects: { indicators: { satisfaction: 1, risk: -2 } },
        },
        {
          id: 'yes',
          label: 'Say yes, it’s small',
          verdict: 'poor',
          why: 'Unplanned work pushes back promised work, and “small” is often wrong.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'no',
          label: 'Say no: the sprint is fixed',
          verdict: 'acceptable',
          why: 'Protects the sprint, but the request deserves a place in the backlog.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action the right owner.',
      points: 25,
      people: people(
        ['me', 'You'],
        ['finance', 'Finance (Marcus)'],
        ['samuel', 'Samuel Adeyemi'],
      ),
      items: [
        {
          id: 'story',
          label: 'Write the PDF export request as a backlog item',
          owner: 'me',
          why: 'You took the request in the review.',
        },
        {
          id: 'examples',
          label: 'Send example PDFs Finance needs',
          owner: 'finance',
          why: 'The requester knows what they need.',
        },
        {
          id: 'priority',
          label: 'Prioritise next sprint’s backlog',
          owner: 'samuel',
          why: 'The engineering manager sets priorities.',
        },
      ],
    },
    {
      id: 'recap',
      kind: 'reply',
      phase: 'after',
      to: 'Sprint review attendees',
      title: 'Send the summary',
      prompt: 'Summarise the review and the actions.',
      points: 15,
      minWords: 35,
      mentions: [['CSV'], ['PDF'], ['backlog']],
      avoid: [
        {
          terms: ['by Friday'],
          why: 'Don’t promise the PDF export by Friday: it hasn’t been planned.',
        },
      ],
      model:
        'Thanks all. This sprint we finished the billing report and timesheet validation; the CSV export moves to next sprint. Finance’s PDF export request is now on the backlog: Marcus will send example PDFs, and Samuel will prioritise it with next sprint’s work. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -1 } },
    fail: { reputation: -1 },
    lapse: { reputation: -3, indicators: { satisfaction: -2 } },
  },
  replies: replies(
    'Samuel',
    'A really professional review, and the PDF request went exactly where it should.',
  ),
  lapseLog: 'The sprint review went ahead without you.',
  skills: { 'software-design': 20, 'technical-writing': 20 },
  xp: 110,
}

export const MEETING_CASES: CaseInput[] = [
  faTeam,
  accClient,
  itCab,
  mktReview,
  dataReview,
  devReview,
]
