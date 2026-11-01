/**
 * The Cases app: the player's work queue of real workplace business, from
 * clients, colleagues, suppliers and other departments. Each case has the
 * evidence to examine, the steps to complete and a deadline in office time.
 * Answered cases show every step's result with the reasons.
 */
import { Fragment, useState } from 'react'
import { getCase } from '../../content/cases'
import { CASE_KIND_NAMES, type Case } from '../../content/cases/schema'
import { getOrgDepartment, INDICATORS } from '../../content/organisation'
import {
  caseContext,
  meetingStart,
  meetingStatus,
  minutesLeft,
  minutesToMeeting,
} from '../../game/cases'
import { formatDuration, formatTime, splitTime } from '../../game/clock'
import type { CaseProgress, Profile } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'
import { RichText } from '../../ui/RichText'
import { StepForm } from './CaseSteps'

function timeLeft(minutes: number): string {
  if (minutes < 0) return 'Overdue'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h} h ${m} min left` : `${m} min left`
}

const STATUS = {
  open: { label: 'Open', className: 'bg-amber-100 text-amber-800' },
  submitted: { label: 'Answered', className: 'bg-emerald-100 text-emerald-800' },
  lapsed: { label: 'Missed', className: 'bg-red-100 text-red-800' },
} as const

export function CasesApp({
  profile,
  caseId,
  onOpen,
  onSave,
  onOpenFile,
  onSubmit,
  onJoin,
  onWait,
}: {
  profile: Profile
  caseId: string | undefined
  onOpen: (caseId: string) => void
  onSave: (caseId: string, stepId: string, answer: unknown) => void
  /** Creates (if needed) and opens the file of a document step. */
  onOpenFile: (caseId: string, stepId: string) => Promise<void>
  onSubmit: (caseId: string) => Promise<void>
  /** Joins the meeting of a meeting case. */
  onJoin: (caseId: string) => void
  /** Passes office time (to wait for a meeting). */
  onWait: (minutes: number) => void
}) {
  const all = Object.values(profile.work.cases)
    .map((progress) => ({ progress, def: getCase(progress.caseId) }))
    .filter((c): c is { progress: CaseProgress; def: Case } => !!c.def)
    .sort(
      (a, b) =>
        Number(b.progress.status === 'open') - Number(a.progress.status === 'open') ||
        b.progress.arrivedAt - a.progress.arrivedAt,
    )
  const selected = all.find((c) => c.progress.caseId === caseId) ?? all[0]
  const indicators = profile.work.org.indicators

  return (
    <div className="flex h-full min-h-0" data-testid="cases-app">
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h1 className="font-semibold text-slate-900">Cases</h1>
          <dl
            className="mt-2 grid grid-cols-3 gap-1 text-center"
            aria-label="Organisation indicators"
          >
            {INDICATORS.map((i) => (
              <div
                key={i.id}
                title={i.description}
                className="rounded bg-slate-50 px-1 py-1"
              >
                <dt className="text-[10px] leading-tight text-slate-500">{i.name}</dt>
                <dd
                  className="text-sm font-semibold text-slate-800"
                  data-testid={`indicator-${i.id}`}
                >
                  {indicators[i.id]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Cases">
          {all.length === 0 && (
            <li className="p-4 text-sm text-slate-500">
              Requests from clients, colleagues and other departments arrive here as your
              career progresses.
            </li>
          )}
          {all.map(({ progress, def }) => (
            <li key={def.id}>
              <button
                type="button"
                onClick={() => onOpen(def.id)}
                aria-current={selected?.def.id === def.id}
                className={`w-full border-b border-slate-100 px-4 py-3 text-left ${
                  selected?.def.id === def.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className="block font-medium text-slate-900">{def.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${STATUS[progress.status].className}`}
                  >
                    {STATUS[progress.status].label}
                  </span>
                  <span className="text-slate-500">{CASE_KIND_NAMES[def.kind]}</span>
                  {progress.status === 'open' && (
                    <span className="text-slate-500">
                      {timeLeft(minutesLeft(profile.work, progress))}
                    </span>
                  )}
                  {progress.result && (
                    <span className="text-slate-500">{progress.result.score}%</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto bg-slate-50">
        {selected && (
          <CaseDetail
            key={selected.def.id}
            def={selected.def}
            progress={selected.progress}
            profile={profile}
            onSave={(stepId, answer) => onSave(selected.def.id, stepId, answer)}
            onOpenFile={(stepId) => onOpenFile(selected.def.id, stepId)}
            onSubmit={() => onSubmit(selected.def.id)}
            onJoin={() => onJoin(selected.def.id)}
            onWait={onWait}
          />
        )}
      </div>
    </div>
  )
}

function CaseDetail({
  def,
  progress,
  profile,
  onSave,
  onOpenFile,
  onSubmit,
  onJoin,
  onWait,
}: {
  def: Case
  progress: CaseProgress
  profile: Profile
  onSave: (stepId: string, answer: unknown) => void
  onOpenFile: (stepId: string) => Promise<void>
  onSubmit: () => Promise<void>
  onJoin: () => void
  onWait: (minutes: number) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const open = progress.status === 'open'
  const result = progress.result
  /** Meeting and follow-up steps open once the player has joined the meeting. */
  const locked = (step: Case['steps'][number]) =>
    !!def.meeting && step.phase !== 'prepare' && progress.joinedAt === undefined

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <article className="mx-auto max-w-3xl space-y-5 p-6" data-testid="case-detail">
      <header className="space-y-1">
        <p className="text-sm text-slate-500">
          {CASE_KIND_NAMES[def.kind]} · from {def.from.name}, {def.from.role},{' '}
          {def.from.organisation}
        </p>
        <h2 className="text-2xl font-bold text-slate-900">{def.title}</h2>
        <p className="text-slate-700">{def.summary}</p>
        {open && (
          <p
            className="flex items-center gap-1 text-sm text-slate-600"
            data-testid="case-deadline"
          >
            <Icon name="clock" className="h-4 w-4" />{' '}
            {timeLeft(minutesLeft(profile.work, progress))} (office time)
          </p>
        )}
      </header>

      {progress.status === 'lapsed' && (
        <p role="status" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          This case passed its deadline before it was answered. {def.lapseLog}
        </p>
      )}

      {result && (
        <section
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
          data-testid="case-result"
        >
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold text-slate-900">Result</h3>
            <span className="text-2xl font-bold" data-testid="case-score">
              {result.score}%
            </span>
          </div>
          <ul className="space-y-3">
            {result.steps.map((s) => {
              const step = def.steps.find((x) => x.id === s.id)
              return (
                <li key={s.id} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-slate-900">{s.title}</span>
                    <span
                      className={
                        s.earned >= s.points ? 'text-emerald-700' : 'text-amber-700'
                      }
                    >
                      {s.earned}/{s.points}
                    </span>
                  </div>
                  {s.notes.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                      {s.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {step?.kind === 'reply' && (
                    <details className="mt-1 text-slate-600">
                      <summary className="cursor-pointer">
                        An example of a good reply
                      </summary>
                      <p className="mt-1 whitespace-pre-wrap">
                        {step.model.replaceAll('{name}', profile.name.split(' ')[0])}
                      </p>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-slate-500">
            {def.from.name}’s reply is in your Mail.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Why it matters</h3>
        <p className="mt-1 text-sm text-slate-700">{def.whyItMatters}</p>
      </section>

      {open && <AuthorityPanel def={def} profile={profile} />}

      {def.evidence.length > 0 && (
        <section className="space-y-3" aria-label="Evidence">
          <h3 className="font-semibold text-slate-900">Evidence</h3>
          {def.evidence.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
            >
              <h4 className="font-medium text-slate-900">{e.title}</h4>
              {e.text && <RichText text={e.text} className="mt-1 text-slate-700" />}
              {e.table && (
                <table className="mt-2 w-full text-left">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      {e.table.head.map((h) => (
                        <th key={h} className="py-1 pr-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {e.table.rows.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {row.map((cell, j) => (
                          <td key={j} className="py-1 pr-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>
      )}

      <ol className="space-y-4">
        {def.steps.map((step, i) => (
          <Fragment key={step.id}>
            {def.meeting &&
              step.phase === 'meeting' &&
              def.steps.findIndex((s) => s.phase === 'meeting') === i && (
                <MeetingPanel
                  def={def}
                  progress={progress}
                  profile={profile}
                  onJoin={onJoin}
                  onWait={onWait}
                />
              )}
            <li
              key={step.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
              data-testid={`step-${step.id}`}
            >
              <h3 className="font-semibold text-slate-900">
                {i + 1}. {step.title}
              </h3>
              <p className="mt-1 mb-3 text-sm text-slate-700">{step.prompt}</p>
              {locked(step) && (
                <p className="mb-2 text-xs text-slate-500">
                  {step.phase === 'meeting'
                    ? 'Opens when you join the meeting.'
                    : 'Opens after the meeting.'}
                </p>
              )}
              <StepForm
                step={step}
                answer={progress.answers[step.id]}
                disabled={!open || busy || locked(step)}
                fileOpened={!!progress.files[step.id]}
                onSave={(answer) => onSave(step.id, answer)}
                onOpenFile={() => void run(() => onOpenFile(step.id))}
              />
            </li>
          </Fragment>
        ))}
      </ol>

      {open && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
          {confirming ? (
            <>
              <p className="text-sm text-slate-700">
                Send your answer to {def.from.name}? A case is answered once, like a real
                email: you can’t change it afterwards.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(onSubmit)}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {busy ? 'Sending…' : 'Send my answer'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-md px-4 py-2 text-sm hover:bg-slate-100"
                >
                  Keep working
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              Submit to {def.from.name}
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </article>
  )
}

/** For cases with approvals: the player's limit and what each department has left. */
function AuthorityPanel({ def, profile }: { def: Case; profile: Profile }) {
  const departments = [
    ...new Set(
      def.steps.flatMap((s) =>
        s.kind === 'approve' ? s.requests.map((r) => r.department) : [],
      ),
    ),
  ]
  if (departments.length === 0) return null
  const context = caseContext(profile)
  const money = (n: number) => `£${Math.max(0, n).toLocaleString('en-GB')}`
  return (
    <section
      className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm"
      aria-label="Your authority and budgets"
      data-testid="authority"
    >
      <h3 className="font-semibold text-slate-900">Your authority and budgets</h3>
      <p className="mt-1 text-slate-700">
        You can approve up to <strong>{money(context.limit)}</strong> on your own.
        {context.limit === 0 &&
          ' At your level, every request goes to the budget holder.'}
      </p>
      <ul className="mt-2 space-y-0.5 text-slate-700">
        {departments.map((id) => (
          <li key={id}>
            {getOrgDepartment(id)?.name ?? id}: {money(context.remaining(id))} left this
            quarter
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The meeting of a meeting case: when and where, and joining it. */
function MeetingPanel({
  def,
  progress,
  profile,
  onJoin,
  onWait,
}: {
  def: Case
  progress: CaseProgress
  profile: Profile
  onJoin: () => void
  onWait: (minutes: number) => void
}) {
  const meeting = def.meeting!
  const status = meetingStatus(profile.work, def, progress)
  const start = splitTime(meetingStart(def, progress)!)
  const wait = minutesToMeeting(profile.work, def, progress)
  const button =
    'rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800'
  return (
    <li
      className="rounded-xl border border-violet-200 bg-violet-50 p-5 text-sm"
      data-testid="meeting-panel"
      aria-label="The meeting"
    >
      <h3 className="font-semibold text-violet-900">{meeting.title}</h3>
      <p className="text-slate-700">
        {meeting.room} · {formatTime(start.minute)}
        {start.day !== profile.work.day ? ` on day ${start.day}` : ''} ·{' '}
        {formatDuration(meeting.minutes)}
      </p>
      {status === 'upcoming' && progress.status === 'open' && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-slate-700">Starts in {formatDuration(wait)}.</span>
          <button type="button" className={button} onClick={() => onWait(wait)}>
            Work until the meeting starts
          </button>
        </div>
      )}
      {status === 'open' && progress.status === 'open' && (
        <button type="button" className={`${button} mt-2`} onClick={onJoin}>
          Join the meeting
        </button>
      )}
      {status === 'attended' && (
        <p className="mt-1 text-emerald-800">You attended this meeting.</p>
      )}
      {status === 'missed' && (
        <p className="mt-1 text-red-800">
          You missed this meeting: it went ahead without you.
        </p>
      )}
    </li>
  )
}
