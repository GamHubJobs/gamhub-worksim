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
import { careerRecord } from '../../game/careerRecord'
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENTS,
  describe,
  type AchievementCategory,
} from '../../game/achievements'
import { DESK_SLOTS, type DeskSlot } from '../../content/desk'
import { deskLayout, isUnlocked, itemsFor, unlockText } from '../../game/desk'
import { useEffect, useRef, type ReactNode } from 'react'
import { aiCompetencies, AI_LEVEL_NAMES } from '../../game/aiUse'

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

/**
 * The career-wide record: each figure with how it is worked out, and the work
 * done at each level so the player can see how it developed.
 */
function PerformanceRecord({ profile }: { profile: Profile }) {
  const record = careerRecord(profile)
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6"
      aria-labelledby="record-heading"
      data-testid="performance-record"
    >
      <h2 id="record-heading" className="font-semibold text-slate-900">
        Performance record
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Worked out from your saved tasks, cases, meetings and relationships. Each figure
        says where it comes from.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {record.sections.map((section) => (
          <div
            key={section.id}
            className="rounded-lg border border-slate-200 p-4"
            data-testid={`record-${section.id}`}
          >
            <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>
            <dl className="mt-2 space-y-2">
              {section.stats.map((stat) => (
                <div key={stat.label} className="flex flex-wrap justify-between gap-x-3">
                  <dt className="text-sm text-slate-700">{stat.label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{stat.value}</dd>
                  <dd className="w-full text-xs text-slate-500">{stat.source}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <h3 className="mt-6 text-sm font-semibold text-slate-800">Level by level</h3>
      <table className="mt-2 w-full text-left text-sm" data-testid="record-periods">
        <caption className="sr-only">Your work at each level you have held</caption>
        <thead className="text-xs text-slate-500">
          <tr>
            <th scope="col" className="py-1 font-medium">
              Level
            </th>
            <th scope="col" className="py-1 font-medium">
              From
            </th>
            <th scope="col" className="py-1 font-medium">
              Tasks passed
            </th>
            <th scope="col" className="py-1 font-medium">
              Average task score
            </th>
            <th scope="col" className="py-1 font-medium">
              Cases
            </th>
            <th scope="col" className="py-1 font-medium">
              Average case score
            </th>
          </tr>
        </thead>
        <tbody>
          {record.periods.map((period) => (
            <tr key={period.levelId} className="border-t border-slate-100">
              <th scope="row" className="py-1.5 font-medium text-slate-800">
                {period.title}
              </th>
              <td className="py-1.5">
                {period.fromDay === null
                  ? 'Before records began'
                  : `Day ${period.fromDay}`}
              </td>
              <td className="py-1.5">{period.tasksPassed}</td>
              <td className="py-1.5">
                {period.averageTaskScore === null ? '–' : `${period.averageTaskScore}%`}
              </td>
              <td className="py-1.5">{period.casesSubmitted}</td>
              <td className="py-1.5">
                {period.averageCaseScore === null ? '–' : `${period.averageCaseScore}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        Work is counted at the level you held when you submitted it. Earlier levels keep
        their record when you are promoted.
      </p>
    </section>
  )
}

/** Achievements by category: earned ones with the day, the rest with progress. */
function Achievements({ profile }: { profile: Profile }) {
  const earned = profile.work.record.achievements
  const total = ACHIEVEMENTS.filter((a) => earned[a.id]).length
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6"
      aria-labelledby="achievements-heading"
      data-testid="achievements"
    >
      <h2 id="achievements-heading" className="font-semibold text-slate-900">
        Achievements{' '}
        <span className="text-sm font-normal text-slate-500">
          ({total} of {ACHIEVEMENTS.length})
        </span>
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Earned only by doing the work. Each one says exactly how.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(Object.keys(ACHIEVEMENT_CATEGORIES) as AchievementCategory[]).map(
          (category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-800">
                {ACHIEVEMENT_CATEGORIES[category]}
              </h3>
              <ul className="mt-2 space-y-2">
                {ACHIEVEMENTS.filter((a) => a.category === category).map((a) => {
                  const when = earned[a.id]
                  const { done, of } = a.progress(profile)
                  return (
                    <li
                      key={a.id}
                      className={
                        'rounded-md border p-2 text-sm ' +
                        (when ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200')
                      }
                      data-testid={'achievement-' + a.id}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-slate-900">
                          {when ? '✓ ' : ''}
                          {a.title}
                        </span>
                        <span className="text-xs text-slate-600">
                          {when
                            ? 'Earned on day ' + when.day
                            : of > 1
                              ? done + ' of ' + of
                              : 'Not yet'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {describe(a, profile.careerId)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </div>
          ),
        )}
      </div>
    </section>
  )
}

/** The player's desk: earned items to choose from, and how to earn the rest. */
function Desk({
  profile,
  onChoose,
  focus,
}: {
  profile: Profile
  onChoose: (slot: DeskSlot, itemId: string | null) => void
  focus: boolean
}) {
  const layout = deskLayout(profile)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!focus) return
    ref.current?.scrollIntoView({ block: 'start' })
    ref.current?.focus()
  }, [focus])
  return (
    <section
      ref={ref}
      tabIndex={-1}
      className="rounded-xl border border-slate-200 bg-white p-6 outline-none"
      aria-labelledby="desk-heading"
      data-testid="desk"
    >
      <h2 id="desk-heading" className="font-semibold text-slate-900">
        Your desk
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Make your desk your own with things you have earned. They appear at your desk in
        the office.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {DESK_SLOTS.map((slot) => {
          const items = itemsFor(slot.id)
          const required = items.some((i) => !i.unlock)
          return (
            // Re-mounted when the saved choice changes; the click shows at once.
            <fieldset
              key={slot.id + ':' + (layout[slot.id]?.id ?? '')}
              className="rounded-lg border border-slate-200 p-3"
            >
              <legend className="px-1 text-sm font-semibold text-slate-800">
                {slot.name}
              </legend>
              <div className="space-y-1">
                {!required && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={'desk-' + slot.id}
                      defaultChecked={!layout[slot.id]}
                      onChange={() => onChoose(slot.id, null)}
                    />
                    None
                  </label>
                )}
                {items.map((item) => {
                  const unlocked = isUnlocked(profile, item)
                  return (
                    <label
                      key={item.id}
                      className={
                        'flex items-start gap-2 text-sm ' +
                        (unlocked ? '' : 'text-slate-500')
                      }
                    >
                      <input
                        type="radio"
                        name={'desk-' + slot.id}
                        className="mt-1"
                        defaultChecked={layout[slot.id]?.id === item.id}
                        disabled={!unlocked}
                        onChange={() => onChoose(slot.id, item.id)}
                      />
                      <span>
                        <span
                          aria-hidden
                          className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full ring-1 ring-slate-300"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                        {!unlocked && (
                          <span className="block text-xs">
                            {unlockText(profile, item)}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
      </div>
    </section>
  )
}

export function CareerApp({
  profile,
  onSwitchCareer,
  onOpenFile,
  onOpenPortfolio,
  onChooseDesk,
  onOpenReadiness,
  focus,
}: {
  profile: Profile
  onSwitchCareer: (careerId: string) => Promise<void>
  onOpenFile: (kind: PortfolioFileKind, documentId: string) => void
  onOpenPortfolio: () => void
  /** Puts an earned item on the desk, or clears the slot. */
  onChooseDesk: (slot: DeskSlot, itemId: string | null) => void
  /** Opens a readiness assessment. */
  onOpenReadiness: (assessmentId: string) => void
  /** A section to show straight away ("desk"). */
  focus?: string
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
              {promotion.assessment && (
                <Requirement
                  met={promotion.assessmentMet}
                  text={`Pass the readiness assessment: ${promotion.assessment.title.replace(/^Readiness assessment: /, '')}`}
                >
                  {!promotion.assessmentMet && (
                    <button
                      type="button"
                      onClick={() => onOpenReadiness(promotion.assessment!.id)}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      Go to the assessment
                    </button>
                  )}
                </Requirement>
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

        <PerformanceRecord profile={profile} />

        <Achievements profile={profile} />

        <Desk profile={profile} onChoose={onChooseDesk} focus={focus === 'desk'} />

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

        <AiSkills profile={profile} />

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

function Requirement({
  met,
  text,
  children,
}: {
  met: boolean
  text: string
  children?: ReactNode
}) {
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
      {children}
    </li>
  )
}

/**
 * How well the player uses AI at work, from evidence (prompt quality, checking
 * answers, protecting data, reviewing changes): never how often they use it.
 */
function AiSkills({ profile }: { profile: Profile }) {
  const competencies = aiCompetencies(profile)
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6"
      data-testid="ai-skills"
      aria-labelledby="ai-skills-title"
    >
      <h2 id="ai-skills-title" className="font-semibold text-slate-900">
        Using AI at work
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        From how you use WorkSim AI and the AI cases. Asking more questions does not raise
        these: asking well, checking answers and protecting data do.
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {competencies.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-slate-200 p-3"
            data-testid={`ai-skill-${c.id}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-slate-800">{c.name}</span>
              <span
                className={`text-xs font-medium ${
                  c.level === 'strong'
                    ? 'text-emerald-700'
                    : c.level === 'competent'
                      ? 'text-blue-700'
                      : c.level === 'developing'
                        ? 'text-amber-700'
                        : 'text-slate-500'
                }`}
              >
                {AI_LEVEL_NAMES[c.level]}
              </span>
            </div>
            <p className="text-xs text-slate-500">{c.description}</p>
            <p className="mt-1 text-xs text-slate-700">{c.evidence}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
