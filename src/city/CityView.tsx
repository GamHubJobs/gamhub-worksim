/**
 * Out in the neighbourhood: the street in 3D, where the player walks (arrow
 * keys or WASD, Shift to run) and goes in at the doors; the places listed for
 * going straight there; and what there is to do inside each. Everything also
 * works without 3D, from the list.
 */
import { GameScreen } from '../world/GameScreen'
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  useMemo,
} from 'react'
import { PLACES, PLACE_ACTIONS, getPlace, type PlaceId } from '../content/city'
import { formatMoney } from '../content/life'
import { formatTime, nextWorkday, weekdayName } from '../game/clock'
import { canEnter, minutesTo } from '../game/city'
import { canDo, lifePhase } from '../game/life'
import { unreadCount } from '../game/social'
import { CommuteChoices } from '../home/CommuteChoices'
import { MoneyPanel, NeedsPanel } from '../home/LifePanels'
import { BIKE, CAR } from '../content/transport'
import { canDeal, type TransportDeal } from '../game/transport'
import type { CommuteId } from '../content/life'
import { openPhone } from '../phone/store'
import { supportsWebGL } from '../office/webgl'
import { areaAt, standAt, type Area } from './streets'
import { timeOfDay, type Place } from '../audio/scenes'
import { AudioScene } from '../audio/useAudio'
import type { Doing } from './scene/interiors/kit'
import type { InteriorId } from './scene/InteriorScene'
import { WalkView } from '../world/WalkView'
import { isRaining, useWeatherSetting } from '../world/weather'
import { EncounterPanel } from '../world/npc/EncounterPanel'
import { DatePanel, type DateStep } from '../world/npc/DatePanel'
import { dateHere, finishDate, whoOf } from '../game/dates'
import { withLife } from '../game/lifeTime'
import { StoryScenePanel } from '../world/npc/StoryScenePanel'
import { campaignFor } from '../game/story/campaigns'
import { missionById, playScene, sceneFor, sceneLines } from '../game/story/engine'
import type { Scene } from '../game/story/types'
import { metAs, onTalkRequest, release } from '../world/npc/people'
import { holdEncounter, relationOf, type Situation, type Who } from '../game/encounters'
import type { ProfileData } from '../game/career'

/** What each place in the neighbourhood sounds like inside. */
const INSIDE: Record<PlaceId, Place> = {
  home: 'home',
  office: 'district',
  cafe: 'cafe',
  shop: 'shop',
  gym: 'gym',
  park: 'park',
  garage: 'garage',
}
import type { Profile } from '../persistence/schemas'

const CityScene = lazy(() => import('./scene/CityScene'))
const InteriorScene = lazy(() => import('./scene/InteriorScene'))

/** Places with a 3D interior (home has the flat; the office has its own view). */
const INTERIORS = new Set<PlaceId>(['cafe', 'shop', 'gym', 'park', 'garage'])
const DEALS = new Set<string>(['buy-bike', 'sell-bike', 'lease-car', 'end-lease'])

/** Shows nothing instead of the 3D street if it fails: the list still works. */
class SceneBoundary extends Component<
  { children: ReactNode; onFail?: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('The 3D neighbourhood could not be shown.', error)
    this.props.onFail?.()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function CityView({
  profile,
  onEnter,
  onOutside,
  onAction,
  onLeave,
  onDeal,
  onRide,
  onAct,
}: {
  profile: Profile
  /** Changes the career (for talking to people: trust, memory, time). */
  onAct: (change: (p: ProfileData) => ProfileData) => unknown
  onEnter: (id: PlaceId) => void
  onOutside: () => void
  onAction: (id: string) => void
  onLeave: (commute: CommuteId) => void
  onDeal: (deal: TransportDeal) => void
  onRide: (riding: boolean) => void
}) {
  const [webgl] = useState(supportsWebGL)
  const [notice, setNotice] = useState<string | null>(null)
  // Choosing how to get to work, at the end of the street.
  const [travel, setTravel] = useState(false)
  const life = profile.work.life
  const phase = lifePhase(profile) === 'morning' ? 'morning' : 'evening'
  const day = phase === 'morning' ? nextWorkday(profile.work.day) : profile.work.day
  const outside = !life.city.inside
  const here = getPlace(life.city.at)!
  const weather = useWeatherSetting()
  const raining = isRaining(day, weather)
  const dark = phase === 'evening' && life.minute >= 20 * 60

  const go = useCallback(
    (id: PlaceId) => {
      const blocked = canEnter(profile, id)
      setNotice(blocked)
      if (blocked) return
      if (id === 'office') setTravel(true)
      else onEnter(id)
    },
    [profile, onEnter],
  )
  // Inside a place with a 3D interior, things are done there by the character
  // (the game action when they finish); without 3D, straight away.
  const [interiorFailed, setInteriorFailed] = useState(false)
  // Which place's 3D view is ready to take activities (until then, the list acts at once).
  const [readyIn, setReadyIn] = useState<PlaceId | null>(null)
  const walkable =
    webgl && !interiorFailed && !outside && INTERIORS.has(here.id) && readyIn === here.id
  // What was asked for, in which place (a new place starts with nothing asked).
  const [request, setRequest] = useState<{
    id: string
    nonce: number
    place: PlaceId
  } | null>(null)
  const commit = useCallback(
    (id: string) => {
      if (DEALS.has(id)) onDeal(id as TransportDeal)
      else onAction(id)
    },
    [onAction, onDeal],
  )
  const doThing = useCallback(
    (id: string) => {
      if (walkable)
        setRequest((r) => ({ id, nonce: (r?.nonce ?? 0) + 1, place: life.city.at }))
      else commit(id)
    },
    [walkable, commit, life.city.at],
  )
  // A story scene, when the mission under way needs this person (see game/story/).
  const [storyScene, setStoryScene] = useState<{
    scene: Scene
    name: string
    mission: string
    lines: string[]
  } | null>(null)
  /** The story scene to play with someone now, if any. */
  function storySceneWith(id: string, name: string) {
    const scene = sceneFor(profile, id)
    if (!scene) return false
    const campaign = campaignFor(profile.careerId)!
    const story = profile.work.story!
    const mission = missionById(campaign, story.active)?.title ?? ''
    setStoryScene({ scene, name, mission, lines: sceneLines(profile, scene) })
    return true
  }
  // A date, if someone is waiting here for the player (see game/dates.ts).
  const date = dateHere(profile)
  // The date as it was when the player walked up (it is over in the save when it ends).
  const [dating, setDating] = useState<{
    step: DateStep
    date: NonNullable<typeof date>
  } | null>(null)
  const sitAction =
    dating?.date.bond.date?.place === 'park' ? 'park-bench' : 'cafe-dinner'
  // Talking to someone met here (anyone: staff, customers, people in the street).
  const [encounter, setEncounter] = useState<{ who: Who; situation: Situation } | null>(
    null,
  )
  const minute = life.minute
  const meetPerson = useCallback(
    (id: string) => {
      const n = metAs(id)
      if (!n) {
        release()
        return
      }
      if (storySceneWith(id, n.who.name)) return
      if (date && date.id === id) {
        setDating({ step: 'greet', date })
        return
      }
      setEncounter({
        who: n.who,
        situation: { availability: n.availability, doing: n.doing, minute },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minute, profile],
  )
  const onActivityDone = useCallback(
    (action: string | null, completed: boolean) => {
      if (completed && action?.startsWith('person:'))
        meetPerson(action.slice('person:'.length))
      else if (completed && action) {
        commit(action)
        // Sat down together: the date goes on.
        if (dating?.step === 'greet' && action === sitAction) {
          setDating({ ...dating, step: 'talk' })
          // And stay sitting together while they talk.
          doThing(sitAction === 'park-bench' ? 'date-bench' : 'date-sit')
        }
      }
    },
    [commit, meetPerson, dating, sitAction, doThing],
  )
  // Someone clicked on: walk over to them (inside a place, or in the street).
  const [streetRequest, setStreetRequest] = useState<{
    id: string
    nonce: number
  } | null>(null)
  useEffect(
    () =>
      onTalkRequest((id) => {
        if (outside)
          setStreetRequest((r) => ({ id: `person:${id}`, nonce: (r?.nonce ?? 0) + 1 }))
        else if (walkable) doThing(`person:${id}`)
      }),
    [outside, walkable, doThing],
  )
  // The conversation is over: they go back to what they were doing.
  useEffect(() => {
    if (!encounter && !storyScene) release()
  }, [encounter, storyScene])
  // Which part of the street the player is in, for the sounds around them.
  const [area, setArea] = useState<Area>(() => areaAt(standAt(life.city.at)[0]))
  const onArea = useCallback((next: Area) => setArea(next), [])

  const actions = PLACE_ACTIONS.filter(
    (a) => a.place === here.id && a.phases.includes(phase),
  )
  // Cog & Kerb's deals: the bike (to buy or sell back) and the car (to lease or hand back).
  const deals: Array<[TransportDeal, string, string]> =
    here.id === 'garage'
      ? [
          life.vehicles.bike
            ? [
                'sell-bike',
                `Sell your bike · ${formatMoney(Math.round(BIKE.price * BIKE.resale))}`,
                'Second-hand, back to the shop.',
              ]
            : [
                'buy-bike',
                `Buy a ${BIKE.name.toLowerCase()} · ${formatMoney(BIKE.price)}`,
                BIKE.description,
              ],
          life.vehicles.car
            ? ['end-lease', 'Hand the car back', 'The weekly lease stops.']
            : [
                'lease-car',
                `Lease a small car · ${formatMoney(CAR.deposit)} now, then ${formatMoney(CAR.weekly)} a week`,
                CAR.description,
              ],
        ]
      : []
  // What can be done here, for the hotspots in 3D (the same as the list).
  const doings: Doing[] = [
    ...actions.map((a) => ({
      id: a.id,
      label: a.label,
      detail: `${a.minutes} min${a.cost ? ` · ${formatMoney(a.cost)}` : ''}`,
      blocked: canDo(profile, a),
    })),
    ...deals.map(([id, label, about]) => ({
      id,
      label: label.split(' · ')[0],
      detail: label.includes(' · ') ? label.split(' · ')[1] : about,
      blocked: canDeal(profile, id),
    })),
  ]
  const doingsKey = JSON.stringify(doings)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDoings = useMemo(() => doings, [doingsKey])

  // The 3D world, full screen behind the drawer.
  const world =
    webgl && !interiorFailed && !outside && INTERIORS.has(here.id) ? (
      <WalkView
        key={here.id}
        helpClass="top-2 left-1/2 -translate-x-1/2"
        className="h-full rounded-none bg-stone-800 ring-0"
        testId="city-3d"
        attributes={{ 'data-interior': here.id }}
        label={`Inside ${here.name} in 3D. W, A, S and D walk, Shift runs, drag the mouse or press Q and R to look around, and E uses what you are next to. Everything here is also in the list below.`}
      >
        {(api) => (
          <SceneBoundary onFail={() => setInteriorFailed(true)}>
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-stone-300">
                  Going in…
                </div>
              }
            >
              <InteriorScene
                place={here.id as InteriorId}
                dark={dark}
                morning={phase === 'morning'}
                doings={stableDoings}
                controls={api.controls}
                request={request?.place === here.id ? request : null}
                onRequest={doThing}
                onPrompt={api.onPrompt}
                onProgress={api.onProgress}
                onDone={onActivityDone}
                onReady={() => setReadyIn(here.id)}
                dressed={phase === 'morning' && life.ready.dressed}
                raining={raining}
                date={dating?.date.id ?? date?.id ?? null}
              />
            </Suspense>
          </SceneBoundary>
        )}
      </WalkView>
    ) : webgl ? (
      <WalkView
        key="street"
        helpClass="top-2 left-1/2 -translate-x-1/2"
        className="h-full rounded-none bg-slate-300 ring-0"
        testId="city-3d"
        label="The street in 3D. W, A, S and D (or the arrow keys) walk, Shift runs, drag the mouse or press Q and R to look around, E goes in at a door, and F gets on or off your bike or in and out of your car."
      >
        {(api) => (
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
                controls={api.controls}
                onPrompt={api.onPrompt}
                onProgress={api.onProgress}
                onArea={onArea}
                onDoor={go}
                onEnter={go}
                blocked={(id) => canEnter(profile, id)}
                riding={life.city.riding}
                car={life.vehicles.car}
                bike={life.vehicles.bike}
                onRide={onRide}
                raining={raining}
                request={streetRequest}
                onPerson={meetPerson}
              />
            </Suspense>
          </SceneBoundary>
        )}
      </WalkView>
    ) : null

  return (
    <>
      <AudioScene
        scene={{
          place: outside ? area : INSIDE[life.city.at],
          time: timeOfDay(life.minute),
          rain: raining,
        }}
      />
      <GameScreen testId="city" label="The neighbourhood" world={world || null}>
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

          {storyScene && (
            <StoryScenePanel
              key={storyScene.scene.id}
              className="fixed right-4 bottom-4 z-40"
              scene={storyScene.scene}
              name={storyScene.name}
              mission={storyScene.mission}
              lines={storyScene.lines}
              onChoose={(choice) =>
                void onAct((p) => playScene(p, storyScene.scene.id, choice))
              }
              onClose={() => setStoryScene(null)}
            />
          )}
          {dating && (
            <DatePanel
              key={dating.date.id}
              who={whoOf(dating.date.id)!}
              adult={dating.date.adult}
              bond={dating.date.bond}
              step={dating.step}
              place={dating.date.bond.date!.place}
              day={profile.work.day}
              onSit={() => {
                setDating({ ...dating, step: 'greet' })
                doThing(sitAction)
              }}
              onFinish={(score, bond) => {
                const done = finishDate(
                  profile.work.life,
                  dating.date.id,
                  bond,
                  score,
                  profile.work.day,
                  dating.date.bond.date!.place,
                )
                void onAct((p) => {
                  const life = finishDate(
                    p.work.life,
                    dating.date.id,
                    bond,
                    score,
                    p.work.day,
                    dating.date.bond.date!.place,
                  ).life
                  // An evening out: time passes, and it is good company.
                  return withLife(p, {
                    ...life,
                    minute: life.minute + 60,
                    needs: {
                      ...life.needs,
                      social: Math.min(100, life.needs.social + 20),
                    },
                  })
                })
                return done.summary
              }}
              onClose={() => setDating(null)}
            />
          )}
          {encounter && (
            <EncounterPanel
              key={encounter.who.id}
              className="fixed right-4 bottom-4 z-40"
              who={encounter.who}
              situation={encounter.situation}
              relation={relationOf(profile, encounter.who.id)}
              onSay={(outcome) => {
                void onAct((p) => holdEncounter(p, [encounter.who.id], outcome, 'out'))
                // Ordering from the barista, say: the character goes and does it.
                if (outcome.action) {
                  const action = outcome.action
                  window.setTimeout(() => {
                    setEncounter(null)
                    doThing(action)
                  }, 900)
                }
              }}
              onClose={() => setEncounter(null)}
            />
          )}

          <p
            role="status"
            className="min-h-5 text-sm text-amber-800"
            data-testid="city-notice"
          >
            {notice}
          </p>

          {outside && travel ? (
            <div
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              data-testid="commute"
            >
              <CommuteChoices profile={profile} onLeave={onLeave} title="Go to work" />
              <button
                type="button"
                onClick={() => setTravel(false)}
                className="mt-3 rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Not yet
              </button>
            </div>
          ) : outside ? (
            <div
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              data-testid="places"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">Places</h2>
                {life.vehicles.bike && (
                  <button
                    type="button"
                    aria-pressed={life.city.riding}
                    onClick={() => onRide(!life.city.riding)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-emerald-50 aria-pressed:border-emerald-600 aria-pressed:bg-emerald-50"
                  >
                    {life.city.riding ? 'On your bike: get off' : 'Get on your bike'}
                  </button>
                )}
              </div>
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
                          {place.id === 'office' ? 'Go to work' : place.name}
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
                              ? `On foot, by bike, bus, car or taxi · ${minutes} min walk`
                              : minutes
                                ? `${minutes} min ${life.city.riding ? 'by bike' : 'walk'}`
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
                        onClick={() => doThing(action.id)}
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
                {deals.map(([which, label, about]) => {
                  const blocked = canDeal(profile, which)
                  return (
                    <li key={which}>
                      <button
                        type="button"
                        disabled={!!blocked}
                        onClick={() => doThing(which)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span className="block font-medium text-slate-900">{label}</span>
                        <span className="block text-xs text-slate-600">
                          {blocked ?? about}
                        </span>
                      </button>
                    </li>
                  )
                })}
                {actions.length === 0 && here.id !== 'garage' && (
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
              onClick={() => openPhone('messages')}
              className="mt-2 rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-emerald-50"
            >
              Open your phone
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
      </GameScreen>
    </>
  )
}
