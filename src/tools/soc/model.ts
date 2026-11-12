/**
 * Security operations actions (pure, logged). Investigation marks evidence;
 * containment, eradication and recovery change the simulated accounts,
 * devices, mailboxes and emails. Wrong actions are recorded as mistakes, with
 * their consequence (a colleague who cannot work, a threat left in place, a
 * phishing email let through). The incident moves to its next stage only when
 * that stage's work is really done (`advance`).
 */
import { STAGES, type SocState, type Stage } from './schema'

export type Result = { state: SocState; problems: string[]; message?: string }

const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'] as const

function log(
  state: SocState,
  action: string,
  target: string,
  detail = '',
  mistake = false,
): SocState {
  const seq = state.log.reduce((max, e) => Math.max(max, e.seq), 0) + 1
  return {
    ...state,
    log: [...state.log, { seq, action, target, detail, mistake }].slice(-2000),
  }
}

function consequence(state: SocState, kind: string, text: string): SocState {
  if (state.consequences.some((c) => c.kind === kind && c.text === text)) return state
  return { ...state, consequences: [...state.consequences, { kind, text }].slice(-30) }
}

const nameOf = (state: SocState, user: string) =>
  state.accounts.find((a) => a.user === user)?.name ?? user

const closed = (state: SocState) => state.incident.stage === 'closed'
const done = (state: SocState): Result => ({
  state,
  problems: ['The incident is closed.'],
})

// ---------------------------------------------------------------------------
// Alerts and triage
// ---------------------------------------------------------------------------

export function acknowledgeAlert(state: SocState, id: string): Result {
  const alert = state.alerts.find((a) => a.id === id)
  if (!alert) return { state, problems: ['That alert is not there.'] }
  if (alert.status === 'acknowledged') return { state, problems: [] }
  const next = {
    ...state,
    alerts: state.alerts.map((a) =>
      a.id === id ? { ...a, status: 'acknowledged' as const } : a,
    ),
  }
  return { state: log(next, 'Acknowledge alert', id, alert.title), problems: [] }
}

/** Dismisses an alert as a false alarm. Dismissing a real one leaves the threat in place. */
export function dismissAlert(state: SocState, id: string): Result {
  const alert = state.alerts.find((a) => a.id === id)
  if (!alert) return { state, problems: ['That alert is not there.'] }
  const real =
    alert.id === state.incident.alert ||
    alert.entity === state.truth.user ||
    alert.entity === state.truth.device
  let next: SocState = {
    ...state,
    alerts: state.alerts.map((a) =>
      a.id === id ? { ...a, status: 'dismissed' as const } : a,
    ),
  }
  if (real)
    next = consequence(
      next,
      'dismissed-threat',
      `“${alert.title}” was dismissed, but it was real: the attacker would still be in ${nameOf(state, state.truth.user)}’s account.`,
    )
  return { state: log(next, 'Dismiss alert', id, alert.title, real), problems: [] }
}

export function setTriage(
  state: SocState,
  severity: SocState['incident']['severity'],
  category: SocState['incident']['category'],
): Result {
  if (closed(state)) return done(state)
  return {
    state: log(
      { ...state, incident: { ...state.incident, severity, category } },
      'Triage',
      state.incident.id,
      `${severity} · ${category}`,
    ),
    problems: [],
  }
}

// ---------------------------------------------------------------------------
// Investigation (evidence)
// ---------------------------------------------------------------------------

export function flagSignIn(state: SocState, id: string): Result {
  const signIn = state.signIns.find((s) => s.id === id)
  if (!signIn) return { state, problems: ['That sign-in is not there.'] }
  if (signIn.flagged) return { state, problems: [] }
  const wrong = id !== state.truth.signIn
  const next = {
    ...state,
    signIns: state.signIns.map((s) => (s.id === id ? { ...s, flagged: true } : s)),
  }
  // A wrong flag is recorded (it is evidence that points the wrong way), not revealed.
  return {
    state: log(
      next,
      'Flag sign-in',
      id,
      `${nameOf(state, signIn.user)} · ${signIn.location} · ${signIn.ip}`,
      wrong,
    ),
    problems: [],
  }
}

export function flagProcess(state: SocState, device: string, process: string): Result {
  const endpoint = state.endpoints.find((e) => e.device === device)
  const p = endpoint?.processes.find((x) => x.name === process)
  if (!endpoint || !p) return { state, problems: ['That process is not there.'] }
  if (p.flagged) return { state, problems: [] }
  const wrong = !(device === state.truth.device && process === state.truth.process)
  const next = {
    ...state,
    endpoints: state.endpoints.map((e) =>
      e.device === device
        ? {
            ...e,
            processes: e.processes.map((x) =>
              x.name === process ? { ...x, flagged: true } : x,
            ),
          }
        : e,
    ),
  }
  return { state: log(next, 'Flag process', device, process, wrong), problems: [] }
}

export function flagRule(state: SocState, user: string, rule: string): Result {
  const mailbox = state.mailboxes.find((m) => m.user === user)
  const r = mailbox?.rules.find((x) => x.id === rule)
  if (!mailbox || !r) return { state, problems: ['That rule is not there.'] }
  if (r.flagged) return { state, problems: [] }
  const wrong = rule !== state.truth.rule
  const next = {
    ...state,
    mailboxes: state.mailboxes.map((m) =>
      m.user === user
        ? {
            ...m,
            rules: m.rules.map((x) => (x.id === rule ? { ...x, flagged: true } : x)),
          }
        : m,
    ),
  }
  return { state: log(next, 'Flag mailbox rule', user, r.name, wrong), problems: [] }
}

/** Decides whether a reported email is phishing. Calling phishing legitimate lets it through. */
export function setVerdict(
  state: SocState,
  id: string,
  verdict: 'phishing' | 'legitimate',
): Result {
  const email = state.emails.find((e) => e.id === id)
  if (!email) return { state, problems: ['That email is not there.'] }
  const isPhish = id === state.truth.email
  const wrong = isPhish !== (verdict === 'phishing')
  let next: SocState = {
    ...state,
    emails: state.emails.map((e) => (e.id === id ? { ...e, verdict } : e)),
  }
  if (isPhish && verdict === 'legitimate')
    next = consequence(
      next,
      'phishing-released',
      `The phishing email “${email.subject}” was marked legitimate and stays in ${email.recipients.length} inboxes: more people may enter their password on the fake page.`,
    )
  return { state: log(next, 'Verdict', id, verdict, wrong), problems: [] }
}

// ---------------------------------------------------------------------------
// Containment, eradication and recovery
// ---------------------------------------------------------------------------

function onAccount(
  state: SocState,
  user: string,
  action: string,
  change: (a: SocState['accounts'][number]) => SocState['accounts'][number],
  harmful: boolean,
): Result {
  if (closed(state)) return done(state)
  const account = state.accounts.find((a) => a.user === user)
  if (!account) return { state, problems: ['That account is not there.'] }
  const wrong = user !== state.truth.user && harmful
  let next: SocState = {
    ...state,
    accounts: state.accounts.map((a) => (a.user === user ? change(a) : a)),
  }
  if (wrong)
    next = consequence(
      next,
      `account-${user}`,
      `${account.name}’s account was ${action.toLowerCase()} although it was not compromised: ${account.name.split(' ')[0]} cannot work.`,
    )
  return { state: log(next, action, user, account.name, wrong), problems: [] }
}

export const revokeSessions = (state: SocState, user: string) =>
  onAccount(
    state,
    user,
    'Revoke sessions',
    (a) => ({ ...a, sessionsRevoked: true }),
    true,
  )
export const resetAccountPassword = (state: SocState, user: string) =>
  onAccount(state, user, 'Reset password', (a) => ({ ...a, passwordReset: true }), true)
export const disableAccount = (state: SocState, user: string) =>
  onAccount(state, user, 'Disable account', (a) => ({ ...a, disabled: true }), true)
export const enableAccount = (state: SocState, user: string) =>
  onAccount(state, user, 'Enable account', (a) => ({ ...a, disabled: false }), false)

/** Cuts a device off the network (it can still be investigated). The wrong device stops someone working. */
export function isolateDevice(state: SocState, device: string): Result {
  if (closed(state)) return done(state)
  const endpoint = state.endpoints.find((e) => e.device === device)
  if (!endpoint) return { state, problems: ['That device is not there.'] }
  if (endpoint.isolated) return { state, problems: [`${device} is already isolated.`] }
  const wrong = device !== state.truth.device
  let next: SocState = {
    ...state,
    endpoints: state.endpoints.map((e) =>
      e.device === device ? { ...e, isolated: true } : e,
    ),
  }
  if (wrong)
    next = consequence(
      next,
      `isolated-${device}`,
      `${device} was isolated, but it was not affected: ${nameOf(state, endpoint.user)} cannot work until it is restored.`,
    )
  return { state: log(next, 'Isolate device', device, '', wrong), problems: [] }
}

export function restoreDevice(state: SocState, device: string): Result {
  if (closed(state)) return done(state)
  const endpoint = state.endpoints.find((e) => e.device === device)
  if (!endpoint?.isolated) return { state, problems: [`${device} is not isolated.`] }
  // Restoring the affected device before the threat is removed puts it back on the network.
  const early =
    device === state.truth.device &&
    endpoint.processes.some((p) => p.name === state.truth.process && p.running)
  if (early)
    return {
      state,
      problems: [
        `${device} still runs ${state.truth.process}: remove the threat before you reconnect it.`,
      ],
    }
  const next = {
    ...state,
    endpoints: state.endpoints.map((e) =>
      e.device === device ? { ...e, isolated: false } : e,
    ),
  }
  return { state: log(next, 'Restore device', device), problems: [] }
}

export function killProcess(state: SocState, device: string, process: string): Result {
  if (closed(state)) return done(state)
  const endpoint = state.endpoints.find((e) => e.device === device)
  const p = endpoint?.processes.find((x) => x.name === process)
  if (!endpoint || !p || !p.running)
    return { state, problems: [`${process} is not running on ${device}.`] }
  const wrong = !(device === state.truth.device && process === state.truth.process)
  const next = {
    ...state,
    endpoints: state.endpoints.map((e) =>
      e.device === device
        ? {
            ...e,
            processes: e.processes.map((x) =>
              x.name === process ? { ...x, running: false } : x,
            ),
          }
        : e,
    ),
  }
  return { state: log(next, 'Remove process', device, process, wrong), problems: [] }
}

export function removeRule(state: SocState, user: string, rule: string): Result {
  if (closed(state)) return done(state)
  const mailbox = state.mailboxes.find((m) => m.user === user)
  const r = mailbox?.rules.find((x) => x.id === rule)
  if (!mailbox || !r || r.removed) return { state, problems: ['That rule is not there.'] }
  const wrong = rule !== state.truth.rule
  const next = {
    ...state,
    mailboxes: state.mailboxes.map((m) =>
      m.user === user
        ? {
            ...m,
            rules: m.rules.map((x) => (x.id === rule ? { ...x, removed: true } : x)),
          }
        : m,
    ),
  }
  return { state: log(next, 'Remove mailbox rule', user, r.name, wrong), problems: [] }
}

export function quarantineEmail(state: SocState, id: string): Result {
  if (closed(state)) return done(state)
  const email = state.emails.find((e) => e.id === id)
  if (!email || email.quarantined)
    return { state, problems: ['That email is not there.'] }
  if (email.verdict !== 'phishing')
    return {
      state,
      problems: ['Decide the verdict first: only phishing is quarantined.'],
    }
  const next = {
    ...state,
    emails: state.emails.map((e) => (e.id === id ? { ...e, quarantined: true } : e)),
  }
  return {
    state: log(
      next,
      'Quarantine email',
      id,
      `${email.recipients.length} mailboxes`,
      id !== state.truth.email,
    ),
    problems: [],
  }
}

export const setReport = (state: SocState, report: string): Result =>
  state.incident.report === report
    ? { state, problems: [] }
    : {
        state: {
          ...state,
          incident: { ...state.incident, report: report.slice(0, 5000) },
        },
        problems: [],
      }

export const setLessons = (state: SocState, lessons: string): Result =>
  state.incident.lessons === lessons
    ? { state, problems: [] }
    : {
        state: {
          ...state,
          incident: { ...state.incident, lessons: lessons.slice(0, 3000) },
        },
        problems: [],
      }

// ---------------------------------------------------------------------------
// The incident's stages
// ---------------------------------------------------------------------------

export const STAGE_NAMES: Record<Stage, string> = {
  detect: 'Detect',
  triage: 'Triage',
  investigate: 'Investigate',
  contain: 'Contain',
  eradicate: 'Eradicate',
  recover: 'Recover',
  document: 'Document',
  review: 'Review',
  closed: 'Closed',
}

/** What each stage asks for, in words (shown before the work is done). */
export const STAGE_GOALS: Record<Stage, string> = {
  detect: 'Acknowledge the alert that opened the incident.',
  triage: 'Set how serious it is and what kind of incident it is.',
  investigate:
    'Find the evidence: the suspicious sign-in, the email that started it, what changed in the mailbox, and what runs on the device.',
  contain:
    'Stop the attacker: secure the account (end its sessions, new password) and isolate the affected device.',
  eradicate:
    'Remove what the attacker left: the mailbox rule, the process, and the phishing email from every inbox.',
  recover:
    'Return to normal: reconnect the cleaned device, and make sure the user can work.',
  document: 'Write the incident report: what happened, the evidence, what you did.',
  review: 'Write the lessons learned: what would stop it happening again.',
  closed: 'The incident is closed.',
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length

/** What still stops the incident leaving its stage (empty: it can move on). */
export function blockers(state: SocState): string[] {
  const t = state.truth
  const i = state.incident
  const account = state.accounts.find((a) => a.user === t.user)
  const endpoint = state.endpoints.find((e) => e.device === t.device)
  const email = state.emails.find((e) => e.id === t.email)
  const rule = state.mailboxes.flatMap((m) => m.rules).find((r) => r.id === t.rule)
  const process = endpoint?.processes.find((p) => p.name === t.process)
  const out: string[] = []
  switch (i.stage) {
    case 'detect':
      if (state.alerts.find((a) => a.id === i.alert)?.status !== 'acknowledged')
        out.push('The alert has not been acknowledged.')
      break
    case 'triage': {
      const at = SEVERITY_ORDER.indexOf(i.severity as (typeof SEVERITY_ORDER)[number])
      if (at < SEVERITY_ORDER.indexOf(t.severity))
        out.push(
          i.severity
            ? `A ${i.severity} severity understates it: an account in the attacker’s hands is serious.`
            : 'Set the severity.',
        )
      if (i.category !== t.category)
        out.push(
          i.category
            ? 'Look at the category again: what has the attacker actually taken over?'
            : 'Set the category.',
        )
      break
    }
    case 'investigate':
      if (!state.signIns.find((s) => s.id === t.signIn)?.flagged)
        out.push('The suspicious sign-in has not been found.')
      if (email?.verdict !== 'phishing')
        out.push('The email that started it has not been identified as phishing.')
      if (!rule?.flagged) out.push('The change in the mailbox has not been found.')
      if (!process?.flagged) out.push('What runs on the device has not been found.')
      break
    case 'contain':
      if (!account?.sessionsRevoked)
        out.push(`${account?.name}’s sessions have not been ended.`)
      if (!account?.passwordReset)
        out.push(`${account?.name}’s password has not been reset.`)
      if (!endpoint?.isolated && process?.running)
        out.push(`${t.device} is still on the network.`)
      break
    case 'eradicate':
      if (!rule?.removed) out.push('The attacker’s mailbox rule is still there.')
      if (process?.running) out.push(`${t.process} still runs on ${t.device}.`)
      if (!email?.quarantined)
        out.push('The phishing email is still in people’s inboxes.')
      break
    case 'recover':
      if (endpoint?.isolated)
        out.push(
          `${t.device} is still isolated: ${account?.name.split(' ')[0]} cannot work.`,
        )
      if (account?.disabled) out.push(`${account.name}’s account is still disabled.`)
      for (const other of state.endpoints.filter(
        (e) => e.isolated && e.device !== t.device,
      ))
        out.push(`${other.device} is still isolated by mistake.`)
      for (const other of state.accounts.filter((a) => a.disabled && a.user !== t.user))
        out.push(`${other.name}’s account is still disabled by mistake.`)
      break
    case 'document': {
      const report = i.report.toLowerCase()
      if (words(i.report) < 60)
        out.push(`The report is too short (${words(i.report)} words; at least 60).`)
      if (!report.includes(t.device.toLowerCase()))
        out.push('The report does not say which device was affected.')
      if (!/(rule|forward)/.test(report))
        out.push('The report does not mention what changed in the mailbox.')
      if (!/(password|session)/.test(report))
        out.push('The report does not say how the account was secured.')
      break
    }
    case 'review':
      if (words(i.lessons) < 25)
        out.push(
          `The lessons learned are too short (${words(i.lessons)} words; at least 25).`,
        )
      break
    case 'closed':
      out.push('The incident is closed.')
  }
  return out
}

/** Moves the incident to its next stage, only if this stage's work is done. */
export function advance(state: SocState): Result {
  const problems = blockers(state)
  if (problems.length) return { state, problems }
  const stage = state.incident.stage
  const next = STAGES[STAGES.indexOf(stage) + 1]
  const incident = {
    ...state.incident,
    stage: next,
    timeline: [
      ...state.incident.timeline,
      { stage, text: `${STAGE_NAMES[stage]} complete.` },
    ].slice(-60),
  }
  return {
    state: log({ ...state, incident }, 'Stage complete', incident.id, STAGE_NAMES[stage]),
    problems: [],
  }
}

/** The wrong actions taken (for the grade and the review). */
export const mistakes = (state: SocState) => state.log.filter((e) => e.mistake)
