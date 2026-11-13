/**
 * The code editor itself: Monaco (the editor component of VS Code, MIT
 * licence), loaded on demand. One editor shows the open file; every file
 * of the project has a model, so the Problems list covers all of them and
 * each keeps its own undo history.
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { monaco } from './monacoSetup'
import { languageOf, type CommandId } from '../../game/code/ide'
import type { editor as MonacoEditorNs } from 'monaco-editor'

export interface Problem {
  file: string
  line: number
  column: number
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface EditorApi {
  /** Runs one of Monaco's own actions, e.g. "actions.find". */
  run: (action: string) => void
  reveal: (line: number, column?: number) => void
  focus: () => void
  undo: () => void
  redo: () => void
}

export interface EditorOptions {
  wordWrap: boolean
  minimap: boolean
  brackets: boolean
  whitespace: boolean
}

export interface MonacoEditorProps {
  files: Array<{ name: string; text: string; readOnly?: boolean }>
  active: string
  readOnly: boolean
  options: EditorOptions
  /** Breakpoint lines in the active file. */
  breakpoints: number[]
  highlight: { line: number; kind: 'debug' | 'error' } | null
  onChange: (file: string, text: string) => void
  onToggleBreakpoint: (line: number) => void
  onProblems: (problems: Problem[]) => void
  onCursor: (line: number, column: number) => void
  onCommand: (id: CommandId) => void
  apiRef: (api: EditorApi | null) => void
}

const SCHEME = 'inmemory'
const uriOf = (name: string) => monaco.Uri.from({ scheme: SCHEME, path: `/${name}` })
const nameOf = (uri: { path: string }) => uri.path.replace(/^\//, '')

function severityOf(s: number): Problem['severity'] {
  if (s === monaco.MarkerSeverity.Error) return 'error'
  if (s === monaco.MarkerSeverity.Warning) return 'warning'
  return 'info'
}

export default function MonacoEditor(props: MonacoEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const editorRef = useRef<MonacoEditorNs.IStandaloneCodeEditor | null>(null)
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })
  const viewStates = useRef(new Map<string, MonacoEditorNs.ICodeEditorViewState | null>())
  const decorations = useRef<MonacoEditorNs.IEditorDecorationsCollection | null>(null)
  // True while the editor changes a model from the props (not the player typing).
  const syncing = useRef(false)

  // Create the editor once.
  useEffect(() => {
    const el = host.current
    if (!el) return
    const editor = monaco.editor.create(el, {
      theme: 'worksim-dark',
      automaticLayout: true,
      glyphMargin: true,
      fontSize: 14,
      tabSize: 2,
      scrollBeyondLastLine: false,
      fixedOverflowWidgets: true,
      ariaLabel: 'Code editor',
    })
    editorRef.current = editor
    decorations.current = editor.createDecorationsCollection()
    // Tests (and the portfolio viewer) read the text through the element.
    Object.assign(el, { __worksimEditor: editor })

    const subs = [
      editor.onDidChangeModelContent(() => {
        const model = editor.getModel()
        if (!model || syncing.current) return
        latest.current.onChange(nameOf(model.uri), model.getValue())
      }),
      editor.onDidChangeCursorPosition((e) =>
        latest.current.onCursor(e.position.lineNumber, e.position.column),
      ),
      editor.onMouseDown((e) => {
        const t = e.target.type
        if (
          (t === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
            t === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS) &&
          e.target.position
        ) {
          latest.current.onToggleBreakpoint(e.target.position.lineNumber)
        }
      }),
      monaco.editor.onDidChangeMarkers(() => {
        const problems = monaco.editor
          .getModelMarkers({})
          .filter((m) => m.resource.scheme === SCHEME)
          .map((m): Problem => ({
            file: nameOf(m.resource),
            line: m.startLineNumber,
            column: m.startColumn,
            message: m.message,
            severity: severityOf(m.severity),
          }))
        latest.current.onProblems(problems)
      }),
    ]
    const K = monaco.KeyMod
    const C = monaco.KeyCode
    const bind = (keys: number, id: CommandId) =>
      editor.addCommand(keys, () => latest.current.onCommand(id))
    bind(K.CtrlCmd | C.KeyS, 'save')
    bind(K.CtrlCmd | K.Shift | C.KeyP, 'commandPalette')
    bind(C.F1, 'commandPalette')
    bind(K.CtrlCmd | C.KeyP, 'quickOpen')
    bind(C.F5, 'startDebugging')
    bind(C.F9, 'toggleBreakpoint')
    bind(K.CtrlCmd | C.KeyB, 'toggleSidebar')
    bind(K.CtrlCmd | C.KeyJ, 'togglePanel')
    bind(K.Alt | C.KeyZ, 'wordWrap')

    latest.current.apiRef({
      run: (action) => {
        editor.focus()
        void editor.getAction(action)?.run()
      },
      reveal: (line, column = 1) => {
        editor.revealLineInCenter(line)
        editor.setPosition({ lineNumber: line, column })
        editor.focus()
      },
      focus: () => editor.focus(),
      undo: () => editor.trigger('menu', 'undo', null),
      redo: () => editor.trigger('menu', 'redo', null),
    })

    return () => {
      latest.current.apiRef(null)
      subs.forEach((s) => s.dispose())
      editor.dispose()
      for (const model of monaco.editor.getModels()) {
        if (model.uri.scheme === SCHEME) model.dispose()
      }
      editorRef.current = null
    }
  }, [])

  // Keep a model for every file, in step with the saved text.
  const { files, active } = props
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const names = new Set(files.map((f) => f.name))
    for (const model of monaco.editor.getModels()) {
      if (model.uri.scheme === SCHEME && !names.has(nameOf(model.uri))) model.dispose()
    }
    syncing.current = true
    for (const file of files) {
      const uri = uriOf(file.name)
      const model =
        monaco.editor.getModel(uri) ??
        monaco.editor.createModel(file.text, languageOf(file.name), uri)
      if (model.getValue() !== file.text) {
        // As an edit, so Undo still works after the terminal or a merge changes a file.
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: file.text }],
          () => null,
        )
      }
    }
    syncing.current = false
    const current = editor.getModel()
    const next =
      monaco.editor.getModel(uriOf(active)) ??
      monaco.editor.getModel(uriOf(files[0]?.name ?? ''))
    if (next && current !== next) {
      if (current) viewStates.current.set(nameOf(current.uri), editor.saveViewState())
      editor.setModel(next)
      const state = viewStates.current.get(nameOf(next.uri))
      if (state) editor.restoreViewState(state)
    }
  }, [files, active])

  // Options and read-only.
  const { options, readOnly } = props
  const fileReadOnly = files.find((f) => f.name === active)?.readOnly ?? false
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.updateOptions({
      readOnly: readOnly || fileReadOnly,
      wordWrap: options.wordWrap ? 'on' : 'off',
      minimap: { enabled: options.minimap },
      bracketPairColorization: { enabled: options.brackets },
      guides: { bracketPairs: options.brackets },
      renderWhitespace: options.whitespace ? 'all' : 'selection',
    })
    host.current?.setAttribute('data-readonly', String(readOnly || fileReadOnly))
  }, [options, readOnly, fileReadOnly])

  // Breakpoints and the highlighted line.
  const { breakpoints, highlight } = props
  useEffect(() => {
    const list: MonacoEditorNs.IModelDeltaDecoration[] = breakpoints.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        glyphMarginClassName: 'ide-breakpoint',
        glyphMarginHoverMessage: { value: 'Breakpoint (click to remove)' },
      },
    }))
    if (highlight) {
      list.push({
        range: new monaco.Range(highlight.line, 1, highlight.line, 1),
        options: {
          isWholeLine: true,
          className: highlight.kind === 'debug' ? 'ide-debug-line' : 'ide-error-line',
        },
      })
      editorRef.current?.revealLineInCenterIfOutsideViewport(highlight.line)
    }
    decorations.current?.set(list)
  }, [breakpoints, highlight, active])

  return (
    <div
      ref={host}
      className="h-full min-h-0 w-full"
      data-testid="code-editor"
      data-engine="monaco"
      data-file={active}
    />
  )
}

/** Two versions of a file side by side, for Source Control. */
export function MonacoDiff({
  original,
  modified,
  name,
}: {
  original: string
  modified: string
  name: string
}) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current
    if (!el) return
    const diff = monaco.editor.createDiffEditor(el, {
      theme: 'worksim-dark',
      automaticLayout: true,
      readOnly: true,
      originalEditable: false,
      renderSideBySide: el.clientWidth > 700,
      scrollBeyondLastLine: false,
    })
    const a = monaco.editor.createModel(original, languageOf(name))
    const b = monaco.editor.createModel(modified, languageOf(name))
    diff.setModel({ original: a, modified: b })
    return () => {
      diff.dispose()
      a.dispose()
      b.dispose()
    }
  }, [original, modified, name])
  return <div ref={host} className="h-full min-h-0 w-full" data-testid="diff-editor" />
}
