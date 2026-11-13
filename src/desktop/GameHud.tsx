/**
 * The game's HUD over the 3D world (see docs/GAME_SCREEN.md): how the player
 * is (six small bars) and shortcuts (phone, map, menu) at the bottom right,
 * and the pause menu (Esc, when nothing else is open) with its screens:
 * missions, relationships, character, inventory, settings, save and backup,
 * and the main menu. Each is an overlay over the world, which carries on
 * behind it; closing it goes back to exactly where the player was.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HudSlot } from '../ui/hud/Hud'
import type { Profile } from '../persistence/schemas'
import { CareersSection } from '../apps/career/CareersSection'
import { describe } from '../game/children'
import { audio } from '../audio/manager'
import { ADULTS } from '../content/adults'
import { getFurniture } from '../content/home'
import { formatMoney } from '../content/life'
import { careerLevel, type ProfileData } from '../game/career'
import { weekdayName } from '../game/clock'
import { whoOf } from '../game/dates'
import { bondOf, interestName, STAGE_NAMES } from '../game/romance'
import { openPhone, usePhone } from '../phone/store'
import { openMap, useMap } from '../world/map/store'
import { MiniMap } from '../world/map/MiniMap'

export type MenuScreen = 'relationships' | 'character' | 'inventory' | null

/** Six small bars: hunger, hygiene, social, fun, energy, stress. */
const NEEDS_KEY = 'worksim.hud.needs'
const readOpen = () => {
  try {
    return window.localStorage.getItem(NEEDS_KEY) !== 'compact'
  } catch {
    return true
  }
}

export function NeedsHud({ profile }: { profile: ProfileData }) {
  // Full (names and numbers) or compact (six small meters); remembered on this device.
  const [open, setOpen] = useState(readOpen)
  const toggle = () => {
    setOpen((o) => {
      try {
        window.localStorage.setItem(NEEDS_KEY, o ? 'compact' : 'full')
      } catch {
        // Storage blocked: the choice lasts until the page closes.
      }
      return !o
    })
  }
  const n = profile.work.life.needs
  const w = profile.work.wellbeing
  const bars: Array<[string, number, string]> = [
    ['Hunger', n.hunger, '#f59e0b'],
    ['Hygiene', n.hygiene, '#38bdf8'],
    ['Social', n.social, '#f472b6'],
    ['Fun', n.fun, '#a78bfa'],
    ['Energy', w.energy, '#4ade80'],
    ['Stress', w.stress, '#f87171'],
  ]
  if (!open)
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="How you are: show details"
        data-testid="hud-needs"
        data-compact="true"
        className="pointer-events-auto flex items-end gap-1 rounded-xl bg-slate-900/85 px-2.5 py-1.5 shadow-lg ring-1 ring-white/10"
        title={bars.map(([name, value]) => `${name} ${Math.round(value)}`).join(' · ')}
      >
        {bars.map(([name, value, colour]) => (
          <span
            key={name}
            className="flex h-6 w-2 flex-col justify-end overflow-hidden rounded-sm bg-white/20"
            role="meter"
            aria-label={name}
            aria-valuenow={Math.round(value)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ height: `${value}%`, background: colour }} />
          </span>
        ))}
      </button>
    )
  return (
    <div
      role="group"
      aria-label="How you are"
      data-testid="hud-needs"
      data-compact="false"
      className="pointer-events-auto relative grid w-56 max-w-full grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-slate-900/85 px-3 py-2 pr-6 text-[11px] text-white shadow-lg ring-1 ring-white/10"
    >
      <button
        type="button"
        onClick={toggle}
        aria-label="How you are: make it compact"
        title="Compact"
        className="absolute top-1 right-1 rounded px-1 text-[10px] text-slate-300 hover:bg-white/10"
      >
        ▾
      </button>
      {bars.map(([name, value, colour]) => (
        <div key={name}>
          <div className="flex justify-between">
            <span>{name}</span>
            <span className="tabular-nums">{Math.round(value)}</span>
          </div>
          <div
            role="meter"
            aria-label={name}
            aria-valuenow={Math.round(value)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/20"
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${value}%`, background: colour }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** The HUD at the bottom right: how you are, and the shortcuts. */
export function GameHud({
  profile,
  onMenu,
}: {
  profile: ProfileData
  onMenu: () => void
}) {
  const phone = usePhone()
  const map = useMap()
  if (phone.open || map.open) return null
  const button =
    'pointer-events-auto rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-white shadow ring-1 ring-white/15 hover:bg-slate-900'
  const content = (
    <div className="onsite-hide flex flex-col items-end gap-2" data-testid="hud">
      <MiniMap profile={profile} />
      <NeedsHud profile={profile} />
      <div className="pointer-events-auto flex gap-1.5">
        <button type="button" className={button} onClick={() => openPhone(null)}>
          📱 Phone <kbd className="font-sans">P</kbd>
        </button>
        <button type="button" className={button} onClick={openMap}>
          🗺️ Map
        </button>
        <button type="button" className={button} onClick={onMenu}>
          ☰ Menu <kbd className="font-sans">Esc</kbd>
        </button>
      </div>
    </div>
  )
  return (
    <HudSlot
      zone="bottom-right"
      passive
      fallback={(c) => (
        <div className="pointer-events-none fixed right-3 bottom-3 z-10">{c}</div>
      )}
    >
      {content}
    </HudSlot>
  )
}

function Overlay({
  title,
  onClose,
  children,
  testId,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  testId: string
}) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-6 backdrop-blur-sm">
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-label={title}
        data-testid={testId}
        className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Back
          </button>
        </div>
        <div className="mt-4 text-sm text-slate-700">{children}</div>
      </div>
    </div>
  )
}

/** The pause menu: everything that is not the world, one step away. */
export function PauseMenu({
  onClose,
  onStory,
  onSound,
  onHelp,
  onTours,
  onStorage,
  onMainMenu,
  onScreen,
}: {
  onClose: () => void
  onStory: () => void
  onSound: () => void
  onHelp: () => void
  /** The guided tours (take one again, resume a paused one). */
  onTours?: () => void
  onStorage: () => void
  onMainMenu: () => void
  onScreen: (s: MenuScreen) => void
}) {
  const go = (fn: () => void) => () => {
    audio.play('click')
    onClose()
    fn()
  }
  const items: Array<[string, () => void]> = [
    ['Resume', onClose],
    ['Map', go(openMap)],
    ['Missions', go(onStory)],
    ['Relationships', go(() => onScreen('relationships'))],
    ['Character', go(() => onScreen('character'))],
    ['Inventory', go(() => onScreen('inventory'))],
    ['Settings', go(onSound)],
    ['Help', go(onHelp)],
    ...(onTours ? ([['Guided tours', go(onTours)]] as Array<[string, () => void]>) : []),
    ['Save & backup', go(onStorage)],
    ['Main menu', go(onMainMenu)],
  ]
  return (
    <Overlay title="Paused" onClose={onClose} testId="pause-menu">
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map(([label, fn]) => (
          <li key={label}>
            <button
              type="button"
              onClick={fn}
              className={`w-full rounded-xl px-4 py-3 text-left font-medium ${
                label === 'Resume'
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Your progress is saved as you play. Esc or Resume goes back to the game.
      </p>
    </Overlay>
  )
}

export function RelationshipsScreen({
  profile,
  onClose,
}: {
  profile: ProfileData
  onClose: () => void
}) {
  const life = profile.work.life
  const known = Object.keys(life.bonds ?? {}).filter((id) => ADULTS[id])
  return (
    <Overlay title="Relationships" onClose={onClose} testId="relationships">
      {known.length === 0 ? (
        <p>
          Nobody yet. Get to know people at the café, the gym, the garage and the office:
          ask what they love doing.
        </p>
      ) : (
        <ul className="space-y-3">
          {known.map((id) => {
            const b = bondOf(life, id)
            const who = whoOf(id)
            const a = ADULTS[id]
            return (
              <li
                key={id}
                className="rounded-xl bg-slate-50 p-3"
                data-testid={`bond-${id}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-slate-900">{who?.name ?? id}</p>
                  <p className="text-xs font-medium text-pink-700">
                    {STAGE_NAMES[b.stage]}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {a.age} · {a.life}
                </p>
                <div
                  role="meter"
                  aria-label={`Closeness with ${who?.name ?? id}`}
                  aria-valuenow={b.closeness}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
                >
                  <div
                    className="h-full rounded-full bg-pink-500"
                    style={{ width: `${b.closeness}%` }}
                  />
                </div>
                {b.known.length > 0 && (
                  <p className="mt-2 text-xs">
                    Loves: {b.known.map((i) => interestName(i)).join(', ')}
                  </p>
                )}
                {b.date && (
                  <p className="mt-1 text-xs font-medium text-pink-800">
                    A date: {weekdayName(b.date.day)} at 7 pm,{' '}
                    {b.date.place === 'park' ? 'the park' : 'Kettle & Crumb'}
                  </p>
                )}
                {b.history.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                    {[...b.history]
                      .reverse()
                      .slice(0, 4)
                      .map((h, i) => (
                        <li key={i}>
                          {weekdayName(h.day)}: {h.text}
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {(life.family.children.length > 0 || life.family.expected) && (
        <section aria-label="Family" className="mt-4" data-testid="family">
          <p className="font-semibold text-slate-900">Family</p>
          <ul className="mt-1 space-y-1">
            {life.family.children.map((c) => (
              <li key={c.name} className="rounded-lg bg-amber-50 px-3 py-2">
                <span className="font-medium">{c.name}</span>,{' '}
                {describe(c, profile.work.day, life.minute)}
              </li>
            ))}
            {life.family.expected && (
              <li className="rounded-lg bg-amber-50 px-3 py-2">
                {life.family.expected.adopted
                  ? 'A child to adopt, coming home soon'
                  : 'A baby on the way'}
              </li>
            )}
          </ul>
        </section>
      )}
    </Overlay>
  )
}

export function CharacterScreen({
  profile,
  onClose,
}: {
  profile: ProfileData
  onClose: () => void
}) {
  const { current, next } = careerLevel(profile)
  const life = profile.work.life
  return (
    <Overlay title={profile.name} onClose={onClose} testId="character">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <dt className="text-slate-500">Job</dt>
        <dd className="font-medium">{current.title}</dd>
        <dt className="text-slate-500">Experience</dt>
        <dd>
          {profile.xp} XP{next ? ` (next: ${next.title} at ${next.xpRequired})` : ''}
        </dd>
        <dt className="text-slate-500">Money</dt>
        <dd>{formatMoney(life.money)}</dd>
        <dt className="text-slate-500">Reputation at work</dt>
        <dd>{profile.work.reputation}/100</dd>
        <dt className="text-slate-500">Home</dt>
        <dd>{life.home.id}</dd>
      </dl>
      <div className="mt-4">
        <NeedsHud profile={profile} />
      </div>
    </Overlay>
  )
}

export function InventoryScreen({
  profile,
  onClose,
}: {
  profile: ProfileData
  onClose: () => void
}) {
  const life = profile.work.life
  const furniture = Object.values(life.home.furniture)
    .filter(Boolean)
    .map((f) => getFurniture(f!.item)?.name ?? f!.item)
  return (
    <Overlay title="Inventory" onClose={onClose} testId="inventory">
      <ul className="space-y-1">
        <li>🍱 {life.food} meals in the fridge</li>
        <li>🚲 {life.vehicles.bike ? 'Your bike' : 'No bike (Cog & Kerb sells them)'}</li>
        <li>🚗 {life.vehicles.car ? 'A leased car' : 'No car'}</li>
        <li>📱 Your phone</li>
      </ul>
      <p className="mt-4 font-semibold text-slate-900">At home</p>
      <ul className="mt-1 grid grid-cols-2 gap-1">
        {furniture.map((name, i) => (
          <li key={i} className="rounded bg-slate-50 px-2 py-1">
            {name}
          </li>
        ))}
      </ul>
    </Overlay>
  )
}

/** The main menu: careers (each its own save), and the story. */
export function MainMenuScreen({
  profile,
  onSwitchCareer,
  onStory,
  onClose,
}: {
  profile: Profile
  onSwitchCareer: (careerId: string) => Promise<void>
  onStory: () => void
  onClose: () => void
}) {
  return (
    <Overlay title="GamHub WorkSim" onClose={onClose} testId="main-menu">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            onStory()
          }}
          className="rounded-xl bg-rose-700 px-4 py-2 font-medium text-white hover:bg-rose-800"
        >
          Story Mode
        </button>
      </div>
      <div className="mt-4">
        <CareersSection profile={profile} onSwitchCareer={onSwitchCareer} />
      </div>
    </Overlay>
  )
}
