/** Directory: the screens of the identity and asset console. */
import { useState } from 'react'
import { Icon } from '../../ui/Icon'
import type { ToolWorkspaceProps } from '../ui'
import { directory } from './definition'
import {
  addToGroup,
  assetsOf,
  assignAsset,
  createUser,
  disableUser,
  enableUser,
  findUser,
  inWarranty,
  registerMfa,
  removeFromGroup,
  resetMfa,
  resetPassword,
  reportLost,
  returnAsset,
  setAssetStatus,
  suggestUsername,
  unlockUser,
} from './model'
import type { Asset, DirectoryState, Operation, User } from './schema'
import {
  describeRequirement,
  OPERATION_NAMES,
  sessionStatus,
  viewSession,
  withClock,
} from './security'

type Props = ToolWorkspaceProps<DirectoryState>
type Update = (change: (s: DirectoryState) => DirectoryState) => void
type Act = (
  fn: (s: DirectoryState) => { state: DirectoryState; problems: string[] },
) => void

const cell = 'px-3 py-1.5'
const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800'

function Pill({
  tone,
  children,
}: {
  tone: 'green' | 'red' | 'amber' | 'slate' | 'blue'
  children: string
}) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export default function DirectoryWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
  now,
}: Props) {
  const [section, setSection] = useState('users')
  const [problems, setProblems] = useState<string[]>([])
  const editable = !readOnly && !!onUpdate
  const update: Update = (change) => onUpdate?.(change)
  /**
   * Runs an action; shows its problems instead if it can't be done. The
   * action itself enforces the security policy: a refusal leaves the account
   * as it was, but is recorded, so that record is kept.
   */
  const act: Act = (fn) => {
    const at = now?.()
    const run = (s: DirectoryState) => fn(at === undefined ? s : withClock(s, at))
    const result = run(state)
    if (result.problems.length > 0) {
      setProblems(result.problems)
      const recorded = result.state.security?.events.at(-1)?.seq
      if (recorded !== state.security?.events.at(-1)?.seq) update((s) => run(s).state)
      return
    }
    setProblems([])
    update((s) => run(s).state)
  }

  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="directory">
      <nav
        aria-label="Directory sections"
        className="w-48 shrink-0 space-y-0.5 border-r border-slate-200 bg-white p-2"
      >
        <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {state.domain}
        </p>
        {directory.sections.map((s) => {
          const locked = lockedSections[s.id]
          return (
            <button
              key={s.id}
              type="button"
              disabled={!!locked}
              onClick={() => {
                setSection(s.id)
                setProblems([])
              }}
              title={locked ? `Unlocks when you become ${locked}.` : s.description}
              aria-current={section === s.id ? 'page' : undefined}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${
                section === s.id
                  ? 'bg-indigo-50 font-medium text-indigo-900'
                  : locked
                    ? 'text-slate-400'
                    : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {s.name}
              {locked && <Icon name="lock" className="h-3.5 w-3.5" />}
            </button>
          )
        })}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        {problems.length > 0 && (
          <ul
            role="alert"
            className="mb-3 list-disc rounded-md bg-red-50 p-3 pl-7 text-sm text-red-800"
          >
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {section === 'users' && <Users state={state} editable={editable} act={act} />}
        {section === 'groups' && <Groups state={state} />}
        {section === 'assets' && <Assets state={state} editable={editable} act={act} />}
        {section === 'audit' && <Audit state={state} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function Users({
  state,
  editable,
  act,
}: {
  state: DirectoryState
  editable: boolean
  act: Act
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const user = selected ? findUser(state, selected) : undefined
  const q = query.trim().toLowerCase()
  const users = state.users.filter(
    (u) =>
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.username.includes(q) ||
      u.department.toLowerCase().includes(q),
  )
  return (
    <div className="flex gap-4">
      <div className="w-80 shrink-0">
        <div className="mb-2 flex gap-2">
          <input
            aria-label="Search accounts"
            placeholder="Search by name or department"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          {editable && (
            <button type="button" className={PRIMARY} onClick={() => setCreating(true)}>
              New account
            </button>
          )}
        </div>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(u.id)
                  setCreating(false)
                }}
                data-testid="user-row"
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50 ${
                  selected === u.id ? 'bg-indigo-50' : ''
                }`}
              >
                <span className="min-w-0">
                  <span
                    className={`block truncate font-medium ${u.status === 'disabled' ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                  >
                    {u.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {u.username} · {u.department}
                  </span>
                </span>
                {u.locked && <Pill tone="red">Locked</Pill>}
                {u.status === 'disabled' && <Pill tone="slate">Disabled</Pill>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0 flex-1">
        {creating ? (
          <NewAccount
            state={state}
            act={act}
            onDone={(id) => {
              setCreating(false)
              if (id) setSelected(id)
            }}
          />
        ) : user ? (
          <UserDetail
            key={user.id}
            state={state}
            user={user}
            editable={editable}
            act={act}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Choose an account to see and change it.
          </p>
        )}
      </div>
    </div>
  )
}

const DEPARTMENTS = [
  'Accounting',
  'Consulting',
  'Data & Insights',
  'Engineering',
  'Finance',
  'IT Services',
  'Marketing',
  'Operations',
]

function NewAccount({
  state,
  act,
  onDone,
}: {
  state: DirectoryState
  act: Act
  onDone: (id: string | null) => void
}) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [edited, setEdited] = useState(false)
  const [department, setDepartment] = useState('')
  const [title, setTitle] = useState('')
  const suggested = suggestUsername(state, name)
  const finalUsername = edited ? username : suggested
  return (
    <form
      className="space-y-3 rounded-xl border border-indigo-200 bg-white p-4 text-sm"
      data-testid="new-account"
      onSubmit={(e) => {
        e.preventDefault()
        const input = { name, username: finalUsername, department, title }
        const result = createUser(state, input)
        act((s) => createUser(s, input))
        if (result.problems.length === 0) onDone(result.id)
      }}
    >
      <h3 className="font-semibold text-slate-900">New account</h3>
      <label className="flex flex-col gap-1">
        Full name
        <input
          aria-label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Username
        <input
          aria-label="Username"
          value={finalUsername}
          onChange={(e) => {
            setEdited(true)
            setUsername(e.target.value)
          }}
          className="rounded border border-slate-300 px-2 py-1 font-mono"
        />
        <span className="text-xs text-slate-500">
          Sign-in: {finalUsername || '…'}@{state.domain}
        </span>
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          Department
          <select
            aria-label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">Choose…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          Job title
          <input
            aria-label="Job title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        New accounts get a temporary password that must be changed at the first sign-in.
        Add groups and register MFA next.
      </p>
      <div className="flex gap-2">
        <button type="submit" className={PRIMARY}>
          Create account
        </button>
        <button type="button" className={BUTTON} onClick={() => onDone(null)}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function UserDetail({
  state,
  user,
  editable,
  act,
}: {
  state: DirectoryState
  user: User
  editable: boolean
  act: Act
}) {
  const [group, setGroup] = useState('')
  const devices = assetsOf(state, user.id)
  const available = state.groups.filter((g) => !user.groups.includes(g.id))
  return (
    <section
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-sm"
      data-testid="user-detail"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
          <p className="text-slate-600">
            {user.title} · {user.department}
          </p>
          <p className="font-mono text-xs text-slate-500">
            {user.username}@{state.domain}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={user.status === 'active' ? 'green' : 'slate'}>
            {user.status === 'active' ? 'Active' : 'Disabled'}
          </Pill>
          {user.locked && <Pill tone="red">Locked out</Pill>}
          <Pill tone={user.mfa ? 'blue' : 'amber'}>
            {user.mfa ? 'MFA registered' : 'No MFA'}
          </Pill>
          {user.mustChangePassword && <Pill tone="amber">Must change password</Pill>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700">
        <dt className="text-slate-500">Last sign-in</dt>
        <dd>{user.lastSignIn || 'Never'}</dd>
        <dt className="text-slate-500">Failed sign-ins today</dt>
        <dd className={user.failedSignIns >= 10 ? 'font-medium text-red-700' : ''}>
          {user.failedSignIns}
          {user.signInLocation && ` · from ${user.signInLocation}`}
        </dd>
        {user.extension && (
          <>
            <dt className="text-slate-500">Extension on record</dt>
            <dd>{user.extension}</dd>
          </>
        )}
        {user.manager && (
          <>
            <dt className="text-slate-500">Manager on record</dt>
            <dd>{findUser(state, user.manager)?.name ?? user.manager}</dd>
          </>
        )}
        {(user.employeeId || user.badge) && (
          <>
            <dt className="text-slate-500">Verification records</dt>
            <dd className="text-slate-500">
              {[user.employeeId && 'employee number', user.badge && 'badge number']
                .filter(Boolean)
                .join(' and ')}{' '}
              on file (not shown: checked in a verification)
            </dd>
          </>
        )}
      </dl>

      {state.security && <PolicyBox state={state} user={user} />}

      {editable && (
        <div className="flex flex-wrap gap-2">
          {user.locked && (
            <button
              type="button"
              className={BUTTON}
              onClick={() => act((s) => unlockUser(s, user.id))}
            >
              Unlock
            </button>
          )}
          <button
            type="button"
            className={BUTTON}
            onClick={() => act((s) => resetPassword(s, user.id))}
          >
            Reset password
          </button>
          {user.mfa ? (
            <button
              type="button"
              className={BUTTON}
              onClick={() => act((s) => resetMfa(s, user.id))}
            >
              Reset MFA
            </button>
          ) : (
            <button
              type="button"
              className={BUTTON}
              onClick={() => act((s) => registerMfa(s, user.id))}
            >
              Register MFA
            </button>
          )}
          {user.status === 'active' ? (
            <button
              type="button"
              className={`${BUTTON} text-red-700`}
              onClick={() => act((s) => disableUser(s, user.id))}
            >
              Disable account
            </button>
          ) : (
            <button
              type="button"
              className={BUTTON}
              onClick={() => act((s) => enableUser(s, user.id))}
            >
              Enable account
            </button>
          )}
        </div>
      )}

      <div>
        <h4 className="mb-1 font-semibold text-slate-900">Groups</h4>
        <ul className="space-y-1">
          {user.groups.map((id) => {
            const g = state.groups.find((x) => x.id === id)
            return (
              <li
                key={id}
                className="flex items-center justify-between rounded border border-slate-100 px-2 py-1"
                data-testid="member-of"
              >
                <span>
                  {g?.privileged && <span title="Privileged group">🛡 </span>}
                  <span className="font-medium">{g?.name ?? id}</span>
                  <span className="text-slate-500"> · {g?.grants}</span>
                </span>
                {editable && (
                  <button
                    type="button"
                    aria-label={`Remove from ${g?.name ?? id}`}
                    className="text-xs text-slate-500 underline"
                    onClick={() => act((s) => removeFromGroup(s, user.id, id))}
                  >
                    Remove
                  </button>
                )}
              </li>
            )
          })}
          {user.groups.length === 0 && <li className="text-slate-500">No groups.</li>}
        </ul>
        {editable && available.length > 0 && (
          <div className="mt-2 flex gap-2">
            <select
              aria-label="Group to add"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Add to a group…</option>
              {available.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.privileged ? '🛡 ' : ''}
                  {g.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={BUTTON}
              disabled={!group}
              onClick={() => {
                act((s) => addToGroup(s, user.id, group))
                setGroup('')
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-1 font-semibold text-slate-900">Devices</h4>
        {devices.length === 0 ? (
          <p className="text-slate-500">None assigned.</p>
        ) : (
          <ul className="space-y-1">
            {devices.map((a) => (
              <li
                key={a.tag}
                className="flex items-center justify-between rounded border border-slate-100 px-2 py-1"
              >
                <span>
                  <span className="font-mono">{a.tag}</span> · {a.model}
                </span>
                {editable && (
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline"
                    onClick={() => act((s) => returnAsset(s, a.tag))}
                  >
                    Return to stock
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** What the security policy needs for changes to this account, and where its verification stands. */
function PolicyBox({ state, user }: { state: DirectoryState; user: User }) {
  const ops: Operation[] = [
    ...(user.locked ? (['unlock'] as const) : []),
    'reset-password',
    user.mfa ? 'reset-mfa' : 'register-mfa',
    user.status === 'active' ? 'disable' : 'enable',
  ]
  const session = state.security?.sessions.findLast((s) => s.user === user.id)
  const status = session ? sessionStatus(state, session) : null
  const view = session ? viewSession(state, session) : null
  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950"
      data-testid="policy-box"
    >
      <p className="font-semibold">
        Security policy: verify before you change this account
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {ops.map((op) => (
          <li key={op}>
            <span className="font-medium">{OPERATION_NAMES[op]}</span> needs{' '}
            {describeRequirement(state, op, user)}.
          </li>
        ))}
        <li>Group changes need identity and approval (privileged groups: more).</li>
      </ul>
      <p className="mt-2" data-testid="policy-session">
        {!session || !view
          ? 'Not verified: start a verification from their ticket in the Help Desk.'
          : status === 'expired'
            ? `Verification ${session.id} has expired: verify them again.`
            : status === 'failed'
              ? `Verification ${session.id} failed: do not change this account on this request.`
              : status === 'complete'
                ? `Verification ${session.id} has been used.`
                : view.authorised
                  ? `Verified (${session.id}) for ${session.operations
                      .filter((op) => !session.done.includes(op))
                      .map((op) => OPERATION_NAMES[op])
                      .join(', ')}.`
                  : `Verification ${session.id} in progress: ${
                      view.identity === 'verified'
                        ? 'identity verified, approval still needed.'
                        : 'identity not verified yet.'
                    }`}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Groups, assets, audit
// ---------------------------------------------------------------------------

function Groups({ state }: { state: DirectoryState }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Security groups</h2>
      <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
          <tr>
            <th className={cell}>Group</th>
            <th className={cell}>Gives access to</th>
            <th className={`${cell} text-right`}>Members</th>
          </tr>
        </thead>
        <tbody>
          {state.groups.map((g) => (
            <tr key={g.id} className="border-t border-slate-100">
              <td className={cell}>
                {g.privileged && <span title="Privileged group">🛡 </span>}
                <span className="font-medium">{g.name}</span>
                <span className="block text-xs text-slate-500">{g.description}</span>
              </td>
              <td className={cell}>{g.grants}</td>
              <td className={`${cell} text-right tabular-nums`}>
                {
                  state.users.filter(
                    (u) => u.status === 'active' && u.groups.includes(g.id),
                  ).length
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const STATUS_TONE: Record<Asset['status'], 'green' | 'blue' | 'amber' | 'red' | 'slate'> =
  {
    'in-use': 'blue',
    'in-stock': 'green',
    repair: 'amber',
    lost: 'red',
    retired: 'slate',
  }

function Assets({
  state,
  editable,
  act,
}: {
  state: DirectoryState
  editable: boolean
  act: Act
}) {
  const [filter, setFilter] = useState<'all' | Asset['status']>('all')
  const [assignTo, setAssignTo] = useState<Record<string, string>>({})
  const assets = state.assets.filter((a) => filter === 'all' || a.status === filter)
  const active = state.users.filter((u) => u.status === 'active')
  return (
    <div data-testid="assets">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Assets</h2>
        <select
          aria-label="Show assets"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">All assets</option>
          <option value="in-use">In use</option>
          <option value="in-stock">In stock</option>
          <option value="repair">In repair</option>
          <option value="lost">Lost</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
          <tr>
            <th className={cell}>Tag</th>
            <th className={cell}>Device</th>
            <th className={cell}>Status</th>
            <th className={cell}>Assigned to</th>
            <th className={cell}>Warranty</th>
            {editable && <th className={cell}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => {
            const holder = findUser(state, a.assignedTo)
            return (
              <tr
                key={a.tag}
                className="border-t border-slate-100 align-top"
                data-testid="asset-row"
              >
                <td className={`${cell} font-mono`}>{a.tag}</td>
                <td className={cell}>
                  {a.model}
                  <span className="block text-xs text-slate-500">
                    {a.type} · serial {a.serial}
                  </span>
                </td>
                <td className={cell}>
                  <Pill tone={STATUS_TONE[a.status]}>{a.status.replace('-', ' ')}</Pill>
                </td>
                <td className={cell}>{holder?.name ?? '—'}</td>
                <td className={`${cell} ${inWarranty(state, a) ? '' : 'text-red-700'}`}>
                  {inWarranty(state, a)
                    ? `until ${a.warrantyEnd}`
                    : `expired ${a.warrantyEnd}`}
                </td>
                {editable && (
                  <td className={cell}>
                    {a.status === 'in-use' ? (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() => act((s) => returnAsset(s, a.tag))}
                        >
                          Return to stock
                        </button>
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() => act((s) => reportLost(s, a.tag))}
                        >
                          Report lost
                        </button>
                      </div>
                    ) : a.status === 'in-stock' ? (
                      <div className="flex flex-wrap gap-1">
                        <select
                          aria-label={`Assign ${a.tag} to`}
                          value={assignTo[a.tag] ?? ''}
                          onChange={(e) =>
                            setAssignTo({ ...assignTo, [a.tag]: e.target.value })
                          }
                          className="w-40 rounded border border-slate-300 px-1 py-1"
                        >
                          <option value="">Assign to…</option>
                          {active.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={BUTTON}
                          disabled={!assignTo[a.tag]}
                          onClick={() =>
                            act((s) => assignAsset(s, a.tag, assignTo[a.tag]))
                          }
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() => act((s) => setAssetStatus(s, a.tag, 'repair'))}
                        >
                          Send for repair
                        </button>
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() => act((s) => setAssetStatus(s, a.tag, 'retired'))}
                        >
                          Retire
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() => act((s) => setAssetStatus(s, a.tag, 'in-stock'))}
                      >
                        Back to stock
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Audit({ state }: { state: DirectoryState }) {
  const entries = [...state.audit].sort((a, b) => b.seq - a.seq)
  return (
    <div data-testid="audit">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Audit log</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No changes yet.</p>
      ) : (
        <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
            <tr>
              <th className={cell}>#</th>
              <th className={cell}>Action</th>
              <th className={cell}>Account or device</th>
              <th className={cell}>Details</th>
              <th className={cell}>By</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.seq} className="border-t border-slate-100">
                <td className={cell}>{e.seq}</td>
                <td className={cell}>{e.action}</td>
                <td className={`${cell} font-mono`}>{e.target}</td>
                <td className={cell}>{e.detail}</td>
                <td className={cell}>{e.byYou ? 'You' : 'Earlier'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {state.security && <SecurityLog state={state} />}
    </div>
  )
}

const SEVERITY_TONE = {
  info: 'text-slate-700',
  warning: 'text-amber-800',
  breach: 'font-medium text-red-800',
} as const

/** Verifications, approvals and refused attempts: what the security policy recorded. */
function SecurityLog({ state }: { state: DirectoryState }) {
  const events = [...(state.security?.events ?? [])].sort((a, b) => b.seq - a.seq)
  return (
    <div className="mt-6" data-testid="security-log">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Security events</h2>
      <p className="mb-3 text-xs text-slate-500">
        Verifications, approvals, changes allowed, and attempts refused under the policy.
        No answers or records are written here.
      </p>
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing yet.</p>
      ) : (
        <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
            <tr>
              <th className={cell}>Time</th>
              <th className={cell}>Account</th>
              <th className={cell}>Ticket</th>
              <th className={cell}>What happened</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr
                key={e.seq}
                className={`border-t border-slate-100 ${SEVERITY_TONE[e.severity]}`}
                data-testid="security-event"
                data-severity={e.severity}
                data-kind={e.kind}
              >
                <td className={`${cell} whitespace-nowrap`}>
                  {new Date(e.at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className={cell}>{findUser(state, e.user)?.name ?? e.user}</td>
                <td className={cell}>{e.ticket}</td>
                <td className={cell}>
                  {e.severity === 'breach' ? 'Policy breach: ' : ''}
                  {e.text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
