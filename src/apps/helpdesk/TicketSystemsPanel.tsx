/**
 * For a ticket tied to the company's systems: who it is with, who and what
 * it affects, what the systems show now (each condition, passing or not),
 * how it was resolved, and its history.
 */
import type {
  Ticket,
  TicketActivityKind,
  TicketEnvironment,
} from '../../persistence/schemas'
import {
  evaluateTicket,
  SYSTEM_NAMES,
  systemOf,
  type ConditionResult,
} from '../../game/incidents'

const KIND_MARK: Partial<Record<TicketActivityKind, string>> = {
  resolved: 'text-emerald-800',
  'condition-ok': 'text-emerald-800',
  'update-sent': 'text-emerald-800',
  'condition-failed': 'text-red-800',
  reopened: 'text-red-800',
  'resolve-rejected': 'text-amber-800',
  verification: 'text-blue-900',
  security: 'font-medium text-red-800',
}

/** What a condition is about, for "Affected systems". */
function subjectOf(result: ConditionResult, environment?: TicketEnvironment): string {
  const c = result.condition
  switch (c.type) {
    case 'device-up':
    case 'service-running':
      return c.device
    case 'can-reach':
      return c.from
    case 'dns-record':
      return `DNS record ${c.name}`
    case 'device-performance':
    case 'disk-free':
    case 'app-working':
    case 'device-service':
    case 'network-standard':
    case 'updates-installed':
    case 'print-queue-clear':
      return c.device
    default: {
      const name = environment?.directory?.users.find((u) => u.id === c.user)?.name
      return `${name ?? c.user}’s account`
    }
  }
}

export function TicketSystemsPanel({
  ticket,
  environment,
  onAssign,
}: {
  ticket: Ticket
  environment: TicketEnvironment | undefined
  onAssign?: () => void
}) {
  const evaluation = evaluateTicket(ticket, environment)
  const systems = [...new Set(ticket.conditions.map((c) => SYSTEM_NAMES[systemOf(c)]))]
  const affected = [...new Set(evaluation.results.map((r) => subjectOf(r, environment)))]
  return (
    <section
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      aria-label="Ticket in the systems"
      data-testid="ticket-systems"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500">Assigned to</dt>
          <dd className="text-slate-900">
            {ticket.assignee === 'you' ? 'You' : 'Nobody yet'}
          </dd>
          <dt className="text-slate-500">Affected employee</dt>
          <dd className="text-slate-900">
            {ticket.from} ({ticket.department})
          </dd>
          <dt className="text-slate-500">Affected systems</dt>
          <dd className="text-slate-900">
            {affected.join(', ')}{' '}
            <span className="text-slate-500">(in {systems.join(' and ')})</span>
          </dd>
        </dl>
        {onAssign && (
          <button
            type="button"
            onClick={onAssign}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Assign to me
          </button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800">
          {evaluation.fixed
            ? 'The systems show it is fixed'
            : `Still preventing resolution (${evaluation.failing.length} of ${evaluation.results.length})`}
        </h3>
        <p className="text-xs text-slate-500">
          Checked in the systems themselves after every change you make. The ticket
          resolves when all of these are working.
        </p>
        <ul className="mt-2 space-y-1" aria-label="Checks in the systems">
          {evaluation.results.map((result, i) => (
            <li
              key={i}
              className={`rounded border px-2.5 py-1.5 text-sm ${
                result.passed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
              data-testid="ticket-condition"
              data-passed={result.passed}
            >
              <span aria-hidden="true">{result.passed ? '✓ ' : '✗ '}</span>
              <span className="font-medium">{result.label}</span>
              <span className="block text-xs">{result.state}</span>
            </li>
          ))}
        </ul>
      </div>

      {ticket.resolution && (
        <div
          className="rounded border border-emerald-300 bg-emerald-50 p-2.5 text-sm text-emerald-900"
          data-testid="ticket-resolution"
        >
          <p className="font-semibold">
            {ticket.resolution.by === 'automatic'
              ? 'Resolved automatically when the systems showed the fix'
              : 'Resolved by you, after the systems confirmed the fix'}
          </p>
          <p>{ticket.resolution.explanation}</p>
        </div>
      )}

      {ticket.activity.length > 0 && (
        <details open className="text-sm">
          <summary className="cursor-pointer font-semibold text-slate-800">
            History ({ticket.activity.length})
          </summary>
          <ol
            className="mt-2 space-y-1 border-l border-slate-200 pl-3"
            aria-label="Ticket history"
          >
            {[...ticket.activity].reverse().map((entry, i) => (
              <li key={i} className={KIND_MARK[entry.kind] ?? 'text-slate-700'}>
                <span className="mr-2 text-xs text-slate-500">
                  {entry.time ||
                    new Date(entry.at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                </span>
                {entry.text}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}
