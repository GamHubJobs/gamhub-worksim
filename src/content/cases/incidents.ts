/**
 * Complex workplace incidents: situations that need investigation and
 * judgement, not just a right answer. Every option is judged with its
 * reasoning (integrity, security, honesty with clients, owning mistakes,
 * fairness to colleagues), and the player does the corrective work.
 */
import type { CaseInput } from './schema'

const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks: handled well, with a couple of things to tidy up.

${sender}`,
  pass: `Hi {name},

Thanks. Some of this needs another look.

${sender}`,
  fail: `Hi {name},

I’m worried about how this was handled. Let’s talk today.

${sender}`,
})

const itLogin: CaseInput = {
  id: 'inc-it-suspicious-login',
  version: 1,
  careerId: 'it-support',
  kind: 'incident',
  minLevel: 3,
  title: 'A suspicious login to the finance director’s account',
  summary:
    'The finance director’s account signed in from two countries 20 minutes apart.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'network-intranet' },
  deadlineHours: 2,
  email: {
    subject: 'URGENT: odd sign-ins on the finance director’s account',
    body: `Hi {name},

The sign-in alerts flagged the finance director’s account this morning. Please investigate now and act. Logs attached.

Ravi`,
  },
  whyItMatters:
    'Compromised accounts are how most cyber attacks start, and a finance director’s account can approve payments. Reading the evidence quickly, containing the threat first and telling the right people is what limits the damage.',
  objectives: [
    'Read sign-in evidence',
    'Contain a compromised account',
    'Report a security incident properly',
  ],
  evidence: [
    {
      id: 'logins',
      title: 'Sign-in log: finance director',
      table: {
        head: ['Time', 'Location', 'Device', 'Result'],
        rows: [
          ['08:52', 'London, UK', 'Company laptop LT-0101', 'Success (with MFA)'],
          [
            '09:14',
            'Lagos, Nigeria',
            'Unknown browser',
            'Success (no MFA prompt: legacy mail app)',
          ],
          [
            '09:16',
            'Lagos, Nigeria',
            'Unknown browser',
            'Mailbox rule created: forward “invoice” emails',
          ],
        ],
      },
    },
    {
      id: 'note',
      title: 'Phone call with the finance director',
      text: 'She is in the office in London and has not travelled. She clicked a link in an email about a “shared invoice” yesterday and entered her password.',
    },
  ],
  steps: [
    {
      id: 'signs',
      kind: 'review',
      title: 'What the evidence shows',
      prompt: 'Which of these are true?',
      points: 25,
      findings: [
        {
          id: 'impossible',
          text: 'Signing in from London and Lagos 22 minutes apart is impossible travel.',
          issue: true,
          why: 'Nobody can travel that far that fast: one sign-in is someone else.',
        },
        {
          id: 'rule',
          text: 'The forwarding rule for “invoice” emails is a sign of invoice fraud being prepared.',
          issue: true,
          why: 'Attackers forward invoices to change bank details on them.',
        },
        {
          id: 'phish',
          text: 'Her password was probably stolen by the “shared invoice” link.',
          issue: true,
          why: 'She entered it on a fake page yesterday.',
        },
        {
          id: 'vpn',
          text: 'The Lagos sign-in is probably her VPN.',
          issue: false,
          why: 'Our VPN exits in London, and she is on the company network.',
        },
      ],
    },
    {
      id: 'contain',
      kind: 'decide',
      title: 'Contain it',
      prompt: 'What do you do first?',
      points: 35,
      options: [
        {
          id: 'contain',
          label:
            'Revoke all her sessions, reset her password, remove the forwarding rule, block legacy sign-in, and report it to security and Finance',
          verdict: 'best',
          why: 'It shuts the attacker out, closes the gap they used, and lets Finance watch for fraudulent invoices.',
          effects: { indicators: { risk: -8 } },
        },
        {
          id: 'reset-only',
          label: 'Reset her password',
          verdict: 'acceptable',
          why: 'Necessary, but the attacker’s session and forwarding rule stay active.',
          effects: { indicators: { risk: 2 } },
        },
        {
          id: 'watch',
          label: 'Watch the account for a day to see what the attacker does',
          verdict: 'poor',
          why: 'Every minute risks fraudulent payments: contain first.',
          effects: { indicators: { risk: 10 } },
        },
      ],
    },
    {
      id: 'report',
      kind: 'reply',
      to: 'Ravi Menon',
      title: 'Report the incident',
      prompt: 'Report what happened, what you did and what Finance must watch for.',
      points: 40,
      minWords: 60,
      mentions: [
        ['forward', 'rule'],
        ['password', 'reset'],
        ['sessions', 'signed out'],
        ['invoice', 'bank details'],
        ['phishing', 'link'],
      ],
      avoid: [
        {
          terms: ['her fault', 'careless'],
          why: 'Phishing fools careful people; blame stops people reporting.',
        },
      ],
      model:
        'Hi Ravi, the finance director’s account was compromised: she entered her password on a phishing link yesterday, and at 09:14 someone signed in from Lagos through a legacy mail app with no MFA and created a rule forwarding “invoice” emails. I have revoked all her sessions, reset her password, removed the forwarding rule and blocked legacy sign-in. Finance should treat any change of supplier bank details as suspicious this week and confirm by phone. I have reported it to security. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 4 }, reputation: 4, indicators: { risk: -3 } },
    fail: { indicators: { risk: 4 } },
    lapse: { reputation: -4, indicators: { risk: 10 } },
  },
  replies: replies(
    'Ravi',
    'Textbook incident response. Finance caught a fake invoice with changed bank details this afternoon, thanks to your warning.',
  ),
  lapseLog:
    'The compromised account stayed open for hours: a fraudulent invoice was sent to a supplier.',
  skills: { 'incident-management': 35, troubleshooting: 20, 'technical-writing': 15 },
  xp: 130,
}

const mktOverspend: CaseInput = {
  id: 'inc-mkt-overspend',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'incident',
  minLevel: 3,
  title: 'A campaign spent far more than approved',
  summary:
    'A client campaign overspent by £3,000 overnight, and IT and Marketing blame each other.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'funnel-analysis' },
  deadlineHours: 4,
  email: {
    subject: 'Okafor Build campaign: £3,000 overspend',
    body: `Hi {name},

Okafor Build’s campaign spent **£3,400 yesterday against a £400 daily budget**. Our ads team says the website tag broke so the platform couldn’t see conversions and spent more; IT says the ads were set up wrong. The client doesn’t know yet. Please find out what happened and handle it.

Sofia`,
  },
  whyItMatters:
    'Overspending a client’s money is serious. Finding the real cause instead of joining the blame, telling the client honestly and putting it right is what keeps the client and stops a repeat.',
  objectives: [
    'Find the cause of an overspend from evidence',
    'Settle a disagreement with facts',
    'Tell a client about a mistake honestly',
  ],
  evidence: [
    {
      id: 'changes',
      title: 'Campaign change history',
      table: {
        head: ['When', 'Who', 'Change'],
        rows: [
          [
            'Mon 17:40',
            'Marketing (ads team)',
            'Daily budget changed from £400 to £4,000',
          ],
          ['Mon 17:41', 'Marketing (ads team)', 'Note: “£400/day for May”'],
        ],
      },
    },
    {
      id: 'tag',
      title: 'Website tag status',
      text: 'Conversion tag working all week (IT check). Conversions recorded yesterday: 14.',
    },
    {
      id: 'contract',
      title: 'Client agreement',
      text: 'Okafor Build’s approved budget: £400 a day. Any spend above the approved budget is our responsibility.',
    },
  ],
  steps: [
    {
      id: 'cause',
      kind: 'review',
      title: 'What really happened',
      prompt: 'Which of these does the evidence support?',
      points: 25,
      findings: [
        {
          id: 'typo',
          text: 'The daily budget was typed as £4,000 instead of £400.',
          issue: true,
          why: 'The change history shows £4,000 with a note saying £400.',
        },
        {
          id: 'tag-ok',
          text: 'The website tag was working.',
          issue: true,
          why: 'IT’s check and 14 recorded conversions show it was.',
        },
        {
          id: 'it-fault',
          text: 'IT caused the overspend.',
          issue: false,
          why: 'The change was made in the ads account by the ads team.',
        },
      ],
    },
    {
      id: 'over',
      kind: 'figure',
      title: 'The overspend',
      prompt: 'How much did the campaign spend above the approved budget yesterday?',
      points: 15,
      answer: 3000,
      tolerance: 0.5,
      unit: '£',
      why: '£3,400 − £400 = £3,000.',
    },
    {
      id: 'client',
      kind: 'decide',
      title: 'The client',
      prompt: 'What do you do about Okafor Build?',
      points: 30,
      options: [
        {
          id: 'honest',
          label:
            'Fix the budget now, tell the client what happened today, and credit the £3,000 (it’s our responsibility under the agreement)',
          verdict: 'best',
          why: 'Honest, fair under the agreement, and the client keeps trusting you.',
          effects: {
            indicators: { satisfaction: 3, discipline: 2 },
            spend: { marketing: 3000 },
          },
        },
        {
          id: 'quiet',
          label: 'Fix the budget and say nothing: the extra spend brought some leads',
          verdict: 'poor',
          why: 'Hiding it breaks trust and the agreement; clients find out from their invoices.',
          effects: { indicators: { satisfaction: -6, risk: 5 } },
        },
        {
          id: 'charge',
          label: 'Tell the client but charge them, since they got the leads',
          verdict: 'poor',
          why: 'They never approved that spend, and the agreement says it’s ours.',
          effects: { indicators: { satisfaction: -4 } },
        },
      ],
    },
    {
      id: 'tell',
      kind: 'reply',
      to: 'Daniel Okafor, Okafor Build',
      title: 'Tell the client',
      prompt: 'Explain the mistake, what you have done and how it won’t happen again.',
      points: 30,
      minWords: 50,
      mentions: [
        ['sorry', 'apologise', 'apologies'],
        ['£400', '400'],
        ['credit'],
        ['check', 'second person', 'approval'],
      ],
      avoid: [
        {
          terms: ['IT’s fault', 'the website'],
          why: 'The evidence shows our ads team made the change: don’t blame others.',
        },
      ],
      model:
        'Hi Daniel, I am sorry to tell you we made a mistake: yesterday your daily budget was entered as £4,000 instead of £400, so the campaign spent £3,400. We fixed it this morning, and we will credit the £3,000 above your approved budget on this month’s invoice. From now on every budget change will be checked by a second person before it goes live. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -3 } },
    lapse: { reputation: -4, indicators: { satisfaction: -6, discipline: -4 } },
  },
  replies: replies(
    'Sofia',
    'Daniel thanked us for being straight with him and renewed for six months. The ads team now has a second-person check on budget changes.',
  ),
  lapseLog:
    'Okafor Build found the £3,400 charge on their invoice before anyone told them.',
  skills: { 'campaign-analytics': 25, 'content-strategy': 10, copywriting: 10 },
  xp: 120,
}

const dataIntegrity: CaseInput = {
  id: 'inc-data-preferred-conclusion',
  version: 1,
  careerId: 'data-analytics',
  kind: 'incident',
  minLevel: 3,
  title: 'A director wants a chart that shows growth',
  summary:
    'The data shows sales flat; a director wants the chart changed to show growth.',
  from: { name: 'Chloe Martin', role: 'Sales Manager', organisation: 'Sales' },
  trigger: { afterAssignment: 'studio-statistics' },
  deadlineHours: 4,
  email: {
    subject: 'Tweak the chart for the board?',
    body: `Hi,

The board pack chart makes sales look flat. Could you start the axis at £180k instead of zero, and leave out March (it was a one-off)? Then it shows the growth we’ve worked so hard for. The board meets tomorrow.

Chloe`,
  },
  whyItMatters:
    'Analysts are trusted because their numbers are honest. Presenting data fairly, even under pressure from senior people, protects the company’s decisions and your own credibility, and there is almost always an honest way to show what someone is proud of.',
  objectives: [
    'Recognise misleading presentation of data',
    'Hold to integrity under pressure',
    'Offer an honest alternative',
  ],
  evidence: [
    {
      id: 'sales',
      title: 'Monthly sales',
      table: {
        head: ['Month', 'Sales'],
        rows: [
          ['January', '£190k'],
          ['February', '£193k'],
          ['March', '£181k'],
          ['April', '£192k'],
        ],
      },
    },
    {
      id: 'mix',
      title: 'Sales mix',
      text: 'New-client sales grew from £20k to £34k a month; repeat sales fell.',
    },
  ],
  steps: [
    {
      id: 'misleading',
      kind: 'review',
      title: 'What the changes would do',
      prompt: 'Which of these are true?',
      points: 30,
      findings: [
        {
          id: 'axis',
          text: 'Starting the axis at £180k would make small changes look like big growth.',
          issue: true,
          why: 'A truncated axis exaggerates differences.',
        },
        {
          id: 'march',
          text: 'Leaving out March would hide the dip and overstate the trend.',
          issue: true,
          why: 'Removing inconvenient data points is cherry-picking.',
        },
        {
          id: 'new-growth',
          text: 'There is real growth worth showing: new-client sales.',
          issue: true,
          why: 'New-client sales rose from £20k to £34k a month.',
        },
        {
          id: 'fine',
          text: 'Both changes are normal design choices.',
          issue: false,
          why: 'Together they would mislead the board about overall sales.',
        },
      ],
    },
    {
      id: 'response',
      kind: 'decide',
      title: 'Your response',
      prompt: 'What do you do?',
      points: 40,
      options: [
        {
          id: 'honest-alt',
          label:
            'Keep the honest chart, and add a second chart showing the real growth in new-client sales',
          verdict: 'best',
          why: 'The board gets the truth, and Sales gets credit for what really grew.',
          effects: { trust: { manager: 3 }, indicators: { risk: -4 } },
        },
        {
          id: 'comply',
          label: 'Make the changes: it’s her board pack',
          verdict: 'poor',
          why: 'A misleading chart in a board pack can lead to wrong decisions, and it’s your name on the analysis.',
          effects: { indicators: { risk: 8 }, reputation: -3 },
        },
        {
          id: 'refuse',
          label: 'Refuse and report her to your manager',
          verdict: 'acceptable',
          why: 'Your integrity holds, but jumping to a report before talking it through damages the relationship; offer an honest alternative first.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Chloe Martin, Sales',
      title: 'Reply to Chloe',
      prompt:
        'Explain kindly why you can’t make those changes, and what you can do instead.',
      points: 30,
      minWords: 50,
      mentions: [['axis'], ['March'], ['new-client', 'new client'], ['board']],
      avoid: [
        {
          terms: ['dishonest', 'lying', 'cheat'],
          why: 'Assume good intent: she wants credit for real work.',
        },
      ],
      model:
        'Hi Chloe, I understand why you want the board to see the team’s progress. I can’t start the axis at £180k or leave out March, because together they would make total sales look like they grew when they were flat, and the board needs to rely on the pack. But there is real growth to show: new-client sales rose from £20k to £34k a month. I will add a chart of that next to the total, so the board sees exactly what your team achieved. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Chloe',
    'That’s a better story than the one I asked for. Thank you, the board loved the new-client chart.',
  ),
  lapseLog: 'The board pack went out without an answer to Sales’ request.',
  skills: { 'insight-communication': 30, 'data-visualisation': 25 },
  xp: 120,
}

const accEthics: CaseInput = {
  id: 'inc-acc-bad-debt',
  version: 1,
  careerId: 'accounting',
  kind: 'incident',
  minLevel: 3,
  title: 'Asked to delay a bad debt',
  summary:
    'A client has gone into administration. You’re asked to leave their debt until next quarter.',
  from: {
    name: 'Daniel Okoro',
    role: 'Accounting Manager',
    organisation: 'Accounting',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'month-end-close' },
  deadlineHours: 5,
  email: {
    subject: 'Steelway: leave it until July?',
    body: `Hi {name},

Steelway Engineering went into administration yesterday, owing us **£18,000**. The administrators say unsecured creditors will get about **10p in the pound**. If we write it off this quarter we miss our profit target. Could we leave it as a normal debt until July? Nobody will notice.

Daniel`,
  },
  whyItMatters:
    'Accounts must show a true and fair view. Delaying a known loss to hit a target misleads directors, lenders and auditors, and accountants have a professional duty to refuse, kindly and clearly, even when the request comes from their manager.',
  objectives: [
    'Apply the rules for doubtful debts',
    'Calculate the loss to recognise',
    'Refuse an improper request professionally',
  ],
  evidence: [
    {
      id: 'administration',
      title: 'Administrator’s notice',
      text: 'Steelway Engineering Ltd entered administration on 28 June. Expected dividend to unsecured creditors: **about 10p in the pound**.',
    },
    {
      id: 'policy',
      title: 'Accounting policy: doubtful debts',
      text: 'When there is evidence that a debt will not be recovered in full, the expected loss is recognised **in the period in which the evidence arises**.',
    },
  ],
  steps: [
    {
      id: 'loss',
      kind: 'figure',
      title: 'The expected loss',
      prompt: 'How much of the £18,000 should be recognised as a loss this quarter?',
      points: 30,
      answer: 16200,
      tolerance: 1,
      unit: '£',
      why: 'At 10p in the pound we expect £1,800 back, so the loss is £16,200.',
    },
    {
      id: 'decision',
      kind: 'decide',
      title: 'Your answer',
      prompt: 'What do you do?',
      points: 40,
      options: [
        {
          id: 'recognise',
          label:
            'Recognise the £16,200 loss this quarter, explain why to Daniel, and offer to help him explain the miss to the directors',
          verdict: 'best',
          why: 'The policy and the law require it, and helping explain the result supports your manager without misleading anyone.',
          effects: { trust: { manager: 1 }, indicators: { risk: -5 } },
        },
        {
          id: 'delay',
          label: 'Leave it until July as asked',
          verdict: 'poor',
          why: 'It misstates profit to directors, lenders and auditors: it is the kind of decision that ends careers.',
          effects: { indicators: { risk: 10 }, reputation: -4 },
        },
        {
          id: 'escalate',
          label: 'Report Daniel to the finance director straight away',
          verdict: 'acceptable',
          why: 'Right if he insists, but a clear conversation first is fairer: many such requests are made under pressure and withdrawn.',
          effects: { trust: { manager: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Daniel Okoro',
      title: 'Reply to Daniel',
      prompt: 'Refuse clearly and kindly, with the reason and a way forward.',
      points: 30,
      minWords: 50,
      mentions: [
        ['16,200', '16200'],
        ['policy', 'true and fair', 'auditor'],
        ['this quarter'],
        ['help', 'explain'],
      ],
      avoid: [{ terms: ['nobody will notice'], why: 'Never agree to hide it.' }],
      model:
        'Hi Daniel, I understand the pressure of the target, but I don’t think we can leave it. The administrators’ notice is evidence that we will only recover about £1,800, so our policy, and the auditors, require us to recognise the £16,200 loss this quarter. I would be glad to help explain the miss to the directors: it is a one-off client failure, not a problem with the business. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 4, indicators: { risk: -3 } },
    fail: { indicators: { risk: 4 } },
    lapse: { indicators: { risk: 5 } },
  },
  replies: replies(
    'Daniel',
    'You’re right, and thank you for putting it so well. I shouldn’t have asked. We’ll explain it to the directors together.',
  ),
  lapseLog: 'The quarter closed without the Steelway debt being dealt with.',
  skills: { 'financial-reporting': 35, accuracy: 15 },
  xp: 120,
}

const faColleague: CaseInput = {
  id: 'inc-fa-colleague-error',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'incident',
  minLevel: 2,
  title: 'A colleague’s mistake that could hurt a supplier',
  summary: 'Marcus paid a small supplier £48 instead of £4,800, and doesn’t know yet.',
  from: { name: 'Lisa Moore', role: 'Owner', organisation: 'Moore Catering' },
  trigger: { afterAssignment: 'petty-cash' },
  deadlineHours: 4,
  email: {
    subject: 'Payment received: only £48?',
    body: `Hello,

We received £48.00 from you today for our invoice **MC-118 (£4,800)** for the conference catering. Was that a mistake? We’re a small business and we’re relying on that payment to pay our staff on Friday.

Lisa Moore
Moore Catering`,
  },
  whyItMatters:
    'Everyone makes mistakes. What matters is that they are fixed fast, honestly and without blame, and small suppliers depend on being paid correctly.',
  objectives: [
    'Investigate a payment error',
    'Handle a colleague’s mistake fairly',
    'Put it right for the supplier quickly',
  ],
  evidence: [
    {
      id: 'payment',
      title: 'This morning’s payment run',
      text: 'Moore Catering, invoice MC-118, amount entered **£48.00** (invoice total £4,800.00). Prepared by Marcus Webb, approved in the batch.',
    },
    {
      id: 'urgent',
      title: 'Same-day payments',
      text: 'An urgent same-day payment can be made before 3 pm with the manager’s approval.',
    },
  ],
  steps: [
    {
      id: 'owed',
      kind: 'figure',
      title: 'What is still owed',
      prompt: 'How much do we still owe Moore Catering?',
      points: 20,
      answer: 4752,
      tolerance: 0.5,
      unit: '£',
      why: '£4,800 − £48 = £4,752.',
    },
    {
      id: 'handle',
      kind: 'decide',
      title: 'How you handle it',
      prompt: 'What do you do?',
      points: 45,
      options: [
        {
          id: 'fix-together',
          label:
            'Arrange a same-day payment of £4,752 with Priya’s approval, tell Marcus privately so he can learn from it, and suggest a check on large differences in the payment run',
          verdict: 'best',
          why: 'The supplier is paid today, Marcus is treated fairly, and the process is improved.',
          effects: {
            trust: { senior: 3, manager: 2 },
            indicators: { satisfaction: 3, risk: -2 },
          },
        },
        {
          id: 'announce',
          label: 'Tell the whole team in the meeting that Marcus made the mistake',
          verdict: 'poor',
          why: 'Public blame humiliates a colleague and makes people hide mistakes.',
          effects: { trust: { senior: -5 } },
        },
        {
          id: 'next-run',
          label: 'Add the balance to next week’s payment run',
          verdict: 'poor',
          why: 'The supplier can’t pay their staff on Friday because of our mistake.',
          effects: { indicators: { satisfaction: -4 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Lisa Moore, Moore Catering',
      title: 'Reply to the supplier',
      prompt: 'Apologise, confirm the amount and when it arrives.',
      points: 35,
      minWords: 40,
      mentions: [['sorry', 'apologise', 'apologies'], ['4,752', '4752'], ['today']],
      avoid: [
        {
          terms: ['Marcus'],
          why: 'Don’t name colleagues to suppliers: the company made the mistake.',
        },
      ],
      model:
        'Dear Lisa, I am so sorry: that was our mistake, an error when the payment was entered. We are sending the remaining £4,752 today as a same-day payment, so it will be with you this afternoon, well before Friday. Thank you for letting us know so quickly. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -3 } },
    lapse: { reputation: -3, indicators: { satisfaction: -5 } },
  },
  replies: replies(
    'Lisa',
    'The payment arrived this afternoon. Thank you for sorting it so quickly and kindly.',
  ),
  lapseLog:
    'Moore Catering could not pay their staff on time because of our underpayment.',
  skills: { accuracy: 20, 'finance-basics': 20 },
  xp: 100,
}

const devReport: CaseInput = {
  id: 'inc-dev-wrong-report',
  version: 1,
  careerId: 'software-development',
  kind: 'incident',
  minLevel: 3,
  title: 'A client says our report is wrong',
  summary:
    'Harbour Foods’ monthly usage report double-counts some days. Investigate and put it right.',
  from: { name: 'Martin Ellis', role: 'Finance Manager', organisation: 'Harbour Foods' },
  trigger: { afterAssignment: 'billing-report' },
  deadlineHours: 4,
  email: {
    subject: 'Your monthly report is wrong',
    body: `Hello,

Your system’s usage report for March shows **33 days** of usage and charges us for them. March has 31 days. We’re not paying until this is explained.

Martin Ellis
Harbour Foods`,
  },
  whyItMatters:
    'Bugs that reach clients’ bills damage trust fast. Finding the root cause, fixing it for everyone affected and explaining it honestly is what professional engineering teams do.',
  objectives: [
    'Find the root cause of a reporting bug',
    'Fix it for every affected client',
    'Explain it to a client honestly',
  ],
  evidence: [
    {
      id: 'data',
      title: 'Usage records for Harbour Foods, March',
      text: 'Days 30 and 31 March appear twice: once as UTC and once as UK summer time, after the clocks changed on 30 March.',
    },
    {
      id: 'scope',
      title: 'Other clients',
      text: '11 clients had usage on 30–31 March; all their reports have the same duplication.',
    },
  ],
  steps: [
    {
      id: 'cause',
      kind: 'review',
      title: 'The root cause',
      prompt: 'Which of these are true?',
      points: 25,
      findings: [
        {
          id: 'dst',
          text: 'The report groups days by local time and UTC inconsistently, so days after the clock change are counted twice.',
          issue: true,
          why: 'The duplicated days are exactly those after the clocks changed.',
        },
        {
          id: 'others',
          text: 'Other clients are affected too.',
          issue: true,
          why: 'All 11 clients with usage on those days have the same duplication.',
        },
        {
          id: 'client-data',
          text: 'Harbour Foods entered their usage twice.',
          issue: false,
          why: 'Usage is recorded by our system, not entered by clients.',
        },
      ],
    },
    {
      id: 'fix',
      kind: 'decide',
      title: 'Put it right',
      prompt: 'What do you do?',
      points: 40,
      options: [
        {
          id: 'all',
          label:
            'Fix the date grouping with a test for clock changes, regenerate all 11 reports, credit the overcharges and tell every affected client',
          verdict: 'best',
          why: 'Every client is put right, not just the one who noticed, and the test stops it coming back.',
          effects: { indicators: { satisfaction: 4, risk: -4 } },
        },
        {
          id: 'one',
          label: 'Correct Harbour Foods’ report and invoice',
          verdict: 'poor',
          why: 'Ten other clients would still be overcharged without knowing.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'manual',
          label: 'Fix the reports by hand each month around clock changes',
          verdict: 'poor',
          why: 'A manual fix will be forgotten; the bug must be fixed in the code.',
          effects: { indicators: { risk: 3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Martin Ellis, Harbour Foods',
      title: 'Reply to the client',
      prompt: 'Apologise, explain the cause simply and say what happens now.',
      points: 35,
      minWords: 50,
      mentions: [
        ['sorry', 'apologise', 'apologies'],
        ['clock', 'summer time'],
        ['31 days', 'corrected'],
        ['credit'],
      ],
      avoid: [{ terms: ['your data', 'your mistake'], why: 'The bug was ours.' }],
      model:
        'Dear Martin, you are right, and I am sorry. A bug in our report counted the days after the clocks changed on 30 March twice, so your report showed 33 days instead of 31. We have fixed the bug and added a test so it cannot happen again, and you will receive a corrected report and a credit for the overcharge this week. Thank you for raising it. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -3 } },
    lapse: { reputation: -3, indicators: { satisfaction: -5 } },
  },
  replies: replies(
    'Martin',
    'Thank you for the clear explanation and the credit. We’ve paid the corrected invoice.',
  ),
  lapseLog:
    'Harbour Foods withheld payment: nobody answered their complaint about the report.',
  skills: { debugging: 30, 'software-testing': 20 },
  xp: 120,
}

export const INCIDENT_CASES: CaseInput[] = [
  itLogin,
  mktOverspend,
  dataIntegrity,
  accEthics,
  faColleague,
  devReport,
]
