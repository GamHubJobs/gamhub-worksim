/** Tabs for switching between the sheets of a workbook, adding and renaming them. */
import { useState } from 'react'
import type { SheetContent } from '../../../persistence/schemas'
import { checkSheetName } from '../model'

interface SheetTabsProps {
  content: SheetContent
  activeSheetId: string
  readOnly: boolean
  onSelect: (sheetId: string) => void
  onAdd: () => void
  onRename: (sheetId: string, name: string) => void
}

export function SheetTabs({
  content,
  activeSheetId,
  readOnly,
  onSelect,
  onAdd,
  onRename,
}: SheetTabsProps) {
  const [renaming, setRenaming] = useState<{ sheetId: string; name: string } | null>(null)
  const renameError = renaming
    ? checkSheetName(content, renaming.sheetId, renaming.name)
    : null

  function finishRename() {
    if (renaming && !renameError) onRename(renaming.sheetId, renaming.name)
    setRenaming(null)
  }

  return (
    <div className="flex items-center gap-1 border-t border-slate-200 bg-slate-50 px-2 py-1">
      {/* The tabs only: the button that adds a sheet sits outside the tab list. */}
      <div className="flex items-center gap-1" role="tablist" aria-label="Sheets">
        {content.sheets.map((sheet) =>
          renaming?.sheetId === sheet.id ? (
            <span key={sheet.id} className="relative">
              <input
                autoFocus
                aria-label="Sheet name"
                value={renaming.name}
                onChange={(event) =>
                  setRenaming({ ...renaming, name: event.target.value })
                }
                onBlur={finishRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') finishRename()
                  if (event.key === 'Escape') setRenaming(null)
                }}
                className={`w-32 rounded border bg-white px-2 py-0.5 text-sm ${
                  renameError ? 'border-red-400' : 'border-blue-400'
                }`}
              />
              {renameError && (
                <span
                  role="alert"
                  className="absolute bottom-full left-0 mb-1 w-64 rounded bg-red-700 px-2 py-1 text-xs text-white shadow"
                >
                  {renameError}
                </span>
              )}
            </span>
          ) : (
            <button
              key={sheet.id}
              type="button"
              role="tab"
              aria-selected={sheet.id === activeSheetId}
              title={readOnly ? sheet.name : 'Double-click to rename'}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(sheet.id)}
              onDoubleClick={() => {
                if (!readOnly) setRenaming({ sheetId: sheet.id, name: sheet.name })
              }}
              className={`rounded px-3 py-0.5 text-sm ${
                sheet.id === activeSheetId
                  ? 'bg-white font-medium text-blue-800 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sheet.name}
            </button>
          ),
        )}
      </div>
      {!readOnly && (
        <button
          type="button"
          title="Add a sheet"
          aria-label="Add a sheet"
          onClick={onAdd}
          className="rounded px-2 py-0.5 text-slate-500 hover:bg-slate-100"
        >
          +
        </button>
      )}
    </div>
  )
}
