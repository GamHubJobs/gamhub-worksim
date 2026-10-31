/**
 * The spreadsheet grid (Phase 0 version): select cells, type values, move with
 * the keyboard. No formulas yet: cells show exactly what was typed.
 *
 * Keyboard:
 * - Arrow keys / Tab / Shift+Tab: move the selection
 * - Typing: start editing the selected cell (replaces its value)
 * - Enter or F2 (or double-click): edit the selected cell's current value
 * - While editing: Enter saves and moves down, Tab saves and moves right,
 *   Escape cancels
 * - Delete / Backspace: clear the selected cell
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Sheet } from '../../../persistence/schemas'
import {
  columnToLetters,
  DEFAULT_COLUMN_COUNT,
  DEFAULT_ROW_COUNT,
  getCellInput,
  looksNumeric,
  toAddress,
  type CellPosition,
} from '../model'

interface GridProps {
  sheet: Sheet
  readOnly?: boolean
  onCellChange?: (address: string, input: string) => void
}

const columns = Array.from({ length: DEFAULT_COLUMN_COUNT }, (_, column) => column)
const rows = Array.from({ length: DEFAULT_ROW_COUNT }, (_, row) => row)

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function Grid({ sheet, readOnly = false, onCellChange }: GridProps) {
  const [selected, setSelected] = useState<CellPosition>({ row: 0, column: 0 })
  // The cell being edited and the text typed so far, or null when not editing.
  // Kept in a ref too, so event handlers always see the latest value.
  const [editing, setEditingState] = useState<{ address: string; text: string } | null>(
    null,
  )
  const editingRef = useRef<{ address: string; text: string } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const selectedAddress = toAddress(selected)
  const draft = editing?.address === selectedAddress ? editing.text : null

  function setEditing(value: { address: string; text: string } | null) {
    editingRef.current = value
    setEditingState(value)
  }

  function move(rowChange: number, columnChange: number) {
    setSelected((previous) => ({
      row: clamp(previous.row + rowChange, 0, DEFAULT_ROW_COUNT - 1),
      column: clamp(previous.column + columnChange, 0, DEFAULT_COLUMN_COUNT - 1),
    }))
  }

  function startEditing(initialText: string) {
    if (readOnly) return
    setEditing({ address: selectedAddress, text: initialText })
  }

  /** Saves the cell being edited (if any), then optionally moves the selection. */
  function commit(rowChange = 0, columnChange = 0) {
    const current = editingRef.current
    if (current === null) return
    setEditing(null)
    onCellChange?.(current.address, current.text)
    move(rowChange, columnChange)
    gridRef.current?.focus()
  }

  function cancel() {
    setEditing(null)
    gridRef.current?.focus()
  }

  function selectCell(position: CellPosition) {
    commit() // clicking elsewhere saves the cell being edited, like real spreadsheets
    setSelected(position)
  }

  // If the page is hidden or closed mid-edit, keep what was typed so far.
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => {
    const saveEdit = () => commitRef.current()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveEdit()
    }
    window.addEventListener('pagehide', saveEdit)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', saveEdit)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  // Keep the selected cell visible when moving with the keyboard.
  useEffect(() => {
    gridRef.current
      ?.querySelector(`[data-address="${selectedAddress}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selectedAddress])

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const { key } = event
    const handled = (action: () => void) => {
      event.preventDefault()
      action()
    }

    if (key === 'ArrowUp') return handled(() => move(-1, 0))
    if (key === 'ArrowDown') return handled(() => move(1, 0))
    if (key === 'ArrowLeft') return handled(() => move(0, -1))
    if (key === 'ArrowRight') return handled(() => move(0, 1))
    if (key === 'Tab') return handled(() => move(0, event.shiftKey ? -1 : 1))
    if (readOnly) return
    if (key === 'Enter' || key === 'F2') {
      return handled(() => startEditing(getCellInput(sheet, selectedAddress)))
    }
    if (key === 'Delete' || key === 'Backspace') {
      return handled(() => onCellChange?.(selectedAddress, ''))
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      return handled(() => startEditing(key))
    }
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(event.shiftKey ? -1 : 1, 0)
    } else if (event.key === 'Tab') {
      event.preventDefault()
      commit(0, event.shiftKey ? -1 : 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  const selectedInput = getCellInput(sheet, selectedAddress)

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-slate-300 bg-white shadow-sm">
      {/* Cell bar: shows the selected cell. Becomes the formula bar in Phase 1. */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-3 py-1.5 text-sm">
        <span
          className="w-16 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-center font-mono"
          data-testid="selected-address"
        >
          {selectedAddress}
        </span>
        <span className="truncate font-mono text-slate-700" data-testid="selected-input">
          {draft ?? selectedInput}
        </span>
      </div>

      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label={`Spreadsheet ${sheet.name}`}
        aria-readonly={readOnly}
        onKeyDown={onGridKeyDown}
        className="min-h-0 flex-1 overflow-auto outline-none"
        data-testid="sheet-grid"
      >
        <table className="border-separate border-spacing-0 text-sm select-none">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 h-7 w-12 border-r border-b border-slate-300 bg-slate-100" />
              {columns.map((column) => (
                <th
                  key={column}
                  className={`sticky top-0 z-10 h-7 w-24 min-w-24 border-r border-b border-slate-300 font-medium ${
                    column === selected.column
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {columnToLetters(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <th
                  className={`sticky left-0 z-10 h-7 w-12 border-r border-b border-slate-300 font-medium ${
                    row === selected.row
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {row + 1}
                </th>
                {columns.map((column) => {
                  const address = toAddress({ row, column })
                  const input = getCellInput(sheet, address)
                  const isSelected = address === selectedAddress
                  const isEditing = isSelected && draft !== null
                  return (
                    <td
                      key={column}
                      data-address={address}
                      role="gridcell"
                      aria-selected={isSelected}
                      onMouseDown={() => {
                        if (!isEditing) selectCell({ row, column })
                      }}
                      onDoubleClick={() => startEditing(input)}
                      className={`relative h-7 max-w-24 truncate border-r border-b border-slate-200 px-1.5 ${
                        looksNumeric(input) ? 'text-right tabular-nums' : 'text-left'
                      } ${isSelected ? 'outline-2 -outline-offset-2 outline-blue-600' : ''}`}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          aria-label={`Edit cell ${address}`}
                          value={draft}
                          onChange={(event) =>
                            setEditing({ address, text: event.target.value })
                          }
                          onKeyDown={onEditorKeyDown}
                          onBlur={() => commit()}
                          className="absolute inset-0 h-full w-full bg-white px-1.5 outline-2 -outline-offset-2 outline-blue-600"
                        />
                      ) : (
                        input
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
