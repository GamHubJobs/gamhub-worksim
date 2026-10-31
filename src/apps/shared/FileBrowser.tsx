/**
 * The file list of Docs and Slides: start something new from a template,
 * and open, rename or delete existing files.
 */
import { useCallback, useEffect, useState } from 'react'
import { formatDateTime } from '../../lib/time'
import {
  deleteDocument,
  listDocuments,
  updateDocument,
} from '../../persistence/documentsRepo'
import type { AnyDocument, DocumentKind } from '../../persistence/schemas'
import { describeContent } from '../../ui/documentSummary'
import { Icon, type IconName } from '../../ui/Icon'
import { visibleTo } from './ownership'

export interface TemplateChoice {
  id: string
  name: string
  description: string
}

interface FileBrowserProps {
  kind: Exclude<DocumentKind, 'sheet'>
  heading: string
  icon: IconName
  /** Tailwind classes for the file icon, e.g. "bg-blue-100 text-blue-700". */
  iconColors: string
  templates: TemplateChoice[]
  /** Files that belong to a task, by document ID, with the task's title. */
  linked: Record<string, string>
  /** The career save whose files are shown. */
  ownerId: string
  onCreate: (templateId: string) => Promise<void>
  onOpen: (documentId: string) => void
}

export function FileBrowser({
  kind,
  heading,
  icon,
  iconColors,
  templates,
  linked,
  ownerId,
  onCreate,
  onOpen,
}: FileBrowserProps) {
  const mine = visibleTo(ownerId)
  const [files, setFiles] = useState<AnyDocument[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState<AnyDocument | null>(null)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    const all = await listDocuments()
    setFiles(all.filter((file) => file.kind === kind && mine(file)))
  }, [kind, mine])

  useEffect(() => {
    let active = true
    listDocuments()
      .then((all) => {
        if (active)
          setFiles(all.filter((file) => file.kind === kind && visibleTo(ownerId)(file)))
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      active = false
    }
  }, [kind, ownerId])

  async function run(action: () => Promise<void>) {
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid={`${kind}-files`}>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="text-xl font-semibold text-slate-900">{heading}</h1>

        <section>
          <h2 className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase">
            Start something new
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() =>
                    run(async () => {
                      setCreating(true)
                      try {
                        await onCreate(template.id)
                      } finally {
                        setCreating(false)
                      }
                    })
                  }
                  className="flex h-full w-full flex-col rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
                >
                  <span className="font-medium text-slate-900">{template.name}</span>
                  <span className="mt-1 text-xs text-slate-500">
                    {template.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase">
            Your files
          </h2>
          {files === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : files.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
              Nothing here yet. Start from a template above.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {files.map((file) => (
                <li key={file.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconColors}`}
                  >
                    <Icon name={icon} />
                  </span>
                  {renaming?.id === file.id ? (
                    <input
                      autoFocus
                      aria-label="New name"
                      value={renaming.title}
                      maxLength={200}
                      onChange={(e) =>
                        setRenaming({ id: file.id, title: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setRenaming(null)
                        if (e.key === 'Enter' && renaming.title.trim()) {
                          const title = renaming.title.trim()
                          setRenaming(null)
                          void run(async () => {
                            await updateDocument(file.id, { title })
                            await reload()
                          })
                        }
                      }}
                      onBlur={() => setRenaming(null)}
                      className="min-w-0 flex-1 rounded border border-blue-400 px-2 py-1"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpen(file.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate font-medium text-slate-900">
                        {file.title}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {describeContent(file)} · changed {formatDateTime(file.updatedAt)}
                        {linked[file.id] && ` · Task: ${linked[file.id]}`}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRenaming({ id: file.id, title: file.title })}
                    className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Rename
                  </button>
                  {!linked[file.id] && (
                    <button
                      type="button"
                      onClick={() => setDeleting(file)}
                      className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="delete-title" className="text-lg font-semibold text-slate-900">
              Delete “{deleting.title}”?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              It will disappear from your files. Backups you made earlier still contain
              it.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-md px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => {
                  const file = deleting
                  setDeleting(null)
                  void run(async () => {
                    await deleteDocument(file.id)
                    await reload()
                  })
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
