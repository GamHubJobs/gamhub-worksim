/**
 * The Docs editor: a toolbar, the page (A4 or Letter, with margins), and an
 * outline of the document's headings for finding your way around.
 */
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ChartSpec, DocContent, RichNode } from '../../persistence/schemas'
import { docExtensions, FONT_SIZES } from './editor'
import { countWords, outline } from './text'

const PAGE_WIDTH = { a4: 794, letter: 816 } as const
const PAGE_MARGIN = { normal: 96, narrow: 48, wide: 144 } as const

const TEXT_COLORS = [
  { name: 'Default', value: null },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Red', value: '#b91c1c' },
  { name: 'Green', value: '#047857' },
  { name: 'Grey', value: '#64748b' },
]

interface DocEditorProps {
  content: DocContent
  readOnly?: boolean
  onChange?: (content: DocContent) => void
  /** Opens the "insert a chart from Sheets" picker; the chart is inserted at the cursor. */
  onPickChart?: (insert: (chart: ChartSpec) => void) => void
}

export function DocEditor({
  content,
  readOnly = false,
  onChange,
  onPickChart,
}: DocEditorProps) {
  const latest = useRef(content)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    latest.current = content
    onChangeRef.current = onChange
  })

  const editor = useEditor({
    extensions: docExtensions(),
    content: content.body,
    editable: !readOnly,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      onChangeRef.current?.({
        ...latest.current,
        body: editor.getJSON() as RichNode,
      })
    },
  })

  const setPage = (page: Partial<DocContent['page']>) =>
    onChange?.({ ...content, page: { ...content.page, ...page } })

  const width = PAGE_WIDTH[content.page.size]
  const margin = PAGE_MARGIN[content.page.margins]
  const headings = outline(content.body)
  const words = countWords(content.body)

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="doc-editor">
      {!readOnly && editor && (
        <Toolbar
          editor={editor}
          page={content.page}
          onPage={setPage}
          onPickChart={
            onPickChart
              ? () =>
                  onPickChart((chart) =>
                    editor
                      .chain()
                      .focus()
                      .insertContent({ type: 'chart', attrs: { spec: chart } })
                      .run(),
                  )
              : undefined
          }
        />
      )}
      <div className="flex min-h-0 flex-1">
        <nav
          className="hidden w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3 lg:block"
          aria-label="Outline"
        >
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Outline
          </p>
          {headings.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Headings you add appear here, so you can jump between sections.
            </p>
          ) : (
            <ul className="mt-2 space-y-0.5 text-sm">
              {headings.map((heading) => (
                <li key={heading.index} style={{ paddingLeft: (heading.level - 1) * 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const dom = editor?.view.dom.children[heading.index]
                      dom?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="w-full truncate rounded px-1 py-0.5 text-left text-slate-700 hover:bg-slate-100"
                  >
                    {heading.text || 'Untitled heading'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500" data-testid="word-count">
            {words} word{words === 1 ? '' : 's'}
          </p>
        </nav>
        <div className="doc-scroll min-w-0 flex-1 overflow-auto bg-slate-200/70 py-8">
          <div
            className="doc-page mx-auto bg-white shadow-md"
            style={{
              width,
              minHeight: Math.round(width * 1.414),
              padding: `72px ${margin}px`,
            }}
          >
            <EditorContent
              editor={editor}
              className="doc-content"
              data-testid="doc-body"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-sm ${
        active ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-100'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

const Divider = () => <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />

function Toolbar({
  editor,
  page,
  onPage,
  onPickChart,
}: {
  editor: Editor
  page: DocContent['page']
  onPage: (page: Partial<DocContent['page']>) => void
  onPickChart?: () => void
}) {
  const [tableMenu, setTableMenu] = useState(false)
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      block: e.isActive('heading', { level: 1 })
        ? 'h1'
        : e.isActive('heading', { level: 2 })
          ? 'h2'
          : e.isActive('heading', { level: 3 })
            ? 'h3'
            : 'p',
      fontSize: (e.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '',
      align:
        (['center', 'right', 'justify'] as const).find((a) =>
          e.isActive({ textAlign: a }),
        ) ?? 'left',
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      inTable: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
  const chain = () => editor.chain().focus()

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-3 py-1.5"
      role="toolbar"
      aria-label="Formatting"
    >
      <ToolbarButton
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => chain().undo().run()}
      >
        ↶
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => chain().redo().run()}
      >
        ↷
      </ToolbarButton>
      <Divider />
      <select
        aria-label="Text style"
        value={state.block}
        onChange={(event) => {
          const value = event.target.value
          if (value === 'p') chain().setParagraph().run()
          else
            chain()
              .setHeading({ level: Number(value[1]) as 1 | 2 | 3 })
              .run()
        }}
        className="h-8 rounded border border-slate-200 px-1 text-sm"
      >
        <option value="p">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <select
        aria-label="Font size"
        value={state.fontSize}
        onChange={(event) => {
          const value = event.target.value
          if (value) chain().setFontSize(value).run()
          else chain().unsetFontSize().run()
        }}
        className="ml-1 h-8 rounded border border-slate-200 px-1 text-sm"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {parseInt(size, 10)}
          </option>
        ))}
      </select>
      <Divider />
      <ToolbarButton
        label="Bold"
        active={state.bold}
        onClick={() => chain().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>
      <select
        aria-label="Text colour"
        value={state.color}
        onChange={(event) => {
          const value = event.target.value
          if (value) chain().setColor(value).run()
          else chain().unsetColor().run()
        }}
        className="ml-1 h-8 rounded border border-slate-200 px-1 text-sm"
      >
        {TEXT_COLORS.map((color) => (
          <option key={color.name} value={color.value ?? ''}>
            {color.name}
          </option>
        ))}
      </select>
      <Divider />
      {(['left', 'center', 'right', 'justify'] as const).map((align) => (
        <ToolbarButton
          key={align}
          label={`Align ${align}`}
          active={state.align === align}
          onClick={() => chain().setTextAlign(align).run()}
        >
          <AlignIcon align={align} />
        </ToolbarButton>
      ))}
      <Divider />
      <ToolbarButton
        label="Bulleted list"
        active={state.bullet}
        onClick={() => chain().toggleBulletList().run()}
      >
        • ≡
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.ordered}
        onClick={() => chain().toggleOrderedList().run()}
      >
        1. ≡
      </ToolbarButton>
      <Divider />
      <div className="relative">
        <ToolbarButton
          label="Table"
          active={state.inTable || tableMenu}
          onClick={() => setTableMenu((open) => !open)}
        >
          Table ▾
        </ToolbarButton>
        {tableMenu && (
          <div
            className="absolute top-full left-0 z-30 mt-1 w-48 rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-slate-200"
            role="menu"
          >
            {(
              [
                [
                  'Insert table (3 × 3)',
                  () =>
                    chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
                  true,
                ],
                ['Add row below', () => chain().addRowAfter().run(), state.inTable],
                ['Add column right', () => chain().addColumnAfter().run(), state.inTable],
                ['Delete row', () => chain().deleteRow().run(), state.inTable],
                ['Delete column', () => chain().deleteColumn().run(), state.inTable],
                [
                  'Header row on/off',
                  () => chain().toggleHeaderRow().run(),
                  state.inTable,
                ],
                ['Delete table', () => chain().deleteTable().run(), state.inTable],
              ] as Array<[string, () => void, boolean]>
            ).map(([label, action, enabled]) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                disabled={!enabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  action()
                  setTableMenu(false)
                }}
                className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {onPickChart && (
        <ToolbarButton label="Insert chart from Sheets" onClick={onPickChart}>
          Chart
        </ToolbarButton>
      )}
      <ToolbarButton
        label="Horizontal line"
        onClick={() => chain().setHorizontalRule().run()}
      >
        ―
      </ToolbarButton>
      <ToolbarButton
        label="Page break"
        onClick={() => chain().insertContent({ type: 'pageBreak' }).run()}
      >
        ⤓ Page
      </ToolbarButton>
      <Divider />
      <select
        aria-label="Page size"
        value={page.size}
        onChange={(event) => onPage({ size: event.target.value as 'a4' | 'letter' })}
        className="h-8 rounded border border-slate-200 px-1 text-sm"
      >
        <option value="a4">A4</option>
        <option value="letter">Letter</option>
      </select>
      <select
        aria-label="Margins"
        value={page.margins}
        onChange={(event) =>
          onPage({ margins: event.target.value as 'normal' | 'narrow' | 'wide' })
        }
        className="ml-1 h-8 rounded border border-slate-200 px-1 text-sm"
      >
        <option value="normal">Normal margins</option>
        <option value="narrow">Narrow margins</option>
        <option value="wide">Wide margins</option>
      </select>
    </div>
  )
}

function AlignIcon({ align }: { align: 'left' | 'center' | 'right' | 'justify' }) {
  const lines: Array<[number, number]> =
    align === 'left'
      ? [
          [3, 15],
          [3, 11],
          [3, 15],
          [3, 9],
        ]
      : align === 'center'
        ? [
            [3, 15],
            [5, 11],
            [3, 15],
            [6, 9],
          ]
        : align === 'right'
          ? [
              [3, 15],
              [7, 11],
              [3, 15],
              [9, 9],
            ]
          : [
              [3, 15],
              [3, 15],
              [3, 15],
              [3, 15],
            ]
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden>
      {lines.map(([x, x2], i) => (
        <line
          key={i}
          x1={x}
          x2={x2}
          y1={4 + i * 3.5}
          y2={4 + i * 3.5}
          stroke="currentColor"
          strokeWidth={1.6}
        />
      ))}
    </svg>
  )
}
