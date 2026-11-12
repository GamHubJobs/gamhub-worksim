/**
 * Service desk reports, from the player's own ticket queues (this one and
 * every other Help Desk task's). Each figure says how it is counted.
 */
import { useEffect, useState } from 'react'
import { getAssignment } from '../../content/assignments'
import { formatMinutes } from '../../game/sla'
import {
  REPORT_RULES,
  serviceReport,
  type QueueForReport,
} from '../../game/serviceReport'
import { getDocument } from '../../persistence/documentsRepo'
import type { Profile, TicketsContent } from '../../persistence/schemas'

function Figure({
  label,
  value,
  rule,
  testid,
}: {
  label: string
  value: string
  rule: string
  testid: string
}) {
  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-3"
      data-testid={testid}
      title={rule}
    >
      <p className="text-2xl leading-none font-semibold text-slate-900">{value}</p>
      <p className="mt-1.5 text-xs text-slate-600">{label}</p>
    </div>
  )
}

export function ReportsPanel({
  profile,
  current,
  currentTitle,
  now,
}: {
  profile: Profile | null
  /** The queue open now (its latest state, saved or not). */
  current: TicketsContent
  currentTitle: string
  /** The office clock (absolute minutes). */
  now: number
}) {
  const [others, setOthers] = useState<QueueForReport[] | null>(null)
  useEffect(() => {
    let cancelled = false
    const ids = profile
      ? Object.values(profile.assignments)
          .filter((p) => getAssignment(p.assignmentId)?.kind === 'tickets')
          .map((p) => ({ id: p.documentId, title: getAssignment(p.assignmentId)!.title }))
      : []
    void Promise.all(
      ids.map(async ({ id, title }) => ({ doc: await getDocument(id), title })),
    ).then((docs) => {
      if (cancelled) return
      setOthers(
        docs.flatMap(({ doc, title }) =>
          doc?.kind === 'tickets' && doc.content !== current
            ? [{ title, content: doc.content }]
            : [],
        ),
      )
    })
    return () => {
      cancelled = true
    }
  }, [profile, current])

  // This queue as it is now, and the player's other queues as saved.
  const queues: QueueForReport[] = [
    { title: currentTitle, content: current },
    ...(others ?? []).filter((q) => q.title !== currentTitle),
  ]
  const r = serviceReport(queues, now)
  const pct = (n: number | null) => (n === null ? 'n/a' : `${Math.round(n * 100)}%`)

  return (
    <div className="@container h-full overflow-y-auto bg-slate-50" data-testid="reports">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Service desk report</h2>
          <p className="text-sm text-slate-600">
            {others === null
              ? 'Loading your other queues…'
              : `From ${r.queues} ticket queue${r.queues === 1 ? '' : 's'}: every figure is counted from your saved tickets. Hover a figure to see how.`}
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4 @5xl:grid-cols-8">
          <Figure
            label="Received"
            value={String(r.received)}
            rule={REPORT_RULES.received}
            testid="report-received"
          />
          <Figure
            label="Resolved"
            value={String(r.resolved)}
            rule={REPORT_RULES.resolved}
            testid="report-resolved"
          />
          <Figure
            label="Reopened"
            value={String(r.reopened)}
            rule={REPORT_RULES.reopened}
            testid="report-reopened"
          />
          <Figure
            label="Average resolution"
            value={
              r.averageResolution === null ? 'n/a' : formatMinutes(r.averageResolution)
            }
            rule={REPORT_RULES.averageResolution}
            testid="report-average"
          />
          <Figure
            label="Overdue (SLA)"
            value={String(r.overdue)}
            rule={REPORT_RULES.overdue}
            testid="report-overdue"
          />
          <Figure
            label="Escalated"
            value={String(r.escalated)}
            rule={REPORT_RULES.escalated}
            testid="report-escalated"
          />
          <Figure
            label="First-contact resolution"
            value={pct(r.firstContact)}
            rule={REPORT_RULES.firstContact}
            testid="report-fcr"
          />
          <Figure
            label="Satisfaction (estimate)"
            value={r.satisfaction === null ? 'n/a' : `${r.satisfaction} / 5`}
            rule={REPORT_RULES.satisfaction}
            testid="report-satisfaction"
          />
        </div>

        <div className="grid gap-5 @4xl:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-white">
            <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">
              By priority
            </h3>
            <table className="w-full text-sm" aria-label="By priority">
              <thead className="text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Priority</th>
                  <th className="px-4 py-2">Tickets</th>
                  <th className="px-4 py-2">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {r.byPriority.map((p) => (
                  <tr key={p.priority} className="border-t border-slate-100">
                    <td className="px-4 py-1.5 font-medium">{p.priority}</td>
                    <td className="px-4 py-1.5">{p.count}</td>
                    <td
                      className={`px-4 py-1.5 ${p.breached ? 'font-medium text-red-700' : ''}`}
                    >
                      {p.breached}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white">
            <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">
              By department
            </h3>
            <table className="w-full text-sm" aria-label="By department">
              <thead className="text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Tickets</th>
                  <th className="px-4 py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {r.byDepartment.map((d) => (
                  <tr key={d.name} className="border-t border-slate-100">
                    <td className="px-4 py-1.5">{d.name}</td>
                    <td className="px-4 py-1.5">{d.tickets}</td>
                    <td className={`px-4 py-1.5 ${d.open ? 'text-amber-800' : ''}`}>
                      {d.open}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white">
            <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">
              By category
            </h3>
            <ul className="divide-y divide-slate-100 text-sm">
              {r.byCategory.map((c) => (
                <li key={c.name} className="flex justify-between px-4 py-1.5">
                  <span>{c.name}</span>
                  <span className="text-slate-600">{c.count}</span>
                </li>
              ))}
            </ul>
            {r.communication !== null && (
              <p
                className="border-t border-slate-100 px-4 py-2.5 text-sm text-slate-700"
                data-testid="report-communication"
              >
                Calls: average communication assessment{' '}
                <span className="font-semibold">{r.communication}%</span>
              </p>
            )}
          </section>
        </div>

        <details className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-800">
            How each figure is counted
          </summary>
          <dl className="mt-2 grid gap-1 @2xl:grid-cols-[auto_1fr] @2xl:gap-x-4">
            {Object.entries(REPORT_RULES).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium text-slate-700">{k}</dt>
                <dd className="text-slate-600">{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </div>
  )
}
