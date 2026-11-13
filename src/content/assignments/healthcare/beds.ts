import type { AssignmentInput } from '../../schemas'
import {
  addNote,
  admitToBed,
  discharge,
  markBedClean,
} from '../../../tools/clinical/model'
import { CHECK_PRIVACY, must, ward } from './common'

/**
 * Healthcare (senior assistant): patient flow. Teaches discharging only
 * with a signed summary, cleaning a bed before the next patient, and
 * admitting from the Emergency Department with an admission note.
 */
const start = ward((s) => ({ ...s, clock: 10 * 60 + 30 }))

function solution() {
  let s = must(
    addNote(
      start,
      'RCH-104871',
      'discharge',
      'Discharged home after his knee operation. Wound clean and dry; walking with crutches. Fracture clinic booked. GP to remove stitches in 10 days. Febrinol for pain when needed.',
    ),
  )
  s = must(discharge(s, 'RCH-104871'))
  s = must(markBedClean(s, '4A-6'))
  s = must(admitToBed(s, 'RCH-106731', '4A-6'))
  s = must(
    addNote(
      s,
      'RCH-106731',
      'admission',
      'Admitted from the Emergency Department to 4A-6 at 10:30. Settled in bed, call bell within reach, identity band checked. No known allergies. Observations due at 11:00.',
    ),
  )
  return s
}

export const wardBeds: AssignmentInput = {
  id: 'ward-beds',
  version: 1,
  careerId: 'healthcare',
  levelId: 'senior-healthcare-assistant',
  order: 5,
  kind: 'tool',
  title: 'A discharge and an admission',
  summary:
    'Send one patient home safely, and bring a waiting patient up from the Emergency Department.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Patient flow: one out, one in',
    body: `Hi {name},

The Emergency Department is full and **Samuel Adebayo** has waited all night for a bed. Let’s get him up to us safely. In **Ward Systems**:

1. **Daniel Price** (4A-2) is going home today. Write and sign his **discharge summary** in his record first (what happened, how he is, the follow-up and his medicines), then discharge him from **Beds and admissions**.
2. **Bed 4A-6** still needs cleaning. Dev’s team has just done it: mark it **cleaned**.
3. **Admit Samuel** to **4A-6**, then write his **admission** note: when he arrived, that he has settled, that you checked his identity band, and when his first observations are due.

Grace`,
  },
  whyItMatters:
    'Patient flow is safety too: a delayed discharge means a patient waiting in a corridor somewhere else. But every step has a check: the discharge summary for the GP, a clean bed for the next patient, and a clear admission record.',
  objectives: [
    'Discharge a patient only with a signed discharge summary',
    'Make sure a bed is cleaned before the next patient',
    'Admit a patient to the right bed and record the admission',
  ],
  steps: [
    {
      id: 'summary',
      title: 'Daniel’s discharge summary',
      instructions:
        'Open Daniel Price’s record, **Notes**: choose **Discharge summary**, write it and **Sign the note**.',
    },
    {
      id: 'discharge',
      title: 'Discharge Daniel',
      instructions: 'In **Beds and admissions**, click **Discharge** on bed 4A-2.',
    },
    {
      id: 'bed',
      title: 'Bed 4A-6',
      instructions: 'Click **Mark cleaned** on bed 4A-6.',
    },
    {
      id: 'admit',
      title: 'Admit Samuel',
      instructions:
        'Choose Samuel Adebayo and bed 4A-6, then **Admit / move**. Open his record and sign an **Admission** note.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'clinical',
    title: 'Ward Systems: patient flow',
    start,
    solution: solution(),
    checks: [
      {
        id: 'summary',
        type: 'note',
        patient: 'RCH-104871',
        kind: 'discharge',
        mentions: [['clinic', 'follow'], ['GP'], ['Febrinol', 'medicine', 'pain']],
        title: 'A complete discharge summary',
        points: 25,
        why: 'The discharge summary is how the GP and the patient know what happened and what comes next.',
        hint: 'Mention the follow-up (fracture clinic), what the GP must do, and his medicines.',
      },
      {
        id: 'daniel',
        type: 'patient',
        patient: 'RCH-104871',
        status: 'discharged',
        title: 'Daniel discharged',
        points: 20,
        why: 'He is well enough to go home, and his bed is needed.',
        hint: 'Discharge him from the bed board after signing the summary.',
      },
      {
        id: 'samuel',
        type: 'patient',
        patient: 'RCH-106731',
        status: 'admitted',
        bed: '4A-6',
        title: 'Samuel admitted to 4A-6',
        points: 25,
        why: 'Getting a patient out of a crowded Emergency Department and into a ward bed is better care.',
        hint: 'Mark 4A-6 cleaned first, then admit Samuel to it.',
      },
      {
        id: 'admission',
        type: 'note',
        patient: 'RCH-106731',
        kind: 'admission',
        mentions: [
          ['identity', 'band', 'wristband'],
          ['observations', 'obs'],
        ],
        title: 'The admission recorded',
        points: 20,
        why: 'The admission note tells the next shift when he arrived, that his identity was checked and what is due.',
        hint: 'Sign an Admission note: arrival, identity band checked, observations due.',
      },
      CHECK_PRIVACY,
    ],
  },
  passScore: 70,
  xp: 120,
  skills: {
    'clinical-documentation': 40,
    'patient-safety': 25,
    'customer-service': 20,
    confidentiality: 10,
  },
  feedback: {
    excellent: `Hi {name},

Brilliant. Daniel is home with a summary his GP can act on, and Samuel is finally in a proper bed. The Emergency Department said thank you.

Grace`,
    good: `Hi {name},

Good flow; a couple of details to fix. See the notes.

Grace`,
    pass: `Hi {name},

Some steps weren’t safe yet. The notes show which.

Grace`,
    fail: `Hi {name},

Not yet. Start with Daniel’s discharge summary.

Grace`,
  },
}
