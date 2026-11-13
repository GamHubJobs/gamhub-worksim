/**
 * The laptop at home, for career life: job adverts from other employers and
 * their interviews, asking the manager for a rise, and a side business.
 */
import { useState } from 'react'
import {
  APPLY_MINUTES,
  BUSINESS_EVENINGS,
  INTERVIEW_MINUTES,
  JOB_ADS,
  OFFER_DAYS,
  PAY_ASKS,
  PAY_TALK_MINUTES,
  SIDE_BUSINESSES,
  getBusiness,
  getJobAd,
  getQuestion,
  type JobAd,
} from '../content/careerLife'
import { activeEmployer } from '../content/departments'
import { formatMoney } from '../content/life'
import type { ProfileData } from '../game/career'
import {
  applicationFor,
  apply,
  askForRaise,
  basePay,
  businessLevel,
  canApply,
  canAskForRaise,
  canInterview,
  canRunBusiness,
  canStartBusiness,
  closeBusiness,
  declineOffer,
  interview,
  liveOffers,
  offerFor,
  roleFor,
  runBusiness,
  sessionPay,
  startBusiness,
  weeklyPay,
} from '../game/careerLife'
import { RATING_NAMES } from '../game/reviews'
import { LifeAssistant } from './LifeAssistant'
import { AudioScene } from '../audio/useAudio'
import { timeOfDay } from '../audio/scenes'

type Act = (change: (profile: ProfileData) => ProfileData) => Promise<unknown>
type Tab = 'jobs' | 'pay' | 'business' | 'ai'

const TABS: Array<[Tab, string]> = [
  ['jobs', 'Jobs'],
  ['pay', 'Pay'],
  ['business', 'Side business'],
  ['ai', 'WorkSim AI'],
]

const STAGE: Record<string, string> = {
  applied: 'Applied: they will reply on another evening.',
  rejected: 'Not shortlisted this time.',
  interview: 'Invited to a video interview.',
  failed: 'Interviewed: not this time.',
  offer: 'Offer made.',
  declined: 'You turned the offer down.',
  used: 'You raised this offer in a pay talk.',
  expired: 'The offer lapsed.',
}

const button =
  'rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-55'
const primary =
  'rounded-md bg-amber-700 px-3 py-1 text-sm font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-55'

export function CareerPanel({
  profile,
  onAct,
  onClose,
}: {
  profile: ProfileData
  onAct: Act
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('jobs')
  return (
    <section
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      data-testid="career"
      aria-label="Your laptop"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Your laptop</h2>
        <button type="button" onClick={onClose} className={button}>
          Close the laptop
        </button>
      </div>
      <nav aria-label="Career" className="mt-2 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1 text-sm ${
              tab === id
                ? 'bg-amber-700 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-amber-50'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-3">
        {tab === 'jobs' && <Jobs profile={profile} onAct={onAct} />}
        {tab === 'pay' && <Pay profile={profile} onAct={onAct} />}
        {tab === 'business' && <Business profile={profile} onAct={onAct} />}
        {tab === 'ai' && <LifeAssistant profile={profile} />}
      </div>
    </section>
  )
}

function Jobs({ profile, onAct }: { profile: ProfileData; onAct: Act }) {
  const [interviewing, setInterviewing] = useState<string | null>(null)
  const ad = interviewing ? getJobAd(interviewing) : undefined
  if (ad)
    return (
      <Interview
        profile={profile}
        ad={ad}
        onAct={onAct}
        onDone={() => setInterviewing(null)}
      />
    )
  return (
    <>
      <p className="text-sm text-slate-600">
        Other employers are hiring. They look at your real record: your level, work done
        to standard and your latest review. Your career in WorkSim stays at{' '}
        {activeEmployer().name}; an offer shows what you are worth, and you can raise it
        when you ask for a rise.
      </p>
      <ul className="mt-3 space-y-2">
        {JOB_ADS.map((job) => {
          const application = applicationFor(profile.work.life, job.id)
          const blocked = canApply(profile, job.id)
          return (
            <li
              key={job.id}
              className="rounded-lg border border-slate-200 p-3 text-sm"
              data-testid={`job-${job.id}`}
            >
              <p className="font-medium text-slate-900">
                {roleFor(profile, job)} · {job.employer}
              </p>
              <p className="text-xs text-slate-600">{job.about}</p>
              <p className="text-xs text-slate-500">
                About {formatMoney(offerFor(profile, job))} a week · at least{' '}
                {job.minTasks} tasks done to standard
                {job.minRating
                  ? ` · a review of ${RATING_NAMES[job.minRating]} or better`
                  : ''}
              </p>
              {application && (
                <div className="mt-1 text-xs text-slate-700" data-testid="application">
                  <p className="font-medium">
                    {STAGE[application.stage]}
                    {application.stage === 'offer' &&
                      application.offer &&
                      ` ${formatMoney(application.offer)} a week, open for ${OFFER_DAYS} days.`}
                  </p>
                  {application.notes.length > 0 && (
                    <ul className="list-disc pl-4">
                      {application.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {application?.stage === 'interview' ? (
                  <button
                    type="button"
                    className={primary}
                    disabled={!!canInterview(profile, job.id)}
                    title={canInterview(profile, job.id) ?? undefined}
                    onClick={() => setInterviewing(job.id)}
                  >
                    Start the interview · {INTERVIEW_MINUTES} min
                  </button>
                ) : application?.stage === 'offer' ? (
                  <button
                    type="button"
                    className={button}
                    onClick={() => void onAct((p) => declineOffer(p, job.id))}
                  >
                    Turn it down politely
                  </button>
                ) : (
                  <button
                    type="button"
                    className={primary}
                    disabled={!!blocked}
                    onClick={() => void onAct((p) => apply(p, job.id))}
                  >
                    Apply · {APPLY_MINUTES} min
                  </button>
                )}
                {blocked && !application?.stage.match(/interview|offer/) && (
                  <span className="self-center text-xs text-slate-500">{blocked}</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Interview({
  profile,
  ad,
  onAct,
  onDone,
}: {
  profile: ProfileData
  ad: JobAd
  onAct: Act
  onDone: () => void
}) {
  const [answers, setAnswers] = useState<number[]>([])
  const complete = ad.questions.every((_, i) => answers[i] !== undefined)
  return (
    <form
      data-testid="interview"
      onSubmit={(e) => {
        e.preventDefault()
        void onAct((p) => interview(p, ad.id, answers))
        onDone()
      }}
    >
      <AudioScene
        scene={{
          place: 'home',
          time: timeOfDay(profile.work.life.minute),
          moment: 'interview',
        }}
      />
      <h3 className="font-medium text-slate-900">
        Video interview: {roleFor(profile, ad)} at {ad.employer}
      </h3>
      <p className="text-xs text-slate-600">
        Strong answers give a real example: what happened, what you did and how it turned
        out.
      </p>
      {ad.questions.map((id, i) => {
        const q = getQuestion(id)
        return (
          <fieldset key={id} className="mt-3">
            <legend className="text-sm font-medium text-slate-800">{q.question}</legend>
            {q.answers.map((a, j) => (
              <label key={j} className="mt-1 flex gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name={id}
                  checked={answers[i] === j}
                  onChange={() => {
                    const next = [...answers]
                    next[i] = j
                    setAnswers(next)
                  }}
                />
                {a.text}
              </label>
            ))}
          </fieldset>
        )
      })}
      <div className="mt-3 flex gap-2">
        <button type="submit" className={primary} disabled={!complete}>
          Finish the interview
        </button>
        <button type="button" className={button} onClick={onDone}>
          Not now
        </button>
      </div>
    </form>
  )
}

function Pay({ profile, onAct }: { profile: ProfileData; onAct: Act }) {
  const life = profile.work.life
  const career = life.career
  const offers = liveOffers(life)
  const [cite, setCite] = useState<string>('')
  const blocked = canAskForRaise(profile)
  const review = profile.work.reviews.at(-1)
  return (
    <div data-testid="pay">
      <p className="text-sm text-slate-800">
        You earn <strong>{formatMoney(weeklyPay(profile))}</strong> a week
        {career.raisePct > 0 &&
          ` (${formatMoney(basePay(profile))} for your level, plus ${career.raisePct}% in rises)`}
        , paid on Fridays.
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Your manager decides from your record: your latest review (
        {review ? RATING_NAMES[review.rating] : 'none yet'}), your reputation and any
        offer from another employer. Ask for more than it supports and you get what it
        does support, or nothing; asking for a lot with nothing behind it costs some
        goodwill.
      </p>
      {career.payAnswer && (
        <p
          className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900"
          data-testid="pay-answer"
        >
          {career.payAnswer}
        </p>
      )}
      {career.payTalk ? (
        <p className="mt-2 text-sm text-slate-700">
          You asked for {career.payTalk.ask}%. Your manager will reply on another evening.
        </p>
      ) : (
        <>
          {offers.length > 0 && (
            <label className="mt-2 block text-sm text-slate-700">
              Mention an offer{' '}
              <select
                value={cite}
                onChange={(e) => setCite(e.target.value)}
                className="rounded border border-slate-300 px-1 py-0.5"
              >
                <option value="">None</option>
                {offers.map((o) => (
                  <option key={o.jobId} value={o.jobId}>
                    {getJobAd(o.jobId)?.employer} · {formatMoney(o.offer ?? 0)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="mt-2 text-sm text-slate-700">
            Write to your manager asking for a rise ({PAY_TALK_MINUTES} min):
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {PAY_ASKS.map((ask) => (
              <button
                key={ask}
                type="button"
                className={button}
                disabled={!!blocked}
                data-testid={`pay-ask-${ask}`}
                onClick={() => void onAct((p) => askForRaise(p, ask, cite || null))}
              >
                {ask}%
              </button>
            ))}
          </div>
          {blocked && <p className="mt-1 text-xs text-slate-500">{blocked}</p>}
        </>
      )}
    </div>
  )
}

function Business({ profile, onAct }: { profile: ProfileData; onAct: Act }) {
  const career = profile.work.life.career
  const running = career.business.id ? getBusiness(career.business.id) : undefined
  if (running) {
    const blocked = canRunBusiness(profile)
    return (
      <div data-testid="business">
        <p className="font-medium text-slate-900">{running.name}</p>
        <p className="text-xs text-slate-600">
          {businessLevel(career)} regular customer(s) · earned{' '}
          {formatMoney(career.business.earned)} so far · declared to{' '}
          {activeEmployer().name}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          More evenings bring more regulars and better pay. More than {BUSINESS_EVENINGS}{' '}
          evenings a week on top of your job is tiring.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            disabled={!!blocked}
            onClick={() => void onAct(runBusiness)}
          >
            Work on it · {running.minutes} min · earn {formatMoney(sessionPay(career))}
            {running.materials ? ` (materials ${formatMoney(running.materials)})` : ''}
          </button>
          <button
            type="button"
            className={button}
            onClick={() => void onAct(closeBusiness)}
          >
            Close it down
          </button>
        </div>
        {blocked && <p className="mt-1 text-xs text-slate-500">{blocked}</p>}
      </div>
    )
  }
  return (
    <>
      <p className="text-sm text-slate-600">
        Earn a little on the side in the evenings. {activeEmployer().name} asks staff to
        declare outside work; starting one here declares it.
      </p>
      <ul className="mt-2 space-y-2">
        {SIDE_BUSINESSES.map((b) => {
          const blocked = canStartBusiness(profile, b.id)
          return (
            <li
              key={b.id}
              className="rounded-lg border border-slate-200 p-3 text-sm"
              data-testid={`business-${b.id}`}
            >
              <p className="font-medium text-slate-900">{b.name}</p>
              <p className="text-xs text-slate-600">{b.description}</p>
              <p className="text-xs text-slate-500">
                Setting up {formatMoney(b.setup)} · {b.minutes} min an evening · from{' '}
                {formatMoney(b.base)} a session
              </p>
              <button
                type="button"
                className={`mt-2 ${primary}`}
                disabled={!!blocked}
                onClick={() => void onAct((p) => startBusiness(p, b.id))}
              >
                Start it
              </button>
              {blocked && <span className="ml-2 text-xs text-slate-500">{blocked}</span>}
            </li>
          )
        })}
      </ul>
    </>
  )
}
