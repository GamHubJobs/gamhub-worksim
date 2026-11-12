import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { TicketsContentSchema, type TicketsContent } from '../persistence/schemas'
import { restartDevice, restartService, setDnsRecord } from '../tools/network/actions'
import { newProfileData } from './career'
import {
  applyEnvironmentChange,
  applyServiceOutcomes,
  disruptionsOf,
  evaluateTicket,
  serviceOutcomes,
  TRUST_FIXED,
  TRUST_LEFT_STUCK,
} from './incidents'
import { trustOf } from './relationships'
import {
  applyTicketSolution,
  buildQueueContent,
  gradeEnvironment,
  gradeTickets,
} from './tickets'

const task = getAssignment('company-outage')!
const when = { at: 3_000, time: 'Monday (day 8), 09:10' }
const fresh = () => buildQueueContent(task, 1_000)
const status = (c: TicketsContent, id: string) =>
  c.tickets.find((t) => t.id === id)!.status
const net = (
  c: TicketsContent,
  step: Parameters<typeof applyEnvironmentChange<'network'>>[2],
) => applyEnvironmentChange(c, 'network', step, when)

describe('one morning, five departments', () => {
  it('starts with every department’s ticket failing, each with its business impact', () => {
    const c = fresh()
    for (const id of ['INC-3601', 'INC-3602', 'INC-3603', 'INC-3604', 'INC-3605'])
      expect(
        evaluateTicket(
          c.tickets.find((t) => t.id === id)!,
          c.environment,
        ).fixed,
        id,
      ).toBe(false)
    expect(c.tickets.find((t) => t.id === 'INC-3601')!.impact).toEqual({
      service: 'Shared drive (Finance)',
      people: 14,
      deadline: 'Payroll run at 12:00',
    })
  })

  it('one fix at the source resolves the three departments that share it, and only them', () => {
    const c = net(fresh(), (s) => restartService(s, 'FILE-01', 445).state)
    expect(['INC-3601', 'INC-3602', 'INC-3603'].map((id) => status(c, id))).toEqual([
      'resolved',
      'resolved',
      'resolved',
    ])
    expect(status(c, 'INC-3604')).toBe('new')
    expect(status(c, 'INC-3605')).toBe('new')
  })

  it('the other causes resolve their own departments', () => {
    let c = net(fresh(), (s) => restartDevice(s, 'DEV-01').state)
    expect(status(c, 'INC-3604')).toBe('resolved')
    c = net(c, (s) => setDnsRecord(s, 'intranet', '10.20.0.21').state)
    expect(status(c, 'INC-3605')).toBe('resolved')
    expect(status(c, 'INC-3601')).toBe('new')
  })

  it('holds up only the office colleagues among the requesters', () => {
    const held = disruptionsOf(fresh(), task.id)
    expect(held.map((d) => d.person).sort()).toEqual(['analyst', 'backL', 'front2'])
  })
})

describe('grading prioritisation', () => {
  const grade = (c: TicketsContent) => [
    ...gradeTickets(task, c),
    ...gradeEnvironment(task, c),
  ]

  it('gives the model answer full marks (replies aside), out of 100', () => {
    const results = grade(applyTicketSolution(task, fresh()))
    expect(
      results.filter((r) => !r.id.endsWith('-reply') && r.status !== 'passed'),
    ).toEqual([])
    expect(results.reduce((sum, r) => sum + r.points, 0)).toBe(100)
  })

  it('treating everything as urgent is not right', () => {
    const c = fresh()
    const allP1 = {
      ...c,
      tickets: c.tickets.map((t) => ({ ...t, priority: 'P1' as const })),
    }
    const priorities = grade(allP1).find((r) => r.id === 'priorities')!
    expect(priorities.status).toBe('partial')
    expect(priorities.problems).toContain('INC-3606: the priority “P1” is not right.')
  })
})

describe('workplace consequences', () => {
  it('colleagues whose problem was fixed trust you more; those left stuck, less', () => {
    const fixed = net(fresh(), (s) => restartService(s, 'FILE-01', 445).state)
    const outcomes = serviceOutcomes(fixed)
    expect(
      outcomes
        .filter((o) => o.fixed)
        .map((o) => o.person)
        .sort(),
    ).toEqual(['analyst', 'backL', 'front2'])
    const work = newProfileData('Sam', 0, 'it-support').work
    const after = applyServiceOutcomes(work, outcomes)
    expect(trustOf(after, 'front2')).toBe(trustOf(work, 'front2') + TRUST_FIXED)
    expect(after.reputation).toBeGreaterThan(work.reputation)
    const stuck = applyServiceOutcomes(work, serviceOutcomes(fresh()))
    expect(trustOf(stuck, 'front2')).toBe(trustOf(work, 'front2') + TRUST_LEFT_STUCK)
    expect(stuck.reputation).toBeLessThan(work.reputation)
  })

  it('saves the impact with the queue; older tickets load without one', () => {
    const c = fresh()
    expect(TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))).toEqual(c)
    const { impact: _, ...old } = c.tickets[0]
    expect(
      TicketsContentSchema.parse({ ...c, tickets: [old] }).tickets[0].impact,
    ).toBeUndefined()
  })
})
