/**
 * The workbench: the computer (a laptop you can turn to each side, or a
 * tower's rear and front), the dock, the monitor and the wall plate, drawn
 * as vector hardware, with a tray of real cables. Drag a cable's connector
 * onto a port (or click the cable, then the port). A plug that does not fit
 * is refused on the spot; a connected cable stays in its port and hangs off
 * the bench. The equipment responds to what is really connected: power
 * lights, the network link light, the monitor waking up.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  cablingLayout,
  PLUG_NAMES,
  type Cable,
  type Plug,
  type Port,
} from '../deployment'
import type { DeploymentRun } from '../schema'
import {
  H,
  spotsFor,
  STATIONS,
  traySpot,
  TRAY_Y,
  VIEW_NAMES,
  VIEWS,
  W,
  type PortSpot,
  type View,
} from './geometry'

const CABLE_COLOURS: Record<Plug, string> = {
  iec: '#1f2937',
  rj45: '#2563eb',
  dp: '#334155',
  hdmi: '#475569',
  usba: '#6b7280',
  usbc: '#111827',
  barrel: '#0f172a',
  audio: '#9ca3af',
}

// ---------------------------------------------------------------------------
// Sockets and plugs
// ---------------------------------------------------------------------------

function Socket({ plug, s }: { plug: Plug; s: PortSpot }) {
  const x = s.x - s.w / 2
  const y = s.y - s.h / 2
  switch (plug) {
    case 'usbc':
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={s.w}
            height={s.h}
            rx={s.h / 2}
            fill="#0b1220"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <rect
            x={x + 5}
            y={s.y - 1.2}
            width={s.w - 10}
            height="2.4"
            rx="1.2"
            fill="#cbd5e1"
          />
        </g>
      )
    case 'usba':
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={s.w}
            height={s.h}
            rx="1.5"
            fill="#0b1220"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <rect x={x + 3} y={y + 2} width={s.w - 6} height={s.h / 2 - 1} fill="#2563eb" />
        </g>
      )
    case 'hdmi':
      return (
        <path
          d={`M${x} ${y} H${x + s.w} V${y + s.h * 0.6} L${x + s.w - 5} ${y + s.h} H${x + 5} L${x} ${y + s.h * 0.6} Z`}
          fill="#0b1220"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
      )
    case 'dp':
      return (
        <path
          d={`M${x} ${y} H${x + s.w} V${y + s.h} H${x + 6} L${x} ${y + s.h - 6} Z`}
          fill="#0b1220"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
      )
    case 'rj45':
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={s.w}
            height={s.h}
            rx="2"
            fill="#0b1220"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <rect
            x={s.x - 6}
            y={y + s.h - 6}
            width="12"
            height="6"
            fill="#0b1220"
            stroke="#94a3b8"
            strokeWidth="1"
          />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect
              key={i}
              x={x + 4 + i * ((s.w - 8) / 8)}
              y={y + 2}
              width="1.6"
              height="6"
              fill="#facc15"
            />
          ))}
        </g>
      )
    case 'iec':
      return (
        <g>
          <path
            d={`M${x} ${y} H${x + s.w} V${y + s.h - 7} L${x + s.w - 7} ${y + s.h} H${x + 7} L${x} ${y + s.h - 7} Z`}
            fill="#0b1220"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          {[-9, 0, 9].map((d) => (
            <rect
              key={d}
              x={s.x + d - 1.5}
              y={s.y - 5}
              width="3"
              height="9"
              fill="#e2e8f0"
            />
          ))}
        </g>
      )
    case 'barrel':
      return (
        <g>
          <circle
            cx={s.x}
            cy={s.y}
            r={s.w / 2}
            fill="#0b1220"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <circle cx={s.x} cy={s.y} r="2.5" fill="#e2e8f0" />
        </g>
      )
    case 'audio':
      return (
        <circle
          cx={s.x}
          cy={s.y}
          r={s.w / 2}
          fill="#0b1220"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
      )
  }
}

/** A cable's connector, drawn with its tip at (x, y) pointing up. */
function PlugHead({
  plug,
  x,
  y,
  colour,
}: {
  plug: Plug
  x: number
  y: number
  colour: string
}) {
  const body = (w: number, h: number) => (
    <rect
      x={x - w / 2}
      y={y + 6}
      width={w}
      height={h}
      rx="4"
      fill={colour}
      stroke="#0f172a"
      strokeWidth="1"
    />
  )
  switch (plug) {
    case 'usbc':
      return (
        <g>
          <rect
            x={x - 9}
            y={y}
            width="18"
            height="8"
            rx="4"
            fill="#cbd5e1"
            stroke="#64748b"
          />
          {body(22, 26)}
        </g>
      )
    case 'usba':
      return (
        <g>
          <rect x={x - 12} y={y} width="24" height="10" fill="#d1d5db" stroke="#64748b" />
          <rect x={x - 8} y={y + 2} width="4" height="3" fill="#64748b" />
          <rect x={x + 4} y={y + 2} width="4" height="3" fill="#64748b" />
          {body(28, 26)}
        </g>
      )
    case 'hdmi':
    case 'dp':
      return (
        <g>
          <rect x={x - 15} y={y} width="30" height="10" fill="#d1d5db" stroke="#64748b" />
          {body(36, 26)}
          {plug === 'dp' && (
            <>
              <rect x={x - 6} y={y + 18} width="12" height="5" rx="1" fill="#94a3b8" />
              <text x={x} y={y + 30} textAnchor="middle" fontSize="6" fill="#e2e8f0">
                DP
              </text>
            </>
          )}
        </g>
      )
    case 'rj45':
      return (
        <g>
          <rect
            x={x - 13}
            y={y}
            width="26"
            height="20"
            rx="2"
            fill="#bfdbfe"
            fillOpacity="0.85"
            stroke="#1d4ed8"
          />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect
              key={i}
              x={x - 10 + i * 2.6}
              y={y + 1}
              width="1.4"
              height="5"
              fill="#ca8a04"
            />
          ))}
          <path
            d={`M${x - 5} ${y + 20} L${x - 3} ${y + 30} H${x + 3} L${x + 5} ${y + 20}`}
            fill={colour}
          />
          {body(20, 22)}
        </g>
      )
    case 'iec':
      return (
        <g>
          <path
            d={`M${x - 15} ${y} H${x + 15} V${y + 14} L${x + 10} ${y + 20} H${x - 10} L${x - 15} ${y + 14} Z`}
            fill="#111827"
            stroke="#334155"
          />
          {body(26, 24)}
        </g>
      )
    case 'barrel':
      return (
        <g>
          <rect x={x - 4} y={y} width="8" height="12" fill="#cbd5e1" stroke="#64748b" />
          {body(16, 24)}
        </g>
      )
    case 'audio':
      return (
        <g>
          <rect x={x - 2} y={y} width="4" height="14" fill="#e5e7eb" stroke="#64748b" />
          {body(12, 20)}
        </g>
      )
  }
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

interface Power {
  computer: boolean
  monitor: boolean
  signal: boolean
  link: boolean
  dock: boolean
}

function powerOf(device: 'laptop' | 'desktop', cables: Record<string, string>): Power {
  const on = (cable: string, ports: string[]) => ports.includes(cables[cable] ?? '')
  const dock = on('dock-psu', ['dock-power'])
  const computer =
    device === 'laptop'
      ? (dock && on('dock-cable', ['lap-usbc1', 'lap-usbc2'])) ||
        on('charger', ['lap-usbc1', 'lap-usbc2'])
      : on('power-pc', ['pc-power'])
  const monitor = on('power-mon', ['mon-power'])
  const videoPath =
    device === 'laptop'
      ? dock &&
        on('dock-cable', ['lap-usbc1', 'lap-usbc2']) &&
        on('dp-device', ['dock-dp1', 'dock-dp2'])
      : on('dp-device', ['pc-dp'])
  const link =
    (device === 'laptop'
      ? dock && on('eth-device', ['dock-lan'])
      : on('eth-device', ['pc-lan'])) && on('eth-wall', ['wall-data'])
  return {
    computer,
    monitor,
    signal: computer && monitor && videoPath && on('dp-mon', ['mon-dp']),
    link,
    dock,
  }
}

function Led({
  x,
  y,
  on,
  colour,
  blink,
}: {
  x: number
  y: number
  on: boolean
  colour: string
  blink?: boolean
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r="3.5"
      fill={on ? colour : '#334155'}
      className={on && blink ? 'animate-pulse' : undefined}
      style={on ? { filter: `drop-shadow(0 0 4px ${colour})` } : undefined}
    />
  )
}

function LaptopSide({ view, power }: { view: 'left' | 'right'; power: Power }) {
  return (
    <g>
      <text
        x="375"
        y="150"
        textAnchor="middle"
        fontSize="15"
        fill="#334155"
        fontWeight="600"
      >
        Vantage 14 G5 · {VIEW_NAMES[view].toLowerCase()}
      </text>
      {/* Lid and base, seen edge-on. */}
      <rect
        x="80"
        y="236"
        width="590"
        height="22"
        rx="8"
        fill="#cbd5e1"
        stroke="#94a3b8"
      />
      <rect
        x="70"
        y="258"
        width="610"
        height="48"
        rx="14"
        fill="#e2e8f0"
        stroke="#94a3b8"
      />
      <rect x="90" y="300" width="570" height="8" rx="4" fill="#94a3b8" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={view === 'left' ? 500 + i * 14 : 120 + i * 14}
          y="270"
          width="6"
          height="22"
          rx="3"
          fill="#94a3b8"
        />
      ))}
      {view === 'left' ? (
        <>
          <Led x={150} y={281} on={power.computer} colour="#f59e0b" />
          <text x="150" y="325" textAnchor="middle" fontSize="9" fill="#64748b">
            charge
          </text>
        </>
      ) : (
        <>
          <rect x="560" y="274" width="12" height="9" rx="2" fill="#64748b" />
          <text x="566" y="325" textAnchor="middle" fontSize="9" fill="#64748b">
            lock slot
          </text>
        </>
      )}
    </g>
  )
}

function LaptopTop({ power }: { power: Power }) {
  return (
    <g>
      <text
        x="375"
        y="70"
        textAnchor="middle"
        fontSize="15"
        fill="#334155"
        fontWeight="600"
      >
        Vantage 14 G5 · lid open
      </text>
      <path
        d="M200 90 H550 L560 330 H190 Z"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="2"
      />
      <rect
        x="214"
        y="104"
        width="322"
        height="210"
        fill={power.computer ? '#0f172a' : '#020617'}
      />
      {power.computer && (
        <>
          <rect x="214" y="104" width="322" height="210" fill="url(#bootGlow)" />
          <text
            x="375"
            y="214"
            textAnchor="middle"
            fontSize="16"
            fill="#e2e8f0"
            fontWeight="700"
            letterSpacing="4"
          >
            VANTAGE
          </text>
          <text x="375" y="236" textAnchor="middle" fontSize="9" fill="#94a3b8">
            Ready to power on (next step)
          </text>
        </>
      )}
      <path
        d="M150 330 H600 L640 420 H110 Z"
        fill="#cbd5e1"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 12 }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            x={182 + c * 32 + r * 6}
            y={340 + r * 15}
            width="26"
            height="11"
            rx="2"
            fill="#94a3b8"
          />
        )),
      )}
      <rect x="320" y="402" width="110" height="12" rx="3" fill="#b6c2d2" />
      <Led x={600} y={346} on={power.computer} colour="#22c55e" />
      <text x="375" y="450" textAnchor="middle" fontSize="11" fill="#64748b">
        No ports on top: turn the laptop to its left or right side to cable it.
      </text>
    </g>
  )
}

function TowerRear({ power }: { power: Power }) {
  return (
    <g>
      <text
        x="375"
        y="30"
        textAnchor="middle"
        fontSize="15"
        fill="#334155"
        fontWeight="600"
      >
        Vantage Tower 7 · rear panel
      </text>
      <rect
        x="290"
        y="45"
        width="170"
        height="440"
        rx="8"
        fill="#334155"
        stroke="#1e293b"
        strokeWidth="2"
      />
      {/* Power supply with its fan (it turns while there is power). */}
      <rect x="302" y="58" width="146" height="80" rx="4" fill="#1e293b" />
      <g transform="translate(330 98)">
        <circle r="24" fill="#0f172a" stroke="#475569" />
        <g
          className={power.computer ? 'animate-spin' : undefined}
          style={{ transformOrigin: '0 0', transformBox: 'fill-box' }}
        >
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <path
              key={a}
              d="M0 0 L20 -5 L20 5 Z"
              fill="#475569"
              transform={`rotate(${a})`}
            />
          ))}
        </g>
      </g>
      <text x="375" y="134" textAnchor="middle" fontSize="8" fill="#94a3b8">
        AC IN
      </text>
      <rect
        x="315"
        y="190"
        width="120"
        height="190"
        rx="3"
        fill="#1e293b"
        stroke="#475569"
      />
      <text x="375" y="203" textAnchor="middle" fontSize="8" fill="#94a3b8">
        I/O
      </text>
      {['USB', 'USB', 'NET', 'DP · HDMI', 'USB-C · AUDIO'].map((l, i) => (
        <text
          key={l + i}
          x="440"
          y={[219, 244, 284, 324, 359][i]}
          fontSize="7"
          fill="#94a3b8"
        >
          {l}
        </text>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect
          key={i}
          x="315"
          y={400 + i * 12}
          width="120"
          height="5"
          rx="2"
          fill="#1e293b"
        />
      ))}
    </g>
  )
}

function TowerFront({ power }: { power: Power }) {
  return (
    <g>
      <text
        x="375"
        y="30"
        textAnchor="middle"
        fontSize="15"
        fill="#334155"
        fontWeight="600"
      >
        Vantage Tower 7 · front panel
      </text>
      <rect
        x="290"
        y="45"
        width="170"
        height="440"
        rx="8"
        fill="#475569"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <circle cx="375" cy="95" r="14" fill="#1e293b" stroke="#94a3b8" />
      <path
        d="M375 86 V96 M368 90 A9 9 0 1 0 382 90"
        stroke="#94a3b8"
        strokeWidth="2"
        fill="none"
      />
      <Led x={375} y={120} on={power.computer} colour="#38bdf8" />
      {Array.from({ length: 14 }).map((_, i) => (
        <rect
          key={i}
          x="305"
          y={190 + i * 20}
          width="140"
          height="6"
          rx="3"
          fill="#334155"
        />
      ))}
      <text x="375" y="175" textAnchor="middle" fontSize="8" fill="#cbd5e1">
        USB
      </text>
    </g>
  )
}

function Dock({ power }: { power: Power }) {
  const s = STATIONS.dock
  return (
    <g>
      <text x={s.x} y={s.y - 8} fontSize="12" fill="#334155" fontWeight="600">
        PortHub USB-C dock · rear
      </text>
      <rect
        x={s.x}
        y={s.y}
        width={s.w}
        height={s.h}
        rx="12"
        fill="#1e293b"
        stroke="#0f172a"
      />
      <Led x={s.x + 20} y={s.y + 22} on={power.dock} colour="#22c55e" />
      <text x={s.x + 30} y={s.y + 25} fontSize="8" fill="#94a3b8">
        power
      </text>
      <Led x={s.x + 100} y={s.y + 22} on={power.link} colour="#22c55e" blink />
      {[
        ['DC IN', 800],
        ['LAN', 860],
        ['DP 1', 925],
        ['DP 2', 980],
        ['USB', 1080],
      ].map(([l, x]) => (
        <text
          key={l}
          x={Number(x)}
          y={s.y + 100}
          textAnchor="middle"
          fontSize="8"
          fill="#94a3b8"
        >
          {l}
        </text>
      ))}
    </g>
  )
}

function Monitor({ power }: { power: Power }) {
  const s = STATIONS.monitor
  return (
    <g>
      <text x={s.x} y={s.y - 8} fontSize="12" fill="#334155" fontWeight="600">
        ClearView 27 · screen and port panel
      </text>
      <rect
        x={s.x + 70}
        y={s.y}
        width="260"
        height="120"
        rx="6"
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="3"
      />
      <rect
        x={s.x + 78}
        y={s.y + 8}
        width="244"
        height="104"
        fill={power.signal ? 'url(#desk)' : '#020617'}
        style={{ transition: 'fill 400ms' }}
      />
      {power.monitor && !power.signal && (
        <text x={s.x + 200} y={s.y + 64} textAnchor="middle" fontSize="11" fill="#94a3b8">
          No signal: DisplayPort
        </text>
      )}
      {power.signal && (
        <text
          x={s.x + 200}
          y={s.y + 64}
          textAnchor="middle"
          fontSize="11"
          fill="#e0f2fe"
          fontWeight="600"
        >
          Signal: 2560 × 1440
        </text>
      )}
      <Led
        x={s.x + 318}
        y={s.y + 116}
        on={power.monitor}
        colour={power.signal ? '#22c55e' : '#f59e0b'}
      />
      <rect x={s.x + 185} y={s.y + 120} width="30" height="16" fill="#334155" />
      <rect x={s.x + 40} y={s.y + 136} width="320" height="44" rx="6" fill="#1e293b" />
      {[
        ['POWER', 860],
        ['DP IN', 960],
        ['HDMI IN', 1040],
      ].map(([l, x]) => (
        <text
          key={l}
          x={Number(x)}
          y={s.y + 176}
          textAnchor="middle"
          fontSize="7"
          fill="#94a3b8"
        >
          {l}
        </text>
      ))}
    </g>
  )
}

function WallPlate({ power }: { power: Power }) {
  const s = STATIONS.wall
  return (
    <g>
      <text x={s.x} y={s.y - 8} fontSize="12" fill="#334155" fontWeight="600">
        Floor box, desk 2-14
      </text>
      <rect
        x={s.x + 80}
        y={s.y}
        width="240"
        height="90"
        rx="8"
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <rect x={s.x + 110} y={s.y + 22} width="60" height="16" rx="2" fill="#dbeafe" />
      <text
        x={s.x + 140}
        y={s.y + 34}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#1d4ed8"
      >
        DATA 2-14
      </text>
      <rect x={s.x + 230} y={s.y + 22} width="60" height="16" rx="2" fill="#fef3c7" />
      <text
        x={s.x + 260}
        y={s.y + 34}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#b45309"
      >
        VOICE 2-15
      </text>
      <Led x={s.x + 175} y={s.y + 55} on={power.link} colour="#22c55e" blink />
    </g>
  )
}

// ---------------------------------------------------------------------------
// The bench
// ---------------------------------------------------------------------------

export interface BenchProps {
  run: DeploymentRun
  editable: boolean
  /** Connects a cable; returns the problems (empty when it went in). */
  onConnect: (cable: string, port: string) => string[]
  onDisconnect: (cable: string) => void
}

export function Bench({ run, editable, onConnect, onDisconnect }: BenchProps) {
  const device = run.device ?? 'desktop'
  const { ports, cables } = cablingLayout(device)
  const spots = spotsFor(device)
  const views = VIEWS[device]
  const [view, setView] = useState<View>(views[0])
  const [held, setHeld] = useState<string | null>(null)
  const [drag, setDrag] = useState<{
    cable: string
    x: number
    y: number
    moved: boolean
  } | null>(null)
  const [bad, setBad] = useState<string | null>(null)
  const [inspect, setInspect] = useState<string | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const power = powerOf(device, run.cables)

  const visible = (port: string) => {
    const s = spots[port]
    return !!s && (s.view === null || s.view === view)
  }
  const portAt = (x: number, y: number) =>
    ports.find((p) => {
      const s = spots[p.id]
      return (
        s &&
        visible(p.id) &&
        Math.abs(x - s.x) <= s.w / 2 + 14 &&
        Math.abs(y - s.y) <= s.h / 2 + 14
      )
    })
  const toSvg = (e: { clientX: number; clientY: number }) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const connect = (cable: string, port: Port) => {
    const problems = onConnect(cable, port.id)
    if (problems.length) {
      setBad(port.id)
      window.setTimeout(() => setBad((b) => (b === port.id ? null : b)), 700)
    } else {
      setHeld(null)
      setInspect(null)
    }
  }
  const start = (cable: string, e: ReactPointerEvent) => {
    if (!editable) return
    const p = toSvg(e)
    svg.current?.setPointerCapture(e.pointerId)
    setDrag({ cable, x: p.x, y: p.y, moved: false })
  }
  const move = (e: ReactPointerEvent) => {
    if (!drag) return
    const p = toSvg(e)
    setDrag(
      (d) =>
        d && {
          ...d,
          x: p.x,
          y: p.y,
          moved: d.moved || Math.hypot(p.x - d.x, p.y - d.y) > 4,
        },
    )
  }
  const end = (e: ReactPointerEvent) => {
    if (!drag) return
    const { cable, moved } = drag
    setDrag(null)
    if (!moved) {
      setHeld((h) => (h === cable ? null : cable))
      return
    }
    const p = toSvg(e)
    const port = portAt(p.x, p.y)
    if (port) connect(cable, port)
    else if (run.cables[cable]) onDisconnect(cable)
  }
  const clickPort = (port: Port) => {
    if (held) connect(held, port)
    else setInspect((i) => (i === port.id ? null : port.id))
  }

  const required = cables.filter((c) => c.required)
  const done = required.filter((c) => run.cables[c.id]).length
  const holding = drag?.cable ?? held
  const heldCable = cables.find((c) => c.id === holding)
  const inspected = ports.find((p) => p.id === inspect)
  const onView = (v: View) =>
    cables.filter((c) => spots[run.cables[c.id] ?? '']?.view === v).length

  const head = (c: Cable, x: number, y: number) => (
    <PlugHead plug={c.plug} x={x} y={y} colour={CABLE_COLOURS[c.plug]} />
  )

  return (
    <div className="space-y-2" data-testid="cabling">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
        <span className="font-medium text-slate-900">Physical setup</span>
        <span className="text-slate-600">
          Drag each cable from the tray to the port it fits, or click a cable and then a
          port. Turn the computer to reach its other sides.
        </span>
        <span className="ml-auto flex items-center gap-2" data-testid="cabling-progress">
          <span className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
            <span
              className="block h-full bg-teal-600 transition-all"
              style={{ width: `${(done / required.length) * 100}%` }}
            />
          </span>
          {done} of {required.length} connected
        </span>
      </div>
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Turn the computer"
      >
        <span className="text-xs text-slate-600">
          {device === 'laptop' ? 'Laptop' : 'Tower'}:
        </span>
        {views.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`rounded-md border px-2.5 py-1 text-xs ${view === v ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
          >
            {VIEW_NAMES[v]}
            {onView(v) > 0 && ` (${onView(v)})`}
          </button>
        ))}
        <span
          className="ml-auto text-xs text-slate-700"
          aria-live="polite"
          data-testid="bench-status"
        >
          {heldCable
            ? `Holding: ${heldCable.label} (${PLUG_NAMES[heldCable.plug]} plug). Choose a port.`
            : inspected
              ? `${inspected.label}: takes a ${PLUG_NAMES[inspected.plug]} plug.`
              : 'Pick up a cable, or click a port to inspect it.'}
        </span>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none rounded-xl border border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 select-none"
        role="application"
        aria-label="Workbench"
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => setDrag(null)}
      >
        <defs>
          <radialGradient id="bootGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <linearGradient id="desk" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <pattern id="mat" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0 H0 V24" fill="none" stroke="#cbd5e1" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect
          x="15"
          y="15"
          width="720"
          height={TRAY_Y - 30}
          rx="14"
          fill="url(#mat)"
          stroke="#cbd5e1"
        />
        {/* Cable runs pass behind the equipment; the plugs are drawn on top. */}
        {cables.map((c) => {
          const port = run.cables[c.id]
          if (!port || !visible(port) || drag?.cable === c.id) return null
          const s = spots[port]
          const tipY = s.y - s.h / 2 + 2
          return (
            <path
              key={c.id}
              d={`M${s.x} ${tipY + 32} C ${s.x} ${tipY + 120}, ${s.x + 30} ${TRAY_Y - 60}, ${s.x + 10} ${TRAY_Y - 12}`}
              stroke={CABLE_COLOURS[c.plug]}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              pointerEvents="none"
            />
          )
        })}
        {device === 'laptop' ? (
          view === 'top' ? (
            <LaptopTop power={power} />
          ) : (
            <LaptopSide view={view as 'left' | 'right'} power={power} />
          )
        ) : view === 'rear' ? (
          <TowerRear power={power} />
        ) : (
          <TowerFront power={power} />
        )}
        {device === 'laptop' && <Dock power={power} />}
        <Monitor power={power} />
        <WallPlate power={power} />

        {/* Ports: drawn, clickable, and checked when a cable is dropped on them. */}
        {ports
          .filter((p) => visible(p.id))
          .map((p) => {
            const s = spots[p.id]
            const fits = heldCable && heldCable.plug === p.plug
            return (
              <g
                key={p.id}
                data-testid="port"
                data-port={p.id}
                role="button"
                tabIndex={editable ? 0 : -1}
                aria-label={`${p.label}, ${PLUG_NAMES[p.plug]} port`}
                onClick={() => clickPort(p)}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') &&
                  (e.preventDefault(), clickPort(p))
                }
                className={`cursor-pointer outline-none ${bad === p.id ? 'bench-shake' : ''}`}
              >
                <rect
                  x={s.x - s.w / 2 - 8}
                  y={s.y - s.h / 2 - 8}
                  width={s.w + 16}
                  height={s.h + 16}
                  rx="6"
                  fill={
                    bad === p.id
                      ? '#fecaca'
                      : inspect === p.id
                        ? '#ccfbf1'
                        : 'transparent'
                  }
                  stroke={
                    bad === p.id
                      ? '#dc2626'
                      : fits
                        ? '#14b8a6'
                        : inspect === p.id
                          ? '#0d9488'
                          : 'transparent'
                  }
                  strokeWidth="2"
                  strokeDasharray={fits ? '4 3' : undefined}
                />
                <Socket plug={p.plug} s={s} />
                <title>{p.label}</title>
              </g>
            )
          })}

        {/* Connected cables: the plug sits in its port and the cable hangs off the bench. */}
        {cables.map((c) => {
          const port = run.cables[c.id]
          if (!port || !visible(port) || drag?.cable === c.id) return null
          const s = spots[port]
          const tipY = s.y - s.h / 2 + 2
          return (
            <g
              key={c.id}
              data-testid="connected-cable"
              data-cable={c.id}
              className={editable ? 'cursor-grab' : undefined}
              onPointerDown={(e) => start(c.id, e)}
            >
              {head(c, s.x, tipY)}
            </g>
          )
        })}

        {/* The tray. */}
        <rect
          x="15"
          y={TRAY_Y}
          width={W - 30}
          height={H - TRAY_Y - 10}
          rx="12"
          fill="#e2e8f0"
          stroke="#cbd5e1"
        />
        <text x="30" y={TRAY_Y + 22} fontSize="12" fontWeight="600" fill="#334155">
          Cable tray
        </text>
        {cables.map((c, i) => {
          const t = traySpot(i, cables.length)
          const connected = !!run.cables[c.id]
          const dragging = drag?.cable === c.id
          return (
            <g
              key={c.id}
              data-testid="cable"
              data-cable={c.id}
              role="button"
              tabIndex={editable ? 0 : -1}
              aria-pressed={held === c.id}
              aria-label={`${c.label}${connected ? ', connected' : ''}${c.required ? '' : ', optional'}`}
              className={editable ? 'cursor-grab outline-none' : 'outline-none'}
              onPointerDown={(e) => start(c.id, e)}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') &&
                (e.preventDefault(), setHeld((h) => (h === c.id ? null : c.id)))
              }
              opacity={connected && !dragging ? 0.45 : 1}
            >
              <rect
                x={t.x - 85}
                y={t.y - 34}
                width="170"
                height="88"
                rx="10"
                fill={held === c.id ? '#ccfbf1' : '#f8fafc'}
                stroke={held === c.id ? '#0d9488' : '#cbd5e1'}
                strokeWidth={held === c.id ? 2 : 1}
              />
              {/* A coil of cable behind the connector. */}
              <ellipse
                cx={t.x + 40}
                cy={t.y + 14}
                rx="26"
                ry="12"
                fill="none"
                stroke={CABLE_COLOURS[c.plug]}
                strokeWidth="4"
              />
              <ellipse
                cx={t.x + 40}
                cy={t.y + 14}
                rx="18"
                ry="8"
                fill="none"
                stroke={CABLE_COLOURS[c.plug]}
                strokeWidth="4"
              />
              {!dragging && head(c, t.x - 30, t.y - 22)}
              <text x={t.x} y={t.y + 42} textAnchor="middle" fontSize="13" fill="#0f172a">
                {c.label.length > 24 ? `${c.label.slice(0, 23)}…` : c.label}
              </text>
              <title>{c.label}</title>
            </g>
          )
        })}

        {/* The cable being dragged. */}
        {drag &&
          (() => {
            const c = cables.find((x) => x.id === drag.cable)!
            const i = cables.indexOf(c)
            const t = traySpot(i, cables.length)
            return (
              <g pointerEvents="none">
                <path
                  d={`M${t.x + 40} ${t.y + 14} C ${t.x + 40} ${t.y - 80}, ${drag.x} ${drag.y + 140}, ${drag.x} ${drag.y + 30}`}
                  stroke={CABLE_COLOURS[c.plug]}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                />
                {head(c, drag.x, drag.y)}
              </g>
            )
          })()}
      </svg>
      <style>{`
        @keyframes bench-shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 75% { transform: translateX(5px) } }
        .bench-shake { animation: bench-shake 0.25s ease-in-out 2; }
      `}</style>
    </div>
  )
}
