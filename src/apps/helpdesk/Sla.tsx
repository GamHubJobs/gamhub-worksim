/** A ticket's SLA, shown in the queue (a badge) and on the ticket (a line). */
import { formatMinutes, type Sla } from '../../game/sla'
import { formatTime, splitTime } from '../../game/clock'
import { Icon } from '../../ui/Icon'

const TONES = {
  met: 'bg-emerald-100 text-emerald-800',
  running: 'bg-slate-100 text-slate-700',
  'at-risk': 'bg-amber-100 text-amber-900',
  breached: 'bg-red-100 text-red-800',
} as const

function label(sla: Sla): string {
  switch (sla.resolution) {
    case 'met':
      return 'SLA met'
    case 'breached':
      return sla.resolvedAt !== null
        ? 'Resolved late'
        : `Overdue ${formatMinutes(sla.remaining)}`
    default:
      return `${formatMinutes(sla.remaining)} left`
  }
}

export function SlaBadge({ sla }: { sla: Sla | null }) {
  if (!sla) return null
  return (
    <span
      className={`shrink-0 rounded px-1.5 font-medium whitespace-nowrap ${TONES[sla.resolution]}`}
      data-testid="sla-badge"
      data-state={sla.resolution}
    >
      {label(sla)}
    </span>
  )
}

const at = (absolute: number) => formatTime(splitTime(absolute).minute)

export function SlaLine({ sla }: { sla: Sla | null }) {
  if (!sla) return null
  return (
    <p
      className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2.5 py-1.5 text-xs ${TONES[sla.resolution]}`}
      data-testid="sla-line"
      data-state={sla.resolution}
    >
      <Icon name="clock" className="h-3.5 w-3.5" />
      <span className="font-semibold">
        {sla.priority} SLA: {label(sla)}
      </span>
      <span>
        Respond by {at(sla.respondBy)} (
        {sla.response === 'met'
          ? 'done'
          : sla.response === 'breached'
            ? 'missed'
            : 'not yet'}
        )
      </span>
      <span>Resolve by {at(sla.resolveBy)}</span>
    </p>
  )
}
