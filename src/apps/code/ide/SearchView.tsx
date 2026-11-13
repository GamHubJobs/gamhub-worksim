/** Search across the project's files, with replace. */
import { useMemo, useState } from 'react'
import { searchFiles, type SearchOptions } from '../../../game/code/ide'
import type { CodeContent } from '../../../persistence/schemas'

export function SearchView({
  content,
  canEdit,
  onOpen,
  onReplaceAll,
}: {
  content: CodeContent
  canEdit: boolean
  onOpen: (file: string, line: number, column: number) => void
  onReplaceAll: (query: string, replacement: string, options: SearchOptions) => void
}) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [options, setOptions] = useState<SearchOptions>({})
  const results = useMemo(
    () => searchFiles(content.files, query, options),
    [content.files, query, options],
  )
  const toggle = (key: keyof SearchOptions, label: string, short: string) => (
    <button
      type="button"
      aria-pressed={!!options[key]}
      title={label}
      aria-label={label}
      onClick={() => setOptions((o) => ({ ...o, [key]: !o[key] }))}
      className={`rounded px-1.5 font-mono text-xs ${
        options[key] ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      {short}
    </button>
  )
  const byFile = Array.isArray(results)
    ? [...new Set(results.map((m) => m.file))].map((file) => ({
        file,
        matches: results.filter((m) => m.file === file),
      }))
    : []
  const writable = new Set(content.files.filter((f) => !f.readOnly).map((f) => f.name))

  return (
    <div className="flex h-full flex-col">
      <h2 className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
        Search
      </h2>
      <div className="space-y-1.5 px-2">
        <div className="flex items-center gap-1 rounded border border-slate-600 bg-slate-950 pr-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search files"
            className="min-w-0 flex-1 bg-transparent px-2 py-1 text-[13px] text-white outline-none"
          />
          {toggle('caseSensitive', 'Match case', 'Aa')}
          {toggle('wholeWord', 'Match whole word', 'ab')}
          {toggle('regex', 'Use regular expression', '.*')}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Replace"
              aria-label="Replace with"
              className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[13px] text-white"
            />
            <button
              type="button"
              disabled={!Array.isArray(results) || results.length === 0}
              onClick={() => onReplaceAll(query, replacement, options)}
              className="rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600 disabled:opacity-40"
            >
              Replace all
            </button>
          </div>
        )}
        {typeof results === 'string' ? (
          <p role="alert" className="text-xs text-red-300">
            {results}
          </p>
        ) : (
          query && (
            <p className="text-xs text-slate-300" data-testid="search-summary">
              {results.length} result{results.length === 1 ? '' : 's'} in {byFile.length}{' '}
              file
              {byFile.length === 1 ? '' : 's'}
              {canEdit &&
                byFile.some((g) => !writable.has(g.file)) &&
                ' (read-only files are not replaced)'}
            </p>
          )
        )}
      </div>
      <ul className="mt-2 min-h-0 flex-1 overflow-y-auto text-[13px]">
        {byFile.map(({ file, matches }) => (
          <li key={file}>
            <p className="px-3 py-0.5 font-mono text-slate-100">{file}</p>
            <ul>
              {matches.map((m) => (
                <li key={`${m.line}:${m.column}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(m.file, m.line, m.column)}
                    className="block w-full truncate py-0.5 pr-2 pl-6 text-left font-mono text-slate-300 hover:bg-slate-700/60"
                  >
                    <span className="text-slate-400">{m.line}: </span>
                    {m.text.slice(Math.max(0, m.column - 20), m.column - 1)}
                    <mark className="bg-amber-500/40 text-white">
                      {m.text.slice(m.column - 1, m.column - 1 + m.length)}
                    </mark>
                    {m.text.slice(m.column - 1 + m.length, m.column + 60)}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
