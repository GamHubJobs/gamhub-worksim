/**
 * The adults in the world who could become close to the player: their age
 * (all 18 or over), what they love and dislike, what they want from a
 * relationship, their boundaries, and whether romance with the player is
 * something they would ever want (some would not, and that is fine). Each one
 * is a person already in the world (by their id): the café, the gym, the
 * garage, the office. Original characters.
 */

export type Interest =
  | 'cooking'
  | 'films'
  | 'music'
  | 'running'
  | 'books'
  | 'art'
  | 'football'
  | 'gaming'
  | 'travel'
  | 'nature'
  | 'baking'
  | 'cars'

export type Boundary =
  /** Takes things slowly: no kiss before dating for a while. */
  | 'slow'
  /** Not in front of other people: affection in private only. */
  | 'private'
  /** Does not date colleagues. */
  | 'not-at-work'

export interface Adult {
  id: string
  age: number
  /** What they do for a living (when it is not what the player sees them doing). */
  life: string
  likes: Interest[]
  dislikes: Interest[]
  /** What they would want, if it came to it. */
  wants: 'serious' | 'easy-going' | 'friendship'
  /** Whether romance with the player could ever happen (some are just not interested). */
  romance: boolean
  boundaries: Boundary[]
  /** Free evenings for dates (weekdays 0 = Monday). */
  free: number[]
}

export const ADULTS: Record<string, Adult> = {
  'cafe:barista': {
    id: 'cafe:barista',
    age: 31,
    life: 'Runs Kettle & Crumb, which she took over from her grandfather',
    likes: ['baking', 'music', 'nature'],
    dislikes: ['football'],
    wants: 'serious',
    romance: true,
    boundaries: ['slow'],
    free: [0, 2, 6],
  },
  'cafe:friend': {
    id: 'cafe:friend',
    age: 29,
    life: 'An architect who works from the café on Fridays',
    likes: ['art', 'travel', 'films'],
    dislikes: ['gaming'],
    wants: 'easy-going',
    romance: true,
    boundaries: [],
    free: [1, 3, 4, 5],
  },
  'gym:runner1': {
    id: 'gym:runner1',
    age: 33,
    life: 'A paramedic on shifts, who runs to switch off',
    likes: ['running', 'football', 'cooking'],
    dislikes: ['books'],
    wants: 'serious',
    romance: true,
    boundaries: ['private'],
    free: [1, 4, 5],
  },
  'gym:runner2': {
    id: 'gym:runner2',
    age: 27,
    life: 'An illustrator, quiet until you mention comics',
    likes: ['art', 'books', 'gaming'],
    dislikes: ['running'],
    wants: 'easy-going',
    romance: true,
    boundaries: ['slow', 'private'],
    free: [0, 3, 6],
  },
  'garage:sales': {
    id: 'garage:sales',
    age: 35,
    life: 'Sells bikes and cars, restores old motorbikes at weekends',
    likes: ['cars', 'music', 'travel'],
    dislikes: ['art'],
    wants: 'serious',
    romance: true,
    boundaries: [],
    free: [2, 4, 5, 6],
  },
  analyst: {
    id: 'analyst',
    age: 30,
    life: 'A data analyst at Cobalt Ridge',
    likes: ['gaming', 'films', 'cooking'],
    dislikes: ['nature'],
    wants: 'serious',
    romance: true,
    boundaries: [],
    free: [1, 3, 4],
  },
  backM: {
    id: 'backM',
    age: 34,
    life: 'An accounts assistant at Cobalt Ridge, and the office’s best-informed person',
    likes: ['films', 'music', 'travel'],
    dislikes: ['cars'],
    wants: 'friendship',
    // Happily married, and very clear about it.
    romance: false,
    boundaries: ['not-at-work'],
    free: [3],
  },
  'park:walter': {
    id: 'park:walter',
    age: 78,
    life: 'Retired; a widower who knows everyone on the street',
    likes: ['nature', 'books', 'football'],
    dislikes: ['gaming'],
    wants: 'friendship',
    romance: false,
    boundaries: [],
    free: [0, 1, 2, 3, 4, 5, 6],
  },
}

export const INTERESTS: Record<Interest, string> = {
  cooking: 'cooking',
  films: 'films',
  music: 'live music',
  running: 'running',
  books: 'books',
  art: 'art and drawing',
  football: 'football',
  gaming: 'video games',
  travel: 'travelling',
  nature: 'walks in the country',
  baking: 'baking',
  cars: 'old cars and motorbikes',
}
