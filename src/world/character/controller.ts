/**
 * Moving the character: walking and running relative to the camera, sideways
 * and backwards, crouching and jumping, and not going through walls or
 * furniture. Pure, so it is the same on every computer and can be tested.
 *
 * The world is flat; solid things are boxes on the floor plan (x, z) with a
 * height, turned to any angle, or round (a post, a round table). The character
 * is an upright capsule: a circle on the floor of its radius, as tall as the
 * character. Movement is taken in short steps, so running (or a fast frame)
 * cannot pass through a thin wall.
 */
export interface Box {
  /** Centre and half-size on the floor plan. */
  x: number
  z: number
  hx: number
  hz: number
  /** Top of the box (for the camera), metres. */
  top: number
  /** Turned about the vertical by this angle (radians, as three.js turns things). */
  yaw?: number
  /** Round: a circle of radius hx (hz is ignored). */
  round?: boolean
}

/** The furthest the character moves before checking for solid things again (metres). */
const MAX_MOVE = 0.1

/**
 * How far a circle overlaps a box, and the way out: [push x, push z], or null
 * if it does not overlap.
 */
export function overlap(
  x: number,
  z: number,
  radius: number,
  b: Box,
): [number, number] | null {
  if (b.round) {
    const dx = x - b.x
    const dz = z - b.z
    const d = Math.hypot(dx, dz)
    const reach = b.hx + radius
    if (d >= reach) return null
    if (d < 1e-6) return [reach, 0]
    return [(dx / d) * (reach - d), (dz / d) * (reach - d)]
  }
  // Into the box's own frame (it may be turned).
  const c = b.yaw ? Math.cos(b.yaw) : 1
  const s = b.yaw ? Math.sin(b.yaw) : 0
  const wx = x - b.x
  const wz = z - b.z
  const lx = wx * c - wz * s
  const lz = wx * s + wz * c
  const cx = Math.max(-b.hx, Math.min(lx, b.hx))
  const cz = Math.max(-b.hz, Math.min(lz, b.hz))
  let px: number
  let pz: number
  const dx = lx - cx
  const dz = lz - cz
  const d2 = dx * dx + dz * dz
  if (d2 >= radius * radius) return null
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2)
    px = (dx / d) * (radius - d)
    pz = (dz / d) * (radius - d)
  } else {
    // The centre is inside the box: out by the nearest side.
    const sides: Array<[number, number]> = [
      [-b.hx - radius - lx, 0],
      [b.hx + radius - lx, 0],
      [0, -b.hz - radius - lz],
      [0, b.hz + radius - lz],
    ]
    ;[px, pz] = sides.reduce((p, q) =>
      Math.abs(q[0]) + Math.abs(q[1]) < Math.abs(p[0]) + Math.abs(p[1]) ? q : p,
    )
  }
  // Back into the world.
  return [px * c + pz * s, -px * s + pz * c]
}

/** Whether a circle overlaps any box (by more than a hair). */
export function blocked(x: number, z: number, radius: number, boxes: Box[]): boolean {
  for (const b of boxes) if (overlap(x, z, radius - 0.01, b)) return true
  return false
}

export interface Input {
  /** -1 back … 1 forward, -1 left … 1 right. */
  forward: number
  right: number
  run: boolean
  crouch: boolean
  jump: boolean
}

export interface Body {
  x: number
  z: number
  /** Height above the floor (jumping). */
  y: number
  vy: number
  /** Where the character faces (radians; 0 faces -z, like the rig). */
  heading: number
  /** Speed over the floor, m/s (for the walk or run animation). */
  speed: number
  grounded: boolean
}

export const SPEED = { walk: 1.9, run: 4.6, crouch: 1.0, back: 1.4 }
/** On a bike: quicker, and backwards is walking it. */
export const BIKE_SPEED = { walk: 5.5, run: 8.5, crouch: 5.5, back: 1.2 }
export const RADIUS = 0.3
const GRAVITY = 16
const JUMP = 4.6
/** How quickly speed and turning catch up (per second). */
const ACCEL = 9
const TURN = 10

export const NO_INPUT: Input = {
  forward: 0,
  right: 0,
  run: false,
  crouch: false,
  jump: false,
}

export function body(x: number, z: number, heading = 0): Body {
  return { x, z, y: 0, vy: 0, heading, speed: 0, grounded: true }
}

/** The shortest signed turn from one heading to another. */
export function turnTowards(from: number, to: number, max: number): number {
  // Wrapped into −π…π with arithmetic, not loops (a huge or bad angle cannot hang it).
  const full = Math.PI * 2
  let d = ((((to - from) % full) + full + Math.PI) % full) - Math.PI
  if (!Number.isFinite(d)) d = 0
  return from + Math.max(-max, Math.min(max, d))
}

/** Pushes a circle out of every box it overlaps (so it slides along walls). */
export function collide(
  x: number,
  z: number,
  radius: number,
  boxes: Box[],
): [number, number] {
  for (let pass = 0; pass < 4; pass++) {
    let moved = false
    for (const b of boxes) {
      const push = overlap(x, z, radius, b)
      if (!push) continue
      moved = true
      x += push[0]
      z += push[1]
    }
    if (!moved) break
  }
  return [x, z]
}

/**
 * Moves a circle from (x, z) by (dx, dz) in steps no longer than MAX_MOVE,
 * sliding along what it meets, so nothing thin is skipped over, and never
 * into a gap too narrow for it.
 */
export function sweep(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  boxes: Box[],
): [number, number] {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / MAX_MOVE))
  const wasClear = !blocked(x, z, radius, boxes)
  for (let i = 0; i < n; i++) {
    const [nx, nz] = collide(x + dx / n, z + dz / n, radius, boxes)
    // Squeezed between two things (a gap narrower than the body): no further.
    if (wasClear && blocked(nx, nz, radius, boxes)) break
    x = nx
    z = nz
  }
  return [x, z]
}

/**
 * One step of movement. `cameraYaw` is the way the camera looks (0 looks
 * along -z): forward is away from the camera, as in third-person games.
 */
export function step(
  b: Body,
  input: Input,
  cameraYaw: number,
  dt: number,
  boxes: Box[],
  /** Walking speeds, or a bike's. */
  speeds: typeof SPEED = SPEED,
): Body {
  const len = Math.hypot(input.forward, input.right)
  const moving = len > 0.01
  const target = !moving
    ? 0
    : input.crouch
      ? speeds.crouch
      : input.forward < 0 && Math.abs(input.right) < 0.01 && !input.run
        ? speeds.back
        : input.run
          ? speeds.run
          : speeds.walk
  const speed = b.speed + (target - b.speed) * Math.min(1, ACCEL * dt)
  let heading = b.heading
  let x = b.x
  let z = b.z
  if (moving) {
    // The direction on the floor, relative to the camera.
    const fx = -Math.sin(cameraYaw)
    const fz = -Math.cos(cameraYaw)
    const rx = Math.cos(cameraYaw)
    const rz = -Math.sin(cameraYaw)
    const dx = (fx * input.forward + rx * input.right) / len
    const dz = (fz * input.forward + rz * input.right) / len
    // Face the way of travel, turning smoothly.
    heading = turnTowards(b.heading, Math.atan2(-dx, -dz), TURN * dt)
    ;[x, z] = sweep(x, z, dx * speed * dt, dz * speed * dt, RADIUS, boxes)
  } else if (speed > 0.05) {
    // Coming to a stop: a little further the way it was going.
    ;[x, z] = sweep(
      x,
      z,
      -Math.sin(heading) * speed * dt,
      -Math.cos(heading) * speed * dt,
      RADIUS,
      boxes,
    )
  } else [x, z] = collide(x, z, RADIUS, boxes)
  // Jumping and landing.
  let { y, vy, grounded } = b
  if (input.jump && grounded && !input.crouch) {
    vy = JUMP
    grounded = false
  }
  if (!grounded) {
    vy -= GRAVITY * dt
    y += vy * dt
    if (y <= 0) {
      y = 0
      vy = 0
      grounded = true
    }
  }
  return { x, z, y, vy, heading, speed: moving || speed > 0.05 ? speed : 0, grounded }
}

/** Walks the character towards a point (for going to an activity), returning true on arrival. */
export function walkTo(
  b: Body,
  tx: number,
  tz: number,
  dt: number,
  boxes: Box[],
  /** Walking pace, or faster for a run. */
  pace = SPEED.walk,
  /** Step into place through the furniture (the last bit, or when blocked). */
  through = false,
): { body: Body; arrived: boolean } {
  const dx = tx - b.x
  const dz = tz - b.z
  const d = Math.hypot(dx, dz)
  if (d < 0.08) return { body: { ...b, x: tx, z: tz, speed: 0 }, arrived: true }
  const speed = Math.min(pace, d / dt, b.speed + ACCEL * dt * pace)
  const heading = turnTowards(b.heading, Math.atan2(-dx, -dz), TURN * dt)
  // Stepping into place ignores furniture: the spot is where it should be.
  const [x, z] =
    through || d < 0.6
      ? [b.x + (dx / d) * speed * dt, b.z + (dz / d) * speed * dt]
      : sweep(b.x, b.z, (dx / d) * speed * dt, (dz / d) * speed * dt, RADIUS, boxes)
  return { body: { ...b, x, z, heading, speed }, arrived: false }
}

/** The nearest of some points within reach, and how far it is. */
export function nearest<T extends { x: number; z: number; reach: number }>(
  x: number,
  z: number,
  points: T[],
): T | null {
  let best: T | null = null
  let distance = Infinity
  for (const p of points) {
    const d = Math.hypot(p.x - x, p.z - z)
    if (d <= p.reach && d < distance) {
      best = p
      distance = d
    }
  }
  return best
}

/** A car: speed along its heading, steered by turning the wheels. */
export interface CarState {
  x: number
  z: number
  heading: number
  speed: number
}

export const CAR = {
  top: 11,
  fast: 16,
  reverse: 4,
  accel: 5,
  brake: 9,
  turn: 1.5,
  radius: 1.1,
}

/**
 * One step of driving: W and S are the accelerator and reverse (or the brake
 * while moving forward), A and D steer (more at speed, not at a standstill),
 * and the car slows by itself when nothing is pressed. Pure.
 */
export function drive(c: CarState, input: Input, dt: number, boxes: Box[]): CarState {
  const top = input.run ? CAR.fast : CAR.top
  let speed = c.speed
  if (input.forward > 0) speed = Math.min(top, speed + CAR.accel * dt)
  else if (input.forward < 0)
    speed =
      speed > 0.1
        ? speed - CAR.brake * dt
        : Math.max(-CAR.reverse, speed - CAR.accel * dt)
  else speed -= Math.sign(speed) * Math.min(Math.abs(speed), 2.5 * dt)
  const grip = Math.min(1, Math.abs(speed) / 3) * Math.sign(speed)
  const heading = c.heading - input.right * CAR.turn * grip * dt
  let x = c.x - Math.sin(heading) * speed * dt
  let z = c.z - Math.cos(heading) * speed * dt
  const [cx, cz] = sweep(c.x, c.z, x - c.x, z - c.z, CAR.radius, boxes)
  // Hitting something stops the car.
  if (Math.hypot(cx - x, cz - z) > 1e-3) speed *= 0.3
  x = cx
  z = cz
  return { x, z, heading, speed }
}
