/**
 * Network Tools: a simulated office network, a diagnostics console that runs
 * the usual commands against it, the fixes support staff can make remotely,
 * and the findings they record. Faults are part of the network's state, so
 * every command answers consistently with them.
 */
import { z } from 'zod'

const Ip = z.string().regex(/^\d{1,3}(\.\d{1,3}){3}$/)
const Name = z.string().min(1).max(60)

export const DEVICE_KINDS = [
  'pc',
  'laptop',
  'printer',
  'server',
  'switch',
  'router',
  'firewall',
  'access-point',
  'external',
] as const

export const SubnetSchema = z.object({
  id: Name,
  name: z.string().max(80),
  /** The first three parts of the address, e.g. "10.20.1". Every subnet is a /24. */
  prefix: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/),
  gateway: Ip,
  /** The switch the subnet hangs off. */
  switch: Name,
})

export const ServiceSchema = z.object({
  port: z.number().int().min(1).max(65535),
  name: z.string().max(40),
  running: z.boolean(),
})

export const DeviceSchema = z.object({
  name: Name,
  kind: z.enum(DEVICE_KINDS),
  ip: Ip,
  /** Subnet ID; empty for the internet. */
  subnet: z.string().max(60),
  location: z.string().max(80),
  description: z.string().max(200).default(''),
  /** Powered on and connected. */
  up: z.boolean(),
  /**
   * Whether the support team can fix it remotely. A device that is down
   * because of a crash can be restarted; one that is unplugged or broken
   * needs someone on site.
   */
  restartable: z.boolean().default(true),
  /**
   * The Wi-Fi access point a laptop or PC connects through, if it uses Wi-Fi.
   * While that access point is down, the device is off the network.
   */
  accessPoint: Name.optional(),
  services: z.array(ServiceSchema).default([]),
  /** Network settings of computers (what ipconfig shows). */
  config: z
    .object({
      gateway: Ip,
      dns: Ip,
      /** Set by hand instead of automatically (DHCP). */
      static: z.boolean().default(false),
    })
    .optional(),
})

export const DnsRecordSchema = z.object({ name: Name, ip: Ip })

export const FAULTS = [
  'device-offline',
  'device-crashed',
  'service-stopped',
  'wrong-gateway',
  'wrong-dns-server',
  'wrong-dns-record',
  'ip-conflict',
  'internet-down',
] as const

export const FAULT_NAMES: Record<(typeof FAULTS)[number], string> = {
  'device-offline': 'Device offline (needs someone on site)',
  'device-crashed': 'Device stopped responding (can be restarted remotely)',
  'service-stopped': 'Service stopped',
  'wrong-gateway': 'Wrong default gateway',
  'wrong-dns-server': 'Wrong DNS server setting',
  'wrong-dns-record': 'Wrong DNS record',
  'ip-conflict': 'IP address conflict',
  'internet-down': 'Internet connection down',
}

export const FindingSchema = z.object({
  id: Name,
  device: Name,
  fault: z.enum(FAULTS),
  note: z.string().max(500).default(''),
})

export const ConsoleEntrySchema = z.object({
  /** Where the command ran (your PC, or a user's computer over remote support). */
  from: Name,
  command: z.string().max(200),
  output: z.array(z.string().max(300)).max(60),
})

export const ActionSchema = z.object({
  action: z.string().max(60),
  target: z.string().max(100),
  detail: z.string().max(200).default(''),
})

export const NetworkStateSchema = z.object({
  /** The technician's own computer: commands run from here by default. */
  home: Name,
  domain: z.string().max(60),
  subnets: z.array(SubnetSchema).max(30),
  devices: z.array(DeviceSchema).max(200),
  dns: z.object({ server: Ip, records: z.array(DnsRecordSchema).max(200) }),
  console: z.array(ConsoleEntrySchema).max(300).default([]),
  findings: z.array(FindingSchema).max(50).default([]),
  /** Fixes made, for the record (and for grading). */
  actions: z.array(ActionSchema).max(300).default([]),
})

export type Subnet = z.infer<typeof SubnetSchema>
export type Device = z.infer<typeof DeviceSchema>
export type DeviceKind = (typeof DEVICE_KINDS)[number]
export type Fault = (typeof FAULTS)[number]
export type Finding = z.infer<typeof FindingSchema>
export type ConsoleEntry = z.infer<typeof ConsoleEntrySchema>
export type NetworkState = z.infer<typeof NetworkStateSchema>
