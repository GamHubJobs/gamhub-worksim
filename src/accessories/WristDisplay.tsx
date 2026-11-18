/**
 * What a watch on the player's wrist shows (content/accessories.ts: 'time',
 * 'notifications', 'activity'), next to the clock in the bar at the top, only
 * while one is worn: a watch, the time; a smartwatch, the messages not yet read
 * too; a fitness tracker or smartwatch, how the player is (energy and stress)
 * and when they went to bed last night. All of it from the save.
 */
import { formatTime } from '../game/clock'
import { usesOf } from '../game/accessories'
import type { ProfileData } from '../game/career'
import { notices } from '../game/phone'
import { Icon } from '../ui/Icon'

export function WristDisplay({
  profile,
  minute,
}: {
  profile: ProfileData
  minute: number
}) {
  const life = profile.work.life
  const uses = usesOf(life)
  if (!uses.has('time')) return null
  const unread = uses.has('notifications')
    ? notices(profile).filter((n) => n.app === 'messages').length
    : null
  const w = profile.work.wellbeing
  const slept = life.bedtime
  // All of it, for a narrow screen (where only the time and messages show).
  const summary = [
    formatTime(minute),
    unread !== null ? `${unread} unread` : null,
    uses.has('activity')
      ? `energy ${Math.round(w.energy)}, stress ${Math.round(w.stress)}${slept !== null ? `, bed ${formatTime(slept)}` : ''}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div
      data-testid="wrist-display"
      aria-label="Your watch"
      title={summary}
      className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-2.5 py-1 text-xs whitespace-nowrap text-white shadow-inner"
    >
      <Icon name="clock" className="h-3.5 w-3.5 text-sky-300" />
      <span className="font-mono font-semibold tabular-nums">{formatTime(minute)}</span>
      {unread !== null && (
        <span
          data-testid="wrist-unread"
          className="flex items-center gap-1 text-slate-300"
        >
          <Icon name="chat" className="h-3.5 w-3.5" />
          {unread}
        </span>
      )}
      {uses.has('activity') && (
        <span data-testid="wrist-activity" className="hidden text-slate-300 2xl:inline">
          Energy {Math.round(w.energy)} · Stress {Math.round(w.stress)}
          {slept !== null ? ` · bed ${formatTime(slept)}` : ''}
        </span>
      )}
    </div>
  )
}
