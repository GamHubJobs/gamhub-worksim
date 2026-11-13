/**
 * Repair Bench: a laptop upside down on an anti-static mat. Undo the screws
 * (they go into the screw tray), lift the cover, and the inside is drawn as
 * it is: battery and its connector, memory, the M.2 drive, the fan and heat
 * pipe. What you see follows the real fault (a swollen battery bulges, a
 * failed fan is clogged with dust). Tests give the machine's real symptoms.
 */
import { useState } from 'react'
import { BUTTON, CARD, Pill, PRIMARY, type SectionProps } from './kit'
import { assetByTag, personById } from './model'
import {
  bookable,
  bookIn,
  COMPONENT_INFO,
  COMPONENT_NAMES,
  finishRepair,
  installPart,
  jobFor,
  PARTS,
  removePart,
  runTest,
  SCREWS,
  setBattery,
  setCover,
  TEST_NAMES,
  TESTS,
  toggleScrew,
} from './repair'
import type { Component, RepairJob } from './schema'

const SCREW_SPOTS: Array<[number, number]> = [
  [140, 95],
  [500, 82],
  [860, 95],
  [140, 445],
  [380, 462],
  [620, 462],
  [860, 445],
  [500, 270],
]

/** Where each part sits inside (x, y, w, h). */
const PART_SPOTS: Record<Component, [number, number, number, number]> = {
  battery: [190, 330, 620, 110],
  ram: [560, 140, 170, 60],
  ssd: [330, 220, 180, 34],
  fan: [180, 120, 120, 120],
}

function Inside({
  job,
  fault,
  selected,
  onSelect,
  onBattery,
}: {
  job: RepairJob
  fault: Component | null
  selected: Component | null
  onSelect: (c: Component) => void
  onBattery: () => void
}) {
  const out = (c: Component) => job.removed.includes(c)
  const ring = (c: Component) =>
    selected === c ? { stroke: '#14b8a6', strokeWidth: 4 } : {}
  const slot = (c: Component) => {
    const [x, y, w, h] = PART_SPOTS[c]
    return (
      <g key={`slot-${c}`}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx="6"
          fill="none"
          stroke="#86efac"
          strokeDasharray="6 4"
          strokeWidth="2"
        />
        <text
          x={x + w / 2}
          y={y + h / 2 + 4}
          textAnchor="middle"
          fontSize="12"
          fill="#bbf7d0"
        >
          {COMPONENT_NAMES[c]}: empty
        </text>
      </g>
    )
  }
  const clickable = (c: Component) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': COMPONENT_NAMES[c],
    'data-testid': 'component',
    'data-component': c,
    className: 'cursor-pointer outline-none',
    onClick: () => onSelect(c),
    onKeyDown: (e: React.KeyboardEvent) =>
      (e.key === 'Enter' || e.key === ' ') && onSelect(c),
  })
  const [bx, by, bw, bh] = PART_SPOTS.battery
  const [rx, ry, rw, rh] = PART_SPOTS.ram
  const [sx, sy, sw, sh] = PART_SPOTS.ssd
  const [fx, fy, fw] = PART_SPOTS.fan
  return (
    <g>
      {/* Mainboard and heat pipe. */}
      <rect x="120" y="80" width="760" height="230" rx="10" fill="#14532d" />
      {Array.from({ length: 30 }).map((_, i) => (
        <path
          key={i}
          d={`M${130 + i * 25} 300 v-${20 + (i % 5) * 9} h${(i % 3) * 8}`}
          stroke="#166534"
          strokeWidth="2"
          fill="none"
        />
      ))}
      <rect x="360" y="120" width="120" height="80" rx="6" fill="#1f2937" />
      <text x="420" y="165" textAnchor="middle" fontSize="10" fill="#9ca3af">
        CPU
      </text>
      <path
        d="M240 180 C 300 180, 330 160, 420 160"
        stroke="#b45309"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />

      {out('fan') ? (
        slot('fan')
      ) : (
        <g {...clickable('fan')}>
          <circle
            cx={fx + fw / 2}
            cy={fy + fw / 2}
            r={fw / 2}
            fill="#111827"
            {...ring('fan')}
          />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
            <path
              key={a}
              d="M0 0 C 18 -8, 40 -6, 52 4"
              stroke="#4b5563"
              strokeWidth="5"
              fill="none"
              transform={`translate(${fx + fw / 2} ${fy + fw / 2}) rotate(${a})`}
            />
          ))}
          <circle cx={fx + fw / 2} cy={fy + fw / 2} r="14" fill="#374151" />
          {fault === 'fan' &&
            Array.from({ length: 40 }).map((_, i) => (
              <circle
                key={i}
                cx={fx + 15 + ((i * 37) % (fw - 30))}
                cy={fy + 15 + ((i * 53) % (fw - 30))}
                r={2 + (i % 3)}
                fill="#a8a29e"
                opacity="0.85"
              />
            ))}
        </g>
      )}
      {out('ram') ? (
        slot('ram')
      ) : (
        <g {...clickable('ram')}>
          <rect
            x={rx}
            y={ry}
            width={rw}
            height={rh}
            rx="3"
            fill="#065f46"
            {...ring('ram')}
          />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={rx + 12 + i * 38}
              y={ry + 12}
              width="28"
              height="24"
              fill="#111827"
            />
          ))}
          <rect x={rx} y={ry + rh - 8} width={rw} height="8" fill="#ca8a04" />
          <text
            x={rx + rw / 2}
            y={ry - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#d1fae5"
          >
            DDR5 SO-DIMM
          </text>
        </g>
      )}
      {out('ssd') ? (
        slot('ssd')
      ) : (
        <g {...clickable('ssd')}>
          <rect
            x={sx}
            y={sy}
            width={sw}
            height={sh}
            rx="3"
            fill="#0f172a"
            {...ring('ssd')}
          />
          <rect x={sx + 10} y={sy + 6} width="80" height="22" fill="#e5e7eb" />
          <text x={sx + 50} y={sy + 21} textAnchor="middle" fontSize="9" fill="#111827">
            NVMe 512GB
          </text>
          <rect x={sx} y={sy + 6} width="6" height="22" fill="#ca8a04" />
          <circle cx={sx + sw - 8} cy={sy + sh / 2} r="5" fill="#9ca3af" />
        </g>
      )}
      {out('battery') ? (
        slot('battery')
      ) : (
        <g {...clickable('battery')}>
          <rect
            x={bx}
            y={by}
            width={bw}
            height={bh}
            rx="10"
            fill="#1f2937"
            {...ring('battery')}
          />
          {fault === 'battery' && (
            <ellipse
              cx={bx + bw / 2}
              cy={by + bh / 2}
              rx={bw / 2 - 30}
              ry={bh / 2 - 6}
              fill="#374151"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          )}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={bx + (bw / 4) * i}
              y1={by + 6}
              x2={bx + (bw / 4) * i}
              y2={by + bh - 6}
              stroke="#111827"
              strokeWidth="2"
            />
          ))}
          <text
            x={bx + bw / 2}
            y={by + bh / 2 + 5}
            textAnchor="middle"
            fontSize="13"
            fill="#e5e7eb"
          >
            Li-ion 57 Wh{fault === 'battery' ? ' · swollen' : ''}
          </text>
        </g>
      )}
      {/* The battery connector: unplug it before working inside. */}
      <g
        role="button"
        tabIndex={0}
        aria-label={
          job.batteryConnected ? 'Disconnect the battery' : 'Reconnect the battery'
        }
        data-testid="battery-connector"
        className="cursor-pointer outline-none"
        onClick={onBattery}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onBattery()}
      >
        <rect
          x="470"
          y="300"
          width="60"
          height="26"
          rx="3"
          fill="#f8fafc"
          stroke={job.batteryConnected ? '#16a34a' : '#dc2626'}
          strokeWidth="2"
        />
        <path
          d={job.batteryConnected ? 'M500 326 V334' : 'M500 330 V346'}
          stroke="#ef4444"
          strokeWidth="4"
        />
        <text x="500" y="317" textAnchor="middle" fontSize="9" fill="#0f172a">
          {job.batteryConnected ? 'CONNECTED' : 'UNPLUGGED'}
        </text>
      </g>
    </g>
  )
}

export default function RepairBench(p: SectionProps) {
  const { state } = p
  const [tag, setTag] = useState<string | null>(state.repairs[0]?.tag ?? null)
  const [selected, setSelected] = useState<Component | null>(null)
  const [part, setPart] = useState<string | null>(null)
  const job = tag ? jobFor(state, tag) : undefined
  const asset = tag ? assetByTag(state, tag) : undefined
  const waiting = bookable(state)

  return (
    <div className="space-y-3 p-4" data-testid="repair-bench">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Repair Bench</h2>
        <p className="text-sm text-slate-600">
          Test it, open it safely, find the failed part, fit the right replacement, and
          prove it boots.
        </p>
      </header>
      <div className="grid gap-4 xl:grid-cols-[16rem_1fr]">
        <aside className="space-y-3">
          {state.repairs.length > 0 && (
            <section className={CARD} aria-label="On the bench">
              <h3 className="mb-1 text-sm font-semibold text-slate-900">On the bench</h3>
              {state.repairs.map((j) => (
                <button
                  key={j.tag}
                  type="button"
                  className={`${tag === j.tag ? PRIMARY : BUTTON} mb-1 w-full text-left`}
                  onClick={() => {
                    setTag(j.tag)
                    setSelected(null)
                  }}
                >
                  {j.tag} ·{' '}
                  {personById(state, assetByTag(state, j.tag)?.assignedTo ?? '')?.name ??
                    'stock'}
                </button>
              ))}
            </section>
          )}
          <section className={CARD} aria-label="Book in a laptop">
            <h3 className="mb-1 text-sm font-semibold text-slate-900">
              Book in a laptop
            </h3>
            <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
              {waiting.map((a) => (
                <li key={a.tag} className="flex items-center justify-between gap-2">
                  <span>
                    {a.tag}{' '}
                    <span className="text-xs text-slate-500">
                      {personById(state, a.assignedTo ?? '')?.name ?? 'stock'}
                    </span>
                    {a.hwFault && (
                      <>
                        {' '}
                        <Pill tone="red">Reported fault</Pill>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    className={BUTTON}
                    disabled={!p.editable}
                    onClick={() => {
                      const r = p.act((s) => bookIn(s, a.tag))
                      if (!r.problems.length) setTag(a.tag)
                    }}
                    aria-label={`Book in ${a.tag}`}
                  >
                    Book in
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {!job || !asset ? (
          <p className={`${CARD} text-sm text-slate-600`}>
            Book a laptop in to put it on the bench.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-slate-100">
              <span className="font-semibold">
                {asset.tag} · {asset.model}
              </span>
              <span className="text-slate-300">{asset.hostname}</span>
              <span className="text-slate-300">
                Screws out {job.screwsOut.length}/{SCREWS}
              </span>
              <span className="text-slate-300">Cover {job.coverOff ? 'off' : 'on'}</span>
              <span
                className={job.batteryConnected ? 'text-amber-300' : 'text-emerald-300'}
              >
                Battery {job.batteryConnected ? 'connected' : 'disconnected'}
              </span>
              <span className="ml-auto flex gap-1.5">
                <button
                  type="button"
                  className="rounded bg-slate-700 px-2 py-0.5 hover:bg-slate-600 disabled:opacity-40"
                  disabled={!p.editable}
                  onClick={() => p.act((s) => setCover(s, job.tag, !job.coverOff))}
                >
                  {job.coverOff ? 'Refit cover' : 'Lift cover'}
                </button>
              </span>
            </div>
            <svg
              viewBox="0 0 1000 540"
              className="w-full rounded-xl border border-slate-300 bg-sky-950 select-none"
              role="application"
              aria-label="Laptop on the bench, underside"
            >
              <defs>
                <pattern id="esd" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0 H0 V20" fill="none" stroke="#1e3a5f" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="1000" height="540" fill="url(#esd)" />
              <rect
                x="100"
                y="60"
                width="800"
                height="420"
                rx="26"
                fill={job.coverOff ? '#0f172a' : '#94a3b8'}
                stroke="#475569"
                strokeWidth="3"
              />
              {job.coverOff ? (
                <Inside
                  job={job}
                  fault={asset.hwFault}
                  selected={selected}
                  onSelect={setSelected}
                  onBattery={() =>
                    p.act((s) => setBattery(s, job.tag, !job.batteryConnected))
                  }
                />
              ) : (
                <g>
                  {Array.from({ length: 22 }).map((_, i) => (
                    <rect
                      key={i}
                      x={240 + i * 24}
                      y="150"
                      width="12"
                      height="70"
                      rx="6"
                      fill="#64748b"
                    />
                  ))}
                  {[
                    [150, 70],
                    [850, 70],
                    [150, 470],
                    [850, 470],
                  ].map(([x, y]) => (
                    <rect
                      key={`${x}-${y}`}
                      x={x - 30}
                      y={y - 6}
                      width="60"
                      height="12"
                      rx="6"
                      fill="#1f2937"
                    />
                  ))}
                  <text x="500" y="380" textAnchor="middle" fontSize="13" fill="#334155">
                    Vantage 14 G5 · {asset.tag} · S/N CR{asset.tag.replace(/\D/g, '')}X7
                  </text>
                  {SCREW_SPOTS.map(([x, y], i) => {
                    const outNow = job.screwsOut.includes(i)
                    return (
                      <g
                        key={i}
                        role="button"
                        tabIndex={0}
                        aria-label={`Screw ${i + 1}${outNow ? ' (out)' : ''}`}
                        data-testid="screw"
                        className="cursor-pointer outline-none"
                        onClick={() => p.act((s) => toggleScrew(s, job.tag, i))}
                        onKeyDown={(e) =>
                          (e.key === 'Enter' || e.key === ' ') &&
                          p.act((s) => toggleScrew(s, job.tag, i))
                        }
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r="11"
                          fill={outNow ? '#475569' : '#cbd5e1'}
                          stroke="#334155"
                          strokeWidth="2"
                        />
                        {!outNow && (
                          <path
                            d={`M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}`}
                            stroke="#334155"
                            strokeWidth="2.5"
                          />
                        )}
                      </g>
                    )
                  })}
                </g>
              )}
              {/* The screw tray. */}
              <rect
                x="920"
                y="60"
                width="66"
                height="160"
                rx="10"
                fill="#1e293b"
                stroke="#334155"
              />
              <text x="953" y="80" textAnchor="middle" fontSize="9" fill="#94a3b8">
                SCREWS
              </text>
              {job.screwsOut.map((_, i) => (
                <circle
                  key={i}
                  cx={940 + (i % 2) * 26}
                  cy={100 + Math.floor(i / 2) * 26}
                  r="9"
                  fill="#cbd5e1"
                  stroke="#475569"
                />
              ))}
            </svg>

            <div className="grid gap-3 lg:grid-cols-3">
              <section className={CARD} aria-label="Selected part">
                <h3 className="text-sm font-semibold text-slate-900">Inspect</h3>
                {selected && job.coverOff ? (
                  <div className="mt-1 space-y-2 text-sm">
                    <p className="font-medium">{COMPONENT_NAMES[selected]}</p>
                    <p className="text-slate-600">{COMPONENT_INFO[selected]}</p>
                    {!job.removed.includes(selected) && (
                      <button
                        type="button"
                        className={BUTTON}
                        disabled={!p.editable}
                        onClick={() => p.act((s) => removePart(s, job.tag, selected))}
                      >
                        Remove {COMPONENT_NAMES[selected].toLowerCase()}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    {job.coverOff
                      ? 'Click a part inside to inspect it.'
                      : 'Undo every screw and lift the cover to see inside.'}
                  </p>
                )}
              </section>
              <section className={CARD} aria-label="Parts bin">
                <h3 className="text-sm font-semibold text-slate-900">Parts bin</h3>
                <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-sm">
                  {PARTS.map((x) => (
                    <li key={x.id}>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="part"
                          checked={part === x.id}
                          onChange={() => setPart(x.id)}
                        />
                        {x.name}
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`${PRIMARY} mt-2`}
                  disabled={!p.editable || !part}
                  onClick={() => p.act((s) => installPart(s, job.tag, part!))}
                >
                  Fit the selected part
                </button>
              </section>
              <section className={CARD} aria-label="Tests">
                <h3 className="text-sm font-semibold text-slate-900">Tests</h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {TESTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={BUTTON}
                      disabled={!p.editable}
                      onClick={() => p.act((s) => runTest(s, job.tag, t))}
                    >
                      {TEST_NAMES[t]}
                    </button>
                  ))}
                </div>
                <ol
                  className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded bg-slate-950 p-2 font-mono text-[11px] text-emerald-200"
                  data-testid="test-log"
                  aria-live="polite"
                >
                  {job.results.length === 0 ? (
                    <li className="text-slate-500">No tests run yet.</li>
                  ) : (
                    job.results.map((r, i) => <li key={i}>{r}</li>)
                  )}
                </ol>
                <button
                  type="button"
                  className={`${PRIMARY} mt-2`}
                  disabled={!p.editable}
                  onClick={() => p.act((s) => finishRepair(s, job.tag))}
                >
                  Repair complete: return it
                </button>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
