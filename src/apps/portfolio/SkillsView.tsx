/**
 * The competency and experience record: each skill's level with the reasons
 * and the passed work behind it, the experience gained, and what to improve.
 */
import { useMemo } from 'react'
import { getSkill } from '../../content/careers'
import {
  COMPETENCY_LEVEL_NAMES,
  COMPETENCY_RULES,
  competencies,
  experienceRecord,
  improvementAreas,
  skillsOf,
  type CompetencyLevel,
} from '../../game/competencies'
import { toolName } from '../../game/portfolio'
import type { PortfolioItem, Profile } from '../../persistence/schemas'

const LEVEL_STYLES: Record<CompetencyLevel, string> = {
  'not-yet': 'bg-slate-100 text-slate-600',
  demonstrated: 'bg-sky-100 text-sky-800',
  practised: 'bg-blue-100 text-blue-800',
  proficient: 'bg-emerald-100 text-emerald-800',
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function SkillsView({
  items,
  profiles,
  onOpenItem,
}: {
  /** The passed work to count (already filtered to the chosen career saves). */
  items: PortfolioItem[]
  /** The career saves shown. */
  profiles: Profile[]
  onOpenItem: (itemId: string) => void
}) {
  const skills = useMemo(() => competencies(items, skillsOf(profiles)), [items, profiles])
  const experience = useMemo(() => experienceRecord(items, profiles), [items, profiles])
  const improvements = useMemo(() => profiles.flatMap(improvementAreas), [profiles])
  const rules = COMPETENCY_RULES

  return (
    <div className="space-y-5" data-testid="skills-view">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Experience</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Tasks completed</dt>
            <dd className="text-xl font-semibold" data-testid="tasks-completed">
              {experience.tasksCompleted}
            </dd>
          </div>
          {experience.projectsCompleted > 0 && (
            <div>
              <dt className="text-xs text-slate-500">Projects completed</dt>
              <dd className="text-xl font-semibold">{experience.projectsCompleted}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-500">Attempts made</dt>
            <dd className="text-xl font-semibold">{experience.attempts}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Estimated practice time</dt>
            <dd className="text-xl font-semibold">
              {formatMinutes(experience.estimatedMinutes)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-slate-600">
          {Object.keys(experience.tools).length === 0
            ? 'Tools appear here once you pass a task that uses them.'
            : `Tools used in passed work: ${Object.entries(experience.tools)
                .map(([id, n]) => `${toolName(id)} (${n})`)
                .join(', ')}.`}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-700">
          {experience.careers.map((c) => (
            <li key={c.profileId}>
              {c.careerName}: {c.levelTitle} (level {c.levelNumber} of {c.levels}),{' '}
              {c.tasksPassed} of {c.tasksInCareer} tasks passed
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Practice time is estimated from each task’s expected time. All work is in a
          simulated workplace.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Competencies</h2>
        <p className="mt-1 text-sm text-slate-600">
          Calculated only from passed work. A task counts when the skill is a main part of
          it. <strong>Demonstrated</strong>: 1 task. <strong>Practised</strong>:{' '}
          {rules.practised} tasks. <strong>Proficient</strong>: {rules.proficient} tasks,
          one at level {rules.proficientLevel} or above, average {rules.proficientAverage}
          % or more.
        </p>
        <ul className="mt-4 space-y-3" aria-label="Competencies">
          {skills.map((skill) => (
            <li
              key={skill.skillId}
              className="rounded-lg border border-slate-200 p-4"
              data-testid="competency"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium text-slate-900">{skill.name}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[skill.level]}`}
                  data-testid="competency-level"
                >
                  {COMPETENCY_LEVEL_NAMES[skill.level]}
                </span>
              </div>
              <p className="text-sm text-slate-600">{skill.description}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {skill.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {skill.evidence.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {skill.evidence.map((e) => (
                    <button
                      key={e.itemId}
                      type="button"
                      onClick={() => onOpenItem(e.itemId)}
                      className={`rounded-md border px-2 py-0.5 text-xs hover:bg-slate-50 ${
                        e.counts
                          ? 'border-slate-300 text-slate-800'
                          : 'border-dashed border-slate-300 text-slate-500'
                      }`}
                      title={
                        e.counts
                          ? `${e.levelTitle} · ${e.score}%`
                          : `${e.levelTitle} · ${e.score}% · a smaller part of this task`
                      }
                    >
                      {e.title} · {e.score}%
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">To improve</h2>
        {improvements.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">
            Nothing to improve right now: your latest attempts passed every check.
          </p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm" data-testid="improvements">
            {improvements.map((area) => (
              <li key={area.assignmentId}>
                <p className="font-medium text-slate-900">
                  {area.taskTitle}
                  {area.needsRevision && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Not passed yet
                    </span>
                  )}
                </p>
                <ul className="list-disc pl-5 text-slate-700">
                  {area.checks.map((check) => (
                    <li key={check.title}>
                      {check.title}:{' '}
                      {check.status === 'partial' ? 'partly done' : 'not done'}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-500">
                  Skills: {area.skills.map((id) => getSkill(id)?.name ?? id).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
