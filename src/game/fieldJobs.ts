/**
 * Hands-on IT work in the office, from a ticket queue: what physically needs
 * a technician, and where. The office shows a marker on that equipment, and
 * the work is done there in person (see office/OnSiteWork.tsx):
 *
 * - **cabinet:** a device in the office comms cabinet has stopped responding
 *   (it cannot be reached remotely, so it is power-cycled there);
 * - **collect / repair / return:** a colleague's laptop with a hardware
 *   fault is collected from their desk, repaired at the IT workbench, and
 *   handed back at their desk;
 * - **build:** a computer is needed (or a build is under way) at the bench.
 *
 * Pure: worked out again whenever the queue changes, nothing stored but the
 * result (kept with the player's work so the office knows).
 */
import type { FieldJob, Ticket, TicketsContent } from '../persistence/schemas'
import { OFFICE_CABINET } from '../tools/itops/data'
import { nodeState, shelfUnits } from '../tools/itops/model'

const open = (t: Ticket) => t.status !== 'resolved' && t.status !== 'closed'

export function fieldJobsOf(
  content: TicketsContent,
  assignment: string,
  document: string,
): FieldJob[] {
  const itops = content.environment?.itops
  if (!itops) return []
  const tickets = content.tickets.filter(open)
  const jobs: FieldJob[] = []
  const base = { assignment, document }

  for (const node of itops.nodes) {
    if (node.location !== OFFICE_CABINET) continue
    const s = nodeState(itops, node)
    if (s !== 'down' && s !== 'off') continue
    const ticket = tickets.find((t) =>
      t.conditions.some((c) => c.type === 'node-up' && c.node === node.id),
    )
    jobs.push({
      ...base,
      ticket: ticket?.id ?? '',
      kind: 'cabinet',
      target: 'cabinet',
      subject: node.id,
      label: `${node.id} is not responding: power-cycle it at the comms cabinet`,
    })
  }

  for (const ticket of tickets)
    for (const c of ticket.conditions) {
      if (c.type !== 'hardware-ok' || !ticket.requester) continue
      const asset = itops.assets.find((a) => a.tag === c.tag)
      if (!asset) continue
      const job = itops.repairs.find((j) => j.tag === c.tag)
      const first = ticket.from.split(' ')[0]
      const person = `person:${ticket.requester}`
      const common = { ...base, ticket: ticket.id, subject: c.tag }
      if (!job) {
        if (asset.hwFault)
          jobs.push({
            ...common,
            kind: 'collect',
            target: person,
            label: `Collect ${first}’s laptop (${c.tag})`,
          })
        continue
      }
      const done =
        job.verified &&
        !job.coverOff &&
        job.screwsOut.length === 0 &&
        job.batteryConnected
      jobs.push(
        done
          ? {
              ...common,
              kind: 'return',
              target: person,
              label: `Return ${c.tag} to ${first}`,
            }
          : {
              ...common,
              kind: 'repair',
              target: 'bench',
              label: `Repair ${c.tag} at the IT workbench`,
            },
      )
    }

  const needsBuild = tickets.some((t) =>
    t.conditions.some((c) => c.type === 'has-computer'),
  )
  if (
    itops.run ||
    (needsBuild &&
      shelfUnits(itops).filter((u) => u.status !== 'needs-image').length === 0)
  ) {
    const ticket = tickets.find((t) =>
      t.conditions.some((c) => c.type === 'has-computer'),
    )
    jobs.push({
      ...base,
      ticket: ticket?.id ?? '',
      kind: 'build',
      target: 'bench',
      subject: itops.run?.unit ?? '',
      label: itops.run
        ? 'Finish the build on the IT workbench'
        : 'Build a computer at the IT workbench',
    })
  }
  return jobs
}

/** The office person a target is at, if it is a person. */
export const personOf = (target: string): string | null =>
  target.startsWith('person:') ? target.slice('person:'.length) : null
