/**
 * IT operations readiness: the competencies the player has demonstrated (from
 * passed work only), their service record from their own ticket queues, and
 * the career completion record. A record of what was done in WorkSim, not a
 * certification or a promise of employment.
 */
import { useEffect, useState } from 'react'
import { getAssignment } from '../../content/assignments'
import { hasPassed } from '../../game/assessments'
import { careerAssignments } from '../../game/career'
import { levelNumber } from '../../game/cases'
import { absoluteTime } from '../../game/clock'
import {
  IT_LEVEL_NAMES,
  itCareerComplete,
  itCompetencies,
  type ItCompetencyLevel,
} from '../../game/itCompetencies'
import { serviceReport, type QueueForReport } from '../../game/serviceReport'
import { formatMinutes } from '../../game/sla'
import { getDocument } from '../../persistence/documentsRepo'
import type { Profile } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'

const TONE: Record<ItCompetencyLevel, string> = {
  'not-yet': 'bg-slate-100 text-slate-700',
  demonstrated: 'bg-blue-100 text-blue-900',
  practised: 'bg-teal-100 text-teal-900',
  proficient: 'bg-emerald-100 text-emerald-900',
}

/** The player's Help Desk queues, as saved. */
function useQueues(profile: Profile): QueueForReport[] | null {
  const [queues, setQueues] = useState<QueueForReport[] | null>(null)
  useEffect(() => {
    let cancelled = false
    const items = Object.values(profile.assignments)
      .filter((p) => getAssignment(p.assignmentId)?.kind === 'tickets')
      .map((p) => ({ id: p.documentId, title: getAssignment(p.assignmentId)!.title }))
    void Promise.all(
      items.map(async (i) => ({ ...i, doc: await getDocument(i.id) })),
    ).then((docs) => {
      if (!cancelled)
        setQueues(
          docs.flatMap((d) =>
            d.doc?.kind === 'tickets' ? [{ title: d.title, content: d.doc.content }] : [],
          ),
        )
    })
    return () => {
      cancelled = true
    }
  }, [profile])
  return queues
}

export function ItCompetencyTable({ profile }: { profile: Profile }) {
  const list = itCompetencies(profile)
  return (
    <ul
      className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white"
      data-testid="it-competencies"
    >
      {list.map((c) => (
        <li
          key={c.def.id}
          className="px-4 py-3 text-sm"
          data-testid="it-competency"
          data-level={c.level}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-slate-900">{c.def.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[c.level]}`}
            >
              {IT_LEVEL_NAMES[c.level]}
            </span>
          </div>
          <p className="text-slate-600">{c.def.description}</p>
          <p className="mt-1 text-xs text-slate-500">{c.reason}</p>
          {c.evidence.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {c.evidence.map((e) => (
                <li
                  key={e.task}
                  className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700"
                >
                  {e.title} · {e.score}%{e.independent ? ' · no hints' : ''}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

export function ItReadiness({ profile }: { profile: Profile }) {
  const queues = useQueues(profile)
  const now = absoluteTime(profile.work.day, profile.work.minute)
  const report = queues ? serviceReport(queues, now) : null
  const tasks = careerAssignments('it-support').map((a) => a.id)
  const completion = itCareerComplete(profile, tasks, hasPassed(profile, 'ready-it-lead'))
  const competencies = itCompetencies(profile)
  const shown = competencies.filter((c) => c.level !== 'not-yet').length

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6" data-testid="it-readiness">
      <header>
        <h2 className="text-xl font-bold text-slate-900">IT operations readiness</h2>
        <p className="text-sm text-slate-600">
          What you have shown you can do as IT support, from your passed work only. Work
          done without hints counts as stronger evidence. This is a record of work in
          WorkSim’s simulated workplace: it is not a professional certification, and it
          does not promise employment.
        </p>
      </header>

      <section
        className={`rounded-xl border p-5 ${completion.complete ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}
        data-testid="completion-record"
        data-complete={completion.complete}
      >
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Icon name={completion.complete ? 'career' : 'clock'} className="h-5 w-5" />
          {completion.complete ? 'IT career completed' : 'IT career completion'}
        </h3>
        <p className="mt-1 text-sm text-slate-700">
          {completion.complete
            ? `${profile.name} completed all ${completion.total} IT support tasks and the final readiness assessment, demonstrating ${shown} of ${competencies.length} IT operations competencies in GamHub WorkSim.`
            : `${completion.passed} of ${completion.total} tasks passed${hasPassed(profile, 'ready-it-lead') ? ', final assessment passed' : levelNumber(profile) >= 4 ? '; the final readiness assessment is ready to take' : '; the final readiness assessment opens at Service Desk Lead'}. ${shown} of ${competencies.length} competencies shown so far.`}
        </p>
        {completion.complete && (
          <p className="mt-2 text-xs text-slate-600">
            A record of demonstrated work in a simulation, not a qualification or
            certification.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-slate-900">Service record</h3>
        {!report ? (
          <p className="text-sm text-slate-600">Loading your ticket queues…</p>
        ) : report.received === 0 ? (
          <p className="text-sm text-slate-600">No tickets handled yet.</p>
        ) : (
          <dl
            className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"
            data-testid="service-record"
          >
            {(
              [
                ['Tickets handled', String(report.received)],
                ['Resolved', String(report.resolved)],
                ['Overdue (SLA)', String(report.overdue)],
                [
                  'First-contact resolution',
                  report.firstContact === null
                    ? 'n/a'
                    : `${Math.round(report.firstContact * 100)}%`,
                ],
                [
                  'Average resolution',
                  report.averageResolution === null
                    ? 'n/a'
                    : formatMinutes(report.averageResolution),
                ],
                ['Reopened', String(report.reopened)],
                [
                  'Calls (communication)',
                  report.communication === null ? 'n/a' : `${report.communication}%`,
                ],
                [
                  'Satisfaction (estimate)',
                  report.satisfaction === null ? 'n/a' : `${report.satisfaction} / 5`,
                ],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <dt className="text-xs text-slate-600">{label}</dt>
                <dd className="text-lg font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-slate-900">
          Competencies ({shown} of {competencies.length} shown)
        </h3>
        <ItCompetencyTable profile={profile} />
      </section>
    </div>
  )
}
