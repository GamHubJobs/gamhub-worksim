/**
 * What the player's own equipment adds to what they do at work (game/accessories.ts):
 * with a stethoscope of their own round their neck, seeing a patient at the
 * bedside includes listening to their chest with it; with an ID badge on, they
 * show it at reception before saying hello. Without them the activities are as
 * they always were: nothing is refused or skipped. Pure.
 */
import type { Use } from '../../content/accessories'
import type { Activity } from '../../world/interaction/activity'

export function withOwnKit(activities: Activity[], uses: Set<Use>): Activity[] {
  if (!uses.has('stethoscope') && !uses.has('id')) return activities
  return activities.map((a) => {
    if (a.id === 'bedside' && uses.has('stethoscope'))
      return {
        ...a,
        stages: [
          ...a.stages,
          {
            clip: 'reach',
            seconds: 1.4,
            label: 'Listening to the chest with your stethoscope',
          },
        ],
      }
    if (a.id === 'receptionist' && uses.has('id'))
      return {
        ...a,
        stages: [
          { clip: 'stand', seconds: 0.7, label: 'Showing your ID badge' },
          ...a.stages,
        ],
      }
    return a
  })
}
