/**
 * The fictional company the player works for, and the people in it.
 * Everyone here is invented; any resemblance to real people is accidental.
 */
export const COMPANY = {
  name: 'Cobalt Ridge Consulting',
  shortName: 'Cobalt Ridge',
  emailDomain: 'cobaltridge.example',
  description:
    'A mid-sized consulting firm with about 120 staff. The Finance & Administration team keeps the office running and the money in order.',
} as const

export interface Person {
  id: string
  name: string
  role: string
  email: string
  /** Initials shown in avatars. */
  initials: string
  /** Avatar background colour (Tailwind class). */
  color: string
}

export const PEOPLE: Record<string, Person> = {
  manager: {
    id: 'manager',
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    email: `priya.raman@${COMPANY.emailDomain}`,
    initials: 'PR',
    color: 'bg-teal-600',
  },
  facilities: {
    id: 'facilities',
    name: 'Tom Becker',
    role: 'Facilities Coordinator',
    email: `tom.becker@${COMPANY.emailDomain}`,
    initials: 'TB',
    color: 'bg-amber-600',
  },
  reception: {
    id: 'reception',
    name: 'Nina Patel',
    role: 'Receptionist & Office Coordinator',
    email: `nina.patel@${COMPANY.emailDomain}`,
    initials: 'NP',
    color: 'bg-rose-600',
  },
  hr: {
    id: 'hr',
    name: 'Grace Okafor',
    role: 'People & Culture Partner',
    email: `grace.okafor@${COMPANY.emailDomain}`,
    initials: 'GO',
    color: 'bg-violet-600',
  },
}

export function getPerson(id: string): Person {
  return PEOPLE[id] ?? PEOPLE.manager
}
