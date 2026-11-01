/** IT Help Desk cases. */
import type { CaseInput } from '../schema'

const chaser: CaseInput = {
  id: 'it-ticket-chaser',
  version: 1,
  careerId: 'it-support',
  kind: 'internal',
  title: 'A colleague chases an unresolved ticket',
  summary:
    'Hannah’s laptop ticket has had no update for four days, and she is frustrated.',
  from: {
    name: 'Hannah Fischer',
    role: 'Marketing Executive',
    organisation: 'Marketing',
  },
  trigger: { afterAssignment: 'user-replies' },
  deadlineHours: 4,
  email: {
    subject: 'Still waiting: INC-1984 (four days!)',
    body: `Hi,

I reported **INC-1984** on Monday: my laptop battery dies after 40 minutes, so I can’t work away from my desk, and I have client workshops all next week. Nobody has told me anything since. Is anyone actually looking at it?

Hannah`,
  },
  whyItMatters:
    'Most complaints about IT are about silence, not the fault itself. Owning the ticket, finding out where it is stuck and giving the user a clear update and a workaround turns a complaint into trust.',
  objectives: [
    'Read a ticket’s history to find where it got stuck',
    'Own a problem on the user’s behalf',
    'Give an honest update with a workaround and a date',
  ],
  evidence: [
    {
      id: 'ticket',
      title: 'Ticket INC-1984',
      table: {
        head: ['When', 'Who', 'Entry'],
        rows: [
          ['Mon 09:12', 'Hannah', 'Battery lasts about 40 minutes. Workshops next week.'],
          ['Mon 10:05', 'Service desk', 'Priority P4. Assigned to hardware queue.'],
          ['Mon 15:30', 'Hardware', 'Battery faulty. Replacement ordered from supplier.'],
          ['(since then)', '', 'No entries. Status: Pending (supplier).'],
        ],
      },
    },
    {
      id: 'stores',
      title: 'Spare equipment list',
      text: 'Loan laptops available: 2 (LT-L01, LT-L02), each set up with the standard apps.',
    },
    {
      id: 'supplier',
      title: 'Supplier portal: order 55120',
      text: 'Battery for LT-0144: dispatched Thursday, delivery Monday.',
    },
  ],
  steps: [
    {
      id: 'stuck',
      kind: 'review',
      title: 'What went wrong',
      prompt: 'Which of these are real problems with how the ticket was handled?',
      points: 30,
      findings: [
        {
          id: 'no-update',
          text: 'Hannah was not told about the replacement or when it would arrive.',
          issue: true,
          why: 'A pending ticket still needs updates: the user can’t see the supplier order.',
        },
        {
          id: 'priority',
          text: 'P4 ignores that she can’t work away from her desk with workshops coming.',
          issue: true,
          why: 'Impact and urgency were underestimated: P3 at least, with a workaround.',
        },
        {
          id: 'diagnosis',
          text: 'The diagnosis (a faulty battery) was wrong.',
          issue: false,
          why: 'Hardware found the fault quickly and ordered the right part.',
        },
        {
          id: 'hardware',
          text: 'The hardware team should have repaired the battery themselves.',
          issue: false,
          why: 'Batteries are replaced, not repaired; ordering one was right.',
        },
      ],
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do now',
      prompt: 'How do you resolve it for Hannah?',
      points: 35,
      options: [
        {
          id: 'loan',
          label:
            'Give her a loan laptop today, update the ticket and priority, and book the battery swap for Monday',
          verdict: 'best',
          why: 'She can work next week, the ticket is accurate and the fix has a date.',
          effects: { trust: { manager: 2 }, indicators: { satisfaction: 4 } },
        },
        {
          id: 'wait',
          label: 'Tell her the part arrives on Monday and she should wait',
          verdict: 'acceptable',
          why: 'Honest, but it leaves her unable to run her workshops when a loan laptop is available.',
          effects: { indicators: { satisfaction: 1 } },
        },
        {
          id: 'blame',
          label: 'Explain that the supplier is slow and close the chaser',
          verdict: 'poor',
          why: 'Blaming a supplier without helping her solves nothing, and the supplier is on time.',
          effects: { indicators: { satisfaction: -4 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Hannah Fischer',
      title: 'Reply to Hannah',
      prompt: 'Apologise for the silence, say what is happening and what she gets today.',
      points: 35,
      minWords: 45,
      mentions: [['sorry', 'apologise', 'apologies'], ['loan', 'spare'], ['Monday']],
      avoid: [
        {
          terms: ['not our fault', 'supplier’s fault'],
          why: 'Own the problem: the missing update was ours.',
        },
      ],
      model:
        'Hi Hannah, I am sorry nobody updated you; that should not have happened. Your battery was found to be faulty on Monday and a replacement is arriving on Monday. So you can run your workshops, I have set aside a loan laptop (LT-L01) with all the standard apps: you can collect it from the service desk today. I will book the battery swap for Monday and update INC-1984 as we go. Best, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -5 }, reputation: -2 },
  },
  replies: {
    excellent: `Hi {name},

Thank you so much, that’s a real relief. Picking up the loan laptop now!

Hannah`,
    good: `Hi {name},

Thanks for the update.

Hannah`,
    pass: `Hi {name},

OK, thanks. Not sure what I do next week though.

Hannah`,
    fail: `Hi {name},

That doesn’t solve anything. I’ll escalate it.

Hannah`,
  },
  lapseLog: 'Hannah escalated INC-1984 to {manager}: still no update.',
  skills: { 'customer-service': 30, 'incident-management': 20 },
  xp: 70,
}

const adminRights: CaseInput = {
  id: 'it-admin-rights',
  version: 1,
  careerId: 'it-support',
  kind: 'internal',
  title: 'A department head wants admin rights',
  summary:
    'The Operations Director wants admin rights on every laptop in her team. Policy says no.',
  from: { name: 'Helen Carter', role: 'Operations Director', organisation: 'Operations' },
  trigger: { afterAssignment: 'directory-joiner' },
  deadlineHours: 6,
  email: {
    subject: 'Admin rights for my team, please',
    body: `Hi,

My team keeps waiting for IT to install the **route-planning app** we use with drivers. Please give all eight of my team **local admin rights** so they can install what they need themselves. As Operations Director I am happy to take responsibility.

Thanks,
Helen Carter`,
  },
  whyItMatters:
    'Admin rights let malware and mistakes spread. Good service desks say no to the risky request but solve the real problem behind it, so the business gets what it needs safely.',
  objectives: [
    'Apply a security policy to a senior person’s request',
    'Find the real need behind a request',
    'Offer a safe alternative that solves the problem',
  ],
  evidence: [
    {
      id: 'policy',
      title: 'IT security policy: local administrator rights',
      text: 'Local admin rights are not given to standard users, whatever their role. Software is installed from the **Software Centre** (approved apps, self-service) or by IT. Department heads can ask for an app to be added to the Software Centre.',
    },
    {
      id: 'app',
      title: 'Route planner app review',
      text: 'RouteWise 4: approved by security in January, licensed per user. Not yet in the Software Centre.',
    },
  ],
  steps: [
    {
      id: 'decision',
      kind: 'decide',
      title: 'Your answer',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'software-centre',
          label:
            'Decline admin rights, and add RouteWise to the Software Centre so her team can install it themselves today',
          verdict: 'best',
          why: 'Her real need is installing an approved app quickly; the Software Centre does that with no security risk.',
          effects: { trust: { manager: 2 }, indicators: { risk: -3, satisfaction: 3 } },
        },
        {
          id: 'grant',
          label: 'Grant the rights: she is a director and accepts responsibility',
          verdict: 'poor',
          why: 'Seniority does not change the risk; the policy applies to everyone, and responsibility for a breach can’t be signed away.',
          effects: { indicators: { risk: 10 }, reputation: -2 },
        },
        {
          id: 'decline',
          label: 'Decline politely and point her to the policy',
          verdict: 'acceptable',
          why: 'Correct, but her team still can’t do their work; a good answer solves the problem too.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Helen Carter',
      title: 'Reply to Helen',
      prompt: 'Explain, politely, what you can and can’t do, and what happens next.',
      points: 50,
      minWords: 45,
      mentions: [['Software Centre'], ['RouteWise', 'route'], ['security', 'policy']],
      avoid: [
        {
          terms: ['as a director you'],
          why: 'Don’t make it about her rank: the rule is the same for everyone.',
        },
      ],
      model:
        'Hi Helen, thank you for explaining the problem. I can’t give local admin rights, because the security policy doesn’t allow it for anyone: it is how malware spreads. But I can solve the real problem: RouteWise is already approved, so I am adding it to the Software Centre today, and your team will be able to install it themselves in a couple of clicks. If you need other apps added, just send me the list. Best wishes, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { risk: -2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: {
    excellent: `Hi {name},

That’s even better than what I asked for. Thank you, my team have installed it already.

Helen`,
    good: `Hi {name},

Fair enough, thanks.

Helen`,
    pass: `Hi {name},

I see. So how does my team get the app?

Helen`,
    fail: `Hi {name},

I’ll take this up with Ravi.

Helen`,
  },
  lapseLog:
    'Helen Carter went over the service desk’s head about admin rights: her request was not answered.',
  skills: { 'customer-service': 25, troubleshooting: 15 },
  xp: 70,
}

export const IT_CASES: CaseInput[] = [chaser, adminRights]
