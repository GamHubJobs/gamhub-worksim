/**
 * Jobs: real vacancies from public job feeds (see docs/JOBS.md). Suggestions
 * for the player's career where they live, a search with filters, the adverts
 * they saved and how each application stands, and their CV and letters.
 * Every advert links to its original page, where the player applies
 * themselves; nothing is made up, and nothing is sent anywhere for them.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  careerAssignments,
  careerLevel,
  isPassed,
  type ProfileData,
} from '../../game/career'
import {
  STATUS_NAMES,
  asListing,
  dueReminders,
  isSaved,
  markClosed,
  pipeline,
  removeJob,
  saveJob,
  setCv,
  setJobPrefs,
  updateJob,
  type JobStatus,
  type SavedJob,
} from '../../game/jobs'
import { PRACTICE_HEADING, cvText, type PlayerFacts } from '../../jobs/documents'
import { getJson } from '../../jobs/feeds'
import { FIELDS } from '../../jobs/fields'
import { countryList, countryName, guessCountry } from '../../jobs/geo'
import { LocationError, approximateLocation } from '../../jobs/location'
import { fieldOf, levelsFor, recommend } from '../../jobs/match'
import { PROVIDERS } from '../../jobs/providers'
import { adzuna } from '../../jobs/providers/adzuna'
import { closedJobicy, jobicyStatusUrl } from '../../jobs/providers/jobicy'
import { bestFirst, newestFirst } from '../../jobs/search'
import {
  EMPTY_QUERY,
  type Arrangement,
  type EmploymentType,
  type JobListing,
  type JobQuery,
  type Level,
} from '../../jobs/types'
import { Icon } from '../../ui/Icon'
import { JobDetail, CopyButton } from './JobDetail'
import { ARRANGEMENT_NAMES, EMPLOYMENT_NAMES, LEVEL_NAMES, dayName } from './format'
import { JobCard, SourcesLine } from './parts'
import { useJobSearch } from './useJobSearch'

type Act = (change: (p: ProfileData) => ProfileData) => unknown
type Tab = 'foryou' | 'search' | 'saved' | 'cv'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'foryou', label: 'For you' },
  { id: 'search', label: 'Search' },
  { id: 'saved', label: 'Saved' },
  { id: 'cv', label: 'CV & letters' },
]

const PAGE = 20
const field = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm'

export function JobsApp({
  profile,
  act,
  startTab = 'foryou',
  onOpenPortfolio,
}: {
  profile: ProfileData
  act: Act
  startTab?: Tab
  /** The Portfolio's employability profile (on the work computer). */
  onOpenPortfolio?: () => void
}) {
  const life = profile.work.life
  const jobs = life.jobs
  const [tab, setTab] = useState<Tab>(startTab)
  const [open, setOpen] = useState<JobListing | null>(null)
  const top = useRef<HTMLDivElement>(null)

  const levelIndex = useMemo(() => {
    const { career, current } = careerLevel(profile)
    return Math.max(
      0,
      career.levels.findIndex((l) => l.id === current.id),
    )
  }, [profile])
  const player: PlayerFacts = useMemo(
    () => ({
      name: profile.name,
      careerId: profile.careerId,
      skills: profile.skills,
      tasksPassed: careerAssignments(profile.careerId)
        .filter((a) => {
          const p = profile.assignments[a.id]
          return !!p && isPassed(a, p)
        })
        .map((a) => a.title),
    }),
    [profile.name, profile.careerId, profile.skills, profile.assignments],
  )

  const savedOf = (id: string) => jobs.saved.find((s) => s.listing.id === id)
  const toggleSave = (l: JobListing) =>
    void act((p) => (isSaved(p.work.life, l.id) ? removeJob(p, l.id) : saveJob(p, l)))
  const show = (l: JobListing | null) => {
    setOpen(l)
    top.current?.scrollTo({ top: 0 })
  }

  const due = dueReminders(life)

  return (
    <div ref={top} className="h-full overflow-y-auto bg-slate-50" data-testid="jobs-app">
      {open && (
        <JobDetail
          listing={savedOf(open.id) ? asListing(savedOf(open.id)!) : open}
          saved={savedOf(open.id)}
          player={player}
          cv={jobs.cv}
          onBack={() => show(null)}
          onSave={() => void act((p) => saveJob(p, open))}
          onRemove={() => void act((p) => removeJob(p, open.id))}
          onChange={(change) => void act((p) => updateJob(p, open.id, change))}
          onKeepLetter={(letter) =>
            void act((p) =>
              updateJob(isSaved(p.work.life, open.id) ? p : saveJob(p, open), open.id, {
                letter,
              }),
            )
          }
        />
      )}
      {/* Kept (hidden) while an advert is open: back, the search and its results are as they were. */}
      {
        <div className="mx-auto max-w-5xl space-y-5 p-6" hidden={!!open}>
          <header>
            <h1 className="text-2xl font-bold text-slate-900">Real Jobs</h1>
            <p className="mt-1 text-sm text-slate-600">
              Real vacancies from public job sites, for the work you are learning here.
              Each one opens on its source, where you read it in full and apply yourself.
            </p>
          </header>
          {due.length > 0 && (
            <section
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm"
              aria-label="Reminders"
              data-testid="job-reminders"
            >
              <h2 className="font-semibold text-amber-900">Reminders</h2>
              <ul className="mt-1 space-y-1">
                {due.map((s) => (
                  <li key={s.listing.id}>
                    <button
                      type="button"
                      onClick={() => show(asListing(s))}
                      className="text-left text-amber-900 hover:underline"
                    >
                      {s.remindWhat || 'Reminder'}: {s.listing.title}, {s.listing.company}
                    </button>{' '}
                    <span className="text-xs text-amber-800">
                      ({dayName(s.remindOn!)})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <nav
            className="flex gap-1 border-b border-slate-200"
            aria-label="Jobs sections"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === t.id
                    ? 'border-blue-700 text-blue-800'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
                {t.id === 'saved' && jobs.saved.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-xs text-slate-700">
                    {jobs.saved.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          {tab === 'foryou' && (
            <ForYou
              profile={profile}
              act={act}
              levelIndex={levelIndex}
              onOpen={show}
              onSave={toggleSave}
            />
          )}
          {tab === 'search' && (
            <Search profile={profile} act={act} onOpen={show} onSave={toggleSave} />
          )}
          {tab === 'saved' && (
            <Saved profile={profile} act={act} onOpen={(s) => show(asListing(s))} />
          )}
          {tab === 'cv' && (
            <Cv
              profile={profile}
              act={act}
              player={player}
              onOpenPortfolio={onOpenPortfolio}
            />
          )}
        </div>
      }
    </div>
  )
}

/** Where the player is or wants to work: a country (or their approximate location) and a town. */
function WhereControls({ profile, act }: { profile: ProfileData; act: Act }) {
  const prefs = profile.work.life.jobs.prefs
  const countries = useMemo(() => countryList(), [])
  // The town being typed, until it is kept (or the location fills it in).
  const [typing, setTyping] = useState<{ of: string; text: string } | null>(null)
  const place = typing && typing.of === prefs.place ? typing.text : prefs.place
  const setPlace = (text: string) => setTyping({ of: prefs.place, text })
  const [locating, setLocating] = useState(false)
  const [note, setNote] = useState('')
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Country
        <select
          className={field}
          value={prefs.country}
          onChange={(e) => {
            // (Read now: by the time the change is saved, React has reset the box.)
            const country = e.target.value
            void act((p) => setJobPrefs(p, { country }))
          }}
          data-testid="job-country"
        >
          <option value="">Anywhere</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Town or city
        <input
          className={field}
          value={place}
          maxLength={80}
          placeholder="Any"
          onChange={(e) => setPlace(e.target.value)}
          onBlur={() =>
            place !== prefs.place &&
            void act((p) => setJobPrefs(p, { place: place.trim() }))
          }
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>
      {adzuna.enabled() && prefs.place && (
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Within
          <select
            className={field}
            value={prefs.radiusKm}
            onChange={(e) => {
              const radiusKm = Number(e.target.value)
              void act((p) => setJobPrefs(p, { radiusKm }))
            }}
          >
            {[5, 10, 25, 50, 100].map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        disabled={locating}
        onClick={() => {
          setLocating(true)
          setNote('')
          approximateLocation().then(
            (where) => {
              setLocating(false)
              setNote(
                `Found: ${where.place ? `${where.place}, ` : ''}${countryName(where.country)}.`,
              )
              void act((p) =>
                setJobPrefs(p, { country: where.country, place: where.place }),
              )
            },
            (e: unknown) => {
              setLocating(false)
              setNote(
                e instanceof LocationError
                  ? e.message
                  : 'Your location could not be found.',
              )
            },
          )
        }}
        className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60"
        title="Your browser asks first. The position is rounded to about 10 km and looked up once to find the country and town; it is not kept."
      >
        <Icon name="map" className="h-4 w-4" />{' '}
        {locating ? 'Finding…' : 'Use my approximate location'}
      </button>
      {note && (
        <p className="w-full text-xs text-slate-600" role="status">
          {note}
        </p>
      )}
    </div>
  )
}

function Results({
  profile,
  listings,
  why,
  loading,
  empty,
  onOpen,
  onSave,
}: {
  profile: ProfileData
  listings: JobListing[]
  why?: Map<string, string[]>
  loading: boolean
  empty: string
  onOpen: (l: JobListing) => void
  onSave: (l: JobListing) => void
}) {
  // How many are shown, for these results (new results start again from the first page).
  const [page, setPage] = useState({ of: listings, n: PAGE })
  const shown = page.of === listings ? page.n : PAGE
  const setShown = (n: number) => setPage({ of: listings, n })
  if (!listings.length)
    return loading ? (
      <p
        className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500"
        role="status"
      >
        Asking the job sites…
      </p>
    ) : (
      <p
        className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600"
        data-testid="jobs-empty"
      >
        {empty}
      </p>
    )
  return (
    <>
      <p className="text-sm text-slate-600" role="status" data-testid="jobs-count">
        {listings.length} {listings.length === 1 ? 'job' : 'jobs'}
        {loading && ' (checking for more…)'}
      </p>
      <ul className="space-y-3" aria-label="Jobs">
        {listings.slice(0, shown).map((l) => (
          <JobCard
            key={l.id}
            listing={l}
            saved={isSaved(profile.work.life, l.id)}
            why={why?.get(l.id)}
            onOpen={() => onOpen(l)}
            onSave={() => onSave(l)}
          />
        ))}
      </ul>
      {shown < listings.length && (
        <button
          type="button"
          onClick={() => setShown(shown + PAGE)}
          className="w-full rounded-md bg-white py-2 text-sm font-medium text-blue-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Show more ({listings.length - shown} more)
        </button>
      )}
    </>
  )
}

function ForYou({
  profile,
  act,
  levelIndex,
  onOpen,
  onSave,
}: {
  profile: ProfileData
  act: Act
  levelIndex: number
  onOpen: (l: JobListing) => void
  onSave: (l: JobListing) => void
}) {
  const prefs = profile.work.life.jobs.prefs
  const fieldOfCareer = fieldOf(profile.careerId)
  // First time: a guess at the country from the browser's language, to change.
  const guessed = useRef(false)
  useEffect(() => {
    if (guessed.current || prefs.country) return
    guessed.current = true
    const c = guessCountry()
    // Only if still not chosen when it is saved (never over the player's own choice).
    if (c)
      void act((p) =>
        p.work.life.jobs.prefs.country ? p : setJobPrefs(p, { country: c }),
      )
  }, [prefs.country, act])
  const query: JobQuery = useMemo(
    () => ({
      ...EMPTY_QUERY,
      country: prefs.country,
      place: prefs.place,
      radiusKm: prefs.radiusKm,
      field: fieldOfCareer.id,
    }),
    [prefs.country, prefs.place, prefs.radiusKm, fieldOfCareer.id],
  )
  // The feeds are asked for the career's field by their own names for it (providers/);
  // recommend() then ranks what is this work, with its reasons.
  const { state } = useJobSearch(query)
  const result =
    state.status === 'ready'
      ? state.result
      : state.status === 'loading'
        ? state.previous
        : undefined
  const recs = useMemo(
    () =>
      recommend(result?.listings ?? [], {
        careerId: profile.careerId,
        levelIndex,
        skills: profile.skills,
        country: prefs.country,
      }),
    [result, profile.careerId, levelIndex, profile.skills, prefs.country],
  )
  const why = useMemo(() => new Map(recs.map((r) => [r.listing.id, r.why])), [recs])
  const levels = levelsFor(levelIndex).map((l) => LEVEL_NAMES[l].toLowerCase())
  return (
    <section className="space-y-4" aria-label="For you">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-700">
          Suggestions for <strong>{fieldOfCareer.name.toLowerCase()}</strong>, your career
          here, at a level that suits where you are ({levels.join(', ')})
          {prefs.country ? (
            <>
              {' '}
              and open to someone in <strong>{countryName(prefs.country)}</strong>
            </>
          ) : (
            ''
          )}
          .
        </p>
        <div className="mt-3">
          <WhereControls profile={profile} act={act} />
        </div>
      </div>
      <SourcesLine sources={result?.sources ?? []} />
      <Results
        profile={profile}
        listings={recs.map((r) => r.listing)}
        why={why}
        loading={state.status !== 'ready'}
        empty={
          prefs.country
            ? `No ${fieldOfCareer.name.toLowerCase()} jobs open to someone in ${countryName(prefs.country)} right now in these sources. Try “Anywhere”, or search other fields.`
            : `No ${fieldOfCareer.name.toLowerCase()} jobs found right now. Try again later, or search.`
        }
        onOpen={onOpen}
        onSave={onSave}
      />
    </section>
  )
}

function Search({
  profile,
  act,
  onOpen,
  onSave,
}: {
  profile: ProfileData
  act: Act
  onOpen: (l: JobListing) => void
  onSave: (l: JobListing) => void
}) {
  const prefs = profile.work.life.jobs.prefs
  const [words, setWords] = useState('')
  const [asked, setAsked] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [arrangements, setArrangements] = useState<Arrangement[]>(prefs.arrangements)
  const [employment, setEmployment] = useState<EmploymentType | ''>('')
  const [level, setLevel] = useState<Level | ''>('')
  const [days, setDays] = useState(0)
  const [withPay, setWithPay] = useState(false)
  const [sort, setSort] = useState<'best' | 'newest'>('best')
  const query: JobQuery = useMemo(
    () => ({
      ...EMPTY_QUERY,
      keywords: asked,
      country: prefs.country,
      place: prefs.place,
      radiusKm: prefs.radiusKm,
      field: fieldId,
      arrangements,
      employment: employment ? [employment] : [],
      levels: level ? [level] : [],
      minSalary: withPay ? 1 : 0,
      postedWithinDays: days,
    }),
    [
      asked,
      prefs.country,
      prefs.place,
      prefs.radiusKm,
      fieldId,
      arrangements,
      employment,
      level,
      withPay,
      days,
    ],
  )
  const started = !!(asked || fieldId)
  const { state, refresh } = useJobSearch(started ? query : null)
  const result =
    state.status === 'ready'
      ? state.result
      : state.status === 'loading'
        ? state.previous
        : undefined
  const listings = useMemo(() => {
    const l = result?.listings ?? []
    return sort === 'newest' ? newestFirst(l) : bestFirst(l, asked)
  }, [result, sort, asked])
  const toggle = (a: Arrangement) =>
    setArrangements(
      arrangements.includes(a)
        ? arrangements.filter((x) => x !== a)
        : [...arrangements, a],
    )
  return (
    <section className="space-y-4" aria-label="Search">
      <form
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          setAsked(words.trim())
        }}
      >
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="job-words">
            Job title, skill or company
          </label>
          <input
            id="job-words"
            className={`${field} flex-1 py-2`}
            value={words}
            maxLength={100}
            placeholder="Job title, skill or company, e.g. “IT support” or “paralegal”"
            onChange={(e) => setWords(e.target.value)}
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-md bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Icon name="search" className="h-4 w-4" /> Search
          </button>
        </div>
        <WhereControls profile={profile} act={act} />
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Field
            <select
              className={field}
              value={fieldId}
              onChange={(e) => setFieldId(e.target.value)}
              data-testid="job-field"
            >
              <option value="">All fields</option>
              {FIELDS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-1 text-xs text-slate-600">
            <legend className="mb-1">Where you work</legend>
            <div className="flex gap-2">
              {(['remote', 'hybrid', 'onsite'] as Arrangement[]).map((a) => (
                <label key={a} className="flex items-center gap-1 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={arrangements.includes(a)}
                    onChange={() => toggle(a)}
                  />{' '}
                  {ARRANGEMENT_NAMES[a]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Type
            <select
              className={field}
              value={employment}
              onChange={(e) => setEmployment(e.target.value as EmploymentType | '')}
            >
              <option value="">Any</option>
              {(Object.keys(EMPLOYMENT_NAMES) as EmploymentType[]).map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_NAMES[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Level
            <select
              className={field}
              value={level}
              onChange={(e) => setLevel(e.target.value as Level | '')}
            >
              <option value="">Any</option>
              {(Object.keys(LEVEL_NAMES) as Level[]).map((t) => (
                <option key={t} value={t}>
                  {LEVEL_NAMES[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Published
            <select
              className={field}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={0}>Any time</option>
              <option value={1}>Last 24 hours</option>
              <option value={3}>Last 3 days</option>
              <option value={7}>Last week</option>
              <option value={30}>Last month</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={withPay}
              onChange={(e) => setWithPay(e.target.checked)}
            />{' '}
            Only adverts that state the pay
          </label>
          <label className="ml-auto flex flex-col gap-1 text-xs text-slate-600">
            Order
            <select
              className={field}
              value={sort}
              onChange={(e) => setSort(e.target.value as 'best' | 'newest')}
            >
              <option value="best">Best match</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
        </div>
      </form>
      {started ? (
        <>
          <div className="flex items-center gap-2">
            <SourcesLine sources={result?.sources ?? []} />
          </div>
          <Results
            profile={profile}
            listings={listings}
            loading={state.status !== 'ready'}
            empty="No jobs match this search in these sources. Try fewer words or filters, another country, or “Anywhere”."
            onOpen={onOpen}
            onSave={onSave}
          />
          {state.status === 'ready' && (
            <button
              type="button"
              onClick={refresh}
              className="text-xs text-blue-700 hover:underline"
            >
              Ask the job sites again now
            </button>
          )}
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          Type a job title, skill or company, or choose a field, to search{' '}
          {PROVIDERS.filter((p) => p.enabled())
            .map((p) => p.name)
            .join(', ')}
          .
        </p>
      )}
    </section>
  )
}

const STATUS_ORDER: JobStatus[] = [
  'preparing',
  'applied',
  'interview',
  'offer',
  'saved',
  'rejected',
  'withdrawn',
]

function Saved({
  profile,
  act,
  onOpen,
}: {
  profile: ProfileData
  act: Act
  onOpen: (s: SavedJob) => void
}) {
  const life = profile.work.life
  const saved = life.jobs.saved
  const [filter, setFilter] = useState<JobStatus | 'all' | 'shortlist'>('all')
  const counts = pipeline(life)
  // Adverts their source can say have closed (Jobicy): checked at most twice a day.
  const checking = useRef(false)
  useEffect(() => {
    if (checking.current) return
    const due = saved.filter(
      (s) =>
        s.listing.provider === 'jobicy' &&
        !s.closed &&
        (!s.checkedAt || Date.now() - s.checkedAt > 12 * 3_600_000),
    )
    if (!due.length) return
    checking.current = true
    const ids = due.map((s) => s.listing.sourceId)
    getJson(jobicyStatusUrl(ids), 20_000).then(
      (body) => {
        const closed = new Set(closedJobicy(body))
        void act((p) =>
          markClosed(
            p,
            due.filter((s) => closed.has(s.listing.sourceId)).map((s) => s.listing.id),
            due.map((s) => s.listing.id),
          ),
        )
      },
      () => {
        // Not reachable now: checked another time.
      },
    )
  }, [saved, act])
  const shown = saved
    .filter((s) =>
      filter === 'all'
        ? true
        : filter === 'shortlist'
          ? s.shortlisted
          : s.status === filter,
    )
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        b.savedAt - a.savedAt,
    )
  if (!saved.length)
    return (
      <p
        className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600"
        data-testid="saved-empty"
      >
        Jobs you save appear here, with where each application stands, your notes and
        reminders.
      </p>
    )
  return (
    <section className="space-y-3" aria-label="Saved jobs" data-testid="saved-jobs">
      <div className="flex flex-wrap gap-1.5 text-sm" role="group" aria-label="Show">
        {(['all', 'shortlist', ...STATUS_ORDER] as const).map((f) => {
          const n =
            f === 'all'
              ? saved.length
              : f === 'shortlist'
                ? saved.filter((s) => s.shortlisted).length
                : counts[f]
          if (f !== 'all' && f !== 'shortlist' && !n) return null
          return (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 ring-1 ${filter === f ? 'bg-blue-700 text-white ring-blue-700' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'}`}
            >
              {f === 'all' ? 'All' : f === 'shortlist' ? 'Shortlist' : STATUS_NAMES[f]} (
              {n})
            </button>
          )
        })}
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {shown.map((s) => (
          <li
            key={s.listing.id}
            className="flex flex-wrap items-center gap-3 p-3"
            data-testid="saved-job"
            data-job={s.listing.id}
            data-status={s.status}
          >
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpen(s)}
                className="text-left font-medium text-slate-900 hover:text-blue-800 hover:underline"
              >
                {s.listing.title}
              </button>
              <p className="text-xs text-slate-600">
                {s.listing.company}
                {s.shortlisted && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 text-amber-800">
                    Shortlist
                  </span>
                )}
                {s.closed && (
                  <span className="ml-2 rounded bg-red-100 px-1.5 text-red-800">
                    Advert closed
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {s.appliedOn
                  ? `Applied ${dayName(s.appliedOn)}`
                  : `Saved ${new Date(s.savedAt).toLocaleDateString('en-GB')}`}
                {s.remindOn &&
                  ` · Reminder ${dayName(s.remindOn)}${s.remindWhat ? `: ${s.remindWhat}` : ''}`}
              </p>
            </div>
            <label className="text-xs text-slate-600">
              <span className="sr-only">Where it stands: {s.listing.title}</span>
              <select
                className={field}
                value={s.status}
                onChange={(e) => {
                  const status = e.target.value as JobStatus
                  void act((p) => updateJob(p, s.listing.id, { status }))
                }}
              >
                {(Object.keys(STATUS_NAMES) as JobStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_NAMES[st]}
                  </option>
                ))}
              </select>
            </label>
            <a
              href={s.listing.url}
              target="_blank"
              rel="noopener"
              className="text-xs text-blue-700 hover:underline"
            >
              Advert ↗
            </a>
            <button
              type="button"
              onClick={() => void act((p) => removeJob(p, s.listing.id))}
              className="text-xs text-slate-500 hover:text-red-700"
              aria-label={`Remove ${s.listing.title}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Saved with your game, on this device (and in your backups). Statuses are what you
        record: GamHub WorkSim cannot see your real applications.
      </p>
    </section>
  )
}

function Cv({
  profile,
  act,
  player,
  onOpenPortfolio,
}: {
  profile: ProfileData
  act: Act
  player: PlayerFacts
  onOpenPortfolio?: () => void
}) {
  const cv = profile.work.life.jobs.cv
  // What is being typed, until each box is left (then kept in the save).
  // Each box's text while being typed, until it is kept (a box whose saved text has
  // changed since shows what is saved).
  type Key = keyof typeof cv
  const [edits, setEdits] = useState<
    Partial<Record<Key, { of: unknown; value: string }>>
  >({})
  const draft = { ...cv }
  for (const key of Object.keys(edits) as Key[]) {
    const e = edits[key]
    if (e && e.of === cv[key]) Object.assign(draft, { [key]: e.value })
  }
  const setField = (key: Key, value: string) =>
    setEdits((all) => ({ ...all, [key]: { of: cv[key], value } }))
  const commit = (key: keyof typeof cv) =>
    draft[key] !== cv[key] && void act((p) => setCv(p, { [key]: draft[key] }))
  const text = cvText(draft, player)
  const areas: Array<[keyof typeof cv, string, string, number]> = [
    ['headline', 'Headline', 'e.g. “IT support technician looking for my first role”', 1],
    [
      'contact',
      'Contact details',
      'Email, phone, town (only what you want employers to see)',
      2,
    ],
    [
      'summary',
      'About you',
      'Two or three sentences: who you are and what you want to do next.',
      3,
    ],
    [
      'experience',
      'Experience (real)',
      'Jobs, placements, volunteering: role, organisation, dates, what you did.',
      6,
    ],
    ['education', 'Education', 'Schools, colleges, courses, with dates.', 4],
    [
      'qualifications',
      'Qualifications and certificates (real)',
      'Only ones you hold, from the body that awarded them.',
      3,
    ],
  ]
  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-label="CV and letters">
      <form
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <h2 className="font-semibold text-slate-900">Your CV</h2>
        <p className="text-xs text-slate-600">
          Your own real details, used for your CV and cover letters. Kept with your game
          on this device; never sent anywhere.
        </p>
        {areas.map(([key, label, hint, rows]) => (
          <label key={key} className="flex flex-col gap-1 text-xs text-slate-600">
            {label}
            {rows === 1 ? (
              <input
                className={field}
                value={draft[key] as string}
                placeholder={hint}
                maxLength={200}
                onChange={(e) => setField(key, e.target.value)}
                onBlur={() => commit(key)}
              />
            ) : (
              <textarea
                className={field}
                rows={rows}
                value={draft[key] as string}
                placeholder={hint}
                onChange={(e) => setField(key, e.target.value)}
                onBlur={() => commit(key)}
              />
            )}
          </label>
        ))}
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={draft.includePractice}
            onChange={(e) => {
              const includePractice = e.target.checked
              void act((p) => setCv(p, { includePractice }))
            }}
          />
          <span>
            Include what I have practised in GamHub WorkSim, under “{PRACTICE_HEADING}”,
            clearly marked as practice in a simulation (not work experience or a
            qualification).
          </span>
        </label>
      </form>
      <div className="space-y-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Preview</h2>
            <div className="flex gap-2 text-sm">
              <CopyButton text={text} label="Copy" />
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
                download={`CV - ${profile.name}.txt`}
                className="rounded-md px-3 py-1.5 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Download
              </a>
            </div>
          </div>
          <pre
            className="mt-3 max-h-[32rem] overflow-y-auto font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-800"
            data-testid="cv-preview"
          >
            {text}
          </pre>
        </div>
        <p className="text-xs text-slate-500">
          Paste it into Word Craft or any word processor to lay it out. For a letter for
          one job, open the job and choose “Write a cover letter”.
        </p>
        {onOpenPortfolio && (
          <p className="text-xs text-slate-500">
            To show the work you did here, your Portfolio has an employability profile
            with the work itself and an honesty statement.{' '}
            <button
              type="button"
              onClick={onOpenPortfolio}
              className="text-blue-700 hover:underline"
            >
              Open your Portfolio profile
            </button>
          </p>
        )}
      </div>
    </section>
  )
}
