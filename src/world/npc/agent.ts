/**
 * Moving one person to where their schedule says: on a way found round the
 * furniture (the same solid shapes the player bumps into), stopping on arrival,
 * waiting for someone in the way, finding the way again if it stays blocked,
 * and, if that keeps failing, stepping on through rather than trying the same
 * walk forever. Arriving and leaving are through the door. Pure, so it can be
 * tested; the scene draws what this gives.
 */
import { walkTo, body, turnTowards, type Box } from '../character/controller'
import { buildGrid, findPath, type Grid, type Point } from '../physics/nav'

export const NPC_RADIUS = 0.26
const PACE = 1.25

export interface Goal {
  key: string
  x: number
  z: number
  heading: number
}

export interface Agent {
  id: string
  x: number
  z: number
  heading: number
  speed: number
  shown: boolean
  status: 'hidden' | 'walking' | 'waiting' | 'there'
  /** The goal being walked to (its key), and the way there. */
  goal: string | null
  path: Point[]
  /** Seconds waiting for someone in the way, without getting nearer, and since arriving. */
  waited: number
  stuck: number
  best: number
  tries: number
  since: number
}

export function agent(id: string): Agent {
  return {
    id,
    x: 0,
    z: 0,
    heading: 0,
    speed: 0,
    shown: false,
    status: 'hidden',
    goal: null,
    path: [],
    waited: 0,
    stuck: 0,
    best: Infinity,
    tries: 0,
    since: 0,
  }
}

/** Puts someone straight at their goal (on arrival in the place, or after time jumped on). */
export function placeAt(a: Agent, goal: Goal | null): Agent {
  if (!goal) return { ...agent(a.id) }
  return {
    ...a,
    x: goal.x,
    z: goal.z,
    heading: goal.heading,
    speed: 0,
    shown: true,
    status: 'there',
    goal: goal.key,
    path: [],
    waited: 0,
    stuck: 0,
    tries: 0,
    since: 0,
  }
}

/** Whether someone else is just ahead, in the way. */
function blockedBy(a: Agent, to: Point, others: Box[]): boolean {
  const dx = to.x - a.x
  const dz = to.z - a.z
  const d = Math.hypot(dx, dz)
  if (d < 1e-3) return false
  for (const o of others) {
    const ox = o.x - a.x
    const oz = o.z - a.z
    const along = (ox * dx + oz * dz) / d
    if (along <= 0 || along > 0.85) continue
    const side = Math.abs(ox * dz - oz * dx) / d
    if (side < o.hx + NPC_RADIUS) return true
  }
  return false
}

export interface World {
  grid: Grid
  solids: Box[]
  /** Where people come in and go out. */
  door: Point
}

/**
 * One moment for one person. `goal` is where they should be (null: away, so
 * out through the door); `others` are the other people and the player.
 */
export function stepAgent(
  a: Agent,
  goal: Goal | null,
  world: World,
  others: Box[],
  dt: number,
): Agent {
  // Away: out through the door, then gone.
  const target: Goal | null =
    goal ?? (a.shown ? { key: 'door', ...world.door, heading: 0 } : null)
  if (!target) return a.status === 'hidden' ? a : { ...agent(a.id) }
  let s = a
  if (!s.shown)
    s = { ...s, x: world.door.x, z: world.door.z, shown: true, status: 'walking' }
  if (s.goal !== target.key) {
    s = {
      ...s,
      goal: target.key,
      path: findPath(world.grid, s, target) ?? [{ x: target.x, z: target.z }],
      status: 'walking',
      waited: 0,
      stuck: 0,
      best: Infinity,
      tries: 0,
      since: 0,
    }
  }
  if (s.status === 'there') {
    // Settled: turn to face the right way, and stay.
    return {
      ...s,
      heading: turnTowards(s.heading, target.heading, dt * 4),
      since: s.since + dt,
    }
  }
  // Past the points already reached.
  const path = s.path.slice()
  while (path.length > 1 && Math.hypot(path[0].x - s.x, path[0].z - s.z) < 0.25)
    path.shift()
  const to = path[0] ?? { x: target.x, z: target.z }
  const last = path.length <= 1
  if (blockedBy(s, to, others)) {
    const waited = s.waited + dt
    if (waited > 2.5 && s.tries < 3) {
      // Still in the way: round them, treating people as obstacles for this walk.
      const grid = buildGrid([...world.solids, ...others], NPC_RADIUS + 0.04)
      return {
        ...s,
        path: findPath(grid, s, target) ?? path,
        waited: 0,
        tries: s.tries + 1,
        status: 'walking',
        speed: 0,
      }
    }
    // Waiting, unless it has tried enough: then excuse themselves past.
    if (s.tries < 3) return { ...s, path, waited, status: 'waiting', speed: 0 }
  }
  // No nearer for a while (sliding on a corner): find the way again, then step through.
  const d = Math.hypot(to.x - s.x, to.z - s.z)
  let { stuck, best } = s
  const { tries } = s
  // A new point on the way: start judging progress afresh.
  if (s.path[0] !== path[0]) {
    best = Infinity
    stuck = 0
  }
  if (d < best - 0.02) {
    best = d
    stuck = 0
  } else stuck += dt
  if (stuck > 2 && tries < 3) {
    return {
      ...s,
      path: findPath(world.grid, s, target) ?? path,
      stuck: 0,
      best: Infinity,
      tries: tries + 1,
    }
  }
  const ghost = (last && d < 0.7) || tries >= 3
  const moved = walkTo(
    { ...body(s.x, s.z, s.heading), speed: s.speed },
    to.x,
    to.z,
    dt,
    world.solids,
    PACE,
    ghost,
  )
  const next: Agent = {
    ...s,
    x: moved.body.x,
    z: moved.body.z,
    heading: moved.body.heading,
    speed: moved.body.speed,
    path,
    stuck,
    best,
    tries,
    waited: 0,
    status: 'walking',
  }
  if (moved.arrived && last) {
    if (target.key === 'door') return { ...agent(a.id) }
    return {
      ...next,
      x: target.x,
      z: target.z,
      status: 'there',
      speed: 0,
      path: [],
      since: 0,
    }
  }
  if (moved.arrived) {
    path.shift()
    return { ...next, path, best: Infinity, stuck: 0 }
  }
  return next
}
