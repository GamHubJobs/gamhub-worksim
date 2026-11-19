/**
 * The office: the 3D floor plus everything on top of it (where you are, what
 * you can do here, conversations). All actions are also available as normal
 * buttons, so the office works with a keyboard, with screen readers, and on
 * computers that cannot show 3D (a simple floor plan is shown instead).
 *
 * Office actions take office time (a coffee is 10 minutes); the rules live in
 * `src/game` and are applied through `onAct`.
 */
import { boardFor } from './scene/workBoard'
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { audio } from '../audio/manager'
import { AudioScene } from '../audio/useAudio'
import { useSpokenLines } from '../audio/useSpeech'
import { timeOfDay } from '../audio/scenes'
import { WalkView } from '../world/WalkView'
import type { Prompt } from '../world/PlayerRig'
import { EncounterPanel } from '../world/npc/EncounterPanel'
import { StoryScenePanel } from '../world/npc/StoryScenePanel'
import { campaignFor } from '../game/story/campaigns'
import {
  keyMoment,
  missionById,
  playScene,
  sceneFor,
  sceneLines,
} from '../game/story/engine'
import type { Scene } from '../game/story/types'
import { metAs, onTalkRequest, release } from '../world/npc/people'
import {
  holdEncounter,
  relationOf,
  troubleDoing,
  type Situation,
  type Who,
} from '../game/encounters'
import { troubleOf } from '../game/incidents'
import { isInteraction, meetingOf } from './scene/officeLayout'
import { fill, getPerson, placeText } from '../content/departments'
import { activeBay, activeTheme, opensFor } from './scene/bays'
import { ScenarioPanel, type LiveState } from './ScenarioPanel'
import { CourtPanel, type CourtVisit } from '../court/CourtPanel'
import { SitePanel } from '../apps/projects/SitePanel'
import { dueInspection } from '../apps/projects/helpers'
import {
  activeProject,
  builtDesign,
  currentStage,
  decideIssue,
  handOver,
  inspectionItems,
  judgeItem,
  projectOf,
  signInspection,
  siteBlock,
} from '../engineering/engine'
import type { InspectionId } from '../engineering/inspections'
import {
  backFromSite,
  canGoToSite,
  goToSite,
  measureOnSite,
  travelTo,
  watchWork,
} from '../engineering/visit'
import { getBrief as getProjectBrief } from '../engineering/briefs'
import { loadVisit, saveVisit } from '../court/visitStore'
import { deviceFor, type Device } from './device'
import { backFromCourt, canGoToCourt, COURT_TRAVEL, goToCourt } from '../game/court'
import { getScenario, scenariosFor } from '../content/scenarios'
import { workplaceKind } from '../content/departments'
import { levelNumber } from '../game/cases'
import {
  advance as advanceScenario,
  applyScenario,
  beatOf,
  choose as chooseScenario,
  present as presentScenario,
  scenarioRecord,
  speak as speakScenario,
  startRun,
} from '../game/scenarios'
import {
  SPOTS,
  getSpot,
  interactionsAt,
  type Interaction,
  type InteractionId,
  type SpotId,
} from '../content/office'
import { getMeeting, LUNCH } from '../content/workday'
import { isPassed, unreadCount, type ProfileData } from '../game/career'
import { getAssignment } from '../content/assignments'
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
import {
  canJoinCelebration,
  celebrationOn,
  joinCelebration,
  joinedCelebration,
} from '../game/celebration'
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
import { deskLayout } from '../game/desk'
import type { FieldJob } from '../persistence/schemas'
import { OnSiteWork, type OnSitePlace, type OnSiteSync } from './OnSiteWork'
import { HudLayout, HudSlot } from '../ui/hud/Hud'
import { useHud } from '../ui/hud/hudContext'

const OfficeScene = lazy(() => import('./scene/OfficeScene'))
const CourthouseScene = lazy(() => import('../court/CourthouseScene'))
const ConstructionSiteScene = lazy(
  () => import('../engineering/scene/ConstructionSiteScene'),
)

const PANEL_KEY = 'worksim.hud.place'
const readPanel = () => {
  try {
    return window.localStorage.getItem(PANEL_KEY) !== 'collapsed'
  } catch {
    return true
  }
}

/** Where an IT job is done in person. */
function placeOf(job: FieldJob): OnSitePlace {
  if (job.kind === 'cabinet') return 'cabinet'
  if (job.kind === 'repair' || job.kind === 'build') return 'bench'
  return `desk:${job.target.slice('person:'.length)}`
}

type Act = (change: (profile: ProfileData) => ProfileData) => Promise<unknown>

interface OfficeViewProps {
  profile: Profile
  spot: SpotId
  /** A workplace event to open on arrival (from a reminder at the computer). */
  openEvent?: string
  onGo: (spot: SpotId) => void
  onUseComputer: (open?: DialogueAction['open']) => void
  /**
   * A tool used where it is (the bedside, counsel's table): opened over the
   * room, not on the computer. Without it, on the computer.
   */
  onUseHere?: (
    open: NonNullable<DialogueAction['open']>,
    where: string,
    device: Device,
  ) => void
  /** A tool is open where it is (the camera stays close on the thing). */
  usingHere?: boolean
  onAct: Act
  /** Keeps the office's IT jobs and held-up colleagues in step after hands-on work. */
  sync?: OnSiteSync
}

/** Falls back to the floor plan if the 3D view fails for any reason. */
class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onFail?: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('The 3D office could not be shown; using the floor plan instead.', error)
    this.props.onFail?.()
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
  onUseHere,
  usingHere = false,
  onAct,
  sync,
}: OfficeViewProps) {
  // The location panel: open, or just the place's name (remembered on this device).
  const [panelOpen, setPanelOpen] = useState(readPanel)
  const togglePanel = () =>
    setPanelOpen((o) => {
      try {
        window.localStorage.setItem(PANEL_KEY, o ? 'collapsed' : 'open')
      } catch {
        // Storage blocked: the choice lasts until the page closes.
      }
      return !o
    })
  // Hands-on IT work open in person (the cabinet, the bench, a colleague's desk).
  const [onsite, setOnsite] = useState<OnSitePlace | null>(null)
  const fieldJobs = profile.work.fieldJobs
  const itJobs = JSON.stringify(
    fieldJobs.map((j) => ({
      target: j.target,
      kind: j.kind,
      name: j.target.startsWith('person:') ? getPerson(j.target.slice(7)).name : '',
    })),
  )
  /** The ticket queue the work at a place belongs to: its job's, or the task in hand. */
  function queueFor(place: OnSitePlace): { document: string; assignment: string } | null {
    const job = fieldJobs.find((j) => placeOf(j) === place)
    if (job) return { document: job.document, assignment: job.assignment }
    const current = Object.values(profile.assignments)
      .filter((p) => {
        const a = getAssignment(p.assignmentId)
        return a?.kind === 'tickets' && !isPassed(a, p)
      })
      .sort((a, b) => b.startedAt - a.startedAt)[0]
    return current
      ? { document: current.documentId, assignment: current.assignmentId }
      : null
  }
  function openOnSite(place: OnSitePlace) {
    if (!queueFor(place)) {
      setDialogue({
        speaker: null,
        title: place === 'cabinet' ? 'The comms cabinet' : 'The IT workbench',
        lines: [
          'Everything here is working, and there is no IT task in hand that needs it.',
        ],
        actions: [],
      })
      return
    }
    setOnsite(place)
  }
  const [webgl] = useState(supportsWebGL)
  const [dialogue, setDialogue] = useState<Dialogue | null>(() =>
    openEvent && profile.work.events.pending.some((p) => p.id === openEvent)
      ? eventScene(profile, openEvent)
      : null,
  )
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * 100))
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
  // Talking to someone met in the office (anyone but the conversations below).
  const [encounter, setEncounter] = useState<{
    who: Who
    situation: Situation
    with?: Who
  } | null>(null)
  const talking = !!dialogue
  useEffect(() => {
    if (talking) audio.play('greet')
  }, [talking])
  const current = getSpot(spot)
  const unread = unreadCount(profile)
  // The team board on the wall, from the save (it changes as tasks are handed in).
  const board = JSON.stringify(boardFor(profile))
  const { work } = profile
  // On a construction site in person (src/engineering/visit.ts): its own scene and panel.
  const siteId = work.engineering?.onSite ?? null
  const siteProject = siteId ? projectOf(profile, siteId) : null
  const siteDesign = siteProject ? builtDesign(siteProject) : null
  const siteStage = siteProject ? currentStage(siteProject) : null
  const siteInspection = siteProject ? dueInspection(siteProject) : null
  const siteMeasureKey =
    siteProject &&
    siteInspection &&
    siteProject.inspections[siteInspection]?.status === 'due'
      ? inspectionItems(siteProject, siteInspection)
          .filter(
            (i) => !siteProject.inspections[siteInspection]!.measured.includes(i.id),
          )
          .map((i) => i.id)
          .join(',')
      : ''
  const siteMeasure = useMemo(
    () =>
      siteProject && siteInspection && siteMeasureKey
        ? inspectionItems(siteProject, siteInspection)
            .filter((i) => siteMeasureKey.split(',').includes(i.id))
            .map((item) => ({ inspection: siteInspection, item }))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siteId, siteInspection, siteMeasureKey],
  )
  const siteIssue =
    !!siteProject && Object.values(siteProject.issues).some((s) => s.status === 'open')
  const [siteArea, setSiteArea] = useState<string | null>(null)
  const [siteOverview, setSiteOverview] = useState(false)
  const onSiteArea = useCallback((a: string) => setSiteArea(a), [])
  const constructing = activeProject(profile)
  const siteWhy = constructing ? canGoToSite(profile, constructing.id) : null
  const meetingNow = openMeeting(work)
  const upcoming = nextMeeting(work)

  // With 3D, the player walks the office and does things in person (the result
  // when they finish); until the view is ready, or without 3D, at once.
  const [ready, setReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  const walkable = webgl && !sceneFailed && ready
  const bay = activeBay()
  const [request, setRequest] = useState<{ id: string; nonce: number } | null>(null)
  // The thing a tool was last opened at (the camera stays close on it while open).
  const [focusAction, setFocusAction] = useState<string | null>(null)
  const ask = (id: string) => setRequest((r) => ({ id, nonce: (r?.nonce ?? 0) + 1 }))

  /** Uses something: walks there and does it, or at once without 3D. */
  function doInteract(id: InteractionId) {
    if (walkable) ask(id)
    else interact(id)
  }

  /** Walked into another area of the office: it takes office time, as before. */
  function arrive(next: SpotId) {
    if (next === spot) return
    setDialogue(null)
    void onAct(walk)
    onGo(next)
  }

  function go(next: SpotId) {
    if (walkable) {
      if (next !== spot) ask(`go:${next}`)
      return
    }
    setDialogue(null)
    if (next !== spot) {
      for (let i = 0; i < 4; i++)
        window.setTimeout(() => audio.play('step', { surface: 'carpet' }), i * 480)
      if (next === 'manager' || spot === 'manager')
        window.setTimeout(() => audio.play('door'), 1900)
    }
    if (next !== spot) void onAct(walk)
    onGo(next)
  }

  /** In the workplace's own corner (the ward's bay, the workshop, the courtroom): its tool, there. */
  function bedside(action: string | null = 'bay') {
    const bayNow = activeBay()
    const opens = opensFor(action, bayNow)
    if (!opens) return
    if (onUseHere) {
      setFocusAction(action)
      onUseHere(
        opens,
        room ?? bayNow?.room ?? fill(placeText(current).name),
        deviceFor(activeTheme()),
      )
    } else onUseComputer(opens)
  }

  /** Arrived at equipment and used it (E): close in on it. */
  function arriveOnSite(action: string) {
    openOnSite(action.slice('onsite:'.length) as OnSitePlace)
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
      case 'arrange':
        onUseComputer({ app: 'career', item: 'desk' })
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
    talkWith(person)
  }

  /** A conversation with one of the four colleagues the player works with most. */
  function talkWith(person: ColleagueId) {
    if (storySceneWith(person, getPerson(person).name)) return
    // Come over with something to ask: that, face to face.
    const waiting = pendingEvents(profile).find((e) => e.person === person)
    if (waiting) {
      setDialogue(eventScene(profile, waiting.id))
      return
    }
    if (person === 'facilities') setTipIndex((n) => n + 1)
    const conversation = conversationWith(profile, person, tipIndex)
    void onAct((p) => holdConversation(p, person, conversation))
    setDialogue(conversation.dialogue)
  }

  /**
   * Walked up to someone (see world/npc/people.ts): the four colleagues have
   * their own conversations when free; everyone else, and anyone busy, the
   * conversation that fits who they are and what they are doing.
   */
  function meetPerson(id: string) {
    const n = metAs(id)
    if (!n) {
      release()
      return
    }
    // The story first: the person the mission under way is about.
    if (storySceneWith(id, n.who.name)) {
      setDialogue(null)
      return
    }
    const named = Object.values(PEOPLE_AT).includes(id as ColleagueId)
    const busy = ['meeting', 'chatting', 'leaving'].includes(n.availability)
    setDialogue(null)
    if (named && !busy) {
      talkWith(id as ColleagueId)
      return
    }
    const other = n.with ? metAs(n.with)?.who : undefined
    // Held up by a fault on one of the player's tickets, or back to work.
    const trouble = troubleOf(profile.work.disruptions, id, (assignmentId) => {
      const assignment = getAssignment(assignmentId)
      return !!assignment && !isPassed(assignment, profile.assignments[assignmentId])
    })
    setEncounter({
      who: n.who,
      with: other,
      situation: {
        availability: n.availability,
        doing: (trouble && troubleDoing(trouble)) ?? n.doing,
        with: other,
        minute: work.minute,
        ...(trouble ? { trouble } : {}),
      },
    })
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
  /** A meeting can be attended while it is on (see workday.ts), and not otherwise. */
  function blocked(action: string | null): string | null {
    if (siteProject) return null
    if (away) return courtBlocked(action)
    if (action === 'celebration') return canJoinCelebration(profile)
    const id = meetingOf(action)
    if (!id || openMeeting(work)?.id === id) return null
    const m = getMeeting(id)
    return m ? fill(`The ${m.title.toLowerCase()} is not on now`) : 'Not now'
  }

  /** Something done on site: measured, watched, left (in person, or from the panel). */
  function site(action: string) {
    if (!siteProject) return
    if (action === 'site:leave') void onAct(backFromSite)
    else if (action === 'site:watch') void onAct((p) => watchWork(p, 30))
    else if (action.startsWith('site:measure:')) {
      const [, , inspection, item] = action.split(':')
      void onAct((p) => measureOnSite(p, inspection, item))
    }
  }

  /** Had cake with the team (in person, or from the panel without 3D). */
  function celebrate() {
    void onAct(joinCelebration)
  }

  const handlers = useRef({
    celebrate,
    go,
    doInteract,
    interact,
    arrive,
    meetPerson,
    joinMeeting,
    blocked,
    arriveOnSite,
    bedside,
    startLive,
    court,
    site,
  })
  useEffect(() => {
    handlers.current = {
      celebrate,
      startLive,
      go,
      doInteract,
      interact,
      arrive,
      meetPerson,
      joinMeeting,
      blocked,
      arriveOnSite,
      bedside,
      court,
      site,
    }
  })
  const sceneGo = useCallback((next: SpotId) => handlers.current.go(next), [])
  const sceneInteract = useCallback(
    (id: InteractionId) => handlers.current.doInteract(id),
    [],
  )
  const onArea = useCallback((next: SpotId) => handlers.current.arrive(next), [])
  // The room within the area, e.g. the treatment room off the nurses' station.
  const [room, setRoom] = useState<string | null>(null)
  const onRoom = useCallback((next: string | null) => setRoom(next), [])

  // Live scenarios: professional events played in person here (content/scenarios).
  const [live, setLive] = useState<LiveState | null>(null)
  const liveOn = useRef(false)
  liveOn.current = !!live
  // The "Press E" prompts, held back while a scenario is played. The same function
  // every time, so the 3D place (which skips redrawing when nothing it is given
  // changes) is not redrawn whole every time something here changes.
  const quietPrompt = useMemo(() => {
    let show: ((prompt: Prompt | null) => void) | null = null
    let quiet: (prompt: Prompt | null) => void = () => {}
    return (next: (prompt: Prompt | null) => void) => {
      if (next !== show) {
        show = next
        quiet = (prompt) => next(liveOn.current ? null : prompt)
      }
      return quiet
    }
  }, [])
  const liveScenario = live ? getScenario(live.id) : undefined
  const offered = scenariosFor(profile.careerId).filter(
    (sc) => sc.workplace === workplaceKind() && levelNumber(profile) >= sc.minLevel,
  )
  // Hearings at Westmark County Court (court/): the player goes there from the office.
  const here = offered.filter((sc) => !sc.venue)
  const atCourt = offered.filter((sc) => sc.venue === 'court')
  const courtDay = {
    name: profile.name,
    careerId: profile.careerId,
    day: profile.work.day,
    dayOver: profile.work.dayOver,
  }
  // At court when the page was reloaded: still there (the save has the journey).
  const [away, setAway] = useState<CourtVisit | null>(() =>
    atCourt.length > 0 ? loadVisit(courtDay) : null,
  )
  const { name: courtName, careerId: courtCareer, day: courtDayNo } = courtDay
  useEffect(() => {
    saveVisit(
      { name: courtName, careerId: courtCareer, day: courtDayNo, dayOver: false },
      away,
    )
  }, [away, courtName, courtCareer, courtDayNo])
  const [courtRoom, setCourtRoom] = useState<string | null>(null)
  const onCourtRoom = useCallback((r: string) => setCourtRoom(r), [])
  // The office guide's next step (and the office's map) is about the office:
  // it steps aside at court and on a construction site.
  const awayAt = away ? 'court' : siteProject ? 'site' : null
  useEffect(() => {
    if (!awayAt) return
    document.body.dataset.away = awayAt
    return () => {
      delete document.body.dataset.away
    }
  }, [awayAt])
  function goCourt() {
    const sc = atCourt[0]
    if (!sc || canGoToCourt(profile)) return
    setReady(false)
    setDialogue(null)
    void onAct((p) => goToCourt(p, sc))
    setAway({ security: false, signedIn: false, note: null })
  }
  function courtBlocked(action: string | null): string | null {
    if (!away) return null
    if (live && action !== null) return 'Not during the hearing'
    if (action === 'court:usher' && !away.security) return 'Go through security first'
    if (action?.startsWith('scenario:') && !away.signedIn)
      return 'Sign in with the usher first'
    return null
  }
  /** Something done at court (in person, or from the panel without 3D). */
  function court(action: string) {
    if (!away) return
    if (action === 'court:security') setAway({ ...away, security: true, note: null })
    else if (action === 'court:usher')
      setAway({
        ...away,
        signedIn: true,
        note: 'The usher ticks you off the list: “Court 2, through the double doors. The judge will be in shortly: take your place at the claimant’s table.”',
      })
    else if (action === 'court:list')
      setAway({
        ...away,
        note: 'Court 2 · District Judge Hartley · 10:30 · Shah v Corner Lettings Ltd (small claim, about an hour).',
      })
    else if (action === 'court:leave' && !live) {
      setReady(false)
      setCourtRoom(null)
      void onAct(backFromCourt)
      setAway(null)
    }
  }
  function startLive(id: string) {
    const sc = getScenario(id)
    if (sc) setLive({ id, run: startRun(sc), reply: [], step: 0 })
  }
  function liveContinue() {
    if (!live || !liveScenario) return
    if (live.step < live.reply.length) {
      setLive({ ...live, step: live.step + 1 })
      return
    }
    setLive({ ...live, run: advanceScenario(liveScenario, live.run) })
  }
  const answer = (made: { run: LiveState['run']; reply: LiveState['reply'] }) =>
    live && setLive({ ...live, run: made.run, reply: made.reply, step: 0 })
  // Who is speaking now, and how (for the people in the room).
  const liveBeat = live && liveScenario ? beatOf(liveScenario, live.run) : null
  const liveLine =
    live && live.step < live.reply.length
      ? live.reply[live.step]
      : liveBeat && liveBeat.kind === 'say'
        ? liveBeat
        : null
  const liveSpeaker =
    liveLine && liveLine.who !== 'narrator'
      ? liveLine.who
      : liveBeat && 'who' in liveBeat && liveBeat.kind !== 'say'
        ? (liveBeat.who ?? null)
        : null
  const onReady = useCallback(() => setReady(true), [])
  const sceneBlocked = useCallback(
    (action: string | null) => handlers.current.blocked(action),
    [],
  )
  const onActivityDone = useCallback((action: string | null, completed: boolean) => {
    // Sat or stood through the meeting: now it counts (walking away part way does not).
    const meeting = meetingOf(action)
    if (meeting) {
      if (completed) handlers.current.joinMeeting(meeting)
    } else if (completed && action === 'celebration') handlers.current.celebrate()
    else if (completed && action?.startsWith('court:')) handlers.current.court(action)
    else if (completed && action?.startsWith('site:')) handlers.current.site(action)
    else if (completed && action?.startsWith('scenario:'))
      handlers.current.startLive(action.slice('scenario:'.length))
    else if (completed && opensFor(action, activeBay())) handlers.current.bedside(action)
    else if (completed && action?.startsWith('onsite:'))
      handlers.current.arriveOnSite(action)
    else if (completed && action?.startsWith('person:'))
      handlers.current.meetPerson(action.slice('person:'.length))
    else if (completed && action && isInteraction(action))
      handlers.current.interact(action)
  }, [])
  // A click on someone: walk over to talk to them.
  useEffect(() => onTalkRequest((id) => ask(`person:${id}`)), [])
  // Development builds: walk to and do an activity by its ID, as a click on
  // its ringed object does (used by the environment screenshot tour); and the
  // best or worst answer to the scenario beat on screen (for browser tests).
  const liveNow = useRef<LiveState | null>(null)
  liveNow.current = live
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const answerFor = (best: boolean) => {
      const state = liveNow.current
      const sc = state && getScenario(state.id)
      if (!state || !sc || state.step < state.reply.length) return null
      const beat = beatOf(sc, state.run)
      if (beat.kind === 'choose') {
        const sorted = [...beat.options].sort((x, y) => y.score - x.score)
        return { kind: 'choose', label: (best ? sorted[0] : sorted.at(-1)!).label }
      }
      if (beat.kind === 'exhibit') {
        const id = best ? beat.correct : beat.items.find((i) => i !== beat.correct)!
        return { kind: 'exhibit', label: sc.exhibits!.find((e) => e.id === id)!.title }
      }
      if (beat.kind === 'speak')
        return { kind: 'speak', label: best ? beat.model : 'I agree with that.' }
      return { kind: beat.kind, label: '' }
    }
    Object.assign(window, {
      __worksimWalk: (id: string) => ask(id),
      __worksimScenarioAnswer: answerFor,
    })
    return () => {
      delete (window as { __worksimWalk?: unknown }).__worksimWalk
      delete (window as { __worksimScenarioAnswer?: unknown }).__worksimScenarioAnswer
    }
  }, [])
  // The conversation is over: whoever it was goes back to their day.
  // Whoever has something to ask comes over to the player's desk and waits there.
  const calling = pendingEvents(profile)[0]
  // Asked to the manager's office for a promotion: the letter is on the desk there.
  const letter = calling?.at === 'their-office'
  // Where they wait: at the player's desk (with anyone they bring), or at the printer.
  const callerKey =
    calling && calling.at !== 'their-office'
      ? `${calling.person}|${calling.at}|${calling.with ?? ''}`
      : ''
  const callers = useMemo(() => {
    if (!callerKey) return undefined
    const [person, at, brought] = callerKey.split('|')
    return {
      [person]: at === 'printer' ? 'call:printer' : 'call:player',
      ...(brought ? { [brought]: 'call:player2' } : {}),
    }
  }, [callerKey])
  // The team's Friday cake in the break room, while it is on and not yet had.
  const cakeNow = celebrationOn(work) && !joinedCelebration(work)
  const conversing = !!dialogue || !!encounter || !!storyScene || !!live
  // In a conversation, non-essential HUD steps aside (ui/hud/Hud.tsx).
  const hudMode = useHud()?.setMode
  useEffect(() => {
    hudMode?.(conversing ? 'dialogue' : 'explore')
    return () => hudMode?.('explore')
  }, [conversing, hudMode])
  useEffect(() => {
    if (!conversing) release()
  }, [conversing])

  const floorPlan = <FloorPlan spot={spot} onGo={go} />
  const meetingHere = meetingNow && meetingNow.spot === spot

  return (
    <div
      className="relative isolate min-h-0 flex-1 overflow-hidden"
      data-testid="office"
      // Its panel and buttons over the 3D view: the walking keys still walk there (walkKeys.ts).
      data-walk-keys
    >
      <div className="absolute inset-0">
        {webgl && !sceneFailed ? (
          <WalkView
            className="h-full rounded-none ring-0"
            testId="office-3d"
            promptClass="bottom-20"
            helpClass="top-3 left-80"
            label="The office in 3D. W, A, S and D walk, Shift runs, drag the mouse or press Q and R to look around, and E uses what you are next to or talks to whoever is there. The panel and the Places bar do the same."
          >
            {(api) => (
              <SceneBoundary fallback={floorPlan} onFail={() => setSceneFailed(true)}>
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center bg-slate-100 text-slate-500">
                      {siteProject
                        ? 'Arriving on site…'
                        : away
                          ? 'Arriving at Westmark County Court…'
                          : 'Arriving at the office…'}
                    </div>
                  }
                >
                  {siteProject && siteDesign && siteProject.site ? (
                    <ConstructionSiteScene
                      project={siteProject.id}
                      design={siteDesign}
                      stages={siteProject.site.stages}
                      cursor={siteProject.site.cursor}
                      fraction={siteStage?.fraction ?? 0}
                      blocked={!!siteBlock(siteProject)}
                      measure={siteMeasure}
                      issue={siteIssue}
                      controls={api.controls}
                      request={request}
                      onPrompt={api.onPrompt}
                      onProgress={api.onProgress}
                      onDone={onActivityDone}
                      onReady={onReady}
                      blockedAction={sceneBlocked}
                      onArea={onSiteArea}
                      overview={siteOverview}
                    />
                  ) : away ? (
                    <CourthouseScene
                      controls={api.controls}
                      request={request}
                      onPrompt={quietPrompt(api.onPrompt)}
                      onProgress={api.onProgress}
                      onDone={onActivityDone}
                      onReady={onReady}
                      blocked={sceneBlocked}
                      onRoom={onCourtRoom}
                      scenarios={atCourt.map((sc) => sc.id).join(',')}
                      liveScenario={live?.id ?? null}
                      liveBeat={live?.run.at}
                      liveSpeaker={liveSpeaker}
                      liveGesture={
                        liveLine && 'gesture' in liveLine ? liveLine.gesture : undefined
                      }
                    />
                  ) : (
                    <OfficeScene
                      day={work.day}
                      minute={work.minute}
                      walk={{
                        controls: api.controls,
                        request,
                        // No "Press E" prompts while a scenario is being played.
                        onPrompt: quietPrompt(api.onPrompt),
                        onProgress: api.onProgress,
                        onDone: onActivityDone,
                        onReady,
                        onArea,
                        onRoom,
                        blocked: sceneBlocked,
                      }}
                      spot={spot}
                      computerAlert={unread > 0}
                      board={board}
                      playerName={profile.name}
                      desk={Object.values(deskLayout(profile))
                        .map((item) => item!.id)
                        .join(',')}
                      onGo={sceneGo}
                      onInteract={sceneInteract}
                      talkingTo={dialogue?.speaker ?? null}
                      callers={callers}
                      letter={letter}
                      itJobs={itJobs}
                      scenarios={here.map((sc) => sc.id).join(',')}
                      focus={usingHere ? focusAction : null}
                      liveScenario={live?.id ?? null}
                      liveBeat={live?.run.at}
                      liveSpeaker={liveSpeaker}
                      liveGesture={
                        liveLine && 'gesture' in liveLine ? liveLine.gesture : undefined
                      }
                    />
                  )}
                </Suspense>
              </SceneBoundary>
            )}
          </WalkView>
        ) : (
          floorPlan
        )}
      </div>

      {/* The HUD's zones over the world (ui/hud/Hud.tsx): nothing overlaps. */}
      <HudLayout />

      {/* Where you are and what you can do here */}
      {/* At court: the hall and courtroom's own sound (no music while a court sits). */}
      {away && (
        <AudioScene scene={{ place: 'courthouse', time: timeOfDay(work.minute) }} />
      )}
      {away && (
        <HudSlot zone="top-left" hideWhen={live ? 'dialogue' : undefined}>
          <CourtPanel
            visit={away}
            room={courtRoom}
            hearings={atCourt}
            records={Object.fromEntries(
              atCourt.map((sc) => [sc.id, scenarioRecord(profile, sc.id)?.best ?? null]),
            )}
            live={!!live}
            blocked={courtBlocked}
            onDo={(action) =>
              walkable
                ? ask(action.startsWith('court:') ? action.replace(':', '-') : action)
                : action.startsWith('scenario:')
                  ? startLive(action.slice('scenario:'.length))
                  : court(action)
            }
          />
        </HudSlot>
      )}
      {siteProject && (
        <AudioScene scene={{ place: 'site', time: timeOfDay(work.minute) }} />
      )}
      {siteProject && (
        <HudSlot zone="top-left">
          <SitePanel
            project={siteProject}
            area={siteArea}
            onDecide={(issue, choice) =>
              void onAct((p) => decideIssue(p, siteProject.id, issue, choice))
            }
            onMeasure={(inspection, item) =>
              walkable
                ? ask('site-measure-' + inspection + '-' + item)
                : void onAct((p) => measureOnSite(p, inspection, item))
            }
            onJudge={(inspection, item, v) =>
              void onAct((p) => judgeItem(p, siteProject.id, inspection, item, v))
            }
            onSign={(inspection) =>
              void onAct((p) =>
                signInspection(p, siteProject.id, inspection as InspectionId),
              )
            }
            onWatch={() =>
              walkable ? ask('site-watch') : void onAct((p) => watchWork(p, 30))
            }
            onHandOver={() => void onAct((p) => handOver(p, siteProject.id))}
            onLeave={() => {
              setSiteOverview(false)
              if (walkable) ask('site-leave')
              else void onAct(backFromSite)
            }}
            overview={siteOverview}
            onOverview={setSiteOverview}
          />
        </HudSlot>
      )}
      {!away && !siteProject && (
        <HudSlot zone="top-left" hideWhen={live ? 'dialogue' : undefined}>
          <section
            className="onsite-hide max-h-full w-full overflow-y-auto rounded-xl bg-white/90 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur"
            aria-label="This area"
            data-testid="office-panel"
            data-collapsed={panelOpen ? 'false' : 'true'}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                You are at
              </p>
              <button
                type="button"
                onClick={togglePanel}
                aria-expanded={panelOpen}
                aria-label={panelOpen ? 'Collapse this panel' : 'Expand this panel'}
                className="-mt-1 -mr-1 rounded px-1.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                {panelOpen ? '▴' : '▾'}
              </button>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">
              {fill(placeText(current).name)}
            </h1>
            {room && (
              <p className="text-sm font-medium text-slate-700" data-testid="room-here">
                Now in: {room}
              </p>
            )}
            {panelOpen && (
              <p className="mt-1 text-sm text-slate-600">
                {fill(placeText(current).description)}
              </p>
            )}
            <div hidden={!panelOpen}>
              {meetingNow && (
                <div
                  className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900"
                  data-testid="meeting-now"
                >
                  <p>
                    <strong>{fill(meetingNow.title)}</strong>{' '}
                    {work.minute < meetingNow.start
                      ? `starts at ${formatTime(meetingNow.start)}`
                      : 'has started'}{' '}
                    ({fill(getSpot(meetingNow.spot).name.toLowerCase())}).
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      // In 3D, the player walks to the meeting and attends it in person.
                      walkable
                        ? ask(`meeting:${meetingNow.id}`)
                        : meetingHere
                          ? joinMeeting(meetingNow.id)
                          : go(meetingNow.spot)
                    }
                    className="mt-1.5 w-full rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    {meetingHere || walkable
                      ? fill(`Join the ${meetingNow.title.toLowerCase()}`)
                      : fill(`Go to ${getSpot(meetingNow.spot).name}`)}
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
                      <p className="font-medium">
                        {person.name.split(' ')[0]}{' '}
                        {event.at === 'their-office'
                          ? 'would like to see you in the manager’s office'
                          : event.at === 'printer'
                            ? 'is at the printer'
                            : walkable
                              ? 'has come over to your desk'
                              : 'wants a word'}
                      </p>
                      <p className="truncate text-xs">“{event.opener}”</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        // In 3D, the player goes to the manager's office (or the
                        // printer) for it.
                        walkable && event.at === 'their-office'
                          ? ask('manager')
                          : walkable && event.at === 'printer'
                            ? ask(`person:${event.person}`)
                            : setDialogue(eventScene(profile, event.id))
                      }
                      className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
                    >
                      {walkable && event.at !== 'desk' ? 'Go' : 'Talk'}
                    </button>
                  </div>
                )
              })}
              {cakeNow && (
                <div
                  className="mt-3 rounded-md bg-pink-50 p-2 text-sm text-pink-900"
                  data-testid="celebration"
                >
                  <p className="font-medium">Friday cake in the break room</p>
                  <p className="text-xs">The team is celebrating the week’s work.</p>
                  <button
                    type="button"
                    onClick={() =>
                      walkable ? ask('celebration') : void onAct(joinCelebration)
                    }
                    className="mt-1.5 w-full rounded-md bg-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-700"
                  >
                    Join the team for cake
                  </button>
                </div>
              )}
              {!meetingNow && upcoming && (
                <p className="mt-2 text-xs text-slate-500">
                  Next: {fill(upcoming.title)} at {formatTime(upcoming.start)} (
                  {fill(placeText(getSpot(upcoming.spot)).name)})
                </p>
              )}

              {bay && (
                <div
                  className={`mt-3 rounded-md p-2 ${bay.tone.box}`}
                  data-testid={`${bay.kind}-bay`}
                >
                  <p className={`text-xs font-semibold ${bay.tone.title}`}>{bay.title}</p>
                  <button
                    type="button"
                    onClick={() => (walkable ? ask(bay.goTo) : bedside())}
                    className={`mt-1 text-left text-sm underline ${bay.tone.button}`}
                  >
                    {bay.button}
                  </button>
                </div>
              )}

              {constructing?.status === 'construction' && (
                <div className="mt-3 rounded-md bg-amber-50 p-2" data-testid="site-visit">
                  <p className="text-xs font-semibold text-amber-900">On site</p>
                  <p className="text-sm font-medium text-slate-900">
                    {getProjectBrief(constructing.id)?.title}
                  </p>
                  <p className="text-[11px] text-slate-700">
                    {siteBlock(constructing) ?? 'The crew is working.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void onAct((p) => goToSite(p, constructing.id))}
                    disabled={!!siteWhy}
                    className="mt-1 rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                    data-testid="office-go-to-site"
                  >
                    Go to the site ({travelTo(constructing.id)} min)
                  </button>
                  {siteWhy && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{siteWhy}</p>
                  )}
                </div>
              )}

              {atCourt.length > 0 && (
                <div
                  className="mt-3 rounded-md bg-slate-100 p-2"
                  data-testid="court-hearings"
                >
                  <p className="text-xs font-semibold text-slate-900">At court</p>
                  {atCourt.map((sc) => {
                    const done = scenarioRecord(profile, sc.id)
                    const why = canGoToCourt(profile)
                    return (
                      <div key={sc.id} className="mt-1">
                        <p className="text-sm font-medium text-slate-900">{sc.title}</p>
                        <p className="text-[11px] text-slate-700">
                          {sc.summary}
                          {done ? ` Best so far: ${done.best}%.` : ''}
                        </p>
                        <button
                          type="button"
                          onClick={goCourt}
                          disabled={!!why}
                          className="mt-1 rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          Go to Westmark County Court ({COURT_TRAVEL} min)
                        </button>
                        {why && (
                          <p className="mt-0.5 text-[11px] text-slate-500">{why}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {here.length > 0 && (
                <div
                  className="mt-3 rounded-md bg-indigo-50 p-2"
                  data-testid="live-scenarios"
                >
                  <p className="text-xs font-semibold text-indigo-900">Live work here</p>
                  {here.map((sc) => {
                    const done = scenarioRecord(profile, sc.id)
                    return (
                      <div key={sc.id} className="mt-1">
                        <button
                          type="button"
                          onClick={() =>
                            walkable ? ask(`scenario:${sc.id}`) : startLive(sc.id)
                          }
                          className="text-left text-sm font-medium text-indigo-800 underline"
                        >
                          {sc.title}
                        </button>
                        <p className="text-[11px] text-indigo-900/80">
                          {sc.summary}
                          {done ? ` Best so far: ${done.best}%.` : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {fieldJobs.length > 0 && (
                <div className="mt-3 rounded-md bg-amber-50 p-2" data-testid="it-jobs">
                  <p className="text-xs font-semibold tracking-wide text-amber-900 uppercase">
                    IT jobs in the office
                  </p>
                  <ul className="mt-1 space-y-1">
                    {fieldJobs.map((job) => {
                      const place = placeOf(job)
                      return (
                        <li
                          key={`${job.kind}-${job.subject}-${job.target}`}
                          className="flex items-center gap-2 text-sm text-amber-950"
                        >
                          <span className="min-w-0 flex-1">{job.label}</span>
                          <button
                            type="button"
                            className="shrink-0 rounded bg-amber-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-amber-600"
                            onClick={() =>
                              walkable ? ask(`onsite:${place}`) : openOnSite(place)
                            }
                            aria-label={`Go: ${job.label}`}
                          >
                            Go
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              <ul className="mt-3 space-y-1.5">
                {interactionsAt(spot).map((interaction) => (
                  <li key={interaction.id}>
                    <InteractionButton
                      interaction={interaction}
                      unread={unread}
                      lunchOpen={lunchAvailability(work) === 'available'}
                      onClick={() => doInteract(interaction.id)}
                    />
                  </li>
                ))}
              </ul>
              {webgl && (
                <p className="mt-3 text-xs text-slate-500">
                  Tip: walk with W, A, S and D (or click the blue rings on the floor), and
                  press E next to people and things, or click them.
                </p>
              )}
            </div>
          </section>
        </HudSlot>
      )}

      {/* Places */}
      {!away && !siteProject && (
        <HudSlot zone="bottom-center" order={2}>
          <nav
            className="onsite-hide flex max-w-full flex-wrap justify-center gap-1 rounded-xl bg-white/90 p-1.5 shadow-lg ring-1 ring-slate-200 backdrop-blur"
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
                {fill(placeText(s).name)}
              </button>
            ))}
          </nav>
        </HudSlot>
      )}

      {onsite &&
        (() => {
          const q = queueFor(onsite)
          return q ? (
            <OnSiteWork
              place={onsite}
              documentId={q.document}
              assignmentId={q.assignment}
              personName={
                onsite.startsWith('desk:') ? getPerson(onsite.slice(5)).name : ''
              }
              work={{ day: work.day, minute: work.minute }}
              sync={sync}
              onClose={() => setOnsite(null)}
            />
          ) : null
        })()}
      {storyScene && (
        <HudSlot zone="right">
          <StoryScenePanel
            className="max-h-full w-[28rem] max-w-full overflow-y-auto"
            key={storyScene.scene.id}
            scene={storyScene.scene}
            moment={keyMoment(campaignFor(profile.careerId)!, storyScene.scene.id)}
            name={storyScene.name}
            mission={storyScene.mission}
            lines={storyScene.lines}
            onChoose={(choice) =>
              void onAct((p) => playScene(p, storyScene.scene.id, choice))
            }
            onClose={() => setStoryScene(null)}
          />
        </HudSlot>
      )}
      {encounter && (
        <HudSlot zone="right">
          <EncounterPanel
            className="max-h-full w-[28rem] max-w-full overflow-y-auto"
            key={encounter.who.id}
            who={encounter.who}
            situation={encounter.situation}
            relation={relationOf(profile, encounter.who.id)}
            onSay={(outcome, option) =>
              void onAct((p) =>
                holdEncounter(
                  p,
                  option === 'join' && encounter.with
                    ? [encounter.who.id, encounter.with.id]
                    : [encounter.who.id],
                  outcome,
                  'office',
                ),
              )
            }
            onClose={() => setEncounter(null)}
          />
        </HudSlot>
      )}
      {live && liveScenario && (
        <HudSlot zone="right">
          <ScenarioPanel
            className="max-h-full w-[28rem] max-w-full overflow-y-auto"
            scenario={liveScenario}
            live={live}
            name={profile.name.split(' ')[0]}
            firstTime={!scenarioRecord(profile, live.id)}
            onContinue={liveContinue}
            onChoose={(id) => answer(chooseScenario(liveScenario, live.run, id))}
            onPresent={(id) => answer(presentScenario(liveScenario, live.run, id))}
            onSpeak={(text) => answer(speakScenario(liveScenario, live.run, text))}
            onFinish={() => {
              const run = live.run
              setLive(null)
              void onAct((p) => applyScenario(p, liveScenario, run))
            }}
            onLeave={() => setLive(null)}
          />
        </HudSlot>
      )}
      {dialogue && (
        <HudSlot zone="right">
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
        </HudSlot>
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
      <span>{fill(interaction.label)}</span>
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
  // Read aloud, if chosen in the sound settings, in this person's own voice.
  useSpokenLines(
    dialogue.speaker ? dialogue.lines : null,
    dialogue.speaker ? { id: dialogue.speaker } : null,
  )
  const box = useRef<HTMLElement>(null)
  // Keyboard and screen-reader users are taken into the conversation, and back
  // to where they were when it closes.
  useEffect(() => {
    const before = document.activeElement
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus()
    }
  }, [])
  useEffect(() => {
    box.current?.focus()
  }, [dialogue])
  return (
    <section
      ref={box}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      className="max-h-full w-[28rem] max-w-full overflow-y-auto rounded-xl bg-white p-5 shadow-lg ring-1 ring-slate-200 outline-none"
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
              <span className="font-semibold text-slate-800">
                {fill(placeText(s).name)}
              </span>
              {here && <span className="mt-1 text-xs text-blue-700">You are here</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
