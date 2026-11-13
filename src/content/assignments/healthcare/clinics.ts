import type { AssignmentInput } from '../../schemas'
import {
  addNote,
  bookAppointment,
  setAppointmentStatus,
} from '../../../tools/clinical/model'
import { CHECK_PRIVACY, must, ward } from './common'

/**
 * Healthcare (trainee, outpatients): a clinic morning. Teaches the clinic
 * list (arrivals, outcomes), rebooking without double-booking, booking a
 * referral, and recording a telephone call.
 */
const start = ward((s) => ({ ...s, clock: 9 * 60 + 20 }))

function solution() {
  let s = must(setAppointmentStatus(start, 'a1', 'arrived'))
  s = must(setAppointmentStatus(s, 'a1', 'seen'))
  s = must(setAppointmentStatus(s, 'a2', 'cancelled'))
  s = must(
    bookAppointment(s, {
      patientId: 'RCH-106502',
      clinic: 'Respiratory clinic',
      clinician: 'Dr Felix Moreau',
      date: '2026-03-09',
      time: '10:00',
    }),
  )
  s = must(
    addNote(
      s,
      'RCH-106502',
      'call',
      'Tomasz Nowak phoned at 09:20: cannot attend today (work). Cancelled and rebooked for Monday 9 March at 10:00 with Dr Moreau. Letter to follow.',
    ),
  )
  s = must(
    bookAppointment(s, {
      patientId: 'RCH-104871',
      clinic: 'Fracture clinic',
      clinician: 'Dr Amara Osei',
      date: '2026-03-04',
      time: '14:00',
    }),
  )
  return s
}

export const wardClinics: AssignmentInput = {
  id: 'ward-clinics',
  version: 1,
  careerId: 'healthcare',
  levelId: 'healthcare-trainee',
  order: 3,
  kind: 'tool',
  title: 'A clinic morning in outpatients',
  summary:
    'Keep the clinic list right: arrivals, outcomes, a rebooking and a new referral.',
  estimatedMinutes: 20,
  from: 'reception',
  briefing: {
    subject: 'Can you help on the clinic desk?',
    body: `Hi {name},

I’m short on the outpatient desk this morning. Everything is in **Ward Systems → Appointments**:

1. **Priya Natarajan** has arrived for the diabetes clinic, and Dr Ito has just seen her. Please mark her **arrived**, then **seen**.
2. **Tomasz Nowak** just phoned: he can’t come to his 10:00 respiratory appointment today because of work. Please **cancel** it and **rebook** him with Dr Moreau on **Monday 9 March at 10:00**. Then write a **Telephone call** note in his record saying what he said and what you did.
3. Dr Ito wants **Daniel Price** seen in the **fracture clinic** before he goes home: Dr Osei has a slot on **4 March at 14:00**.

Rosa`,
  },
  whyItMatters:
    'A clinic list is how a hospital knows who was seen, who missed out and who needs another appointment. Mistakes here mean patients lost to follow-up, or two patients booked into one slot.',
  objectives: [
    'Record arrivals and outcomes in order',
    'Cancel and rebook an appointment, and record the call',
    'Book a referral into the right clinic',
  ],
  steps: [
    {
      id: 'priya',
      title: 'Priya’s appointment',
      instructions:
        'In **Appointments**, click **Arrived**, then **Seen**, for Priya Natarajan.',
    },
    {
      id: 'tomasz',
      title: 'Tomasz’s rebooking',
      instructions:
        'Cancel his 10:00 appointment. Book him into the Respiratory clinic on 2026-03-09 at 10:00. Then open his record and add a **Telephone call** note.',
    },
    {
      id: 'daniel',
      title: 'Daniel’s referral',
      instructions: 'Book Daniel Price into the Fracture clinic on 2026-03-04 at 14:00.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to Rosa**.' },
  ],
  tool: {
    id: 'clinical',
    title: 'Ward Systems: outpatient clinics',
    start,
    solution: solution(),
    checks: [
      {
        id: 'priya',
        type: 'appointment',
        patient: 'RCH-106455',
        clinic: 'Diabetes clinic',
        status: 'seen',
        title: 'Priya marked as seen',
        points: 20,
        why: 'The outcome is how the hospital knows the patient was seen (and how the clinic is paid for).',
        hint: 'Arrived first, then Seen.',
      },
      {
        id: 'tomasz-cancelled',
        type: 'appointment',
        patient: 'RCH-106502',
        clinic: 'Respiratory clinic',
        status: 'cancelled',
        title: 'Tomasz’s appointment cancelled',
        points: 15,
        why: 'A cancellation (not a “did not attend”) is fair to a patient who phoned ahead, and frees the slot.',
        hint: 'Cancel his 10:00 appointment.',
      },
      {
        id: 'tomasz-rebooked',
        type: 'appointment',
        patient: 'RCH-106502',
        clinic: 'Respiratory clinic',
        status: 'booked',
        title: 'Tomasz rebooked',
        points: 20,
        why: 'A cancelled appointment without a new one is a patient lost to follow-up.',
        hint: 'Book him with Dr Moreau on 2026-03-09 at 10:00.',
      },
      {
        id: 'call-note',
        type: 'note',
        patient: 'RCH-106502',
        kind: 'call',
        mentions: [['9 March', '2026-03-09', '9/3', 'Monday']],
        title: 'The call recorded',
        points: 15,
        why: 'The record should show what the patient told us and what we did, in case anyone asks later.',
        hint: 'In Tomasz’s record, add a Telephone call note with the new date.',
      },
      {
        id: 'daniel',
        type: 'appointment',
        patient: 'RCH-104871',
        clinic: 'Fracture clinic',
        status: 'booked',
        title: 'Daniel’s referral booked',
        points: 20,
        why: 'He must be seen in the right clinic before he goes home.',
        hint: 'Fracture clinic, 2026-03-04, 14:00.',
      },
      CHECK_PRIVACY,
    ],
  },
  passScore: 70,
  xp: 90,
  skills: {
    'customer-service': 30,
    accuracy: 25,
    'clinical-documentation': 20,
    confidentiality: 10,
  },
  feedback: {
    excellent: `Hi {name},

Lovely. The clinic list is spotless, Tomasz has his letter, and Daniel’s fracture appointment is in. Thank you!

Rosa`,
    good: `Hi {name},

Thanks, nearly all right. A couple of details in the notes.

Rosa`,
    pass: `Hi {name},

Some of the list isn’t right yet. See the notes.

Rosa`,
    fail: `Hi {name},

Not yet. Start with Priya: Arrived, then Seen.

Rosa`,
  },
}
