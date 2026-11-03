/** Help: short answers on every topic a new player needs, one topic at a time. */
import { useEffect, useRef, useState } from 'react'
import { HELP_TOPICS } from '../content/help'
import { RichText } from './RichText'

export function HelpPanel({ onClose }: { onClose: () => void }) {
  const [topicId, setTopicId] = useState(HELP_TOPICS[0].id)
  const dialog = useRef<HTMLDivElement>(null)
  const topic = HELP_TOPICS.find((t) => t.id === topicId) ?? HELP_TOPICS[0]

  // Focus moves into the help, Escape closes it, and focus returns afterwards.
  useEffect(() => {
    const before = document.activeElement
    dialog.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (before instanceof HTMLElement && before.isConnected) before.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6"
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
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none sm:flex-row"
        data-testid="help-panel"
      >
        <nav
          aria-label="Help topics"
          className="border-b border-slate-200 bg-slate-50 p-3 sm:w-60 sm:border-r sm:border-b-0"
        >
          <h2 id="help-title" className="px-2 pb-2 text-lg font-bold text-slate-900">
            Help
          </h2>
          <ul className="space-y-0.5">
            {HELP_TOPICS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-current={t.id === topic.id ? 'true' : undefined}
                  onClick={() => setTopicId(t.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    t.id === topic.id
                      ? 'bg-blue-100 font-medium text-blue-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <section className="min-w-0 flex-1 space-y-3 p-6" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-900">{topic.title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
          {topic.text.map((paragraph) => (
            <RichText
              key={paragraph}
              text={paragraph}
              className="text-sm leading-relaxed text-slate-700"
            />
          ))}
          <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
            More detailed guides come with WorkSim in its docs folder, starting with the
            Player handbook.
          </p>
        </section>
      </div>
    </div>
  )
}
