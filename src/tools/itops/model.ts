/**
 * IT Operations actions. Each takes the state and returns the new state and
 * any problems; an action with problems changes nothing. They enforce the
 * rules a real service desk works to (a computer ships with a return label,
 * only registered stock is checked out, a hardware fault survives a
 * restart), and log what was done, marking risky actions.
 */
import { RETURN_DEPOTS } from './data'
import type {
  Address,
  Asset,
  AssetStatus,
  Equipment,
  ItopsState,
  Mailbox,
  Message,
  Node,
  Person,
  ShipSpeed,
} from './schema'

export interface Result {
  state: ItopsState
  problems: string[]
  /** Something to tell the player that is not a problem (e.g. a sync report). */
  note?: string
  /** A corrected address the player can choose (Ship Manager). */
  suggestion?: Address
}

const fail = (state: ItopsState, ...problems: string[]): Result => ({ state, problems })

export function logged(
  state: ItopsState,
  action: string,
  target: string,
  detail = '',
  risk = false,
): ItopsState {
  const seq = state.log.reduce((max, e) => Math.max(max, e.seq), 0) + 1
  return {
    ...state,
    log: [...state.log, { seq, action, target, detail, risk }].slice(-500),
  }
}

// ---------------------------------------------------------------------------
// Server room: reading the state
// ---------------------------------------------------------------------------

export function nodeById(state: ItopsState, id: string): Node | undefined {
  return state.nodes.find((n) => n.id.toLowerCase() === id.toLowerCase())
}

/** Up in itself: powered, responding, no fault. */
export const nodeHealthy = (node: Node) => node.status === 'up' && node.fault === 'none'

/** Working for its users: healthy, and so is everything above it. */
export function nodeWorking(
  state: ItopsState,
  node: Node,
  seen = new Set<string>(),
): boolean {
  if (node.kind === 'isp') return !state.ispOutage && nodeHealthy(node)
  if (!nodeHealthy(node) || seen.has(node.id)) return false
  if (!node.upstream) return true
  const parent = nodeById(state, node.upstream)
  seen.add(node.id)
  return !parent || nodeWorking(state, parent, seen)
}

/** What the node shows on the panel. */
export function nodeState(
  state: ItopsState,
  node: Node,
): 'up' | 'down' | 'off' | 'unreachable' {
  if (node.kind === 'isp') return state.ispOutage || node.status !== 'up' ? 'down' : 'up'
  if (node.status === 'off') return 'off'
  if (!nodeHealthy(node)) return 'down'
  return nodeWorking(state, node) ? 'up' : 'unreachable'
}

export function cpuOfNode(node: Node): number {
  if (node.status !== 'up') return 0
  const hung = node.services.filter((s) => s.state === 'hung').length
  return Math.min(100, node.baseCpu + hung * 70)
}

export function serviceUp(state: ItopsState, nodeId: string, service: string): boolean {
  const node = nodeById(state, nodeId)
  if (!node || !nodeWorking(state, node)) return false
  return node.services.some(
    (s) => s.name.toLowerCase() === service.toLowerCase() && s.state === 'running',
  )
}

/** Everything that hangs off a node, at any depth. */
export function downstreamOf(state: ItopsState, id: string): Node[] {
  const out: Node[] = []
  const walk = (parent: string) => {
    for (const n of state.nodes)
      if (n.upstream === parent && !out.includes(n)) {
        out.push(n)
        walk(n.id)
      }
  }
  walk(id)
  return out
}

export function ispLatency(state: ItopsState): number | null {
  const isp = nodeById(state, 'ISP')
  return !isp || state.ispOutage || isp.status !== 'up' ? null : 14
}

/** What is wrong in the server room, plainly (for the overview and guidance). */
export function serverIssues(state: ItopsState): string[] {
  const out: string[] = []
  for (const node of state.nodes) {
    const s = nodeState(state, node)
    if (s === 'down') out.push(`${node.name} is not responding.`)
    else if (s === 'off') out.push(`${node.name} is powered off.`)
    for (const service of node.services)
      if (service.state !== 'running' && node.status === 'up')
        out.push(
          `${node.name}: ${service.name} is ${service.state === 'hung' ? 'not responding (high CPU)' : 'stopped'}.`,
        )
  }
  return out
}

// ---------------------------------------------------------------------------
// Server room: actions
// ---------------------------------------------------------------------------

function setNode(state: ItopsState, id: string, change: (n: Node) => Node): ItopsState {
  return { ...state, nodes: state.nodes.map((n) => (n.id === id ? change(n) : n)) }
}

export function checkIsp(state: ItopsState): Result {
  const detail = state.ispOutage
    ? 'Provider confirms an outage in the area. Their engineers are working on it; no time to fix yet.'
    : 'Provider reports no outage: the connection is healthy.'
  return {
    state: logged({ ...state, ispChecked: true }, 'Check ISP status', 'ISP', detail),
    problems: [],
    note: detail,
  }
}

export function rebootNode(state: ItopsState, id: string): Result {
  const node = nodeById(state, id)
  if (!node) return fail(state, `There is no ${id}.`)
  if (node.kind === 'isp')
    return fail(
      state,
      'The provider’s equipment cannot be restarted from here. Check the ISP status instead.',
    )
  if (node.status === 'off')
    return fail(state, `${node.name} is powered off: power it on.`)
  if (!onSiteOnly(node).remote) return fail(state, onSiteOnly(node).why)
  return restart(state, node, 'Reboot')
}

/**
 * What can be done to a device from the console. Servers have out-of-band
 * management; a network device that has stopped responding cannot be reached
 * over the network at all, so it is power-cycled where it is.
 */
export function onSiteOnly(node: Node): { remote: boolean; why: string } {
  const unreachable = node.status === 'off' || node.fault !== 'none'
  if (node.kind === 'server' || node.kind === 'isp' || !unreachable)
    return { remote: true, why: '' }
  return {
    remote: false,
    why: `${node.id} is not answering on the management network, so it cannot be restarted from here. Go to the ${node.location.toLowerCase()} and power-cycle it there.`,
  }
}

/** At the cabinet: switch the device's power outlet off and on again. */
export function powerCycle(state: ItopsState, id: string): Result {
  const node = nodeById(state, id)
  if (!node) return fail(state, `There is no ${id}.`)
  if (node.kind === 'isp' || node.kind === 'server')
    return fail(state, `${node.name} is not in this cabinet.`)
  return restart(
    node.status === 'off'
      ? setNode(state, node.id, (n) => ({ ...n, status: 'up' }))
      : state,
    node.status === 'off' ? { ...node, status: 'up' } : node,
    'Power-cycle',
  )
}

function restart(state: ItopsState, node: Node, action: string): Result {
  const wasHealthy = nodeWorking(state, node)
  const affected = node.users
  const risk = wasHealthy && affected > 0
  const fixed = node.fault === 'hung'
  const hardware = node.fault === 'hardware'
  const next = setNode(state, node.id, (n) => ({
    ...n,
    status: hardware ? 'down' : 'up',
    fault: hardware ? 'hardware' : 'none',
    uptimeDays: hardware ? n.uptimeDays : 0,
    services: n.services.map((s) => ({ ...s, state: 'running' as const })),
  }))
  const detail = hardware
    ? 'It came back with the same hardware fault (power-on self-test error). A restart cannot fix it: escalate to the vendor or infrastructure team.'
    : risk
      ? `Restarted while it was healthy: about ${affected} people lost ${node.kind === 'server' ? 'the service' : 'their connection'} for several minutes.`
      : fixed
        ? 'It was hung; after the restart it responds again.'
        : 'Restarted.'
  return {
    state: logged(next, action, node.id, detail, risk),
    problems: [],
    note: detail,
  }
}

export function shutdownNode(state: ItopsState, id: string): Result {
  const node = nodeById(state, id)
  if (!node) return fail(state, `There is no ${id}.`)
  if (node.kind === 'isp')
    return fail(state, 'The provider’s equipment is not yours to shut down.')
  if (node.status === 'off') return fail(state, `${node.name} is already off.`)
  const risk = node.users > 0
  const below = downstreamOf(state, node.id).length
  const detail = `${node.name} shut down${risk ? `: ${node.users} people lost service` : ''}${below ? `, and ${below} device${below === 1 ? '' : 's'} below it went dark` : ''}.`
  return {
    state: logged(
      setNode(state, node.id, (n) => ({ ...n, status: 'off', fault: 'none' })),
      'Shut down',
      node.id,
      detail,
      risk,
    ),
    problems: [],
    note: detail,
  }
}

export function powerOnNode(state: ItopsState, id: string): Result {
  const node = nodeById(state, id)
  if (!node) return fail(state, `There is no ${id}.`)
  if (node.status !== 'off') return fail(state, `${node.name} is not powered off.`)
  if (!onSiteOnly(node).remote) return fail(state, onSiteOnly(node).why)
  return {
    state: logged(
      setNode(state, node.id, (n) => ({ ...n, status: 'up', uptimeDays: 0 })),
      'Power on',
      node.id,
    ),
    problems: [],
  }
}

export function restartNodeService(
  state: ItopsState,
  id: string,
  service: string,
): Result {
  const node = nodeById(state, id)
  if (!node) return fail(state, `There is no ${id}.`)
  if (!nodeHealthy(node))
    return fail(
      state,
      `${node.name} is not responding, so its services cannot be reached.`,
    )
  const s = node.services.find((x) => x.name === service)
  if (!s) return fail(state, `${node.name} has no service called ${service}.`)
  const detail =
    s.state === 'hung'
      ? `${service} was not responding; restarted, and the processor load dropped.`
      : s.state === 'stopped'
        ? `${service} started.`
        : `${service} restarted (it was already running).`
  return {
    state: logged(
      setNode(state, node.id, (n) => ({
        ...n,
        services: n.services.map((x) =>
          x.name === service ? { ...x, state: 'running' as const } : x,
        ),
      })),
      'Restart service',
      `${node.id}: ${service}`,
      detail,
    ),
    problems: [],
    note: detail,
  }
}

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------

const lower = (s: string) => s.trim().toLowerCase()

export function mailboxOf(state: ItopsState, address: string): Mailbox | undefined {
  const a = lower(address)
  return state.mailboxes.find(
    (m) => lower(m.address) === a || lower(m.address.split('@')[0]) === a,
  )
}

export const overQuota = (m: Mailbox) => m.usedGb >= m.quotaGb
export const mailboxStatus = (m: Mailbox) =>
  overQuota(m)
    ? 'Prohibit send/receive (over quota)'
    : m.usedGb >= m.quotaGb * 0.9
      ? 'Warning (nearly full)'
      : 'Normal'

/** Whether a sender is on the blocked list (by address or domain). */
export function blockedEntry(state: ItopsState, sender: string) {
  const s = lower(sender)
  const domain = s.split('@')[1] ?? s
  return state.blocked.find((b) => lower(b.address) === s || lower(b.address) === domain)
}

export function traceMessages(
  state: ItopsState,
  mailbox: string,
  hours: number,
  sender = '',
): Message[] {
  const box = mailboxOf(state, mailbox)
  if (!box) return []
  return state.messages
    .filter(
      (m) =>
        lower(m.to) === lower(box.address) &&
        m.hoursAgo <= hours &&
        (!sender.trim() || lower(m.from).includes(lower(sender))),
    )
    .sort((a, b) => a.hoursAgo - b.hoursAgo)
}

function setMailbox(state: ItopsState, address: string, change: (m: Mailbox) => Mailbox) {
  return {
    ...state,
    mailboxes: state.mailboxes.map((m) => (m.address === address ? change(m) : m)),
  }
}

/** Mail waiting for a full mailbox is delivered once there is room. */
function deliverPending(state: ItopsState): ItopsState {
  let changed = false
  const messages = state.messages.map((m) => {
    if (m.status !== 'pending') return m
    const box = mailboxOf(state, m.to)
    if (!box || overQuota(box)) return m
    changed = true
    return { ...m, status: 'delivered' as const, code: '' }
  })
  return changed ? { ...state, messages } : state
}

export function enableArchive(state: ItopsState, address: string): Result {
  const box = mailboxOf(state, address)
  if (!box) return fail(state, `There is no mailbox ${address}.`)
  if (box.archive)
    return fail(state, 'The online archive is already on for this mailbox.')
  const moved = box.oldMailGb
  const next = deliverPending(
    setMailbox(state, box.address, (m) => ({
      ...m,
      archive: true,
      usedGb: Math.round((m.usedGb - moved) * 100) / 100,
      archivedGb: m.archivedGb + moved,
      oldMailGb: 0,
    })),
  )
  const detail = `Online archive enabled; ${moved.toFixed(1)} GB of older mail moved to the archive.`
  return {
    state: logged(next, 'Enable archive', box.address, detail),
    problems: [],
    note: detail,
  }
}

export function setRuleEnabled(
  state: ItopsState,
  address: string,
  ruleId: string,
  enabled: boolean,
): Result {
  const box = mailboxOf(state, address)
  const rule = box?.rules.find((r) => r.id === ruleId)
  if (!box || !rule) return fail(state, 'That rule does not exist.')
  if (rule.enabled === enabled)
    return fail(state, `The rule is already ${enabled ? 'on' : 'off'}.`)
  return {
    state: logged(
      setMailbox(state, box.address, (m) => ({
        ...m,
        rules: m.rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r)),
      })),
      enabled ? 'Enable rule' : 'Disable rule',
      `${box.address}: ${rule.name}`,
    ),
    problems: [],
  }
}

export function deleteRule(state: ItopsState, address: string, ruleId: string): Result {
  const box = mailboxOf(state, address)
  const rule = box?.rules.find((r) => r.id === ruleId)
  if (!box || !rule) return fail(state, 'That rule does not exist.')
  return {
    state: logged(
      setMailbox(state, box.address, (m) => ({
        ...m,
        rules: m.rules.filter((r) => r.id !== ruleId),
      })),
      'Delete rule',
      `${box.address}: ${rule.name}`,
      rule.forwardsOutside
        ? `It forwarded mail outside the company (${rule.action}).`
        : '',
    ),
    problems: [],
  }
}

export function releaseMessage(state: ItopsState, id: string): Result {
  const msg = state.messages.find((m) => m.id === id)
  if (!msg) return fail(state, 'That message is not in quarantine.')
  if (msg.status !== 'quarantined')
    return fail(state, 'Only a quarantined message can be released.')
  const box = mailboxOf(state, msg.to)
  const full = !!box && overQuota(box)
  const dangerous = msg.verdict === 'phishing' || msg.verdict === 'malware'
  const next: ItopsState = {
    ...state,
    messages: state.messages.map((m) =>
      m.id === id
        ? {
            ...m,
            status: full ? ('pending' as const) : ('delivered' as const),
            code: full ? '452 4.2.2 Mailbox full, will retry' : '',
            released: true,
          }
        : m,
    ),
  }
  const detail = dangerous
    ? `Released a ${msg.verdict} message from ${msg.from} into ${msg.to}.`
    : `Released “${msg.subject}” from ${msg.from}.`
  return { state: logged(next, 'Release', msg.id, detail, dangerous), problems: [] }
}

export function undoRelease(state: ItopsState, id: string): Result {
  const msg = state.messages.find((m) => m.id === id)
  if (!msg?.released) return fail(state, 'That message was not released.')
  return {
    state: logged(
      {
        ...state,
        messages: state.messages.map((m) =>
          m.id === id
            ? { ...m, status: 'quarantined' as const, code: '', released: false }
            : m,
        ),
      },
      'Undo release',
      msg.id,
      `“${msg.subject}” is back in quarantine.`,
    ),
    problems: [],
  }
}

export function removeBlocked(state: ItopsState, address: string): Result {
  const entry = state.blocked.find((b) => b.address === address)
  if (!entry) return fail(state, `${address} is not on the blocked list.`)
  const risk = entry.reason === 'phishing' || entry.reason === 'malware'
  return {
    state: logged(
      { ...state, blocked: state.blocked.filter((b) => b.address !== address) },
      'Unblock sender',
      address,
      risk
        ? `Removed a sender blocked for ${entry.reason}: it can reach everyone again.`
        : `Removed (blocked as ${entry.reason}: ${entry.note || 'no reason given'}).`,
      risk,
    ),
    problems: [],
  }
}

export function blockSender(
  state: ItopsState,
  address: string,
  reason: 'phishing' | 'malware' | 'bulk' | 'manual',
  note: string,
): Result {
  const a = lower(address)
  if (!/^([^\s@]+@)?[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(a))
    return fail(
      state,
      'Enter a sender address or a domain, e.g. offers@example.com or example.com.',
    )
  const own = state.people[0]?.email.split('@')[1] ?? ''
  if (own && (a === own || a.endsWith(`@${own}`)))
    return fail(
      state,
      'That is the company’s own domain: blocking it would stop internal mail.',
    )
  if (blockedEntry(state, a)) return fail(state, `${address} is already blocked.`)
  return {
    state: logged(
      {
        ...state,
        blocked: [...state.blocked, { address: a, reason, note, added: 'today' }],
      },
      'Block sender',
      a,
      `Blocked for ${reason}${note ? `: ${note}` : ''}.`,
    ),
    problems: [],
  }
}

// ---------------------------------------------------------------------------
// Assets and licences
// ---------------------------------------------------------------------------

export const COMPUTER_TYPES = ['desktop', 'laptop', 'kiosk'] as const
export const isComputer = (a: Asset) =>
  (COMPUTER_TYPES as readonly string[]).includes(a.type)

export function personById(state: ItopsState, id: string): Person | undefined {
  return state.people.find((p) => p.id === id)
}

export function assetByTag(state: ItopsState, tag: string): Asset | undefined {
  return state.assets.find((a) => a.tag.toLowerCase() === tag.toLowerCase())
}

/** The computers a person holds. */
export function computersOf(state: ItopsState, person: string): Asset[] {
  return state.assets.filter(
    (a) => isComputer(a) && a.assignedTo === person && a.status === 'deployed',
  )
}

/** Units physically on the shelf. */
export function shelfUnits(state: ItopsState): Asset[] {
  return state.assets.filter((a) => a.onShelf && isComputer(a))
}

export const STATUS_NAMES: Record<AssetStatus, string> = {
  'needs-registration': 'Needs registration',
  ready: 'Ready to deploy',
  deployed: 'Deployed',
  'needs-image': 'Needs to be imaged',
  broken: 'Broken',
  decommissioned: 'Decommissioned',
  lost: 'Lost',
}

/** Records whose status and holder disagree (an auditor's first question). */
export function registerProblems(state: ItopsState): string[] {
  const out: string[] = []
  for (const a of state.assets) {
    if (a.status === 'deployed' && !a.assignedTo && !a.site)
      out.push(`${a.tag} is Deployed with nobody holding it.`)
    if (a.status !== 'deployed' && a.assignedTo)
      out.push(
        `${a.tag} is ${STATUS_NAMES[a.status]} but still assigned to ${personById(state, a.assignedTo)?.name ?? a.assignedTo}.`,
      )
  }
  return out
}

function setAsset(
  state: ItopsState,
  tag: string,
  change: (a: Asset) => Asset,
): ItopsState {
  return { ...state, assets: state.assets.map((a) => (a.tag === tag ? change(a) : a)) }
}

export function registerAsset(state: ItopsState, tag: string): Result {
  const asset = assetByTag(state, tag)
  if (!asset) return fail(state, `There is no asset ${tag}.`)
  if (asset.status !== 'needs-registration')
    return fail(
      state,
      `${asset.tag} is already registered (${STATUS_NAMES[asset.status]}).`,
    )
  return {
    state: logged(
      setAsset(state, asset.tag, (a) => ({ ...a, status: 'ready' })),
      'Register asset',
      asset.tag,
      'Booked in as Ready to deploy.',
    ),
    problems: [],
  }
}

export function checkOut(state: ItopsState, tag: string, personId: string): Result {
  const asset = assetByTag(state, tag)
  const person = personById(state, personId)
  if (!asset) return fail(state, `There is no asset ${tag}.`)
  if (!person) return fail(state, 'Choose who it is for.')
  if (asset.status === 'needs-registration')
    return fail(
      state,
      `${asset.tag} is not registered yet: register it as stock first (New asset).`,
    )
  if (asset.status === 'needs-image')
    return fail(
      state,
      `${asset.tag} still holds the last user’s data and settings: re-image it in Computer Deployment first.`,
    )
  if (asset.status !== 'ready')
    return fail(
      state,
      `${asset.tag} is ${STATUS_NAMES[asset.status]}: only Ready to deploy stock can be checked out.`,
    )
  return {
    state: logged(
      setAsset(state, asset.tag, (a) => ({
        ...a,
        status: 'deployed',
        assignedTo: person.id,
        site: null,
        onShelf: false,
      })),
      'Check out',
      asset.tag,
      `To ${person.name}${isComputer(asset) && asset.build ? ` (${asset.build === 'imaging' ? 'Server Imaging' : 'Manual Domain Enrollment'} build)` : ''}.`,
    ),
    problems: [],
  }
}

export function checkIn(state: ItopsState, tag: string): Result {
  const asset = assetByTag(state, tag)
  if (!asset) return fail(state, `There is no asset ${tag}.`)
  if (asset.status !== 'deployed' || (!asset.assignedTo && !asset.site))
    return fail(state, `${asset.tag} is not checked out to anyone.`)
  const computer = isComputer(asset)
  const from = asset.assignedTo
    ? (personById(state, asset.assignedTo)?.name ?? asset.assignedTo)
    : asset.site
  return {
    state: logged(
      setAsset(state, asset.tag, (a) => ({
        ...a,
        status: computer ? 'needs-image' : 'ready',
        assignedTo: null,
        site: null,
        onShelf: computer,
      })),
      'Check in',
      asset.tag,
      `Returned by ${from}${computer ? '; it needs re-imaging before it goes out again' : ''}.`,
    ),
    problems: [],
  }
}

export function setAssetStatus(
  state: ItopsState,
  tag: string,
  status: 'broken' | 'lost' | 'decommissioned',
): Result {
  const asset = assetByTag(state, tag)
  if (!asset) return fail(state, `There is no asset ${tag}.`)
  if (asset.status === status)
    return fail(state, `${asset.tag} is already ${STATUS_NAMES[status]}.`)
  return {
    state: logged(
      setAsset(state, asset.tag, (a) => ({
        ...a,
        status,
        assignedTo: null,
        site: null,
        onShelf: false,
      })),
      'Set status',
      asset.tag,
      `${STATUS_NAMES[asset.status]} → ${STATUS_NAMES[status]} (kept in the register).`,
    ),
    problems: [],
  }
}

export function syncDirectory(state: ItopsState): Result {
  const without = state.people.filter((p) => computersOf(state, p.id).length === 0)
  const note = `${state.people.length} people read from the directory; ${without.length} without a computer${without.length ? `: ${without.map((p) => p.name).join(', ')}` : ''}.`
  return {
    state: logged(state, 'Sync from directory', 'People', note),
    problems: [],
    note,
  }
}

export function assignLicence(
  state: ItopsState,
  product: string,
  personId: string,
): Result {
  const lic = state.licences.find((l) => l.product === product)
  const person = personById(state, personId)
  if (!lic || !person) return fail(state, 'Choose a product and a person.')
  if (lic.assigned.includes(person.id))
    return fail(state, `${person.name} already has ${product}.`)
  if (lic.assigned.length >= lic.seats)
    return fail(
      state,
      `All ${lic.seats} seats of ${product} are in use: reclaim one from someone who no longer needs it.`,
    )
  return {
    state: logged(
      {
        ...state,
        licences: state.licences.map((l) =>
          l.product === product ? { ...l, assigned: [...l.assigned, person.id] } : l,
        ),
      },
      'Assign licence',
      product,
      `To ${person.name}.`,
    ),
    problems: [],
  }
}

export function reclaimLicence(
  state: ItopsState,
  product: string,
  personId: string,
): Result {
  const lic = state.licences.find((l) => l.product === product)
  if (!lic?.assigned.includes(personId))
    return fail(state, 'That person does not hold a seat.')
  const name = personById(state, personId)?.name ?? personId
  return {
    state: logged(
      {
        ...state,
        licences: state.licences.map((l) =>
          l.product === product
            ? { ...l, assigned: l.assigned.filter((p) => p !== personId) }
            : l,
        ),
      },
      'Reclaim licence',
      product,
      `From ${name}.`,
    ),
    problems: [],
  }
}

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

export const SPEEDS: Record<ShipSpeed, { name: string; seconds: number }> = {
  standard: { name: 'Standard (3 to 5 days)', seconds: 40 },
  express: { name: 'Express (2 days)', seconds: 20 },
  priority: { name: 'Priority (next morning)', seconds: 8 },
  rush: { name: 'Same-day courier', seconds: 0 },
}

export const EQUIPMENT_NAMES: Record<Equipment, string> = {
  computer: 'Computer (from the shelf)',
  charger: 'Laptop charger',
  'usb-c-cable': 'USB-C cable',
  headset: 'Headset',
  monitor: 'Monitor',
  'keyboard-mouse': 'Keyboard and mouse',
  dock: 'USB-C dock',
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\bapartment\b/g, 'apt')
    .replace(/\s+/g, ' ')
    .trim()

export const formatAddress = (a: Address) =>
  `${a.street}, ${a.city}, ${a.region} ${a.postal}`

function sameAddress(a: Address, b: Address) {
  return (
    norm(a.street) === norm(b.street) &&
    norm(a.city) === norm(b.city) &&
    norm(a.region) === norm(b.region) &&
    norm(a.postal) === norm(b.postal)
  )
}

const streetNumber = (s: string) => norm(s).match(/^\d+/)?.[0] ?? ''

export function confirmAddress(
  state: ItopsState,
  personId: string,
  time: string,
): Result {
  const person = personById(state, personId)
  if (!person) return fail(state, 'Choose who to ask.')
  if (!person.address)
    return fail(
      state,
      `${person.name} works in the office: no courier needed, take it to their desk.`,
    )
  const confirmation = { person: person.id, address: person.address, time }
  return {
    state: logged(
      {
        ...state,
        confirmations: [
          ...state.confirmations.filter((c) => c.person !== person.id),
          confirmation,
        ],
      },
      'Address confirmed',
      person.name,
      formatAddress(person.address),
    ),
    problems: [],
    note: `${person.name.split(' ')[0]}: “Sure, please send it to ${formatAddress(person.address)}.”`,
  }
}

export interface ShipForm {
  to: string
  address: Address
  items: Equipment[]
  unit: string | null
  speed: ShipSpeed
  returnLabel: boolean
  returnTo: 'it' | 'warehouse' | null
  reference: string | null
}

export function ship(state: ItopsState, form: ShipForm, now: number): Result {
  const person = personById(state, form.to)
  if (!person) return fail(state, 'Choose the recipient from the staff list.')
  const a = form.address
  if (![a.street, a.city, a.region, a.postal].every((x) => x.trim()))
    return fail(state, 'Fill in the street address, city, state and postal code.')
  if (form.items.length === 0) return fail(state, 'Choose what you are shipping.')
  if (!person.address)
    return fail(state, `${person.name} works in the office: no courier needed.`)
  if (!sameAddress(a, person.address)) {
    if (
      streetNumber(a.street) === streetNumber(person.address.street) &&
      norm(a.postal) === norm(person.address.postal)
    )
      return {
        state,
        problems: [
          'Address lookup found a matching record with a small difference. Use it, or correct the form.',
        ],
        suggestion: person.address,
      }
    const stale =
      person.addressOnFile && sameAddress(a, person.addressOnFile)
        ? ' That is the address on file, and it is out of date: ask the person where they are now.'
        : ''
    return {
      state: logged(
        state,
        'Ship refused',
        person.name,
        `Wrong address: ${formatAddress(a)}.`,
      ),
      problems: [
        `The courier’s address check failed: ${person.name} is not at ${formatAddress(a)}, so it would never reach them.${stale}`,
      ],
    }
  }
  let unit: Asset | undefined
  if (form.items.includes('computer')) {
    unit = form.unit ? assetByTag(state, form.unit) : undefined
    if (!unit?.onShelf || !isComputer(unit))
      return fail(
        state,
        'Choose the computer to send from the PC Shelf (build one in Computer Deployment if the shelf is empty).',
      )
    if (unit.status === 'needs-image')
      return fail(
        state,
        `${unit.tag} still holds the last user’s data: re-image it before it goes to anyone.`,
      )
    if (!form.returnLabel)
      return fail(
        state,
        'A whole computer ships only with a return label: the old one has to come back.',
      )
  }
  if (form.returnLabel && !form.returnTo)
    return fail(state, 'Choose where the return label sends the old equipment.')
  const seq = state.shipments.length + 1
  const id = `SHP-${String(7000 + seq)}`
  const seconds = SPEEDS[form.speed].seconds
  const shipment = {
    id,
    to: person.id,
    address: person.address,
    items: form.items,
    unit: unit?.tag ?? null,
    speed: form.speed,
    returnLabel: form.returnLabel,
    returnTo: form.returnLabel ? form.returnTo : null,
    reference: form.reference,
    sentAt: now,
    arrivesAt: now + seconds * 1000,
    status: 'in-transit' as const,
  }
  let next: ItopsState = { ...state, shipments: [...state.shipments, shipment] }
  if (unit)
    next = setAsset(next, unit.tag, (u) => ({
      ...u,
      onShelf: false,
      notes: `In transit to ${person.name} (${id}).`,
    }))
  next = logged(
    next,
    'Ship',
    id,
    `${form.items.map((i) => EQUIPMENT_NAMES[i]).join(', ')}${unit ? ` (${unit.tag}, ${unit.build === 'manual' ? 'Manual Domain Enrollment' : 'Server Imaging'})` : ''} to ${person.name}, ${SPEEDS[form.speed].name}${form.returnLabel ? `, return label to ${form.returnTo === 'it' ? 'the IT department' : 'the central warehouse'}` : ''}${form.reference ? `, ref ${form.reference}` : ''}.`,
  )
  return { state: seconds === 0 ? deliverDue(next, now) : next, problems: [] }
}

export const returnAddress = (to: 'it' | 'warehouse') => RETURN_DEPOTS[to]

/** Parcels whose delivery time has come are delivered (the courier's scan). */
export function deliverDue(state: ItopsState, now: number): ItopsState {
  const due = state.shipments.filter(
    (s) => s.status === 'in-transit' && s.arrivesAt <= now,
  )
  if (due.length === 0) return state
  let next: ItopsState = {
    ...state,
    shipments: state.shipments.map((s) =>
      due.includes(s) ? { ...s, status: 'delivered' as const } : s,
    ),
  }
  for (const s of due) {
    const name = personById(next, s.to)?.name ?? s.to
    if (s.unit)
      next = setAsset(next, s.unit, (u) => ({
        ...u,
        status: 'deployed',
        assignedTo: s.to,
        onShelf: false,
        notes: `Delivered to ${name} (${s.id}).`,
      }))
    next = logged(next, 'Delivered', s.id, `Signed for by ${name}.`)
  }
  return next
}

/** What a recipient says when the box is opened (wrong build, or all good). */
export function deliveryFeedback(state: ItopsState, shipmentId: string): string {
  const s = state.shipments.find((x) => x.id === shipmentId)
  const person = s && personById(state, s.to)
  if (!s || !person || s.status !== 'delivered') return ''
  const unit = s.unit ? assetByTag(state, s.unit) : undefined
  const first = person.name.split(' ')[0]
  if (unit && unit.build !== person.build)
    return `${first}: “It arrived, but it isn’t set up like my old one. ${person.build === 'imaging' ? 'None of our support tools are on it and it won’t take my normal sign-in.' : 'It’s a full desktop build; the shared kiosk build is what we use here.'} Can you send the right one?”`
  return `${first}: “It’s here and everything works. Thank you!”`
}

export type { Address }
