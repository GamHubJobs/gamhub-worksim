/**
 * Ward cases: everyday care on Ward 4's bays. Fictional patients; simplified
 * for learning; not clinical guidance.
 */
import { makeCase, NURSE, V } from './base'

export const ROUTINE_OBS = makeCase({
  id: 'routine-obs',
  title: 'Morning observations',
  difficulty: 'beginner',
  type: 'Routine observations',
  room: 'bay',
  role: 0,
  patient: {
    id: 'RCH-310201',
    name: 'Margaret Ellis',
    age: 72,
    sex: 'female',
    build: 'average',
    skin: '#e8c4a8',
    hair: '#d9d4cc',
    background:
      'A retired school librarian, admitted four days ago with an infected left leg (cellulitis) that is getting better.',
    manner: 'Warm and chatty; likes to know what you are doing and why.',
    callMe: 'Maggie',
    allergies: [],
    history: [
      'Cellulitis of the left leg, on antibiotics (getting better)',
      'High blood pressure, on tablets',
    ],
  },
  presentation: 'Maggie in bed 4A-2 is due her morning observations.',
  background:
    'Day 4 of antibiotics for cellulitis of the left leg. Observations have been normal for two days.',
  task: {
    from: NURSE,
    text: 'Maggie in 4A-2 is due her morning obs. Do a full set, record them, and tell me how she is.',
  },
  objectives: [
    'Introduce yourself and check her identity',
    'Take and record a full set of observations',
    'Ask how she is and check her leg',
    'Leave her comfortable with the call bell',
  ],
  phases: [
    {
      id: 'stable',
      vitals: V(16, 97, 37.1, '132/78', 78, true, 2),
      looks:
        'Maggie is sitting up in bed doing a crossword. She looks comfortable and smiles at you.',
      mood: 'cheerful',
      findings: {
        'look-legs':
          'The left lower leg is a little pink and warm, but the redness is inside the pen line the doctors drew yesterday: it is shrinking.',
      },
    },
  ],
  start: 'stable',
  rules: [],
  facts: [
    {
      id: 'feeling',
      topics: ['how are you', 'feeling', 'how do you feel', 'how are things'],
      answers: ['Much better than when I came in, thank you. Bored, mostly!'],
      key: true,
    },
    {
      id: 'pain',
      topics: ['pain', 'sore', 'hurt', 'leg'],
      answers: ['My leg is a bit sore, maybe two out of ten. Nothing like it was.'],
      key: true,
    },
    {
      id: 'sleep',
      topics: ['sleep', 'night', 'slept'],
      answers: ['Not bad, apart from the man opposite snoring.'],
    },
    {
      id: 'eating',
      topics: ['eat', 'eating', 'drink', 'drinking', 'breakfast'],
      answers: ['I had porridge and two cups of tea.'],
      key: true,
    },
  ],
  actions: {
    'full-obs': {
      as: 'critical',
      rubric: 'observation',
      why: 'The full set (breathing, oxygen, temperature, blood pressure, pulse, alertness) is what the early-warning score is worked out from.',
      within: { minutes: 15 },
    },
    'record-obs': {
      as: 'critical',
      rubric: 'documentation',
      why: 'Observations that are not recorded cannot be scored, trended or acted on.',
    },
    'look-legs': {
      as: 'recommended',
      rubric: 'observation',
      why: 'Her leg is why she is here: checking the redness against the pen line shows whether it is improving.',
    },
    'emergency-call': {
      as: 'unnecessary',
      rubric: 'escalation',
      why: 'Her observations are normal: an emergency call takes the team away from patients who need them.',
    },
  },
  documentation: [
    ['observations', 'obs', 'vitals', 'score'],
    ['leg', 'redness', 'cellulitis'],
    ['comfortable', 'well', 'settled', 'no concerns', 'better'],
  ],
  debrief: {
    summary:
      'A stable patient getting better: the job is a careful, complete, recorded set of observations and a conversation.',
    points: [
      'A full set means all six: breathing rate, oxygen saturation, temperature, blood pressure, pulse and alertness.',
      'Record straight away: the chart works out the early-warning score and shows the trend.',
      'Asking open questions ("How are you feeling?") tells you more than any machine.',
    ],
    terms: [
      {
        term: 'Cellulitis',
        meaning:
          'An infection of the skin and the tissue under it, usually treated with antibiotics.',
      },
      {
        term: 'Early-warning score',
        meaning:
          'Points added up from the observations; the higher the score, the more urgent the review.',
      },
    ],
  },
  limit: 25,
})

export const POSTOP_BLEED = makeCase({
  id: 'postop-bleed',
  title: 'Faint after surgery',
  difficulty: 'intermediate',
  type: 'Deteriorating patient',
  room: 'bay',
  role: 1,
  patient: {
    id: 'RCH-310288',
    name: 'Daniel Okafor',
    age: 58,
    sex: 'male',
    build: 'heavy',
    skin: '#7a4b2e',
    hair: '#1d1d1d',
    background:
      'A bus driver, moved to Ward 4 overnight after a hip operation because the surgical ward was full.',
    manner: 'Polite and stoical: plays down how he feels.',
    callMe: 'Dan',
    allergies: [{ substance: 'Codeine', reaction: 'sickness' }],
    history: ['Right hip replacement yesterday', 'Type 2 diabetes, on tablets'],
  },
  presentation: 'Dan, the day after a hip replacement, is due observations.',
  background:
    'Right hip replacement yesterday. Observations overnight were normal. He takes a blood thinner after surgery to prevent clots (prescribed).',
  task: {
    from: NURSE,
    text: "Dan in 4A-4 had his hip done yesterday. Can you do his obs and check he's comfortable?",
  },
  objectives: [
    'Take observations and look at the wound dressing',
    'Recognise if he is getting worse',
    'Escalate clearly and quickly',
    'Keep him safe until help arrives',
  ],
  phases: [
    {
      id: 'settled',
      vitals: V(18, 96, 37.0, '124/76', 88, true, 4),
      looks: 'Dan is lying back on his pillows, a little pale, watching the television.',
      mood: 'polite, tired',
      findings: {
        'look-wound':
          'The dressing over the right hip has a small dry stain at one edge.',
      },
    },
    {
      id: 'bleeding',
      vitals: V(22, 95, 36.6, '96/58', 112, true, 3),
      looks:
        'Dan has gone grey and clammy. He is breathing faster and his hands are cold.',
      mood: 'frightened, faint',
      says: 'Sorry to bother you... I feel a bit funny. Faint, like.',
      concerning: true,
      findings: {
        'look-wound':
          'The dressing over the right hip is soaked with fresh red blood, and it is spreading onto the sheet.',
      },
    },
    {
      id: 'shocked',
      vitals: V(26, 94, 36.3, '84/50', 128, false, 3),
      looks: 'Dan is drowsy and hard to keep talking. His skin is cold and mottled.',
      mood: 'drowsy',
      concerning: true,
      findings: {
        'look-wound': 'Blood has soaked through the dressing and the sheet beneath him.',
      },
    },
    {
      id: 'reviewed',
      vitals: V(20, 96, 36.7, '104/62', 104, true, 3),
      looks:
        'Owen and Dr Moreau are at the bedside. The doctor has put pressure on the wound and started fluids. Dan has a little more colour.',
      mood: 'relieved',
      says: 'Thank you for getting them so quickly.',
    },
  ],
  start: 'settled',
  rules: [
    {
      id: 'starts-bleeding',
      from: ['settled'],
      to: 'bleeding',
      after: 8,
      event: 'Dan suddenly feels faint: his wound has started to bleed.',
    },
    {
      id: 'shock',
      from: ['bleeding'],
      to: 'shocked',
      notDone: { action: 'tell-nurse', within: 10 },
      event:
        'Nobody qualified has been told, and Dan is getting worse: his blood pressure is falling.',
    },
    {
      id: 'told',
      from: ['bleeding', 'shocked'],
      to: 'reviewed',
      done: 'tell-nurse',
      event: 'Owen comes at once and calls Dr Moreau, who takes over.',
    },
    {
      id: 'buzzer',
      from: ['bleeding', 'shocked'],
      to: 'reviewed',
      done: 'emergency-call',
      event: 'The emergency team arrive within a minute and take over.',
    },
  ],
  facts: [
    {
      id: 'feeling',
      topics: ['how are you', 'feeling', 'how do you feel'],
      answers: ["Sore, but I'm all right, thanks."],
      phases: ['settled'],
    },
    {
      id: 'faint',
      topics: ['how are you', 'feeling', 'faint', 'dizzy', 'funny', 'light headed'],
      answers: ['Dizzy. Like I might pass out. And I feel cold.'],
      key: true,
      phases: ['bleeding', 'shocked', 'reviewed'],
    },
    {
      id: 'pain',
      topics: ['pain', 'sore', 'hurt', 'hip'],
      answers: ['About four out of ten in the hip. The tablets help.'],
      key: true,
    },
    {
      id: 'wet',
      topics: ['wet', 'dressing', 'bleeding', 'blood', 'wound'],
      answers: ['It feels warm and wet down there. Is that normal?'],
      key: true,
      phases: ['bleeding', 'shocked'],
    },
    {
      id: 'surgery',
      topics: ['operation', 'surgery', 'what happened', 'why are you here'],
      answers: ['They gave me a new hip yesterday. Right side.'],
    },
  ],
  actions: {
    'full-obs': {
      as: 'critical',
      rubric: 'observation',
      why: 'When a patient says they feel faint, a full set of observations shows how unwell they are.',
      within: { minutes: 5, from: 'bleeding' },
    },
    'look-wound': {
      as: 'critical',
      rubric: 'recognition',
      why: 'After surgery, a faint patient with a fast pulse and low blood pressure may be bleeding: look at the wound.',
      within: { minutes: 8, from: 'bleeding' },
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'Low blood pressure, a fast pulse and fresh bleeding need a nurse and a doctor now.',
      within: { minutes: 8, from: 'bleeding' },
      alt: ['emergency-call'],
    },
    stay: {
      as: 'recommended',
      rubric: 'safety',
      why: 'A patient who is getting worse should not be left alone.',
    },
    'record-obs': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'The chart shows the doctor how quickly things changed.',
    },
    'help-walk': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Never walk a patient who feels faint and has low blood pressure: they can collapse and fall.',
    },
    'offer-drink': {
      as: 'unnecessary',
      rubric: 'safety',
      why: 'He may need to go back to theatre: ask the nurse before giving anything by mouth.',
    },
  },
  documentation: [
    ['blood pressure', 'bp', '96/58'],
    ['pulse', 'heart rate', '112'],
    ['dressing', 'wound', 'bleeding', 'blood'],
    ['faint', 'dizzy', 'clammy', 'grey', 'pale'],
  ],
  debrief: {
    summary:
      'Dan was bleeding from his hip wound. The early signs were a patient who felt faint, a fast pulse, and a falling blood pressure; the dressing confirmed it.',
    points: [
      'After an operation, a rising pulse and a falling blood pressure together are a warning sign of bleeding.',
      'Patients who "don’t like to bother you" often say less than they feel. Believe the word "faint".',
      'Escalate with SBAR: who, what you found (with the numbers), what you think, what you need.',
      'Stay with the patient, lying down, until a nurse or doctor arrives.',
    ],
    terms: [
      {
        term: 'SBAR',
        meaning:
          'Situation, Background, Assessment, Recommendation: a clear way to tell a colleague about a patient.',
      },
      {
        term: 'Shock',
        meaning:
          'When the body is not getting enough blood flow, for example after losing blood. Signs: fast pulse, low blood pressure, cold clammy skin, confusion.',
      },
    ],
  },
  limit: 30,
})

export const CONFUSED_FEVER = makeCase({
  id: 'confused-fever',
  title: 'Not herself today',
  difficulty: 'intermediate',
  type: 'New confusion',
  room: 'bay',
  role: 1,
  patient: {
    id: 'RCH-310317',
    name: 'Edith Morgan',
    age: 84,
    sex: 'female',
    build: 'slight',
    skin: '#f0d2bc',
    hair: '#ece8e2',
    background:
      'A retired seamstress who lives alone, admitted yesterday after a fall at home.',
    manner: 'Usually sharp and funny (her daughter says); today muddled.',
    callMe: 'Edie',
    allergies: [{ substance: 'Penicillin', reaction: 'a rash' }],
    history: [
      'Fall at home yesterday, no broken bones',
      'Mild heart failure, on tablets',
    ],
  },
  presentation: 'Edie, admitted after a fall, is muddled this morning.',
  background:
    'Admitted yesterday after a fall; X-rays normal. She was chatty and orientated on admission.',
  task: {
    from: NURSE,
    text: 'Edie in 4A-6 seems muddled this morning. Can you check her over and do her obs? The doctor wants a urine sample if she goes.',
  },
  objectives: [
    'Find out whether the confusion is new',
    'Take a full set of observations',
    'Escalate a high score or new confusion',
    'Collect and send the urine sample',
  ],
  phases: [
    {
      id: 'confused',
      vitals: V(22, 95, 38.4, '108/64', 104, false, 0),
      looks:
        'Edie is picking at the bedsheet and does not seem to know where she is. Her cheeks are flushed.',
      mood: 'muddled, restless',
      concerning: true,
      findings: {
        'look-general':
          'She feels hot to the touch and is restless. Her breakfast is untouched.',
        'fluid-chart':
          'She has drunk 300 ml since yesterday evening. The commode chart shows strong-smelling, dark urine overnight.',
      },
    },
    {
      id: 'reviewed',
      vitals: V(20, 96, 38.0, '112/66', 98, false, 0),
      looks:
        'Dr Moreau has seen Edie and prescribed antibiotics (not penicillin). Owen is giving the first dose.',
      mood: 'muddled but calmer',
    },
    {
      id: 'worse',
      vitals: V(26, 93, 38.9, '92/54', 122, false, 0),
      looks:
        'Edie is now very drowsy and breathing fast. Her skin is hot and her hands are cold.',
      mood: 'drowsy',
      concerning: true,
    },
  ],
  start: 'confused',
  rules: [
    {
      id: 'told',
      from: ['confused', 'worse'],
      to: 'reviewed',
      done: 'tell-nurse',
      event: 'Owen listens to your SBAR and asks Dr Moreau to see Edie now.',
    },
    {
      id: 'buzzer',
      from: ['worse'],
      to: 'reviewed',
      done: 'emergency-call',
      event: 'The team arrive and take over.',
    },
    {
      id: 'worse',
      from: ['confused'],
      to: 'worse',
      notDone: { action: 'tell-nurse', within: 15 },
      event: 'Nobody qualified has been told, and Edie is getting worse.',
    },
  ],
  facts: [
    {
      id: 'baseline',
      topics: ['normally', 'usually', 'yesterday'],
      answers: [
        'Normally independent and chatty, does her own shopping. Her daughter says she was "completely with it" two days ago.',
      ],
      key: true,
      inNotes: true,
    },
    {
      id: 'toilet',
      topics: ['toilet', 'wee', 'urine', 'water works'],
      answers: [
        'Stinging when she passed urine yesterday evening (written by the night staff).',
      ],
      key: true,
      inNotes: true,
    },
  ],
  actions: {
    'full-obs': {
      as: 'critical',
      rubric: 'observation',
      why: 'New confusion is a red flag: a full set of observations shows how unwell she is (her score is high).',
      within: { minutes: 5 },
    },
    'read-notes': {
      as: 'critical',
      rubric: 'information',
      why: 'She cannot tell you herself; the notes show the confusion is new, which makes it urgent.',
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'New confusion with a temperature, a fast pulse and a score of 7 or more needs a nurse and doctor straight away.',
      within: { minutes: 10 },
      alt: ['emergency-call'],
    },
    'collect-urine': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'The doctor asked for a urine sample: it can show an infection.',
    },
    'send-specimen': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'A sample sitting on the side is no use: label it at the bedside and send it.',
    },
    'record-obs': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'Record the observations so the score and the trend are on the chart.',
    },
    'help-walk': {
      as: 'harmful',
      rubric: 'safety',
      why: 'A confused, feverish patient who has already fallen once is at high risk of falling again.',
    },
    stay: {
      as: 'recommended',
      rubric: 'safety',
      why: 'Confused patients can climb out of bed: stay or make sure someone does.',
    },
  },
  documentation: [
    ['confus', 'muddled', 'disorientated', 'not orientated'],
    ['temperature', 'temp', '38', 'fever', 'hot'],
    ['new', 'normally', 'usually', 'baseline', 'two days'],
    ['score', 'news'],
  ],
  results: {
    specimens: {
      urine: {
        minutes: 20,
        results: [
          {
            test: 'Urine white cells',
            value: 250,
            unit: '/µL',
            low: 0,
            high: 10,
            meaning: 'Raised: the doctor will look at this alongside everything else.',
          },
          {
            test: 'Urine nitrite',
            value: 1,
            unit: '(positive)',
            low: 0,
            high: 0,
            meaning: 'Positive: can go with a urine infection (the doctor decides).',
          },
        ],
      },
    },
  },
  debrief: {
    summary:
      'Edie had new confusion and a high early-warning score, with signs that could fit an infection. New confusion is never "just her age": it needs escalating.',
    points: [
      'Confusion that is new for that person counts as "C" in ACVPU and scores 3 points on its own.',
      'When a patient cannot tell you, the notes, the family and the night staff can.',
      'A temperature, a fast pulse, fast breathing and new confusion together need urgent review: tell the nurse now, using SBAR.',
      'Never get a confused patient who has fallen out of bed to walk.',
    ],
    terms: [
      {
        term: 'ACVPU',
        meaning:
          'Alert, new Confusion, responds to Voice, responds to Pain, Unresponsive: how alert a patient is.',
      },
      {
        term: 'Delirium',
        meaning:
          'Sudden confusion, often caused by an illness such as an infection. It needs a doctor to find the cause.',
      },
    ],
  },
  limit: 30,
})

export const FALL_ON_WARD = makeCase({
  id: 'fall-on-ward',
  title: 'Found on the floor',
  difficulty: 'intermediate',
  type: 'Fall',
  room: 'bay',
  role: 0,
  patient: {
    id: 'RCH-310402',
    name: 'Joan Pritchard',
    age: 81,
    sex: 'female',
    build: 'slight',
    skin: '#ecc9b0',
    hair: '#cfc8bd',
    background:
      'A retired postwoman, admitted with a chest infection that is getting better.',
    manner: 'Independent and embarrassed to need help.',
    callMe: 'Joan',
    allergies: [],
    history: [
      'Chest infection (getting better)',
      'Osteoporosis (thin bones)',
      'Takes a blood thinner for an irregular heartbeat',
    ],
  },
  presentation: 'You hear a thud from 4B-3: Joan is on the floor beside her bed.',
  background:
    'On a blood thinner. Falls risk alert on her banner. Told to call for help before getting up.',
  task: {
    from: 'Ward 4',
    text: 'You hear a thud. Joan is on the floor next to her bed.',
  },
  objectives: [
    'Call for help and do not move her',
    'Check for injury and take observations',
    'Stay with her and reassure her',
    'Report and document the fall',
  ],
  phases: [
    {
      id: 'on-floor',
      vitals: V(18, 96, 36.8, '142/84', 92, true, 4),
      looks:
        'Joan is sitting on the floor beside the bed, holding her right hip, looking shaken.',
      mood: 'embarrassed, shaken',
      says: 'Oh, how silly of me. Help me up, would you, love?',
      concerning: true,
      findings: {
        'look-general':
          'There is a small bump on her forehead. Her right leg looks a little shorter and turned outwards.',
        'look-legs':
          'Her right leg is shorter than the left and the foot points outwards. She winces if it moves.',
      },
    },
    {
      id: 'helped',
      vitals: V(18, 96, 36.8, '138/82', 90, true, 4),
      looks:
        'Owen and the team have checked Joan on the floor. They use a scoop and the hoist to move her safely to bed; Dr Moreau will see her.',
      mood: 'shaken but calmer',
    },
  ],
  start: 'on-floor',
  rules: [
    {
      id: 'told',
      from: ['on-floor'],
      to: 'helped',
      done: 'tell-nurse',
      event: 'Owen comes and assesses Joan where she is before anyone moves her.',
    },
    {
      id: 'buzzer',
      from: ['on-floor'],
      to: 'helped',
      done: 'emergency-call',
      event: 'Help arrives: Owen and two colleagues check Joan before moving her.',
    },
  ],
  facts: [
    {
      id: 'what',
      topics: ['what happened', 'fall', 'fell', 'how did'],
      answers: ['I was going to the toilet and my legs just went.'],
      key: true,
    },
    {
      id: 'head',
      topics: ['head', 'bang', 'hit', 'bump', 'knock'],
      answers: ['I think I bumped my head on the locker.'],
      key: true,
    },
    {
      id: 'pain',
      topics: ['pain', 'hurt', 'sore', 'where'],
      answers: ['My right hip. It really hurts when I move.'],
      key: true,
    },
    {
      id: 'blackout',
      topics: ['black out', 'blackout', 'pass out', 'dizzy', 'remember'],
      answers: ["No, I remember it all. I didn't feel dizzy."],
      key: true,
    },
  ],
  actions: {
    'emergency-call': {
      as: 'critical',
      rubric: 'escalation',
      why: 'Call for help first: a fall needs a nurse to check for injury before anyone moves the patient.',
      within: { minutes: 3 },
      alt: ['tell-nurse'],
    },
    'lift-up': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Never lift someone after a fall before they have been checked: a broken hip or head injury can be made worse. The team uses special equipment.',
    },
    'help-walk': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Never get someone walking after a fall until they have been checked.',
    },
    'look-general': {
      as: 'critical',
      rubric: 'observation',
      why: 'Look for injuries: head bumps (she takes a blood thinner) and a shortened, turned leg (a possible broken hip).',
    },
    'full-obs': {
      as: 'recommended',
      rubric: 'observation',
      why: 'Observations after a fall show if anything else is going on.',
    },
    stay: {
      as: 'critical',
      rubric: 'safety',
      why: 'Stay with her: she may try to get up on her own.',
    },
    reassure: {
      as: 'recommended',
      rubric: 'communication',
      why: 'Falls are frightening and embarrassing: calm words help.',
    },
    'write-note': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'A fall is written up in the notes and as an incident report.',
    },
  },
  documentation: [
    ['fall', 'floor', 'fell'],
    ['head', 'bump', 'forehead'],
    ['hip', 'leg'],
    ['blood thinner', 'anticoagul'],
  ],
  debrief: {
    summary:
      'Joan fell and probably broke her hip and bumped her head while on a blood thinner. The right response is to call for help, not move her, check for injury and stay.',
    points: [
      'After a fall: call for help, do not lift, check for injury (especially the head and hips), and stay.',
      'A shortened leg that turns outwards can mean a broken hip.',
      'A head injury on a blood thinner is serious even if the patient seems fine.',
      'Every fall is documented and reported, so the ward can learn from it.',
    ],
    terms: [
      {
        term: 'Blood thinner (anticoagulant)',
        meaning: 'A medicine that makes blood clot more slowly; injuries can bleed more.',
      },
      {
        term: 'Hoist / scoop',
        meaning:
          'Equipment to lift a patient safely off the floor without hurting them or staff.',
      },
    ],
  },
  limit: 25,
})

export const PRESSURE_AREA = makeCase({
  id: 'pressure-area',
  title: 'A red heel',
  difficulty: 'beginner',
  type: 'Pressure area care',
  room: 'bay',
  role: 0,
  patient: {
    id: 'RCH-310455',
    name: 'Albert Shaw',
    age: 88,
    sex: 'male',
    build: 'slight',
    skin: '#e3bfa3',
    hair: '#f2f0ec',
    background:
      'A retired carpenter, frail, mostly in bed since a chest infection a week ago.',
    manner: 'Quiet and grateful; does not complain.',
    callMe: 'Bert',
    allergies: [],
    history: ['Chest infection (getting better)', 'Parkinson’s disease'],
  },
  presentation: 'Bert needs his two-hourly turn and skin check.',
  background:
    'Waterlow score high (at risk of pressure sores). Two-hourly repositioning chart: last turn 3 hours ago.',
  task: {
    from: NURSE,
    text: "Bert in 4B-1 is due his turn and skin check. His chart says he's a bit behind.",
  },
  objectives: [
    'Ask permission and give privacy',
    'Check his pressure areas',
    'Reposition him',
    'Report and document what you find',
  ],
  phases: [
    {
      id: 'red-heel',
      vitals: V(16, 96, 36.9, '128/72', 80, true, 3),
      looks: 'Bert is lying on his back with his heels resting on the mattress.',
      mood: 'quiet, uncomfortable',
      findings: {
        'look-skin':
          'His right heel is red and stays red when you press gently (it does not go pale). The skin is not broken. His sacrum is pink but goes pale when pressed.',
      },
    },
  ],
  start: 'red-heel',
  rules: [],
  facts: [
    {
      id: 'sore',
      topics: ['sore', 'pain', 'comfortable', 'hurt', 'heel'],
      answers: ["My right heel's sore, lying here."],
      key: true,
    },
    {
      id: 'moving',
      topics: ['move', 'shift', 'turn', 'position'],
      answers: ["I can't really shift myself these days."],
      key: true,
    },
  ],
  actions: {
    privacy: {
      as: 'recommended',
      rubric: 'conduct',
      why: 'Checking skin means uncovering a patient: draw the curtains first.',
    },
    'look-skin': {
      as: 'critical',
      rubric: 'observation',
      why: 'Check every pressure area: heels, hips, sacrum, elbows and the back of the head.',
    },
    reposition: {
      as: 'critical',
      rubric: 'safety',
      why: 'Changing position takes the pressure off; a heel that stays red needs to be "floated" off the mattress.',
    },
    'tell-nurse': {
      as: 'recommended',
      rubric: 'escalation',
      why: 'A non-blanching red area is the first stage of a pressure sore: the nurse needs to know and update his care plan.',
    },
    'write-note': {
      as: 'critical',
      rubric: 'documentation',
      why: 'Write what you saw, where, and what you did, and update the turning chart.',
    },
  },
  documentation: [
    ['heel'],
    ['red', 'redness'],
    ['blanch', 'stays red', 'does not go pale', "doesn't go pale"],
    ['reposition', 'turned', 'moved', 'position'],
  ],
  debrief: {
    summary:
      'Bert had the first sign of a pressure sore: a red heel that does not go pale when pressed. Found early, it can heal; missed, it can become a deep wound.',
    points: [
      'Pressure sores form where bone is close to the skin: heels, sacrum, hips, elbows.',
      'Press gently on red skin: if it does not go pale ("non-blanching"), report it.',
      'Reposition at least as often as the care plan says, and lift heels off the mattress.',
      'Draw the curtains and ask permission before uncovering anyone.',
    ],
    terms: [
      {
        term: 'Non-blanching redness',
        meaning:
          'Red skin that stays red when pressed: the first stage of pressure damage.',
      },
    ],
  },
  limit: 25,
})

export const NIL_BY_MOUTH = makeCase({
  id: 'nil-by-mouth',
  title: 'Just a cup of tea',
  difficulty: 'beginner',
  type: 'Before surgery',
  room: 'bay',
  role: 0,
  patient: {
    id: 'RCH-310509',
    name: 'Thomas Webb',
    age: 47,
    sex: 'male',
    build: 'average',
    skin: '#d9a982',
    hair: '#5b3a22',
    background:
      'A plumber, waiting for an operation to remove his gallbladder this afternoon.',
    manner: 'Anxious and talks a lot when nervous.',
    callMe: 'Tom',
    allergies: [{ substance: 'Plasters (adhesive)', reaction: 'itchy skin' }],
    history: ['Gallstones, operation planned today'],
  },
  presentation: 'Tom, waiting for surgery, asks you for a cup of tea.',
  background: 'Nil by mouth from midnight for theatre this afternoon (in the care plan).',
  task: {
    from: 'Tom (4A-5)',
    text: "Excuse me! Any chance of a cup of tea? I'm parched.",
  },
  objectives: [
    'Check the care plan before giving anything',
    'Explain kindly why he cannot eat or drink',
    'Reassure him about the operation',
    'Make it clear for everyone (sign)',
  ],
  phases: [
    {
      id: 'anxious',
      vitals: V(18, 98, 36.8, '138/88', 96, true, 1),
      looks:
        'Tom is sitting on the edge of the bed in a hospital gown, jiggling his leg.',
      mood: 'anxious, chatty',
      findings: {
        'read-notes':
          'Care plan: NIL BY MOUTH from midnight. Theatre this afternoon. Mouth care allowed.',
      },
    },
  ],
  start: 'anxious',
  rules: [],
  facts: [
    {
      id: 'worried',
      topics: ['worried', 'nervous', 'scared', 'feeling', 'how are you', 'operation'],
      answers: [
        "Honestly? Terrified. I've never had an operation. What if I don't wake up?",
      ],
      key: true,
    },
    {
      id: 'last',
      topics: ['last eat', 'last ate', 'last drink', 'last meal', 'when did you'],
      answers: ['Supper last night, about eight. Nothing since, I promise.'],
      key: true,
    },
    {
      id: 'thirsty',
      topics: ['thirsty', 'tea', 'dry'],
      answers: ['My mouth is so dry.'],
    },
  ],
  actions: {
    'offer-drink': {
      as: 'harmful',
      rubric: 'safety',
      why: 'He is nil by mouth for an anaesthetic: food or drink can be breathed into the lungs during the operation.',
    },
    'read-notes': {
      as: 'critical',
      rubric: 'information',
      why: 'Always check the care plan before giving food or drink to a patient going for surgery.',
    },
    reassure: {
      as: 'critical',
      rubric: 'communication',
      why: 'His request is really about fear: explaining why, and what happens next, helps.',
    },
    'nbm-sign': {
      as: 'recommended',
      rubric: 'safety',
      why: 'A sign above the bed stops someone else making the same mistake.',
    },
    'ask-nurse': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'The nurse can confirm, and arrange mouth care or answer his questions about the operation.',
    },
  },
  documentation: [
    ['nil by mouth', 'nil-by-mouth', 'no food', 'nothing to eat'],
    ['anxious', 'worried', 'nervous'],
  ],
  debrief: {
    summary:
      'Tom was nil by mouth before surgery. The safe answer to "just a cup of tea" is a kind "not yet", with an explanation.',
    points: [
      'Always check the care plan before giving anything to eat or drink.',
      'Nil by mouth protects patients during an anaesthetic.',
      'Requests are often about something else: here, fear. Listen and reassure.',
    ],
    terms: [
      {
        term: 'Nil by mouth (NBM)',
        meaning: 'Nothing to eat or drink, usually before an operation or test.',
      },
    ],
  },
  limit: 20,
})

export const DEHYDRATION = makeCase({
  id: 'dehydration',
  title: 'Out of reach',
  difficulty: 'beginner',
  type: 'Nutrition and hydration',
  room: 'bay',
  role: 0,
  patient: {
    id: 'RCH-310577',
    name: 'Doris Bell',
    age: 90,
    sex: 'female',
    build: 'slight',
    skin: '#f3d7c4',
    hair: '#f5f3ef',
    background:
      'A retired florist with arthritis in her hands, admitted with a urine infection.',
    manner: 'Does not like to be a nuisance.',
    callMe: 'Doris',
    allergies: [],
    history: ['Urine infection, on antibiotics', 'Arthritis in both hands'],
  },
  presentation: 'Doris seems quiet and her lips are dry.',
  background: 'Fluid chart in place. Needs help with drinks.',
  task: {
    from: NURSE,
    text: "Can you check Doris in 4B-5? I'm not sure she's drinking enough.",
  },
  objectives: [
    'Check how much she has drunk',
    'Find out why',
    'Help her drink and put the jug in reach',
    'Update the chart and report',
  ],
  phases: [
    {
      id: 'dry',
      vitals: V(18, 96, 37.2, '108/66', 96, true, 1),
      looks:
        'Doris is dozing. Her lips are dry and cracked. Her water jug is on the far side of the table, full.',
      mood: 'tired, apologetic',
      findings: {
        'fluid-chart':
          'Only 400 ml drunk since yesterday morning. Urine: small amounts, dark.',
      },
    },
  ],
  start: 'dry',
  rules: [],
  facts: [
    {
      id: 'thirsty',
      topics: ['thirsty', 'mouth', 'drink', 'dry'],
      answers: ["My mouth's like sandpaper."],
      key: true,
    },
    {
      id: 'why',
      topics: ['why', 'reach', 'jug', 'help', 'hard'],
      answers: [
        "I can't reach the jug, and my hands can't hold it anyway. I don't like to keep asking.",
      ],
      key: true,
    },
    {
      id: 'toilet',
      topics: ['toilet', 'wee', 'water works'],
      answers: ["I've hardly been."],
      key: true,
    },
  ],
  actions: {
    'fluid-chart': {
      as: 'critical',
      rubric: 'observation',
      why: 'The fluid chart shows how much she has really drunk: 400 ml in a day is far too little.',
    },
    'offer-drink': {
      as: 'critical',
      rubric: 'responsibilities',
      why: 'Help her drink now, with a cup she can hold.',
    },
    'update-fluid-chart': {
      as: 'critical',
      rubric: 'documentation',
      why: 'Record what she drinks so the team can see if it improves.',
    },
    'tell-nurse': {
      as: 'recommended',
      rubric: 'escalation',
      why: 'Very low intake and dark urine should be reported: she may need more help or fluids from the doctor.',
    },
    'call-bell': {
      as: 'critical',
      rubric: 'safety',
      why: 'Leave the bell and a drink she can manage within reach.',
    },
  },
  documentation: [
    ['drink', 'fluid', 'intake', 'ml'],
    ['reach', 'jug', 'hold'],
    ['urine', 'dark'],
  ],
  debrief: {
    summary:
      'Doris was not drinking because she could not reach or hold her jug. Small practical things prevent dehydration.',
    points: [
      'Check the fluid chart: totals tell the real story.',
      'Ask why: often the reason is practical (reach, grip, help to sit up).',
      'Put drinks and the call bell within reach, every time you leave.',
    ],
    terms: [
      {
        term: 'Fluid balance chart',
        meaning:
          'A record of everything a patient drinks and passes, to check they are getting enough.',
      },
    ],
  },
  limit: 20,
})

export const REFUSES_OBS = makeCase({
  id: 'refuses-obs',
  title: '"Not again!"',
  difficulty: 'intermediate',
  type: 'Consent and communication',
  room: 'bay',
  role: 1,
  patient: {
    id: 'RCH-310612',
    name: 'Gerald Fox',
    age: 68,
    sex: 'male',
    build: 'heavy',
    skin: '#d8b090',
    hair: '#8a8a8a',
    background:
      'A retired engineer, admitted with heart failure; on two-hourly observations.',
    manner: 'Blunt and grumpy when tired; responds to honesty and being asked.',
    callMe: 'Gerald',
    allergies: [],
    history: ['Heart failure, on tablets', 'Sleep apnoea'],
  },
  presentation: 'Gerald says no when you come to do his observations.',
  background: 'Two-hourly observations overnight. He has a right to refuse.',
  task: {
    from: NURSE,
    text: "Gerald in 4A-1 is due obs. Fair warning: he wasn't happy last time.",
  },
  objectives: [
    'Respect his right to say no',
    'Find out why and explain why it matters',
    'Agree a plan with him',
    'Document and tell the nurse',
  ],
  phases: [
    {
      id: 'annoyed',
      vitals: V(16, 97, 36.9, '136/82', 84, true, 0),
      looks: 'Gerald has his eyes closed and a blanket pulled over his head.',
      mood: 'grumpy, exhausted',
      says: 'Not again! Leave me alone, will you?',
    },
  ],
  start: 'annoyed',
  rules: [],
  facts: [
    {
      id: 'why',
      topics: ['why', 'what is wrong', "what's wrong", 'matter', 'upset', 'tired'],
      answers: [
        "Every two hours someone wakes me! I haven't slept properly in three nights.",
      ],
      key: true,
    },
    {
      id: 'breath',
      topics: ['breath', 'breathing', 'chest'],
      answers: ['Breathing is fine. Better than when I came in.'],
      key: true,
    },
    {
      id: 'later',
      topics: ['later', 'come back', 'in an hour', 'when'],
      answers: [
        'Come back after I have had a proper sleep and you can do what you like.',
      ],
    },
  ],
  actions: {
    consent: {
      as: 'critical',
      rubric: 'conduct',
      why: 'Observations need his agreement. Asking, not telling, is the law and good care.',
    },
    'full-obs': {
      as: 'optional',
      rubric: 'conduct',
      why: 'Observations are fine once he has agreed.',
      requires: 'consent',
      fault:
        'Doing observations after he said no, without asking again, ignores his right to refuse.',
    },
    reassure: {
      as: 'recommended',
      rubric: 'communication',
      why: 'Acknowledging how tired he is helps him listen.',
    },
    'tell-nurse': {
      as: 'recommended',
      rubric: 'escalation',
      why: 'The nurse can review how often he really needs observations at night.',
    },
    'write-note': {
      as: 'critical',
      rubric: 'documentation',
      why: 'A refusal, the reason, and what was agreed must be written down.',
    },
  },
  documentation: [
    ['refus', 'declined', 'said no', 'did not want'],
    ['sleep', 'tired'],
    ['explained', 'reason', 'why'],
    ['nurse', 'owen', 'agreed', 'plan'],
  ],
  debrief: {
    summary:
      'Gerald had every right to say no. The skill is finding out why, explaining honestly, agreeing a plan, and writing it down.',
    points: [
      'Consent is needed even for observations; adults with capacity can refuse.',
      'Ask why: here, the real problem was sleep.',
      'Document refusals and tell the nurse: the plan may need changing.',
    ],
    terms: [
      {
        term: 'Capacity',
        meaning: 'Being able to understand, weigh up and decide about one’s own care.',
      },
    ],
  },
  limit: 20,
})

export const WRONG_WRISTBAND = makeCase({
  id: 'wrong-wristband',
  title: 'Which date of birth?',
  difficulty: 'intermediate',
  type: 'Patient identification',
  room: 'bay',
  role: 1,
  patient: {
    id: 'RCH-310648',
    name: 'Maria Santos',
    age: 66,
    sex: 'female',
    build: 'average',
    skin: '#c99a6e',
    hair: '#3a2a1e',
    background: 'A retired nurse herself, admitted with a kidney infection.',
    manner: 'Friendly; notices when things are done properly.',
    callMe: 'Maria',
    allergies: [{ substance: 'Trimethoprim', reaction: 'a rash' }],
    history: ['Kidney infection', 'Asthma'],
  },
  presentation: 'You are asked to collect a urine sample from Maria.',
  background: 'Urine sample requested by the doctor. The request form says 4 May 1960.',
  task: {
    from: NURSE,
    text: 'Can you get the urine sample from Maria in 4B-6 and send it off, please?',
  },
  objectives: [
    'Check identity against the wristband and the form',
    'Stop if anything does not match',
    'Report it',
    'Do not send a specimen that might be mislabelled',
  ],
  phases: [
    {
      id: 'stable',
      vitals: V(16, 97, 37.4, '122/76', 82, true, 2),
      looks: 'Maria is sitting in the chair by her bed reading.',
      mood: 'friendly',
      findings: {
        'check-id':
          'She says her date of birth is 4 May 1960. The wristband says 4 May 1950. The request form says 1960. They do not match.',
      },
    },
  ],
  start: 'stable',
  rules: [],
  facts: [
    {
      id: 'dob',
      topics: ['date of birth', 'born', 'birthday'],
      answers: ['Fourth of May, 1960.'],
      key: true,
    },
    {
      id: 'band',
      topics: ['wristband', 'band', 'bracelet'],
      answers: ['They put it on in A&E. I never looked at it, to be honest.'],
      key: true,
    },
  ],
  actions: {
    'check-id': {
      as: 'critical',
      rubric: 'safety',
      why: 'Check name and date of birth against the wristband and the form before any specimen.',
    },
    'stop-and-check': {
      as: 'critical',
      rubric: 'safety',
      why: 'When identity details do not match, stop until it is put right.',
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'A wrong wristband must be reported and replaced; it could cause harm with medicines or blood.',
    },
    'send-specimen': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Never send a specimen when identity does not match: the result could go into the wrong record.',
    },
    'write-note': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'Record the mismatch and what was done.',
    },
  },
  documentation: [
    ['wristband', 'name band', 'band'],
    ['date of birth', 'dob', '1950', '1960'],
    ['mismatch', 'not match', "didn't match", 'does not match', 'wrong'],
  ],
  debrief: {
    summary:
      'Maria’s wristband had the wrong year of birth. Identity checks catch errors like this before they reach a lab result, a medicine or a blood transfusion.',
    points: [
      'Ask the patient to tell you their name and date of birth (do not read it to them).',
      'Check against the wristband and the form: all three must match.',
      'If not, stop, report, and get the wristband corrected before going on.',
    ],
    terms: [
      {
        term: 'Positive patient identification',
        meaning:
          'The patient states their details, which are checked against the wristband and records.',
      },
    ],
  },
  limit: 20,
})
