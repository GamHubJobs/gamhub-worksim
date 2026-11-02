/** Operations cases: it-support. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

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

export const OPERATIONS_IT: CaseInput[] = [it]
