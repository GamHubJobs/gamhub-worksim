/**
 * The GamHub WorkSim emblem and wordmark, for the game's opening: a skyline
 * whose towers rise like a chart of progress, under a rising sun, on a deep
 * tile. Drawn here (no image files), animated by index.css (launch-*).
 */
import type { CSSProperties } from 'react'

export function Emblem({ size = 112 }: { size?: number }) {
  return (
    <div
      className="launch-emblem relative overflow-hidden rounded-[28%] shadow-[0_20px_60px_rgba(14,165,233,0.35)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="launch-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1d4ed8" />
            <stop offset="1" stopColor="#0f766e" />
          </linearGradient>
          <linearGradient id="launch-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill="url(#launch-tile)" />
        <circle cx="74" cy="58" r="22" fill="url(#launch-sun)" opacity="0.9" />
        {/* The towers, rising left to right, with lit windows. */}
        {[
          [18, 70, 16],
          [38, 58, 16],
          [58, 44, 16],
          [78, 30, 18],
        ].map(([x, y, w], i) => (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={102 - y}
              rx="2"
              fill="#f8fafc"
              opacity={0.92}
            />
            {Array.from({ length: Math.floor((96 - y) / 10) }, (_, r) => (
              <rect
                key={r}
                x={x + 4}
                y={y + 6 + r * 10}
                width={w - 8}
                height="3"
                rx="1"
                fill="#1e3a8a"
                opacity="0.55"
              />
            ))}
          </g>
        ))}
        <rect x="10" y="102" width="100" height="4" rx="2" fill="#f8fafc" opacity="0.9" />
      </svg>
      {/* A sweep of light across it. */}
      <span
        aria-hidden
        className="launch-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />
    </div>
  )
}

export function Wordmark() {
  return (
    <div className="text-center">
      <p className="launch-word text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        GamHub <span className="text-sky-300">WorkSim</span>
      </p>
      <p className="launch-tagline mt-2 text-sm tracking-[0.3em] text-sky-100/80 uppercase">
        Learn the work · Live the day
      </p>
    </div>
  )
}

/** Particles drifting up through the dark (placed the same way every time). */
export function Particles({ count = 26 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        // A fixed scatter: the same each launch, no randomness.
        const left = (i * 37) % 100
        const bottom = (i * 53) % 30
        const size = 2 + ((i * 7) % 4)
        const style = {
          left: `${left}%`,
          bottom: `${bottom}%`,
          width: size,
          height: size,
          '--dur': `${6 + ((i * 11) % 6)}s`,
          '--delay': `${-((i * 13) % 9)}s`,
        } as CSSProperties
        return (
          <span
            key={i}
            className="launch-particle absolute rounded-full bg-sky-200/70 shadow-[0_0_8px_rgba(186,230,253,0.9)]"
            style={style}
          />
        )
      })}
    </div>
  )
}
