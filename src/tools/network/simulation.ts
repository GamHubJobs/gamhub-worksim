/**
 * How the simulated network behaves: name resolution, reachability, and the
 * output of each console command. Deterministic, so the same network always
 * answers the same way.
 */
import type { Device, NetworkState, Subnet } from './schema'

const isIp = (text: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(text)

export function deviceByName(state: NetworkState, name: string): Device | undefined {
  const wanted = name.toLowerCase()
  return state.devices.find(
    (d) =>
      d.name.toLowerCase() === wanted ||
      `${d.name}.${state.domain}`.toLowerCase() === wanted,
  )
}

/** Devices with this address (more than one is an IP conflict). */
export function devicesAt(state: NetworkState, ip: string): Device[] {
  return state.devices.filter((d) => d.ip === ip)
}

export function subnetOf(state: NetworkState, device: Device): Subnet | undefined {
  return state.subnets.find((s) => s.id === device.subnet)
}

function subnetForIp(state: NetworkState, ip: string): Subnet | undefined {
  return state.subnets.find((s) => ip.startsWith(`${s.prefix}.`))
}

const up = (state: NetworkState, name: string) => deviceByName(state, name)?.up ?? false

const ROUTER = 'RTR-CORE'
const FIREWALL = 'FW-EDGE'

export type Hop = { name: string; ip: string; ok: boolean }

/**
 * The path from a device to an address, hop by hop. The last hop is the
 * target; a hop with ok = false is where traffic stops.
 */
export function route(state: NetworkState, fromName: string, ip: string): Hop[] {
  const from = deviceByName(state, fromName)
  if (!from) return []
  const hops: Hop[] = []
  const add = (name: string, address: string, ok: boolean) => {
    hops.push({ name, ip: address, ok })
    return ok
  }
  const fromSubnet = subnetOf(state, from)
  if (!from.up || !fromSubnet) return [{ name: from.name, ip: from.ip, ok: false }]
  // The device's own switch.
  if (!up(state, fromSubnet.switch))
    return [{ name: fromSubnet.switch, ip: fromSubnet.gateway, ok: false }]
  const targets = devicesAt(state, ip)
  const target = targets.find((t) => t.up) ?? targets[0]
  const targetSubnet = subnetForIp(state, ip)

  // Same subnet: straight there.
  if (targetSubnet && targetSubnet.id === fromSubnet.id) {
    add(target?.name ?? ip, ip, !!target?.up)
    return hops
  }
  // Anywhere else goes through the default gateway, which must be right.
  const gateway = from.config?.gateway ?? fromSubnet.gateway
  if (gateway !== fromSubnet.gateway) {
    add('(gateway)', gateway, false)
    return hops
  }
  if (!add(ROUTER, fromSubnet.gateway, up(state, ROUTER))) return hops
  if (targetSubnet) {
    if (!add(targetSubnet.switch, targetSubnet.gateway, up(state, targetSubnet.switch)))
      return hops
    add(target?.name ?? ip, ip, !!target?.up)
    return hops
  }
  // The internet: through the firewall.
  const firewall = deviceByName(state, FIREWALL)
  if (!add(FIREWALL, firewall?.ip ?? '0.0.0.0', !!firewall?.up)) return hops
  const isp = deviceByName(state, 'ISP-LINK')
  if (!add('ISP-LINK', isp?.ip ?? '0.0.0.0', !!isp?.up)) return hops
  add(target?.name ?? ip, ip, !!target?.up)
  return hops
}

export function reachable(state: NetworkState, fromName: string, ip: string): boolean {
  const hops = route(state, fromName, ip)
  return hops.length > 0 && hops.every((h) => h.ok)
}

export type Lookup =
  | { ok: true; ip: string; server: string }
  | {
      ok: false
      reason: 'no-server' | 'not-found' | 'unreachable' | 'stopped'
      server: string
    }

/** Resolves a name the way the device would, through its DNS server. */
export function resolve(state: NetworkState, fromName: string, name: string): Lookup {
  const from = deviceByName(state, fromName)
  const server = from?.config?.dns ?? state.dns.server
  const serverDevice = devicesAt(state, server)[0]
  if (!serverDevice) return { ok: false, reason: 'no-server', server }
  if (!reachable(state, fromName, server))
    return { ok: false, reason: 'unreachable', server }
  if (!serverDevice.services.some((s) => s.port === 53 && s.running)) {
    return { ok: false, reason: 'stopped', server }
  }
  const short = name.toLowerCase().replace(`.${state.domain}`, '')
  const record = state.dns.records.find((r) => r.name.toLowerCase() === short)
  return record
    ? { ok: true, ip: record.ip, server }
    : { ok: false, reason: 'not-found', server }
}

// ---------------------------------------------------------------------------
// Console commands
// ---------------------------------------------------------------------------

export const COMMANDS = [
  ['ping <name or IP>', 'Is the device reachable? Sends four test messages.'],
  ['ipconfig', 'This computer’s address, gateway and DNS server.'],
  ['nslookup <name>', 'Which IP address a name resolves to, and from which DNS server.'],
  ['tracert <name or IP>', 'Every hop on the way, and where it stops.'],
  [
    'portcheck <name or IP> <port>',
    'Is a service listening (e.g. 443 web, 445 files, 631 printing)?',
  ],
  ['devices', 'The devices on the network map.'],
  ['help', 'This list.'],
] as const

function target(
  state: NetworkState,
  from: string,
  text: string,
): { ip: string; label: string; lines: string[] } | null {
  if (isIp(text)) return { ip: text, label: text, lines: [] }
  const lookup = resolve(state, from, text)
  if (lookup.ok) return { ip: lookup.ip, label: `${text} [${lookup.ip}]`, lines: [] }
  return null
}

function lookupFailure(state: NetworkState, from: string, name: string): string {
  const lookup = resolve(state, from, name)
  if (lookup.ok) return ''
  return lookup.reason === 'not-found'
    ? `Ping request could not find host ${name}. Please check the name and try again.`
    : `Ping request could not find host ${name}. (The DNS server ${lookup.server} did not answer.)`
}

/** Runs a console command on a device and returns what it prints. */
export function runCommand(state: NetworkState, from: string, input: string): string[] {
  const [command = '', ...args] = input.trim().split(/\s+/)
  const device = deviceByName(state, from)
  if (!device) return [`Cannot connect to ${from}.`]
  if (!device.up)
    return [`${from} is not responding: the remote session could not start.`]
  switch (command.toLowerCase()) {
    case '':
      return []
    case 'help':
      return ['Commands:', ...COMMANDS.map(([c, d]) => `  ${c.padEnd(30)} ${d}`)]
    case 'devices':
      return [
        'NAME            IP ADDRESS      TYPE           LOCATION',
        ...state.devices
          .filter((d) => d.kind !== 'external')
          .map(
            (d) =>
              `${d.name.padEnd(16)}${d.ip.padEnd(16)}${d.kind.padEnd(15)}${d.location}`,
          ),
      ]
    case 'ipconfig': {
      const subnet = subnetOf(state, device)
      const config = device.config ?? {
        gateway: subnet?.gateway ?? '',
        dns: state.dns.server,
        static: false,
      }
      return [
        `Windows IP Configuration: ${device.name}`,
        '',
        `   IPv4 Address. . . . . . . . . . : ${device.ip}`,
        '   Subnet Mask . . . . . . . . . . : 255.255.255.0',
        `   Default Gateway . . . . . . . . : ${config.gateway}`,
        `   DNS Servers . . . . . . . . . . : ${config.dns}`,
        `   DHCP Enabled. . . . . . . . . . : ${config.static ? 'No (set by hand)' : 'Yes'}`,
        ...(devicesAt(state, device.ip).length > 1
          ? [
              '',
              `   Warning: another device on the network is using ${device.ip} (address conflict).`,
            ]
          : []),
      ]
    }
    case 'ping': {
      if (!args[0]) return ['Usage: ping <name or IP address>']
      const t = target(state, from, args[0])
      if (!t) return [lookupFailure(state, from, args[0])]
      const ok = reachable(state, from, t.ip)
      const conflict = devicesAt(state, t.ip).length > 1
      const hops = route(state, from, t.ip)
      const failedAt = hops.find((h) => !h.ok)
      const reply = ok
        ? Array.from({ length: 4 }, (_, i) =>
            conflict && i % 2 === 1
              ? 'Request timed out.'
              : `Reply from ${t.ip}: bytes=32 time=${hops.length * 2 + i}ms TTL=${128 - hops.length}`,
          )
        : Array.from({ length: 4 }, () =>
            failedAt && failedAt.name === '(gateway)'
              ? `Reply from ${device.ip}: Destination host unreachable.`
              : 'Request timed out.',
          )
      const received = reply.filter(
        (r) => r.startsWith('Reply from') && !r.includes('unreachable'),
      ).length
      return [
        `Pinging ${t.label} with 32 bytes of data:`,
        ...reply,
        '',
        `Ping statistics for ${t.ip}:`,
        `    Packets: Sent = 4, Received = ${received}, Lost = ${4 - received} (${(4 - received) * 25}% loss)`,
      ]
    }
    case 'nslookup': {
      if (!args[0]) return ['Usage: nslookup <name>']
      const lookup = resolve(state, from, args[0])
      const name = args[0].includes('.') ? args[0] : `${args[0]}.${state.domain}`
      const serverName = devicesAt(state, lookup.server)[0]?.name ?? 'Unknown'
      const header = [`Server:  ${serverName}`, `Address:  ${lookup.server}`, '']
      if (lookup.ok) return [...header, `Name:    ${name}`, `Address:  ${lookup.ip}`]
      if (lookup.reason === 'not-found')
        return [...header, `*** ${serverName} can't find ${name}: Non-existent domain`]
      return [
        `DNS request timed out.`,
        `    timeout was 2 seconds.`,
        `*** Can't find server name for address ${lookup.server}: Timed out`,
      ]
    }
    case 'tracert': {
      if (!args[0]) return ['Usage: tracert <name or IP address>']
      const t = target(state, from, args[0])
      if (!t) return [`Unable to resolve target system name ${args[0]}.`]
      const hops = route(state, from, t.ip)
      const lines = [`Tracing route to ${t.label} over a maximum of 30 hops`, '']
      hops.forEach((hop, i) => {
        lines.push(
          hop.ok
            ? `  ${String(i + 1).padStart(2)}    ${i + 1} ms    ${i + 1} ms    ${i + 2} ms  ${hop.name === t.label ? t.ip : `${hop.name} [${hop.ip}]`}`
            : `  ${String(i + 1).padStart(2)}     *        *        *     Request timed out.`,
        )
      })
      lines.push(
        '',
        hops.every((h) => h.ok)
          ? 'Trace complete.'
          : 'Trace stopped: no reply beyond this point.',
      )
      return lines
    }
    case 'portcheck': {
      if (!args[0] || !args[1]) return ['Usage: portcheck <name or IP> <port>']
      const t = target(state, from, args[0])
      if (!t) return [`Name resolution of ${args[0]} failed.`]
      const port = Number(args[1])
      if (!reachable(state, from, t.ip)) {
        return [
          `ComputerName: ${args[0]}`,
          `RemoteAddress: ${t.ip}`,
          `RemotePort: ${port}`,
          'PingSucceeded: False',
          'TcpTestSucceeded: False',
        ]
      }
      const service = devicesAt(state, t.ip)
        .flatMap((d) => d.services)
        .find((s) => s.port === port)
      return [
        `ComputerName: ${args[0]}`,
        `RemoteAddress: ${t.ip}`,
        `RemotePort: ${port}${service ? ` (${service.name})` : ''}`,
        'PingSucceeded: True',
        `TcpTestSucceeded: ${service?.running ? 'True' : 'False'}`,
      ]
    }
    default:
      return [`'${command}' is not recognised. Type help for the list of commands.`]
  }
}
