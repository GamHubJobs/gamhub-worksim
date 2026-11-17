/**
 * Where colleagues go to do their profession's work, for any workplace: the
 * work stations are the workplace's own equipment, taken from the activities
 * the player does there (the copier and pigeonholes in the post room, the
 * ledger desk, the photo set, the dashboards, the sprint board, the comms
 * rack, the beds, the test bench, the library...). So a new career's
 * workplace has its colleagues using its equipment as soon as it has
 * activities, with nothing more to add.
 *
 * Each station is where the player stands for it and the way they face, and
 * what is done there (its activity's longest stage, kept on the feet).
 */
import type { ClipId } from '../../world/character/rig'
import type { Activity } from '../../world/interaction/activity'
import type { Place } from '../../world/npc/schedule'

/**
 * Clips colleagues do standing at a station that need nothing particular there
 * (world/npc/activities.ts: reaching needs a shelf or a machine in reach, presenting
 * a whiteboard); anything else becomes writing on a clipboard, or reading.
 */
const STANDING: ClipId[] = ['write', 'read', 'talk', 'phone', 'stand']

export function stationsFrom(activities: Activity[]): Place[] {
  return activities
    .filter((a) => a.action !== null && a.stages.length > 0 && a.spot.reach > 0)
    .map((a) => {
      const main = [...a.stages].sort((x, y) => y.seconds - x.seconds)[0]
      const clip = STANDING.includes(main.clip) ? main.clip : 'write'
      return {
        x: a.anchor.x,
        z: a.anchor.z,
        heading: a.anchor.heading,
        clip,
        also: [clip === 'read' ? ('write' as ClipId) : ('read' as ClipId)],
        label: `at work: ${a.prompt.replace(/\s*\(.*\)\s*$/, '')}`,
      }
    })
}
