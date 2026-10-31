/** Formatting and undo buttons above the spreadsheet. */
import { useState, type ReactNode } from 'react'
import {
  FILL_COLORS,
  type CellFormat,
  type FillColor,
} from '../../../persistence/schemas'
import { FILL_CLASSES } from './cellStyles'

export type FormatAction =
  | { type: 'toggle'; field: 'bold' | 'italic' }
  | { type: 'align'; align: NonNullable<CellFormat['align']> }
  | { type: 'numberFormat'; numberFormat: NonNullable<CellFormat['numberFormat']> }
  | { type: 'decimals'; change: 1 | -1 }
  | { type: 'fill'; fill: FillColor | undefined }
  | { type: 'clear' }

interface ToolbarProps {
  /** Formatting of the selected cell, to show which buttons are "on". */
  format: CellFormat | undefined
  disabled: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onFormat: (action: FormatAction) => void
}

const FILL_NAMES: Record<FillColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  red: 'Red',
  gray: 'Grey',
}

function ToolButton({
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      // Keep keyboard focus in the grid, so shortcuts keep working after a click.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
}

export function Toolbar({
  format,
  disabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFormat,
}: ToolbarProps) {
  const [fillOpen, setFillOpen] = useState(false)

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-2 py-1"
      role="toolbar"
      aria-label="Formatting"
    >
      <ToolButton
        label="Undo"
        shortcut="Ctrl+Z"
        disabled={disabled || !canUndo}
        onClick={onUndo}
      >
        ↶
      </ToolButton>
      <ToolButton
        label="Redo"
        shortcut="Ctrl+Y"
        disabled={disabled || !canRedo}
        onClick={onRedo}
      >
        ↷
      </ToolButton>
      <Divider />
      <ToolButton
        label="Bold"
        shortcut="Ctrl+B"
        pressed={!!format?.bold}
        disabled={disabled}
        onClick={() => onFormat({ type: 'toggle', field: 'bold' })}
      >
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton
        label="Italic"
        shortcut="Ctrl+I"
        pressed={!!format?.italic}
        disabled={disabled}
        onClick={() => onFormat({ type: 'toggle', field: 'italic' })}
      >
        <span className="font-serif italic">I</span>
      </ToolButton>
      <Divider />
      {(['left', 'center', 'right'] as const).map((align) => (
        <ToolButton
          key={align}
          label={`Align ${align}`}
          pressed={format?.align === align}
          disabled={disabled}
          onClick={() => onFormat({ type: 'align', align })}
        >
          <AlignIcon align={align} />
        </ToolButton>
      ))}
      <Divider />
      <ToolButton
        label="Currency format"
        pressed={format?.numberFormat === 'currency'}
        disabled={disabled}
        onClick={() => onFormat({ type: 'numberFormat', numberFormat: 'currency' })}
      >
        $
      </ToolButton>
      <ToolButton
        label="Percent format"
        pressed={format?.numberFormat === 'percent'}
        disabled={disabled}
        onClick={() => onFormat({ type: 'numberFormat', numberFormat: 'percent' })}
      >
        %
      </ToolButton>
      <ToolButton
        label="Number format with thousands separator"
        pressed={format?.numberFormat === 'number'}
        disabled={disabled}
        onClick={() => onFormat({ type: 'numberFormat', numberFormat: 'number' })}
      >
        <span className="text-xs">1,000</span>
      </ToolButton>
      <ToolButton
        label="Fewer decimal places"
        disabled={disabled}
        onClick={() => onFormat({ type: 'decimals', change: -1 })}
      >
        <span className="text-xs">.0←</span>
      </ToolButton>
      <ToolButton
        label="More decimal places"
        disabled={disabled}
        onClick={() => onFormat({ type: 'decimals', change: 1 })}
      >
        <span className="text-xs">.00→</span>
      </ToolButton>
      <Divider />
      <div className="relative">
        <ToolButton
          label="Fill colour"
          pressed={fillOpen}
          disabled={disabled}
          onClick={() => setFillOpen((open) => !open)}
        >
          <span
            className={`h-4 w-4 rounded-sm border border-slate-300 ${
              format?.fill ? FILL_CLASSES[format.fill] : 'bg-white'
            }`}
          />
        </ToolButton>
        {fillOpen && (
          <div
            className="absolute top-8 left-0 z-40 flex gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg"
            role="menu"
          >
            {FILL_COLORS.map((fill) => (
              <button
                key={fill}
                type="button"
                role="menuitem"
                title={FILL_NAMES[fill]}
                aria-label={`${FILL_NAMES[fill]} fill`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onFormat({ type: 'fill', fill })
                  setFillOpen(false)
                }}
                className={`h-6 w-6 rounded border border-slate-300 ${FILL_CLASSES[fill]}`}
              />
            ))}
            <button
              type="button"
              role="menuitem"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onFormat({ type: 'fill', fill: undefined })
                setFillOpen(false)
              }}
              className="rounded border border-slate-300 px-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              None
            </button>
          </div>
        )}
      </div>
      <ToolButton
        label="Clear formatting"
        disabled={disabled}
        onClick={() => onFormat({ type: 'clear' })}
      >
        <span className="text-xs">Clear format</span>
      </ToolButton>
    </div>
  )
}

function AlignIcon({ align }: { align: 'left' | 'center' | 'right' }) {
  const widths = align === 'center' ? [10, 6, 10] : [10, 6, 8]
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden>
      {widths.map((width, i) => {
        const x = align === 'left' ? 2 : align === 'right' ? 12 - width : (14 - width) / 2
        return (
          <rect
            key={i}
            x={x}
            y={1 + i * 4}
            width={width}
            height="1.6"
            fill="currentColor"
          />
        )
      })}
    </svg>
  )
}
