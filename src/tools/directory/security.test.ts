import { describe, expect, it } from 'vitest'
import { getAssignment } from '../../content/assignments'
import { sampleDirectory } from './data'
import {
  addToGroup,
  disableUser,
  enableUser,
  findUser,
  registerMfa,
  removeFromGroup,
  resetMfa,
  resetPassword,
  unlockUser,
} from './model'
import { DirectoryStateSchema, type DirectoryState, type Operation } from './schema'
import {
  authorize,
  callBack,
  checkAnswer,
  requestApproval,
  startVerification,
  viewSession,
  withClock,
} from './security'

/** The directory of "The Account Unlock Request": a security policy, three lockouts. */
const task = getAssignment('account-unlock')!
const start = () => DirectoryStateSchema.parse(task.queue!.environment!.directory!.start)

const T = 1_700_000_000_000
const MIN = 60_000

/** Expects an action to succeed, and returns its state. */
function ok(r: { state: DirectoryState; problems: string[] }): DirectoryState {
  expect(r.problems).toEqual([])
  return r.state
}

function verify(
  state: DirectoryState,
  input: { ticket: string; user: string; operations: Operation[]; group?: string },
  at = T,
) {
  const r = startVerification(state, input, at)
  expect(r.problems).toEqual([])
  return { state: r.state, id: r.id }
}

const lastEvent = (s: DirectoryState) => s.security!.events.at(-1)!
const user = (s: DirectoryState, id: string) => findUser(s, id)!

/** Leila (u17) verified by her badge number, for an unlock. */
function leilaVerified(at = T) {
  const v = verify(
    start(),
    { ticket: 'INC-3201', user: 'u17', operations: ['unlock'] },
    at,
  )
  return { id: v.id, state: ok(checkAnswer(v.state, v.id, 'badge', 'B-40417', at)) }
}

describe('identity verification', () => {
  it('verifies an employee whose badge number matches their record', () => {
    const { state, id } = leilaVerified()
    const session = state.security!.sessions.find((s) => s.id === id)!
    expect(viewSession(state, session)).toMatchObject({
      identity: 'verified',
      authorised: true,
      factorsDone: 1,
      factorsNeeded: 1,
    })
    expect(lastEvent(state)).toMatchObject({ kind: 'check-passed', severity: 'info' })
  })

  it('does not verify a wrong badge number, and leaves the account alone', () => {
    const v = verify(start(), { ticket: 'INC-3203', user: 'u19', operations: ['unlock'] })
    const state = ok(checkAnswer(v.state, v.id, 'badge', 'B-31960', T))
    const session = state.security!.sessions[0]
    expect(viewSession(state, session).identity).toBe('in-progress')
    expect(session.failedAttempts).toBe(1)
    expect(lastEvent(state)).toMatchObject({ kind: 'check-failed', severity: 'info' })
    expect(user(state, 'u19')).toEqual(user(start(), 'u19'))
  })

  it('does not verify a wrong employee number', () => {
    const v = verify(start(), { ticket: 'INC-3202', user: 'u18', operations: ['unlock'] })
    const state = ok(checkAnswer(v.state, v.id, 'employee-id', 'E-9999', T))
    expect(viewSession(state, state.security!.sessions[0]).factorsDone).toBe(0)
  })

  it('accepts the answer however it is typed (case, spaces, hyphens)', () => {
    const v = verify(start(), { ticket: 'INC-3201', user: 'u17', operations: ['unlock'] })
    const state = ok(checkAnswer(v.state, v.id, 'badge', ' b 40417 ', T))
    expect(viewSession(state, state.security!.sessions[0]).identity).toBe('verified')
  })

  it('cannot start for an unknown employee, or without a change', () => {
    const s = start()
    expect(
      startVerification(s, { ticket: 'INC-3201', user: 'u99', operations: ['unlock'] }, T)
        .problems,
    ).toEqual(['Choose the employee’s account first.'])
    expect(
      startVerification(s, { ticket: 'INC-3201', user: 'u17', operations: [] }, T)
        .problems,
    ).toEqual(['Choose the change they are asking for.'])
  })

  it('confirms by a callback to the extension on record, only when the right person answers', () => {
    // Carmen is at her desk: her extension confirms.
    const c = verify(start(), { ticket: 'INC-3202', user: 'u18', operations: ['unlock'] })
    const carmen = ok(callBack(c.state, c.id, 'record', T))
    expect(viewSession(carmen, carmen.security!.sessions[0]).identity).toBe('verified')
    // Owen Price is not at his desk: no answer, and no attempt counted.
    const o = verify(start(), { ticket: 'INC-3203', user: 'u19', operations: ['unlock'] })
    const owen = ok(callBack(o.state, o.id, 'record', T))
    expect(owen.security!.sessions[0]).toMatchObject({ failedAttempts: 0 })
    expect(lastEvent(owen).kind).toBe('no-answer')
    // The wrong Owen's account: Owen Clarke answers and denies asking.
    const w = verify(start(), { ticket: 'INC-3203', user: 'u14', operations: ['unlock'] })
    const wrong = ok(callBack(w.state, w.id, 'record', T))
    expect(lastEvent(wrong)).toMatchObject({ kind: 'check-failed' })
    expect(lastEvent(wrong).text).toContain('had not asked IT')
    expect(viewSession(wrong, wrong.security!.sessions[0]).factorsDone).toBe(0)
  })

  it('does not count a callback to a number the caller gave', () => {
    const o = verify(start(), { ticket: 'INC-3203', user: 'u19', operations: ['unlock'] })
    const r = callBack(o.state, o.id, 'given', T)
    expect(r.message).toContain('not on record')
    expect(lastEvent(r.state)).toMatchObject({
      kind: 'unregistered-callback',
      severity: 'warning',
    })
    expect(viewSession(r.state, r.state.security!.sessions[0]).factorsDone).toBe(0)
  })

  it('ends the verification after three wrong answers, and records it', () => {
    let { state, id } = verify(start(), {
      ticket: 'INC-3203',
      user: 'u19',
      operations: ['unlock'],
    })
    for (let i = 0; i < 3; i++) state = ok(checkAnswer(state, id, 'badge', 'B-0000', T))
    const session = state.security!.sessions[0]
    expect(session.failed).toBe(true)
    expect(lastEvent(state)).toMatchObject({
      kind: 'attempts-exceeded',
      severity: 'info',
    })
    // Even the right answer is no longer taken.
    expect(checkAnswer(state, id, 'badge', 'B-40691', T).problems[0]).toContain('failed')
    // And the account cannot be changed on it.
    const r = unlockUser(withClock(state, T), 'u19')
    expect(r.problems[0]).toContain('could not be verified')
    expect(lastEvent(r.state)).toMatchObject({
      kind: 'after-failed-verification',
      severity: 'breach',
    })
  })

  it('expires: an expired verification cannot be used, and asks for a new one', () => {
    const { state } = leilaVerified()
    const later = withClock(state, T + 11 * MIN)
    const r = unlockUser(later, 'u17')
    expect(r.problems[0]).toContain('has expired')
    expect(user(r.state, 'u17').locked).toBe(true)
    expect(lastEvent(r.state)).toMatchObject({
      kind: 'expired-session',
      severity: 'warning',
    })
    // Within its 10 minutes it works.
    expect(user(ok(unlockUser(withClock(state, T + 9 * MIN), 'u17')), 'u17').locked).toBe(
      false,
    )
    // A new verification after expiry works again.
    const again = verify(
      r.state,
      { ticket: 'INC-3201', user: 'u17', operations: ['unlock'] },
      T + 12 * MIN,
    )
    const verified = ok(
      checkAnswer(again.state, again.id, 'badge', 'B-40417', T + 12 * MIN),
    )
    expect(user(ok(unlockUser(verified, 'u17')), 'u17').locked).toBe(false)
  })

  it('covers only the employee it was done for', () => {
    const { state } = leilaVerified()
    const r = unlockUser(state, 'u18') // Carmen, with Leila's verification
    expect(r.problems[0]).toContain('nobody has verified Carmen Ruiz')
    expect(lastEvent(r.state)).toMatchObject({
      kind: 'other-employee-session',
      severity: 'breach',
      user: 'u18',
    })
    expect(user(r.state, 'u18').locked).toBe(true)
  })

  it('covers only the changes it was started for, each once', () => {
    const { state } = leilaVerified()
    const reset = resetPassword(state, 'u17')
    expect(reset.problems[0]).toContain('covers Unlock account')
    expect(lastEvent(reset.state).kind).toBe('out-of-scope')
    expect(user(reset.state, 'u17').mustChangePassword).toBe(false)
    // Used for the unlock, it is then complete: nothing more on it.
    const unlocked = ok(unlockUser(state, 'u17'))
    const session = unlocked.security!.sessions[0]
    expect(session.done).toEqual(['unlock'])
    expect(viewSession(unlocked, session).status).toBe('complete')
  })

  it('never shows or logs the record or the answer given', () => {
    const v = verify(start(), { ticket: 'INC-3203', user: 'u19', operations: ['unlock'] })
    const state = ok(checkAnswer(v.state, v.id, 'badge', 'B-31960', T))
    const logged = JSON.stringify(state.security!.events)
    expect(logged).not.toContain('B-31960')
    expect(logged).not.toContain('B-40691')
    expect(JSON.stringify(state).toLowerCase()).not.toMatch(/"password"/)
  })

  it('keeps the clock moving forward only', () => {
    const s = withClock(start(), T)
    expect(withClock(s, T - MIN)).toBe(s)
    expect(withClock(s, T + MIN).security!.clock).toBe(T + MIN)
  })
})

describe('authorisation (separate from identity)', () => {
  it('allows a verified employee a change that needs no approval', () => {
    const { state } = leilaVerified()
    expect(authorize(state, 'unlock', 'u17')).toMatchObject({ allowed: true })
  })

  it('refuses a verified employee a change that needs approval, until it is given', () => {
    const v = verify(start(), { ticket: 'INC-3202', user: 'u18', operations: ['unlock'] })
    const verified = ok(checkAnswer(v.state, v.id, 'employee-id', 'E-1018', T))
    const view = viewSession(verified, verified.security!.sessions[0])
    expect(view).toMatchObject({
      identity: 'verified',
      authorised: false,
      approvalsNeeded: ['u3'],
    })
    const refused = unlockUser(verified, 'u18')
    expect(refused.problems[0]).toContain('approval from Priya Raman')
    expect(lastEvent(refused.state)).toMatchObject({
      kind: 'insufficient-authorization',
      severity: 'warning',
    })
    expect(user(refused.state, 'u18').locked).toBe(true)
    // Someone senior, but not her manager on record, cannot approve.
    const wrong = requestApproval(refused.state, v.id, 'u1', T)
    expect(wrong.problems[0]).toContain('cannot approve')
    expect(lastEvent(wrong.state).kind).toBe('wrong-approver')
    expect(wrong.state.security!.sessions[0].approvals).toEqual([])
    // Her manager on record can.
    const approved = ok(requestApproval(wrong.state, v.id, 'u3', T))
    expect(lastEvent(approved)).toMatchObject({ kind: 'approved' })
    const unlocked = ok(unlockUser(approved, 'u18'))
    expect(user(unlocked, 'u18').locked).toBe(false)
    expect(lastEvent(unlocked).text).toContain('approved by Priya Raman')
  })

  it('refuses an unverified employee, even with approval', () => {
    const v = verify(start(), { ticket: 'INC-3202', user: 'u18', operations: ['unlock'] })
    const approved = ok(requestApproval(v.state, v.id, 'u3', T))
    const r = unlockUser(approved, 'u18')
    expect(r.problems[0]).toContain('has not been checked yet')
    expect(lastEvent(r.state)).toMatchObject({
      kind: 'no-verification',
      severity: 'breach',
    })
  })

  it('records an approver who declines, and the change stays refused', () => {
    const s = start()
    const declining = { ...s, security: { ...s.security!, declines: ['u3'] } }
    const v = verify(declining, {
      ticket: 'INC-3202',
      user: 'u18',
      operations: ['unlock'],
    })
    const verified = ok(checkAnswer(v.state, v.id, 'employee-id', 'E-1018', T))
    const declined = ok(requestApproval(verified, v.id, 'u3', T))
    expect(lastEvent(declined).kind).toBe('approval-declined')
    expect(unlockUser(declined, 'u18').problems[0]).toContain('approval')
  })

  it('needs two different checks and the owner for privileged access', () => {
    const input = {
      ticket: 'INC-3201',
      user: 'u17',
      operations: ['group-add' as const],
      group: 'g-payroll',
    }
    const v = verify(start(), input)
    let s = ok(checkAnswer(v.state, v.id, 'badge', 'B-40417', T))
    // One check is not enough for privileged access.
    let r = addToGroup(s, 'u17', 'g-payroll')
    expect(lastEvent(r.state).kind).toBe('insufficient-verification')
    expect(user(r.state, 'u17').groups).not.toContain('g-payroll')
    // The same check twice still counts once.
    s = ok(checkAnswer(s, v.id, 'badge', 'B-40417', T))
    expect(viewSession(s, s.security!.sessions[0]).factorsDone).toBe(1)
    // A second, independent check: then the group owner's approval is missing.
    s = ok(callBack(s, v.id, 'record', T))
    r = addToGroup(s, 'u17', 'g-payroll')
    expect(r.problems[0]).toContain('Priya Raman')
    expect(lastEvent(r.state).kind).toBe('insufficient-authorization')
    // Her line manager is not the group's owner.
    expect(requestApproval(s, v.id, 'u5', T).problems[0]).toContain('cannot approve')
    s = ok(requestApproval(s, v.id, 'u3', T))
    expect(user(ok(addToGroup(s, 'u17', 'g-payroll')), 'u17').groups).toContain(
      'g-payroll',
    )
  })

  it('does not let a verification for one group cover another', () => {
    const v = verify(start(), {
      ticket: 'INC-3201',
      user: 'u17',
      operations: ['group-add'],
      group: 'g-vpn',
    })
    let s = ok(checkAnswer(v.state, v.id, 'badge', 'B-40417', T))
    s = ok(requestApproval(s, v.id, 'u5', T))
    expect(addToGroup(s, 'u17', 'g-mkt').problems[0]).toContain('for this group')
    expect(user(ok(addToGroup(s, 'u17', 'g-vpn')), 'u17').groups).toContain('g-vpn')
  })
})

describe('the security policy at the Directory’s own actions', () => {
  it('refuses an unlock without verification, records it, and leaves the account', () => {
    const s = withClock(start(), T)
    const r = unlockUser(s, 'u17')
    expect(r.problems[0]).toContain('Start a verification')
    expect(user(r.state, 'u17')).toEqual(user(s, 'u17'))
    expect(r.state.audit).toEqual(s.audit) // No change was made.
    expect(lastEvent(r.state)).toMatchObject({
      kind: 'no-verification',
      severity: 'breach',
      user: 'u17',
      ticket: 'INC-3201',
      operation: 'unlock',
    })
  })

  it('refuses a password reset without verification', () => {
    const r = resetPassword(withClock(start(), T), 'u19')
    expect(r.problems[0]).toContain('policy needs')
    expect(user(r.state, 'u19').mustChangePassword).toBe(false)
    expect(lastEvent(r.state).ticket).toBe('INC-3203')
  })

  it('guards every sensitive action, however it is called', () => {
    const s = withClock(start(), T)
    const attempts: Array<[string, { state: DirectoryState; problems: string[] }]> = [
      ['unlock', unlockUser(s, 'u17')],
      ['reset-password', resetPassword(s, 'u17')],
      ['reset-mfa', resetMfa(s, 'u17')],
      [
        'register-mfa',
        registerMfa(
          {
            ...s,
            users: s.users.map((u) => (u.id === 'u17' ? { ...u, mfa: false } : u)),
          },
          'u17',
        ),
      ],
      ['disable', disableUser(s, 'u17')],
      ['enable', enableUser(s, 'u17')],
      ['group-add', addToGroup(s, 'u17', 'g-vpn')],
      ['group-remove', removeFromGroup(s, 'u17', 'g-fin')],
    ]
    for (const [op, r] of attempts) {
      expect(r.problems.length, op).toBe(1)
      expect(lastEvent(r.state).operation, op).toBe(op)
      expect(user(r.state, 'u17').groups, op).toEqual(user(s, 'u17').groups)
    }
  })

  it('lets a disable through with the manager’s approval alone (no identity needed)', () => {
    const v = verify(start(), {
      ticket: 'INC-3201',
      user: 'u17',
      operations: ['disable'],
    })
    expect(disableUser(v.state, 'u17').problems[0]).toContain('Daniel Okoro')
    const s = ok(requestApproval(v.state, v.id, 'u5', T))
    expect(user(ok(disableUser(s, 'u17')), 'u17').status).toBe('disabled')
  })

  it('changes nothing for directories without a policy (every task before this one)', () => {
    const s = sampleDirectory()
    expect(s.security).toBeUndefined()
    const r = unlockUser(
      { ...s, users: s.users.map((u) => (u.id === 'u15' ? { ...u, locked: true } : u)) },
      'u15',
    )
    expect(r.problems).toEqual([])
    expect(user(r.state, 'u15').locked).toBe(false)
    expect(r.state.security).toBeUndefined()
    expect(withClock(s, T)).toBe(s)
  })

  it('loads directories saved before the policy existed', () => {
    const old = JSON.parse(JSON.stringify(sampleDirectory())) as Record<string, unknown>
    const parsed = DirectoryStateSchema.parse(old)
    expect(parsed.security).toBeUndefined()
    expect(parsed.users[0].badge).toBeUndefined()
  })
})
