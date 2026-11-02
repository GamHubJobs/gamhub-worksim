/** Operations cases: data-analytics. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

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

export const OPERATIONS_DATA: CaseInput[] = [data]
