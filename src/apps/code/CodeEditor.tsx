/**
 * The Code app: an editor laid out like the code editors developers use.
 *
 * - Activity bar: Explorer, Search, Source Control, Run and Debug, Extensions.
 * - Tabs over the editor (Monaco, the editor component of VS Code, MIT licence).
 * - Panel: Problems, Tests, Terminal (simulated) and the Debug console.
 * - Status bar, menu bar, command palette (Ctrl+Shift+P) and Go to File (Ctrl+P).
 *
 * Code runs in a Web Worker (see `game/code`), never on the player's computer.
 */
import {
  Component,
  lazy,
  Suspense,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { DebugPanel, TerminalPanel } from './CodePanels'
import type { EditorApi, EditorOptions, Problem } from './MonacoEditor'
import { Explorer } from './ide/Explorer'
import { Extensions } from './ide/Extensions'
import { MenuBar, Palette } from './ide/Palette'
import { RunDebug, type DebugSession } from './ide/RunDebug'
import { SearchView } from './ide/SearchView'
import { SourceControl } from './ide/SourceControl'
import { debugInWorker, runProjectTests } from '../../game/code/runInWorker'
import { nextBreakpoint } from '../../game/code/debugger'
import { COMMANDS, languageOf, replaceAllIn, type CommandId } from '../../game/code/ide'
import type { RunResult } from '../../game/code/runner'
import { isTestFile } from '../../game/code/runner'
import type { CodeContent } from '../../persistence/schemas'
import type { ContextItem } from '../../ai/types'
import { AskAiMenu } from '../ai/AskAiMenu'
import { useAiContext } from '../ai/hub'

const MonacoEditor = lazy(() => import('./MonacoEditor'))
const MonacoDiff = lazy(() =>
  import('./MonacoEditor').then((m) => ({ default: m.MonacoDiff })),
)

interface CodeEditorProps {
  content: CodeContent
  readOnly?: boolean
  onUpdate?: (change: (content: CodeContent) => CodeContent) => void
}

type View = 'explorer' | 'search' | 'scm' | 'debug' | 'extensions'
type PanelId = 'problems' | 'tests' | 'terminal' | 'debug'
type Ide = NonNullable<CodeContent['ide']>
const EMPTY_IDE: Ide = { tabs: [], breakpoints: [], extensions: [] }

/** New working files from Git, keeping each file's read-only flag and order. */
function withFiles(
  content: CodeContent,
  files: Record<string, string>,
): CodeContent['files'] {
  const kept = content.files
    .filter((f) => f.name in files)
    .map((f) => ({ ...f, text: files[f.name] }))
  const added = Object.keys(files)
    .filter((name) => !content.files.some((f) => f.name === name))
    .map((name) => ({ name, text: files[name], readOnly: false }))
  return [...kept, ...added]
}

/** Shows the plain text if the editor component cannot load. */
class EditorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const ACTIVITIES: Array<[View, string, string]> = [
  ['explorer', 'Explorer', '⧉'],
  ['search', 'Search', '⌕'],
  ['scm', 'Source Control', '⑂'],
  ['debug', 'Run and Debug', '▷'],
  ['extensions', 'Extensions', '⊞'],
]

export function CodeEditor({ content, readOnly = false, onUpdate }: CodeEditorProps) {
  const canEdit = !readOnly && !!onUpdate
  const ide = content.ide ?? EMPTY_IDE
  const names = content.files.map((f) => f.name)
  const [localTabs, setLocalTabs] = useState<string[]>(() => {
    const saved = (content.ide?.tabs ?? []).filter((t) => names.includes(t))
    return saved.length ? saved : [content.files[0]?.name ?? '']
  })
  const tabs = localTabs.filter((t) => names.includes(t))
  const [activeName, setActive] = useState(tabs[0] ?? names[0] ?? '')
  const active = names.includes(activeName) ? activeName : (tabs[0] ?? names[0] ?? '')
  const file = content.files.find((f) => f.name === active)
  const [view, setView] = useState<View>('explorer')
  const [sidebar, setSidebar] = useState(true)
  const [panel, setPanel] = useState<PanelId>('tests')
  const [panelOpen, setPanelOpen] = useState(true)
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState<RunResult | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  const [palette, setPalette] = useState<'commands' | 'files' | null>(null)
  const [diff, setDiff] = useState<{
    name: string
    original: string
    modified: string
    label: string
  } | null>(null)
  const [session, setSession] = useState<DebugSession | null>(null)
  const [debugBusy, setDebugBusy] = useState(false)
  const [errorLine, setErrorLine] = useState<{ file: string; line: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'shortcuts' | 'about' | null>(null)
  const api = useRef<EditorApi | null>(null)
  const has = (id: string) => ide.extensions.includes(id)
  const [wordWrap, setWordWrap] = useState(false)
  const options: EditorOptions = {
    wordWrap: wordWrap || has('soft-wrap'),
    minimap: has('code-overview'),
    brackets: has('bracket-colours'),
    whitespace: has('whitespace-lens'),
  }

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
            const problemsText = run.error
              ? [run.error]
              : failed.map((t) => `"${t.name}": ${t.message}`)
            items.push({
              kind: 'tests',
              label: 'Last test run',
              text: run.error
                ? `The tests could not run: ${run.error}`
                : [
                    `${run.tests.length - failed.length} of ${run.tests.length} tests pass.`,
                    ...problemsText.map((p) => `Fails: ${p}`),
                  ].join('\n'),
              data: { failed: problemsText },
            })
          }
          return items
        }
      : null,
  )

  const updateIde = (change: (ide: Ide) => Ide) =>
    onUpdate?.((c) => ({ ...c, ide: change(c.ide ?? EMPTY_IDE) }))

  function open(name: string, line?: number, column?: number) {
    setDiff(null)
    setActive(name)
    if (!tabs.includes(name)) {
      const next = [...tabs, name].slice(-20)
      setLocalTabs(next)
      if (canEdit) updateIde((i) => ({ ...i, tabs: next }))
    }
    if (line)
      requestAnimationFrame(() => setTimeout(() => api.current?.reveal(line, column), 30))
  }

  function close(name: string) {
    const next = tabs.filter((t) => t !== name)
    setLocalTabs(next)
    if (canEdit) updateIde((i) => ({ ...i, tabs: next }))
    if (name === active)
      setActive(next[next.length - 1] ?? names.find((n) => n !== name) ?? '')
  }

  function setText(name: string, text: string) {
    onUpdate?.((latest) => ({
      ...latest,
      files: latest.files.map((f) =>
        f.name === name && !f.readOnly ? { ...f, text } : f,
      ),
    }))
    if (errorLine?.file === name) setErrorLine(null)
  }

  async function runTests() {
    setRunning(true)
    setPanel('tests')
    setPanelOpen(true)
    const result = await runProjectTests(
      content.files.map(({ name, text }) => ({ name, text })),
    )
    setRun(result)
    setRunning(false)
    return result
  }

  function toggleBreakpoint(line: number, name = active) {
    if (!canEdit) return
    updateIde((i) => {
      const exists = i.breakpoints.some((b) => b.file === name && b.line === line)
      return {
        ...i,
        breakpoints: exists
          ? i.breakpoints.filter((b) => !(b.file === name && b.line === line))
          : [...i.breakpoints, { file: name, line }].slice(-200),
      }
    })
  }

  async function startDebugging(target: { file: string; fn: string; args: string }) {
    let args: unknown
    try {
      args = JSON.parse(target.args || '[]')
    } catch {
      setNotice('The arguments must be a JSON list, e.g. [[1, 2], 0.1]')
      return
    }
    if (!Array.isArray(args)) {
      setNotice('The arguments must be a list, e.g. [5] or ["text", 2]')
      return
    }
    setDebugBusy(true)
    const result = await debugInWorker(
      content.files.map(({ name, text }) => ({ name, text })),
      target.file,
      target.fn,
      args,
    )
    setDebugBusy(false)
    const first = nextBreakpoint(result.steps, -1, ide.breakpoints)
    const index = ide.breakpoints.length ? first : 0
    setSession({ run: result, index: Math.max(0, index), target })
    const step = result.steps[Math.max(0, index)]
    if (step) open(step.file)
  }

  function step(to: 'next' | 'back' | 'continue' | 'stop') {
    if (!session) return
    if (to === 'stop') {
      setSession(null)
      return
    }
    const last = session.run.steps.length - 1
    const index =
      to === 'next'
        ? Math.min(session.index + 1, last)
        : to === 'back'
          ? Math.max(session.index - 1, 0)
          : nextBreakpoint(session.run.steps, session.index, ide.breakpoints)
    setSession({ ...session, index })
    const s = session.run.steps[index]
    if (s && s.file !== active) open(s.file)
  }

  function command(id: CommandId) {
    const show = (v: View) => {
      setView(v)
      setSidebar(true)
    }
    const showPanel = (p: PanelId) => {
      setPanel(p)
      setPanelOpen(true)
    }
    switch (id) {
      case 'commandPalette':
        return setPalette('commands')
      case 'quickOpen':
        return setPalette('files')
      case 'newFile':
        show('explorer')
        return setNotice('Click “+ File” in the Explorer, or right-click a file.')
      case 'save':
        if (has('tidy-format')) api.current?.run('editor.action.formatDocument')
        setNotice('Saved. (Your work also saves as you type.)')
        if (has('test-lens')) void runTests()
        return
      case 'closeEditor':
        return close(active)
      case 'undo':
        return api.current?.undo()
      case 'redo':
        return api.current?.redo()
      case 'find':
        return api.current?.run('actions.find')
      case 'replace':
        return api.current?.run('editor.action.startFindReplaceAction')
      case 'format':
        return has('tidy-format')
          ? api.current?.run('editor.action.formatDocument')
          : setNotice('Install the Tidy Formatter extension to format documents.')
      case 'gotoLine':
        return api.current?.run('editor.action.gotoLine')
      case 'explorer':
      case 'search':
      case 'scm':
      case 'debug':
      case 'extensions':
        return show(id)
      case 'toggleSidebar':
        return setSidebar((s) => !s)
      case 'togglePanel':
        return setPanelOpen((p) => !p)
      case 'problems':
        return showPanel('problems')
      case 'terminal':
        return showPanel('terminal')
      case 'runTests':
        return void runTests()
      case 'startDebugging':
        if (session) return step('continue')
        return show('debug')
      case 'toggleBreakpoint':
        return toggleBreakpoint(cursor.line)
      case 'commit':
      case 'branch':
        return show('scm')
      case 'wordWrap':
        return setWordWrap((w) => !w)
      case 'shortcuts':
        return setDialog('shortcuts')
      case 'about':
        return setDialog('about')
    }
  }

  /** Shortcuts when the focus is outside the editor (the editor binds its own). */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('.monaco-editor')) return
    const ctrl = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    let id: CommandId | null = null
    if (ctrl && event.shiftKey) {
      id =
        (
          {
            p: 'commandPalette',
            e: 'explorer',
            f: 'search',
            g: 'scm',
            d: 'debug',
            x: 'extensions',
            m: 'problems',
          } as const
        )[key as 'p'] ?? null
    } else if (ctrl) {
      id =
        (
          {
            p: 'quickOpen',
            b: 'toggleSidebar',
            j: 'togglePanel',
            '`': 'terminal',
            s: 'save',
          } as const
        )[key as 'p'] ?? null
    } else if (event.key === 'F1') id = 'commandPalette'
    else if (event.key === 'F5') id = 'startDebugging'
    else if (event.key === 'F10' && session) {
      event.preventDefault()
      step('next')
      return
    }
    if (id) {
      event.preventDefault()
      command(id)
    }
  }

  const passed = run?.tests.filter((t) => t.passed).length ?? 0
  const failed = (run?.tests.length ?? 0) - passed
  const debugStep = session?.run.steps[session.index]
  const highlight =
    debugStep && debugStep.file === active
      ? { line: debugStep.line, kind: 'debug' as const }
      : errorLine && errorLine.file === active
        ? { line: errorLine.line, kind: 'error' as const }
        : null
  const errors = problems.filter((p) => p.severity === 'error').length
  const warnings = problems.length - errors
  const plain = (
    <textarea
      value={file?.text ?? ''}
      onChange={(e) => file && setText(file.name, e.target.value)}
      readOnly={!canEdit || file?.readOnly}
      spellCheck={false}
      wrap="off"
      aria-label={`Code: ${file?.name ?? ''}`}
      data-testid="code-editor-plain"
      className="h-full w-full resize-none bg-slate-950 p-2 font-mono text-sm whitespace-pre text-slate-100 outline-none"
    />
  )

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-slate-900 text-slate-200"
      data-testid="code-app"
      onKeyDown={onKeyDown}
    >
      {/* Title row: menus, run, AI. */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700 bg-slate-800 px-1 py-0.5">
        <MenuBar onCommand={command} />
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPalette('commands')}
            className="hidden rounded border border-slate-600 px-6 py-0.5 text-xs text-slate-300 hover:bg-slate-700 md:block"
            title="Command palette (Ctrl+Shift+P)"
          >
            Search commands
          </button>
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
            className="rounded bg-emerald-700 px-3 py-0.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {running ? 'Running…' : 'Run tests'}
          </button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <div
          role="toolbar"
          aria-label="Views"
          aria-orientation="vertical"
          className="flex w-11 shrink-0 flex-col items-center gap-1 bg-slate-950 py-2"
        >
          {ACTIVITIES.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (view === id && sidebar) setSidebar(false)
                else {
                  setView(id)
                  setSidebar(true)
                }
              }}
              aria-label={label}
              aria-pressed={view === id && sidebar}
              title={label}
              className={`relative flex h-9 w-9 items-center justify-center rounded text-lg ${
                view === id && sidebar
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span aria-hidden="true">{icon}</span>
              {id === 'scm' && content.git && <ScmBadge content={content} />}
            </button>
          ))}
        </div>

        {sidebar && (
          <aside
            aria-label="Side bar"
            className="w-60 shrink-0 overflow-hidden border-r border-slate-700 bg-slate-900"
          >
            {view === 'explorer' && (
              <Explorer
                content={content}
                active={active}
                canEdit={canEdit}
                onOpen={(n) => open(n)}
                onCreate={(name) => {
                  onUpdate?.((c) => ({
                    ...c,
                    files: [...c.files, { name, text: '', readOnly: false }],
                  }))
                  open(name)
                }}
                onRename={(from, to) => {
                  onUpdate?.((c) => ({
                    ...c,
                    files: c.files.map((f) => (f.name === from ? { ...f, name: to } : f)),
                    ide: c.ide && {
                      ...c.ide,
                      tabs: c.ide.tabs.map((t) => (t === from ? to : t)),
                      breakpoints: c.ide.breakpoints.map((b) =>
                        b.file === from ? { ...b, file: to } : b,
                      ),
                    },
                  }))
                  setLocalTabs((t) => t.map((n) => (n === from ? to : n)))
                  if (active === from) setActive(to)
                }}
                onDelete={(name) => {
                  onUpdate?.((c) => ({
                    ...c,
                    files: c.files.filter((f) => f.name !== name),
                    ide: c.ide && {
                      ...c.ide,
                      breakpoints: c.ide.breakpoints.filter((b) => b.file !== name),
                    },
                  }))
                  close(name)
                }}
              />
            )}
            {view === 'search' && (
              <SearchView
                content={content}
                canEdit={canEdit}
                onOpen={(f, line, column) => open(f, line, column)}
                onReplaceAll={(query, replacement, opts) =>
                  onUpdate?.((c) => ({
                    ...c,
                    files: c.files.map((f) =>
                      f.readOnly
                        ? f
                        : { ...f, text: replaceAllIn(f.text, query, replacement, opts) },
                    ),
                  }))
                }
              />
            )}
            {view === 'scm' && (
              <SourceControl
                content={content}
                canEdit={canEdit}
                onInit={(git) => onUpdate?.((c) => ({ ...c, git }))}
                onResult={(result, merge) =>
                  onUpdate?.((c) => ({
                    ...c,
                    files: withFiles(c, result.working),
                    git: result.git,
                    ide:
                      merge === undefined
                        ? c.ide
                        : { ...(c.ide ?? EMPTY_IDE), merge: merge ?? undefined },
                  }))
                }
                onDiff={(d) => setDiff(d)}
              />
            )}
            {view === 'debug' && (
              <RunDebug
                files={content.files}
                breakpoints={ide.breakpoints}
                session={session}
                busy={debugBusy}
                onStart={(t) => void startDebugging(t)}
                onStep={step}
                onRemoveBreakpoint={(bp) => toggleBreakpoint(bp.line, bp.file)}
                onOpen={(f, line) => open(f, line)}
              />
            )}
            {view === 'extensions' && (
              <Extensions
                installed={ide.extensions}
                canEdit={canEdit}
                onToggle={(id) =>
                  updateIde((i) => ({
                    ...i,
                    extensions: i.extensions.includes(id)
                      ? i.extensions.filter((e) => e !== id)
                      : [...i.extensions, id],
                  }))
                }
              />
            )}
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Open files"
            className="flex shrink-0 overflow-x-auto bg-slate-950"
          >
            {tabs.map((t) => (
              <div
                key={t}
                className={`group flex shrink-0 items-center border-r border-slate-800 ${
                  t === active && !diff ? 'bg-slate-900 text-white' : 'text-slate-300'
                }`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={t === active && !diff}
                  onClick={() => open(t)}
                  onAuxClick={(e) => e.button === 1 && close(t)}
                  className="py-1.5 pr-1 pl-3 font-mono text-[13px]"
                  title={t}
                >
                  {t.split('/').pop()}
                  {content.files.find((f) => f.name === t)?.readOnly && (
                    <span className="ml-1 font-sans text-[11px] text-slate-400">
                      (read only)
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => close(t)}
                  aria-label={`Close ${t}`}
                  className="mr-1 rounded px-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {diff && (
              <div className="flex shrink-0 items-center bg-slate-900 text-white">
                <span
                  role="tab"
                  aria-selected="true"
                  className="py-1.5 pr-1 pl-3 font-mono text-[13px]"
                >
                  {diff.label} ↔
                </span>
                <button
                  type="button"
                  onClick={() => setDiff(null)}
                  aria-label="Close the changes view"
                  className="mr-1 rounded px-1 text-xs text-slate-400 hover:bg-slate-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {file && !diff && (
            <p
              className="shrink-0 truncate bg-slate-900 px-3 py-0.5 text-xs text-slate-300"
              aria-label="Breadcrumbs"
            >
              {file.name.split('/').join(' › ')}
              {file.readOnly && ' — read only: don’t change this file'}
            </p>
          )}
          <div className="min-h-0 flex-1">
            <EditorBoundary fallback={plain}>
              <Suspense
                fallback={
                  <p className="p-3 text-sm text-slate-300">Loading the editor…</p>
                }
              >
                {diff ? (
                  <MonacoDiff
                    original={diff.original}
                    modified={diff.modified}
                    name={diff.name}
                  />
                ) : (
                  <MonacoEditor
                    files={content.files}
                    active={active}
                    readOnly={!canEdit}
                    options={options}
                    breakpoints={ide.breakpoints
                      .filter((b) => b.file === active)
                      .map((b) => b.line)}
                    highlight={highlight}
                    onChange={setText}
                    onToggleBreakpoint={(line) => toggleBreakpoint(line)}
                    onProblems={setProblems}
                    onCursor={(line, column) => setCursor({ line, column })}
                    onCommand={command}
                    apiRef={(a) => {
                      api.current = a
                    }}
                  />
                )}
              </Suspense>
            </EditorBoundary>
          </div>

          {/* Panel */}
          <div
            className="flex shrink-0 items-center gap-1 border-t border-slate-700 bg-slate-900 px-2 pt-1"
            role="tablist"
            aria-label="Panel"
          >
            {(
              [
                ['problems', `Problems${problems.length ? ` (${problems.length})` : ''}`],
                ['tests', 'Tests'],
                ['terminal', 'Terminal'],
                ['debug', 'Debug Console'],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={panelOpen && panel === id}
                onClick={() => {
                  setPanel(id)
                  setPanelOpen(true)
                }}
                className={`rounded-t px-3 py-1 text-xs font-medium ${
                  panelOpen && panel === id
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPanelOpen((p) => !p)}
              aria-label={panelOpen ? 'Hide the panel' : 'Show the panel'}
              className="ml-auto rounded px-2 text-xs text-slate-300 hover:bg-slate-700"
            >
              {panelOpen ? '▾' : '▴'}
            </button>
          </div>
          {panelOpen && panel === 'problems' && (
            <section
              aria-label="Problems"
              data-testid="problems"
              className="h-48 shrink-0 overflow-y-auto bg-slate-950 p-2 text-sm"
            >
              {problems.length === 0 ? (
                <p className="text-slate-300">
                  No problems have been detected in the project.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {problems.map((p, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => open(p.file, p.line, p.column)}
                        className="w-full text-left hover:bg-slate-800"
                      >
                        <span
                          className={
                            p.severity === 'error' ? 'text-red-400' : 'text-amber-300'
                          }
                        >
                          {p.severity === 'error' ? '⊗' : '⚠'}
                        </span>{' '}
                        {p.message}{' '}
                        <span className="font-mono text-xs text-slate-400">
                          {p.file}:{p.line}:{p.column}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {panelOpen && panel === 'terminal' && (
            <section
              aria-label="Terminal"
              className="flex h-56 shrink-0 flex-col bg-slate-950 p-3 text-slate-100"
            >
              <p className="pb-1 text-[11px] text-slate-400">
                Simulated terminal: WorkSim carries out these commands itself; nothing
                runs on your computer.
              </p>
              <div className="min-h-0 flex-1">
                <TerminalPanel content={content} editable={canEdit} update={onUpdate} />
              </div>
            </section>
          )}
          {panelOpen && panel === 'debug' && (
            <section
              aria-label="Debug console"
              className="h-56 shrink-0 overflow-y-auto bg-slate-950 p-3 text-slate-100"
            >
              <DebugPanel
                content={content}
                editable={canEdit}
                update={onUpdate}
                onLine={(name, line) => {
                  open(name)
                  setErrorLine({ file: name, line })
                }}
              />
            </section>
          )}
          <section
            aria-label="Test results"
            data-testid="test-results"
            hidden={!panelOpen || panel !== 'tests'}
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
        </main>
      </div>

      {/* Status bar */}
      <footer
        className="flex shrink-0 items-center gap-3 overflow-hidden bg-sky-800 px-2 py-0.5 text-xs whitespace-nowrap text-white"
        data-testid="status-bar"
      >
        {content.git && (
          <button
            type="button"
            onClick={() => command('scm')}
            className="hover:underline"
            title="Branch"
          >
            ⑂ {content.git.head}
            {content.ide?.merge ? ' (merging)' : ''}
          </button>
        )}
        <button
          type="button"
          onClick={() => command('problems')}
          className="hover:underline"
          title="Problems"
        >
          ⊗ {errors} ⚠ {warnings}
        </button>
        {session && <span>▷ Debugging {session.target.fn}</span>}
        {run && !run.error && (
          <span>
            Tests: {passed}/{run.tests.length}
          </span>
        )}
        {notice && (
          <span role="status" className="truncate">
            {notice}
          </span>
        )}
        <span className="ml-auto">
          Ln {cursor.line}, Col {cursor.column}
        </span>
        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span>{file ? languageOf(file.name) : ''}</span>
        <span title="Code runs inside the game, in a sandbox">Simulated workspace</span>
      </footer>

      {palette && (
        <Palette
          mode={palette}
          files={names}
          onCommand={command}
          onOpenFile={(n) => open(n)}
          onClose={() => setPalette(null)}
        />
      )}
      {dialog && (
        <div
          className="absolute inset-0 z-[var(--z-menu)] flex items-center justify-center bg-black/40"
          onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}
        >
          <div
            role="dialog"
            aria-label={dialog === 'about' ? 'About' : 'Keyboard shortcuts'}
            className="max-h-[80%] w-[min(30rem,90%)] overflow-y-auto rounded-md border border-slate-600 bg-slate-800 p-4 text-sm text-slate-100"
          >
            {dialog === 'about' ? (
              <>
                <h2 className="text-base font-semibold">About the Code editor</h2>
                <p className="mt-2">
                  WorkSim’s own editor, laid out like the code editors developers use at
                  work. The text editor is Monaco, the open-source editor component of
                  Visual Studio Code (MIT licence), bundled with the game.
                </p>
                <p className="mt-2">
                  The terminal, Git, the debugger and the extensions are simulations: code
                  runs in a sandbox inside the game, nothing is downloaded, and nothing
                  runs on your computer.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                  {COMMANDS.filter(([, , keys]) => keys).map(([id, label, keys]) => (
                    <div key={id} className="contents">
                      <dt>{label}</dt>
                      <dd className="font-mono text-xs text-slate-300">{keys}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            <button
              type="button"
              onClick={() => setDialog(null)}
              className="mt-4 rounded bg-sky-700 px-3 py-1 text-white hover:bg-sky-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScmBadge({ content }: { content: CodeContent }) {
  const git = content.git
  if (!git) return null
  const changed = content.files.filter((f) => git.index[f.name] !== f.text).length
  if (!changed) return null
  return (
    <span
      className="absolute -right-0.5 -bottom-0.5 rounded-full bg-sky-600 px-1 text-[10px] leading-4 text-white"
      aria-label={`${changed} changed`}
    >
      {changed}
    </span>
  )
}
