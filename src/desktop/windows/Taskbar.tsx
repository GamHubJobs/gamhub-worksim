/**
 * The taskbar along the bottom of the work computer, in the style of Windows
 * 10: Start, search, the apps (with a line under the ones that are open), and
 * the notification area with the employee's status and the clock.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../../ui/Icon'
import { useOnline } from '../../app/pwa'

export interface LaunchableApp {
  /** The window key (see windowManager.keyOf). */
  key: string
  label: string
  icon: IconName
  /** The level at which a locked tool unlocks. */
  lockedUntil?: string | null
  badge?: number
}

export function Taskbar({
  apps,
  openKeys,
  activeKey,
  onLaunch,
  onLeaveDesk,
  tray,
  startMenu,
}: {
  apps: LaunchableApp[]
  /** Apps that have a window (minimised or not). */
  openKeys: Set<string>
  activeKey: string | null
  onLaunch: (key: string, from: 'taskbar' | 'menu') => void
  onLeaveDesk: () => void
  tray: ReactNode
  startMenu: (close: () => void) => ReactNode
}) {
  const [startOpen, setStartOpen] = useState(false)
  const [query, setQuery] = useState('')
  const startArea = useRef<HTMLDivElement>(null)
  const searchArea = useRef<HTMLDivElement>(null)

  // Clicking elsewhere, or Escape, closes Start and the search results.
  useEffect(() => {
    if (!startOpen && !query) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!startArea.current?.contains(target)) setStartOpen(false)
      if (!searchArea.current?.contains(target)) setQuery('')
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setStartOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [startOpen, query])

  const results = query.trim()
    ? apps.filter(
        (a) =>
          !a.lockedUntil && a.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : []

  return (
    <footer
      className="relative z-1000 flex h-10 shrink-0 items-stretch bg-[#202020] text-white"
      data-testid="taskbar"
    >
      <div ref={startArea} className="relative flex">
        <button
          type="button"
          aria-label="Start"
          aria-expanded={startOpen}
          onClick={() => setStartOpen((o) => !o)}
          className={`flex w-12 items-center justify-center hover:bg-white/10 ${
            startOpen ? 'bg-white/10' : ''
          }`}
        >
          <StartMark />
        </button>
        {startOpen && startMenu(() => setStartOpen(false))}
      </div>

      <div ref={searchArea} className="relative hidden md:flex">
        <label className="flex w-64 items-center gap-2 bg-[#f3f3f3] px-3 text-sm text-slate-700 lg:w-80">
          <SearchGlyph />
          <span className="sr-only">Search apps</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) {
                onLaunch(results[0].key, 'menu')
                setQuery('')
              }
            }}
            placeholder="Type here to search"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500"
          />
        </label>
        {query.trim() && (
          <div
            role="listbox"
            aria-label="Search results"
            className="absolute bottom-full left-0 w-80 bg-[#2b2b2b] py-2 shadow-2xl"
          >
            {results.length === 0 ? (
              <p className="px-4 py-2 text-sm text-slate-300">No apps match “{query}”.</p>
            ) : (
              results.map((app) => (
                <button
                  key={app.key}
                  type="button"
                  role="option"
                  aria-selected={app === results[0]}
                  onClick={() => {
                    onLaunch(app.key, 'menu')
                    setQuery('')
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-white/10"
                >
                  <Icon name={app.icon} className="h-5 w-5" />
                  {app.label}
                  <span className="ml-auto text-xs text-slate-400">App</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <nav
        aria-label="Apps"
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto"
      >
        {apps.map((app) => {
          const open = openKeys.has(app.key)
          const active = activeKey === app.key
          const badge = app.badge ?? 0
          return (
            <button
              key={app.key}
              type="button"
              onClick={() => onLaunch(app.key, 'taskbar')}
              disabled={!!app.lockedUntil}
              title={
                app.lockedUntil
                  ? `${app.label} unlocks when you become ${app.lockedUntil}.`
                  : app.label
              }
              aria-current={active ? 'page' : undefined}
              className={`relative flex w-12 shrink-0 items-center justify-center disabled:opacity-40 ${
                active ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <Icon name={app.lockedUntil ? 'lock' : app.icon} className="h-5 w-5" />
              <span className="sr-only">{app.label}</span>
              {badge > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-4 rounded-full bg-[#c42b1c] px-1 text-[10px] leading-4 font-semibold text-white"
                  aria-label={`${badge} new`}
                >
                  {badge}
                </span>
              )}
              {open && (
                <span
                  aria-hidden
                  className={`absolute right-1 bottom-0 left-1 h-0.5 ${
                    active ? 'bg-[#76b9ed]' : 'bg-[#76b9ed]/70'
                  }`}
                />
              )}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onLeaveDesk}
          title="Get up from your desk and walk around the office"
          className="flex shrink-0 items-center gap-1.5 px-3 text-xs hover:bg-white/10"
        >
          <Icon name="back" className="h-4 w-4" />
          Leave desk
        </button>
      </nav>

      <div className="flex shrink-0 items-stretch">{tray}</div>
    </footer>
  )
}

/** WorkSim's own mark on the Start button (not a copy of any operating system's logo). */
function StartMark() {
  return (
    <span
      aria-hidden
      className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#1f6fbf] text-[11px] font-bold"
    >
      W
    </span>
  )
}

function SearchGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="9.5" cy="6.5" r="4.5" strokeWidth="1.4" />
      <path d="M6.2 9.8 2 14" strokeWidth="1.4" />
    </svg>
  )
}

/** Notification-area icons: network (online or not), volume, battery (energy). */
export function TrayIcons({
  energy,
  energyText,
}: {
  energy: number
  energyText: string
}) {
  const online = useOnline()
  return (
    <div className="flex items-center gap-2.5 px-2 text-white/90">
      <span
        title={
          online
            ? 'Connected to the internet'
            : 'Offline: work is still saved on this device'
        }
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M1 6a10 10 0 0 1 14 0M3.5 8.6a6.5 6.5 0 0 1 9 0M6 11.2a3 3 0 0 1 4 0"
            strokeWidth="1.3"
          />
          <circle cx="8" cy="13.4" r="0.9" fill="currentColor" />
          {!online && <path d="M2 2l12 12" strokeWidth="1.4" />}
        </svg>
        <span className="sr-only">{online ? 'Online' : 'Offline'}</span>
      </span>
      <span title="Volume">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
        >
          <path d="M2 6h3l4-3v10l-4-3H2z" strokeWidth="1.2" />
          <path
            d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.8a6 6 0 0 1 0 8.4"
            strokeWidth="1.2"
          />
        </svg>
      </span>
      <span title={`Your energy: ${energy}% (${energyText})`} data-testid="tray-energy">
        <svg
          aria-hidden
          viewBox="0 0 22 12"
          className="h-3 w-[22px]"
          fill="none"
          stroke="currentColor"
        >
          <rect x="0.5" y="0.5" width="18" height="11" rx="1.5" strokeWidth="1" />
          <rect
            x="19"
            y="3.5"
            width="2.5"
            height="5"
            rx="0.5"
            fill="currentColor"
            stroke="none"
          />
          <rect
            x="2"
            y="2"
            width={Math.max(0.5, (15 * energy) / 100)}
            height="8"
            fill={energy < 25 ? '#f87171' : 'currentColor'}
            stroke="none"
          />
        </svg>
        <span className="sr-only">
          Energy {energy}% ({energyText})
        </span>
      </span>
    </div>
  )
}
