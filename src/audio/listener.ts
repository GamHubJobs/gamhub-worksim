/**
 * Where the player hears from: the 3D view's camera, its position and the
 * way it faces, kept up to date by each view (world/look/SceneLook.tsx). A
 * sound played at a place in the world (a doorbell, a colleague's greeting,
 * a door) is then heard from that side and quieter with distance (spatial).
 */

/** Something with a position and a facing (the 3D view's camera). */
interface Ear {
  position: { x: number; z: number }
  getWorldDirection(target: { x: number; y: number; z: number }): unknown
}

let ear: Ear | null = null
const facing = { x: 0, y: 0, z: -1 }

/** The 3D view's camera is where the player hears from (null: no 3D view). */
export function hearFrom(camera: Ear | null): void {
  ear = camera
}

/** Where the player hears from now, worked out when a sound plays (not every frame). */
export function listenerNow(): { x: number; z: number; yaw: number; active: boolean } {
  if (!ear) return { x: 0, z: 0, yaw: 0, active: false }
  ear.getWorldDirection(facing)
  return {
    x: ear.position.x,
    z: ear.position.z,
    yaw: Math.atan2(-facing.x, -facing.z),
    active: true,
  }
}

/**
 * How a sound at (x, z) is heard: from the left (-1) to the right (1), and
 * how loud (1 close by, fading with distance; quieter behind).
 */
export function spatial(
  x: number,
  z: number,
  from = listenerNow(),
): { pan: number; gain: number } {
  if (!from.active) return { pan: 0, gain: 1 }
  const dx = x - from.x
  const dz = z - from.z
  const distance = Math.hypot(dx, dz)
  if (distance < 0.5) return { pan: 0, gain: 1 }
  // The camera faces along (-sin yaw, -cos yaw); its right is (cos yaw, -sin yaw).
  const right = (dx * Math.cos(from.yaw) - dz * Math.sin(from.yaw)) / distance
  const ahead = (-dx * Math.sin(from.yaw) - dz * Math.cos(from.yaw)) / distance
  const gain = Math.min(1, 3 / (3 + Math.max(0, distance - 1))) * (ahead < 0 ? 0.8 : 1)
  return { pan: Math.max(-1, Math.min(1, right)) * 0.85, gain }
}
