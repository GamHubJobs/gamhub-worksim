/**
 * The service desk's priority matrix: impact (how many people) against
 * urgency (how badly they are stopped), as in the knowledge base. Clicking
 * a cell sets the ticket's priority.
 */
import type { TicketPriority } from '../../persistence/schemas'
import { PRIORITY_INFO } from './labels'

const IMPACT = [
  'A floor, team or the whole office',
  'Several people',
  'One person',
] as const
const URGENCY = [
  'Cannot work at all',
  'Can keep working (workaround)',
  'A request or question',
] as const

/** Rows: impact; columns: urgency. Matches the desk's priority guide. */
const MATRIX: TicketPriority[][] = [
  ['P1', 'P2', 'P4'],
  ['P2', 'P2', 'P4'],
  ['P2', 'P3', 'P4'],
]

export function PriorityMatrix({
  current,
  onChoose,
}: {
  current: TicketPriority | null
  onChoose?: (priority: TicketPriority) => void
}) {
  return (
    <details
      className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
      data-testid="priority-matrix"
    >
      <summary className="cursor-pointer font-medium text-slate-700">
        Priority guide: impact × urgency
      </summary>
      <table className="mt-2 w-full border-collapse text-center">
        <thead>
          <tr>
            <th className="p-1 text-left font-normal text-slate-500">
              Who is affected ↓ · How badly →
            </th>
            {URGENCY.map((u) => (
              <th key={u} className="p-1 font-medium text-slate-700">
                {u}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {IMPACT.map((impact, row) => (
            <tr key={impact}>
              <th className="p-1 text-left font-medium text-slate-700">{impact}</th>
              {MATRIX[row].map((priority, col) => (
                <td key={col} className="p-1">
                  <button
                    type="button"
                    disabled={!onChoose}
                    onClick={() => onChoose?.(priority)}
                    aria-label={`${impact}, ${URGENCY[col]}: ${priority}`}
                    className={`w-full rounded px-2 py-1 font-semibold ${PRIORITY_INFO[priority].color} ${
                      current === priority ? 'ring-2 ring-blue-600 ring-offset-1' : ''
                    } disabled:cursor-default`}
                  >
                    {priority}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-slate-600">
        Security incidents (phishing, viruses, a lost or stolen device) are always{' '}
        <strong>P1</strong>, whoever is affected. A person blocked counts as “cannot work”
        only if the work is due today.
      </p>
    </details>
  )
}
