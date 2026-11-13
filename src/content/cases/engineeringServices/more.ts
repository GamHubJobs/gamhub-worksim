/**
 * More engineering cases: the design review, a lockout near miss, the depot
 * solar project, leading the team, and two advanced calculations.
 */
import type { CaseInput } from '../schema'
import { replies } from '../incidents/shared'
import { clientChange, handover, handoverFix, requests, steelOrder } from './index'

const FIRM = 'Northbank Engineering Ltd'
const at = (name: string, role: string, personId?: string, organisation = FIRM) => ({
  name,
  role,
  organisation,
  ...(personId ? { personId } : {}),
})

/** Meeting: the design review. */
const designReview: CaseInput = {
  id: 'eng-design-review',
  version: 1,
  careerId: 'engineering-services',
  kind: 'meeting',
  minLevel: 3,
  title: 'The mezzanine design review',
  summary: 'Prepare the design note, hold the line in the review, and send the actions.',
  from: at('Helena Okoye', 'Engineering Manager', 'manager'),
  trigger: { afterAssignment: 'eng-quality' },
  deadlineHours: 4,
  meeting: {
    title: 'Mezzanine design review',
    inHours: 1,
    minutes: 45,
    room: 'Design office meeting room',
  },
  email: {
    subject: 'Design review this afternoon',
    body: `Hi {name},

The client joins us this afternoon to review the mezzanine design. Please prepare a one-page design note in Word Craft (the loads, the beam and the checks), come to the review, and send the actions afterwards.

Helena`,
  },
  whyItMatters:
    'Design reviews catch problems before steel is cut. They work only if the engineer presents clearly, and holds to the checks under pressure.',
  objectives: ['Prepare a design note', 'Keep the independent check', 'Record actions'],
  evidence: [
    {
      id: 'design',
      title: 'The design',
      text: 'Span 6 m, design point load 20 kN at mid-span: M = 30 kN·m. NB-200 gives 158 N/mm² against an allowable 165 N/mm² (96%). The calculation has been checked by Ingrid.',
    },
  ],
  steps: [
    {
      id: 'note',
      kind: 'document',
      phase: 'prepare',
      title: 'Prepare the design note',
      prompt:
        'Write a one-page design note in Word Craft: the loads, the design and the checks.',
      points: 30,
      deliverable: {
        kind: 'doc',
        title: 'Design note: warehouse mezzanine beam',
        template: 'memo',
        checks: [
          {
            id: 'sections',
            type: 'sections',
            title: 'A clear structure',
            sections: [['Loads'], ['Design'], ['Checks']],
            points: 10,
            why: 'Reviewers find what they need quickly.',
            hint: 'Use the headings Loads, Design and Checks.',
          },
          {
            id: 'mentions',
            type: 'mentions',
            title: 'The key facts',
            terms: [['NB-200'], ['30 kN'], ['checked', 'check']],
            points: 10,
            why: 'The section, the moment and the independent check are what the review needs.',
            hint: 'Mention NB-200, the 30 kN·m moment, and the check.',
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
        'The client asks to use NB-150 to save money, “it’s only a bit over”. What do you say?',
      points: 25,
      options: [
        {
          id: 'no',
          label:
            'Explain that NB-150 would be overstressed, so it cannot be used; offer to look at other savings',
          verdict: 'best',
          why: 'Safety is not negotiable, but the client’s goal still gets your help.',
        },
        {
          id: 'yes',
          label: 'Agree: it is only a bit over',
          verdict: 'poor',
          why: 'Overstressed means the design does not meet its safety factor.',
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
        { id: 'helena', name: 'Helena (Engineering Manager)' },
        { id: 'ingrid', name: 'Ingrid (Structural Engineer)' },
        { id: 'tomas', name: 'Tomás (Project Planner)' },
      ],
      items: [
        {
          id: 'issue',
          label: 'Issue the approved drawings to the client',
          owner: 'helena',
          why: 'The manager signs off and issues designs.',
        },
        {
          id: 'connections',
          label: 'Design the beam connections',
          owner: 'ingrid',
          why: 'Connections are structural design work.',
        },
        {
          id: 'programme',
          label: 'Update the programme with the steel delivery date',
          owner: 'tomas',
          why: 'The planner owns the programme.',
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
      mentions: [['Helena'], ['Ingrid'], ['Tomás', 'Tomas'], ['NB-200']],
      model:
        'Hi all, thank you for the review. We confirmed NB-200 (NB-150 would be overstressed). Actions: Helena will issue the approved drawings; Ingrid will design the beam connections; Tomás will update the programme with the steel delivery date. The next review is once the connections are designed. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Helena',
    'You handled the NB-150 question perfectly. The client signed off.',
  ),
  lapseLog: 'The design review went ahead without your design note.',
  skills: { 'design-judgement': 30, 'technical-writing': 20 },
  xp: 110,
}

/** Incident: someone removed another person's lock. */
const lockRemoved: CaseInput = {
  id: 'eng-lock-removed',
  version: 1,
  careerId: 'engineering-services',
  kind: 'incident',
  minLevel: 3,
  title: 'A lock that was cut off',
  summary:
    'Someone cut off another engineer’s lock to restart a machine. Nobody was hurt. What now?',
  from: at('Lucy Wren', 'Apprentice Technician'),
  trigger: { afterAssignment: 'eng-quality' },
  deadlineHours: 2,
  email: {
    subject: 'I saw something I shouldn’t have',
    body: `Hi {name},

The packing line was behind, and a supervisor from production cut Raj’s lock off the conveyor isolator to restart it. Raj was on his break, not in the machine, so nobody was hurt. Everyone is acting like it’s normal. Is it?

Lucy`,
  },
  whyItMatters:
    'Removing someone else’s lock is one of the most dangerous things that can happen on a site: next time, they might be inside the machine. Near misses must be reported, without fear.',
  objectives: [
    'Recognise a serious near miss',
    'Support someone who speaks up',
    'Report through the right route',
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
          id: 'serious',
          text: 'This is a serious near miss, even though nobody was hurt.',
          issue: true,
          why: 'If Raj had been in the machine, it could have killed him.',
        },
        {
          id: 'only-owner',
          text: 'Only the person whose lock it is may remove it (or a formal, supervised procedure if they cannot be found).',
          issue: true,
          why: 'That is the whole point of a personal lock.',
        },
        {
          id: 'blame-lucy',
          text: 'Lucy should keep out of it: she is only an apprentice.',
          issue: false,
          why: 'Everyone has the right and the duty to report unsafe acts.',
        },
        {
          id: 'report',
          text: 'It should be reported to the health and safety manager.',
          issue: true,
          why: 'So the cause (pressure on production) is dealt with.',
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
          id: 'stop-report',
          label:
            'Make sure the conveyor is safe, tell Raj, and report it to Martin (health and safety) today',
          verdict: 'best',
          why: 'Safety first, the person affected informed, and the right route used.',
        },
        {
          id: 'confront',
          label: 'Go and tell the supervisor off',
          verdict: 'acceptable',
          why: 'Understandable, but it needs a proper report so the cause is fixed.',
        },
        {
          id: 'ignore',
          label: 'Leave it: nobody was hurt',
          verdict: 'poor',
          why: 'That is how a near miss becomes a fatality.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Lucy Wren',
      title: 'Reply to Lucy',
      prompt: 'Reply to Lucy: thank her, say it is not normal, and what happens next.',
      points: 40,
      minWords: 35,
      mentions: [
        ['thank'],
        ['not normal', 'not okay', 'never', 'serious'],
        ['Martin', 'report'],
      ],
      model:
        'Lucy, thank you for telling me: you did exactly the right thing. It is not normal. Only the person whose lock it is may remove it, because next time someone could be inside the machine. I have made sure the conveyor is safe, told Raj, and we are reporting it to Martin today. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3, indicators: { risk: -4 } },
    fail: { indicators: { risk: 5 } },
    lapse: { indicators: { risk: 4 } },
  },
  replies: replies(
    'Lucy',
    'Thank you. Martin is running a lockout briefing for production on Monday.',
  ),
  lapseLog: 'Lucy’s report about the removed lock was not acted on.',
  skills: { 'safe-systems-of-work': 35, 'technical-writing': 10 },
  xp: 120,
}

/** Programme: solar panels on the depot roof. */
const solarBrief = {
  id: 'solar',
  title: 'Project brief: the depot solar retrofit',
  text: 'Northbank is fitting solar panels to its own depot roof to cut electricity costs and emissions. The usable roof area is 360 m². Each panel is 2 m² and rated 0.4 kW.\n\nThe structural check, the electrical design and a year’s results follow.',
}

const solarPlan: CaseInput = {
  id: 'prog-eng-solar',
  version: 1,
  careerId: 'engineering-services',
  kind: 'programme',
  projectId: 'solar-retrofit',
  minLevel: 3,
  title: 'Solar retrofit: how big a system?',
  summary:
    'Work out how many panels fit and the system’s size, and what must be checked first.',
  from: at('Helena Okoye', 'Engineering Manager', 'manager'),
  trigger: { afterAssignment: 'eng-quality' },
  deadlineHours: 8,
  email: {
    subject: 'Depot solar: first sizing',
    body: `Hi {name},

Please do a first sizing for the depot solar retrofit: how many panels fit, and how big is the system? And what must we check before we fit anything?

Helena`,
  },
  whyItMatters:
    'Good projects start with a sound sizing and the right checks: a roof that cannot carry the panels is an expensive surprise.',
  objectives: ['Size a system from its constraints', 'Identify the checks needed first'],
  evidence: [solarBrief],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'What must be checked first?',
      prompt: 'Tick every statement that is true.',
      points: 35,
      findings: [
        {
          id: 'roof',
          text: 'The roof structure must be checked for the panels’ weight and wind.',
          issue: true,
          why: 'Panels add load and wind uplift.',
        },
        {
          id: 'skip',
          text: 'Small systems never need an electrical design.',
          issue: false,
          why: 'Every connection to the supply needs a proper design.',
        },
        {
          id: 'access',
          text: 'Safe access for installation and maintenance must be planned.',
          issue: true,
          why: 'Working at height is one of the biggest risks.',
        },
      ],
    },
    {
      id: 'size',
      kind: 'figure',
      title: 'System size',
      prompt: 'How many kW is a system using the whole usable area?',
      points: 35,
      answer: 72,
      tolerance: 0.1,
      unit: 'kW',
      why: '360 m² ÷ 2 m² = 180 panels × 0.4 kW = 72 kW.',
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Helena Okoye',
      title: 'Reply to Helena',
      prompt: 'Send the sizing and the checks needed first.',
      points: 30,
      minWords: 35,
      mentions: [['180'], ['72'], ['roof', 'structur']],
      model:
        'Hi Helena, the usable 360 m² fits 180 panels, a 72 kW system. Before fitting anything we need a structural check of the roof for the extra weight and wind uplift, an electrical design for the connection, and a plan for safe access. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -2 },
  },
  replies: replies('Helena', 'Good first sizing. Ingrid will check the roof.'),
  lapseLog: 'The solar sizing was not done.',
  skills: { 'engineering-analysis': 25, 'design-judgement': 20 },
  xp: 140,
}

const solarReview: CaseInput = {
  id: 'prog-eng-solar-review',
  version: 1,
  careerId: 'engineering-services',
  kind: 'programme',
  projectId: 'solar-retrofit',
  minLevel: 3,
  title: 'Solar retrofit: the first year',
  summary: 'Review a year of results and advise the directors.',
  from: at('Helena Okoye', 'Engineering Manager', 'manager'),
  trigger: { afterCase: 'prog-eng-solar' },
  deadlineHours: 8,
  email: {
    subject: 'Solar: the first year',
    body: `Hi {name},

The panels have run for a year. The directors want to know whether to fit solar at our second depot. Results attached.

Helena`,
  },
  whyItMatters:
    'Reviewing a project against its targets, honestly, is how engineering teams learn.',
  objectives: ['Weigh results against targets', 'Recommend with conditions'],
  evidence: [
    solarBrief,
    {
      id: 'results',
      title: 'The first year',
      text: 'The system made 61,000 kWh against a target of 65,000 kWh (shading from a new building next door cost about 5%). It saved £12,200 and cut emissions by about 13 tonnes of CO₂. One inverter failed in month 4 and was replaced under warranty.',
    },
  ],
  steps: [
    {
      id: 'decide',
      kind: 'decide',
      title: 'Your advice',
      prompt: 'What do you advise?',
      points: 50,
      options: [
        {
          id: 'conditions',
          label:
            'Fit solar at the second depot, with a shading survey first and monitoring to catch faults early',
          verdict: 'best',
          why: 'Keeps the benefit and fixes what the first year showed.',
        },
        {
          id: 'as-is',
          label: 'Copy the first depot exactly',
          verdict: 'acceptable',
          why: 'Mostly worked, but ignores the shading and the fault.',
        },
        {
          id: 'stop',
          label: 'Don’t: it missed its target',
          verdict: 'poor',
          why: 'It came within 6% and the cause is known.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'the directors',
      title: 'Write to the directors',
      prompt: 'Write the recommendation: results, problems and conditions.',
      points: 50,
      minWords: 45,
      mentions: [['61,000', '61000'], ['shading'], ['monitor']],
      model:
        'We recommend solar for the second depot. The first system made 61,000 kWh against 65,000 (shading from a new building cost about 5%), saved £12,200 and about 13 tonnes of CO₂. For the second depot we should do a shading survey first, and monitor the inverters so faults are caught early. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 4 },
    fail: { reputation: -1 },
    lapse: { reputation: -2 },
  },
  replies: replies('Helena', 'The directors approved the second depot.'),
  lapseLog: 'The solar review never reached the directors.',
  skills: { 'design-judgement': 20, 'technical-writing': 20 },
  xp: 120,
}

/** Leadership: leading the shutdown team. */
const teamLead: CaseInput = {
  id: 'eng-team-lead',
  version: 1,
  careerId: 'engineering-services',
  kind: 'leadership',
  minLevel: 4,
  title: 'Leading the weekend shutdown',
  summary:
    'Plan the shutdown work, check a colleague’s calculation, and settle an overtime dispute.',
  from: at('Helena Okoye', 'Engineering Manager', 'manager'),
  trigger: { afterAssignment: 'eng-quality' },
  deadlineHours: 3,
  email: {
    subject: 'You’re leading the shutdown',
    body: `Hi {name},

The depot shuts down this weekend for maintenance. Please lead it: plan who does what, check Kofi’s cable calculation, and sort out the overtime disagreement.

Helena`,
  },
  whyItMatters:
    'Leading engineering work means the right person on each job, calculations checked before they are used, and fair decisions.',
  objectives: ['Delegate by skill', 'Check a calculation', 'Give clear feedback'],
  evidence: [
    {
      id: 'calc',
      title: 'Kofi’s calculation',
      text: '“Current 40 A, cable run 50 m, resistance 0.5 mΩ per metre: voltage drop = 40 × 50 × 0.0005 = 1 V.” (He used one length of cable, but current flows out and back: the drop is over twice the length.)',
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
          id: 'kofi',
          name: 'Kofi',
          strengths: 'Electrical; careful, new to the site',
          capacity: 2,
        },
        {
          id: 'raj',
          name: 'Raj',
          strengths: 'Mechanical; experienced with conveyors',
          capacity: 2,
        },
        {
          id: 'lucy',
          name: 'Lucy',
          strengths: 'Apprentice; learning, needs supervision',
          capacity: 1,
        },
      ],
      items: [
        {
          id: 'panel',
          label: 'Test the main distribution panel',
          best: ['kofi'],
          why: 'Electrical work for the electrical engineer.',
        },
        {
          id: 'gearbox',
          label: 'Change the conveyor gearbox oil',
          best: ['raj'],
          why: 'Raj knows the conveyors.',
        },
        {
          id: 'assist',
          label: 'Assist with the gearbox, under supervision',
          best: ['lucy'],
          why: 'Good supervised learning for the apprentice.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Check Kofi’s calculation',
      prompt: 'Which problems does it have?',
      points: 30,
      findings: [
        {
          id: 'length',
          text: 'It uses one length of cable instead of the out-and-back length',
          issue: true,
          why: 'The current flows through both conductors: 2 × 50 m.',
        },
        {
          id: 'answer',
          text: 'The real voltage drop is 2 V',
          issue: true,
          why: '40 × 100 × 0.0005 = 2 V.',
        },
        {
          id: 'units',
          text: 'The resistance is in the wrong units',
          issue: false,
          why: '0.5 mΩ = 0.0005 Ω: correct.',
        },
      ],
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'Overtime',
      prompt:
        'Raj and Kofi both want the Sunday overtime; only one is needed. Raj has had it the last three times; there is a rota.',
      points: 20,
      options: [
        {
          id: 'rota',
          label: 'Follow the rota: Kofi this time, and tell both why',
          verdict: 'best',
          why: 'Fair, transparent and consistent.',
        },
        {
          id: 'raj',
          label: 'Raj: he is more experienced',
          verdict: 'poor',
          why: 'Ignores the rota and is unfair to Kofi.',
        },
        {
          id: 'both',
          label: 'Give it to both',
          verdict: 'acceptable',
          why: 'Avoids the argument but spends money not needed.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Kofi',
      title: 'Feedback for Kofi',
      prompt: 'Write Kofi kind, clear feedback on the calculation.',
      points: 20,
      minWords: 40,
      mentions: [['twice', 'out and back', '2 ×', 'two'], ['2 V'], ['check']],
      avoid: [
        { terms: ['careless', 'useless'], why: 'Feedback should help him improve.' },
      ],
      model:
        'Hi Kofi, thanks for the calculation: the method and units are right. One correction: the current flows out and back, so use twice the cable length. That gives 40 × 100 × 0.0005 = 2 V. It is a common slip; a quick check against a rough estimate catches it. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3, senior: 2 }, reputation: 4 },
    fail: { indicators: { risk: 3 } },
    lapse: { reputation: -2 },
  },
  replies: replies('Helena', 'A safe, well-run shutdown. Thank you.'),
  lapseLog: 'The shutdown started without a plan.',
  skills: {
    'engineering-analysis': 25,
    'safe-systems-of-work': 20,
    'technical-writing': 10,
  },
  xp: 150,
}

/** Advanced: voltage drop on a long cable. */
const voltageDrop: CaseInput = {
  id: 'eng-adv-voltage-drop',
  version: 1,
  careerId: 'engineering-services',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'Is the cable big enough?',
  summary: 'Work out the voltage drop on a long cable run to the new workshop.',
  from: at('Kofi Mensah', 'Electrical Engineer'),
  trigger: { afterAssignment: 'eng-quality' },
  deadlineHours: 6,
  email: {
    subject: 'Cable to the new workshop',
    body: `Hi {name},

Can you check the cable for the new workshop? Details below. Our rule (simplified) is that the drop must be no more than 5% of the 230 V supply.

Kofi`,
  },
  whyItMatters:
    'Too small a cable means too much voltage drop: equipment runs badly and the cable runs hot.',
  objectives: ['Calculate a voltage drop', 'Compare it with a limit'],
  evidence: [
    {
      id: 'cable',
      title: 'The cable run',
      table: {
        head: ['', 'Value'],
        rows: [
          ['Current', '32 A'],
          ['Length (one way)', '60 m'],
          ['Resistance per metre (each conductor)', '0.003 Ω'],
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
          id: 'both',
          text: 'The current flows out and back, so the length is doubled.',
          issue: true,
          why: 'Both conductors carry the current.',
        },
        {
          id: 'limit',
          text: 'The limit is 5% of 230 V, which is 11.5 V.',
          issue: true,
          why: '0.05 × 230 = 11.5 V.',
        },
        {
          id: 'heat',
          text: 'Voltage drop does not matter if the equipment still starts.',
          issue: false,
          why: 'It still wastes power and heats the cable.',
        },
      ],
    },
    {
      id: 'drop',
      kind: 'figure',
      title: 'The voltage drop',
      prompt: 'What is the voltage drop, in volts?',
      points: 25,
      answer: 11.52,
      tolerance: 0.01,
      unit: 'V',
      why: '32 A × (2 × 60 m) × 0.003 Ω/m = 11.52 V.',
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you recommend?',
      prompt: 'The drop is just over the 11.5 V limit. What do you recommend?',
      points: 25,
      options: [
        {
          id: 'bigger',
          label: 'Use the next size of cable up',
          verdict: 'best',
          why: 'It is over the limit; a larger cable brings it within.',
        },
        {
          id: 'close',
          label: 'Accept it: it’s only 0.02 V over',
          verdict: 'poor',
          why: 'A limit is a limit; and real conditions are often worse.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Kofi Mensah',
      title: 'Reply to Kofi',
      prompt: 'Reply with the drop and your recommendation.',
      points: 25,
      minWords: 35,
      mentions: [['11.52'], ['11.5'], ['larger', 'bigger', 'next size']],
      model:
        'Hi Kofi, the drop is 32 × 120 × 0.003 = 11.52 V, just over our 5% limit of 11.5 V. I recommend the next size of cable up, which brings it comfortably within the limit. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3 },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Kofi', 'Agreed: next size up. Thanks.'),
  lapseLog: 'The workshop cable was not checked.',
  skills: { 'engineering-analysis': 30, 'design-judgement': 20 },
  xp: 140,
}

/** Advanced: monthly emissions against the permit. */
const emissions: CaseInput = {
  id: 'eng-adv-emissions',
  version: 1,
  careerId: 'engineering-services',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'The boiler’s monthly average',
  summary:
    'Work out the boiler’s monthly average emissions against the permit, and what to do.',
  from: at('Dr Niamh Byrne', 'Environmental Engineer'),
  trigger: { afterAssignment: 'eng-quality' },
  deadlineHours: 6,
  email: {
    subject: 'Boiler NOx: the monthly average',
    body: `Hi {name},

Our permit limits the boiler stack’s nitrogen oxides to a monthly average of 200 mg/m³ (fictional limit). Here are this month’s four weekly results. Where do we stand?

Niamh`,
  },
  whyItMatters:
    'Permits are often set as averages: one high week may be fine, but the average must be calculated and reported honestly.',
  objectives: ['Calculate an average against a limit', 'Recommend proportionate action'],
  evidence: [
    {
      id: 'results',
      title: 'Weekly results (mg/m³)',
      table: {
        head: ['Week', 'NOx'],
        rows: [
          ['1', '180'],
          ['2', '210'],
          ['3', '195'],
          ['4', '199'],
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
          id: 'week2',
          text: 'Week 2 alone is above 200, but the limit is a monthly average.',
          issue: true,
          why: 'The permit is set on the average.',
        },
        {
          id: 'hide',
          text: 'Week 2 could be left out as unusual.',
          issue: false,
          why: 'Leaving out results is falsifying the record.',
        },
        {
          id: 'trend',
          text: 'Results close to the limit are worth investigating.',
          issue: true,
          why: 'A small change could tip it over.',
        },
      ],
    },
    {
      id: 'average',
      kind: 'figure',
      title: 'The monthly average',
      prompt: 'What is the monthly average NOx, in mg/m³?',
      points: 25,
      answer: 196,
      tolerance: 0.1,
      unit: 'mg/m³',
      why: '(180 + 210 + 195 + 199) ÷ 4 = 196.',
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you recommend?',
      prompt: 'Your recommendation?',
      points: 25,
      options: [
        {
          id: 'tune',
          label:
            'Report the average (within the limit) and have the burner tuned, as it is close',
          verdict: 'best',
          why: 'Honest reporting, and acting before it exceeds.',
        },
        {
          id: 'nothing',
          label: 'Nothing: it is within the limit',
          verdict: 'acceptable',
          why: 'True, but it is close and week 2 was high.',
        },
        {
          id: 'drop',
          label: 'Report only weeks 1, 3 and 4',
          verdict: 'poor',
          why: 'That is falsifying the record.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Dr Niamh Byrne',
      title: 'Reply to Niamh',
      prompt: 'Reply with the average and your recommendation.',
      points: 25,
      minWords: 35,
      mentions: [['196'], ['200'], ['tun', 'burner', 'service']],
      model:
        'Hi Niamh, the monthly average is 196 mg/m³, within the 200 limit, though week 2 was 210. As we are close to the limit, I suggest we report the full results and have the burner tuned this month. {name}',
    },
  ],
  outcomes: {
    pass: { reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Niamh', 'Agreed. The burner engineer comes on Thursday.'),
  lapseLog: 'The boiler emissions were not reviewed.',
  skills: { 'quality-control': 30, accuracy: 20 },
  xp: 140,
}

export const ENGINEERING_CASES: CaseInput[] = [
  clientChange,
  steelOrder,
  requests,
  handover,
  handoverFix,
  designReview,
  lockRemoved,
  solarPlan,
  solarReview,
  teamLead,
  voltageDrop,
  emissions,
]
