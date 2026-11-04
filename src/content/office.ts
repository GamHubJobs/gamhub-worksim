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
    name: '{manager}’s office',
    description: '{managerFull}, your manager. The door is always open.',
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
  | 'lunch'
  | 'home'
  | 'senior'
  | 'arrange'

export interface Interaction {
  id: InteractionId
  spot: SpotId
  /** The action, e.g. "Use your computer". */
  label: string
  /** A short name shown when hovering the object. */
  name: string
  /** Office minutes it takes, shown on the button. */
  minutes?: number
}

export const INTERACTIONS: Interaction[] = [
  {
    id: 'receptionist',
    spot: 'reception',
    label: 'Talk to Nina',
    name: 'Nina Patel',
    minutes: 10,
  },
  { id: 'home', spot: 'reception', label: 'Go home', name: 'Exit' },
  { id: 'computer', spot: 'desk', label: 'Use your computer', name: 'Your computer' },
  {
    id: 'senior',
    spot: 'desk',
    label: 'Talk to {senior}',
    name: '{seniorFull}',
    minutes: 10,
  },
  {
    id: 'arrange',
    spot: 'desk',
    label: 'Arrange your desk',
    name: 'Your desk',
  },
  {
    id: 'whiteboard',
    spot: 'desk',
    label: 'Read the team whiteboard',
    name: 'Team whiteboard',
  },
  {
    id: 'manager',
    spot: 'manager',
    label: 'Talk to {manager}',
    name: '{managerFull}',
    minutes: 10,
  },
  {
    id: 'coffee',
    spot: 'breakroom',
    label: 'Make a coffee',
    name: 'Coffee machine',
    minutes: 10,
  },
  { id: 'lunch', spot: 'breakroom', label: 'Have lunch', name: 'Lunch', minutes: 45 },
  {
    id: 'colleague',
    spot: 'breakroom',
    label: 'Chat with Tom',
    name: 'Tom Becker',
    minutes: 10,
  },
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
