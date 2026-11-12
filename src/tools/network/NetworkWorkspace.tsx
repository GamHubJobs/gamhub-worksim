/** Network Tools: console, network map, DNS records and findings. */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../ui/Icon'
import type { ToolWorkspaceProps } from '../ui'
import {
  addFinding,
  clearConsole,
  removeFinding,
  restartDevice,
  restartService,
  runConsole,
  setDnsRecord,
  switchToAutomaticSettings,
} from './actions'
import { network } from './definition'
import { FAULT_NAMES, FAULTS, type Fault, type NetworkState } from './schema'
import { onNetwork } from './simulation'

type Props = ToolWorkspaceProps<NetworkState>
type Act = (fn: (s: NetworkState) => { state: NetworkState; problems: string[] }) => void

const cell = 'px-3 py-1.5'
const BUTTON =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 disabled:opacity-40'
const PRIMARY =
  'rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50'

export default function NetworkWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
}: Props) {
  const [section, setSection] = useState('console')
  const [problems, setProblems] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const editable = !readOnly && !!onUpdate
  const act: Act = (fn) => {
    const result = fn(state)
    if (result.problems.length > 0) {
      setNotice(null)
      return setProblems(result.problems)
    }
    setProblems([])
    onUpdate?.((s) => fn(s).state)
  }
  return (
    <div className="flex h-full min-h-0 bg-slate-50" data-testid="network">
      <nav
        aria-label="Network Tools sections"
        className="w-48 shrink-0 space-y-0.5 border-r border-slate-200 bg-white p-2"
      >
        {network.sections.map((s) => {
          const locked = lockedSections[s.id]
          return (
            <button
              key={s.id}
              type="button"
              disabled={!!locked}
              title={locked ? `Unlocks when you become ${locked}.` : s.description}
              onClick={() => {
                setSection(s.id)
                setProblems([])
                setNotice(null)
              }}
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
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5">
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
        {notice && (
          <p
            className="mb-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900"
            role="status"
          >
            {notice}
          </p>
        )}
        {section === 'console' && (
          <Console state={state} editable={editable} update={(c) => onUpdate?.(c)} />
        )}
        {section === 'map' && (
          <NetworkMap state={state} editable={editable} act={act} onDone={setNotice} />
        )}
        {section === 'dns' && (
          <DnsRecords state={state} editable={editable} act={act} onDone={setNotice} />
        )}
        {section === 'findings' && (
          <Findings
            state={state}
            editable={editable}
            act={act}
            update={(c) => onUpdate?.(c)}
          />
        )}
      </div>
    </div>
  )
}

function Console({
  state,
  editable,
  update,
}: {
  state: NetworkState
  editable: boolean
  update: (change: (s: NetworkState) => NetworkState) => void
}) {
  const [from, setFrom] = useState(state.home)
  const [command, setCommand] = useState('')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const screen = useRef<HTMLDivElement>(null)
  const computers = state.devices.filter((d) => d.config)
  const commands = state.console.map((e) => e.command)
  useEffect(() => {
    screen.current?.scrollTo({ top: screen.current.scrollHeight })
  }, [state.console.length])
  const run = () => {
    if (!command.trim()) return
    const text = command
    update((s) => runConsole(s, from, text))
    setCommand('')
    setHistoryIndex(null)
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="network-console">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          Run from
          <select
            aria-label="Run from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {computers.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
                {d.description ? ` (${d.description})` : ''}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">
          {from === state.home
            ? 'Your computer.'
            : 'Remote support session on the user’s computer.'}
        </span>
        {editable && state.console.length > 0 && (
          <button
            type="button"
            className={`ml-auto ${BUTTON}`}
            onClick={() => update(clearConsole)}
          >
            Clear
          </button>
        )}
      </div>
      <div
        ref={screen}
        className="min-h-72 flex-1 overflow-y-auto rounded-t-lg bg-slate-950 p-3 font-mono text-[13px] leading-5 text-slate-100"
        data-testid="console-output"
      >
        {state.console.length === 0 && (
          <p className="text-slate-300">
            Type a command, e.g. <span className="text-slate-200">ping print-01</span>, or{' '}
            <span className="text-slate-200">help</span>.
          </p>
        )}
        {state.console.map((entry, i) => (
          <div key={i} className="mb-2">
            <div className="text-emerald-300">
              {entry.from}&gt; {entry.command}
            </div>
            {entry.output.map((line, k) => (
              <div key={k} className="whitespace-pre-wrap">
                {line || ' '}
              </div>
            ))}
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2 rounded-b-lg bg-slate-900 px-3 py-2 font-mono text-sm"
        onSubmit={(e) => {
          e.preventDefault()
          run()
        }}
      >
        <span className="text-emerald-300">{from}&gt;</span>
        <input
          aria-label="Command"
          value={command}
          disabled={!editable}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && commands.length > 0) {
              e.preventDefault()
              const i =
                historyIndex === null
                  ? commands.length - 1
                  : Math.max(0, historyIndex - 1)
              setHistoryIndex(i)
              setCommand(commands[i])
            }
            if (e.key === 'ArrowDown' && historyIndex !== null) {
              e.preventDefault()
              const i = historyIndex + 1
              if (i >= commands.length) {
                setHistoryIndex(null)
                setCommand('')
              } else {
                setHistoryIndex(i)
                setCommand(commands[i])
              }
            }
          }}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none"
        />
      </form>
    </div>
  )
}

function NetworkMap({
  state,
  editable,
  act,
  onDone,
}: {
  state: NetworkState
  editable: boolean
  act: Act
  onDone: (message: string) => void
}) {
  const groups = [
    ...state.subnets.map((s) => ({
      id: s.id,
      name: `${s.name} (${s.prefix}.x, gateway ${s.gateway})`,
    })),
    { id: '', name: 'Internet' },
  ]
  return (
    <div data-testid="network-map">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Network map</h2>
      <p className="mb-3 text-sm text-slate-600">
        What the monitoring system knows about each device. It shows the facts, not the
        diagnosis: use the console to test.
      </p>
      {groups.map((g) => (
        <section key={g.id || 'internet'} className="mb-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">{g.name}</h3>
          <table className="w-full rounded-lg border border-slate-200 bg-white text-sm">
            <tbody>
              {state.devices
                .filter((d) => d.subnet === g.id)
                .map((d) => (
                  <tr
                    key={d.name}
                    className="border-t border-slate-100 align-top first:border-t-0"
                    data-testid="device-row"
                  >
                    <td className={`${cell} w-40 font-mono`}>{d.name}</td>
                    <td className={`${cell} w-32 font-mono text-slate-600`}>{d.ip}</td>
                    <td className={cell}>
                      <span className="text-slate-700">{d.kind.replace('-', ' ')}</span>
                      {d.description && (
                        <span className="block text-xs text-slate-500">
                          {d.description}
                        </span>
                      )}
                      {d.accessPoint && (
                        <span className="block text-xs text-slate-500">
                          Wi-Fi through {d.accessPoint}
                        </span>
                      )}
                      {d.services.length > 0 && (
                        <span className="block text-xs text-slate-500">
                          Services:{' '}
                          {d.services.map((s) => `${s.name} (${s.port})`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className={`${cell} w-28`}>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${onNetwork(state, d) ? 'text-emerald-700' : 'text-red-700'}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${onNetwork(state, d) ? 'bg-emerald-500' : 'bg-red-500'}`}
                        />
                        {!d.up
                          ? 'No response'
                          : onNetwork(state, d)
                            ? 'Responding'
                            : 'No network'}
                      </span>
                    </td>
                    {editable && (
                      <td className={`${cell} w-64`}>
                        <div className="flex flex-wrap gap-1">
                          {d.kind !== 'external' && (
                            <button
                              type="button"
                              className={BUTTON}
                              aria-label={`Restart ${d.name}`}
                              onClick={() => {
                                act((s) => restartDevice(s, d.name))
                                if (d.restartable || d.up) onDone(`${d.name} restarted.`)
                              }}
                            >
                              Restart
                            </button>
                          )}
                          {d.services.map((s) => (
                            <button
                              key={s.port}
                              type="button"
                              className={BUTTON}
                              aria-label={`Restart ${s.name} on ${d.name}`}
                              onClick={() => {
                                act((st) => restartService(st, d.name, s.port))
                                if (d.up) onDone(`${s.name} on ${d.name} restarted.`)
                              }}
                            >
                              Restart {s.name.split(' (')[0]}
                            </button>
                          ))}
                          {d.config && (
                            <button
                              type="button"
                              className={BUTTON}
                              aria-label={`Use automatic settings on ${d.name}`}
                              title="Switch the computer back to automatic network settings (DHCP)"
                              onClick={() => {
                                act((s) => switchToAutomaticSettings(s, d.name))
                                if (d.up)
                                  onDone(`${d.name} now uses automatic network settings.`)
                              }}
                            >
                              Use automatic settings
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}

function DnsRecords({
  state,
  editable,
  act,
  onDone,
}: {
  state: NetworkState
  editable: boolean
  act: Act
  onDone: (message: string) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [ip, setIp] = useState('')
  return (
    <div data-testid="dns-records">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">DNS records</h2>
      <p className="mb-3 text-sm text-slate-600">
        Held on the DNS server ({state.dns.server}). Changing a record changes where
        everyone goes when they use that name.
      </p>
      <table className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
          <tr>
            <th className={cell}>Name</th>
            <th className={cell}>Points to</th>
            {editable && <th className={cell} />}
          </tr>
        </thead>
        <tbody>
          {state.dns.records.map((r) => (
            <tr key={r.name} className="border-t border-slate-100" data-testid="dns-row">
              <td className={`${cell} font-mono`}>{r.name}</td>
              <td className={`${cell} font-mono`}>
                {editing === r.name ? (
                  <input
                    aria-label={`Address for ${r.name}`}
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="w-36 rounded border border-slate-300 px-2 py-0.5"
                  />
                ) : (
                  r.ip
                )}
              </td>
              {editable && (
                <td className={`${cell} text-right`}>
                  {editing === r.name ? (
                    <span className="flex justify-end gap-1">
                      <button
                        type="button"
                        className={PRIMARY}
                        onClick={() => {
                          act((s) => setDnsRecord(s, r.name, ip.trim()))
                          if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip.trim())) {
                            onDone(`${r.name} now points to ${ip.trim()}.`)
                            setEditing(null)
                          }
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={BUTTON}
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Edit ${r.name}`}
                      className={BUTTON}
                      onClick={() => {
                        setEditing(r.name)
                        setIp(r.ip)
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Findings({
  state,
  editable,
  act,
  update,
}: {
  state: NetworkState
  editable: boolean
  act: Act
  update: (change: (s: NetworkState) => NetworkState) => void
}) {
  const [device, setDevice] = useState('')
  const [fault, setFault] = useState<Fault | ''>('')
  const [note, setNote] = useState('')
  return (
    <div data-testid="findings">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Findings</h2>
      <p className="mb-3 text-sm text-slate-600">
        Record each cause you find: the device and what is wrong with it, with the
        evidence in a note. This goes on the ticket.
      </p>
      {editable && (
        <form
          className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            if (!fault) return
            act((s) => addFinding(s, { device, fault, note }))
            if (device) {
              setDevice('')
              setFault('')
              setNote('')
            }
          }}
        >
          <label className="flex flex-col gap-1">
            Device
            <select
              aria-label="Finding device"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Choose…</option>
              {state.devices.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            What is wrong
            <select
              aria-label="Fault"
              value={fault}
              onChange={(e) => setFault(e.target.value as Fault)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Choose…</option>
              {FAULTS.map((f) => (
                <option key={f} value={f}>
                  {FAULT_NAMES[f]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            Evidence
            <input
              aria-label="Evidence"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. portcheck print-01 631 fails, ping works"
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <button type="submit" className={PRIMARY} disabled={!device || !fault}>
            Add finding
          </button>
        </form>
      )}
      {state.findings.length === 0 ? (
        <p className="text-sm text-slate-500">No findings yet.</p>
      ) : (
        <ul className="space-y-2">
          {state.findings.map((f) => (
            <li
              key={f.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"
              data-testid="finding"
            >
              <div>
                <p>
                  <span className="font-mono font-medium">{f.device}</span>:{' '}
                  {FAULT_NAMES[f.fault]}
                </p>
                {f.note && <p className="text-slate-600">{f.note}</p>}
              </div>
              {editable && (
                <button
                  type="button"
                  className="text-xs text-slate-500 underline"
                  onClick={() => update((s) => removeFinding(s, f.id))}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
