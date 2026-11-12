/**
 * Devices: the company's computers and printers as IT support manages them
 * remotely. Each device is simulated state (apps, services, processes,
 * storage, updates, network settings, print queue, event log), changed only
 * by the actions in model.ts, and every change is logged.
 */
import { z } from 'zod'

const Name = z.string().min(1).max(60)

export const DEVICE_TYPES = ['laptop', 'desktop', 'printer', 'server'] as const
export const DEVICE_STATUSES = ['online', 'offline'] as const
export const APP_STATES = [
  'working',
  'crashing',
  'not-installed',
  'install-failed',
] as const

export const AppSchema = z.object({
  name: Name,
  version: z.string().max(20),
  /** The version the company deploys (a reinstall gets this one). */
  latest: z.string().max(20),
  state: z.enum(APP_STATES),
  /** Why it crashes: damaged files (a repair fixes it), or anything else (reinstall). */
  fault: z.enum(['none', 'corrupt', 'broken']).default('none'),
  /** In the company catalogue (only approved software is installed). */
  approved: z.boolean().default(true),
  sizeGb: z.number().nonnegative().default(1),
})

export const ServiceSchema = z.object({
  name: Name,
  running: z.boolean(),
  startup: z.enum(['automatic', 'manual', 'disabled']).default('automatic'),
})

export const ProcessSchema = z.object({
  name: Name,
  cpu: z.number().min(0).max(100),
  memoryMb: z.number().nonnegative(),
  /** Part of the operating system: ending it would crash the computer. */
  system: z.boolean().default(false),
  description: z.string().max(120).default(''),
})

export const UpdateSchema = z.object({
  id: z.string().max(20),
  title: z.string().max(120),
  state: z.enum(['installed', 'pending', 'failed']),
  /** Why it failed, as Windows Update would say. */
  error: z.string().max(160).default(''),
})

export const EventSchema = z.object({
  time: z.string().max(20),
  level: z.enum(['error', 'warning', 'information']),
  source: z.string().max(60),
  message: z.string().max(300),
})

export const DeviceSchema = z.object({
  name: Name,
  type: z.enum(DEVICE_TYPES),
  /** Who uses it (full name), and their directory user ID and office person ID if known. */
  owner: z.string().max(100).default(''),
  ownerId: z.string().max(60).default(''),
  person: z.string().max(40).default(''),
  department: z.string().max(60).default(''),
  os: z.string().max(60),
  model: z.string().max(60).default(''),
  ip: z.string().max(40),
  status: z.enum(DEVICE_STATUSES),
  memoryGb: z.number().positive(),
  storage: z.object({
    totalGb: z.number().positive(),
    usedGb: z.number().nonnegative(),
    /** Temporary files Disk Cleanup can remove (part of usedGb). */
    tempGb: z.number().nonnegative(),
  }),
  network: z.object({
    /** Automatic (the company standard) or set by hand. */
    mode: z.enum(['automatic', 'manual']),
    dns: z.string().max(40),
    proxy: z.string().max(80).default(''),
    connection: z.string().max(40).default('Ethernet'),
  }),
  apps: z.array(AppSchema).max(40).default([]),
  services: z.array(ServiceSchema).max(40).default([]),
  processes: z.array(ProcessSchema).max(60).default([]),
  updates: z.array(UpdateSchema).max(30).default([]),
  events: z.array(EventSchema).max(60).default([]),
  /** Documents waiting to print (on a computer that prints, or a printer). */
  printQueue: z
    .array(z.object({ document: z.string().max(80), stuck: z.boolean() }))
    .max(20)
    .default([]),
  restartPending: z.boolean().default(false),
})

export const DevicesStateSchema = z.object({
  /** The company standard network settings (what "automatic" gives). */
  standard: z.object({ dns: z.string().max(40), proxy: z.string().max(80).default('') }),
  devices: z.array(DeviceSchema).max(200),
  /** The remote session open now, if any. */
  session: z.object({ device: Name }).nullable().default(null),
  /** Every change made, in order (like the Directory's audit log). */
  log: z
    .array(
      z.object({
        seq: z.number().int().positive(),
        device: Name,
        action: z.string().max(60),
        detail: z.string().max(200).default(''),
      }),
    )
    .max(2000)
    .default([]),
})

export type DeviceType = (typeof DEVICE_TYPES)[number]
export type App = z.infer<typeof AppSchema>
export type DeviceService = z.infer<typeof ServiceSchema>
export type DeviceProcess = z.infer<typeof ProcessSchema>
export type Device = z.infer<typeof DeviceSchema>
export type DevicesState = z.infer<typeof DevicesStateSchema>
