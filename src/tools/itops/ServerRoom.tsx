/**
 * Server Room: the overview (is anything down, and how many people does it
 * touch), the topology (the path from the internet to each zone), the
 * network equipment and the servers with their services.
 */
import { useState } from 'react'
import { Icon } from '../../ui/Icon'
import {
  BUTTON,
  CARD,
  ConfirmButton,
  Meter,
  Pill,
  SubTabs,
  type SectionProps,
  type Tone,
} from './kit'
import {
  checkIsp,
  cpuOfNode,
  ispLatency,
  nodeState,
  onSiteOnly,
  powerOnNode,
  rebootNode,
  restartNodeService,
  serverIssues,
  shutdownNode,
} from './model'
import type { ItopsState, Node } from './schema'

type Tab = 'overview' | 'topology' | 'devices' | 'servers'

const STATE_TONE: Record<ReturnType<typeof nodeState>, Tone> = {
  up: 'green',
  down: 'red',
  off: 'slate',
  unreachable: 'amber',
}
const STATE_NAME: Record<ReturnType<typeof nodeState>, string> = {
  up: 'Online',
  down: 'Not responding',
  off: 'Powered off',
  unreachable: 'Unreachable',
}

/** Up, with every service running (a server can be up with a service down). */
const serverHealthy = (state: ItopsState, node: Node) =>
  nodeState(state, node) === 'up' && node.services.every((s) => s.state === 'running')

function StatusPill({ state, node }: { state: ItopsState; node: Node }) {
  const s = nodeState(state, node)
  if (s === 'up' && !serverHealthy(state, node))
    return <Pill tone="amber">Service problem</Pill>
  return <Pill tone={STATE_TONE[s]}>{STATE_NAME[s]}</Pill>
}

const isServer = (n: Node) => n.kind === 'server'

function NodeActions({ node, ...p }: SectionProps & { node: Node }) {
  if (!p.editable) return null
  if (node.kind === 'isp')
    return (
      <button type="button" className={BUTTON} onClick={() => p.act(checkIsp)}>
        Check ISP status
      </button>
    )
  if (!onSiteOnly(node).remote)
    return (
      <span
        className="inline-flex max-w-xs items-start gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-950"
        data-testid="on-site-only"
      >
        <Icon name="user" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Not answering remotely: power-cycle it at the {node.location.toLowerCase()} (walk
        there in the office).
      </span>
    )
  if (node.status === 'off')
    return (
      <button
        type="button"
        className={BUTTON}
        onClick={() => p.act((s) => powerOnNode(s, node.id))}
      >
        Power on
      </button>
    )
  const impact = node.users ? `About ${node.users} people depend on ${node.id}.` : ''
  return (
    <span className="flex flex-wrap gap-1.5">
      <ConfirmButton
        label="Reboot"
        confirm={`Reboot ${node.id}? ${impact}`}
        onConfirm={() => p.act((s) => rebootNode(s, node.id))}
      />
      <ConfirmButton
        label="Shut down"
        confirm={`Shut down ${node.id}? ${impact} It stays off until powered on.`}
        onConfirm={() => p.act((s) => shutdownNode(s, node.id))}
      />
    </span>
  )
}

function Overview(p: SectionProps) {
  const { state } = p
  const isp = state.nodes.find((n) => n.kind === 'isp')
  const devices = state.nodes.filter((n) => !isServer(n))
  const servers = state.nodes.filter(isServer)
  const upDevices = devices.filter((n) => nodeState(state, n) === 'up').length
  const upServers = servers.filter((n) => serverHealthy(state, n)).length
  const issues = serverIssues(state)
  const load = Math.round(
    servers.reduce((sum, n) => sum + cpuOfNode(n), 0) / Math.max(1, servers.length),
  )
  const latency = ispLatency(state)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={CARD} data-testid="isp-card">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Internet provider
          </p>
          <p className="mt-1 font-semibold text-slate-900">{isp?.name}</p>
          <p className="mt-1 flex items-center gap-2 text-sm">
            {isp && <StatusPill state={state} node={isp} />}
            <span className="text-slate-700">
              {latency === null ? 'No response' : `${latency} ms latency`}
            </span>
          </p>
          {state.ispChecked && (
            <p className="mt-2 text-xs text-slate-700">
              {state.ispOutage
                ? 'Provider confirmed an outage in the area: theirs to fix.'
                : 'Provider reports no outage.'}
            </p>
          )}
        </div>
        <div className={CARD}>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Network health
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${issues.length ? 'text-red-800' : 'text-emerald-800'}`}
          >
            {issues.length ? 'Needs attention' : 'All clear'}
          </p>
          <p className="text-xs text-slate-600">Average server load {load}%</p>
        </div>
        <div className={CARD}>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Network devices
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
            {upDevices}
            <span className="text-base font-normal text-slate-500">
              {' '}
              / {devices.length} online
            </span>
          </p>
        </div>
        <div className={CARD}>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Servers
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
            {upServers}
            <span className="text-base font-normal text-slate-500">
              {' '}
              / {servers.length} healthy
            </span>
          </p>
        </div>
      </div>
      {issues.length > 0 && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          data-testid="server-issues"
        >
          <p className="font-medium">What needs attention</p>
          <ul className="mt-1 list-disc pl-5">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={CARD} aria-label="Device status">
          <h3 className="mb-2 font-semibold text-slate-900">Device status</h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {devices.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-2 py-1.5">
                <span>
                  <span className="font-medium text-slate-900">{n.id}</span>{' '}
                  <span className="text-slate-500">{n.zone}</span>
                </span>
                <StatusPill state={state} node={n} />
              </li>
            ))}
          </ul>
        </section>
        <section className={CARD} aria-label="Server status">
          <h3 className="mb-2 font-semibold text-slate-900">Server status</h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {servers.map((n) => (
              <li
                key={n.id}
                className="grid grid-cols-[5.5rem_1fr_1fr_auto] items-center gap-2 py-1.5"
              >
                <span className="font-medium text-slate-900">{n.id}</span>
                <Meter value={cpuOfNode(n)} label={`${n.id} CPU`} />
                <Meter
                  value={n.status === 'up' ? n.memory : 0}
                  label={`${n.id} memory`}
                />
                <StatusPill state={state} node={n} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Box({ state, node }: { state: ItopsState; node: Node }) {
  const s = nodeState(state, node)
  const tone =
    s === 'up'
      ? 'border-teal-600 bg-teal-50 text-teal-950'
      : s === 'unreachable'
        ? 'border-amber-500 bg-amber-50 text-amber-950'
        : 'border-slate-300 bg-slate-200 text-slate-600'
  return (
    <div
      className={`min-w-28 rounded-md border-2 px-2 py-1 text-center text-xs ${tone}`}
      title={`${node.name}: ${STATE_NAME[s]}. ${node.role}`}
      data-testid="topology-node"
      data-state={s}
    >
      <p className="font-semibold">{node.id}</p>
      <p className="tabular-nums">{node.ip}</p>
      {s !== 'up' && <p className="font-medium">{STATE_NAME[s]}</p>}
    </div>
  )
}

const Line = () => <div className="mx-auto h-4 w-0.5 bg-slate-400" aria-hidden />

function Topology({ state }: SectionProps) {
  const core = ['ISP', 'EDGE-RTR', 'FW-01']
    .map((id) => state.nodes.find((n) => n.id === id))
    .filter((n): n is Node => !!n)
  const zones = [
    ...new Set(state.nodes.filter((n) => !core.includes(n)).map((n) => n.zone)),
  ]
  return (
    <div className={`${CARD} overflow-x-auto`}>
      <p className="mb-3 text-sm text-slate-600">
        Everything above the fan-out is shared by everyone; each zone below belongs to one
        group of people. Find the lowest box that sits above everyone who is complaining.
      </p>
      <div className="flex flex-col items-center">
        <p className="rounded-full bg-slate-800 px-3 py-0.5 text-xs font-semibold text-white">
          INTERNET
        </p>
        {core.map((n) => (
          <div key={n.id} className="flex flex-col items-center">
            <Line />
            <Box state={state} node={n} />
          </div>
        ))}
        <Line />
        <div className="h-0.5 w-full max-w-4xl bg-slate-400" aria-hidden />
        <div className="flex w-full max-w-5xl flex-wrap justify-center gap-4">
          {zones.map((zone) => {
            const nodes = state.nodes.filter((n) => n.zone === zone && !core.includes(n))
            const top = nodes.filter((n) => !nodes.some((m) => m.id === n.upstream))
            return (
              <div key={zone} className="flex flex-col items-center">
                <Line />
                <div className="rounded-lg border border-dashed border-slate-300 p-2">
                  <p className="mb-1 text-center text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                    {zone}
                  </p>
                  {top.map((t) => (
                    <div key={t.id} className="flex flex-col items-center">
                      <Box state={state} node={t} />
                      {nodes.some((n) => n.upstream === t.id) && (
                        <>
                          <Line />
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {nodes
                              .filter((n) => n.upstream === t.id)
                              .map((n) => (
                                <Box key={n.id} state={state} node={n} />
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <p className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border-2 border-teal-600 bg-teal-50" /> Up
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border-2 border-slate-300 bg-slate-200" /> Down
          or off
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border-2 border-amber-500 bg-amber-50" /> Cut
          off by a fault above
        </span>
      </p>
    </div>
  )
}

function DevicesTable(p: SectionProps) {
  const { state } = p
  return (
    <div className={`${CARD} overflow-x-auto p-0`}>
      <table className="w-full text-left text-sm" aria-label="Network equipment">
        <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
          <tr>
            {['Device', 'IP address', 'Location', 'Uptime', 'Status', 'Action'].map(
              (h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {state.nodes
            .filter((n) => !isServer(n))
            .map((n) => (
              <tr key={n.id} data-testid="network-device" data-node={n.id}>
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900">{n.name}</p>
                  <p className="text-xs text-slate-500">{n.role}</p>
                </td>
                <td className="px-3 py-2 tabular-nums">{n.ip}</td>
                <td className="px-3 py-2">{n.location}</td>
                <td className="px-3 py-2 tabular-nums">
                  {n.status === 'up' ? `${n.uptimeDays} days` : '—'}
                </td>
                <td className="px-3 py-2">
                  <StatusPill state={state} node={n} />
                </td>
                <td className="px-3 py-2">
                  <NodeActions {...p} node={n} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

function Servers(p: SectionProps) {
  const { state } = p
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {state.nodes.filter(isServer).map((n) => (
        <section
          key={n.id}
          className={CARD}
          aria-label={n.id}
          data-testid="server"
          data-node={n.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <Icon name="server" className="h-4 w-4" /> {n.id}
                <StatusPill state={state} node={n} />
              </h3>
              <p className="text-xs text-slate-600">
                {n.role} · {n.ip} · {n.location}
              </p>
            </div>
            <NodeActions {...p} node={n} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              CPU <Meter value={cpuOfNode(n)} label={`${n.id} CPU`} />
            </span>
            <span className="flex items-center gap-1">
              Memory{' '}
              <Meter value={n.status === 'up' ? n.memory : 0} label={`${n.id} memory`} />
            </span>
            <span>Up {n.status === 'up' ? `${n.uptimeDays} days` : '—'}</span>
          </div>
          <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
            {n.services.map((s) => (
              <li
                key={s.name}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5"
              >
                <span>
                  <span className="font-medium text-slate-900">{s.name}</span>
                  <span className="block text-xs text-slate-500">{s.description}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Pill
                    tone={
                      n.status !== 'up'
                        ? 'slate'
                        : s.state === 'running'
                          ? 'green'
                          : s.state === 'hung'
                            ? 'amber'
                            : 'red'
                    }
                  >
                    {n.status !== 'up'
                      ? 'Unknown'
                      : s.state === 'running'
                        ? 'Running'
                        : s.state === 'hung'
                          ? 'Not responding'
                          : 'Stopped'}
                  </Pill>
                  {p.editable && n.status === 'up' && (
                    <button
                      type="button"
                      className={BUTTON}
                      onClick={() => p.act((st) => restartNodeService(st, n.id, s.name))}
                      aria-label={`${s.state === 'stopped' ? 'Start' : 'Restart'} ${s.name} on ${n.id}`}
                    >
                      {s.state === 'stopped' ? 'Start' : 'Restart'}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function ServerRoom(p: SectionProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const up = p.state.nodes.filter((n) => nodeState(p.state, n) === 'up').length
  return (
    <div className="space-y-4 p-4" data-testid="server-room">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Server Room</h2>
          <p className="text-sm text-slate-600">
            {p.state.company} head office: the internet connection, network equipment and
            servers.
          </p>
        </div>
        <Pill tone={up === p.state.nodes.length ? 'green' : 'red'}>
          {up} of {p.state.nodes.length} nodes up
        </Pill>
      </header>
      <SubTabs
        label="Server Room views"
        value={tab}
        onChange={setTab}
        tabs={[
          ['overview', 'Overview'],
          ['topology', 'Topology'],
          ['devices', 'Devices'],
          ['servers', 'Servers'],
        ]}
      />
      {tab === 'overview' ? (
        <Overview {...p} />
      ) : tab === 'topology' ? (
        <Topology {...p} />
      ) : tab === 'devices' ? (
        <DevicesTable {...p} />
      ) : (
        <Servers {...p} />
      )}
    </div>
  )
}
