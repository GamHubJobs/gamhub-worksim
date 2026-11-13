/**
 * Matter Desk's screens: the section tabs, and matters and intake. The other
 * sections are in LegalSections.tsx.
 */
import { useState } from 'react'
import type { ToolWorkspaceProps } from '../ui'
import { WESTMARK } from './jurisdiction'
import {
  AuditView,
  BillingView,
  CalendarView,
  ContractsView,
  DiscoveryView,
  ResearchView,
} from './LegalSections'
import {
  clientById,
  conflictHits,
  declineMatter,
  openMatter,
  runConflictCheck,
  sendEngagement,
  verifyClient,
} from './model'
import type { LegalState } from './schema'
import { card, field, primary, secondary, type Run } from './styles'

const SECTIONS = [
  ['matters', 'Matters and intake'],
  ['research', 'Research'],
  ['contracts', 'Contract review'],
  ['calendar', 'Calendar'],
  ['billing', 'Time and billing'],
  ['discovery', 'Document review'],
  ['audit', 'Audit log'],
] as const
type SectionId = (typeof SECTIONS)[number][0]

export default function LegalWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
  initialSection,
}: ToolWorkspaceProps<LegalState>) {
  const [section, setSection] = useState<SectionId>(
    (SECTIONS.find(([id]) => id === initialSection)?.[0] ?? 'matters') as SectionId,
  )
  const [problems, setProblems] = useState<string[]>([])
  const [done, setDone] = useState<string | null>(null)
  const canEdit = !readOnly && !!onUpdate

  const run: Run = (fn) => {
    if (!canEdit) return false
    const result = fn(state)
    setProblems(result.problems)
    if (result.problems.length) {
      setDone(null)
      return false
    }
    onUpdate?.(() => result.state)
    setDone(result.state.audit.at(-1)?.action ?? 'Done')
    return true
  }
  const props = { state, canEdit, run }

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900"
      data-testid="matter-desk"
    >
      <div className="flex items-center justify-between gap-2 bg-indigo-900 px-3 py-1.5 text-white">
        <p className="text-sm font-semibold">{state.firm} · Matter Desk</p>
        <p className="text-xs">
          Today {state.today} · {state.user.name} ({state.user.role})
        </p>
      </div>
      <p className="bg-amber-100 px-3 py-1 text-xs text-amber-950" role="note">
        {WESTMARK.disclaimer}
      </p>
      <div
        role="tablist"
        aria-label="Matter Desk sections"
        className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-2 pt-1"
      >
        {SECTIONS.map(([id, name]) => {
          const locked = lockedSections[id]
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              disabled={!!locked}
              title={locked ? `Unlocks at ${locked}` : undefined}
              onClick={() => {
                setSection(id)
                setProblems([])
                setDone(null)
              }}
              className={`rounded-t px-3 py-1.5 text-sm ${
                section === id
                  ? 'border-b-2 border-indigo-800 font-semibold text-indigo-950'
                  : 'text-slate-600 hover:text-slate-900'
              } disabled:opacity-40`}
            >
              {name}
              {locked && ' 🔒'}
            </button>
          )
        })}
      </div>
      {(problems.length > 0 || done) && (
        <div
          role={problems.length ? 'alert' : 'status'}
          className={`px-3 py-1.5 text-sm ${problems.length ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`}
          data-testid="desk-message"
        >
          {problems.length ? problems.join(' ') : `Done: ${done}.`}
        </div>
      )}
      <div
        className="min-h-0 flex-1 overflow-auto"
        tabIndex={0}
        role="region"
        aria-label="Work area"
      >
        {section === 'matters' && <MattersView {...props} />}
        {section === 'research' && <ResearchView {...props} />}
        {section === 'contracts' && <ContractsView {...props} />}
        {section === 'calendar' && <CalendarView {...props} />}
        {section === 'billing' && <BillingView {...props} />}
        {section === 'discovery' && <DiscoveryView {...props} />}
        {section === 'audit' && <AuditView state={state} />}
      </div>
    </div>
  )
}

function MattersView({
  state,
  canEdit,
  run,
}: {
  state: LegalState
  canEdit: boolean
  run: Run
}) {
  const [docs, setDocs] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  return (
    <div className="space-y-3 p-3">
      {state.matters.map((m) => {
        const client = clientById(state, m.clientId)
        const hits = m.conflictChecked ? conflictHits(state, m.id) : []
        return (
          <section
            key={m.id}
            className={card}
            aria-label={`Matter ${m.id}`}
            data-testid={`matter-${m.id}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">
                {m.id}: {m.title}
              </h3>
              <span
                className={`rounded px-2 py-0.5 text-xs ${m.status === 'open' ? 'bg-emerald-100' : m.status === 'declined' ? 'bg-slate-200' : 'bg-amber-100'}`}
              >
                {m.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Client: {client?.name} ({client?.contact}) · Other side:{' '}
              {m.opposing.join(', ') || '—'} · {m.kind}
              {m.arose && ` · arose ${m.arose}`} · £{m.rate}/hour
            </p>
            {m.declineReason && (
              <p className="mt-1 text-xs">Declined: {m.declineReason}</p>
            )}
            {m.status === 'intake' && (
              <div className="mt-2 space-y-2 rounded bg-slate-50 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">1. Conflict check</span>
                  {canEdit && (
                    <button
                      type="button"
                      className={secondary}
                      onClick={() => run((s) => runConflictCheck(s, m.id))}
                    >
                      {m.conflictChecked ? 'Run again' : 'Run conflict check'}
                    </button>
                  )}
                  {m.conflictChecked && (
                    <span
                      data-testid={`conflicts-${m.id}`}
                      className={
                        hits.some((h) => h.blocking)
                          ? 'font-semibold text-red-700'
                          : 'text-emerald-800'
                      }
                    >
                      {hits.length
                        ? hits
                            .map(
                              (h) =>
                                `${h.name}: ${h.relation.replace('-', ' ')} (${h.matter})${h.blocking ? ', CONFLICT' : ''}`,
                            )
                            .join('; ')
                        : 'No matches in the firm’s records.'}
                    </span>
                  )}
                </div>
                {client && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">2. Client identity</span>
                    {client.idVerified ? (
                      <span className="text-emerald-800">
                        Verified: {client.idDocument}
                      </span>
                    ) : (
                      canEdit && (
                        <>
                          <input
                            value={docs[client.id] ?? ''}
                            onChange={(e) =>
                              setDocs((d) => ({ ...d, [client.id]: e.target.value }))
                            }
                            placeholder={
                              client.kind === 'company'
                                ? 'e.g. company register extract'
                                : 'e.g. passport, seen in person'
                            }
                            aria-label={`Identity document for ${client.name}`}
                            className={`${field} min-w-64`}
                          />
                          <button
                            type="button"
                            className={secondary}
                            onClick={() =>
                              run((s) =>
                                verifyClient(s, client.id, docs[client.id] ?? ''),
                              )
                            }
                          >
                            Record as verified
                          </button>
                        </>
                      )
                    )}
                  </div>
                )}
                {client && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">3. Engagement letter</span>
                    {client.engagementSent ? (
                      <span className="text-emerald-800">Sent</span>
                    ) : (
                      canEdit && (
                        <button
                          type="button"
                          className={secondary}
                          onClick={() => run((s) => sendEngagement(s, client.id))}
                        >
                          Send engagement letter
                        </button>
                      )
                    )}
                  </div>
                )}
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
                    <button
                      type="button"
                      className={primary}
                      onClick={() => run((s) => openMatter(s, m.id))}
                    >
                      Open the matter
                    </button>
                    <input
                      value={reasons[m.id] ?? ''}
                      onChange={(e) =>
                        setReasons((r) => ({ ...r, [m.id]: e.target.value }))
                      }
                      placeholder="Why the firm cannot act"
                      aria-label={`Reason for declining ${m.id}`}
                      className={`${field} min-w-64 flex-1`}
                    />
                    <button
                      type="button"
                      className={secondary}
                      onClick={() =>
                        run((s) => declineMatter(s, m.id, reasons[m.id] ?? ''))
                      }
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
