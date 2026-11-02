/** Workflows cases: software-development. */
import type { CaseInput } from '../schema'
import { replies, followUpReplies } from './shared'

const devEscalation: CaseInput = {
  id: 'wf-dev-escalation',
  version: 1,
  careerId: 'software-development',
  kind: 'workflow',
  minLevel: 2,
  title: 'An escalation from the service desk',
  summary:
    'IT Support has escalated a client problem. Turn it into a proper engineering ticket.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
  },
  trigger: { afterAssignment: 'debug-nan' },
  deadlineHours: 5,
  email: {
    subject: 'Escalation: INC-3318 client portal',
    body: `Hi,

We’ve escalated INC-3318 to Engineering (details attached). Can you raise it in the engineering backlog so it gets picked up properly?

Ravi`,
  },
  whyItMatters:
    'Support and Engineering only work well together when escalations become clear tickets: how to reproduce it, who is affected and how badly. A badly written or wrongly prioritised ticket wastes days.',
  objectives: [
    'Turn a support escalation into an engineering ticket',
    'Set severity from impact',
    'Capture the steps to reproduce',
  ],
  evidence: [
    {
      id: 'incident',
      title: 'INC-3318 (service desk)',
      text: 'Reported by **Harbour Foods** (client). Since **version 2.4** was released on Tuesday, the client portal shows the **wrong invoice totals** (VAT added twice) for every client with discounts. Steps: log in as a client with a discount, open any invoice. Workaround: none; clients are refusing to pay.',
    },
    {
      id: 'severity',
      title: 'Engineering severity levels',
      table: {
        head: ['Severity', 'Meaning'],
        rows: [
          ['S1', 'Many users or clients affected, money or data wrong, no workaround'],
          ['S2', 'Important feature broken, workaround exists'],
          ['S3', 'Minor problem or cosmetic'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The engineering ticket',
      prompt: 'Complete the ticket for the engineering backlog.',
      to: 'Engineering backlog',
      points: 75,
      fields: [
        {
          id: 'severity',
          label: 'Severity',
          kind: 'choice',
          options: ['S1', 'S2', 'S3'],
          answer: 'S1',
          why: 'Every discounted client sees wrong money, with no workaround: S1.',
        },
        {
          id: 'version',
          label: 'Version where it started',
          kind: 'text',
          accept: ['2.4', 'v2.4', 'version 2.4'],
          why: 'It started with version 2.4 on Tuesday.',
        },
        {
          id: 'affected',
          label: 'Who is affected',
          kind: 'choice',
          options: ['Harbour Foods only', 'Every client with a discount', 'Every client'],
          answer: 'Every client with a discount',
          why: 'The incident says every client with discounts.',
        },
        {
          id: 'expected',
          label: 'Expected behaviour',
          kind: 'choice',
          options: ['VAT added once', 'No VAT on discounted invoices', 'VAT added twice'],
          answer: 'VAT added once',
          why: 'VAT should be added once; it is being added twice.',
        },
      ],
    },
    {
      id: 'communicate',
      kind: 'decide',
      title: 'The clients',
      prompt: 'Clients are refusing to pay. What do you suggest to Ravi?',
      points: 25,
      options: [
        {
          id: 'tell',
          label:
            'Tell affected clients we know about it, the invoices are being corrected, and they’ll get corrected copies',
          verdict: 'best',
          why: 'Clients are told the truth and know what will happen; Support can answer calls consistently.',
          effects: { indicators: { satisfaction: 3 } },
        },
        {
          id: 'quiet',
          label: 'Say nothing until the fix is released',
          verdict: 'poor',
          why: 'Clients keep seeing wrong totals and lose trust.',
          effects: { indicators: { satisfaction: -4 } },
        },
        {
          id: 'rollback-claim',
          label: 'Tell clients it’s fixed today, to calm things down',
          verdict: 'poor',
          why: 'Promising a fix you don’t have makes it worse when it isn’t.',
          effects: { indicators: { satisfaction: -3, risk: 2 } },
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -4, risk: 3 } },
  },
  replies: replies(
    'Ravi',
    'Perfect ticket: Engineering picked it up as S1 within the hour. Clients have been told.',
    'Engineering has questions about the ticket.',
  ),
  lapseLog:
    'INC-3318 sat in Support with no engineering ticket while clients refused to pay.',
  skills: { debugging: 20, 'software-testing': 15 },
  xp: 85,
}

const devEscalationFix: CaseInput = {
  id: 'wf-dev-escalation-fix',
  version: 1,
  careerId: 'software-development',
  kind: 'workflow',
  minLevel: 2,
  title: 'The escalation was picked up too late',
  summary:
    'The invoice bug sat in the backlog for days. Clients are now complaining to the directors.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: {
    afterCase: 'wf-dev-escalation',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 3,
  email: {
    subject: 'Why did INC-3318 wait so long?',
    body: `Hi {name},

The VAT bug from INC-3318 waited in the backlog for days because the ticket didn’t show how serious it was. Clients have complained to the directors. Let’s fix it and the process.

Samuel`,
  },
  whyItMatters:
    'Getting severity wrong delays the most important work. Owning it and fixing the process stops a repeat.',
  objectives: ['Recover from a mis-prioritised ticket', 'Improve the escalation process'],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'Recover',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'fix-and-check',
          label:
            'Correct the ticket to S1 so it is fixed now, and agree a checklist with Support for severity and affected clients on every escalation',
          verdict: 'best',
          why: 'It gets the fix moving and prevents the next mis-prioritised escalation.',
          effects: { indicators: { risk: -3 } },
        },
        {
          id: 'fix-only',
          label: 'Correct the ticket to S1',
          verdict: 'acceptable',
          why: 'It fixes this one, but the next escalation could go wrong the same way.',
        },
        {
          id: 'blame-support',
          label: 'Point out that Support’s escalation wasn’t clear enough',
          verdict: 'poor',
          why: 'The details were in the incident; the ticket was ours to get right.',
          effects: { trust: { manager: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Samuel Adeyemi',
      title: 'Reply to Samuel',
      prompt: 'Own it and say what will change.',
      points: 50,
      minWords: 35,
      mentions: [
        ['S1', 'severity'],
        ['checklist', 'process'],
        ['sorry', 'my mistake', 'apologies'],
      ],
      avoid: [{ terms: ['support’s fault'], why: 'Own your part.' }],
      model:
        'Hi Samuel, sorry, my mistake: the ticket did not show the severity the incident described. I have corrected it to S1 so it is being fixed now, and I have agreed a short checklist with Support so every escalation records the severity and the affected clients. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -3, indicators: { satisfaction: -3 } },
  },
  replies: followUpReplies('Samuel'),
  lapseLog: 'The VAT bug waited even longer, and more clients complained.',
  skills: { 'software-design': 10, debugging: 10 },
  xp: 45,
}

export const WORKFLOW_DEV: CaseInput[] = [devEscalation, devEscalationFix]
