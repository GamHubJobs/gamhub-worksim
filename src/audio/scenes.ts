/**
 * Where the player is, as far as sound is concerned: each scene has its own
 * surroundings and music, and the time of day changes both. Pure, so the
 * choice can be tested without any audio.
 */
export type Place =
  | 'office' // the open-plan floor
  | 'meeting' // the manager's office, a quiet room
  | 'breakroom'
  | 'reception'
  | 'computer' // at the desk, working on the computer
  | 'street' // the high street
  | 'residential' // the end of the street with the homes
  | 'district' // the business district by the office
  | 'park'
  | 'cafe'
  | 'shop'
  | 'gym'
  | 'garage'
  | 'home'
  | 'quiet' // the end of the day summary, menus

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'

export interface Scene {
  place: Place
  time: TimeOfDay
  /** A moment with its own music (an interview at home). */
  moment?: 'interview'
}

/** The time of day for a clock in minutes since midnight (past 24:00 at night). */
export function timeOfDay(minute: number): TimeOfDay {
  const m = minute % (24 * 60)
  if (m >= 5 * 60 && m < 9 * 60) return 'morning'
  if (m >= 9 * 60 && m < 18 * 60) return 'day'
  if (m >= 18 * 60 && m < 22 * 60) return 'evening'
  return 'night'
}

export const sceneKey = (scene: Scene | null) =>
  scene ? `${scene.place}:${scene.time}:${scene.moment ?? ''}` : 'none'

/** Background layers, by scene: steady beds and occasional events. */
export type Layer =
  | 'traffic' // a city rumble
  | 'cars' // passing vehicles
  | 'horns'
  | 'wind'
  | 'birds'
  | 'crickets'
  | 'aircon'
  | 'typing'
  | 'phones'
  | 'printer'
  | 'chatter'
  | 'chairs'
  | 'doors'
  | 'cups'
  | 'coffee'
  | 'microwave'
  | 'fridge'
  | 'clock'
  | 'till'
  | 'weights'
  | 'tools'
  | 'construction'
  | 'footsteps'

/**
 * What is heard, and how busy it is (events a minute; beds 1). The street is
 * busiest in the day, quiet at night; the office is busy in working hours.
 */
export function layersFor(scene: Scene): Partial<Record<Layer, number>> {
  const { place, time } = scene
  const busy = time === 'day' ? 1 : time === 'night' ? 0.25 : 0.6
  switch (place) {
    case 'street':
      return {
        traffic: busy,
        cars: 6 * busy,
        horns: time === 'night' ? 0 : 0.4,
        wind: 1,
        chatter: time === 'night' ? 0.5 : 3 * busy,
        footsteps: 4 * busy,
        birds: time === 'morning' ? 6 : time === 'day' ? 2 : 0,
        crickets: time === 'night' || time === 'evening' ? 1 : 0,
        construction: time === 'day' ? 1.5 : 0,
      }
    case 'residential':
      return {
        traffic: 0.5 * busy,
        cars: 2 * busy,
        wind: 1,
        birds: time === 'night' ? 0 : time === 'morning' ? 8 : 4,
        crickets: time === 'night' || time === 'evening' ? 1 : 0,
        chatter: 1 * busy,
        doors: 0.6,
        footsteps: 1.5 * busy,
      }
    case 'district':
      return {
        traffic: 1.2 * busy,
        cars: 8 * busy,
        horns: time === 'night' ? 0 : 0.6,
        wind: 1,
        chatter: 3 * busy,
        footsteps: 6 * busy,
        construction: time === 'day' || time === 'morning' ? 4 : 0,
        doors: 1.5 * busy,
      }
    case 'park':
      return {
        wind: 1,
        birds: time === 'night' ? 0 : 8,
        crickets: time === 'night' || time === 'evening' ? 1 : 0,
        traffic: 0.3 * busy,
        chatter: 1.5 * busy,
        footsteps: 2 * busy,
      }
    case 'office':
    case 'computer':
      return {
        aircon: 1,
        typing: place === 'computer' ? 3 : 8,
        phones: 0.8,
        printer: 0.6,
        chatter: 4,
        chairs: 1.5,
        doors: 0.8,
        footsteps: 3,
      }
    case 'reception':
      return { aircon: 1, doors: 2, footsteps: 4, phones: 1, chatter: 2, traffic: 0.2 }
    case 'meeting':
      return { aircon: 1, chairs: 1, clock: 1 }
    case 'breakroom':
      return { aircon: 1, coffee: 1.2, cups: 3, microwave: 0.4, chatter: 5, fridge: 1 }
    case 'cafe':
      return { coffee: 2, cups: 6, chatter: 8, doors: 1, till: 1, traffic: 0.3 }
    case 'shop':
    case 'garage':
      return place === 'shop'
        ? { aircon: 1, till: 3, footsteps: 3, chatter: 2, doors: 1 }
        : { tools: 4, doors: 1, chatter: 1, traffic: 0.4 }
    case 'gym':
      return { aircon: 1, weights: 5, footsteps: 6, chatter: 2 }
    case 'home':
      return {
        fridge: 1,
        clock: 1,
        traffic: time === 'night' ? 0.15 : 0.3,
        birds: time === 'morning' ? 2 : 0,
        crickets: time === 'night' || time === 'evening' ? 0.6 : 0,
      }
    case 'quiet':
      return {}
  }
}

/** The music for a scene, if any. */
export type Mood = 'city' | 'focus' | 'tech' | 'home' | 'cafe' | 'interview' | null

export function moodFor(scene: Scene): Mood {
  if (scene.moment === 'interview') return 'interview'
  switch (scene.place) {
    case 'street':
    case 'park':
    case 'residential':
      return 'city'
    case 'district':
      return 'tech'
    case 'office':
    case 'computer':
    case 'reception':
      return 'focus'
    case 'cafe':
      return 'cafe'
    case 'home':
      return 'home'
    case 'garage':
    case 'gym':
      return 'tech'
    default:
      return null
  }
}
