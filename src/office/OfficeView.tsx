/**
 * The office: the 3D floor plus everything on top of it (where you are, what
 * you can do here, conversations). All actions are also available as normal
 * buttons, so the office works with a keyboard, with screen readers, and on
 * computers that cannot show 3D (a simple floor plan is shown instead).
 */
import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import { getPerson } from '../content/company'
import {
  SPOTS,
  getSpot,
  interactionsAt,
  type InteractionId,
  type SpotId,
} from '../content/office'
import { unreadCount } from '../game/career'
import {
  COFFEE_DIALOGUE,
  dialogueFor,
  type Dialogue,
  type DialogueAction,
} from '../game/office'
import type { Profile } from '../persistence/schemas'
import { Avatar } from '../ui/Avatar'
import { supportsWebGL } from './webgl'

const OfficeScene = lazy(() => import('./scene/OfficeScene'))

interface OfficeViewProps {
  profile: Profile
  spot: SpotId
  onGo: (spot: SpotId) => void
  onUseComputer: (open?: DialogueAction['open']) => void
}

/** Falls back to the floor plan if the 3D view fails for any reason. */
class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('The 3D office could not be shown; using the floor plan instead.', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function OfficeView({ profile, spot, onGo, onUseComputer }: OfficeViewProps) {
  const [webgl] = useState(supportsWebGL)
  const [dialogue, setDialogue] = useState<Dialogue | null>(null)
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * 100))
  const current = getSpot(spot)
  const unread = unreadCount(profile)

  function go(next: SpotId) {
    setDialogue(null)
    onGo(next)
  }

  function interact(id: InteractionId) {
    const interaction = interactionsAt(spot).find((i) => i.id === id)
    // Using something in another area: walk there first.
    if (!interaction) {
      const target = SPOTS.find((s) => interactionsAt(s.id).some((i) => i.id === id))
      if (target) onGo(target.id)
    }
    if (id === 'computer') {
      onUseComputer()
      return
    }
    if (id === 'coffee') {
      setDialogue(COFFEE_DIALOGUE)
      return
    }
    if (id === 'colleague') setTipIndex((n) => n + 1)
    setDialogue(dialogueFor(id, profile, tipIndex))
  }

  const floorPlan = <FloorPlan spot={spot} onGo={go} />

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden" data-testid="office">
      <div className="absolute inset-0">
        {webgl ? (
          <SceneBoundary fallback={floorPlan}>
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-slate-100 text-slate-500">
                  Arriving at the office…
                </div>
              }
            >
              <OfficeScene
                spot={spot}
                computerAlert={unread > 0}
                playerName={profile.name}
                onGo={go}
                onInteract={interact}
              />
            </Suspense>
          </SceneBoundary>
        ) : (
          floorPlan
        )}
      </div>

      {/* Where you are and what you can do here */}
      <section
        className="absolute top-4 left-4 z-20 w-72 rounded-xl bg-white/90 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur"
        aria-label="This area"
        data-testid="office-panel"
      >
        <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
          You are at
        </p>
        <h1 className="text-lg font-semibold text-slate-900">{current.name}</h1>
        <p className="mt-1 text-sm text-slate-600">{current.description}</p>
        <ul className="mt-3 space-y-1.5">
          {interactionsAt(spot).map((interaction) => (
            <li key={interaction.id}>
              <button
                type="button"
                onClick={() => interact(interaction.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium ${
                  interaction.id === 'computer'
                    ? 'bg-blue-700 text-white hover:bg-blue-800'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {interaction.label}
                {interaction.id === 'computer' && unread > 0 && (
                  <span className="rounded-full bg-amber-400 px-2 text-xs text-slate-900">
                    {unread} new
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {webgl && (
          <p className="mt-3 text-xs text-slate-500">
            Tip: click the blue rings on the floor to walk around, or click people and
            objects.
          </p>
        )}
      </section>

      {/* Places */}
      <nav
        className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-xl bg-white/90 p-1.5 shadow-lg ring-1 ring-slate-200 backdrop-blur"
        aria-label="Places"
      >
        {SPOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            aria-current={s.id === spot ? 'location' : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              s.id === spot
                ? 'bg-blue-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {s.name}
          </button>
        ))}
      </nav>

      {dialogue && (
        <DialogueBox
          dialogue={dialogue}
          onAction={(action) => {
            setDialogue(null)
            onUseComputer(action.open)
          }}
          onClose={() => setDialogue(null)}
        />
      )}
    </div>
  )
}

function DialogueBox({
  dialogue,
  onAction,
  onClose,
}: {
  dialogue: Dialogue
  onAction: (action: DialogueAction) => void
  onClose: () => void
}) {
  const person = dialogue.speaker ? getPerson(dialogue.speaker) : null
  return (
    <section
      className="absolute right-4 bottom-20 z-20 w-[26rem] max-w-[calc(100%-2rem)] rounded-xl bg-white p-5 shadow-2xl ring-1 ring-slate-200"
      role="dialog"
      aria-label={dialogue.title}
      data-testid="office-dialogue"
    >
      <div className="flex items-center gap-3">
        {person && dialogue.speaker && <Avatar personId={dialogue.speaker} />}
        <div>
          <p className="font-semibold text-slate-900">{dialogue.title}</p>
          {person && <p className="text-xs text-slate-500">{person.role}</p>}
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
        {dialogue.speaker ? (
          dialogue.lines.map((line) => <p key={line}>“{line}”</p>)
        ) : (
          <ul className="space-y-1.5">
            {dialogue.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          {dialogue.speaker ? 'Thanks!' : 'Close'}
        </button>
        {dialogue.actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onAction(action)}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  )
}

/** A simple floor plan for computers without 3D graphics. */
function FloorPlan({ spot, onGo }: { spot: SpotId; onGo: (spot: SpotId) => void }) {
  const areas: Array<{ id: SpotId; className: string }> = [
    { id: 'breakroom', className: 'col-start-1 row-start-1 bg-amber-50' },
    { id: 'desk', className: 'col-start-2 row-span-2 bg-sky-50' },
    { id: 'manager', className: 'col-start-3 row-start-1 bg-teal-50' },
    { id: 'reception', className: 'col-start-1 row-start-2 bg-rose-50' },
  ]
  return (
    <div
      className="flex h-full items-center justify-center bg-slate-100 p-8"
      data-testid="floor-plan"
    >
      <div className="grid h-full max-h-[32rem] w-full max-w-4xl grid-cols-3 grid-rows-2 gap-3 rounded-2xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
        {areas.map((area) => {
          const s = getSpot(area.id)
          const here = area.id === spot
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => onGo(area.id)}
              className={`flex flex-col items-center justify-center rounded-xl p-4 text-center ring-2 ${area.className} ${
                here ? 'ring-blue-600' : 'ring-transparent hover:ring-slate-300'
              }`}
            >
              <span className="font-semibold text-slate-800">{s.name}</span>
              {here && <span className="mt-1 text-xs text-blue-700">You are here</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
