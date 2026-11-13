/** Social Planner: the week's calendar and the post composer. */
import { useState } from 'react'
import type { ToolWorkspaceProps } from '../ui'
import { social } from './definition'
import {
  addPost,
  atBestTime,
  channelOf,
  deletePost,
  postProblems,
  schedulePost,
  unschedulePost,
  updatePost,
  weekDays,
} from './model'
import type { Post, SocialState } from './schema'

type Props = ToolWorkspaceProps<SocialState>
type Update = (change: (s: SocialState) => SocialState) => void

const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50'

const dayName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

export default function SocialWorkspace({ state, readOnly, onUpdate }: Props) {
  const [section, setSection] = useState('posts')
  const [selected, setSelected] = useState<string | null>(null)
  const editable = !readOnly && !!onUpdate
  const update: Update = (change) => onUpdate?.(change)
  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="social">
      <nav
        aria-label="Social Planner sections"
        className="w-48 shrink-0 space-y-0.5 border-r border-slate-200 bg-white p-2"
      >
        {social.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            aria-current={section === s.id ? 'page' : undefined}
            className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm ${section === s.id ? 'bg-indigo-50 font-medium text-indigo-900' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {s.name}
          </button>
        ))}
        <div className="mt-4 space-y-2 border-t border-slate-100 px-2 pt-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700 uppercase">Best times</p>
          {state.channels.map((c) => (
            <p key={c.id}>
              {c.name}: {String(c.bestHours[0]).padStart(2, '0')}:00–
              {String(c.bestHours[1]).padStart(2, '0')}:00
            </p>
          ))}
        </div>
      </nav>
      <div
        className="min-w-0 flex-1 overflow-y-auto p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
        // Scrollable, so it can be reached and scrolled with the keyboard.
        tabIndex={0}
        role="region"
        aria-label="Work area"
      >
        {state.blackouts.map((b) => (
          <p
            key={b.start}
            className="mb-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900"
          >
            Blackout {b.start.replace('T', ' ')}–{b.end.slice(11)}: {b.reason}.
          </p>
        ))}
        {section === 'calendar' ? (
          <Calendar
            state={state}
            onOpen={(id) => {
              setSelected(id)
              setSection('posts')
            }}
          />
        ) : (
          <Posts
            state={state}
            editable={editable}
            update={update}
            selected={selected}
            onSelect={setSelected}
          />
        )}
      </div>
    </div>
  )
}

function Calendar({
  state,
  onOpen,
}: {
  state: SocialState
  onOpen: (id: string) => void
}) {
  const days = weekDays(state)
  return (
    <div data-testid="social-calendar">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Week of {dayName(state.weekStart)}
      </h2>
      <div className="grid grid-cols-5 gap-2">
        {days.map((day) => (
          <div
            key={day}
            className="min-h-48 rounded-lg border border-slate-200 bg-white p-2"
          >
            <p className="mb-2 text-sm font-semibold text-slate-800">{dayName(day)}</p>
            {state.posts
              .filter((p) => p.status === 'scheduled' && p.scheduledAt.startsWith(day))
              .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpen(p.id)}
                  className="mb-1 block w-full rounded bg-indigo-50 p-1.5 text-left text-xs hover:bg-indigo-100"
                >
                  <span className="font-semibold">
                    {p.scheduledAt.slice(11)} {channelOf(state, p)?.name}
                  </span>
                  <span className="line-clamp-2 block text-slate-600">{p.text}</span>
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Posts({
  state,
  editable,
  update,
  selected,
  onSelect,
}: {
  state: SocialState
  editable: boolean
  update: Update
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const post = state.posts.find((p) => p.id === selected) ?? null
  return (
    <div className="flex gap-4">
      <div className="w-72 shrink-0">
        {editable && (
          <div className="mb-3 flex flex-wrap gap-1">
            {state.channels.map((c) => (
              <button
                key={c.id}
                type="button"
                className={BUTTON}
                onClick={() => {
                  let id = ''
                  update((s) => {
                    const added = addPost(s, c.id)
                    id = added.id
                    return added.state
                  })
                  onSelect(id)
                }}
              >
                New {c.name} post
              </button>
            ))}
          </div>
        )}
        <ul className="space-y-1">
          {state.posts.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                data-testid="post-row"
                className={`w-full rounded-lg border bg-white p-2 text-left text-sm hover:bg-indigo-50 ${selected === p.id ? 'border-indigo-300' : 'border-slate-200'}`}
              >
                <span className="flex justify-between text-xs">
                  <span className="font-semibold">{channelOf(state, p)?.name}</span>
                  <span
                    className={
                      p.status === 'scheduled' ? 'text-emerald-700' : 'text-amber-700'
                    }
                  >
                    {p.status === 'scheduled' ? p.scheduledAt.replace('T', ' ') : 'Draft'}
                  </span>
                </span>
                <span className="line-clamp-2 block text-slate-700">
                  {p.text || '(empty)'}
                </span>
              </button>
            </li>
          ))}
          {state.posts.length === 0 && (
            <li className="text-sm text-slate-500">No posts yet.</li>
          )}
        </ul>
      </div>
      <div className="min-w-0 flex-1">
        {post ? (
          <Composer
            key={post.id + post.status}
            state={state}
            post={post}
            editable={editable}
            update={update}
            onClose={() => onSelect(null)}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Start a new post, or choose one to edit it.
          </p>
        )}
      </div>
    </div>
  )
}

function Composer({
  state,
  post,
  editable,
  update,
  onClose,
}: {
  state: SocialState
  post: Post
  editable: boolean
  update: Update
  onClose: () => void
}) {
  const channel = channelOf(state, post)
  const [text, setText] = useState(post.text)
  const [day, setDay] = useState(post.scheduledAt.slice(0, 10) || weekDays(state)[0])
  const [time, setTime] = useState(post.scheduledAt.slice(11) || '09:00')
  const [problems, setProblems] = useState<string[]>([])
  const length = text.trim().length
  const over = channel ? length > channel.limit : false
  const commitText = () => {
    if (text !== post.text) update((s) => updatePost(s, post.id, { text }))
  }
  const at = `${day}T${time}`
  return (
    <section
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"
      data-testid="composer"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">
          {channel?.name} post{' '}
          {post.status === 'scheduled' && (
            <span className="font-normal text-emerald-700">
              · scheduled {post.scheduledAt.replace('T', ' ')}
            </span>
          )}
        </h3>
        <button
          type="button"
          className="text-slate-600 hover:underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <label className="block">
        <span className="flex justify-between text-xs">
          <span>Text</span>
          <span
            className={over ? 'font-semibold text-red-700' : 'text-slate-500'}
            data-testid="char-count"
          >
            {length} / {channel?.limit}
          </span>
        </span>
        <textarea
          aria-label="Post text"
          rows={5}
          value={text}
          disabled={!editable}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          className="w-full rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="flex items-center gap-2">
        Image
        <select
          aria-label="Image"
          value={post.image}
          disabled={!editable}
          onChange={(e) =>
            update((s) => updatePost(s, post.id, { text, image: e.target.value }))
          }
          className="rounded border border-slate-300 px-2 py-1"
        >
          <option value="">No image{channel?.requiresImage ? ' (required)' : ''}</option>
          {state.images.map((i) => (
            <option key={i.name} value={i.name}>
              {i.name}: {i.description}
            </option>
          ))}
        </select>
      </label>
      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <select
            aria-label="Day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {weekDays(state).map((d) => (
              <option key={d} value={d}>
                {dayName(d)}
              </option>
            ))}
          </select>
          <input
            type="time"
            aria-label="Time"
            value={time}
            step={900}
            onChange={(e) => setTime(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
          {channel && (
            <span
              className={`text-xs ${atBestTime(channel, at) ? 'text-emerald-700' : 'text-slate-500'}`}
            >
              {atBestTime(channel, at)
                ? 'A best time for this channel'
                : 'Outside this channel’s best hours'}
            </span>
          )}
          <button
            type="button"
            className={PRIMARY}
            onClick={() => {
              const latest = { ...post, text }
              const found = postProblems(
                {
                  ...state,
                  posts: state.posts.map((p) => (p.id === post.id ? latest : p)),
                },
                latest,
                at,
              )
              if (found.length > 0) return setProblems(found)
              setProblems([])
              update(
                (s) =>
                  schedulePost(
                    text !== post.text ? updatePost(s, post.id, { text }) : s,
                    post.id,
                    at,
                  ).state,
              )
            }}
          >
            {post.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
          </button>
          {post.status === 'scheduled' && (
            <button
              type="button"
              className={BUTTON}
              onClick={() => update((s) => unschedulePost(s, post.id))}
            >
              Unschedule
            </button>
          )}
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              update((s) => deletePost(s, post.id))
              onClose()
            }}
          >
            Delete
          </button>
        </div>
      )}
      {problems.length > 0 && (
        <ul role="alert" className="list-disc rounded-md bg-red-50 p-3 pl-7 text-red-800">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {state.rules.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
          {state.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
