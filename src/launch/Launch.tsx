/**
 * The game's opening, over everything while the game starts underneath:
 *
 * 1. The logo, out of the dark (with its sound, if sound may play yet).
 * 2. Loading: the real steps (the save opened, the game loaded, the place the
 *    player is in drawn), each ticked as it happens; never a made-up figure.
 * 3. A flight over the real city, down to the player's own building, once
 *    their place is ready behind it (so no empty world is ever shown).
 * 4. The opening fades, and the player is where they left off.
 *
 * The first time: the whole opening; after that, a short one (or the whole, or
 * none, as chosen in Sound & graphics). Skip at any moment (button, Esc, Enter
 * or Space): straight to the game once it is ready. No flight on Low graphics,
 * in software 3D, without WebGL, or with reduced motion. While it covers the
 * world, the world does not redraw for nothing (transition/ready.ts).
 */
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ReactNode,
} from 'react'
import { audio } from '../audio/manager'
import type { Profile } from '../persistence/schemas'
import { arrival } from './arrival'
import { prefersReducedMotion } from '../ui/motion'
import { setWorldCovered, useGameLoaded, useWorldReady } from '../world/transition/ready'
import { Emblem, Particles, Wordmark } from './Logo'
import {
  markOpeningSeen,
  openingDisabledForTests,
  openingFor,
  openingPrefs,
  setOpeningMode,
} from './prefs'
import { canFly, forcedFlight } from './canFly'

const CityFlyover = lazy(() =>
  import('../city/scene/CityScene').then((m) => ({ default: m.CityFlyover })),
)

type Status = 'loading' | 'new' | 'ready' | 'error'

/** How long the logo is shown at least (it plays while things load anyway). */
const LOGO_MS = { full: 2600, short: 1200, none: 0 } as const
/** The fade into the game. */
const REVEAL_MS = 700
/** The longest the whole opening waits for the game (then it steps aside). */
const MOST_MS = 30_000

export function Launch({ status, profile }: { status: Status; profile: Profile | null }) {
  const [plan] = useState(() => {
    if (openingDisabledForTests()) return 'off' as const
    const kind = openingFor(openingPrefs(), status === 'new')
    return kind
  })
  const [logoDone, setLogoDone] = useState(plan === 'none')
  const [skipped, setSkipped] = useState(false)
  const [flyDrawn, setFlyDrawn] = useState(false)
  const [never, setNever] = useState(false)
  const gameLoaded = useGameLoaded()
  const worldReady = useWorldReady()
  const saveOpen = status !== 'loading'
  // (A page without a 3D place, e.g. no WebGL: ready once the game is on the page.)
  const [flat, setFlat] = useState(false)
  const ready =
    status === 'error' ||
    (saveOpen && (status === 'new' || gameLoaded) && (worldReady || flat))
  const fly = useMemo(() => plan !== 'off' && plan !== 'none' && canFly(), [plan])
  const where = arrival(profile)
  // The stage: worked out from what has happened (the logo shown, the game
  // ready, skipped), until the flight ends or the fade into the game begins.
  const [end, setEnd] = useState<null | 'reveal' | 'done'>(plan === 'off' ? 'done' : null)
  const stage: 'logo' | 'wait' | 'fly' | 'reveal' | 'done' =
    end ??
    (!logoDone && !skipped
      ? 'logo'
      : !ready
        ? 'wait'
        : fly && !skipped
          ? 'fly'
          : 'reveal')
  const covering = stage !== 'done'

  // While the opening covers the world, it is not redrawn for nothing.
  useEffect(() => {
    if (!covering) return
    setWorldCovered(true)
    return () => setWorldCovered(false)
  }, [covering])

  // 1. The logo, with its sound.
  useEffect(() => {
    if (plan === 'off' || plan === 'none') return
    audio.play('launch')
    const t = window.setTimeout(() => setLogoDone(true), LOGO_MS[plan])
    return () => window.clearTimeout(t)
  }, [plan])

  // A game without a 3D place on show is ready once it is on the page.
  useEffect(() => {
    if (!gameLoaded || worldReady) return
    const t = window.setInterval(() => {
      if (!document.querySelector('[role="application"]')) setFlat(true)
    }, 1500)
    return () => window.clearInterval(t)
  }, [gameLoaded, worldReady])

  // Never stuck: after a long wait for the game, the opening steps aside
  // whatever happens. (Not counted once flying: the flight has its own limits.)
  const waiting = stage === 'logo' || stage === 'wait'
  useEffect(() => {
    if (!waiting) return
    const t = window.setTimeout(
      () => setEnd((e) => e ?? 'reveal'),
      forcedFlight() ? 120_000 : MOST_MS,
    )
    return () => window.clearTimeout(t)
  }, [waiting])
  // The flight not drawn in a few seconds, or running long: into the game.
  useEffect(() => {
    if (stage !== 'fly') return
    const t = window.setTimeout(
      () => setEnd((e) => e ?? 'reveal'),
      flyDrawn
        ? (plan === 'full' ? 10 : 3.5) * 1000 + 5000
        : forcedFlight()
          ? 90_000
          : 8000,
    )
    return () => window.clearTimeout(t)
  }, [stage, flyDrawn, plan])

  // 4. The fade into the game.
  useEffect(() => {
    if (stage !== 'reveal') return
    markOpeningSeen()
    if (never) setOpeningMode('off')
    const t = window.setTimeout(
      () => setEnd('done'),
      prefersReducedMotion() ? 0 : REVEAL_MS,
    )
    return () => window.clearTimeout(t)
  }, [stage, never])

  // Skip with the keyboard too.
  const skipRef = useRef(() => setSkipped(true))
  useEffect(() => {
    if (!covering) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        skipRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [covering])

  if (stage === 'done') return null

  const steps: Array<{ label: string; done: boolean }> = [
    {
      label: status === 'new' ? 'Getting your first day ready' : 'Opening your save',
      done: saveOpen,
    },
    ...(status === 'new'
      ? []
      : [
          { label: 'Loading the game', done: gameLoaded || status === 'error' },
          { label: `Building ${where.name}`, done: ready },
        ]),
  ]
  const doneCount = steps.filter((s) => s.done).length
  const flying = stage === 'fly'

  return (
    <div
      className={`fixed inset-0 z-[3000] overflow-hidden text-white transition-opacity ease-out ${
        stage === 'reveal' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${REVEAL_MS}ms` }}
      role="dialog"
      aria-label="GamHub WorkSim is opening"
      data-testid="launch"
      data-stage={stage}
      data-plan={plan}
      data-flight={flyDrawn || undefined}
      data-leaving={stage === 'reveal' || undefined}
    >
      {/* The flight over the city, under everything else. */}
      {fly && !skipped && (flying || stage === 'reveal') && (
        <FlightBoundary onFail={() => setSkipped(true)}>
          <Suspense fallback={null}>
            <div
              className={`absolute inset-0 transition-opacity duration-700 ${flying && flyDrawn ? 'opacity-100' : 'opacity-0'}`}
            >
              {
                <CityFlyover
                  to={where.door}
                  full={plan === 'full'}
                  evening={!!profile?.work.dayOver}
                  onDrawn={() => setFlyDrawn(true)}
                  onDone={() => setEnd('reveal')}
                />
              }
            </div>
          </Suspense>
        </FlightBoundary>
      )}

      {/* The logo and loading, over the dark sky (fading as the flight comes in). */}
      <div
        className={`launch-sky absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700 ${
          flying && flyDrawn ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          aria-hidden
          className="launch-glow pointer-events-none absolute h-[60vmin] w-[60vmin] rounded-full bg-sky-500/20 blur-3xl"
        />
        <Particles />
        {plan !== 'none' && (
          <div className="relative flex flex-col items-center gap-6">
            <Emblem />
            <Wordmark />
          </div>
        )}
        {(stage === 'wait' ||
          plan === 'none' ||
          (!logoDone && doneCount < steps.length)) && (
          <div className="relative mt-10 w-72" data-testid="launch-loading">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-label="Getting the game ready"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneCount}
              aria-valuetext={`Step ${Math.min(doneCount + 1, steps.length)} of ${steps.length}`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-teal-300 transition-[width] duration-500 ease-out"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
            <ul
              className="mt-3 space-y-1 text-xs text-sky-100/85"
              aria-label="What is getting ready"
            >
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2" data-done={s.done}>
                  <span
                    aria-hidden
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${
                      s.done ? 'bg-teal-300 text-slate-900' : 'border border-white/40'
                    }`}
                  >
                    {s.done ? '✓' : ''}
                  </span>
                  {s.label}
                  {s.done ? <span className="sr-only"> (done)</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* In flight: where to, and the letterbox of a film. */}
      {flying && flyDrawn && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[7vh] bg-black/80"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[7vh] bg-black/80"
          />
          <p className="motion-fade absolute bottom-[10vh] left-8 text-lg font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            {profile ? `Welcome back, ${profile.name}` : 'Welcome to the city'}
            <span className="block text-sm font-normal text-white/85">
              {profile
                ? `Heading to ${where.name}`
                : 'Your first day starts at the office'}
            </span>
          </p>
        </>
      )}

      {/* Skip, at any moment, and the choice for next time. */}
      {stage !== 'reveal' && (
        <div className="absolute right-6 bottom-6 flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-white/80">
            <input
              type="checkbox"
              checked={never}
              onChange={(e) => setNever(e.target.checked)}
            />
            Skip the opening next time
          </label>
          <button
            type="button"
            onClick={() => skipRef.current()}
            className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
            data-testid="launch-skip"
          >
            Skip ›
          </button>
        </div>
      )}
    </div>
  )
}

/** The flight failing (WebGL lost, a missing file): straight into the game instead. */
class FlightBoundary extends Component<
  { onFail: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
