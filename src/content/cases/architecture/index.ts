/**
 * Cases for the architecture and interior design career at Cobalt Ridge's
 * Spaces & Interiors practice. Fictional people, clients and numbers;
 * simplified rules of thumb, for learning.
 */
import type { CaseInput } from '../schema'
import { replies } from '../incidents/shared'
import { brief, replies as programmeReplies, stage } from '../programme/shared'

const CAREER = 'architecture-interiors'
const ORG = 'Spaces & Interiors'
const at = (name: string, role: string, personId?: string, organisation = ORG) => ({
  name,
  role,
  organisation,
  ...(personId ? { personId } : {}),
})

/** Foundation: a client wants a wall taken out. */
const clientWall: CaseInput = {
  id: 'arch-client-wall',
  version: 1,
  careerId: CAREER,
  kind: 'client',
  minLevel: 1,
  title: '“Can we just knock that wall through?”',
  summary:
    'A client wants to remove a wall between the kitchen and living room. Reply safely.',
  from: at('Naomi Pryce', 'Homeowner', undefined, 'Private client'),
  trigger: { afterAssignment: 'arch-two-bed' },
  deadlineHours: 3,
  email: {
    subject: 'Opening up the kitchen',
    body: `Hi,

We love the plans, but we’d like the kitchen and living room opened up into one big space. Can we just knock the wall through? Our builder says it will only take a day.

Naomi`,
  },
  whyItMatters:
    "Some walls hold the building up. Removing one without a structural engineer's check and the right approvals can bring floors down; a good designer says so, kindly, and offers a way forward.",
  objectives: [
    'Never approve removing a wall without a check',
    'Explain clearly and offer the next step',
  ],
  steps: [
    {
      id: 'reply',
      kind: 'reply',
      to: 'Naomi Pryce',
      title: 'Reply to Naomi',
      prompt: 'Reply: not until it is checked, why, and what happens next.',
      points: 100,
      minWords: 50,
      mentions: [
        ['not', 'until', 'before'],
        ['structural', 'engineer', 'load-bearing', 'load bearing'],
        ['check', 'survey'],
      ],
      avoid: [
        {
          terms: ['go ahead', 'no problem', 'should be fine'],
          why: 'Never approve removing a wall that may be load-bearing.',
        },
        {
          terms: ['just a day'],
          why: 'How long it takes is not the question; whether it is safe is.',
        },
      ],
      model:
        "Hi Naomi, an open-plan kitchen is a lovely idea, but please don't remove the wall until it has been checked. It may be load-bearing, holding up the floor above. We will arrange a structural engineer's survey: if it is load-bearing, a steel beam can usually replace it, and we will draw that up and check what approval is needed. {name}",
    },
  ],
  outcomes: {
    pass: { reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 4 } },
    lapse: { indicators: { risk: 2 } },
  },
  replies: replies('Naomi', 'Thank you for being careful. Please book the survey.'),
  lapseLog: 'Naomi Pryce’s question about the wall went unanswered.',
  skills: { 'building-design': 30, 'client-briefs': 20 },
  xp: 75,
}

/** Foundation: how much paint to order. */
const paintOrder: CaseInput = {
  id: 'arch-paint-order',
  version: 1,
  careerId: CAREER,
  kind: 'internal',
  minLevel: 1,
  title: 'How much paint for the meeting room?',
  summary:
    'Work out the wall area of a room, less its door and window, and the tins to order.',
  from: at('Callum Reid', 'Project Manager'),
  trigger: { afterAssignment: 'arch-office' },
  deadlineHours: 3,
  email: {
    subject: 'Paint for the Lumen meeting room',
    body: `Hi {name},

The Lumen meeting room is 4.0 m by 3.5 m, with walls 2.5 m high. It has one door (1.8 m²) and one window (1.5 m²). The decorators apply two coats, and the paint covers 12 m² per litre.

What is the wall area to paint (one coat), and how many 2.5 litre tins should I order?

Callum`,
  },
  whyItMatters:
    "Ordering finishes is simple arithmetic, but getting it wrong stops the decorators or wastes the client's money.",
  objectives: ['Work out a wall area', 'Turn an area into an order'],
  steps: [
    {
      id: 'area',
      kind: 'figure',
      title: 'Wall area (one coat)',
      prompt: 'How many square metres of wall are there to paint?',
      points: 50,
      answer: 34.2,
      tolerance: 0.05,
      unit: 'm²',
      why: 'The perimeter is 2 × (4.0 + 3.5) = 15 m; × 2.5 m = 37.5 m²; less 1.8 and 1.5 = 34.2 m².',
    },
    {
      id: 'tins',
      kind: 'decide',
      title: 'Tins to order',
      prompt: 'Two coats need 68.4 m², or 5.7 litres. What do you order?',
      points: 20,
      options: [
        {
          id: 'three',
          label: 'Three 2.5 litre tins (7.5 litres)',
          verdict: 'best',
          why: '5.7 litres needs three tins; two (5 litres) would run out.',
        },
        {
          id: 'two',
          label: 'Two 2.5 litre tins (5 litres)',
          verdict: 'poor',
          why: 'Not enough for two coats.',
        },
        {
          id: 'six',
          label: 'Six tins, to be safe',
          verdict: 'acceptable',
          why: 'It works, but buys twice what is needed.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Callum Reid',
      title: 'Reply to Callum',
      prompt: 'Tell Callum the area and what to order.',
      points: 30,
      minWords: 25,
      mentions: [['34.2'], ['three', '3 tins', '3 x', '3 ×']],
      model:
        'Hi Callum, the walls are 34.2 m² (37.5 m² less the door and window). Two coats is 68.4 m², about 5.7 litres, so please order three 2.5 litre tins. {name}',
    },
  ],
  outcomes: {
    pass: { indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Callum', 'Ordered three tins. Thanks.'),
  lapseLog: 'The paint order for the meeting room waited.',
  skills: { accuracy: 25, 'interior-design': 15 },
  xp: 70,
}

/** Operations: the team's requests against its budget. */
const requests: CaseInput = {
  id: 'arch-requests',
  version: 1,
  careerId: CAREER,
  kind: 'operations',
  minLevel: 2,
  title: 'The studio’s requests',
  summary: 'Samples, tools and training against the team budget, within your limit.',
  from: at('Marguerite Achebe', 'Architecture Lead', 'manager'),
  trigger: { afterAssignment: 'arch-tight' },
  deadlineHours: 4,
  email: {
    subject: 'This week’s requests',
    body: `Hi {name},

I am on site all week. Please decide the studio's requests against our budget: samples, tools and training are fine; personal items are not; anything over your limit comes to me.

Marguerite`,
  },
  whyItMatters:
    "Spending within policy and within your authority keeps the studio's budget honest.",
  objectives: ['Apply the spending policy', 'Stay within your limit'],
  steps: [
    {
      id: 'approve',
      kind: 'approve',
      title: 'Decide the requests',
      prompt: 'Approve, reject or escalate each request.',
      points: 70,
      requests: [
        {
          id: 'samples',
          summary: 'Tile and fabric sample boards for the library',
          department: 'design',
          amount: 160,
          why: 'Samples are in policy.',
        },
        {
          id: 'laser',
          summary: 'A laser distance measure for surveys',
          department: 'design',
          amount: 95,
          why: 'Survey tools are in policy.',
        },
        {
          id: 'printer',
          summary: 'An A1 plotter for presentation drawings',
          department: 'design',
          amount: 2400,
          why: "In policy, but above a designer's limit: the lead decides.",
        },
        {
          id: 'sofa',
          summary: 'A sofa for a designer\'s flat ("it\'s research")',
          department: 'design',
          amount: 650,
          policyBreach: 'Personal items are not paid for.',
        },
      ],
    },
    {
      id: 'plotter',
      kind: 'decide',
      title: 'While the plotter waits',
      prompt:
        'The plotter needs Marguerite and she is away until Friday. A client presentation is on Thursday. What do you do?',
      points: 30,
      options: [
        {
          id: 'print-shop',
          label:
            "Use the print shop for Thursday's drawings, and leave the plotter for Marguerite",
          verdict: 'best',
          why: 'The presentation happens, and the purchase stays with the person with the authority.',
        },
        {
          id: 'buy',
          label: 'Buy it: the presentation matters',
          verdict: 'poor',
          why: "Good reasons don't change your limit.",
        },
        {
          id: 'screen',
          label: 'Show the drawings on a laptop only',
          verdict: 'acceptable',
          why: 'It works, but clients often want printed boards.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -3 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Marguerite', 'Thanks: I approved the plotter this morning.'),
  lapseLog: 'The studio’s requests waited another week.',
  skills: { accuracy: 20, 'client-briefs': 20 },
  xp: 85,
}

/** Workflow: handing the survey to the fit-out contractor. */
const handover: CaseInput = {
  id: 'arch-handover',
  version: 1,
  careerId: CAREER,
  kind: 'workflow',
  minLevel: 2,
  title: 'Hand the survey to the fit-out contractor',
  summary:
    'Pass the measured survey to the contractor, exactly, so they price and build the right thing.',
  from: at('Tobias Lindqvist', 'Senior Designer', 'senior'),
  trigger: { afterAssignment: 'arch-tight' },
  deadlineHours: 2,
  email: {
    subject: 'Northgate: survey to the contractor',
    body: `Hi {name},

The fit-out contractor needs our survey of the Northgate office to price the works. Fill in the handover from the survey notes, please.

Tobias`,
  },
  whyItMatters:
    'Contractors price and build from what we send them. A wrong figure in a handover becomes a wrong building, or a dispute.',
  objectives: ['Pass on survey information exactly'],
  evidence: [
    {
      id: 'survey',
      title: 'Survey notes: Northgate Lettings',
      text: 'Project NG-114. Office measured 9.00 × 7.00 m inside the walls (63 m²). Floor to ceiling 2,650 mm. One fire exit: the entrance door on the south wall. Windows on the north wall only.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      to: 'Fit-out contractor',
      title: 'The handover',
      prompt: 'Fill in the handover.',
      points: 70,
      fields: [
        {
          id: 'ref',
          label: 'Project reference',
          kind: 'text',
          accept: ['NG-114'],
          why: 'The contractor files and prices by reference.',
        },
        {
          id: 'area',
          label: 'Floor area (m²)',
          kind: 'number',
          answer: 63,
          why: '9.00 × 7.00 m = 63 m².',
        },
        {
          id: 'ceiling',
          label: 'Floor to ceiling (mm)',
          kind: 'number',
          answer: 2650,
          why: 'Partitions and lights are ordered to this height.',
        },
        {
          id: 'exit',
          label: 'Fire exit',
          kind: 'choice',
          options: ['Entrance door, south wall', 'North wall', 'None'],
          answer: 'Entrance door, south wall',
          why: 'The escape route must be kept clear during the works.',
        },
      ],
    },
    {
      id: 'exit-route',
      kind: 'decide',
      title: 'Working in an occupied office',
      prompt:
        'The client keeps working while the fit-out happens. What must the contractor be told?',
      points: 30,
      options: [
        {
          id: 'clear',
          label: 'The route to the entrance door must stay clear at all times',
          verdict: 'best',
          why: 'It is the only way out in a fire.',
        },
        {
          id: 'weekends',
          label: 'Nothing: it is their site',
          verdict: 'poor',
          why: "The occupied office is still the client's workplace.",
        },
        {
          id: 'signs',
          label: 'Put up signs saying "works in progress"',
          verdict: 'acceptable',
          why: 'Useful, but the route itself must stay clear.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { senior: 3 }, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { indicators: { risk: 2 } },
  },
  replies: replies(
    'Tobias',
    "Clear handover. The contractor's price came back the same day.",
  ),
  lapseLog: 'The Northgate survey was not handed to the contractor.',
  skills: { accuracy: 30, 'technical-writing': 15 },
  xp: 85,
}

const handoverFix: CaseInput = {
  id: 'arch-handover-fix',
  version: 1,
  careerId: CAREER,
  kind: 'workflow',
  minLevel: 2,
  title: 'The contractor queries the survey',
  summary: 'The contractor found a figure that did not match. Put it right now.',
  from: at('Dev Malhotra', 'Estimator', undefined, 'Brookline Interiors'),
  trigger: { afterCase: 'arch-handover', onlyIf: { step: 'handoff', outcome: 'wrong' } },
  deadlineHours: 1,
  email: {
    subject: 'NG-114: the figures don’t match',
    body: `Hi,

Your handover for Northgate doesn't match the drawings, so we have stopped pricing. Can you confirm the correct figures?

Dev`,
  },
  whyItMatters:
    'When a contractor stops to check, they are doing the right thing. The fix must be fast and exact.',
  objectives: ['Correct a handover quickly and exactly'],
  steps: [
    {
      id: 'response',
      kind: 'decide',
      title: 'What do you do?',
      prompt: 'Your response?',
      points: 50,
      options: [
        {
          id: 'fix',
          label: 'Thank Dev for checking, and send the correct figures now',
          verdict: 'best',
          why: 'Stopping was right; exact figures let them carry on.',
        },
        {
          id: 'guess',
          label: 'Tell him to use the drawings and work it out',
          verdict: 'poor',
          why: 'Leaving the contractor to guess is how disputes start.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Dev Malhotra',
      title: 'The correct figures',
      prompt: 'Send the correct details.',
      points: 50,
      minWords: 25,
      mentions: [['NG-114'], ['63'], ['2,650', '2650']],
      model:
        'Thanks for checking, Dev. Correct figures for NG-114: floor area 63 m² (9.00 × 7.00 m), floor to ceiling 2,650 mm, one fire exit at the entrance door on the south wall, which must stay clear. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { senior: 1 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { risk: 2 } },
  },
  replies: replies('Dev', 'Thanks, all clear. Pricing now.'),
  lapseLog: 'The contractor’s question about NG-114 went unanswered.',
  skills: { accuracy: 20 },
  xp: 45,
}

/** Meeting: presenting the reception refit to the client. */
const designReview: CaseInput = {
  id: 'arch-design-review',
  version: 1,
  careerId: CAREER,
  kind: 'meeting',
  minLevel: 3,
  title: 'The reception design review',
  summary:
    'Prepare the design note, hold the line on access in the review, and send the actions.',
  from: at('Marguerite Achebe', 'Architecture Lead', 'manager'),
  trigger: { afterAssignment: 'arch-commercial' },
  deadlineHours: 4,
  meeting: {
    title: 'Brightsmile reception design review',
    inHours: 1,
    minutes: 45,
    room: 'Studio meeting room',
  },
  email: {
    subject: 'Brightsmile review this afternoon',
    body: `Hi {name},

Brightsmile's practice manager joins us this afternoon to review the reception refit. Please prepare a one-page design note in Word Craft (the brief, the layout, the finishes and the cost), come to the review, and send the actions afterwards.

Marguerite`,
  },
  whyItMatters:
    'Design reviews are where clients ask for changes. They work when the designer explains clearly, and holds to what makes the design safe and accessible.',
  objectives: [
    'Prepare a design note',
    'Hold to accessibility under pressure',
    'Record actions',
  ],
  evidence: [
    {
      id: 'design',
      title: 'The design',
      text: 'Both doors widened to 926 mm leaves (846 mm clear). The desk moved clear of the entrance. Seven seats. Terrazzo floor replacing the carpet. Estimated cost £14,700 against a budget of £16,000.',
    },
  ],
  steps: [
    {
      id: 'note',
      kind: 'document',
      phase: 'prepare',
      title: 'Prepare the design note',
      prompt:
        'Write a one-page design note in Word Craft: the brief, the layout, the finishes and the cost.',
      points: 30,
      deliverable: {
        kind: 'doc',
        title: 'Design note: Brightsmile reception',
        template: 'memo',
        checks: [
          {
            id: 'sections',
            type: 'sections',
            title: 'A clear structure',
            sections: [['Brief'], ['Layout'], ['Finishes'], ['Cost']],
            points: 10,
            why: 'Reviewers find what they need quickly.',
            hint: 'Use the headings Brief, Layout, Finishes and Cost.',
          },
          {
            id: 'mentions',
            type: 'mentions',
            title: 'The key facts',
            terms: [['926'], ['terrazzo'], ['£14,700', '14,700', '14700']],
            points: 10,
            why: 'The door width, the floor and the cost are what the review needs.',
            hint: 'Mention the 926 mm doors, the terrazzo floor and the £14,700 cost.',
          },
          {
            id: 'length',
            type: 'length',
            title: 'One page',
            min: 80,
            max: 500,
            points: 10,
            why: 'Short enough to read in the meeting.',
            hint: '80 to 500 words.',
          },
        ],
      },
    },
    {
      id: 'pressure',
      kind: 'decide',
      phase: 'meeting',
      title: 'In the review',
      prompt:
        'The practice manager asks to keep the old narrow doors to save £800: "hardly anyone in a wheelchair comes in". What do you say?',
      points: 25,
      options: [
        {
          id: 'hold',
          label:
            'Explain that accessible doors are needed for everyone (wheelchairs, buggies, crutches), and offer to find the £800 elsewhere',
          verdict: 'best',
          why: "Access is not optional, and the client's goal still gets your help.",
        },
        {
          id: 'agree',
          label: 'Agree: it is their practice',
          verdict: 'poor',
          why: 'Narrow doors exclude patients; a public building must be accessible.',
        },
        {
          id: 'later',
          label: 'Say you will think about it',
          verdict: 'acceptable',
          why: 'Not wrong, but the answer is already clear.',
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
        { id: 'sana', name: 'Sana (Interior Designer)' },
        { id: 'callum', name: 'Callum (Project Manager)' },
        { id: 'wen', name: 'Wen (Architectural Technologist)' },
      ],
      items: [
        {
          id: 'samples',
          label: 'Send the client terrazzo and fabric samples',
          owner: 'sana',
          why: "Finishes are the interior designer's.",
        },
        {
          id: 'saving',
          label: 'Find £800 of savings without touching the doors',
          owner: 'callum',
          why: 'The project manager owns the budget.',
        },
        {
          id: 'details',
          label: 'Draw the door details for the contractor',
          owner: 'wen',
          why: "Construction details are the technologist's.",
        },
      ],
    },
    {
      id: 'follow-up',
      kind: 'reply',
      phase: 'after',
      to: 'the project team',
      title: 'Send the actions',
      prompt: 'Send the actions from the review.',
      points: 20,
      minWords: 40,
      mentions: [['Sana'], ['Callum'], ['Wen'], ['926', 'accessible']],
      model:
        'Hi all, thanks for the review. We confirmed the accessible 926 mm doors. Actions: Sana will send the client terrazzo and fabric samples; Callum will find £800 of savings elsewhere; Wen will draw the door details for the contractor. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Marguerite',
    'You handled the doors question perfectly. The client signed off.',
  ),
  lapseLog: 'The reception review went ahead without your design note.',
  skills: { 'client-briefs': 30, 'technical-writing': 20 },
  xp: 110,
}

/** Incident: a blocked escape route on site. */
const blockedExit: CaseInput = {
  id: 'arch-blocked-exit',
  version: 1,
  careerId: CAREER,
  kind: 'incident',
  minLevel: 3,
  title: 'A blocked escape route on site',
  summary:
    'On a site visit, the only fire exit of an occupied office is blocked by the fit-out. What now?',
  from: at('Ola Adeyemi', 'Junior Designer'),
  trigger: { afterAssignment: 'arch-commercial' },
  deadlineHours: 2,
  email: {
    subject: 'Is this allowed?',
    body: `Hi {name},

I'm at Northgate for the snagging visit. The contractor has stacked the old desks and boxes in the corridor to the entrance, and propped the fire door open with a fire extinguisher. Northgate's staff are still working in the back office. The site manager says it's only until Friday. Is that OK?

Ola`,
  },
  whyItMatters:
    "An occupied building must keep its escape routes clear and its fire doors shut. Speaking up on site is part of a designer's duty, even when it is not your contract.",
  objectives: [
    'Recognise a fire safety hazard',
    'Support a colleague who speaks up',
    'Act through the right people',
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
          id: 'route',
          text: 'The escape route must be kept clear while people are in the building.',
          issue: true,
          why: 'It is the only way out in a fire.',
        },
        {
          id: 'door',
          text: 'A fire door propped open stops it holding back smoke and fire.',
          issue: true,
          why: 'Fire doors work only when closed.',
        },
        {
          id: 'friday',
          text: 'It is fine because it is only until Friday.',
          issue: false,
          why: 'A fire can happen on any day.',
        },
        {
          id: 'not-ours',
          text: "It is the contractor's site, so the designer should say nothing.",
          issue: false,
          why: 'Anyone who sees a serious hazard should raise it.',
        },
      ],
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you do now?',
      prompt: 'Your first step?',
      points: 30,
      options: [
        {
          id: 'clear-now',
          label:
            'Ask Ola to tell the site manager the route must be cleared now, call Callum (the project manager) to confirm with the contractor, and tell the client',
          verdict: 'best',
          why: 'The hazard is removed today, through the people responsible.',
        },
        {
          id: 'email',
          label: 'Email the contractor to ask them to clear it by Friday',
          verdict: 'acceptable',
          why: 'Right concern, but too slow while people are working there.',
        },
        {
          id: 'ignore',
          label: "Leave it: it is the contractor's responsibility",
          verdict: 'poor',
          why: 'People could be trapped in a fire.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Ola Adeyemi',
      title: 'Reply to Ola',
      prompt: 'Reply to Ola: thank her, say it is not OK, and what happens next.',
      points: 40,
      minWords: 35,
      mentions: [
        ['thank'],
        ['not ok', 'not okay', 'not allowed', 'never', 'must'],
        ['clear', 'Callum'],
      ],
      model:
        'Ola, thank you for asking: it is not OK. The corridor is the only escape route and must be kept clear while people are working there, and the fire door must be shut. Please ask the site manager to clear it now; I am calling Callum to confirm with the contractor and we will tell Northgate. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3, indicators: { risk: -4 } },
    fail: { indicators: { risk: 5 } },
    lapse: { indicators: { risk: 4 } },
  },
  replies: replies('Ola', 'Thank you. The corridor was cleared within the hour.'),
  lapseLog: 'Ola’s report about the blocked escape route was not acted on.',
  skills: { 'building-design': 25, 'client-briefs': 15 },
  xp: 120,
}

/** Programme stage 1: the Manchester office layout. */
const progLayout: CaseInput = {
  ...stage(CAREER, 1),
  id: 'prog-arch-layout',
  version: 1,
  careerId: CAREER,
  title: 'Manchester office: will 25 people fit?',
  summary:
    'Work out the space the Manchester office needs, check it against the floor leased, and advise the programme board.',
  from: at('Marguerite Achebe', 'Architecture Lead', 'manager'),
  trigger: { afterAssignment: 'arch-storey' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester programme: the space plan',
    body: `Hi {name},

Operations have found a floor in Manchester: 340 m² usable. Before they sign, the programme board wants to know if 25 people fit. Use our planning allowances (attached) and tell the board.

Marguerite`,
  },
  whyItMatters:
    'A space plan done before the lease is signed is cheap; discovering afterwards that the team does not fit is very expensive.',
  objectives: [
    'Work out a space requirement',
    'Compare it with the space available',
    'Advise a programme board',
  ],
  evidence: [
    brief,
    {
      id: 'allowances',
      title: 'Planning allowances (Spaces & Interiors)',
      table: {
        head: ['Space', 'Allowance'],
        rows: [
          ['Open-plan desks', '8 m² per desk, including circulation'],
          ['Meeting rooms', '2 rooms of 18 m²'],
          ['Kitchen and breakout', '25 m²'],
          ['Reception', '20 m²'],
          ['Print and store', '12 m²'],
          ['Comms room', '8 m²'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'support',
      kind: 'figure',
      title: 'Support spaces',
      prompt:
        'How much space do the meeting rooms, kitchen, reception, print and comms rooms need in all?',
      points: 25,
      answer: 101,
      tolerance: 0,
      unit: 'm²',
      why: '2 × 18 + 25 + 20 + 12 + 8 = 101 m².',
    },
    {
      id: 'total',
      kind: 'figure',
      title: 'Total needed',
      prompt: 'With 25 desks at 8 m² each, how much space is needed in all?',
      points: 25,
      answer: 301,
      tolerance: 0,
      unit: 'm²',
      why: '25 × 8 = 200 m², plus 101 m² = 301 m².',
    },
    {
      id: 'spare',
      kind: 'decide',
      title: 'What to do with the spare 39 m²',
      prompt: '340 m² leaves 39 m² spare. What do you recommend?',
      points: 20,
      options: [
        {
          id: 'growth',
          label: 'Keep it as space for growth: about four more desks as the office grows',
          verdict: 'best',
          why: 'Growth space avoids moving again within a year or two.',
        },
        {
          id: 'bigger-desks',
          label: 'Give everyone bigger desks',
          verdict: 'acceptable',
          why: 'Pleasant, but it uses up the room to grow.',
        },
        {
          id: 'smaller-floor',
          label: 'Look for a smaller floor',
          verdict: 'poor',
          why: 'A tighter fit leaves no margin for the new hires planned.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'the programme board',
      title: 'Advise the board',
      prompt:
        'Tell the board whether 25 people fit, with the figures, and your recommendation.',
      points: 30,
      minWords: 40,
      mentions: [['301'], ['340'], ['39', 'growth', 'grow']],
      model:
        'The 340 m² floor works. Using our allowances, 25 desks need 200 m² and the support spaces 101 m², 301 m² in all, which leaves 39 m². I recommend keeping that as growth space for about four more desks, so we do not have to move again soon. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3 },
    fail: { reputation: -2 },
    lapse: { reputation: -2 },
  },
  replies: programmeReplies(
    'Marguerite',
    'Clear and well argued. Operations signed the lease on the strength of it.',
  ),
  lapseLog: 'The Manchester space plan was not sent to the programme board.',
  skills: { 'space-planning': 35, 'client-briefs': 20 },
  xp: 140,
}

/** Programme stage 2: the review. */
const progReview: CaseInput = {
  ...stage(CAREER, 2),
  id: 'prog-arch-review',
  version: 1,
  careerId: CAREER,
  title: 'Manchester office: the programme review',
  summary: 'Operations want room for visitors from London as well. Advise the review.',
  from: at('Marguerite Achebe', 'Architecture Lead', 'manager'),
  trigger: { afterCase: 'prog-arch-layout' },
  deadlineHours: 8,
  email: {
    subject: 'Manchester review: visiting staff',
    body: `Hi {name},

At the programme review, Operations asked for eight extra desks for staff visiting from London, two days a week. Eight desks at 8 m² is 64 m², and we have 39 m² spare. Please advise the review.

Marguerite`,
  },
  whyItMatters:
    "A programme review changes plans when the facts change. The designer's job is to show the options and their cost in space, not just say yes or no.",
  objectives: ['Advise a change from the space figures', 'Offer a workable option'],
  evidence: [brief],
  steps: [
    {
      id: 'option',
      kind: 'decide',
      title: 'Your recommendation',
      prompt: 'What do you recommend?',
      points: 50,
      options: [
        {
          id: 'hotdesk',
          label:
            'Four bookable hot desks (32 m²) in the growth space: visitors come two days a week, so four desks serve eight people',
          verdict: 'best',
          why: 'It fits in the 39 m² and meets the need without wasting desks that sit empty three days a week.',
        },
        {
          id: 'eight',
          label: 'Eight dedicated desks, using a meeting room for the rest',
          verdict: 'poor',
          why: '64 m² does not fit, and losing a meeting room hurts everyone.',
        },
        {
          id: 'none',
          label: 'No desks for visitors',
          verdict: 'acceptable',
          why: 'It protects the space, but leaves a real need unmet.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'the programme review',
      title: 'Advise the review',
      prompt: 'Explain the figures and your recommendation.',
      points: 50,
      minWords: 40,
      mentions: [['64'], ['39'], ['hot desk', 'hot-desk', 'bookable', 'four']],
      model:
        'Eight dedicated desks need 64 m² and we have 39 m² spare, so they do not fit. As visitors come two days a week, I recommend four bookable hot desks (32 m²) in the growth space: they serve all eight visitors and keep both meeting rooms. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3 },
    fail: { reputation: -2 },
    lapse: { reputation: -2 },
  },
  replies: programmeReplies(
    'Marguerite',
    'The review took your hot-desk proposal as it stood.',
  ),
  lapseLog: 'The question about visiting staff waited until the next review.',
  skills: { 'space-planning': 25, 'client-briefs': 25 },
  xp: 120,
}

/** Leadership: leading the Harbour Housing block. */
const teamLead: CaseInput = {
  id: 'arch-team-lead',
  version: 1,
  careerId: CAREER,
  kind: 'leadership',
  minLevel: 4,
  title: 'Leading the Harbour Housing block',
  summary:
    "Share out the design work, check a junior's room schedule, and settle a deadline clash.",
  from: at('Marguerite Achebe', 'Architecture Lead', 'manager'),
  trigger: { afterAssignment: 'arch-proposal' },
  deadlineHours: 3,
  email: {
    subject: 'You’re leading Harbour Housing',
    body: `Hi {name},

Please lead the Harbour Housing block from here: share out the work, check Ola's room schedule before it goes to the client, and sort out the clash over Friday's deadline.

Marguerite`,
  },
  whyItMatters:
    'Leading a design team means the right person on each job, work checked before a client sees it, and fair, clear decisions.',
  objectives: ['Delegate by skill', "Check a colleague's work", 'Give clear feedback'],
  evidence: [
    {
      id: 'schedule',
      title: "Ola's room schedule (extract)",
      text: '"Bedroom 1: 4.30 × 3.75 m = 16.1 m²." Ola measured to the outside faces of the 150 mm walls. Inside the walls the room is 4.15 × 3.60 m.',
    },
  ],
  steps: [
    {
      id: 'assign',
      kind: 'assign',
      title: 'Share out the work',
      prompt: 'Give each job to the best person.',
      points: 30,
      members: [
        {
          id: 'sana',
          name: 'Sana',
          strengths: 'Interior design; finishes and furniture',
          capacity: 2,
        },
        {
          id: 'wen',
          name: 'Wen',
          strengths: 'Technical drawings and construction details',
          capacity: 2,
        },
        {
          id: 'ola',
          name: 'Ola',
          strengths: 'Junior designer; learning, needs supervision',
          capacity: 1,
        },
      ],
      items: [
        {
          id: 'finishes',
          label: "Specify the flats' finishes and furniture",
          best: ['sana'],
          why: "Finishes and furniture are Sana's strength.",
        },
        {
          id: 'details',
          label: 'Draw the stair and balcony details',
          best: ['wen'],
          why: "Construction details are Wen's.",
        },
        {
          id: 'layouts',
          label: 'Furniture layouts for the show flat, with Sana checking',
          best: ['ola'],
          why: 'Good supervised learning for a junior.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: "Check Ola's schedule",
      prompt: 'Which problems does it have?',
      points: 30,
      findings: [
        {
          id: 'faces',
          text: 'It measures to the outside of the walls, not the inside',
          issue: true,
          why: 'Room areas for a client are the usable floor, inside the walls.',
        },
        {
          id: 'answer',
          text: 'Bedroom 1 is really about 14.9 m²',
          issue: true,
          why: '4.15 × 3.60 = 14.94 m².',
        },
        {
          id: 'units',
          text: 'The units are wrong',
          issue: false,
          why: 'Metres and square metres are right.',
        },
      ],
    },
    {
      id: 'decide',
      kind: 'decide',
      title: "Friday's deadline",
      prompt:
        'Wen and Sana both need the plotter all Friday afternoon for different clients. One deadline is Friday; the other is Monday.',
      points: 20,
      options: [
        {
          id: 'deadline',
          label:
            "Friday's deadline gets the plotter on Friday; Monday's job prints first thing Monday, and tell both why",
          verdict: 'best',
          why: 'Fair, by need, and explained.',
        },
        {
          id: 'senior',
          label: 'Wen: he has been here longer',
          verdict: 'poor',
          why: 'Seniority is not a reason; the deadlines are.',
        },
        {
          id: 'print-shop',
          label: 'Send both to the print shop',
          verdict: 'acceptable',
          why: 'It avoids the argument, but costs money not needed.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Ola',
      title: 'Feedback for Ola',
      prompt: 'Write Ola kind, clear feedback on the schedule.',
      points: 20,
      minWords: 40,
      mentions: [['inside', 'internal'], ['14.9'], ['check']],
      avoid: [
        { terms: ['careless', 'sloppy'], why: 'Feedback should help her improve.' },
      ],
      model:
        'Hi Ola, thanks for the schedule: the layout and units are right. One correction: room areas for a client are measured inside the walls, so bedroom 1 is 4.15 × 3.60 m, about 14.9 m², not 16.1. It is a common slip; a quick check against the plan catches it. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3, senior: 2 }, reputation: 4 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Marguerite',
    'A well-run week. The client had the corrected schedule on time.',
  ),
  lapseLog: 'The Harbour Housing team went a week without a lead.',
  skills: { 'space-planning': 25, 'client-briefs': 20, 'technical-writing': 10 },
  xp: 150,
}

/** Advanced: is there enough daylight? */
const daylight: CaseInput = {
  id: 'arch-adv-daylight',
  version: 1,
  careerId: CAREER,
  kind: 'internal',
  minLevel: 3,
  difficulty: 'advanced',
  title: 'Enough daylight in the study?',
  summary: "Check a room's window against a daylight rule of thumb, and propose a fix.",
  from: at('Grace Mwangi', 'Sustainability Adviser'),
  trigger: { afterAssignment: 'arch-proposal' },
  deadlineHours: 4,
  email: {
    subject: 'Daylight in the Orchard Close study',
    body: `Hi {name},

The study at Orchard Close is 4.2 × 3.6 m with one window, 1.2 × 1.2 m. Our rule of thumb is glazing of at least 20% of the floor area. What glazed area does it need, and does it have it?

Grace`,
  },
  whyItMatters:
    'Daylight affects health, mood and energy use. Checking it early, with a simple rule, avoids dark rooms that cost money to light.',
  objectives: ['Apply a daylight rule of thumb', 'Propose a design fix'],
  steps: [
    {
      id: 'needed',
      kind: 'figure',
      title: 'Glazing needed',
      prompt: 'How many square metres of glazing does the study need?',
      points: 40,
      answer: 3.02,
      tolerance: 0.02,
      unit: 'm²',
      why: '4.2 × 3.6 = 15.12 m²; 20% is 3.02 m².',
    },
    {
      id: 'fix',
      kind: 'decide',
      title: 'The window is 1.44 m². What do you propose?',
      prompt: 'Which change best meets the rule?',
      points: 30,
      options: [
        {
          id: 'wider',
          label: 'A 2.4 × 1.35 m window (3.24 m²) on the same wall',
          verdict: 'best',
          why: 'It meets 3.02 m² with one opening, on the wall that already has a window.',
        },
        {
          id: 'roof',
          label: 'Add a rooflight',
          verdict: 'acceptable',
          why: 'It works upstairs, but the study is on the ground floor.',
        },
        {
          id: 'lamps',
          label: 'Add more lamps',
          verdict: 'poor',
          why: 'Lamps are not daylight.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Grace Mwangi',
      title: 'Reply to Grace',
      prompt: 'Give Grace the figures and your proposal.',
      points: 30,
      minWords: 30,
      mentions: [['3.02', '3.0'], ['1.44'], ['2.4', 'wider', 'larger']],
      model:
        'Hi Grace, the study is 15.12 m², so it needs 3.02 m² of glazing; the window is only 1.44 m². I propose widening it to 2.4 × 1.35 m (3.24 m²) on the same wall. {name}',
    },
  ],
  outcomes: {
    pass: { reputation: 2, indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Grace', 'Agreed: the wider window is in the next revision.'),
  lapseLog: 'Grace’s daylight question went unanswered.',
  skills: { 'building-design': 30, accuracy: 20 },
  xp: 140,
}

/** Advanced: the fit-out estimate against a client's budget. */
const estimate: CaseInput = {
  id: 'arch-adv-estimate',
  version: 1,
  careerId: CAREER,
  kind: 'client',
  minLevel: 3,
  difficulty: 'advanced',
  title: 'The fit-out estimate',
  summary:
    'Estimate a fit-out from its area, add the contingency, and tell the client honestly.',
  from: at('Rhys Bellamy', 'Operations Manager', undefined, 'Kite & Co Architects'),
  trigger: { afterAssignment: 'arch-proposal' },
  deadlineHours: 4,
  email: {
    subject: 'Our new floor: what will it cost?',
    body: `Hi {name},

Our new floor is 180 m². Your colleague mentioned a typical fit-out rate of £650 per m². Our budget is £120,000. Will it fit?

Rhys`,
  },
  whyItMatters:
    'Clients plan around early estimates. An honest figure with a contingency, and options if it does not fit, builds trust.',
  objectives: [
    'Estimate from a rate',
    'Apply a contingency',
    'Advise honestly with options',
  ],
  steps: [
    {
      id: 'estimate',
      kind: 'figure',
      title: 'Estimate with 10% contingency',
      prompt: 'What is the estimate, including a 10% contingency?',
      points: 40,
      answer: 128700,
      tolerance: 0,
      unit: '£',
      why: '180 × £650 = £117,000; plus 10% = £128,700.',
    },
    {
      id: 'advice',
      kind: 'decide',
      title: 'It is £8,700 over. What do you advise?',
      prompt: 'Your advice?',
      points: 30,
      options: [
        {
          id: 'options',
          label:
            'Say so plainly, and offer savings: reuse their existing desks and phase the meeting room fit-out',
          verdict: 'best',
          why: 'Honest, with practical ways to fit the budget.',
        },
        {
          id: 'drop-contingency',
          label: 'Drop the contingency so it fits',
          verdict: 'poor',
          why: 'Hiding risk to make a number fit comes back as an overspend.',
        },
        {
          id: 'raise',
          label: 'Tell them to raise the budget',
          verdict: 'acceptable',
          why: 'Possible, but give them choices first.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Rhys Bellamy',
      title: 'Reply to Rhys',
      prompt: 'Give Rhys the estimate and your advice.',
      points: 30,
      minWords: 40,
      mentions: [['128,700', '128700'], ['contingency'], ['saving', 'reus', 'phas']],
      avoid: [
        {
          terms: ['no contingency'],
          why: 'A contingency is part of an honest estimate.',
        },
      ],
      model:
        'Hi Rhys, at £650 per m² the fit-out is £117,000, and with a 10% contingency for the unexpected, £128,700: about £8,700 over your budget. We can close the gap by reusing your existing desks and phasing the meeting room fit-out. Shall we price those options? {name}',
    },
  ],
  outcomes: {
    pass: { reputation: 3 },
    fail: { reputation: -2 },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Rhys',
    'Thanks for being straight with us. Please price the options.',
  ),
  lapseLog: 'Rhys Bellamy’s budget question went unanswered.',
  skills: { 'client-briefs': 30, accuracy: 20 },
  xp: 140,
}

export const ARCHITECTURE_CASES: CaseInput[] = [
  clientWall,
  paintOrder,
  requests,
  handover,
  handoverFix,
  designReview,
  blockedExit,
  progLayout,
  progReview,
  teamLead,
  daylight,
  estimate,
]
