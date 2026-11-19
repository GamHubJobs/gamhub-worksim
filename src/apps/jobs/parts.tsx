/** Pieces of the Jobs app: an advert in a list, and which sources answered. */
import { useState } from 'react'
import { PROVIDERS, providerOf } from '../../jobs/providers'
import type { JobListing, SourceStatus } from '../../jobs/types'
import { Icon } from '../../ui/Icon'
import { EMPLOYMENT_NAMES, LEVEL_NAMES, fetchedAgo, postedAgo, whereText } from './format'

/** A company's logo from the advert, or its first letter if there is none (or it fails). */
export function Logo({
  listing,
  size = 'h-10 w-10',
}: {
  listing: JobListing
  size?: string
}) {
  const [failed, setFailed] = useState(false)
  if (listing.logo && !failed)
    return (
      <img
        src={listing.logo}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${size} shrink-0 rounded-md bg-white object-contain ring-1 ring-slate-200`}
      />
    )
  return (
    <span
      aria-hidden
      className={`${size} flex shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-600 ring-1 ring-slate-200`}
    >
      {(listing.company[0] ?? '?').toUpperCase()}
    </span>
  )
}

export function JobCard({
  listing,
  saved,
  why,
  onOpen,
  onSave,
}: {
  listing: JobListing
  saved: boolean
  /** Why it was recommended. */
  why?: string[]
  onOpen: () => void
  onSave: () => void
}) {
  const source = providerOf(listing.provider)
  const facts = [
    ...listing.employment.slice(0, 2).map((e) => EMPLOYMENT_NAMES[e]),
    listing.level ? LEVEL_NAMES[listing.level] : '',
  ].filter(Boolean)
  return (
    <li
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
      data-testid="job-card"
      data-job={listing.id}
    >
      <div className="flex gap-3">
        <Logo listing={listing} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">
            <button
              type="button"
              onClick={onOpen}
              className="text-left hover:text-blue-800 hover:underline"
            >
              {listing.title}
            </button>
          </h3>
          <p className="text-sm text-slate-700">{listing.company}</p>
          <p className="mt-0.5 text-xs text-slate-500">{whereText(listing)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {listing.salary && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-200">
                {listing.salary.text}
              </span>
            )}
            {facts.map((f) => (
              <span
                key={f}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700"
              >
                {f}
              </span>
            ))}
          </div>
          {why && why.length > 0 && (
            <ul
              className="mt-2 flex flex-wrap gap-1.5 text-xs"
              aria-label="Why it is suggested"
            >
              {why.map((w) => (
                <li
                  key={w}
                  className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800 ring-1 ring-blue-100"
                >
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={onSave}
            aria-pressed={saved}
            aria-label={saved ? `Saved: ${listing.title}` : `Save ${listing.title}`}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ${
              saved
                ? 'bg-amber-50 text-amber-800 ring-amber-200'
                : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            <Icon name="bookmark" className="h-3.5 w-3.5" /> {saved ? 'Saved' : 'Save'}
          </button>
          <span className="text-right text-[11px] text-slate-500">
            {postedAgo(listing.posted)}
            <br />
            via{' '}
            <a
              href={source.home}
              target="_blank"
              rel="noopener"
              className="underline hover:text-slate-800"
            >
              {source.name}
            </a>
          </span>
        </div>
      </div>
    </li>
  )
}

const STATE_WORDS: Record<SourceStatus['state'], string> = {
  ok: 'up to date',
  cached: 'from earlier',
  error: 'unavailable',
  skipped: 'not asked',
  waiting: 'still answering…',
}

/** Which sources were asked, how it went, and what each covers. */
export function SourcesLine({ sources }: { sources: SourceStatus[] }) {
  const [open, setOpen] = useState(false)
  if (!sources.length) return null
  const failed = sources.filter((s) => s.state === 'error')
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600"
      aria-label="Sources"
      data-testid="job-sources"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-slate-700">Sources:</span>
        {sources
          .filter((s) => s.state !== 'skipped')
          .map((s) => {
            const p = providerOf(s.provider)
            return (
              <span key={s.provider} data-source={s.provider} data-state={s.state}>
                <a
                  href={p.home}
                  target="_blank"
                  rel="noopener"
                  className="underline hover:text-slate-900"
                >
                  {p.name}
                </a>{' '}
                <span className={s.state === 'error' ? 'text-red-700' : ''}>
                  (
                  {s.state === 'error' || s.state === 'waiting'
                    ? STATE_WORDS[s.state]
                    : `${s.count} adverts, ${s.state === 'cached' ? fetchedAgo(s.fetchedAt) : STATE_WORDS.ok}`}
                  )
                </span>
              </span>
            )
          })}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="ml-auto text-blue-700 hover:underline"
        >
          {open ? 'Hide coverage' : 'What each covers'}
        </button>
      </div>
      {failed.length > 0 && (
        <p className="mt-1 text-red-700" role="status">
          {failed
            .map(
              (s) => `${providerOf(s.provider).name} ${s.note ?? 'could not be read'}.`,
            )
            .join(' ')}{' '}
          The others are shown.
        </p>
      )}
      {open && (
        <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          {PROVIDERS.map((p) => {
            const s = sources.find((x) => x.provider === p.id)
            return (
              <li key={p.id}>
                <span className="font-medium text-slate-700">{p.name}:</span> {p.coverage}
                {s?.state === 'skipped' && (
                  <span className="text-slate-500">
                    {' '}
                    Not asked for this search: {s.note}.
                  </span>
                )}
                {s?.note && s.state !== 'skipped' && s.state !== 'error' && (
                  <span className="text-amber-700"> {s.note}.</span>
                )}
              </li>
            )
          })}
          <li className="text-slate-500">
            Every advert is a real vacancy from the source named on it, shown as that
            source gives it. Pay is shown only when the advert states it. GamHub WorkSim
            never applies for you: you apply on the advert’s own page.
          </li>
        </ul>
      )}
    </section>
  )
}
