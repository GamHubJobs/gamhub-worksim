/**
 * Service desk reports, from the player's own ticket queues: what was
 * received, resolved and reopened, how long things took on the office clock,
 * what was overdue, by category and department, escalations, first-contact
 * resolution, and an estimate of the requesters' satisfaction. Every figure
 * is counted from saved tickets; the rules are written next to each one
 * (`REPORT_RULES`) and shown in the report.
 */
import type { Ticket, TicketsContent } from '../persistence/schemas'
import { assessCall } from '../tools/comms/model'
import { arrivedTickets, slaOf } from './sla'

export interface QueueForReport {
  title: string
  content: TicketsContent
}

export interface ServiceReport {
  queues: number
  received: number
  resolved: number
  reopened: number
  /** Average office minutes from arrival to resolution (tickets with times kept). */
  averageResolution: number | null
  overdue: number
  escalated: number
  /** Resolved without being reopened or waiting for the requester (share, 0–1). */
  firstContact: number | null
  /** Estimated requester satisfaction (0–5). */
  satisfaction: number | null
  /** Average communication assessment of the calls handled (0–100). */
  communication: number | null
  byCategory: Array<{ name: string; count: number }>
  byDepartment: Array<{ name: string; tickets: number; people: number; open: number }>
  byPriority: Array<{ priority: string; count: number; breached: number }>
}

export const REPORT_RULES: Record<string, string> = {
  received: 'Every ticket in your queues that has arrived.',
  resolved: 'Tickets resolved or closed.',
  reopened: 'Tickets that were resolved and then broke again (their history says so).',
  averageResolution:
    'From the time a ticket arrived to its resolution, on the office clock, for tickets whose times were kept.',
  overdue:
    'Tickets past their resolution target for their priority (resolved late, or still open after it).',
  escalated: 'Tickets with the status Escalated.',
  firstContact:
    'Resolved tickets that were never reopened and never had to wait for the requester, as a share of the resolved.',
  satisfaction:
    'Out of 5 for each resolved ticket: 5, minus 1 if it was overdue, 1 if it was reopened, 1 if the requester got no reply. An estimate, from what was recorded.',
  communication: 'The average of your calls’ communication assessments.',
}

const done = (t: Ticket) => t.status === 'resolved' || t.status === 'closed'
const wasReopened = (t: Ticket) => t.activity.some((a) => a.kind === 'reopened')
const waited = (t: Ticket) =>
  t.status === 'pending' ||
  t.activity.some((a) => a.kind === 'status' && /waiting/i.test(a.text))

export function serviceReport(queues: QueueForReport[], now: number): ServiceReport {
  const all = queues.flatMap((q) =>
    // Only the tickets that have come in by now.
    arrivedTickets(q.content, now).map((ticket) => ({
      ticket,
      sla: slaOf(ticket, q.content.officeDay, now),
    })),
  )
  const resolved = all.filter((x) => done(x.ticket))
  const timed = resolved.filter((x) => x.sla?.resolvedAt != null)
  const satisfaction = resolved.map((x) => {
    let score = 5
    if (x.sla?.resolution === 'breached') score -= 1
    if (wasReopened(x.ticket)) score -= 1
    if (!x.ticket.reply.trim()) score -= 1
    return score
  })
  const calls = queues
    .flatMap((q) => q.content.environment?.comms?.calls ?? [])
    .filter((c) => c.state === 'ended')
  const count = <K extends string>(keys: K[]) => {
    const map = new Map<K, number>()
    for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1)
    return map
  }
  const departments = new Map<string, { tickets: number; people: number; open: number }>()
  for (const { ticket } of all) {
    const d = departments.get(ticket.department) ?? { tickets: 0, people: 0, open: 0 }
    departments.set(ticket.department, {
      tickets: d.tickets + 1,
      people: d.people + (ticket.impact?.people ?? 1),
      open: d.open + (done(ticket) ? 0 : 1),
    })
  }
  return {
    queues: queues.length,
    received: all.length,
    resolved: resolved.length,
    reopened: all.filter((x) => wasReopened(x.ticket)).length,
    averageResolution: timed.length
      ? Math.round(
          timed.reduce((sum, x) => sum + (x.sla!.resolvedAt! - x.sla!.receivedAt), 0) /
            timed.length,
        )
      : null,
    overdue: all.filter((x) => x.sla?.resolution === 'breached').length,
    escalated: all.filter((x) => x.ticket.status === 'escalated').length,
    firstContact: resolved.length
      ? resolved.filter((x) => !wasReopened(x.ticket) && !waited(x.ticket)).length /
        resolved.length
      : null,
    satisfaction: satisfaction.length
      ? Math.round((satisfaction.reduce((a, b) => a + b, 0) / satisfaction.length) * 10) /
        10
      : null,
    communication: calls.length
      ? Math.round(calls.reduce((sum, c) => sum + assessCall(c).score, 0) / calls.length)
      : null,
    byCategory: [...count(all.map((x) => x.ticket.category ?? 'Not categorised'))]
      .map(([name, n]) => ({ name, count: n }))
      .sort((a, b) => b.count - a.count),
    byDepartment: [...departments]
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.people - a.people),
    byPriority: (['P1', 'P2', 'P3', 'P4'] as const).map((priority) => ({
      priority,
      count: all.filter((x) => x.ticket.priority === priority).length,
      breached: all.filter(
        (x) => x.ticket.priority === priority && x.sla?.resolution === 'breached',
      ).length,
    })),
  }
}
