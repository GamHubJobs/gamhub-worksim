/**
 * The Slides editor: slide thumbnails on the left, the slide in the middle
 * (click to select, drag to move, drag a handle to resize, double-click to
 * type), a toolbar for adding and formatting things, and speaker notes.
 */
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createId } from '../../lib/ids'
import {
  SLIDE_HEIGHT,
  SLIDE_LAYOUTS,
  SLIDE_THEMES,
  SLIDE_WIDTH,
  type ChartSpec,
  type SlideElement,
  type SlidesContent,
  type SlideLayout,
  type TextStyle,
} from '../../persistence/schemas'
import {
  addElement,
  addSlide,
  boxStyle,
  changeLayout,
  clampBox,
  deleteSlide,
  duplicateSlide,
  LAYOUT_NAMES,
  moveSlide,
  removeElement,
  reorderElement,
  slideTextColor,
  textBox,
  THEMES,
  updateElement,
  updateSlide,
} from './model'
import { SlideView } from './SlideView'

type Box = { x: number; y: number; w: number; h: number }
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const COLORS = [
  { name: 'Theme', value: null },
  { name: 'Black', value: '#0f172a' },
  { name: 'White', value: '#ffffff' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#059669' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Grey', value: '#64748b' },
]

const SHAPES = [
  { shape: 'rect', name: 'Rectangle' },
  { shape: 'rounded', name: 'Rounded rectangle' },
  { shape: 'ellipse', name: 'Ellipse' },
  { shape: 'arrow', name: 'Arrow' },
  { shape: 'line', name: 'Line' },
] as const

interface SlidesEditorProps {
  content: SlidesContent
  readOnly?: boolean
  onUpdate?: (change: (content: SlidesContent) => SlidesContent) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  /** Opens the chart picker; the chosen chart is placed on the current slide. */
  onPickChart?: (insert: (chart: ChartSpec) => void) => void
  onPresent?: (fromSlide: number) => void
}

/** Reads a picture file, shrinking it so presentations stay small. */
async function loadImage(
  file: File,
): Promise<{ src: string; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(image, 0, 0, width, height)
    const png = file.type === 'image/png' ? canvas.toDataURL('image/png') : ''
    const src = png && png.length < 1_500_000 ? png : canvas.toDataURL('image/jpeg', 0.85)
    return { src, width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function SlidesEditor({
  content,
  readOnly = false,
  onUpdate,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onPickChart,
  onPresent,
}: SlidesEditorProps) {
  const editable = !readOnly && !!onUpdate
  const [slideId, setSlideId] = useState(content.slides[0].id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [drag, setDrag] = useState<{ id: string; box: Box } | null>(null)
  const [menu, setMenu] = useState<'new' | 'layout' | 'shape' | 'theme' | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(800)

  const slideIndex = Math.max(
    0,
    content.slides.findIndex((s) => s.id === slideId),
  )
  const slide = content.slides[slideIndex]
  const selected = slide.elements.find((e) => e.id === selectedId) ?? null
  const theme = THEMES[content.theme]

  // Fit the slide to the space available.
  useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCanvasWidth(
        Math.max(240, Math.min(width - 32, ((height - 32) * SLIDE_WIDTH) / SLIDE_HEIGHT)),
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const scale = canvasWidth / SLIDE_WIDTH

  function update(change: (latest: SlidesContent) => SlidesContent) {
    if (editable) onUpdate?.(change)
  }

  function selectSlide(id: string) {
    finishEditing()
    setSlideId(id)
    setSelectedId(null)
  }

  function finishEditing() {
    if (!editingId) return
    const id = editingId
    const text = draft
    setEditingId(null)
    update((latest) => updateElement(latest, slide.id, id, { text }))
  }

  function startEditing(element: SlideElement) {
    if (!editable || (element.type !== 'text' && element.type !== 'shape')) return
    if (element.type === 'shape' && element.shape === 'line') return
    setSelectedId(element.id)
    setEditingId(element.id)
    setDraft(element.text)
  }

  function addToSlide(added: SlideElement) {
    // Always a valid size and place, however small the picture or odd the input.
    const element = { ...added, ...clampBox(added) } as SlideElement
    update((latest) => addElement(latest, slide.id, element))
    setSelectedId(element.id)
    return element
  }

  function setTextStyle(changes: Partial<TextStyle>) {
    if (selected?.type !== 'text') return
    update((latest) =>
      updateElement(latest, slide.id, selected.id, {
        style: { ...selected.style, ...changes },
      } as Partial<SlideElement>),
    )
  }

  // --- Moving and resizing with the mouse -----------------------------------

  function pointerStart(
    event: ReactPointerEvent,
    element: SlideElement,
    handle: Handle | null,
  ) {
    if (!editable || event.button !== 0) return
    event.stopPropagation()
    finishEditing()
    setSelectedId(element.id)
    const start = { x: event.clientX, y: event.clientY }
    const origin: Box = { x: element.x, y: element.y, w: element.w, h: element.h }
    let latestBox = origin
    let moved = false

    const onMove = (move: PointerEvent) => {
      const dx = (move.clientX - start.x) / scale
      const dy = (move.clientY - start.y) / scale
      if (!moved && Math.abs(dx) + Math.abs(dy) < 2) return
      moved = true
      let box = { ...origin }
      if (!handle) {
        box.x += dx
        box.y += dy
      } else {
        if (handle.includes('e')) box.w = origin.w + dx
        if (handle.includes('s')) box.h = origin.h + dy
        if (handle.includes('w')) {
          box.x = origin.x + dx
          box.w = origin.w - dx
        }
        if (handle.includes('n')) {
          box.y = origin.y + dy
          box.h = origin.h - dy
        }
      }
      box = clampBox(box)
      latestBox = {
        x: Math.round(box.x),
        y: Math.round(box.y),
        w: Math.round(box.w),
        h: Math.round(box.h),
      }
      setDrag({ id: element.id, box: latestBox })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDrag(null)
      if (moved)
        update((latest) => updateElement(latest, slide.id, element.id, latestBox))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function onKeyDown(event: ReactKeyboardEvent) {
    if (editingId || !editable) return
    const ctrl = event.ctrlKey || event.metaKey
    if (ctrl && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) onRedo?.()
      else onUndo?.()
      return
    }
    if (ctrl && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      onRedo?.()
      return
    }
    if (!selected) return
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      update((latest) => removeElement(latest, slide.id, selected.id))
      setSelectedId(null)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      startEditing(selected)
      return
    }
    const nudge: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const step = nudge[event.key]
    if (step) {
      event.preventDefault()
      const by = event.shiftKey ? 20 : 4
      update((latest) =>
        updateElement(latest, slide.id, selected.id, {
          ...clampBox({
            x: selected.x + step[0] * by,
            y: selected.y + step[1] * by,
            w: selected.w,
            h: selected.h,
          }),
        }),
      )
    }
  }

  // The slide as shown: with the box being dragged in its new place.
  const shownSlide = drag
    ? {
        ...slide,
        elements: slide.elements.map((e) =>
          e.id === drag.id ? { ...e, ...drag.box } : e,
        ),
      }
    : slide
  const shownSelected = shownSlide.elements.find((e) => e.id === selectedId) ?? null
  const editingElement = shownSlide.elements.find((e) => e.id === editingId) ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="slides-editor">
      {editable && (
        <div
          className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5 text-sm"
          role="toolbar"
          aria-label="Slide tools"
        >
          <ToolButton label="Undo" disabled={!canUndo} onClick={() => onUndo?.()}>
            ↶
          </ToolButton>
          <ToolButton label="Redo" disabled={!canRedo} onClick={() => onRedo?.()}>
            ↷
          </ToolButton>
          <Divider />
          <MenuButton
            label="New slide"
            open={menu === 'new'}
            onToggle={() => setMenu(menu === 'new' ? null : 'new')}
          >
            {SLIDE_LAYOUTS.map((layout) => (
              <MenuItem
                key={layout}
                onClick={() => {
                  let newId = ''
                  update((latest) => {
                    const result = addSlide(latest, slideIndex, layout)
                    newId = result.slideId
                    return result.content
                  })
                  setMenu(null)
                  if (newId) selectSlide(newId)
                }}
              >
                {LAYOUT_NAMES[layout]}
              </MenuItem>
            ))}
          </MenuButton>
          <MenuButton
            label="Layout"
            open={menu === 'layout'}
            onToggle={() => setMenu(menu === 'layout' ? null : 'layout')}
          >
            {SLIDE_LAYOUTS.map((layout) => (
              <MenuItem
                key={layout}
                checked={slide.layout === layout}
                onClick={() => {
                  update((latest) =>
                    changeLayout(latest, slide.id, layout as SlideLayout),
                  )
                  setSelectedId(null)
                  setMenu(null)
                }}
              >
                {LAYOUT_NAMES[layout]}
              </MenuItem>
            ))}
          </MenuButton>
          <MenuButton
            label="Theme"
            open={menu === 'theme'}
            onToggle={() => setMenu(menu === 'theme' ? null : 'theme')}
          >
            {SLIDE_THEMES.map((id) => (
              <MenuItem
                key={id}
                checked={content.theme === id}
                onClick={() => {
                  update((latest) => ({ ...latest, theme: id }))
                  setMenu(null)
                }}
              >
                <span
                  className="mr-2 inline-block h-3 w-3 rounded-sm align-middle"
                  style={{ background: THEMES[id].titleBackground }}
                />
                {THEMES[id].name}
              </MenuItem>
            ))}
          </MenuButton>
          <Divider />
          <ToolButton
            label="Text box"
            onClick={() => {
              const element = addToSlide(
                textBox({ x: 280, y: 220, w: 400, h: 80 }, 'New text', { size: 24 }),
              )
              startEditing(element)
            }}
          >
            T Text box
          </ToolButton>
          <MenuButton
            label="Shape"
            open={menu === 'shape'}
            onToggle={() => setMenu(menu === 'shape' ? null : 'shape')}
          >
            {SHAPES.map(({ shape, name }) => (
              <MenuItem
                key={shape}
                onClick={() => {
                  addToSlide({
                    id: createId(),
                    type: 'shape',
                    shape,
                    x: 380,
                    y: shape === 'line' ? 260 : 200,
                    w: 200,
                    h: shape === 'line' ? 20 : 120,
                    fill: null,
                    stroke: null,
                    text: '',
                  })
                  setMenu(null)
                }}
              >
                {name}
              </MenuItem>
            ))}
          </MenuButton>
          <ToolButton label="Picture" onClick={() => fileRef.current?.click()}>
            Picture
          </ToolButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            aria-label="Choose a picture"
            data-testid="picture-input"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              setImageError(null)
              try {
                const image = await loadImage(file)
                // Fit large pictures in a 480 × 320 area; enlarge tiny ones to be visible.
                let fit = Math.min(480 / image.width, 320 / image.height)
                if (fit > 1)
                  fit = Math.min(
                    fit,
                    Math.max(1, 120 / Math.min(image.width, image.height)),
                  )
                const w = Math.round(image.width * fit)
                const h = Math.round(image.height * fit)
                addToSlide({
                  id: createId(),
                  type: 'image',
                  src: image.src,
                  alt: file.name.replace(/\.[^.]+$/, ''),
                  x: Math.round((SLIDE_WIDTH - w) / 2),
                  y: Math.round((SLIDE_HEIGHT - h) / 2),
                  w,
                  h,
                })
              } catch {
                setImageError('That picture could not be opened. Try a PNG or JPEG file.')
              }
            }}
          />
          {onPickChart && (
            <ToolButton
              label="Chart from Sheets"
              onClick={() =>
                onPickChart((chart) =>
                  addToSlide({
                    id: createId(),
                    type: 'chart',
                    chart,
                    x: 160,
                    y: 130,
                    w: 640,
                    h: 360,
                  }),
                )
              }
            >
              Chart
            </ToolButton>
          )}
          {selected && (
            <>
              <Divider />
              {selected.type === 'text' && (
                <>
                  <select
                    aria-label="Font size"
                    value={selected.style.size}
                    onChange={(e) => setTextStyle({ size: Number(e.target.value) })}
                    className="h-8 rounded border border-slate-200 px-1"
                  >
                    {[12, 14, 16, 18, 20, 24, 28, 32, 36, 44, 54, 66].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <ToolButton
                    label="Bold"
                    pressed={selected.style.bold}
                    onClick={() => setTextStyle({ bold: !selected.style.bold })}
                  >
                    <strong>B</strong>
                  </ToolButton>
                  <ToolButton
                    label="Italic"
                    pressed={selected.style.italic}
                    onClick={() => setTextStyle({ italic: !selected.style.italic })}
                  >
                    <em>I</em>
                  </ToolButton>
                  <ToolButton
                    label="Bullets"
                    pressed={selected.style.bullets}
                    onClick={() => setTextStyle({ bullets: !selected.style.bullets })}
                  >
                    •≡
                  </ToolButton>
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <ToolButton
                      key={align}
                      label={`Align ${align}`}
                      pressed={selected.style.align === align}
                      onClick={() => setTextStyle({ align })}
                    >
                      {align === 'left' ? '⇤' : align === 'center' ? '↔' : '⇥'}
                    </ToolButton>
                  ))}
                </>
              )}
              {(selected.type === 'text' || selected.type === 'shape') && (
                <select
                  aria-label={selected.type === 'text' ? 'Text colour' : 'Fill colour'}
                  value={
                    (selected.type === 'text' ? selected.style.color : selected.fill) ??
                    ''
                  }
                  onChange={(e) => {
                    const value = e.target.value || null
                    if (selected.type === 'text') setTextStyle({ color: value })
                    else
                      update((latest) =>
                        updateElement(latest, slide.id, selected.id, {
                          fill: value,
                        } as Partial<SlideElement>),
                      )
                  }}
                  className="h-8 rounded border border-slate-200 px-1"
                >
                  {COLORS.map((color) => (
                    <option key={color.name} value={color.value ?? ''}>
                      {selected.type === 'text' ? 'Text' : 'Fill'}: {color.name}
                    </option>
                  ))}
                </select>
              )}
              <ToolButton
                label="Bring to front"
                onClick={() =>
                  update((latest) => reorderElement(latest, slide.id, selected.id, 1))
                }
              >
                Front
              </ToolButton>
              <ToolButton
                label="Send to back"
                onClick={() =>
                  update((latest) => reorderElement(latest, slide.id, selected.id, -1))
                }
              >
                Back
              </ToolButton>
              <ToolButton
                label="Delete element"
                onClick={() => {
                  update((latest) => removeElement(latest, slide.id, selected.id))
                  setSelectedId(null)
                }}
              >
                Delete
              </ToolButton>
            </>
          )}
          {onPresent && (
            <button
              type="button"
              onClick={() => {
                finishEditing()
                onPresent(slideIndex)
              }}
              className="ml-auto rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800"
            >
              ▶ Present
            </button>
          )}
        </div>
      )}
      {imageError && (
        <p
          role="alert"
          className="border-b border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800"
        >
          {imageError}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Slide thumbnails */}
        <nav
          className="w-52 shrink-0 space-y-2 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3"
          aria-label="Slides"
        >
          {content.slides.map((s, i) => (
            <div key={s.id} className="flex gap-2">
              <span className="w-4 pt-1 text-right text-xs text-slate-500">{i + 1}</span>
              <button
                type="button"
                onClick={() => selectSlide(s.id)}
                aria-label={`Slide ${i + 1}`}
                aria-current={s.id === slide.id ? 'true' : undefined}
                className={`overflow-hidden rounded ring-2 ${
                  s.id === slide.id
                    ? 'ring-blue-600'
                    : 'ring-slate-200 hover:ring-slate-400'
                }`}
              >
                {/* A picture of the slide: the button is named "Slide N". */}
                <span aria-hidden="true" className="block">
                  <SlideView slide={s} theme={content.theme} width={160} />
                </span>
              </button>
            </div>
          ))}
          {editable && (
            <div className="grid grid-cols-2 gap-1 pt-2 text-xs">
              <SmallButton
                label="Move slide up"
                disabled={slideIndex === 0}
                onClick={() => update((latest) => moveSlide(latest, slide.id, -1))}
              >
                ↑ Up
              </SmallButton>
              <SmallButton
                label="Move slide down"
                disabled={slideIndex === content.slides.length - 1}
                onClick={() => update((latest) => moveSlide(latest, slide.id, 1))}
              >
                ↓ Down
              </SmallButton>
              <SmallButton
                label="Duplicate slide"
                onClick={() => {
                  let copyId = ''
                  update((latest) => {
                    const result = duplicateSlide(latest, slide.id)
                    copyId = result.slideId
                    return result.content
                  })
                  if (copyId) selectSlide(copyId)
                }}
              >
                Duplicate
              </SmallButton>
              <SmallButton
                label="Delete slide"
                disabled={content.slides.length <= 1}
                onClick={() => {
                  const next =
                    content.slides[slideIndex + 1] ?? content.slides[slideIndex - 1]
                  update((latest) => deleteSlide(latest, slide.id))
                  if (next) selectSlide(next.id)
                }}
              >
                Delete
              </SmallButton>
            </div>
          )}
        </nav>

        {/* The slide */}
        <div className="flex min-w-0 flex-1 flex-col bg-slate-200/70">
          <div
            ref={canvasRef}
            className="flex min-h-0 flex-1 items-center justify-center p-4 outline-none"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={() => {
              finishEditing()
              setSelectedId(null)
            }}
            data-testid="slide-canvas"
          >
            <div className="shadow-lg">
              <SlideView
                slide={shownSlide}
                theme={content.theme}
                width={canvasWidth}
                placeholders={editable}
                hiddenElementId={editingId}
              >
                {/* Click targets for every element (on top of the drawing). */}
                {editable &&
                  shownSlide.elements.map((element) => (
                    <div
                      key={element.id}
                      style={{ ...boxStyle(element), cursor: 'move' }}
                      data-testid={`element-${element.type}`}
                      // Keyboard users Tab to an element to select it, then press
                      // Enter to edit its text, the arrow keys to move it, or Delete.
                      role="button"
                      tabIndex={0}
                      onFocus={() => {
                        if (!editingId) setSelectedId(element.id)
                      }}
                      aria-pressed={selectedId === element.id}
                      aria-label={`${
                        element.type === 'text'
                          ? `Text: ${element.text.slice(0, 40) || 'empty'}`
                          : element.type
                      }. Press Enter to edit, arrow keys to move, Delete to remove.`}
                      onPointerDown={(event) => pointerStart(event, element, null)}
                      onDoubleClick={(event) => {
                        event.stopPropagation()
                        startEditing(element)
                      }}
                    />
                  ))}
                {shownSelected && editable && !editingId && (
                  <div style={boxStyle(shownSelected)} className="pointer-events-none">
                    <div
                      className="absolute -inset-0.5 border-2 border-blue-500"
                      style={{ borderWidth: 2 / scale }}
                    />
                    {HANDLES.map((handle) => (
                      <div
                        key={handle}
                        onPointerDown={(event) =>
                          pointerStart(event, shownSelected, handle)
                        }
                        className="pointer-events-auto absolute rounded-sm border border-blue-600 bg-white"
                        style={handleStyle(handle, 10 / scale)}
                        data-testid={`handle-${handle}`}
                      />
                    ))}
                  </div>
                )}
                {editingElement && (
                  <TextEditor
                    element={editingElement}
                    draft={draft}
                    color={
                      editingElement.type === 'text'
                        ? (editingElement.style.color ?? slideTextColor(slide, theme))
                        : '#ffffff'
                    }
                    onChange={setDraft}
                    onDone={finishEditing}
                  />
                )}
              </SlideView>
            </div>
          </div>
          <label className="block border-t border-slate-200 bg-white px-4 py-2">
            <span className="text-xs font-medium text-slate-500">Speaker notes</span>
            <textarea
              key={slide.id}
              defaultValue={slide.notes}
              readOnly={!editable}
              onBlur={(event) => {
                const notes = event.target.value
                if (notes !== slide.notes)
                  update((latest) =>
                    updateSlide(latest, slide.id, (s) => ({ ...s, notes })),
                  )
              }}
              rows={2}
              placeholder="What you want to say on this slide"
              className="mt-0.5 w-full resize-none rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

function handleStyle(handle: Handle, size: number) {
  const half = -size / 2
  const style: Record<string, number | string> = { width: size, height: size }
  if (handle.includes('n')) style.top = half
  if (handle.includes('s')) style.bottom = half
  if (handle.includes('w')) style.left = half
  if (handle.includes('e')) style.right = half
  if (handle === 'n' || handle === 's') style.left = `calc(50% - ${size / 2}px)`
  if (handle === 'e' || handle === 'w') style.top = `calc(50% - ${size / 2}px)`
  style.cursor = `${handle}-resize`
  return style
}

/** Typing into a text box or shape, in place, at the slide's own size. */
function TextEditor({
  element,
  draft,
  color,
  onChange,
  onDone,
}: {
  element: SlideElement
  draft: string
  color: string
  onChange: (text: string) => void
  onDone: () => void
}) {
  const style = element.type === 'text' ? element.style : null
  return (
    <textarea
      autoFocus
      aria-label="Slide text"
      value={draft}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onDone}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') onDone()
      }}
      style={{
        ...boxStyle(element),
        fontSize: style?.size ?? 20,
        fontWeight: style?.bold || !style ? 700 : 400,
        fontStyle: style?.italic ? 'italic' : 'normal',
        textAlign: style?.align ?? 'center',
        lineHeight: 1.25,
        color,
        background: 'rgba(255,255,255,0.08)',
        outline: '2px solid #3b82f6',
        resize: 'none',
        padding: 0,
        border: 'none',
        overflow: 'hidden',
      }}
    />
  )
}

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`h-8 min-w-8 rounded px-2 ${
        pressed ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-100'
      } disabled:opacity-40`}
    >
      {/* An icon or symbol: the button is named by its label. */}
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

function SmallButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

function MenuButton({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
        className={`h-8 rounded px-2 ${open ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        {label} ▾
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute top-full left-0 z-30 mt-1 w-52 rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  checked,
  onClick,
  children,
}: {
  checked?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left hover:bg-slate-100 ${checked ? 'font-semibold text-blue-800' : ''}`}
    >
      {children}
    </button>
  )
}

const Divider = () => <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
