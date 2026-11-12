/**
 * Communications actions (pure, logged): reading and writing in the chat,
 * listening to and handling voicemail, answering a call and choosing what to
 * say, and the assessment of how the player communicated.
 */
import type { Call, CommsState, Qualities, Voicemail } from './schema'

export type Result = { state: CommsState; problems: string[] }

function log(state: CommsState, action: string, target: string, detail = ''): CommsState {
  const seq = state.log.reduce((max, e) => Math.max(max, e.seq), 0) + 1
  return { ...state, log: [...state.log, { seq, action, target, detail }].slice(-2000) }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const unreadIn = (state: CommsState, channel: string) =>
  state.messages.filter((m) => m.channel === channel && !m.read && m.from !== 'you')
    .length

export function markRead(state: CommsState, channel: string): Result {
  if (unreadIn(state, channel) === 0) return { state, problems: [] }
  return {
    state: {
      ...state,
      messages: state.messages.map((m) =>
        m.channel === channel ? { ...m, read: true } : m,
      ),
    },
    problems: [],
  }
}

export function sendMessage(
  state: CommsState,
  channel: string,
  text: string,
  time = '',
  ticket = '',
): Result {
  const body = text.trim()
  if (!body) return { state, problems: ['Write a message first.'] }
  if (!state.channels.some((c) => c.id === channel))
    return { state, problems: ['That conversation does not exist.'] }
  const n = state.messages.length + 1
  const next: CommsState = {
    ...state,
    messages: [
      ...state.messages,
      {
        id: `m-you-${n}`,
        channel,
        from: 'you',
        name: 'You',
        time,
        text: body.slice(0, 2000),
        read: true,
        ticket,
      },
    ].slice(-1000),
  }
  return { state: log(next, 'Message', channel, body.slice(0, 120)), problems: [] }
}

// ---------------------------------------------------------------------------
// Voicemail
// ---------------------------------------------------------------------------

function changeVoicemail(
  state: CommsState,
  id: string,
  change: (v: Voicemail) => Voicemail | string,
  action: string,
  detail = '',
): Result {
  const v = state.voicemails.find((x) => x.id === id)
  if (!v) return { state, problems: ['That voicemail no longer exists.'] }
  const changed = change(v)
  if (typeof changed === 'string') return { state, problems: [changed] }
  return {
    state: log(
      { ...state, voicemails: state.voicemails.map((x) => (x.id === id ? changed : x)) },
      action,
      id,
      detail,
    ),
    problems: [],
  }
}

export const listen = (state: CommsState, id: string) => {
  const v = state.voicemails.find((x) => x.id === id)
  if (v?.listened) return { state, problems: [] }
  return changeVoicemail(state, id, (x) => ({ ...x, listened: true }), 'Listen')
}

/** Turns a voicemail into a new ticket (the engine adds it to the queue). */
export const ticketFromVoicemail = (state: CommsState, id: string) =>
  changeVoicemail(
    state,
    id,
    (v) => {
      if (!v.listened) return 'Listen to the voicemail first.'
      if (v.ticket) return `This voicemail is already with ${v.ticket}.`
      const template = v.opens ?? {
        id: `INC-VM-${v.id}`,
        subject: `Voicemail from ${v.name}`,
        body: v.transcript,
        conditions: [],
      }
      return { ...v, ticket: template.id, opens: template, handled: true }
    },
    'Create ticket',
  )

/** Links a voicemail to a ticket already in the queue (the same problem). */
export const linkVoicemail = (state: CommsState, id: string, ticket: string) =>
  changeVoicemail(
    state,
    id,
    (v) => {
      if (!v.listened) return 'Listen to the voicemail first.'
      if (!ticket) return 'Choose the ticket it belongs to.'
      if (v.ticket) return `This voicemail is already with ${v.ticket}.`
      return { ...v, ticket, handled: true }
    },
    'Link to ticket',
    ticket,
  )

export const markHandled = (state: CommsState, id: string) =>
  changeVoicemail(
    state,
    id,
    (v) => (v.listened ? { ...v, handled: true } : 'Listen to the voicemail first.'),
    'Mark handled',
  )

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

function changeCall(
  state: CommsState,
  id: string,
  change: (c: Call) => Call | string,
  action: string,
  detail = '',
): Result {
  const c = state.calls.find((x) => x.id === id)
  if (!c) return { state, problems: ['That call is not there.'] }
  const changed = change(c)
  if (typeof changed === 'string') return { state, problems: [changed] }
  return {
    state: log(
      { ...state, calls: state.calls.map((x) => (x.id === id ? changed : x)) },
      action,
      id,
      detail,
    ),
    problems: [],
  }
}

export const nodeOf = (call: Call, id = call.at) => call.nodes.find((n) => n.id === id)

export const answerCall = (state: CommsState, id: string) =>
  changeCall(
    state,
    id,
    (c) => {
      if (c.state !== 'ringing') return 'This call has already been answered.'
      const first = c.nodes[0]
      return {
        ...c,
        state: 'in-progress',
        at: first.id,
        transcript: [{ who: 'caller', text: first.says }],
      }
    },
    'Answer call',
  )

/** The player says one of the options; the caller answers (the next node). */
export const sayInCall = (state: CommsState, id: string, option: number) =>
  changeCall(
    state,
    id,
    (c) => {
      if (c.state !== 'in-progress') return 'The call is not in progress.'
      const node = nodeOf(c)
      const choice = node?.options[option]
      if (!node || !choice) return 'That is not something you can say now.'
      const next = nodeOf(c, choice.next)
      const transcript = [
        ...c.transcript,
        { who: 'you' as const, text: choice.text },
        ...(next ? [{ who: 'caller' as const, text: next.says }] : []),
      ].slice(-60)
      const ended = !next || next.options.length === 0
      return {
        ...c,
        at: next?.id ?? c.at,
        transcript,
        choices: [...c.choices, { node: node.id, option }],
        state: ended ? 'ended' : 'in-progress',
      }
    },
    'Say',
  )

export const setCallNotes = (state: CommsState, id: string, notes: string) => {
  const c = state.calls.find((x) => x.id === id)
  if (!c || c.notes === notes) return { state, problems: [] }
  return {
    state: {
      ...state,
      calls: state.calls.map((x) => (x.id === id ? { ...x, notes } : x)),
    },
    problems: [],
  }
}

export const ticketFromCall = (state: CommsState, id: string) =>
  changeCall(
    state,
    id,
    (c) => {
      if (c.state === 'ringing') return 'Answer the call first.'
      if (c.ticket) return `This call is already with ${c.ticket}.`
      const template = c.opens ?? {
        id: `INC-CALL-${c.id}`,
        subject: `Call from ${c.name}`,
        body: c.transcript
          .filter((t) => t.who === 'caller')
          .map((t) => t.text)
          .join(' '),
        conditions: [],
      }
      const body = c.notes.trim()
        ? `${template.body}\n\nCall notes: ${c.notes.trim()}`
        : template.body
      return {
        ...c,
        ticket: template.id,
        opens: { ...template, body: body.slice(0, 2000) },
      }
    },
    'Create ticket',
  )

export const linkCall = (state: CommsState, id: string, ticket: string) =>
  changeCall(
    state,
    id,
    (c) => {
      if (c.state === 'ringing') return 'Answer the call first.'
      if (!ticket) return 'Choose the ticket it belongs to.'
      if (c.ticket) return `This call is already with ${c.ticket}.`
      return { ...c, ticket }
    },
    'Link to ticket',
    ticket,
  )

// ---------------------------------------------------------------------------
// The communication assessment
// ---------------------------------------------------------------------------

export const DIMENSIONS = [
  { id: 'tone', name: 'Professional tone' },
  { id: 'questions', name: 'Asking the right questions' },
  { id: 'clarity', name: 'Explaining clearly' },
  { id: 'jargon', name: 'Plain words, no jargon' },
  { id: 'empathy', name: 'Handling frustration' },
  { id: 'updates', name: 'Saying what happens next' },
  { id: 'closing', name: 'Closing the call well' },
] as const satisfies ReadonlyArray<{ id: keyof Qualities; name: string }>

export interface Assessment {
  /** 0–100 over the dimensions the call tested. */
  score: number
  dimensions: Array<{ id: keyof Qualities; name: string; score: number; tested: boolean }>
  /** What went well and what to improve, from the notes of the choices made. */
  strengths: string[]
  improvements: string[]
}

/**
 * How the player communicated in a call, from their choices. Each dimension
 * a call can test is scored from the best and worst it allowed, so a call
 * that never tests closing does not count it.
 */
export function assessCall(call: Call): Assessment {
  const chosen = call.choices
    .map((c) => nodeOf(call, c.node)?.options[c.option])
    .filter((o) => o !== undefined)
  const dimensions = DIMENSIONS.map((d) => {
    const possible = call.nodes.some((n) =>
      n.options.some((o) => o.qualities[d.id] !== 0),
    )
    const positives = chosen.filter((o) => o.qualities[d.id] > 0).length
    const negatives = chosen.filter((o) => o.qualities[d.id] < 0).length
    // The share of the player's choices on this dimension that landed well;
    // half marks if the call tested it but none of their choices touched it.
    const score = !possible
      ? 1
      : positives + negatives === 0
        ? 0.5
        : positives / (positives + negatives)
    return { id: d.id, name: d.name, score, tested: possible }
  })
  const tested = dimensions.filter((d) => d.tested)
  const score = tested.length
    ? Math.round((tested.reduce((sum, d) => sum + d.score, 0) / tested.length) * 100)
    : 0
  const good = chosen.filter(
    (o) => Object.values(o.qualities).some((v) => v > 0) && o.note,
  )
  const bad = chosen.filter(
    (o) => Object.values(o.qualities).some((v) => v < 0) && o.note,
  )
  return {
    score: call.state === 'ended' ? score : 0,
    dimensions,
    strengths: good.map((o) => o.note),
    improvements: bad.map((o) => o.note),
  }
}
