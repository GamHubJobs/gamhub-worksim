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
  /** How much they trust a newcomer before getting to know them (0–100). */
  startingTrust: number
  /** What they are like to work with, shown in the Career app. */
  personality: string
}

/**
 * People who are the same in every department: reception, facilities and HR.
 * Each department adds its own manager and senior colleague (see
 * `departments/`), and `getPerson` finds anyone by ID or role.
 */
export const SHARED_PEOPLE: Record<string, Person> = {
  facilities: {
    id: 'facilities',
    name: 'Tom Becker',
    role: 'Facilities Coordinator',
    email: `tom.becker@${COMPANY.emailDomain}`,
    initials: 'TB',
    color: 'bg-amber-700',
    startingTrust: 55,
    personality:
      'Laid-back and practical, with a dry sense of humour. Knows every shortcut in the building and is always up for a coffee.',
  },
  reception: {
    id: 'reception',
    name: 'Nina Patel',
    role: 'Receptionist & Office Coordinator',
    email: `nina.patel@${COMPANY.emailDomain}`,
    initials: 'NP',
    color: 'bg-rose-700',
    startingTrust: 55,
    personality:
      'Warm and very organised. Knows everyone, and hears about everything that happens in the office, sometimes a little wrongly.',
  },
  hr: {
    id: 'hr',
    name: 'Grace Okafor',
    role: 'People & Culture Partner',
    email: `grace.okafor@${COMPANY.emailDomain}`,
    initials: 'GO',
    color: 'bg-violet-600',
    startingTrust: 50,
    personality: 'Looks after people: wellbeing, training and anything awkward.',
  },
}
