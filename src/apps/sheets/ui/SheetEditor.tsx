/**
 * The spreadsheet editor: toolbar, formula bar, grid and sheet tabs.
 *
 * Mouse: click to select, drag or Shift+click to select a range, double-click
 * to edit, drag a column border to resize it (double-click it to fit).
 * While typing a formula, clicking a cell inserts its reference.
 *
 * Keyboard:
 * - Arrows, Tab, Enter, Home, Page Up/Down: move. Shift extends the selection.
 * - Ctrl+Arrow: jump to the edge of the data. Ctrl+Home: go to A1.
 * - Typing starts editing; Enter or F2 edits the current value.
 * - Delete/Backspace clears; Escape cancels editing.
 * - Ctrl+C / Ctrl+X / Ctrl+V: copy, cut, paste. Ctrl+D / Ctrl+R: fill down/right.
 * - Ctrl+Z / Ctrl+Y: undo, redo. Ctrl+B / Ctrl+I: bold, italic. Ctrl+A: all.
 */
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import type { Sheet, SheetContent } from '../../../persistence/schemas'
import { copyCells, fill, pasteCells, pasteText, type CopiedCells } from '../clipboard'
import { DEFAULT_DECIMALS, displayValue } from '../engine/format'
import {
  acceptSuggestion,
  findActiveFunction,
  suggestFunctions,
} from '../engine/formulaHelp'
import { MAX_COLUMNS, MAX_ROWS } from '../engine/parser'
import { findReferences, sheetPrefix } from '../engine/references'
import { formatGeneralNumber, isError, isFormula } from '../engine/values'
import {
  createCalculator,
  parseCached,
  type WorkbookCalculator,
} from '../engine/workbook'
import {
  addSheet,
  clearRange,
  columnToLetters,
  DEFAULT_COLUMN_COUNT,
  DEFAULT_ROW_COUNT,
  formatRange,
  getCellInput,
  getColumnWidth,
  parseAddress,
  parseRange,
  rangeAddresses,
  rangeBetween,
  rangeToText,
  renameSheet,
  setCellInput,
  setColumnWidth,
  toAddress,
  usedSize,
  type CellPosition,
  type CellRange,
} from '../model'
import { FILL_CLASSES, REFERENCE_COLORS } from './cellStyles'
import { FormulaBar } from './FormulaBar'
import { SheetTabs } from './SheetTabs'
import { Toolbar, type FormatAction } from './Toolbar'

export interface SheetEditorProps {
  content: SheetContent
  readOnly?: boolean
  /** Receives a function that turns the latest content into the new content. */
  onUpdate?: (change: (content: SheetContent) => SheetContent) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

interface Editing {
  sheetId: string
  address: string
  text: string
  origin: 'cell' | 'bar'
  /**
   * "enter": started by typing over a cell; arrow keys finish the edit.
   * "edit": started with F2, Enter, double-click or the formula bar; arrow
   * keys move inside the text.
   */
  mode: 'enter' | 'edit'
  /** A reference inserted by clicking a cell (or using arrows) while typing a formula. */
  point: { start: number; end: number; anchor: CellPosition; at: CellPosition } | null
}

const ROW_HEADER_WIDTH = 48
const MAX_SUMMARY_CELLS = 20000

/** True if a reference can be inserted at the end of the formula being typed. */
function canPoint(editing: Editing): boolean {
  if (!editing.text.startsWith('=')) return false
  if (editing.point && editing.point.end === editing.text.length) return true
  return /[=(,+\-*/^&<>:]\s*$/.test(editing.text)
}

/** Adds missing closing brackets, as spreadsheets do: =SUM(A1:A3 → =SUM(A1:A3). */
function completeFormula(text: string): string {
  if (!isFormula(text)) return text
  let depth = 0
  let inString = false
  for (const char of text) {
    if (char === '"') inString = !inString
    else if (!inString && char === '(') depth++
    else if (!inString && char === ')') depth--
  }
  if (depth <= 0 || inString || depth > 5) return text
  const completed = text + ')'.repeat(depth)
  return parseCached(completed) instanceof Error ? text : completed
}

/** Range of a reference such as "B2:C5" or "A:A", or null. */
function referenceRange(text: string, rowCount: number): CellRange | null {
  const columns = /^\$?([A-Z]{1,3}):\$?([A-Z]{1,3})$/.exec(text)
  if (columns) {
    const a = parseAddress(`${columns[1]}1`)
    const b = parseAddress(`${columns[2]}1`)
    if (!a || !b) return null
    return { ...rangeBetween(a, b), top: 0, bottom: rowCount - 1 }
  }
  return parseRange(text.replaceAll('$', ''))
}

let measureContext: CanvasRenderingContext2D | null | undefined
function measureText(text: string, bold: boolean): number {
  if (measureContext === undefined) {
    measureContext = document.createElement('canvas').getContext('2d')
  }
  if (!measureContext) return text.length * 8
  measureContext.font = `${bold ? 'bold ' : ''}14px ui-sans-serif, system-ui, sans-serif`
  return measureContext.measureText(text).width
}

export function SheetEditor({
  content,
  readOnly = false,
  onUpdate,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: SheetEditorProps) {
  const editable = !readOnly && !!onUpdate
  const [activeSheetId, setActiveSheetId] = useState(content.sheets[0].id)
  const sheet = content.sheets.find((s) => s.id === activeSheetId) ?? content.sheets[0]
  const [active, setActive] = useState<CellPosition>({ row: 0, column: 0 })
  const [corner, setCorner] = useState<CellPosition>({ row: 0, column: 0 })
  const [editing, setEditingState] = useState<Editing | null>(null)
  const editingRef = useRef<Editing | null>(null)
  const [copied, setCopiedState] = useState<CopiedCells | null>(null)
  const copiedRef = useRef<CopiedCells | null>(null)
  const [resizing, setResizing] = useState<{ column: number; width: number } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const barRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<'select' | 'point' | null>(null)

  const calculator = useMemo(() => createCalculator(content), [content])
  const used = useMemo(() => usedSize(sheet), [sheet])
  const rowCount = Math.min(
    MAX_ROWS,
    Math.max(DEFAULT_ROW_COUNT, used.rows + 10, active.row + 10, corner.row + 10),
  )
  const columnCount = Math.min(
    MAX_COLUMNS,
    Math.max(
      DEFAULT_COLUMN_COUNT,
      used.columns + 2,
      active.column + 2,
      corner.column + 2,
    ),
  )
  const selection = useMemo(() => rangeBetween(active, corner), [active, corner])
  const activeAddress = toAddress(active)
  const activeCell = sheet.cells[activeAddress]
  const activeValue = calculator.getValue(sheet.id, activeAddress)
  const editingHere = editing?.sheetId === sheet.id ? editing : null

  function setEditing(value: Editing | null) {
    editingRef.current = value
    setEditingState(value)
  }

  function setCopied(value: CopiedCells | null) {
    copiedRef.current = value
    setCopiedState(value)
  }

  function update(change: (content: SheetContent) => SheetContent) {
    if (editable) onUpdate?.(change)
  }

  function clampPosition({ row, column }: CellPosition): CellPosition {
    return {
      row: Math.min(MAX_ROWS - 1, Math.max(0, row)),
      column: Math.min(MAX_COLUMNS - 1, Math.max(0, column)),
    }
  }

  function focusGrid() {
    gridRef.current?.focus({ preventScroll: true })
  }

  function select(position: CellPosition, extend = false) {
    const clamped = clampPosition(position)
    if (!extend) setActive(clamped)
    setCorner(clamped)
  }

  // --- Editing ---------------------------------------------------------------

  function startEditing(text: string, origin: 'cell' | 'bar', mode: Editing['mode']) {
    if (!editable) return
    setEditing({
      sheetId: sheet.id,
      address: activeAddress,
      text,
      origin,
      mode,
      point: null,
    })
    if (origin === 'bar') barRef.current?.focus()
  }

  function setEditingText(text: string) {
    const current = editingRef.current
    if (current) setEditing({ ...current, text, point: null })
  }

  /** Saves the cell being edited, then moves from it. Returns false if nothing was being edited. */
  function commit(rowChange = 0, columnChange = 0, refocus = true): boolean {
    const current = editingRef.current
    if (!current) return false
    setEditing(null)
    const text = completeFormula(current.text)
    update((latest) => {
      const target = latest.sheets.find((s) => s.id === current.sheetId)
      if (!target || getCellInput(target, current.address) === text) return latest
      return setCellInput(latest, current.sheetId, current.address, text)
    })
    if (current.sheetId !== activeSheetId) setActiveSheetId(current.sheetId)
    const position = parseAddress(current.address) ?? active
    select({ row: position.row + rowChange, column: position.column + columnChange })
    if (refocus) focusGrid()
    return true
  }

  function cancel() {
    const current = editingRef.current
    setEditing(null)
    if (current && current.sheetId !== activeSheetId) {
      setActiveSheetId(current.sheetId)
      const position = parseAddress(current.address)
      if (position) select(position)
    }
    focusGrid()
  }

  /** Inserts (or updates) a reference to the cell or range at the end of the formula. */
  function pointAt(position: CellPosition, anchor: CellPosition = position) {
    const current = editingRef.current
    if (!current) return
    const at = clampPosition(position)
    const start =
      current.point && current.point.end === current.text.length
        ? current.point.start
        : current.text.length
    const prefix = sheet.id !== current.sheetId ? sheetPrefix(sheet.name) : ''
    const reference = prefix + rangeToText(rangeBetween(anchor, at))
    setEditing({
      ...current,
      text: current.text.slice(0, start) + reference,
      point: { start, end: start + reference.length, anchor, at },
    })
  }

  const suggestions = editing ? suggestFunctions(editing.text) : null
  const activeFunction = editing ? findActiveFunction(editing.text) : null

  function acceptFirstSuggestion(name?: string) {
    const current = editingRef.current
    if (!current || !suggestions) return
    setEditingText(
      acceptSuggestion(current.text, suggestions.prefix, name ?? suggestions.names[0]),
    )
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation()
    const current = editingRef.current
    if (!current) return
    const { key } = event
    if (key === 'Tab' && suggestions) {
      event.preventDefault()
      acceptFirstSuggestion()
    } else if (key === 'Enter') {
      event.preventDefault()
      commit(event.shiftKey ? -1 : 1, 0)
    } else if (key === 'Tab') {
      event.preventDefault()
      commit(0, event.shiftKey ? -1 : 1)
    } else if (key === 'Escape') {
      event.preventDefault()
      cancel()
    } else if (
      key.startsWith('Arrow') &&
      current.mode === 'enter' &&
      current.origin === 'cell'
    ) {
      event.preventDefault()
      const [rowChange, columnChange] = ARROWS[key]
      if (canPoint(current)) {
        // Arrow keys point at cells while typing a formula, as in Excel.
        const from = current.point?.at ?? parseAddress(current.address) ?? active
        const next = { row: from.row + rowChange, column: from.column + columnChange }
        pointAt(next, event.shiftKey && current.point ? current.point.anchor : next)
      } else {
        commit(rowChange, columnChange)
      }
    }
  }

  // --- Mouse -----------------------------------------------------------------

  function positionFromEvent(event: MouseEvent): CellPosition | null {
    const cell = (event.target as HTMLElement).closest('td[data-address]')
    return cell ? parseAddress(cell.getAttribute('data-address') ?? '') : null
  }

  function onGridMouseDown(event: MouseEvent) {
    if (event.button !== 0) return
    const position = positionFromEvent(event)
    if (!position) return
    const current = editingRef.current
    // Clicking inside the cell being edited places the text cursor.
    if (
      current?.origin === 'cell' &&
      current.address === toAddress(position) &&
      current.sheetId === sheet.id
    ) {
      return
    }
    event.preventDefault()
    if (current && canPoint(current)) {
      pointAt(position)
      dragRef.current = 'point'
      return
    }
    commit()
    select(position, event.shiftKey)
    dragRef.current = 'select'
    focusGrid()
  }

  function onGridMouseOver(event: MouseEvent) {
    if (!dragRef.current) return
    const position = positionFromEvent(event)
    if (!position) return
    if (dragRef.current === 'select') setCorner(position)
    else {
      const point = editingRef.current?.point
      if (point) pointAt(position, point.anchor)
    }
  }

  function onGridDoubleClick(event: MouseEvent) {
    const position = positionFromEvent(event)
    if (!position || editingRef.current) return
    select(position)
    if (editable) {
      setEditing({
        sheetId: sheet.id,
        address: toAddress(position),
        text: getCellInput(sheet, toAddress(position)),
        origin: 'cell',
        mode: 'edit',
        point: null,
      })
    }
  }

  useEffect(() => {
    const stop = () => {
      dragRef.current = null
    }
    window.addEventListener('mouseup', stop)
    return () => window.removeEventListener('mouseup', stop)
  }, [])

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

  // --- Column widths ---------------------------------------------------------

  function startResize(event: MouseEvent, column: number) {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = getColumnWidth(sheet, column)
    const sheetId = sheet.id
    let width = startWidth
    const onMove = (moveEvent: globalThis.MouseEvent) => {
      width = Math.max(32, startWidth + moveEvent.clientX - startX)
      setResizing({ column, width })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setResizing(null)
      if (width !== startWidth) update((c) => setColumnWidth(c, sheetId, column, width))
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function autoFitColumn(column: number) {
    let widest = 40
    for (const [address, cell] of Object.entries(sheet.cells)) {
      if (parseAddress(address)?.column !== column) continue
      const text = displayValue(
        calculator.getValue(sheet.id, address),
        cell.input,
        cell.format,
      ).text
      widest = Math.max(widest, measureText(text, !!cell.format?.bold))
    }
    update((c) => setColumnWidth(c, sheet.id, column, widest + 16))
  }

  const widths = useMemo(
    () =>
      Array.from({ length: columnCount }, (_, column) =>
        resizing?.column === column ? resizing.width : getColumnWidth(sheet, column),
      ),
    [columnCount, sheet, resizing],
  )

  // --- Keyboard --------------------------------------------------------------

  /** Ctrl+Arrow: jump to the edge of the current block of data. */
  function jump(
    from: CellPosition,
    rowChange: number,
    columnChange: number,
  ): CellPosition {
    const filled = (p: CellPosition) => getCellInput(sheet, toAddress(p)) !== ''
    const inside = (p: CellPosition) =>
      p.row >= 0 && p.column >= 0 && p.row < rowCount && p.column < columnCount
    const step = (p: CellPosition) => ({
      row: p.row + rowChange,
      column: p.column + columnChange,
    })
    let position = from
    let next = step(position)
    if (!inside(next)) return position
    if (filled(position) && filled(next)) {
      while (inside(next) && filled(next)) {
        position = next
        next = step(position)
      }
      return position
    }
    position = next
    while (inside(step(position)) && !filled(position)) position = step(position)
    return position
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== gridRef.current) return
    const { key, shiftKey } = event
    const ctrl = event.ctrlKey || event.metaKey
    const handled = (action: () => void) => {
      event.preventDefault()
      action()
    }
    const current = shiftKey ? corner : active

    if (ctrl) {
      const lower = key.toLowerCase()
      if (key in ARROWS) {
        const [r, c] = ARROWS[key]
        return handled(() => select(jump(current, r, c), shiftKey))
      }
      if (key === 'Home') return handled(() => select({ row: 0, column: 0 }))
      if (lower === 'a') {
        return handled(() => {
          setActive({ row: 0, column: 0 })
          setCorner({
            row: Math.max(0, used.rows - 1),
            column: Math.max(0, used.columns - 1),
          })
        })
      }
      if (!editable) return
      if (lower === 'z') return handled(() => (shiftKey ? onRedo?.() : onUndo?.()))
      if (lower === 'y') return handled(() => onRedo?.())
      if (lower === 'b')
        return handled(() => applyFormat({ type: 'toggle', field: 'bold' }))
      if (lower === 'i')
        return handled(() => applyFormat({ type: 'toggle', field: 'italic' }))
      if (lower === 'd')
        return handled(() => update((c) => fill(c, sheet.id, selection, 'down')))
      if (lower === 'r')
        return handled(() => update((c) => fill(c, sheet.id, selection, 'right')))
      return // Ctrl+C, Ctrl+X and Ctrl+V arrive as copy/cut/paste events.
    }

    if (key in ARROWS) {
      const [r, c] = ARROWS[key]
      return handled(() =>
        select({ row: current.row + r, column: current.column + c }, shiftKey),
      )
    }
    if (key === 'Tab')
      return handled(() =>
        select({ row: active.row, column: active.column + (shiftKey ? -1 : 1) }),
      )
    if (key === 'Home')
      return handled(() => select({ row: current.row, column: 0 }, shiftKey))
    if (key === 'PageDown')
      return handled(() =>
        select({ row: current.row + 20, column: current.column }, shiftKey),
      )
    if (key === 'PageUp')
      return handled(() =>
        select({ row: current.row - 20, column: current.column }, shiftKey),
      )
    if (key === 'Escape') return handled(() => setCopied(null))
    if (!editable) return
    if (key === 'Enter' || key === 'F2') {
      return handled(() =>
        startEditing(getCellInput(sheet, activeAddress), 'cell', 'edit'),
      )
    }
    if (key === 'Delete' || key === 'Backspace') {
      return handled(() => update((c) => clearRange(c, sheet.id, selection)))
    }
    if (key.length === 1 && !event.altKey) {
      return handled(() => startEditing(key, 'cell', 'enter'))
    }
  }

  // --- Clipboard -------------------------------------------------------------

  const displayText = (address: string) => {
    const cell = sheet.cells[address]
    return displayValue(
      calculator.getValue(sheet.id, address),
      cell?.input ?? '',
      cell?.format,
    ).text
  }

  function onCopyOrCut(event: ClipboardEvent, cut: boolean) {
    if (editingRef.current || (cut && !editable)) return
    const data = copyCells(content, sheet.id, selection, displayText, cut)
    if (!data) return
    event.preventDefault()
    event.clipboardData.setData('text/plain', data.text)
    setCopied(data)
  }

  function onPaste(event: ClipboardEvent) {
    if (editingRef.current || !editable) return
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    const internal = copiedRef.current
    const fromWorkSim = internal !== null && internal.text === text
    if (!fromWorkSim && text === '') return
    let pasted: CellRange | null = null
    const sheetId = sheet.id
    update((latest) => {
      const result = fromWorkSim
        ? pasteCells(latest, sheetId, selection, internal)
        : pasteText(latest, sheetId, active, text)
      pasted = result.range
      return result.content
    })
    if (fromWorkSim && internal.cut) setCopied(null)
    const range = pasted as CellRange | null
    if (range) {
      setActive({ row: range.top, column: range.left })
      setCorner({ row: range.bottom, column: range.right })
    }
  }

  // --- Formatting ------------------------------------------------------------

  function applyFormat(action: FormatAction) {
    if (!editable) return
    commit()
    const sheetId = sheet.id
    const range = selection
    const format = activeCell?.format
    update((latest) => {
      switch (action.type) {
        case 'toggle':
          return formatRange(latest, sheetId, range, {
            [action.field]: format?.[action.field] ? undefined : true,
          })
        case 'align':
          return formatRange(latest, sheetId, range, {
            align: format?.align === action.align ? undefined : action.align,
          })
        case 'numberFormat': {
          const same = format?.numberFormat === action.numberFormat
          return formatRange(latest, sheetId, range, {
            numberFormat: same ? undefined : action.numberFormat,
            decimals: undefined,
          })
        }
        case 'decimals': {
          const numberFormat = format?.numberFormat ?? 'number'
          const decimals = format?.decimals ?? DEFAULT_DECIMALS[numberFormat]
          return formatRange(latest, sheetId, range, {
            numberFormat,
            decimals: Math.min(6, Math.max(0, decimals + action.change)),
          })
        }
        case 'fill':
          return formatRange(latest, sheetId, range, { fill: action.fill })
        case 'clear':
          return formatRange(latest, sheetId, range, {
            bold: undefined,
            italic: undefined,
            align: undefined,
            numberFormat: undefined,
            decimals: undefined,
            fill: undefined,
          })
      }
    })
  }

  // --- Sheets ----------------------------------------------------------------

  function selectSheet(sheetId: string) {
    const current = editingRef.current
    if (current && canPoint(current)) {
      // Typing a formula: show the other sheet so its cells can be clicked.
      setActiveSheetId(sheetId)
      setEditing({ ...current, origin: 'bar', mode: 'edit' })
      barRef.current?.focus()
      return
    }
    commit()
    setActiveSheetId(sheetId)
    setActive({ row: 0, column: 0 })
    setCorner({ row: 0, column: 0 })
    focusGrid()
  }

  // --- Overlays: selection, copied cells, formula references ----------------

  const highlights = useMemo(() => {
    const result: Array<{ range: CellRange; color: number }> = []
    if (!editing || !editing.text.startsWith('=')) return result
    const editingSheetName = content.sheets.find((s) => s.id === editing.sheetId)?.name
    findReferences(editing.text).forEach((reference, index) => {
      const sheetName = reference.sheet ?? editingSheetName
      if (sheetName?.toLowerCase() !== sheet.name.toLowerCase()) return
      const range = referenceRange(reference.text, rowCount)
      if (range) result.push({ range, color: index % REFERENCE_COLORS.length })
    })
    return result
  }, [editing, content.sheets, sheet.name, rowCount])

  const [overlays, setOverlays] = useState<
    Array<{ key: string; className: string; style: CSSProperties }>
  >([])

  useLayoutEffect(() => {
    const table = tableRef.current
    if (!table) return
    const boxes: Array<{ key: string; className: string; style: CSSProperties }> = []
    const tableRect = table.getBoundingClientRect()
    const rectFor = (range: CellRange): CSSProperties | null => {
      const bottom = Math.min(range.bottom, rowCount - 1)
      const right = Math.min(range.right, columnCount - 1)
      const first = table.querySelector(
        `td[data-address="${toAddress({ row: range.top, column: range.left })}"]`,
      )
      const last = table.querySelector(
        `td[data-address="${toAddress({ row: bottom, column: right })}"]`,
      )
      if (!first || !last) return null
      const a = first.getBoundingClientRect()
      const b = last.getBoundingClientRect()
      return {
        left: a.left - tableRect.left,
        top: a.top - tableRect.top,
        width: b.right - a.left,
        height: b.bottom - a.top,
      }
    }
    highlights.forEach(({ range, color }, i) => {
      const style = rectFor(range)
      if (style) {
        boxes.push({
          key: `ref-${i}`,
          className: `${REFERENCE_COLORS[color]} border-2 border-dashed`,
          style,
        })
      }
    })
    if (copied && copied.sheetId === sheet.id) {
      const style = rectFor(copied.range)
      if (style) {
        boxes.push({
          key: 'copied',
          className: 'border-2 border-dashed border-emerald-600',
          style,
        })
      }
    }
    const multiple =
      selection.top !== selection.bottom || selection.left !== selection.right
    if (multiple) {
      const style = rectFor(selection)
      if (style)
        boxes.push({
          key: 'selection',
          className: 'bg-blue-500/10 border border-blue-500',
          style,
        })
    }
    const activeStyle = rectFor({
      top: active.row,
      left: active.column,
      bottom: active.row,
      right: active.column,
    })
    if (activeStyle) {
      boxes.push({
        key: 'active',
        className: 'border-2 border-blue-600',
        style: activeStyle,
      })
    }
    setOverlays(boxes)
  }, [highlights, copied, sheet.id, selection, active, widths, rowCount, columnCount])

  // Keep the active cell visible when moving with the keyboard.
  useEffect(() => {
    gridRef.current
      ?.querySelector(`[data-address="${toAddress(corner)}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [corner])

  // --- Status bar --------------------------------------------------------------

  const summary = useMemo(() => {
    const cellCount =
      (selection.bottom - selection.top + 1) * (selection.right - selection.left + 1)
    if (cellCount < 2 || cellCount > MAX_SUMMARY_CELLS) return null
    let sum = 0
    let numbers = 0
    let filled = 0
    for (const address of rangeAddresses(selection)) {
      const value = calculator.getValue(sheet.id, address)
      if (value !== null && value !== '') filled++
      if (typeof value === 'number') {
        sum += value
        numbers++
      }
    }
    return { sum, numbers, filled }
  }, [selection, calculator, sheet.id])

  // --- Render ------------------------------------------------------------------

  const columns = useMemo(
    () => Array.from({ length: columnCount }, (_, c) => c),
    [columnCount],
  )
  const rows = useMemo(() => Array.from({ length: rowCount }, (_, r) => r), [rowCount])
  const totalWidth = ROW_HEADER_WIDTH + widths.reduce((a, b) => a + b, 0)

  const editorElement =
    editingHere?.origin === 'cell' ? (
      <input
        autoFocus
        aria-label={`Edit cell ${editingHere.address}`}
        value={editingHere.text}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => setEditingText(event.target.value)}
        onKeyDown={onEditorKeyDown}
        onBlur={(event) => {
          if (event.relatedTarget === barRef.current && editingRef.current) {
            setEditing({ ...editingRef.current, origin: 'bar', mode: 'edit' })
          } else {
            commit(0, 0, event.relatedTarget === null)
          }
        }}
        style={{
          minWidth: '100%',
          width: `${Math.max(1, editingHere.text.length + 2)}ch`,
        }}
        className="absolute inset-y-0 left-0 z-30 h-full bg-white px-1.5 font-mono text-sm shadow-md outline-2 -outline-offset-2 outline-blue-600"
      />
    ) : null
  const editingPosition = editingHere ? parseAddress(editingHere.address) : null

  const errorValue = isError(activeValue) && !editing ? activeValue : null

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col rounded-lg border border-slate-300 bg-white shadow-sm"
    >
      <Toolbar
        format={activeCell?.format}
        disabled={!editable}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {
          commit()
          onUndo?.()
        }}
        onRedo={() => {
          commit()
          onRedo?.()
        }}
        onFormat={applyFormat}
      />
      <FormulaBar
        inputRef={barRef}
        nameBox={rangeToText(selection)}
        value={editing ? editing.text : (activeCell?.input ?? '')}
        readOnly={!editable}
        activeFunction={activeFunction}
        suggestions={suggestions?.names ?? []}
        error={errorValue}
        onFocus={() => {
          if (!editingRef.current) startEditing(activeCell?.input ?? '', 'bar', 'edit')
        }}
        onChange={setEditingText}
        onKeyDown={onEditorKeyDown}
        onBlur={() => {
          const current = editingRef.current
          if (current?.origin !== 'bar') return
          commit(0, 0, false)
        }}
        onAcceptSuggestion={(name) => acceptFirstSuggestion(name)}
        onGoTo={(text) => {
          const range = parseRange(text)
          if (!range) return false
          commit()
          setActive({ row: range.top, column: range.left })
          setCorner({ row: range.bottom, column: range.right })
          focusGrid()
          return true
        }}
      />

      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label={`Spreadsheet ${sheet.name}`}
        aria-readonly={!editable}
        onKeyDown={onGridKeyDown}
        onCopy={(event) => onCopyOrCut(event, false)}
        onCut={(event) => onCopyOrCut(event, true)}
        onPaste={onPaste}
        className="relative min-h-0 flex-1 scroll-pt-7 scroll-pl-12 overflow-auto outline-none"
        data-testid="sheet-grid"
      >
        <div className="relative" style={{ width: totalWidth }}>
          <table
            ref={tableRef}
            className="border-separate border-spacing-0 text-sm select-none"
            style={{ tableLayout: 'fixed', width: totalWidth }}
            onMouseDown={onGridMouseDown}
            onMouseOver={onGridMouseOver}
            onDoubleClick={onGridDoubleClick}
          >
            <colgroup>
              <col style={{ width: ROW_HEADER_WIDTH }} />
              {columns.map((column) => (
                <col key={column} style={{ width: widths[column] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 h-7 border-r border-b border-slate-300 bg-slate-100" />
                {columns.map((column) => (
                  <th
                    key={column}
                    className={`sticky top-0 z-10 h-7 border-r border-b border-slate-300 font-medium ${
                      column >= selection.left && column <= selection.right
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {columnToLetters(column)}
                    {editable && (
                      <span
                        role="separator"
                        aria-label={`Resize column ${columnToLetters(column)}`}
                        title="Drag to resize. Double-click to fit the contents."
                        onMouseDown={(event) => startResize(event, column)}
                        onDoubleClick={() => autoFitColumn(column)}
                        className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize hover:bg-blue-400/50"
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row
                  key={row}
                  row={row}
                  columns={columns}
                  sheet={sheet}
                  calculator={calculator}
                  selected={row >= selection.top && row <= selection.bottom}
                  editingColumn={
                    editingPosition?.row === row ? editingPosition.column : -1
                  }
                  editingText={
                    editingPosition?.row === row && editingHere ? editingHere.text : null
                  }
                  editor={editingPosition?.row === row ? editorElement : null}
                />
              ))}
            </tbody>
          </table>
          <div className="pointer-events-none absolute inset-0 z-5" aria-hidden>
            {overlays.map((overlay) => (
              <div
                key={overlay.key}
                className={`absolute ${overlay.className}`}
                style={overlay.style}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex h-6 items-center justify-end gap-4 border-t border-slate-200 px-3 text-xs text-slate-600"
        data-testid="status-bar"
      >
        {summary && summary.numbers > 0 && (
          <>
            <span>Sum: {formatGeneralNumber(summary.sum)}</span>
            <span>Average: {formatGeneralNumber(summary.sum / summary.numbers)}</span>
          </>
        )}
        {summary && <span>Count: {summary.filled}</span>}
      </div>

      <SheetTabs
        content={content}
        activeSheetId={sheet.id}
        readOnly={!editable}
        onSelect={selectSheet}
        onAdd={() => {
          commit()
          let newId: string | null = null
          update((latest) => {
            const result = addSheet(latest)
            newId = result.sheetId
            return result.content
          })
          if (newId) selectSheet(newId)
        }}
        onRename={(sheetId, name) =>
          update((latest) => renameSheet(latest, sheetId, name))
        }
      />
    </div>
  )
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

interface RowProps {
  row: number
  columns: number[]
  sheet: Sheet
  calculator: WorkbookCalculator
  /** Whether the row is inside the selection (highlights the row number). */
  selected: boolean
  editingColumn: number
  editingText: string | null
  editor: ReactNode
}

/** One row of cells. Only re-drawn when something in it can have changed. */
const Row = memo(function Row({
  row,
  columns,
  sheet,
  calculator,
  selected,
  editingColumn,
  editingText,
  editor,
}: RowProps) {
  return (
    <tr>
      <th
        className={`sticky left-0 z-10 h-7 border-r border-b border-slate-300 font-medium ${
          selected ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {row + 1}
      </th>
      {columns.map((column) => {
        const address = toAddress({ row, column })
        const cell = sheet.cells[address]
        const isEditing = column === editingColumn
        const shown = isEditing
          ? null
          : displayValue(
              calculator.getValue(sheet.id, address),
              cell?.input ?? '',
              cell?.format,
            )
        const format = cell?.format
        return (
          <td
            key={column}
            data-address={address}
            role="gridcell"
            className={`relative h-7 overflow-hidden border-r border-b border-slate-200 px-1.5 whitespace-nowrap ${
              format?.fill ? FILL_CLASSES[format.fill] : ''
            } ${format?.bold ? 'font-semibold' : ''} ${format?.italic ? 'italic' : ''} ${
              shown?.isError ? 'text-red-600' : 'text-slate-900'
            } ${
              shown?.align === 'right'
                ? 'text-right tabular-nums'
                : shown?.align === 'center'
                  ? 'text-center'
                  : 'text-left'
            }`}
          >
            {isEditing
              ? (editor ?? <span className="font-mono">{editingText}</span>)
              : shown?.text}
          </td>
        )
      })}
    </tr>
  )
})
