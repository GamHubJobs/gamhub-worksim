/**
 * A desktop window in the style of Windows 10: a title bar to drag it by,
 * minimise / maximise / close buttons, and edges to resize it. The app inside
 * is the existing WorkSim app, unchanged.
 */
import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Icon, type IconName } from '../../ui/Icon'
import type { AppWindow } from './windowManager'

type Edge = 'right' | 'bottom' | 'corner'

export function AppWindowFrame({
  window: win,
  title,
  icon,
  active,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onClose,
  onMove,
  onResize,
  children,
}: {
  window: AppWindow
  title: string
  icon: IconName
  active: boolean
  onFocus: () => void
  onMinimize: () => void
  onToggleMaximize: () => void
  onClose: () => void
  onMove: (x: number, y: number) => void
  onResize: (w: number, h: number) => void
  children: ReactNode
}) {
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const size = useRef<{ x: number; y: number; w: number; h: number; edge: Edge } | null>(
    null,
  )

  // A window that comes to the front takes the keyboard focus, as on Windows,
  // so keyboard and screen-reader users continue in the app they opened.
  const root = useRef<HTMLElement>(null)
  const showing = active && !win.minimized
  useEffect(() => {
    const element = root.current
    if (showing && element && !element.contains(element.ownerDocument.activeElement))
      element.focus({ preventScroll: true })
  }, [showing])

  function startDrag(event: ReactPointerEvent) {
    if (win.maximized || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button')) return
    drag.current = { x: event.clientX, y: event.clientY, left: win.x, top: win.y }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function startResize(event: ReactPointerEvent, edge: Edge) {
    if (win.maximized || event.button !== 0) return
    event.stopPropagation()
    size.current = { x: event.clientX, y: event.clientY, w: win.w, h: win.h, edge }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  return (
    <section
      ref={root}
      tabIndex={-1}
      aria-label={`${title} window`}
      data-window
      data-testid={`window-${win.key}`}
      data-active={active}
      onPointerDownCapture={onFocus}
      className={`pointer-events-auto absolute flex outline-none flex-col overflow-hidden bg-white ${
        win.maximized
          ? 'inset-0'
          : `border shadow-[0_8px_28px_rgba(0,0,0,0.35)] ${
              active ? 'border-[#1f6fbf]' : 'border-slate-400'
            }`
      } ${win.minimized ? 'hidden' : ''}`}
      style={
        win.maximized
          ? { zIndex: win.z }
          : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }
      }
    >
      {/* Title bar */}
      <div
        className={`flex h-8 shrink-0 items-center bg-white select-none ${
          active ? 'text-slate-900' : 'text-slate-500'
        }`}
        onPointerDown={startDrag}
        onPointerMove={(event) => {
          const d = drag.current
          if (d) onMove(d.left + event.clientX - d.x, d.top + event.clientY - d.y)
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest('button')) onToggleMaximize()
        }}
        data-testid="window-title-bar"
      >
        <Icon name={icon} className="mx-2.5 h-4 w-4 shrink-0 text-[#1f6fbf]" />
        <span className="min-w-0 flex-1 truncate text-xs">{title}</span>
        <TitleButton label={`Minimise ${title}`} onClick={onMinimize}>
          <span aria-hidden className="block h-px w-2.5 bg-current" />
        </TitleButton>
        <TitleButton
          label={`${win.maximized ? 'Restore' : 'Maximise'} ${title}`}
          onClick={onToggleMaximize}
        >
          {win.maximized ? (
            <span aria-hidden className="relative block h-2.5 w-2.5">
              <span className="absolute top-0 right-0 h-2 w-2 border border-current" />
              <span className="absolute bottom-0 left-0 h-2 w-2 border border-current bg-white" />
            </span>
          ) : (
            <span aria-hidden className="block h-2.5 w-2.5 border border-current" />
          )}
        </TitleButton>
        <TitleButton label={`Close ${title}`} onClick={onClose} danger>
          <span aria-hidden className="text-sm leading-none">
            ✕
          </span>
        </TitleButton>
      </div>

      {/* The app */}
      <div className="min-h-0 flex-1 overflow-hidden border-t border-slate-200 bg-slate-50">
        {children}
      </div>

      {/* Resize edges */}
      {!win.maximized && (
        <>
          {(['right', 'bottom', 'corner'] as const).map((edge) => (
            <div
              key={edge}
              aria-hidden
              onPointerDown={(event) => startResize(event, edge)}
              onPointerMove={(event) => {
                const s = size.current
                if (!s) return
                onResize(
                  s.edge === 'bottom' ? s.w : s.w + event.clientX - s.x,
                  s.edge === 'right' ? s.h : s.h + event.clientY - s.y,
                )
              }}
              onPointerUp={() => {
                size.current = null
              }}
              className={
                edge === 'right'
                  ? 'absolute top-8 right-0 bottom-2 z-20 w-1.5 cursor-ew-resize'
                  : edge === 'bottom'
                    ? 'absolute right-2 bottom-0 left-0 z-20 h-1.5 cursor-ns-resize'
                    : 'absolute right-0 bottom-0 z-20 h-3 w-3 cursor-nwse-resize'
              }
            />
          ))}
        </>
      )}
    </section>
  )
}

function TitleButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label.split(' ')[0]}
      onClick={onClick}
      className={`flex h-8 w-11 shrink-0 items-center justify-center ${
        danger ? 'hover:bg-[#e81123] hover:text-white' : 'hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
