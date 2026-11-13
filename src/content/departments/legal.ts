/**
 * Litigation & Commercial at Kestrel & Vane LLP: a fictional law firm in the
 * fictional Commonwealth of Westmark. Everyone here is invented; this is a
 * simulation for learning, not legal advice.
 */
import type { Employer, Person } from '../company'
import type { Department } from './types'

export const KESTREL: Employer = {
  name: 'Kestrel & Vane LLP',
  shortName: 'Kestrel & Vane',
  emailDomain: 'kestrelvane.example',
  description:
    'A fictional mid-sized law firm in Westmark, acting for businesses and individuals in disputes, contracts and employment.',
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
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${KESTREL.emailDomain}`,
  initials,
  color,
  startingTrust,
  personality,
})

export const legal: Department = {
  careerId: 'legal',
  employer: KESTREL,
  sharedPeople: {
    facilities: person(
      'facilities',
      'Marcus Hale',
      'Office Services Manager',
      'MH',
      'bg-amber-700',
      55,
      'Runs the post room, the archive and the meeting rooms. Knows where every closed file from 1990 is.',
    ),
    reception: person(
      'reception',
      'Imogen Shaw',
      'Receptionist',
      'IS',
      'bg-pink-700',
      60,
      'First face clients see. Calm with anxious callers and very firm about who gets past the front desk.',
    ),
    hr: person(
      'hr',
      'Neil Ferrante',
      'Training Principal',
      'NF',
      'bg-violet-700',
      50,
      'Oversees trainees’ supervision and ethics training. Asks “and what would you tell the court?” a lot.',
    ),
  },
  places: {
    reception: {
      name: 'Reception',
      description:
        'The front desk of Kestrel & Vane. Imogen greets clients and keeps the meeting rooms.',
    },
    desk: {
      name: 'Your desk',
      description:
        'The litigation and commercial team’s open-plan floor: files, screens and a lot of coffee.',
    },
    manager: {
      name: '{manager}’s office',
      description:
        '{managerFull}, the partner who supervises you. Knock first if the door is shut: it is usually a client call.',
    },
    breakroom: {
      name: 'Kitchen',
      description: 'Coffee, the library trolley and the firm’s notice board.',
    },
  },
  team: {
    backM: { name: 'Priyanka Rao', role: 'Paralegal' },
    backR: { name: 'Daniel Achebe', role: 'Senior Associate' },
    backL: { name: 'Clara Voss', role: 'Associate' },
    front2: { name: 'Leo Marchetti', role: 'Trainee Solicitor' },
    coordinator: { name: 'Sunita Bhatt', role: 'Legal Secretary' },
    admin: { name: 'Owen Gallagher', role: 'Billing Coordinator' },
    analyst: { name: 'Hana Kowalski', role: 'Knowledge and Research Lawyer' },
  },
  name: 'Litigation & Commercial',
  sign: 'LITIGATION & COMMERCIAL',
  manager: person(
    'manager',
    'Eleanor Vane',
    'Partner',
    'EV',
    'bg-indigo-800',
    50,
    'Precise, fair and very busy. Expects every deadline in the calendar and every conflict checked, and is generous with credit when you get it right.',
  ),
  senior: person(
    'senior',
    'Tobias Kestrel',
    'Senior Associate',
    'TK',
    'bg-sky-800',
    45,
    'Litigator who loves a good argument and hates a sloppy citation. Will make you check a case is still good law, twice.',
  ),
  director: 'the managing partner',
  intro:
    'Litigation & Commercial acts for businesses and individuals in contract disputes, employment claims and commercial agreements, from the first call to the court door.',
  standup: {
    senior:
      'Brightwater’s defence is due on the 23rd. The Millstone renewal needs its liability clause sorted. And I want the library checked before anyone cites anything.',
    facilities: 'Meeting room 2’s screen is fixed. The archive move is on Saturday.',
  },
  planning: {
    lines: [
      'This week we are preparing the trial bundle for Brightwater v Millstone: every document, indexed and paginated.',
      '{senior} is leading it. I need someone to help check the index against the documents.',
      'Any volunteers?',
    ],
    volunteerReply: 'Thank you. Bundles win cases more often than speeches do.',
    nobodyReply: 'Then I will do it at midnight. Again.',
  },
  seniorWork:
    'Court work, the difficult clients, and the research nobody else wants. Plus checking that everything we cite is still good law.',
  seniorTeaches:
    'I will teach you to research properly: find the authority, read it, check it, and only then rely on it.',
  seniorSmallTalk: [
    'Put every deadline in the calendar the minute you know it. Missed deadlines end careers.',
    'Never cite a case you have not read. Never.',
    'If you are not sure whether there is a conflict, there might be. Ask.',
  ],
  tips: [
    'Run the conflict check before you learn anything confidential from a new client.',
    'Check every authority is still good law before relying on it.',
    'Record your time as you go, in six-minute units. Describe the work clearly.',
    'Legal advice between the firm and its client is privileged: never disclose it by mistake.',
    'Deadlines on a weekend or public holiday move to the next working day; check the rules every time.',
  ],
  news: [
    'Reminder: the archive move is on Saturday. Closed files will be unavailable on Friday afternoon.',
    'Ethics training for all trainees on Thursday at 4 pm.',
    'The Westmark court’s new filing portal goes live next month.',
    'Library update: three new Court of Appeal decisions added this week.',
  ],
}
