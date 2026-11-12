/**
 * The shared host for the office apps: runs one in a frame of the window and
 * speaks its host messages (`<app>:ready`, `:save`, `:dirty`, `:failed`) and
 * its page command API (`window.<app>` inside the frame). The app hands every
 * file it saves to the host, which keeps it in the player's save: nothing is
 * downloaded unless the player asks for it.
 */
import { useEffect, useRef } from 'react'
import { craftBase, CRAFTS, type CraftId } from './crafts'

/** How long an app may take to start before the basic editor is used instead. */
const START_TIMEOUT_MS = 60_000

/** The app's command API, as the page sees it. */
export interface CraftApi {
  /** Runs one of the app's commands (`cell.set`, `file.saveBytes`, …). */
  execute: (command: string, params?: object) => Promise<unknown>
  /** A control-channel method (`sheet.read`, `cell.get`, …). */
  request: (method: string, params?: object) => Promise<unknown>
  /** The document's structure (sheets, used ranges, selection, …). */
  inspect: () => Promise<unknown>
  /**
   * Hands the app a file by the host message (`<app>:open`), as File › Open
   * would: the file keeps its name, so the app's own Save hands it back under it.
   */
  open: (name: string, bytes: Uint8Array) => void
  /**
   * Gives the app the keyboard, as the player clicking into it would (for a
   * slide show started from the bar above the app).
   */
  focus: () => void
}

interface PageApi {
  execute: (command: string, params?: object) => Promise<unknown>
  request: (method: string, params?: object) => Promise<unknown>
  docInspect: () => Promise<unknown>
}

export interface CraftFrameProps {
  app: CraftId
  /** The player's name, for comments and notes. */
  author: string
  onReady: (api: CraftApi) => void
  onSave: (name: string, bytes: Uint8Array, saveAs: boolean) => void
  onDirty: (dirty: boolean) => void
  onFailed: (reason: string) => void
}

/** A reply that says a command failed. */
function failure(reply: unknown): string | null {
  if (reply && typeof reply === 'object' && 'ok' in reply && reply.ok === false) {
    const error = (reply as { error?: unknown }).error
    return typeof error === 'string' ? error : 'the command failed'
  }
  return null
}

export function CraftFrame({
  app,
  author,
  onReady,
  onSave,
  onDirty,
  onFailed,
}: CraftFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null)
  const handlers = useRef({ onReady, onSave, onDirty, onFailed })
  /** Lets focus into the app (set by the focus guard below). */
  const letIn = useRef(() => {})
  useEffect(() => {
    handlers.current = { onReady, onSave, onDirty, onFailed }
  })

  useEffect(() => {
    let started = false
    let done = false
    const fail = (reason: string) => {
      if (done) return
      done = true
      handlers.current.onFailed(reason)
    }
    const timer = window.setTimeout(
      () => fail(`${CRAFTS[app].title} did not start in time.`),
      START_TIMEOUT_MS,
    )

    /** The page API appears just after `ready`; wait for it. */
    const connect = () => {
      const target = frame.current?.contentWindow as
        (Window & Record<string, PageApi | undefined>) | null | undefined
      const page = target?.[app]
      if (!page?.execute) {
        if (!done) window.setTimeout(connect, 50)
        return
      }
      window.clearTimeout(timer)
      if (done) return
      const checked = async (reply: Promise<unknown>) => {
        const value = await reply
        const error = failure(value)
        if (error) throw new Error(error)
        return value
      }
      handlers.current.onReady({
        execute: (command, params) => checked(page.execute(command, params ?? {})),
        request: (method, params) => checked(page.request(method, params ?? {})),
        inspect: () => checked(page.docInspect()),
        focus: () => letIn.current(),
        open: (name, bytes) => {
          const copy = bytes.slice().buffer
          target?.postMessage(
            { type: `${app}:open`, name, bytes: copy },
            window.location.origin,
            [copy],
          )
        },
      })
    }

    const listen = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      if (event.origin !== window.location.origin) return
      const data = event.data as {
        type?: unknown
        name?: unknown
        bytes?: unknown
        saveAs?: unknown
        dirty?: unknown
        error?: unknown
      }
      if (typeof data?.type !== 'string' || !data.type.startsWith(`${app}:`)) return
      const kind = data.type.slice(app.length + 1)
      if (kind === 'ready' && !started) {
        started = true
        connect()
      } else if (kind === 'save') {
        const bytes =
          data.bytes instanceof ArrayBuffer
            ? new Uint8Array(data.bytes)
            : data.bytes instanceof Uint8Array
              ? data.bytes
              : null
        if (bytes && typeof data.name === 'string')
          handlers.current.onSave(data.name, bytes, data.saveAs === true)
      } else if (kind === 'dirty') {
        handlers.current.onDirty(data.dirty === true)
      } else if (kind === 'failed') {
        window.clearTimeout(timer)
        fail(typeof data.error === 'string' ? data.error : 'it could not start')
      }
    }
    window.addEventListener('message', listen)
    return () => {
      done = true
      window.clearTimeout(timer)
      window.removeEventListener('message', listen)
    }
  }, [app])

  // The app takes keyboard focus back by itself while a cell is selected
  // (seen in Firefox). When the player has moved on (a dialog, another
  // window), that would send their keys, Escape included, to the sheet behind.
  // Focus goes into the app only when the player clicks or tabs into it.
  useEffect(() => {
    const iframe = frame.current
    if (!iframe) return
    let outside: HTMLElement | null = null
    let invited = false
    let tabbedAt = 0
    const onFocusIn = (event: FocusEvent) => {
      if (event.target === iframe) return
      outside = event.target instanceof HTMLElement ? event.target : null
      invited = false
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') tabbedAt = Date.now()
    }
    const onFrameFocus = () => {
      if (invited || Date.now() - tabbedAt < 1000) {
        invited = true
        return
      }
      if (outside?.isConnected) outside.focus({ preventScroll: true })
    }
    // Firefox moves focus into the frame without any event the page hears:
    // look a few times a second.
    const watch = window.setInterval(() => {
      if (document.activeElement === iframe && !invited) onFrameFocus()
    }, 250)
    const invite = () => {
      invited = true
    }
    letIn.current = () => {
      invited = true
      iframe.focus()
      iframe.contentWindow?.focus()
      // The app hears keys once its canvas has been given focus (focusing the
      // frame is not enough, seen in Deck Craft's slide show).
      const canvas = iframe.contentDocument?.querySelector('canvas')
      canvas?.blur()
      canvas?.focus()
    }
    // A key that reaches the app before focus is given back goes where the
    // player was (so Escape closes the dialog in front, not a cell edit).
    const onFrameKey = (event: KeyboardEvent) => {
      if (invited || Date.now() - tabbedAt < 1000 || !outside?.isConnected) return
      event.preventDefault()
      event.stopImmediatePropagation()
      outside.focus({ preventScroll: true })
      outside.dispatchEvent(
        new KeyboardEvent(event.type, {
          key: event.key,
          code: event.code,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          bubbles: true,
          cancelable: true,
        }),
      )
    }
    let target: Window | null = null
    const attach = () => {
      target?.removeEventListener('focus', onFrameFocus)
      target?.removeEventListener('pointerdown', invite, true)
      target?.removeEventListener('keydown', onFrameKey, true)
      target = iframe.contentWindow
      target?.addEventListener('focus', onFrameFocus)
      target?.addEventListener('pointerdown', invite, true)
      target?.addEventListener('keydown', onFrameKey, true)
    }
    attach()
    iframe.addEventListener('load', attach)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('keydown', onKeyDown, true)
    iframe.addEventListener('focus', onFrameFocus)
    return () => {
      window.clearInterval(watch)
      iframe.removeEventListener('focus', onFrameFocus)
      iframe.removeEventListener('load', attach)
      target?.removeEventListener('focus', onFrameFocus)
      target?.removeEventListener('pointerdown', invite, true)
      target?.removeEventListener('keydown', onFrameKey, true)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])

  const params = new URLSearchParams({ host: 'parent', chrome: 'none', author })
  return (
    <iframe
      ref={frame}
      src={`${craftBase(app)}index.html?${params}`}
      title={`${CRAFTS[app].title} ${CRAFTS[app].kind}`}
      data-testid={`craft-${app}`}
      className="h-full w-full border-0 bg-white"
      allow="clipboard-read; clipboard-write; fullscreen"
    />
  )
}
