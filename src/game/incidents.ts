/**
 * Tickets that know when they are fixed. A Help Desk ticket can carry
 * conditions on the company's systems (Network Tools and Directory, kept
 * with the queue as its `environment`): "AP-FL2 is responding", "Leila's
 * account is unlocked". The ticket is resolved because the problem really is
 * fixed, never because Resolved was chosen.
 *
 * It is event-driven and pure:
 * 1. Every change to a system goes through `applyEnvironmentChange`.
 * 2. The change is compared with the state before it (`networkChanges`,
 *    `directoryChanges`): what came up or went down, what was changed.
 * 3. Only tickets with a condition on what changed are looked at again.
 * 4. Their conditions are evaluated against the new state, and the ticket
 *    moves on: resolved when every condition passes, reopened if a fault
 *    comes back before it is closed. Each step is written to its history.
 *
 * Nothing is random, and nothing is checked on a timer. Console commands,
 * findings and other changes that alter nothing a condition depends on
 * leave every ticket as it was. A closed ticket never changes again.
 */
import type {
  Disruption,
  Ticket,
  TicketActivity,
  TicketActivityKind,
  TicketCondition,
  TicketEnvironment,
  TicketsContent,
  TicketStatus,
} from '../persistence/schemas'
import type { DirectoryState } from '../tools/directory/schema'
import type { NetworkState } from '../tools/network/schema'
import {
  deviceByName,
  devicesAt,
  onNetwork,
  resolve,
  route,
} from '../tools/network/simulation'

export type SystemId = keyof TicketEnvironment

export const SYSTEM_NAMES: Record<SystemId, string> = {
  network: 'Network Tools',
  directory: 'Directory',
}

/** Which system a condition is checked in. */
export function systemOf(condition: TicketCondition): SystemId {
  switch (condition.type) {
    case 'device-up':
    case 'service-running':
    case 'can-reach':
    case 'dns-record':
      return 'network'
    default:
      return 'directory'
  }
}

/** The systems a ticket's conditions are checked in. */
export function ticketSystems(ticket: Ticket): SystemId[] {
  return [...new Set(ticket.conditions.map(systemOf))]
}

/** A ticket tied to the company's systems: resolved by fixing, not by choosing. */
export const isMonitored = (ticket: Ticket) => ticket.conditions.length > 0

// ---------------------------------------------------------------------------
// Evaluating conditions
// ---------------------------------------------------------------------------

export interface ConditionResult {
  condition: TicketCondition
  /** What must be true, e.g. "AP-FL2 is responding". */
  label: string
  passed: boolean
  /** What the system shows now, e.g. "AP-FL2 is not responding." */
  state: string
}

function hostIp(state: NetworkState, from: string, host: string): string | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
  const lookup = resolve(state, from, host)
  return lookup.ok ? lookup.ip : null
}

function evaluateNetwork(
  condition: TicketCondition,
  state: NetworkState,
): Omit<ConditionResult, 'condition'> {
  switch (condition.type) {
    case 'device-up': {
      const label = `${condition.device} is responding`
      const device = deviceByName(state, condition.device)
      if (!device)
        return { label, passed: false, state: `${condition.device} is not on the map.` }
      return device.up
        ? { label, passed: true, state: `${device.name} is responding.` }
        : { label, passed: false, state: `${device.name} is not responding.` }
    }
    case 'service-running': {
      const device = deviceByName(state, condition.device)
      const service = device?.services.find((s) => s.port === condition.port)
      const name = service?.name ?? `port ${condition.port}`
      const label = `${name} is running on ${condition.device}`
      if (!device || !service)
        return { label, passed: false, state: `There is no such service to check.` }
      if (!device.up)
        return { label, passed: false, state: `${device.name} is not responding.` }
      return service.running
        ? { label, passed: true, state: `${service.name} is running on ${device.name}.` }
        : {
            label,
            passed: false,
            state: `${service.name} has stopped on ${device.name}.`,
          }
    }
    case 'can-reach': {
      const where = condition.port
        ? `${condition.host} (port ${condition.port})`
        : condition.host
      const label = `${condition.from} can reach ${where}`
      const from = deviceByName(state, condition.from)
      if (!from)
        return { label, passed: false, state: `${condition.from} is not on the map.` }
      if (!from.up)
        return { label, passed: false, state: `${from.name} is not responding.` }
      if (!onNetwork(state, from))
        return {
          label,
          passed: false,
          state: `${from.name} is off the network: its Wi-Fi access point ${from.accessPoint} is not responding.`,
        }
      const ip = hostIp(state, from.name, condition.host)
      if (!ip)
        return {
          label,
          passed: false,
          state: `From ${from.name}, the name ${condition.host} cannot be looked up.`,
        }
      const hops = route(state, from.name, ip)
      const stopped = hops.find((h) => !h.ok)
      if (hops.length === 0 || stopped)
        return {
          label,
          passed: false,
          state: `From ${from.name}, ${condition.host} cannot be reached${stopped ? ` (traffic stops at ${stopped.name})` : ''}.`,
        }
      if (condition.port) {
        const running = devicesAt(state, ip).some((d) =>
          d.services.some((s) => s.port === condition.port && s.running),
        )
        if (!running)
          return {
            label,
            passed: false,
            state: `${condition.host} answers ${from.name}, but not on port ${condition.port}.`,
          }
      }
      return { label, passed: true, state: `${from.name} reaches ${where}.` }
    }
    case 'dns-record': {
      const label = `${condition.name} points to ${condition.ip}`
      const record = state.dns.records.find(
        (r) => r.name.toLowerCase() === condition.name.toLowerCase(),
      )
      if (!record)
        return {
          label,
          passed: false,
          state: `There is no DNS record ${condition.name}.`,
        }
      return record.ip === condition.ip
        ? { label, passed: true, state: `${record.name} points to ${record.ip}.` }
        : { label, passed: false, state: `${record.name} points to ${record.ip}.` }
    }
    default:
      return { label: 'A network check', passed: false, state: 'This cannot be checked.' }
  }
}

function evaluateDirectory(
  condition: TicketCondition,
  state: DirectoryState,
): Omit<ConditionResult, 'condition'> {
  if (!('user' in condition))
    return { label: 'A directory check', passed: false, state: 'This cannot be checked.' }
  const user = state.users.find((u) => u.id === condition.user)
  const who = user?.name ?? condition.user
  const missing = { passed: false, state: `There is no account for ${who}.` }
  switch (condition.type) {
    case 'account-unlocked': {
      const label = `${who}’s account is unlocked`
      if (!user) return { label, ...missing }
      return user.locked
        ? {
            label,
            passed: false,
            state: `${who}’s account is locked${user.failedSignIns ? ` after ${user.failedSignIns} failed sign-ins` : ''}.`,
          }
        : { label, passed: true, state: `${who}’s account is unlocked.` }
    }
    case 'account-enabled': {
      const label = `${who}’s account is enabled`
      if (!user) return { label, ...missing }
      return user.status === 'active'
        ? { label, passed: true, state: `${who}’s account is enabled.` }
        : { label, passed: false, state: `${who}’s account is disabled.` }
    }
    case 'password-reset': {
      const label = `${who} has a new temporary password`
      if (!user) return { label, ...missing }
      return user.mustChangePassword
        ? {
            label,
            passed: true,
            state: `${who} has a temporary password to sign in with.`,
          }
        : { label, passed: false, state: `No new password has been issued for ${who}.` }
    }
    case 'in-group': {
      const group = state.groups.find((g) => g.id === condition.group)
      const label = `${who} is in ${group?.name ?? condition.group}`
      if (!user) return { label, ...missing }
      return user.groups.includes(condition.group)
        ? {
            label,
            passed: true,
            state: `${who} is in ${group?.name ?? condition.group}.`,
          }
        : {
            label,
            passed: false,
            state: `${who} is not in ${group?.name ?? condition.group}.`,
          }
    }
  }
}

/** Checks one condition against the systems as they are now. */
export function evaluateCondition(
  condition: TicketCondition,
  environment: TicketEnvironment | undefined,
): ConditionResult {
  const system = systemOf(condition)
  const state = environment?.[system]
  if (!state) {
    // Fail safely: a system that is not there cannot show the problem is fixed.
    return {
      condition,
      label: `A check in ${SYSTEM_NAMES[system]}`,
      passed: false,
      state: `${SYSTEM_NAMES[system]} is not connected to this queue, so this cannot be checked.`,
    }
  }
  const result =
    system === 'network'
      ? evaluateNetwork(condition, state as NetworkState)
      : evaluateDirectory(condition, state as DirectoryState)
  return { condition, ...result }
}

export interface TicketEvaluation {
  results: ConditionResult[]
  /** Every condition passes (and there is at least one). */
  fixed: boolean
  failing: ConditionResult[]
}

export function evaluateTicket(
  ticket: Ticket,
  environment: TicketEnvironment | undefined,
): TicketEvaluation {
  const results = ticket.conditions.map((c) => evaluateCondition(c, environment))
  const failing = results.filter((r) => !r.passed)
  return { results, fixed: results.length > 0 && failing.length === 0, failing }
}

/** In words: why the ticket is fixed (or what still is not). */
export const explain = (results: ConditionResult[]) =>
  results.map((r) => r.state).join(' ')

// ---------------------------------------------------------------------------
// What changed in a system (the events tickets react to)
// ---------------------------------------------------------------------------

export interface SystemChange {
  system: SystemId
  /** What changed: a device, a DNS record or an account (by ID and sign-in name). */
  entities: string[]
  /** A change the player made, for the history (e.g. "Restart device AP-FL2"). */
  action?: string
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** What changed on the network between two states (not the console or findings). */
export function networkChanges(
  before: NetworkState,
  after: NetworkState,
): SystemChange[] {
  const changes: SystemChange[] = []
  const old = new Map(before.devices.map((d) => [d.name, d]))
  for (const device of after.devices) {
    const was = old.get(device.name)
    if (
      !was ||
      was.up !== device.up ||
      was.accessPoint !== device.accessPoint ||
      !same(was.services, device.services) ||
      !same(was.config, device.config)
    )
      changes.push({ system: 'network', entities: [device.name] })
  }
  if (!same(before.dns, after.dns)) {
    const records = new Map(before.dns.records.map((r) => [r.name, r.ip]))
    const changed = after.dns.records
      .filter((r) => records.get(r.name) !== r.ip)
      .map((r) => r.name)
    changes.push({ system: 'network', entities: changed.length ? changed : ['dns'] })
  }
  // The fixes the player made, for the record (the list keeps its last 300).
  const added =
    after.actions.length > before.actions.length
      ? after.actions.slice(before.actions.length)
      : !same(after.actions.at(-1), before.actions.at(-1))
        ? after.actions.slice(-1)
        : []
  for (const action of added)
    changes.push({
      system: 'network',
      entities: [action.target],
      action: [action.action, action.target, action.detail].filter(Boolean).join(' '),
    })
  return changes
}

/** What changed in the directory between two states. */
export function directoryChanges(
  before: DirectoryState,
  after: DirectoryState,
): SystemChange[] {
  const changes: SystemChange[] = []
  const old = new Map(before.users.map((u) => [u.id, u]))
  for (const user of after.users) {
    const was = old.get(user.id)
    if (
      !was ||
      was.locked !== user.locked ||
      was.status !== user.status ||
      was.mustChangePassword !== user.mustChangePassword ||
      !same(was.groups, user.groups)
    )
      changes.push({ system: 'directory', entities: [user.id, user.username] })
  }
  const last = before.audit.reduce((max, e) => Math.max(max, e.seq), 0)
  for (const entry of after.audit.filter((e) => e.seq > last && e.byYou)) {
    const user = after.users.find((u) => u.username === entry.target)
    changes.push({
      system: 'directory',
      entities: [entry.target, ...(user ? [user.id] : [])],
      action: [entry.action, user?.name ?? entry.target].join(': '),
    })
  }
  return changes
}

/** The devices, records or accounts a condition is about. */
function entitiesOf(condition: TicketCondition): string[] {
  switch (condition.type) {
    case 'device-up':
    case 'service-running':
      return [condition.device]
    case 'can-reach':
      return [condition.from, condition.host]
    case 'dns-record':
      return [condition.name]
    default:
      return [condition.user]
  }
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/**
 * Whether a change can affect a condition. Reaching a host depends on the
 * whole route (switches, router, settings, DNS), so any change to the network
 * state counts for it; the others depend on what they name.
 */
function dependsOn(condition: TicketCondition, change: SystemChange): boolean {
  if (systemOf(condition) !== change.system) return false
  if (condition.type === 'can-reach' && !change.action) return true
  return entitiesOf(condition).some((e) => change.entities.some((c) => sameName(c, e)))
}

// ---------------------------------------------------------------------------
// The lifecycle
// ---------------------------------------------------------------------------

/** When something happens: the real time, and the office clock as the player sees it. */
export interface Moment {
  at: number
  time: string
  /** The requester's name, from their office person ID. */
  nameOf?: (personId: string) => string | undefined
}

function note(
  ticket: Ticket,
  kind: TicketActivityKind,
  text: string,
  when: Moment,
): Ticket {
  const entry: TicketActivity = { at: when.at, time: when.time, kind, text }
  return { ...ticket, activity: [...ticket.activity, entry].slice(-200) }
}

function requesterName(ticket: Ticket, when: Moment): string {
  return (ticket.requester && when.nameOf?.(ticket.requester)) || ticket.from
}

/** The message to the requester once their problem is fixed. */
function updateFor(ticket: Ticket, evaluation: TicketEvaluation, when: Moment): string {
  const name = requesterName(ticket, when).split(' ')[0]
  return `Update sent to ${requesterName(ticket, when)}: “Hi ${name}, this is fixed now: ${explain(evaluation.results)} Let us know if anything is still not working.”`
}

function markResolved(
  ticket: Ticket,
  evaluation: TicketEvaluation,
  by: 'automatic' | 'manual',
  when: Moment,
): Ticket {
  const explanation = explain(evaluation.results).slice(0, 500)
  let next: Ticket = {
    ...ticket,
    status: 'resolved',
    resolution: { by, explanation, at: when.at },
  }
  next = note(
    next,
    'resolved',
    by === 'automatic'
      ? `Resolved automatically: ${explanation}`
      : `Resolved by you, after checking: ${explanation}`,
    when,
  )
  return note(next, 'update-sent', updateFor(ticket, evaluation, when), when)
}

/** How one ticket reacts to changes in a system. */
function react(
  ticket: Ticket,
  before: TicketEnvironment,
  after: TicketEnvironment,
  changes: SystemChange[],
  when: Moment,
): Ticket {
  if (!isMonitored(ticket) || ticket.status === 'closed') return ticket
  const relevant = changes.filter((change) =>
    ticket.conditions.some((condition) => dependsOn(condition, change)),
  )
  if (relevant.length === 0) return ticket
  let next = ticket
  // The changes the player made to what the ticket is about, for its history.
  for (const change of relevant)
    if (change.action) next = note(next, 'change', `Change made: ${change.action}.`, when)
  const was = evaluateTicket(ticket, before)
  const now = evaluateTicket(ticket, after)
  now.results.forEach((result, i) => {
    if (result.passed === was.results[i].passed) return
    next = note(
      next,
      result.passed ? 'condition-ok' : 'condition-failed',
      result.passed ? `Now working: ${result.state}` : `Broken again: ${result.state}`,
      when,
    )
  })
  if (now.fixed && ticket.status !== 'resolved')
    return markResolved(next, now, 'automatic', when)
  if (!now.fixed && ticket.status === 'resolved') {
    next = { ...next, status: 'reopened', resolution: null }
    return note(
      next,
      'reopened',
      `Reopened: the fault is back. ${explain(now.failing)}`,
      when,
    )
  }
  if (ticket.status === 'assigned' && next.activity.length > ticket.activity.length) {
    next = { ...next, status: 'open' }
    return note(next, 'status', 'In progress: investigation under way.', when)
  }
  return next
}

/**
 * Changes one of the queue's systems and lets the tickets react: the one way
 * a system's state changes, so no change is missed and none is counted twice.
 */
export function applyEnvironmentChange<S extends SystemId>(
  content: TicketsContent,
  system: S,
  change: (state: NonNullable<TicketEnvironment[S]>) => NonNullable<TicketEnvironment[S]>,
  when: Moment,
): TicketsContent {
  const before = content.environment?.[system]
  if (!content.environment || !before) return content
  const updated = change(before as NonNullable<TicketEnvironment[S]>)
  if (updated === before) return content
  const environment: TicketEnvironment = { ...content.environment, [system]: updated }
  const changes =
    system === 'network'
      ? networkChanges(before as NetworkState, updated as NetworkState)
      : directoryChanges(before as DirectoryState, updated as DirectoryState)
  if (changes.length === 0) return { ...content, environment }
  return {
    ...content,
    environment,
    tickets: content.tickets.map((t) =>
      react(t, content.environment!, environment, changes, when),
    ),
  }
}

// ---------------------------------------------------------------------------
// What the player does with a ticket
// ---------------------------------------------------------------------------

function updateTicket(
  content: TicketsContent,
  id: string,
  change: (ticket: Ticket) => Ticket,
): TicketsContent {
  return {
    ...content,
    tickets: content.tickets.map((t) => (t.id === id ? change(t) : t)),
  }
}

/** The player takes the ticket. */
export function assignToMe(content: TicketsContent, id: string, when: Moment) {
  return updateTicket(content, id, (ticket) => {
    if (ticket.assignee === 'you' || ticket.status === 'closed') return ticket
    const next: Ticket = {
      ...ticket,
      assignee: 'you',
      status: ticket.status === 'new' ? 'assigned' : ticket.status,
    }
    return note(next, 'assigned', 'Assigned to you.', when)
  })
}

/** The statuses the player can choose for a ticket tied to the systems. */
export const MONITORED_CHOICES: TicketStatus[] = [
  'assigned',
  'open',
  'pending',
  'resolved',
  'closed',
]

export interface StatusRequest {
  content: TicketsContent
  /** Why the status was not changed (nothing was lost: it is in the history too). */
  refused: string[] | null
}

/**
 * The player chooses a status. For a ticket tied to the systems, Resolved is
 * checked against them first, and only a resolved ticket can be closed. A
 * refusal changes nothing but the history (so the attempt is kept), and says
 * what is still wrong. Other tickets take the status as before.
 */
export function requestStatus(
  content: TicketsContent,
  id: string,
  status: TicketStatus,
  when: Moment,
): StatusRequest {
  const ticket = content.tickets.find((t) => t.id === id)
  if (!ticket) return { content, refused: ['That ticket is not in the queue.'] }
  if (!isMonitored(ticket))
    return {
      content: updateTicket(content, id, (t) => ({ ...t, status })),
      refused: null,
    }
  if (status === ticket.status) return { content, refused: null }
  const refuse = (reasons: string[], log = true): StatusRequest => ({
    content: log
      ? updateTicket(content, id, (t) =>
          note(
            t,
            'resolve-rejected',
            `Not ${status === 'closed' ? 'closed' : 'resolved'}: ${reasons.join(' ')}`,
            when,
          ),
        )
      : content,
    refused: reasons,
  })
  if (ticket.status === 'closed')
    return refuse(
      ['This ticket is closed: open a new one if the problem comes back.'],
      false,
    )
  const evaluation = evaluateTicket(ticket, content.environment)
  if (status === 'resolved') {
    if (!evaluation.fixed)
      return refuse([
        'The problem is not fixed yet.',
        ...evaluation.failing.map((r) => r.state),
      ])
    return {
      content: updateTicket(content, id, (t) =>
        markResolved(t, evaluation, 'manual', when),
      ),
      refused: null,
    }
  }
  if (status === 'closed') {
    if (ticket.status !== 'resolved' || !evaluation.fixed)
      return refuse([
        'Only a resolved ticket can be closed: the problem must be fixed first.',
        ...evaluation.failing.map((r) => r.state),
      ])
    return {
      content: updateTicket(content, id, (t) =>
        note({ ...t, status: 'closed' }, 'closed', 'Closed: the fix is confirmed.', when),
      ),
      refused: null,
    }
  }
  if (ticket.status === 'resolved')
    return refuse(
      [
        'It is resolved: the systems show the problem is fixed. Close it, or it reopens by itself if the fault comes back.',
      ],
      false,
    )
  if (!MONITORED_CHOICES.includes(status))
    return refuse(['That status is not used for this ticket.'], false)
  return {
    content: updateTicket(content, id, (t) =>
      note(
        { ...t, status },
        'status',
        `Status changed to ${STATUS_WORDS[status]}.`,
        when,
      ),
    ),
    refused: null,
  }
}

const STATUS_WORDS: Record<TicketStatus, string> = {
  new: 'open',
  assigned: 'assigned',
  open: 'in progress',
  pending: 'waiting for information',
  escalated: 'escalated',
  resolved: 'resolved',
  reopened: 'reopened',
  closed: 'closed',
}

// ---------------------------------------------------------------------------
// Who is held up
// ---------------------------------------------------------------------------

/** What a requester cannot use while their ticket's problem lasts. */
function whatIsOut(ticket: Ticket, environment: TicketEnvironment | undefined): string {
  const network = environment?.network
  const onWifi = ticket.conditions.some(
    (c) =>
      c.type === 'can-reach' && !!network && !!deviceByName(network, c.from)?.accessPoint,
  )
  if (onWifi) return 'the Wi-Fi'
  return ticketSystems(ticket).includes('network') ? 'the network' : 'their account'
}

/**
 * The colleagues a queue's tickets are about: held up while the conditions
 * fail, back to work once they pass. Follows the systems, not the status.
 */
export function disruptionsOf(content: TicketsContent, assignment: string): Disruption[] {
  return content.tickets.flatMap((ticket) =>
    ticket.requester && isMonitored(ticket)
      ? [
          {
            person: ticket.requester,
            assignment,
            ticket: ticket.id,
            state: evaluateTicket(ticket, content.environment).fixed
              ? ('restored' as const)
              : ('blocked' as const),
            what: whatIsOut(ticket, content.environment),
          },
        ]
      : [],
  )
}

/**
 * What holds a colleague up now, if anything: their latest entry on a task
 * still under way (once the task is passed, they are simply back to normal).
 */
export function troubleOf(
  disruptions: Disruption[],
  personId: string,
  underWay: (assignment: string) => boolean,
): Pick<Disruption, 'what' | 'state'> | undefined {
  const entry = disruptions.findLast(
    (d) => d.person === personId && underWay(d.assignment),
  )
  return entry && { what: entry.what, state: entry.state }
}
