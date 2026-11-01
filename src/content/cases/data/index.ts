/** Data Analysis cases. */
import type { CaseInput } from '../schema'

const mismatch: CaseInput = {
  id: 'data-numbers-mismatch',
  version: 1,
  careerId: 'data-analytics',
  kind: 'internal',
  title: 'Sales says your figures don’t match Finance’s',
  summary: 'Your sales report shows less revenue than the finance report. Who is right?',
  from: { name: 'Chloe Martin', role: 'Sales Manager', organisation: 'Sales' },
  trigger: { afterAssignment: 'sales-summary' },
  deadlineHours: 5,
  email: {
    subject: 'Your report is £30k short',
    body: `Hi,

Your sales summary says Q1 revenue was **£150,000**. Finance’s management accounts say **£180,000**. My team’s bonuses depend on this, so I need to know which is right before Friday.

Chloe Martin
Sales Manager`,
  },
  whyItMatters:
    'Two reports disagreeing is one of the most common questions an analyst gets. Finding the reason (usually a definition), explaining it plainly and agreeing one definition stops the same argument happening every month.',
  objectives: [
    'Reconcile two reports that disagree',
    'Spot a difference in definitions',
    'Explain it so both sides can agree',
  ],
  evidence: [
    {
      id: 'ours',
      title: 'Your sales summary: notes',
      text: 'Source: orders export. Revenue = order amounts **excluding VAT**. Orders with status Cancelled are excluded.',
    },
    {
      id: 'finance',
      title: 'Finance management accounts: notes',
      text: 'Revenue from the sales ledger, **including VAT** (20%) for this internal pack. Cancelled orders are credited separately.',
    },
  ],
  steps: [
    {
      id: 'cause',
      kind: 'review',
      title: 'Why the figures differ',
      prompt: 'Which of these explain the difference?',
      points: 30,
      findings: [
        {
          id: 'vat',
          text: 'Finance’s figure includes VAT; yours does not.',
          issue: true,
          why: '£150,000 plus 20% VAT is exactly £180,000.',
        },
        {
          id: 'missing',
          text: 'Your report is missing £30,000 of orders.',
          issue: false,
          why: 'Nothing is missing: the difference is exactly the VAT.',
        },
        {
          id: 'cancelled',
          text: 'Finance counts cancelled orders as revenue.',
          issue: false,
          why: 'Finance credits cancellations separately; the gap is fully explained by VAT.',
        },
      ],
    },
    {
      id: 'check',
      kind: 'figure',
      title: 'Check it',
      prompt: 'What is £150,000 with 20% VAT added?',
      points: 20,
      answer: 180000,
      tolerance: 1,
      unit: '£',
      why: '£150,000 × 1.2 = £180,000, which is Finance’s figure.',
    },
    {
      id: 'bonus',
      kind: 'decide',
      title: 'Which figure for bonuses',
      prompt: 'Which figure should bonuses use, and what do you suggest?',
      points: 20,
      options: [
        {
          id: 'net',
          label:
            'Net revenue (£150,000): VAT is collected for the tax office, not earned. Suggest both reports label revenue “excluding VAT”',
          verdict: 'best',
          why: 'VAT is not the company’s income, and one clear definition stops the argument recurring.',
          effects: { indicators: { satisfaction: 2, risk: -2 } },
        },
        {
          id: 'gross',
          label:
            'Gross revenue (£180,000), since it is higher and the team will be happier',
          verdict: 'poor',
          why: 'Bonuses would be paid on tax money the company passes on: an expensive error.',
          effects: { indicators: { risk: 6 } },
        },
        {
          id: 'leave',
          label: 'Explain the difference but let Sales and Finance decide',
          verdict: 'acceptable',
          why: 'Accurate, but an analyst should recommend the right definition.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Chloe Martin, Sales',
      title: 'Reply to Chloe',
      prompt: 'Explain the difference simply and say which figure is right for bonuses.',
      points: 30,
      minWords: 45,
      mentions: [['VAT'], ['150,000', '150k', '£150'], ['180,000', '180k', '£180']],
      avoid: [
        {
          terms: ['finance got it wrong', 'finance is wrong'],
          why: 'Neither report is wrong: they measure different things.',
        },
      ],
      model:
        'Hi Chloe, good news: both reports are right, they just measure different things. My summary shows £150,000 excluding VAT; Finance’s pack shows £180,000 including 20% VAT. VAT is collected for the tax office, so the company’s actual revenue, and the right basis for bonuses, is £150,000. I will suggest to Finance that both reports label revenue as excluding VAT from now on. Best, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -4 }, reputation: -1 },
  },
  replies: {
    excellent: `Hi {name},

Thank you, that’s crystal clear. Finance agree too.

Chloe`,
    good: `Hi {name},

Thanks, that explains it.

Chloe`,
    pass: `Hi {name},

OK, but I’m still not sure which number to use.

Chloe`,
    fail: `Hi {name},

That doesn’t answer my question.

Chloe`,
  },
  lapseLog: 'Sales escalated the revenue question to {manager}: it was not answered.',
  skills: { 'data-analysis': 25, 'insight-communication': 25 },
  xp: 75,
}

const extraAnalysis: CaseInput = {
  id: 'data-extra-analysis',
  version: 1,
  careerId: 'data-analytics',
  kind: 'internal',
  title: 'A director wants extra analysis by tomorrow',
  summary: 'Operations wants the survey analysis redone by region, for tomorrow’s board.',
  from: { name: 'Helen Carter', role: 'Operations Director', organisation: 'Operations' },
  trigger: { afterAssignment: 'survey-analysis' },
  deadlineHours: 5,
  email: {
    subject: 'Survey by region for tomorrow’s board',
    body: `Hi,

Great survey analysis. For tomorrow’s board, could you also break **every question down by all 12 regions**, with charts, and a written commentary on each? I need it by **9 am**.

Helen`,
  },
  whyItMatters:
    'Analysts get more requests than time. Clarifying what the decision needs, and agreeing what can be done well in the time, is better than delivering everything badly or nothing at all.',
  objectives: [
    'Find out what a request is really for',
    'Agree a scope that fits the time',
    'Protect quality when the data is thin',
  ],
  evidence: [
    {
      id: 'survey',
      title: 'The client survey',
      text: '312 responses across 12 regions. Six regions have fewer than 15 responses each.',
    },
    {
      id: 'board',
      title: 'Board agenda item (from Helen’s assistant)',
      text: 'Decision: which **3 regions** get the new client-care team first.',
    },
  ],
  steps: [
    {
      id: 'scope',
      kind: 'decide',
      title: 'What you offer',
      prompt: 'How do you respond to the request?',
      points: 45,
      options: [
        {
          id: 'focused',
          label:
            'Offer what the decision needs: satisfaction by region with response counts, ranking regions with enough responses, flagging the six with too few',
          verdict: 'best',
          why: 'It answers the board’s actual question by 9 am, honestly, without misleading charts from tiny samples.',
          effects: { trust: { manager: 2 }, indicators: { satisfaction: 3, risk: -2 } },
        },
        {
          id: 'everything',
          label:
            'Do everything: every question by every region with commentary, working late',
          verdict: 'poor',
          why: '144 breakdowns overnight means mistakes, and regions with a handful of responses would mislead the board.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'decline',
          label: 'Say it can’t be done by tomorrow',
          verdict: 'acceptable',
          why: 'Honest, but the board still needs an answer; something useful can be done in time.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Helen Carter, Operations',
      title: 'Reply to Helen',
      prompt: 'Agree what you will deliver by 9 am, and why.',
      points: 55,
      minWords: 50,
      mentions: [
        ['3 regions', 'three regions', 'decision'],
        ['responses', 'sample'],
        ['9'],
      ],
      avoid: [
        {
          terms: ['impossible', 'not my job'],
          why: 'Stay constructive: offer what you can do.',
        },
      ],
      model:
        'Hi Helen, happy to help with the board. As the decision is which 3 regions get the client-care team first, I suggest a one-page ranking of satisfaction by region, with the number of responses for each, and a short note on the top regions. Six regions have fewer than 15 responses, so I will flag them rather than chart them, to avoid misleading the board. You will have it by 9 am. Best, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -4 } },
  },
  replies: {
    excellent: `Hi {name},

That’s exactly what the board needs, and thank you for flagging the small regions.

Helen`,
    good: `Hi {name},

That works, thanks.

Helen`,
    pass: `Hi {name},

OK. I hope it covers what we need.

Helen`,
    fail: `Hi {name},

I’ll ask someone else.

Helen`,
  },
  lapseLog:
    'The board met without the regional analysis: Helen’s request was not answered.',
  skills: { 'insight-communication': 25, 'data-analysis': 20 },
  xp: 70,
}

export const DATA_CASES: CaseInput[] = [mismatch, extraAnalysis]
