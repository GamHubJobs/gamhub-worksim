/**
 * Ward 4 (Medical) at Riverside Community Hospital: a fictional hospital.
 * Everyone here is invented; this is a simulation for learning, not
 * medical advice.
 */
import type { Employer, Person } from '../company'
import type { Department } from './types'

export const RIVERSIDE: Employer = {
  name: 'Riverside Community Hospital',
  shortName: 'Riverside',
  emailDomain: 'riverside-hospital.example',
  description:
    'A fictional 300-bed community hospital with medical and surgical wards, outpatient clinics, a laboratory and a pharmacy.',
}

const person = (
  id: string,
  name: string,
  role: string,
  initials: string,
  color: string,
  startingTrust: number,
  personality: string,
): Person => ({
  id,
  name,
  role,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${RIVERSIDE.emailDomain}`,
  initials,
  color,
  startingTrust,
  personality,
})

export const healthcare: Department = {
  careerId: 'healthcare',
  employer: RIVERSIDE,
  sharedPeople: {
    facilities: person(
      'facilities',
      'Dev Kapoor',
      'Estates and Housekeeping Supervisor',
      'DK',
      'bg-amber-700',
      55,
      'Knows every bed, pump and cupboard in the hospital. Cheerful, practical, and strict about cleaning between patients.',
    ),
    reception: person(
      'reception',
      'Rosa Lindqvist',
      'Ward Clerk',
      'RL',
      'bg-pink-700',
      60,
      'Runs the ward desk: phones, admissions paperwork, visitors and the bed board. Nothing gets past her.',
    ),
    hr: person(
      'hr',
      'Kwame Asante',
      'Learning and Development Lead',
      'KA',
      'bg-violet-700',
      50,
      'Looks after training and competencies for support staff. Patient, thorough, and keen on reflective practice.',
    ),
  },
  name: 'Ward 4 (Medical)',
  sign: 'WARD 4 · MEDICAL',
  manager: person(
    'manager',
    'Grace Mbeki',
    'Ward Manager (Senior Sister)',
    'GM',
    'bg-teal-700',
    50,
    'Calm under pressure and fiercely protective of her patients. Expects careful checks every time, and praises people who ask for help early.',
  ),
  senior: person(
    'senior',
    'Owen Fraser',
    'Senior Staff Nurse',
    'OF',
    'bg-sky-700',
    45,
    'Twenty years on medical wards. Explains the why behind every check, and has no patience for shortcuts with medicines.',
  ),
  director: 'the head of nursing',
  intro:
    'Ward 4 is a busy medical ward with 28 beds: we care for adults with infections, diabetes, breathing problems and more, alongside the clinics, laboratory and pharmacy teams.',
  standup: {
    senior:
      'Bed 4A-1 had a temperature overnight; I want observations every two hours. Two discharges planned today, one admission from the Emergency Department.',
    facilities:
      'The bed in 4A-6 is waiting for its deep clean; we will have it ready by ten.',
  },
  planning: {
    lines: [
      'This week we are auditing the medicines charts: every dose signed for, every missed dose explained.',
      '{senior} is leading it. I need someone to go through the charts with him and note what we find.',
      'Any volunteers?',
    ],
    volunteerReply: 'Thank you. Careful eyes make safe wards.',
    nobodyReply: 'Then I will do it after my shift. Again.',
  },
  seniorWork:
    'The sickest patients, the medicines round, and teaching. Plus making sure nobody on this ward is ever afraid to say “I’m worried about this patient.”',
  seniorTeaches:
    'I will teach you to spot a patient who is getting worse, and how to say so clearly. That skill saves lives.',
  seniorSmallTalk: [
    'If it isn’t written down, it didn’t happen. Sign every note.',
    'Ask the patient their name and date of birth every time. Every time.',
    'Never be embarrassed to escalate. I would rather be called ten times for nothing than once too late.',
  ],
  tips: [
    'Two identifiers, every time: name and date of birth, from the patient, checked against the wristband.',
    'Read the allergy banner before anything else in the record.',
    'Use SBAR when you escalate: Situation, Background, Assessment, Recommendation.',
    'Only open the records you need for the patients you are caring for. Every look is logged.',
    'Label specimens at the bedside, never in advance.',
  ],
  news: [
    'Hand hygiene audit this week: bare below the elbows, please.',
    'Reminder: the medicines fridge temperature is checked and signed every morning.',
    'New early-warning charts are on the ward. Ask Owen if you have questions.',
    'Visiting hours change on Sunday: 2 pm to 8 pm.',
  ],
}
