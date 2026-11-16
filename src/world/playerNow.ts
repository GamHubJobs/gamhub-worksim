/**
 * What the player is doing now (the activity and how far into it), for things
 * in the scene that respond to it without a World provider (doors, in the
 * street and the office). The player's rig writes it every frame; only one
 * place is shown at a time, so one value serves.
 */
import type { ActivityNow } from './PlayerRig'

export const playerNow: { current: ActivityNow } = {
  current: { id: null, t: 0, x: 0, z: 0 },
}
