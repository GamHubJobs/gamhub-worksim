/**
 * Help Desk tasks: the starting ticket queue, and grading what the player
 * did with each ticket (priority, category, status) and how they replied.
 */
import type { Assignment } from '../content/schemas'
import type { TicketEnvironment, TicketsContent } from '../persistence/schemas'
import { checkResult, type CheckInfo } from '../tools/checks'
import { getTool } from '../tools/registry'
import type { CheckResult, CheckStatus } from './grading'
import { evaluateTicket, isMonitored, materializeTickets } from './incidents'

/** The systems a queue starts with (its faults), from the task. */
function startingEnvironment(assignment: Assignment): TicketEnvironment | undefined {
  const environment = assignment.queue?.environment
  if (!environment) return undefined
  const out: TicketEnvironment = {}
  if (environment.network)
    out.network = getTool('network')!.state.parse(environment.network.start)
  if (environment.directory)
    out.directory = getTool('directory')!.state.parse(environment.directory.start)
  if (environment.devices)
    out.devices = getTool('devices')!.state.parse(environment.devices.start)
  if (environment.comms)
    out.comms = getTool('comms')!.state.parse(environment.comms.start)
  if (environment.soc) out.soc = getTool('soc')!.state.parse(environment.soc.start)
  return out
}

/**
 * The queue the player starts with: every ticket new and unanswered. Tickets
 * tied to the systems start their history ("Ticket created").
 */
export function buildQueueContent(
  assignment: Assignment,
  now = Date.now(),
): TicketsContent {
  const queue = assignment.queue
  if (!queue) return { categories: ['General'], tickets: [], knowledge: [] }
  const environment = startingEnvironment(assignment)
  return {
    categories: queue.categories,
    knowledge: queue.knowledge,
    tickets: queue.tickets.map((ticket) => ({
      ...ticket,
      priority: null,
      category: null,
      status: 'new',
      reply: '',
      note: '',
      assignee: null,
      resolution: null,
      hintsUsed: 0,
      activity: ticket.conditions.length
        ? [
            {
              at: now,
              time: ticket.received,
              kind: 'created' as const,
              text: `Ticket created by ${ticket.from}: ${ticket.subject}`,
            },
          ]
        : [],
    })),
    ...(environment ? { environment } : {}),
  }
}

/**
 * Grades the player's work in the queue's systems with each tool's own
 * checks (findings recorded, tests run), as a task done in that tool would be.
 */
export function gradeEnvironment(
  assignment: Assignment,
  queue: TicketsContent | null,
): CheckResult[] {
  const environment = assignment.queue?.environment
  if (!environment) return []
  return (['network', 'directory', 'devices', 'comms', 'soc'] as const).flatMap((id) => {
    const task = environment[id]
    const tool = getTool(id)
    if (!task || !tool || task.checks.length === 0) return []
    const checks = task.checks as CheckInfo[]
    const state = queue?.environment?.[id]
    if (!state)
      return checks.map((check) =>
        checkResult(check, 0, [`The work in ${tool.name} was not handed in.`]),
      )
    try {
      return tool.grade(task.checks, state, {
        start: task.start,
        solution: task.solution,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      return checks.map((check) =>
        checkResult(check, 0, [`The work could not be checked: ${reason}`]),
      )
    }
  })
}

const FIELD_NAMES = {
  priority: 'priority',
  category: 'category',
  status: 'status',
} as const

function result(
  check: Assignment['ticketChecks'][number],
  fraction: number,
  problems: string[],
): CheckResult {
  const earned = Math.round(check.points * Math.max(0, Math.min(1, fraction)))
  const status: CheckStatus =
    earned === check.points ? 'passed' : earned === 0 ? 'failed' : 'partial'
  return {
    id: check.id,
    title: check.title,
    why: check.why,
    hint: check.hint,
    status,
    earned,
    points: check.points,
    problems: status === 'passed' ? [] : problems.slice(0, 5),
  }
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/** Grades the ticket checks of a Help Desk task. A missing queue scores nothing. */
export function gradeTickets(
  assignment: Assignment,
  queue: TicketsContent | null,
): CheckResult[] {
  return assignment.ticketChecks.map((check) => {
    if (!queue) return result(check, 0, ['The ticket queue was not handed in.'])
    const byId = new Map(queue.tickets.map((t) => [t.id, t]))

    if (check.type === 'field') {
      const ids = check.tickets.length
        ? check.tickets
        : Object.keys(assignment.ticketSolution).filter(
            (id) => assignment.ticketSolution[id][check.field] !== undefined,
          )
      const problems: string[] = []
      let right = 0
      for (const id of ids) {
        const expected = assignment.ticketSolution[id]?.[check.field]
        const actual = byId.get(id)?.[check.field] ?? null
        if (expected === undefined) continue
        if (actual === expected) right++
        else
          problems.push(
            actual === null
              ? `${id} has no ${FIELD_NAMES[check.field]} yet.`
              : `${id}: the ${FIELD_NAMES[check.field]} “${actual}” is not right.`,
          )
      }
      return result(check, ids.length ? right / ids.length : 0, problems)
    }

    if (check.type === 'fixed') {
      // Checked in the systems themselves: choosing Resolved earns nothing.
      const ticket = byId.get(check.ticket)
      if (!ticket) return result(check, 0, [`${check.ticket} is not in the queue.`])
      if (!isMonitored(ticket))
        return result(check, 0, [`${check.ticket} is not tied to the systems.`])
      const evaluation = evaluateTicket(ticket, queue.environment)
      const done = ticket.status === 'resolved' || ticket.status === 'closed'
      return result(
        check,
        evaluation.fixed && done ? 1 : 0,
        evaluation.fixed
          ? [`${check.ticket} is fixed, but its status is still “${ticket.status}”.`]
          : [
              `${check.ticket} is not fixed: ${evaluation.failing.map((r) => r.state).join(' ')}`,
            ],
      )
    }

    // A reply: enough words, and the right things said.
    const ticket = byId.get(check.ticket)
    const reply = ticket?.reply ?? ''
    if (!reply.trim()) {
      return result(check, 0, [`${check.ticket} has no reply yet.`])
    }
    const lower = reply.toLowerCase()
    const missing = check.mentions.filter(
      (alternatives) => !alternatives.some((term) => lower.includes(term.toLowerCase())),
    )
    const parts = check.mentions.length + 1
    const longEnough = words(reply) >= check.minWords
    const score = (check.mentions.length - missing.length + (longEnough ? 1 : 0)) / parts
    return result(check, score, [
      ...missing.map(
        (alternatives) =>
          `The reply to ${check.ticket} does not mention ${alternatives[0]}.`,
      ),
      ...(longEnough
        ? []
        : [
            `The reply to ${check.ticket} is very short (${words(reply)} words); explain a little more.`,
          ]),
    ])
  })
}

/** The queue with the model answer's priorities, categories and statuses applied. */
export function applyTicketSolution(
  assignment: Assignment,
  queue: TicketsContent,
): TicketsContent {
  const environment = assignment.queue?.environment
  const solved: TicketEnvironment | undefined =
    environment && queue.environment
      ? {
          ...queue.environment,
          ...(environment.network
            ? { network: getTool('network')!.state.parse(environment.network.solution) }
            : {}),
          ...(environment.directory
            ? {
                directory: getTool('directory')!.state.parse(
                  environment.directory.solution,
                ),
              }
            : {}),
          ...(environment.devices
            ? { devices: getTool('devices')!.state.parse(environment.devices.solution) }
            : {}),
          ...(environment.comms
            ? { comms: getTool('comms')!.state.parse(environment.comms.solution) }
            : {}),
          ...(environment.soc
            ? { soc: getTool('soc')!.state.parse(environment.soc.solution) }
            : {}),
        }
      : queue.environment
  // Tickets the model answer opened from voicemail and calls are added first.
  const withEnvironment = materializeTickets(
    { ...queue, ...(solved ? { environment: solved } : {}) },
    queue.environment?.comms,
    { at: 0, time: '' },
  )
  return {
    ...withEnvironment,
    tickets: withEnvironment.tickets.map((ticket) => ({
      ...ticket,
      ...assignment.ticketSolution[ticket.id],
    })),
  }
}
