/**
 * Takes data from Sheets into a document or presentation: a chart from any
 * workbook, or a range of cells as a table (as it is displayed, with its
 * number formats). What is inserted is a copy: it does not change when the
 * workbook changes, just like pasting into a report.
 */
import { useEffect, useMemo, useState } from 'react'
import { listDocuments } from '../../persistence/documentsRepo'
import type { ChartSpec, SheetDocument } from '../../persistence/schemas'
import { ChartView } from '../../ui/ChartView'
import { visibleTo } from './ownership'
import { createCalculator } from '../sheets/engine/workbook'
import { chartSpec, rangeAsText } from '../sheets/features'
import { rangeToText, usedSize } from '../sheets/model'

export type PickerMode = 'chart' | 'table'

interface SheetsPickerProps {
  mode: PickerMode
  /** Only offer charts (e.g. for slides). */
  chartsOnly?: boolean
  /** The career save whose workbooks are offered. */
  ownerId: string
  onChart: (chart: ChartSpec) => void
  onTable: (rows: string[][]) => void
  onClose: () => void
}
export function SheetsPicker({
  mode: initialMode,
  onChart,
  chartsOnly = false,
  ownerId,
  onTable,
  onClose,
}: SheetsPickerProps) {
  const [mode, setMode] = useState(initialMode)
  const [workbooks, setWorkbooks] = useState<SheetDocument[] | null>(null)
  const [workbookId, setWorkbookId] = useState('')
  const [sheetId, setSheetId] = useState('')
  const [rangeText, setRangeText] = useState('')

  useEffect(() => {
    let active = true
    void listDocuments().then((all) => {
      if (!active) return
      const sheets = all.filter(
        (d): d is SheetDocument => d.kind === 'sheet' && visibleTo(ownerId)(d),
      )
      setWorkbooks(sheets)
      const first = sheets[0]
      if (first) {
        setWorkbookId(first.id)
        setSheetId(first.content.sheets[0].id)
        const used = usedSize(first.content.sheets[0])
        setRangeText(
          rangeToText({
            top: 0,
            left: 0,
            bottom: Math.max(0, used.rows - 1),
            right: Math.max(0, used.columns - 1),
          }),
        )
      }
    })
    return () => {
      active = false
    }
  }, [ownerId])

  const charts = useMemo(() => {
    if (!workbooks) return []
    return workbooks.flatMap((workbook) => {
      const calculator = createCalculator(workbook.content)
      return workbook.content.sheets.flatMap((sheet) =>
        (sheet.charts ?? []).map((chart) => ({
          key: chart.id,
          source: `${workbook.title} · ${sheet.name}`,
          spec: chartSpec(calculator, sheet.id, chart),
        })),
      )
    })
  }, [workbooks])

  const workbook = workbooks?.find((w) => w.id === workbookId)
  const preview = workbook ? rangeAsText(workbook, sheetId, rangeText) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Insert from Grid Craft"
      data-testid="sheets-picker"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex gap-1" role="tablist">
            {(chartsOnly ? (['chart'] as const) : (['chart', 'table'] as const)).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab}
                  onClick={() => setMode(tab)}
                  className={`rounded px-3 py-1 text-sm ${
                    mode === tab
                      ? 'bg-blue-50 font-medium text-blue-900'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'chart' ? 'A chart' : 'A table of cells'}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {workbooks === null ? (
            <p className="text-sm text-slate-500">Loading your workbooks…</p>
          ) : mode === 'chart' ? (
            charts.length === 0 ? (
              <p className="text-sm text-slate-600">
                None of your workbooks has a chart yet. In Grid Craft, select a table and
                click <strong>Chart</strong> in the toolbar to make one.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {charts.map((chart) => (
                  <li key={chart.key}>
                    <button
                      type="button"
                      onClick={() => onChart(chart.spec)}
                      className="w-full rounded-lg border border-slate-200 p-2 text-left hover:border-blue-400 hover:bg-blue-50"
                    >
                      <ChartView chart={chart.spec} className="w-full" />
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {chart.source}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : workbooks.length === 0 ? (
            <p className="text-sm text-slate-600">You have no workbooks yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-medium text-slate-600">
                  Workbook
                  <select
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    value={workbookId}
                    onChange={(event) => {
                      const next = workbooks.find((w) => w.id === event.target.value)
                      setWorkbookId(event.target.value)
                      if (next) setSheetId(next.content.sheets[0].id)
                    }}
                  >
                    {workbooks.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Sheet
                  <select
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    value={sheetId}
                    onChange={(event) => setSheetId(event.target.value)}
                  >
                    {workbook?.content.sheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Cells
                  <input
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    value={rangeText}
                    placeholder="A1:D10"
                    onChange={(event) => setRangeText(event.target.value)}
                  />
                </label>
              </div>
              {preview ? (
                <div className="max-h-64 overflow-auto rounded border border-slate-200">
                  <table className="w-full text-xs" data-testid="table-preview">
                    <tbody>
                      {preview.map((row, r) => (
                        <tr key={r} className={r === 0 ? 'bg-slate-50 font-medium' : ''}>
                          {row.map((value, c) => (
                            <td key={c} className="border-b border-slate-100 px-2 py-1">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-amber-700">Type a range such as A1:D10.</p>
              )}
              <p className="text-xs text-slate-500">
                Up to 50 rows and 12 columns. The first row becomes the table’s header.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!preview}
                  onClick={() => preview && onTable(preview)}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  Insert table
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
