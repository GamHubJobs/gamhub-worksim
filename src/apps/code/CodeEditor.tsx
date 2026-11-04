/**
 * The Code editor: the project's files, a plain-text editor with line
 * numbers, and a Run tests button that shows which tests pass and why the
 * others fail. The code runs in a Web Worker (see `game/code`).
 */
import { useRef, useState, type KeyboardEvent } from 'react'
import { DebugPanel, TerminalPanel } from './CodePanels'
import { runProjectTests } from '../../game/code/runInWorker'
import type { RunResult } from '../../game/code/runner'
import { isTestFile } from '../../game/code/runner'
import type { CodeContent } from '../../persistence/schemas'
import type { ContextItem } from '../../ai/types'
import { AskAiMenu } from '../ai/AskAiMenu'
import { useAiContext } from '../ai/hub'

interface CodeEditorProps {
  content: CodeContent
  readOnly?: boolean
  onUpdate?: (change: (content: CodeContent) => CodeContent) => void
}

const INDENT = '  '

export function CodeEditor({ content, readOnly = false, onUpdate }: CodeEditorProps) {
  const [active, setActive] = useState(content.files[0]?.name ?? '')
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState<RunResult | null>(null)
  const [panel, setPanel] = useState<'tests' | 'terminal' | 'debug'>('tests')
  const [errorLine, setErrorLine] = useState<{ file: string; line: number } | null>(null)
  const canEdit = !readOnly && !!onUpdate
  const gutter = useRef<HTMLDivElement>(null)
  const file = content.files.find((f) => f.name === active) ?? content.files[0]
  const editable = !readOnly && !!onUpdate && !file?.readOnly
  const lines = (file?.text ?? '').split('\n').length

  // WorkSim AI sees the open file and the last test run (not the whole project).
  useAiContext(
    'code',
    canEdit && file
      ? () => {
          const items: ContextItem[] = [
            { kind: 'code', label: `File: ${file.name}`, text: file.text },
          ]
          if (run) {
            const failed = run.tests.filter((t) => !t.passed)
            const problems = run.error
              ? [run.error]
              : failed.map((t) => `"${t.name}": ${t.message}`)
            items.push({
              kind: 'tests',
              label: 'Last test run',
              text: run.error
                ? `The tests could not run: ${run.error}`
                : [
                    `${run.tests.length - failed.length} of ${run.tests.length} tests pass.`,
                    ...problems.map((p) => `Fails: ${p}`),
                  ].join('\n'),
              data: { failed: problems },
            })
          }
          return items
        }
      : null,
  )

  function setText(text: string) {
    if (!file) return
    onUpdate?.((latest) => ({
      ...latest,
      files: latest.files.map((f) => (f.name === file.name ? { ...f, text } : f)),
    }))
  }

  /** Tab indents, and Enter keeps the current line's indentation. */
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!editable) return
    const area = event.currentTarget
    const { selectionStart: start, selectionEnd: end, value } = area
    let insert: string | null = null
    if (event.key === 'Tab' && !event.shiftKey) {
      insert = INDENT
    } else if (event.key === 'Enter' && !event.shiftKey) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const indent = /^[ \t]*/.exec(value.slice(lineStart, start))?.[0] ?? ''
      const opens = /[{[(]\s*$/.test(value.slice(lineStart, start))
      insert = `\n${indent}${opens ? INDENT : ''}`
    }
    if (insert === null) return
    event.preventDefault()
    const text = value.slice(0, start) + insert + value.slice(end)
    setText(text)
    const caret = start + insert.length
    requestAnimationFrame(() => area.setSelectionRange(caret, caret))
  }

  async function runTests() {
    setRunning(true)
    setRun(await runProjectTests(content.files.map(({ name, text }) => ({ name, text }))))
    setRunning(false)
  }

  const passed = run?.tests.filter((t) => t.passed).length ?? 0
  const failed = (run?.tests.length ?? 0) - passed

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="code-app">
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Files"
          className="w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2"
        >
          <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Files
          </p>
          <ul className="space-y-0.5">
            {content.files.map((f) => (
              <li key={f.name}>
                <button
                  type="button"
                  onClick={() => setActive(f.name)}
                  aria-current={f.name === file?.name ? 'true' : undefined}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left font-mono text-sm ${
                    f.name === file?.name
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="truncate">{f.name}</span>
                  {f.readOnly && (
                    <span
                      className="ml-2 shrink-0 font-sans text-xs whitespace-nowrap text-slate-500"
                      title="Read only"
                    >
                      read only
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
            <span className="font-mono text-sm text-slate-700">
              {file?.name}
              {file?.readOnly && (
                <span className="ml-2 font-sans text-xs text-slate-500">
                  (read only: don’t change this file)
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              {canEdit && (
                <AskAiMenu
                  app="code"
                  compact
                  actions={[
                    { label: 'Explain this code', action: 'explain-code' },
                    {
                      label: 'Help me debug the failing tests',
                      question: 'Help me debug the failing tests',
                      action: 'explain-code',
                    },
                    { label: 'Which tests should I write?', action: 'write-tests' },
                  ]}
                />
              )}
              <button
                type="button"
                onClick={() => void runTests()}
                disabled={running}
                data-testid="run-tests"
                className="rounded-md bg-emerald-700 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {running ? 'Running…' : 'Run tests'}
              </button>
            </span>
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden font-mono text-sm leading-6">
            <div
              ref={gutter}
              aria-hidden="true"
              className="w-12 shrink-0 overflow-hidden bg-slate-50 py-2 pr-2 text-right text-slate-400 select-none"
            >
              {Array.from({ length: lines }, (_, i) => (
                <div
                  key={i}
                  className={
                    errorLine && errorLine.file === file?.name && errorLine.line === i + 1
                      ? 'bg-red-200 font-semibold text-red-800'
                      : ''
                  }
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              key={file?.name}
              value={file?.text ?? ''}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              onScroll={(event) => {
                if (gutter.current)
                  gutter.current.scrollTop = event.currentTarget.scrollTop
              }}
              readOnly={!editable}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              aria-label={`Code: ${file?.name ?? ''}`}
              data-testid="code-editor"
              className={`min-w-0 flex-1 resize-none p-2 whitespace-pre outline-none ${
                editable ? 'bg-white text-slate-900' : 'bg-slate-50 text-slate-700'
              }`}
            />
          </div>
        </div>
      </div>

      <div
        className="flex shrink-0 gap-1 border-t border-slate-200 bg-slate-900 px-2 pt-1"
        role="tablist"
      >
        {(
          [
            ['tests', 'Tests'],
            ['terminal', 'Terminal'],
            ['debug', 'Debug'],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={panel === id}
            onClick={() => setPanel(id)}
            className={`rounded-t px-3 py-1 text-xs font-medium ${
              panel === id
                ? 'bg-slate-950 text-white'
                : 'text-slate-300 hover:text-slate-200'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      {panel === 'terminal' && (
        <section
          aria-label="Terminal"
          className="h-56 shrink-0 bg-slate-950 p-3 text-slate-100"
        >
          <TerminalPanel content={content} editable={canEdit} update={onUpdate} />
        </section>
      )}
      {panel === 'debug' && (
        <section
          aria-label="Debug console"
          className="h-56 shrink-0 overflow-y-auto bg-slate-950 p-3 text-slate-100"
        >
          <DebugPanel
            content={content}
            editable={canEdit}
            update={onUpdate}
            onLine={(name, line) => {
              setActive(name)
              setErrorLine({ file: name, line })
            }}
          />
        </section>
      )}
      <section
        aria-label="Test results"
        data-testid="test-results"
        hidden={panel !== 'tests'}
        className="h-56 shrink-0 overflow-y-auto bg-slate-950 p-3 font-mono text-sm text-slate-100"
      >
        {!run ? (
          <p className="text-slate-300">
            {content.files.some((f) => isTestFile(f.name))
              ? 'Click Run tests to run the test files (the ones ending in .test.js).'
              : 'This project has no test files yet (files ending in .test.js).'}
          </p>
        ) : (
          <>
            {run.error ? (
              <p className="text-red-300" data-testid="run-error">
                {run.error}
              </p>
            ) : (
              <p
                className={
                  failed === 0 && passed > 0 ? 'text-emerald-300' : 'text-amber-300'
                }
                data-testid="run-summary"
              >
                {passed} passed, {failed} failed
              </p>
            )}
            <ul className="mt-2 space-y-1">
              {run.tests.map((test, i) => (
                <li key={i}>
                  <span className={test.passed ? 'text-emerald-400' : 'text-red-400'}>
                    {test.passed ? '✓' : '✗'}
                  </span>{' '}
                  {test.name}
                  {!test.passed && (
                    <div className="pl-5 text-red-300">{test.message}</div>
                  )}
                </li>
              ))}
            </ul>
            {run.logs.length > 0 && (
              <div className="mt-3 border-t border-slate-800 pt-2">
                <p className="text-xs text-slate-300 uppercase">console.log</p>
                {run.logs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap text-slate-300">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
