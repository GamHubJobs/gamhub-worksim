/**
 * Communications: the company chat, the service desk's voicemail, and
 * support calls. Every button runs an action in model.ts. Spoken audio uses
 * the browser's own speech (no service, no microphone); the transcript is
 * always there, so everything works without sound.
 */
import { useState } from 'react'
import { Icon, type IconName } from '../../ui/Icon'
import type { ToolWorkspaceProps } from '../ui'
import {
  answerCall,
  assessCall,
  linkCall,
  linkVoicemail,
  listen,
  markHandled,
  markRead,
  nodeOf,
  sayInCall,
  sendMessage,
  setCallNotes,
  ticketFromCall,
  ticketFromVoicemail,
  unreadIn,
  type Result,
} from './model'
import type { Call, CommsState } from './schema'

type Props = ToolWorkspaceProps<CommsState>
type Act = (fn: (s: CommsState) => Result) => boolean

const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40'

/** Reads text aloud with the browser's own speech, if it has any. */
function speak(text: string) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return false
    synth.cancel()
    synth.speak(new SpeechSynthesisUtterance(text))
    return true
  } catch {
    return false
  }
}

const PRESENCE = {
  available: { label: 'Available', dot: 'bg-emerald-500' },
  busy: { label: 'In a meeting', dot: 'bg-amber-500' },
  away: { label: 'Away', dot: 'bg-slate-400' },
} as const

export default function CommsWorkspace({
  state,
  readOnly,
  onUpdate,
  initialSection,
  tickets = [],
  presence,
  officeTime,
}: Props) {
  const [section, setSection] = useState<'chat' | 'voicemail' | 'calls'>(
    initialSection === 'voicemail' || initialSection === 'calls'
      ? initialSection
      : 'chat',
  )
  const [problems, setProblems] = useState<string[]>([])
  const editable = !readOnly && !!onUpdate
  const act: Act = (fn) => {
    if (!editable) return false
    const result = fn(state)
    setProblems(result.problems)
    if (result.problems.length) return false
    if (result.state !== state) onUpdate?.((s) => fn(s).state)
    return true
  }
  const unreadChat = state.channels.reduce((n, c) => n + unreadIn(state, c.id), 0)
  const newVoicemail = state.voicemails.filter((v) => !v.handled).length
  const ringing = state.calls.filter((c) => c.state !== 'ended').length
  const tabs: Array<[typeof section, string, IconName, number]> = [
    ['chat', 'Chat', 'chat', unreadChat],
    ['voicemail', 'Voicemail', 'voicemail', newVoicemail],
    ['calls', 'Calls', 'phone', ringing],
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50" data-testid="comms">
      <div
        className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-4 py-1.5"
        role="tablist"
        aria-label="Communications sections"
      >
        {tabs.map(([id, label, icon, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => {
              setSection(id)
              setProblems([])
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm ${
              section === id
                ? 'bg-teal-50 font-medium text-teal-900'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon name={icon} className="h-4 w-4" />
            {label}
            {count > 0 && (
              <span
                aria-hidden
                className="rounded-full bg-teal-700 px-1.5 text-xs text-white"
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
      {problems.length > 0 && (
        <p
          role="alert"
          className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
          data-testid="comms-problem"
        >
          {problems.join(' ')}
        </p>
      )}
      <div className="min-h-0 flex-1">
        {section === 'chat' && (
          <Chat
            state={state}
            act={act}
            editable={editable}
            presence={presence}
            officeTime={officeTime}
          />
        )}
        {section === 'voicemail' && (
          <Voicemails state={state} act={act} editable={editable} tickets={tickets} />
        )}
        {section === 'calls' && (
          <Calls state={state} act={act} editable={editable} tickets={tickets} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

function Chat({
  state,
  act,
  editable,
  presence,
  officeTime,
}: {
  state: CommsState
  act: Act
  editable: boolean
  presence?: Props['presence']
  officeTime?: Props['officeTime']
}) {
  const [channel, setChannel] = useState(state.channels[0]?.id ?? '')
  const [draft, setDraft] = useState('')
  const current = state.channels.find((c) => c.id === channel)
  const messages = state.messages.filter((m) => m.channel === channel)
  const open = (id: string) => {
    setChannel(id)
    act((s) => markRead(s, id))
  }
  return (
    <div className="flex h-full min-h-0">
      <nav
        className="w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-2"
        aria-label="Conversations"
      >
        {(['channel', 'direct'] as const).map((kind) => (
          <div key={kind} className="mb-3">
            <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {kind === 'channel' ? 'Channels' : 'Direct messages'}
            </p>
            {state.channels
              .filter((c) => c.kind === kind)
              .map((c) => {
                const unread = unreadIn(state, c.id)
                const status = c.person ? presence?.(c.person) : undefined
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => open(c.id)}
                    aria-current={channel === c.id ? 'true' : undefined}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                      channel === c.id
                        ? 'bg-teal-50 text-teal-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    } ${unread ? 'font-semibold' : ''}`}
                    data-testid="conversation"
                  >
                    {status ? (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${PRESENCE[status].dot}`}
                        title={PRESENCE[status].label}
                      />
                    ) : (
                      <span className="w-2 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {unread > 0 && (
                      <span
                        className="rounded-full bg-teal-700 px-1.5 text-xs text-white"
                        aria-label={`${unread} unread`}
                      >
                        {unread}
                      </span>
                    )}
                  </button>
                )
              })}
          </div>
        ))}
      </nav>
      <section
        className="flex min-w-0 flex-1 flex-col"
        aria-label={current?.name ?? 'Conversation'}
      >
        {current && (
          <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
            <p className="font-semibold text-slate-900">{current.name}</p>
            <p className="text-xs text-slate-500">
              {current.person && presence
                ? PRESENCE[presence(current.person)].label
                : current.description}
            </p>
          </header>
        )}
        <ol
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
          aria-label="Messages"
          data-testid="messages"
        >
          {messages.length === 0 && (
            <li className="text-sm text-slate-500">No messages yet.</li>
          )}
          {messages.map((m) => (
            <li
              key={m.id}
              className={`flex gap-2 ${m.from === 'you' ? 'flex-row-reverse text-right' : ''}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {m.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)}
              </span>
              <span
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.from === 'you' ? 'bg-teal-700 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}
              >
                <span
                  className={`block text-xs ${m.from === 'you' ? 'text-teal-100' : 'text-slate-500'}`}
                >
                  {m.name}
                  {m.time && ` · ${m.time}`}
                  {m.ticket && ` · ${m.ticket}`}
                </span>
                {m.text}
              </span>
            </li>
          ))}
        </ol>
        {editable && current && (
          <form
            className="flex shrink-0 gap-2 border-t border-slate-200 bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (act((s) => sendMessage(s, current.id, draft, officeTime?.() ?? '')))
                setDraft('')
            }}
          >
            <input
              aria-label={`Message ${current.name}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${current.name}`}
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button type="submit" className={PRIMARY}>
              Send
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Voicemail
// ---------------------------------------------------------------------------

function TicketPicker({
  tickets,
  onLink,
  label,
}: {
  tickets: NonNullable<Props['tickets']>
  onLink: (id: string) => void
  label: string
}) {
  const [choice, setChoice] = useState('')
  return (
    <span className="flex gap-1.5">
      <select
        aria-label={label}
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm"
      >
        <option value="">Link to an open ticket…</option>
        {tickets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.id}: {t.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={BUTTON}
        disabled={!choice}
        onClick={() => onLink(choice)}
      >
        Link
      </button>
    </span>
  )
}

function Voicemails({
  state,
  act,
  editable,
  tickets,
}: {
  state: CommsState
  act: Act
  editable: boolean
  tickets: NonNullable<Props['tickets']>
}) {
  const [open, setOpen] = useState<string | null>(state.voicemails[0]?.id ?? null)
  return (
    <div
      className="mx-auto max-w-4xl space-y-2 overflow-y-auto p-5"
      data-testid="voicemails"
    >
      <h2 className="text-lg font-semibold text-slate-900">Voicemail</h2>
      {state.voicemails.length === 0 && (
        <p className="text-sm text-slate-500">No voicemail.</p>
      )}
      {state.voicemails.map((v) => (
        <article
          key={v.id}
          className={`rounded-lg border bg-white ${v.handled ? 'border-slate-200' : 'border-teal-300'}`}
          data-testid="voicemail"
        >
          <button
            type="button"
            onClick={() => setOpen(open === v.id ? null : v.id)}
            aria-expanded={open === v.id}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
          >
            <Icon name="voicemail" className="h-5 w-5 text-teal-700" />
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm ${v.handled ? 'text-slate-700' : 'font-semibold text-slate-900'}`}
              >
                {v.name} · {v.department}
              </span>
              <span className="text-xs text-slate-500">
                {v.received} · {v.seconds} s{v.extension && ` · ext ${v.extension}`}
              </span>
            </span>
            {v.ticket ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                {v.ticket}
              </span>
            ) : v.handled ? (
              <span className="text-xs text-slate-500">Handled</span>
            ) : (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900">
                New
              </span>
            )}
          </button>
          {open === v.id && (
            <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm">
              {v.listened ? (
                <blockquote
                  className="rounded-md bg-slate-50 p-3 text-slate-800"
                  data-testid="transcript"
                >
                  “{v.transcript}”
                </blockquote>
              ) : (
                <p className="text-slate-600">
                  Listen to the message to see its transcript.
                </p>
              )}
              {editable && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={PRIMARY}
                    onClick={() => {
                      act((s) => listen(s, v.id))
                      speak(v.transcript)
                    }}
                  >
                    {v.listened ? 'Play again' : 'Listen'}
                  </button>
                  {!v.ticket && (
                    <>
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() => act((s) => ticketFromVoicemail(s, v.id))}
                      >
                        Create ticket
                      </button>
                      <TicketPicker
                        tickets={tickets.filter((t) => t.open)}
                        label={`Link ${v.name}’s voicemail to a ticket`}
                        onLink={(id) => act((s) => linkVoicemail(s, v.id, id))}
                      />
                      {!v.handled && (
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() => act((s) => markHandled(s, v.id))}
                        >
                          Mark handled
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

function Calls({
  state,
  act,
  editable,
  tickets,
}: {
  state: CommsState
  act: Act
  editable: boolean
  tickets: NonNullable<Props['tickets']>
}) {
  const [open, setOpen] = useState<string | null>(
    state.calls.find((c) => c.state === 'in-progress')?.id ?? state.calls[0]?.id ?? null,
  )
  const call = state.calls.find((c) => c.id === open)
  return (
    <div className="flex h-full min-h-0">
      <nav
        className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-2"
        aria-label="Calls"
      >
        {state.calls.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpen(c.id)}
            aria-current={open === c.id ? 'true' : undefined}
            className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${open === c.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
            data-testid="call-row"
          >
            <Icon
              name="phone"
              className={`h-4 w-4 ${c.state === 'ringing' ? 'text-red-600' : 'text-slate-500'}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-900">{c.name}</span>
              <span className="text-xs text-slate-500">
                {c.received} ·{' '}
                {c.state === 'ringing'
                  ? 'Incoming'
                  : c.state === 'in-progress'
                    ? 'On the line'
                    : 'Ended'}
              </span>
            </span>
          </button>
        ))}
      </nav>
      <section className="min-w-0 flex-1 overflow-y-auto p-5">
        {call ? (
          <CallView
            key={call.id}
            call={call}
            act={act}
            editable={editable}
            tickets={tickets}
          />
        ) : (
          <p className="text-sm text-slate-500">No calls.</p>
        )}
      </section>
    </div>
  )
}

function CallView({
  call,
  act,
  editable,
  tickets,
}: {
  call: Call
  act: Act
  editable: boolean
  tickets: NonNullable<Props['tickets']>
}) {
  const [aloud, setAloud] = useState(false)
  const [notes, setNotes] = useState(call.notes)
  const node = nodeOf(call)
  const assessment = call.state === 'ended' ? assessCall(call) : null
  return (
    <div className="mx-auto max-w-3xl space-y-4" data-testid="call">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{call.name}</h2>
          <p className="text-sm text-slate-600">
            {call.department}
            {call.extension && ` · ext ${call.extension}`} · {call.received}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={aloud}
            onChange={(e) => setAloud(e.target.checked)}
          />
          Read the caller aloud
        </label>
      </header>

      {call.state === 'ringing' ? (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 font-medium text-red-900">
            <Icon name="phone" className="h-5 w-5" /> Incoming call from {call.name}
          </p>
          {editable && (
            <button
              type="button"
              className={PRIMARY}
              onClick={() => {
                if (act((s) => answerCall(s, call.id)) && aloud) speak(call.nodes[0].says)
              }}
            >
              Answer
            </button>
          )}
        </div>
      ) : (
        <ol className="space-y-2" aria-label="Conversation" data-testid="call-transcript">
          {call.transcript.map((line, i) => (
            <li key={i} className={`flex ${line.who === 'you' ? 'justify-end' : ''}`}>
              <span
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${line.who === 'you' ? 'bg-teal-700 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}
              >
                <span
                  className={`block text-xs ${line.who === 'you' ? 'text-teal-100' : 'text-slate-500'}`}
                >
                  {line.who === 'you' ? 'You' : call.name}
                </span>
                {line.text}
              </span>
            </li>
          ))}
        </ol>
      )}

      {call.state === 'in-progress' && node && editable && (
        <div className="space-y-1.5" aria-label="What you say" role="group">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            What do you say?
          </p>
          {node.options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (act((s) => sayInCall(s, call.id, i)) && aloud) {
                  const next = nodeOf(call, o.next)
                  if (next) speak(next.says)
                }
              }}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm hover:border-teal-500 hover:bg-teal-50"
              data-testid="call-option"
            >
              {o.text}
            </button>
          ))}
        </div>
      )}

      {call.state !== 'ringing' && (
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Call notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => act((s) => setCallNotes(s, call.id, notes))}
            readOnly={!editable}
            rows={3}
            placeholder="What they reported, what you checked, what was agreed"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      )}

      {call.state !== 'ringing' && editable && !call.ticket && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              // The notes go into the new ticket.
              act((s) => ticketFromCall(setCallNotes(s, call.id, notes).state, call.id))
            }}
          >
            Create ticket from call
          </button>
          <TicketPicker
            tickets={tickets.filter((t) => t.open)}
            label={`Link ${call.name}’s call to a ticket`}
            onLink={(id) => act((s) => linkCall(s, call.id, id))}
          />
        </div>
      )}
      {call.ticket && (
        <p className="text-sm text-emerald-800">Recorded in {call.ticket}.</p>
      )}

      {assessment && (
        <section
          className="rounded-lg border border-slate-200 bg-white p-4"
          data-testid="call-assessment"
        >
          <h3 className="flex items-center justify-between font-semibold text-slate-900">
            How you communicated
            <span
              className={`text-lg ${assessment.score >= 80 ? 'text-emerald-700' : assessment.score >= 60 ? 'text-amber-700' : 'text-red-700'}`}
            >
              {assessment.score}%
            </span>
          </h3>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {assessment.dimensions
              .filter((d) => d.tested)
              .map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-slate-700">{d.name}</span>
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                    <span
                      className={`block h-full ${d.score >= 0.75 ? 'bg-emerald-500' : d.score >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.round(d.score * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
          </ul>
          {assessment.strengths.length > 0 && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-emerald-800">Went well</p>
              <ul className="list-disc pl-5 text-slate-700">
                {assessment.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {assessment.improvements.length > 0 && (
            <div className="mt-2 text-sm">
              <p className="font-medium text-red-800">To improve</p>
              <ul className="list-disc pl-5 text-slate-700">
                {assessment.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
