/**
 * The Start menu: the employee at the top of the rail, every app in A–Z
 * order, and tiles for the apps used most. Laid out like Windows 10's, with
 * WorkSim's own names.
 */
import type { ReactNode } from 'react'
import { Icon } from '../../ui/Icon'
import type { LaunchableApp } from './Taskbar'

export function StartMenu({
  apps,
  colors,
  name,
  title,
  company,
  onLaunch,
  onProfile,
  onSettings,
  onHelp,
  onTour,
  onStorage,
  onLeaveDesk,
  onClose,
}: {
  apps: LaunchableApp[]
  colors: Record<string, string>
  name: string
  title: string
  company: string
  onLaunch: (key: string) => void
  onProfile: () => void
  onSettings: () => void
  onHelp: () => void
  /** The guided tours (replay the introduction or an app's tour). */
  onTour?: () => void
  onStorage: () => void
  onLeaveDesk: () => void
  onClose: () => void
}) {
  const run = (action: () => void) => () => {
    onClose()
    action()
  }
  const sorted = [...apps].sort((a, b) => a.label.localeCompare(b.label))
  const tiles = ['mail', 'tasks', 'ai', 'cases', 'sheets', 'docs']
    .map((key) => apps.find((a) => a.key === key))
    .filter((a): a is LaunchableApp => !!a && !a.lockedUntil)

  return (
    <div
      role="dialog"
      aria-label="Start"
      className="absolute bottom-full left-0 flex h-[min(34rem,calc(100vh-3rem))] w-[min(40rem,100vw)] bg-[#1f1f1f]/[0.97] text-white shadow-[0_0_24px_rgba(0,0,0,0.5)]"
      data-testid="start-menu"
    >
      {/* The rail */}
      <div className="flex w-12 shrink-0 flex-col justify-end pb-1">
        <RailButton label={`${name}, ${title}`} onClick={run(onProfile)}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a3a3a] text-[10px] font-semibold">
            {initials(name)}
          </span>
        </RailButton>
        <RailButton label="Settings" onClick={run(onSettings)}>
          <GearGlyph />
        </RailButton>
        <RailButton label="Storage & backup (Start)" onClick={run(onStorage)}>
          <Icon name="storage" className="h-4 w-4" />
        </RailButton>
        <RailButton label="Leave desk (Start)" onClick={run(onLeaveDesk)}>
          <PowerGlyph />
        </RailButton>
      </div>

      {/* A–Z list */}
      <div className="w-56 shrink-0 overflow-y-auto py-2">
        <p className="px-3 pb-1 text-[11px] text-white/60">
          {company} · {name}
        </p>
        <ul aria-label="All apps">
          {sorted.map((app) => (
            <li key={app.key}>
              <button
                type="button"
                disabled={!!app.lockedUntil}
                title={
                  app.lockedUntil
                    ? `Unlocks when you become ${app.lockedUntil}`
                    : undefined
                }
                onClick={run(() => onLaunch(app.key))}
                className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-white/10 disabled:opacity-40"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center"
                  style={{ background: colors[app.key] ?? '#1f6fbf' }}
                >
                  <Icon name={app.lockedUntil ? 'lock' : app.icon} className="h-4 w-4" />
                </span>
                {app.label}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={run(onHelp)}
              className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center bg-[#5c5c5c]">
                <Icon name="info" className="h-4 w-4" />
              </span>
              Handbook and help
            </button>
          </li>
          {onTour && (
            <li>
              <button
                type="button"
                onClick={run(onTour)}
                className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-white/10"
              >
                <span className="flex h-7 w-7 items-center justify-center bg-[#5c5c5c]">
                  <Icon name="guide" className="h-4 w-4" />
                </span>
                Guided tours
              </button>
            </li>
          )}
        </ul>
      </div>

      {/* Tiles */}
      <div className="hidden min-w-0 flex-1 overflow-y-auto p-3 sm:block">
        <p className="pb-2 text-xs text-white/80">Work</p>
        <div className="grid grid-cols-3 gap-1">
          {tiles.map((app) => (
            <button
              key={app.key}
              type="button"
              onClick={run(() => onLaunch(app.key))}
              className="relative flex aspect-square flex-col justify-between p-2 text-left outline-offset-[-2px] hover:outline hover:outline-2 hover:outline-white/50"
              style={{ background: colors[app.key] ?? '#1f6fbf' }}
            >
              <Icon name={app.icon} className="h-7 w-7 self-center mt-3" />
              <span className="text-xs">
                {app.label}
                {(app.badge ?? 0) > 0 && (
                  <span className="ml-1 text-white/80">({app.badge})</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function RailButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label.replace(' (Start)', '')}
      onClick={onClick}
      className="flex h-11 w-12 items-center justify-center hover:bg-white/10"
    >
      {children}
    </button>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function GearGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="8" cy="8" r="2.2" strokeWidth="1.2" />
      <path
        d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function PowerGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
    >
      <path d="M8 1.5v6" strokeWidth="1.3" />
      <path d="M4.6 3.8a5.5 5.5 0 1 0 6.8 0" strokeWidth="1.3" />
    </svg>
  )
}
