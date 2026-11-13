/** The command palette (Ctrl+Shift+P), Go to File (Ctrl+P) and the menu bar. */
import { useEffect, useRef, useState } from 'react'
import { filterCommands, fuzzyFiles, type CommandId } from '../../../game/code/ide'

export function Palette({
  mode,
  files,
  onCommand,
  onOpenFile,
  onClose,
}: {
  mode: 'commands' | 'files'
  files: string[]
  onCommand: (id: CommandId) => void
  onOpenFile: (name: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState(mode === 'commands' ? '>' : '')
  const [selected, setSelected] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  const commands = query.startsWith('>')
  const items: Array<{ key: string; label: string; hint: string; act: () => void }> =
    commands
      ? filterCommands(query.slice(1)).map(([id, label, keys]) => ({
          key: id,
          label,
          hint: keys,
          act: () => onCommand(id),
        }))
      : fuzzyFiles(files, query).map((name) => ({
          key: name,
          label: name,
          hint: '',
          act: () => onOpenFile(name),
        }))
  const index = Math.min(selected, Math.max(0, items.length - 1))

  return (
    <div
      className="absolute inset-0 z-[var(--z-menu)] flex justify-center bg-black/20 pt-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-label={commands ? 'Command palette' : 'Go to file'}
        className="h-fit w-[min(36rem,90%)] overflow-hidden rounded-md border border-slate-600 bg-slate-800 shadow-lg"
      >
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSelected((i) => Math.min(i + 1, items.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSelected((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter' && items[index]) {
              e.preventDefault()
              onClose()
              items[index].act()
            }
          }}
          placeholder={
            commands ? 'Type a command' : 'Search files by name (type > for commands)'
          }
          aria-label={commands ? 'Command' : 'File name'}
          role="combobox"
          aria-expanded="true"
          aria-controls="ide-palette-list"
          className="w-full border-b border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
        />
        <ul
          id="ide-palette-list"
          role="listbox"
          className="max-h-80 overflow-y-auto py-1"
        >
          {items.length === 0 && (
            <li className="px-3 py-1 text-sm text-slate-300">No matches</li>
          )}
          {items.map((item, i) => (
            <li
              key={item.key}
              role="option"
              aria-selected={i === index}
              onMouseEnter={() => setSelected(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                onClose()
                item.act()
              }}
              className={`flex cursor-pointer justify-between gap-4 px-3 py-1 text-sm ${
                i === index ? 'bg-sky-800 text-white' : 'text-slate-200'
              }`}
            >
              <span className={commands ? '' : 'font-mono'}>{item.label}</span>
              {item.hint && <kbd className="text-xs text-slate-300">{item.hint}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const MENUS: Array<[string, Array<[string, CommandId]>]> = [
  [
    'File',
    [
      ['New File…', 'newFile'],
      ['Go to File…', 'quickOpen'],
      ['Save', 'save'],
      ['Close Editor', 'closeEditor'],
    ],
  ],
  [
    'Edit',
    [
      ['Undo', 'undo'],
      ['Redo', 'redo'],
      ['Find', 'find'],
      ['Replace', 'replace'],
      ['Find in Files', 'search'],
      ['Format Document', 'format'],
    ],
  ],
  [
    'View',
    [
      ['Command Palette…', 'commandPalette'],
      ['Explorer', 'explorer'],
      ['Search', 'search'],
      ['Source Control', 'scm'],
      ['Run and Debug', 'debug'],
      ['Extensions', 'extensions'],
      ['Problems', 'problems'],
      ['Toggle Side Bar', 'toggleSidebar'],
      ['Toggle Panel', 'togglePanel'],
      ['Word Wrap', 'wordWrap'],
    ],
  ],
  [
    'Run',
    [
      ['Start Debugging', 'startDebugging'],
      ['Toggle Breakpoint', 'toggleBreakpoint'],
      ['Run All Tests', 'runTests'],
    ],
  ],
  ['Terminal', [['Show Terminal', 'terminal']]],
  [
    'Help',
    [
      ['Keyboard Shortcuts', 'shortcuts'],
      ['About', 'about'],
    ],
  ],
]

export function MenuBar({ onCommand }: { onCommand: (id: CommandId) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <nav
      aria-label="Editor menu"
      className="flex items-center text-[13px] text-slate-200"
    >
      {MENUS.map(([name, items]) => (
        <div key={name} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open === name}
            onClick={() => setOpen(open === name ? null : name)}
            onMouseEnter={() => open && setOpen(name)}
            className={`rounded px-2 py-0.5 ${open === name ? 'bg-slate-700' : 'hover:bg-slate-700/60'}`}
          >
            {name}
          </button>
          {open === name && (
            <ul
              role="menu"
              aria-label={name}
              className="absolute top-full left-0 z-[var(--z-menu)] min-w-48 rounded border border-slate-600 bg-slate-800 py-1 shadow-lg"
              onMouseLeave={() => setOpen(null)}
            >
              {items.map(([label, id]) => (
                <li key={label} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(null)
                      onCommand(id)
                    }}
                    className="w-full px-3 py-1 text-left hover:bg-sky-800"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  )
}
