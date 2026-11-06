/**
 * The player's working day: the 3D office, and the work computer at their
 * desk. The computer is a desktop in the style of Windows 10: wallpaper and
 * shortcut icons, a taskbar with Start, and each app in its own window that
 * can be moved, resized, minimised and maximised. The apps inside the windows
 * are the same WorkSim apps as before.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppServices } from '../app/services'
import type { ContextItem, Proposal } from '../ai/types'
import { workContext } from '../ai/workContext'
import { recordAiUse } from '../game/aiUse'
import { AiHubContext, type AiHub, type AiQuestion } from '../apps/ai/hub'
import type { Career } from '../app/useCareer'
import { openPracticeFile } from '../persistence/toolPractice'
import { careerTools } from '../tools/registry'
import { MailApp } from '../apps/mail/MailApp'
import { getAssignment } from '../content/assignments'
import { COMPANY } from '../content/company'
import {
  assignmentStatus,
  careerAssignments,
  careerLevel,
  promotionProgress,
  unreadCount,
} from '../game/career'
import {
  readLastView,
  writeLastView,
  DEFAULT_VIEW,
  type View,
} from '../persistence/lastView'
import type { Profile, Wellbeing } from '../persistence/schemas'
import { openWorkbenchDocument } from '../persistence/workbench'
import { computerNotices } from '../game/notices'
import { caseFor } from '../game/caseVariants'
import { chooseDeskItem } from '../game/desk'
import { HelpPanel } from '../ui/HelpPanel'
import { AudioSettingsPanel, SoundCaptions } from '../audio/AudioSettingsPanel'
import { audio } from '../audio/manager'
import { timeOfDay, type Place } from '../audio/scenes'
import { AudioScene, useGameSounds } from '../audio/useAudio'
import { isRaining, useWeatherSetting } from '../world/weather'
import { nextWorkday } from '../game/clock'
import {
  attemptDef,
  openAttempt,
  saveAssessmentAnswer,
  startAssessment,
} from '../game/assessments'
import { energyReading, workPace } from '../game/wellbeing'
import { skipToAssignment } from '../game/devTools'
import {
  arriveCase,
  caseContext,
  joinMeeting,
  levelNumber,
  saveCaseAnswer,
} from '../game/cases'
import { modelAnswers } from '../game/caseModel'
import { getCase } from '../content/cases'
import { passTime } from '../game/workday'
import { OfficeView } from '../office/OfficeView'
import { HomeView } from '../home/HomeView'
import { CityView } from '../city/CityView'
import { enterPlace, goOutside } from '../game/city'
import { deal, setRiding } from '../game/transport'
import { doHomeAction, goHome, goToBed, leaveForWork, lifePhase } from '../game/life'
import { buyFurniture, moveHome, recolour, sellFurniture } from '../game/home'
import { contactFriend, goOut, markRead as readMessages, respond } from '../game/social'
import { Icon, type IconName } from '../ui/Icon'
import { DayEnd } from '../workday/DayEnd'
import { useWorkClock } from '../workday/useWorkClock'
import { WorkdayBar } from '../workday/WorkdayBar'
import { createDocument } from '../persistence/documentsRepo'
import { AppWindowFrame } from './windows/AppWindowFrame'
import {
  readSettings,
  writeSettings,
  type DesktopSettings,
} from './windows/desktopSettings'
import { DesktopSurface, type DesktopIcon, type NewItem } from './windows/DesktopSurface'
import { StartMenu } from './windows/StartMenu'
import { RecycleBinWindow, SettingsWindow } from './windows/SystemWindows'
import { Taskbar, TrayIcons, type LaunchableApp } from './windows/Taskbar'
import {
  closeWindow,
  EMPTY_DESK,
  fitToArea,
  focusedWindow,
  focusWindow,
  keyOf,
  minimizeAll,
  minimizeWindow,
  moveWindow,
  openSystemWindow,
  openWindow,
  readDesk,
  resizeWindow,
  taskbarClick,
  toggleMaximize,
  writeDesk,
  type AppWindow,
  type Area,
  type Desk,
  type SystemWindow,
} from './windows/windowManager'

// The apps are loaded when first opened, so the office appears without
// downloading every editor and tool first.
const CareerApp = lazy(() =>
  import('../apps/career/CareerApp').then((m) => ({ default: m.CareerApp })),
)
const PortfolioApp = lazy(() =>
  import('../apps/portfolio/PortfolioApp').then((m) => ({ default: m.PortfolioApp })),
)
const DocsApp = lazy(() =>
  import('../apps/docs/DocsApp').then((m) => ({ default: m.DocsApp })),
)
const CodeApp = lazy(() =>
  import('../apps/code/CodeApp').then((m) => ({ default: m.CodeApp })),
)
const CodeWindow = lazy(() =>
  import('../apps/code/CodeWindow').then((m) => ({ default: m.CodeWindow })),
)
const HelpDeskApp = lazy(() =>
  import('../apps/helpdesk/HelpDeskApp').then((m) => ({ default: m.HelpDeskApp })),
)
const ToolHome = lazy(() =>
  import('../apps/tools/ToolHome').then((m) => ({ default: m.ToolHome })),
)
const ToolWindow = lazy(() =>
  import('../apps/tools/ToolWindow').then((m) => ({ default: m.ToolWindow })),
)
const HelpDeskWindow = lazy(() =>
  import('../apps/helpdesk/HelpDeskWindow').then((m) => ({ default: m.HelpDeskWindow })),
)
const DocWindow = lazy(() =>
  import('../apps/docs/DocWindow').then((m) => ({ default: m.DocWindow })),
)
const SlidesApp = lazy(() =>
  import('../apps/slides/SlidesApp').then((m) => ({ default: m.SlidesApp })),
)
const SlidesWindow = lazy(() =>
  import('../apps/slides/SlidesWindow').then((m) => ({ default: m.SlidesWindow })),
)
const SheetsApp = lazy(() =>
  import('../apps/sheets/SheetsApp').then((m) => ({ default: m.SheetsApp })),
)
const WorkbookWindow = lazy(() =>
  import('../apps/sheets/WorkbookWindow').then((m) => ({ default: m.WorkbookWindow })),
)
const TasksApp = lazy(() =>
  import('../apps/tasks/TasksApp').then((m) => ({ default: m.TasksApp })),
)
const AiApp = lazy(() => import('../apps/ai/AiApp').then((m) => ({ default: m.AiApp })))
const ReadinessApp = lazy(() =>
  import('../apps/readiness/ReadinessApp').then((m) => ({ default: m.ReadinessApp })),
)
const CasesApp = lazy(() =>
  import('../apps/cases/CasesApp').then((m) => ({ default: m.CasesApp })),
)

interface DesktopProps {
  profile: Profile
  career: Career
  storageWarning: boolean
  onOpenStorage: () => void
}

const APPS: Array<{ id: Exclude<View['app'], 'office'>; label: string; icon: IconName }> =
  [
    { id: 'mail', label: 'Mail', icon: 'mail' },
    { id: 'tasks', label: 'Tasks', icon: 'tasks' },
    { id: 'cases', label: 'Cases', icon: 'cases' },
    { id: 'ai', label: 'WorkSim AI', icon: 'ai' },
    { id: 'sheets', label: 'Sheets', icon: 'sheets' },
    { id: 'docs', label: 'Docs', icon: 'docs' },
    { id: 'slides', label: 'Slides', icon: 'slides' },
    { id: 'helpdesk', label: 'Help Desk', icon: 'helpdesk' },
    { id: 'code', label: 'Code', icon: 'code' },
    { id: 'career', label: 'Career', icon: 'career' },
    { id: 'readiness', label: 'Readiness', icon: 'check' },
    { id: 'portfolio', label: 'Portfolio', icon: 'portfolio' },
  ]

/** Tile colours for the desktop icons and Start, one per app. */
const APP_COLORS: Record<string, string> = {
  mail: '#0063b1',
  tasks: '#2564cf',
  cases: '#4a5a8c',
  ai: '#3b5bdb',
  sheets: '#1e7145',
  docs: '#2b579a',
  slides: '#b7472a',
  helpdesk: '#00777a',
  code: '#5c2d91',
  career: '#a55f00',
  readiness: '#107c10',
  portfolio: '#744da9',
}
const TOOL_COLOR = '#2d6a8f'

/** The window size used before the desktop has been measured. */
function initialArea(): Area {
  return {
    w: globalThis.innerWidth || 1280,
    h: Math.max(300, (globalThis.innerHeight || 800) - 40),
  }
}

/** What each part of the office sounds like. */
const OFFICE_PLACE: Record<string, Place> = {
  reception: 'reception',
  desk: 'office',
  manager: 'meeting',
  breakroom: 'breakroom',
}

export function Desktop({
  profile,
  career,
  storageWarning,
  onOpenStorage,
}: DesktopProps) {
  const { saveAll } = useAppServices()
  // Where the player is: in the office (a spot), or at the computer (an app).
  const [view, setViewState] = useState<View>(() => readLastView() ?? DEFAULT_VIEW)
  const [helpOpen, setHelpOpen] = useState(false)
  const [soundOpen, setSoundOpen] = useState(false)
  const weatherSetting = useWeatherSetting()
  useGameSounds(profile)
  const [area, setArea] = useState<Area>(initialArea)
  // The computer's open windows, as the player left them.
  const [desk, setDesk] = useState<Desk>(() => {
    const saved = readDesk(profile.id) ?? EMPTY_DESK
    const start = readLastView() ?? DEFAULT_VIEW
    if (start.app === 'office' || saved.windows.some((w) => w.key === keyOf(start)))
      return saved
    return openWindow(saved, start, initialArea())
  })
  const [settings, setSettingsState] = useState<DesktopSettings>(() =>
    readSettings(profile.id),
  )

  // The toast clock only starts once the player is at the computer to see it.
  const notifications = useNotifications(profile, view.app !== 'office')

  // WorkSim AI: context offered by the open apps, and questions sent from them.
  const offered = useRef<Record<string, () => ContextItem[]>>({})
  const [aiQuestion, setAiQuestion] = useState<
    (AiQuestion & { id: number; from: string }) | null
  >(null)
  const questionId = useRef(0)
  // Apps that accept changes WorkSim AI proposes (applied only when the player says so).
  const appliers = useRef<
    Record<string, { kinds: Proposal['kind'][]; apply: (proposal: Proposal) => boolean }>
  >({})
  const aiHub = useMemo<AiHub>(
    () => ({
      offer: (app, items) => {
        if (items) offered.current[app] = items
        else delete offered.current[app]
      },
      accept: (app, apply) => {
        if (apply) appliers.current[app] = apply
        else delete appliers.current[app]
      },
      ask: (from, question) => {
        questionId.current += 1
        setAiQuestion({ ...question, id: questionId.current, from })
        setViewRef.current({ app: 'ai' })
      },
    }),
    [],
  )
  const takeQuestion = useCallback(
    (id: number) => setAiQuestion((q) => (q?.id === id ? null : q)),
    [],
  )

  // setView is declared below; the hub reaches it through this ref.
  const setViewRef = useRef<(view: View) => void>(() => {})
  const areaRef = useRef(area)
  useEffect(() => {
    areaRef.current = area
  }, [area])

  /** Goes to a place in the office, or opens an app window showing this view. */
  const setView = useCallback((next: View) => {
    setViewState(next)
    writeLastView(next)
    if (next.app !== 'office') setDesk((d) => openWindow(d, next, areaRef.current))
  }, [])

  useEffect(() => {
    setViewRef.current = setView
  }, [setView])

  /** Opens an app as Start and the desktop icons do: as it was, if it is open. */
  const launch = useCallback((next: View) => {
    setViewState(next)
    setDesk((d) =>
      d.windows.some((w) => w.key === keyOf(next))
        ? focusWindow(d, keyOf(next))
        : openWindow(d, next, areaRef.current),
    )
  }, [])

  const openSystem = useCallback((system: SystemWindow) => {
    setDesk((d) => openSystemWindow(d, system, areaRef.current))
  }, [])

  const updateSettings = useCallback(
    (next: DesktopSettings) => {
      setSettingsState(next)
      writeSettings(profile.id, next)
    },
    [profile.id],
  )

  const onArea = useCallback((next: Area) => {
    setArea((current) => (current.w === next.w && current.h === next.h ? current : next))
    setDesk((d) => fitToArea(d, next))
  }, [])

  // Remember the windows, and the app in front for the next visit.
  const focused = focusedWindow(desk)
  useEffect(() => {
    writeDesk(profile.id, desk)
  }, [profile.id, desk])
  useEffect(() => {
    if (view.app !== 'office' && focused?.view) writeLastView(focused.view)
  }, [view.app, focused?.view])

  const { current, next, career: careerInfo } = careerLevel(profile)
  const careerApps = careerInfo.apps
  const tools = careerTools(careerInfo, current.id)
  const unread = unreadCount(profile)
  const openTasks = careerAssignments(profile.careerId).filter((a) => {
    const status = assignmentStatus(profile, a)
    return status === 'available' || status === 'needs-revision'
  }).length
  const badges: Partial<Record<View['app'], number>> = {
    mail: unread,
    tasks: openTasks,
    cases: Object.values(profile.work.cases).filter((c) => c.status === 'open').length,
    // The assessment the next promotion needs, until it is passed.
    readiness:
      promotionProgress(profile).assessment && !promotionProgress(profile).assessmentMet
        ? 1
        : 0,
  }
  const xpStart = current.xpRequired
  const xpPercent = next
    ? Math.min(
        100,
        Math.round((100 * (profile.xp - xpStart)) / (next.xpRequired - xpStart)),
      )
    : 100

  const openTask = useCallback(
    (assignmentId: string) => setView({ app: 'tasks', assignmentId }),
    [setView],
  )

  const openAssignmentWorkbook = useCallback(
    async (assignmentId: string) => {
      const documentId = await career.startAssignment(assignmentId)
      // Each task opens in the app its main file belongs to.
      const assignment = getAssignment(assignmentId)
      const kind = assignment?.kind
      if (kind === 'tool' && assignment?.tool) {
        setView({ app: 'tool', tool: assignment.tool.id, document: documentId })
        return
      }
      setView({
        app: kind === 'tickets' ? 'helpdesk' : kind === 'code' ? 'code' : 'sheets',
        document: documentId,
      })
    },
    [career, setView],
  )

  /** Reports and presentations that belong to tasks, with the task's title. */
  const taskFiles: Record<string, string> = {}
  for (const progress of Object.values(profile.assignments)) {
    const title = getAssignment(progress.assignmentId)?.title ?? 'a task'
    for (const id of [progress.files?.doc, progress.files?.slides]) {
      if (id) taskFiles[id] = title
    }
  }

  const { markRead, act } = career
  const onMarkRead = useCallback((id: string) => void markRead(id), [markRead])

  const dayOver = profile.work.dayOver
  const atComputer = view.app !== 'office' && !dayOver
  // Sitting down at the computer and getting up again; windows opening and closing.
  const sitting = useRef(atComputer)
  useEffect(() => {
    if (sitting.current !== atComputer) audio.play(atComputer ? 'sit' : 'stand')
    sitting.current = atComputer
  }, [atComputer])
  const windowCount = useRef(desk.windows.length)
  useEffect(() => {
    const count = desk.windows.length
    if (atComputer && count !== windowCount.current)
      audio.play(count > windowCount.current ? 'open' : 'close')
    windowCount.current = count
  }, [desk.windows.length, atComputer])
  const onTimePassed = useCallback(
    (minutes: number) => void act((p) => passTime(p, minutes, 'work')),
    [act],
  )

  // Lets browser tests move the office clock without waiting (development only).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hooks = {
      passTime: (minutes: number) => act((p) => passTime(p, minutes, 'work')),
      setWellbeing: (change: Partial<Wellbeing>) =>
        act((p) => ({
          ...p,
          work: { ...p.work, wellbeing: { ...p.work.wellbeing, ...change } },
        })),
      /** Jumps to a day and time without anything happening on the way. */
      setTime: (day: number, minute: number) =>
        act((p) => ({ ...p, work: { ...p.work, day, minute } })),
      /** Marks every task before this one as done (e.g. 'performance-report'). */
      skipTo: (assignmentId: string) => act((p) => skipToAssignment(p, assignmentId)),
      /** Chooses which case variants this save gets (0 = the original wording). */
      setSeed: (seed: number) =>
        act((p) => ({
          ...p,
          work: { ...p.work, record: { ...p.work.record, seed } },
        })),
      arriveCase: (caseId: string) =>
        act((p) => {
          const def = getCase(caseId)
          return def && !p.work.cases[caseId] ? arriveCase(p, def, Date.now()) : p
        }),
      /** Fills in the open assessment attempt's model answers (the report excepted). */
      answerAssessment: (id: string) =>
        act((p) => {
          const open = openAttempt(p, id)
          const def = open ? attemptDef(open) : undefined
          if (!def) return p
          return Object.entries(modelAnswers(def)).reduce(
            (next, [stepId, answer]) => saveAssessmentAnswer(next, id, stepId, answer),
            p,
          )
        }),
      /** Fills in a case's model answers (documents excepted). */
      answerCase: (caseId: string) =>
        act((p) => {
          const def = caseFor(p, caseId)
          if (!def) return p
          return Object.entries(modelAnswers(def, caseContext(p))).reduce(
            (next, [stepId, answer]) => saveCaseAnswer(next, caseId, stepId, answer),
            p,
          )
        }),
    }
    Object.assign(window, { __worksim: hooks })
  }, [act])

  /** Every app the player has, in taskbar order; locked tools say when they unlock. */
  const launchables: Array<LaunchableApp & { view: View }> = [
    ...APPS.filter(
      (app) =>
        app.id === 'mail' ||
        app.id === 'tasks' ||
        app.id === 'cases' ||
        app.id === 'ai' ||
        (careerApps as string[]).includes(app.id),
    ).map((app) => ({
      key: app.id as string,
      label: app.label,
      icon: app.icon,
      badge: badges[app.id],
      view: { app: app.id } as View,
    })),
    ...tools.map(({ tool, unlocksAt, unlocked }) => ({
      key: `tool:${tool.id}`,
      label: tool.name,
      icon: tool.icon,
      lockedUntil: unlocked ? null : unlocksAt,
      view: { app: 'tool', tool: tool.id } as View,
    })),
    ...APPS.filter(
      (app) => app.id === 'career' || app.id === 'readiness' || app.id === 'portfolio',
    ).map((app) => ({
      key: app.id as string,
      label: app.label,
      icon: app.icon,
      badge: badges[app.id],
      view: { app: app.id } as View,
    })),
  ]
  const colors: Record<string, string> = {}
  for (const app of launchables)
    colors[app.key] =
      APP_COLORS[app.key] ?? (app.key.startsWith('tool:') ? TOOL_COLOR : '#1f6fbf')

  const header = (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-bold tracking-tight text-blue-900">
          GamHub WorkSim
        </span>
        <span className="text-sm text-slate-500">{COMPANY.name}</span>
      </div>
      <div className="flex items-center gap-4">
        {!dayOver && (
          <WorkClock profile={profile} running={atComputer} onTimePassed={onTimePassed} />
        )}
        <button
          type="button"
          onClick={() => setView({ app: 'career' })}
          className="flex items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-slate-50"
          data-testid="player-chip"
        >
          <span className="text-right">
            <span className="block text-sm font-medium text-slate-800">
              {profile.name}
            </span>
            <span className="block text-xs text-slate-500">{current.title}</span>
          </span>
          <span className="w-28">
            <span className="block text-right text-xs text-slate-500" data-testid="xp">
              {profile.xp} XP
            </span>
            <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-slate-200">
              <span
                className="block h-full rounded-full bg-blue-600"
                style={{ width: `${xpPercent}%` }}
              />
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSoundOpen(true)}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
        >
          Sound &amp; graphics
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
        >
          Help
        </button>
        <button
          type="button"
          onClick={onOpenStorage}
          className="relative rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
        >
          Storage &amp; backup
          {storageWarning && (
            <span
              aria-label="needs attention"
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500"
            />
          )}
        </button>
      </div>
    </header>
  )

  if (dayOver || view.app === 'office') {
    return (
      <div className="flex h-screen flex-col bg-slate-100" data-testid="desktop">
        {header}
        {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
        {soundOpen && <AudioSettingsPanel onClose={() => setSoundOpen(false)} />}
        <SoundCaptions />
        {dayOver && lifePhase(profile) === 'work' ? (
          <AudioScene scene={{ place: 'quiet', time: timeOfDay(profile.work.minute) }} />
        ) : dayOver &&
          profile.work.life.city.at === 'home' &&
          profile.work.life.city.inside ? (
          <AudioScene
            scene={{
              place: 'home',
              time: timeOfDay(profile.work.life.minute),
              // Rain heard softly on the windows.
              rain: isRaining(
                profile.work.life.phase === 'morning'
                  ? nextWorkday(profile.work.day)
                  : profile.work.day,
                weatherSetting,
              ),
            }}
          />
        ) : dayOver ? null : (
          <AudioScene
            scene={{
              place: OFFICE_PLACE[view.spot ?? 'reception'],
              time: timeOfDay(profile.work.minute),
            }}
          />
        )}
        {dayOver && lifePhase(profile) === 'work' ? (
          // The day's summary, then home.
          <DayEnd profile={profile} onNextDay={() => void act(goHome)} />
        ) : dayOver &&
          !(profile.work.life.city.at === 'home' && profile.work.life.city.inside) ? (
          // Out in the neighbourhood (or inside a place there).
          <CityView
            profile={profile}
            onEnter={(id) => {
              void act((p) => enterPlace(p, id))
              if (id === 'office') setView({ app: 'office', spot: 'reception' })
            }}
            onOutside={() => void act(goOutside)}
            onLeave={(commute) => {
              void act((p) => leaveForWork(p, commute))
              setView({ app: 'office', spot: 'reception' })
            }}
            onDeal={(which) => void act((p) => deal(p, which))}
            onRide={(riding) => void act((p) => setRiding(p, riding))}
            onAct={act}
            onAction={(id) => void act((p) => doHomeAction(p, id))}
            onRespond={(id, accept) => void act((p) => respond(p, id, accept))}
            onContact={(friend, how) => void act((p) => contactFriend(p, friend, how))}
            onRead={(friend) => void act((p) => readMessages(p, friend))}
          />
        ) : dayOver ? (
          <HomeView
            profile={profile}
            onAction={(id) => void act((p) => doHomeAction(p, id))}
            onBed={() => void act(goToBed)}
            onLeave={(commute) => {
              void act((p) => leaveForWork(p, commute))
              setView({ app: 'office', spot: 'reception' })
            }}
            onBuy={(item, colour) => void act((p) => buyFurniture(p, item, colour))}
            onSell={(slot) => void act((p) => sellFurniture(p, slot))}
            onRecolour={(slot, colour) => void act((p) => recolour(p, slot, colour))}
            onMove={(home) => void act((p) => moveHome(p, home))}
            onRespond={(id, accept) => void act((p) => respond(p, id, accept))}
            onGoOut={(id) => void act((p) => goOut(p, id))}
            onContact={(friend, how) => void act((p) => contactFriend(p, friend, how))}
            onRead={(friend) => void act((p) => readMessages(p, friend))}
            onGoOutside={() => void act(goOutside)}
            onCareer={act}
          />
        ) : (
          <OfficeView
            profile={profile}
            spot={view.spot ?? 'reception'}
            openEvent={view.event}
            onGo={(spot) => setView({ app: 'office', spot })}
            onUseComputer={(open) => setView(open ?? { app: 'mail' })}
            onAct={act}
          />
        )}
      </div>
    )
  }

  /** The app inside a window, showing this view. */
  function renderApp(v: View) {
    switch (v.app) {
      case 'mail':
        return (
          <MailApp
            profile={profile}
            selectedId={v.mailId}
            composing={!!v.compose}
            onSelect={(mailId, compose) =>
              setView({ app: 'mail', mailId, ...(compose ? { compose } : {}) })
            }
            onMarkRead={onMarkRead}
            onOpenTask={openTask}
            onOpenCareer={() => setView({ app: 'career' })}
            onOpenCase={(caseId) => setView({ app: 'cases', item: caseId })}
            // A file may still be open in another window: save it before it is sent.
            onFlush={saveAll}
            onSend={career.sendMail}
          />
        )
      case 'tasks':
        return (
          <TasksApp
            profile={profile}
            selectedId={v.assignmentId}
            onSelect={openTask}
            onOpenWorkbook={openAssignmentWorkbook}
            onOpenFile={(kind, document) =>
              setView({ app: kind === 'doc' ? 'docs' : 'slides', document })
            }
            onHandIn={(mailId) => setView({ app: 'mail', mailId, compose: true })}
          />
        )
      case 'sheets':
        return v.document ? (
          <OpenWorkbook
            document={v.document}
            profile={profile}
            career={career}
            onBack={() => setView({ app: 'sheets' })}
            onOpenTask={openTask}
          />
        ) : (
          <SheetsApp
            profile={profile}
            onOpen={(document) => setView({ app: 'sheets', document })}
          />
        )
      case 'docs':
        return v.document ? (
          <DocWindow
            key={v.document}
            documentId={v.document}
            ownerId={profile.id}
            onBack={() => setView({ app: 'docs' })}
          />
        ) : (
          <DocsApp
            playerName={profile.name}
            linked={taskFiles}
            ownerId={profile.id}
            onOpen={(document) => setView({ app: 'docs', document })}
          />
        )
      case 'slides':
        return v.document ? (
          <SlidesWindow
            key={v.document}
            documentId={v.document}
            ownerId={profile.id}
            onBack={() => setView({ app: 'slides' })}
          />
        ) : (
          <SlidesApp
            playerName={profile.name}
            linked={taskFiles}
            ownerId={profile.id}
            onOpen={(document) => setView({ app: 'slides', document })}
          />
        )
      case 'helpdesk':
        return v.document ? (
          <HelpDeskWindow
            key={v.document}
            documentId={v.document}
            assignmentId={
              Object.values(profile.assignments).find((p) => p.documentId === v.document)
                ?.assignmentId ?? null
            }
            career={career}
            onBack={() => setView({ app: 'helpdesk' })}
            onOpenTask={openTask}
          />
        ) : (
          <HelpDeskApp
            profile={profile}
            onOpen={(document) => setView({ app: 'helpdesk', document })}
          />
        )
      case 'code':
        return v.document ? (
          <CodeWindow
            key={v.document}
            documentId={v.document}
            assignmentId={
              Object.values(profile.assignments).find((p) => p.documentId === v.document)
                ?.assignmentId ?? null
            }
            career={career}
            onBack={() => setView({ app: 'code' })}
            onOpenTask={openTask}
          />
        ) : (
          <CodeApp
            profile={profile}
            onOpen={(document) => setView({ app: 'code', document })}
          />
        )
      case 'tool': {
        const access = tools.find((t) => t.tool.id === v.tool)
        if (!access?.unlocked) {
          return (
            <p className="p-6 text-sm text-slate-600">
              {access
                ? `${access.tool.name} unlocks when you become ${access.unlocksAt}.`
                : 'This tool is not part of your career.'}
            </p>
          )
        }
        return v.document ? (
          <ToolWindow
            key={v.document}
            documentId={v.document}
            toolId={access.tool.id}
            assignmentId={
              Object.values(profile.assignments).find((p) => p.documentId === v.document)
                ?.assignmentId ?? null
            }
            career={career}
            lockedSections={access.lockedSections}
            onBack={() => setView({ app: 'tool', tool: access.tool.id })}
            onOpenTask={openTask}
          />
        ) : (
          <ToolHome
            key={access.tool.id}
            profile={profile}
            access={access}
            onOpen={(document) =>
              setView({ app: 'tool', tool: access.tool.id, document })
            }
            onOpenPractice={async () => {
              const document = await openPracticeFile(profile.id, access.tool)
              setView({ app: 'tool', tool: access.tool.id, document })
            }}
          />
        )
      }
      case 'cases':
        return (
          <CasesApp
            profile={profile}
            caseId={v.item}
            onOpen={(caseId) => setView({ app: 'cases', item: caseId })}
            onSave={(caseId, stepId, answer) =>
              void career.saveCaseStep(caseId, stepId, answer)
            }
            onOpenFile={async (caseId, stepId) => {
              const documentId = await career.openCaseFile(caseId, stepId)
              const step = getCase(caseId)?.steps.find((s) => s.id === stepId)
              const kind =
                step?.kind === 'document' && step.deliverable.kind === 'slides'
                  ? 'slides'
                  : 'docs'
              setView({ app: kind, document: documentId })
            }}
            onSubmit={async (caseId) => {
              // The case's files may still be open in another window.
              await saveAll()
              await career.submitCase(caseId)
            }}
            onJoin={(caseId) => void act((p) => joinMeeting(p, caseId))}
            onWait={(minutes) => void act((p) => passTime(p, minutes, 'work'))}
          />
        )
      case 'readiness':
        return (
          <ReadinessApp
            profile={profile}
            selected={v.item}
            onSelect={(item) => setView({ app: 'readiness', item })}
            onStart={async (id) => {
              await act((p) => startAssessment(p, id, levelNumber(p)))
            }}
            onSave={(id, stepId, answer) =>
              void act((p) => saveAssessmentAnswer(p, id, stepId, answer))
            }
            onOpenFile={async (id, stepId) => {
              const documentId = await career.openAssessmentFile(id, stepId)
              // Practical work opens in its own tool; the report in Docs.
              const open = openAttempt(profile, id)
              const step = open
                ? attemptDef(open)?.steps.find((s) => s.id === stepId)
                : undefined
              const task =
                step?.kind === 'practical' ? getAssignment(step.assignmentId) : undefined
              if (!task) setView({ app: 'docs', document: documentId })
              else if (task.kind === 'tool' && task.tool)
                setView({ app: 'tool', tool: task.tool.id, document: documentId })
              else
                setView({
                  app:
                    task.kind === 'tickets'
                      ? 'helpdesk'
                      : task.kind === 'code'
                        ? 'code'
                        : 'sheets',
                  document: documentId,
                })
            }}
            onSubmit={async (id) => {
              await saveAll()
              await career.submitAssessment(id)
            }}
          />
        )
      case 'portfolio':
        return (
          <PortfolioApp
            profile={profile}
            itemId={v.item}
            tab={v.tab ?? 'work'}
            onOpenItem={(item) => setView({ app: 'portfolio', item, tab: v.tab })}
            onTab={(tab) => setView({ app: 'portfolio', tab })}
            onAct={(action) =>
              setView(
                action.kind === 'task'
                  ? { app: 'tasks', assignmentId: action.assignmentId }
                  : action.kind === 'readiness'
                    ? { app: 'readiness', item: action.assessmentId }
                    : { app: 'tool', tool: action.toolId },
              )
            }
          />
        )
      case 'ai':
        return (
          <AiApp
            profileId={profile.id}
            playerName={profile.name}
            readContext={() => [
              ...(workWindow ? (offered.current[workWindow.key]?.() ?? []) : []),
              ...workContext(profile, workWindow?.view ?? null),
            ]}
            question={aiQuestion}
            onQuestionTaken={takeQuestion}
            workApp={workWindow?.key ?? null}
            canApply={(app, kind) => !!appliers.current[app]?.kinds.includes(kind)}
            onApply={(app, proposal) => appliers.current[app]?.apply(proposal) ?? false}
            onRecord={(event) => void act((p) => recordAiUse(p, event))}
          />
        )
      case 'career':
        return (
          <CareerApp
            profile={profile}
            focus={v.item}
            onOpenReadiness={(item) => setView({ app: 'readiness', item })}
            onChooseDesk={(slot, itemId) =>
              void act((p) => chooseDeskItem(p, slot, itemId))
            }
            onOpenPortfolio={() => setView({ app: 'portfolio' })}
            onSwitchCareer={async (careerId) => {
              // The other career starts at its own reception.
              writeLastView(DEFAULT_VIEW)
              await career.switchCareer(careerId)
            }}
            onOpenFile={(kind, document) =>
              setView(
                kind === 'tool'
                  ? {
                      app: 'tool',
                      tool: getAssignment(
                        Object.values(profile.assignments).find(
                          (p) => p.documentId === document,
                        )?.assignmentId ?? '',
                      )?.tool?.id,
                      document,
                    }
                  : {
                      app: (
                        {
                          sheet: 'sheets',
                          tickets: 'helpdesk',
                          code: 'code',
                          doc: 'docs',
                          slides: 'slides',
                        } as const
                      )[kind],
                      document,
                    },
              )
            }
          />
        )
      default:
        return null
    }
  }

  /** The window the player was last working in, not counting WorkSim AI itself. */
  const workWindow = desk.windows
    .filter((w) => w.view && w.key !== 'ai')
    .reduce<AppWindow | undefined>(
      (best, w) => (!best || w.z > best.z ? w : best),
      undefined,
    )

  function windowMeta(win: AppWindow): { title: string; icon: IconName } {
    if (win.system === 'settings') return { title: 'Settings', icon: 'settings' }
    if (win.system === 'recycle-bin') return { title: 'Recycle Bin', icon: 'bin' }
    const app = launchables.find((a) => a.key === win.key)
    return app
      ? { title: app.label, icon: app.icon }
      : { title: APPS.find((a) => a.id === win.view?.app)?.label ?? 'App', icon: 'file' }
  }

  const leaveDesk = () => setView({ app: 'office', spot: 'desk' })
  const newItems: NewItem[] = [
    ...((careerApps as string[]).includes('docs')
      ? [
          {
            label: 'Document',
            icon: 'docs' as const,
            onCreate: async () => {
              const { getDocTemplate } = await import('../apps/docs/templates')
              const template = getDocTemplate('blank')
              const document = await createDocument({
                kind: 'doc',
                title: 'New document',
                content: template.build(profile.name),
                owner: profile.id,
              })
              setView({ app: 'docs', document: document.id })
            },
          },
        ]
      : []),
    ...((careerApps as string[]).includes('sheets')
      ? [
          {
            label: 'Practice workbook',
            icon: 'sheets' as const,
            onCreate: () => setView({ app: 'sheets', document: 'practice' }),
          },
        ]
      : []),
    ...((careerApps as string[]).includes('slides')
      ? [
          {
            label: 'Presentation',
            icon: 'slides' as const,
            onCreate: async () => {
              const { getSlidesTemplate } = await import('../apps/slides/model')
              const template = getSlidesTemplate('blank')
              const document = await createDocument({
                kind: 'slides',
                title: 'New presentation',
                content: template.build(profile.name),
                owner: profile.id,
              })
              setView({ app: 'slides', document: document.id })
            },
          },
        ]
      : []),
  ].map((item) => ({ ...item, onCreate: () => void item.onCreate() }))

  const desktopIcons: DesktopIcon[] = [
    {
      id: 'recycle-bin',
      label: 'Recycle Bin',
      icon: 'bin',
      color: '#5c6b7a',
      side: 'left',
      onOpen: () => openSystem('recycle-bin'),
    },
    ...launchables
      .filter(
        (app) =>
          !app.lockedUntil &&
          app.key !== 'career' &&
          app.key !== 'readiness' &&
          app.key !== 'portfolio',
      )
      .map((app) => ({
        id: app.key,
        label: app.label,
        icon: app.icon,
        color: colors[app.key],
        side: 'left' as const,
        onOpen: () => launch(app.view),
      })),
    ...launchables
      .filter((app) => ['career', 'readiness', 'portfolio'].includes(app.key))
      .map((app) => ({
        id: app.key,
        label: app.label,
        icon: app.icon,
        color: colors[app.key],
        side: 'right' as const,
        onOpen: () => launch(app.view),
      })),
    {
      id: 'handbook',
      label: 'Employee handbook',
      icon: 'guide',
      color: '#5c6b7a',
      side: 'right',
      onOpen: () => setHelpOpen(true),
    },
    {
      id: 'storage',
      label: 'Storage & backup',
      icon: 'storage',
      color: '#5c6b7a',
      side: 'right',
      onOpen: onOpenStorage,
    },
  ]

  const energy = Math.round(profile.work.wellbeing.energy)

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[#0b4f9c]"
      data-testid="desktop"
    >
      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
      {soundOpen && <AudioSettingsPanel onClose={() => setSoundOpen(false)} />}
      <SoundCaptions />
      <AudioScene scene={{ place: 'computer', time: timeOfDay(profile.work.minute) }} />
      <AiHubContext.Provider value={aiHub}>
        <DesktopSurface
          icons={desktopIcons}
          settings={settings}
          onSettings={updateSettings}
          newItems={newItems}
          onDisplaySettings={() => openSystem('settings')}
          onPersonalize={() => openSystem('settings')}
          onArea={onArea}
          overlay={
            <Notices
              notices={notifications.centreOpen ? notifications.all : notifications.fresh}
              centre={notifications.centreOpen}
              onDismiss={notifications.dismiss}
              onClose={notifications.closeCentre}
              onAct={(notice) => {
                notifications.closeCentre()
                const { action } = notice
                if ('caseId' in action) setView({ app: 'cases', item: action.caseId })
                else setView({ app: 'office', spot: action.spot, event: action.event })
              }}
            />
          }
        >
          {desk.windows.map((win) => {
            const meta = windowMeta(win)
            const key = win.key
            return (
              <AppWindowFrame
                key={key}
                window={win}
                title={meta.title}
                icon={meta.icon}
                active={focused?.key === key}
                onFocus={() => setDesk((d) => focusWindow(d, key))}
                onMinimize={() => setDesk((d) => minimizeWindow(d, key))}
                onToggleMaximize={() => setDesk((d) => toggleMaximize(d, key))}
                onClose={() => setDesk((d) => closeWindow(d, key))}
                onMove={(x, y) => setDesk((d) => moveWindow(d, key, x, y, area))}
                onResize={(w, h) => setDesk((d) => resizeWindow(d, key, w, h, area))}
              >
                <Suspense fallback={<AppLoading />}>
                  {win.system === 'settings' ? (
                    <SettingsWindow
                      settings={settings}
                      onSettings={updateSettings}
                      screen={area}
                    />
                  ) : win.system === 'recycle-bin' ? (
                    <RecycleBinWindow />
                  ) : win.view ? (
                    renderApp(win.view)
                  ) : null}
                </Suspense>
              </AppWindowFrame>
            )
          })}
        </DesktopSurface>
      </AiHubContext.Provider>

      <Taskbar
        apps={launchables}
        openKeys={new Set(desk.windows.map((w) => w.key))}
        activeKey={focused?.key ?? null}
        onLaunch={(key, from) => {
          const app = launchables.find((a) => a.key === key)
          if (!app) return
          if (from === 'taskbar') {
            setViewState(app.view)
            setDesk((d) => taskbarClick(d, app.view, areaRef.current))
          } else launch(app.view)
        }}
        onLeaveDesk={leaveDesk}
        startMenu={(close) => (
          <StartMenu
            apps={launchables}
            colors={colors}
            name={profile.name}
            title={current.title}
            company={COMPANY.name}
            onLaunch={(key) => {
              const app = launchables.find((a) => a.key === key)
              if (app) launch(app.view)
            }}
            onProfile={() => launch({ app: 'career' })}
            onSettings={() => openSystem('settings')}
            onHelp={() => setHelpOpen(true)}
            onStorage={onOpenStorage}
            onLeaveDesk={leaveDesk}
            onClose={close}
          />
        )}
        tray={
          <>
            <button
              type="button"
              onClick={() => launch({ app: 'career' })}
              className="hidden flex-col justify-center px-2 text-left text-[11px] leading-tight text-white hover:bg-white/10 sm:flex"
              data-testid="player-chip"
              title={`${profile.name}, ${current.title} at ${COMPANY.name}`}
            >
              <span className="max-w-44 truncate">
                {profile.name} · {current.title}
              </span>
              <span className="flex items-center gap-1.5 text-white/75">
                <span className="block h-1 w-14 overflow-hidden bg-white/20">
                  <span
                    className="block h-full bg-[#76b9ed]"
                    style={{ width: `${xpPercent}%` }}
                  />
                </span>
                <span data-testid="xp">{profile.xp} XP</span>
              </span>
            </button>
            <TrayIcons energy={energy} energyText={energyReading(energy).label} />
            <button
              type="button"
              onClick={notifications.toggleCentre}
              aria-expanded={notifications.centreOpen}
              title="Notifications"
              className="relative flex w-9 items-center justify-center text-white hover:bg-white/10"
            >
              <BellGlyph />
              <span className="sr-only">Notifications</span>
              {notifications.all.length > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-3.5 rounded-full bg-[#76b9ed] px-0.5 text-[9px] leading-3.5 font-semibold text-black"
                  aria-label={`${notifications.all.length} notifications`}
                >
                  {notifications.all.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSoundOpen(true)}
              title="Sound and graphics"
              className="flex w-9 items-center justify-center text-white hover:bg-white/10"
            >
              <span aria-hidden className="text-sm">
                ♪
              </span>
              <span className="sr-only">Sound and graphics</span>
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              title="Help and the employee handbook"
              className="flex w-9 items-center justify-center text-white hover:bg-white/10"
            >
              <span aria-hidden className="text-sm font-semibold">
                ?
              </span>
              <span className="sr-only">Help</span>
            </button>
            <button
              type="button"
              onClick={onOpenStorage}
              title="Storage & backup"
              className="relative flex w-9 items-center justify-center text-white hover:bg-white/10"
            >
              <Icon name="storage" className="h-4 w-4" />
              <span className="sr-only">Storage &amp; backup</span>
              {storageWarning && (
                <span
                  aria-label="needs attention"
                  className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400"
                />
              )}
            </button>
            <WorkClock
              profile={profile}
              running={atComputer}
              onTimePassed={onTimePassed}
              variant="taskbar"
            />
            <button
              type="button"
              aria-label="Show desktop"
              title="Show desktop"
              onClick={() => setDesk(minimizeAll)}
              className="w-1.5 border-l border-white/30 hover:bg-white/20"
            />
          </>
        }
      />
    </div>
  )
}

/** The office clock, which runs while the player works at the computer. */
function WorkClock({
  profile,
  running,
  onTimePassed,
  variant,
}: {
  profile: Profile
  running: boolean
  onTimePassed: (minutes: number) => void
  variant?: 'header' | 'taskbar'
}) {
  const { pendingMinutes, status } = useWorkClock(
    running,
    workPace(profile.work.wellbeing),
    onTimePassed,
  )
  return (
    <WorkdayBar
      profile={profile}
      pendingMinutes={pendingMinutes}
      status={status}
      variant={variant}
    />
  )
}

function BellGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
    >
      <path d="M4 11V7a4 4 0 0 1 8 0v4l1.2 1.5H2.8L4 11Z" strokeWidth="1.2" />
      <path d="M6.5 14a1.6 1.6 0 0 0 3 0" strokeWidth="1.2" />
    </svg>
  )
}

/** How long a notification shows in the corner before it moves to the notification centre. */
const TOAST_MS = 15_000

type Notice = ReturnType<typeof computerNotices>[number]

/**
 * Notifications, as on Windows: each pops up in the corner for a few seconds,
 * then waits in the notification centre (the bell on the taskbar) until it is
 * dismissed or no longer applies.
 */
function useNotifications(profile: Profile, showing: boolean) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [seen, setSeen] = useState<Record<string, number>>({})
  const [now, setNow] = useState(() => Date.now())
  const [centreOpen, setCentreOpen] = useState(false)
  const all = computerNotices(profile).filter((n) => !dismissed.includes(n.id))
  const ids = all.map((n) => n.id).join('|')

  useEffect(() => {
    const unseen = ids.split('|').filter((id) => id && seen[id] === undefined)
    if (!showing || unseen.length === 0) return
    // Recorded just after the notification is first drawn.
    const timer = setTimeout(() => {
      const at = Date.now()
      setSeen((current) => ({
        ...current,
        ...Object.fromEntries(unseen.map((id) => [id, at])),
      }))
      setNow(at)
    }, 0)
    return () => clearTimeout(timer)
  }, [ids, seen, showing])

  const fresh = all.filter((n) => seen[n.id] === undefined || now - seen[n.id] < TOAST_MS)
  const nextExpiry = Math.min(...fresh.map((n) => (seen[n.id] ?? now) + TOAST_MS))
  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return
    const timer = setTimeout(() => setNow(Date.now()), Math.max(50, nextExpiry - now))
    return () => clearTimeout(timer)
  }, [nextExpiry, now])

  return {
    all,
    fresh,
    centreOpen,
    toggleCentre: () => setCentreOpen((open) => !open),
    closeCentre: () => setCentreOpen(false),
    dismiss: (id: string) => setDismissed((d) => [...d, id]),
  }
}

/** Notifications in the corner of the screen, above the taskbar; each can be dismissed. */
function Notices({
  notices,
  centre,
  onDismiss,
  onAct,
  onClose,
}: {
  notices: Notice[]
  /** The notification centre (all notifications), rather than new ones popping up. */
  centre: boolean
  onDismiss: (id: string) => void
  onAct: (notice: Notice) => void
  onClose: () => void
}) {
  if (!centre && notices.length === 0) return null
  return (
    <div
      className={`absolute right-3 bottom-3 z-950 flex w-[min(24rem,calc(100%-1.5rem))] flex-col gap-2 ${
        centre
          ? 'max-h-[calc(100%-1.5rem)] overflow-y-auto bg-[#1f1f1f]/95 p-3 shadow-2xl'
          : ''
      }`}
      data-testid="notices"
      role={centre ? 'dialog' : undefined}
      aria-label={centre ? 'Notifications' : undefined}
    >
      {centre && (
        <div className="flex items-center justify-between text-sm text-white">
          <span className="font-semibold">Notifications</span>
          <button
            type="button"
            onClick={onClose}
            className="px-2 text-xs text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>
      )}
      {centre && notices.length === 0 && (
        <p className="py-4 text-center text-sm text-white/70">No new notifications</p>
      )}
      {notices.map((notice) => (
        <div
          key={notice.id}
          role="status"
          className={`border-l-4 bg-[#2b2b2b] px-4 py-3 text-sm text-white shadow-[0_4px_16px_rgba(0,0,0,0.45)] ${
            notice.tone === 'warning' ? 'border-amber-400' : 'border-[#76b9ed]'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="flex-1">{notice.text}</span>
            <button
              type="button"
              onClick={() => onDismiss(notice.id)}
              className="text-xs text-white/70 hover:text-white"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            onClick={() => onAct(notice)}
            className="mt-2 bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25"
          >
            {notice.action.label}
          </button>
        </div>
      ))}
    </div>
  )
}

/** Finds the workbook to show ("practice" or an assignment workbook) and opens it. */
function OpenWorkbook({
  document,
  profile,
  career,
  onBack,
  onOpenTask,
}: {
  document: string
  profile: Profile
  career: Career
  onBack: () => void
  onOpenTask: (assignmentId: string) => void
}) {
  const [practiceId, setPracticeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (document !== 'practice') return
    let active = true
    openWorkbenchDocument()
      .then((id) => {
        if (active) setPracticeId(id)
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      active = false
    }
  }, [document])

  if (error) {
    return (
      <p
        role="alert"
        className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
      >
        {error}
      </p>
    )
  }

  if (document === 'practice') {
    return practiceId ? (
      <WorkbookWindow
        key={practiceId}
        documentId={practiceId}
        assignmentId={null}
        career={career}
        onBack={onBack}
        onOpenTask={onOpenTask}
      />
    ) : (
      <p className="p-6 text-slate-500">Opening your workbook…</p>
    )
  }

  const progress = Object.values(profile.assignments).find(
    (p) => p.documentId === document,
  )
  if (!progress) {
    // The workbook no longer belongs to this career (e.g. after restoring a backup).
    return <SheetsAppFallback onBack={onBack} />
  }
  return (
    <WorkbookWindow
      key={document}
      documentId={document}
      assignmentId={progress.assignmentId}
      career={career}
      onBack={onBack}
      onOpenTask={onOpenTask}
    />
  )
}

function SheetsAppFallback({ onBack }: { onBack: () => void }) {
  useEffect(onBack, [onBack])
  return null
}

/** Shown for the moment an app takes to load the first time it is opened. */
function AppLoading() {
  return (
    <p role="status" className="p-6 text-sm text-slate-500">
      Opening…
    </p>
  )
}
