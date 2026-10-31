/**
 * The formula bar: shows where you are (name box) and what the selected cell
 * really contains, for example the formula behind a total. While a formula is
 * typed it explains the function being used and suggests function names. If
 * the selected cell shows an error, the error is explained in plain words.
 */
import { useState, type KeyboardEvent, type RefObject } from 'react'
import type { ActiveFunction } from '../engine/formulaHelp'
import { syntaxParts } from '../engine/formulaHelp'
import { ERROR_EXPLANATIONS, type ErrorValue } from '../engine/values'

interface FormulaBarProps {
  inputRef: RefObject<HTMLInputElement | null>
  nameBox: string
  value: string
  readOnly: boolean
  activeFunction: ActiveFunction | null
  suggestions: string[]
  error: ErrorValue | null
  onFocus: () => void
  onChange: (text: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onBlur: (relatedTarget: Element | null) => void
  onAcceptSuggestion: (name: string) => void
  /** Called with what was typed into the name box, e.g. "B12" or "A1:C5". */
  onGoTo: (text: string) => boolean
}

export function FormulaBar({
  inputRef,
  nameBox,
  value,
  readOnly,
  activeFunction,
  suggestions,
  error,
  onFocus,
  onChange,
  onKeyDown,
  onBlur,
  onAcceptSuggestion,
  onGoTo,
}: FormulaBarProps) {
  const [nameBoxDraft, setNameBoxDraft] = useState<string | null>(null)

  return (
    <div className="relative border-b border-slate-200">
      <div className="flex items-center gap-2 px-2 py-1 text-sm">
        <input
          aria-label="Cell address"
          title="Type a cell address such as B12 and press Enter to go there"
          value={nameBoxDraft ?? nameBox}
          onFocus={(event) => {
            setNameBoxDraft(nameBox)
            event.target.select()
          }}
          onChange={(event) => setNameBoxDraft(event.target.value)}
          onBlur={() => setNameBoxDraft(null)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (onGoTo(nameBoxDraft ?? '')) setNameBoxDraft(null)
            } else if (event.key === 'Escape') {
              setNameBoxDraft(null)
              onGoTo(nameBox)
            }
          }}
          className="w-24 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-center font-mono"
          data-testid="selected-address"
        />
        <span className="font-serif text-slate-400 italic select-none" aria-hidden>
          fx
        </span>
        <input
          ref={inputRef}
          aria-label="Formula bar"
          value={value}
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={(event) => onBlur(event.relatedTarget)}
          className="min-w-0 flex-1 rounded border border-transparent px-2 py-0.5 font-mono text-slate-800 hover:border-slate-200 focus:border-blue-400 focus:outline-none"
          data-testid="selected-input"
        />
      </div>

      {error && (
        <div
          className="flex gap-2 border-t border-red-100 bg-red-50 px-3 py-1 text-sm text-red-800"
          data-testid="error-explanation"
        >
          <span className="font-mono font-semibold">{error.code}</span>
          <span>
            {error.message}
            {error.message !== ERROR_EXPLANATIONS[error.code] && (
              <span className="text-red-700/80"> ({ERROR_EXPLANATIONS[error.code]})</span>
            )}
          </span>
        </div>
      )}

      {(suggestions.length > 0 || activeFunction) && (
        <div
          className={`absolute top-full right-2 z-40 mt-1 w-[28rem] max-w-[calc(100%-8rem)] rounded-md border border-slate-200 bg-white/95 text-sm shadow-lg ${
            suggestions.length > 0 ? '' : 'pointer-events-none'
          }`}
          data-testid="formula-help"
        >
          {suggestions.length > 0 && (
            <ul className="py-1" role="listbox" aria-label="Function suggestions">
              {suggestions.map((name, i) => (
                <li key={name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === 0}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onAcceptSuggestion(name)
                    }}
                    className={`w-full px-3 py-1 text-left font-mono hover:bg-blue-50 ${
                      i === 0 ? 'bg-slate-50' : ''
                    }`}
                  >
                    {name}
                    {i === 0 && (
                      <span className="ml-2 font-sans text-xs text-slate-400">
                        Tab to insert
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {activeFunction && suggestions.length === 0 && (
            <FunctionHelp active={activeFunction} />
          )}
        </div>
      )}
    </div>
  )
}

function FunctionHelp({ active }: { active: ActiveFunction }) {
  const { definition, argumentIndex } = active
  const { name, args } = syntaxParts(definition.syntax)
  // For "value1, [value2, ...]" every extra value highlights the repeating part.
  const highlighted = Math.min(argumentIndex, args.length - 1)
  return (
    <div className="space-y-1 px-3 py-2">
      <p className="font-mono">
        {name}(
        {args.map((arg, i) => (
          <span key={i}>
            {i > 0 && ', '}
            <span
              className={i === highlighted ? 'font-bold text-blue-700' : 'text-slate-600'}
            >
              {arg}
            </span>
          </span>
        ))}
        )
      </p>
      <p className="text-slate-700">{definition.description}</p>
      <p className="text-xs text-slate-500">
        Example: <span className="font-mono">{definition.example}</span>
      </p>
    </div>
  )
}
