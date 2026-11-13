/**
 * IT Operations: the company's shared IT estate as the service desk runs it.
 * One state holds the server room (network equipment and servers), the mail
 * system (mailboxes, message trace, the mail filter), the asset register
 * (with the stockroom shelf), shipments to remote staff, licences, and
 * computer builds in progress. Everything changes only through the actions
 * in model.ts and deployment.ts, and every change is logged.
 */
import { z } from 'zod'

const Name = z.string().min(1).max(80)
const Text = (max: number) => z.string().max(max)

// ---------------------------------------------------------------------------
// Server room
// ---------------------------------------------------------------------------

export const NODE_KINDS = [
  'isp',
  'router',
  'firewall',
  'switch',
  'server',
  'controller',
  'ap',
] as const
export const NODE_STATUSES = ['up', 'down', 'off'] as const
export const SERVICE_STATES = ['running', 'stopped', 'hung'] as const

export const NodeServiceSchema = z.object({
  name: Name,
  state: z.enum(SERVICE_STATES),
  description: Text(160).default(''),
})

export const NodeSchema = z.object({
  id: Name,
  name: Name,
  kind: z.enum(NODE_KINDS),
  ip: Text(40),
  /** The zone it sits in (a VLAN), e.g. "Server room". */
  zone: Text(60),
  location: Text(80),
  /** The node it hangs off (null for the internet provider). */
  upstream: Text(80).nullable(),
  status: z.enum(NODE_STATUSES),
  /**
   * Why it is down: a hung device a restart clears, a hardware fault a
   * restart cannot fix, or none.
   */
  fault: z.enum(['none', 'hung', 'hardware']).default('none'),
  uptimeDays: z.number().min(0),
  /** Processor and memory use without any hung service (servers). */
  baseCpu: z.number().min(0).max(100).default(0),
  memory: z.number().min(0).max(100).default(0),
  services: z.array(NodeServiceSchema).default([]),
  /** How many people depend on it (for the impact of taking it down). */
  users: z.number().int().min(0).default(0),
  role: Text(200).default(''),
})

// ---------------------------------------------------------------------------
// People (read from the directory feed) and addresses
// ---------------------------------------------------------------------------

export const AddressSchema = z.object({
  street: Text(120),
  city: Text(60),
  region: Text(40),
  postal: Text(20),
})

export const BUILDS = ['imaging', 'manual'] as const

export const PersonSchema = z.object({
  id: Name,
  name: Name,
  department: Text(60),
  title: Text(80).default(''),
  email: Text(120),
  /** Works from home (hardware goes by courier). */
  remote: z.boolean().default(false),
  /** The address HR has on file (it can be out of date). */
  addressOnFile: AddressSchema.nullable().default(null),
  /** Where they really are: what they say when asked. */
  address: AddressSchema.nullable().default(null),
  /** The build their role needs (see the deployment SOP). */
  build: z.enum(BUILDS).default('imaging'),
})

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------

export const InboxRuleSchema = z.object({
  id: Name,
  name: Text(80),
  condition: Text(160),
  action: Text(200),
  enabled: z.boolean().default(true),
  /** Forwards mail outside the company (the shape of a break-in rule). */
  forwardsOutside: z.boolean().default(false),
})

export const MailboxSchema = z.object({
  address: Name,
  person: Text(80),
  usedGb: z.number().min(0),
  quotaGb: z.number().positive(),
  archive: z.boolean().default(false),
  archivedGb: z.number().min(0).default(0),
  /** Older mail an online archive would move out of the mailbox. */
  oldMailGb: z.number().min(0).default(0),
  retention: Text(60).default('Default 2-year policy'),
  rules: z.array(InboxRuleSchema).default([]),
})

export const MESSAGE_STATUSES = ['delivered', 'quarantined', 'failed', 'pending'] as const
export const VERDICTS = ['clean', 'bulk', 'phishing', 'malware'] as const

export const MessageSchema = z.object({
  id: Name,
  /** When it arrived (UTC, as a trace shows it). */
  at: Text(30),
  /** How long ago, for the trace's time window. */
  hoursAgo: z.number().min(0),
  from: Name,
  to: Name,
  subject: Text(200),
  status: z.enum(MESSAGE_STATUSES),
  /** The SMTP status for failed or pending mail, e.g. "552 5.2.2 Mailbox full". */
  code: Text(80).default(''),
  /** The spam confidence level the filter gave it (0 to 9). */
  scl: z.number().int().min(0).max(9).default(1),
  /** What it really is (never shown: the player decides from what it looks like). */
  verdict: z.enum(VERDICTS).default('clean'),
  /** Released from quarantine by the service desk. */
  released: z.boolean().default(false),
})

export const BLOCK_REASONS = ['phishing', 'malware', 'bulk', 'manual'] as const

export const BlockedSenderSchema = z.object({
  address: Name,
  reason: z.enum(BLOCK_REASONS),
  note: Text(200).default(''),
  added: Text(30).default(''),
})

// ---------------------------------------------------------------------------
// Assets, licences and the shelf
// ---------------------------------------------------------------------------

export const ASSET_TYPES = [
  'desktop',
  'laptop',
  'monitor',
  'keyboard',
  'mouse',
  'headset',
  'dock',
  'printer',
  'kiosk',
  'phone',
] as const
export const ASSET_STATUSES = [
  'needs-registration',
  'ready',
  'deployed',
  'needs-image',
  'broken',
  'decommissioned',
  'lost',
] as const

/** The parts the Repair Bench works on (see repair.ts). */
export const COMPONENTS = ['battery', 'ram', 'ssd', 'fan'] as const

export const AssetSchema = z.object({
  tag: Name,
  type: z.enum(ASSET_TYPES),
  model: Text(80),
  hostname: Text(40).nullable().default(null),
  /** Who holds it (a person ID), or null. */
  assignedTo: Text(80).nullable().default(null),
  /** Shared equipment that belongs to a site rather than a person. */
  site: Text(80).nullable().default(null),
  status: z.enum(ASSET_STATUSES),
  /** The build a computer carries. */
  build: z.enum(BUILDS).nullable().default(null),
  /** Physically on the stockroom shelf. */
  onShelf: z.boolean().default(false),
  purchased: Text(10),
  warrantyEnd: Text(10),
  notes: Text(300).default(''),
  /** A failed part inside (a laptop for the Repair Bench), or null. */
  hwFault: z.enum(COMPONENTS).nullable().default(null),
})

/** A laptop on the Repair Bench. */
export const RepairJobSchema = z.object({
  tag: Name,
  /** Base screws taken out (by position). */
  screwsOut: z.array(z.number().int().min(0).max(7)).default([]),
  coverOff: z.boolean().default(false),
  batteryConnected: z.boolean().default(true),
  /** Parts taken out and not yet replaced. */
  removed: z.array(z.enum(COMPONENTS)).default([]),
  /** Test results, newest last. */
  results: z.array(Text(400)).default([]),
  /** A power-on test booted it since the case was last closed. */
  verified: z.boolean().default(false),
})

export const LicenceSchema = z.object({
  product: Name,
  seats: z.number().int().min(0),
  /** Person IDs holding a seat. */
  assigned: z.array(Text(80)).default([]),
  /** A role or group the product is for (who should have it). */
  forDepartments: z.array(Text(60)).default([]),
})

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------

export const SHIP_SPEEDS = ['standard', 'express', 'priority', 'rush'] as const
export const EQUIPMENT = [
  'computer',
  'charger',
  'usb-c-cable',
  'headset',
  'monitor',
  'keyboard-mouse',
  'dock',
] as const

export const ShipmentSchema = z.object({
  id: Name,
  /** The recipient (person ID). */
  to: Text(80),
  address: AddressSchema,
  items: z.array(z.enum(EQUIPMENT)).min(1),
  /** The computer sent (asset tag), if any. */
  unit: Text(40).nullable().default(null),
  speed: z.enum(SHIP_SPEEDS),
  returnLabel: z.boolean(),
  returnTo: z.enum(['it', 'warehouse']).nullable().default(null),
  /** The ticket it is booked against. */
  reference: Text(30).nullable().default(null),
  sentAt: z.number().nonnegative(),
  arrivesAt: z.number().nonnegative(),
  status: z.enum(['in-transit', 'delivered']),
})

/** An address a person confirmed when asked (the only safe source). */
export const ConfirmationSchema = z.object({
  person: Text(80),
  address: AddressSchema,
  time: Text(40).default(''),
})

// ---------------------------------------------------------------------------
// Computer deployment
// ---------------------------------------------------------------------------

export const DeploymentRunSchema = z.object({
  method: z.enum(BUILDS),
  /** The step reached (see deployment.ts). */
  step: z.number().int().min(0),
  device: z.enum(['desktop', 'laptop']).nullable().default(null),
  /** The asset tag on the unit being built. */
  unit: Text(40).nullable().default(null),
  /** Rebuilding a returned unit rather than a new one from stock. */
  reimage: z.boolean().default(false),
  /** Cable ID → port ID. */
  cables: z.record(z.string(), z.string()).default({}),
  /** Answers given so far (step data). */
  data: z.record(z.string(), z.string()).default({}),
  hints: z.boolean().default(true),
  hintsUsed: z.number().int().min(0).default(0),
  mistakes: z.number().int().min(0).default(0),
})

export const LogEntrySchema = z.object({
  seq: z.number().int().positive(),
  action: Text(60),
  target: Text(120),
  detail: Text(300).default(''),
  /** A risky or harmful action (counted against the work). */
  risk: z.boolean().default(false),
})

export const ItopsStateSchema = z.object({
  company: Text(80).default('Cobalt Ridge'),
  nodes: z.array(NodeSchema).max(60),
  /** The provider has been asked about an outage (and what it said). */
  ispChecked: z.boolean().default(false),
  ispOutage: z.boolean().default(false),
  people: z.array(PersonSchema).max(120),
  mailboxes: z.array(MailboxSchema).max(80),
  messages: z.array(MessageSchema).max(300),
  blocked: z.array(BlockedSenderSchema).max(100),
  assets: z.array(AssetSchema).max(600),
  licences: z.array(LicenceSchema).max(30),
  shipments: z.array(ShipmentSchema).max(60).default([]),
  confirmations: z.array(ConfirmationSchema).max(60).default([]),
  run: DeploymentRunSchema.nullable().default(null),
  repairs: z.array(RepairJobSchema).max(20).default([]),
  /** The next free asset number for a new unit from stock. */
  nextAsset: z.number().int().positive().default(1100),
  log: z.array(LogEntrySchema).max(500).default([]),
})

export type ItopsState = z.infer<typeof ItopsStateSchema>
export type Node = z.infer<typeof NodeSchema>
export type NodeService = z.infer<typeof NodeServiceSchema>
export type Person = z.infer<typeof PersonSchema>
export type Address = z.infer<typeof AddressSchema>
export type Mailbox = z.infer<typeof MailboxSchema>
export type InboxRule = z.infer<typeof InboxRuleSchema>
export type Message = z.infer<typeof MessageSchema>
export type BlockedSender = z.infer<typeof BlockedSenderSchema>
export type Asset = z.infer<typeof AssetSchema>
export type AssetStatus = (typeof ASSET_STATUSES)[number]
export type Licence = z.infer<typeof LicenceSchema>
export type Shipment = z.infer<typeof ShipmentSchema>
export type ShipSpeed = (typeof SHIP_SPEEDS)[number]
export type Equipment = (typeof EQUIPMENT)[number]
export type Build = (typeof BUILDS)[number]
export type DeploymentRun = z.infer<typeof DeploymentRunSchema>
export type RepairJob = z.infer<typeof RepairJobSchema>
export type Component = (typeof COMPONENTS)[number]
export type LogEntry = z.infer<typeof LogEntrySchema>
