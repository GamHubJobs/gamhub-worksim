/** Career: level, XP, promotion progress and skills. */
import { SKILLS } from '../../content/careers'
import { COMPANY } from '../../content/company'
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

export function CareerApp({ profile }: { profile: Profile }) {
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
              Promotions are based on experience and on completing all the work of your
              current level.
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
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Skills</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {SKILLS.map((skill) => {
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
      </div>
    </div>
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
