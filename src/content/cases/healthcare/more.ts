/**
 * More healthcare cases: a stock count, the hand-off follow-up, the safety
 * huddle, two audits and the discharge lounge project. Fictional people and
 * numbers, for learning; not medical advice.
 */
import type { CaseInput } from '../schema'
import { replies } from '../incidents/shared'

const HOSPITAL = 'Riverside Community Hospital'
const ward = (name: string, role: string, personId?: string) => ({
  name,
  role,
  organisation: HOSPITAL,
  ...(personId ? { personId } : {}),
})

/** Foundation: counting dressings against the order. */
const suppliesCount: CaseInput = {
  id: 'hc-supplies-count',
  version: 1,
  careerId: 'healthcare',
  kind: 'internal',
  minLevel: 1,
  title: 'The dressings cupboard doesn’t add up',
  summary: 'Count what was delivered against the order before signing for it.',
  from: ward('Dev Kapoor', 'Estates and Housekeeping Supervisor', 'facilities'),
  trigger: { afterAssignment: 'ward-observations' },
  deadlineHours: 3,
  email: {
    subject: 'Sign for the dressings delivery?',
    body: `Hi {name},

The supplies delivery for Ward 4 is in the treatment room. Could you check it against the order and sign for it? The delivery note is attached.

Dev`,
  },
  whyItMatters:
    'Running out of dressings mid-shift delays care. Checking a delivery before signing means shortages are caught while they can still be put right.',
  objectives: ['Check a delivery against the order', 'Report a shortage clearly'],
  evidence: [
    {
      id: 'order',
      title: 'Order and delivery: foam dressings 10 × 10 cm',
      table: {
        head: ['', 'Boxes', 'Dressings per box'],
        rows: [
          ['Ordered', '12', '10'],
          ['Delivered', '9', '10'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'short',
      kind: 'figure',
      title: 'How many dressings are missing?',
      prompt: 'How many dressings (not boxes) were ordered but not delivered?',
      points: 40,
      answer: 30,
      tolerance: 0,
      unit: 'dressings',
      why: '3 boxes are missing, and each holds 10 dressings: 30 dressings.',
    },
    {
      id: 'sign',
      kind: 'decide',
      title: 'Signing for it',
      prompt: 'What do you do with the delivery note?',
      points: 30,
      options: [
        {
          id: 'note',
          label:
            'Sign for what actually arrived, write the shortage on the note, and tell Dev',
          verdict: 'best',
          why: 'The record matches reality, and the missing boxes can be chased.',
        },
        {
          id: 'sign-all',
          label: 'Sign for the full order; the rest will come',
          verdict: 'poor',
          why: 'Signing for goods that did not arrive means nobody will chase them.',
          effects: { indicators: { risk: 2 } },
        },
        {
          id: 'refuse',
          label: 'Refuse the whole delivery',
          verdict: 'acceptable',
          why: 'Safe, but the ward then has no dressings at all: accept what came and report the rest.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Dev Kapoor',
      title: 'Tell Dev',
      prompt: 'Tell Dev what arrived and what is missing.',
      points: 30,
      minWords: 25,
      mentions: [['30'], ['3 boxes', 'three boxes', '9 boxes', 'nine boxes']],
      model:
        'Hi Dev, the foam dressings delivery was short: 9 boxes arrived instead of 12, so 3 boxes (30 dressings) are missing. I have signed for the 9 and written the shortage on the note. Could you chase the rest? Thanks, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 }, indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Dev', 'Thanks: the missing boxes arrived this afternoon.'),
  lapseLog: 'The dressings delivery sat unchecked in the treatment room.',
  skills: { accuracy: 30, 'patient-safety': 10 },
  xp: 70,
}

/** Workflow follow-up: when the transfer handover was wrong. */
const transferFix: CaseInput = {
  id: 'hc-transfer-handover-fix',
  version: 1,
  careerId: 'healthcare',
  kind: 'workflow',
  minLevel: 2,
  title: 'Ward 6 calls about Margaret’s handover',
  summary: 'Ward 6 found a mistake in the transfer handover. Put it right.',
  from: ward('Ward 6 nurse in charge', 'Charge Nurse'),
  trigger: {
    afterCase: 'hc-transfer-handover',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 1,
  email: {
    subject: 'Margaret Okafor’s handover',
    body: `Hi,

Something in Margaret Okafor’s handover from you didn’t match her record when we checked it against her wristband and chart. We nearly planned her care on the wrong information. Can you check and confirm?

Ward 6`,
  },
  whyItMatters:
    'Mistakes in handovers are common; what matters is fixing them quickly, honestly, and making sure the receiving team has the right information.',
  objectives: ['Own a mistake', 'Correct the information quickly'],
  steps: [
    {
      id: 'response',
      kind: 'decide',
      title: 'What do you do?',
      prompt: 'How do you respond?',
      points: 50,
      options: [
        {
          id: 'own',
          label: 'Apologise, check the record, and phone the correct details through now',
          verdict: 'best',
          why: 'Fast, honest correction is what keeps the patient safe.',
        },
        {
          id: 'defend',
          label: 'Say the form was right when you filled it in',
          verdict: 'poor',
          why: 'Defending a mistake delays the correction.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Ward 6',
      title: 'Correct the handover',
      prompt: 'Write the correction: the right details, and an apology.',
      points: 50,
      minWords: 25,
      mentions: [['sorry', 'apolog'], ['Penicillin'], ['16:00', '4pm', '4 pm']],
      model:
        'Sorry, the handover had a mistake. The correct details: Margaret Okafor, RCH-104233, allergic to penicillins, falls risk, latest score 3, next Cefralin dose due at 16:00. Thank you for checking. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { senior: 1 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { risk: 2 } },
  },
  replies: replies('Ward 6', 'Thanks for the quick correction: all good now.'),
  lapseLog: 'Ward 6’s question about Margaret’s handover went unanswered.',
  skills: { 'clinical-documentation': 20, 'patient-safety': 10 },
  xp: 45,
}

/** Meeting: the ward safety huddle. */
const safetyHuddle: CaseInput = {
  id: 'hc-safety-huddle',
  version: 1,
  careerId: 'healthcare',
  kind: 'meeting',
  minLevel: 3,
  title: 'The ward safety huddle',
  summary: 'Prepare the falls summary, take part in the huddle, and record the actions.',
  from: ward('Grace Mbeki', 'Ward Manager', 'manager'),
  trigger: { afterAssignment: 'ward-beds' },
  deadlineHours: 4,
  meeting: {
    title: 'Ward 4 safety huddle',
    inHours: 1,
    minutes: 30,
    room: 'Ward 4 day room',
  },
  email: {
    subject: 'Safety huddle: falls this month',
    body: `Hi {name},

We had three falls on the ward this month. Please prepare a one-page summary for the safety huddle (in Word Craft), come to the huddle, and afterwards send round the actions.

Grace`,
  },
  whyItMatters:
    'Safety huddles turn incidents into learning. A short, factual summary and clear actions with owners are what make the next month safer.',
  objectives: [
    'Summarise incidents factually',
    'Agree actions with owners',
    'Follow up after the meeting',
  ],
  evidence: [
    {
      id: 'falls',
      title: 'Falls on Ward 4 this month',
      table: {
        head: ['Date', 'Time', 'Where', 'Patient’s risk recorded?', 'Harm'],
        rows: [
          ['3rd', '02:10', 'Walking to the toilet', 'Yes', 'None'],
          ['11th', '03:40', 'Getting out of bed', 'No', 'Bruised hip'],
          ['24th', '01:55', 'Walking to the toilet', 'Yes', 'None'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'summary',
      kind: 'document',
      phase: 'prepare',
      title: 'Prepare the falls summary',
      prompt:
        'Write a one-page summary in Word Craft: what happened, the pattern, and suggestions.',
      points: 30,
      deliverable: {
        kind: 'doc',
        title: 'Falls on Ward 4: monthly summary',
        template: 'memo',
        checks: [
          {
            id: 'sections',
            type: 'sections',
            title: 'Clear sections',
            sections: [['What happened'], ['Pattern'], ['Suggestions']],
            points: 10,
            why: 'The huddle is short: a clear structure lets everyone follow.',
            hint: 'Use the headings What happened, Pattern and Suggestions.',
          },
          {
            id: 'terms',
            type: 'mentions',
            title: 'The pattern named',
            terms: [['night'], ['toilet']],
            points: 10,
            why: 'All three falls were at night, two on the way to the toilet: that is the pattern to act on.',
            hint: 'Say when and where the falls happened.',
          },
          {
            id: 'length',
            type: 'length',
            title: 'A sensible length',
            min: 80,
            max: 500,
            points: 10,
            why: 'One page: enough to explain, short enough to read in the huddle.',
            hint: 'Between 80 and 500 words.',
          },
        ],
      },
    },
    {
      id: 'in-room',
      kind: 'decide',
      phase: 'meeting',
      title: 'In the huddle',
      prompt:
        'Someone says “falls happen, there’s nothing we can do at night.” What do you say?',
      points: 25,
      options: [
        {
          id: 'pattern',
          label:
            'Point out the pattern (night, toilet trips) and suggest offering help to the toilet on the night rounds',
          verdict: 'best',
          why: 'Evidence and a practical step: that is how huddles reduce harm.',
        },
        {
          id: 'agree',
          label: 'Agree and move on',
          verdict: 'poor',
          why: 'Most falls have patterns that can be acted on.',
        },
        {
          id: 'blame',
          label: 'Say the night staff should watch patients more closely',
          verdict: 'acceptable',
          why: 'Closer to the point, but blaming a team rarely changes practice; a specific step does.',
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
        { id: 'grace', name: 'Grace (Ward Manager)' },
        { id: 'owen', name: 'Owen (Senior Staff Nurse)' },
        { id: 'dev', name: 'Dev (Estates)' },
      ],
      items: [
        {
          id: 'rounds',
          label: 'Add “offer help to the toilet” to the night rounds',
          owner: 'owen',
          why: 'Owen leads the nursing practice on the ward.',
        },
        {
          id: 'lights',
          label: 'Fit night lights in the bays and bathrooms',
          owner: 'dev',
          why: 'Estates fit fixtures.',
        },
        {
          id: 'risk',
          label: 'Check every patient has a falls risk recorded on admission',
          owner: 'grace',
          why: 'The ward manager owns the admission standards and audits.',
        },
      ],
    },
    {
      id: 'follow-up',
      kind: 'reply',
      phase: 'after',
      to: 'the Ward 4 team',
      title: 'Send round the actions',
      prompt: 'Write the follow-up message with the actions and owners.',
      points: 20,
      minWords: 40,
      mentions: [['Owen'], ['Dev'], ['Grace'], ['night']],
      model:
        'Hi all, thank you for the huddle. Actions: Owen will add “offer help to the toilet” to the night rounds; Dev will fit night lights in the bays and bathrooms; Grace will check every patient has a falls risk recorded on admission. We will review the falls figures at next month’s huddle. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2, senior: 2 }, reputation: 3, indicators: { risk: -3 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -2 },
  },
  replies: replies('Grace', 'A really useful huddle. The night lights go in on Monday.'),
  lapseLog: 'The safety huddle went ahead without the falls summary.',
  skills: { 'patient-safety': 30, 'clinical-documentation': 20 },
  xp: 110,
}

/** Advanced: auditing hand hygiene. */
const hygieneAudit: CaseInput = {
  id: 'hc-adv-hygiene-audit',
  version: 1,
  careerId: 'healthcare',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'The hand hygiene audit',
  summary: 'Work out the ward’s hand hygiene compliance and decide what to do about it.',
  from: ward('Kwame Asante', 'Learning and Development Lead', 'hr'),
  trigger: { afterAssignment: 'ward-beds' },
  deadlineHours: 6,
  email: {
    subject: 'Hand hygiene audit results',
    body: `Hi {name},

Here are this month’s hand hygiene observations for Ward 4. Can you work out our compliance, and tell me what you think we should do?

Kwame`,
  },
  whyItMatters:
    'Clean hands are the single most effective way to stop infections spreading in hospital. Audits only help if the numbers are right and lead to action.',
  objectives: ['Calculate a compliance rate', 'Recommend a proportionate response'],
  evidence: [
    {
      id: 'audit',
      title: 'Observed opportunities for hand hygiene',
      table: {
        head: ['Moment', 'Observed', 'Hands cleaned'],
        rows: [
          ['Before touching a patient', '40', '34'],
          ['After touching a patient', '40', '38'],
          ['After touching surroundings', '20', '12'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'What the audit shows',
      prompt: 'Tick every statement that is true.',
      points: 25,
      findings: [
        {
          id: 'surroundings',
          text: 'The weakest moment is after touching a patient’s surroundings.',
          issue: true,
          why: '12 of 20 is the lowest rate.',
        },
        {
          id: 'perfect',
          text: 'The ward is fully compliant.',
          issue: false,
          why: 'Several opportunities were missed.',
        },
        {
          id: 'sample',
          text: 'A month of observations is a sample, not every moment.',
          issue: true,
          why: 'Audits observe a sample; the real rate may differ.',
        },
      ],
    },
    {
      id: 'rate',
      kind: 'figure',
      title: 'Overall compliance',
      prompt: 'What is the overall compliance, as a percentage?',
      points: 25,
      answer: 84,
      tolerance: 0.5,
      unit: '%',
      why: '84 of 100 opportunities: 84%.',
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you recommend?',
      prompt: 'Choose your recommendation.',
      points: 25,
      options: [
        {
          id: 'target',
          label:
            'Share the results with the team, focus on cleaning hands after touching surroundings, and re-audit next month',
          verdict: 'best',
          why: 'Targets the weakest moment and checks whether it worked.',
        },
        {
          id: 'discipline',
          label: 'Find out who missed and discipline them',
          verdict: 'poor',
          why: 'Audits are anonymous and for learning; blame stops people being honest.',
        },
        {
          id: 'nothing',
          label: 'Nothing: 84% is good enough',
          verdict: 'poor',
          why: 'Every missed moment is a chance to spread infection.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Kwame Asante',
      title: 'Reply to Kwame',
      prompt: 'Reply with the compliance rate and what you recommend.',
      points: 25,
      minWords: 40,
      mentions: [['84'], ['surroundings'], ['re-audit', 'audit again', 'next month']],
      model:
        'Hi Kwame, our overall compliance this month is 84% (84 of 100 observed opportunities). The weakest moment is after touching a patient’s surroundings (12 of 20). I suggest we share the results at the huddle, focus on that moment with reminders at the bed spaces, and re-audit next month. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3, indicators: { risk: -3 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -1 },
  },
  replies: replies(
    'Kwame',
    'Clear and practical, thank you. I’ll bring posters for the bed spaces.',
  ),
  lapseLog: 'The hand hygiene audit results were not reviewed.',
  skills: { 'patient-safety': 30, accuracy: 20 },
  xp: 140,
}

/** Advanced: missed clinic appointments. */
const clinicDna: CaseInput = {
  id: 'hc-adv-clinic-dna',
  version: 1,
  careerId: 'healthcare',
  kind: 'internal',
  difficulty: 'advanced',
  minLevel: 3,
  title: 'Patients who don’t attend',
  summary:
    'Work out the diabetes clinic’s “did not attend” rate and what might bring it down.',
  from: ward('Rosa Lindqvist', 'Ward Clerk', 'reception'),
  trigger: { afterAssignment: 'ward-beds' },
  deadlineHours: 6,
  email: {
    subject: 'Diabetes clinic: so many empty slots',
    body: `Hi {name},

Dr Ito says the diabetes clinic keeps having empty slots. Here are last month’s figures. What’s our “did not attend” rate, and what could we do about it?

Rosa`,
  },
  whyItMatters:
    'Every missed appointment is a patient not seen and a slot another patient could have had. Understanding why patients miss appointments is the first step to fewer of them.',
  objectives: ['Calculate a rate correctly', 'Recommend a fair, practical change'],
  evidence: [
    {
      id: 'figures',
      title: 'Diabetes clinic, last month',
      table: {
        head: ['Outcome', 'Appointments'],
        rows: [
          ['Seen', '150'],
          ['Cancelled by the patient in advance', '20'],
          ['Did not attend', '30'],
        ],
      },
    },
    {
      id: 'reasons',
      title: 'Reasons given when patients were phoned',
      text: 'Most said they forgot or did not receive the letter. A few could not get time off work for morning appointments.',
    },
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'Reading the figures',
      prompt: 'Tick every statement that is true.',
      points: 25,
      findings: [
        {
          id: 'cancel',
          text: 'Patients who cancelled in advance are not “did not attend”.',
          issue: true,
          why: 'They told us, so the slot could be reused.',
        },
        {
          id: 'careless',
          text: 'Patients who miss appointments do not care about their health.',
          issue: false,
          why: 'The reasons show forgetting, letters and work: things we can help with.',
        },
        {
          id: 'reminders',
          text: 'Reminders would address the most common reason.',
          issue: true,
          why: 'Most patients forgot or did not get the letter.',
        },
      ],
    },
    {
      id: 'rate',
      kind: 'figure',
      title: 'The “did not attend” rate',
      prompt:
        'What percentage of booked appointments (seen plus did not attend) were missed?',
      points: 25,
      answer: 16.7,
      tolerance: 0.2,
      unit: '%',
      why: '30 missed out of 180 (150 seen + 30 missed): 16.7%. Cancellations are not counted.',
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you suggest?',
      prompt: 'Choose your suggestion.',
      points: 25,
      options: [
        {
          id: 'reminders',
          label:
            'Text reminders two days before, and some later appointments for people who work',
          verdict: 'best',
          why: 'It addresses the reasons patients actually gave.',
        },
        {
          id: 'discharge',
          label: 'Discharge anyone who misses an appointment',
          verdict: 'poor',
          why: 'It punishes patients for problems the clinic could help with, and they still need care.',
        },
        {
          id: 'overbook',
          label: 'Book two patients into every slot',
          verdict: 'acceptable',
          why: 'It fills slots but causes long waits when everyone comes; tackle the reasons first.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Rosa Lindqvist',
      title: 'Reply to Rosa',
      prompt: 'Reply with the rate and your suggestion.',
      points: 25,
      minWords: 40,
      mentions: [['16.7'], ['remind'], ['later', 'evening', 'afternoon']],
      model:
        'Hi Rosa, last month 30 of 180 booked appointments were missed: a “did not attend” rate of 16.7% (cancellations aren’t counted, as those patients told us). Most patients said they forgot or never got the letter, and some can’t get time off in the morning. I suggest text reminders two days before, and a few later appointments. {name}',
    },
  ],
  outcomes: {
    pass: { reputation: 3, indicators: { satisfaction: 3 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { reputation: -1 },
  },
  replies: replies('Rosa', 'Dr Ito loved it: reminders start next month.'),
  lapseLog: 'The diabetes clinic figures were not looked at.',
  skills: { accuracy: 25, 'customer-service': 25 },
  xp: 140,
}

// ---------------------------------------------------------------------------
// The discharge lounge project (the hospital's own programme)
// ---------------------------------------------------------------------------

const lounge = {
  id: 'lounge',
  title: 'Project brief: the discharge lounge',
  text: 'Riverside is opening a discharge lounge: a comfortable room where patients who are well enough to go home wait for their transport and medicines, freeing their ward bed earlier.\n\nEach ward sends patients from 10:00. Ward 4 is the first ward to use it, for four weeks.',
}

const loungeCase: CaseInput = {
  id: 'prog-hc-lounge',
  version: 1,
  careerId: 'healthcare',
  kind: 'programme',
  projectId: 'discharge-lounge',
  minLevel: 3,
  title: 'Discharge lounge: which patients can go?',
  summary:
    'Decide which of today’s discharges are suitable for the lounge, and how many beds it frees.',
  from: ward('Grace Mbeki', 'Ward Manager', 'manager'),
  trigger: { afterAssignment: 'ward-beds' },
  deadlineHours: 8,
  email: {
    subject: 'Discharge lounge: our first day',
    body: `Hi {name},

Tomorrow is our first day using the new discharge lounge. Here are tomorrow’s planned discharges: which patients are suitable, and how many beds will we free by 10:00?

Grace`,
  },
  whyItMatters:
    'Freeing beds earlier lets patients waiting in the Emergency Department come up sooner, but only patients who are safe to wait without ward care should go to the lounge.',
  objectives: ['Apply the lounge’s safety criteria', 'Work out the effect on beds'],
  evidence: [
    lounge,
    {
      id: 'criteria',
      title: 'Lounge criteria',
      text: 'Patients must be able to sit in a chair, need no drip or oxygen, and have a signed discharge summary.',
    },
    {
      id: 'discharges',
      title: 'Tomorrow’s planned discharges',
      table: {
        head: ['Patient', 'Can sit in a chair', 'Drip or oxygen', 'Summary signed'],
        rows: [
          ['Bed 4A-2', 'Yes', 'No', 'Yes'],
          ['Bed 4A-5', 'Yes', 'Oxygen', 'Yes'],
          ['Bed 4B-1', 'Yes', 'No', 'Yes'],
          ['Bed 4B-3', 'No (bed-bound)', 'No', 'Yes'],
          ['Bed 4B-4', 'Yes', 'No', 'Yes'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'review',
      kind: 'review',
      title: 'Who is suitable?',
      prompt: 'Tick every statement that is true.',
      points: 35,
      findings: [
        {
          id: '4a5',
          text: 'The patient in 4A-5 should not go to the lounge.',
          issue: true,
          why: 'They need oxygen.',
        },
        {
          id: '4b3',
          text: 'The patient in 4B-3 can go to the lounge on a trolley.',
          issue: false,
          why: 'The criteria need patients who can sit in a chair.',
        },
        {
          id: '4a2',
          text: 'The patient in 4A-2 meets every criterion.',
          issue: true,
          why: 'Can sit, no drip or oxygen, summary signed.',
        },
      ],
    },
    {
      id: 'beds',
      kind: 'figure',
      title: 'Beds freed by 10:00',
      prompt: 'How many beds will the lounge free by 10:00?',
      points: 35,
      answer: 3,
      tolerance: 0,
      unit: 'beds',
      why: '4A-2, 4B-1 and 4B-4 meet the criteria: 3 beds.',
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Grace Mbeki',
      title: 'Reply to Grace',
      prompt: 'Tell Grace which patients can go and how many beds it frees.',
      points: 30,
      minWords: 35,
      mentions: [['3', 'three'], ['4A-5'], ['4B-3']],
      model:
        'Hi Grace, three patients meet the lounge criteria: 4A-2, 4B-1 and 4B-4, so we free 3 beds by 10:00. 4A-5 needs oxygen and 4B-3 cannot sit in a chair, so they stay on the ward until their transport comes. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3, indicators: { satisfaction: 2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Grace',
    'Perfect: three beds by ten, and the Emergency Department noticed.',
  ),
  lapseLog: 'Ward 4 missed the discharge lounge’s first morning.',
  skills: { 'patient-safety': 25, accuracy: 20 },
  xp: 140,
}

const loungeReview: CaseInput = {
  id: 'prog-hc-lounge-review',
  version: 1,
  careerId: 'healthcare',
  kind: 'programme',
  projectId: 'discharge-lounge',
  minLevel: 3,
  title: 'Discharge lounge: the four-week review',
  summary: 'Advise the project board whether other wards should use the lounge.',
  from: ward('Grace Mbeki', 'Ward Manager', 'manager'),
  trigger: { afterCase: 'prog-hc-lounge' },
  deadlineHours: 8,
  email: {
    subject: 'Discharge lounge review',
    body: `Hi {name},

The four weeks are up. The project board wants Ward 4’s view: should other wards use the lounge? Results attached.

Grace`,
  },
  whyItMatters:
    'Pilots are tested before they spread. A good review says what worked, what did not, and what must change before others follow.',
  objectives: ['Weigh the evidence from a pilot', 'Advise with conditions'],
  evidence: [
    lounge,
    {
      id: 'results',
      title: 'Four weeks of the lounge',
      text: 'Beds were freed on average 3 hours earlier. Patients rated the lounge 4.5 out of 5. Twice, a patient waited over 2 hours for medicines from pharmacy; once, a patient felt unwell in the lounge and had to return to the ward.',
    },
  ],
  steps: [
    {
      id: 'decide',
      kind: 'decide',
      title: 'Your advice',
      prompt: 'What do you advise the project board?',
      points: 50,
      options: [
        {
          id: 'conditions',
          label:
            'Roll it out, with a fast-track for discharge medicines and a nurse check before patients move to the lounge',
          verdict: 'best',
          why: 'Keeps the benefits and fixes the two problems the pilot found.',
        },
        {
          id: 'as-is',
          label: 'Roll it out as it is: it worked',
          verdict: 'acceptable',
          why: 'Mostly true, but ignores the delays and the patient who became unwell.',
        },
        {
          id: 'stop',
          label: 'Stop it: a patient became unwell',
          verdict: 'poor',
          why: 'One event with a clear fix does not outweigh a large benefit.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'the project board',
      title: 'Write to the board',
      prompt: 'Write Ward 4’s advice: the benefit, the problems, and the conditions.',
      points: 50,
      minWords: 50,
      mentions: [
        ['3 hours', 'three hours'],
        ['pharmacy', 'medicines'],
        ['nurse check', 'checked', 'assessment'],
      ],
      model:
        'Ward 4 recommends rolling out the discharge lounge to other wards, with two conditions. It freed beds on average 3 hours earlier and patients rated it 4.5 out of 5. But twice patients waited over 2 hours for medicines, so pharmacy should fast-track lounge prescriptions, and one patient became unwell, so a nurse check should confirm each patient is well before they move. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 4 },
    fail: { reputation: -1 },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Grace',
    'The board accepted both conditions. Three more wards start next month.',
  ),
  lapseLog: 'Ward 4’s review of the discharge lounge never reached the board.',
  skills: { 'patient-safety': 20, 'clinical-documentation': 20 },
  xp: 120,
}

export const MORE_HEALTHCARE_CASES: CaseInput[] = [
  suppliesCount,
  transferFix,
  safetyHuddle,
  hygieneAudit,
  clinicDna,
  loungeCase,
  loungeReview,
]
