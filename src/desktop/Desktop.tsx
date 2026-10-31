/**
 * The simulated work computer: a dock with the apps (Mail, Tasks, Sheets,
 * Career) and a top bar with the player's level and XP.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Career } from '../app/useCareer'
import { CareerApp } from '../apps/career/CareerApp'
import { MailApp } from '../apps/mail/MailApp'
import { SheetsApp } from '../apps/sheets/SheetsApp'
import { WorkbookWindow } from '../apps/sheets/WorkbookWindow'
import { TasksApp } from '../apps/tasks/TasksApp'
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
import type { Profile } from '../persistence/schemas'
import { openWorkbenchDocument } from '../persistence/workbench'
import { Icon, type IconName } from '../ui/Icon'

interface DesktopProps {
  profile: Profile
  career: Career
  storageWarning: boolean
  onOpenStorage: () => void
}

const APPS: Array<{ id: View['app']; label: string; icon: IconName }> = [
  { id: 'mail', label: 'Mail', icon: 'mail' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'sheets', label: 'Sheets', icon: 'sheets' },
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

  const { current, next } = careerLevel(profile)
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
      setView({ app: 'sheets', document: documentId })
    },
    [career, setView],
  )

  const { markRead } = career
  const onMarkRead = useCallback((id: string) => void markRead(id), [markRead])

  return (
    <div className="flex h-screen flex-col bg-slate-100" data-testid="desktop">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold tracking-tight text-blue-900">
            GamHub WorkSim
          </span>
          <span className="text-sm text-slate-500">{COMPANY.name}</span>
        </div>
        <div className="flex items-center gap-4">
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

      <div className="flex min-h-0 flex-1">
        <nav
          className="flex w-20 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-white py-3"
          aria-label="Apps"
        >
          {APPS.map((app) => {
            const active = view.app === app.id
            const badge = badges[app.id] ?? 0
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setView({ app: app.id })}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-xs ${
                  active ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50'
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
        </nav>

        <main className="min-w-0 flex-1">
          {view.app === 'mail' && (
            <MailApp
              profile={profile}
              selectedId={view.mailId}
              onSelect={(mailId) => setView({ app: 'mail', mailId })}
              onMarkRead={onMarkRead}
              onOpenTask={openTask}
              onOpenCareer={() => setView({ app: 'career' })}
            />
          )}
          {view.app === 'tasks' && (
            <TasksApp
              profile={profile}
              selectedId={view.assignmentId}
              onSelect={openTask}
              onOpenWorkbook={openAssignmentWorkbook}
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
          {view.app === 'career' && <CareerApp profile={profile} />}
        </main>
      </div>
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
