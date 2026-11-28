/**
 * The "From a professional tool" tab of the insert picker: the reports,
 * schedules, charts and plans that the player's tool files produce (Books'
 * profit and loss, a campaign's results, Space Studio's floor plan…), each
 * inserted into the document or presentation as a copy.
 */
import { useMemo, useState } from 'react'
import type { ChartSpec, ToolDocument } from '../../persistence/schemas'
import { clipTable, MAX_COLUMNS, MAX_ROWS, outputsOf } from '../../tools/outputs'
import { getTool } from '../../tools/registry'
import type { ToolOutput } from '../../tools/types'
import { ChartView } from '../../ui/ChartView'

interface ToolOutputsTabProps {
  files: ToolDocument[]
  chartsOnly: boolean
  onChart: (chart: ChartSpec) => void
  onTable: (rows: string[][]) => void
  /** Pictures are offered only where they can be inserted. */
  onImage?: (dataUrl: string, alt: string) => void
}

export function ToolOutputsTab({
  files,
  chartsOnly,
  onChart,
  onTable,
  onImage,
}: ToolOutputsTabProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const groups = useMemo(
    () =>
      files
        .flatMap((file) => {
          const tool = getTool(file.content.tool)
          const outputs = outputsOf(file.content).filter((o) =>
            o.chart ? true : o.image ? !!onImage : !chartsOnly,
          )
          return tool && outputs.length ? [{ file, toolName: tool.name, outputs }] : []
        })
        .sort((a, b) => b.file.updatedAt - a.file.updatedAt),
    [files, chartsOnly, onImage],
  )

  async function insert(key: string, output: ToolOutput) {
    setError(null)
    if (output.chart) onChart(output.chart)
    else if (output.table) onTable(clipTable(output.table))
    else if (output.image && onImage) {
      setBusy(key)
      try {
        onImage(await output.image(), output.title)
      } catch (e) {
        setError(
          `The picture could not be made: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
      setBusy(null)
    }
  }

  if (groups.length === 0)
    return (
      <p className="text-sm text-slate-600">
        None of your professional tools' files has anything to insert yet. Open a tool
        from the dock (Books, Space Studio, Data Studio…), do some work in it, then come
        back: its reports, schedules and charts appear here.
      </p>
    )

  return (
    <div className="space-y-5" data-testid="tool-outputs">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      {groups.map(({ file, toolName, outputs }) => (
        <section key={file.id} aria-label={`${toolName}: ${file.title}`}>
          <h3 className="text-sm font-semibold text-slate-800">
            {file.title} <span className="font-normal text-slate-500">· {toolName}</span>
          </h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {outputs.map((output) => {
              const key = `${file.id}:${output.id}`
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void insert(key, output)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60"
                    data-testid="tool-output"
                  >
                    {output.chart ? (
                      <ChartView chart={output.chart} className="w-full" />
                    ) : output.table ? (
                      <TablePreview rows={output.table} />
                    ) : (
                      <span className="flex h-20 items-center justify-center rounded bg-slate-50 text-xs text-slate-500">
                        {busy === key
                          ? 'Drawing the picture…'
                          : 'A picture, drawn when inserted'}
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-slate-600">
                      {output.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <p className="text-xs text-slate-500">
        What is inserted is a copy, worked out from the file now: it does not change when
        the file changes. Tables are limited to {MAX_ROWS} rows and {MAX_COLUMNS} columns.
      </p>
    </div>
  )
}

function TablePreview({ rows }: { rows: string[][] }) {
  const shown = rows.slice(0, 4).map((row) => row.slice(0, 4))
  return (
    <span className="block overflow-hidden rounded border border-slate-100">
      <table className="w-full text-[10px] leading-tight">
        <tbody>
          {shown.map((row, r) => (
            <tr key={r} className={r === 0 ? 'bg-slate-50 font-medium' : ''}>
              {row.map((value, c) => (
                <td key={c} className="truncate px-1 py-0.5">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 4 && (
        <span className="block px-1 text-[10px] text-slate-400">
          {rows.length - 1} rows in all
        </span>
      )}
    </span>
  )
}
