/**
 * Help and guidance, in one place: getting started and gameplay answers,
 * the guided tours (start, resume, replay), the keyboard shortcuts, and the
 * guides to the player's own career's tools. Everything is searchable.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { HELP_TOPICS } from '../content/help'
import type { GuideState } from '../persistence/schemas'
import { allTours } from '../guide/tours'
import { getTool } from '../tools/registry'
import { CONTROLS, keyName, keymap } from '../world/keys'
import { RichText } from './RichText'

type Section = 'topics' | 'tours' | 'keys' | 'career'

const DESKTOP_KEYS: Array<[string, string]> = [
  [
    'Esc',
    'In the office: the game menu (save, settings, help, tours). In a tour: pause it.',
  ],
  ['← →', 'In a guided tour: the previous or next step.'],
  ['Double-click a title bar', 'Maximise or restore that window.'],
  ['Ctrl+Z / Ctrl+Y', 'Undo and redo in the office apps.'],
  ['Enter / Tab', 'In Grid Craft: the next cell down / to the right.'],
]

export function HelpPanel({
  onClose,
  guide,
  onStartTour,
  careerTools = [],
  initialSection = 'topics',
}: {
  onClose: () => void
  /** The player's tours progress (none: tours are not offered here). */
  guide?: GuideState
  onStartTour?: (id: string, fromStep: number) => void
  /** The career's profession tools (IDs), for their guides. */
  careerTools?: string[]
  initialSection?: Section
}) {
  const [section, setSection] = useState<Section>(initialSection)
  const [topicId, setTopicId] = useState(HELP_TOPICS[0].id)
  const [query, setQuery] = useState('')
  const dialog = useRef<HTMLDivElement>(null)
  const q = query.trim().toLowerCase()
  const matches = (...texts: string[]) => !q || texts.join(' ').toLowerCase().includes(q)

  const topics = HELP_TOPICS.filter((t) => matches(t.title, ...t.text))
  const tours = useMemo(() => allTours(), [])
  const shownTours = tours.filter((t) => matches(t.title, t.summary))
  const tools = careerTools.flatMap((id) => getTool(id) ?? [])
  const topic = topics.find((t) => t.id === topicId) ?? topics[0]

  // Focus moves into the help, Escape closes it, and focus returns afterwards.
  useEffect(() => {
    const before = document.activeElement
    dialog.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (before instanceof HTMLElement && before.isConnected)
        before.focus({ preventScroll: true })
    }
  }, [onClose])

  const tab = (id: Section, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={section === id}
      onClick={() => setSection(id)}
      className={`rounded-md px-2.5 py-1 text-sm ${section === id ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
    >
      {label}
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        tabIndex={-1}
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none"
        data-testid="help-panel"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <h2 id="help-title" className="text-lg font-bold text-slate-900">
            Help and guidance
          </h2>
          <div role="tablist" aria-label="Help sections" className="flex flex-wrap gap-1">
            {tab('topics', 'Getting started')}
            {guide && tab('tours', 'Guided tours')}
            {tab('keys', 'Keyboard shortcuts')}
            {tools.length > 0 && tab('career', 'Your career’s tools')}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help"
            aria-label="Search help"
            className="ml-auto w-48 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </header>

        {section === 'topics' && (
          <div className="flex flex-col sm:flex-row">
            <nav
              aria-label="Help topics"
              className="border-b border-slate-200 bg-slate-50 p-3 sm:w-60 sm:border-r sm:border-b-0"
            >
              <ul className="space-y-0.5">
                {topics.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-current={t.id === topic?.id ? 'true' : undefined}
                      onClick={() => setTopicId(t.id)}
                      className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                        t.id === topic?.id
                          ? 'bg-blue-100 font-medium text-blue-900'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t.title}
                    </button>
                  </li>
                ))}
              </ul>
              {topics.length === 0 && (
                <p className="px-2 text-sm text-slate-500">No topic matches.</p>
              )}
            </nav>
            <section className="min-w-0 flex-1 space-y-3 p-6" aria-live="polite">
              {topic && (
                <>
                  <h3 className="text-xl font-semibold text-slate-900">{topic.title}</h3>
                  {topic.text.map((paragraph) => (
                    <RichText
                      key={paragraph}
                      text={paragraph}
                      className="text-sm leading-relaxed text-slate-700"
                    />
                  ))}
                </>
              )}
              <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                More detailed guides come with WorkSim in its docs folder, starting with
                the Player handbook.
              </p>
            </section>
          </div>
        )}

        {section === 'tours' && guide && (
          <ul className="grid gap-2 p-4 sm:grid-cols-2" data-testid="tour-list">
            {shownTours.map((t) => {
              const record = guide.tours[t.id]
              const status = record?.status
              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{t.title}</p>
                    <p className="text-xs text-slate-600">{t.summary}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t.steps.length} steps
                      {status === 'done'
                        ? ' · taken'
                        : status === 'skipped'
                          ? ' · skipped'
                          : status === 'paused'
                            ? ` · paused at step ${record.step + 1}`
                            : ''}
                      {t.app && t.id !== 'intro' ? ' · opens its app' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {status === 'paused' && (
                      <button
                        type="button"
                        onClick={() => onStartTour?.(t.id, record.step)}
                        className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onStartTour?.(t.id, 0)}
                      aria-label={`${status === 'done' ? 'Take again' : 'Start'}: ${t.title}`}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-800 hover:bg-slate-50"
                    >
                      {status === 'done'
                        ? 'Take it again'
                        : status === 'paused'
                          ? 'From the start'
                          : 'Start'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {section === 'keys' && (
          <div className="grid gap-6 p-6 sm:grid-cols-2" data-testid="shortcuts">
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">
                Walking about (change them in Settings)
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {CONTROLS.filter((c) => matches(c.name)).map((c) => (
                  <div key={c.id} className="contents">
                    <dt>
                      {keymap()[c.id].map((k) => (
                        <kbd key={k} className="mr-1 rounded bg-slate-100 px-1.5 text-xs">
                          {keyName(k)}
                        </kbd>
                      ))}
                    </dt>
                    <dd className="text-slate-700">{c.name}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">
                At the computer and in tours
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {DESKTOP_KEYS.filter(([k, v]) => matches(k, v)).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt>
                      <kbd className="rounded bg-slate-100 px-1.5 text-xs">{k}</kbd>
                    </dt>
                    <dd className="text-slate-700">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        )}

        {section === 'career' && (
          <div className="space-y-4 p-6">
            {tools
              .filter((t) =>
                matches(
                  t.name,
                  t.guide.intro,
                  ...t.guide.topics.map((x) => x.title + x.body),
                ),
              )
              .map((t) => (
                <section key={t.id}>
                  <h3 className="font-semibold text-slate-900">{t.name}</h3>
                  <p className="text-sm text-slate-700">{t.guide.intro}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {t.guide.topics.map((x) => (
                      <li key={x.title}>
                        <b>{x.title}.</b> {x.body}
                      </li>
                    ))}
                  </ul>
                  {onStartTour && (
                    <button
                      type="button"
                      onClick={() => onStartTour(`tool:${t.id}`, 0)}
                      className="mt-1 text-xs font-medium text-blue-800 underline"
                    >
                      Take the {t.name} tour
                    </button>
                  )}
                </section>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
