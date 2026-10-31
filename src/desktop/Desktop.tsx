/**
 * The player's working day: the 3D office, and the work computer at their
 * desk with a dock of apps (Mail, Tasks, Sheets, Career). The top bar with
 * the player's level and XP is shared by both.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Career } from '../app/useCareer'
import { CareerApp } from '../apps/career/CareerApp'
import { DocsApp } from '../apps/docs/DocsApp'
import { CodeApp } from '../apps/code/CodeApp'
import { CodeWindow } from '../apps/code/CodeWindow'
import { HelpDeskApp } from '../apps/helpdesk/HelpDeskApp'
import { HelpDeskWindow } from '../apps/helpdesk/HelpDeskWindow'
import { DocWindow } from '../apps/docs/DocWindow'
import { SlidesApp } from '../apps/slides/SlidesApp'
import { SlidesWindow } from '../apps/slides/SlidesWindow'
import { MailApp } from '../apps/mail/MailApp'
import { SheetsApp } from '../apps/sheets/SheetsApp'
import { WorkbookWindow } from '../apps/sheets/WorkbookWindow'
import { TasksApp } from '../apps/tasks/TasksApp'
import { getAssignment } from '../content/assignments'
import { COMPANY } from '../content/company'
import {
  assignmentStatus,
  careerAssignments,
  careerLevel,
  unreadCount,
} from '../game/career'
import {
  readLastView,
  writeLastView,
  DEFAULT_VIEW,
  type View,
} from '../persistence/lastView'
import type { Profile, Wellbeing } from '../persistence/schemas'
import type { SpotId } from '../content/office'
import { openWorkbenchDocument } from '../persistence/workbench'
import { computerNotices } from '../game/notices'
import { workPace } from '../game/wellbeing'
import { skipToAssignment } from '../game/devTools'
import { passTime, startNextDay } from '../game/workday'
import { OfficeView } from '../office/OfficeView'
import { Icon, type IconName } from '../ui/Icon'
import { DayEnd } from '../workday/DayEnd'
import { useWorkClock } from '../workday/useWorkClock'
import { WorkdayBar } from '../workday/WorkdayBar'

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
    { id: 'sheets', label: 'Sheets', icon: 'sheets' },
    { id: 'docs', label: 'Docs', icon: 'docs' },
    { id: 'slides', label: 'Slides', icon: 'slides' },
    { id: 'helpdesk', label: 'Help Desk', icon: 'helpdesk' },
    { id: 'code', label: 'Code', icon: 'code' },
    { id: 'career', label: 'Career', icon: 'career' },
  ]

export function Desktop({
  profile,
  career,
  storageWarning,
  onOpenStorage,
}: DesktopProps) {
  const [view, setViewState] = useState<View>(() => readLastView() ?? DEFAULT_VIEW)

  const setView = useCallback((next: View) => {
    setViewState(next)
    writeLastView(next)
  }, [])

  const { current, next, career: careerInfo } = careerLevel(profile)
  const careerApps = careerInfo.apps
  const unread = unreadCount(profile)
  const openTasks = careerAssignments(profile.careerId).filter((a) => {
    const status = assignmentStatus(profile, a)
    return status === 'available' || status === 'needs-revision'
  }).length
  const badges: Partial<Record<View['app'], number>> = { mail: unread, tasks: openTasks }
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
      const kind = getAssignment(assignmentId)?.kind
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
    }
    Object.assign(window, { __worksim: hooks })
  }, [act])

  return (
    <div className="flex h-screen flex-col bg-slate-100" data-testid="desktop">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold tracking-tight text-blue-900">
            GamHub WorkSim
          </span>
          <span className="text-sm text-slate-500">
            {COMPANY.name}
            {view.app !== 'office' && ' · Your computer'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <WorkClock profile={profile} running={atComputer} onTimePassed={onTimePassed} />
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

      {dayOver ? (
        <DayEnd
          profile={profile}
          onNextDay={() => {
            void act(startNextDay)
            setView({ app: 'office', spot: 'reception' })
          }}
        />
      ) : view.app === 'office' ? (
        <OfficeView
          profile={profile}
          spot={view.spot ?? 'reception'}
          openEvent={view.event}
          onGo={(spot) => setView({ app: 'office', spot })}
          onUseComputer={(open) => setView(open ?? { app: 'mail' })}
          onAct={act}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          <nav
            className="flex w-20 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-white py-3"
            aria-label="Apps"
          >
            {APPS.filter(
              (app) =>
                app.id === 'mail' ||
                app.id === 'tasks' ||
                app.id === 'career' ||
                (careerApps as string[]).includes(app.id),
            ).map((app) => {
              const active = view.app === app.id
              const badge = badges[app.id] ?? 0
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setView({ app: app.id })}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-xs ${
                    active
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon name={app.icon} className="h-6 w-6" />
                  {app.label}
                  {badge > 0 && (
                    <span
                      className="absolute top-1 right-2 min-w-4 rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white"
                      aria-label={`${badge} new`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setView({ app: 'office', spot: 'desk' })}
              className="mt-auto flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-xs text-slate-600 hover:bg-slate-50"
              title="Get up from your desk and walk around the office"
            >
              <Icon name="back" className="h-6 w-6" />
              Leave desk
            </button>
          </nav>

          <main className="flex min-w-0 flex-1 flex-col">
            <Notices
              profile={profile}
              onGo={(spot, event) => setView({ app: 'office', spot, event })}
            />
            <div className="min-h-0 flex-1">
              {view.app === 'mail' && (
                <MailApp
                  profile={profile}
                  selectedId={view.mailId}
                  composing={!!view.compose}
                  onSelect={(mailId, compose) =>
                    setView({ app: 'mail', mailId, ...(compose ? { compose } : {}) })
                  }
                  onMarkRead={onMarkRead}
                  onOpenTask={openTask}
                  onOpenCareer={() => setView({ app: 'career' })}
                  // Files open in other apps were saved when the player left them.
                  onFlush={async () => true}
                  onSend={career.sendMail}
                />
              )}
              {view.app === 'tasks' && (
                <TasksApp
                  profile={profile}
                  selectedId={view.assignmentId}
                  onSelect={openTask}
                  onOpenWorkbook={openAssignmentWorkbook}
                  onOpenFile={(kind, document) =>
                    setView({ app: kind === 'doc' ? 'docs' : 'slides', document })
                  }
                  onHandIn={(mailId) => setView({ app: 'mail', mailId, compose: true })}
                />
              )}
              {view.app === 'sheets' &&
                (view.document ? (
                  <OpenWorkbook
                    document={view.document}
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
                ))}
              {view.app === 'docs' &&
                (view.document ? (
                  <DocWindow
                    key={view.document}
                    documentId={view.document}
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
                ))}
              {view.app === 'slides' &&
                (view.document ? (
                  <SlidesWindow
                    key={view.document}
                    documentId={view.document}
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
                ))}
              {view.app === 'helpdesk' &&
                (view.document ? (
                  <HelpDeskWindow
                    key={view.document}
                    documentId={view.document}
                    assignmentId={
                      Object.values(profile.assignments).find(
                        (p) => p.documentId === view.document,
                      )?.assignmentId ?? null
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
                ))}
              {view.app === 'code' &&
                (view.document ? (
                  <CodeWindow
                    key={view.document}
                    documentId={view.document}
                    assignmentId={
                      Object.values(profile.assignments).find(
                        (p) => p.documentId === view.document,
                      )?.assignmentId ?? null
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
                ))}
              {view.app === 'career' && (
                <CareerApp
                  profile={profile}
                  onSwitchCareer={async (careerId) => {
                    // The other career starts at its own reception.
                    writeLastView(DEFAULT_VIEW)
                    await career.switchCareer(careerId)
                  }}
                  onOpenFile={(kind, document) =>
                    setView({
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
                    })
                  }
                />
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  )
}

/** The office clock, which runs while the player works at the computer. */
function WorkClock({
  profile,
  running,
  onTimePassed,
}: {
  profile: Profile
  running: boolean
  onTimePassed: (minutes: number) => void
}) {
  const { pendingMinutes, status } = useWorkClock(
    running,
    workPace(profile.work.wellbeing),
    onTimePassed,
  )
  return <WorkdayBar profile={profile} pendingMinutes={pendingMinutes} status={status} />
}

/** Reminders at the top of the computer screen; each can be dismissed. */
function Notices({
  profile,
  onGo,
}: {
  profile: Profile
  onGo: (spot: SpotId, event?: string) => void
}) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const notices = computerNotices(profile).filter((n) => !dismissed.includes(n.id))
  if (notices.length === 0) return null
  return (
    <div
      className="space-y-1 border-b border-slate-200 bg-white px-4 py-2"
      data-testid="notices"
    >
      {notices.map((notice) => (
        <div
          key={notice.id}
          role="status"
          className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm ${
            notice.tone === 'warning'
              ? 'bg-amber-50 text-amber-900'
              : 'bg-blue-50 text-blue-900'
          }`}
        >
          <span className="flex-1">{notice.text}</span>
          <button
            type="button"
            onClick={() => onGo(notice.action.spot, notice.action.event)}
            className="rounded-md bg-white px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            {notice.action.label}
          </button>
          <button
            type="button"
            onClick={() => setDismissed((d) => [...d, notice.id])}
            className="text-xs opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
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
