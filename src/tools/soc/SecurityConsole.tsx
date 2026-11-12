/**
 * The Security Console: an incident worked through its stages, and the tools
 * to investigate and respond (alerts, sign-ins, endpoints, email, mailboxes,
 * accounts). Every button runs an action in model.ts; the stage moves on only
 * when its work is done.
 */
import { useState } from 'react'
import { Icon } from '../../ui/Icon'
import type { ToolWorkspaceProps } from '../ui'
import {
  acknowledgeAlert,
  advance,
  disableAccount,
  dismissAlert,
  enableAccount,
  flagProcess,
  flagRule,
  flagSignIn,
  isolateDevice,
  killProcess,
  quarantineEmail,
  removeRule,
  resetAccountPassword,
  restoreDevice,
  revokeSessions,
  setLessons,
  setReport,
  setTriage,
  setVerdict,
  STAGE_GOALS,
  STAGE_NAMES,
  type Result,
} from './model'
import { SEVERITIES, STAGES, type SocState } from './schema'

type Props = ToolWorkspaceProps<SocState>
type Act = (fn: (s: SocState) => Result) => void

const BTN =
  'rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40'
const DANGER =
  'rounded-md border border-red-500/60 bg-red-950 px-2.5 py-1 text-xs font-medium text-red-100 hover:bg-red-900'
const PANEL = 'rounded-lg border border-slate-700 bg-slate-900'
const TH =
  'px-3 py-2 text-left text-xs font-semibold tracking-wide text-slate-300 uppercase'
const TD = 'px-3 py-2 align-top'

const SEVERITY_TONE: Record<string, string> = {
  low: 'bg-slate-700 text-slate-100',
  medium: 'bg-amber-500 text-slate-950',
  high: 'bg-orange-600 text-white',
  critical: 'bg-red-600 text-white',
}

function Badge({ tone, children }: { tone: string; children: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${tone}`}>
      {children}
    </span>
  )
}

/** A consequential action: asks once more, in place. */
function Confirm({
  label,
  confirm,
  onConfirm,
}: {
  label: string
  confirm: string
  onConfirm: () => void
}) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button type="button" className={DANGER} onClick={() => setAsking(true)}>
        {label}
      </button>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-red-950 px-2 py-0.5 text-xs text-red-100">
      {confirm}
      <button
        type="button"
        className="rounded bg-red-600 px-2 py-0.5 font-semibold text-white"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        Yes
      </button>
      <button type="button" className="underline" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  )
}

const TABS = [
  ['alerts', 'Alerts', 'alert'],
  ['signins', 'Sign-ins', 'user'],
  ['endpoints', 'Endpoints', 'device'],
  ['email', 'Email', 'mail'],
  ['mailboxes', 'Mailboxes', 'docs'],
  ['accounts', 'Accounts', 'directory'],
  ['report', 'Report', 'file'],
] as const

export default function SecurityConsole({ state, readOnly, onUpdate }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('alerts')
  const [feedback, setFeedback] = useState<{ problems: string[]; message?: string }>({
    problems: [],
  })
  const editable = !readOnly && !!onUpdate
  const act: Act = (fn) => {
    if (!editable) return
    const r = fn(state)
    setFeedback({ problems: r.problems, message: r.message })
    if (!r.problems.length && r.state !== state) onUpdate?.((s) => fn(s).state)
  }
  const i = state.incident
  const at = STAGES.indexOf(i.stage)
  const name = (user: string) => state.accounts.find((a) => a.user === user)?.name ?? user

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-950 text-slate-100"
      data-testid="security-console"
    >
      {/* The incident and its stages */}
      <section className="space-y-3 border-b border-slate-800 p-4" aria-label="Incident">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-300">{i.id}</p>
            <h2 className="text-lg font-semibold text-white">{i.title}</h2>
            <p className="text-sm text-slate-300">
              {i.severity ? (
                <Badge tone={SEVERITY_TONE[i.severity]}>{i.severity}</Badge>
              ) : (
                'Severity not set'
              )}
              {i.category && <span className="ml-2">{i.category.replace('-', ' ')}</span>}
            </p>
          </div>
          {i.stage !== 'closed' && editable && (
            <button
              type="button"
              className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-500"
              onClick={() => act(advance)}
              data-testid="complete-stage"
            >
              Complete “{STAGE_NAMES[i.stage]}”
            </button>
          )}
        </div>
        <ol
          className="flex flex-wrap gap-1"
          aria-label="Incident stages"
          data-testid="stages"
        >
          {STAGES.filter((s) => s !== 'closed').map((s, n) => (
            <li
              key={s}
              aria-current={s === i.stage ? 'step' : undefined}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                n < at
                  ? 'bg-emerald-900 text-emerald-100'
                  : s === i.stage
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-800 text-slate-300'
              }`}
            >
              {n < at && <Icon name="check" className="h-3 w-3" />}
              {n + 1}. {STAGE_NAMES[s]}
            </li>
          ))}
        </ol>
        <p className="text-sm text-slate-200" data-testid="stage-goal">
          <span className="font-semibold text-teal-300">{STAGE_NAMES[i.stage]}: </span>
          {STAGE_GOALS[i.stage]}
        </p>
        {i.stage === 'triage' && editable && <Triage state={state} act={act} />}
        {feedback.problems.length > 0 && (
          <ul
            role="alert"
            className="list-disc rounded-md border border-red-500/50 bg-red-950 p-3 pl-7 text-sm text-red-100"
            data-testid="soc-problems"
          >
            {feedback.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {feedback.message && (
          <p
            role="status"
            className="rounded-md border border-amber-500/50 bg-amber-950 p-2.5 text-sm text-amber-100"
          >
            {feedback.message}
          </p>
        )}
        {state.consequences.length > 0 && (
          <div
            className="rounded-md border border-red-500/50 bg-red-950/60 p-3 text-sm text-red-100"
            data-testid="consequences"
          >
            <p className="font-semibold">
              Consequences of wrong actions (kept on record)
            </p>
            <ul className="mt-1 list-disc pl-5">
              {state.consequences.map((c) => (
                <li key={c.kind}>{c.text}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-800 px-4 py-1.5"
        role="tablist"
        aria-label="Investigation tools"
      >
        {TABS.map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm whitespace-nowrap ${tab === id ? 'bg-slate-800 font-medium text-white' : 'text-slate-300 hover:bg-slate-900'}`}
          >
            <Icon name={icon} className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'alerts' && (
          <table className={`${PANEL} w-full text-sm`} aria-label="Alerts">
            <thead>
              <tr>
                <th className={TH}>Severity</th>
                <th className={TH}>Alert</th>
                <th className={TH}>About</th>
                <th className={TH}>Status</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {state.alerts.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-slate-800"
                  data-testid="alert-row"
                >
                  <td className={TD}>
                    <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                  </td>
                  <td className={TD}>
                    <span className="block font-medium text-white">{a.title}</span>
                    <span className="text-xs text-slate-300">
                      {a.source} · {a.time} · {a.id}
                    </span>
                  </td>
                  <td className={TD}>
                    {a.entity.startsWith('u') ? name(a.entity) : a.entity}
                  </td>
                  <td className={`${TD} capitalize`}>{a.status}</td>
                  <td className={`${TD} space-x-1 text-right whitespace-nowrap`}>
                    {editable && a.status === 'new' && (
                      <>
                        <button
                          type="button"
                          className={BTN}
                          onClick={() => act((s) => acknowledgeAlert(s, a.id))}
                        >
                          Acknowledge
                        </button>
                        <Confirm
                          label="Dismiss"
                          confirm="False alarm?"
                          onConfirm={() => act((s) => dismissAlert(s, a.id))}
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'signins' && (
          <SignIns state={state} act={act} editable={editable} name={name} />
        )}
        {tab === 'endpoints' && (
          <Endpoints state={state} act={act} editable={editable} name={name} />
        )}
        {tab === 'email' && (
          <Emails state={state} act={act} editable={editable} name={name} />
        )}
        {tab === 'mailboxes' && (
          <div className="space-y-4">
            {state.mailboxes.map((m) => (
              <section key={m.user} className={`${PANEL} p-4`} data-testid="mailbox">
                <h3 className="font-semibold text-white">{name(m.user)}’s mailbox</h3>
                <table
                  className="mt-2 w-full text-sm"
                  aria-label={`${name(m.user)}’s rules`}
                >
                  <thead>
                    <tr>
                      <th className={TH}>Rule</th>
                      <th className={TH}>When</th>
                      <th className={TH}>Does</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {m.rules.map((r) => (
                      <tr
                        key={r.id}
                        className={`border-t border-slate-800 ${r.removed ? 'text-slate-400 line-through' : ''}`}
                      >
                        <td className={TD}>
                          {r.name}
                          {r.flagged && (
                            <Badge tone="bg-amber-500 text-slate-950">evidence</Badge>
                          )}
                        </td>
                        <td className={TD}>{r.condition}</td>
                        <td className={TD}>{r.action}</td>
                        <td className={`${TD} space-x-1 text-right whitespace-nowrap`}>
                          {editable && !r.removed && (
                            <>
                              {!r.flagged && (
                                <button
                                  type="button"
                                  className={BTN}
                                  onClick={() => act((s) => flagRule(s, m.user, r.id))}
                                >
                                  Flag as evidence
                                </button>
                              )}
                              <Confirm
                                label="Remove"
                                confirm="Remove this rule?"
                                onConfirm={() => act((s) => removeRule(s, m.user, r.id))}
                              />
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h4 className="mt-3 text-xs font-semibold tracking-wide text-slate-300 uppercase">
                  Mailbox audit
                </h4>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-200">
                  {m.audit.map((e, n) => (
                    <li key={n}>
                      <span className="font-mono text-xs text-slate-300">{e.time}</span>{' '}
                      {e.action} · {e.location} ({e.ip})
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {tab === 'accounts' && (
          <table className={`${PANEL} w-full text-sm`} aria-label="Accounts">
            <thead>
              <tr>
                <th className={TH}>Account</th>
                <th className={TH}>State</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {state.accounts.map((a) => (
                <tr
                  key={a.user}
                  className="border-t border-slate-800"
                  data-testid="account-row"
                >
                  <td className={TD}>
                    <span className="block font-medium text-white">{a.name}</span>
                    <span className="text-xs text-slate-300">{a.department}</span>
                  </td>
                  <td className={`${TD} text-xs text-slate-200`}>
                    {[
                      a.disabled && 'Disabled',
                      a.sessionsRevoked && 'Sessions ended',
                      a.passwordReset && 'New password',
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Normal'}
                  </td>
                  <td className={`${TD} space-x-1 text-right whitespace-nowrap`}>
                    {editable && (
                      <>
                        {!a.sessionsRevoked && (
                          <Confirm
                            label="End sessions"
                            confirm={`Sign ${a.name.split(' ')[0]} out everywhere?`}
                            onConfirm={() => act((s) => revokeSessions(s, a.user))}
                          />
                        )}
                        {!a.passwordReset && (
                          <Confirm
                            label="Reset password"
                            confirm="Reset it?"
                            onConfirm={() => act((s) => resetAccountPassword(s, a.user))}
                          />
                        )}
                        {a.disabled ? (
                          <button
                            type="button"
                            className={BTN}
                            onClick={() => act((s) => enableAccount(s, a.user))}
                          >
                            Enable
                          </button>
                        ) : (
                          <Confirm
                            label="Disable"
                            confirm={`Disable ${a.name}?`}
                            onConfirm={() => act((s) => disableAccount(s, a.user))}
                          />
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'report' && <Report state={state} act={act} editable={editable} />}
      </div>
    </div>
  )
}

function Triage({ state, act }: { state: SocState; act: Act }) {
  const [severity, setSeverity] = useState(state.incident.severity)
  const [category, setCategory] = useState(state.incident.category)
  return (
    <div className="flex flex-wrap items-end gap-2 text-sm" data-testid="triage">
      <label className="flex flex-col gap-1">
        Severity
        <select
          aria-label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as typeof severity)}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
        >
          <option value="">Choose…</option>
          {SEVERITIES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Category
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
        >
          <option value="">Choose…</option>
          <option value="account-compromise">Account compromise</option>
          <option value="malware">Malware</option>
          <option value="phishing">Phishing</option>
          <option value="data-loss">Data loss</option>
        </select>
      </label>
      <button
        type="button"
        className={BTN}
        onClick={() => act((s) => setTriage(s, severity, category))}
      >
        Save triage
      </button>
    </div>
  )
}

function SignIns({
  state,
  act,
  editable,
  name,
}: {
  state: SocState
  act: Act
  editable: boolean
  name: (u: string) => string
}) {
  const [user, setUser] = useState('all')
  const rows = state.signIns.filter((s) => user === 'all' || s.user === user)
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        Account
        <select
          aria-label="Sign-ins for"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
        >
          <option value="all">Everyone</option>
          {state.accounts.map((a) => (
            <option key={a.user} value={a.user}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <table className={`${PANEL} w-full text-sm`} aria-label="Sign-ins">
        <thead>
          <tr>
            <th className={TH}>Time</th>
            <th className={TH}>Account</th>
            <th className={TH}>Where</th>
            <th className={TH}>Device</th>
            <th className={TH}>Result</th>
            <th className={TH} />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-slate-800" data-testid="signin-row">
              <td className={`${TD} font-mono text-xs`}>{s.time}</td>
              <td className={TD}>{name(s.user)}</td>
              <td className={TD}>
                {s.location}
                <span className="block font-mono text-xs text-slate-300">{s.ip}</span>
              </td>
              <td className={TD}>{s.device}</td>
              <td className={TD}>
                {s.result === 'success' ? (
                  'Success'
                ) : (
                  <span className="text-red-300">Failed</span>
                )}
              </td>
              <td className={`${TD} text-right`}>
                {s.flagged ? (
                  <Badge tone="bg-amber-500 text-slate-950">evidence</Badge>
                ) : (
                  editable && (
                    <button
                      type="button"
                      className={BTN}
                      onClick={() => act((st) => flagSignIn(st, s.id))}
                    >
                      Flag as suspicious
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Endpoints({
  state,
  act,
  editable,
  name,
}: {
  state: SocState
  act: Act
  editable: boolean
  name: (u: string) => string
}) {
  const [open, setOpen] = useState(state.endpoints[0]?.device ?? '')
  const endpoint = state.endpoints.find((e) => e.device === open)
  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <ul className="space-y-1 md:w-56" aria-label="Endpoints">
        {state.endpoints.map((e) => (
          <li key={e.device}>
            <button
              type="button"
              onClick={() => setOpen(e.device)}
              aria-current={open === e.device ? 'true' : undefined}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${open === e.device ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900'}`}
            >
              <span className="font-mono">{e.device}</span>
              <span className="block text-xs text-slate-300">
                {name(e.user)}
                {e.isolated && ' · isolated'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {endpoint && (
        <section className={`${PANEL} min-w-0 flex-1 p-4`} data-testid="endpoint">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono font-semibold text-white">
              {endpoint.device}{' '}
              <span className="font-sans text-sm font-normal text-slate-300">
                · {name(endpoint.user)}
              </span>
            </h3>
            {editable &&
              (endpoint.isolated ? (
                <button
                  type="button"
                  className={BTN}
                  onClick={() => act((s) => restoreDevice(s, endpoint.device))}
                >
                  Reconnect to the network
                </button>
              ) : (
                <Confirm
                  label="Isolate"
                  confirm={`Cut ${endpoint.device} off the network?`}
                  onConfirm={() => act((s) => isolateDevice(s, endpoint.device))}
                />
              ))}
          </div>
          <table className="mt-3 w-full text-sm" aria-label="Processes">
            <thead>
              <tr>
                <th className={TH}>Process</th>
                <th className={TH}>Signed</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {endpoint.processes.map((p) => (
                <tr
                  key={p.name}
                  className={`border-t border-slate-800 ${p.running ? '' : 'text-slate-400 line-through'}`}
                  data-testid="process-row"
                >
                  <td className={TD}>
                    {p.name}
                    {p.flagged && (
                      <Badge tone="bg-amber-500 text-slate-950">evidence</Badge>
                    )}
                    <span className="block font-mono text-xs break-all text-slate-300">
                      {p.path}
                    </span>
                  </td>
                  <td className={TD}>
                    {p.signed ? 'Yes' : <span className="text-red-300">No</span>}
                  </td>
                  <td className={`${TD} space-x-1 text-right whitespace-nowrap`}>
                    {editable && p.running && (
                      <>
                        {!p.flagged && (
                          <button
                            type="button"
                            className={BTN}
                            onClick={() =>
                              act((s) => flagProcess(s, endpoint.device, p.name))
                            }
                          >
                            Flag
                          </button>
                        )}
                        <Confirm
                          label="Remove"
                          confirm={`Stop and remove ${p.name}?`}
                          onConfirm={() =>
                            act((s) => killProcess(s, endpoint.device, p.name))
                          }
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4 className="mt-3 text-xs font-semibold tracking-wide text-slate-300 uppercase">
            Recent changes
          </h4>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-200">
            {endpoint.changes.length === 0 && <li className="text-slate-300">None.</li>}
            {endpoint.changes.map((c, n) => (
              <li key={n}>
                <span className="font-mono text-xs text-slate-300">{c.time}</span>{' '}
                {c.what}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Emails({
  state,
  act,
  editable,
  name,
}: {
  state: SocState
  act: Act
  editable: boolean
  name: (u: string) => string
}) {
  const [open, setOpen] = useState(state.emails[0]?.id ?? '')
  const [inspected, setInspected] = useState<string[]>([])
  const email = state.emails.find((e) => e.id === open)
  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <ul className="space-y-1 md:w-64" aria-label="Reported emails">
        {state.emails.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => setOpen(e.id)}
              aria-current={open === e.id ? 'true' : undefined}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${open === e.id ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900'}`}
            >
              <span className="block truncate font-medium">{e.subject}</span>
              <span className="text-xs text-slate-300">
                {e.received} · reported by {name(e.reportedBy)}
                {e.verdict && ` · ${e.verdict}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {email && (
        <section
          className={`${PANEL} min-w-0 flex-1 space-y-3 p-4 text-sm`}
          data-testid="email"
        >
          <h3 className="font-semibold text-white">{email.subject}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-slate-300">From</dt>
            <dd>
              {email.fromName}{' '}
              <span className="font-mono text-xs">&lt;{email.fromAddress}&gt;</span>
            </dd>
            {email.replyTo && (
              <>
                <dt className="text-slate-300">Reply to</dt>
                <dd className="font-mono text-xs">{email.replyTo}</dd>
              </>
            )}
            <dt className="text-slate-300">Delivered to</dt>
            <dd>{email.recipients.map(name).join(', ')}</dd>
          </dl>
          <p className="rounded bg-slate-950 p-3 text-slate-100">{email.body}</p>
          <ul className="space-y-1">
            {email.links.map((l) => (
              <li key={l.url} className="flex flex-wrap items-center gap-2">
                <span className="text-teal-300 underline">{l.text}</span>
                {inspected.includes(l.url) ? (
                  <span
                    className="font-mono text-xs break-all text-amber-200"
                    data-testid="link-target"
                  >
                    goes to {l.url}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={BTN}
                    onClick={() => setInspected((x) => [...x, l.url])}
                  >
                    Inspect link
                  </button>
                )}
              </li>
            ))}
          </ul>
          {editable && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={BTN}
                onClick={() => act((s) => setVerdict(s, email.id, 'phishing'))}
              >
                It is phishing
              </button>
              <button
                type="button"
                className={BTN}
                onClick={() => act((s) => setVerdict(s, email.id, 'legitimate'))}
              >
                It is legitimate
              </button>
              {email.verdict === 'phishing' && !email.quarantined && (
                <Confirm
                  label="Quarantine everywhere"
                  confirm={`Remove from ${email.recipients.length} inboxes?`}
                  onConfirm={() => act((s) => quarantineEmail(s, email.id))}
                />
              )}
              {email.quarantined && (
                <span className="text-emerald-300">Quarantined from every inbox.</span>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Report({
  state,
  act,
  editable,
}: {
  state: SocState
  act: Act
  editable: boolean
}) {
  const [report, setReportText] = useState(state.incident.report)
  const [lessons, setLessonsText] = useState(state.incident.lessons)
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length
  return (
    <div className="space-y-4 text-sm">
      <label className="block">
        <span className="font-semibold text-white">Incident report</span>
        <span className="block text-xs text-slate-300">
          What happened, the evidence, and what you did (at least 60 words).{' '}
          {words(report)} words.
        </span>
        <textarea
          aria-label="Incident report"
          value={report}
          readOnly={!editable}
          onChange={(e) => setReportText(e.target.value)}
          onBlur={() => act((s) => setReport(s, report))}
          rows={8}
          className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 p-3 text-slate-100"
        />
      </label>
      <label className="block">
        <span className="font-semibold text-white">Lessons learned</span>
        <span className="block text-xs text-slate-300">
          What would stop it happening again (at least 25 words). {words(lessons)} words.
        </span>
        <textarea
          aria-label="Lessons learned"
          value={lessons}
          readOnly={!editable}
          onChange={(e) => setLessonsText(e.target.value)}
          onBlur={() => act((s) => setLessons(s, lessons))}
          rows={5}
          className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 p-3 text-slate-100"
        />
      </label>
    </div>
  )
}
