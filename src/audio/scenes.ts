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
  | 'courthouse' // Westmark County Court: the hall and the courtroom
  | 'quiet' // the end of the day summary, menus

/**
 * The kind of workplace, which changes how the office sounds: a hospital ward,
 * an engineering workshop, a law firm, an IT help desk with its server
 * cabinet, a software team; or an ordinary office.
 */
export type Workplace = 'ward' | 'workshop' | 'legal' | 'it' | 'dev' | 'office'

/** How a career's workplace sounds, from its kind of workplace (and the IT help desk by career). */
export function workplaceSound(careerId: string, kind: string): Workplace {
  if (careerId === 'it-support') return 'it'
  switch (kind) {
    case 'ward':
      return 'ward'
    case 'workshop':
      return 'workshop'
    case 'courtroom':
      return 'legal'
    case 'devteam':
      return 'dev'
    default:
      return 'office'
  }
}

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'

export interface Scene {
  place: Place
  time: TimeOfDay
  /** A moment with its own music (an interview at home). */
  moment?: 'interview'
  /** It is raining (heard outdoors, softly indoors at home). */
  rain?: boolean
  /** At work: what kind of workplace it is (see Workplace). */
  workplace?: Workplace
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
  scene
    ? `${scene.place}:${scene.time}:${scene.moment ?? ''}${scene.rain ? ':rain' : ''}${
        scene.workplace ? `:${scene.workplace}` : ''
      }`
    : 'none'

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
  | 'water' // a pond lapping
  | 'ducks'
  | 'trolleys'
  | 'treadmills' // a steady hum
  | 'engines'
  | 'rain' // a steady bed
  | 'thunder'
  | 'monitors' // a ward: patient monitors' soft beeps
  | 'callbell' // a ward: the nurse-call chime
  | 'machines' // a workshop: machinery running (a steady bed)
  | 'alarm' // a workshop: a forklift's reversing beeper
  | 'servers' // a server cabinet's fans (a steady bed)
  | 'pings' // computer notifications
  | 'paper' // pages turned, files handled
  | 'gavel' // a courtroom: the judge's gavel, now and then

/**
 * What is heard, and how busy it is (events a minute; beds 1). The street is
 * busiest in the day, quiet at night; the office is busy in working hours.
 */
export function layersFor(scene: Scene): Partial<Record<Layer, number>> {
  const base = atWork(scene, baseLayers(scene))
  if (!scene.rain) return base
  const outdoors = ['street', 'residential', 'district', 'park'].includes(scene.place)
  if (outdoors) return { ...base, rain: 1, thunder: 0.4, birds: 0, crickets: 0 }
  if (scene.place === 'home') return { ...base, rain: 0.35 }
  return base
}

/** The office's sound, changed for the kind of workplace (on the floor, not at the computer). */
function atWork(
  scene: Scene,
  layers: Partial<Record<Layer, number>>,
): Partial<Record<Layer, number>> {
  const floor = ['office', 'reception', 'computer', 'breakroom'].includes(scene.place)
  if (!floor || !scene.workplace || scene.workplace === 'office') return layers
  const near = scene.place === 'computer' ? 0.4 : 1
  switch (scene.workplace) {
    case 'ward':
      return {
        ...layers,
        typing: 2 * near,
        printer: 0.2,
        phones: 0.6,
        chatter: 3,
        monitors: 14 * near,
        callbell: 1.2 * near,
        trolleys: 2 * near,
        footsteps: 5,
      }
    case 'workshop':
      return {
        ...layers,
        typing: 2 * near,
        machines: 1,
        tools: 3 * near,
        alarm: 0.5 * near,
        chatter: 2,
      }
    case 'legal':
      return { ...layers, typing: 5 * near, paper: 3 * near, phones: 1.2, chatter: 2.5 }
    case 'it':
      return { ...layers, typing: 9 * near, servers: 1, phones: 1.6, pings: 1.5 * near }
    case 'dev':
      return { ...layers, typing: 12 * near, pings: 2 * near, chatter: 3 }
    default:
      return layers
  }
}

function baseLayers(scene: Scene): Partial<Record<Layer, number>> {
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
        water: 1,
        ducks: time === 'night' ? 0 : 3,
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
        ? { aircon: 1, till: 3, trolleys: 3, footsteps: 3, chatter: 2, doors: 1 }
        : { tools: 4, engines: 1.5, doors: 1, chatter: 1, traffic: 0.4 }
    case 'gym':
      return { aircon: 1, treadmills: 1, weights: 5, footsteps: 6, chatter: 2 }
    case 'home':
      return {
        fridge: 1,
        clock: 1,
        traffic: time === 'night' ? 0.15 : 0.3,
        birds: time === 'morning' ? 2 : 0,
        crickets: time === 'night' || time === 'evening' ? 0.6 : 0,
      }
    case 'courthouse':
      // A stone hall and a courtroom: hushed voices, footsteps, doors, and the gavel.
      return {
        aircon: 1,
        chatter: 2.5,
        footsteps: 5,
        doors: 1.5,
        paper: 2,
        gavel: 0.4,
        chairs: 1,
      }
    case 'quiet':
      return {}
  }
}

/**
 * How a place sounds as a room (a reverb): how long sound lingers and how much
 * of it is heard. A stone courthouse rings; a carpeted office barely does; a
 * workshop and a gym are hard and echoey; outdoors there is no room at all.
 */
export interface Acoustics {
  /** Seconds for the echo to die away. */
  decay: number
  /** How much of the echo is heard (0 to 1). */
  wet: number
}

export function acousticsFor(scene: Scene): Acoustics | null {
  switch (scene.place) {
    case 'courthouse':
      return { decay: 2.4, wet: 0.32 }
    case 'office':
    case 'reception':
    case 'breakroom':
    case 'computer':
      return scene.workplace === 'workshop'
        ? { decay: 1.6, wet: 0.24 }
        : scene.workplace === 'ward'
          ? { decay: 1.0, wet: 0.18 }
          : { decay: 0.7, wet: 0.1 }
    case 'meeting':
      return { decay: 0.5, wet: 0.08 }
    case 'cafe':
      return { decay: 0.8, wet: 0.14 }
    case 'shop':
      return { decay: 0.9, wet: 0.14 }
    case 'gym':
    case 'garage':
      return { decay: 1.3, wet: 0.22 }
    case 'home':
      return { decay: 0.45, wet: 0.07 }
    default:
      return null
  }
}

/** The music for a scene, if any. */
export type Mood = 'city' | 'focus' | 'tech' | 'home' | 'cafe' | 'interview' | null

export function moodFor(scene: Scene): Mood {
  if (scene.moment === 'interview') return 'interview'
  if (scene.workplace === 'ward' || scene.workplace === 'workshop') return null
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
