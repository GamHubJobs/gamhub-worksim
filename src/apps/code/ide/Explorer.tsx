/** The Explorer: the project's folders and files, with a right-click menu. */
import { useState, type FormEvent } from 'react'
import { fileTree, pathProblem, type TreeNode } from '../../../game/code/ide'
import type { CodeContent } from '../../../persistence/schemas'

interface ExplorerProps {
  content: CodeContent
  active: string
  canEdit: boolean
  onOpen: (name: string) => void
  onCreate: (name: string) => void
  onRename: (from: string, to: string) => void
  onDelete: (name: string) => void
}

type Editing = { kind: 'new'; folder: string } | { kind: 'rename'; file: string } | null

export function Explorer({
  content,
  active,
  canEdit,
  onOpen,
  onCreate,
  onRename,
  onDelete,
}: ExplorerProps) {
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<{ x: number; y: number; file: string } | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const names = content.files.map((f) => f.name)
  const tree = fileTree(names)

  function startNew(folder = '') {
    setEditing({ kind: 'new', folder })
    setDraft(folder ? `${folder}/` : '')
    setProblem(null)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    const others =
      editing.kind === 'rename' ? names.filter((n) => n !== editing.file) : names
    const issue = pathProblem(draft.trim(), others)
    if (issue) {
      setProblem(issue)
      return
    }
    if (editing.kind === 'new') onCreate(draft.trim())
    else onRename(editing.file, draft.trim())
    setEditing(null)
  }

  const fileOf = (name: string) => content.files.find((f) => f.name === name)

  function renderNode(node: TreeNode, depth: number) {
    const pad = { paddingLeft: `${0.5 + depth * 0.75}rem` }
    if (node.folder) {
      const open = !closed.has(node.path)
      return (
        <li key={`d:${node.path}`}>
          <button
            type="button"
            style={pad}
            aria-expanded={open}
            onClick={() =>
              setClosed((s) => {
                const next = new Set(s)
                if (open) next.add(node.path)
                else next.delete(node.path)
                return next
              })
            }
            className="flex w-full items-center gap-1 py-0.5 pr-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
          >
            <span aria-hidden="true" className="w-3 text-xs">
              {open ? '▾' : '▸'}
            </span>
            {node.name}
          </button>
          {open && <ul>{node.children.map((c) => renderNode(c, depth + 1))}</ul>}
        </li>
      )
    }
    const file = fileOf(node.path)
    return (
      <li key={node.path}>
        <button
          type="button"
          style={pad}
          onClick={() => onOpen(node.path)}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ x: e.clientX, y: e.clientY, file: node.path })
          }}
          aria-current={node.path === active ? 'true' : undefined}
          title={node.path}
          className={`flex w-full items-center justify-between gap-2 py-0.5 pr-2 text-left font-mono text-[13px] ${
            node.path === active
              ? 'bg-sky-900/70 text-white'
              : 'text-slate-200 hover:bg-slate-700/60'
          }`}
        >
          <span className="truncate pl-4">{node.name}</span>
          {file?.readOnly && (
            <span
              className="shrink-0 font-sans text-[11px] text-slate-300"
              title="Read only"
            >
              read only
            </span>
          )}
        </button>
      </li>
    )
  }

  return (
    <div className="flex h-full flex-col" onClick={() => setMenu(null)}>
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
          Explorer
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={() => startNew()}
            className="rounded px-1.5 text-xs text-slate-200 hover:bg-slate-700"
            aria-label="New file"
            title="New file"
          >
            + File
          </button>
        )}
      </div>
      {editing && (
        <form onSubmit={submit} className="px-2 pb-2">
          <label className="block text-xs text-slate-300">
            {editing.kind === 'new'
              ? 'New file (use / for folders)'
              : `Rename ${editing.file}`}
            <input
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setProblem(null)
              }}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
              aria-label={editing.kind === 'new' ? 'New file name' : 'New name'}
              className="mt-1 w-full rounded border border-sky-600 bg-slate-950 px-2 py-1 font-mono text-[13px] text-white"
            />
          </label>
          {problem && (
            <p role="alert" className="mt-1 text-xs text-red-300">
              {problem}
            </p>
          )}
        </form>
      )}
      <nav aria-label="Files" className="min-h-0 flex-1 overflow-y-auto pb-2">
        <ul>{tree.map((n) => renderNode(n, 0))}</ul>
      </nav>
      {menu && (
        <ul
          role="menu"
          aria-label={`Actions for ${menu.file}`}
          className="fixed z-[var(--z-menu)] min-w-40 rounded border border-slate-600 bg-slate-800 py-1 text-sm text-slate-100 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          {(
            [
              ['Open', () => onOpen(menu.file), true],
              [
                'New file here',
                () => startNew(menu.file.split('/').slice(0, -1).join('/')),
                canEdit,
              ],
              [
                'Rename…',
                () => {
                  setEditing({ kind: 'rename', file: menu.file })
                  setDraft(menu.file)
                  setProblem(null)
                },
                canEdit && !fileOf(menu.file)?.readOnly,
              ],
              [
                'Delete',
                () => onDelete(menu.file),
                canEdit && !fileOf(menu.file)?.readOnly && names.length > 1,
              ],
              ['Copy path', () => void navigator.clipboard?.writeText(menu.file), true],
            ] as const
          ).map(([label, act, enabled]) => (
            <li key={label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={!enabled}
                onClick={() => {
                  setMenu(null)
                  act()
                }}
                className="w-full px-3 py-1 text-left hover:bg-sky-800 disabled:opacity-40"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
