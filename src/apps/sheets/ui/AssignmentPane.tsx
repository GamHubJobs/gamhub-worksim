/**
 * The task pane next to an assignment workbook: what to do (step by step),
 * why it matters, and the Submit button.
 */
import { useState } from 'react'
import { getPerson } from '../../../content/company'
import type { Assignment } from '../../../content/schemas'
import { bestScore, firstName } from '../../../game/career'
import type { AssignmentProgress } from '../../../persistence/schemas'
import { Icon } from '../../../ui/Icon'
import { RichText } from '../../../ui/RichText'

interface AssignmentPaneProps {
  assignment: Assignment
  playerName: string
  progress: AssignmentProgress | undefined
  submitting: boolean
  onToggleStep: (stepId: string) => void
  onSubmit: () => void
  onShowResults: () => void
  onClose: () => void
}

export function AssignmentPane({
  assignment,
  playerName,
  progress,
  submitting,
  onToggleStep,
  onSubmit,
  onShowResults,
  onClose,
}: AssignmentPaneProps) {
  const done = new Set(progress?.completedSteps ?? [])
  const firstOpen = assignment.steps.find((step) => !done.has(step.id))?.id ?? null
  const [tab, setTab] = useState<'steps' | 'brief'>('steps')
  const [openStep, setOpenStep] = useState<string | null>(firstOpen)
  const [hintsShown, setHintsShown] = useState<Set<string>>(new Set())
  const manager = getPerson(assignment.from)
  const best = bestScore(progress)
  const latest = progress?.attempts.at(-1)

  return (
    <aside
      className="flex w-[22rem] shrink-0 flex-col border-l border-slate-200 bg-white"
      aria-label="Task instructions"
      data-testid="assignment-pane"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
              Your task
            </p>
            <h2 className="font-semibold text-slate-900">{assignment.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              From {manager.name} · about {assignment.estimatedMinutes} min
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task pane"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div
          className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm"
          role="tablist"
        >
          {(['steps', 'brief'] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={`flex-1 rounded-md px-2 py-1 ${
                tab === name ? 'bg-white font-medium shadow-sm' : 'text-slate-600'
              }`}
            >
              {name === 'steps'
                ? `Steps (${done.size}/${assignment.steps.length})`
                : 'Brief & why it matters'}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm text-slate-700">
        {tab === 'steps' ? (
          <ol className="space-y-2">
            {assignment.steps.map((step, index) => {
              const isDone = done.has(step.id)
              const isOpen = openStep === step.id
              return (
                <li
                  key={step.id}
                  className={`rounded-lg border ${
                    isOpen ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      aria-label={`Mark step ${index + 1} as done`}
                      onClick={() => {
                        onToggleStep(step.id)
                        if (!isDone && isOpen) {
                          const next = assignment.steps
                            .slice(index + 1)
                            .find((s) => !done.has(s.id))
                          setOpenStep(next?.id ?? null)
                        }
                      }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isDone
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white hover:border-blue-500'
                      }`}
                    >
                      {isDone && <Icon name="check" className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenStep(isOpen ? null : step.id)}
                      aria-expanded={isOpen}
                      className={`flex-1 text-left font-medium ${
                        isDone ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}
                    >
                      {index + 1}. {step.title}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="space-y-2 px-3 pb-3 pl-10">
                      <RichText text={step.instructions} />
                      {step.hint &&
                        (hintsShown.has(step.id) ? (
                          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
                            💡 {step.hint}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setHintsShown(new Set(hintsShown).add(step.id))
                            }
                            className="text-blue-700 hover:underline"
                          >
                            Show a hint
                          </button>
                        ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="space-y-4">
            <section>
              <h3 className="font-semibold text-slate-900">Why this matters</h3>
              <p className="mt-1">{assignment.whyItMatters}</p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-900">What you will learn</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {assignment.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="font-semibold text-slate-900">
                {manager.name.split(' ')[0]}’s email
              </h3>
              <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 font-medium">{assignment.briefing.subject}</p>
                <RichText
                  text={assignment.briefing.body.replaceAll(
                    '{name}',
                    firstName(playerName),
                  )}
                />
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-200 px-4 py-3">
        {latest && (
          <button
            type="button"
            onClick={onShowResults}
            className="flex w-full items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100"
            data-testid="latest-result"
          >
            <span>
              Last result: <strong>{latest.score}%</strong>
              {best !== null && best > latest.score && (
                <span className="text-slate-500"> (best {best}%)</span>
              )}
            </span>
            <span className="text-blue-700">View feedback</span>
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          <Icon name="send" className="h-4 w-4" />
          {submitting
            ? 'Checking your work…'
            : `${latest ? 'Submit again' : 'Submit'} to ${manager.name.split(' ')[0]}`}
        </button>
      </div>
    </aside>
  )
}
