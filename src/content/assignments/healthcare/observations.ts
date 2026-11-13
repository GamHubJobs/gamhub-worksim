import type { AssignmentInput } from '../../schemas'
import { escalate, recordVitals } from '../../../tools/clinical/model'
import { CHECK_PRIVACY, must, ward } from './common'

/**
 * Healthcare (trainee): the morning observations round. Teaches accurate
 * observations, the early-warning score, and escalating a patient who is
 * getting worse with SBAR.
 */
const start = ward()

function solution() {
  let s = must(
    recordVitals(start, 'RCH-104233', {
      resp: 23,
      spo2: 93,
      temp: 38.7,
      sys: 104,
      dia: 66,
      pulse: 112,
      alert: true,
    }),
  )
  s = must(
    escalate(s, 'RCH-104233', 'Dr Felix Moreau (doctor on call)', {
      situation:
        'Margaret Okafor in 4A-1 has an early-warning score of 8, up from 3 at 04:00.',
      background:
        'Admitted with a chest infection, on antibiotics through a drip. Allergic to penicillins.',
      assessment:
        'Breathing 23 a minute, oxygen saturation 93%, temperature 38.7, pulse 112, blood pressure 104/66. She is getting worse.',
      recommendation:
        'Please review her now. I will repeat her observations in 30 minutes and stay close.',
    }),
  )
  s = must(
    recordVitals(s, 'RCH-103990', {
      resp: 16,
      spo2: 97,
      temp: 36.9,
      sys: 128,
      dia: 80,
      pulse: 76,
      alert: true,
    }),
  )
  return s
}

export const wardObservations: AssignmentInput = {
  id: 'ward-observations',
  version: 1,
  careerId: 'healthcare',
  levelId: 'healthcare-trainee',
  order: 1,
  kind: 'tool',
  title: 'The morning observations round',
  summary:
    'Record two patients’ observations, read the score, and escalate the one getting worse.',
  estimatedMinutes: 25,
  from: 'senior',
  briefing: {
    subject: 'Your first observations round',
    body: `Hi {name},

Welcome to Ward 4. Let’s start with the most important thing we do: **observations**. I measured these with you just now; please record them in **Ward Systems**, in each patient’s record.

**Margaret Okafor (bed 4A-1):** breathing 23 a minute, oxygen saturation 93%, temperature 38.7 °C, blood pressure 104/66, pulse 112. Alert and talking.

**George Whitfield (bed 4A-4):** breathing 16, oxygen saturation 97%, temperature 36.9 °C, blood pressure 128/80, pulse 76. Alert.

Ward Systems works out the early-warning score as you type. If a score tells you to escalate, do it: write an **escalation** in SBAR form to **Dr Felix Moreau**, the doctor on call.

Only open the records of patients on our list.

Owen`,
  },
  whyItMatters:
    'Patients who become seriously ill almost always show it in their observations hours before. Recording them accurately, noticing the score, and escalating early and clearly is how wards catch deterioration in time.',
  objectives: [
    'Record observations accurately in the patient record',
    'Read the early-warning score and what it asks for',
    'Escalate a deteriorating patient using SBAR',
  ],
  steps: [
    {
      id: 'open',
      title: 'Open Margaret’s record',
      instructions:
        'In **Patient record**, find Margaret Okafor and open her record. Read the banner first: her allergy and falls risk.',
    },
    {
      id: 'margaret',
      title: 'Record her observations',
      instructions:
        'Open **Observations**, type each number from the briefing, and look at the score before you save.',
      hint: 'Breathing, oxygen, temperature, blood pressure and pulse each add points when they are outside the usual range.',
    },
    {
      id: 'escalate',
      title: 'Escalate with SBAR',
      instructions:
        'In **Notes**, choose **Escalation (SBAR)** and fill in every part: what is happening, why she is here, what you found (with the numbers and the score), and what you need.',
    },
    {
      id: 'george',
      title: 'George’s observations',
      instructions: 'Open George Whitfield’s record and record his observations.',
    },
    {
      id: 'submit',
      title: 'Check and hand in',
      instructions: 'Check the **Audit log**, then click **Submit to {senior}**.',
    },
  ],
  tool: {
    id: 'clinical',
    title: 'Ward Systems: morning observations',
    start,
    solution: solution(),
    checks: [
      {
        id: 'margaret-obs',
        type: 'observations',
        patient: 'RCH-104233',
        minScore: 7,
        title: 'Margaret’s observations recorded accurately',
        points: 25,
        why: 'The score is only as good as the numbers: one wrong value can hide a patient who is getting worse.',
        hint: 'Record exactly the numbers in the briefing for Margaret Okafor.',
      },
      {
        id: 'escalation',
        type: 'note',
        patient: 'RCH-104233',
        kind: 'escalation',
        mentions: [
          ['8', 'score'],
          ['93', 'oxygen', 'saturation'],
          ['review', 'see her', 'assess'],
        ],
        title: 'Margaret escalated with SBAR',
        points: 35,
        why: 'A score of 8 needs a doctor to see the patient urgently. SBAR makes the call clear: the score and the numbers, and exactly what you are asking for.',
        hint: 'In Notes, write an Escalation (SBAR) to the doctor on call, with her score, her oxygen level and a request to review her.',
      },
      {
        id: 'george-obs',
        type: 'observations',
        patient: 'RCH-103990',
        title: 'George’s observations recorded',
        points: 20,
        why: 'Routine observations matter too: they are the baseline that shows when something changes.',
        hint: 'Record George Whitfield’s observations from the briefing.',
      },
      CHECK_PRIVACY,
    ],
  },
  passScore: 70,
  xp: 100,
  skills: {
    'clinical-observation': 35,
    'clinical-documentation': 20,
    'patient-safety': 20,
    confidentiality: 10,
  },
  feedback: {
    excellent: `Hi {name},

Spot on. Margaret’s score was 8 and you escalated clearly: Dr Moreau saw her within fifteen minutes and changed her treatment. That is exactly how we catch deterioration early.

Owen`,
    good: `Hi {name},

Good round; a couple of details to tighten. See the notes.

Owen`,
    pass: `Hi {name},

You got there, but some of the record isn’t right yet. The notes show what.

Owen`,
    fail: `Hi {name},

Not yet. Start with Margaret: record her observations exactly, and look at the score.

Owen`,
  },
}
