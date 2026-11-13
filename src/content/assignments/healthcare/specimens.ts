import type { AssignmentInput } from '../../schemas'
import {
  acknowledgeResult,
  collectSpecimen,
  rejectSpecimen,
  repeatRequest,
} from '../../../tools/clinical/model'
import { CHECK_PRIVACY, lab, must, ward } from './common'

/**
 * Healthcare (trainee): specimens and results. Teaches labelling at the
 * bedside, rejecting a mislabelled specimen, and phoning a critical result
 * through to a named doctor.
 */
const start = ward((s) => ({
  ...s,
  clock: 9 * 60 + 15,
  labs: [
    ...s.labs,
    // Labelled in advance at the desk, with the wrong date of birth.
    lab({
      id: 'L-5002',
      patientId: 'RCH-105102',
      test: 'Glucose',
      status: 'collected',
      label: { name: 'Aisha Rahman', dob: '1992-07-12' },
    }),
    lab({
      id: 'L-5004',
      patientId: 'RCH-104233',
      test: 'Potassium',
      status: 'resulted',
      label: { name: 'Margaret Okafor', dob: '1948-03-12' },
      result: { value: 6.9, unit: 'mmol/L', low: 3.5, high: 5.3, flag: 'critical' },
    }),
  ],
}))

function solution() {
  let s = must(
    collectSpecimen(start, 'L-5001', { name: 'George Whitfield', dob: '1937-01-30' }),
  )
  s = must(
    rejectSpecimen(
      s,
      'L-5002',
      'Date of birth on the label does not match the request (1992-07-12, not 1992-07-21).',
    ),
  )
  s = must(repeatRequest(s, 'L-5002'))
  s = must(acknowledgeResult(s, 'L-5004', 'Dr Felix Moreau'))
  return s
}

export const wardSpecimens: AssignmentInput = {
  id: 'ward-specimens',
  version: 1,
  careerId: 'healthcare',
  levelId: 'healthcare-trainee',
  order: 2,
  kind: 'tool',
  title: 'Specimens and a critical result',
  summary:
    'Label a blood test at the bedside, catch a mislabelled specimen, and act on a critical result.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Three things from the laboratory',
    body: `Hi {name},

Three things involving the laboratory this morning, all in **Ward Systems**:

**1. George Whitfield (4A-4)** needs his potassium blood test taken. When you take it, label the specimen **at the bedside** from what George tells you. He says his name is George Whitfield, born **30 January 1937**.

**2. The lab has queried a glucose specimen** for Aisha Rahman (L-5002). Someone labelled it at the desk before taking it. Look at it in **Laboratory**: if the label does not match the request exactly, reject it with the reason, and request a new specimen.

**3. Margaret Okafor (4A-1)** has a potassium result back. Look at it in her record. If it is critical, it must be **phoned through to Dr Felix Moreau** straight away; record that you did.

Grace`,
  },
  whyItMatters:
    'Most laboratory errors happen before the test: the wrong patient, the wrong label. A mislabelled specimen can put one patient’s result in another’s record. And a critical result is only useful if the right doctor hears about it in minutes.',
  objectives: [
    'Label a specimen at the bedside from the patient’s own answers',
    'Reject a specimen whose label does not match, and request a new one',
    'Phone a critical result through and record who you told',
  ],
  steps: [
    {
      id: 'george',
      title: 'George’s blood test',
      instructions:
        'Open George Whitfield’s record, **Tests and results**: collect and label the potassium specimen with his full name and date of birth (YYYY-MM-DD).',
    },
    {
      id: 'aisha',
      title: 'Aisha’s glucose specimen',
      instructions:
        'In **Laboratory**, compare L-5002’s label with the request. Reject it with the reason, then **Request a new specimen**.',
      hint: 'Check the date of birth digit by digit.',
    },
    {
      id: 'critical',
      title: 'Margaret’s result',
      instructions:
        'Open Margaret Okafor’s record, **Tests and results**. Type who you phoned (Dr Felix Moreau) and click **Acknowledge**.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'clinical',
    title: 'Ward Systems: specimens and results',
    start,
    solution: solution(),
    checks: [
      {
        id: 'george',
        type: 'lab',
        order: 'L-5001',
        status: 'collected',
        title: 'George’s specimen collected and labelled',
        points: 20,
        why: 'Labelling at the bedside, from the patient, is what makes the result belong to the right person.',
        hint: 'Collect L-5001 from George’s record with his name and date of birth.',
      },
      {
        id: 'george-label',
        type: 'lab-label',
        order: 'L-5001',
        title: 'The label matches George exactly',
        points: 15,
        why: 'A label with a wrong digit is rejected by the laboratory, and George needs another needle.',
        hint: 'George Whitfield, 1937-01-30.',
      },
      {
        id: 'aisha',
        type: 'lab',
        order: 'L-5002',
        status: 'rejected',
        repeated: true,
        title: 'Mislabelled specimen rejected and re-requested',
        points: 30,
        why: 'A specimen whose label does not match is never tested: its result could belong to someone else.',
        hint: 'In Laboratory, reject L-5002 with the reason, then request a new specimen.',
      },
      {
        id: 'critical',
        type: 'lab',
        order: 'L-5004',
        acknowledged: true,
        calledTo: 'Moreau',
        title: 'Critical result phoned through',
        points: 25,
        why: 'A potassium this high can affect the heart. The doctor must know at once, and the record must show who was told.',
        hint: 'Acknowledge L-5004 with “Dr Felix Moreau” as the person you phoned.',
      },
      CHECK_PRIVACY,
    ],
  },
  passScore: 70,
  xp: 100,
  skills: {
    'patient-safety': 40,
    'clinical-documentation': 15,
    accuracy: 25,
    confidentiality: 10,
  },
  feedback: {
    excellent: `Hi {name},

Excellent. George’s sample is on its way, Aisha’s will be retaken properly, and Dr Moreau has already treated Margaret’s potassium. Three safe catches before ten o’clock.

Grace`,
    good: `Hi {name},

Good work; one or two details to fix. See the notes.

Grace`,
    pass: `Hi {name},

Some of this isn’t safe yet. Read the notes carefully.

Grace`,
    fail: `Hi {name},

Not yet. Start with the critical result: that one can’t wait.

Grace`,
  },
}
