/** The Code app's Terminal (shell, git, npm test) and Debug console panels. */
import { useEffect, useRef, useState } from 'react'
import { initRepository } from '../../game/code/git'
import { callInWorker, runProjectTests } from '../../game/code/runInWorker'
import { isTestFile, type CallResult } from '../../game/code/runner'
import { runTerminal } from '../../game/code/terminal'
import type { CodeContent } from '../../persistence/schemas'

type Update = (change: (content: CodeContent) => CodeContent) => void

const fileMap = (content: CodeContent) =>
  Object.fromEntries(content.files.map((f) => [f.name, f.text]))

/** Applies terminal changes to files (keeping read-only flags) and git. */
function withFiles(
  content: CodeContent,
  files: Record<string, string>,
): CodeContent['files'] {
  return content.files
    .filter((f) => f.name in files)
    .map((f) => ({ ...f, text: files[f.name] }))
}

export function TerminalPanel({
  content,
  editable,
  update,
}: {
  content: CodeContent
  editable: boolean
  update?: Update
}) {
  const [line, setLine] = useState('')
  const [busy, setBusy] = useState(false)
  const [index, setIndex] = useState<number | null>(null)
  const screen = useRef<HTMLDivElement>(null)
  const history = content.terminal ?? []
  const branch = content.git?.head ?? 'main'
  useEffect(() => {
    screen.current?.scrollTo({ top: screen.current.scrollHeight })
  }, [history.length, busy])

  async function run(command: string) {
    if (!update) return
    const repo = content.git ?? initRepository(fileMap(content))
    const result = runTerminal(fileMap(content), repo, command)
    if (result.clear) {
      update((c) => ({ ...c, terminal: [] }))
      return
    }
    let output = result.output
    if (result.runTests) {
      setBusy(true)
      const run = await runProjectTests(
        content.files.map(({ name, text }) => ({ name, text })),
      )
      setBusy(false)
      const passed = run.tests.filter((t) => t.passed).length
      output = run.error
        ? [run.error]
        : [
            ...run.tests.map(
              (t) =>
                `${t.passed ? '  ✓' : '  ✗'} ${t.name}${t.passed ? '' : `\n      ${t.message}`}`,
            ),
            '',
            `Tests: ${run.tests.length - passed} failed, ${passed} passed, ${run.tests.length} total`,
          ].flatMap((l) => l.split('\n'))
    }
    update((c) => ({
      ...c,
      files: withFiles(c, result.files),
      git: result.git,
      terminal: [...(c.terminal ?? []), { command, output: output.slice(0, 300) }].slice(
        -200,
      ),
    }))
  }

  return (
    <div className="flex h-full flex-col" data-testid="terminal">
      <div
        ref={screen}
        className="flex-1 overflow-y-auto font-mono text-[13px] leading-5"
        data-testid="terminal-output"
      >
        {history.length === 0 && (
          <p className="text-slate-400">
            Type a command, e.g. <span className="text-slate-200">git status</span> or{' '}
            <span className="text-slate-200">npm test</span>. Type help for the list.
          </p>
        )}
        {history.map((entry, i) => (
          <div key={i} className="mb-1">
            <div className="text-emerald-300">$ {entry.command}</div>
            {entry.output.map((l, k) => (
              <div
                key={k}
                className={`whitespace-pre-wrap ${l.startsWith('+') ? 'text-emerald-300' : l.startsWith('-') ? 'text-red-300' : ''}`}
              >
                {l || ' '}
              </div>
            ))}
          </div>
        ))}
        {busy && <div className="text-slate-400">Running the tests…</div>}
      </div>
      <form
        className="mt-1 flex items-center gap-2 font-mono text-sm"
        onSubmit={(e) => {
          e.preventDefault()
          if (!line.trim() || busy) return
          void run(line.trim())
          setLine('')
          setIndex(null)
        }}
      >
        <span className="text-sky-300">{branch}</span>
        <span className="text-emerald-300">$</span>
        <input
          aria-label="Terminal command"
          value={line}
          disabled={!editable || busy}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            const commands = history.map((h) => h.command)
            if (e.key === 'ArrowUp' && commands.length) {
              e.preventDefault()
              const i = index === null ? commands.length - 1 : Math.max(0, index - 1)
              setIndex(i)
              setLine(commands[i])
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none"
        />
      </form>
    </div>
  )
}

/** Names of the functions a file exports (for the debug console's list). */
function exportedFunctions(text: string): string[] {
  const names = new Set<string>()
  for (const m of text.matchAll(/^\s*export\s+(?:async\s+)?function\s+(\w+)/gm))
    names.add(m[1])
  for (const m of text.matchAll(/^\s*export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/gm))
    names.add(m[1])
  return [...names]
}

export function DebugPanel({
  content,
  editable,
  update,
  onLine,
}: {
  content: CodeContent
  editable: boolean
  update?: Update
  onLine: (file: string, line: number) => void
}) {
  const sources = content.files.filter((f) => !isTestFile(f.name))
  const [file, setFile] = useState(sources[0]?.name ?? '')
  const functions = exportedFunctions(
    content.files.find((f) => f.name === file)?.text ?? '',
  )
  const [fn, setFn] = useState(functions[0] ?? '')
  const [args, setArgs] = useState('[]')
  const [result, setResult] = useState<CallResult | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function call() {
    let parsed: unknown
    try {
      parsed = JSON.parse(args)
      if (!Array.isArray(parsed)) throw new Error('not a list')
    } catch {
      setProblem(
        'Write the arguments as a JSON list, e.g. [[{"hours": 7.5}], 2] for two arguments.',
      )
      return
    }
    setProblem(null)
    setBusy(true)
    const r = await callInWorker(
      content.files.map(({ name, text }) => ({ name, text })),
      file,
      fn,
      parsed,
    )
    setBusy(false)
    setResult(r)
    if (r.line) onLine(file, r.line)
    update?.((c) => ({
      ...c,
      debug: [
        ...(c.debug ?? []),
        {
          file,
          fn,
          args: args.slice(0, 2000),
          value: r.value?.slice(0, 500) ?? null,
          error: r.error?.slice(0, 500) ?? null,
        },
      ].slice(-100),
    }))
  }

  return (
    <div className="space-y-2 font-sans text-sm" data-testid="debug">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-300">Call</span>
        <select
          aria-label="Debug file"
          value={file}
          onChange={(e) => {
            setFile(e.target.value)
            setFn(
              exportedFunctions(
                content.files.find((f) => f.name === e.target.value)?.text ?? '',
              )[0] ?? '',
            )
          }}
          className="rounded bg-slate-800 px-2 py-1 font-mono text-slate-100"
        >
          {sources.map((f) => (
            <option key={f.name}>{f.name}</option>
          ))}
        </select>
        <select
          aria-label="Debug function"
          value={fn}
          onChange={(e) => setFn(e.target.value)}
          className="rounded bg-slate-800 px-2 py-1 font-mono text-slate-100"
        >
          {functions.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <span className="text-slate-300">with arguments</span>
        <input
          aria-label="Debug arguments"
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          spellCheck={false}
          className="min-w-64 flex-1 rounded bg-slate-800 px-2 py-1 font-mono text-slate-100"
        />
        <button
          type="button"
          disabled={!editable || busy || !fn}
          onClick={() => void call()}
          className="rounded-md bg-sky-700 px-3 py-1 font-medium text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {busy ? 'Calling…' : 'Call'}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Arguments are a JSON list: one item per argument. Logs from console.log appear
        below.
      </p>
      {problem && (
        <p className="text-amber-300" role="alert">
          {problem}
        </p>
      )}
      {result && (
        <div
          className="rounded bg-slate-900 p-2 font-mono text-[13px]"
          data-testid="debug-result"
        >
          {result.logs.map((l, i) => (
            <div key={i} className="text-slate-300">
              log: {l}
            </div>
          ))}
          {result.error ? (
            <div className="text-red-300">
              {result.error}
              {result.line && (
                <span className="text-amber-300">
                  {' '}
                  (at line {result.line} of {file})
                </span>
              )}
            </div>
          ) : (
            <div className="text-emerald-300">returned {result.value}</div>
          )}
        </div>
      )}
    </div>
  )
}
