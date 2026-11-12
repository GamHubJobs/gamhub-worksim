/**
 * The Help Desk's Overview: the operational picture of this queue, from its
 * real state only (tickets, their checks in the systems, who is held up,
 * security events, recent history). Nothing here is decorative: every
 * figure is counted from the queue.
 */
import { disruptionsOf, evaluateTicket, isMonitored } from '../../game/incidents'
import type { Ticket, TicketsContent } from '../../persistence/schemas'
import { Icon, type IconName } from '../../ui/Icon'
import { LIFECYCLE_NAMES, PRIORITY_INFO, STATUS_NAMES } from './labels'

const OPEN = (t: Ticket) => t.status !== 'resolved' && t.status !== 'closed'

function Stat({
  label,
  value,
  icon,
  tone = 'slate',
  testid,
}: {
  label: string
  value: number | string
  icon: IconName
  tone?: 'slate' | 'red' | 'amber' | 'green' | 'blue'
  testid: string
}) {
  const tones = {
    slate: 'text-slate-700 bg-slate-100',
    red: 'text-red-800 bg-red-100',
    amber: 'text-amber-900 bg-amber-100',
    green: 'text-emerald-800 bg-emerald-100',
    blue: 'text-blue-800 bg-blue-100',
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3" data-testid={testid}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-2xl leading-none font-semibold text-slate-900">
          {value}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}
        >
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </span>
      <span className="mt-1.5 block text-xs leading-snug text-slate-600">{label}</span>
    </div>
  )
}

export function OverviewPanel({
  content,
  assignmentId,
  onOpenTicket,
}: {
  content: TicketsContent
  assignmentId: string | null
  onOpenTicket: (id: string) => void
}) {
  const tickets = content.tickets
  const open = tickets.filter(OPEN)
  const unassigned = open.filter((t) => t.status === 'new')
  const waiting = tickets.filter((t) => t.status === 'pending')
  const fixedNotClosed = tickets.filter((t) => t.status === 'resolved')
  const security = content.environment?.directory?.security?.events ?? []
  const breaches = security.filter((e) => e.severity !== 'info')
  const held = assignmentId
    ? disruptionsOf(content, assignmentId).filter((d) => d.state === 'blocked')
    : []
  const byDepartment = new Map<string, number>()
  for (const d of held) {
    const ticket = tickets.find((t) => t.id === d.ticket)
    const dept = ticket?.department ?? 'Unknown'
    byDepartment.set(dept, (byDepartment.get(dept) ?? 0) + 1)
  }
  // What is at stake now: open problems with a business impact, biggest first.
  const atRisk = open
    .filter((t) => t.impact)
    .sort((a, b) => b.impact!.people - a.impact!.people)
  const recent = tickets
    .flatMap((t) => t.activity.map((a) => ({ ...a, ticket: t.id })))
    .sort((a, b) => b.at - a.at)
    .slice(0, 8)

  return (
    <div className="@container h-full overflow-y-auto bg-slate-50" data-testid="overview">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
          <p className="text-sm text-slate-600">
            This queue as it stands: counted from the tickets and the company’s systems.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-5">
          <Stat
            label="Open tickets"
            value={open.length}
            icon="ticket"
            testid="stat-open"
          />
          <Stat
            label="Not assigned"
            value={unassigned.length}
            icon="user"
            tone={unassigned.length ? 'amber' : 'slate'}
            testid="stat-unassigned"
          />
          <Stat
            label="Waiting for the employee"
            value={waiting.length}
            icon="clock"
            tone="blue"
            testid="stat-waiting"
          />
          <Stat
            label="People held up"
            value={held.length}
            icon="alert"
            tone={held.length ? 'red' : 'green'}
            testid="stat-held"
          />
          <Stat
            label="Fixed, not yet closed"
            value={fixedNotClosed.length}
            icon="check"
            tone="green"
            testid="stat-fixed"
          />
        </div>

        {atRisk.length > 0 && (
          <section aria-label="Business impact">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Business impact: what is at stake, biggest first
            </h3>
            <ul
              className="grid gap-2 @2xl:grid-cols-2 @4xl:grid-cols-3"
              data-testid="business-impact"
            >
              {atRisk.map((t) => (
                <li
                  key={t.id}
                  className={`rounded-lg border border-l-4 border-slate-200 bg-white px-3 py-2 text-sm ${t.impact!.people >= 5 ? 'border-l-red-500' : t.impact!.people > 1 ? 'border-l-amber-500' : 'border-l-slate-300'}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-900">
                      {t.impact!.service}
                    </span>
                    <span className="text-xs whitespace-nowrap text-red-700">
                      {t.impact!.people} {t.impact!.people === 1 ? 'person' : 'people'}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-600">
                    {t.department} · {t.id}
                    {t.impact!.deadline && (
                      <span className="font-medium text-amber-800">
                        {' '}
                        · {t.impact!.deadline}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="grid gap-5 @4xl:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-white @4xl:col-span-2">
            <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">
              Tickets
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tickets overview">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2">Ticket</th>
                    <th className="px-4 py-2">Requester</th>
                    <th className="px-4 py-2">Priority</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Checks</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const evaluation = isMonitored(t)
                      ? evaluateTicket(t, content.environment)
                      : null
                    const passing = evaluation
                      ? evaluation.results.length - evaluation.failing.length
                      : null
                    return (
                      <tr
                        key={t.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => onOpenTicket(t.id)}
                            className="text-left"
                          >
                            <span className="block font-mono text-xs text-slate-500">
                              {t.id}
                            </span>
                            <span className="font-medium text-blue-900 hover:underline">
                              {t.subject}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {t.from}
                          <span className="block text-xs text-slate-500">
                            {t.department}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {t.priority ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_INFO[t.priority].color}`}
                            >
                              {t.priority}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {(isMonitored(t) ? LIFECYCLE_NAMES : STATUS_NAMES)[t.status]}
                        </td>
                        <td className="px-4 py-2">
                          {evaluation ? (
                            <span
                              className={
                                evaluation.fixed ? 'text-emerald-700' : 'text-red-700'
                              }
                            >
                              {passing} of {evaluation.results.length} passing
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">n/a</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white">
              <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">
                Department impact
              </h3>
              {byDepartment.size === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-600">Nobody is held up.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm" data-testid="impact">
                  {[...byDepartment].map(([dept, n]) => (
                    <li
                      key={dept}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2"
                    >
                      <span className="text-slate-800">{dept}</span>
                      <span className="font-medium text-red-700">
                        {n} {n === 1 ? 'person' : 'people'} held up
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {security.length > 0 && (
              <section className="rounded-lg border border-slate-200 bg-white">
                <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">
                  <Icon name="shield" className="h-4 w-4" /> Security policy
                </h3>
                <p className="px-4 py-3 text-sm text-slate-700">
                  {security.length} event{security.length === 1 ? '' : 's'} recorded;{' '}
                  <span className={breaches.length ? 'font-medium text-red-700' : ''}>
                    {breaches.length} refused attempt{breaches.length === 1 ? '' : 's'}
                  </span>
                  .
                </p>
              </section>
            )}
            <section className="rounded-lg border border-slate-200 bg-white">
              <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">
                Recent activity
              </h3>
              {recent.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-600">Nothing yet.</p>
              ) : (
                <ol
                  className="space-y-1.5 px-4 py-3 text-sm"
                  aria-label="Recent activity"
                >
                  {recent.map((a, i) => (
                    <li key={i} className="text-slate-700">
                      <span className="mr-1 font-mono text-xs text-slate-500">
                        {a.ticket}
                      </span>
                      {a.text}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
