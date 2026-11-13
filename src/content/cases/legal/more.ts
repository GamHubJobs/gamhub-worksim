/**
 * More legal cases: the mock hearing, a misdirected email, the free advice
 * clinic project, leading the team, and two advanced cases. Fictional
 * jurisdiction (Westmark); not legal advice.
 */
import type { CaseInput } from '../schema'
import { replies } from '../incidents/shared'

const FIRM = 'Kestrel & Vane LLP'
const at = (name: string, role: string, personId?: string, organisation = FIRM) => ({
  name,
  role,
  organisation,
  ...(personId ? { personId } : {}),
})

/** Meeting: a mock hearing (an interim application), prepared, argued and followed up. */
const mockHearing: CaseInput = {
  id: 'law-mock-hearing',
  version: 1,
  careerId: 'legal',
  kind: 'meeting',
  minLevel: 3,
  title: 'Mock hearing: the inspection point',
  summary:
    'Prepare a skeleton argument, answer the judge in the mock hearing, and follow up.',
  from: at('Tobias Kestrel', 'Senior Associate', 'senior'),
  trigger: { afterAssignment: 'legal-disclosure' },
  deadlineHours: 4,
  meeting: {
    title: 'Mock hearing (training courtroom)',
    inHours: 1,
    minutes: 45,
    room: 'Training courtroom',
  },
  email: {
    subject: 'Mock hearing this afternoon',
    body: `Hi {name},

The firm’s training courtroom is free this afternoon, and Neil will sit as the judge. You will argue our side of Millstone’s point: that Brightwater should have inspected the sacks and so cannot complain.

Prepare a one-page **skeleton argument** in Word Craft, argue it at the mock hearing, then send me the actions.

Tobias`,
  },
  whyItMatters:
    'Advocates owe the court honesty: they must not mislead it, and must mention authorities against them. Preparing a clear skeleton argument and answering a judge’s questions candidly are core skills.',
  objectives: [
    'Prepare a skeleton argument',
    'Answer the court candidly',
    'Record the actions',
  ],
  evidence: [
    {
      id: 'authorities',
      title: 'Authorities',
      text: 'Harlow Bakeries v Penmore Mills [2011] WDC 44: flour with mould that could not be seen on delivery was not of satisfactory quality.\n\nQuill v Asterton Foods [2004] WDC 12: a buyer who did not inspect could not complain; overruled by Harlow for defects that could not be seen on delivery.',
    },
  ],
  steps: [
    {
      id: 'skeleton',
      kind: 'document',
      phase: 'prepare',
      title: 'Prepare the skeleton argument',
      prompt:
        'Write a one-page skeleton argument in Word Craft: the issue, the law, and the argument.',
      points: 30,
      deliverable: {
        kind: 'doc',
        title: 'Skeleton argument: the inspection point',
        template: 'memo',
        checks: [
          {
            id: 'sections',
            type: 'sections',
            title: 'A clear structure',
            sections: [['Issue'], ['Law'], ['Argument']],
            points: 10,
            why: 'Judges read skeleton arguments quickly: a clear structure helps them follow.',
            hint: 'Use the headings Issue, Law and Argument.',
          },
          {
            id: 'mentions',
            type: 'mentions',
            title: 'The right authorities',
            terms: [['Harlow'], ['Quill'], ['overruled']],
            points: 10,
            why: 'Rely on Harlow, and deal openly with Quill and why it no longer applies.',
            hint: 'Mention Harlow, and Quill as overruled.',
          },
          {
            id: 'length',
            type: 'length',
            title: 'One page',
            min: 80,
            max: 500,
            points: 10,
            why: 'A skeleton is short: the detail comes in the hearing.',
            hint: 'Between 80 and 500 words.',
          },
        ],
      },
    },
    {
      id: 'judge',
      kind: 'decide',
      phase: 'meeting',
      title: 'The judge’s question',
      prompt:
        '“The other side relies on Quill v Asterton. Is there any authority against you that I should know about?” What do you say?',
      points: 25,
      options: [
        {
          id: 'candid',
          label:
            'Tell the judge about Quill, and explain that Harlow overruled it for defects that could not be seen',
          verdict: 'best',
          why: 'Candour with the court is a duty, and here it also wins the point.',
        },
        {
          id: 'hide',
          label: 'Say you are not aware of any authority against you',
          verdict: 'poor',
          why: 'Misleading the court is serious professional misconduct.',
        },
        {
          id: 'later',
          label: 'Ask for time to check',
          verdict: 'acceptable',
          why: 'Honest, but you prepared this: you should know.',
        },
      ],
    },
    {
      id: 'actions',
      kind: 'actions',
      phase: 'after',
      title: 'Record the actions',
      prompt: 'Give each action to the right person.',
      points: 25,
      people: [
        { id: 'tobias', name: 'Tobias (Senior Associate)' },
        { id: 'sunita', name: 'Sunita (Legal Secretary)' },
        { id: 'hana', name: 'Hana (Research Lawyer)' },
      ],
      items: [
        {
          id: 'expert',
          label: 'Instruct the food safety expert on hidden mould',
          owner: 'tobias',
          why: 'Instructing experts is a fee earner’s decision.',
        },
        {
          id: 'bundle',
          label: 'Add Harlow and Quill to the authorities bundle',
          owner: 'sunita',
          why: 'The legal secretary prepares the bundles.',
        },
        {
          id: 'update',
          label: 'Check for any newer cases on hidden defects',
          owner: 'hana',
          why: 'Research updates are the knowledge lawyer’s job.',
        },
      ],
    },
    {
      id: 'follow-up',
      kind: 'reply',
      phase: 'after',
      to: 'Tobias Kestrel',
      title: 'Send the actions',
      prompt: 'Send Tobias the actions from the mock hearing.',
      points: 20,
      minWords: 40,
      mentions: [['Harlow'], ['expert'], ['Sunita'], ['Hana']],
      model:
        'Hi Tobias, the mock hearing went well: the judge accepted that Harlow overruled Quill for hidden defects. Actions: you will instruct the food safety expert on hidden mould; Sunita will add Harlow and Quill to the authorities bundle; Hana will check for any newer cases on hidden defects. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { senior: 3, manager: 2 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Tobias',
    'Neil said your answer on Quill was exactly what a real judge wants to hear.',
  ),
  lapseLog: 'The mock hearing went ahead without your skeleton argument.',
  skills: { 'legal-drafting': 30, 'professional-ethics': 20, 'legal-research': 10 },
  xp: 110,
}

/** Incident: privileged advice emailed to the other side by mistake. */
const misdirected: CaseInput = {
  id: 'law-misdirected-email',
  version: 1,
  careerId: 'legal',
  kind: 'incident',
  minLevel: 3,
  title: 'Our advice went to the other side',
  summary: 'A privileged email was sent to Millstone’s lawyers by mistake. What now?',
  from: at('Leo Marchetti', 'Trainee Solicitor'),
  trigger: { afterAssignment: 'legal-disclosure' },
  deadlineHours: 2,
  email: {
    subject: 'I think I’ve made a terrible mistake',
    body: `Hi {name},

I just sent our advice letter on the strengths and risks of Brightwater’s case to Millstone’s lawyers instead of to Maya. The email address auto-filled. I don’t know what to do. Please help.

Leo`,
  },
  whyItMatters:
    'Mistakes with confidential information happen. What matters is acting fast and honestly: telling the supervisor, asking the recipient to delete it, and telling the client.',
  objectives: [
    'Respond to a confidentiality breach',
    'Support a colleague who made a mistake',
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'What is true?',
      prompt: 'Tick every statement that is true.',
      points: 30,
      findings: [
        {
          id: 'privileged',
          text: 'The advice letter is privileged.',
          issue: true,
          why: 'It is legal advice from the firm to its client.',
        },
        {
          id: 'tell-eleanor',
          text: 'Eleanor, the supervising partner, must be told now.',
          issue: true,
          why: 'Breaches are reported to the supervisor at once.',
        },
        {
          id: 'hide',
          text: 'It is best not to mention it to the client unless she asks.',
          issue: false,
          why: 'The client must be told: it is her information.',
        },
        {
          id: 'ask-delete',
          text: 'Millstone’s lawyers should be asked to delete it unread and confirm.',
          issue: true,
          why: 'Lawyers who receive privileged material by mistake are expected to return or delete it.',
        },
      ],
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you do first?',
      prompt: 'Your first step?',
      points: 30,
      options: [
        {
          id: 'together',
          label: 'Go with Leo to tell Eleanor now',
          verdict: 'best',
          why: 'The partner can contact the other side and the client straight away; Leo is supported.',
        },
        {
          id: 'recall',
          label: 'Try to recall the email and say nothing',
          verdict: 'poor',
          why: 'Recall rarely works, and hiding a breach makes it far worse.',
        },
        {
          id: 'call',
          label: 'Phone Millstone’s lawyers yourself',
          verdict: 'acceptable',
          why: 'Quick, but the partner must lead the response.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Leo Marchetti',
      title: 'Reply to Leo',
      prompt: 'Reply to Leo: what you will do together, kindly.',
      points: 40,
      minWords: 35,
      mentions: [['Eleanor'], ['delete', 'return'], ['Maya', 'client']],
      model:
        'Leo, thank you for telling me straight away: that was the right thing to do. Let’s go and tell Eleanor now. She will ask Millstone’s lawyers to delete the email unread and confirm, and she will tell Maya what happened. Then we will look at turning off auto-fill. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3, indicators: { risk: -3 } },
    fail: { indicators: { risk: 5 } },
    lapse: { indicators: { risk: 4 } },
  },
  replies: replies(
    'Leo',
    'Thank you. Millstone’s lawyers confirmed they deleted it unread.',
  ),
  lapseLog: 'Nobody acted on the misdirected advice letter.',
  skills: { 'professional-ethics': 35, 'customer-service': 15 },
  xp: 120,
}

/** Programme: the firm's free legal advice clinic. */
const clinicBrief = {
  id: 'clinic',
  title: 'Project brief: the free advice clinic',
  text: 'Kestrel & Vane is opening a free legal advice clinic one evening a week at the community centre, run by volunteers from the firm and supervised by a partner. Ward 4 of Riverside Community Hospital and other local organisations will refer people.\n\nThe first term runs for ten weeks.',
}

const clinicPlan: CaseInput = {
  id: 'prog-law-clinic',
  version: 1,
  careerId: 'legal',
  kind: 'programme',
  projectId: 'advice-clinic',
  minLevel: 3,
  title: 'Advice clinic: the first evening',
  summary:
    'Plan the first evening safely: conflicts, supervision and how many people can be seen.',
  from: at('Eleanor Vane', 'Partner', 'manager'),
  trigger: { afterAssignment: 'legal-disclosure' },
  deadlineHours: 8,
  email: {
    subject: 'Free advice clinic: first evening',
    body: `Hi {name},

The clinic opens next Wednesday. Please check the plan and tell me how many people we can see safely.

Eleanor`,
  },
  whyItMatters:
    'Free advice is still legal advice: it needs conflict checks, supervision and honest limits.',
  objectives: ['Apply professional rules to pro bono work', 'Plan capacity'],
  evidence: [
    clinicBrief,
    {
      id: 'plan',
      title: 'The plan',
      text: 'Six volunteers, working in pairs. Each appointment takes 30 minutes, plus 10 minutes for the conflict check and the note. The evening runs 6 pm to 8 pm.',
    },
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'Check the plan',
      prompt: 'Tick every statement that is true.',
      points: 35,
      findings: [
        {
          id: 'conflicts',
          text: 'Each visitor needs a conflict check before they explain their problem.',
          issue: true,
          why: 'The firm might act for the other side.',
        },
        {
          id: 'no-notes',
          text: 'Free advice does not need a written note.',
          issue: false,
          why: 'Every piece of advice is recorded, paid or not.',
        },
        {
          id: 'supervision',
          text: 'A partner must supervise the volunteers.',
          issue: true,
          why: 'The firm is responsible for the advice given.',
        },
      ],
    },
    {
      id: 'capacity',
      kind: 'figure',
      title: 'How many people?',
      prompt: 'How many people can be seen on one evening?',
      points: 35,
      answer: 9,
      tolerance: 0,
      unit: 'people',
      why: 'Three pairs; each slot is 40 minutes; 120 minutes ÷ 40 = 3 people per pair: 9.',
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Eleanor Vane',
      title: 'Reply to Eleanor',
      prompt: 'Tell Eleanor how many people can be seen and the safeguards.',
      points: 30,
      minWords: 35,
      mentions: [['9', 'nine'], ['conflict'], ['supervis']],
      model:
        'Hi Eleanor, with three pairs and 40-minute slots we can see 9 people each evening. Each visitor will have a conflict check before they explain their problem, every piece of advice will be recorded, and a partner will supervise. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -2 },
  },
  replies: replies('Eleanor', 'Nine it is. The community centre is delighted.'),
  lapseLog: 'The clinic’s first evening was planned without your check.',
  skills: { 'professional-ethics': 25, 'case-management': 20 },
  xp: 140,
}

const clinicReview: CaseInput = {
  id: 'prog-law-clinic-review',
  version: 1,
  careerId: 'legal',
  kind: 'programme',
  projectId: 'advice-clinic',
  minLevel: 3,
  title: 'Advice clinic: the end-of-term review',
  summary: 'Advise the partners whether to run the clinic for another term.',
  from: at('Eleanor Vane', 'Partner', 'manager'),
  trigger: { afterCase: 'prog-law-clinic' },
  deadlineHours: 8,
  email: {
    subject: 'Clinic review',
    body: `Hi {name},

Ten weeks done. The partners want a recommendation: another term? Results attached.

Eleanor`,
  },
  whyItMatters:
    'Good pro bono work is reviewed like any other service: what worked, what did not, and what must change.',
  objectives: ['Weigh results', 'Recommend with conditions'],
  evidence: [
    clinicBrief,
    {
      id: 'results',
      title: 'Ten weeks of the clinic',
      text: '84 people advised; 9 in 10 said it helped. Twice, a volunteer gave advice outside their area and a partner had to correct it. Waiting list: 30 people.',
    },
  ],
  steps: [
    {
      id: 'decide',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'What do you recommend?',
      points: 50,
      options: [
        {
          id: 'conditions',
          label:
            'Another term, with volunteers advising only in their own areas and a referral list for the rest',
          verdict: 'best',
          why: 'Keeps the benefit and fixes the problem the review found.',
        },
        {
          id: 'as-is',
          label: 'Another term exactly as it is',
          verdict: 'acceptable',
          why: 'It helped many people, but ignores the advice errors.',
        },
        {
          id: 'stop',
          label: 'Stop: two errors are too many',
          verdict: 'poor',
          why: 'Two corrected errors in 84 cases have a clear fix.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'the partners',
      title: 'Write to the partners',
      prompt: 'Write the recommendation: the results, the problem, and the conditions.',
      points: 50,
      minWords: 45,
      mentions: [['84'], ['area', 'outside'], ['referral', 'refer']],
      model:
        'We recommend another term of the clinic. It advised 84 people and 9 in 10 said it helped. Twice a volunteer advised outside their area, so volunteers should advise only in their own areas, with a referral list for everything else. The waiting list of 30 shows the need. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 4 },
    fail: { reputation: -1 },
    lapse: { reputation: -2 },
  },
  replies: replies('Eleanor', 'The partners agreed. Term two starts in September.'),
  lapseLog: 'The clinic review never reached the partners.',
  skills: { 'professional-ethics': 20, 'legal-drafting': 20 },
  xp: 120,
}

/** Leadership: leading the paralegal team. */
const teamLead: CaseInput = {
  id: 'law-team-lead',
  version: 1,
  careerId: 'legal',
  kind: 'leadership',
  minLevel: 4,
  title: 'Leading the paralegal team for the trial',
  summary:
    'Share out the trial preparation, check a colleague’s research note, and settle a disagreement.',
  from: at('Eleanor Vane', 'Partner', 'manager'),
  trigger: { afterAssignment: 'legal-disclosure' },
  deadlineHours: 3,
  email: {
    subject: 'You’re leading the trial preparation',
    body: `Hi {name},

Brightwater v Millstone goes to trial next month. Please lead the paralegal team: plan who does what, check Priyanka’s research note, and sort out the disagreement about who attends court.

Eleanor`,
  },
  whyItMatters:
    'Leading a legal team means the right person on each task, work that is checked before it is relied on, and fair decisions.',
  objectives: [
    'Delegate by strength and capacity',
    'Review legal work',
    'Give clear, kind feedback',
  ],
  evidence: [
    {
      id: 'note',
      title: 'Priyanka’s research note',
      text: '“Our best authority is Quill v Asterton [2004]. Harlow is a District Court case so it carries less weight.” (Quill was overruled by Harlow.)',
    },
  ],
  steps: [
    {
      id: 'assign',
      kind: 'assign',
      title: 'Share out the work',
      prompt: 'Give each task to the best person.',
      points: 30,
      members: [
        {
          id: 'priyanka',
          name: 'Priyanka',
          strengths: 'Research, careful with detail; still learning case law',
          capacity: 2,
        },
        {
          id: 'sunita',
          name: 'Sunita',
          strengths: 'Bundles and court forms; very organised',
          capacity: 2,
        },
        {
          id: 'leo',
          name: 'Leo',
          strengths: 'Client contact; calm and clear',
          capacity: 2,
        },
      ],
      items: [
        {
          id: 'bundle',
          label: 'Prepare the trial bundle',
          best: ['sunita'],
          why: 'Sunita prepares bundles best.',
        },
        {
          id: 'witness',
          label: 'Arrange the witnesses with the client',
          best: ['leo'],
          why: 'Leo is good with clients.',
        },
        {
          id: 'chronology',
          label: 'Write the chronology of events',
          best: ['priyanka', 'sunita'],
          why: 'Detail work suits Priyanka or Sunita.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Check the research note',
      prompt: 'Which problems does the note have?',
      points: 30,
      findings: [
        {
          id: 'overruled',
          text: 'It relies on a case that has been overruled',
          issue: true,
          why: 'Quill is no longer good law for hidden defects.',
        },
        {
          id: 'weight',
          text: 'It says the overruling case carries less weight',
          issue: true,
          why: 'Harlow overruled Quill: it is the law now.',
        },
        {
          id: 'format',
          text: 'The citations are in the wrong format',
          issue: false,
          why: 'The citations are fine; the problem is the law.',
        },
      ],
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'Who attends court?',
      prompt:
        'Priyanka and Leo both want to attend the trial. Only one can. Priyanka did most of the research; Leo asked first.',
      points: 20,
      options: [
        {
          id: 'fair',
          label:
            'Priyanka attends this trial (she knows the research); Leo attends the next hearing, and you tell both why',
          verdict: 'best',
          why: 'Fair, transparent and good for the client.',
        },
        {
          id: 'first',
          label: 'Leo attends: he asked first',
          verdict: 'acceptable',
          why: 'A rule, but not the best for the case.',
        },
        {
          id: 'neither',
          label: 'Neither: avoid the argument',
          verdict: 'poor',
          why: 'Avoiding the decision helps nobody.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Priyanka',
      title: 'Feedback for Priyanka',
      prompt: 'Write Priyanka kind, clear feedback on the note.',
      points: 20,
      minWords: 40,
      mentions: [['Quill'], ['overruled', 'good law'], ['Harlow']],
      avoid: [
        { terms: ['careless', 'useless'], why: 'Feedback should help her improve.' },
      ],
      model:
        'Hi Priyanka, thank you for the research: it is well organised. One important correction: Quill was overruled by Harlow for hidden defects, so it is no longer good law and we must not rely on it. Harlow is now our best authority. Always check an authority’s status before citing it. Shall we go through the library together? {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3, senior: 2 }, reputation: 4 },
    fail: { indicators: { risk: 3 } },
    lapse: { reputation: -2 },
  },
  replies: replies('Eleanor', 'The trial preparation is in good hands. Thank you.'),
  lapseLog: 'The trial preparation started without a plan.',
  skills: { 'legal-research': 25, 'case-management': 25, 'professional-ethics': 10 },
  xp: 150,
}

/** Advanced: settlement or trial? */
const settlement: CaseInput = {
  id: 'law-adv-settlement',
  version: 1,
  careerId: 'legal',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'Settle or go to trial?',
  summary:
    'Work out what the claim is worth at trial, after costs, and compare it with Millstone’s offer.',
  from: at('Tobias Kestrel', 'Senior Associate', 'senior'),
  trigger: { afterAssignment: 'legal-disclosure' },
  deadlineHours: 6,
  email: {
    subject: 'Millstone’s settlement offer',
    body: `Hi {name},

Millstone has offered £18,000 to settle. Before Eleanor advises Maya, please work out what going to trial is worth to Brightwater, on our estimates.

Tobias`,
  },
  whyItMatters:
    'Clients decide whether to settle; lawyers help them see the numbers and the risks clearly.',
  objectives: ['Calculate an expected value', 'Present a decision fairly'],
  evidence: [
    {
      id: 'estimates',
      title: 'Our estimates',
      table: {
        head: ['', 'Value'],
        rows: [
          ['Damages if Brightwater wins', '£30,000'],
          ['Chance of winning (our estimate)', '70%'],
          ['Brightwater’s further costs of going to trial', '£6,000'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'What is true?',
      prompt: 'Tick every statement that is true.',
      points: 25,
      findings: [
        {
          id: 'estimate',
          text: 'The chance of winning is an estimate, not a certainty.',
          issue: true,
          why: 'Trials are uncertain.',
        },
        {
          id: 'decide',
          text: 'The firm should decide for Maya whether to settle.',
          issue: false,
          why: 'The client decides; the firm advises.',
        },
        {
          id: 'time',
          text: 'A trial also costs Maya time and stress.',
          issue: true,
          why: 'Not everything is in the numbers.',
        },
      ],
    },
    {
      id: 'value',
      kind: 'figure',
      title: 'Expected value of going to trial',
      prompt: 'Expected value of trial, after further costs (in £)?',
      points: 25,
      answer: 15000,
      tolerance: 1,
      unit: '£',
      why: '70% × £30,000 = £21,000, less £6,000 further costs: £15,000.',
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you suggest Eleanor tells Maya?',
      prompt: 'Your suggestion?',
      points: 25,
      options: [
        {
          id: 'explain',
          label:
            'Explain that the offer (£18,000) is more than trial is likely to be worth, with the risks, and let Maya decide',
          verdict: 'best',
          why: 'Clear numbers, honest risks, and the client decides.',
        },
        {
          id: 'trial',
          label: 'Recommend trial: she could get £30,000',
          verdict: 'poor',
          why: 'That ignores the risk of losing and the costs.',
        },
        {
          id: 'accept',
          label: 'Accept the offer on Maya’s behalf',
          verdict: 'poor',
          why: 'Only the client can accept a settlement.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Tobias Kestrel',
      title: 'Reply to Tobias',
      prompt: 'Reply with the figure and your suggestion.',
      points: 25,
      minWords: 40,
      mentions: [
        ['15,000', '15000'],
        ['18,000', '18000'],
        ['decide', 'decision'],
      ],
      model:
        'Hi Tobias, on our estimates trial is worth £15,000 to Brightwater (70% of £30,000 is £21,000, less £6,000 further costs). Millstone’s offer of £18,000 is more than that, without the risk or the stress of a trial. I suggest Eleanor explains this to Maya and lets her decide. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { senior: 2 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Tobias', 'Clear and fair. Maya accepted the offer.'),
  lapseLog: 'The settlement analysis was not done.',
  skills: { 'case-management': 25, accuracy: 25 },
  xp: 140,
}

/** Advanced: a costs estimate for a new client. */
const costsEstimate: CaseInput = {
  id: 'law-adv-costs-estimate',
  version: 1,
  careerId: 'legal',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'A costs estimate for Jonah Pell',
  summary: 'Estimate the fees for Jonah’s claim and explain them clearly.',
  from: at('Eleanor Vane', 'Partner', 'manager'),
  trigger: { afterAssignment: 'legal-disclosure' },
  deadlineHours: 6,
  email: {
    subject: 'Costs estimate: M-2042',
    body: `Hi {name},

Jonah Pell has asked what his claim will cost. Please work out our estimate from the plan below and draft the explanation.

Eleanor`,
  },
  whyItMatters:
    'Clients have a right to know what legal work will cost. Clear estimates, with what could change them, prevent disputes later.',
  objectives: ['Build a costs estimate', 'Explain it clearly'],
  evidence: [
    {
      id: 'plan',
      title: 'The plan (at £160 an hour)',
      table: {
        head: ['Stage', 'Hours'],
        rows: [
          ['Letter of claim and negotiation', '6'],
          ['Preparing the tribunal claim', '10'],
          ['Hearing preparation and hearing', '14'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'What is true?',
      prompt: 'Tick every statement that is true.',
      points: 25,
      findings: [
        {
          id: 'change',
          text: 'The estimate should say what could make it higher.',
          issue: true,
          why: 'For example, if the employer defends hard.',
        },
        {
          id: 'fixed',
          text: 'An estimate is a fixed price.',
          issue: false,
          why: 'An estimate can change; a fixed fee is different.',
        },
        {
          id: 'stages',
          text: 'Breaking it into stages helps the client decide.',
          issue: true,
          why: 'Many claims settle early.',
        },
      ],
    },
    {
      id: 'total',
      kind: 'figure',
      title: 'The total estimate',
      prompt: 'What is the total estimate, in £?',
      points: 25,
      answer: 4800,
      tolerance: 1,
      unit: '£',
      why: '6 + 10 + 14 = 30 hours × £160 = £4,800.',
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'How do you present it?',
      prompt: 'How should the estimate be presented?',
      points: 25,
      options: [
        {
          id: 'stages',
          label: 'By stage, with the total and what could change it',
          verdict: 'best',
          why: 'Clear, honest and useful for decisions.',
        },
        {
          id: 'low',
          label: 'Just the first stage, so it looks cheaper',
          verdict: 'poor',
          why: 'Misleading about the likely total.',
        },
        {
          id: 'total',
          label: 'Only the total',
          verdict: 'acceptable',
          why: 'Honest, but less helpful.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Jonah Pell',
      title: 'Draft the explanation',
      prompt: 'Draft the explanation for Jonah.',
      points: 25,
      minWords: 45,
      mentions: [['4,800', '4800'], ['stage'], ['estimate']],
      avoid: [{ terms: ['guarantee', 'fixed price'], why: 'It is an estimate.' }],
      model:
        'Dear Jonah, our estimate for your claim is £4,800 in total, at £160 an hour: £960 for the letter of claim and negotiation, £1,600 to prepare the tribunal claim, and £2,240 for the hearing. Many claims settle at the first stage. This is an estimate: it could rise if your former employer defends the claim strongly, and we will tell you straight away if it might. {name}',
    },
  ],
  outcomes: {
    pass: { reputation: 3, indicators: { satisfaction: 3 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Eleanor', 'Clear and honest. Jonah has instructed us.'),
  lapseLog: 'Jonah Pell waited for his costs estimate.',
  skills: { 'case-management': 25, 'customer-service': 25 },
  xp: 140,
}

export const MORE_LEGAL_CASES: CaseInput[] = [
  mockHearing,
  misdirected,
  clinicPlan,
  clinicReview,
  teamLead,
  settlement,
  costsEstimate,
]
