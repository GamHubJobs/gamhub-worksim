/** Career: level, XP, promotion progress and skills. */
import { getSkill } from '../../content/careers'
import { CareersSection } from './CareersSection'
import { PortfolioSection, type PortfolioFileKind } from './PortfolioSection'
import { COMPANY } from '../../content/company'
import { getPerson } from '../../content/departments'
import { isMentor } from '../../game/conversations'
import { RATING_NAMES, REVIEW_AREAS } from '../../game/reviews'
import { weekdayName } from '../../game/clock'
import { reputationReading, trustOf, trustReading } from '../../game/relationships'
import { Avatar } from '../../ui/Avatar'
import {
  assignmentStatus,
  bestScore,
  careerAssignments,
  careerLevel,
  promotionProgress,
  skillLevel,
} from '../../game/career'
import type { Profile } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'
import { CASES } from '../../content/cases'
import { approvalLimit } from '../../content/organisation'
import { levelNumber } from '../../game/cases'

function ProgressBar({
  value,
  max,
  label,
}: {
  value: number
  max: number
  label: string
}) {
  const percent = max <= 0 ? 100 : Math.min(100, Math.round((100 * value) / max))
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
    </div>
  )
}

/** What the player's level lets them decide: spending, and leading a team. */
function Authority({ profile }: { profile: Profile }) {
  const { career } = careerLevel(profile)
  const level = levelNumber(profile)
  const limit = approvalLimit(level)
  const leadsFrom = Math.min(
    ...CASES.filter(
      (c) => c.kind === 'leadership' && c.careerId === profile.careerId,
    ).map((c) => c.minLevel),
  )
  const leader = career.levels[leadsFrom - 1]
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6"
      data-testid="authority"
    >
      <h2 className="font-semibold text-slate-900">Your authority</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        <li>
          {limit > 0
            ? `You can approve spending of up to £${limit.toLocaleString('en-GB')}, if it is within policy and the department’s remaining budget. Anything larger goes up to the budget holder.`
            : 'You cannot approve spending yet: requests go to your manager. Your approval limit grows with each promotion.'}
        </li>
        {leader && (
          <li>
            {level >= leadsFrom
              ? 'You lead a team: you share out the work, review it, settle disagreements and give feedback.'
              : `Leading a team starts at ${leader.title}.`}
          </li>
        )}
      </ul>
    </section>
  )
}

export function CareerApp({
  profile,
  onSwitchCareer,
  onOpenFile,
  onOpenPortfolio,
}: {
  profile: Profile
  onSwitchCareer: (careerId: string) => Promise<void>
  onOpenFile: (kind: PortfolioFileKind, documentId: string) => void
  onOpenPortfolio: () => void
}) {
  const { career, current, next } = careerLevel(profile)
  const promotion = promotionProgress(profile)
  const assignments = careerAssignments(profile.careerId)

  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid="career">
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">
            {COMPANY.name} · {career.department}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{profile.name}</h1>
          <p className="text-lg text-blue-800" data-testid="career-title">
            {current.title}
          </p>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-700">{profile.xp} XP</span>
              {next && (
                <span className="text-slate-500">
                  {next.xpRequired} XP for {next.title}
                </span>
              )}
            </div>
            <ProgressBar
              value={profile.xp}
              max={next?.xpRequired ?? profile.xp}
              label="Experience"
            />
          </div>
        </section>

        {next && (
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Next promotion: {next.title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Promotions are based on experience, on completing all the work of your
              current level, and on how you work with others.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <Requirement
                met={promotion.xpNeeded === 0}
                text={`Earn ${next.xpRequired} XP${promotion.xpNeeded > 0 ? ` (${promotion.xpNeeded} to go)` : ''}`}
              />
              <Requirement
                met={
                  promotion.assignmentsTotal > 0 &&
                  promotion.assignmentsPassed === promotion.assignmentsTotal
                }
                text={`Pass every ${current.title.toLowerCase()} task (${promotion.assignmentsPassed} of ${promotion.assignmentsTotal})`}
              />
              {next.minReputation > 0 && (
                <Requirement
                  met={promotion.reputationMet}
                  text={`A professional reputation of at least ${next.minReputation} (now ${promotion.reputation})`}
                />
              )}
              {next.minReview && (
                <Requirement
                  met={promotion.reviewMet}
                  text={`A weekly review of at least “${RATING_NAMES[next.minReview]}”${promotion.latestReview ? ` (latest: ${RATING_NAMES[promotion.latestReview]})` : ' (reviews happen at Friday’s one-to-one)'}`}
                />
              )}
            </ul>
          </section>
        )}

        <Authority profile={profile} />

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Skills</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {career.skills
              .flatMap((id) => getSkill(id) ?? [])
              .map((skill) => {
                const xp = profile.skills[skill.id] ?? 0
                const level = skillLevel(xp)
                return (
                  <li key={skill.id} data-testid={`skill-${skill.id}`}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium text-slate-800">{skill.name}</span>
                      <span className="text-xs text-slate-500">
                        Level {level.level} · {level.name}
                      </span>
                    </div>
                    <p className="mb-1 text-xs text-slate-500">{skill.description}</p>
                    <ProgressBar
                      value={xp - level.xpRequired}
                      max={(level.next?.xpRequired ?? xp) - level.xpRequired}
                      label={skill.name}
                    />
                  </li>
                )
              })}
          </ul>
        </section>

        <PortfolioSection
          profile={profile}
          onOpenFile={onOpenFile}
          onOpenPortfolio={onOpenPortfolio}
        />

        <TeamSection profile={profile} />

        <ReviewsSection profile={profile} />

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Work record</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {assignments.map((assignment) => {
              const status = assignmentStatus(profile, assignment)
              const best = bestScore(profile.assignments[assignment.id])
              return (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between py-2"
                >
                  <span
                    className={status === 'locked' ? 'text-slate-400' : 'text-slate-800'}
                  >
                    {assignment.title}
                  </span>
                  <span className="text-slate-500">
                    {best !== null
                      ? `${best}%`
                      : status === 'locked'
                        ? 'Locked'
                        : 'Not submitted'}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <CareersSection profile={profile} onSwitchCareer={onSwitchCareer} />
      </div>
    </div>
  )
}

const TEAM = ['manager', 'senior', 'reception', 'facilities'] as const

const TONE_TEXT = {
  good: 'text-emerald-700',
  neutral: 'text-slate-600',
  bad: 'text-amber-700',
} as const

/** Colleagues, how much they trust the player, and the player's reputation. */
function TeamSection({ profile }: { profile: Profile }) {
  const { work } = profile
  const reputation = reputationReading(work.reputation)
  const mentor = isMentor(profile)
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6"
      data-testid="team"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold text-slate-900">Your team</h2>
        <span className="text-sm">
          <span className="text-slate-500">Professional reputation: </span>
          <span className={`font-medium ${TONE_TEXT[reputation.tone]}`}>
            {reputation.label}
          </span>
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Trust grows when you are reliable, honest and helpful, and when you take time to
        talk to people. It falls when you miss meetings or deadlines, or handle
        disagreements badly. Your reputation is how the wider office sees you.
      </p>
      <div className="mt-2">
        <ProgressBar value={work.reputation} max={100} label="Professional reputation" />
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {TEAM.map((id) => {
          const person = getPerson(id)
          const trust = trustOf(work, id)
          const reading = trustReading(trust)
          return (
            <li key={id} className="flex gap-3" data-testid={`colleague-${id}`}>
              <Avatar personId={id} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-800">{person.name}</span>
                  <span className={`text-xs ${TONE_TEXT[reading.tone]}`}>
                    {reading.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {person.role}
                  {id === 'senior' && mentor && ' · your mentor'}
                </p>
                <div className="my-1">
                  <ProgressBar value={trust} max={100} label={`Trust: ${person.name}`} />
                </div>
                <p className="text-xs text-slate-500">{person.personality}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Weekly performance reviews, newest first. */
function ReviewsSection({ profile }: { profile: Profile }) {
  const reviews = [...profile.work.reviews].reverse()
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6"
      data-testid="reviews"
    >
      <h2 className="font-semibold text-slate-900">Performance reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-1 text-sm text-slate-600">
          Priya reviews your week at your one-to-one every Friday afternoon: quality of
          work, reliability, teamwork and professionalism.
        </p>
      ) : (
        <ul className="mt-3 space-y-4">
          {reviews.map((review) => (
            <li key={review.week}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-slate-800">
                  Week {review.week}: {RATING_NAMES[review.rating]}
                </span>
                <span className="text-xs text-slate-500">{weekdayName(review.day)}</span>
              </div>
              <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm sm:grid-cols-4">
                {REVIEW_AREAS.map((area) => (
                  <div key={area.id} className="flex justify-between gap-2">
                    <dt className="text-slate-500">{area.name}</dt>
                    <dd className="font-medium text-slate-800">
                      {review.scores[area.id]}/5
                    </dd>
                  </div>
                ))}
              </dl>
              {review.improvements.length > 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  To work on: {review.improvements.join(' ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Requirement({ met, text }: { met: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          met ? 'bg-emerald-600 text-white' : 'border border-slate-300'
        }`}
      >
        {met && <Icon name="check" className="h-3.5 w-3.5" />}
      </span>
      <span className={met ? 'text-slate-500' : 'text-slate-800'}>{text}</span>
    </li>
  )
}
