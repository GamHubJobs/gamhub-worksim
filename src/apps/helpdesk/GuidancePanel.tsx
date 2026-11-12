/**
 * Guidance on a ticket: what is still wrong (as the systems show it), what
 * the player has tried, and progressive hints, opened one at a time. Each
 * hint opened takes a little off the task's XP (game/guidance.ts), and the
 * panel says so before it is opened.
 */
import { useState } from 'react'
import { getArticle } from '../../content/knowledge/it'
import {
  guidanceFor,
  HINT_COST,
  HINT_COST_CAP,
  HINT_TITLES,
  hintsUsed,
  revealHint,
} from '../../game/guidance'
import type { Moment } from '../../game/incidents'
import type { Ticket, TicketsContent } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'

const TOOL_NAMES = {
  network: 'Network Tools',
  directory: 'Directory',
  devices: 'Devices',
  knowledge: 'Knowledge Base',
} as const

export function GuidancePanel({
  ticket,
  content,
  editable,
  onUpdate,
  moment,
  onOpenArticle,
}: {
  ticket: Ticket
  content: TicketsContent
  editable: boolean
  onUpdate?: (change: (content: TicketsContent) => TicketsContent) => void
  moment: () => Moment
  onOpenArticle?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const guidance = guidanceFor(ticket, content)
  const used = ticket.hintsUsed ?? 0
  const shown = guidance.hints.slice(0, used)
  const next = guidance.hints[used]
  const total = hintsUsed(content)
  const percent = (n: number) => `${Math.round(n * 100)}%`

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white text-sm"
      aria-label="Guidance"
      data-testid="guidance"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-slate-800">
          <Icon name="hint" className="h-4 w-4 text-amber-600" />
          Guidance
          {used > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              {used} hint{used === 1 ? '' : 's'} used
            </span>
          )}
        </span>
        <span className="text-xs text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          <p className="text-slate-800" data-testid="guidance-next">
            {guidance.next}
          </p>
          {guidance.attempted.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Tried so far
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
                {guidance.attempted.slice(-5).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {shown.length > 0 && (
            <ol className="space-y-2" aria-label="Hints">
              {shown.map((hint) => {
                const article = hint.article ? getArticle(hint.article) : undefined
                return (
                  <li
                    key={hint.level}
                    className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-950"
                    data-testid="hint"
                  >
                    <p className="font-semibold">
                      Hint {hint.level}: {hint.title}
                    </p>
                    <p className="mt-0.5">{hint.text}</p>
                    {hint.tool && (
                      <p className="mt-1 text-xs">Tool: {TOOL_NAMES[hint.tool]}</p>
                    )}
                    {article && onOpenArticle && (
                      <button
                        type="button"
                        onClick={() => onOpenArticle(article.id)}
                        className="mt-1 text-xs font-medium text-blue-800 underline"
                      >
                        Read “{article.title}” in the Knowledge Base
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
          {next && editable && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-slate-700">
                Stuck? Hints go one step at a time, from the problem to the concept. Each
                one opened takes {percent(HINT_COST)} off this task’s XP (at most{' '}
                {percent(HINT_COST_CAP)}); your score is not affected. Working it out
                yourself counts as stronger evidence of your skills.
              </p>
              <button
                type="button"
                onClick={() => {
                  const when = moment()
                  onUpdate?.((latest) => revealHint(latest, ticket.id, when))
                }}
                className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-1 font-medium text-amber-900 hover:bg-amber-50"
              >
                Show hint {next.level}: {HINT_TITLES[next.level - 1]}
              </button>
              {total > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Hints used in this task so far: {total}.
                </p>
              )}
            </div>
          )}
          {!next && guidance.hints.length > 0 && (
            <p className="text-xs text-slate-500">All the hints for this are open.</p>
          )}
        </div>
      )}
    </section>
  )
}
