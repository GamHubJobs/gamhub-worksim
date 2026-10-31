/** Shown right after submitting: the score, rewards and feedback on every check. */
import type { SubmissionResult } from '../../app/useCareer'
import { getSkill } from '../../content/careers'
import { getPerson } from '../../content/company'
import type { Assignment } from '../../content/schemas'
import { CheckResultsList } from './CheckResultsList'

const RATING_TEXT = {
  excellent: {
    title: 'Excellent work!',
    color: 'text-emerald-700',
    ring: 'stroke-emerald-500',
  },
  good: { title: 'Good work', color: 'text-blue-700', ring: 'stroke-blue-500' },
  pass: {
    title: 'Passed, with room to improve',
    color: 'text-amber-700',
    ring: 'stroke-amber-500',
  },
  fail: { title: 'Not there yet', color: 'text-red-700', ring: 'stroke-red-500' },
} as const

export function ScoreRing({
  score,
  rating,
}: {
  score: number
  rating: keyof typeof RATING_TEXT
}) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90" aria-hidden>
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="fill-none stroke-slate-100"
          strokeWidth="8"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className={`fill-none ${RATING_TEXT[rating].ring}`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-900"
        data-testid="score"
      >
        {score}%
      </span>
    </div>
  )
}

export function SubmissionResults({
  assignment,
  result,
  onClose,
  onOpenTask,
}: {
  assignment: Assignment
  result: SubmissionResult
  onClose: () => void
  onOpenTask: (assignmentId: string) => void
}) {
  const { grade, reward } = result
  const rating = RATING_TEXT[grade.rating]
  const manager = getPerson(assignment.from)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
      data-testid="submission-results"
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-slate-50 shadow-2xl">
        <div className="flex items-center gap-5 border-b border-slate-200 bg-white px-6 py-5">
          <ScoreRing score={grade.score} rating={grade.rating} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">{assignment.title}</p>
            <h2 id="results-title" className={`text-xl font-bold ${rating.color}`}>
              {rating.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {grade.passed
                ? `${manager.name.split(' ')[0]} has your work and replied by email.`
                : `You need ${assignment.passScore}% to pass. Fix the points below and submit again. Nothing is lost by trying again.`}
            </p>
            {(reward.xp > 0 || Object.keys(reward.skills).length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs" data-testid="rewards">
                {reward.xp > 0 && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800">
                    +{reward.xp} XP
                    {reward.bonusXp > 0 && ` (incl. +${reward.bonusXp} first-try bonus)`}
                  </span>
                )}
                {Object.entries(reward.skills).map(([skillId, gain]) => (
                  <span
                    key={skillId}
                    className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700"
                  >
                    {getSkill(skillId)?.name ?? skillId} +{gain}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {reward.promotedTo && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
              🎉 <strong>Promotion!</strong> You are now {reward.promotedTo}.
            </div>
          )}
          {reward.skillLevelUps.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {reward.skillLevelUps.map((up) => (
                <p key={up.skillId}>
                  ⬆ {getSkill(up.skillId)?.name}: you reached level {up.level} ({up.name}
                  ).
                </p>
              ))}
            </div>
          )}
          {reward.unlocked && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              New task unlocked: <strong>{reward.unlocked.title}</strong>. It is in your
              inbox and Tasks.
            </div>
          )}
          <section>
            <h3 className="mb-2 font-semibold text-slate-900">Feedback on your work</h3>
            <CheckResultsList assignment={assignment} checks={grade.checks} />
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-3">
          {reward.unlocked && (
            <button
              type="button"
              onClick={() => onOpenTask(reward.unlocked!.id)}
              className="rounded-md px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
            >
              Go to the next task
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            {grade.score === 100 ? 'Close' : 'Back to my workbook'}
          </button>
        </div>
      </div>
    </div>
  )
}
