import type { AssignmentInput } from '../../schemas'
import {
  dispenseMedicine,
  queryMedicine,
  recordDose,
  verifyMedicine,
} from '../../../tools/clinical/model'
import { CHECK_PRIVACY, med, must, ward } from './common'

/**
 * Healthcare (assistant): the medicines round and pharmacy. Teaches the
 * bedside checks, recording a dose not given, and verifying or querying
 * prescriptions by reading the safety alerts. The player never decides
 * what to prescribe.
 */
const start = ward((s) => ({
  ...s,
  meds: [
    ...s.meds,
    med({
      id: 'M-305',
      patientId: 'RCH-105102',
      drug: 'Brufenac',
      dose: '400 mg',
      frequency: 'Three times a day',
      due: '12:00',
    }),
    med({
      id: 'M-306',
      patientId: 'RCH-105102',
      drug: 'Glucoren',
      dose: '500 mg',
      frequency: 'Twice a day with food',
      due: '12:30',
    }),
  ],
}))

function solution() {
  const checks = { identity: true, allergies: true }
  let s = must(recordDose(start, 'M-301', 'given', checks))
  s = must(
    recordDose(
      s,
      'M-302',
      'withheld',
      checks,
      'Not needed: Daniel says he has no pain this morning.',
    ),
  )
  s = must(
    queryMedicine(
      s,
      'M-305',
      'Aisha Rahman is allergic to anti-inflammatories (wheezing), and Brufenac is one. Please review and prescribe an alternative.',
    ),
  )
  s = must(verifyMedicine(s, 'M-306'))
  s = must(dispenseMedicine(s, 'M-306'))
  return s
}

export const wardMedicines: AssignmentInput = {
  id: 'ward-medicines',
  version: 1,
  careerId: 'healthcare',
  levelId: 'healthcare-assistant',
  order: 4,
  kind: 'tool',
  title: 'The medicines round, and two prescriptions',
  summary:
    'Record the 8 o’clock doses safely, then verify or query two new prescriptions in pharmacy.',
  estimatedMinutes: 30,
  from: 'senior',
  briefing: {
    subject: 'Medicines round with me',
    body: `Hi {name},

You’re ready to help with the medicines round under my supervision. In **Ward Systems**:

**At the bedside** (each patient’s **Medicines chart**):
- **Margaret Okafor**’s Cefralin drip is due at 08:00. I have checked it with you; record it as **given**, with the identity and allergy checks done.
- **Daniel Price** can have Febrinol when needed, but he tells us he has no pain this morning. Record the dose as **not given**, with the reason.

**In Pharmacy** (you are covering the pharmacy technician’s checks with Wei from pharmacy this week):
- Two new prescriptions for **Aisha Rahman** are waiting. **Read the alerts.** Verify and dispense the one that is safe. Anything that is not safe goes back to the prescriber as a **query**, saying exactly why.

We never change a prescription ourselves: we check, and we ask.

Owen`,
  },
  whyItMatters:
    'Medication errors are among the most common causes of avoidable harm in hospitals. The bedside checks, a reason for every missed dose, and pharmacy questioning anything unsafe are layers of protection: each catches what the others miss.',
  objectives: [
    'Do the bedside checks before recording a dose as given',
    'Record a dose not given, with the reason',
    'Read the safety alerts: verify a safe prescription and query an unsafe one',
  ],
  steps: [
    {
      id: 'margaret',
      title: 'Margaret’s dose',
      instructions:
        'Open Margaret’s **Medicines chart**. Tick both checks, then **Record as given** for Cefralin.',
    },
    {
      id: 'daniel',
      title: 'Daniel’s dose',
      instructions:
        'Open Daniel’s **Medicines chart**, type why it is not given, and **Record as not given**.',
    },
    {
      id: 'pharmacy',
      title: 'Aisha’s prescriptions',
      instructions:
        'In **Pharmacy**, read each prescription’s alerts. Query the unsafe one (say what the problem is and what you are asking for); verify, then dispense, the safe one.',
      hint: 'Compare each medicine’s group with Aisha’s allergy on her banner.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {senior}**.' },
  ],
  tool: {
    id: 'clinical',
    title: 'Ward Systems: medicines round',
    start,
    solution: solution(),
    checks: [
      {
        id: 'margaret',
        type: 'medicine',
        order: 'M-301',
        dose: 'given',
        title: 'Margaret’s dose given, with the checks',
        points: 20,
        why: 'A dose is recorded as given only after the identity and allergy checks: that is what the record promises.',
        hint: 'Tick both checks on Margaret’s Cefralin, then Record as given.',
      },
      {
        id: 'daniel',
        type: 'medicine',
        order: 'M-302',
        dose: 'withheld',
        title: 'Daniel’s dose not given, with the reason',
        points: 15,
        why: 'A blank on the chart could mean forgotten. A reason shows it was a decision.',
        hint: 'Record Febrinol as not given, with why.',
      },
      {
        id: 'query',
        type: 'medicine',
        order: 'M-305',
        status: 'queried',
        dose: 'none',
        queryMentions: [
          ['allerg'],
          ['alternative', 'review', 'another', 'different', 'change'],
        ],
        title: 'The unsafe prescription queried',
        points: 35,
        why: 'Aisha is allergic to anti-inflammatories and Brufenac is one. It must go back to the prescriber with a clear question, never be dispensed.',
        hint: 'Query M-305: say she is allergic and ask for an alternative.',
      },
      {
        id: 'glucoren',
        type: 'medicine',
        order: 'M-306',
        status: 'dispensed',
        title: 'The safe prescription verified and dispensed',
        points: 20,
        why: 'Holding up safe medicines harms patients too: Aisha needs her diabetes treatment on time.',
        hint: 'Verify M-306, then dispense it.',
      },
      {
        id: 'unsafe',
        type: 'no-unsafe-medicine',
        title: 'Nothing unsafe went ahead',
        points: 10,
        why: 'Any medicine with an allergy or duplicate alert must stop until the prescriber has answered.',
        hint: 'Never verify, dispense or give a prescription with an alert.',
      },
      CHECK_PRIVACY,
    ],
  },
  passScore: 75,
  xp: 120,
  skills: {
    'patient-safety': 45,
    'clinical-documentation': 20,
    accuracy: 25,
    confidentiality: 10,
  },
  feedback: {
    excellent: `Hi {name},

That is a safe medicines round. And catching the Brufenac before it reached Aisha: that is exactly why pharmacy checks exist. Dr Ito has already changed it.

Owen`,
    good: `Hi {name},

Good; a couple of details to fix. See the notes.

Owen`,
    pass: `Hi {name},

Some of this would not be safe on a real ward. Read the notes carefully, then let’s talk.

Owen`,
    fail: `Hi {name},

Not yet. Start in Pharmacy: read Aisha’s allergy, then each prescription’s alerts.

Owen`,
  },
}
