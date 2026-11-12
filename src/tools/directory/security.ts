/**
 * Identity verification and access control for Directory: who is asking, and
 * whether the change they ask for is allowed.
 *
 * A directory can carry a security policy (`state.security`; the scenarios
 * that use it set it, older ones do not and work as before). With a policy,
 * every sensitive account action (unlock, password and MFA resets, enabling,
 * disabling, group changes) is checked here, inside the action itself
 * (see `guarded` in model.ts), whichever screen or code calls it:
 *
 * 1. **Identity**: is this really the employee? A verification session is
 *    started for one account, one ticket and the changes asked for. The
 *    checks compare what the person gives with the directory's own records
 *    (employee number, badge number), or call back the extension on record.
 * 2. **Authorisation**: may this change be made? Some changes also need the
 *    approval of someone the records say can give it (the line manager, or a
 *    privileged group's owner).
 * 3. **The operation** is allowed only with a session that covers it, has not
 *    expired, and has enough of both. It is then used up for that change.
 *
 * Everything is pure and deterministic. The clock is `security.clock`, set by
 * the host before each change (`withClock`) and never moved back. Nothing is
 * random, answers are never shown or written to a log, and no password exists
 * anywhere (a reset only issues a temporary one, as before).
 */
import type {
  DirectoryState,
  Operation,
  SecurityEvent,
  SecurityEventKind,
  Severity,
  User,
  VerificationMethod,
  VerificationSession,
} from './schema'

export type Outcome = { state: DirectoryState; problems: string[]; message?: string }

export const OPERATION_NAMES: Record<Operation, string> = {
  unlock: 'Unlock account',
  'reset-password': 'Reset password',
  'reset-mfa': 'Reset MFA',
  'register-mfa': 'Register MFA',
  disable: 'Disable account',
  enable: 'Enable account',
  'group-add': 'Add to group',
  'group-remove': 'Remove from group',
}

export const METHOD_NAMES: Record<VerificationMethod, string> = {
  'employee-id': 'Employee number',
  badge: 'Staff badge number',
  callback: 'Call back on the registered extension',
}

/** How serious each event is: for the record, the feedback and the grade. */
export const SEVERITY: Record<SecurityEventKind, Severity> = {
  'session-started': 'info',
  'check-passed': 'info',
  'check-failed': 'info',
  'no-answer': 'info',
  'attempts-exceeded': 'info',
  approved: 'info',
  'approval-declined': 'info',
  performed: 'info',
  // A reasonable step that is not safe or not enough: refused, noted.
  'expired-session': 'warning',
  'out-of-scope': 'warning',
  'insufficient-verification': 'warning',
  'insufficient-authorization': 'warning',
  'wrong-approver': 'warning',
  'unregistered-callback': 'warning',
  // Changing an account nobody verified: refused, and a breach of policy.
  'no-verification': 'breach',
  'after-failed-verification': 'breach',
  'other-employee-session': 'breach',
}

// ---------------------------------------------------------------------------
// The policy
// ---------------------------------------------------------------------------

export interface Requirement {
  /** Independent identity checks needed (0: the account holder need not be verified). */
  factors: number
  /** Whose approval is needed as well. */
  approval: 'none' | 'manager' | 'owner'
}

/** The company's policy for each change (a scenario may make one stricter). */
const POLICY: Record<Operation, Requirement> = {
  unlock: { factors: 1, approval: 'none' },
  'reset-password': { factors: 1, approval: 'none' },
  'reset-mfa': { factors: 2, approval: 'none' },
  'register-mfa': { factors: 1, approval: 'none' },
  disable: { factors: 0, approval: 'manager' },
  enable: { factors: 0, approval: 'manager' },
  'group-add': { factors: 1, approval: 'manager' },
  'group-remove': { factors: 1, approval: 'manager' },
}

const GROUP_OPERATIONS: Operation[] = ['group-add', 'group-remove']
const SIGN_IN_OPERATIONS: Operation[] = ['unlock', 'reset-password', 'reset-mfa']

export const isGroupOperation = (op: Operation) => GROUP_OPERATIONS.includes(op)

const userOf = (state: DirectoryState, id: string): User | undefined =>
  state.users.find((u) => u.id === id)

const nameOf = (state: DirectoryState, id: string) => userOf(state, id)?.name ?? id

const first = (name: string) => name.split(' ')[0]

/** In a group that should only have a few members (administrators, payroll data). */
export function isPrivileged(state: DirectoryState, user: User): boolean {
  return user.groups.some((g) => state.groups.find((x) => x.id === g)?.privileged)
}

/** What a change to this account needs under the directory's policy. */
export function requirement(
  state: DirectoryState,
  op: Operation,
  user: User,
  groupId = '',
): Requirement {
  const base = { ...POLICY[op], ...state.security?.policy?.[op] }
  const group = state.groups.find((g) => g.id === groupId)
  // Privileged access: stronger proof, and the group owner's approval.
  if (isGroupOperation(op) && group?.privileged)
    return { factors: Math.max(base.factors, 2), approval: 'owner' }
  // Signing in to a privileged account: their manager approves as well.
  if (
    SIGN_IN_OPERATIONS.includes(op) &&
    isPrivileged(state, user) &&
    base.approval === 'none'
  )
    return { ...base, approval: 'manager' }
  return base
}

/** The people the records say may approve this change ([] if nobody can). */
export function approversFor(
  state: DirectoryState,
  need: Requirement['approval'],
  user: User,
  groupId = '',
): string[] {
  const active = (id: string | undefined) =>
    !!id && id !== user.id && userOf(state, id)?.status === 'active' ? [id] : []
  if (need === 'manager') return active(user.manager)
  if (need === 'owner') return active(state.groups.find((g) => g.id === groupId)?.owner)
  return []
}

/** What the policy needs, in words, e.g. "1 identity check, and approval from Priya Raman". */
export function describeRequirement(
  state: DirectoryState,
  op: Operation,
  user: User,
  groupId = '',
): string {
  const need = requirement(state, op, user, groupId)
  const parts: string[] = []
  if (need.factors > 0)
    parts.push(
      need.factors === 1
        ? 'the person’s identity verified (1 check)'
        : `the person’s identity verified (${need.factors} different checks)`,
    )
  if (need.approval !== 'none') {
    const who = approversFor(state, need.approval, user, groupId)
    const role =
      need.approval === 'manager' ? 'their manager on record' : 'the group’s owner'
    parts.push(
      who.length
        ? `approval from ${role}, ${who.map((id) => nameOf(state, id)).join(', ')}`
        : `approval from ${role} (there is nobody on record who can give it)`,
    )
  }
  return parts.length ? parts.join(', and ') : 'nothing more'
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type SessionStatus = 'active' | 'expired' | 'failed' | 'complete'

export function sessionStatus(
  state: DirectoryState,
  session: VerificationSession,
  now = state.security?.clock ?? 0,
): SessionStatus {
  if (session.failed) return 'failed'
  if (session.operations.every((op) => session.done.includes(op))) return 'complete'
  if (now >= session.expiresAt) return 'expired'
  return 'active'
}

/** The different checks passed (each method counts once). */
export function factorsOf(session: VerificationSession): VerificationMethod[] {
  return [
    ...new Set(
      session.steps
        .filter((s) => s.passed && s.method !== 'approval')
        .map((s) => s.method as VerificationMethod),
    ),
  ]
}

export interface SessionView {
  status: SessionStatus
  identity: 'verified' | 'failed' | 'in-progress' | 'not-started'
  factorsNeeded: number
  factorsDone: number
  /** Approvals still needed, by person ID; and anyone who cannot be asked. */
  approvalsNeeded: string[]
  approvalMissing: boolean
  approved: string[]
  /** Everything the policy needs is there (identity and approval). */
  authorised: boolean
}

/** Where a session stands, for the screens and the office. */
export function viewSession(
  state: DirectoryState,
  session: VerificationSession,
  now = state.security?.clock ?? 0,
): SessionView {
  const user = userOf(state, session.user)
  const needs = user
    ? session.operations.map((op) => {
        const need = requirement(state, op, user, session.group)
        return {
          need,
          approvers: approversFor(state, need.approval, user, session.group),
        }
      })
    : []
  const factorsNeeded = Math.max(0, ...needs.map((n) => n.need.factors))
  const factorsDone = factorsOf(session).length
  const approvalsNeeded = [
    ...new Set(
      needs.flatMap((n) =>
        n.approvers.length && !n.approvers.some((id) => session.approvals.includes(id))
          ? n.approvers
          : [],
      ),
    ),
  ]
  const approvalMissing = needs.some(
    (n) => n.need.approval !== 'none' && n.approvers.length === 0,
  )
  const identity =
    factorsNeeded > 0 && factorsDone >= factorsNeeded
      ? 'verified'
      : session.failed
        ? 'failed'
        : session.steps.some((s) => s.method !== 'approval')
          ? 'in-progress'
          : factorsNeeded === 0
            ? 'verified'
            : 'not-started'
  return {
    status: sessionStatus(state, session, now),
    identity,
    factorsNeeded,
    factorsDone,
    approvalsNeeded,
    approvalMissing,
    approved: session.approvals,
    authorised:
      identity === 'verified' && approvalsNeeded.length === 0 && !approvalMissing,
  }
}

/** The latest verification started from a ticket. */
export function sessionForTicket(
  state: DirectoryState,
  ticket: string,
): VerificationSession | undefined {
  return state.security?.sessions.findLast((s) => s.ticket === ticket)
}

/** What a ticket's requester says and does, from the scenario. */
export function requestFor(state: DirectoryState, ticket: string) {
  return state.security?.requests.find((r) => r.ticket === ticket)
}

/** Sets the clock (it never goes back). States without a policy are returned as they are. */
export function withClock(state: DirectoryState, at: number): DirectoryState {
  const security = state.security
  if (!security || at <= security.clock) return state
  return { ...state, security: { ...security, clock: at } }
}

function addEvent(
  state: DirectoryState,
  event: Omit<SecurityEvent, 'seq' | 'at' | 'severity'>,
): DirectoryState {
  const security = state.security
  if (!security) return state
  const seq = security.events.reduce((max, e) => Math.max(max, e.seq), 0) + 1
  const entry: SecurityEvent = {
    ...event,
    seq,
    at: security.clock,
    severity: SEVERITY[event.kind],
  }
  return {
    ...state,
    security: { ...security, events: [...security.events, entry].slice(-500) },
  }
}

function changeSession(
  state: DirectoryState,
  id: string,
  change: (s: VerificationSession) => VerificationSession,
): DirectoryState {
  const security = state.security!
  return {
    ...state,
    security: {
      ...security,
      sessions: security.sessions.map((s) => (s.id === id ? change(s) : s)),
    },
  }
}

const refuse = (state: DirectoryState, problem: string): Outcome => ({
  state,
  problems: [problem],
})

/**
 * Starts verifying the person behind a ticket, for one account and the
 * changes they ask for. Only that account and those changes are covered.
 */
export function startVerification(
  state: DirectoryState,
  input: { ticket: string; user: string; operations: Operation[]; group?: string },
  at: number,
): Outcome & { id: string } {
  const timed = withClock(state, at)
  const security = timed.security
  const fail = (problem: string) => ({ ...refuse(state, problem), id: '' })
  if (!security) return fail('This directory has no verification policy.')
  const user = userOf(timed, input.user)
  if (!user) return fail('Choose the employee’s account first.')
  const operations = [...new Set(input.operations)]
  if (operations.length === 0) return fail('Choose the change they are asking for.')
  const group = input.group ?? ''
  if (operations.some(isGroupOperation) && !timed.groups.some((g) => g.id === group))
    return fail('Choose the group the change is about.')
  const n =
    security.sessions.reduce((max, s) => Math.max(max, Number(s.id.slice(3))), 0) + 1
  const session: VerificationSession = {
    id: `VS-${n}`,
    ticket: input.ticket,
    user: user.id,
    operations,
    group: operations.some(isGroupOperation) ? group : '',
    createdAt: timed.security!.clock,
    expiresAt: timed.security!.clock + security.sessionMinutes * 60_000,
    asked: [],
    steps: [],
    failedAttempts: 0,
    approvals: [],
    done: [],
    failed: false,
  }
  let next: DirectoryState = {
    ...timed,
    security: {
      ...timed.security!,
      sessions: [...security.sessions, session].slice(-100),
    },
  }
  next = addEvent(next, {
    kind: 'session-started',
    user: user.id,
    ticket: input.ticket,
    operation: operations.join(', '),
    session: session.id,
    text: `Verification ${session.id} started for ${user.name}: ${operations.map((op) => OPERATION_NAMES[op]).join(', ')}. It expires in ${security.sessionMinutes} minutes.`,
  })
  return { state: next, problems: [], id: session.id }
}

/** An active session, or why it can't be used. */
function liveSession(
  state: DirectoryState,
  id: string,
): { session: VerificationSession } | { problem: string } {
  const session = state.security?.sessions.find((s) => s.id === id)
  if (!session) return { problem: 'Start a verification first.' }
  const status = sessionStatus(state, session)
  if (status === 'expired')
    return { problem: `Verification ${id} has expired: start a new one.` }
  if (status === 'failed')
    return {
      problem: `Verification ${id} failed after too many wrong answers. The account must not be changed on this request.`,
    }
  if (status === 'complete') return { problem: `Verification ${id} has been used.` }
  return { session }
}

/** What the requester says when asked (never the record itself). */
export function answerOf(
  state: DirectoryState,
  session: VerificationSession,
  method: Exclude<VerificationMethod, 'callback'>,
): string {
  const request = requestFor(state, session.ticket)
  const said = request?.says[method]
  const tired = session.failedAttempts >= 2
  const what = method === 'badge' ? 'badge number' : 'employee number'
  if (!said)
    return `“I don’t have my ${what} with me${tired ? ', and I really need to get back to work' : ''}.”`
  return tired
    ? `“Again? It’s ${said}. Can we hurry this up, please?”`
    : `“My ${what} is ${said}.”`
}

/** The player asks for a piece of information (what they answer is shown, not checked). */
export function askFor(
  state: DirectoryState,
  id: string,
  method: Exclude<VerificationMethod, 'callback'>,
  at: number,
): Outcome {
  const timed = withClock(state, at)
  const live = liveSession(timed, id)
  if ('problem' in live) return refuse(state, live.problem)
  if (live.session.asked.includes(method)) return { state: timed, problems: [] }
  return {
    state: changeSession(timed, id, (s) => ({ ...s, asked: [...s.asked, method] })),
    problems: [],
  }
}

const normal = (value: string) => value.trim().toUpperCase().replace(/[\s-]/g, '')

function recordStep(
  state: DirectoryState,
  session: VerificationSession,
  step: {
    method: VerificationSession['steps'][number]['method']
    passed: boolean
    text: string
  },
  attempt: boolean,
  kind: SecurityEventKind,
): DirectoryState {
  const security = state.security!
  const failedAttempts = session.failedAttempts + (attempt && !step.passed ? 1 : 0)
  const failed = failedAttempts >= security.maxAttempts
  let next = changeSession(state, session.id, (s) => ({
    ...s,
    steps: [...s.steps, { ...step, at: security.clock }].slice(-40),
    failedAttempts,
    failed,
  }))
  next = addEvent(next, {
    kind,
    user: session.user,
    ticket: session.ticket,
    operation: '',
    session: session.id,
    text: step.text,
  })
  if (failed && !session.failed)
    next = addEvent(next, {
      kind: 'attempts-exceeded',
      user: session.user,
      ticket: session.ticket,
      operation: '',
      session: session.id,
      text: `Verification ${session.id} failed: ${failedAttempts} wrong answers for ${nameOf(state, session.user)}. Do not change the account on this request; it may not be them.`,
    })
  return next
}

/**
 * The player checks what the person gave against the account's record. The
 * record is never shown: only whether it matches. A wrong answer counts as a
 * failed attempt (not as the player's mistake).
 */
export function checkAnswer(
  state: DirectoryState,
  id: string,
  method: Exclude<VerificationMethod, 'callback'>,
  given: string,
  at: number,
): Outcome {
  const timed = withClock(state, at)
  const live = liveSession(timed, id)
  if ('problem' in live) return refuse(state, live.problem)
  const { session } = live
  if (!timed.security!.methods.includes(method))
    return refuse(state, `${METHOD_NAMES[method]} is not an approved check here.`)
  const user = userOf(timed, session.user)!
  const record = method === 'badge' ? user.badge : user.employeeId
  const what = method === 'badge' ? 'badge number' : 'employee number'
  if (!record)
    return refuse(
      state,
      `There is no ${what} on record for ${user.name}: use another check.`,
    )
  if (given.trim() === '') return refuse(state, `Enter the ${what} they gave you.`)
  const passed = normal(given) === normal(record)
  const next = recordStep(
    timed,
    session,
    {
      method,
      passed,
      text: passed
        ? `The ${what} given matches ${user.name}’s record.`
        : `The ${what} given does not match ${user.name}’s record (attempt ${session.failedAttempts + 1} of ${timed.security!.maxAttempts}).`,
    },
    true,
    passed ? 'check-passed' : 'check-failed',
  )
  return { state: next, problems: [] }
}

/**
 * The player calls back. Only the extension on record proves anything: a
 * number the caller gives could be anyone's. Whoever has that extension
 * answers (if they are at their desk).
 */
export function callBack(
  state: DirectoryState,
  id: string,
  to: 'record' | 'given',
  at: number,
): Outcome {
  const timed = withClock(state, at)
  const live = liveSession(timed, id)
  if ('problem' in live) return refuse(state, live.problem)
  const { session } = live
  if (!timed.security!.methods.includes('callback'))
    return refuse(state, 'A callback is not an approved check here.')
  const user = userOf(timed, session.user)!
  const request = requestFor(timed, session.ticket)
  if (to === 'given') {
    const number = request?.offers || 'the number they gave'
    const next = addEvent(timed, {
      kind: 'unregistered-callback',
      user: user.id,
      ticket: session.ticket,
      operation: '',
      session: session.id,
      text: `You called ${number}, a number the requester gave. That proves nothing about who they are: call back on the extension in the directory.`,
    })
    return {
      state: next,
      problems: [],
      message: `Someone answered on ${number}, but that number is not on record for ${user.name}, so it does not verify anyone.`,
    }
  }
  if (!user.extension)
    return refuse(
      state,
      `There is no extension on record for ${user.name}: use another check.`,
    )
  const speaker = request?.speaker
  if (speaker === user.id && request?.atDesk === false) {
    const next = recordStep(
      timed,
      session,
      {
        method: 'callback',
        passed: false,
        text: `No answer at extension ${user.extension}, ${user.name}’s desk: they are not there to confirm.`,
      },
      false,
      'no-answer',
    )
    return { state: next, problems: [] }
  }
  const confirmed = speaker === user.id
  const next = recordStep(
    timed,
    session,
    {
      method: 'callback',
      passed: confirmed,
      text: confirmed
        ? `${user.name} answered at extension ${user.extension}, the number on record, and confirmed the request.`
        : `${user.name} answered at extension ${user.extension} and said they had not asked IT for anything.`,
    },
    !confirmed,
    confirmed ? 'check-passed' : 'check-failed',
  )
  return { state: next, problems: [] }
}

/**
 * The player asks someone to approve the change. Only someone the records
 * say may approve it can: the line manager, or the owner of a privileged
 * group. Asking anyone else is refused (and noted).
 */
export function requestApproval(
  state: DirectoryState,
  id: string,
  approver: string,
  at: number,
): Outcome {
  const timed = withClock(state, at)
  const live = liveSession(timed, id)
  if ('problem' in live) return refuse(state, live.problem)
  const { session } = live
  const user = userOf(timed, session.user)!
  const view = viewSession(timed, session)
  const who = userOf(timed, approver)
  if (!who) return refuse(state, 'Choose who to ask.')
  const needed = session.operations.some(
    (op) => requirement(timed, op, user, session.group).approval !== 'none',
  )
  if (!needed)
    return { state: timed, problems: [], message: 'This change needs no approval.' }
  if (session.approvals.includes(approver))
    return { state: timed, problems: [], message: `${who.name} has already approved it.` }
  const allowed = session.operations.some((op) =>
    approversFor(
      timed,
      requirement(timed, op, user, session.group).approval,
      user,
      session.group,
    ).includes(approver),
  )
  if (!allowed) {
    const next = addEvent(timed, {
      kind: 'wrong-approver',
      user: user.id,
      ticket: session.ticket,
      operation: session.operations.join(', '),
      session: session.id,
      text: `${who.name} is not on record as able to approve this change for ${user.name}${view.approvalsNeeded.length ? `: that is ${view.approvalsNeeded.map((a) => nameOf(timed, a)).join(', ')}` : ''}.`,
    })
    return {
      state: next,
      problems: [
        `${who.name} cannot approve this: the records do not give them authority over ${first(user.name)}’s account.`,
      ],
    }
  }
  const declines = timed.security!.declines.includes(approver)
  let next = changeSession(timed, id, (s) => ({
    ...s,
    steps: [
      ...s.steps,
      {
        at: timed.security!.clock,
        method: 'approval' as const,
        passed: !declines,
        text: declines
          ? `${who.name} declined to approve the change.`
          : `${who.name} approved: ${session.operations.map((op) => OPERATION_NAMES[op]).join(', ')}.`,
      },
    ].slice(-40),
    approvals: declines ? s.approvals : [...s.approvals, approver],
  }))
  next = addEvent(next, {
    kind: declines ? 'approval-declined' : 'approved',
    user: user.id,
    ticket: session.ticket,
    operation: session.operations.join(', '),
    session: session.id,
    text: declines
      ? `${who.name} declined to approve the change for ${user.name}.`
      : `${who.name} approved the change for ${user.name} (${session.id}).`,
  })
  return { state: next, problems: [] }
}

// ---------------------------------------------------------------------------
// The operation boundary
// ---------------------------------------------------------------------------

export type Decision =
  | { allowed: true; session?: VerificationSession }
  | {
      allowed: false
      kind: SecurityEventKind
      reason: string
      session?: VerificationSession
    }

/**
 * Whether a change may be made to an account now, under the directory's
 * policy. Without a policy every change is allowed, as before.
 */
export function authorize(
  state: DirectoryState,
  op: Operation,
  userId: string,
  groupId = '',
): Decision {
  const security = state.security
  if (!security) return { allowed: true }
  const user = userOf(state, userId)
  if (!user) return { allowed: true } // The action reports the missing account.
  const need = requirement(state, op, user, groupId)
  if (need.factors === 0 && need.approval === 'none') return { allowed: true }
  const action = OPERATION_NAMES[op].toLowerCase()
  const covers = (s: VerificationSession) =>
    s.user === user.id &&
    s.operations.includes(op) &&
    !s.done.includes(op) &&
    (!isGroupOperation(op) || s.group === groupId)
  const mine = security.sessions.filter(covers)
  const live = mine.filter((s) => sessionStatus(state, s) === 'active')
  const session = live.at(-1)
  if (!session) {
    const deny = (kind: SecurityEventKind, reason: string, s?: VerificationSession) =>
      ({ allowed: false, kind, reason, session: s }) as const
    const failed = mine.findLast((s) => s.failed)
    if (failed)
      return deny(
        'after-failed-verification',
        `Refused: ${user.name}’s identity could not be verified (${failed.id} failed). The account must not be changed on this request.`,
        failed,
      )
    const expired = mine.findLast((s) => sessionStatus(state, s) === 'expired')
    if (expired)
      return deny(
        'expired-session',
        `Refused: verification ${expired.id} for ${user.name} has expired. Verify them again before you ${action}.`,
        expired,
      )
    const forOther = security.sessions.findLast(
      (s) => s.user !== user.id && sessionStatus(state, s) === 'active',
    )
    const otherOp = security.sessions.findLast(
      (s) => s.user === user.id && sessionStatus(state, s) === 'active',
    )
    if (otherOp)
      return deny(
        'out-of-scope',
        `Refused: verification ${otherOp.id} covers ${otherOp.operations.map((o) => OPERATION_NAMES[o]).join(', ')} for ${user.name}, not “${OPERATION_NAMES[op]}”${isGroupOperation(op) ? ' for this group' : ''}. Start a verification for this change.`,
        otherOp,
      )
    if (forOther)
      return deny(
        'other-employee-session',
        `Refused: nobody has verified ${user.name}. Verification ${forOther.id} is for ${nameOf(state, forOther.user)}, and covers only their account.`,
        forOther,
      )
    return deny(
      'no-verification',
      `Refused: to ${action} for ${user.name}, the policy needs ${describeRequirement(state, op, user, groupId)}. Start a verification from their ticket first.`,
    )
  }
  const factors = factorsOf(session).length
  if (factors < need.factors) {
    if (factors === 0)
      return {
        allowed: false,
        kind: session.steps.some((s) => !s.passed && s.method !== 'approval')
          ? 'after-failed-verification'
          : 'no-verification',
        reason: session.steps.some((s) => !s.passed && s.method !== 'approval')
          ? `Refused: ${user.name}’s identity is not verified: the checks so far failed. The account must not be changed until one passes.`
          : `Refused: ${user.name}’s identity has not been checked yet (${session.id}). Complete a check first.`,
        session,
      }
    return {
      allowed: false,
      kind: 'insufficient-verification',
      reason: `Refused: to ${action}, the policy needs ${need.factors} different identity checks; ${session.id} has ${factors}.`,
      session,
    }
  }
  if (need.approval !== 'none') {
    const approvers = approversFor(state, need.approval, user, groupId)
    if (!approvers.some((a) => session.approvals.includes(a)))
      return {
        allowed: false,
        kind: 'insufficient-authorization',
        reason: approvers.length
          ? `Refused: ${user.name}’s identity is verified, but to ${action} the policy also needs approval from ${approvers.map((a) => nameOf(state, a)).join(', ')} (${need.approval === 'manager' ? 'their manager on record' : 'the group’s owner'}).`
          : `Refused: to ${action}, the policy needs approval from ${need.approval === 'manager' ? 'their manager' : 'the group’s owner'}, and nobody on record can give it. Escalate to IT security.`,
        session,
      }
  }
  return { allowed: true, session }
}

/** Records a refused change (the account itself stays exactly as it was). */
export function recordRefusal(
  state: DirectoryState,
  decision: Extract<Decision, { allowed: false }>,
  op: Operation,
  userId: string,
): DirectoryState {
  // The ticket about this account (not that of a verification for someone else).
  const ticket =
    state.security?.requests.find((r) => r.speaker === userId)?.ticket ??
    decision.session?.ticket ??
    ''
  return addEvent(state, {
    kind: decision.kind,
    user: userId,
    ticket,
    operation: op,
    session: decision.session?.id ?? '',
    text: decision.reason,
  })
}

/** Records an allowed change, and uses the session up for it. */
export function recordPerformed(
  state: DirectoryState,
  decision: Extract<Decision, { allowed: true }>,
  op: Operation,
  userId: string,
): DirectoryState {
  const session = decision.session
  if (!state.security || !session) return state
  const how = factorsOf(session)
    .map((m) => METHOD_NAMES[m].toLowerCase())
    .join(' and ')
  const approvedBy = session.approvals.map((a) => nameOf(state, a)).join(', ')
  const next = changeSession(state, session.id, (s) => ({ ...s, done: [...s.done, op] }))
  return addEvent(next, {
    kind: 'performed',
    user: userId,
    ticket: session.ticket,
    operation: op,
    session: session.id,
    text: `${OPERATION_NAMES[op]} for ${nameOf(state, userId)}: allowed by ${session.id}${how ? ` (identity: ${how}` : ' ('}${approvedBy ? `${how ? '; ' : ''}approved by ${approvedBy}` : ''}).`,
  })
}
