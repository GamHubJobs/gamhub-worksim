/**
 * Verifying the person behind a ticket before their account is changed:
 * which account, what they ask for, the identity checks (against the
 * directory's own records), and any approval the policy needs. The checks
 * run in the Directory itself (tools/directory/security.ts): this panel only
 * asks for them, and the Directory refuses any change they do not cover.
 */
import { useState } from 'react'
import { applyEnvironmentChange, type Moment } from '../../game/incidents'
import type { Ticket, TicketsContent } from '../../persistence/schemas'
import {
  answerOf,
  askFor,
  callBack,
  checkAnswer,
  isGroupOperation,
  METHOD_NAMES,
  OPERATION_NAMES,
  requestApproval,
  requestFor,
  sessionForTicket,
  startVerification,
  viewSession,
  type Outcome,
  type SessionView,
} from '../../tools/directory/security'
import {
  OPERATIONS,
  type DirectoryState,
  type Operation,
  type VerificationSession,
} from '../../tools/directory/schema'

const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-40'

type Phase =
  | 'required'
  | 'in-progress'
  | 'failed'
  | 'expired'
  | 'needs-approval'
  | 'denied'
  | 'permitted'
  | 'done'

const PHASES: Record<Phase, { text: string; tone: string }> = {
  required: { text: 'Verification required', tone: 'bg-amber-100 text-amber-900' },
  'in-progress': { text: 'Verification in progress', tone: 'bg-blue-100 text-blue-900' },
  failed: { text: 'Verification failed', tone: 'bg-red-100 text-red-900' },
  expired: { text: 'Verification expired', tone: 'bg-slate-200 text-slate-800' },
  'needs-approval': {
    text: 'Identity verified: approval needed',
    tone: 'bg-amber-100 text-amber-900',
  },
  denied: { text: 'Authorisation denied', tone: 'bg-red-100 text-red-900' },
  permitted: { text: 'Operation permitted', tone: 'bg-emerald-100 text-emerald-900' },
  done: { text: 'Verified: change made', tone: 'bg-emerald-100 text-emerald-900' },
}

function phaseOf(
  session: VerificationSession | undefined,
  view: SessionView | null,
): Phase {
  if (!session || !view) return 'required'
  if (view.status === 'failed') return 'failed'
  if (view.status === 'complete') return 'done'
  if (view.status === 'expired') return 'expired'
  if (view.identity === 'verified') {
    if (view.authorised) return 'permitted'
    const lastApproval = session.steps.findLast((s) => s.method === 'approval')
    return view.approvalMissing || (lastApproval && !lastApproval.passed)
      ? 'denied'
      : 'needs-approval'
  }
  return 'in-progress'
}

const clock = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function VerificationPanel({
  ticket,
  content,
  editable,
  onUpdate,
  moment,
}: {
  ticket: Ticket
  content: TicketsContent
  editable: boolean
  onUpdate?: (change: (content: TicketsContent) => TicketsContent) => void
  moment: () => Moment
}) {
  const [account, setAccount] = useState('')
  const [operations, setOperations] = useState<Operation[]>([])
  const [group, setGroup] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [approver, setApprover] = useState('')
  const [feedback, setFeedback] = useState<{ problems: string[]; message?: string }>({
    problems: [],
  })
  const directory = content.environment?.directory
  const request = directory ? requestFor(directory, ticket.id) : undefined
  if (!directory?.security || !request) return null
  const security = directory.security

  const session = sessionForTicket(directory, ticket.id)
  const view = session ? viewSession(directory, session) : null
  const phase = phaseOf(session, view)
  const live = !!session && view?.status === 'active'
  const subject = session ? directory.users.find((u) => u.id === session.user) : undefined
  const requester = ticket.from.split(' ')[0]

  /** Runs a verification step in the Directory; the tickets see it like any change. */
  const run = (step: (state: DirectoryState, at: number) => Outcome) => {
    if (!editable) return
    const when = moment()
    const preview = step(directory, when.at)
    setFeedback({ problems: preview.problems, message: preview.message })
    if (preview.state === directory) return
    onUpdate?.((latest) =>
      applyEnvironmentChange(latest, 'directory', (d) => step(d, when.at).state, when),
    )
  }

  const people = [...directory.users].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <section
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
      aria-label="Identity verification"
      data-testid="verification-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800">Identity verification</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PHASES[phase].tone}`}
          data-testid="verification-status"
          data-state={phase}
        >
          {PHASES[phase].text}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Before changing an account, confirm the person is who they say they are, and that
        the change is allowed. The Directory refuses changes that are not verified, and
        records the attempt.
      </p>

      {feedback.problems.length > 0 && (
        <ul
          role="alert"
          className="list-disc rounded-md bg-red-50 p-2.5 pl-6 text-red-800"
          data-testid="verification-problem"
        >
          {feedback.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {feedback.message && (
        <p role="status" className="rounded-md bg-amber-50 p-2.5 text-amber-900">
          {feedback.message}
        </p>
      )}

      {!live && editable && (
        <form
          className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
          aria-label="Start a verification"
          onSubmit={(e) => {
            e.preventDefault()
            run((d, at) =>
              startVerification(
                d,
                { ticket: ticket.id, user: account, operations, group },
                at,
              ),
            )
          }}
        >
          <p className="font-medium text-slate-800">
            {session ? 'Start a new verification' : `Verify ${requester}`}
          </p>
          <label className="flex flex-col gap-1">
            Their account
            <select
              aria-label="Account to verify"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1"
            >
              <option value="">Find the account in the directory…</option>
              {people.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.username}) · {u.title}, {u.department}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-1">The change they are asking for</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {OPERATIONS.map((op) => (
                <label key={op} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={operations.includes(op)}
                    onChange={(e) =>
                      setOperations((ops) =>
                        e.target.checked ? [...ops, op] : ops.filter((o) => o !== op),
                      )
                    }
                  />
                  {OPERATION_NAMES[op]}
                </label>
              ))}
            </div>
          </fieldset>
          {operations.some(isGroupOperation) && (
            <label className="flex flex-col gap-1">
              Group
              <select
                aria-label="Group for the change"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1"
              >
                <option value="">Choose…</option>
                {directory.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                    {g.privileged ? ' (privileged)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" className={PRIMARY}>
            Start verification
          </button>
        </form>
      )}

      {session && view && (
        <div className="space-y-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-slate-500">Verification</dt>
            <dd>
              {session.id} · {subject?.name ?? session.user}
              {subject ? ` (${subject.username})` : ''}
            </dd>
            <dt className="text-slate-500">Covers</dt>
            <dd>
              {session.operations.map((op) => OPERATION_NAMES[op]).join(', ')}
              {session.group &&
                ` (${directory.groups.find((g) => g.id === session.group)?.name ?? session.group})`}
            </dd>
            <dt className="text-slate-500">Identity</dt>
            <dd data-testid="verification-identity">
              {view.identity === 'verified'
                ? `Verified (${view.factorsDone} of ${view.factorsNeeded} check${view.factorsNeeded === 1 ? '' : 's'})`
                : view.identity === 'failed'
                  ? 'Not verified: too many wrong answers'
                  : `Not verified yet (${view.factorsDone} of ${view.factorsNeeded} check${view.factorsNeeded === 1 ? '' : 's'})`}
            </dd>
            <dt className="text-slate-500">Authorisation</dt>
            <dd data-testid="verification-authorisation">
              {view.approved.length > 0
                ? `Approved by ${view.approved.map((id) => directory.users.find((u) => u.id === id)?.name ?? id).join(', ')}`
                : view.approvalMissing
                  ? 'Needed, but nobody on record can give it: escalate'
                  : view.approvalsNeeded.length
                    ? `Needs approval from ${view.approvalsNeeded.map((id) => directory.users.find((u) => u.id === id)?.name ?? id).join(', ')}`
                    : 'No approval needed'}
            </dd>
            <dt className="text-slate-500">
              {view.status === 'expired' ? 'Expired' : 'Expires'}
            </dt>
            <dd>{clock(session.expiresAt)}</dd>
          </dl>

          {live && editable && (
            <div className="space-y-2 rounded-md border border-slate-200 p-3">
              {security.methods
                .filter((m) => m !== 'callback')
                .map((method) => {
                  const m = method as 'employee-id' | 'badge'
                  const asked = session.asked.includes(m)
                  return (
                    <div key={m} className="space-y-1" data-testid={`check-${m}`}>
                      <p className="font-medium text-slate-800">{METHOD_NAMES[m]}</p>
                      {asked ? (
                        <p className="text-slate-700" data-testid={`answer-${m}`}>
                          {requester}: {answerOf(directory, session, m)}
                        </p>
                      ) : (
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() => run((d, at) => askFor(d, session.id, m, at))}
                        >
                          Ask {requester} for their{' '}
                          {m === 'badge' ? 'badge number' : 'employee number'}
                        </button>
                      )}
                      <div className="flex gap-2">
                        <input
                          aria-label={`${METHOD_NAMES[m]} given`}
                          placeholder="What they gave you"
                          value={answers[m] ?? ''}
                          onChange={(e) =>
                            setAnswers((a) => ({ ...a, [m]: e.target.value }))
                          }
                          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 font-mono"
                        />
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() =>
                            run((d, at) =>
                              checkAnswer(d, session.id, m, answers[m] ?? '', at),
                            )
                          }
                        >
                          Check against the record
                        </button>
                      </div>
                    </div>
                  )
                })}
              {security.methods.includes('callback') && (
                <div className="space-y-1">
                  <p className="font-medium text-slate-800">{METHOD_NAMES.callback}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={BUTTON}
                      onClick={() =>
                        run((d, at) => callBack(d, session.id, 'record', at))
                      }
                    >
                      Call the extension on record
                      {subject?.extension ? ` (${subject.extension})` : ''}
                    </button>
                    {request.offers && (
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() =>
                          run((d, at) => callBack(d, session.id, 'given', at))
                        }
                      >
                        Call the number {requester} gave ({request.offers})
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <p className="font-medium text-slate-800">Approval</p>
                <div className="flex gap-2">
                  <select
                    aria-label="Ask for approval from"
                    value={approver}
                    onChange={(e) => setApprover(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1"
                  >
                    <option value="">Who can approve it?</option>
                    {people
                      .filter((u) => u.id !== session.user && u.status === 'active')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} · {u.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className={BUTTON}
                    disabled={!approver}
                    onClick={() =>
                      run((d, at) => requestApproval(d, session.id, approver, at))
                    }
                  >
                    Ask for approval
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'permitted' && (
            <p
              className="rounded-md bg-emerald-50 p-2.5 text-emerald-900"
              data-testid="verification-permitted"
            >
              {subject?.name ?? 'The account'} is verified for{' '}
              {session.operations
                .filter((op) => !session.done.includes(op))
                .map((op) => OPERATION_NAMES[op])
                .join(', ')}
              . Make the change in the Directory tab before {clock(session.expiresAt)}.
            </p>
          )}

          {session.steps.length > 0 && (
            <ol
              className="space-y-1 border-l border-slate-200 pl-3"
              aria-label="Verification steps"
            >
              {session.steps.map((step, i) => (
                <li
                  key={i}
                  className={step.passed ? 'text-emerald-800' : 'text-red-800'}
                  data-testid="verification-step"
                  data-passed={step.passed}
                >
                  <span className="mr-2 text-xs text-slate-500">{clock(step.at)}</span>
                  {step.passed ? '✓ ' : '✗ '}
                  {step.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}
