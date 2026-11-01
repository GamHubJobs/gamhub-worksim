/**
 * Career readiness: the practical assessments of the player's career, their
 * attempts and results, and the work itself (shown like a case).
 */
import { useState } from 'react'
import type { Case } from '../../content/cases/schema'
import {
  attemptDef,
  attemptsOf,
  canStart,
  careerAssessments,
  feedbackOf,
  hasPassed,
  isPassedAttempt,
  openAttempt,
} from '../../game/assessments'
import { careerLevel } from '../../game/career'
import { levelNumber, minutesLeft } from '../../game/cases'
import { formatDuration } from '../../game/clock'
import type { AssessmentAttempt, Profile } from '../../persistence/schemas'
import { CaseDetail } from '../cases/CasesApp'

const shortTitle = (def: Case) => def.title.replace(/^Readiness assessment: /, '')

export function ReadinessApp({
  profile,
  selected,
  onSelect,
  onStart,
  onSave,
  onOpenFile,
  onSubmit,
}: {
  profile: Profile
  /** The assessment shown, if any. */
  selected?: string
  onSelect: (assessmentId: string | undefined) => void
  onStart: (assessmentId: string) => Promise<void>
  onSave: (assessmentId: string, stepId: string, answer: unknown) => void
  onOpenFile: (assessmentId: string, stepId: string) => Promise<void>
  onSubmit: (assessmentId: string) => Promise<void>
}) {
  const { career } = careerLevel(profile)
  const level = levelNumber(profile)
  const assessments = careerAssessments(profile.careerId)
  const chosen = assessments.find((a) => a.id === selected)

  return (
    <div className="flex h-full bg-slate-50" data-testid="readiness">
      <nav
        aria-label="Assessments"
        className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4"
      >
        <h1 className="text-lg font-bold text-slate-900">Career readiness</h1>
        <p className="mt-1 text-xs text-slate-600">
          Practical assessments of the work your level involves. They show what you have
          demonstrated in WorkSim’s simulated workplace; they are not qualifications.
        </p>
        <ul className="mt-4 space-y-2">
          {assessments.map((def) => {
            const status = statusOf(profile, def, level)
            return (
              <li key={def.id}>
                <button
                  type="button"
                  onClick={() => onSelect(def.id)}
                  aria-current={def.id === selected ? 'true' : undefined}
                  className={`w-full rounded-lg border p-3 text-left text-sm hover:bg-slate-50 ${
                    def.id === selected
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200'
                  }`}
                >
                  <span className="block font-medium text-slate-900">
                    {shortTitle(def)}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {career.levels[def.minLevel - 1]?.title} ·{' '}
                    <span data-testid={`status-${def.id}`}>{status}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <main className="min-w-0 flex-1 overflow-y-auto">
        {chosen ? (
          <AssessmentView
            key={chosen.id}
            def={chosen}
            profile={profile}
            level={level}
            onStart={() => onStart(chosen.id)}
            onSave={(stepId, answer) => onSave(chosen.id, stepId, answer)}
            onOpenFile={(stepId) => onOpenFile(chosen.id, stepId)}
            onSubmit={() => onSubmit(chosen.id)}
          />
        ) : (
          <p className="p-8 text-sm text-slate-600">
            Choose an assessment to see what it involves and your attempts.
          </p>
        )}
      </main>
    </div>
  )
}

function statusOf(profile: Profile, def: Case, level: number): string {
  if (hasPassed(profile, def.id)) return 'Passed'
  const open = openAttempt(profile, def.id)
  if (open)
    return `In progress (${formatDuration(Math.max(0, minutesLeft(profile.work, open)))} left)`
  if (level < def.minLevel) return 'Opens at this level'
  return attemptsOf(profile, def.id).length > 0 ? 'Not yet passed' : 'Ready to take'
}

function AssessmentView({
  def,
  profile,
  level,
  onStart,
  onSave,
  onOpenFile,
  onSubmit,
}: {
  def: Case
  profile: Profile
  level: number
  onStart: () => Promise<void>
  onSave: (stepId: string, answer: unknown) => void
  onOpenFile: (stepId: string) => Promise<void>
  onSubmit: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { career } = careerLevel(profile)
  const attempts = attemptsOf(profile, def.id)
  const open = openAttempt(profile, def.id)
  const latest = open ?? attempts.at(-1)
  const check = canStart(profile, def.id, level)
  const next = career.levels[def.minLevel]

  async function start() {
    setBusy(true)
    setError(null)
    try {
      await onStart()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="mx-auto mt-6 max-w-3xl space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">{def.title}</h2>
        <p className="text-sm text-slate-700">{def.summary}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Taken as {career.levels[def.minLevel - 1]?.title}.{' '}
            {next && <>Passing it is needed to be promoted to {next.title}.</>}
          </li>
          <li>
            {def.deadlineHours} hours of office time, from when you start. It includes a
            report written in Docs.
          </li>
          <li>
            You need {def.passScore}% to pass. If you don’t, practise and try again.
          </li>
        </ul>
        {!open && !hasPassed(profile, def.id) && (
          <div className="space-y-2">
            <button
              type="button"
              disabled={!check.ok || busy}
              onClick={() => void start()}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {attempts.length > 0 ? 'Take it again' : 'Start the assessment'}
            </button>
            {!check.ok && <p className="text-xs text-slate-600">{check.reason}</p>}
            {attempts.length > 0 && check.ok && (
              <p className="text-xs text-slate-600">
                A new attempt uses a different version, with different figures.
              </p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </section>

      {attempts.length > 0 && <History attempts={attempts} />}

      {latest?.result && <FeedbackPanel attempt={latest} />}

      {latest && attemptDef(latest) && (
        <CaseDetail
          def={attemptDef(latest)!}
          progress={latest}
          profile={profile}
          assessment
          onSave={onSave}
          onOpenFile={onOpenFile}
          onSubmit={onSubmit}
          onJoin={() => {}}
          onWait={() => {}}
        />
      )}
    </div>
  )
}

function History({ attempts }: { attempts: AssessmentAttempt[] }) {
  return (
    <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">Your attempts</h3>
      <table className="mt-2 w-full text-left text-sm" data-testid="attempts">
        <thead className="text-xs text-slate-500">
          <tr>
            <th scope="col" className="py-1 font-medium">
              Attempt
            </th>
            <th scope="col" className="py-1 font-medium">
              Version
            </th>
            <th scope="col" className="py-1 font-medium">
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr key={a.attempt} className="border-t border-slate-100">
              <th scope="row" className="py-1.5 font-medium">
                {a.attempt}
              </th>
              <td className="py-1.5 uppercase">{a.variant}</td>
              <td className="py-1.5">
                {a.status === 'open'
                  ? 'In progress'
                  : a.status === 'lapsed'
                    ? 'Ran out of time'
                    : `${a.result?.score}%: ${isPassedAttempt(a) ? 'passed' : 'not yet passed'}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/** Strengths and areas to improve, from the marks of each part of the work. */
function FeedbackPanel({ attempt }: { attempt: AssessmentAttempt }) {
  const { strengths, improvements } = feedbackOf(attempt.result!.steps)
  return (
    <section
      className="mx-auto max-w-3xl space-y-3 rounded-xl border border-slate-200 bg-white p-5"
      data-testid="assessment-feedback"
    >
      <h3 className="font-semibold text-slate-900">What this attempt shows</h3>
      <div>
        <h4 className="text-sm font-medium text-emerald-800">Strengths</h4>
        {strengths.length > 0 ? (
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            None of the parts reached 80% this time.
          </p>
        )}
      </div>
      <div>
        <h4 className="text-sm font-medium text-amber-800">To work on</h4>
        {improvements.length > 0 ? (
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {improvements.map((i) => (
              <li key={i.step}>
                <span className="font-medium">{i.step}:</span> {i.note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Nothing below 60%. Well done.</p>
        )}
      </div>
      {!isPassedAttempt(attempt) && (
        <p className="text-sm text-slate-700">
          To practise: read the feedback on each step below, look again at the tasks of
          your level that use the same skills, then take the assessment again.
        </p>
      )}
    </section>
  )
}
