/**
 * The office: the 3D floor plus everything on top of it (where you are, what
 * you can do here, conversations). All actions are also available as normal
 * buttons, so the office works with a keyboard, with screen readers, and on
 * computers that cannot show 3D (a simple floor plan is shown instead).
 *
 * Office actions take office time (a coffee is 10 minutes); the rules live in
 * `src/game` and are applied through `onAct`.
 */
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getPerson } from '../content/company'
import {
  SPOTS,
  getSpot,
  interactionsAt,
  type Interaction,
  type InteractionId,
  type SpotId,
} from '../content/office'
import { LUNCH } from '../content/workday'
import { unreadCount, type ProfileData } from '../game/career'
import { formatTime } from '../game/clock'
import {
  conversationWith,
  haveLunchBreak,
  holdConversation,
  lunchCompany,
  type ColleagueId,
} from '../game/conversations'
import { meetingScene } from '../game/meetings'
import { holdReview, reviewFor, reviewScene } from '../game/reviews'
import {
  COFFEE_DIALOGUE,
  dialogueFor,
  type Dialogue,
  type DialogueAction,
} from '../game/office'
import { eventScene, pendingEvents } from '../game/events'
import { applyEffects, describeEffects, recordScene, type Choice } from '../game/scenes'
import {
  attendMeeting,
  endDay,
  isLeavingEarly,
  lunchAvailability,
  nextMeeting,
  openMeeting,
  takeCoffeeBreak,
  walk,
} from '../game/workday'
import type { Profile } from '../persistence/schemas'
import { Avatar } from '../ui/Avatar'
import { supportsWebGL } from './webgl'

const OfficeScene = lazy(() => import('./scene/OfficeScene'))

type Act = (change: (profile: ProfileData) => ProfileData) => Promise<unknown>

interface OfficeViewProps {
  profile: Profile
  spot: SpotId
  /** A workplace event to open on arrival (from a reminder at the computer). */
  openEvent?: string
  onGo: (spot: SpotId) => void
  onUseComputer: (open?: DialogueAction['open']) => void
  onAct: Act
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

/** Who the player talks to through each office interaction. */
const PEOPLE_AT: Partial<Record<InteractionId, ColleagueId>> = {
  receptionist: 'reception',
  manager: 'manager',
  colleague: 'facilities',
  senior: 'senior',
}

const LEAVE_EARLY_DIALOGUE: Dialogue = {
  id: 'leave-early',
  speaker: null,
  title: 'Leave early?',
  lines: [
    'It is before 5 pm and you still have work open. Leaving now will be noticed.',
    'If you are unwell or exhausted, going home is the right call. Otherwise, it is better to finish the day.',
  ],
  actions: [],
  choices: [
    {
      id: 'stay',
      label: 'Stay and finish the day',
      reply: ['You head back to your desk.'],
      effects: {},
    },
  ],
}

export function OfficeView({
  profile,
  spot,
  openEvent,
  onGo,
  onUseComputer,
  onAct,
}: OfficeViewProps) {
  const [webgl] = useState(supportsWebGL)
  const [dialogue, setDialogue] = useState<Dialogue | null>(() =>
    openEvent && profile.work.events.pending.some((p) => p.id === openEvent)
      ? eventScene(profile, openEvent)
      : null,
  )
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * 100))
  const current = getSpot(spot)
  const unread = unreadCount(profile)
  const { work } = profile
  const meetingNow = openMeeting(work)
  const upcoming = nextMeeting(work)

  function go(next: SpotId) {
    setDialogue(null)
    if (next !== spot) void onAct(walk)
    onGo(next)
  }

  function interact(id: InteractionId) {
    const interaction = interactionsAt(spot).find((i) => i.id === id)
    // Using something in another area: walk there first.
    if (!interaction) {
      const target = SPOTS.find((s) => interactionsAt(s.id).some((i) => i.id === id))
      if (target) {
        void onAct(walk)
        onGo(target.id)
      }
    }
    switch (id) {
      case 'computer':
        onUseComputer()
        return
      case 'coffee':
        void onAct(takeCoffeeBreak)
        setDialogue(COFFEE_DIALOGUE)
        return
      case 'lunch':
        haveLunchNow()
        return
      case 'home':
        if (isLeavingEarly(profile)) setDialogue(LEAVE_EARLY_DIALOGUE)
        else void onAct(endDay)
        return
      case 'whiteboard':
      case 'noticeboard':
        setDialogue(dialogueFor(id, profile))
        return
    }
    const person = PEOPLE_AT[id]
    if (!person) return
    if (person === 'facilities') setTipIndex((n) => n + 1)
    const conversation = conversationWith(profile, person, tipIndex)
    void onAct((p) => holdConversation(p, person, conversation))
    setDialogue(conversation.dialogue)
  }

  function haveLunchNow() {
    const availability = lunchAvailability(work)
    if (availability === 'available') {
      const company = lunchCompany(profile)
      void onAct(haveLunchBreak)
      setDialogue({
        speaker: null,
        title: 'Lunch break',
        lines: company
          ? [
              `You grab your lunch and join ${company} at the big table. 🥪`,
              'Tom tells the story of the great printer flood of last spring. Nina tells you which meeting room never has working Wi-Fi. You laugh more than you have all week.',
            ]
          : [
              'You grab your lunch from the fridge and sit by the window for a proper break. 🥪',
              'Away from the screen, your head clears. You feel ready for the afternoon.',
            ],
        actions: [],
      })
      return
    }
    setDialogue({
      speaker: null,
      title: 'Lunch',
      lines: [
        availability === 'taken'
          ? 'You have already had lunch today.'
          : availability === 'too-early'
            ? `It is a bit early for lunch. The team usually eats between ${formatTime(LUNCH.from)} and ${formatTime(LUNCH.until)}.`
            : 'Lunchtime is over. Grab a coffee if you need a break.',
      ],
      actions: [],
    })
  }

  function joinMeeting(meetingId: string) {
    if (meetingId === 'one-to-one') {
      // Friday's one-to-one is the weekly performance review.
      void onAct((p) => holdReview(attendMeeting(p, meetingId), true))
      setDialogue(reviewScene(profile, reviewFor(profile)))
      return
    }
    void onAct((p) => attendMeeting(p, meetingId))
    const scene = meetingScene(profile, meetingId)
    if (scene) setDialogue(scene)
  }

  function choose(scene: Dialogue, choice: Choice) {
    if (scene.id === 'leave-early') {
      // The only choice offered is to stay; leaving is the other button.
      setDialogue(null)
      return
    }
    void onAct((p) => {
      const recorded = scene.id ? recordScene(p, scene.id, choice.id) : p
      return applyEffects(recorded, choice.effects)
    })
    setDialogue({
      speaker: scene.speaker,
      title: scene.title,
      lines: choice.reply,
      actions: [],
      notes: describeEffects(choice.effects),
      lesson: choice.lesson,
    })
  }

  // Stable handlers for the 3D scene, so it does not redraw on every change.
  const handlers = useRef({ go, interact })
  useEffect(() => {
    handlers.current = { go, interact }
  })
  const sceneGo = useCallback((next: SpotId) => handlers.current.go(next), [])
  const sceneInteract = useCallback(
    (id: InteractionId) => handlers.current.interact(id),
    [],
  )

  const floorPlan = <FloorPlan spot={spot} onGo={go} />
  const meetingHere = meetingNow && meetingNow.spot === spot

  return (
    <div className="relative isolate min-h-0 flex-1 overflow-hidden" data-testid="office">
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
                onGo={sceneGo}
                onInteract={sceneInteract}
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

        {meetingNow && (
          <div
            className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900"
            data-testid="meeting-now"
          >
            <p>
              <strong>{meetingNow.title}</strong>{' '}
              {work.minute < meetingNow.start
                ? `starts at ${formatTime(meetingNow.start)}`
                : 'has started'}{' '}
              ({getSpot(meetingNow.spot).name.toLowerCase()}).
            </p>
            <button
              type="button"
              onClick={() =>
                meetingHere ? joinMeeting(meetingNow.id) : go(meetingNow.spot)
              }
              className="mt-1.5 w-full rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
            >
              {meetingHere
                ? `Join the ${meetingNow.title.toLowerCase()}`
                : `Go to ${getSpot(meetingNow.spot).name}`}
            </button>
          </div>
        )}
        {pendingEvents(profile).map((event) => {
          const person = getPerson(event.person)
          return (
            <div
              key={event.id}
              className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 p-2 text-sm text-blue-900"
              data-testid="event-waiting"
            >
              <Avatar personId={event.person} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{person.name.split(' ')[0]} wants a word</p>
                <p className="truncate text-xs">“{event.opener}”</p>
              </div>
              <button
                type="button"
                onClick={() => setDialogue(eventScene(profile, event.id))}
                className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
              >
                Talk
              </button>
            </div>
          )
        })}
        {!meetingNow && upcoming && (
          <p className="mt-2 text-xs text-slate-500">
            Next: {upcoming.title} at {formatTime(upcoming.start)} (
            {getSpot(upcoming.spot).name})
          </p>
        )}

        <ul className="mt-3 space-y-1.5">
          {interactionsAt(spot).map((interaction) => (
            <li key={interaction.id}>
              <InteractionButton
                interaction={interaction}
                unread={unread}
                lunchOpen={lunchAvailability(work) === 'available'}
                onClick={() => interact(interaction.id)}
              />
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
          onChoose={(choice) => choose(dialogue, choice)}
          onClose={() => {
            if (dialogue.id === 'leave-early') void onAct(endDay)
            setDialogue(null)
          }}
          closeLabel={dialogue.id === 'leave-early' ? 'Go home anyway' : undefined}
        />
      )}
    </div>
  )
}

function InteractionButton({
  interaction,
  unread,
  lunchOpen,
  onClick,
}: {
  interaction: Interaction
  unread: number
  lunchOpen: boolean
  onClick: () => void
}) {
  const primary =
    interaction.id === 'computer' || (interaction.id === 'lunch' && lunchOpen)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${
        primary
          ? 'bg-blue-700 text-white hover:bg-blue-800'
          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
      }`}
    >
      <span>{interaction.label}</span>
      {interaction.id === 'computer' && unread > 0 && (
        <span className="rounded-full bg-amber-400 px-2 text-xs text-slate-900">
          {unread} new
        </span>
      )}
      {interaction.minutes && (
        <span
          className={`text-xs font-normal ${primary ? 'text-blue-100' : 'text-slate-500'}`}
          aria-label={`takes ${interaction.minutes} minutes`}
        >
          {interaction.minutes} min
        </span>
      )}
    </button>
  )
}

function DialogueBox({
  dialogue,
  onAction,
  onChoose,
  onClose,
  closeLabel,
}: {
  dialogue: Dialogue
  onAction: (action: DialogueAction) => void
  onChoose: (choice: Choice) => void
  onClose: () => void
  closeLabel?: string
}) {
  const person = dialogue.speaker ? getPerson(dialogue.speaker) : null
  const choices = dialogue.choices ?? []
  return (
    <section
      className="absolute right-4 bottom-20 z-20 max-h-[calc(100%-7rem)] w-[28rem] max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-5 shadow-2xl ring-1 ring-slate-200"
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
          dialogue.lines.map((line) => <SpokenLine key={line} line={line} />)
        ) : (
          <ul className="space-y-1.5">
            {dialogue.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
      {dialogue.notes && dialogue.notes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="What changed">
          {dialogue.notes.map((note) => (
            <li
              key={note.text}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                note.tone === 'good'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {note.text}
            </li>
          ))}
        </ul>
      )}
      {dialogue.lesson && (
        <p className="mt-3 rounded-md bg-blue-50 p-2.5 text-sm text-blue-900">
          <strong>Workplace tip:</strong> {dialogue.lesson}
        </p>
      )}
      {choices.length > 0 && (
        <div className="mt-4 space-y-1.5" role="group" aria-label="Your response">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice)}
              className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-800 hover:border-blue-300 hover:bg-blue-50"
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
      {(choices.length === 0 || closeLabel || dialogue.actions.length > 0) && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            {closeLabel ?? (dialogue.speaker ? 'Thanks!' : 'Close')}
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
      )}
    </section>
  )
}

/**
 * A line in a conversation: the speaker's words are quoted; "Name: “…”"
 * lines are someone else speaking; "*…*" lines describe what happens.
 */
function SpokenLine({ line }: { line: string }) {
  if (line.startsWith('*') && line.endsWith('*')) {
    return <p className="text-slate-500 italic">{line.slice(1, -1)}</p>
  }
  if (/^[A-Z][a-z]+: “/.test(line)) return <p>{line}</p>
  return <p>“{line}”</p>
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
