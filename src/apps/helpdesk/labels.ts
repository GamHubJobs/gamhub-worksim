/** Names and meanings of ticket priorities and statuses. */
import type { TicketPriority, TicketStatus } from '../../persistence/schemas'

export const PRIORITY_INFO: Record<
  TicketPriority,
  { label: string; detail: string; color: string }
> = {
  P1: {
    label: 'P1 Critical',
    detail:
      'Many people cannot work, or a security risk. Respond within 15 minutes, fix within 4 hours.',
    color: 'bg-red-600 text-white',
  },
  P2: {
    label: 'P2 High',
    detail:
      'A team, or one person blocked on urgent work. Respond within 1 hour, fix within 8 hours.',
    color: 'bg-orange-500 text-white',
  },
  P3: {
    label: 'P3 Medium',
    detail:
      'One person affected, with a workaround. Respond within 4 hours, fix within 3 days.',
    color: 'bg-amber-300 text-amber-950',
  },
  P4: {
    label: 'P4 Low',
    detail:
      'A request or a minor annoyance. Respond within 2 working days, fix within 5 days.',
    color: 'bg-slate-200 text-slate-800',
  },
}

export const STATUS_NAMES: Record<TicketStatus, string> = {
  new: 'New',
  open: 'Open (working on it)',
  pending: 'Pending (waiting for the user)',
  escalated: 'Escalated (to a specialist team)',
  resolved: 'Resolved',
  assigned: 'Assigned',
  reopened: 'Reopened',
  closed: 'Closed',
}

/** The statuses of ordinary tickets, as before tickets were tied to the systems. */
export const CLASSIC_STATUSES: TicketStatus[] = [
  'new',
  'open',
  'pending',
  'escalated',
  'resolved',
]

/** Status names in the lifecycle of a ticket tied to the systems (see game/incidents.ts). */
export const LIFECYCLE_NAMES: Record<TicketStatus, string> = {
  new: 'Open (not assigned)',
  assigned: 'Assigned',
  open: 'In progress',
  pending: 'Waiting for information',
  escalated: 'Escalated',
  resolved: 'Resolved (problem fixed)',
  reopened: 'Reopened (the fault came back)',
  closed: 'Closed',
}
