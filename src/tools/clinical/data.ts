/**
 * Ward Systems practice data: Ward 4 of Riverside Community Hospital, a
 * fictional hospital. Every patient, clinician, medicine and range here is
 * invented for learning; none of it is medical advice.
 */
import type { ClinicalState } from './schema'

export const HOSPITAL = 'Riverside Community Hospital'

/**
 * Fictional medicines. Each belongs to a group, which is what allergies are
 * recorded against (as real allergy records do).
 */
export const MEDICINES: Record<string, { group: string; use: string }> = {
  Amoxivan: { group: 'Penicillins', use: 'an antibiotic' },
  Cefralin: { group: 'Cephalosporins', use: 'an antibiotic' },
  Febrinol: { group: 'Simple pain relievers', use: 'for pain and fever' },
  Clotrinex: { group: 'Anticoagulants', use: 'to prevent blood clots' },
  Glucoren: { group: 'Blood sugar medicines', use: 'for diabetes' },
  Nauzastop: { group: 'Anti-sickness medicines', use: 'for nausea' },
  Respiral: { group: 'Inhalers', use: 'for breathing' },
  Brufenac: { group: 'Anti-inflammatories', use: 'for pain and swelling' },
}

/**
 * Teaching reference ranges, roughly like adult ranges but simplified.
 * Real laboratories set their own.
 */
export const LAB_TESTS: Record<
  string,
  { unit: string; low: number; high: number; criticalLow?: number; criticalHigh?: number }
> = {
  Potassium: { unit: 'mmol/L', low: 3.5, high: 5.3, criticalLow: 2.5, criticalHigh: 6.5 },
  Sodium: { unit: 'mmol/L', low: 133, high: 146, criticalLow: 120, criticalHigh: 160 },
  Haemoglobin: { unit: 'g/L', low: 115, high: 165, criticalLow: 70 },
  'White cell count': { unit: '×10⁹/L', low: 4, high: 11, criticalHigh: 30 },
  Glucose: { unit: 'mmol/L', low: 4, high: 7.8, criticalLow: 2.5, criticalHigh: 25 },
  'C-reactive protein': { unit: 'mg/L', low: 0, high: 5 },
}

export function sampleClinical(): ClinicalState {
  return {
    hospital: HOSPITAL,
    clock: 8 * 60,
    user: { name: 'You', role: 'Healthcare trainee' },
    patients: [
      {
        id: 'RCH-104233',
        name: 'Margaret Okafor',
        dob: '1948-03-12',
        sex: 'female',
        status: 'admitted',
        bed: '4A-1',
        allergies: [{ substance: 'Penicillins', reaction: 'Rash and swelling' }],
        alerts: ['Falls risk'],
        careTeam: true,
        reason: 'Chest infection, on antibiotics through a drip.',
      },
      {
        id: 'RCH-104871',
        name: 'Daniel Price',
        dob: '1979-11-02',
        sex: 'male',
        status: 'admitted',
        bed: '4A-2',
        allergies: [],
        alerts: [],
        careTeam: true,
        reason: 'Recovering after an operation on his knee.',
      },
      {
        id: 'RCH-105102',
        name: 'Aisha Rahman',
        dob: '1992-07-21',
        sex: 'female',
        status: 'admitted',
        bed: '4A-3',
        allergies: [{ substance: 'Anti-inflammatories', reaction: 'Wheezing' }],
        alerts: [],
        careTeam: true,
        reason: 'Diabetes: blood sugar being brought under control.',
      },
      {
        id: 'RCH-103990',
        name: 'George Whitfield',
        dob: '1937-01-30',
        sex: 'male',
        status: 'admitted',
        bed: '4A-4',
        allergies: [],
        alerts: ['Hard of hearing'],
        careTeam: true,
        reason: 'Dehydration and a urine infection.',
      },
      {
        id: 'RCH-106455',
        name: 'Priya Natarajan',
        dob: '1985-05-09',
        sex: 'female',
        status: 'outpatient',
        bed: null,
        allergies: [],
        alerts: [],
        careTeam: true,
        reason: 'Follow-up in the diabetes clinic.',
      },
      {
        id: 'RCH-106502',
        name: 'Tomasz Nowak',
        dob: '1966-09-14',
        sex: 'male',
        status: 'outpatient',
        bed: null,
        allergies: [],
        alerts: [],
        careTeam: true,
        reason: 'New patient appointment in the respiratory clinic.',
      },
      {
        id: 'RCH-101777',
        name: 'Elena Marsh',
        dob: '1990-12-03',
        sex: 'female',
        status: 'admitted',
        bed: '3B-6',
        allergies: [],
        alerts: [],
        careTeam: false,
        reason: 'On Ward 3, not under your care.',
      },
      {
        id: 'RCH-106731',
        name: 'Samuel Adebayo',
        dob: '1958-04-27',
        sex: 'male',
        status: 'outpatient',
        bed: null,
        allergies: [],
        alerts: [],
        careTeam: true,
        reason: 'Waiting in the Emergency Department for a bed on a medical ward.',
      },
    ],
    vitals: [
      {
        id: 'v1',
        patientId: 'RCH-104233',
        at: '04:00',
        resp: 20,
        spo2: 95,
        temp: 37.9,
        sys: 118,
        dia: 72,
        pulse: 96,
        alert: true,
        score: 3,
        by: 'Night staff',
      },
    ],
    notes: [
      {
        id: 'n1',
        patientId: 'RCH-104233',
        kind: 'handover',
        text: 'Comfortable overnight. Temperature slightly up at 04:00. Drip antibiotic due at 08:00. Needs help to walk (falls risk).',
        at: '07:30',
        by: 'Night staff',
        signed: true,
      },
    ],
    appointments: [
      {
        id: 'a1',
        patientId: 'RCH-106455',
        clinic: 'Diabetes clinic',
        clinician: 'Dr Hana Ito',
        date: '2026-03-02',
        time: '09:30',
        status: 'booked',
      },
      {
        id: 'a2',
        patientId: 'RCH-106502',
        clinic: 'Respiratory clinic',
        clinician: 'Dr Felix Moreau',
        date: '2026-03-02',
        time: '10:00',
        status: 'booked',
      },
    ],
    labs: [
      {
        id: 'L-5001',
        patientId: 'RCH-103990',
        test: 'Potassium',
        specimen: 'blood',
        orderedBy: 'Dr Felix Moreau',
        status: 'ordered',
        label: null,
        rejectReason: '',
        result: null,
        acknowledged: false,
        calledTo: '',
      },
    ],
    meds: [
      {
        id: 'M-301',
        patientId: 'RCH-104233',
        drug: 'Cefralin',
        dose: '1 g',
        route: 'Into a vein (drip)',
        frequency: 'Every 8 hours',
        due: '08:00',
        prescriber: 'Dr Felix Moreau',
        status: 'dispensed',
        query: '',
        administrations: [],
      },
      {
        id: 'M-302',
        patientId: 'RCH-104871',
        drug: 'Febrinol',
        dose: '1 g',
        route: 'By mouth',
        frequency: 'Every 6 hours when needed',
        due: '08:00',
        prescriber: 'Dr Hana Ito',
        status: 'dispensed',
        query: '',
        administrations: [],
      },
    ],
    beds: [
      ...['4A-1', '4A-2', '4A-3', '4A-4', '4A-5', '4A-6'].map((id, i) => ({
        id,
        ward: 'Ward 4',
        patientId: ['RCH-104233', 'RCH-104871', 'RCH-105102', 'RCH-103990'][i] ?? null,
        // 4A-6: its last patient went home; it has not been cleaned yet.
        clean: i !== 5,
      })),
      { id: '3B-6', ward: 'Ward 3', patientId: 'RCH-101777', clean: true },
    ],
    audit: [],
  }
}
