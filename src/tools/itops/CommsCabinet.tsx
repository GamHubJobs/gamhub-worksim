/**
 * The office comms cabinet, close up: a 19-inch rack with the patch panel,
 * the two floor switches, the wireless controller, the UPS and a switched
 * power strip whose outlets are labelled. A hung switch shows it: an amber
 * system light and dark port lights. Identify the device by its label and
 * its lights, switch its outlet off, then on again: it boots (the lights run
 * through their start-up), and the model decides what comes back. Cycling a
 * healthy device cuts its people off, and is logged as risky.
 */
import { useEffect, useState } from 'react'
import { BUTTON, CARD, Pill, type SectionProps } from './kit'
import { useAppHint } from '../../guide/appHints'
import { cabinetHint } from '../../guide/stepHints'
import { OFFICE_CABINET } from './data'
import { nodeState, powerCycle } from './model'
import type { Node } from './schema'

const U = 44 // drawn height of one rack unit
const RACK_X = 140
const RACK_W = 620

export default function CommsCabinet(p: SectionProps) {
  const devices = p.state.nodes.filter((n) => n.location === OFFICE_CABINET)
  const [off, setOff] = useState<string[]>([])
  const [booting, setBooting] = useState<string[]>([])
  const [inspect, setInspect] = useState<string | null>(null)
  useEffect(() => {
    if (!booting.length) return
    const t = window.setTimeout(() => setBooting([]), 2600)
    return () => window.clearTimeout(t)
  }, [booting])

  const lights = (n: Node) => {
    if (off.includes(n.id)) return 'off'
    if (booting.includes(n.id)) return 'booting'
    const s = nodeState(p.state, n)
    return s === 'up' || s === 'unreachable' ? 'up' : s === 'off' ? 'off' : 'hung'
  }
  const toggle = (n: Node) => {
    if (!p.editable) return
    if (!off.includes(n.id)) {
      setOff((o) => [...o, n.id])
      p.setFeedback({
        problems: [],
        note: `Outlet ${devices.indexOf(n) + 1} off: ${n.id} has no power.`,
      })
      return
    }
    setOff((o) => o.filter((x) => x !== n.id))
    const r = p.act((s) => powerCycle(s, n.id))
    if (!r.problems.length) setBooting((b) => [...b, n.id])
  }
  const selected = devices.find((d) => d.id === inspect)
  useAppHint(cabinetHint(devices, p.state, inspect, off, booting))

  return (
    <div className="space-y-3 p-4" data-testid="comms-cabinet">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Comms cabinet</h2>
          <p className="text-sm text-slate-600">
            Read the labels and the lights, then power-cycle only the device that has
            stopped. Click a device to inspect it, and an outlet on the power strip to
            switch it.
          </p>
        </div>
        <Pill tone={devices.some((d) => lights(d) === 'hung') ? 'red' : 'green'}>
          {devices.filter((d) => lights(d) === 'up').length} of {devices.length} running
        </Pill>
      </header>
      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <svg
          viewBox="0 0 900 560"
          className="w-full rounded-xl border border-slate-700 bg-slate-950"
          role="application"
          aria-label="The comms cabinet, open"
        >
          <defs>
            <linearGradient id="rackRail" x1="0" x2="1">
              <stop offset="0" stopColor="#475569" />
              <stop offset="1" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          {/* Cabinet frame and rails. */}
          <rect
            x="100"
            y="20"
            width="700"
            height="520"
            rx="10"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="4"
          />
          <rect x={RACK_X - 24} y="36" width="18" height="490" fill="url(#rackRail)" />
          <rect
            x={RACK_X + RACK_W + 6}
            y="36"
            width="18"
            height="490"
            fill="url(#rackRail)"
          />
          {Array.from({ length: 11 }).map((_, i) => (
            <g key={i}>
              <circle cx={RACK_X - 15} cy={50 + i * U} r="3" fill="#94a3b8" />
              <circle cx={RACK_X + RACK_W + 15} cy={50 + i * U} r="3" fill="#94a3b8" />
            </g>
          ))}
          {/* Patch panel (1U) with leads down to the switches. */}
          <g>
            <rect
              x={RACK_X}
              y="40"
              width={RACK_W}
              height={U - 6}
              rx="3"
              fill="#1e293b"
              stroke="#475569"
            />
            <text x={RACK_X + 10} y="64" fontSize="10" fill="#94a3b8">
              PATCH PANEL · FLOOR 1 · FLOOR 2
            </text>
            {Array.from({ length: 24 }).map((_, i) => (
              <rect
                key={i}
                x={RACK_X + 200 + i * 17}
                y="50"
                width="12"
                height="12"
                rx="1"
                fill="#020617"
                stroke="#64748b"
              />
            ))}
          </g>
          {devices.map((n, i) => {
            const y = 40 + U * (1.5 + i * 1.4)
            const l = lights(n)
            const isSwitch = n.kind === 'switch'
            return (
              <g
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={`${n.id}, ${l === 'hung' ? 'not responding' : l}`}
                data-testid="rack-device"
                data-node={n.id}
                data-lights={l}
                className="cursor-pointer outline-none"
                onClick={() => setInspect(n.id)}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') && setInspect(n.id)
                }
              >
                <rect
                  x={RACK_X}
                  y={y}
                  width={RACK_W}
                  height={U}
                  rx="3"
                  fill={isSwitch ? '#334155' : '#1f2937'}
                  stroke={inspect === n.id ? '#2dd4bf' : '#64748b'}
                  strokeWidth={inspect === n.id ? 3 : 1}
                />
                <rect
                  x={RACK_X + 10}
                  y={y + 8}
                  width="74"
                  height="16"
                  rx="2"
                  fill="#f8fafc"
                />
                <text
                  x={RACK_X + 47}
                  y={y + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  {n.id}
                </text>
                <text x={RACK_X + 10} y={y + 38} fontSize="8" fill="#94a3b8">
                  {n.ip}
                </text>
                {/* System light. */}
                <circle
                  cx={RACK_X + 108}
                  cy={y + 16}
                  r="5"
                  fill={
                    l === 'up'
                      ? '#22c55e'
                      : l === 'hung'
                        ? '#f59e0b'
                        : l === 'booting'
                          ? '#f59e0b'
                          : '#1e293b'
                  }
                  className={
                    l === 'booting' || l === 'hung' ? 'animate-pulse' : undefined
                  }
                />
                <text x={RACK_X + 100} y={y + 36} fontSize="7" fill="#94a3b8">
                  SYS
                </text>
                {/* Port lights: traffic while it works, dark while it is hung or off. */}
                {Array.from({ length: isSwitch ? 24 : 4 }).map((_, k) => (
                  <g key={k}>
                    <rect
                      x={RACK_X + 140 + k * 18}
                      y={y + 10}
                      width="14"
                      height="12"
                      rx="1"
                      fill="#020617"
                      stroke="#475569"
                    />
                    <rect
                      x={RACK_X + 143 + k * 18}
                      y={y + 26}
                      width="8"
                      height="4"
                      fill={
                        l === 'up' && (k * 7 + i) % 5 !== 0
                          ? '#22c55e'
                          : l === 'booting'
                            ? '#f59e0b'
                            : '#1e293b'
                      }
                      className={l === 'up' ? 'animate-pulse' : undefined}
                      style={
                        l === 'up'
                          ? { animationDelay: `${(k * 137) % 900}ms` }
                          : undefined
                      }
                    />
                  </g>
                ))}
                {/* Its power lead runs to the strip on the right. */}
                <path
                  d={`M${RACK_X + RACK_W} ${y + U / 2} C ${RACK_X + RACK_W + 40} ${y + U / 2}, ${770} ${150 + i * 70}, ${780} ${150 + i * 70}`}
                  stroke="#0f172a"
                  strokeWidth="5"
                  fill="none"
                />
              </g>
            )
          })}
          {/* UPS (2U). */}
          <g>
            <rect
              x={RACK_X}
              y={420}
              width={RACK_W}
              height={U * 2 - 6}
              rx="3"
              fill="#111827"
              stroke="#475569"
            />
            <text x={RACK_X + 12} y={442} fontSize="11" fill="#e5e7eb" fontWeight="700">
              UPS 1500VA
            </text>
            <rect
              x={RACK_X + 440}
              y={432}
              width="150"
              height="40"
              rx="3"
              fill="#052e16"
            />
            <text
              x={RACK_X + 515}
              y={456}
              textAnchor="middle"
              fontSize="11"
              fill="#86efac"
              fontFamily="monospace"
            >
              ON LINE ·{' '}
              {Math.max(10, 12 * devices.filter((d) => lights(d) === 'up').length)}% LOAD
            </text>
          </g>
          {/* Switched power strip, with a labelled outlet for each device. */}
          <rect
            x="800"
            y="110"
            width="60"
            height="300"
            rx="6"
            fill="#1f2937"
            stroke="#475569"
          />
          <text x="830" y="128" textAnchor="middle" fontSize="8" fill="#94a3b8">
            PDU
          </text>
          {devices.map((n, i) => {
            const isOff = off.includes(n.id)
            return (
              <g
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={`Outlet ${i + 1} (${n.id}): switch ${isOff ? 'on' : 'off'}`}
                data-testid="outlet"
                data-node={n.id}
                className="cursor-pointer outline-none"
                onClick={() => toggle(n)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(n)}
              >
                <rect
                  x="808"
                  y={138 + i * 70}
                  width="44"
                  height="54"
                  rx="4"
                  fill="#0f172a"
                  stroke={isOff ? '#ef4444' : '#22c55e'}
                  strokeWidth="2"
                />
                <rect
                  x="818"
                  y={146 + i * 70}
                  width="24"
                  height="14"
                  rx="2"
                  fill={isOff ? '#7f1d1d' : '#14532d'}
                />
                <text
                  x="830"
                  y={157 + i * 70}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#f8fafc"
                >
                  {isOff ? 'OFF' : 'ON'}
                </text>
                <text
                  x="830"
                  y={174 + i * 70}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#e2e8f0"
                  fontWeight="700"
                >
                  {i + 1}
                </text>
                <text
                  x="830"
                  y={186 + i * 70}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#94a3b8"
                >
                  {n.id}
                </text>
              </g>
            )
          })}
        </svg>
        <section className={CARD} aria-label="Inspect">
          <h3 className="font-semibold text-slate-900">Inspect</h3>
          {selected ? (
            <div className="mt-1 space-y-2 text-sm">
              <p className="font-medium">
                {selected.id} · {selected.ip}
              </p>
              <p className="text-slate-600">{selected.role}</p>
              <p className="rounded bg-slate-900 p-2 font-mono text-xs text-emerald-200">
                {lights(selected) === 'hung'
                  ? 'SYS amber · port lights dark · console: no response. The switch has hung: it passes no traffic and does not answer.'
                  : lights(selected) === 'off'
                    ? 'No power.'
                    : lights(selected) === 'booting'
                      ? 'Starting up: SYS blinking, ports coming up…'
                      : 'SYS green · port lights flickering with traffic · console: login prompt. Working.'}
              </p>
              <p className="text-xs text-slate-500">
                About {selected.users} people depend on it.
              </p>
              {p.editable && (
                <button type="button" className={BUTTON} onClick={() => toggle(selected)}>
                  {off.includes(selected.id)
                    ? 'Switch its outlet back on'
                    : 'Switch its outlet off'}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              Click a device in the rack to read its lights.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
