/**
 * Help Desk tasks: the starting ticket queue, and grading what the player
 * did with each ticket (priority, category, status) and how they replied.
 */
import type { Assignment } from '../content/schemas'
import type { TicketsContent } from '../persistence/schemas'
import type { CheckResult, CheckStatus } from './grading'

/** The queue the player starts with: every ticket new and unanswered. */
export function buildQueueContent(assignment: Assignment): TicketsContent {
  const queue = assignment.queue
  if (!queue) return { categories: ['General'], tickets: [], knowledge: [] }
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
    })),
  }
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
  return {
    ...queue,
    tickets: queue.tickets.map((ticket) => ({
      ...ticket,
      ...assignment.ticketSolution[ticket.id],
    })),
  }
}
