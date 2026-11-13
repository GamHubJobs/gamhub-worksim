/**
 * Run and Debug: choose a function and its arguments, run it, then step
 * through the recorded run line by line, with the variables at each step.
 */
import { useState } from 'react'
import { debugTargets, type DebugRun } from '../../../game/code/debugger'

export interface DebugSession {
  run: DebugRun
  index: number
  target: { file: string; fn: string; args: string }
}

interface RunDebugProps {
  files: Array<{ name: string; text: string }>
  breakpoints: Array<{ file: string; line: number }>
  session: DebugSession | null
  busy: boolean
  onStart: (target: { file: string; fn: string; args: string }) => void
  onStep: (to: 'next' | 'back' | 'continue' | 'stop') => void
  onRemoveBreakpoint: (bp: { file: string; line: number }) => void
  onOpen: (file: string, line: number) => void
}

export function RunDebug({
  files,
  breakpoints,
  session,
  busy,
  onStart,
  onStep,
  onRemoveBreakpoint,
  onOpen,
}: RunDebugProps) {
  const targets = debugTargets(files)
  const [choice, setChoice] = useState(0)
  const [args, setArgs] = useState('[]')
  const step = session ? session.run.steps[session.index] : undefined
  const atEnd = session ? session.index >= session.run.steps.length - 1 : false
  const target = targets[Math.min(choice, targets.length - 1)]

  const button = (label: string, act: () => void, disabled = false, key?: string) => (
    <button
      type="button"
      onClick={act}
      disabled={disabled}
      title={key ? `${label} (${key})` : label}
      className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600 disabled:opacity-40"
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-full flex-col text-sm text-slate-200" data-testid="run-debug">
      <h2 className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
        Run and Debug
      </h2>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pb-3">
        {targets.length === 0 ? (
          <p className="text-xs text-slate-300">
            Export a function (e.g. <code>export function total(items)</code>) to debug
            it.
          </p>
        ) : (
          <form
            className="space-y-1"
            onSubmit={(e) => {
              e.preventDefault()
              if (target) onStart({ ...target, args })
            }}
          >
            <label className="block text-xs text-slate-300">
              Function
              <select
                value={choice}
                onChange={(e) => setChoice(Number(e.target.value))}
                className="mt-0.5 w-full rounded border border-slate-600 bg-slate-950 px-1 py-1 font-mono text-xs text-white"
              >
                {targets.map((t, i) => (
                  <option key={`${t.file}:${t.fn}`} value={i}>
                    {t.file} › {t.fn}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-300">
              Arguments (a JSON list)
              <input
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                aria-label="Arguments to debug with"
                className="mt-0.5 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 font-mono text-xs text-white"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy
                ? 'Running…'
                : session
                  ? '↻ Restart debugging'
                  : '▶ Start debugging (F5)'}
            </button>
          </form>
        )}

        {session && (
          <>
            <div
              className="flex flex-wrap gap-1"
              role="toolbar"
              aria-label="Debug controls"
            >
              {button('Continue', () => onStep('continue'), atEnd, 'F5')}
              {button('Step over', () => onStep('next'), atEnd, 'F10')}
              {button('Step back', () => onStep('back'), session.index === 0)}
              {button('Stop', () => onStep('stop'), false, 'Shift+F5')}
            </div>
            <p className="text-xs text-slate-300" data-testid="debug-position">
              {session.run.steps.length === 0
                ? 'No lines were recorded.'
                : `Step ${session.index + 1} of ${session.run.steps.length}${
                    step ? `: ${step.file} line ${step.line}` : ''
                  }`}
              {session.run.truncated && ' (only the first steps were recorded)'}
            </p>
            <section aria-label="Variables">
              <h3 className="text-xs font-semibold text-slate-300">Variables</h3>
              {step && step.vars.length > 0 ? (
                <dl
                  className="mt-1 space-y-0.5 font-mono text-xs"
                  data-testid="debug-variables"
                >
                  {step.vars.map(([name, value]) => (
                    <div key={name} className="flex gap-2">
                      <dt className="text-sky-300">{name}</dt>
                      <dd className="min-w-0 truncate text-slate-100" title={value}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-slate-400">None in scope yet.</p>
              )}
            </section>
            <section aria-label="Call stack">
              <h3 className="text-xs font-semibold text-slate-300">Call stack</h3>
              {step && (
                <button
                  type="button"
                  onClick={() => onOpen(step.file, step.line)}
                  className="font-mono text-xs text-slate-100 hover:underline"
                >
                  {step.fn} — {step.file}:{step.line}
                </button>
              )}
            </section>
            {atEnd && (
              <section
                aria-label="Result"
                className="rounded bg-slate-950 p-2 font-mono text-xs"
                data-testid="debug-outcome"
              >
                {session.run.error ? (
                  <span className="text-red-300">
                    {session.run.error}
                    {session.run.line ? ` (line ${session.run.line})` : ''}
                  </span>
                ) : (
                  <span className="text-emerald-300">
                    {session.target.fn} returned {session.run.value}
                  </span>
                )}
              </section>
            )}
            {session.run.skipped.length > 0 && (
              <p className="text-xs text-amber-200">
                Ran without stepping through: {session.run.skipped.join(', ')} (the
                debugger could not follow its layout).
              </p>
            )}
          </>
        )}

        <section aria-label="Breakpoints">
          <h3 className="text-xs font-semibold text-slate-300">Breakpoints</h3>
          {breakpoints.length === 0 ? (
            <p className="text-xs text-slate-400">
              Click left of a line number (or press F9) to add one.
            </p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {breakpoints.map((bp) => (
                <li
                  key={`${bp.file}:${bp.line}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />
                  <button
                    type="button"
                    onClick={() => onOpen(bp.file, bp.line)}
                    className="font-mono hover:underline"
                  >
                    {bp.file}:{bp.line}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveBreakpoint(bp)}
                    aria-label={`Remove breakpoint ${bp.file}:${bp.line}`}
                    className="ml-auto rounded px-1 text-slate-300 hover:bg-slate-700"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
