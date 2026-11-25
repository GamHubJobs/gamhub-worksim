/**
 * A tool's own projects on its start page (Space Studio): make one (blank or
 * from a starter), open, duplicate, rename, delete (with confirmation), and
 * import a backup as a new project.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDateTime } from '../../lib/time'
import {
  createToolProject,
  deleteToolProject,
  duplicateToolProject,
  listToolProjects,
  renameToolProject,
  type ToolProject,
} from '../../persistence/toolProjects'
import type { AnyTool } from '../../tools/types'
import { Icon } from '../../ui/Icon'

export function ToolProjects({
  tool,
  profileId,
  onOpen,
}: {
  tool: AnyTool
  profileId: string
  onOpen: (documentId: string) => void
}) {
  const projects = tool.projects!
  const [list, setList] = useState<ToolProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [starter, setStarter] = useState(projects.starters[0]?.id ?? '')
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState<ToolProject | null>(null)
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setList(await listToolProjects(profileId, tool.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [profileId, tool.id])
  useEffect(() => {
    let alive = true
    listToolProjects(profileId, tool.id).then(
      (projects) => alive && setList(projects),
      (e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      alive = false
    }
  }, [profileId, tool.id])

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  const create = () =>
    run(async () => {
      const s = projects.starters.find((x) => x.id === starter) ?? projects.starters[0]
      const title = name.trim() || (s.id === 'blank' ? 'Untitled project' : s.name)
      const state = projects.named ? projects.named(s.make(), title) : s.make()
      const id = await createToolProject(profileId, tool.id, title, state)
      setCreating(false)
      setName('')
      onOpen(id)
    })

  const importBackup = (f: File) =>
    run(async () => {
      if (!projects.fromBackup) return
      if (f.size > 20_000_000)
        throw new Error('That file is too large to be a project backup.')
      const read = projects.fromBackup(await f.text())
      if (!read.ok) throw new Error(read.error)
      // A drawing is named after its file; a backup keeps its project's name.
      const fromFile = f.name.replace(/\.[^.]+$/, '')
      const base =
        (/\.dxf$/i.test(f.name)
          ? fromFile
          : ((read.state as { project?: { name?: string } }).project?.name ??
            fromFile)) || 'Imported project'
      const title = `${base} (imported)`
      const id = await createToolProject(
        profileId,
        tool.id,
        title,
        projects.named ? projects.named(read.state, title) : read.state,
      )
      await load()
      onOpen(id)
    })

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4"
      data-testid="tool-projects"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Your projects</h2>
        <div className="flex gap-2">
          {projects.fromBackup && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => file.current?.click()}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                Import a backup or DXF
              </button>
              <input
                ref={file}
                type="file"
                accept=".json,.dxf,application/json"
                className="hidden"
                data-testid="import-project"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void importBackup(f)
                }}
              />
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setCreating((v) => !v)}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            data-testid="new-project"
          >
            New project
          </button>
        </div>
      </div>

      {creating && (
        <form
          className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            void create()
          }}
        >
          <label className="block text-sm">
            <span className="text-slate-700">Name</span>
            <input
              autoFocus
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Harbour Street offices"
              data-testid="new-project-name"
            />
          </label>
          <fieldset>
            <legend className="text-sm text-slate-700">Start from</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              {projects.starters.map((s) => (
                <label
                  key={s.id}
                  className={`cursor-pointer rounded border p-2 text-sm ${starter === s.id ? 'border-blue-500 bg-white' : 'border-slate-200 bg-white/60'}`}
                >
                  <input
                    type="radio"
                    name="starter"
                    value={s.id}
                    checked={starter === s.id}
                    onChange={() => setStarter(s.id)}
                    className="mr-1"
                  />
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-slate-500">{s.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded px-3 py-1.5 text-sm hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white hover:bg-blue-800"
              data-testid="create-project"
            >
              Create and open
            </button>
          </div>
        </form>
      )}

      {list === null ? (
        <p className="mt-2 text-sm text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          No projects yet. Start one to design freely; it saves as you work.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100" data-testid="project-list">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-2">
              <Icon name={tool.icon} className="h-5 w-5 shrink-0 text-indigo-700" />
              {renaming?.id === p.id ? (
                <form
                  className="flex min-w-0 flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void run(async () => {
                      await renameToolProject(
                        p.id,
                        renaming.title,
                        projects.named as
                          ((s: unknown, n: string) => unknown) | undefined,
                      )
                      setRenaming(null)
                      await load()
                    })
                  }}
                >
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm"
                    value={renaming.title}
                    onChange={(e) => setRenaming({ id: p.id, title: e.target.value })}
                    aria-label="New name"
                    data-testid="rename-input"
                  />
                  <button
                    type="submit"
                    className="rounded bg-slate-800 px-2 text-sm text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming(null)}
                    className="rounded px-2 text-sm hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className="min-w-0 flex-1 text-left hover:underline"
                    data-testid="open-project"
                  >
                    <span className="block truncate font-medium text-slate-900">
                      {p.title}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {tool.summary(p.content)} · changed {formatDateTime(p.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        async () => (
                          await duplicateToolProject(
                            profileId,
                            tool.id,
                            p.id,
                            projects.named as
                              ((s: unknown, n: string) => unknown) | undefined,
                          ),
                          await load()
                        ),
                      )
                    }
                    className="rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRenaming({ id: p.id, title: p.title })}
                    className="rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDeleting(p)}
                    className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    data-testid="delete-project"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
            <h2 id="delete-project-title" className="font-semibold text-slate-900">
              Delete “{deleting.title}”?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              The project is removed from this save. Export a backup first (Export, then
              Project backup) if you might want it again.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded px-3 py-1.5 text-sm hover:bg-slate-100"
              >
                Keep it
              </button>
              <button
                type="button"
                autoFocus
                className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800"
                data-testid="confirm-delete-project"
                onClick={() => {
                  const target = deleting
                  setDeleting(null)
                  void run(async () => {
                    await deleteToolProject(profileId, tool.id, target.id)
                    await load()
                  })
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
