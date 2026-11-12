/**
 * Communications: the company chat, the service desk's voicemail and its
 * support calls. Everything is scenario data and the player's actions on it
 * (no randomness): what people write, leave and say is written in the
 * scenario, and messages that follow events (a ticket fixed, a ticket broken
 * again) are added by the ticket engine (game/incidents.ts).
 */
import { z } from 'zod'

const Id = z.string().min(1).max(40)

/** A ticket a voicemail or call can open (scenario data). */
export const TicketTemplateSchema = z.object({
  id: z.string().min(1).max(30),
  subject: z.string().max(200),
  body: z.string().max(2000),
  /** The colleague it is about (office person ID). */
  requester: z.string().max(40).optional(),
  /**
   * What must be true in the systems for it to be fixed (ticket conditions,
   * validated when the ticket is created: see game/incidents.ts).
   */
  conditions: z.array(z.record(z.string(), z.unknown())).max(8).default([]),
})

export const MessageSchema = z.object({
  id: Id,
  channel: Id,
  /** An office person ID, or "you". */
  from: z.string().max(40),
  /** The name shown (people outside the office cast too). */
  name: z.string().max(100),
  time: z.string().max(40).default(''),
  text: z.string().max(2000),
  read: z.boolean().default(false),
  /** The ticket it is about, if any. */
  ticket: z.string().max(30).default(''),
})

export const ChannelSchema = z.object({
  id: Id,
  name: z.string().max(60),
  kind: z.enum(['channel', 'direct']),
  /** For a direct conversation: the person (office ID). */
  person: z.string().max(40).default(''),
  description: z.string().max(200).default(''),
})

export const VoicemailSchema = z.object({
  id: Id,
  from: z.string().max(40),
  name: z.string().max(100),
  department: z.string().max(60),
  extension: z.string().max(20).default(''),
  received: z.string().max(20),
  seconds: z.number().int().positive(),
  transcript: z.string().max(2000),
  listened: z.boolean().default(false),
  handled: z.boolean().default(false),
  /** The ticket it was turned into or linked to. */
  ticket: z.string().max(30).default(''),
  /** The ticket it should open, if it is a new problem (scenario data). */
  opens: TicketTemplateSchema.optional(),
})

/** How a choice in a call comes across (each one -1, 0 or +1). */
export const QualitiesSchema = z.object({
  tone: z.number().int().min(-1).max(1).default(0),
  questions: z.number().int().min(-1).max(1).default(0),
  clarity: z.number().int().min(-1).max(1).default(0),
  jargon: z.number().int().min(-1).max(1).default(0),
  empathy: z.number().int().min(-1).max(1).default(0),
  updates: z.number().int().min(-1).max(1).default(0),
  closing: z.number().int().min(-1).max(1).default(0),
})

export const CallNodeSchema = z.object({
  id: Id,
  /** What the caller says. */
  says: z.string().max(1000),
  /** The player's possible replies; none: the call ends. */
  options: z
    .array(
      z.object({
        text: z.string().max(400),
        next: z.string().max(40),
        qualities: QualitiesSchema.prefault({}),
        /** Why it lands well or badly (shown in the assessment). */
        note: z.string().max(300).default(''),
      }),
    )
    .max(5)
    .default([]),
})

export const CallSchema = z.object({
  id: Id,
  from: z.string().max(40),
  name: z.string().max(100),
  department: z.string().max(60),
  extension: z.string().max(20).default(''),
  received: z.string().max(20),
  state: z.enum(['ringing', 'in-progress', 'ended']).default('ringing'),
  nodes: z.array(CallNodeSchema).min(1).max(30),
  /** Where the call is now (a node ID). */
  at: z.string().max(40).default(''),
  /** What was said, in order. */
  transcript: z
    .array(z.object({ who: z.enum(['caller', 'you']), text: z.string().max(1000) }))
    .max(60)
    .default([]),
  /** The player's choices (node and option index), for the assessment. */
  choices: z
    .array(z.object({ node: Id, option: z.number().int().min(0) }))
    .max(40)
    .default([]),
  notes: z.string().max(3000).default(''),
  ticket: z.string().max(30).default(''),
  opens: TicketTemplateSchema.optional(),
})

export const CommsStateSchema = z.object({
  channels: z.array(ChannelSchema).max(40),
  messages: z.array(MessageSchema).max(1000).default([]),
  voicemails: z.array(VoicemailSchema).max(40).default([]),
  calls: z.array(CallSchema).max(20).default([]),
  /** Order of things done (for the history and the grading). */
  log: z
    .array(
      z.object({
        seq: z.number().int().positive(),
        action: z.string().max(60),
        target: z.string().max(60),
        detail: z.string().max(300).default(''),
      }),
    )
    .max(2000)
    .default([]),
})

export type Message = z.infer<typeof MessageSchema>
export type Channel = z.infer<typeof ChannelSchema>
export type Voicemail = z.infer<typeof VoicemailSchema>
export type Call = z.infer<typeof CallSchema>
export type CallNode = z.infer<typeof CallNodeSchema>
export type Qualities = z.infer<typeof QualitiesSchema>
export type CommsState = z.infer<typeof CommsStateSchema>
/** Scenario data before defaults are filled in. */
export type CommsInput = z.input<typeof CommsStateSchema>
export type TicketTemplate = z.infer<typeof TicketTemplateSchema>
