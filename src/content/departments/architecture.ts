/**
 * Spaces & Interiors at Cobalt Ridge Consulting: the firm's architecture and
 * interior design practice, planning homes, offices and shops for clients in
 * Space Studio. Everyone here is invented. Space guidance is simplified, for
 * learning; real projects follow the applicable regulations.
 */
import type { Department } from './types'

const person = (
  id: string,
  name: string,
  role: string,
  initials: string,
  color: string,
  startingTrust: number,
  personality: string,
) => ({
  id,
  name,
  role,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@cobaltridge.example`,
  initials,
  color,
  startingTrust,
  personality,
})

export const architecture: Department = {
  careerId: 'architecture-interiors',
  workplace: 'design',
  places: {
    desk: {
      name: 'Design studio',
      description:
        'The designers’ desks, a big table for drawings, and the samples library: tiles, fabrics and wood.',
    },
    manager: {
      name: '{manager}’s office',
      description:
        '{managerFull}, the architecture lead. Plans go to her for review before a client sees them.',
    },
  },
  team: {
    backM: { name: 'Sana Haddad', role: 'Interior Designer' },
    backR: { name: 'Callum Reid', role: 'Project Manager' },
    backL: { name: 'Wen Zhou', role: 'Architectural Technologist' },
    front2: { name: 'Ola Adeyemi', role: 'Junior Designer' },
    coordinator: { name: 'Bea Lindgren', role: 'Client Liaison' },
    admin: { name: 'Hamid Rostami', role: 'Visualiser' },
    analyst: { name: 'Grace Mwangi', role: 'Sustainability Adviser' },
  },
  name: 'Spaces & Interiors',
  sign: 'SPACES & INTERIORS',
  manager: person(
    'manager',
    'Marguerite Achebe',
    'Architecture Lead',
    'MA',
    'bg-teal-700',
    50,
    'Chartered architect. Reads a plan the way other people read a face, and always asks how someone would walk through it.',
  ),
  senior: person(
    'senior',
    'Tobias Lindqvist',
    'Senior Designer',
    'TL',
    'bg-stone-700',
    45,
    'Twenty years of fit-outs. Measures twice, sketches on anything, and is happiest when a plan finally “just works”.',
  ),
  director: 'the managing partner',
  intro:
    'Spaces & Interiors plans buildings and interiors for Cobalt Ridge’s clients: homes, offices, receptions and shops, from the first sketch to the finishes and the furniture.',
  standup: {
    senior:
      'The Harbour Housing flats need a layout review this week, and the reception refit goes to the client on Friday.',
    facilities:
      'The new sample boards are in the library: please put tiles back where you found them.',
  },
  planning: {
    lines: [
      'This week we present the reception refit to the client.',
      '{senior} has the layout. I need someone to check every door and clearance before it goes out.',
      'Any volunteers?',
    ],
    volunteerReply: 'Thank you. A second pair of eyes on a plan saves a site visit.',
    nobodyReply: 'Then I will walk it through myself tonight.',
  },
  seniorWork:
    'Layouts, fit-outs and the furniture plans, and making sure what we draw can be built.',
  seniorTeaches:
    'I will teach you to plan from how people move: doors, circulation, then the furniture.',
  seniorSmallTalk: [
    'Walk the plan in your head, from the front door. Every room should make sense on the way.',
    'Leave 600 mm to walk round furniture. People are wider than you think.',
    'Wet rooms get tiles. Always.',
  ],
  tips: [
    'Start with the circulation: how does someone get from the entrance to every room?',
    'Check every habitable room has daylight.',
    'Keep 600 mm clear in front of furniture and 900 mm in corridors.',
    'Cost the design as you go, not at the end.',
    'Write a short design statement: the client should know why, not just what.',
  ],
  news: [
    'The reception refit for the dental practice opened on time.',
    'Reminder: plans are reviewed by a second designer before they go to a client.',
    'New tile and fabric samples are in the library.',
    'Grace’s lunchtime talk this week: daylight and wellbeing at work.',
  ],
}
