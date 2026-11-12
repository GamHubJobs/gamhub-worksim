/** Communications (chat, voicemail, support calls): its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { assessCall } from './model'
import { CommsStateSchema, type CommsState } from './schema'

/** Where a voicemail or call should end up: a new ticket, or a ticket already open. */
const Routing = z.union([z.literal('new'), z.string().min(1)])

export const CommsCheckSchema = z.discriminatedUnion('type', [
  /** A call handled well: its communication assessment (0–100) reaches `minScore`. */
  FileCheckBaseSchema.extend({
    type: z.literal('call'),
    call: z.string(),
    minScore: z.number().int().min(0).max(100).default(80),
  }),
  /** A voicemail or call went to the right ticket: a new one, or the one it is about. */
  FileCheckBaseSchema.extend({
    type: z.literal('routed'),
    item: z.string(),
    expect: Routing,
  }),
  /** The player wrote in a conversation, saying the right things. */
  FileCheckBaseSchema.extend({
    type: z.literal('chat'),
    channel: z.string(),
    mentions: z.array(z.array(z.string().min(1)).min(1)).default([]),
    minWords: z.number().int().nonnegative().default(10),
  }),
])
export type CommsCheck = z.infer<typeof CommsCheckSchema>

const words = (text: string) => text.split(/\s+/).filter(Boolean).length

function gradeCheck(check: CommsCheck, player: CommsState) {
  switch (check.type) {
    case 'call': {
      const call = player.calls.find((c) => c.id === check.call)
      if (!call || call.state !== 'ended')
        return checkResult(check, 0, [
          `The call from ${call?.name ?? check.call} was not completed.`,
        ])
      const assessment = assessCall(call)
      return checkResult(
        check,
        Math.min(1, assessment.score / check.minScore),
        assessment.score >= check.minScore
          ? []
          : [
              `Communication ${assessment.score}%: ${assessment.improvements[0] ?? 'see the call assessment.'}`,
            ],
      )
    }
    case 'routed': {
      const item =
        player.voicemails.find((v) => v.id === check.item) ??
        player.calls.find((c) => c.id === check.item)
      if (!item) return checkResult(check, 0, [`${check.item} is not there.`])
      if (!item.ticket)
        return checkResult(check, 0, [
          `${check.item} was not turned into or linked to a ticket.`,
        ])
      const created = item.opens?.id === item.ticket
      const ok = check.expect === 'new' ? created : item.ticket === check.expect
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [
              check.expect === 'new'
                ? `${check.item} is a new problem: it needed its own ticket, not ${item.ticket}.`
                : `${check.item} is about ${check.expect}: link it there rather than ${created ? 'opening a duplicate' : `to ${item.ticket}`}.`,
            ],
      )
    }
    case 'chat': {
      const mine = player.messages.filter(
        (m) => m.channel === check.channel && m.from === 'you',
      )
      if (mine.length === 0)
        return checkResult(check, 0, ['No message from you in that conversation.'])
      const text = mine.map((m) => m.text).join(' ')
      const lower = text.toLowerCase()
      const missing = check.mentions.filter(
        (alts) => !alts.some((a) => lower.includes(a.toLowerCase())),
      )
      const enough = words(text) >= check.minWords
      const parts = check.mentions.length + 1
      return checkResult(
        check,
        (check.mentions.length - missing.length + (enough ? 1 : 0)) / parts,
        [
          ...missing.map((alts) => `Your message does not mention ${alts[0]}.`),
          ...(enough ? [] : ['Your message is very short: say a little more.']),
        ],
      )
    }
  }
}

export const comms: ToolDefinition<CommsState, CommsCheck> = {
  id: 'comms',
  name: 'Communications',
  category: 'Chat, voicemail and support calls',
  icon: 'chat',
  sections: [
    { id: 'chat', name: 'Chat', description: 'Company channels and direct messages.' },
    {
      id: 'voicemail',
      name: 'Voicemail',
      description: 'Messages left for the service desk.',
    },
    { id: 'calls', name: 'Calls', description: 'Support calls, with notes and tickets.' },
  ],
  state: CommsStateSchema,
  practice: () => ({
    channels: [
      {
        id: 'it',
        name: '#it-support',
        kind: 'channel',
        person: '',
        description: 'The service desk',
      },
    ],
    messages: [],
    voicemails: [],
    calls: [],
    log: [],
  }),
  summary: (state) =>
    `${state.messages.filter((m) => m.from === 'you').length} messages sent, ${state.voicemails.filter((v) => v.handled).length} voicemails handled, ${state.calls.filter((c) => c.state === 'ended').length} calls`,
  check: CommsCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The communications were not handed in.']),
    ),
  guide: {
    intro:
      'Support work is mostly communication: understanding what is wrong, keeping people informed, and calming them when they are stuck. Chat, voicemail and calls all end up in the ticket queue.',
    topics: [
      {
        title: 'Voicemail',
        body: 'Listen to the whole message. If it is a problem already in the queue, link it to that ticket; if it is new, create a ticket. Then the caller is not forgotten, and nothing is logged twice.',
      },
      {
        title: 'Calls',
        body: 'Greet, listen, and ask questions before suggesting fixes. Use plain words. Acknowledge frustration without arguing. Say what happens next and when, and close politely. Keep notes as you go.',
      },
      {
        title: 'Chat',
        body: 'Answer in the channel where people ask, so everyone sees it. For an outage, say what is affected, that you are on it, and when you will update them.',
      },
    ],
    glossary: [
      {
        term: 'First-contact resolution',
        meaning: 'Solving the problem in the first conversation.',
      },
      { term: 'Jargon', meaning: 'Technical words the person may not know.' },
    ],
  },
}
