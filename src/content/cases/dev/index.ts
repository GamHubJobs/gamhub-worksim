/** Software Development cases. */
import type { CaseInput } from '../schema'

const vagueBug: CaseInput = {
  id: 'dev-vague-bug',
  version: 1,
  careerId: 'software-development',
  kind: 'internal',
  title: 'A vague bug report',
  summary: 'Finance says “the timesheet app is broken”. That’s all.',
  from: {
    name: 'Marcus Webb',
    role: 'Senior Finance Assistant',
    organisation: 'Finance & Administration',
  },
  trigger: { afterAssignment: 'invoice-bug' },
  deadlineHours: 4,
  email: {
    subject: 'Timesheet app broken AGAIN',
    body: `Hi,

The timesheet app is broken again. Please fix it ASAP, we can’t do payroll.

Marcus`,
  },
  whyItMatters:
    'You can’t fix what you can’t reproduce. Asking the right questions, quickly and politely, and judging how urgent a report really is, saves hours of guessing and keeps users on side.',
  objectives: [
    'Recognise what a useful bug report contains',
    'Judge priority from the impact',
    'Ask for the information you need, politely',
  ],
  evidence: [
    {
      id: 'calendar',
      title: 'Payroll calendar',
      text: 'Timesheets close **Thursday 5 pm**; payroll runs Friday. Today is Wednesday.',
    },
    {
      id: 'status',
      title: 'System status',
      text: 'Timesheet app: up. No deployments since last Friday. 41 timesheets submitted today.',
    },
  ],
  steps: [
    {
      id: 'missing',
      kind: 'review',
      title: 'What the report is missing',
      prompt: 'Which of these do you need to know before you can investigate?',
      points: 35,
      findings: [
        {
          id: 'steps',
          text: 'What he did, step by step, before it went wrong.',
          issue: true,
          why: 'Steps to reproduce are the most useful part of any bug report.',
        },
        {
          id: 'error',
          text: 'What he saw: the error message or a screenshot.',
          issue: true,
          why: '“Broken” could mean a crash, a wrong total or a slow page.',
        },
        {
          id: 'who',
          text: 'Whether it affects everyone or just him.',
          issue: true,
          why: '41 people submitted today, so it may be specific to his account or entries.',
        },
        {
          id: 'favourite',
          text: 'Which browser he likes best.',
          issue: false,
          why: 'Which browser he used matters; which he likes doesn’t.',
        },
      ],
    },
    {
      id: 'priority',
      kind: 'decide',
      title: 'How urgent is it?',
      prompt: 'How do you prioritise it right now?',
      points: 25,
      options: [
        {
          id: 'high-confirm',
          label:
            'High, because payroll closes tomorrow: but confirm the impact first, since others are submitting fine',
          verdict: 'best',
          why: 'The deadline makes it urgent if it’s real, and the evidence says it may not affect everyone.',
          effects: { indicators: { satisfaction: 2 } },
        },
        {
          id: 'critical',
          label: 'Critical: drop everything and start debugging',
          verdict: 'acceptable',
          why: 'Fast, but without details you would be guessing, and the system looks healthy.',
        },
        {
          id: 'low',
          label: 'Low: the system is up and others are fine',
          verdict: 'poor',
          why: 'If Finance really can’t submit, payroll is at risk on Friday.',
          effects: { indicators: { risk: 4, satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Marcus Webb, Finance',
      title: 'Reply to Marcus',
      prompt: 'Ask for what you need, and reassure him about the deadline.',
      points: 40,
      minWords: 45,
      mentions: [
        ['steps', 'what you did'],
        ['error', 'screenshot', 'message'],
        ['payroll', 'Thursday'],
      ],
      avoid: [
        {
          terms: ['works for me', 'user error'],
          why: 'Don’t dismiss the report before you’ve looked.',
        },
      ],
      model:
        'Hi Marcus, sorry you have hit a problem, I will look at it straight away so payroll is not affected. Could you tell me the steps you took before it went wrong, and send the error message or a screenshot? Also, is it only your timesheet, or are colleagues affected too? The app is up and others are submitting, so it may be something specific I can fix quickly before the Thursday deadline. Thanks, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -4, risk: 3 } },
  },
  replies: {
    excellent: `Hi {name},

Sorry, should have said! Screenshot attached: it only happens when I enter half days. Thanks for jumping on it.

Marcus`,
    good: `Hi {name},

Will send a screenshot.

Marcus`,
    pass: `Hi {name},

It’s just broken. Can you look?

Marcus`,
    fail: `Hi {name},

So is anyone going to fix it?

Marcus`,
  },
  lapseLog: 'Finance escalated the timesheet problem to {manager}: nobody replied.',
  skills: { debugging: 20, 'software-testing': 15 },
  xp: 70,
}

const featureDeadline: CaseInput = {
  id: 'dev-feature-deadline',
  version: 1,
  careerId: 'software-development',
  kind: 'internal',
  title: 'A feature request with an impossible deadline',
  summary: 'Marketing wants a whole client portal by Friday.',
  from: { name: 'Sofia Alvarez', role: 'Marketing Manager', organisation: 'Marketing' },
  trigger: { afterAssignment: 'git-first-fix' },
  deadlineHours: 6,
  email: {
    subject: 'Client portal by Friday?',
    body: `Hi,

We’re launching the Cash-flow Health Check on Monday. Could you build a **client portal** by Friday where clients can **book a health check**, **upload their accounts**, **see their report** and **pay online**?

Sofia`,
  },
  whyItMatters:
    'Developers are often asked for more than can be built safely in the time. Agreeing the smallest version that meets the real goal, and saying clearly what comes later, protects quality and the launch.',
  objectives: [
    'Estimate work honestly',
    'Find the smallest version that meets the goal',
    'Negotiate scope instead of over-promising',
  ],
  evidence: [
    {
      id: 'estimates',
      title: 'Rough estimates (developer days)',
      table: {
        head: ['Feature', 'Days', 'Notes'],
        rows: [
          ['Booking form', '1', 'Reuses the calendar component'],
          ['Upload accounts', '3', 'Needs secure storage and a security review'],
          ['See report', '2', 'Needs client logins'],
          ['Pay online', '4', 'Payment provider setup and testing'],
        ],
      },
    },
    {
      id: 'capacity',
      title: 'Your time',
      text: 'You have **3 developer days** before Friday.',
    },
  ],
  steps: [
    {
      id: 'total',
      kind: 'figure',
      title: 'The full request',
      prompt: 'How many developer days would the whole portal take?',
      points: 20,
      answer: 10,
      tolerance: 0,
      unit: 'days',
      why: '1 + 3 + 2 + 4 = 10 days, more than three times what is available.',
    },
    {
      id: 'scope',
      kind: 'decide',
      title: 'What you propose',
      prompt: 'What do you offer for Monday?',
      points: 40,
      options: [
        {
          id: 'booking-first',
          label:
            'The booking form for Monday (1 day, tested properly), with uploads, reports and payment planned for the following weeks',
          verdict: 'best',
          why: 'Bookings are what the launch needs; the rest needs security and payment work that must not be rushed.',
          effects: { trust: { manager: 2 }, indicators: { satisfaction: 2, risk: -2 } },
        },
        {
          id: 'all-rushed',
          label: 'Try to build everything by working the weekend',
          verdict: 'poor',
          why: 'Ten days in three, including payments and uploaded financial data, means untested, insecure code at launch.',
          effects: { indicators: { risk: 8 } },
        },
        {
          id: 'booking-upload',
          label: 'Booking form and uploads (4 days) by squeezing the security review',
          verdict: 'poor',
          why: 'Skipping the review for uploaded accounts puts clients’ financial data at risk.',
          effects: { indicators: { risk: 6 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Sofia Alvarez, Marketing',
      title: 'Reply to Sofia',
      prompt: 'Say what you can deliver for Monday, what comes later and why.',
      points: 40,
      minWords: 50,
      mentions: [
        ['booking'],
        ['Monday'],
        ['10 days', 'ten days', 'later', 'following weeks'],
      ],
      avoid: [
        {
          terms: ['no problem', 'easy'],
          why: 'It isn’t: be honest about the size of the work.',
        },
      ],
      model:
        'Hi Sofia, thanks, the launch sounds great. The full portal is about 10 developer days and I have 3 before Friday, so I suggest we launch on Monday with the booking form, properly tested, as that is what new clients need first. Uploading accounts, seeing reports and paying online need security and payment work that must not be rushed, so I will plan them for the following weeks and send you dates. Best, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 1 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: {
    excellent: `Hi {name},

Makes total sense. Booking form for Monday it is, thank you for being clear.

Sofia`,
    good: `Hi {name},

OK, let’s do the booking form first.

Sofia`,
    pass: `Hi {name},

Hmm, I’m not sure what we’ll have on Monday.

Sofia`,
    fail: `Hi {name},

That doesn’t help us launch.

Sofia`,
  },
  lapseLog: 'Marketing planned the launch without hearing back about the portal.',
  skills: { 'software-design': 25, programming: 10 },
  xp: 75,
}

export const DEV_CASES: CaseInput[] = [vagueBug, featureDeadline]
