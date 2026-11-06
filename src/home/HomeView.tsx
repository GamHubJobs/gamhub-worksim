/**
 * Home: the evening after work and the morning before it. The player moves
 * between the rooms of their flat and chooses what to do; each choice takes
 * time and may cost money, and how they look after themselves shows at work
 * the next day.
 */
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getHome, type HomeId, type SlotId } from '../content/home'
import { homeOf } from '../game/home'
import { supportsWebGL } from '../office/webgl'
import { HomeShop } from './HomeShop'
import { MoneyPanel, NeedsPanel } from './LifePanels'
import { CommuteChoices } from './CommuteChoices'
import { Phone } from './Phone'
import { CareerPanel } from './CareerPanel'
import { WalkView } from '../world/WalkView'
import type { Doing } from '../city/scene/interiors/kit'
import { audio } from '../audio/manager'
import type { ProfileData } from '../game/career'
import { canGo, plansTonight, unreadCount, type Contact } from '../game/social'
import {
  HOME_ACTIONS,
  ROOMS,
  formatMoney,
  type CommuteId,
  type RoomId,
} from '../content/life'
import { HOURS } from '../content/workday'
import { formatTime, nextWorkday, weekdayName } from '../game/clock'
import { canDo, lifePhase, sleepHours } from '../game/life'
import { canGoOut } from '../game/city'
import { deliveryStage } from '../game/delivery'
import { holdEncounter, relationOf } from '../game/encounters'
import { TOWN_PEOPLE } from '../content/townPeople'
import { EncounterPanel } from '../world/npc/EncounterPanel'
import type { Profile } from '../persistence/schemas'

const HomeScene = lazy(() => import('./scene/HomeScene'))

/** Shows nothing instead of the 3D home if it fails: the panels still work. */
class SceneBoundary extends Component<
  { children: ReactNode; onFail?: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('The 3D home could not be shown.', error)
    this.props.onFail?.()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function HomeView({
  profile,
  onAction,
  onBed,
  onLeave,
  onBuy,
  onSell,
  onRecolour,
  onMove,
  onRespond,
  onGoOut,
  onContact,
  onRead,
  onGoOutside,
  onCareer,
}: {
  profile: Profile
  onAction: (id: string) => void
  onBed: () => void
  onLeave: (commute: CommuteId) => void
  onBuy: (item: string, colour: number) => void
  onSell: (slot: SlotId) => void
  onRecolour: (slot: SlotId, colour: number) => void
  onMove: (home: HomeId) => void
  onRespond: (messageId: string, accept: boolean) => void
  onGoOut: (messageId: string) => void
  onContact: (friendId: string, how: Contact) => void
  onRead: (friendId: string) => void
  onGoOutside: () => void
  /** Career life on the laptop: applies a rule from game/careerLife.ts. */
  onCareer: (change: (profile: ProfileData) => ProfileData) => Promise<unknown>
}) {
  const [webgl] = useState(supportsWebGL)
  const [shop, setShop] = useState<'shop' | 'move' | 'phone' | 'career' | null>(null)
  const life = profile.work.life
  const phase = lifePhase(profile)
  const [room, setRoom] = useState<RoomId>(phase === 'morning' ? 'bedroom' : 'living')
  const current = ROOMS.find((r) => r.id === room)!
  const actions = HOME_ACTIONS.filter(
    (a) => a.room === room && a.phases.includes(phase === 'work' ? 'evening' : phase),
  )
  const day = phase === 'morning' ? nextWorkday(profile.work.day) : profile.work.day
  // Everything that can be done at home now, for the furniture in 3D (as the lists).
  const now = phase === 'work' ? 'evening' : phase
  const doings: Doing[] = [
    ...HOME_ACTIONS.filter((a) => a.phases.includes(now)).map((a) => ({
      id: a.id,
      label: a.label,
      detail: `${a.minutes} min${a.cost ? ` · ${formatMoney(a.cost)}` : ''}`,
      blocked: canDo(profile, a),
    })),
    ...(phase === 'evening'
      ? [
          {
            id: 'bed',
            label: 'Go to bed',
            detail: `${sleepHours(life.minute).toFixed(1)} hours before the alarm`,
            blocked: null,
          },
        ]
      : []),
    {
      id: 'go-out',
      label: 'Go out into the neighbourhood',
      detail: 'Café, shop, gym, park',
      blocked: canGoOut(profile),
    },
  ]
  const doingsKey = JSON.stringify(doings)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDoings = useMemo(() => doings, [doingsKey])
  // With 3D, the character does things in the flat (the game action when they
  // finish); without it, straight away.
  const [sceneFailed, setSceneFailed] = useState(false)
  // Until the 3D view is ready, things are done straight away.
  const [ready, setReady] = useState(false)
  const walkable = webgl && !sceneFailed && ready
  const [request, setRequest] = useState<{ id: string; nonce: number } | null>(null)
  const commit = useCallback(
    (id: string) => {
      if (id === 'bed') return onBed()
      if (id === 'go-out') return onGoOutside()
      onAction(id)
    },
    [onAction, onBed, onGoOutside],
  )
  const doThing = useCallback(
    (id: string) => {
      const action = HOME_ACTIONS.find((a) => a.id === id)
      if (action) setRoom(action.room)
      if (walkable) setRequest((r) => ({ id, nonce: (r?.nonce ?? 0) + 1 }))
      else commit(id)
    },
    [walkable, commit],
  )
  // The courier, after handing the takeaway over at the door: a word before they go.
  const [courier, setCourier] = useState(false)
  const stage = deliveryStage(life)
  const onActivityDone = useCallback(
    (action: string | null, completed: boolean) => {
      if (completed && action === 'takeaway-door' && stage === 'at-door') setCourier(true)
      if (completed && action) commit(action)
    },
    [commit, stage],
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f1ec]" data-testid="home">
      <div className="mx-auto grid max-w-5xl gap-5 p-5 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Your flat" className="space-y-4">
          <header className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium tracking-wide text-amber-800 uppercase">
              {phase === 'morning' ? 'Morning' : 'Evening'} at home
            </p>
            <h1 className="text-xl font-semibold text-slate-900" data-testid="home-clock">
              {weekdayName(day)}, {formatTime(life.minute)}
            </h1>
            <p className="text-sm text-slate-600">
              {phase === 'morning'
                ? `Work starts at ${formatTime(HOURS.start)}. Eat, shower and get dressed, then leave in time.`
                : 'Your time: eat, rest, see friends. Go to bed in good time for tomorrow.'}
            </p>
          </header>

          {webgl && !sceneFailed && (
            <WalkView
              className="h-[28rem] bg-slate-200"
              testId="home-3d"
              label="Your home in 3D. W, A, S and D walk, Shift runs, drag the mouse or press Q and R to look around, and E uses what you are next to. Everything here is also in the lists below."
            >
              {(api) => (
                <SceneBoundary onFail={() => setSceneFailed(true)}>
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">
                        Opening the door…
                      </div>
                    }
                  >
                    <HomeScene
                      homeId={life.home.id}
                      furniture={JSON.stringify(life.home.furniture)}
                      phase={phase === 'morning' ? 'morning' : 'evening'}
                      dressed={phase === 'morning' && life.ready.dressed}
                      delivery={deliveryStage(life)}
                      doings={stableDoings}
                      controls={api.controls}
                      request={request}
                      onRequest={doThing}
                      onPrompt={api.onPrompt}
                      onProgress={api.onProgress}
                      onDone={onActivityDone}
                      onReady={() => setReady(true)}
                    />
                  </Suspense>
                </SceneBoundary>
              )}
            </WalkView>
          )}

          {courier && (
            <EncounterPanel
              className="fixed right-4 bottom-4 z-40"
              who={TOWN_PEOPLE.courier}
              situation={{ availability: 'free', minute: life.minute }}
              relation={relationOf(profile, TOWN_PEOPLE.courier.id)}
              onSay={(outcome) =>
                void onCareer((p) =>
                  holdEncounter(p, [TOWN_PEOPLE.courier.id], outcome, 'out'),
                )
              }
              onClose={() => setCourier(false)}
            />
          )}

          {shop === 'career' ? (
            <CareerPanel
              profile={profile}
              onAct={onCareer}
              onClose={() => setShop(null)}
            />
          ) : shop === 'phone' ? (
            <Phone
              profile={profile}
              onRespond={onRespond}
              onContact={onContact}
              onRead={onRead}
              onClose={() => setShop(null)}
            />
          ) : shop === 'shop' || shop === 'move' ? (
            <HomeShop
              profile={profile}
              tab={shop}
              onTab={setShop}
              onBuy={onBuy}
              onSell={onSell}
              onRecolour={onRecolour}
              onMove={onMove}
              onClose={() => setShop(null)}
            />
          ) : (
            <>
              <nav aria-label="Rooms" className="flex flex-wrap gap-2">
                {ROOMS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-current={r.id === room ? 'location' : undefined}
                    onClick={() => {
                      if (r.id !== room)
                        for (let i = 0; i < 3; i++)
                          window.setTimeout(
                            () => audio.play('step', { surface: 'wood' }),
                            i * 450,
                          )
                      setRoom(r.id)
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-sm ${
                      r.id === room
                        ? 'bg-amber-700 text-white'
                        : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-amber-50'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </nav>

              <div
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                data-testid="home-room"
              >
                <h2 className="font-semibold text-slate-900">{current.name}</h2>
                <p className="text-sm text-slate-600">{current.description}</p>
                <ul className="mt-3 space-y-2">
                  {actions.map((action) => {
                    const blocked = canDo(profile, action)
                    return (
                      <li key={action.id}>
                        <button
                          type="button"
                          disabled={!!blocked}
                          onClick={() => doThing(action.id)}
                          title={blocked ?? undefined}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-55"
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
                  {room === 'bedroom' && phase === 'evening' && (
                    <li>
                      <button
                        type="button"
                        onClick={() => doThing('bed')}
                        className="flex w-full items-center justify-between rounded-lg bg-indigo-700 px-3 py-2 text-left text-sm font-medium text-white hover:bg-indigo-800"
                      >
                        Go to bed
                        <span className="text-xs font-normal text-indigo-100">
                          {sleepHours(life.minute).toFixed(1)} hours before the alarm
                        </span>
                      </button>
                    </li>
                  )}
                  {room !== 'bedroom' && phase === 'evening' && actions.length === 0 && (
                    <li className="text-sm text-slate-500">
                      Nothing to do here this evening.
                    </li>
                  )}
                  {room === 'door' && (
                    <li>
                      <button
                        type="button"
                        disabled={!!canGoOut(profile)}
                        onClick={() => doThing('go-out')}
                        className="flex w-full items-center justify-between gap-3 rounded-lg bg-emerald-700 px-3 py-2 text-left text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        Go out into the neighbourhood
                        <span className="text-xs font-normal text-emerald-100">
                          {canGoOut(profile) ?? 'Café, shop, gym, park'}
                        </span>
                      </button>
                    </li>
                  )}
                </ul>

                {room === 'door' &&
                  phase === 'evening' &&
                  plansTonight(profile).length > 0 && (
                    <ul
                      className="mt-3 space-y-2 border-t border-slate-100 pt-3"
                      data-testid="plans"
                    >
                      {plansTonight(profile).map(({ message, plan, friend }) => {
                        const blocked = canGo(profile, message.id)
                        return (
                          <li key={message.id}>
                            <button
                              type="button"
                              disabled={!!blocked}
                              onClick={() => onGoOut(message.id)}
                              className="flex w-full items-center justify-between gap-3 rounded-lg bg-amber-700 px-3 py-2 text-left text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                            >
                              <span>
                                Go: {plan.title.toLowerCase()} with{' '}
                                {friend.name.split(' ')[0]}
                                {blocked && (
                                  <span className="block text-xs font-normal text-amber-100">
                                    {blocked}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-xs font-normal text-amber-100">
                                {formatTime(plan.at)} ·{' '}
                                {Math.round(plan.minutes / 6) / 10} h
                                {plan.cost ? ` · ${formatMoney(plan.cost)}` : ''}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                {room === 'door' && phase === 'morning' && (
                  <div
                    className="mt-4 border-t border-slate-100 pt-3"
                    data-testid="commute"
                  >
                    <CommuteChoices profile={profile} onLeave={onLeave} />
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4" aria-label="How you are">
          <section
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            data-testid="phone-summary"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Phone</h2>
              {unreadCount(life) > 0 && (
                <span className="rounded-full bg-red-600 px-2 text-xs font-semibold text-white">
                  {unreadCount(life)} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Messages and calls with your friends.
            </p>
            <button
              type="button"
              onClick={() => setShop('phone')}
              className="mt-2 rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-amber-50"
            >
              Open your phone
            </button>
          </section>
          {(phase === 'evening' || phase === 'morning') && (
            <section
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              data-testid="laptop-summary"
            >
              <h2 className="font-semibold text-slate-900">Laptop</h2>
              <p className="text-xs text-slate-500">
                Jobs, pay, a side business, and WorkSim AI for your money, your day and
                what to learn.
              </p>
              <button
                type="button"
                onClick={() => setShop('career')}
                className="mt-2 rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-amber-50"
              >
                Open your laptop
              </button>
            </section>
          )}
          <section
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            data-testid="your-home"
          >
            <h2 className="font-semibold text-slate-900">Your home</h2>
            <p className="text-sm text-slate-700">{homeOf(life).name}</p>
            <p className="text-xs text-slate-500">
              Rent {formatMoney(getHome(life.home.id).rent)} a week
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShop('shop')}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-amber-50"
              >
                Furniture shop
              </button>
              <button
                type="button"
                onClick={() => setShop('move')}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-amber-50"
              >
                Move home
              </button>
            </div>
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
                data-testid="home-log"
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
