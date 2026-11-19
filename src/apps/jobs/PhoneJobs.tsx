/**
 * Real Jobs on the phone: suggestions for the player's career where they live,
 * and their saved jobs with where each stands and reminders due. Adverts open
 * on their source; the full app (search, details, CV and letters) is on the
 * work computer.
 */
import { useMemo, useState } from 'react'
import { careerLevel, type ProfileData } from '../../game/career'
import {
  STATUS_NAMES,
  dueReminders,
  isSaved,
  removeJob,
  saveJob,
  updateJob,
  type JobStatus,
} from '../../game/jobs'
import { countryName } from '../../jobs/geo'
import { fieldOf, recommend } from '../../jobs/match'
import { providerOf } from '../../jobs/providers'
import { EMPTY_QUERY } from '../../jobs/types'
import { dayName, postedAgo, whereText } from './format'
import { useJobSearch } from './useJobSearch'

type Act = (change: (p: ProfileData) => ProfileData) => unknown

export function PhoneJobs({ profile, act }: { profile: ProfileData; act: Act }) {
  const life = profile.work.life
  const prefs = life.jobs.prefs
  const [view, setView] = useState<'foryou' | 'saved'>(
    life.jobs.saved.length ? 'saved' : 'foryou',
  )
  const field = fieldOf(profile.careerId)
  const levelIndex = useMemo(() => {
    const { career, current } = careerLevel(profile)
    return Math.max(
      0,
      career.levels.findIndex((l) => l.id === current.id),
    )
  }, [profile])
  const query = useMemo(
    () => ({
      ...EMPTY_QUERY,
      country: prefs.country,
      place: prefs.place,
      field: field.id,
    }),
    [prefs.country, prefs.place, field.id],
  )
  const { state } = useJobSearch(view === 'foryou' ? query : null)
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
      }).slice(0, 12),
    [result, profile.careerId, levelIndex, profile.skills, prefs.country],
  )
  const due = dueReminders(life)
  const tab = (id: typeof view, label: string) => (
    <button
      type="button"
      aria-pressed={view === id}
      onClick={() => setView(id)}
      className={`flex-1 rounded-md py-1 text-xs font-semibold ${view === id ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
    >
      {label}
    </button>
  )
  return (
    <div className="space-y-3" data-testid="phone-real-jobs">
      <p className="text-xs text-slate-600">
        Real vacancies from public job sites. You apply on each advert’s own page.
      </p>
      {due.length > 0 && (
        <ul
          className="space-y-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200"
          aria-label="Reminders"
        >
          {due.map((s) => (
            <li key={s.listing.id}>
              <strong>{s.remindWhat || 'Reminder'}</strong>: {s.listing.title} (
              {dayName(s.remindOn!)})
            </li>
          ))}
        </ul>
      )}
      <div
        className="flex gap-1 rounded-lg bg-slate-100 p-1"
        role="group"
        aria-label="Show"
      >
        {tab('foryou', 'For you')}
        {tab('saved', `Saved (${life.jobs.saved.length})`)}
      </div>
      {view === 'foryou' ? (
        <>
          <p className="text-xs text-slate-500">
            {field.name}
            {prefs.country ? `, open to someone in ${countryName(prefs.country)}` : ''}.
            Change where on the computer’s Real Jobs.
          </p>
          {recs.length === 0 ? (
            <p
              className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500"
              role="status"
            >
              {state.status !== 'ready'
                ? 'Asking the job sites…'
                : 'Nothing suitable in these sources just now.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {recs.map(({ listing: l }) => {
                const saved = isSaved(life, l.id)
                return (
                  <li
                    key={l.id}
                    className="rounded-lg bg-white p-2.5 ring-1 ring-slate-200"
                    data-testid="phone-job"
                  >
                    <p className="text-sm font-semibold text-slate-900">{l.title}</p>
                    <p className="text-xs text-slate-600">{l.company}</p>
                    <p className="text-[11px] text-slate-500">
                      {whereText(l)} · {postedAgo(l.posted)} · via{' '}
                      {providerOf(l.provider).name}
                    </p>
                    {l.salary && (
                      <p className="text-[11px] font-medium text-emerald-700">
                        {l.salary.text}
                      </p>
                    )}
                    <div className="mt-1.5 flex gap-2 text-xs">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener"
                        className="rounded bg-blue-600 px-2 py-1 font-semibold text-white"
                      >
                        View advert ↗
                      </a>
                      <button
                        type="button"
                        aria-pressed={saved}
                        onClick={() =>
                          void act((p) =>
                            isSaved(p.work.life, l.id)
                              ? removeJob(p, l.id)
                              : saveJob(p, l),
                          )
                        }
                        className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-800"
                      >
                        {saved ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : life.jobs.saved.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
          Jobs you save appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {life.jobs.saved.map((s) => (
            <li
              key={s.listing.id}
              className="rounded-lg bg-white p-2.5 ring-1 ring-slate-200"
              data-testid="phone-saved-job"
            >
              <p className="text-sm font-semibold text-slate-900">{s.listing.title}</p>
              <p className="text-xs text-slate-600">
                {s.listing.company}
                {s.closed ? ' · advert closed' : ''}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <label className="sr-only" htmlFor={`st-${s.listing.id}`}>
                  Where it stands
                </label>
                <select
                  id={`st-${s.listing.id}`}
                  value={s.status}
                  onChange={(e) => {
                    const status = e.target.value as JobStatus
                    void act((p) => updateJob(p, s.listing.id, { status }))
                  }}
                  className="rounded border border-slate-300 px-1 py-0.5"
                >
                  {(Object.keys(STATUS_NAMES) as JobStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_NAMES[st]}
                    </option>
                  ))}
                </select>
                <a
                  href={s.listing.url}
                  target="_blank"
                  rel="noopener"
                  className="text-blue-700 underline"
                >
                  Advert ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
