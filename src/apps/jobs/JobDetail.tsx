/** One advert in full: the facts, how it fits the player, getting ready, and tracking it. */
import { useMemo, useState } from 'react'
import { coverLetter, interviewQuestions, type PlayerFacts } from '../../jobs/documents'
import { countryName } from '../../jobs/geo'
import { compareSkills } from '../../jobs/match'
import { providerOf } from '../../jobs/providers'
import type { JobListing } from '../../jobs/types'
import {
  STATUS_NAMES,
  todayIso,
  type CvDetails,
  type JobChange,
  type JobStatus,
  type SavedJob,
} from '../../game/jobs'
import { Icon } from '../../ui/Icon'
import { EMPLOYMENT_NAMES, LEVEL_NAMES, dayName, postedAgo, whereText } from './format'
import { Logo } from './parts'

export function JobDetail({
  listing,
  saved,
  player,
  cv,
  onBack,
  onSave,
  onRemove,
  onChange,
  onKeepLetter,
}: {
  listing: JobListing
  saved?: SavedJob
  player: PlayerFacts
  cv: CvDetails
  onBack: () => void
  onSave: () => void
  onRemove: () => void
  onChange: (change: JobChange) => void
  /** Keeps a cover letter with the job (saving the job first if need be). */
  onKeepLetter: (letter: string) => void
}) {
  const source = providerOf(listing.provider)
  const fit = useMemo(() => compareSkills(listing, player), [listing, player])
  const [tool, setTool] = useState<'letter' | 'interview' | null>(null)
  const [openedAt] = useState(() => Date.now())
  const old = (openedAt - (Date.parse(listing.posted) || openedAt)) / 86_400_000 > 30
  const facts: Array<[string, string]> = [
    ['Where', whereText(listing)],
    ...(listing.countries.length && listing.arrangement !== 'remote'
      ? ([['Country', listing.countries.map(countryName).join(', ')]] as Array<
          [string, string]
        >)
      : []),
    ['Pay', listing.salary?.text ?? 'Not stated in the advert'],
    [
      'Type',
      listing.employment.map((e) => EMPLOYMENT_NAMES[e]).join(', ') || 'Not stated',
    ],
    ['Level', listing.level ? LEVEL_NAMES[listing.level] : 'Not stated'],
    [
      'Published',
      `${postedAgo(listing.posted)}${listing.posted ? ` (${new Date(listing.posted).toLocaleDateString('en-GB')})` : ''}`,
    ],
    ...(listing.deadline
      ? ([['Closing date', listing.deadline.slice(0, 10)]] as Array<[string, string]>)
      : []),
    ['Source', source.name],
  ]

  return (
    <article
      className="mx-auto max-w-4xl space-y-4 p-6"
      data-testid="job-detail"
      data-job={listing.id}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-blue-700 hover:underline"
      >
        <Icon name="back" className="h-4 w-4" /> Back
      </button>

      <header className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <Logo listing={listing} size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900">{listing.title}</h1>
          <p className="text-slate-700">{listing.company}</p>
          <p className="mt-1 text-sm text-slate-500">{whereText(listing)}</p>
          {saved?.closed && (
            <p
              className="mt-2 rounded-md bg-red-50 px-2 py-1 text-sm text-red-800"
              role="status"
            >
              {source.name} says this advert has closed. It is kept here with your notes.
            </p>
          )}
          {!saved?.closed && old && (
            <p className="mt-2 text-sm text-amber-700">
              Published over a month ago: check on the advert that it is still open.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener"
            className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
            data-testid="apply-link"
          >
            View and apply on {source.name} ↗
          </a>
          <button
            type="button"
            onClick={saved ? onRemove : onSave}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm ring-1 ring-slate-300 hover:bg-slate-50"
          >
            <Icon name="bookmark" className="h-4 w-4" />{' '}
            {saved ? 'Remove from saved' : 'Save'}
          </button>
        </div>
      </header>
      <p className="text-xs text-slate-500">
        The advert opens on {source.name}, its source, in a new tab. You read it in full
        there and apply through the employer’s own process: GamHub WorkSim never applies
        for you or sends your details anywhere.
      </p>

      {saved && <Tracking saved={saved} onChange={onChange} />}

      <section className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <dl className="grid grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1.5 self-start rounded-xl border border-slate-200 bg-white p-4 text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
        <section
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
          aria-label="How it fits you"
          data-testid="job-fit"
        >
          <h2 className="font-semibold text-slate-900">How it fits you</h2>
          {fit.practised.length > 0 && (
            <>
              <h3 className="mt-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
                You have practised (in the simulation)
              </h3>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {fit.practised.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 ring-1 ring-emerald-200"
                  >
                    {s.name} · {s.level.toLowerCase()}
                  </li>
                ))}
              </ul>
            </>
          )}
          {fit.toPractise.length > 0 && (
            <>
              <h3 className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase">
                Not practised yet
              </h3>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
                {fit.toPractise.map((s) => (
                  <li key={s.id}>
                    {s.name}
                    {s.careers.length > 0 && (
                      <span className="text-slate-500">
                        {' '}
                        (practised in {s.careers.join(', ')})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {(fit.real.length > 0 || fit.experience.length > 0) && (
            <>
              <h3 className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase">
                The advert also asks for
              </h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-700">
                {fit.real.map((r) => (
                  <li key={r}>{r}</li>
                ))}
                {fit.experience.map((r) => (
                  <li key={r}>Experience: “{r}”</li>
                ))}
              </ul>
            </>
          )}
          {!fit.practised.length &&
            !fit.toPractise.length &&
            !fit.real.length &&
            !fit.experience.length && (
              <p className="mt-2 text-slate-600">
                The advert does not list skills the game recognises. Read it in full on{' '}
                {source.name}.
              </p>
            )}
          <p className="mt-3 text-xs text-slate-500">
            What you practise in GamHub WorkSim is practice in a simulation. It is not
            work experience, a qualification or a certificate, and employers will not see
            it as one: describe it honestly as practice if you mention it.
          </p>
        </section>
      </section>

      <nav className="flex gap-2" aria-label="Getting ready">
        <button
          type="button"
          onClick={() => setTool(tool === 'letter' ? null : 'letter')}
          aria-expanded={tool === 'letter'}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Write a cover letter
        </button>
        <button
          type="button"
          onClick={() => setTool(tool === 'interview' ? null : 'interview')}
          aria-expanded={tool === 'interview'}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Practise for the interview
        </button>
      </nav>
      {tool === 'letter' && (
        <Letter
          listing={listing}
          saved={saved}
          player={player}
          cv={cv}
          onKeep={onKeepLetter}
        />
      )}
      {tool === 'interview' && <Interview listing={listing} player={player} />}

      <section
        className="rounded-xl border border-slate-200 bg-white p-5"
        aria-label="The advert"
      >
        <h2 className="font-semibold text-slate-900">The advert</h2>
        <p className="mt-1 text-xs text-slate-500">
          As {source.name} gives it
          {listing.provider === 'adzuna'
            ? ' (the start of the advert: the rest is on its page)'
            : ''}
          .
        </p>
        <div className="mt-3 text-sm leading-relaxed whitespace-pre-line text-slate-800">
          {listing.description || 'No description given: read the advert on its page.'}
        </div>
      </section>
    </article>
  )
}

const STATUSES = Object.keys(STATUS_NAMES) as JobStatus[]

/** How the application stands, as the player records it. */
function Tracking({
  saved,
  onChange,
}: {
  saved: SavedJob
  onChange: (c: JobChange) => void
}) {
  // Notes being typed, until they are kept (on leaving the box).
  const [typing, setTyping] = useState<{ of: string; text: string } | null>(null)
  const notes = typing && typing.of === saved.notes ? typing.text : saved.notes
  const setNotes = (text: string) => setTyping({ of: saved.notes, text })
  const field = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm'
  return (
    <section
      className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm md:grid-cols-4"
      aria-label="Your application"
      data-testid="job-tracking"
    >
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Where it stands
        <select
          className={field}
          value={saved.status}
          onChange={(e) => onChange({ status: e.target.value as JobStatus })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_NAMES[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Applied on
        <input
          type="date"
          className={field}
          value={saved.appliedOn ?? ''}
          max={todayIso()}
          onChange={(e) => onChange({ appliedOn: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Remind me on
        <input
          type="date"
          className={field}
          value={saved.remindOn ?? ''}
          onChange={(e) =>
            onChange({
              remindOn: e.target.value,
              ...(e.target.value && !saved.remindWhat
                ? {
                    remindWhat:
                      saved.status === 'applied' ? 'Follow up' : 'Apply before it closes',
                  }
                : {}),
            })
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Reminder for
        <input
          className={field}
          value={saved.remindWhat ?? ''}
          maxLength={120}
          disabled={!saved.remindOn}
          placeholder="Follow up, closing date…"
          onChange={(e) => onChange({ remindWhat: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-700 md:col-span-4">
        <input
          type="checkbox"
          checked={saved.shortlisted}
          onChange={(e) => onChange({ shortlisted: e.target.checked })}
        />{' '}
        On my shortlist
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600 md:col-span-4">
        Notes
        <textarea
          className={`${field} min-h-[4rem]`}
          value={notes}
          maxLength={4000}
          placeholder="Who to contact, what to mention, how it went…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== saved.notes && onChange({ notes })}
        />
      </label>
      {saved.appliedOn && (
        <p className="text-xs text-slate-500 md:col-span-4">
          You recorded applying on {dayName(saved.appliedOn)}.
        </p>
      )}
    </section>
  )
}

function Letter({
  listing,
  saved,
  player,
  cv,
  onKeep,
}: {
  listing: JobListing
  saved?: SavedJob
  player: PlayerFacts
  cv: CvDetails
  onKeep: (letter: string) => void
}) {
  const draft = useMemo(() => coverLetter(listing, cv, player), [listing, cv, player])
  const [text, setText] = useState(saved?.letter ?? draft)
  const [note, setNote] = useState('')
  const keep = () => {
    onKeep(text)
    setNote(saved ? 'Kept with this saved job.' : 'The job is saved, with this letter.')
  }
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4"
      aria-label="Cover letter"
      data-testid="cover-letter"
    >
      <h2 className="font-semibold text-slate-900">Cover letter</h2>
      <p className="mt-1 text-xs text-slate-600">
        A first draft from the advert and your CV details. Fill in the parts in [square
        brackets] with real things you have done, read it through, and change anything
        that is not true or not you.
      </p>
      <textarea
        className="mt-2 min-h-[18rem] w-full rounded-md border border-slate-300 p-3 font-serif text-sm leading-relaxed"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Cover letter text"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={keep}
          className="rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800"
        >
          Keep this letter
        </button>
        <CopyButton text={text} label="Copy the letter" />
        <button
          type="button"
          onClick={() => setText(draft)}
          className="rounded-md px-3 py-1.5 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Start again from the draft
        </button>
        <span role="status" className="text-xs text-emerald-700">
          {note}
        </span>
      </div>
    </section>
  )
}

function Interview({ listing, player }: { listing: JobListing; player: PlayerFacts }) {
  const questions = useMemo(() => interviewQuestions(listing, player), [listing, player])
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
      aria-label="Interview practice"
      data-testid="interview-practice"
    >
      <h2 className="font-semibold text-slate-900">Practise for the interview</h2>
      <p className="mt-1 text-xs text-slate-600">
        Questions an interviewer might ask for this job. Answer each one aloud with a real
        example: what the situation was, what you did, and how it turned out.
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-800">
        {questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-500">
        For a full practice interview in the game, apply to one of the game’s employers in
        the evening at home (Career), then go to your interview at Harbourside House.
        Those employers are part of the simulation.
      </p>
    </section>
  )
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void globalThis.navigator?.clipboard?.writeText(text).then(
          () => {
            setDone(true)
            setTimeout(() => setDone(false), 2000)
          },
          () => {},
        )
      }}
      className="rounded-md px-3 py-1.5 ring-1 ring-slate-300 hover:bg-slate-50"
    >
      {done ? 'Copied' : label}
    </button>
  )
}
