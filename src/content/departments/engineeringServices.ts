/**
 * Projects & Maintenance at Northbank Engineering Ltd: a fictional
 * multi-discipline engineering firm. Everyone here is invented; standard
 * formulas with simplified data, for learning.
 */
import type { Employer, Person } from '../company'
import type { Department } from './types'

export const NORTHBANK: Employer = {
  name: 'Northbank Engineering Ltd',
  shortName: 'Northbank',
  emailDomain: 'northbank-eng.example',
  description:
    'A fictional engineering firm with civil, structural, mechanical, electrical and environmental teams, designing and maintaining plant and buildings.',
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
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${NORTHBANK.emailDomain}`,
  initials,
  color,
  startingTrust,
  personality,
})

export const engineeringServices: Department = {
  careerId: 'engineering-services',
  employer: NORTHBANK,
  sharedPeople: {
    facilities: person(
      'facilities',
      'Gus Pemberton',
      'Workshop Supervisor',
      'GP',
      'bg-amber-700',
      55,
      'Thirty years on the tools. Will not let anyone near a machine without a permit, and will happily show you why.',
    ),
    reception: person(
      'reception',
      'Fatima Noor',
      'Site Receptionist',
      'FN',
      'bg-pink-700',
      60,
      'Signs in every visitor, hands out hard hats and induction cards, and knows who is on site at any moment.',
    ),
    hr: person(
      'hr',
      'Martin Oyelaran',
      'Health, Safety and Training Manager',
      'MO',
      'bg-violet-700',
      50,
      'Runs inductions, near-miss reporting and training. Believes most accidents are system failures, not people failures.',
    ),
  },
  places: {
    reception: {
      name: 'Site reception',
      description:
        'Sign in, collect your hard hat and induction card. Fatima knows who is on site.',
    },
    desk: {
      name: 'Design office',
      description:
        'The engineers’ desks: drawings, calculations and screens. The workshop is through the far door.',
    },
    manager: {
      name: '{manager}’s office',
      description:
        '{managerFull}, the engineering manager. Calculations go to her for checking before anything is built.',
    },
    breakroom: {
      name: 'Mess room',
      description: 'Tea, the safety notice board and the near-miss box.',
    },
  },
  team: {
    backM: { name: 'Kofi Mensah', role: 'Electrical Engineer' },
    backR: { name: 'Ingrid Sorensen', role: 'Structural Engineer' },
    backL: { name: 'Raj Patel', role: 'Mechanical Engineer' },
    front2: { name: 'Lucy Wren', role: 'Apprentice Technician' },
    coordinator: { name: 'Tomás Rivera', role: 'Project Planner' },
    admin: { name: 'Alice Booth', role: 'Quality Inspector' },
    analyst: { name: 'Dr Niamh Byrne', role: 'Environmental Engineer' },
  },
  name: 'Projects & Maintenance',
  sign: 'PROJECTS & MAINTENANCE',
  manager: person(
    'manager',
    'Helena Okoye',
    'Engineering Manager',
    'HO',
    'bg-orange-700',
    50,
    'Chartered engineer who checks every calculation and every permit. Generous with time for anyone who asks “is this right?”.',
  ),
  senior: person(
    'senior',
    'Dmitri Volkov',
    'Senior Maintenance Engineer',
    'DV',
    'bg-sky-800',
    45,
    'Fixes anything with a motor in it. Patient teacher, impatient with shortcuts, absolutely immovable on lockout-tagout.',
  ),
  director: 'the technical director',
  intro:
    'Projects & Maintenance designs small structures and plant for clients and keeps our own depot running: circuits, beams, drives, schedules, maintenance and environmental compliance.',
  standup: {
    senior:
      'Conveyor 3’s bearing is running hot; I want it replaced today, under a permit. The mezzanine steel goes out for quotes this week.',
    facilities:
      'Lockout padlocks are in the cabinet by the workshop door. Sign them out, sign them back in.',
  },
  planning: {
    lines: [
      'This week we are preparing the mezzanine design for the client’s sign-off.',
      '{senior} is checking the steel. I need someone to check the calculations independently.',
      'Any volunteers?',
    ],
    volunteerReply: 'Thank you. Two pairs of eyes on every calculation.',
    nobodyReply: 'Then I will check it tonight. Again.',
  },
  seniorWork:
    'Maintenance on everything that moves, the permits, and teaching people to stay safe around machines.',
  seniorTeaches:
    'I will teach you to isolate, lock off and prove dead, every time. Then the fun part.',
  seniorSmallTalk: [
    'Your lock, your key, your life. Never lend your key.',
    'Units, units, units. Half of all calculation mistakes are units.',
    'If something does not look right, stop the job. Nobody here will ever argue.',
  ],
  tips: [
    'Write the units next to every number in a calculation.',
    'Check every calculation with a rough estimate: is the answer the right size?',
    'Never work on equipment until it is isolated, locked off and proved dead.',
    'Choose the lightest safe option, not the first one that works.',
    'Report near misses: they are free lessons.',
  ],
  news: [
    'Near-miss of the month: a ladder left by a live panel. Thank you for reporting it.',
    'Reminder: calculations are checked by a second engineer before issue.',
    'The depot’s environmental permit review is next month.',
    'New lockout padlocks in the workshop cabinet.',
  ],
}
