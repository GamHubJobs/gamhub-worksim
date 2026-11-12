/**
 * The Help Desk: a queue of support tickets. Pick a ticket, set its priority,
 * category and status, reply to the colleague who raised it and leave notes
 * for the team. The knowledge base holds the desk's guides.
 */
import { useState } from 'react'
import { PriorityMatrix } from './PriorityMatrix'
import {
  TICKET_PRIORITIES,
  type Ticket,
  type TicketPriority,
  type TicketsContent,
  type TicketStatus,
} from '../../persistence/schemas'
import { CLASSIC_STATUSES, LIFECYCLE_NAMES, PRIORITY_INFO, STATUS_NAMES } from './labels'
import {
  assignToMe,
  evaluateTicket,
  isMonitored,
  MONITORED_CHOICES,
  requestStatus,
  type Moment,
} from '../../game/incidents'
import { TicketSystemsPanel } from './TicketSystemsPanel'
import { VerificationPanel } from './VerificationPanel'
import { AskAiMenu } from '../ai/AskAiMenu'
import { useAiContext } from '../ai/hub'
import { ticketAiContext } from './aiContext'
import { guidanceFor } from '../../game/guidance'
import { getArticle } from '../../content/knowledge/it'
import { GuidancePanel } from './GuidancePanel'

interface TicketsEditorProps {
  content: TicketsContent
  readOnly?: boolean
  onUpdate?: (change: (content: TicketsContent) => TicketsContent) => void
  /** Now, for a ticket's history (the office clock, and who requesters are). */
  moment?: () => Moment
  /** Opens a Knowledge Base article (in the Help Desk's Knowledge Base section). */
  onOpenArticle?: (id: string) => void
  /** The ticket to show first (e.g. opened from the Overview). */
  initialTicket?: string
}

const statusName = (ticket: Ticket, status: TicketStatus) =>
  isMonitored(ticket) ? LIFECYCLE_NAMES[status] : STATUS_NAMES[status]

function updateTicket(
  content: TicketsContent,
  id: string,
  changes: Partial<Ticket>,
): TicketsContent {
  return {
    ...content,
    tickets: content.tickets.map((t) => (t.id === id ? { ...t, ...changes } : t)),
  }
}

export function TicketsEditor({
  content,
  readOnly = false,
  onUpdate,
  moment = () => ({ at: Date.now(), time: '' }),
  onOpenArticle,
  initialTicket,
}: TicketsEditorProps) {
  const editable = !readOnly && !!onUpdate
  const [selectedId, setSelectedId] = useState(
    initialTicket ?? content.tickets[0]?.id ?? '',
  )
  const [filter, setFilter] = useState<'all' | TicketStatus>('all')
  const [kbOpen, setKbOpen] = useState<number | null>(null)
  const [showKb, setShowKb] = useState(content.knowledge.length > 0)
  /** Why the last status chosen was not taken (for a ticket tied to the systems). */
  const [refusal, setRefusal] = useState<{ ticket: string; reasons: string[] } | null>(
    null,
  )
  const ticket = content.tickets.find((t) => t.id === selectedId) ?? content.tickets[0]
  const shown = content.tickets.filter((t) => filter === 'all' || t.status === filter)

  // WorkSim AI sees the open ticket and the knowledge base articles that match it.
  useAiContext(
    'helpdesk',
    editable && ticket
      ? () => {
          // What the systems show for it (tickets tied to the systems only).
          const guidance = isMonitored(ticket) ? guidanceFor(ticket, content) : null
          const evaluation = guidance ? evaluateTicket(ticket, content.environment) : null
          const article = guidance?.hints[2]?.article
          const kb = article ? getArticle(article) : undefined
          return ticketAiContext(
            ticket,
            content.knowledge,
            guidance && evaluation
              ? {
                  failing: evaluation.failing.map((r) => ({
                    label: r.label,
                    state: r.state,
                  })),
                  attempted: guidance.attempted,
                  next: guidance.next,
                  ...(kb
                    ? {
                        article: {
                          title: kb.title,
                          summary: kb.summary,
                          ...(kb.concept ? { concept: kb.concept } : {}),
                        },
                      }
                    : {}),
                }
              : undefined,
          )
        }
      : null,
  )

  const change = (changes: Partial<Ticket>) => {
    if (editable && ticket)
      onUpdate?.((latest) => updateTicket(latest, ticket.id, changes))
  }

  /**
   * Choosing a status. A ticket tied to the systems is checked first: if the
   * problem is still there it stays as it is, and the reason is shown.
   */
  const chooseStatus = (status: TicketStatus) => {
    if (!editable || !ticket) return
    if (!isMonitored(ticket)) return change({ status })
    const when = moment()
    const result = requestStatus(content, ticket.id, status, when)
    setRefusal(result.refused ? { ticket: ticket.id, reasons: result.refused } : null)
    onUpdate?.((latest) => requestStatus(latest, ticket.id, status, when).content)
  }

  const statusChoices = (t: Ticket): TicketStatus[] => {
    if (!isMonitored(t)) return CLASSIC_STATUSES
    return MONITORED_CHOICES.includes(t.status)
      ? MONITORED_CHOICES
      : [t.status, ...MONITORED_CHOICES]
  }
  const statusesInQueue = [
    ...new Set([...CLASSIC_STATUSES, ...content.tickets.map((t) => t.status)]),
  ]

  return (
    <div className="flex min-h-0 flex-1" data-testid="helpdesk">
      {/* The queue */}
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
          <span className="text-sm font-semibold text-slate-800">
            Queue ({content.tickets.length})
          </span>
          <select
            aria-label="Show tickets"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | TicketStatus)}
            className="rounded border border-slate-200 px-1 py-0.5 text-xs"
          >
            <option value="all">All</option>
            {statusesInQueue.map((status) => (
              <option key={status} value={status}>
                {STATUS_NAMES[status].split(' (')[0]}
              </option>
            ))}
          </select>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Tickets">
          {shown.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                aria-current={t.id === ticket?.id}
                className={`w-full border-b border-slate-100 px-3 py-2.5 text-left ${
                  t.id === ticket?.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-slate-500">{t.id}</span>
                  <span className="flex gap-1">
                    {t.priority && (
                      <span
                        className={`rounded px-1.5 font-semibold ${PRIORITY_INFO[t.priority].color}`}
                      >
                        {t.priority}
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 ${
                        isMonitored(t) && evaluateTicket(t, content.environment).fixed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {statusName(t, t.status).split(' (')[0]}
                    </span>
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                  {t.subject}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {t.from} · {t.received}
                </p>
              </button>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="p-3 text-sm text-slate-500">No tickets with this status.</li>
          )}
        </ul>
      </div>

      {/* The selected ticket */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-slate-50 p-5">
        {ticket ? (
          <article className="mx-auto max-w-3xl space-y-4" data-testid="ticket">
            <header className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-xs text-slate-500">{ticket.id}</p>
                {editable && (
                  <AskAiMenu
                    app="helpdesk"
                    compact
                    actions={[
                      { label: 'Summarise this ticket', action: 'summarise' },
                      {
                        label: 'Suggest how to resolve it',
                        question: 'How should I resolve this ticket?',
                        action: 'resolve-ticket',
                      },
                      {
                        label: 'Help me reply to the user',
                        question:
                          'Help me write a reply to the user who raised this ticket',
                        action: 'reply',
                      },
                    ]}
                  />
                )}
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{ticket.subject}</h2>
              <p className="text-sm text-slate-600">
                From <strong>{ticket.from}</strong> ({ticket.department}) at{' '}
                {ticket.received}
              </p>
              <p className="mt-3 text-sm whitespace-pre-wrap text-slate-800">
                {ticket.body}
              </p>
            </header>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
              <label className="block text-xs font-medium text-slate-600">
                Priority
                <select
                  aria-label="Priority"
                  value={ticket.priority ?? ''}
                  disabled={!editable}
                  onChange={(e) =>
                    change({
                      priority: (e.target.value || null) as TicketPriority | null,
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Not set</option>
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_INFO[p].label}
                    </option>
                  ))}
                </select>
                {ticket.priority && (
                  <span className="mt-1 block font-normal text-slate-500">
                    {PRIORITY_INFO[ticket.priority].detail}
                  </span>
                )}
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Category
                <select
                  aria-label="Category"
                  value={ticket.category ?? ''}
                  disabled={!editable}
                  onChange={(e) => change({ category: e.target.value || null })}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Not set</option>
                  {content.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Status
                <select
                  aria-label="Status"
                  value={ticket.status}
                  disabled={!editable || ticket.status === 'closed'}
                  onChange={(e) => chooseStatus(e.target.value as TicketStatus)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {statusChoices(ticket).map((s) => (
                    <option key={s} value={s}>
                      {statusName(ticket, s)}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {refusal?.ticket === ticket.id && (
              <div
                role="alert"
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
                data-testid="status-refused"
              >
                <p className="font-semibold">The status was not changed.</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {refusal.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {isMonitored(ticket) && (
              <TicketSystemsPanel
                ticket={ticket}
                environment={content.environment}
                onAssign={
                  editable && ticket.assignee !== 'you' && ticket.status !== 'closed'
                    ? () => {
                        const when = moment()
                        onUpdate?.((latest) => assignToMe(latest, ticket.id, when))
                      }
                    : undefined
                }
              />
            )}

            <GuidancePanel
              key={`guide-${ticket.id}`}
              ticket={ticket}
              content={content}
              editable={editable}
              onUpdate={onUpdate}
              moment={moment}
              onOpenArticle={onOpenArticle}
            />

            <VerificationPanel
              key={`verify-${ticket.id}`}
              ticket={ticket}
              content={content}
              editable={editable}
              onUpdate={onUpdate}
              moment={moment}
            />

            <PriorityMatrix
              current={ticket.priority}
              onChoose={editable ? (priority) => change({ priority }) : undefined}
            />

            <TextField
              key={`reply-${ticket.id}`}
              label={`Reply to ${ticket.from.split(' ')[0]}`}
              hint="What the user sees. Plain words: what you did, what they need to do, and what happens next."
              value={ticket.reply}
              rows={7}
              readOnly={!editable}
              onCommit={(reply) => change({ reply })}
            />
            <TextField
              key={`note-${ticket.id}`}
              label="Internal note"
              hint="Only the IT team sees this: what you checked and what you found."
              value={ticket.note}
              rows={3}
              readOnly={!editable}
              onCommit={(note) => change({ note })}
            />
          </article>
        ) : (
          <p className="text-slate-500">The queue is empty.</p>
        )}
      </div>

      {/* Knowledge base (inside the Help Desk shell it has its own section instead) */}
      {content.knowledge.length > 0 && !onOpenArticle && (
        <aside
          className={`flex shrink-0 flex-col border-l border-slate-200 bg-white ${showKb ? 'w-80' : 'w-10'}`}
          aria-label="Knowledge base"
        >
          <button
            type="button"
            onClick={() => setShowKb((open) => !open)}
            className="border-b border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
            title={showKb ? 'Hide the knowledge base' : 'Show the knowledge base'}
          >
            {showKb ? 'Knowledge base ◂' : '▸'}
          </button>
          {showKb && (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {content.knowledge.map((article, i) => (
                <li key={article.title} className="rounded border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setKbOpen(kbOpen === i ? null : i)}
                    aria-expanded={kbOpen === i}
                    className="w-full px-2.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    {article.title}
                  </button>
                  {kbOpen === i && (
                    <p className="border-t border-slate-100 px-2.5 py-2 text-xs whitespace-pre-wrap text-slate-700">
                      {article.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  )
}

/** A text box that saves when the player leaves it (one undo step per edit). */
function TextField({
  label,
  hint,
  value,
  rows,
  readOnly,
  onCommit,
}: {
  label: string
  hint: string
  value: string
  rows: number
  readOnly: boolean
  onCommit: (text: string) => void
}) {
  const [draft, setDraft] = useState(value)
  return (
    <label className="block rounded-lg border border-slate-200 bg-white p-4">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <span className="block text-xs text-slate-500">{hint}</span>
      <textarea
        aria-label={label}
        value={draft}
        readOnly={readOnly}
        rows={rows}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onCommit(draft)
        }}
        className="mt-2 w-full rounded border border-slate-300 p-2 text-sm leading-relaxed"
      />
    </label>
  )
}
