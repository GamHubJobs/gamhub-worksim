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
import { sessionForTicket, viewSession } from '../tools/directory/security'
import {
  cpuOf,
  findDevice,
  freeGb,
  serviceRunning,
  standardNetwork,
} from '../tools/devices/model'
import type { DevicesState } from '../tools/devices/schema'
import type { CommsState } from '../tools/comms/schema'
import { TicketConditionSchema } from '../persistence/schemas'
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
  devices: 'Devices',
  comms: 'Communications',
}

/** Which system a condition is checked in. */
export function systemOf(condition: TicketCondition): SystemId {
  switch (condition.type) {
    case 'device-up':
    case 'service-running':
    case 'can-reach':
    case 'dns-record':
      return 'network'
    case 'device-performance':
    case 'disk-free':
    case 'app-working':
    case 'device-service':
    case 'network-standard':
    case 'updates-installed':
    case 'print-queue-clear':
      return 'devices'
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

function evaluateDevices(
  condition: TicketCondition,
  state: DevicesState,
): Omit<ConditionResult, 'condition'> {
  if (!('device' in condition))
    return { label: 'A device check', passed: false, state: 'This cannot be checked.' }
  const device = findDevice(state, condition.device)
  const name = condition.device
  const missing = (label: string) => ({
    label,
    passed: false,
    state: `${name} is not in the device inventory.`,
  })
  switch (condition.type) {
    case 'device-performance': {
      const label = `${name} is not overloaded (processor under ${condition.maxCpu}%)`
      if (!device) return missing(label)
      const cpu = cpuOf(device)
      const top = [...device.processes].sort((a, b) => b.cpu - a.cpu)[0]
      return cpu <= condition.maxCpu
        ? { label, passed: true, state: `${name}’s processor is at ${cpu}%.` }
        : {
            label,
            passed: false,
            state: `${name}’s processor is at ${cpu}%${top ? ` (${top.name} uses ${top.cpu}%)` : ''}.`,
          }
    }
    case 'disk-free': {
      const label = `${name} has at least ${condition.minGb} GB free`
      if (!device) return missing(label)
      const free = freeGb(device)
      return free >= condition.minGb
        ? { label, passed: true, state: `${name} has ${free} GB free.` }
        : { label, passed: false, state: `${name} has only ${free} GB free.` }
    }
    case 'app-working': {
      const label = `${condition.app} works on ${name}`
      if (!device) return missing(label)
      const app = device.apps.find((a) => a.name === condition.app)
      if (!app || app.state === 'not-installed')
        return {
          label,
          passed: false,
          state: `${condition.app} is not installed on ${name}.`,
        }
      if (app.state === 'install-failed')
        return {
          label,
          passed: false,
          state: `${condition.app} failed to install on ${name}.`,
        }
      return app.state === 'crashing'
        ? { label, passed: false, state: `${condition.app} keeps crashing on ${name}.` }
        : {
            label,
            passed: true,
            state: `${condition.app} ${app.version} works on ${name}.`,
          }
    }
    case 'device-service': {
      const label = `${condition.service} is running on ${name}`
      if (!device) return missing(label)
      return serviceRunning(device, condition.service)
        ? { label, passed: true, state: `${condition.service} is running on ${name}.` }
        : { label, passed: false, state: `${condition.service} has stopped on ${name}.` }
    }
    case 'network-standard': {
      const label = `${name} uses the company’s network settings`
      if (!device) return missing(label)
      return standardNetwork(state, device)
        ? {
            label,
            passed: true,
            state: `${name} uses the standard (automatic) settings.`,
          }
        : {
            label,
            passed: false,
            state: `${name}’s network settings were changed by hand${device.network.proxy ? ` (proxy ${device.network.proxy})` : ''}.`,
          }
    }
    case 'updates-installed': {
      const label = `${name} is up to date`
      if (!device) return missing(label)
      const failed = device.updates.find((u) => u.state === 'failed')
      if (failed)
        return { label, passed: false, state: `Update ${failed.id} failed on ${name}.` }
      if (device.updates.some((u) => u.state === 'pending'))
        return {
          label,
          passed: false,
          state: `Updates are waiting to install on ${name}.`,
        }
      return device.restartPending
        ? {
            label,
            passed: false,
            state: `${name} needs a restart to finish its updates.`,
          }
        : { label, passed: true, state: `${name} is up to date.` }
    }
    case 'print-queue-clear': {
      const label = `Nothing is stuck in ${name}’s print queue`
      if (!device) return missing(label)
      const stuck = device.printQueue.find((j) => j.stuck)
      return stuck
        ? {
            label,
            passed: false,
            state: `“${stuck.document}” is stuck in ${name}’s print queue.`,
          }
        : { label, passed: true, state: `${name}’s print queue is clear.` }
    }
    default:
      return { label: 'A device check', passed: false, state: 'This cannot be checked.' }
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
      : system === 'devices'
        ? evaluateDevices(condition, state as DevicesState)
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

/** What changed on the company's devices (their state, and the changes the player made). */
export function devicesChanges(
  before: DevicesState,
  after: DevicesState,
): SystemChange[] {
  const changes: SystemChange[] = []
  const old = new Map(before.devices.map((d) => [d.name, d]))
  for (const device of after.devices)
    if (!same(old.get(device.name), device))
      changes.push({ system: 'devices', entities: [device.name] })
  const last = before.log.reduce((max, e) => Math.max(max, e.seq), 0)
  for (const entry of after.log.filter((e) => e.seq > last)) {
    if (entry.action === 'Connect' || entry.action === 'Disconnect') continue
    changes.push({
      system: 'devices',
      entities: [entry.device],
      action: [entry.action, entry.detail, `on ${entry.device}`]
        .filter(Boolean)
        .join(' '),
    })
  }
  return changes
}

/** The devices, records or accounts a condition is about. */
function entitiesOf(condition: TicketCondition): string[] {
  switch (condition.type) {
    case 'device-up':
    case 'service-running':
    case 'device-performance':
    case 'disk-free':
    case 'app-working':
    case 'device-service':
    case 'network-standard':
    case 'updates-installed':
    case 'print-queue-clear':
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
 * The directory's new security events (verifications, approvals, refused
 * attempts), written to the history of the ticket they belong to: the
 * ticket named, or else the open tickets about that account. Each event is
 * new exactly once (by its number), so none is written twice.
 */
function securityNotes(
  tickets: Ticket[],
  before: DirectoryState,
  after: DirectoryState,
  when: Moment,
): Ticket[] {
  const last = before.security?.events.reduce((max, e) => Math.max(max, e.seq), 0) ?? 0
  const added = (after.security?.events ?? []).filter(
    (e) => e.seq > last && e.kind !== 'performed',
  )
  if (added.length === 0) return tickets
  return tickets.map((ticket) => {
    if (ticket.status === 'closed') return ticket
    const mine = added.filter((e) =>
      e.ticket
        ? e.ticket === ticket.id
        : ticket.conditions.some((c) => 'user' in c && c.user === e.user),
    )
    if (mine.length === 0) return ticket
    const noted = mine.reduce(
      (t, e) =>
        note(
          t,
          e.severity === 'info' ? 'verification' : 'security',
          e.severity === 'breach'
            ? `Security policy breach: ${e.text}`
            : e.severity === 'warning'
              ? `Refused by the security policy: ${e.text}`
              : e.text,
          when,
        ),
      ticket,
    )
    // Verifying the requester is work on the ticket.
    return noted.status === 'assigned'
      ? note(
          { ...noted, status: 'open' },
          'status',
          'In progress: verification under way.',
          when,
        )
      : noted
  })
}

// ---------------------------------------------------------------------------
// Communications: tickets from voicemail and calls, and messages that follow
// ---------------------------------------------------------------------------

type Contact = (CommsState['voicemails'][number] | CommsState['calls'][number]) & {
  kind: 'voicemail' | 'call'
}

const contactsOf = (comms: CommsState | undefined): Contact[] => [
  ...(comms?.voicemails ?? []).map((v) => ({ ...v, kind: 'voicemail' as const })),
  ...(comms?.calls ?? []).map((c) => ({ ...c, kind: 'call' as const })),
]

/**
 * The tickets voicemail and calls were turned into (added to the queue once),
 * and notes on the tickets they were linked to. Idempotent: a ticket that is
 * already there is not added again, and a link is noted when it is made.
 */
export function materializeTickets(
  content: TicketsContent,
  before: CommsState | undefined,
  when: Moment,
): TicketsContent {
  const comms = content.environment?.comms
  if (!comms) return content
  const was = new Map(contactsOf(before).map((c) => [c.id, c.ticket]))
  let tickets = content.tickets
  for (const contact of contactsOf(comms)) {
    if (!contact.ticket) continue
    const what = contact.kind === 'voicemail' ? 'voicemail' : 'call'
    const created = contact.opens?.id === contact.ticket
    if (created && !tickets.some((t) => t.id === contact.ticket)) {
      const template = contact.opens!
      const conditions = TicketConditionSchema.array().safeParse(template.conditions)
      tickets = [
        ...tickets,
        {
          id: template.id,
          from: contact.name,
          department: contact.department,
          received: contact.received,
          subject: template.subject,
          body: template.body,
          priority: null,
          category: null,
          status: 'new',
          reply: '',
          note: '',
          requester: template.requester ?? contact.from,
          conditions: conditions.success ? conditions.data : [],
          assignee: null,
          activity: [
            {
              at: when.at,
              time: when.time,
              kind: 'created',
              text: `Ticket created from a ${what} from ${contact.name}: ${template.subject}`,
            },
          ],
          resolution: null,
          hintsUsed: 0,
        },
      ]
    } else if (!created && was.get(contact.id) !== contact.ticket) {
      tickets = tickets.map((t) =>
        t.id === contact.ticket
          ? note(
              t,
              'contact',
              `${what === 'voicemail' ? 'Voicemail' : 'Call'} from ${contact.name} linked to this ticket.`,
              when,
            )
          : t,
      )
    }
  }
  return tickets === content.tickets ? content : { ...content, tickets }
}

/**
 * Messages that follow events: when a ticket becomes resolved or reopened,
 * its requester writes to the service desk (once per event).
 */
function followUps(
  before: TicketsContent,
  after: TicketsContent,
  when: Moment,
): TicketsContent {
  const comms = after.environment?.comms
  if (!comms) return after
  const old = new Map(before.tickets.map((t) => [t.id, t.status]))
  let next = comms
  for (const ticket of after.tickets) {
    const was = old.get(ticket.id)
    if (!ticket.requester || was === ticket.status) continue
    const kind =
      ticket.status === 'resolved'
        ? 'resolved'
        : ticket.status === 'reopened'
          ? 'reopened'
          : null
    if (!kind) continue
    const channel = `dm-${ticket.requester}`
    const channels = next.channels.some((c) => c.id === channel)
      ? next.channels
      : [
          ...next.channels,
          {
            id: channel,
            name: ticket.from,
            kind: 'direct' as const,
            person: ticket.requester,
            description: '',
          },
        ]
    const n = next.messages.filter((m) =>
      m.id.startsWith(`m-${ticket.id}-${kind}`),
    ).length
    const first = ticket.from.split(' ')[0]
    next = {
      ...next,
      channels,
      messages: [
        ...next.messages,
        {
          id: `m-${ticket.id}-${kind}-${n + 1}`,
          channel,
          from: ticket.requester,
          name: ticket.from,
          time: when.time,
          text:
            kind === 'resolved'
              ? `It’s working again, thank you for sorting it so quickly! (${ticket.subject})`
              : `Sorry, it’s gone wrong again: “${ticket.subject}”. Could you have another look? ${first}`,
          read: false,
          ticket: ticket.id,
        },
      ].slice(-1000),
    }
  }
  return next === comms
    ? after
    : { ...after, environment: { ...after.environment, comms: next } }
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
  const tickets =
    system === 'directory'
      ? securityNotes(
          content.tickets,
          before as DirectoryState,
          updated as DirectoryState,
          when,
        )
      : content.tickets
  // Communications open and link tickets; nothing a condition checks changes.
  if (system === 'comms')
    return materializeTickets(
      { ...content, environment, tickets },
      before as CommsState,
      when,
    )
  const changes =
    system === 'network'
      ? networkChanges(before as NetworkState, updated as NetworkState)
      : system === 'devices'
        ? devicesChanges(before as DevicesState, updated as DevicesState)
        : directoryChanges(before as DirectoryState, updated as DirectoryState)
  if (changes.length === 0) return { ...content, environment, tickets }
  const next = {
    ...content,
    environment,
    tickets: tickets.map((t) =>
      react(t, content.environment!, environment, changes, when),
    ),
  }
  return followUps(content, next, when)
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
      content: followUps(
        content,
        updateTicket(content, id, (t) => markResolved(t, evaluation, 'manual', when)),
        when,
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
  if (ticket.conditions.some((c) => c.type === 'print-queue-clear')) return 'the printer'
  if (ticketSystems(ticket).includes('devices')) return 'their computer'
  return ticketSystems(ticket).includes('network') ? 'the network' : 'their account'
}

/**
 * The colleagues a queue's tickets are about: held up while the conditions
 * fail, back to work once they pass. Follows the systems, not the status.
 */
/**
 * Where verifying the requester stands, if their ticket needs it (a
 * directory with a security policy, and a verification started).
 */
function verificationStage(
  ticket: Ticket,
  directory: DirectoryState | undefined,
  fixed: boolean,
): Disruption['stage'] {
  if (!directory?.security) return undefined
  const session = sessionForTicket(directory, ticket.id)
  if (!session) return undefined
  const view = viewSession(directory, session)
  if (fixed) return 'verified'
  if (view.status === 'failed') return 'unverified'
  if (view.status === 'expired' || session.failedAttempts >= 2) return 'frustrated'
  const checks = session.steps.filter((s) => s.method !== 'approval')
  if (view.identity === 'verified')
    return view.authorised ? 'verified' : 'awaiting-approval'
  if (checks.length > 0 && checks.every((s) => !s.passed)) return 'unverified'
  return 'verifying'
}

export function disruptionsOf(content: TicketsContent, assignment: string): Disruption[] {
  return content.tickets.flatMap((ticket) => {
    if (!ticket.requester || !isMonitored(ticket)) return []
    const fixed = evaluateTicket(ticket, content.environment).fixed
    const stage = verificationStage(ticket, content.environment?.directory, fixed)
    return [
      {
        person: ticket.requester,
        assignment,
        ticket: ticket.id,
        state: fixed ? ('restored' as const) : ('blocked' as const),
        what: whatIsOut(ticket, content.environment),
        ...(stage ? { stage } : {}),
      },
    ]
  })
}

/**
 * What holds a colleague up now, if anything: their latest entry on a task
 * still under way (once the task is passed, they are simply back to normal).
 */
export function troubleOf(
  disruptions: Disruption[],
  personId: string,
  underWay: (assignment: string) => boolean,
): Pick<Disruption, 'what' | 'state' | 'stage'> | undefined {
  const entry = disruptions.findLast(
    (d) => d.person === personId && underWay(d.assignment),
  )
  return (
    entry && {
      what: entry.what,
      state: entry.state,
      ...(entry.stage ? { stage: entry.stage } : {}),
    }
  )
}
