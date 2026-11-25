/**
 * Acute cases: patients who are, or become, seriously unwell. The player's
 * job is to recognise it, escalate it, and keep the patient safe until
 * qualified staff take over. Fictional; simplified; not clinical guidance.
 */
import { DOCTOR, makeCase, NURSE, V } from './base'

export const CHEST_PAIN = makeCase({
  id: 'chest-pain',
  title: 'A weight on my chest',
  difficulty: 'advanced',
  type: 'Chest pain',
  room: 'bay',
  role: 1,
  patient: {
    id: 'RCH-310703',
    name: 'Robert Hughes',
    age: 63,
    sex: 'male',
    build: 'heavy',
    skin: '#e2b897',
    hair: '#6e6e6e',
    background: 'A taxi driver and smoker, admitted yesterday with a chest infection.',
    manner: 'Tries to joke, but is frightened.',
    callMe: 'Rob',
    allergies: [{ substance: 'Aspirin', reaction: 'wheezing' }],
    history: ['Chest infection', 'Smoker, 30 a day', 'High cholesterol'],
  },
  presentation: 'Rob presses the call bell: he has chest pain.',
  background:
    'Admitted yesterday with a chest infection. No previous heart problems recorded. Smoker.',
  task: { from: 'Rob (4A-3)', text: '*The call bell rings from 4A-3.*' },
  objectives: [
    'Find out about the pain',
    'Escalate immediately',
    'Take observations and record an ECG',
    'Stay and keep him still',
  ],
  phases: [
    {
      id: 'pain',
      vitals: V(20, 95, 36.9, '148/92', 104, true, 7),
      looks: 'Rob is sitting forward, gripping his chest. He is pale and sweating.',
      mood: 'frightened, in pain',
      says: "My chest... it's like a weight sitting on it.",
      concerning: true,
    },
    {
      id: 'worse',
      vitals: V(24, 93, 36.9, '100/64', 118, true, 8),
      looks: 'Rob is grey and sweating heavily, clutching his left arm.',
      mood: 'very frightened',
      says: "It's getting worse... I feel sick.",
      concerning: true,
    },
    {
      id: 'team',
      vitals: V(18, 96, 36.9, '138/86', 96, true, 5),
      looks: `Owen and ${DOCTOR} are with Rob. The doctor is reading the ECG and has started treatment.`,
      mood: 'scared but calmer',
    },
  ],
  start: 'pain',
  rules: [
    {
      id: 'worse',
      from: ['pain'],
      to: 'worse',
      notDone: { action: 'tell-nurse', within: 6 },
      event:
        'Rob’s pain is worse and his blood pressure is dropping. Nobody qualified knows yet.',
    },
    {
      id: 'told',
      from: ['pain', 'worse'],
      to: 'team',
      done: 'tell-nurse',
      event: 'Owen comes immediately and bleeps the doctor.',
    },
    {
      id: 'buzzer',
      from: ['pain', 'worse'],
      to: 'team',
      done: 'emergency-call',
      event: 'The team arrive and take over.',
    },
  ],
  facts: [
    {
      id: 'where',
      topics: ['where', 'spread', 'arm', 'jaw', 'neck', 'back'],
      answers: ['Right in the middle. It goes down my left arm and up into my jaw.'],
      key: true,
    },
    {
      id: 'when',
      topics: ['when', 'start', 'how long', 'began'],
      answers: ['About twenty minutes ago. I was just watching the telly.'],
      key: true,
    },
    {
      id: 'like',
      topics: ['like', 'describe', 'feel like', 'what kind', 'sharp', 'heavy', 'pain'],
      answers: [
        'Heavy. Crushing. Like an elephant sitting on me. About seven out of ten.',
      ],
      key: true,
    },
    {
      id: 'before',
      topics: ['before', 'ever had', 'happened'],
      answers: ['Never. Not like this.'],
      key: true,
    },
    {
      id: 'breath',
      topics: ['breath', 'breathing'],
      answers: ['A bit short of breath, yes.'],
    },
    {
      id: 'family',
      topics: ['family', 'father', 'dad', 'heart'],
      answers: ['My dad died of his heart at sixty.'],
    },
  ],
  actions: {
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'New chest pain is an emergency until proven otherwise: tell the nurse at once.',
      within: { minutes: 3 },
      alt: ['emergency-call'],
    },
    'full-obs': {
      as: 'critical',
      rubric: 'observation',
      why: 'Observations show how his heart and circulation are coping.',
      within: { minutes: 6 },
    },
    ecg: {
      as: 'critical',
      rubric: 'responsibilities',
      why: 'An ECG within ten minutes of chest pain lets the doctor spot a heart attack.',
      within: { minutes: 10 },
    },
    stay: {
      as: 'recommended',
      rubric: 'safety',
      why: 'Stay with him; he could get worse quickly.',
    },
    'sit-up': {
      as: 'recommended',
      rubric: 'safety',
      why: 'Sitting comfortably and still reduces the heart’s work.',
    },
    'help-walk': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Walking makes the heart work harder: keep him in bed.',
    },
    'offer-drink': {
      as: 'unnecessary',
      rubric: 'safety',
      why: 'He may need tests or procedures: ask the nurse first.',
    },
  },
  documentation: [
    ['chest', 'pain'],
    ['arm', 'jaw', 'spread'],
    ['started', 'minutes ago', 'onset', 'since'],
    ['ecg'],
  ],
  results: {
    ecg: {
      rhythm: 'Fast, with changes the doctor will read',
      rate: 104,
      meaning: 'For the doctor to interpret.',
      trace: 'fast',
    },
  },
  debrief: {
    summary:
      'Rob had chest pain that could be a heart attack. Speed matters: tell the nurse at once, observations, an ECG within ten minutes, and keep him still.',
    points: [
      'Heavy or crushing chest pain spreading to the arm or jaw, with sweating, is an emergency.',
      'Tell the nurse before anything else; then observations and an ECG.',
      'Healthcare support staff can record an ECG, but the doctor reads it.',
      'Note when the pain started: it changes the treatment.',
    ],
    terms: [
      {
        term: 'ECG',
        meaning:
          'A recording of the heart’s electrical activity, using stickers on the chest, arms and legs.',
      },
    ],
  },
  limit: 25,
})

export const LOW_SUGAR = makeCase({
  id: 'low-sugar',
  title: 'Shaky and sweaty',
  difficulty: 'intermediate',
  type: 'Low blood glucose',
  room: 'bay',
  role: 1,
  patient: {
    id: 'RCH-310744',
    name: 'Aisha Khan',
    age: 45,
    sex: 'female',
    build: 'average',
    skin: '#b07f5a',
    hair: '#1a1410',
    background: 'A pharmacist with type 1 diabetes, admitted with a chest infection.',
    manner: 'Usually calm and precise; irritable when her sugar is low.',
    callMe: 'Aisha',
    allergies: [],
    history: ['Type 1 diabetes, on insulin', 'Chest infection'],
  },
  presentation: 'Aisha is shaky, sweaty and short-tempered at lunchtime.',
  background: 'Type 1 diabetes on insulin. Blood glucose checks before meals.',
  task: {
    from: NURSE,
    text: "Can you check on Aisha in 4B-2? She snapped at the domestic, which isn't like her.",
  },
  objectives: [
    'Recognise the signs of low blood sugar',
    'Check her blood glucose',
    'Tell the nurse straight away',
    'Stay with her',
  ],
  phases: [
    {
      id: 'shaky',
      vitals: V(18, 97, 37.2, '126/80', 102, true, 0, 3.1),
      looks:
        'Aisha is pale, sweating, and her hands are trembling. Her lunch tray is untouched.',
      mood: 'irritable, shaky',
      says: 'I feel all shaky and weird. Leave me alone a minute.',
      concerning: true,
    },
    {
      id: 'drowsy',
      vitals: V(16, 97, 36.9, '120/76', 108, false, 0, 2.4),
      looks: 'Aisha is drowsy and slurring her words.',
      mood: 'drowsy',
      concerning: true,
    },
    {
      id: 'treated',
      vitals: V(16, 98, 37.1, '124/78', 88, true, 0, 5.8),
      looks:
        'Owen has treated her low sugar from the ward’s hypo box (as prescribed). Aisha is eating a sandwich.',
      mood: 'embarrassed, better',
      says: 'Sorry. I should have eaten. Thank you.',
    },
  ],
  start: 'shaky',
  rules: [
    {
      id: 'drowsy',
      from: ['shaky'],
      to: 'drowsy',
      notDone: { action: 'tell-nurse', within: 10 },
      event: 'Aisha’s blood sugar keeps falling: she is now drowsy.',
    },
    {
      id: 'told',
      from: ['shaky', 'drowsy'],
      to: 'treated',
      done: 'tell-nurse',
      event: 'Owen comes with the hypo box and treats her low sugar.',
    },
    {
      id: 'buzzer',
      from: ['drowsy'],
      to: 'treated',
      done: 'emergency-call',
      event: 'The team come and treat her.',
    },
  ],
  facts: [
    {
      id: 'lunch',
      topics: ['lunch', 'eat', 'eaten', 'food', 'hungry'],
      answers: ["No, I wasn't hungry, so I skipped it."],
      key: true,
    },
    {
      id: 'insulin',
      topics: ['insulin', 'injection', 'diabetes', 'dose'],
      answers: ['I did my usual insulin at twelve.'],
      key: true,
    },
    {
      id: 'feel',
      topics: ['how are you', 'feeling', 'feel'],
      answers: ['Shaky. Sweaty. A bit muddled. Like when my sugar is low.'],
      key: true,
      phases: ['shaky'],
    },
  ],
  actions: {
    'obs-glucose': {
      as: 'critical',
      rubric: 'observation',
      why: 'Shaky, sweaty and irritable in someone on insulin: check the blood glucose.',
      within: { minutes: 6 },
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'A low blood glucose is treated quickly by the nurse, following the hypo plan.',
      within: { minutes: 8 },
      alt: ['emergency-call'],
    },
    stay: {
      as: 'recommended',
      rubric: 'safety',
      why: 'Low blood sugar can make someone drowsy quickly: do not leave her.',
    },
    'help-walk': {
      as: 'harmful',
      rubric: 'safety',
      why: 'She could collapse: keep her sitting or lying down.',
    },
    'record-obs': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'Record the glucose reading and what was done.',
    },
  },
  documentation: [
    ['glucose', 'sugar', 'bm'],
    ['3.1'],
    ['insulin', 'lunch', 'eaten', 'ate'],
  ],
  debrief: {
    summary:
      'Aisha had low blood sugar (a "hypo") after taking insulin and skipping lunch. Recognise it, check the glucose, get the nurse, stay.',
    points: [
      'Signs of a hypo: shaking, sweating, pale, hungry, irritable or confused.',
      'Below 4.0 mmol/L is low: tell the nurse at once.',
      'Ask about insulin and food: it explains why.',
    ],
    terms: [
      {
        term: 'Hypoglycaemia (hypo)',
        meaning: 'Blood glucose that is too low, usually below 4.0 mmol/L.',
      },
    ],
  },
  limit: 25,
})

export const BREATHLESS = makeCase({
  id: 'breathless',
  title: "Can't catch my breath",
  difficulty: 'advanced',
  type: 'Breathing difficulty',
  room: 'bay',
  role: 1,
  patient: {
    id: 'RCH-310781',
    name: 'Frank Doyle',
    age: 76,
    sex: 'male',
    build: 'average',
    skin: '#e6c0a2',
    hair: '#bcb6ad',
    background: 'A retired docker, admitted this morning with pneumonia.',
    manner: 'Speaks in short bursts; frightened when breathless.',
    callMe: 'Frank',
    allergies: [{ substance: 'Erythromycin', reaction: 'sickness' }],
    history: ['Pneumonia (right side)', 'Ex-smoker'],
  },
  presentation: 'Frank is breathing fast and looks frightened.',
  background:
    'Pneumonia diagnosed this morning; antibiotics started. Target saturation 94–98%.',
  task: {
    from: NURSE,
    text: 'Frank in 4A-6 is looking a bit breathless. Can you do his obs?',
  },
  objectives: [
    'Help him into the best position to breathe',
    'Take a full set of observations',
    'Escalate a high score now',
    'Collect the sputum sample the doctor asked for',
  ],
  phases: [
    {
      id: 'breathless',
      vitals: V(26, 90, 38.1, '132/80', 108, true, 3),
      looks: 'Frank is slumped down the bed, breathing fast with his shoulders.',
      mood: 'frightened, breathless',
      says: "Can't... get my breath.",
      concerning: true,
    },
    {
      id: 'tiring',
      vitals: V(32, 86, 38.4, '110/70', 124, false, 3),
      looks: 'Frank is drowsy and his lips look blue.',
      mood: 'drowsy',
      concerning: true,
    },
    {
      id: 'reviewed',
      vitals: V(22, 94, 38.0, '128/78', 100, true, 2),
      looks:
        'Owen has started oxygen as prescribed, and the doctor is on the way. Frank is sitting up, a little easier.',
      mood: 'easier',
    },
  ],
  start: 'breathless',
  rules: [
    {
      id: 'tiring',
      from: ['breathless'],
      to: 'tiring',
      notDone: { action: 'tell-nurse', within: 10 },
      event: 'Frank is tiring: his oxygen level is falling.',
    },
    {
      id: 'told',
      from: ['breathless', 'tiring'],
      to: 'reviewed',
      done: 'tell-nurse',
      event: 'Owen comes, starts the prescribed oxygen and calls the doctor.',
    },
    {
      id: 'buzzer',
      from: ['tiring'],
      to: 'reviewed',
      done: 'emergency-call',
      event: 'The team arrive and take over.',
    },
  ],
  facts: [
    {
      id: 'breath',
      topics: ['breath', 'breathing', 'how are you', 'feeling'],
      answers: ["Worse... since breakfast. Can't... finish a sentence."],
      key: true,
    },
    {
      id: 'cough',
      topics: ['cough', 'phlegm', 'sputum', 'spit'],
      answers: ['Coughing... green stuff.'],
      key: true,
    },
    {
      id: 'pain',
      topics: ['pain', 'hurt', 'chest'],
      answers: ['Hurts... on the right... when I cough.'],
      key: true,
    },
  ],
  actions: {
    'sit-up': {
      as: 'critical',
      rubric: 'safety',
      why: 'Sitting upright lets the lungs expand: it is the first thing to do for a breathless patient.',
      within: { minutes: 5 },
    },
    'full-obs': {
      as: 'critical',
      rubric: 'observation',
      why: 'Breathing rate and oxygen saturation are the key numbers: here they give a high score.',
      within: { minutes: 5 },
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'A saturation below target and fast breathing need the nurse now: only they can start oxygen.',
      within: { minutes: 8 },
      alt: ['emergency-call'],
    },
    'collect-sputum': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'The doctor asked for a sputum sample to find the germ.',
    },
    'send-specimen': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'Label and send the sample.',
    },
    'lie-down': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Lying flat makes breathlessness worse.',
    },
    'help-walk': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Walking a breathless patient can make them collapse.',
    },
  },
  documentation: [
    ['breath', 'resp', '26'],
    ['saturation', 'spo2', 'oxygen', '90'],
    ['sat up', 'sitting', 'upright', 'position'],
    ['score', 'news'],
  ],
  results: {
    specimens: {
      sputum: {
        minutes: 25,
        results: [
          {
            test: 'Sputum culture',
            value: 1,
            unit: '(growth)',
            low: 0,
            high: 0,
            meaning:
              'Bacteria growing; the laboratory will say which antibiotics work (for the doctor).',
          },
        ],
      },
    },
  },
  debrief: {
    summary:
      'Frank’s pneumonia was getting worse: fast breathing and low oxygen. Sit him up, measure, tell the nurse; oxygen is the nurse’s to start.',
    points: [
      'Breathing rate is the observation most often missed, and one of the most important.',
      'Sit breathless patients upright, never flat.',
      'Oxygen is a medicine: only registered staff start or change it.',
    ],
    terms: [
      {
        term: 'Oxygen saturation',
        meaning: 'How much of the blood is carrying oxygen, measured with a finger clip.',
      },
    ],
  },
  limit: 25,
})

export const SEPSIS_SIGNS = makeCase({
  id: 'sepsis-signs',
  title: 'Shivering and hardly passing urine',
  difficulty: 'advanced',
  type: 'Signs of serious infection',
  room: 'bay',
  role: 2,
  patient: {
    id: 'RCH-310829',
    name: 'Kofi Mensah',
    age: 54,
    sex: 'male',
    build: 'average',
    skin: '#5a3825',
    hair: '#141414',
    background:
      'A secondary school teacher, admitted two days ago with a kidney infection.',
    manner: 'Articulate; minimises symptoms so as not to be a fuss.',
    callMe: 'Kofi',
    allergies: [],
    history: ['Kidney infection', 'Kidney stones in the past'],
  },
  presentation: 'Kofi is shivering under three blankets.',
  background:
    'Kidney infection, on antibiotics. Last observations four hours ago: score 2.',
  task: {
    from: NURSE,
    text: "Kofi in 4B-4 says he's cold. Can you check him and do bloods if the doctor wants them?",
  },
  objectives: [
    'Take a full set and work out the score',
    'Check the fluid balance',
    'Escalate urgently',
    'Take the blood samples asked for',
  ],
  phases: [
    {
      id: 'hot',
      vitals: V(24, 94, 38.9, '98/60', 118, true, 3),
      looks:
        'Kofi is shaking under three blankets. His skin is hot but his hands are cold.',
      mood: 'shivering, worried',
      concerning: true,
      findings: { 'fluid-chart': 'Only 150 ml of urine in the last eight hours.' },
    },
    {
      id: 'worse',
      vitals: V(28, 92, 39.2, '86/50', 130, false, 3),
      looks: 'Kofi is drowsy and confused, breathing fast.',
      mood: 'confused',
      concerning: true,
    },
    {
      id: 'reviewed',
      vitals: V(22, 95, 38.6, '104/64', 110, true, 2),
      looks:
        'The outreach team and Dr Moreau are with Kofi: fluids and stronger antibiotics have started.',
      mood: 'tired, relieved',
    },
  ],
  start: 'hot',
  rules: [
    {
      id: 'worse',
      from: ['hot'],
      to: 'worse',
      notDone: { action: 'tell-nurse', within: 12 },
      event: 'Kofi is getting worse: his blood pressure is falling and he is confused.',
    },
    {
      id: 'told',
      from: ['hot', 'worse'],
      to: 'reviewed',
      done: 'tell-nurse',
      event: 'Owen calls the outreach team and the doctor.',
    },
    {
      id: 'outreach',
      from: ['hot', 'worse'],
      to: 'reviewed',
      done: 'call-outreach',
      event: 'The outreach team come within minutes.',
    },
    {
      id: 'buzzer',
      from: ['worse'],
      to: 'reviewed',
      done: 'emergency-call',
      event: 'The team arrive and take over.',
    },
  ],
  facts: [
    {
      id: 'shiver',
      topics: ['cold', 'shiver', 'shaking', 'how are you', 'feeling'],
      answers: ["Freezing. I can't stop shaking. Like the worst flu."],
      key: true,
    },
    {
      id: 'urine',
      topics: ['urine', 'wee', 'toilet', 'pass water'],
      answers: ["I've hardly been today. What comes out is dark."],
      key: true,
    },
    {
      id: 'pain',
      topics: ['pain', 'hurt', 'back', 'side'],
      answers: ['My left side, low in my back. Worse than yesterday.'],
      key: true,
    },
  ],
  actions: {
    'full-obs': {
      as: 'critical',
      rubric: 'observation',
      why: 'The full set gives a score of 7 or more: an emergency response.',
      within: { minutes: 5 },
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'A high score with signs of infection may be sepsis: it needs urgent review (minutes matter).',
      within: { minutes: 8 },
      alt: ['call-outreach', 'emergency-call'],
    },
    'fluid-chart': {
      as: 'recommended',
      rubric: 'recognition',
      why: 'Passing very little urine is a sign the body is not coping.',
    },
    'collect-blood': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'The doctor asked for blood tests; as a senior healthcare assistant you are trained to take them.',
    },
    'send-specimen': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'Send the bloods straight away: results guide treatment.',
    },
    'record-obs': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'Record the observations and the score.',
    },
    stay: { as: 'recommended', rubric: 'safety', why: 'Stay until help arrives.' },
  },
  documentation: [
    ['temperature', 'temp', '38.9', 'fever'],
    ['blood pressure', 'bp', '98'],
    ['urine', 'output', '150'],
    ['score', 'news'],
  ],
  results: {
    specimens: {
      blood: {
        minutes: 15,
        results: [
          {
            test: 'White cell count',
            value: 19.2,
            unit: '×10⁹/L',
            low: 4,
            high: 11,
            meaning: 'Raised (for the doctor).',
          },
          {
            test: 'Lactate',
            value: 3.4,
            unit: 'mmol/L',
            low: 0.5,
            high: 2,
            meaning: 'Raised: the doctor will act on this.',
          },
        ],
      },
    },
  },
  debrief: {
    summary:
      'Kofi showed signs that his infection was overwhelming his body: high temperature, fast pulse and breathing, low blood pressure and little urine. These need urgent escalation.',
    points: [
      'An infection plus a high early-warning score could be sepsis: escalate now, using the word "sepsis" is fine when reporting to the nurse.',
      'Low urine output is an important, easy-to-miss sign.',
      'Shivering with a high temperature ("rigors") is a warning sign.',
    ],
    terms: [
      {
        term: 'Sepsis',
        meaning:
          'A life-threatening reaction to an infection that harms the body’s own organs. Early treatment saves lives.',
      },
    ],
  },
  limit: 30,
})

export const STROKE_SIGNS = makeCase({
  id: 'stroke-signs',
  title: 'Soup on the tray',
  difficulty: 'advanced',
  type: 'Sudden weakness',
  room: 'bay',
  role: 1,
  patient: {
    id: 'RCH-310866',
    name: 'Patricia Lowe',
    age: 70,
    sex: 'female',
    build: 'average',
    skin: '#efcfb6',
    hair: '#a39b90',
    background: 'A retired solicitor, admitted with a urine infection; very sharp.',
    manner: 'Speech now slurred; frustrated.',
    callMe: 'Pat',
    allergies: [],
    history: ['Urine infection', 'Irregular heartbeat (atrial fibrillation)'],
  },
  presentation: 'At lunch, Pat has spilled her soup and is speaking oddly.',
  background: 'Irregular heartbeat. Was fully well at 12:00 when her tray arrived.',
  task: {
    from: 'Lena Novak (HCA)',
    text: "Pat in 4A-2's talking funny and dropped her spoon. Can you come?",
  },
  objectives: [
    'Check face, arms and speech',
    'Call for help immediately',
    'Note when it started',
    'Nothing by mouth',
  ],
  phases: [
    {
      id: 'fast',
      vitals: V(18, 96, 36.8, '182/98', 90, true, 0),
      looks:
        'Pat’s left arm is lying still on the tray; soup has spilled down her front.',
      mood: 'frustrated, frightened',
      says: "M' arm... s'not working.",
      concerning: true,
      findings: {
        'look-face':
          'The left side of her face droops when she smiles, her left arm drifts down, and her speech is slurred.',
      },
    },
    {
      id: 'team',
      vitals: V(18, 96, 36.8, '176/96', 88, true, 0),
      looks: 'The stroke team have arrived and are taking her for a scan.',
      mood: 'frightened',
    },
  ],
  start: 'fast',
  rules: [
    {
      id: 'buzzer',
      from: ['fast'],
      to: 'team',
      done: 'emergency-call',
      event: 'The emergency team arrive; the doctor calls the stroke team.',
    },
    {
      id: 'told',
      from: ['fast'],
      to: 'team',
      done: 'tell-nurse',
      event: 'Owen comes, sees her and calls the stroke team.',
    },
  ],
  facts: [
    {
      id: 'when',
      topics: ['when', 'start', 'how long', 'time'],
      answers: ['When... soup came. Ten minutes?'],
      key: true,
    },
    {
      id: 'feel',
      topics: ['how are you', 'feeling', 'feel'],
      answers: ["Can't... move my arm. Words won't come."],
      key: true,
    },
  ],
  actions: {
    'look-face': {
      as: 'critical',
      rubric: 'recognition',
      why: 'Face, Arms, Speech: if any are affected, it is Time to call for help (FAST).',
      within: { minutes: 5 },
    },
    'emergency-call': {
      as: 'critical',
      rubric: 'escalation',
      why: 'A possible stroke is an emergency: treatment works best in the first hours.',
      within: { minutes: 5 },
      alt: ['tell-nurse'],
    },
    'offer-drink': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Her swallow may be affected: nothing by mouth until it has been checked.',
    },
    'nbm-sign': {
      as: 'recommended',
      rubric: 'safety',
      why: 'Make sure no one gives her food or drink.',
    },
    'write-note': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'The time it started is vital for the stroke team.',
    },
    stay: {
      as: 'recommended',
      rubric: 'safety',
      why: 'Stay with her: reassure her and watch for changes.',
    },
  },
  documentation: [
    ['face', 'droop'],
    ['arm', 'weak'],
    ['speech', 'slurred'],
    ['time', 'started', '12', 'minutes'],
  ],
  debrief: {
    summary:
      'Pat showed sudden signs of a possible stroke. Spotting it fast and calling for help immediately gives her the best chance.',
    points: [
      'FAST: Face drooping, Arm weakness, Speech difficulty, Time to call for help.',
      'Note exactly when symptoms started.',
      'Nothing by mouth: a stroke can affect swallowing.',
    ],
    terms: [
      {
        term: 'Stroke',
        meaning:
          'When blood supply to part of the brain is cut off or bleeds; it needs emergency care.',
      },
    ],
  },
  limit: 20,
})

export const ALLERGIC_REACTION = makeCase({
  id: 'allergic-reaction',
  title: 'Itchy after the drip',
  difficulty: 'expert',
  type: 'Allergic reaction',
  room: 'bay',
  role: 2,
  patient: {
    id: 'RCH-310902',
    name: 'Liam Carter',
    age: 34,
    sex: 'male',
    build: 'average',
    skin: '#f0c9a8',
    hair: '#9c5a2a',
    background:
      'A chef, admitted with an infected hand; his first dose of a new antibiotic started ten minutes ago.',
    manner: 'Talkative, then frightened.',
    callMe: 'Liam',
    allergies: [],
    history: ['Infected right hand'],
  },
  presentation: 'Liam calls you: he is itchy and his lips feel strange.',
  background: 'First dose of an antibiotic infusion started at 10:20.',
  task: {
    from: 'Liam (4B-3)',
    text: "Hey, sorry, my skin's gone really itchy. Is that normal?",
  },
  objectives: [
    'Recognise a serious allergic reaction',
    'Call for help immediately',
    'Stay with him',
    'Report the drip (do not touch it yourself)',
  ],
  phases: [
    {
      id: 'rash',
      vitals: V(24, 94, 37.0, '102/60', 116, true, 0),
      looks: 'Liam has raised red blotches on his neck and arms. His lips look puffy.',
      mood: 'anxious',
      concerning: true,
    },
    {
      id: 'anaphylaxis',
      vitals: V(30, 89, 37.0, '78/40', 138, false, 0),
      looks:
        'Liam is wheezing, his lips and tongue are swollen, and he is barely responding.',
      mood: 'collapsing',
      concerning: true,
    },
    {
      id: 'team',
      vitals: V(20, 96, 37.0, '112/70', 102, true, 0),
      looks: 'The emergency team are treating Liam; Owen stopped the infusion.',
      mood: 'shaken',
    },
  ],
  start: 'rash',
  rules: [
    {
      id: 'worse',
      from: ['rash'],
      to: 'anaphylaxis',
      notDone: { action: 'emergency-call', within: 4 },
      event: 'Liam’s reaction is getting worse fast.',
    },
    {
      id: 'buzzer',
      from: ['rash', 'anaphylaxis'],
      to: 'team',
      done: 'emergency-call',
      event: 'The emergency team arrive within a minute.',
    },
    {
      id: 'told',
      from: ['rash', 'anaphylaxis'],
      to: 'team',
      done: 'tell-nurse',
      event: 'Owen comes, stops the infusion and calls the emergency team.',
    },
  ],
  facts: [
    {
      id: 'throat',
      topics: ['throat', 'breath', 'breathing', 'swallow'],
      answers: ['My throat feels... tight.'],
      key: true,
    },
    {
      id: 'itch',
      topics: ['itch', 'rash', 'skin', 'how are you', 'feeling'],
      answers: ['Itchy all over. My lips feel huge.'],
      key: true,
    },
    {
      id: 'when',
      topics: ['when', 'start', 'drip'],
      answers: ['Since the drip started, maybe five minutes.'],
      key: true,
    },
  ],
  actions: {
    'emergency-call': {
      as: 'critical',
      rubric: 'escalation',
      why: 'Swelling of the lips and throat with a rash after a new medicine may be anaphylaxis: call for help immediately.',
      within: { minutes: 3 },
      alt: ['tell-nurse'],
    },
    stay: {
      as: 'critical',
      rubric: 'safety',
      why: 'Never leave someone with a severe allergic reaction alone.',
    },
    'full-obs': {
      as: 'recommended',
      rubric: 'observation',
      why: 'Observations show how serious it is.',
    },
    'sit-up': {
      as: 'recommended',
      rubric: 'safety',
      why: 'Sitting up can help breathing (lying flat with legs raised if they feel faint).',
    },
    'help-walk': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Standing up during a serious reaction can make blood pressure collapse.',
    },
  },
  documentation: [
    ['rash', 'blotch', 'hives'],
    ['lips', 'swelling', 'swollen'],
    ['drip', 'antibiotic', 'infusion'],
    ['emergency', 'buzzer', 'called'],
  ],
  debrief: {
    summary:
      'Liam was having a serious allergic reaction to a new medicine. The life-saving step is calling for help at once; the drip is stopped by the nurse.',
    points: [
      'Rash, swelling of lips/tongue/throat, wheeze or faintness after a new medicine: call for help immediately.',
      'Do not leave them. Do not walk them.',
      'Stopping an infusion and giving treatment are for registered staff: say clearly what the drip is.',
    ],
    terms: [
      {
        term: 'Anaphylaxis',
        meaning:
          'A severe, life-threatening allergic reaction affecting breathing or circulation.',
      },
    ],
  },
  limit: 20,
})

export const BLEEDING_WOUND = makeCase({
  id: 'bleeding-wound',
  title: 'Through the dressing',
  difficulty: 'intermediate',
  type: 'Bleeding',
  room: 'bay',
  role: 0,
  patient: {
    id: 'RCH-310955',
    name: 'Hannah Moss',
    age: 41,
    sex: 'female',
    build: 'average',
    skin: '#ead0bd',
    hair: '#b8873f',
    background:
      'A dentist, back from having a skin lump removed from her forearm this morning.',
    manner: 'Calm, practical, a bit squeamish about her own blood.',
    callMe: 'Hannah',
    allergies: [{ substance: 'Latex', reaction: 'itchy rash' }],
    history: [
      'Skin lump removed from the left forearm today',
      'Irregular heartbeat, on a blood thinner',
    ],
  },
  presentation: 'Hannah notices blood coming through her dressing.',
  background:
    'On a blood thinner (held yesterday). Allergic to latex: use latex-free gloves.',
  task: { from: 'Hannah (4B-6)', text: "Sorry, I think my arm's bleeding through." },
  objectives: [
    'Put on (latex-free) gloves',
    'Apply firm pressure',
    'Get the nurse',
    'Watch for signs of blood loss',
  ],
  phases: [
    {
      id: 'oozing',
      vitals: V(18, 98, 36.8, '118/72', 96, true, 2),
      looks: 'Blood is soaking through the dressing on Hannah’s left forearm.',
      mood: 'squeamish',
      concerning: true,
    },
    {
      id: 'bleeding',
      vitals: V(22, 97, 36.7, '104/64', 112, true, 2),
      looks: 'Blood is dripping onto the sheet. Hannah looks pale.',
      mood: 'faint',
      concerning: true,
    },
    {
      id: 'controlled',
      vitals: V(18, 98, 36.8, '116/72', 94, true, 2),
      looks:
        'Owen has redressed the wound and called the surgeon to check it. The bleeding has stopped.',
      mood: 'relieved',
    },
  ],
  start: 'oozing',
  rules: [
    {
      id: 'worse',
      from: ['oozing'],
      to: 'bleeding',
      notDone: { action: 'pressure-on-wound', within: 5 },
      event: 'Without pressure, the bleeding gets heavier.',
    },
    {
      id: 'told',
      from: ['oozing', 'bleeding'],
      to: 'controlled',
      done: 'tell-nurse',
      event: 'Owen comes and takes over.',
    },
    {
      id: 'buzzer',
      from: ['bleeding'],
      to: 'controlled',
      done: 'emergency-call',
      event: 'Help arrives and takes over.',
    },
  ],
  facts: [
    {
      id: 'thinner',
      topics: ['blood thinner', 'medication', 'medicines', 'tablets', 'warfarin'],
      answers: ['I take a blood thinner for my heart rhythm. They stopped it yesterday.'],
      key: true,
      inNotes: true,
    },
    {
      id: 'dizzy',
      topics: ['dizzy', 'faint', 'how are you', 'feeling'],
      answers: ['A bit light-headed, honestly.'],
      key: true,
    },
    {
      id: 'when',
      topics: ['when', 'notice', 'start'],
      answers: ['Just now, I felt it warm.'],
    },
  ],
  actions: {
    gloves: {
      as: 'critical',
      rubric: 'infection',
      why: 'Protect yourself from blood: and for Hannah, the gloves must be latex-free.',
    },
    'pressure-on-wound': {
      as: 'critical',
      rubric: 'safety',
      why: 'Firm, direct pressure is the first thing to do for bleeding.',
      within: { minutes: 4 },
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'Bleeding after a procedure, on a blood thinner, needs the nurse.',
      within: { minutes: 6 },
      alt: ['emergency-call'],
    },
    'full-obs': {
      as: 'recommended',
      rubric: 'observation',
      why: 'Pulse and blood pressure show whether she has lost much blood.',
    },
    stay: { as: 'recommended', rubric: 'safety', why: 'Keep pressure on and stay.' },
  },
  documentation: [
    ['bleed', 'blood'],
    ['pressure'],
    ['forearm', 'arm', 'dressing'],
    ['thinner', 'anticoag'],
  ],
  debrief: {
    summary:
      'Hannah’s wound was bleeding, more so because of her blood thinner. Gloves (latex-free), firm pressure and calling the nurse are the steps.',
    points: [
      'Direct, firm pressure stops most bleeding.',
      'Check allergies even for gloves: latex allergy is common.',
      'A rising pulse and falling blood pressure mean significant blood loss.',
    ],
    terms: [
      {
        term: 'Latex allergy',
        meaning: 'An allergy to natural rubber, found in some gloves and equipment.',
      },
    ],
  },
  limit: 20,
})

export const NIGHT_HANDOVER = makeCase({
  id: 'night-handover',
  title: 'The chart that crept up',
  difficulty: 'expert',
  type: 'Handover and prioritising',
  room: 'bay',
  role: 3,
  patient: {
    id: 'RCH-310988',
    name: 'Walter Grant',
    age: 79,
    sex: 'male',
    build: 'slight',
    skin: '#dcb79c',
    hair: '#e0ddd8',
    background: 'A retired accountant, admitted with a chest infection three days ago.',
    manner: 'Understated: "Not too bad."',
    callMe: 'Walter',
    allergies: [],
    history: ['Chest infection', 'Heart failure'],
  },
  presentation: 'At morning handover, you review Walter’s overnight chart.',
  background: 'Night scores: 1 at 22:00, 3 at 02:00, 5 at 06:00. No escalation recorded.',
  task: {
    from: 'Night nurse',
    text: "Walter in 4A-1's been fine, a bit restless. Obs are on the chart.",
  },
  objectives: [
    'Read the chart and spot the trend',
    'Take a fresh set of observations',
    'Escalate to outreach',
    'Give a clear handover with a plan',
  ],
  phases: [
    {
      id: 'drifting',
      vitals: V(23, 93, 38.0, '102/62', 106, true, 1),
      looks: 'Walter is propped up, a little breathless, picking at his breakfast.',
      mood: 'understated',
      concerning: true,
      findings: {
        'read-notes':
          'Overnight chart: score 1 at 22:00, 3 at 02:00, 5 at 06:00. "Restless" written twice. No escalation documented.',
      },
    },
    {
      id: 'worse',
      vitals: V(27, 91, 38.4, '94/58', 118, false, 1),
      looks: 'Walter is now muddled and breathing fast.',
      mood: 'muddled',
      concerning: true,
    },
    {
      id: 'reviewed',
      vitals: V(20, 95, 37.8, '110/66', 98, true, 1),
      looks: 'The outreach team have reviewed Walter and agreed a plan with the doctor.',
      mood: 'settled',
    },
  ],
  start: 'drifting',
  rules: [
    {
      id: 'worse',
      from: ['drifting'],
      to: 'worse',
      notDone: { action: 'call-outreach', within: 15 },
      event: 'Walter deteriorates further.',
    },
    {
      id: 'outreach',
      from: ['drifting', 'worse'],
      to: 'reviewed',
      done: 'call-outreach',
      event: 'The outreach team come and review him.',
    },
    {
      id: 'told',
      from: ['drifting', 'worse'],
      to: 'reviewed',
      done: 'tell-nurse',
      event: 'The nurse calls outreach.',
    },
  ],
  facts: [
    {
      id: 'feel',
      topics: ['how are you', 'feeling', 'feel', 'night'],
      answers: ['Not too bad. Bit short of breath since the night. Didn’t sleep.'],
      key: true,
    },
    { id: 'pain', topics: ['pain', 'chest', 'hurt'], answers: ['No pain. Just tired.'] },
  ],
  actions: {
    'read-notes': {
      as: 'critical',
      rubric: 'recognition',
      why: 'The trend is the warning: scores rising from 1 to 5 over the night.',
    },
    'full-obs': {
      as: 'critical',
      rubric: 'observation',
      why: 'Get a fresh set now: do not rely on the 06:00 numbers.',
      within: { minutes: 10 },
    },
    'call-outreach': {
      as: 'critical',
      rubric: 'escalation',
      why: 'A score of 5 or more with a rising trend needs urgent review by the outreach team.',
      within: { minutes: 10 },
      alt: ['tell-nurse'],
    },
    handover: {
      as: 'critical',
      rubric: 'responsibilities',
      why: 'A clear handover with the trend and the plan keeps the next shift safe.',
    },
    'record-obs': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'Record the new set.',
    },
  },
  documentation: [
    ['trend', 'rising', 'going up', 'increas', 'crept'],
    ['score', 'news'],
    ['outreach'],
    ['plan', 'repeat', 'hourly', 'review'],
  ],
  debrief: {
    summary:
      'Walter’s chart crept up all night without anyone escalating. A coordinator’s job is to see the trend, act on it, and hand over a clear plan.',
    points: [
      'Look at the trend, not only the latest number.',
      '"Restless" can be the first sign of getting worse.',
      'Handovers should include the score, the trend, what was done and the plan.',
    ],
    terms: [
      {
        term: 'Outreach team',
        meaning:
          'Experienced nurses who help wards care for patients who are getting worse.',
      },
    ],
  },
  limit: 30,
})

export const ABDOMINAL_PAIN = makeCase({
  id: 'abdominal-pain',
  title: 'Down on the right',
  difficulty: 'advanced',
  type: 'Abdominal pain',
  room: 'emergency',
  role: 1,
  patient: {
    id: 'RCH-311021',
    name: 'Ben Hollis',
    age: 29,
    sex: 'male',
    build: 'average',
    skin: '#c48d68',
    hair: '#2b1d14',
    background:
      'A delivery driver, brought to the assessment room with tummy pain since last night.',
    manner: 'Curled up, short answers.',
    callMe: 'Ben',
    allergies: [],
    history: ['None'],
  },
  presentation: 'Ben is curled up with tummy pain.',
  background: 'Waiting for the surgical doctor. Nil by mouth until seen.',
  task: {
    from: NURSE,
    text: 'Ben in the assessment room has tummy pain. Can you do his obs while we wait for the surgeons?',
  },
  objectives: [
    'Ask about the pain',
    'Full observations and a pain score',
    'Keep him nil by mouth',
    'Escalate a fever and fast pulse',
  ],
  phases: [
    {
      id: 'pain',
      vitals: V(22, 97, 38.1, '118/74', 112, true, 8),
      looks: 'Ben is lying still on his side with his knees pulled up.',
      mood: 'in pain',
      says: 'Please... it really hurts.',
      concerning: true,
    },
    {
      id: 'seen',
      vitals: V(20, 97, 38.0, '120/76', 104, true, 6),
      looks: 'The surgical doctor is examining Ben.',
      mood: 'in pain, calmer',
    },
  ],
  start: 'pain',
  rules: [
    {
      id: 'told',
      from: ['pain'],
      to: 'seen',
      done: 'tell-nurse',
      event: 'Owen asks the surgical doctor to see Ben now.',
    },
  ],
  facts: [
    {
      id: 'where',
      topics: ['where', 'point', 'pain', 'hurt'],
      answers: ['Started round my belly button, now it’s down here on the right.'],
      key: true,
    },
    {
      id: 'when',
      topics: ['when', 'start', 'how long'],
      answers: ['Since last night.'],
      key: true,
    },
    {
      id: 'sick',
      topics: ['sick', 'vomit', 'nausea', 'throw up'],
      answers: ['Been sick twice.'],
      key: true,
    },
    {
      id: 'eat',
      topics: ['eat', 'eaten', 'food', 'drink'],
      answers: ["Nothing since yesterday lunch. Couldn't face it."],
    },
  ],
  actions: {
    'full-obs': {
      as: 'critical',
      rubric: 'observation',
      why: 'A temperature and a fast pulse with tummy pain need the doctor to know.',
      within: { minutes: 6 },
    },
    'obs-pain': {
      as: 'critical',
      rubric: 'observation',
      why: 'A pain score lets the team see if pain relief is needed and working.',
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'Severe pain, fever and a fast pulse: tell the nurse so the doctor sees him sooner.',
      within: { minutes: 10 },
      alt: ['emergency-call'],
    },
    'offer-drink': {
      as: 'harmful',
      rubric: 'safety',
      why: 'He may need an operation: nil by mouth until the surgeon says otherwise.',
    },
    'sick-bowl': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'He has been sick: a bowl and tissues within reach.',
    },
    'nbm-sign': {
      as: 'recommended',
      rubric: 'safety',
      why: 'Make it clear to everyone he is nil by mouth.',
    },
  },
  documentation: [['pain'], ['right'], ['sick', 'vomit'], ['temperature', 'fever', '38']],
  debrief: {
    summary:
      'Ben had pain that moved to the lower right, with fever and vomiting. The doctor will decide the cause; your job is accurate observations, comfort and nil by mouth.',
    points: [
      'Ask where the pain started and where it is now.',
      'Keep possible surgical patients nil by mouth until a doctor says otherwise.',
      'Report fever and a fast pulse with severe pain.',
    ],
    terms: [
      {
        term: 'Pain score',
        meaning: 'The patient rates their pain from 0 (none) to 10 (worst imaginable).',
      },
    ],
  },
  limit: 25,
})
