/**
 * Cases for the healthcare career, on Ward 4 at Riverside Community
 * Hospital. Fictional people and situations, for learning: nothing here is
 * medical advice, and the player never diagnoses or prescribes.
 */
import type { CaseInput } from '../schema'
import { replies } from '../incidents/shared'
import { MORE_HEALTHCARE_CASES } from './more'

const HOSPITAL = 'Riverside Community Hospital'

/** Incident: a caller asks for information about a patient (confidentiality). */
const phoneEnquiry: CaseInput = {
  id: 'hc-phone-enquiry',
  version: 1,
  careerId: 'healthcare',
  kind: 'incident',
  minLevel: 3,
  title: 'A caller wants to know how Margaret is',
  summary:
    'Someone phones the ward asking for details about a patient. What can you say?',
  from: {
    name: 'Rosa Lindqvist',
    role: 'Ward Clerk',
    organisation: HOSPITAL,
    personId: 'reception',
  },
  trigger: { afterAssignment: 'ward-beds' },
  deadlineHours: 2,
  email: {
    subject: 'Caller on line 2 about Margaret Okafor',
    body: `Hi {name},

There’s a man on line 2 who says he’s Margaret Okafor’s nephew. He wants to know what’s wrong with her, what her blood results were, and whether she’s “going to be OK”. I’m tied up with admissions: can you take it?

Rosa`,
  },
  whyItMatters:
    'Health information is among the most private information there is. Anyone can claim to be a relative on the phone. Hospitals share details only with the patient’s consent and with people they can confirm, and never more than is needed.',
  objectives: [
    'Recognise what can and cannot be shared on the phone',
    'Protect the patient’s confidentiality without being unkind',
    'Offer a safe way for the caller to get information',
  ],
  evidence: [
    {
      id: 'record',
      title: 'Margaret’s record: contacts and consent',
      text: 'Next of kin: her daughter, Ngozi Okafor, who has a password agreed with the ward. Margaret has asked that information is shared only with Ngozi. No nephew is listed.',
    },
  ],
  steps: [
    {
      id: 'what',
      kind: 'review',
      title: 'What can you say?',
      prompt: 'Tick every statement that is right.',
      points: 30,
      findings: [
        {
          id: 'no-results',
          text: 'You must not give her diagnosis or blood results to this caller.',
          issue: true,
          why: 'Margaret has asked that information goes only to her daughter, and the caller cannot be confirmed.',
        },
        {
          id: 'confirm',
          text: 'Saying “yes, she’s on Ward 4” already tells the caller something about her.',
          issue: true,
          why: 'Even confirming someone is a patient is personal information.',
        },
        {
          id: 'family-ok',
          text: 'Family members are always entitled to information.',
          issue: false,
          why: 'Only with the patient’s consent, or when she cannot decide and it is in her best interest.',
        },
        {
          id: 'pass-message',
          text: 'You can offer to pass a message to Margaret, or ask her daughter to call.',
          issue: true,
          why: 'That respects Margaret’s wishes and still helps a worried relative.',
        },
      ],
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'What do you do?',
      prompt: 'How do you handle the call?',
      points: 40,
      options: [
        {
          id: 'message',
          label:
            'Explain kindly that you can’t share information on the phone, offer to pass a message to Margaret, and suggest he speaks to her daughter Ngozi',
          verdict: 'best',
          why: 'Margaret’s confidentiality is protected, and the caller has a kind, practical way forward.',
          effects: { trust: { manager: 2 }, indicators: { risk: -2 } },
        },
        {
          id: 'tell',
          label:
            'Tell him the basics: chest infection, doing OK. He sounds genuinely worried',
          verdict: 'poor',
          why: 'Kindness does not override confidentiality. You cannot confirm who he is, and Margaret asked for information to go only to Ngozi.',
          effects: { indicators: { risk: 6 }, reputation: -3 },
        },
        {
          id: 'hang-up',
          label: 'Say “I can’t tell you anything” and end the call',
          verdict: 'acceptable',
          why: 'Confidentiality is kept, but abruptly: a worried relative deserves a kind explanation and a way forward.',
          effects: { indicators: { satisfaction: -2 } },
        },
      ],
    },
    {
      id: 'note',
      kind: 'reply',
      to: 'Margaret’s record (telephone call note)',
      title: 'Record the call',
      prompt:
        'Write the note for Margaret’s record: who called, what was asked, what you said and did.',
      points: 30,
      minWords: 35,
      mentions: [
        ['nephew'],
        ['not', 'no information', 'unable', 'couldn’t', 'could not'],
        ['message', 'Ngozi', 'daughter'],
      ],
      avoid: [
        {
          terms: ['chest infection', 'potassium', 'results were'],
          why: 'Do not write that you shared clinical details: you should not have.',
        },
      ],
      model:
        'Telephone call, 10:15: a man who said he was Margaret’s nephew asked about her condition and blood results. I explained kindly that we cannot share information on the phone and that Margaret has asked for it to go only to her daughter Ngozi. I offered to pass a message to Margaret; he asked me to say he called. Message passed. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 3, indicators: { risk: -2 } },
    fail: { indicators: { risk: 4 } },
    lapse: { reputation: -1 },
  },
  replies: replies(
    'Rosa',
    'Thanks for taking that. Margaret was pleased to hear he’d called, and Ngozi rang him back.',
  ),
  lapseLog: 'Nobody answered the caller asking about Margaret Okafor.',
  skills: { confidentiality: 35, 'customer-service': 20, 'clinical-documentation': 15 },
  xp: 120,
}

/** Workflow: handing a patient over to another ward. */
const transferHandover: CaseInput = {
  id: 'hc-transfer-handover',
  version: 1,
  careerId: 'healthcare',
  kind: 'workflow',
  minLevel: 2,
  title: 'Handing Margaret over to the respiratory ward',
  summary: 'Margaret is moving to Ward 6. Give them a handover they can act on.',
  from: {
    name: 'Owen Fraser',
    role: 'Senior Staff Nurse',
    organisation: HOSPITAL,
    personId: 'senior',
  },
  trigger: { afterAssignment: 'ward-medicines' },
  deadlineHours: 2,
  email: {
    subject: 'Margaret is going to Ward 6',
    body: `Hi {name},

Ward 6 (respiratory) has a bed for Margaret Okafor. Please fill in their transfer handover form from her record. Be exact: they will rely on it.

Owen`,
  },
  whyItMatters:
    'Handovers are where information gets lost. A structured handover with the allergies, the risks and the latest observations means the next team can care for the patient safely from the first minute.',
  objectives: [
    'Pass on the essential safety information',
    'Use exact figures, not impressions',
  ],
  evidence: [
    {
      id: 'banner',
      title: 'Margaret Okafor, RCH-104233, born 12 March 1948',
      text: 'ALLERGY: Penicillins (rash and swelling). Alert: falls risk (needs help to walk).',
    },
    {
      id: 'obs',
      title: 'Latest observations (11:00)',
      table: {
        head: ['Breathing', 'O₂ %', 'Temp', 'BP', 'Pulse', 'Score'],
        rows: [['20', '95', '37.8', '112/70', '94', '3']],
      },
    },
    {
      id: 'plan',
      title: 'Plan (from Dr Moreau)',
      text: 'Continue the Cefralin drip every 8 hours; next dose at 16:00. Observations every 4 hours. Repeat potassium blood test tomorrow morning.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      to: 'Ward 6 (respiratory): transfer handover',
      title: 'The transfer handover',
      prompt: 'Fill in Ward 6’s handover form.',
      points: 70,
      fields: [
        {
          id: 'number',
          label: 'Hospital number',
          kind: 'text',
          accept: ['RCH-104233'],
          why: 'Name plus hospital number (and date of birth) identify the patient beyond doubt.',
        },
        {
          id: 'allergy',
          label: 'Allergies',
          kind: 'text',
          accept: ['Penicillins', 'Penicillin', 'Penicillins (rash and swelling)'],
          why: 'The allergy is the first thing the next team must know.',
        },
        {
          id: 'risk',
          label: 'Main risk',
          kind: 'choice',
          options: ['None', 'Falls risk', 'Pressure ulcer risk', 'Confusion'],
          answer: 'Falls risk',
          why: 'She needs help to walk; Ward 6 must plan for it from arrival.',
        },
        {
          id: 'score',
          label: 'Latest early-warning score',
          kind: 'number',
          answer: 3,
          why: 'The latest score (3) tells Ward 6 how closely to watch her.',
        },
        {
          id: 'next-dose',
          label: 'Next antibiotic dose due at',
          kind: 'text',
          accept: ['16:00', '1600', '4pm', '4 pm'],
          why: 'A missed or doubled antibiotic dose during a transfer is a common error.',
        },
      ],
    },
    {
      id: 'missing',
      kind: 'decide',
      title: 'Something missing',
      prompt:
        'Ward 6 phones: the porter is here, but Margaret’s drip antibiotic is not in the transfer bag. What do you do?',
      points: 30,
      options: [
        {
          id: 'hold',
          label:
            'Ask the porter to wait two minutes, find the dose, and send it with her; tell Ward 6',
          verdict: 'best',
          why: 'The dose travels with the patient and Ward 6 knows: nothing is missed.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'send',
          label: 'Send her now; Ward 6 can order their own',
          verdict: 'acceptable',
          why: 'It works if Ward 6 is told, but risks a delayed dose.',
        },
        {
          id: 'say-nothing',
          label: 'Send her and say nothing; it will turn up',
          verdict: 'poor',
          why: 'A missed antibiotic dose during a transfer is exactly the error handovers prevent.',
          effects: { indicators: { risk: 4 } },
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { senior: 3 }, reputation: 2, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Owen',
    'Ward 6 said it was the clearest handover they’d had all week.',
  ),
  lapseLog: 'Margaret’s transfer was delayed: the handover form was not done.',
  skills: { 'clinical-documentation': 30, 'patient-safety': 25 },
  xp: 85,
}

/** Operations: requests against the ward budget. */
const wardRequests: CaseInput = {
  id: 'hc-ward-requests',
  version: 1,
  careerId: 'healthcare',
  kind: 'operations',
  minLevel: 2,
  title: 'Ward requests to approve',
  summary:
    'Equipment and supply requests against the ward budget: approve, reject or escalate.',
  from: {
    name: 'Grace Mbeki',
    role: 'Ward Manager',
    organisation: HOSPITAL,
    personId: 'manager',
  },
  trigger: { afterAssignment: 'ward-medicines' },
  deadlineHours: 4,
  email: {
    subject: 'Can you deal with this week’s requests?',
    body: `Hi {name},

While I’m on the course, please decide this week’s requests against the ward budget. Remember our policy: patient equipment and safety first; nothing personal; and anything above your limit comes to me.

Grace`,
  },
  whyItMatters:
    'Ward budgets are small and every pound is public money. Approving the right things quickly keeps patients safe; spending outside policy, or above your authority, does not.',
  objectives: ['Apply the ward’s spending policy', 'Stay within your approval limit'],
  evidence: [
    {
      id: 'policy',
      title: 'Ward spending policy',
      text: 'The ward budget is for patient care, equipment and staff training. It is not for gifts, food or personal items. Any request above your approval limit goes to the ward manager.',
    },
  ],
  steps: [
    {
      id: 'approve',
      kind: 'approve',
      title: 'Decide the requests',
      prompt: 'Approve, reject or escalate each request.',
      points: 70,
      requests: [
        {
          id: 'slings',
          summary: 'Replacement hoist slings (two are frayed)',
          department: 'ward',
          amount: 240,
          why: 'Frayed slings are a safety risk; replacing them is exactly what the budget is for.',
        },
        {
          id: 'mattress',
          summary: 'A pressure-relieving mattress for bed 4A-3',
          department: 'ward',
          amount: 1900,
          why: 'Patient equipment within policy, but above a Healthcare Assistant’s limit: the ward manager decides.',
        },
        {
          id: 'cake',
          summary: 'A leaving cake and card for a colleague',
          department: 'ward',
          amount: 45,
          policyBreach:
            'The ward budget is not for gifts or food; staff usually collect for leaving gifts.',
        },
        {
          id: 'training',
          summary: 'Two places on the hospital’s manual handling refresher',
          department: 'ward',
          amount: 160,
          why: 'Staff training is in policy and keeps staff and patients safe.',
        },
      ],
    },
    {
      id: 'mattress-wait',
      kind: 'decide',
      title: 'While the mattress is decided',
      prompt:
        'The pressure-relieving mattress needs Grace’s approval, and she is away until tomorrow. The patient in 4A-3 is at high risk of pressure sores. What do you do?',
      points: 30,
      options: [
        {
          id: 'loan',
          label:
            'Ask the equipment library for a loan mattress today, and leave the request for Grace',
          verdict: 'best',
          why: 'The patient is protected today, and the purchase still goes to the person with the authority.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'approve',
          label: 'Approve it yourself: it is for patient safety',
          verdict: 'poor',
          why: 'Good intentions do not change your approval limit.',
          effects: { indicators: { discipline: -3 } },
        },
        {
          id: 'wait',
          label: 'Wait for Grace to come back',
          verdict: 'acceptable',
          why: 'Within your authority, but the patient is left at risk for a day when a loan was possible.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, indicators: { discipline: 3 } },
    fail: { indicators: { discipline: -3 } },
    lapse: { reputation: -1 },
  },
  replies: replies(
    'Grace',
    'Thank you: the slings arrived today, and I’ve ordered the mattress.',
  ),
  lapseLog: 'The ward’s requests waited another week.',
  skills: { accuracy: 25, 'patient-safety': 15 },
  xp: 85,
}

/** Leadership: running the shift as ward coordinator. */
const coordinatorShift: CaseInput = {
  id: 'hc-coordinator-shift',
  version: 1,
  careerId: 'healthcare',
  kind: 'leadership',
  minLevel: 4,
  title: 'Coordinating the late shift',
  summary:
    'Share out the work, check a colleague’s note, and settle a disagreement fairly.',
  from: {
    name: 'Grace Mbeki',
    role: 'Ward Manager',
    organisation: HOSPITAL,
    personId: 'manager',
  },
  trigger: { afterAssignment: 'ward-beds' },
  deadlineHours: 3,
  email: {
    subject: 'You’re coordinating the late shift',
    body: `Hi {name},

You’re coordinating the support team on the late shift tonight. Please plan who does what, check Lena’s note before it goes in the record, and sort out the rota disagreement between Tom and Bea.

Grace`,
  },
  whyItMatters:
    'Coordinators make a shift safe: the right person on the right job, records that can be trusted, and a team that is treated fairly.',
  objectives: [
    'Delegate by skill and capacity',
    'Review a record for safety',
    'Resolve a disagreement fairly',
  ],
  evidence: [
    {
      id: 'team',
      title: 'The support team tonight',
      table: {
        head: ['Name', 'Strengths', 'Can take'],
        rows: [
          ['Lena', 'Observations, very accurate; new to the ward', '2 jobs'],
          ['Tom', 'Experienced; manual handling trainer', '2 jobs'],
          ['Bea', 'Clinic and admissions paperwork; calm with families', '2 jobs'],
        ],
      },
    },
    {
      id: 'note',
      title: 'Lena’s draft note for Mr Whitfield',
      text: '“Obs done 18:00, all fine. Pt a bit confused this evening, family say not normal for him. Will check again later.” (Not signed. No numbers recorded.)',
    },
  ],
  steps: [
    {
      id: 'assign',
      kind: 'assign',
      title: 'Share out the work',
      prompt: 'Give each job to the best person.',
      points: 35,
      members: [
        {
          id: 'lena',
          name: 'Lena',
          strengths: 'Observations, very accurate; new to the ward',
          capacity: 2,
        },
        {
          id: 'tom',
          name: 'Tom',
          strengths: 'Experienced; manual handling trainer',
          capacity: 2,
        },
        {
          id: 'bea',
          name: 'Bea',
          strengths: 'Paperwork; calm with families',
          capacity: 2,
        },
      ],
      items: [
        {
          id: 'obs-round',
          label: 'The 20:00 observations round',
          best: ['lena'],
          why: 'Accurate observations are Lena’s strength.',
        },
        {
          id: 'hoist',
          label: 'Moving a patient with the hoist',
          best: ['tom'],
          why: 'Tom trains others in safe manual handling.',
        },
        {
          id: 'admission',
          label: 'Admission paperwork for a new patient',
          best: ['bea'],
          why: 'Bea knows the admission process best.',
        },
        {
          id: 'family',
          label: 'Talking to Mr Whitfield’s worried family',
          best: ['bea', 'tom'],
          why: 'Bea is calm with families; Tom’s experience helps too.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Check Lena’s note',
      prompt: 'Which problems does the note have?',
      points: 35,
      findings: [
        {
          id: 'numbers',
          text: '“All fine” without the observations recorded',
          issue: true,
          why: 'Without numbers no one can see the score or a trend.',
        },
        {
          id: 'confusion',
          text: 'New confusion is recorded but not escalated',
          issue: true,
          why: 'New confusion adds points to the early-warning score and must be escalated now, not “later”.',
        },
        {
          id: 'unsigned',
          text: 'The note is not signed',
          issue: true,
          why: 'An unsigned note is not part of the record.',
        },
        {
          id: 'family',
          text: 'Mentioning the family’s view was a mistake',
          issue: false,
          why: 'The family know him best: their view is important evidence.',
        },
      ],
    },
    {
      id: 'decide',
      kind: 'decide',
      title: 'The rota disagreement',
      prompt:
        'Tom and Bea both want next Saturday off. Tom has had the last three Saturdays off; Bea has asked for it for a family wedding, booked two months ago in the leave book. What do you do?',
      points: 30,
      options: [
        {
          id: 'bea',
          label:
            'Give Bea the Saturday (she asked first, through the leave book) and explain the decision to both',
          verdict: 'best',
          why: 'Fair, transparent and consistent with the process everyone uses.',
          effects: { trust: { manager: 2 } },
        },
        {
          id: 'tom',
          label: 'Give it to Tom: he is more experienced',
          verdict: 'poor',
          why: 'Seniority is not a fair reason here, and it ignores the leave process.',
          effects: { indicators: { satisfaction: -4 } },
        },
        {
          id: 'grace',
          label: 'Leave it for Grace to decide when she is back',
          verdict: 'acceptable',
          why: 'Not wrong, but the coordinator can and should make a fair decision now.',
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Lena',
      title: 'Feedback for Lena',
      prompt:
        'Write Lena short, kind feedback on her note: what to fix, and why it matters.',
      points: 20,
      minWords: 40,
      mentions: [['numbers', 'observations', 'obs'], ['escalat', 'confus'], ['sign']],
      avoid: [
        {
          terms: ['useless', 'careless', 'hopeless'],
          why: 'Feedback should help Lena improve, not shame her.',
        },
      ],
      model:
        'Hi Lena, thank you for spotting that Mr Whitfield was confused: the family’s view was really useful. Three things for next time: record the actual observation numbers so the score shows; new confusion needs escalating straight away, not later; and sign the note so it is part of the record. Shall we go through the escalation chart together tomorrow? {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3, senior: 2 }, reputation: 4, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Grace',
    'A calm, safe shift. Mr Whitfield’s confusion was caught early: his infection is being treated.',
  ),
  lapseLog: 'The late shift started without a plan from the coordinator.',
  skills: {
    'patient-safety': 25,
    'clinical-documentation': 20,
    'clinical-observation': 15,
  },
  xp: 150,
}

/** Internal request: replying to a complaint. */
const complaint: CaseInput = {
  id: 'hc-complaint',
  version: 1,
  careerId: 'healthcare',
  kind: 'client',
  minLevel: 1,
  title: 'A family’s complaint about a missed call',
  summary:
    'A daughter is upset that nobody told her about her father’s move. Reply well.',
  from: {
    name: 'Ngozi Okafor',
    role: 'Daughter of a patient',
    organisation: 'Family member',
  },
  trigger: { afterAssignment: 'ward-clinics' },
  deadlineHours: 4,
  email: {
    subject: 'Nobody told me Mum had moved ward',
    body: `To Ward 4,

I came to visit my mother, Margaret Okafor, last night and her bed was empty. Nobody had told me she had moved to Ward 6. I was frightened something terrible had happened. I am her next of kin and I gave you my number.

Ngozi Okafor`,
  },
  whyItMatters:
    'Complaints are a chance to put things right. A good reply listens, apologises sincerely, explains without excuses, and says what will change.',
  objectives: [
    'Acknowledge and apologise sincerely',
    'Explain what happened and what will change',
  ],
  evidence: [
    {
      id: 'what',
      title: 'What happened',
      text: 'Margaret moved to Ward 6 at 17:00. The move was recorded, but the “inform next of kin” box on the transfer checklist was left blank. Margaret is well and settled on Ward 6.',
    },
  ],
  steps: [
    {
      id: 'reply',
      kind: 'reply',
      to: 'Ngozi Okafor',
      title: 'Reply to Ngozi',
      prompt:
        'Write a reply: acknowledge, apologise, explain, say she is well and where, and what will change.',
      points: 100,
      minWords: 60,
      mentions: [
        ['sorry', 'apologise', 'apologize'],
        ['Ward 6'],
        ['checklist', 'next of kin'],
        ['well', 'settled'],
      ],
      avoid: [
        {
          terms: ['busy', 'not our fault', 'understaffed'],
          why: 'Excuses sound like blame; own it.',
        },
        {
          terms: ['diagnosis', 'potassium', 'results'],
          why: 'Clinical details are for a conversation, not an email.',
        },
      ],
      model:
        'Dear Ngozi, thank you for writing, and I am truly sorry for the fright you had. Your mother moved to Ward 6 at 5 pm and is well and settled there. We should have phoned you: the step on our transfer checklist to inform the next of kin was missed. We have reminded the whole team, and the checklist now cannot be completed until that box is ticked. Please call me on the ward if you would like to talk. {name}',
    },
  ],
  outcomes: {
    pass: { reputation: 3, indicators: { satisfaction: 4 } },
    fail: { indicators: { satisfaction: -4 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Ngozi',
    'Thank you for your honest reply. It means a lot that it won’t happen to another family.',
  ),
  lapseLog: 'Ngozi Okafor’s complaint went unanswered.',
  skills: { 'customer-service': 35, 'clinical-documentation': 10 },
  xp: 75,
}

export const HEALTHCARE_CASES: CaseInput[] = [
  phoneEnquiry,
  transferHandover,
  wardRequests,
  coordinatorShift,
  complaint,
  ...MORE_HEALTHCARE_CASES,
]
