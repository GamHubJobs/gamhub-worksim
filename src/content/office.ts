/**
 * The office floor: the places the player can go and the things they can use
 * there. Positions are in metres; x runs left→right, z runs back→front.
 */

export type SpotId = 'reception' | 'desk' | 'manager' | 'breakroom'

export type Vector = [number, number, number]

export interface Spot {
  id: SpotId
  name: string
  description: string
  /** Where the camera stands and what it looks at when the player is here. */
  camera: { position: Vector; target: Vector }
  /** The glowing floor marker that takes the player here. */
  marker: Vector
}

export const SPOTS: Spot[] = [
  {
    id: 'reception',
    name: 'Reception',
    description: 'The front door of Cobalt Ridge. Nina keeps the office running.',
    camera: { position: [-3.5, 3.4, 10.5], target: [-6.5, 0.9, 4.2] },
    marker: [-5.2, 0.02, 6.6],
  },
  {
    id: 'desk',
    name: 'Your desk',
    description: 'The open-plan workspace of the Finance & Administration team.',
    camera: { position: [2.2, 3.0, 6.2], target: [0.6, 0.9, 1.1] },
    marker: [0.6, 0.02, 2.6],
  },
  {
    id: 'manager',
    name: 'Priya’s office',
    description: 'Priya Raman, your manager. Her door is always open.',
    camera: { position: [7.0, 2.65, -1.55], target: [8.5, 0.95, -5.0] },
    marker: [7.4, 0.02, -2.3],
  },
  {
    id: 'breakroom',
    name: 'Break room',
    description: 'Coffee, a water cooler and the team notice board.',
    camera: { position: [-4.6, 3.1, 0.8], target: [-8.2, 0.9, -4.2] },
    marker: [-7.0, 0.02, -2.2],
  },
]

export function getSpot(id: string): Spot {
  return SPOTS.find((spot) => spot.id === id) ?? SPOTS[0]
}

/** Things the player can use or talk to. */
export type InteractionId =
  | 'computer'
  | 'receptionist'
  | 'manager'
  | 'coffee'
  | 'colleague'
  | 'noticeboard'
  | 'whiteboard'

export interface Interaction {
  id: InteractionId
  spot: SpotId
  /** The action, e.g. "Use your computer". */
  label: string
  /** A short name shown when hovering the object. */
  name: string
}

export const INTERACTIONS: Interaction[] = [
  { id: 'receptionist', spot: 'reception', label: 'Talk to Nina', name: 'Nina Patel' },
  { id: 'computer', spot: 'desk', label: 'Use your computer', name: 'Your computer' },
  {
    id: 'whiteboard',
    spot: 'desk',
    label: 'Read the team whiteboard',
    name: 'Team whiteboard',
  },
  { id: 'manager', spot: 'manager', label: 'Talk to Priya', name: 'Priya Raman' },
  { id: 'coffee', spot: 'breakroom', label: 'Make a coffee', name: 'Coffee machine' },
  { id: 'colleague', spot: 'breakroom', label: 'Chat with Tom', name: 'Tom Becker' },
  {
    id: 'noticeboard',
    spot: 'breakroom',
    label: 'Read the notice board',
    name: 'Notice board',
  },
]

export function interactionsAt(spot: SpotId): Interaction[] {
  return INTERACTIONS.filter((interaction) => interaction.spot === spot)
}

export function getInteraction(id: InteractionId): Interaction {
  return INTERACTIONS.find((interaction) => interaction.id === id)!
}

/** Practical tips Tom shares at the coffee machine. */
export const OFFICE_TIPS = [
  'Press F2 to edit a cell without retyping it. Saves me about an hour a week.',
  'If a total looks odd, click it and read the formula bar. Nine times out of ten the range is one row short.',
  'Ctrl+D fills a formula down. Select the first cell and everything below it, then press it.',
  'Put a $ in front of a column or row (like $B$2) and it stays fixed when you copy the formula.',
  'Before you send anything to Priya, change one number and check the totals update. If they don’t, something was typed in.',
  'VLOOKUP without FALSE at the end is how I once paid for 200 staplers. Always FALSE.',
  'Select a range and look at the bottom-right: the spreadsheet shows the sum and average for free.',
  'Never edit the data someone sends you. Work next to it. Then nobody can say you changed their numbers.',
]

export const COMPANY_NEWS = [
  'Quarterly all-hands on Friday at 4 pm in the large meeting room. Snacks provided.',
  'Reminder: expense claims for this month are due by the 28th.',
  'The kitchen fridge is cleared every Friday afternoon. Label your lunch!',
  'New starters: IT induction sessions run every Tuesday morning.',
]
