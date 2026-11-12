/**
 * Devices: Device Management (the inventory) and Remote Desktop (a simulated
 * remote session on a user's computer, with its own system tools). Every
 * button runs an action in model.ts, which changes the device's real state.
 */
import { useState } from 'react'
import { Icon, type IconName } from '../../ui/Icon'
import type { ToolWorkspaceProps } from '../ui'
import {
  clearPrintQueue,
  connect,
  cpuOf,
  diskCleanup,
  disconnect,
  endProcess,
  findDevice,
  freeGb,
  installApp,
  installUpdates,
  issuesOf,
  memoryUsedGb,
  repairApp,
  resetNetwork,
  restartDevice,
  restartService,
  standardNetwork,
  stopService,
  uninstallApp,
  type Result,
} from './model'
import type { Device, DevicesState } from './schema'

type Props = ToolWorkspaceProps<DevicesState>
type Act = (fn: (s: DevicesState) => Result, done?: string) => void

const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40'

function Pill({
  tone,
  children,
}: {
  tone: 'green' | 'red' | 'amber' | 'slate'
  children: string
}) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-900',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} />
    </span>
  )
}

/** A consequential action: asks once more, in place (no pop-up). */
function ConfirmButton({
  label,
  confirm,
  onConfirm,
  danger,
}: {
  label: string
  confirm: string
  onConfirm: () => void
  danger?: boolean
}) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button
        type="button"
        className={`${BUTTON} ${danger ? 'text-red-700' : ''}`}
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-950">
      {confirm}
      <button
        type="button"
        className="rounded bg-red-700 px-2 py-0.5 font-medium text-white"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        Yes
      </button>
      <button
        type="button"
        className="rounded px-1.5 py-0.5 underline"
        onClick={() => setAsking(false)}
      >
        Cancel
      </button>
    </span>
  )
}

export default function DevicesWorkspace({
  state,
  readOnly,
  onUpdate,
  initialSection,
  reachable,
  related,
}: Props) {
  const [section, setSection] = useState<'inventory' | 'remote'>(
    initialSection === 'remote' ? 'remote' : 'inventory',
  )
  const [selected, setSelected] = useState<string | null>(state.session?.device ?? null)
  const [feedback, setFeedback] = useState<{ problems: string[]; done?: string }>({
    problems: [],
  })
  const editable = !readOnly && !!onUpdate
  const act: Act = (fn, done) => {
    if (!editable) return
    const result = fn(state)
    setFeedback({
      problems: result.problems,
      ...(result.problems.length ? {} : { done }),
    })
    if (result.problems.length === 0) onUpdate?.((s) => fn(s).state)
  }
  const open = (name: string, where: 'inventory' | 'remote') => {
    setSelected(name)
    setSection(where)
    setFeedback({ problems: [] })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50" data-testid="devices">
      <div
        className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-4 py-1.5"
        role="tablist"
        aria-label="Devices sections"
      >
        {(
          [
            ['inventory', 'Device Management', 'device'],
            ['remote', 'Remote Desktop', 'remote'],
          ] as Array<['inventory' | 'remote', string, IconName]>
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => {
              setSection(id)
              setFeedback({ problems: [] })
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm ${
              section === id
                ? 'bg-teal-50 font-medium text-teal-900'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon name={icon} className="h-4 w-4" />
            {label}
          </button>
        ))}
        {state.session && (
          <span
            className="ml-auto flex items-center gap-1.5 text-xs text-emerald-800"
            data-testid="session-indicator"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Connected to {state.session.device}
          </span>
        )}
      </div>
      {(feedback.problems.length > 0 || feedback.done) && (
        <div
          role={feedback.problems.length ? 'alert' : 'status'}
          className={`mx-4 mt-3 rounded-md px-3 py-2 text-sm ${
            feedback.problems.length
              ? 'bg-red-50 text-red-800'
              : 'bg-emerald-50 text-emerald-900'
          }`}
          data-testid="devices-feedback"
        >
          {feedback.problems.length ? feedback.problems.join(' ') : feedback.done}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {section === 'inventory' ? (
          <Inventory
            state={state}
            selected={selected}
            onSelect={setSelected}
            onRemote={(name) => open(name, 'remote')}
            related={related}
          />
        ) : (
          <Remote
            state={state}
            selected={selected}
            onSelect={setSelected}
            editable={editable}
            act={act}
            reachable={reachable}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Device Management
// ---------------------------------------------------------------------------

type SortKey = 'name' | 'owner' | 'status' | 'free' | 'issues'

function Inventory({
  state,
  selected,
  onSelect,
  onRemote,
  related,
}: {
  state: DevicesState
  selected: string | null
  onSelect: (name: string) => void
  onRemote: (name: string) => void
  related?: Props['related']
}) {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState<'all' | 'online' | 'offline' | 'issues'>('all')
  const [sort, setSort] = useState<{ key: SortKey; up: boolean }>({
    key: 'name',
    up: true,
  })
  const departments = [...new Set(state.devices.map((d) => d.department))].sort()
  const q = query.trim().toLowerCase()
  const rows = state.devices
    .filter(
      (d) =>
        (!q ||
          d.name.toLowerCase().includes(q) ||
          d.owner.toLowerCase().includes(q) ||
          d.ip.includes(q)) &&
        (department === 'all' || d.department === department) &&
        (status === 'all' ||
          (status === 'issues' ? issuesOf(state, d).length > 0 : d.status === status)),
    )
    .sort((a, b) => {
      const value = (d: Device): string | number =>
        sort.key === 'name'
          ? d.name
          : sort.key === 'owner'
            ? d.owner
            : sort.key === 'status'
              ? d.status
              : sort.key === 'free'
                ? freeGb(d)
                : issuesOf(state, d).length
      const x = value(a)
      const y = value(b)
      const order =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y))
      return sort.up ? order : -order
    })
  const device = selected ? findDevice(state, selected) : undefined
  const header = (key: SortKey, label: string) => (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, up: s.key === key ? !s.up : true }))}
        className="flex items-center gap-1 uppercase"
        aria-sort={sort.key === key ? (sort.up ? 'ascending' : 'descending') : undefined}
      >
        {label}
        {sort.key === key && <span aria-hidden>{sort.up ? '↑' : '↓'}</span>}
      </button>
    </th>
  )
  const withIssues = state.devices.filter((d) => issuesOf(state, d).length > 0).length

  return (
    <div className="@container flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-4 @5xl:flex-row">
      <section className="min-w-0 flex-1 space-y-3">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Device Management</h2>
            <p className="text-sm text-slate-600">
              {state.devices.length} devices ·{' '}
              {state.devices.filter((d) => d.status === 'online').length} online ·{' '}
              <span className={withIssues ? 'font-medium text-red-700' : ''}>
                {withIssues} with issues
              </span>
            </p>
          </div>
        </header>
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-52 flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute top-2 left-2.5 h-4 w-4 text-slate-400"
            />
            <input
              type="search"
              aria-label="Search devices"
              placeholder="Search by device, user or IP address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-sm"
            />
          </label>
          <select
            aria-label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="all">Any status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="issues">With issues</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm" aria-label="Devices">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                {header('name', 'Device')}
                {header('owner', 'User')}
                {header('status', 'Status')}
                {header('free', 'Free storage')}
                {header('issues', 'Issues')}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const issues = issuesOf(state, d)
                return (
                  <tr
                    key={d.name}
                    onClick={() => onSelect(d.name)}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-teal-50/50 ${selected === d.name ? 'bg-teal-50' : ''}`}
                    data-testid="device-row"
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => onSelect(d.name)}
                      >
                        <span className="block font-mono font-medium text-slate-900">
                          {d.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {d.type} · {d.model}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {d.owner || 'Shared'}
                      <span className="block text-xs text-slate-500">{d.department}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Pill tone={d.status === 'online' ? 'green' : 'slate'}>
                        {d.status === 'online' ? 'Online' : 'Offline'}
                      </Pill>
                    </td>
                    <td className="w-36 px-3 py-2">
                      {d.type === 'printer' ? (
                        <span className="text-xs text-slate-400">n/a</span>
                      ) : (
                        <>
                          <Bar
                            value={d.storage.usedGb}
                            max={d.storage.totalGb}
                            tone={
                              freeGb(d) < d.storage.totalGb * 0.1
                                ? 'bg-red-500'
                                : 'bg-teal-600'
                            }
                          />
                          <span className="text-xs text-slate-600">
                            {freeGb(d)} GB free
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {issues.length ? (
                        <Pill tone="red">{`${issues.length} issue${issues.length === 1 ? '' : 's'}`}</Pill>
                      ) : (
                        <Pill tone="green">Healthy</Pill>
                      )}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm text-slate-500"
                  >
                    No device matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="@5xl:w-96 @5xl:shrink-0" aria-label="Device details">
        {device ? (
          <DeviceDetail
            state={state}
            device={device}
            onRemote={() => onRemote(device.name)}
            related={related}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            Choose a device to see its details, apps, history and incidents.
          </p>
        )}
      </aside>
    </div>
  )
}

function DeviceDetail({
  state,
  device,
  onRemote,
  related,
}: {
  state: DevicesState
  device: Device
  onRemote: () => void
  related?: Props['related']
}) {
  const issues = issuesOf(state, device)
  const history = state.log
    .filter((e) => e.device === device.name)
    .slice(-8)
    .reverse()
  const incidents = related?.(device.name) ?? []
  return (
    <section
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
      data-testid="device-detail"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-mono text-lg font-semibold text-slate-900">
            {device.name}
          </h3>
          <p className="text-slate-600">
            {device.owner || 'Shared device'} · {device.department}
          </p>
        </div>
        {device.type !== 'printer' && (
          <button type="button" className={PRIMARY} onClick={onRemote}>
            Remote connect
          </button>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-700">
        <dt className="text-slate-500">Type</dt>
        <dd>
          {device.type}, {device.model}
        </dd>
        <dt className="text-slate-500">System</dt>
        <dd>{device.os}</dd>
        <dt className="text-slate-500">IP address</dt>
        <dd className="font-mono">{device.ip}</dd>
        <dt className="text-slate-500">Network</dt>
        <dd>
          {device.status === 'online' ? device.network.connection : 'Not connected'}
          {standardNetwork(state, device) ? '' : ' (settings changed by hand)'}
        </dd>
        {device.type !== 'printer' && (
          <>
            <dt className="text-slate-500">Memory</dt>
            <dd>
              {memoryUsedGb(device)} of {device.memoryGb} GB in use
            </dd>
            <dt className="text-slate-500">Storage</dt>
            <dd>
              {freeGb(device)} GB free of {device.storage.totalGb} GB
            </dd>
          </>
        )}
      </dl>
      <div>
        <h4 className="font-semibold text-slate-900">Issues</h4>
        {issues.length ? (
          <ul className="mt-1 list-disc pl-5 text-red-800" data-testid="device-issues">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        ) : (
          <p className="text-emerald-800">None found.</p>
        )}
      </div>
      {incidents.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-900">Incidents</h4>
          <ul className="mt-1 space-y-0.5">
            {incidents.map((t) => (
              <li
                key={t.id}
                className={t.open ? 'text-slate-800' : 'text-slate-500 line-through'}
              >
                <span className="font-mono text-xs">{t.id}</span> {t.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {device.apps.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-900">Installed apps</h4>
          <ul className="mt-1 space-y-0.5 text-slate-700">
            {device.apps
              .filter((a) => a.state !== 'not-installed')
              .map((a) => (
                <li key={a.name} className="flex justify-between gap-2">
                  <span>
                    {a.name} <span className="text-xs text-slate-500">{a.version}</span>
                  </span>
                  {a.state !== 'working' && (
                    <Pill tone="red">
                      {a.state === 'crashing' ? 'Crashing' : 'Install failed'}
                    </Pill>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      <div>
        <h4 className="font-semibold text-slate-900">History</h4>
        {history.length ? (
          <ol className="mt-1 space-y-0.5 text-slate-700">
            {history.map((e) => (
              <li key={e.seq}>
                {e.action}
                {e.detail && <span className="text-slate-500"> · {e.detail}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-slate-500">No changes by IT yet.</p>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Remote Desktop
// ---------------------------------------------------------------------------

const UTILITIES: Array<{ id: string; name: string; icon: IconName }> = [
  { id: 'system', name: 'System Information', icon: 'info' },
  { id: 'tasks', name: 'Task Manager', icon: 'activity' },
  { id: 'storage', name: 'Storage', icon: 'storage' },
  { id: 'services', name: 'Services', icon: 'settings' },
  { id: 'apps', name: 'Apps & features', icon: 'dashboard' },
  { id: 'network', name: 'Network settings', icon: 'network' },
  { id: 'updates', name: 'Windows Update', icon: 'history' },
  { id: 'events', name: 'Event Viewer', icon: 'file' },
  { id: 'printers', name: 'Printers', icon: 'print' },
]

function Remote({
  state,
  selected,
  onSelect,
  editable,
  act,
  reachable,
}: {
  state: DevicesState
  selected: string | null
  onSelect: (name: string) => void
  editable: boolean
  act: Act
  reachable?: Props['reachable']
}) {
  const [tested, setTested] = useState<{
    device: string
    ok: boolean
    detail: string
  } | null>(null)
  const session = state.session ? findDevice(state, state.session.device) : undefined
  if (session)
    return <RemoteSession state={state} device={session} editable={editable} act={act} />
  const device = selected ? findDevice(state, selected) : undefined
  const computers = state.devices.filter((d) => d.type !== 'printer')
  const canReach = (d: Device) => d.status === 'online' && (reachable?.(d.name) ?? true)
  return (
    <div
      className="mx-auto max-w-3xl space-y-4 overflow-y-auto p-6"
      data-testid="remote-connect"
    >
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Remote Desktop</h2>
        <p className="text-sm text-slate-600">
          Connect to a user’s computer to see what they see and fix it with its own tools.
          Tell the user before you connect, and disconnect when you are done.
        </p>
      </header>
      <label className="flex flex-col gap-1 text-sm">
        Computer
        <select
          aria-label="Computer to connect to"
          value={device?.name ?? ''}
          onChange={(e) => {
            onSelect(e.target.value)
            setTested(null)
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5"
        >
          <option value="">Choose a computer…</option>
          {computers.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} · {d.owner} ({d.department})
            </option>
          ))}
        </select>
      </label>
      {device && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-mono font-semibold text-slate-900">{device.name}</p>
              <p className="text-slate-600">
                {device.owner} · {device.os} ·{' '}
                <span className="font-mono">{device.ip}</span>
              </p>
            </div>
            <Pill tone={device.status === 'online' ? 'green' : 'slate'}>
              {device.status === 'online' ? 'Online' : 'Offline'}
            </Pill>
          </div>
          {tested?.device === device.name && (
            <p
              className={`rounded-md px-3 py-2 ${tested.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}
              data-testid="reachability"
            >
              {tested.detail}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className={BUTTON}
              onClick={() => {
                const ok = canReach(device)
                setTested({
                  device: device.name,
                  ok,
                  detail: ok
                    ? `Reply from ${device.ip}: ${device.name} is reachable.`
                    : `No reply from ${device.ip}: ${device.name} is ${device.status === 'offline' ? 'offline (asleep or away from the office)' : 'not reachable on the network'}.`,
                })
              }}
            >
              Test connection
            </button>
            <button
              type="button"
              className={PRIMARY}
              disabled={!editable}
              onClick={() =>
                act(
                  (s) => connect(s, device.name, canReach(device)),
                  `Connected to ${device.name}.`,
                )
              }
            >
              Connect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RemoteSession({
  state,
  device,
  editable,
  act,
}: {
  state: DevicesState
  device: Device
  editable: boolean
  act: Act
}) {
  const [windows, setWindows] = useState<string[]>([])
  const [front, setFront] = useState<string | null>(null)
  const openUtility = (id: string) => {
    setWindows((w) => (w.includes(id) ? w : [...w, id]))
    setFront(id)
  }
  const close = (id: string) => {
    setWindows((w) => w.filter((x) => x !== id))
    setFront((f) => (f === id ? null : f))
  }
  const on = (fn: (s: DevicesState, name: string) => Result, done: string) =>
    act((s) => fn(s, device.name), done)

  return (
    <div className="flex h-full min-h-0 flex-col p-3" data-testid="remote-session">
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-t-lg bg-slate-800 px-3 py-1.5 text-sm text-white">
        <Icon name="remote" className="h-4 w-4 text-teal-300" />
        <span className="font-medium">
          {device.name} · {device.owner}
        </span>
        <span className="text-xs text-slate-300">
          Remote session · the user can see what you do
        </span>
        <span className="ml-auto flex gap-2">
          <ConfirmButton
            label="Restart computer"
            confirm={`Restart ${device.name}? ${device.owner.split(' ')[0]} should save their work first.`}
            onConfirm={() =>
              on(restartDevice, `${device.name} restarted. The remote session has ended.`)
            }
          />
          <button
            type="button"
            className="rounded-md bg-teal-600 px-3 py-1 text-sm font-medium hover:bg-teal-500"
            onClick={() => act((s) => disconnect(s), `Disconnected from ${device.name}.`)}
          >
            Disconnect
          </button>
        </span>
      </div>
      {/* The remote computer's screen */}
      <div
        className="relative min-h-[28rem] flex-1 overflow-hidden rounded-b-lg border border-slate-700 bg-gradient-to-br from-slate-700 to-teal-900"
        aria-label={`${device.name} desktop`}
      >
        <div className="grid w-64 grid-cols-3 content-start gap-1 p-3">
          {UTILITIES.map((u) => (
            <button
              key={u.id}
              type="button"
              onDoubleClick={() => openUtility(u.id)}
              onClick={() => openUtility(u.id)}
              className="flex flex-col items-center gap-1 rounded p-1.5 text-center text-xs text-white hover:bg-white/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15">
                <Icon name={u.icon} className="h-5 w-5" />
              </span>
              {u.name}
            </button>
          ))}
        </div>
        {windows.map((id, i) => {
          const utility = UTILITIES.find((u) => u.id === id)!
          return (
            <section
              key={id}
              role="dialog"
              aria-label={utility.name}
              onMouseDown={() => setFront(id)}
              className="absolute flex max-h-[85%] flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-2xl"
              style={{
                left: `calc(16.75rem + ${i * 1.25}rem)`,
                top: `${0.75 + i * 1.25}rem`,
                right: `${Math.max(0.75, 3 - i)}rem`,
                zIndex: front === id ? 20 : 10 + i,
              }}
              data-testid={`utility-${id}`}
            >
              <header className="flex shrink-0 items-center justify-between bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Icon name={utility.icon} className="h-4 w-4" />
                  {utility.name}
                </span>
                <button
                  type="button"
                  aria-label={`Close ${utility.name}`}
                  onClick={() => close(id)}
                  className="rounded p-0.5 hover:bg-slate-200"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
                <Utility
                  id={id}
                  state={state}
                  device={device}
                  editable={editable}
                  on={on}
                />
              </div>
            </section>
          )
        })}
        {/* Taskbar */}
        <div className="absolute inset-x-0 bottom-0 flex h-9 items-center gap-1 bg-slate-900/90 px-2 text-xs text-white">
          <Icon name="desktop" className="h-4 w-4 text-teal-300" />
          {windows.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFront(id)}
              className={`rounded px-2 py-1 ${front === id ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              {UTILITIES.find((u) => u.id === id)!.name}
            </button>
          ))}
          <span className="ml-auto text-slate-300">{device.name}</span>
        </div>
      </div>
    </div>
  )
}

function Utility({
  id,
  state,
  device,
  editable,
  on,
}: {
  id: string
  state: DevicesState
  device: Device
  editable: boolean
  on: (fn: (s: DevicesState, name: string) => Result, done: string) => void
}) {
  switch (id) {
    case 'system':
      return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-slate-500">Device name</dt>
          <dd className="font-mono">{device.name}</dd>
          <dt className="text-slate-500">Edition</dt>
          <dd>{device.os}</dd>
          <dt className="text-slate-500">Model</dt>
          <dd>{device.model}</dd>
          <dt className="text-slate-500">Memory</dt>
          <dd>{device.memoryGb} GB</dd>
          <dt className="text-slate-500">IP address</dt>
          <dd className="font-mono">{device.ip}</dd>
          <dt className="text-slate-500">Signed in</dt>
          <dd>{device.owner}</dd>
        </dl>
      )
    case 'tasks': {
      const cpu = cpuOf(device)
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Processor</p>
              <p
                className={`text-lg font-semibold ${cpu >= 80 ? 'text-red-700' : 'text-slate-900'}`}
                data-testid="cpu"
              >
                {cpu}%
              </p>
              <Bar
                value={cpu}
                max={100}
                tone={cpu >= 80 ? 'bg-red-500' : 'bg-teal-600'}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Memory</p>
              <p className="text-lg font-semibold text-slate-900">
                {memoryUsedGb(device)} / {device.memoryGb} GB
              </p>
              <Bar
                value={memoryUsedGb(device)}
                max={device.memoryGb}
                tone="bg-teal-600"
              />
            </div>
          </div>
          <table className="w-full text-left" aria-label="Processes">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-1">Name</th>
                <th>CPU</th>
                <th>Memory</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...device.processes]
                .sort((a, b) => b.cpu - a.cpu)
                .map((p) => (
                  <tr key={p.name} className="border-t border-slate-100">
                    <td className="py-1">
                      {p.name}
                      <span className="block text-xs text-slate-500">
                        {p.description}
                        {p.system ? ' · Windows' : ''}
                      </span>
                    </td>
                    <td className={p.cpu >= 50 ? 'font-semibold text-red-700' : ''}>
                      {p.cpu}%
                    </td>
                    <td>{p.memoryMb} MB</td>
                    <td className="text-right">
                      {editable && (
                        <ConfirmButton
                          label="End task"
                          confirm={`End ${p.name}?`}
                          onConfirm={() =>
                            on((s, n) => endProcess(s, n, p.name), `${p.name} ended.`)
                          }
                        />
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'storage':
      return (
        <div className="space-y-3">
          <p className="text-lg font-semibold text-slate-900" data-testid="free-storage">
            {freeGb(device)} GB free of {device.storage.totalGb} GB
          </p>
          <Bar
            value={device.storage.usedGb}
            max={device.storage.totalGb}
            tone={
              freeGb(device) < device.storage.totalGb * 0.1 ? 'bg-red-500' : 'bg-teal-600'
            }
          />
          <ul className="space-y-0.5 text-slate-700">
            <li>Temporary files: {device.storage.tempGb} GB</li>
            <li>
              Apps, Windows and the user’s files:{' '}
              {Math.round((device.storage.usedGb - device.storage.tempGb) * 10) / 10} GB
            </li>
          </ul>
          {editable && (
            <button
              type="button"
              className={PRIMARY}
              onClick={() => on(diskCleanup, 'Temporary files removed.')}
            >
              Clean up temporary files
            </button>
          )}
        </div>
      )
    case 'services':
      return (
        <table className="w-full text-left" aria-label="Services">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1">Service</th>
              <th>Status</th>
              <th>Startup</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {device.services.map((s) => (
              <tr key={s.name} className="border-t border-slate-100">
                <td className="py-1">{s.name}</td>
                <td>
                  {s.running ? (
                    <Pill tone="green">Running</Pill>
                  ) : (
                    <Pill tone="red">Stopped</Pill>
                  )}
                </td>
                <td className="capitalize">{s.startup}</td>
                <td className="space-x-1 text-right">
                  {editable && (
                    <>
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() =>
                          on(
                            (st, n) => restartService(st, n, s.name),
                            `${s.name} ${s.running ? 'restarted' : 'started'}.`,
                          )
                        }
                      >
                        {s.running ? 'Restart' : 'Start'}
                      </button>
                      {s.running && (
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() =>
                            on(
                              (st, n) => stopService(st, n, s.name),
                              `${s.name} stopped.`,
                            )
                          }
                        >
                          Stop
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'apps':
      return (
        <ul className="divide-y divide-slate-100" aria-label="Apps">
          {device.apps.map((a) => (
            <li
              key={a.name}
              className="flex flex-wrap items-center justify-between gap-2 py-1.5"
              data-testid="app-row"
            >
              <span>
                <span className="font-medium">{a.name}</span>{' '}
                <span className="text-xs text-slate-500">
                  {a.state === 'not-installed' ? `Available ${a.latest}` : a.version}
                  {!a.approved && ' · not approved'}
                </span>
              </span>
              <span className="flex items-center gap-1">
                {a.state === 'crashing' && <Pill tone="red">Crashing</Pill>}
                {a.state === 'install-failed' && <Pill tone="red">Install failed</Pill>}
                {editable &&
                  (a.state === 'not-installed' || a.state === 'install-failed' ? (
                    <button
                      type="button"
                      className={BUTTON}
                      onClick={() =>
                        on((s, n) => installApp(s, n, a.name), `${a.name} installed.`)
                      }
                    >
                      Install
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() =>
                          on((s, n) => repairApp(s, n, a.name), `${a.name} repaired.`)
                        }
                      >
                        Repair
                      </button>
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() =>
                          on((s, n) => installApp(s, n, a.name), `${a.name} reinstalled.`)
                        }
                      >
                        Reinstall
                      </button>
                      <ConfirmButton
                        label="Uninstall"
                        danger
                        confirm={`Uninstall ${a.name}?`}
                        onConfirm={() =>
                          on(
                            (s, n) => uninstallApp(s, n, a.name),
                            `${a.name} uninstalled.`,
                          )
                        }
                      />
                    </>
                  ))}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'network':
      return (
        <div className="space-y-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-slate-500">Connection</dt>
            <dd>{device.network.connection}</dd>
            <dt className="text-slate-500">Settings</dt>
            <dd className="capitalize">{device.network.mode}</dd>
            <dt className="text-slate-500">DNS server</dt>
            <dd className="font-mono">{device.network.dns}</dd>
            <dt className="text-slate-500">Proxy</dt>
            <dd className="font-mono" data-testid="proxy">
              {device.network.proxy || 'None'}
            </dd>
          </dl>
          {!standardNetwork(state, device) && (
            <p className="rounded-md bg-amber-50 p-2 text-amber-950">
              These are not the company’s standard settings (automatic, DNS{' '}
              {state.standard.dns}, no proxy).
            </p>
          )}
          {editable && (
            <button
              type="button"
              className={PRIMARY}
              onClick={() => on(resetNetwork, 'Network settings set to automatic.')}
            >
              Use automatic settings
            </button>
          )}
        </div>
      )
    case 'updates':
      return (
        <div className="space-y-2">
          {device.restartPending && (
            <p className="rounded-md bg-amber-50 p-2 text-amber-950">
              A restart is needed to finish installing updates.
            </p>
          )}
          <ul className="divide-y divide-slate-100">
            {device.updates.map((u) => (
              <li key={u.id} className="py-1.5">
                <span className="flex justify-between gap-2">
                  <span>
                    {u.title} <span className="text-xs text-slate-500">({u.id})</span>
                  </span>
                  <Pill
                    tone={
                      u.state === 'installed'
                        ? 'green'
                        : u.state === 'failed'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    {u.state === 'installed'
                      ? 'Installed'
                      : u.state === 'failed'
                        ? 'Failed'
                        : 'Pending'}
                  </Pill>
                </span>
                {u.error && <span className="block text-xs text-red-700">{u.error}</span>}
              </li>
            ))}
          </ul>
          {editable && (
            <button
              type="button"
              className={PRIMARY}
              onClick={() => on(installUpdates, 'Updates installed. Restart to finish.')}
            >
              Retry updates
            </button>
          )}
        </div>
      )
    case 'events':
      return (
        <ul className="space-y-1" aria-label="Events">
          {[...device.events].reverse().map((e, i) => (
            <li
              key={i}
              className={
                e.level === 'error'
                  ? 'text-red-800'
                  : e.level === 'warning'
                    ? 'text-amber-900'
                    : 'text-slate-700'
              }
            >
              <span className="mr-2 font-mono text-xs text-slate-500">{e.time}</span>
              <span className="font-medium capitalize">{e.level}</span> · {e.source}:{' '}
              {e.message}
            </li>
          ))}
        </ul>
      )
    case 'printers':
      return (
        <div className="space-y-2">
          <p className="text-slate-700">
            Print Spooler:{' '}
            {device.services.find((s) => s.name === 'Print Spooler')?.running
              ? 'running'
              : 'stopped'}
          </p>
          {device.printQueue.length === 0 ? (
            <p className="text-slate-500">No documents waiting.</p>
          ) : (
            <ul className="space-y-0.5" aria-label="Print queue">
              {device.printQueue.map((j, i) => (
                <li key={i} className={j.stuck ? 'text-red-800' : ''}>
                  {j.document} {j.stuck ? '· stuck' : '· waiting'}
                </li>
              ))}
            </ul>
          )}
          {editable && device.printQueue.length > 0 && (
            <button
              type="button"
              className={BUTTON}
              onClick={() => on(clearPrintQueue, 'Print queue cleared.')}
            >
              Clear queue
            </button>
          )}
        </div>
      )
    default:
      return null
  }
}
