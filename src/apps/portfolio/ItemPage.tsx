/**
 * One piece of work in the portfolio: what was asked, how it was graded and
 * why, every attempt, and the files exactly as they were handed in.
 */
import { useEffect, useRef, useState } from 'react'
import { getCareer, getSkill } from '../../content/careers'
import { toolName } from '../../game/portfolio'
import { formatDateTime } from '../../lib/time'
import {
  loadPortfolioFiles,
  updatePortfolioPresentation,
  type PresentationChange,
} from '../../persistence/portfolio'
import type { PortfolioFile, PortfolioItem } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'
import { EvidenceViewer } from './EvidenceViewer'

const RATINGS = { excellent: 'Excellent', good: 'Good', pass: 'Pass' } as const

const ROLE_NAMES = {
  main: 'Main file',
  report: 'Report',
  presentation: 'Presentation',
} as const

const STATUS = {
  passed: { label: 'Passed', className: 'text-emerald-700' },
  partial: { label: 'Partly done', className: 'text-amber-700' },
  failed: { label: 'Not done', className: 'text-red-700' },
} as const

export function ItemPage({
  item,
  saveName,
  onBack,
  onChanged,
}: {
  item: PortfolioItem
  /** The career save it belongs to, e.g. "Alex · Accounting". */
  saveName: string
  onBack: () => void
  onChanged: (item: PortfolioItem) => void
}) {
  const [files, setFiles] = useState<PortfolioFile[] | null>(null)
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [note, setNote] = useState(item.note)
  // Shown straight away; saved in the background, one change after another.
  const [shownAs, setShownAs] = useState({
    included: item.included,
    featured: item.featured,
  })
  const saving = useRef<Promise<unknown>>(Promise.resolve())
  const [error, setError] = useState<string | null>(null)
  // The files change only when better work replaces the evidence.
  const fileIds = item.files.map((f) => f.fileId).join()

  useEffect(() => {
    let active = true
    loadPortfolioFiles(item).then(
      (loaded) => active && setFiles(loaded),
      (e: unknown) => active && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      active = false
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reload only when the files change
  }, [item.id, fileIds])

  function change(presentation: PresentationChange) {
    if (presentation.included !== undefined || presentation.featured !== undefined) {
      setShownAs((current) => ({ ...current, ...presentation }))
    }
    saving.current = saving.current.then(async () => {
      try {
        onChanged(await updatePortfolioPresentation(item.id, presentation))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  const shown = files?.find((f) => f.id === openFile)
  const career = getCareer(item.careerId)

  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid="portfolio-item-page">
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-blue-700 hover:underline"
        >
          <Icon name="back" className="h-4 w-4" /> All work
        </button>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">
            {career.name} · {item.levelTitle} · {saveName}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900">{item.title}</h1>
            <span
              className="shrink-0 text-2xl font-bold text-emerald-700"
              data-testid="item-score"
            >
              {item.score}%
            </span>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
              Completed (passed)
            </span>
            <span className="text-slate-600">
              {RATINGS[item.rating]} · pass mark {item.passScore}% · completed{' '}
              {formatDateTime(item.completedAt)}
            </span>
          </p>
          <p className="mt-3 text-slate-700">{item.summary}</p>
          {item.objectives.length > 0 && (
            <>
              <h2 className="mt-4 font-semibold text-slate-900">What was asked</h2>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {item.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">What this demonstrates</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.keys(item.skills).map((id) => (
              <span
                key={id}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800"
              >
                {getSkill(id)?.name ?? id}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Done in {item.tools.map(toolName).join(', ')}.
          </p>
        </section>

        <section
          className="rounded-xl border border-slate-200 bg-white p-6"
          aria-labelledby="item-checks"
        >
          <h2 id="item-checks" className="font-semibold text-slate-900">
            How it was checked
          </h2>
          <ul className="mt-3 space-y-3" data-testid="item-checks">
            {item.checks.map((check) => (
              <li key={check.id} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-slate-900">{check.title}</span>
                  <span className={`shrink-0 ${STATUS[check.status].className}`}>
                    {STATUS[check.status].label} · {check.earned}/{check.points}
                  </span>
                </div>
                {check.why && <p className="text-slate-600">{check.why}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Files handed in</h2>
          <p className="mt-1 text-sm text-slate-600">
            Copies kept exactly as you submitted them. Changing your working files later
            does not change these.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.files.map((file) =>
              file.available ? (
                <button
                  key={file.fileId}
                  type="button"
                  aria-pressed={openFile === file.fileId}
                  onClick={() =>
                    setOpenFile(openFile === file.fileId ? null : file.fileId)
                  }
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                    openFile === file.fileId
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon name="file" className="h-4 w-4" />
                  {ROLE_NAMES[file.role]}: {file.title}
                </button>
              ) : (
                <span
                  key={file.fileId}
                  className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500"
                >
                  {ROLE_NAMES[file.role]}: {file.title} (not available: this copy was
                  removed before the portfolio existed)
                </span>
              ),
            )}
          </div>
          {openFile && (
            <div
              className="mt-4 h-[70vh] overflow-hidden rounded-lg border border-slate-300 bg-white"
              data-testid="evidence-viewer"
            >
              {shown ? (
                <EvidenceViewer document={shown.snapshot} />
              ) : (
                <p className="p-6 text-sm text-slate-600">Opening the file…</p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Attempts</h2>
          <ol
            className="mt-2 space-y-1 text-sm text-slate-700"
            data-testid="item-attempts"
          >
            {item.attempts.map((attempt, index) => (
              <li key={attempt.submittedAt}>
                Attempt {index + 1}: {attempt.score}% on{' '}
                {formatDateTime(attempt.submittedAt)}
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">How it is shown</h2>
          <p className="text-sm text-slate-600">
            These choices change only how this work is presented, never the results.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shownAs.included}
              onChange={(e) => change({ included: e.target.checked })}
            />
            Include in my portfolio exports
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shownAs.featured}
              onChange={(e) => change({ featured: e.target.checked })}
            />
            Feature this work (shown first)
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Your note</span>
            <textarea
              value={note}
              maxLength={600}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== item.note && change({ note })}
              placeholder="What you did, what you learnt, what you would do differently."
              className="mt-1 w-full rounded-md border border-slate-300 p-2"
            />
            <span className="text-xs text-slate-500">{note.length}/600</span>
          </label>
          {error && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
