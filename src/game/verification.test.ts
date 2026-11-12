import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import {
  TicketsContentSchema,
  WorkStateSchema,
  type TicketsContent,
} from '../persistence/schemas'
import { resetPassword, unlockUser } from '../tools/directory/model'
import type { DirectoryState } from '../tools/directory/schema'
import {
  callBack,
  checkAnswer,
  requestApproval,
  startVerification,
  withClock,
} from '../tools/directory/security'
import { newProfileData } from './career'
import { troubleLine } from './encounters'
import {
  applyEnvironmentChange,
  assignToMe,
  disruptionsOf,
  evaluateTicket,
  requestStatus,
  troubleOf,
} from './incidents'
import {
  applyTicketSolution,
  buildQueueContent,
  gradeEnvironment,
  gradeTickets,
} from './tickets'

const task = getAssignment('account-unlock')!
const T = 1_700_000_000_000
const MIN = 60_000
const at = (minutes = 0) => ({ at: T + minutes * MIN, time: 'Tuesday (day 4), 09:30' })
const fresh = () => buildQueueContent(task, T - MIN)
const ticket = (content: TicketsContent, id: string) =>
  content.tickets.find((t) => t.id === id)!
const directory = (content: TicketsContent) => content.environment!.directory!
const account = (content: TicketsContent, id: string) =>
  directory(content).users.find((u) => u.id === id)!

/** A change in the Directory, as the Help Desk makes it (the clock set first). */
const dir = (
  content: TicketsContent,
  step: (s: DirectoryState, at: number) => { state: DirectoryState },
  minutes = 0,
) => {
  const when = at(minutes)
  return applyEnvironmentChange(
    content,
    'directory',
    (s) => step(withClock(s, when.at), when.at).state,
    when,
  )
}

const start = (
  content: TicketsContent,
  ticketId: string,
  user: string,
  operations: Parameters<typeof startVerification>[1]['operations'],
  minutes = 0,
) =>
  dir(
    content,
    (s, t) => startVerification(s, { ticket: ticketId, user, operations }, t),
    minutes,
  )

const session = (content: TicketsContent, ticketId: string) =>
  directory(content).security!.sessions.findLast((s) => s.ticket === ticketId)!

const kinds = (content: TicketsContent, id: string) =>
  ticket(content, id).activity.map((a) => a.kind)

/** Leila verified by her badge, then unlocked. */
function leilaDone(content = fresh()) {
  let c = start(content, 'INC-3201', 'u17', ['unlock'])
  const id = session(c, 'INC-3201').id
  c = dir(c, (s, t) => checkAnswer(s, id, 'badge', 'B-40417', t))
  return dir(c, (s) => unlockUser(s, 'u17'))
}

describe('tickets and identity verification', () => {
  it('starts with every ticket open, and a policy that needs verification', () => {
    const c = fresh()
    expect(directory(c).security).toMatchObject({ sessions: [], events: [], clock: 0 })
    for (const t of c.tickets) expect(evaluateTicket(t, c.environment).fixed).toBe(false)
  })

  it('a failed verification does not resolve the ticket, and is in its history', () => {
    let c = start(fresh(), 'INC-3203', 'u19', ['unlock', 'reset-password'])
    const id = session(c, 'INC-3203').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'badge', 'B-31960', t))
    c = dir(c, (s, t) => callBack(s, id, 'record', t))
    const owen = ticket(c, 'INC-3203')
    expect(owen.status).toBe('new')
    expect(account(c, 'u19')).toMatchObject({ locked: true, mustChangePassword: false })
    const notes = owen.activity
      .filter((a) => a.kind === 'verification')
      .map((a) => a.text)
    expect(notes).toEqual([
      expect.stringContaining('Verification VS-1 started for Owen Price'),
      expect.stringContaining('does not match Owen Price’s record'),
      expect.stringContaining('No answer at extension 2264'),
    ])
    // The other tickets are untouched.
    expect(ticket(c, 'INC-3201').activity).toEqual(ticket(fresh(), 'INC-3201').activity)
  })

  it('a successful verification alone does not resolve the ticket', () => {
    let c = start(fresh(), 'INC-3201', 'u17', ['unlock'])
    const id = session(c, 'INC-3201').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'badge', 'B-40417', t))
    expect(ticket(c, 'INC-3201').status).toBe('new')
    expect(evaluateTicket(ticket(c, 'INC-3201'), c.environment).fixed).toBe(false)
  })

  it('the verified repair resolves the ticket by itself (Phase 1 conditions)', () => {
    const c = leilaDone()
    const leila = ticket(c, 'INC-3201')
    expect(leila.status).toBe('resolved')
    expect(leila.resolution).toMatchObject({ by: 'automatic' })
    expect(kinds(c, 'INC-3201')).toEqual(
      expect.arrayContaining([
        'verification',
        'change',
        'condition-ok',
        'resolved',
        'update-sent',
      ]),
    )
  })

  it('a refused attempt is a security event in the right ticket, and fixes nothing', () => {
    const c = dir(fresh(), (s) => unlockUser(s, 'u18'))
    const carmen = ticket(c, 'INC-3202')
    expect(carmen.status).toBe('new')
    expect(account(c, 'u18').locked).toBe(true)
    expect(carmen.activity.at(-1)).toMatchObject({ kind: 'security' })
    expect(carmen.activity.at(-1)!.text).toMatch(/^Security policy breach: Refused/)
    expect(kinds(c, 'INC-3201')).toEqual(['created'])
  })

  it('Carmen: refused until her manager approves, then resolved', () => {
    let c = start(fresh(), 'INC-3202', 'u18', ['unlock'])
    const id = session(c, 'INC-3202').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'employee-id', 'E-1018', t))
    c = dir(c, (s) => unlockUser(s, 'u18'))
    expect(ticket(c, 'INC-3202').activity.at(-1)!.text).toContain(
      'Refused by the security policy',
    )
    expect(ticket(c, 'INC-3202').status).not.toBe('resolved')
    c = dir(c, (s, t) => requestApproval(s, id, 'u3', t))
    c = dir(c, (s) => unlockUser(s, 'u18'))
    expect(ticket(c, 'INC-3202').status).toBe('resolved')
  })

  it('takes an assigned ticket to In progress once verification starts', () => {
    let c = assignToMe(fresh(), 'INC-3201', at())
    c = start(c, 'INC-3201', 'u17', ['unlock'])
    expect(ticket(c, 'INC-3201').status).toBe('open')
  })

  it('still refuses Resolved while the problem is there, and keeps the attempt', () => {
    const { content, refused } = requestStatus(fresh(), 'INC-3203', 'resolved', at())
    expect(refused?.[0]).toBe('The problem is not fixed yet.')
    expect(kinds(content, 'INC-3203').at(-1)).toBe('resolve-rejected')
    // Waiting for information is allowed (Owen could not be verified).
    expect(requestStatus(content, 'INC-3203', 'pending', at()).content).toMatchObject({})
    expect(
      ticket(requestStatus(content, 'INC-3203', 'pending', at()).content, 'INC-3203')
        .status,
    ).toBe('pending')
  })

  it('does not write an event to the history twice', () => {
    const c = leilaDone()
    const events = directory(c).security!.events
    const notes = ticket(c, 'INC-3201').activity.filter((a) => a.kind === 'verification')
    // Every event except "performed" (that one is the "Change made" note) is written once.
    expect(notes.map((n) => n.text)).toEqual(
      events.filter((e) => e.kind !== 'performed').map((e) => e.text),
    )
    // A change that records nothing new adds nothing.
    const clockOnly = applyEnvironmentChange(
      c,
      'directory',
      (s) => withClock(s, T + MIN),
      at(1),
    )
    expect(ticket(clockOnly, 'INC-3201').activity).toEqual(ticket(c, 'INC-3201').activity)
    // A new attempt adds exactly one entry.
    const again = dir(c, (s) => resetPassword(s, 'u17'), 2)
    expect(ticket(again, 'INC-3201').activity.length).toBe(
      ticket(c, 'INC-3201').activity.length + 1,
    )
    // Saving and loading adds nothing.
    const reloaded = TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))
    expect(reloaded).toEqual(c)
  })
})

describe('saving and loading', () => {
  it('keeps sessions, outcomes and security events', () => {
    let c = start(fresh(), 'INC-3202', 'u18', ['unlock'])
    const id = session(c, 'INC-3202').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'employee-id', 'E-1018', t))
    c = dir(c, (s) => unlockUser(s, 'u18'))
    const reloaded = TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))
    expect(directory(reloaded).security).toEqual(directory(c).security)
    expect(ticket(reloaded, 'INC-3202').activity).toEqual(ticket(c, 'INC-3202').activity)
  })

  it('an expired verification stays expired after loading, and cannot be used', () => {
    let c = start(fresh(), 'INC-3201', 'u17', ['unlock'])
    const id = session(c, 'INC-3201').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'badge', 'B-40417', t))
    const reloaded = TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))
    // Later than its 10 minutes (the clock on reload is the real time again).
    const late = dir(reloaded, (s) => unlockUser(s, 'u17'), 15)
    expect(account(late, 'u17').locked).toBe(true)
    expect(directory(late).security!.events.at(-1)!.kind).toBe('expired-session')
    expect(ticket(late, 'INC-3201').status).not.toBe('resolved')
  })

  it('a verification is not permanent: once used, the next change needs a new one', () => {
    let c = start(fresh(), 'INC-3201', 'u17', ['unlock'])
    const id = session(c, 'INC-3201').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'badge', 'B-40417', t))
    c = dir(c, (s) => unlockUser(s, 'u17'))
    const reloaded = TicketsContentSchema.parse(JSON.parse(JSON.stringify(c)))
    const reset = dir(reloaded, (s) => resetPassword(s, 'u17'), 1)
    expect(account(reset, 'u17').mustChangePassword).toBe(false)
  })

  it('loads Phase 1 queues and older profiles unchanged', () => {
    const wifi = buildQueueContent(getAssignment('wifi-outage')!, T)
    const parsed = TicketsContentSchema.parse(JSON.parse(JSON.stringify(wifi)))
    expect(parsed).toEqual(wifi)
    expect(parsed.environment!.directory!.security).toBeUndefined()
    // Leila's Phase 1 lockout still needs no verification.
    const fixed = applyEnvironmentChange(
      applyEnvironmentChange(
        parsed,
        'directory',
        (s) => resetPassword(s, 'u17').state,
        at(),
      ),
      'directory',
      (s) => unlockUser(s, 'u17').state,
      at(),
    )
    expect(ticket(fixed, 'INC-3103').status).toBe('resolved')
    // A profile saved before the verification stage existed.
    const work = newProfileData('Sam', 0, 'it-support').work
    const old = {
      ...work,
      disruptions: [
        {
          person: 'backM',
          assignment: 'wifi-outage',
          ticket: 'INC-3103',
          state: 'blocked',
          what: 'their account',
        },
      ],
    }
    expect(WorkStateSchema.parse(old).disruptions[0].stage).toBeUndefined()
  })
})

describe('colleagues and verification', () => {
  it('says where their verification stands, from the real outcomes', () => {
    let c = fresh()
    const stage = (content: TicketsContent, person: string) =>
      disruptionsOf(content, task.id).find((d) => d.person === person)!.stage
    expect(stage(c, 'backM')).toBeUndefined()
    c = start(c, 'INC-3201', 'u17', ['unlock'])
    expect(stage(c, 'backM')).toBe('verifying')
    // Owen: a wrong badge and no answer: not verified.
    c = start(c, 'INC-3203', 'u19', ['unlock'])
    const owen = session(c, 'INC-3203').id
    c = dir(c, (s, t) => checkAnswer(s, owen, 'badge', 'B-31960', t))
    expect(stage(c, 'backR')).toBe('unverified')
    c = dir(c, (s, t) => checkAnswer(s, owen, 'badge', 'B-31960', t))
    expect(stage(c, 'backR')).toBe('frustrated')
    // Carmen verified, waiting for her manager.
    c = start(c, 'INC-3202', 'u18', ['unlock'])
    const carmen = session(c, 'INC-3202').id
    c = dir(c, (s, t) => checkAnswer(s, carmen, 'employee-id', 'E-1018', t))
    expect(stage(c, 'front2')).toBe('awaiting-approval')
    // Leila, verified and unlocked: back at work, and glad it was checked.
    const done = leilaDone(c)
    const leila = disruptionsOf(done, task.id).find((d) => d.person === 'backM')!
    expect(leila).toMatchObject({ state: 'restored', stage: 'verified' })
    expect(troubleLine(leila)).toContain('checking it was really me')
  })

  it('has a line for each stage, and none for colleagues not affected', () => {
    for (const stage of [
      'verifying',
      'unverified',
      'awaiting-approval',
      'frustrated',
    ] as const)
      expect(
        troubleLine({ what: 'their account', state: 'blocked', stage }),
      ).not.toContain('Is my ticket with you')
    const disruptions = disruptionsOf(fresh(), task.id)
    expect(troubleOf(disruptions, 'manager', () => true)).toBeUndefined()
    expect(troubleOf(disruptions, 'backM', () => false)).toBeUndefined()
  })
})

describe('grading the process, not only the result', () => {
  const grade = (c: TicketsContent) => [
    ...gradeTickets(task, c),
    ...gradeEnvironment(task, c),
  ]
  const status = (c: TicketsContent, id: string) => grade(c).find((r) => r.id === id)!

  it('gives the model answer full marks (replies aside)', () => {
    const solved = applyTicketSolution(task, fresh())
    const notPassed = grade(solved).filter(
      (c) => c.id !== 'owen-reply' && c.status !== 'passed',
    )
    expect(notPassed).toEqual([])
    const points = grade(solved).reduce((sum, c) => sum + c.points, 0)
    expect(points).toBe(100)
  })

  it('scores a bypass attempt as a breach', () => {
    const c = dir(fresh(), (s) => unlockUser(s, 'u17'))
    const policy = status(c, 'policy')
    expect(policy.status).toBe('failed')
    expect(policy.problems[0]).toContain('Policy breach')
    expect(status(c, 'leila-verified').status).toBe('failed')
  })

  it('takes a little off for a reasonable refusal, nothing for a wrong answer', () => {
    let c = start(fresh(), 'INC-3203', 'u19', ['unlock'])
    const id = session(c, 'INC-3203').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'badge', 'B-31960', t))
    expect(status(c, 'policy').status).toBe('passed')
    c = dir(c, (s, t) => callBack(s, id, 'given', t))
    expect(status(c, 'policy')).toMatchObject({ status: 'partial' })
  })

  it('credits a failed verification handled correctly', () => {
    let c = start(fresh(), 'INC-3203', 'u19', ['unlock'])
    expect(status(c, 'owen-not-verified').status).toBe('failed')
    const id = session(c, 'INC-3203').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'badge', 'B-31960', t))
    expect(status(c, 'owen-not-verified').status).toBe('passed')
    expect(status(c, 'owen-unchanged').status).toBe('passed')
  })

  it('half credit for Carmen unlocked without her manager is impossible: it is refused', () => {
    let c = start(fresh(), 'INC-3202', 'u18', ['unlock'])
    const id = session(c, 'INC-3202').id
    c = dir(c, (s, t) => checkAnswer(s, id, 'employee-id', 'E-1018', t))
    c = dir(c, (s) => unlockUser(s, 'u18'))
    expect(status(c, 'carmen-verified')).toMatchObject({ status: 'partial' })
    expect(status(c, 'carmen-fixed').status).toBe('failed')
  })
})
