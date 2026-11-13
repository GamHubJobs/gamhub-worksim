/**
 * Hands-on IT work, in person: after walking up to equipment in the office
 * and pressing E, the view closes in on it (a zoom over the office, which
 * stays where it was underneath) and the technical simulation opens on the
 * same ticket queue the Help Desk uses:
 *
 * - the comms cabinet (power-cycle a hung device);
 * - the IT workbench (build a computer, or repair a collected laptop);
 * - a colleague's desk (collect their faulty laptop for the bench, or hand
 *   it back once it is proven, which resolves their ticket).
 *
 * Every change goes through applyEnvironmentChange, so tickets resolve, the
 * colleague reacts, and the office's IT jobs update. Esc or "Step back"
 * returns to the office exactly where the player stood.
 */
import { lazy, Suspense, useEffect, useState } from 'react'
import { useSavedDocument } from '../apps/shared/useSavedDocument'
import { absoluteTime, formatTime, weekdayName } from '../game/clock'
import { fieldJobsOf } from '../game/fieldJobs'
import { applyEnvironmentChange, disruptionsOf, type Moment } from '../game/incidents'
import {
  TicketsContentSchema,
  type Disruption,
  type FieldJob,
  type TicketsContent,
} from '../persistence/schemas'
import { companyItops } from '../tools/itops/data'
import { assetByTag } from '../tools/itops/model'
import { bookIn, finishRepair, jobFor } from '../tools/itops/repair'
import type { ItopsState } from '../tools/itops/schema'
import { Icon } from '../ui/Icon'
import { useCurrentAppHint } from '../guide/appHints'

const ItopsWorkspace = lazy(() => import('../tools/itops/ItopsWorkspace'))

export type OnSitePlace = 'cabinet' | 'bench' | `desk:${string}`

export interface OnSiteSync {
  syncFieldJobs: (assignmentId: string, jobs: FieldJob[]) => Promise<void>
  syncDisruptions: (assignmentId: string, entries: Disruption[]) => Promise<void>
}

const TITLES: Record<string, string> = {
  cabinet: 'Comms cabinet',
  bench: 'IT workbench',
}

export function OnSiteWork({
  place,
  documentId,
  assignmentId,
  personName,
  work,
  sync,
  onClose,
}: {
  place: OnSitePlace
  documentId: string
  assignmentId: string
  /** For a desk: the colleague's name. */
  personName: string
  work: { day: number; minute: number }
  sync?: OnSiteSync
  onClose: () => void
}) {
  const queue = useSavedDocument(documentId, 'tickets', TicketsContentSchema)
  // The next step from the close-up itself (state-aware: see guide/stepHints.ts).
  const hint = useCurrentAppHint()
  const { state, update, flush } = queue
  const [leaving, setLeaving] = useState(false)
  const [benchChoice, setBench] = useState<'repair' | 'deployment' | null>(null)
  const [said, setSaid] = useState<string | null>(null)
  const content = state.status === 'ready' ? state.content : null

  const moment = (): Moment => ({
    at: Date.now(),
    time: `${weekdayName(work.day)} (day ${work.day}), ${formatTime(work.minute)}`,
    office: absoluteTime(work.day, work.minute),
  })

  // The estate is there even for a queue that never had it (as in the Help Desk).
  useEffect(() => {
    if (content && !content.environment?.itops)
      update((latest) =>
        latest.environment?.itops
          ? latest
          : {
              ...latest,
              environment: { ...(latest.environment ?? {}), itops: companyItops() },
            },
      )
  }, [content, update])

  // The office follows: its IT jobs, and the colleagues held up or back to work.
  const jobsKey = content
    ? JSON.stringify(fieldJobsOf(content, assignmentId, documentId))
    : null
  const heldKey = content ? JSON.stringify(disruptionsOf(content, assignmentId)) : null
  const syncJobs = sync?.syncFieldJobs
  const syncHeld = sync?.syncDisruptions
  const hasEnvironment = !!content?.environment
  useEffect(() => {
    if (jobsKey) void syncJobs?.(assignmentId, JSON.parse(jobsKey) as FieldJob[])
  }, [jobsKey, assignmentId, syncJobs])
  useEffect(() => {
    if (heldKey && hasEnvironment)
      void syncHeld?.(assignmentId, JSON.parse(heldKey) as Disruption[])
  }, [heldKey, assignmentId, syncHeld, hasEnvironment])

  // A repair waiting on the bench opens there; otherwise the build.
  const itops = content?.environment?.itops
  const repairing = (itops?.repairs.length ?? 0) > 0
  const bench = benchChoice ?? (repairing ? 'repair' : 'deployment')

  const change = (fn: (s: ItopsState) => ItopsState) =>
    update((latest: TicketsContent) =>
      applyEnvironmentChange(latest, 'itops', fn, moment()),
    )

  // The close-up has the whole view: the HUD steps aside while it is open.
  useEffect(() => {
    document.body.dataset.onsite = '1'
    return () => {
      delete document.body.dataset.onsite
    }
  }, [])

  function close() {
    setLeaving(true)
    void flush().finally(() => window.setTimeout(onClose, 220))
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const desk = place.startsWith('desk:')
  const first = personName.split(' ')[0]
  // The laptop this colleague is waiting on (from their ticket).
  const deskJob = desk
    ? content?.tickets.find(
        (t) =>
          t.requester === place.slice(5) &&
          t.status !== 'resolved' &&
          t.status !== 'closed' &&
          t.conditions.some((c) => c.type === 'hardware-ok'),
      )
    : undefined
  const tag = deskJob?.conditions.find((c) => c.type === 'hardware-ok')
  const laptop = tag && 'tag' in tag && itops ? assetByTag(itops, tag.tag) : undefined
  const job = laptop && itops ? jobFor(itops, laptop.tag) : undefined
  const ready =
    !!job &&
    job.verified &&
    !job.coverOff &&
    job.screwsOut.length === 0 &&
    job.batteryConnected

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col bg-slate-950/70 backdrop-blur-sm ${leaving ? 'onsite-out' : 'onsite-in'}`}
      role="dialog"
      aria-modal="true"
      aria-label={desk ? `At ${first}’s desk` : TITLES[place]}
      data-testid="onsite"
      data-place={place}
    >
      <style>{`
        @keyframes onsite-in { from { opacity: 0; transform: scale(0.82); filter: blur(6px) } to { opacity: 1; transform: none; filter: none } }
        @keyframes onsite-out { to { opacity: 0; transform: scale(0.9) } }
        .onsite-in { animation: onsite-in 280ms cubic-bezier(.2,.8,.2,1) both }
        .onsite-out { animation: onsite-out 220ms ease-in both }
        @media (prefers-reduced-motion: reduce) { .onsite-in, .onsite-out { animation: none } }
      `}</style>
      <header className="flex shrink-0 items-center gap-3 bg-slate-900 px-4 py-2 text-sm text-slate-100">
        <Icon
          name={place === 'cabinet' ? 'server' : desk ? 'user' : 'settings'}
          className="h-5 w-5 text-teal-300"
        />
        <span className="font-semibold">{desk ? `${first}’s desk` : TITLES[place]}</span>
        <span className="text-slate-400">In person, in the office</span>
        {hint && (
          <span
            className="ml-3 min-w-0 truncate rounded bg-amber-400/15 px-2 py-0.5 text-amber-100"
            data-testid="onsite-hint"
            title={hint.detail ?? hint.text}
          >
            Next: {hint.text}
          </span>
        )}
        {place === 'bench' && (
          <span className="ml-4 flex gap-1" role="tablist" aria-label="At the bench">
            {(
              [
                ['repair', 'Repair'],
                ['deployment', 'Build'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={bench === id}
                onClick={() => setBench(id)}
                className={`rounded px-2.5 py-0.5 ${bench === id ? 'bg-teal-600 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </span>
        )}
        <button
          type="button"
          onClick={close}
          className="ml-auto rounded bg-slate-700 px-3 py-1 hover:bg-slate-600"
        >
          Step back to the office (Esc)
        </button>
      </header>

      {!content ? (
        <p className="m-auto text-slate-200">Getting to it…</p>
      ) : desk ? (
        <div
          className="m-auto w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl"
          data-testid="desk-visit"
        >
          {!laptop ? (
            <p className="text-sm text-slate-700">
              Nothing of {first}’s needs IT right now.
            </p>
          ) : !job ? (
            <>
              <p className="font-semibold text-slate-900">
                {first}’s laptop · {laptop.tag}{' '}
                {laptop.hostname ? `(${laptop.hostname})` : ''}
              </p>
              <p className="mt-2 text-sm text-slate-700">“{deskJob?.body}”</p>
              <p className="mt-2 text-sm text-slate-600">
                Take it to the IT workbench to test and repair it. Tell {first} how long
                it should take.
              </p>
              <button
                type="button"
                className="mt-4 rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
                onClick={() => {
                  change((s) => bookIn(s, laptop.tag).state)
                  setSaid(
                    `${first}: “Thanks, I’ll use the spare desk PC until it’s back.”`,
                  )
                }}
              >
                Take it to the workbench
              </button>
            </>
          ) : ready ? (
            <>
              <p className="font-semibold text-slate-900">
                {laptop.tag} is fixed and proven
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Plug it in on {first}’s desk, start it with them, and explain what was
                wrong.
              </p>
              <button
                type="button"
                className="mt-4 rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
                onClick={() => {
                  change((s) => finishRepair(s, laptop.tag).state)
                  setSaid(`${first}: “It’s working! Thank you, that was quick.”`)
                }}
              >
                Hand it back
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-700">
              {said ??
                `${laptop.tag} is on the IT workbench. ${first} is waiting for it.`}
            </p>
          )}
          {said && (
            <p
              className="mt-4 rounded-md bg-slate-50 p-2 text-sm text-slate-800"
              data-testid="desk-reply"
              aria-live="polite"
            >
              {said}
            </p>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden bg-slate-50">
          <Suspense fallback={<p className="p-6 text-sm text-slate-600">Opening…</p>}>
            {content.environment?.itops && (
              <ItopsWorkspace
                key={`${place}-${bench}`}
                state={content.environment.itops}
                readOnly={false}
                lockedSections={{}}
                onSite
                initialSection={place === 'cabinet' ? 'cabinet' : bench}
                now={() => Date.now()}
                officeTime={() => formatTime(work.minute)}
                tickets={content.tickets.map((t) => ({
                  id: t.id,
                  title: t.subject,
                  open: t.status !== 'closed',
                }))}
                onUpdate={(fn) =>
                  update((latest) =>
                    applyEnvironmentChange(latest, 'itops', fn, moment()),
                  )
                }
              />
            )}
          </Suspense>
        </div>
      )}
    </div>
  )
}
