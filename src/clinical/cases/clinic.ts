/**
 * Clinic, collection-area and isolation cases. Fictional; simplified for
 * learning; not clinical guidance.
 */
import { makeCase, NURSE, V } from './base'

export const ISOLATION_STOOL = makeCase({
  id: 'isolation-stool',
  title: 'The side room',
  difficulty: 'beginner',
  type: 'Infection prevention',
  room: 'side-room',
  role: 0,
  patient: {
    id: 'RCH-311064',
    name: 'Samuel Osei',
    age: 39,
    sex: 'male',
    build: 'average',
    skin: '#4f3222',
    hair: '#101010',
    background: 'A software tester, in the side room with diarrhoea since yesterday.',
    manner: 'Embarrassed and tired.',
    callMe: 'Sam',
    allergies: [],
    history: ['Diarrhoea since yesterday (cause not known yet)'],
  },
  presentation: 'Sam in the side room needs a stool sample collected.',
  background:
    'In isolation (contact precautions) until the cause is known. Sign on the door.',
  task: {
    from: NURSE,
    text: 'Sam in side room 2 needs a stool sample sent, and his fluid chart updating.',
  },
  objectives: [
    'Put on the right protective equipment before going in',
    'Collect and send the sample',
    'Check how much he is drinking',
    'Clean your hands with soap and water on the way out',
  ],
  phases: [
    {
      id: 'stable',
      vitals: V(18, 97, 37.6, '118/74', 94, true, 2),
      looks: 'Sam is lying on the bed looking washed out. A commode is in the corner.',
      mood: 'embarrassed, tired',
    },
  ],
  start: 'stable',
  rules: [],
  facts: [
    {
      id: 'times',
      topics: ['how many', 'how often', 'times'],
      answers: ['Six times since this morning.'],
      key: true,
    },
    { id: 'blood', topics: ['blood'], answers: ['No blood, no.'], key: true },
    {
      id: 'drink',
      topics: ['drink', 'drinking', 'fluids', 'water'],
      answers: ["I'm trying, but it goes straight through me."],
      key: true,
    },
    {
      id: 'food',
      topics: ['eat', 'ate', 'food', 'takeaway'],
      answers: ['I had a takeaway two days ago. My flatmate is ill too.'],
    },
  ],
  actions: {
    'isolation-ppe': {
      as: 'critical',
      rubric: 'infection',
      why: 'Gown and gloves before entering a side room with suspected infectious diarrhoea.',
      within: { minutes: 3 },
    },
    'hand-hygiene': {
      as: 'critical',
      rubric: 'infection',
      why: 'Some bugs that cause diarrhoea are not killed by alcohol gel: wash with soap and water too.',
    },
    'collect-stool': {
      as: 'critical',
      rubric: 'responsibilities',
      why: 'The sample tells the doctors what is causing it and whether others are at risk.',
    },
    'send-specimen': {
      as: 'critical',
      rubric: 'responsibilities',
      why: 'Label it in the room and send it promptly.',
    },
    'update-fluid-chart': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'With diarrhoea, fluid in and out matters.',
    },
    'offer-drink': {
      as: 'recommended',
      rubric: 'responsibilities',
      why: 'Encourage drinks to replace what he is losing.',
    },
    'full-obs': {
      as: 'recommended',
      rubric: 'observation',
      why: 'A fast pulse or low blood pressure can mean he is getting dehydrated.',
    },
  },
  documentation: [
    ['stool', 'diarrhoea', 'bowel'],
    ['sample', 'specimen', 'sent'],
    ['fluid', 'drink', 'intake'],
  ],
  results: {
    specimens: {
      stool: {
        minutes: 20,
        results: [
          {
            test: 'Stool toxin screen',
            value: 0,
            unit: '(negative)',
            low: 0,
            high: 0,
            meaning: 'Negative; the culture takes longer (for the doctor).',
          },
        ],
      },
    },
  },
  debrief: {
    summary:
      'Sam needed safe sampling in isolation: the right protective equipment, a correctly labelled sample, fluids, and soap-and-water hand washing.',
    points: [
      'Put on protective equipment before you go in, and take it off before you leave.',
      'Soap and water for diarrhoea: some germs survive alcohol gel.',
      'Label specimens at the bedside.',
    ],
    terms: [
      {
        term: 'Contact precautions',
        meaning:
          'Gown and gloves for anyone touching the patient or their surroundings, to stop germs spreading.',
      },
    ],
  },
  limit: 25,
})

export const URINE_SAMPLE = makeCase({
  id: 'urine-sample',
  title: 'A sample for the clinic',
  difficulty: 'beginner',
  type: 'Specimen collection',
  room: 'collection',
  role: 0,
  patient: {
    id: 'RCH-311102',
    name: 'Helen Clarke',
    age: 52,
    sex: 'female',
    build: 'average',
    skin: '#f1cfb4',
    hair: '#7b5534',
    background: 'A bank manager at the outpatient clinic for a urine test.',
    manner: 'Busy and in a hurry.',
    callMe: 'Helen',
    allergies: [{ substance: 'Nitrofurantoin', reaction: 'a rash' }],
    history: ['Repeated urine infections'],
  },
  presentation: 'Helen arrives at the collection area with a request form.',
  background: 'Request: urine for culture. Form details: Helen Clarke, 12 Nov 1974.',
  task: {
    from: 'Clinic reception',
    text: 'Helen Clarke is here for her urine sample. Form attached.',
  },
  objectives: [
    'Check identity against the form',
    'Explain how to give a clean sample',
    'Label at the point of collection',
    'Send it to the laboratory',
  ],
  phases: [
    {
      id: 'stable',
      vitals: V(14, 99, 36.7, '124/78', 76, true, 1),
      looks: 'Helen is checking her watch.',
      mood: 'hurried',
    },
  ],
  start: 'stable',
  rules: [],
  facts: [
    {
      id: 'symptoms',
      topics: ['symptoms', 'problem', 'why', 'how are you', 'sting'],
      answers: ['Stinging when I wee again. Third time this year.'],
      key: true,
    },
    {
      id: 'antibiotics',
      topics: ['antibiotics', 'medicine', 'tablets'],
      answers: ["I haven't started any yet. The GP wanted the sample first."],
      key: true,
    },
  ],
  actions: {
    'check-id': {
      as: 'critical',
      rubric: 'safety',
      why: 'Ask her to say her name and date of birth, and check them against the form, before collecting.',
    },
    consent: {
      as: 'recommended',
      rubric: 'conduct',
      why: 'Explain what a mid-stream sample is and check she is happy.',
    },
    'collect-urine': {
      as: 'critical',
      rubric: 'responsibilities',
      why: 'A clean mid-stream sample gives a reliable result.',
    },
    'send-specimen': {
      as: 'critical',
      rubric: 'responsibilities',
      why: 'Label at the point of collection, in front of the patient, and send.',
    },
    gloves: {
      as: 'recommended',
      rubric: 'infection',
      why: 'Gloves when handling body fluids.',
    },
  },
  documentation: [
    ['urine', 'sample'],
    ['label', 'labelled'],
    ['sent', 'lab', 'laboratory'],
  ],
  results: {
    specimens: {
      urine: {
        minutes: 20,
        results: [
          {
            test: 'Urine white cells',
            value: 80,
            unit: '/µL',
            low: 0,
            high: 10,
            meaning: 'Raised (for the clinic doctor; culture to follow).',
          },
        ],
      },
    },
  },
  debrief: {
    summary:
      'A routine sample done safely: right patient, right label, clean technique, sent promptly.',
    points: [
      'Ask, don’t tell: the patient says their own details.',
      'Label in front of the patient, never in advance.',
      'A mid-stream sample avoids contamination.',
    ],
    terms: [
      {
        term: 'MSU',
        meaning:
          'Mid-stream urine: the middle part of the flow, which is the cleanest sample.',
      },
    ],
  },
  limit: 20,
})

export const CLINIC_HIGH_BP = makeCase({
  id: 'clinic-high-bp',
  title: 'A headache in clinic',
  difficulty: 'intermediate',
  type: 'Outpatient observations',
  room: 'exam',
  role: 1,
  patient: {
    id: 'RCH-311145',
    name: 'Yusuf Demir',
    age: 58,
    sex: 'male',
    build: 'heavy',
    skin: '#c69872',
    hair: '#3d3d3d',
    background: 'A restaurant owner at the outpatient clinic for a routine check.',
    manner: 'Cheerful; plays things down.',
    callMe: 'Yusuf',
    allergies: [],
    history: ['High blood pressure (stopped his tablets last month)'],
  },
  presentation: 'Yusuf is in the examination room for a routine blood pressure check.',
  background:
    'Known high blood pressure. Clinic list note: "says he ran out of tablets."',
  task: {
    from: 'Clinic nurse',
    text: 'Can you do Yusuf’s blood pressure and weight before he sees the doctor?',
  },
  objectives: [
    'Measure blood pressure',
    'Ask about symptoms',
    'Report a very high reading straight away',
    'Document',
  ],
  phases: [
    {
      id: 'clinic',
      vitals: V(16, 98, 36.7, '196/112', 88, true, 5),
      looks: 'Yusuf is rubbing his temples.',
      mood: 'cheerful but uncomfortable',
      concerning: true,
    },
  ],
  start: 'clinic',
  rules: [],
  facts: [
    {
      id: 'headache',
      topics: ['headache', 'head', 'how are you', 'feeling', 'pain'],
      answers: ['Had a headache for two days. Probably the stress.'],
      key: true,
    },
    {
      id: 'vision',
      topics: ['vision', 'eyes', 'see', 'blurred', 'blurry'],
      answers: ['Now you mention it, things are a bit blurry.'],
      key: true,
    },
    {
      id: 'tablets',
      topics: ['tablets', 'medicine', 'medication', 'pills'],
      answers: ['I ran out last month. Been meaning to get more.'],
      key: true,
    },
  ],
  actions: {
    'obs-bp': {
      as: 'critical',
      rubric: 'observation',
      why: 'The reason he is here; a very high reading should be checked again after a few minutes’ rest.',
    },
    'tell-nurse': {
      as: 'critical',
      rubric: 'escalation',
      why: 'A very high blood pressure with headache and blurred vision needs a nurse or doctor now, not at the end of clinic.',
      within: { minutes: 10 },
    },
    'write-note': {
      as: 'recommended',
      rubric: 'documentation',
      why: 'Record the readings and the symptoms.',
    },
    'help-walk': {
      as: 'unnecessary',
      rubric: 'safety',
      why: 'Sending him back to the waiting room before he is seen delays his care.',
    },
  },
  documentation: [
    ['blood pressure', 'bp'],
    ['196', '112'],
    ['headache'],
    ['vision', 'blurr'],
  ],
  debrief: {
    summary:
      'Yusuf’s blood pressure was very high with headache and blurred vision. Some findings cannot wait for the end of clinic.',
    points: [
      'Repeat a very high reading after rest, then report it.',
      'Ask about headache, vision, chest pain: they make it urgent.',
      'Find out why: here, he had stopped his tablets.',
    ],
    terms: [
      {
        term: 'Blood pressure',
        meaning:
          'The pressure of blood in the arteries; the top number when the heart beats, the bottom when it rests.',
      },
    ],
  },
  limit: 20,
})

export const FAINT_COLLECTION = makeCase({
  id: 'faint-collection',
  title: 'After the blood test',
  difficulty: 'intermediate',
  type: 'Fainting',
  room: 'collection',
  role: 2,
  patient: {
    id: 'RCH-311188',
    name: 'Chloe Martin',
    age: 23,
    sex: 'female',
    build: 'slight',
    skin: '#f4d6c0',
    hair: '#c9a15e',
    background:
      'A student nurse herself, in for a routine blood test before starting a placement.',
    manner: 'Apologetic and embarrassed.',
    callMe: 'Chloe',
    allergies: [],
    history: ['None'],
  },
  presentation:
    'Just after you take Chloe’s blood, she goes pale and says she feels faint.',
  background: 'Routine blood test. Sitting in the phlebotomy chair.',
  task: {
    from: 'Collection area',
    text: '*Chloe goes white.* "I don\'t feel very well..."',
  },
  objectives: [
    'Lie her down with legs raised',
    'Stay with her',
    'Check observations as she recovers',
    'Find out why it happened',
  ],
  phases: [
    {
      id: 'faint',
      vitals: V(14, 98, 36.6, '88/52', 52, true, 0),
      looks: 'Chloe is white and sweaty, swaying in the chair.',
      mood: 'faint',
      concerning: true,
    },
    {
      id: 'recovering',
      vitals: V(14, 98, 36.6, '98/60', 62, true, 0),
      looks: 'Lying down with her legs raised, Chloe’s colour is coming back.',
      mood: 'embarrassed',
    },
    {
      id: 'recovered',
      vitals: V(14, 99, 36.6, '110/70', 72, true, 0),
      looks: 'Chloe is sitting up slowly and feels better.',
      mood: 'embarrassed, better',
      says: "Sorry! That's so embarrassing.",
    },
    {
      id: 'fallen',
      vitals: V(14, 98, 36.6, '86/50', 50, false, 0),
      looks: 'Chloe slumps sideways out of the chair and bumps her head on the floor.',
      mood: 'dazed',
      concerning: true,
    },
  ],
  start: 'faint',
  rules: [
    {
      id: 'lie',
      from: ['faint'],
      to: 'recovering',
      done: 'lie-down',
      event: 'Lying flat with her legs up, Chloe starts to recover.',
    },
    {
      id: 'better',
      from: ['recovering'],
      to: 'recovered',
      after: 5,
      event: 'Chloe has recovered.',
    },
    {
      id: 'falls',
      from: ['faint'],
      to: 'fallen',
      notDone: { action: 'lie-down', within: 3 },
      event: 'Chloe faints and falls from the chair.',
    },
    {
      id: 'help',
      from: ['fallen'],
      to: 'recovering',
      done: 'emergency-call',
      event: 'Help arrives; they check her head and lie her flat.',
    },
  ],
  facts: [
    {
      id: 'eaten',
      topics: ['eat', 'eaten', 'breakfast', 'food'],
      answers: ['No breakfast. I was nervous.'],
      key: true,
    },
    {
      id: 'before',
      topics: ['before', 'happened', 'fainted', 'again'],
      answers: ['Once, at the dentist.'],
      key: true,
    },
    {
      id: 'feel',
      topics: ['how are you', 'feeling', 'feel'],
      answers: ['Hot, dizzy, sick.'],
      phases: ['faint'],
    },
  ],
  actions: {
    'lie-down': {
      as: 'critical',
      rubric: 'safety',
      why: 'Lie someone who is fainting flat with their legs raised: it brings blood back to the brain and stops a fall.',
      within: { minutes: 2 },
    },
    stay: {
      as: 'critical',
      rubric: 'safety',
      why: 'Do not leave someone who has fainted.',
    },
    'full-obs': {
      as: 'recommended',
      rubric: 'observation',
      why: 'Check pulse and blood pressure as she recovers.',
    },
    'offer-drink': {
      as: 'optional',
      rubric: 'responsibilities',
      why: 'Once fully recovered, a drink and a snack help.',
    },
    'help-walk': {
      as: 'harmful',
      rubric: 'safety',
      why: 'Standing up too soon after a faint can bring it straight back.',
    },
    'tell-nurse': {
      as: 'recommended',
      rubric: 'escalation',
      why: 'Let the nurse know, and document it; if she hit her head, she needs checking.',
    },
  },
  documentation: [
    ['faint', 'vasovagal', 'dizzy'],
    ['lay', 'lie', 'legs raised', 'flat'],
    ['breakfast', 'eaten', 'food'],
  ],
  debrief: {
    summary:
      'Chloe had a simple faint after a blood test. Lying her flat quickly prevents a fall and a head injury.',
    points: [
      'At the first sign of fainting, lie them flat with legs raised.',
      'Stay, and let them sit up slowly.',
      'Ask about food and previous faints: it helps next time.',
    ],
    terms: [
      {
        term: 'Vasovagal faint',
        meaning:
          'A common, usually harmless faint triggered by things like needles, pain or standing too long.',
      },
    ],
  },
  limit: 20,
})
