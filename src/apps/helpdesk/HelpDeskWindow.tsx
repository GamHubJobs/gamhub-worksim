/**
 * An open ticket queue: the Help Desk inside the shared document window, with
 * the task pane and submitting the work for a task.
 */
import { Suspense, useEffect, useRef, useState } from 'react'
import type { Career, SubmissionResult } from '../../app/useCareer'
import { getAssignment } from '../../content/assignments'
import { getPerson } from '../../content/departments'
import { TicketsContentSchema } from '../../persistence/schemas'
import { DocumentFrame } from '../shared/DocumentFrame'
import { useSavedDocument } from '../shared/useSavedDocument'
import { AssignmentPane } from '../sheets/ui/AssignmentPane'
import { SubmissionResults } from '../tasks/SubmissionResults'
import { TicketsEditor } from './TicketsEditor'
import { absoluteTime, formatTime, weekdayName } from '../../game/clock'
import {
  applyEnvironmentChange,
  disruptionsOf,
  SYSTEM_NAMES,
  type Moment,
  type SystemId,
} from '../../game/incidents'
import type {
  Disruption,
  TicketActivity,
  TicketsContent,
} from '../../persistence/schemas'
import { getWorkspace } from '../../tools/ui'
import { companyItops } from '../../tools/itops/data'
import { deliverDue } from '../../tools/itops/model'
import { deviceByName, onNetwork } from '../../tools/network/simulation'
import { Icon, type IconName } from '../../ui/Icon'
import { KnowledgeBasePanel } from './KnowledgeBasePanel'
import { OverviewPanel } from './OverviewPanel'
import { ReportsPanel } from './ReportsPanel'
import { arrivedTickets } from '../../game/sla'
import { presenceOf } from '../../game/presence'

interface HelpDeskWindowProps {
  documentId: string
  /** The task the queue belongs to. */
  assignmentId: string | null
  career: Career
  /** Per tool ID: its sections still locked for the player. */
  lockedSections?: Record<string, Record<string, string>>
  onBack: () => void
  onOpenTask: (assignmentId: string) => void
}

type Tab =
  | 'overview'
  | 'queue'
  | 'knowledge'
  | 'reports'
  | 'remote'
  | 'voicemail'
  | 'calls'
  | ToolTab
  | SystemId

/** The Tools menu: the shared IT estate (IT Operations), always available. */
const TOOL_GROUPS: Array<{
  name: string
  items: Array<{ section: string; label: string; icon: IconName }>
}> = [
  {
    name: 'Infrastructure',
    items: [
      { section: 'server-room', label: 'Server Room', icon: 'server' },
      { section: 'deployment', label: 'Computer Deployment', icon: 'desktop' },
      { section: 'shelf', label: 'PC Shelf', icon: 'storage' },
      { section: 'repair', label: 'Repair Bench', icon: 'settings' },
    ],
  },
  {
    name: 'Email',
    items: [
      { section: 'mail-admin', label: 'Mail Admin', icon: 'mail' },
      { section: 'mail-security', label: 'Mail Security', icon: 'shield' },
    ],
  },
  {
    name: 'Asset management',
    items: [
      { section: 'assets', label: 'Asset Management', icon: 'device' },
      { section: 'ship', label: 'Ship Manager', icon: 'send' },
    ],
  },
]
type ToolTab = `tool:${string}`
const isToolTab = (tab: string): tab is ToolTab => tab.startsWith('tool:')

const SYSTEM_ICONS: Record<SystemId, IconName> = {
  network: 'network',
  directory: 'directory',
  devices: 'device',
  comms: 'chat',
  soc: 'shield',
  itops: 'server',
}

/** Now, for ticket histories: the real time and the office clock. */
function officeMoment(work?: { day: number; minute: number }): Moment {
  return {
    at: Date.now(),
    time: work
      ? `${weekdayName(work.day)} (day ${work.day}), ${formatTime(work.minute)}`
      : '',
    ...(work ? { office: absoluteTime(work.day, work.minute) } : {}),
  }
}

/**
 * Whether a computer can be reached for remote support: with Network Tools in
 * the queue, it must be up and on the network there; otherwise its own status
 * (Devices) decides.
 */
function reachableIn(content: TicketsContent): ((device: string) => boolean) | undefined {
  const network = content.environment?.network
  if (!network) return undefined
  return (name) => {
    const device = deviceByName(network, name)
    return !device || (device.up && onNetwork(network, device))
  }
}

/** The tickets about a device or account (named in their conditions). */
function relatedTickets(content: TicketsContent, entity: string) {
  return content.tickets
    .filter((t) =>
      t.conditions.some(
        (c) =>
          ('device' in c && c.device === entity) ||
          ('from' in c && c.from === entity) ||
          ('user' in c && c.user === entity),
      ),
    )
    .map((t) => ({
      id: t.id,
      title: t.subject,
      open: t.status !== 'resolved' && t.status !== 'closed',
    }))
}

/** The newest automatic updates to tickets (resolved, reopened), for the bar above. */
function latestUpdates(
  content: TicketsContent,
): Array<TicketActivity & { ticket: string }> {
  return content.tickets
    .flatMap((t) => t.activity.map((entry) => ({ ...entry, ticket: t.id })))
    .filter((entry) => entry.kind === 'resolved' || entry.kind === 'reopened')
    .sort((a, b) => a.at - b.at)
}

export function HelpDeskWindow({
  documentId,
  assignmentId,
  career,
  lockedSections = {},
  onBack,
  onOpenTask,
}: HelpDeskWindowProps) {
  const queue = useSavedDocument(documentId, 'tickets', TicketsContentSchema)
  const { state } = queue
  const assignment = assignmentId ? getAssignment(assignmentId) : undefined
  const profile = career.state.status === 'ready' ? career.state.profile : null
  const progress = assignment ? profile?.assignments[assignment.id] : undefined
  const [paneOpen, setPaneOpen] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const manager = assignment ? getPerson(assignment.from) : null
  const [tab, setTab] = useState<Tab>('queue')
  /** The Knowledge Base article open, and the ticket to show (from the Overview). */
  const [article, setArticle] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | undefined>(undefined)
  const environment = state.status === 'ready' ? state.content.environment : undefined
  const systems = (['network', 'directory', 'devices'] as const).filter(
    (id) => environment?.[id],
  )

  const moment = () => officeMoment(profile?.work)
  /** The office clock now (absolute minutes), for SLAs. */
  const officeNow = profile?.work
    ? absoluteTime(profile.work.day, profile.work.minute)
    : undefined

  // Tickets that changed by themselves since the queue was opened (fixed, or broken again).
  const seen = useRef<number | null>(null)
  const [update, setUpdate] = useState<(TicketActivity & { ticket: string }) | null>(null)
  const content = state.status === 'ready' ? state.content : null
  useEffect(() => {
    if (!content) return
    const updates = latestUpdates(content)
    const newest = updates.at(-1)
    if (seen.current === null) seen.current = newest?.at ?? 0
    else if (newest && newest.at > seen.current) {
      seen.current = newest.at
      setUpdate(newest)
    }
  }, [content])

  // The colleagues held up by the tickets follow the systems (see game/incidents.ts).
  const { syncDisruptions } = career
  const assignmentKey = assignment?.id ?? null
  const hasSystems = !!content?.environment
  const held =
    content && assignmentKey
      ? JSON.stringify(disruptionsOf(content, assignmentKey))
      : null
  // The Tools work on the company's shared estate: a queue that has none gets it.
  const live = state.status === 'ready'
  const needsEstate = live && isToolTab(tab) && !content?.environment?.itops
  const { update: updateQueue } = queue
  useEffect(() => {
    if (needsEstate)
      updateQueue((latest) =>
        latest.environment?.itops
          ? latest
          : {
              ...latest,
              environment: { ...(latest.environment ?? {}), itops: companyItops() },
            },
      )
  }, [needsEstate, updateQueue])

  // Parcels in transit arrive on time, whichever section is open.
  const inTransit = content?.environment?.itops?.shipments.some(
    (s) => s.status === 'in-transit',
  )
  const workRef = useRef(profile?.work)
  useEffect(() => {
    workRef.current = profile?.work
  })
  useEffect(() => {
    if (!inTransit) return
    const timer = setInterval(() => {
      const now = Date.now()
      updateQueue((latest) =>
        applyEnvironmentChange(
          latest,
          'itops',
          (s) => deliverDue(s, now),
          officeMoment(workRef.current),
        ),
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [inTransit, updateQueue])

  useEffect(() => {
    if (held && assignmentKey && hasSystems)
      void syncDisruptions(assignmentKey, JSON.parse(held) as Disruption[])
  }, [held, assignmentKey, hasSystems, syncDisruptions])

  async function submit() {
    if (!assignment) return
    setConfirming(false)
    setSubmitting(true)
    setError(null)
    try {
      if (!(await queue.flush())) {
        throw new Error(
          'Your latest changes could not be saved, so nothing was submitted.',
        )
      }
      setResult(await career.submitAssignment(assignment.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setSubmitting(false)
  }

  return (
    <>
      <DocumentFrame
        documentId={documentId}
        title={state.status === 'ready' ? state.document.title : null}
        controls={queue}
        loadError={state.status === 'error' ? state.message : (error ?? null)}
        loadingText="Opening the ticket queue…"
        onBack={onBack}
        actions={
          assignment && (
            <button
              type="button"
              onClick={() => setPaneOpen((open) => !open)}
              aria-pressed={paneOpen}
              className={`rounded-md border px-3 py-1 text-sm ${
                paneOpen
                  ? 'border-blue-300 bg-blue-50 text-blue-900'
                  : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              Task
            </button>
          )
        }
        sidePanel={
          assignment && paneOpen ? (
            <AssignmentPane
              assignment={assignment}
              playerName={profile?.name ?? ''}
              progress={progress}
              submitting={submitting}
              onToggleStep={(stepId) => void career.toggleStep(assignment.id, stepId)}
              onSubmit={() => setConfirming(true)}
              onShowResults={() => onOpenTask(assignment.id)}
              onClose={() => setPaneOpen(false)}
            />
          ) : undefined
        }
      >
        {(preview) => {
          const shown =
            preview?.kind === 'tickets'
              ? {
                  content: preview.content,
                  live: false,
                  key: `preview-${preview.id}-${preview.rev}`,
                }
              : state.status === 'ready'
                ? {
                    content: state.content,
                    live: true,
                    key: `live-${queue.contentEpoch}`,
                  }
                : null
          if (!shown) return null
          // The system a section shows (Remote Desktop is a section of Devices).
          const system: SystemId | null = isToolTab(tab)
            ? 'itops'
            : tab === 'remote'
              ? 'devices'
              : tab === 'voicemail' || tab === 'calls'
                ? 'comms'
                : tab === 'queue' ||
                    tab === 'overview' ||
                    tab === 'knowledge' ||
                    tab === 'reports'
                  ? null
                  : tab
          const Workspace = system ? getWorkspace(system) : null
          // A read-only earlier version without the estate shows it as it starts.
          const systemState =
            system === 'itops' && !shown.content.environment?.itops && !shown.live
              ? companyItops()
              : system
                ? shown.content.environment?.[system]
                : undefined
          const open = (
            officeNow === undefined
              ? shown.content.tickets
              : arrivedTickets(shown.content, officeNow)
          ).filter((t) => t.status !== 'resolved' && t.status !== 'closed').length
          const groups: Array<{
            name: string
            items: Array<{ id: Tab; label: string; icon: IconName }>
          }> = [
            {
              name: 'Service desk',
              items: [
                { id: 'overview', label: 'Overview', icon: 'dashboard' },
                { id: 'queue', label: 'Ticket queue', icon: 'ticket' },
                { id: 'knowledge', label: 'Knowledge Base', icon: 'guide' },
                { id: 'reports', label: 'Reports', icon: 'chart' },
              ],
            },
            ...(systems.length
              ? [
                  {
                    name: 'Systems',
                    items: systems.flatMap((id) =>
                      id === 'devices'
                        ? [
                            {
                              id: 'devices' as Tab,
                              label: 'Device Management',
                              icon: 'device' as IconName,
                            },
                            {
                              id: 'remote' as Tab,
                              label: 'Remote Desktop',
                              icon: 'remote' as IconName,
                            },
                          ]
                        : [
                            {
                              id: id as Tab,
                              label: SYSTEM_NAMES[id],
                              icon: SYSTEM_ICONS[id],
                            },
                          ],
                    ),
                  },
                ]
              : []),
            ...(shown.content.environment?.comms
              ? [
                  {
                    name: 'Communications',
                    items: [
                      { id: 'comms' as Tab, label: 'Chat', icon: 'chat' as IconName },
                      {
                        id: 'voicemail' as Tab,
                        label: 'Voicemail',
                        icon: 'voicemail' as IconName,
                      },
                      { id: 'calls' as Tab, label: 'Calls', icon: 'phone' as IconName },
                    ],
                  },
                ]
              : []),
            ...TOOL_GROUPS.map((g) => ({
              name: g.name,
              items: g.items.map((i) => ({
                id: `tool:${i.section}` as Tab,
                label: i.label,
                icon: i.icon,
              })),
            })),
            ...(shown.content.environment?.soc
              ? [
                  {
                    name: 'Security',
                    items: [
                      {
                        id: 'soc' as Tab,
                        label: 'Security Console',
                        icon: 'shield' as IconName,
                      },
                    ],
                  },
                ]
              : []),
          ]
          return (
            <div className="flex min-h-0 flex-1" data-testid="deskops">
              <nav
                className="flex w-14 shrink-0 flex-col gap-4 overflow-y-auto bg-slate-900 py-3 text-slate-300 sm:w-52"
                aria-label="Help Desk sections"
              >
                <p className="hidden px-4 text-xs font-semibold tracking-wide text-teal-300 uppercase sm:block">
                  IT operations
                </p>
                <div
                  role="tablist"
                  aria-orientation="vertical"
                  aria-label="Help Desk and the company’s systems"
                  className="flex flex-col gap-4"
                >
                  {groups.map((group) => (
                    <div key={group.name} className="flex flex-col gap-0.5 px-2">
                      <p className="hidden px-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-300 uppercase sm:block">
                        {group.name}
                      </p>
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={tab === item.id}
                          title={
                            item.id === 'queue' && open > 0
                              ? `${item.label} (${open} open)`
                              : item.label
                          }
                          onClick={() => {
                            setTab(item.id)
                            if (item.id === 'knowledge') setArticle(null)
                          }}
                          className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm ${
                            tab === item.id
                              ? 'bg-teal-600/20 font-medium text-white'
                              : 'hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                          <span className="sr-only min-w-0 flex-1 truncate sm:not-sr-only sm:block">
                            {item.label}
                          </span>
                          {item.id === 'queue' && open > 0 && (
                            <span
                              aria-hidden
                              className="hidden rounded-full bg-slate-700 px-1.5 text-xs text-slate-100 sm:inline"
                            >
                              {open}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </nav>
              <div className="flex min-w-0 flex-1 flex-col">
                {update && (
                  <p
                    role="status"
                    className={`flex shrink-0 items-center gap-2 border-b px-4 py-1.5 text-sm ${
                      update.kind === 'resolved'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                    title={`${update.ticket}: ${update.text}`}
                    data-testid="ticket-update"
                  >
                    <Icon
                      name={update.kind === 'resolved' ? 'check' : 'alert'}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0 truncate">
                      {update.ticket}: {update.text}
                    </span>
                  </p>
                )}
                {tab === 'overview' ? (
                  <OverviewPanel
                    officeNow={officeNow}
                    content={shown.content}
                    assignmentId={assignment?.id ?? null}
                    onOpenTicket={(id) => {
                      setFocus(id)
                      setTab('queue')
                    }}
                  />
                ) : tab === 'reports' ? (
                  <ReportsPanel
                    profile={profile}
                    current={shown.content}
                    currentTitle={assignment?.title ?? 'This queue'}
                    now={officeNow ?? 0}
                  />
                ) : tab === 'knowledge' ? (
                  <KnowledgeBasePanel
                    taskArticles={shown.content.knowledge}
                    bookmarks={profile?.work.kbBookmarks ?? []}
                    onToggleBookmark={(id) => void career.toggleBookmark(id)}
                    openArticle={article}
                    onOpenArticle={setArticle}
                  />
                ) : !system || !Workspace || !systemState ? (
                  isToolTab(tab) ? (
                    <p className="p-6 text-sm text-slate-600">
                      Opening the company’s IT estate…
                    </p>
                  ) : (
                    <TicketsEditor
                      key={`${shown.key}-${focus ?? ''}`}
                      content={shown.content}
                      readOnly={!shown.live}
                      onUpdate={shown.live ? queue.update : undefined}
                      moment={moment}
                      initialTicket={focus}
                      officeNow={officeNow}
                      onOpenArticle={(id) => {
                        setArticle(id)
                        setTab('knowledge')
                      }}
                    />
                  )
                ) : (
                  <Suspense
                    fallback={
                      <p className="p-6 text-sm text-slate-600">
                        Opening {SYSTEM_NAMES[system]}…
                      </p>
                    }
                  >
                    <Workspace
                      key={`${shown.key}-${tab}`}
                      state={systemState}
                      readOnly={!shown.live}
                      lockedSections={lockedSections[system] ?? {}}
                      now={() => moment().at}
                      initialSection={
                        isToolTab(tab)
                          ? tab.slice(5)
                          : tab === 'remote' || tab === 'voicemail' || tab === 'calls'
                            ? tab
                            : undefined
                      }
                      onOpenSection={(section) => setTab(`tool:${section}`)}
                      tickets={shown.content.tickets.map((t) => ({
                        id: t.id,
                        title: t.subject,
                        open: t.status !== 'closed',
                      }))}
                      presence={(person) =>
                        presenceOf(
                          person,
                          profile?.work.day ?? 1,
                          profile?.work.minute ?? 540,
                        )
                      }
                      officeTime={() =>
                        profile?.work ? formatTime(profile.work.minute) : ''
                      }
                      reachable={reachableIn(shown.content)}
                      related={(entity) => relatedTickets(shown.content, entity)}
                      onUpdate={
                        shown.live
                          ? (change) => {
                              const when = moment()
                              queue.update((latest) =>
                                applyEnvironmentChange(
                                  latest,
                                  system,
                                  // The tool changes its own state; the tickets react to it.
                                  change,
                                  when,
                                ),
                              )
                            }
                          : undefined
                      }
                    />
                  </Suspense>
                )}
              </div>
            </div>
          )
        }}
      </DocumentFrame>

      {confirming && assignment && manager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-tickets-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2
              id="submit-tickets-title"
              className="text-lg font-semibold text-slate-900"
            >
              Submit your work to {manager.name.split(' ')[0]}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              The queue is checked straight away and you get feedback. A copy is kept in
              Version history, and you can improve your work and submit again.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Not yet
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => void submit()}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {result && assignment && (
        <SubmissionResults
          assignment={assignment}
          result={result}
          closeLabel="Back to the queue"
          onClose={() => setResult(null)}
          onOpenTask={(id) => {
            setResult(null)
            onOpenTask(id)
          }}
        />
      )}
    </>
  )
}
