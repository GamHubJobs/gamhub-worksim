import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import type { TicketsContent } from '../persistence/schemas'
import { gradeAssignment } from './grading'
import { applyTicketSolution, buildQueueContent, gradeTickets } from './tickets'

const triage = getAssignment('triage-queue')!

function withReply(queue: TicketsContent, id: string, reply: string): TicketsContent {
  return {
    ...queue,
    tickets: queue.tickets.map((t) => (t.id === id ? { ...t, reply } : t)),
  }
}

describe('Help Desk tasks', () => {
  it('start with every ticket new and unanswered', () => {
    const queue = buildQueueContent(triage)
    expect(queue.tickets).toHaveLength(8)
    expect(queue.tickets.every((t) => t.status === 'new' && t.priority === null)).toBe(
      true,
    )
    expect(queue.knowledge.map((k) => k.title)).toContain('How to set the priority')
  })

  it('give full marks for correct triage and a good reply', () => {
    let queue = applyTicketSolution(triage, buildQueueContent(triage))
    queue = withReply(
      queue,
      'INC-2044',
      'Hi Liam, thank you for reporting this; it is a phishing email. Please delete it without clicking any link. IT will never ask for your password by email. We have passed it to the Security team.',
    )
    const result = gradeAssignment(triage, queue)
    expect(result.checks.filter((c) => c.status !== 'passed')).toEqual([])
    expect(result.score).toBe(100)
  })

  it('explain wrong priorities and a weak reply', () => {
    let queue = applyTicketSolution(triage, buildQueueContent(triage))
    queue = {
      ...queue,
      tickets: queue.tickets.map((t) =>
        t.id === 'INC-2041' ? { ...t, priority: 'P3' as const } : t,
      ),
    }
    queue = withReply(queue, 'INC-2044', 'Ok.')
    const checks = gradeTickets(triage, queue)
    const priorities = checks.find((c) => c.id === 'priorities')!
    expect(priorities.status).toBe('partial')
    expect(priorities.problems).toEqual(['INC-2041: the priority “P3” is not right.'])
    const reply = checks.find((c) => c.id === 'phishing-reply')!
    expect(reply.status).toBe('failed')
    expect(reply.problems).toContain('The reply to INC-2044 does not mention thank.')
    expect(reply.problems.at(-1)).toContain('very short')
  })

  it('score nothing when the queue was not handed in', () => {
    const checks = gradeTickets(triage, null)
    expect(checks.every((c) => c.earned === 0)).toBe(true)
  })

  it('fill in the department’s names in task text', () => {
    expect(getAssignment('recurring-problem')!.briefing.body).toContain(
      'Jess found the cause',
    )
    expect(getAssignment('major-incident')!.briefing.body).toContain('the head of IT')
  })
})
