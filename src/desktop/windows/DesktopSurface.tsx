/**
 * The desktop itself: the wallpaper, the shortcut icons down the sides, and
 * the menu that opens on a right-click. Icons open with a double-click (or
 * Enter) and can be dragged to another place on the grid.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../../ui/Icon'
import {
  CELL,
  ICON_SIZES,
  layoutIcons,
  type Cell,
  type DesktopSettings,
  type IconSize,
  type WallpaperId,
} from './desktopSettings'

export interface DesktopIcon {
  id: string
  label: string
  icon: IconName
  /** The tile colour behind the glyph. */
  color: string
  side: 'left' | 'right'
  onOpen: () => void
}

export interface NewItem {
  label: string
  icon: IconName
  onCreate: () => void
}

const TOP = 8
const LEFT = 4

export function DesktopSurface({
  icons,
  settings,
  onSettings,
  newItems,
  onDisplaySettings,
  onPersonalize,
  onArea,
  overlay,
  children,
}: {
  icons: DesktopIcon[]
  settings: DesktopSettings
  onSettings: (settings: DesktopSettings) => void
  newItems: NewItem[]
  onDisplaySettings: () => void
  onPersonalize: () => void
  /** Reports the desktop's size, the space windows can use. */
  onArea: (area: { w: number; h: number }) => void
  /** Shown above every window (notifications). */
  overlay?: ReactNode
  /** The open windows, drawn above the icons. */
  children: ReactNode
}) {
  const surface = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1200, h: 700 })
  const [selected, setSelected] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState<{
    id: string
    x: number
    y: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  // A "Refresh" briefly hides and redraws the icons, as the real thing does.
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const element = surface.current
    if (!element) return
    const measure = () => {
      const area = { w: element.clientWidth, h: element.clientHeight }
      setSize(area)
      onArea(area)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onArea])

  useEffect(() => {
    if (!refreshing) return
    const timer = setTimeout(() => setRefreshing(false), 150)
    return () => clearTimeout(timer)
  }, [refreshing])

  const cell = CELL[settings.iconSize]
  const grid = {
    columns: Math.max(2, Math.floor((size.w - LEFT) / cell.w)),
    rows: Math.max(1, Math.floor((size.h - TOP) / cell.h)),
  }
  const cells = layoutIcons(icons, settings.positions, grid)

  function cellAt(clientX: number, clientY: number): Cell | null {
    const box = surface.current?.getBoundingClientRect()
    if (!box) return null
    const column = Math.floor((clientX - box.left - LEFT) / cell.w)
    const row = Math.floor((clientY - box.top - TOP) / cell.h)
    if (column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) return null
    return { column, row }
  }

  function drop(id: string, clientX: number, clientY: number) {
    const target = cellAt(clientX, clientY)
    if (!target) return
    const taken = Object.entries(cells).some(
      ([other, c]) => other !== id && c.column === target.column && c.row === target.row,
    )
    if (taken) return
    // Pin every icon where it is now, so moving one does not reshuffle the rest.
    onSettings({ ...settings, positions: { ...cells, [id]: target } })
  }

  const setIconSize = (iconSize: IconSize) => onSettings({ ...settings, iconSize })

  return (
    <div
      ref={surface}
      className="relative min-h-0 flex-1 overflow-clip"
      data-testid="desktop-surface"
      onContextMenu={(event) => {
        // Windows have their own right-click behaviour; only the desktop gets this menu.
        const target = event.target as Element
        if (
          target.closest('[data-window]') ||
          !target.closest('[data-desktop-background]')
        )
          return
        event.preventDefault()
        const box = surface.current?.getBoundingClientRect()
        setMenu({
          x: event.clientX - (box?.left ?? 0),
          y: event.clientY - (box?.top ?? 0),
        })
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setSelected(null)
      }}
    >
      <Wallpaper id={settings.wallpaper} />

      <div
        role="listbox"
        aria-label="Desktop"
        data-desktop-background
        className="absolute inset-0"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setSelected(null)
        }}
      >
        {!refreshing &&
          icons.map((icon) => {
            const place = cells[icon.id]
            if (!place) return null
            const isDragged = dragging?.id === icon.id && dragging.moved
            const left = LEFT + place.column * cell.w
            const top = TOP + place.row * cell.h
            return (
              <div
                key={icon.id}
                role="option"
                aria-selected={selected === icon.id}
                tabIndex={0}
                title={`Open ${icon.label}`}
                data-testid={`desktop-icon-${icon.id}`}
                onFocus={() => setSelected(icon.id)}
                onDoubleClick={icon.onOpen}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') icon.onOpen()
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  setSelected(icon.id)
                  setDragging({
                    id: icon.id,
                    x: event.clientX,
                    y: event.clientY,
                    startX: event.clientX,
                    startY: event.clientY,
                    moved: false,
                  })
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  if (dragging?.id !== icon.id) return
                  const moved =
                    dragging.moved ||
                    Math.abs(event.clientX - dragging.startX) +
                      Math.abs(event.clientY - dragging.startY) >
                      6
                  setDragging({ ...dragging, x: event.clientX, y: event.clientY, moved })
                }}
                onPointerUp={(event) => {
                  if (dragging?.id === icon.id && dragging.moved)
                    drop(icon.id, event.clientX, event.clientY)
                  setDragging(null)
                }}
                onPointerCancel={() => setDragging(null)}
                style={{
                  left: isDragged ? left + dragging.x - dragging.startX : left,
                  top: isDragged ? top + dragging.y - dragging.startY : top,
                  width: cell.w - 4,
                }}
                className={`absolute flex cursor-default flex-col items-center gap-1 border px-1 pt-1.5 pb-1 outline-none select-none ${
                  selected === icon.id
                    ? 'border-white/40 bg-white/25'
                    : 'border-transparent hover:border-white/20 hover:bg-white/10'
                } ${isDragged ? 'z-10 opacity-80' : ''}`}
              >
                <span
                  className="flex items-center justify-center rounded-[3px] text-white shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                  style={{
                    width: cell.icon,
                    height: cell.icon,
                    background: icon.color,
                  }}
                >
                  <Icon
                    name={icon.icon}
                    className={
                      settings.iconSize === 'small'
                        ? 'h-4 w-4'
                        : settings.iconSize === 'large'
                          ? 'h-8 w-8'
                          : 'h-6 w-6'
                    }
                  />
                </span>
                <span
                  className={`line-clamp-2 text-center leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] ${
                    settings.iconSize === 'small' ? 'text-[11px]' : 'text-xs'
                  }`}
                >
                  {icon.label}
                </span>
              </div>
            )
          })}
      </div>

      {/* Windows stack among themselves, always under the menus. */}
      <div className="pointer-events-none absolute inset-0 isolate">{children}</div>
      {overlay}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          bounds={size}
          onClose={() => setMenu(null)}
          items={[
            {
              label: 'View',
              submenu: ICON_SIZES.map((iconSize) => ({
                label: `${iconSize[0].toUpperCase()}${iconSize.slice(1)} icons`,
                checked: settings.iconSize === iconSize,
                onSelect: () => setIconSize(iconSize),
              })),
            },
            {
              label: 'Sort by',
              submenu: [
                {
                  label: 'Name',
                  onSelect: () => {
                    const sorted = [...icons].sort((a, b) =>
                      a.label.localeCompare(b.label),
                    )
                    const positions: Record<string, Cell> = {}
                    sorted.forEach((icon, n) => {
                      positions[icon.id] = {
                        column: Math.floor(n / grid.rows),
                        row: n % grid.rows,
                      }
                    })
                    onSettings({ ...settings, positions })
                  },
                },
                {
                  label: 'Default arrangement',
                  onSelect: () => onSettings({ ...settings, positions: {} }),
                },
              ],
            },
            { label: 'Refresh', onSelect: () => setRefreshing(true) },
            'separator',
            {
              label: 'New',
              submenu: newItems.map((item) => ({
                label: item.label,
                icon: item.icon,
                onSelect: item.onCreate,
              })),
            },
            'separator',
            { label: 'Display settings', icon: 'desktop', onSelect: onDisplaySettings },
            { label: 'Personalize', icon: 'settings', onSelect: onPersonalize },
          ]}
        />
      )}
    </div>
  )
}

type MenuItem =
  | 'separator'
  | {
      label: string
      icon?: IconName
      checked?: boolean
      onSelect?: () => void
      submenu?: Array<{
        label: string
        icon?: IconName
        checked?: boolean
        onSelect: () => void
      }>
    }

/** The right-click menu, in the plain light style of Windows 10. */
function ContextMenu({
  x,
  y,
  bounds,
  items,
  onClose,
}: {
  x: number
  y: number
  bounds: { w: number; h: number }
  items: MenuItem[]
  onClose: () => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) onClose()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [onClose])

  const width = 220
  const left = Math.min(x, bounds.w - width - 4)
  const top = Math.min(y, bounds.h - 250)
  const flipSubmenu = left + width * 2 > bounds.w

  return (
    <div
      ref={root}
      role="menu"
      aria-label="Desktop menu"
      className="absolute z-900 border border-[#a0a0a0] bg-[#f2f2f2] py-1 text-xs text-slate-900 shadow-[2px_2px_6px_rgba(0,0,0,0.3)]"
      style={{ left, top: Math.max(0, top), width }}
    >
      {items.map((item, n) =>
        item === 'separator' ? (
          <div
            key={`separator-${n}`}
            role="separator"
            className="mx-2 my-1 h-px bg-[#c8c8c8]"
          />
        ) : (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => setOpen(item.submenu ? item.label : null)}
          >
            <button
              type="button"
              role="menuitem"
              aria-haspopup={item.submenu ? 'menu' : undefined}
              aria-expanded={item.submenu ? open === item.label : undefined}
              onClick={() => {
                if (item.submenu) {
                  setOpen(open === item.label ? null : item.label)
                  return
                }
                item.onSelect?.()
                onClose()
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' && item.submenu) setOpen(item.label)
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  const all = [
                    ...(root.current?.querySelectorAll<HTMLElement>(
                      ':scope > div > [role="menuitem"]',
                    ) ?? []),
                  ]
                  const at = all.indexOf(event.currentTarget)
                  const next =
                    all[
                      (at + (event.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length
                    ]
                  next?.focus()
                }
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left outline-none hover:bg-[#91c9f7]/50 focus:bg-[#91c9f7]/50"
            >
              <span className="w-4">
                {item.icon && <Icon name={item.icon} className="h-3.5 w-3.5" />}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.submenu && <span aria-hidden>›</span>}
            </button>
            {item.submenu && open === item.label && (
              <div
                role="menu"
                aria-label={item.label}
                className={`absolute top-0 border border-[#a0a0a0] bg-[#f2f2f2] py-1 shadow-[2px_2px_6px_rgba(0,0,0,0.3)] ${
                  flipSubmenu ? 'right-full' : 'left-full'
                }`}
                style={{ width: 200 }}
              >
                {item.submenu.length === 0 ? (
                  <p className="px-3 py-1.5 text-slate-500">Nothing to create yet</p>
                ) : (
                  item.submenu.map((sub) => (
                    <button
                      key={sub.label}
                      type="button"
                      role={sub.checked === undefined ? 'menuitem' : 'menuitemradio'}
                      aria-checked={sub.checked}
                      onClick={() => {
                        sub.onSelect()
                        onClose()
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left outline-none hover:bg-[#91c9f7]/50 focus:bg-[#91c9f7]/50"
                    >
                      <span className="w-4 text-center">
                        {sub.checked ? (
                          '•'
                        ) : sub.icon ? (
                          <Icon name={sub.icon} className="h-3.5 w-3.5" />
                        ) : null}
                      </span>
                      {sub.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ),
      )}
    </div>
  )
}

/**
 * Original wallpaper art in the spirit of a Windows 10 desktop: deep blue with
 * soft panes of light. Drawn as SVG, so it is sharp at any size and costs no
 * download.
 */
export function Wallpaper({ id }: { id: WallpaperId }) {
  // Several wallpapers can be on screen (Settings shows previews): unique gradient IDs.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const glow = `wp-glow-${uid}`
  const pane = `wp-pane-${uid}`
  if (id === 'plain')
    return (
      <div
        aria-hidden
        className="absolute inset-0 bg-[#0b4f9c]"
        data-desktop-background
      />
    )
  const harbour = id === 'harbour'
  return (
    <svg
      aria-hidden
      data-desktop-background
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={glow} cx={harbour ? '30%' : '62%'} cy="48%" r="60%">
          <stop offset="0" stopColor={harbour ? '#4aa3df' : '#5fb4ff'} />
          <stop offset="0.35" stopColor={harbour ? '#14639f' : '#1a6fd0'} />
          <stop offset="1" stopColor={harbour ? '#062a4d' : '#03204a'} />
        </radialGradient>
        <linearGradient id={pane} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfe3ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#4c9be8" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${glow})`} />
      {harbour ? (
        <g fill={`url(#${pane})`}>
          <path
            d="M0 640 C 300 560 560 610 820 590 S 1300 520 1600 560 L1600 900 L0 900 Z"
            opacity="0.35"
          />
          <path
            d="M0 720 C 380 660 700 700 1000 680 S 1400 650 1600 680 L1600 900 L0 900 Z"
            opacity="0.4"
          />
          <path d="M260 560 L 300 380 L 340 560 Z" opacity="0.5" />
          <path d="M360 580 L 390 440 L 420 580 Z" opacity="0.4" />
        </g>
      ) : (
        <g fill={`url(#${pane})`}>
          {/* Ribbons of light sweeping across, and one soft beam. */}
          <path
            d="M-100 690 C 300 520 760 560 1700 170 L1700 330 C 820 650 380 660 -100 820 Z"
            opacity="0.45"
          />
          <path
            d="M-100 790 C 420 640 920 650 1700 400 L1700 470 C 920 720 420 730 -100 870 Z"
            opacity="0.3"
          />
          <path
            d="M-100 600 C 360 470 820 470 1700 60 L1700 110 C 820 520 360 530 -100 640 Z"
            opacity="0.25"
          />
          <path d="M880 -60 L 1010 -60 L 1360 960 L 1190 960 Z" opacity="0.14" />
        </g>
      )}
    </svg>
  )
}
