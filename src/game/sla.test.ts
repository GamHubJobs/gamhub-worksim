import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { createId } from '../lib/ids'
import {
  TicketsContentSchema,
  type Ticket,
  type TicketsContent,
} from '../persistence/schemas'
import { connect, endProcess } from '../tools/devices/model'
import { newProfileData, type ProfileData } from './career'
import { absoluteTime } from './clock'
import { applyEnvironmentChange, assignToMe, requestStatus } from './incidents'
import { itServiceEvidence } from './reviews'
import { serviceReport } from './serviceReport'
import { arrivedTickets, hasArrived, slaOf, SLA_TARGETS } from './sla'
import {
  applyTicketSolution,
  buildQueueContent,
  gradeEnvironment,
  gradeTickets,
} from './tickets'

const DAY = 4
const at = (h: number, m = 0) => absoluteTime(DAY, h * 60 + m)
const moment = (h: number, m = 0) => ({ at: 1, time: `${h}:${m}`, office: at(h, m) })
const task = getAssignment('full-day')!
const fresh = () => buildQueueContent(task, 1_000, DAY)
const ticket = (c: TicketsContent, id: string) => c.tickets.find((t) => t.id === id)!
const withPriority = (c: TicketsContent, id: string, priority: Ticket['priority']) => ({
  ...c,
  tickets: c.tickets.map((t) => (t.id === id ? { ...t, priority } : t)),
})

describe('SLAs on the office clock', () => {
  it('have no SLA without a priority, or without the queue’s office day', () => {
    const c = fresh()
    expect(slaOf(ticket(c, 'INC-3801'), c.officeDay, at(9))).toBeNull()
    const p = withPriority(c, 'INC-3801', 'P3')
    expect(slaOf(ticket(p, 'INC-3801'), undefined, at(9))).toBeNull()
  })

  it('run from the received time: running, at risk, then breached', () => {
    const c = withPriority(fresh(), 'INC-3803', 'P2') // received 10:30; P2: respond in 1 h, fix in 8 h
    const t = ticket(c, 'INC-3803')
    const sla = (h: number, m = 0) => slaOf(t, DAY, at(h, m))!
    expect(sla(11)).toMatchObject({
      resolution: 'running',
      respondBy: at(11, 30),
      resolveBy: at(18, 30),
      remaining: 450,
    })
    expect(sla(11, 29).response).toBe('running')
    expect(sla(11, 31).response).toBe('breached')
    expect(sla(17).resolution).toBe('at-risk')
    expect(sla(18, 31).resolution).toBe('breached')
  })

  it('count the response and the resolution from the ticket’s history', () => {
    let c = withPriority(fresh(), 'INC-3801', 'P3') // received 08:30; P3: respond in 4 h, fix in 3 days
    c = assignToMe(c, 'INC-3801', moment(9))
    c = applyEnvironmentChange(
      c,
      'devices',
      (s) => connect(s, 'LT-0171').state,
      moment(9, 5),
    )
    c = applyEnvironmentChange(
      c,
      'devices',
      (s) => endProcess(s, 'LT-0171', 'ReportBuilder').state,
      moment(9, 10),
    )
    const sla = slaOf(ticket(c, 'INC-3801'), DAY, at(12))!
    expect(sla).toMatchObject({
      respondedAt: at(9),
      response: 'met',
      resolvedAt: at(9, 10),
      resolution: 'met',
    })
  })

  it('keep the targets in proportion to priority', () => {
    expect(SLA_TARGETS.P1.resolve).toBeLessThan(SLA_TARGETS.P2.resolve)
    expect(SLA_TARGETS.P3.respond).toBeLessThan(SLA_TARGETS.P4.respond)
  })
})

describe('a day with tickets arriving', () => {
  it('shows a ticket only from its received time, and earlier tasks’ tickets always', () => {
    const c = fresh()
    expect(arrivedTickets(c, at(9)).map((t) => t.id)).toEqual(['INC-3801', 'INC-3802'])
    expect(arrivedTickets(c, at(11)).map((t) => t.id)).toEqual([
      'INC-3801',
      'INC-3802',
      'INC-3803',
    ])
    expect(arrivedTickets(c, at(14))).toHaveLength(5)
    const wifi = buildQueueContent(getAssignment('wifi-outage')!, 1, DAY)
    expect(wifi.tickets.every((t) => hasArrived(t, wifi.officeDay, at(8)))).toBe(true)
  })

  it('keeps the office day with the queue; older queues load without one', () => {
    const c = fresh()
    expect(c.officeDay).toBe(DAY)
    expect(TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))).toEqual(c)
    const { officeDay: _, ...old } = c
    expect(TicketsContentSchema.parse(old).officeDay).toBeUndefined()
  })
})

describe('grading SLAs, and the model answer', () => {
  const grade = (c: TicketsContent) => [
    ...gradeTickets(task, c),
    ...gradeEnvironment(task, c),
  ]

  it('gives the model answer full marks, out of 100', () => {
    const results = grade(applyTicketSolution(task, fresh()))
    expect(results.filter((r) => r.status !== 'passed')).toEqual([])
    expect(results.reduce((sum, r) => sum + r.points, 0)).toBe(100)
  })

  it('a ticket resolved after its target, or left without a priority, misses the SLA', () => {
    let c = withPriority(fresh(), 'INC-3801', 'P1') // P1 resolve within 4 h of 08:30
    c = applyEnvironmentChange(
      c,
      'devices',
      (s) => connect(s, 'LT-0171').state,
      moment(13),
    )
    c = applyEnvironmentChange(
      c,
      'devices',
      (s) => endProcess(s, 'LT-0171', 'ReportBuilder').state,
      moment(13),
    )
    const sla = grade(c).find((r) => r.id === 'sla')!
    expect(sla.problems).toContain('INC-3801 was resolved after its P1 target.')
    expect(sla.problems).toContain('INC-3802 has no priority, so no SLA to meet.')
  })
})

describe('service desk reports', () => {
  it('count from the tickets themselves', () => {
    let c = withPriority(withPriority(fresh(), 'INC-3801', 'P3'), 'INC-3802', 'P4')
    c = applyEnvironmentChange(
      c,
      'devices',
      (s) => connect(s, 'LT-0171').state,
      moment(9),
    )
    c = applyEnvironmentChange(
      c,
      'devices',
      (s) => endProcess(s, 'LT-0171', 'ReportBuilder').state,
      moment(9, 30),
    )
    c = requestStatus(c, 'INC-3802', 'pending', moment(9, 40)).content
    const r = serviceReport([{ title: 'Day', content: c }], at(12))
    expect(r).toMatchObject({
      received: 4, // the fifth arrives at 14:00
      resolved: 1,
      reopened: 0,
      averageResolution: 60, // 08:30 to 09:30
      overdue: 0,
      firstContact: 1,
      satisfaction: 4, // resolved on time, not reopened, but no reply yet
    })
    expect(r.byPriority.find((p) => p.priority === 'P3')).toEqual({
      priority: 'P3',
      count: 1,
      breached: 0,
    })
    expect(r.byDepartment[0].name).toBe('Operations') // the board papers: 8 people
  })
})

describe('the manager’s review', () => {
  function withAttempt(
    checks: Array<{ id: string; earned: number; points: number }>,
    hintsUsed?: number,
  ) {
    const base = newProfileData('Sam', 0, 'it-support')
    const progress = {
      assignmentId: 'full-day',
      assignmentVersion: 1,
      documentId: createId(),
      startedAt: 1,
      completedSteps: [],
      attempts: [
        {
          submittedAt: 2,
          score: 80,
          rating: 'good' as const,
          checks: checks.map((c) => ({
            ...c,
            status: c.earned === c.points ? ('passed' as const) : ('failed' as const),
            problems: [],
          })),
          xpEarned: 10,
          skillXpEarned: {},
          ...(hintsUsed !== undefined ? { hintsUsed } : {}),
        },
      ],
    }
    return { ...base, assignments: { 'full-day': progress } } as ProfileData
  }

  it('mentions what the recorded results show, and nothing else', () => {
    const good = itServiceEvidence(
      withAttempt([
        { id: 'owen-fixed', earned: 10, points: 10 },
        { id: 'sla', earned: 20, points: 20 },
      ]),
    )
    expect(good.strengths).toEqual([
      'Your fixes hold: the systems show the problems really solved, not just marked resolved.',
      'You prioritise by business impact and meet the service levels.',
    ])
    expect(good.improvements).toEqual([])
    const poor = itServiceEvidence(withAttempt([{ id: 'policy', earned: 0, points: 10 }]))
    expect(poor.improvements[0]).toContain('Security procedure needs attention')
  })

  it('is only for the IT career', () => {
    const p = withAttempt([{ id: 'owen-fixed', earned: 10, points: 10 }])
    expect(itServiceEvidence({ ...p, careerId: 'finance' })).toEqual({
      strengths: [],
      improvements: [],
    })
  })
})
