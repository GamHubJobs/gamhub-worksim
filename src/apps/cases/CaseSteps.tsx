/** The form for each kind of case step. Answers are saved as the player works. */
import { useState } from 'react'
import type { CaseStep } from '../../content/cases/schema'
import { answerFor } from '../../game/cases'
import { getAssignment } from '../../content/assignments'
import { toolName, toolsOf } from '../../game/portfolio'
import { RichText } from '../../ui/RichText'

const field_ = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm'

export function StepForm({
  step,
  answer: saved,
  disabled,
  onSave: save,
  onOpenFile,
  fileOpened,
  playerName = '',
}: {
  step: CaseStep
  answer: unknown
  disabled: boolean
  onSave: (answer: unknown) => void
  onOpenFile: () => void
  fileOpened: boolean
  /** The player's first name, for task briefs that greet them. */
  playerName?: string
}) {
  // Shown at once; saved in the background.
  const [answer, setAnswer] = useState(saved)
  const onSave = (next: unknown) => {
    setAnswer(next)
    save(next)
  }
  switch (step.kind) {
    case 'review': {
      const marked = new Set(answerFor('review', answer) ?? [])
      return (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="sr-only">{step.title}</legend>
          {step.findings.map((f) => (
            <label key={f.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={marked.has(f.id)}
                onChange={(e) => {
                  const next = new Set(marked)
                  if (e.target.checked) next.add(f.id)
                  else next.delete(f.id)
                  onSave([...next])
                }}
              />
              <span>{f.text}</span>
            </label>
          ))}
          <p className="text-xs text-slate-500">Tick every statement that applies.</p>
        </fieldset>
      )
    }
    case 'figure':
      return (
        <TextAnswer
          key={step.id}
          label={step.title}
          initial={answerFor('figure', answer) ?? ''}
          disabled={disabled}
          prefix={step.unit === '£' ? '£' : undefined}
          suffix={step.unit && step.unit !== '£' ? step.unit : undefined}
          onSave={onSave}
        />
      )
    case 'decide': {
      const chosen = answerFor('decide', answer)
      return (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="sr-only">{step.title}</legend>
          {step.options.map((o) => (
            <label key={o.id} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name={step.id}
                className="mt-1"
                checked={chosen === o.id}
                onChange={() => onSave(o.id)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </fieldset>
      )
    }
    case 'approve': {
      const decisions = answerFor('approve', answer) ?? {}
      return (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1 font-medium">Request</th>
              <th className="py-1 font-medium">Department</th>
              <th className="py-1 text-right font-medium">Amount</th>
              <th className="py-1 font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {step.requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-2">{r.summary}</td>
                <td className="py-1.5 pr-2">{r.department}</td>
                <td className="py-1.5 pr-2 text-right">
                  £{r.amount.toLocaleString('en-GB')}
                </td>
                <td className="py-1.5">
                  <select
                    aria-label={`Decision: ${r.summary}`}
                    className={field_}
                    disabled={disabled}
                    value={decisions[r.id] ?? ''}
                    onChange={(e) => onSave({ ...decisions, [r.id]: e.target.value })}
                  >
                    <option value="" disabled>
                      Choose…
                    </option>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                    <option value="escalate">Escalate</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'assign':
    case 'actions': {
      const chosen =
        (step.kind === 'assign'
          ? answerFor('assign', answer)
          : answerFor('actions', answer)) ?? {}
      const people =
        step.kind === 'assign'
          ? step.members.map((m) => ({
              id: m.id,
              label: `${m.name} (${m.strengths}; room for ${m.capacity})`,
            }))
          : step.people.map((p) => ({ id: p.id, label: p.name }))
      return (
        <div className="space-y-2">
          {step.kind === 'assign' && (
            <ul className="text-xs text-slate-600">
              {step.members.map((m) => (
                <li key={m.id}>
                  <strong>{m.name}</strong>: {m.strengths}. Can take {m.capacity} more.
                </li>
              ))}
            </ul>
          )}
          {step.items.map((item) => (
            <label
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>{item.label}</span>
              <select
                aria-label={`${step.kind === 'assign' ? 'Assign' : 'Owner of'}: ${item.label}`}
                className={field_}
                disabled={disabled}
                value={chosen[item.id] ?? ''}
                onChange={(e) => onSave({ ...chosen, [item.id]: e.target.value })}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {step.kind === 'assign' ? p.label.split(' (')[0] : p.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )
    }
    case 'handoff': {
      const given = answerFor('handoff', answer) ?? {}
      return (
        <div className="space-y-2 text-sm">
          <p className="text-slate-600">To: {step.to}</p>
          {step.fields.map((field) =>
            field.kind === 'choice' ? (
              <label
                key={field.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>{field.label}</span>
                <select
                  aria-label={field.label}
                  className={field_}
                  disabled={disabled}
                  value={given[field.id] ?? ''}
                  onChange={(e) => onSave({ ...given, [field.id]: e.target.value })}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {field.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <HandoffText
                key={field.id}
                label={field.label}
                initial={given[field.id] ?? ''}
                disabled={disabled}
                onSave={(value) => onSave({ ...given, [field.id]: value })}
              />
            ),
          )}
        </div>
      )
    }
    case 'reply':
      return (
        <ReplyAnswer
          key={step.id}
          to={step.to}
          initial={answerFor('reply', answer) ?? ''}
          disabled={disabled}
          minWords={step.minWords}
          onSave={onSave}
        />
      )
    case 'document':
      return (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            disabled={disabled}
            onClick={onOpenFile}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            {fileOpened ? 'Continue' : 'Start'} “{step.deliverable.title}” in{' '}
            {step.deliverable.kind === 'doc' ? 'Word Craft' : 'Slides'}
          </button>
          <span className="text-slate-500">It is handed in with the case.</span>
        </div>
      )
    case 'practical': {
      const task = getAssignment(step.assignmentId)
      if (!task)
        return <p className="text-sm text-red-700">This task could not be found.</p>
      return (
        <div className="space-y-2 text-sm">
          <RichText
            text={task.briefing.body.replaceAll('{name}', playerName)}
            className="rounded-md bg-slate-50 p-3 text-slate-700"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={onOpenFile}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              {fileOpened ? 'Continue' : 'Start'} “{task.title}” in{' '}
              {toolName(toolsOf(task)[0])}
            </button>
            <span className="text-slate-500">
              Marked by the task’s own checks, as it is when you submit.
            </span>
          </div>
        </div>
      )
    }
  }
}

function TextAnswer({
  label,
  initial,
  disabled,
  prefix,
  suffix,
  onSave,
}: {
  label: string
  initial: string
  disabled: boolean
  prefix?: string
  suffix?: string
  onSave: (answer: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      {prefix}
      <input
        className={`${field_} w-40`}
        value={value}
        disabled={disabled}
        inputMode="decimal"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && onSave(value)}
      />
      {suffix}
    </label>
  )
}

function HandoffText({
  label,
  initial,
  disabled,
  onSave,
}: {
  label: string
  initial: string
  disabled: boolean
  onSave: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <label className="flex flex-wrap items-center justify-between gap-2">
      <span>{label}</span>
      <input
        className={`${field_} w-48`}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && onSave(value)}
      />
    </label>
  )
}

function ReplyAnswer({
  to,
  initial,
  disabled,
  minWords,
  onSave,
}: {
  to: string
  initial: string
  disabled: boolean
  minWords: number
  onSave: (answer: string) => void
}) {
  const [value, setValue] = useState(initial)
  const count = value.split(/\s+/).filter(Boolean).length
  return (
    <label className="block text-sm">
      <span className="text-slate-600">To: {to}</span>
      <textarea
        className={`${field_} mt-1 block w-full`}
        rows={7}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && onSave(value)}
        aria-label={`Reply to ${to}`}
      />
      <span className="text-xs text-slate-500">
        {count} words (at least {minWords})
      </span>
    </label>
  )
}
