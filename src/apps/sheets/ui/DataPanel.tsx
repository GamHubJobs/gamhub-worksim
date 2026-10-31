/**
 * The side panel for a sheet's charts and rules (conditional formatting and
 * data validation). Charts are live: they redraw as the data changes.
 */
import { useState } from 'react'
import {
  CHART_TYPES,
  FILL_COLORS,
  TEXT_COLORS,
  type ChartType,
  type ConditionalFormat,
  type FillColor,
  type Sheet,
  type SheetContent,
  type TextColor,
} from '../../../persistence/schemas'
import { ChartView } from '../../../ui/ChartView'
import type { WorkbookCalculator } from '../engine/workbook'
import {
  addChart,
  addConditionalFormat,
  addValidation,
  chartSpec,
  CONDITION_LABELS,
  removeChart,
  removeConditionalFormat,
  removeValidation,
  updateChart,
} from '../features'
import { parseRange } from '../model'
import { FILL_CLASSES, TEXT_CLASSES, TEXT_COLOR_NAMES } from './cellStyles'

export type DataPanelMode = 'charts' | 'rules'

const CHART_NAMES: Record<ChartType, string> = {
  column: 'Column',
  bar: 'Bar',
  line: 'Line',
  pie: 'Pie',
}

const FILL_NAMES: Record<FillColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  red: 'Red',
  gray: 'Grey',
}

interface DataPanelProps {
  mode: DataPanelMode
  sheet: Sheet
  calculator: WorkbookCalculator
  /** The selected range (or the table around the active cell), e.g. "A1:C7". */
  selectionText: string
  readOnly: boolean
  onUpdate: (change: (content: SheetContent) => SheetContent) => void
  onMode: (mode: DataPanelMode) => void
  onClose: () => void
}

const inputClass = 'w-full rounded border border-slate-300 px-2 py-1 text-sm'
const labelClass = 'block text-xs font-medium text-slate-600'

export function DataPanel({
  mode,
  sheet,
  calculator,
  selectionText,
  readOnly,
  onUpdate,
  onMode,
  onClose,
}: DataPanelProps) {
  return (
    <aside
      className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white"
      aria-label={mode === 'charts' ? 'Charts' : 'Rules'}
      data-testid="data-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex gap-1" role="tablist">
          {(['charts', 'rules'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => onMode(tab)}
              className={`rounded px-2.5 py-1 text-sm ${
                mode === tab
                  ? 'bg-blue-50 font-medium text-blue-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'charts' ? 'Charts' : 'Rules'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {mode === 'charts' ? (
          <Charts
            sheet={sheet}
            calculator={calculator}
            selectionText={selectionText}
            readOnly={readOnly}
            onUpdate={onUpdate}
          />
        ) : (
          <Rules
            sheet={sheet}
            selectionText={selectionText}
            readOnly={readOnly}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function Charts({
  sheet,
  calculator,
  selectionText,
  readOnly,
  onUpdate,
}: Omit<DataPanelProps, 'mode' | 'onMode' | 'onClose'>) {
  const [type, setType] = useState<ChartType>('column')
  const [title, setTitle] = useState('')
  const [range, setRange] = useState(selectionText)
  const parsed = parseRange(range.trim().toUpperCase())
  const charts = sheet.charts ?? []

  return (
    <>
      {!readOnly && (
        <form
          className="space-y-2 rounded-lg bg-slate-50 p-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!parsed) return
            onUpdate(
              (content) =>
                addChart(content, sheet.id, parsed, type, title.trim()).content,
            )
            setTitle('')
          }}
        >
          <p className="text-sm font-medium text-slate-800">New chart</p>
          <p className="text-xs text-slate-500">
            Select a table first: the first column becomes the labels and the first row
            the names of the data series.
          </p>
          <label className={labelClass}>
            Data range
            <input
              className={inputClass}
              value={range}
              onChange={(event) => setRange(event.target.value)}
              aria-invalid={!parsed}
            />
          </label>
          <label className={labelClass}>
            Chart type
            <select
              className={inputClass}
              value={type}
              onChange={(event) => setType(event.target.value as ChartType)}
            >
              {CHART_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CHART_NAMES[t]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Title
            <input
              className={inputClass}
              value={title}
              placeholder="e.g. Spending by category"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={!parsed}
            className="w-full rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Add chart
          </button>
        </form>
      )}

      {charts.length === 0 ? (
        <p className="text-sm text-slate-500">This sheet has no charts yet.</p>
      ) : (
        <ul className="space-y-4">
          {charts.map((chart) => (
            <li
              key={chart.id}
              className="rounded-lg border border-slate-200 p-2"
              data-testid="sheet-chart"
            >
              <ChartView
                chart={chartSpec(calculator, sheet.id, chart)}
                className="w-full"
              />
              {!readOnly && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className={`${labelClass} col-span-2`}>
                    Title
                    <input
                      className={inputClass}
                      defaultValue={chart.title}
                      onBlur={(event) =>
                        onUpdate((content) =>
                          updateChart(content, sheet.id, chart.id, {
                            title: event.target.value.trim(),
                          }),
                        )
                      }
                    />
                  </label>
                  <label className={labelClass}>
                    Type
                    <select
                      className={inputClass}
                      value={chart.type}
                      onChange={(event) =>
                        onUpdate((content) =>
                          updateChart(content, sheet.id, chart.id, {
                            type: event.target.value as ChartType,
                          }),
                        )
                      }
                    >
                      {CHART_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {CHART_NAMES[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Range
                    <input
                      className={inputClass}
                      defaultValue={chart.range}
                      onBlur={(event) => {
                        const next = event.target.value.trim().toUpperCase()
                        if (parseRange(next)) {
                          onUpdate((content) =>
                            updateChart(content, sheet.id, chart.id, { range: next }),
                          )
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate((content) => removeChart(content, sheet.id, chart.id))
                    }
                    className="col-span-2 rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    Delete chart
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Rules: conditional formatting and data validation
// ---------------------------------------------------------------------------

function describeRule(rule: ConditionalFormat['rule']): string {
  if (rule.op === 'blank' || rule.op === 'notBlank') return CONDITION_LABELS[rule.op]
  if (rule.op === 'between') return `is between ${rule.value} and ${rule.value2 ?? ''}`
  return `${CONDITION_LABELS[rule.op]} ${rule.value}`
}

function Rules({
  sheet,
  selectionText,
  readOnly,
  onUpdate,
}: Omit<DataPanelProps, 'mode' | 'onMode' | 'onClose' | 'calculator'>) {
  const [range, setRange] = useState(selectionText)
  const [op, setOp] = useState<ConditionalFormat['rule']['op']>('gt')
  const [value, setValue] = useState('')
  const [value2, setValue2] = useState('')
  const [fill, setFill] = useState<FillColor | ''>('red')
  const [textColor, setTextColor] = useState<TextColor | ''>('')
  const [bold, setBold] = useState(false)

  const [validationRange, setValidationRange] = useState(selectionText)
  const [validationType, setValidationType] = useState<'list' | 'number'>('list')
  const [items, setItems] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [whole, setWhole] = useState(false)

  const needsValue = op !== 'blank' && op !== 'notBlank'
  const formatRangeOk = parseRange(range.trim().toUpperCase()) !== null
  const validationRangeOk = parseRange(validationRange.trim().toUpperCase()) !== null
  const listItems = items
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const number = (text: string) => (text.trim() === '' ? undefined : Number(text))
  const numbersOk = [min, max].every((t) => t.trim() === '' || Number.isFinite(Number(t)))

  return (
    <>
      <section>
        <h3 className="text-sm font-semibold text-slate-800">Conditional formatting</h3>
        <p className="text-xs text-slate-500">
          Highlight cells automatically, e.g. every amount over budget in red.
        </p>
        <ul className="mt-2 space-y-1.5" data-testid="conditional-formats">
          {(sheet.conditionalFormats ?? []).map((format) => (
            <li key={format.id} className="flex items-center gap-2 text-sm">
              <span
                className={`flex h-6 w-10 shrink-0 items-center justify-center rounded border border-slate-300 text-xs ${
                  format.style.fill ? FILL_CLASSES[format.style.fill] : ''
                } ${format.style.textColor ? TEXT_CLASSES[format.style.textColor] : ''} ${
                  format.style.bold ? 'font-bold' : ''
                }`}
              >
                Abc
              </span>
              <span className="min-w-0 flex-1 text-slate-700">
                <strong>{format.range}</strong> {describeRule(format.rule)}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Delete rule for ${format.range}`}
                  onClick={() =>
                    onUpdate((content) =>
                      removeConditionalFormat(content, sheet.id, format.id),
                    )
                  }
                  className="rounded px-1.5 text-xs text-red-700 hover:bg-red-50"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && (
          <form
            className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!formatRangeOk || (needsValue && value.trim() === '')) return
              onUpdate((content) =>
                addConditionalFormat(content, sheet.id, {
                  range: range.trim().toUpperCase(),
                  rule: {
                    op,
                    value: value.trim(),
                    ...(op === 'between' ? { value2: value2.trim() } : {}),
                  },
                  style: {
                    ...(fill ? { fill } : {}),
                    ...(textColor ? { textColor } : {}),
                    ...(bold ? { bold } : {}),
                  },
                }),
              )
              setValue('')
              setValue2('')
            }}
          >
            <label className={labelClass}>
              Cells
              <input
                className={inputClass}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              When the value
              <select
                className={inputClass}
                value={op}
                onChange={(e) => setOp(e.target.value as ConditionalFormat['rule']['op'])}
              >
                {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {needsValue && (
              <div className="flex gap-2">
                <input
                  aria-label="Value"
                  className={inputClass}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                {op === 'between' && (
                  <input
                    aria-label="Second value"
                    className={inputClass}
                    value={value2}
                    onChange={(e) => setValue2(e.target.value)}
                  />
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Highlight colour"
                className="rounded border border-slate-300 px-1 py-1 text-xs"
                value={fill}
                onChange={(e) => setFill(e.target.value as FillColor | '')}
              >
                <option value="">No fill</option>
                {FILL_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {FILL_NAMES[color]} fill
                  </option>
                ))}
              </select>
              <select
                aria-label="Rule text colour"
                className="rounded border border-slate-300 px-1 py-1 text-xs"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value as TextColor | '')}
              >
                <option value="">Normal text</option>
                {TEXT_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {TEXT_COLOR_NAMES[color]} text
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(e) => setBold(e.target.checked)}
                />
                Bold
              </label>
            </div>
            <button
              type="submit"
              disabled={!formatRangeOk || (needsValue && value.trim() === '')}
              className="w-full rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              Add formatting rule
            </button>
          </form>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800">Data validation</h3>
        <p className="text-xs text-slate-500">
          Control what can be typed: a choice from a list (with a dropdown), or a number
          within limits.
        </p>
        <ul className="mt-2 space-y-1.5" data-testid="validations">
          {(sheet.validations ?? []).map((validation) => (
            <li key={validation.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 text-slate-700">
                <strong>{validation.range}</strong>{' '}
                {validation.rule.type === 'list'
                  ? `one of: ${validation.rule.items.join(', ')}`
                  : `a ${validation.rule.wholeNumber ? 'whole ' : ''}number${
                      validation.rule.min !== undefined ? ` ≥ ${validation.rule.min}` : ''
                    }${validation.rule.max !== undefined ? ` ≤ ${validation.rule.max}` : ''}`}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Delete validation for ${validation.range}`}
                  onClick={() =>
                    onUpdate((content) =>
                      removeValidation(content, sheet.id, validation.id),
                    )
                  }
                  className="rounded px-1.5 text-xs text-red-700 hover:bg-red-50"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && (
          <form
            className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!validationRangeOk) return
              if (validationType === 'list' && listItems.length === 0) return
              if (validationType === 'number' && !numbersOk) return
              onUpdate((content) =>
                addValidation(content, sheet.id, {
                  range: validationRange.trim().toUpperCase(),
                  rule:
                    validationType === 'list'
                      ? { type: 'list', items: listItems }
                      : {
                          type: 'number',
                          ...(number(min) !== undefined ? { min: number(min) } : {}),
                          ...(number(max) !== undefined ? { max: number(max) } : {}),
                          ...(whole ? { wholeNumber: true } : {}),
                        },
                }),
              )
              setItems('')
            }}
          >
            <label className={labelClass}>
              Cells
              <input
                className={inputClass}
                value={validationRange}
                onChange={(e) => setValidationRange(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              Allow
              <select
                className={inputClass}
                value={validationType}
                onChange={(e) => setValidationType(e.target.value as 'list' | 'number')}
              >
                <option value="list">A choice from a list</option>
                <option value="number">A number</option>
              </select>
            </label>
            {validationType === 'list' ? (
              <label className={labelClass}>
                Choices, separated by commas
                <input
                  className={inputClass}
                  value={items}
                  placeholder="Approved, Rejected, Pending"
                  onChange={(e) => setItems(e.target.value)}
                />
              </label>
            ) : (
              <div className="flex items-end gap-2">
                <label className={labelClass}>
                  Minimum
                  <input
                    className={inputClass}
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                  />
                </label>
                <label className={labelClass}>
                  Maximum
                  <input
                    className={inputClass}
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-1 pb-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={whole}
                    onChange={(e) => setWhole(e.target.checked)}
                  />
                  Whole
                </label>
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              Add validation
            </button>
          </form>
        )}
      </section>
    </>
  )
}
