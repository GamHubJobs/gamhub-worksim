/**
 * Out in the neighbourhood: the street in 3D, where the player walks (arrow
 * keys or WASD, Shift to run) and goes in at the doors; the places listed for
 * going straight there; and what there is to do inside each. Everything also
 * works without 3D, from the list.
 */
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { PLACES, PLACE_ACTIONS, getPlace, type PlaceId } from '../content/city'
import { formatMoney } from '../content/life'
import { formatTime, nextWorkday, weekdayName } from '../game/clock'
import { canEnter, minutesTo } from '../game/city'
import { arrivalFor, canDo, lifePhase } from '../game/life'
import { unreadCount, type Contact } from '../game/social'
import { MoneyPanel, NeedsPanel } from '../home/LifePanels'
import { Phone } from '../home/Phone'
import { supportsWebGL } from '../office/webgl'
import type { Profile } from '../persistence/schemas'

const CityScene = lazy(() => import('./scene/CityScene'))

/** Shows nothing instead of the 3D street if it fails: the list still works. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('The 3D neighbourhood could not be shown.', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const MOVE_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'a',
  's',
  'd',
])

export function CityView({
  profile,
  onEnter,
  onOutside,
  onAction,
  onRespond,
  onContact,
  onRead,
}: {
  profile: Profile
  onEnter: (id: PlaceId) => void
  onOutside: () => void
  onAction: (id: string) => void
  onRespond: (messageId: string, accept: boolean) => void
  onContact: (friendId: string, how: Contact) => void
  onRead: (friendId: string) => void
}) {
  const [webgl] = useState(supportsWebGL)
  const [near, setNear] = useState<PlaceId | null>(null)
  const [phone, setPhone] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const keys = useRef(new Set<string>())
  const life = profile.work.life
  const phase = lifePhase(profile) === 'morning' ? 'morning' : 'evening'
  const day = phase === 'morning' ? nextWorkday(profile.work.day) : profile.work.day
  const outside = !life.city.inside
  const here = getPlace(life.city.at)!
  const dark = phase === 'evening' && life.minute >= 20 * 60

  const go = useCallback(
    (id: PlaceId) => {
      const blocked = canEnter(profile, id)
      setNotice(blocked)
      if (!blocked) onEnter(id)
    },
    [profile, onEnter],
  )
  const onNear = useCallback((id: PlaceId | null) => setNear(id), [])

  function keyDown(event: React.KeyboardEvent) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (MOVE_KEYS.has(key) || key === 'Shift') {
      event.preventDefault()
      keys.current.add(key)
    } else if ((key === 'Enter' || key === 'e') && near && outside) {
      event.preventDefault()
      go(near)
    }
  }
  function keyUp(event: React.KeyboardEvent) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    keys.current.delete(key)
  }

  const actions = PLACE_ACTIONS.filter(
    (a) => a.place === here.id && a.phases.includes(phase),
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#eef1ec]" data-testid="city">
      <div className="mx-auto grid max-w-5xl gap-5 p-5 lg:grid-cols-[1fr_20rem]">
        <section aria-label="The neighbourhood" className="space-y-4">
          <header className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium tracking-wide text-emerald-800 uppercase">
              {outside ? 'Out in the neighbourhood' : here.kind}
            </p>
            <h1 className="text-xl font-semibold text-slate-900" data-testid="city-clock">
              {outside ? 'The high street' : here.name} · {weekdayName(day)},{' '}
              {formatTime(life.minute)}
            </h1>
            <p className="text-sm text-slate-600">
              {outside
                ? 'Walk along the street and go in at a door, or choose a place below. Walking takes time.'
                : here.description}
            </p>
          </header>

          {webgl && (
            <div
              className="relative h-80 overflow-hidden rounded-xl bg-slate-300 shadow-sm ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              data-testid="city-3d"
              role="application"
              aria-label="The street in 3D. Up and Down (or W and S) walk, Left and Right (or A and D) turn, Shift runs, and Enter goes in at a door."
              tabIndex={0}
              onKeyDown={keyDown}
              onKeyUp={keyUp}
              onBlur={() => keys.current.clear()}
            >
              <SceneBoundary>
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-sm text-slate-600">
                      Stepping outside…
                    </div>
                  }
                >
                  <CityScene
                    at={life.city.at}
                    outside={outside}
                    phase={phase}
                    dark={dark}
                    dressed={phase === 'morning' && life.ready.dressed}
                    keys={keys}
                    onNear={onNear}
                    onDoor={go}
                    near={near}
                  />
                </Suspense>
              </SceneBoundary>
              {outside && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  {near ? (
                    <button
                      type="button"
                      data-testid="door-prompt"
                      onClick={() => go(near)}
                      className="pointer-events-auto rounded-full bg-slate-900/85 px-4 py-1.5 text-sm font-medium text-white shadow hover:bg-slate-900"
                    >
                      {near === 'home'
                        ? 'Go inside: home'
                        : near === 'office'
                          ? 'Walk to work'
                          : `Go into ${getPlace(near)!.name}`}{' '}
                      <span className="text-xs font-normal text-slate-300">(Enter)</span>
                    </button>
                  ) : (
                    <span className="rounded-full bg-slate-900/60 px-3 py-1 text-xs text-white">
                      Click here, then walk with the arrow keys: Up to walk, Left and
                      Right to turn
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <p
            role="status"
            className="min-h-5 text-sm text-amber-800"
            data-testid="city-notice"
          >
            {notice}
          </p>

          {phone ? (
            <Phone
              profile={profile}
              onRespond={onRespond}
              onContact={onContact}
              onRead={onRead}
              onClose={() => setPhone(false)}
              closeLabel="Put your phone away"
            />
          ) : outside ? (
            <div
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              data-testid="places"
            >
              <h2 className="font-semibold text-slate-900">Places</h2>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {PLACES.map((place) => {
                  const blocked = canEnter(profile, place.id)
                  const minutes = minutesTo(profile, place.id)
                  return (
                    <li key={place.id}>
                      <button
                        type="button"
                        disabled={!!blocked}
                        onClick={() => go(place.id)}
                        data-testid={`place-${place.id}`}
                        className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span className="flex items-center gap-2 font-medium text-slate-900">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: place.colour }}
                          />
                          {place.id === 'office' ? 'Walk to work' : place.name}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {place.kind}
                          {place.open
                            ? ` · open ${formatTime(place.open[0])}–${formatTime(place.open[1])}`
                            : ''}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {blocked ??
                            (place.id === 'office'
                              ? `${minutes} min on foot · arrive ${formatTime(arrivalFor(profile, 'walk').minute)}`
                              : minutes
                                ? `${minutes} min walk`
                                : 'You are here')}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <div
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              data-testid="place"
            >
              <h2 className="font-semibold text-slate-900">{here.name}</h2>
              <ul className="mt-3 space-y-2">
                {actions.map((action) => {
                  const blocked = canDo(profile, action)
                  return (
                    <li key={action.id}>
                      <button
                        type="button"
                        disabled={!!blocked}
                        onClick={() => onAction(action.id)}
                        title={blocked ?? undefined}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span>
                          <span className="font-medium text-slate-900">
                            {action.label}
                          </span>
                          {blocked && (
                            <span className="block text-xs text-slate-500">
                              {blocked}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {action.minutes} min
                          {action.cost ? ` · ${formatMoney(action.cost)}` : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
                {actions.length === 0 && (
                  <li className="text-sm text-slate-500">
                    Nothing to do here right now.
                  </li>
                )}
              </ul>
              <button
                type="button"
                onClick={onOutside}
                className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Back out to the street
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-4" aria-label="How you are">
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Phone</h2>
              {unreadCount(life) > 0 && (
                <span className="rounded-full bg-red-600 px-2 text-xs font-semibold text-white">
                  {unreadCount(life)} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPhone((open) => !open)}
              className="mt-2 rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-emerald-50"
            >
              {phone ? 'Put your phone away' : 'Open your phone'}
            </button>
          </section>
          <NeedsPanel profile={profile} />
          <MoneyPanel life={life} />
          {life.log.length > 0 && (
            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="font-semibold text-slate-900">
                {phase === 'morning' ? 'This morning' : 'This evening'}
              </h2>
              <ul
                className="mt-1 space-y-0.5 text-xs text-slate-600"
                data-testid="city-log"
              >
                {life.log.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
