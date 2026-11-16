/**
 * How a door moves: closed, opening, open, closing, or locked. Pure, so it
 * is tested without 3D (doorMotion.test.ts); Door.tsx draws it.
 *
 * - Someone wants through (near it, or going in at it): it opens, and stays
 *   open while they do.
 * - Nobody does: it waits a moment (so it does not shut in someone's face),
 *   then closes, and latches when it is shut.
 * - Locked: it stays shut. Trying it rattles it (once per try).
 */
export type DoorState = 'closed' | 'opening' | 'open' | 'closing' | 'locked'

export interface DoorMotion {
  state: DoorState
  /** 0 shut, 1 fully open. */
  open: number
  /** Seconds since anyone wanted through (for the wait before closing). */
  idle: number
  /** Someone was trying it while locked (one rattle per try). */
  tried: boolean
}

/** What happened this step, for its sound. */
export type DoorEvent = 'opens' | 'closes' | 'shut' | 'rattle' | null

export interface DoorDrive {
  /** Someone wants through. */
  want: boolean
  locked: boolean
  /** Seconds to open fully (or close). */
  seconds: number
  /** Seconds it waits, open, once nobody wants through. */
  wait: number
}

export function closedDoor(locked = false): DoorMotion {
  return { state: locked ? 'locked' : 'closed', open: 0, idle: 0, tried: false }
}

export function stepDoor(
  m: DoorMotion,
  drive: DoorDrive,
  dt: number,
): { motion: DoorMotion; event: DoorEvent } {
  const rate = dt / Math.max(0.05, drive.seconds)
  // Locked (and shut, or shutting): it will not open.
  if (drive.locked && m.open <= 0) {
    const rattle = drive.want && !m.tried
    return {
      motion: { state: 'locked', open: 0, idle: 0, tried: drive.want },
      event: rattle ? 'rattle' : null,
    }
  }
  if (drive.want && !drive.locked) {
    const open = Math.min(1, m.open + rate)
    const event = m.state !== 'opening' && m.state !== 'open' ? 'opens' : null
    return {
      motion: { state: open >= 1 ? 'open' : 'opening', open, idle: 0, tried: false },
      event,
    }
  }
  // Nobody wants through (or it was locked while open): wait, then close.
  const idle = m.idle + dt
  if (m.open <= 0)
    return { motion: { state: 'closed', open: 0, idle, tried: false }, event: null }
  if (idle < drive.wait && !drive.locked)
    return { motion: { ...m, idle, tried: false }, event: null }
  const open = Math.max(0, m.open - rate)
  if (open <= 0)
    return {
      motion: { state: drive.locked ? 'locked' : 'closed', open: 0, idle, tried: false },
      event: 'shut',
    }
  const event = m.state !== 'closing' ? 'closes' : null
  return { motion: { state: 'closing', open, idle, tried: false }, event }
}

/** Eased, so a door starts and stops gently rather than snapping. */
export function easeDoor(open: number): number {
  const t = Math.min(1, Math.max(0, open))
  return t * t * (3 - 2 * t)
}
