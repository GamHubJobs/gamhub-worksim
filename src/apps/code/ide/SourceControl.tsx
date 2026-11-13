/**
 * Source Control: the project's Git repository with buttons, the same
 * repository the terminal's git commands use (see game/code/git.ts).
 */
import { useState } from 'react'
import {
  add,
  checkout,
  commit,
  completeMerge,
  headCommit,
  history,
  initRepository,
  restore,
  startMerge,
  status,
  type Git,
  type GitResult,
} from '../../../game/code/git'
import type { CodeContent } from '../../../persistence/schemas'

type FileMap = Record<string, string>

const fileMap = (content: CodeContent): FileMap =>
  Object.fromEntries(content.files.map((f) => [f.name, f.text]))

interface SourceControlProps {
  content: CodeContent
  canEdit: boolean
  /** Applies a Git result: the new repository and working files, and a message. */
  onResult: (
    result: GitResult,
    merge?: { branch: string; files: string[] } | null,
  ) => void
  onInit: (git: Git) => void
  onDiff: (diff: {
    name: string
    original: string
    modified: string
    label: string
  }) => void
}

export function SourceControl({
  content,
  canEdit,
  onResult,
  onInit,
  onDiff,
}: SourceControlProps) {
  const [message, setMessage] = useState('')
  const [branchName, setBranchName] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const git = content.git
  const working = fileMap(content)
  const merging = content.ide?.merge ?? null

  if (!git) {
    return (
      <div className="p-3 text-sm text-slate-200" data-testid="source-control">
        <h2 className="pb-2 text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
          Source Control
        </h2>
        <p className="text-slate-300">This project is not in a Git repository yet.</p>
        {canEdit && (
          <button
            type="button"
            onClick={() => onInit(initRepository(working))}
            className="mt-3 w-full rounded bg-sky-700 px-3 py-1.5 text-white hover:bg-sky-600"
          >
            Initialize Repository
          </button>
        )}
      </div>
    )
  }

  const s = status(git, working)
  const head = headCommit(git)
  const run = (result: GitResult, merge?: { branch: string; files: string[] } | null) => {
    setOutput(result.output)
    onResult(result, merge)
  }
  const unstaged = [
    ...s.unstaged.map((u) => ({ file: u.file, change: u.change as string })),
    ...s.untracked.map((file) => ({ file, change: 'new' })),
  ]
  const letter = (change: string) =>
    change === 'new' ? 'U' : change === 'deleted' ? 'D' : 'M'
  const others = Object.keys(git.branches).filter((b) => b !== git.head)

  function doCommit() {
    if (merging) {
      run(completeMerge(git!, working, merging.branch), null)
      return
    }
    const result = commit(git!, working, message)
    run(result)
    if (result.git !== git) setMessage('')
  }

  const row = (file: string, change: string, staged: boolean) => (
    <li
      key={`${staged}:${file}`}
      className="group flex items-center gap-1 pr-1 hover:bg-slate-700/60"
    >
      <button
        type="button"
        onClick={() =>
          onDiff({
            name: file,
            original: (staged ? head?.files[file] : git.index[file]) ?? '',
            modified: (staged ? git.index[file] : working[file]) ?? '',
            label: staged ? `${file} (staged)` : `${file} (working tree)`,
          })
        }
        className="min-w-0 flex-1 truncate py-0.5 pl-4 text-left font-mono text-[13px] text-slate-200"
        title="Show the changes"
      >
        {file}
      </button>
      {canEdit && !staged && change !== 'new' && (
        <button
          type="button"
          aria-label={`Discard changes to ${file}`}
          title="Discard changes"
          onClick={() => run(restore(git, working, file))}
          className="rounded px-1 text-xs text-slate-300 hover:bg-slate-600"
        >
          ↺
        </button>
      )}
      {canEdit && !staged && (
        <button
          type="button"
          aria-label={`Stage ${file}`}
          title="Stage changes"
          onClick={() => run(add(git, working, [file]))}
          className="rounded px-1 text-xs text-slate-200 hover:bg-slate-600"
        >
          +
        </button>
      )}
      <span
        className={`w-4 text-center text-xs font-semibold ${
          change === 'new'
            ? 'text-emerald-300'
            : change === 'deleted'
              ? 'text-red-300'
              : 'text-amber-300'
        }`}
      >
        {letter(change)}
      </span>
    </li>
  )

  return (
    <div
      className="flex h-full flex-col text-sm text-slate-200"
      data-testid="source-control"
    >
      <h2 className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
        Source Control
      </h2>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pb-3">
        {merging && (
          <div
            className="rounded border border-amber-500/60 bg-amber-900/30 p-2 text-xs text-amber-100"
            role="status"
          >
            Merging <strong>{merging.branch}</strong>: resolve the conflicts in{' '}
            {merging.files.join(', ')} (keep the right lines and delete the{' '}
            <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code> and{' '}
            <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> lines), then complete the merge.
          </div>
        )}
        {canEdit && (
          <div className="space-y-1">
            {!merging && (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) doCommit()
                }}
                rows={2}
                placeholder={`Message (Ctrl+Enter to commit on "${git.head}")`}
                aria-label="Commit message"
                className="w-full resize-none rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[13px] text-white"
              />
            )}
            <button
              type="button"
              onClick={doCommit}
              disabled={!merging && s.staged.length === 0}
              className="w-full rounded bg-sky-700 px-3 py-1 text-white hover:bg-sky-600 disabled:opacity-40"
            >
              {merging ? 'Complete merge' : 'Commit'}
            </button>
            {!merging && s.staged.length === 0 && unstaged.length > 0 && (
              <button
                type="button"
                onClick={() => run(add(git, working, ['.']))}
                className="w-full rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600"
              >
                Stage all changes
              </button>
            )}
          </div>
        )}
        {output.length > 0 && (
          <pre
            className="rounded bg-slate-950 p-2 text-xs whitespace-pre-wrap text-slate-200"
            data-testid="scm-output"
          >
            {output.join('\n')}
          </pre>
        )}
        <section aria-label="Staged changes">
          <h3 className="text-xs font-semibold text-slate-300">
            Staged changes ({s.staged.length})
          </h3>
          <ul>{s.staged.map((c) => row(c.file, c.change, true))}</ul>
        </section>
        <section aria-label="Changes">
          <h3 className="text-xs font-semibold text-slate-300">
            Changes ({unstaged.length})
          </h3>
          <ul>{unstaged.map((c) => row(c.file, c.change, false))}</ul>
          {s.clean && (
            <p className="pl-4 text-xs text-slate-400">
              Nothing to commit, working tree clean.
            </p>
          )}
        </section>
        <section aria-label="Branches" className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-300">
            Branch: <span className="font-mono text-sky-300">{git.head}</span>
          </h3>
          {canEdit && !merging && (
            <>
              {others.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {others.map((b) => (
                    <span
                      key={b}
                      className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs"
                    >
                      {b}
                      <button
                        type="button"
                        onClick={() => run(checkout(git, working, b))}
                        className="rounded px-1 text-sky-300 hover:bg-slate-700"
                        aria-label={`Switch to ${b}`}
                      >
                        switch
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const r = startMerge(git, working, b)
                          run(
                            r,
                            r.conflicts.length ? { branch: b, files: r.conflicts } : null,
                          )
                        }}
                        className="rounded px-1 text-sky-300 hover:bg-slate-700"
                        aria-label={`Merge ${b} into ${git.head}`}
                      >
                        merge
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <form
                className="flex gap-1"
                onSubmit={(e) => {
                  e.preventDefault()
                  const r = checkout(git, working, branchName.trim(), true)
                  run(r)
                  if (r.git !== git) setBranchName('')
                }}
              >
                <input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="new-branch-name"
                  aria-label="New branch name"
                  className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-0.5 font-mono text-xs text-white"
                />
                <button
                  type="submit"
                  className="rounded bg-slate-700 px-2 text-xs text-white hover:bg-slate-600"
                >
                  Create
                </button>
              </form>
            </>
          )}
        </section>
        <section aria-label="History">
          <h3 className="text-xs font-semibold text-slate-300">History</h3>
          <ol className="mt-1 space-y-0.5">
            {history(git, git.branches[git.head])
              .slice(0, 30)
              .map((c) => (
                <li key={c.id} className="flex gap-2 text-xs">
                  <span className="font-mono text-amber-300">{c.id}</span>
                  <span className="truncate text-slate-200" title={c.message}>
                    {c.parents.length > 1 ? '⑂ ' : ''}
                    {c.message}
                  </span>
                </li>
              ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
