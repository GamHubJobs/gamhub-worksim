/**
 * The career progress report for a career save: where the player stands, what
 * they have shown, what to improve and what to do next, each with its reason.
 */
import { useMemo, useState } from 'react'
import { COMPETENCY_LEVEL_NAMES } from '../../game/competencies'
import { toolName } from '../../game/portfolio'
import {
  HONESTY_STATEMENT,
  progressReport,
  type Recommendation,
} from '../../game/progressReport'
import { formatDateTime } from '../../lib/time'
import type { PortfolioItem, Profile } from '../../persistence/schemas'

export function ProgressReportView({
  profile,
  items,
  isActive,
  onAct,
}: {
  profile: Profile
  /** All portfolio items (the report takes this save's own). */
  items: PortfolioItem[]
  /** Recommendations can be acted on only in the career save in use. */
  isActive: boolean
  onAct: (action: NonNullable<Recommendation['action']>) => void
}) {
  const [preparedAt] = useState(() => Date.now())
  const report = useMemo(() => progressReport(profile, items), [profile, items])

  return (
    <article
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-6"
      data-testid="progress-report"
      aria-label={`Progress report: ${report.name}, ${report.careerName}`}
    >
      <header>
        <p className="text-sm text-slate-500">Career progress report</p>
        <h2 className="text-xl font-bold text-slate-900">
          {report.name} · {report.careerName}
        </h2>
        <p className="text-sm text-slate-600">
          {report.levelTitle} (level {report.levelNumber} of {report.levels}) · prepared{' '}
          {formatDateTime(preparedAt)}
        </p>
        <p className="mt-3 text-slate-800" data-testid="report-summary">
          {report.summary}
        </p>
      </header>

      <section>
        <h3 className="font-semibold text-slate-900">Recommended next steps</h3>
        {report.recommendations.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">
            You have completed everything available in this career. Well done.
          </p>
        ) : (
          <ol className="mt-2 space-y-2" data-testid="recommendations">
            {report.recommendations.map((r) => (
              <li key={r.title} className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{r.title}</p>
                    <p className="text-slate-600">Why: {r.reason}</p>
                  </div>
                  {r.action && isActive && (
                    <button
                      type="button"
                      onClick={() => onAct(r.action!)}
                      className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100"
                    >
                      {r.action.kind === 'task'
                        ? 'Open task'
                        : r.action.kind === 'readiness'
                          ? 'Open assessment'
                          : 'Open tool'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="font-semibold text-slate-900">Strongest competencies</h3>
        {report.strongest.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">
            None at Practised or above yet. A skill reaches Practised after two passed
            tasks that train it.
          </p>
        ) : (
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {report.strongest.map((s) => (
              <li key={s.skillId}>
                <strong>{s.name}</strong> ({COMPETENCY_LEVEL_NAMES[s.level]}):{' '}
                {s.reasons[0]}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-semibold text-slate-900">All competencies</h3>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1 font-medium">Skill</th>
              <th className="py-1 font-medium">Level</th>
              <th className="py-1 font-medium">Passed tasks where it is a main skill</th>
            </tr>
          </thead>
          <tbody>
            {report.competencies.map((s) => (
              <tr key={s.skillId} className="border-t border-slate-100">
                <td className="py-1">{s.name}</td>
                <td className="py-1">{COMPETENCY_LEVEL_NAMES[s.level]}</td>
                <td className="py-1">
                  {s.evidence.filter((e) => e.counts).length}
                  {s.evidence.some((e) => !e.counts) &&
                    ` (+${s.evidence.filter((e) => !e.counts).length} as a smaller part)`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="font-semibold text-slate-900">Areas to improve</h3>
        {report.improvements.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">
            Your latest attempts passed every check.
          </p>
        ) : (
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {report.improvements.map((area) => (
              <li key={area.assignmentId}>
                <strong>{area.taskTitle}</strong>
                {area.needsRevision && ' (not passed yet)'}
                {area.checks.length > 0 &&
                  `: ${area.checks
                    .map(
                      (c) =>
                        `“${c.title}” ${c.status === 'partial' ? 'partly done' : 'not done'}`,
                    )
                    .join('; ')}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold text-slate-900">Experience</h3>
          <ul className="mt-1 text-sm text-slate-700">
            <li>{report.experience.tasksCompleted} tasks passed</li>
            {report.experience.projectsCompleted > 0 && (
              <li>{report.experience.projectsCompleted} integrated projects completed</li>
            )}
            <li>{report.experience.attempts} attempts in total</li>
            <li>
              Tools:{' '}
              {Object.keys(report.experience.tools).map(toolName).join(', ') ||
                'none yet'}
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Weekly reviews</h3>
          {report.reviews.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">
              No review yet (they happen on Fridays).
            </p>
          ) : (
            <ul className="mt-1 text-sm text-slate-700">
              {report.reviews.map((r) => (
                <li key={r.week}>
                  Week {r.week}: {r.rating}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section data-testid="report-workplace">
        <h3 className="font-semibold text-slate-900">Simulated workplace experience</h3>
        {report.workplace.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">
            No cases handled yet: clients, budgets, meetings and leadership appear here as
            they happen.
          </p>
        ) : (
          <dl className="mt-2 space-y-2 text-sm">
            {report.workplace.map((stat) => (
              <div key={stat.label} className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-slate-700">{stat.label}</dt>
                <dd className="font-medium text-slate-900">{stat.value}</dd>
                <dd className="w-full text-xs text-slate-500">{stat.source}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div data-testid="report-readiness">
          <h3 className="font-semibold text-slate-900">Readiness assessments</h3>
          {report.readiness.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">The first one opens at level 2.</p>
          ) : (
            <ul className="mt-1 text-sm text-slate-700">
              {report.readiness.map((r) => (
                <li key={r.title}>
                  {r.title} ({r.levelTitle}): {r.result}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div data-testid="report-achievements">
          <h3 className="font-semibold text-slate-900">Achievements</h3>
          {report.achievements.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">None earned yet.</p>
          ) : (
            <ul className="mt-1 text-sm text-slate-700">
              {report.achievements.map((a) => (
                <li key={a.title}>
                  {a.title} (day {a.day}): {a.how}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        {HONESTY_STATEMENT}
      </p>
    </article>
  )
}
