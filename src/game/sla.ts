/**
 * Service level agreements (SLAs), on the office clock. Each priority has a
 * response target (someone starts on it) and a resolution target (it is
 * fixed). Times come from the game's own clock: when the ticket arrived (its
 * received time on the queue's office day) and the office time written on
 * each history entry. Nothing here uses real time, and nothing runs on a
 * timer: the state is worked out whenever it is shown.
 */
import type { Ticket, TicketPriority, TicketsContent } from '../persistence/schemas'
import { absoluteTime } from './clock'

/**
 * Targets in office minutes: the same as the priority labels the player sees
 * (apps/helpdesk/labels.ts). Days are counted on the office clock.
 */
export const SLA_TARGETS: Record<TicketPriority, { respond: number; resolve: number }> = {
  P1: { respond: 15, resolve: 240 },
  P2: { respond: 60, resolve: 480 },
  P3: { respond: 240, resolve: 3 * 1440 },
  P4: { respond: 2 * 1440, resolve: 5 * 1440 },
}

/** Less than this share of the resolution time left: at risk. */
export const AT_RISK = 0.25

export type SlaState = 'met' | 'running' | 'at-risk' | 'breached'

export interface Sla {
  priority: TicketPriority
  receivedAt: number
  respondBy: number
  resolveBy: number
  respondedAt: number | null
  resolvedAt: number | null
  response: 'met' | 'running' | 'breached'
  resolution: SlaState
  /** Office minutes until the resolution target (negative: overdue). */
  remaining: number
}

/** "08:57" → minutes since midnight (null if it is not a time). */
export function minutesOf(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** History entries that show someone working on the ticket (not its creation or a hint). */
const WORK = new Set([
  'assigned',
  'status',
  'change',
  'verification',
  'security',
  'contact',
  'resolve-rejected',
  'resolved',
])

/**
 * A ticket's SLA, or null when it cannot be worked out: no priority yet, or a
 * queue from before office times were kept.
 */
export function slaOf(
  ticket: Ticket,
  officeDay: number | undefined,
  now: number,
): Sla | null {
  const received = minutesOf(ticket.received)
  if (!ticket.priority || officeDay === undefined || received === null) return null
  const target = SLA_TARGETS[ticket.priority]
  const receivedAt = absoluteTime(officeDay, received)
  const respondBy = receivedAt + target.respond
  const resolveBy = receivedAt + target.resolve
  const respondedAt =
    ticket.activity.find((a) => WORK.has(a.kind) && a.office !== undefined)?.office ??
    null
  const resolvedAt =
    ticket.status === 'resolved' || ticket.status === 'closed'
      ? (ticket.activity.findLast(
          (a) =>
            (a.kind === 'resolved' ||
              (a.kind === 'status' && /resolved|closed/i.test(a.text))) &&
            a.office !== undefined,
        )?.office ?? null)
      : null
  const response =
    respondedAt !== null
      ? respondedAt <= respondBy
        ? 'met'
        : 'breached'
      : now > respondBy
        ? 'breached'
        : 'running'
  const done = ticket.status === 'resolved' || ticket.status === 'closed'
  const resolution: SlaState = done
    ? resolvedAt === null || resolvedAt <= resolveBy
      ? 'met'
      : 'breached'
    : now > resolveBy
      ? 'breached'
      : resolveBy - now < target.resolve * AT_RISK
        ? 'at-risk'
        : 'running'
  return {
    priority: ticket.priority,
    receivedAt,
    respondBy,
    resolveBy,
    respondedAt,
    resolvedAt,
    response,
    resolution,
    remaining: resolveBy - now,
  }
}

/** "2 h 05 min", "45 min" (for time left or overdue). */
export function formatMinutes(minutes: number): string {
  const m = Math.abs(Math.round(minutes))
  const h = Math.floor(m / 60)
  return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}

/**
 * Whether a ticket has arrived yet. A ticket marked "arrivesLater" comes in at
 * its received time on the queue's office day; every other ticket is there from
 * the start (as in every task before this one).
 */
export function hasArrived(
  ticket: Ticket,
  officeDay: number | undefined,
  now: number,
): boolean {
  if (!ticket.arrivesLater || officeDay === undefined) return true
  const received = minutesOf(ticket.received) ?? 0
  return now >= absoluteTime(officeDay, received)
}

/** The tickets of a queue that have arrived by now. */
export const arrivedTickets = (content: TicketsContent, now: number) =>
  content.tickets.filter((t) => hasArrived(t, content.officeDay, now))
