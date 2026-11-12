/** Network Tools, the diagnostics console: its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { officeNetwork } from './data'
import { FAULT_NAMES, FAULTS, NetworkStateSchema, type NetworkState } from './schema'
import { devicesAt, reachable, resolve } from './simulation'

export const NetworkCheckSchema = z.discriminatedUnion('type', [
  /** The player recorded this diagnosis. */
  FileCheckBaseSchema.extend({
    type: z.literal('finding'),
    device: z.string(),
    fault: z.enum(FAULTS),
  }),
  /** From a device, a name resolves to this address. */
  FileCheckBaseSchema.extend({
    type: z.literal('resolves'),
    from: z.string(),
    name: z.string(),
    ip: z.string(),
  }),
  /** From a device, a service on a host answers. */
  FileCheckBaseSchema.extend({
    type: z.literal('service'),
    from: z.string(),
    host: z.string(),
    port: z.number().int(),
  }),
  /** The player gathered this evidence in the console (a command matching the pattern). */
  FileCheckBaseSchema.extend({
    type: z.literal('evidence'),
    items: z
      .array(
        z.object({
          description: z.string(),
          /** Where it must have been run ('' for anywhere). */
          from: z.string().default(''),
          /** A regular expression the command must match. */
          pattern: z.string(),
          /**
           * A regular expression one line of what it printed must match, e.g.
           * a reply: a test that worked, not only one that was run.
           */
          output: z.string().optional(),
        }),
      )
      .min(1),
  }),
])
export type NetworkCheck = z.infer<typeof NetworkCheckSchema>

function hostIp(state: NetworkState, from: string, host: string): string | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
  const lookup = resolve(state, from, host)
  return lookup.ok ? lookup.ip : null
}

function gradeCheck(check: NetworkCheck, player: NetworkState) {
  switch (check.type) {
    case 'finding': {
      const found = player.findings.some(
        (f) =>
          f.device.toLowerCase() === check.device.toLowerCase() &&
          f.fault === check.fault,
      )
      const other = player.findings.find(
        (f) => f.device.toLowerCase() === check.device.toLowerCase(),
      )
      return checkResult(
        check,
        found ? 1 : 0,
        found
          ? []
          : [
              other
                ? `Your finding for ${check.device} says “${FAULT_NAMES[other.fault]}”: look again at the evidence.`
                : `No finding recorded for ${check.device}.`,
            ],
      )
    }
    case 'resolves': {
      const lookup = resolve(player, check.from, check.name)
      const ok = lookup.ok && lookup.ip === check.ip
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [
              lookup.ok
                ? `From ${check.from}, ${check.name} still resolves to ${lookup.ip}.`
                : `From ${check.from}, ${check.name} does not resolve at all.`,
            ],
      )
    }
    case 'service': {
      const ip = hostIp(player, check.from, check.host)
      const ok =
        !!ip &&
        reachable(player, check.from, ip) &&
        devicesAt(player, ip).some((d) =>
          d.services.some((s) => s.port === check.port && s.running),
        )
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [`From ${check.from}, ${check.host} does not answer on port ${check.port}.`],
      )
    }
    case 'evidence': {
      const missing = check.items.filter((item) => {
        const pattern = new RegExp(item.pattern, 'i')
        const output = item.output ? new RegExp(item.output, 'i') : null
        return !player.console.some(
          (e) =>
            (item.from === '' || e.from.toLowerCase() === item.from.toLowerCase()) &&
            pattern.test(e.command) &&
            (!output || e.output.some((line) => output.test(line))),
        )
      })
      return checkResult(
        check,
        1 - missing.length / check.items.length,
        missing.map((m) => `No evidence that you ${m.description}.`),
      )
    }
  }
}

export const network: ToolDefinition<NetworkState, NetworkCheck> = {
  id: 'network',
  name: 'Network Tools',
  category: 'Network diagnostics',
  icon: 'network',
  sections: [
    {
      id: 'console',
      name: 'Console',
      description:
        'Run ping, ipconfig, nslookup, tracert and port checks, from your PC or a user’s.',
    },
    {
      id: 'map',
      name: 'Network map',
      description:
        'Every device, its address, location and services; restart what has crashed.',
    },
    {
      id: 'dns',
      name: 'DNS records',
      description: 'The names the network uses, and the addresses they point to.',
    },
    {
      id: 'findings',
      name: 'Findings',
      description: 'Record what you found: the device and the fault.',
    },
  ],
  state: NetworkStateSchema,
  practice: () => officeNetwork(),
  summary: (state) =>
    `${state.console.length} command${state.console.length === 1 ? '' : 's'} run, ${state.findings.length} finding${state.findings.length === 1 ? '' : 's'}`,
  check: NetworkCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The network file was not handed in.']),
    ),
  guide: {
    intro:
      'Network Tools is the support team’s console for finding out why something can’t connect. Good troubleshooting starts close to the user and works outwards: their own settings, then their network, then the server, then the service on it. Each command answers one question; together they point to the cause.',
    topics: [
      {
        title: 'A method that works',
        body: '1. Reproduce it: run the commands from the affected user’s computer (choose it in “Run from”). 2. ipconfig: are their address, gateway and DNS server right for their floor? 3. ping the gateway, then the server by IP address: is the path there? 4. nslookup the name: does it point to the right address? 5. portcheck the service: is it actually running? Record what you find, fix what can be fixed remotely, and test again.',
      },
      {
        title: 'Reading the results',
        body: '“Request timed out” means no answer: the device or something on the way is down. “Destination host unreachable” from your own address means the computer can’t find a route: check its gateway. A name that can’t be found, while the IP address works, is a DNS problem: either the computer asks the wrong DNS server, or the record points to the wrong address. A server that answers ping but not on its port has a stopped service.',
      },
      {
        title: 'Fix, or send someone?',
        body: 'Crashed devices and stopped services can be restarted from the Network map. Wrong settings on a computer can be reset to automatic (DHCP). Wrong DNS records can be corrected. A device with no power or a broken cable cannot be fixed remotely: record the finding so someone goes on site.',
      },
    ],
    glossary: [
      {
        term: 'IP address',
        meaning: 'A device’s address on the network, e.g. 10.20.1.107.',
      },
      {
        term: 'Default gateway',
        meaning:
          'The router a computer sends traffic to for anything outside its own floor.',
      },
      {
        term: 'DNS',
        meaning: 'The system that turns names (intranet) into IP addresses.',
      },
      {
        term: 'DNS server',
        meaning: 'The server a computer asks to look up names. In the office: DC-01.',
      },
      {
        term: 'DHCP',
        meaning: 'Automatic network settings. Settings typed in by hand often go wrong.',
      },
      {
        term: 'Port',
        meaning:
          'The number a service listens on, e.g. 443 for websites, 631 for printing.',
      },
      {
        term: 'Subnet',
        meaning:
          'A group of addresses on one part of the network, e.g. floor 2 = 10.20.2.x.',
      },
    ],
  },
}

export { FAULT_NAMES }
