import type { AssignmentInput } from '../../schemas'
import { solvedState } from '../../../clinical/ward'
import { ward } from './common'

/**
 * Healthcare: patient cases at the bedside (Ward Systems → Patient cases).
 * One task per level, each passed by passing real cases: the player talks to
 * the patient, takes observations, recognises and escalates, and documents;
 * the case is scored and debriefed. Fictional patients; simulation only.
 */

const feedback = (good: string) => ({
  excellent: `Hi {name},

${good}

Grace`,
  good: `Hi {name},

Good care. Read the debrief for the details to tighten.

Grace`,
  pass: `Hi {name},

Safe enough, but not yet the care I want on this ward. Go through the debrief and try the cases again.

Grace`,
  fail: `Hi {name},

Not yet. Open Patient cases, read the debrief of your last attempt, and try again: you can replay as often as you like.

Grace`,
})

const firstStart = ward()

export const wardFirstCase: AssignmentInput = {
  id: 'ward-first-case',
  version: 1,
  careerId: 'healthcare',
  levelId: 'healthcare-trainee',
  order: 2,
  kind: 'tool',
  title: 'Your first patients',
  summary:
    'Two patient cases at the bedside: morning observations, and a sample for the clinic.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Your first patients',
    body: `Hi {name},

Records are only half the job. Today you look after patients yourself. In **Ward Systems**, open **Patient cases**:

1. **Morning observations**: Maggie is due her observations. Introduce yourself, check who she is, ask how she is, take a full set and record it.
2. **A sample for the clinic**: Helen needs a urine sample taken and sent.

Talk to each patient in your own words, use the bedside equipment, and press **Finish case** when you are done. Every case ends with a score and a debrief, and I will tell you how you did. You can replay a case as often as you like; your best attempt counts.

Remember: you observe, record, care and tell us. Diagnosing and medicines are for the nurses and doctors.

Grace`,
  },
  whyItMatters:
    'Most of what keeps patients safe happens at the bedside: a proper introduction, the right patient, a complete set of observations, and a clear record.',
  objectives: [
    'Introduce yourself, check identity and ask permission',
    'Take and record a complete set of observations',
    'Collect, label and send a specimen safely',
  ],
  steps: [
    {
      id: 'open',
      title: 'Open Patient cases',
      instructions:
        'In **Ward Systems**, open the **Patient cases** tab and choose **Morning observations**.',
    },
    {
      id: 'maggie',
      title: 'Look after Maggie',
      instructions:
        'Talk to her (type in the conversation box), use **Observations** and **Documentation** actions, then **Finish case**.',
      hint: 'A full set of observations, recorded on the chart, is what this case is about.',
    },
    {
      id: 'helen',
      title: 'Helen’s sample',
      instructions:
        'Start **A sample for the clinic**: check her identity against the form, collect, label and send.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'clinical',
    title: 'Ward Systems: your first patients',
    start: firstStart,
    solution: solvedState(
      solvedState(firstStart, 'routine-obs', 'beginner', 'healthcare-trainee'),
      'urine-sample',
      'beginner',
      'healthcare-trainee',
    ),
    checks: [
      {
        id: 'maggie',
        type: 'case',
        case: 'routine-obs',
        difficulty: 'beginner',
        title: 'Morning observations: passed',
        points: 60,
        why: 'Complete, recorded observations are the baseline that shows when a patient changes.',
        hint: 'Take a full set of observations and record them on the chart. Read the debrief to see what was missed.',
      },
      {
        id: 'helen',
        type: 'case',
        case: 'urine-sample',
        difficulty: 'beginner',
        title: 'A sample for the clinic: passed',
        points: 40,
        why: 'The right patient, the right label, sent promptly: otherwise the result is worthless, or dangerous.',
        hint: 'Check her identity against the form before collecting, and send the labelled sample.',
      },
    ],
  },
  passScore: 70,
  xp: 100,
  skills: { 'clinical-observation': 30, 'patient-safety': 30, 'customer-service': 20 },
  feedback: feedback(
    'Both patients were safe and well looked after. Maggie told me you were "a proper professional".',
  ),
}

const deteriorStart = ward((s) => ({ ...s, clock: 10 * 60 }))

export const wardDeteriorating: AssignmentInput = {
  id: 'ward-deteriorating',
  version: 1,
  careerId: 'healthcare',
  levelId: 'healthcare-assistant',
  order: 6,
  kind: 'tool',
  title: 'When a patient gets worse',
  summary:
    'Two patient cases where the patient deteriorates: recognise it and escalate in time.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Patients who get worse',
    body: `Hi {name},

Now the hardest and most important skill: noticing when a patient is getting worse, and saying so quickly. In **Patient cases**, at **intermediate** level or harder:

1. **Faint after surgery**: Dan, the day after his hip operation.
2. **Not herself today**: Edie, who seems muddled.

The patients will change while you are with them, whether you act or not. When you escalate, use SBAR and give the numbers. If you are worried, tell Owen: that is never wrong.

Grace`,
  },
  whyItMatters:
    'Patients almost always show they are getting worse before they collapse. Recognising it and escalating early is what support staff do that saves lives.',
  objectives: [
    'Recognise the signs of deterioration',
    'Escalate quickly with SBAR',
    'Keep the patient safe until help arrives',
  ],
  steps: [
    {
      id: 'dan',
      title: 'Dan',
      instructions:
        'Start **Faint after surgery** at intermediate or harder. Watch him, measure, look, and escalate.',
    },
    {
      id: 'edie',
      title: 'Edie',
      instructions:
        'Start **Not herself today**. She cannot tell you much: the notes can.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'clinical',
    title: 'Ward Systems: patients who get worse',
    start: deteriorStart,
    solution: solvedState(
      solvedState(deteriorStart, 'postop-bleed', 'intermediate', 'healthcare-assistant'),
      'confused-fever',
      'intermediate',
      'healthcare-assistant',
    ),
    checks: [
      {
        id: 'dan',
        type: 'case',
        case: 'postop-bleed',
        difficulty: 'intermediate',
        title: 'Faint after surgery: passed',
        points: 50,
        why: 'A fast pulse and falling blood pressure after surgery can mean bleeding: minutes matter.',
        hint: 'When he says he feels faint: full observations, look at the wound, and tell the nurse straight away.',
      },
      {
        id: 'edie',
        type: 'case',
        case: 'confused-fever',
        difficulty: 'intermediate',
        title: 'Not herself today: passed',
        points: 50,
        why: 'New confusion is a red flag, never "just her age".',
        hint: 'Read the notes to see that the confusion is new, take a full set, and escalate.',
      },
    ],
  },
  passScore: 70,
  xp: 140,
  skills: {
    'clinical-observation': 35,
    'patient-safety': 35,
    'clinical-documentation': 20,
  },
  feedback: feedback(
    'You saw both of them getting worse and told us in time. Dan went back to theatre and is fine; Edie is on the right antibiotics. That is the job.',
  ),
}

const emergencyStart = ward((s) => ({ ...s, clock: 14 * 60 }))

export const wardEmergencies: AssignmentInput = {
  id: 'ward-emergencies',
  version: 1,
  careerId: 'healthcare',
  levelId: 'senior-healthcare-assistant',
  order: 8,
  kind: 'tool',
  title: 'Emergencies on the ward',
  summary:
    'Two emergencies at advanced level: chest pain, and signs of serious infection.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Emergencies',
    body: `Hi {name},

As a senior healthcare assistant, you will often be first at the bedside in an emergency. In **Patient cases**, at **advanced** level or harder (no hints):

1. **A weight on my chest**: Rob has chest pain.
2. **Shivering and hardly passing urine**: Kofi, with a kidney infection.

Speed and clarity: escalate first, then observations, the ECG or bloods you are trained for, and stay. Oxygen, medicines and reading the ECG are ours.

Grace`,
  },
  whyItMatters:
    'In an emergency, the first minutes decide a lot. A senior assistant who calls for help at once, measures accurately and keeps the patient safe makes the team faster.',
  objectives: [
    'Escalate an emergency immediately',
    'Do the tests you are trained for, in time (ECG, bloods)',
    'Stay within your role and keep the patient safe',
  ],
  steps: [
    {
      id: 'rob',
      title: 'Rob',
      instructions: 'Start **A weight on my chest** at advanced or expert.',
    },
    {
      id: 'kofi',
      title: 'Kofi',
      instructions: 'Start **Shivering and hardly passing urine** at advanced or expert.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'clinical',
    title: 'Ward Systems: emergencies',
    start: emergencyStart,
    solution: solvedState(
      solvedState(
        emergencyStart,
        'chest-pain',
        'advanced',
        'senior-healthcare-assistant',
      ),
      'sepsis-signs',
      'advanced',
      'senior-healthcare-assistant',
    ),
    checks: [
      {
        id: 'rob',
        type: 'case',
        case: 'chest-pain',
        difficulty: 'advanced',
        title: 'A weight on my chest: passed',
        points: 50,
        why: 'New chest pain is an emergency until proven otherwise: tell the nurse at once and get an ECG within ten minutes.',
        hint: 'Escalate first; then observations and an ECG; keep him still.',
      },
      {
        id: 'kofi',
        type: 'case',
        case: 'sepsis-signs',
        difficulty: 'advanced',
        title: 'Shivering and hardly passing urine: passed',
        points: 50,
        why: 'Infection with a high score could be sepsis: early escalation saves lives.',
        hint: 'Full observations and the score, the fluid chart, and escalate urgently.',
      },
    ],
  },
  passScore: 70,
  xp: 160,
  skills: {
    'patient-safety': 40,
    'clinical-observation': 35,
    'clinical-documentation': 15,
  },
  feedback: feedback(
    'Rob had his ECG in eight minutes and Kofi was with the outreach team quickly. That is senior work.',
  ),
}
