/** Digital Marketing cases. */
import type { CaseInput } from '../schema'

const briefChange: CaseInput = {
  id: 'mkt-brief-change',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'client',
  title: 'A client changes the brief mid-campaign',
  summary: 'Meadow Care Homes wants to add a second audience without adding budget.',
  from: { name: 'Rita Osei', role: 'Marketing Lead', organisation: 'Meadow Care Homes' },
  trigger: { afterAssignment: 'content-calendar' },
  deadlineHours: 6,
  email: {
    subject: 'Small change to our campaign',
    body: `Hi,

Our board has asked us to recruit **care assistants** as well as finding new residents’ families. Could you add a recruitment audience to the campaign? We can’t increase the **£6,000** budget, and we still need the **150 enquiries** from families we agreed.

Thanks,
Rita Osei
Marketing Lead, Meadow Care Homes`,
  },
  whyItMatters:
    'Briefs change all the time. Good marketers work out what a change really costs, explain the trade-off honestly and offer options, instead of quietly over-promising or flatly refusing.',
  objectives: [
    'Work out what a change to a brief costs',
    'Explain a trade-off with figures',
    'Offer the client options, not just a yes or no',
  ],
  evidence: [
    {
      id: 'plan',
      title: 'The agreed campaign plan',
      table: {
        head: ['Line', 'Value'],
        rows: [
          ['Budget', '£6,000'],
          ['Cost per enquiry (families, so far)', '£40'],
          ['Enquiries needed', '150'],
          ['Spent so far', '£2,400 (60 enquiries)'],
        ],
      },
    },
    {
      id: 'benchmark',
      title: 'Recruitment benchmark',
      text: 'Care-assistant recruitment ads typically cost about £25 per application.',
    },
  ],
  steps: [
    {
      id: 'needed',
      kind: 'figure',
      title: 'Budget still needed for the families',
      prompt:
        'How much of the remaining budget do the 90 remaining family enquiries need?',
      points: 25,
      answer: 3600,
      tolerance: 0.5,
      unit: '£',
      why: '90 more enquiries at £40 each cost £3,600.',
    },
    {
      id: 'spare',
      kind: 'figure',
      title: 'What is left for recruitment',
      prompt: 'How much budget would be left for recruitment after that?',
      points: 20,
      answer: 0,
      tolerance: 0.5,
      unit: '£',
      why: '£6,000 − £2,400 spent − £3,600 needed = £0. There is nothing spare.',
    },
    {
      id: 'option',
      kind: 'decide',
      title: 'What you recommend',
      prompt: 'What do you propose to Rita?',
      points: 25,
      options: [
        {
          id: 'options',
          label:
            'Explain there is no room, and offer two options: add about £1,500 for ~60 applications, or move some family budget and accept fewer enquiries',
          verdict: 'best',
          why: 'Honest about the trade-off, with costed choices so the client decides.',
          effects: { indicators: { satisfaction: 3 } },
        },
        {
          id: 'squeeze',
          label: 'Agree to add recruitment within the budget and hope costs come down',
          verdict: 'poor',
          why: 'It over-promises: one of the two goals will be missed and the client will feel misled.',
          effects: { indicators: { satisfaction: -4, risk: 3 } },
        },
        {
          id: 'refuse',
          label: 'Say the brief is fixed and changes are not possible',
          verdict: 'acceptable',
          why: 'It protects the agreed goal but ignores a real business need you could help with.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Rita Osei, Meadow Care Homes',
      title: 'Reply to the client',
      prompt: 'Explain the trade-off with the figures and give her the options.',
      points: 30,
      minWords: 50,
      mentions: [['150'], ['3,600', '3600'], ['option'], ['recruit']],
      avoid: [
        {
          terms: ['no problem', 'easily'],
          why: 'It isn’t: there is no budget left, so don’t imply otherwise.',
        },
      ],
      model:
        'Hi Rita, thanks for letting us know. We have spent £2,400 for 60 family enquiries; the other 90 of the 150 need £3,600 at £40 each, which is the rest of the budget. So there is nothing spare for recruitment. Two options: add about £1,500 for a recruitment audience (roughly 60 applications at £25), or move part of the family budget to recruitment and accept fewer family enquiries. Happy to talk it through. Best, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -4 } },
  },
  replies: {
    excellent: `Hi {name},

That’s really helpful. The board has approved the extra £1,500. Let’s go!

Rita`,
    good: `Hi {name},

Thanks, I’ll take these options to the board.

Rita`,
    pass: `Hi {name},

Thanks, but I’m not sure what it means for our numbers.

Rita`,
    fail: `Hi {name},

This doesn’t answer my question.

Rita`,
  },
  lapseLog:
    'Meadow Care Homes chased the brief change with {manager}: no reply was sent.',
  skills: { 'campaign-analytics': 25, 'content-strategy': 20 },
  xp: 80,
}

const unhappyClient: CaseInput = {
  id: 'mkt-unhappy-results',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'client',
  title: 'A client is unhappy with the results',
  summary:
    'Okafor Build says the clicks are terrible. The enquiries tell a different story.',
  from: {
    name: 'Daniel Okafor',
    role: 'Managing Director',
    organisation: 'Okafor Build',
  },
  trigger: { afterAssignment: 'campaign-metrics' },
  deadlineHours: 6,
  email: {
    subject: 'Disappointing campaign',
    body: `Hi,

I’ve seen the report and the **click-through rate is 0.9%**. My nephew says 2% is normal. Are we wasting our money? I’m thinking of stopping the campaign.

Daniel Okafor`,
  },
  whyItMatters:
    'Clients often judge campaigns on the wrong number. Explaining honestly which metric matters for their goal, with their own figures, keeps good campaigns running and builds trust.',
  objectives: [
    'Judge a campaign on the metric that matches its goal',
    'Explain metrics to a non-specialist',
    'Respond to criticism with evidence, not defensiveness',
  ],
  evidence: [
    {
      id: 'report',
      title: 'Campaign report: Okafor Build, last 30 days',
      table: {
        head: ['Metric', 'Okafor Build', 'Industry average'],
        rows: [
          ['Click-through rate', '0.9%', '1.8%'],
          ['Cost per click', '£2.10', '£2.40'],
          ['Enquiry rate (of clicks)', '9%', '3%'],
          ['Cost per enquiry', '£23', '£80'],
          ['Enquiries', '52', ''],
        ],
      },
    },
    {
      id: 'goal',
      title: 'The agreed goal',
      text: 'Generate enquiries for home extensions in the local area at under £60 each.',
    },
  ],
  steps: [
    {
      id: 'read',
      kind: 'review',
      title: 'What the report says',
      prompt: 'Which of these are true?',
      points: 30,
      findings: [
        {
          id: 'goal-met',
          text: 'The campaign is beating its goal: £23 per enquiry against a target under £60.',
          issue: true,
          why: 'The goal is enquiries at under £60; it is far better than that.',
        },
        {
          id: 'ctr-low',
          text: 'The click-through rate is below average.',
          issue: true,
          why: 'True: 0.9% against 1.8%. Narrow local targeting usually means fewer, better clicks.',
        },
        {
          id: 'wasting',
          text: 'The low click-through rate means money is being wasted.',
          issue: false,
          why: 'You pay per click, and the clicks turn into enquiries three times more often than average.',
        },
        {
          id: 'stop',
          text: 'The report suggests the campaign should be stopped.',
          issue: false,
          why: 'It is one of the most efficient campaigns in the sector.',
        },
      ],
    },
    {
      id: 'advice',
      kind: 'decide',
      title: 'Your advice',
      prompt: 'What do you advise?',
      points: 30,
      options: [
        {
          id: 'keep',
          label:
            'Keep it running: explain cost per enquiry is the number that matters, and offer to report it first',
          verdict: 'best',
          why: 'It matches the client’s goal and fixes the confusion that caused the worry.',
          effects: { indicators: { satisfaction: 4 } },
        },
        {
          id: 'broaden',
          label: 'Broaden the targeting to raise the click-through rate',
          verdict: 'poor',
          why: 'It would raise clicks from people outside the area, and the cost per enquiry would rise.',
          effects: { indicators: { satisfaction: -2, risk: 2 } },
        },
        {
          id: 'pause',
          label: 'Agree to pause it while you review',
          verdict: 'poor',
          why: 'Pausing a campaign that beats its goal loses enquiries for no reason.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Daniel Okafor, Okafor Build',
      title: 'Reply to the client',
      prompt: 'Reassure him with his own figures and explain which number matters.',
      points: 40,
      minWords: 50,
      mentions: [['enquir'], ['£23', '23'], ['60'], ['click']],
      avoid: [
        {
          terms: ['your nephew is wrong', 'you misunderstood'],
          why: 'Explain without making him feel foolish.',
        },
      ],
      model:
        'Hi Daniel, thanks for raising this. You are right that the click-through rate is below average, but that is because the ads only show to people near you planning extensions. What matters is enquiries: 52 this month at £23 each, against your target of under £60 and an industry average of £80. So the campaign is working very well. I suggest we keep it running, and I will put cost per enquiry at the top of your report from now on. Best, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -3 } },
    lapse: { indicators: { satisfaction: -5 } },
  },
  replies: {
    excellent: `Hi {name},

That makes sense, thank you for explaining it so clearly. Keep it going!

Daniel`,
    good: `Hi {name},

OK, we’ll keep it running for now.

Daniel`,
    pass: `Hi {name},

I’m still not convinced, but let’s give it another month.

Daniel`,
    fail: `Hi {name},

Please pause the campaign.

Daniel`,
  },
  lapseLog: 'Okafor Build paused their campaign: nobody replied to their concerns.',
  skills: { 'campaign-analytics': 30, copywriting: 15 },
  xp: 80,
}

export const MARKETING_CASES: CaseInput[] = [unhappyClient, briefChange]
