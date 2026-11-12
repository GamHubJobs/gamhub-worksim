/**
 * A document open in an office app (Grid Craft, Word Craft…): what every app
 * window does the same way. Each app says how through its `CraftAdapter`.
 *
 * - Opening: the kept file when it still matches WorkSim's content, or the
 *   content built in a new document (a task's starting file, or one edited in
 *   the basic editor). Opened again when the content is replaced from outside
 *   (a restored version).
 * - Saving: a moment after the app reports a change (and at least every few
 *   seconds while the player keeps working), before submitting and closing
 *   (`save`, registered with the window), and when the tab is hidden. Each save
 *   keeps the app's file and WorkSim's content read from it.
 * - While a change is not kept yet, the window shows it as not saved, and
 *   closing the tab asks first.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CraftApi } from './CraftFrame'

/** How long after a change the work is saved (longer edits are saved at least this often). */
const SAVE_AFTER_MS = 1500
const SAVE_AT_LEAST_EVERY_MS = 8000
/** How long a save (or a file asked for) may take before it is reported as failed. */
const SAVE_TIMEOUT_MS = 30_000

export interface CraftFileRequest {
  /** Resolves with the bytes of the next file the app hands over with this extension. */
  next: (extension: string) => Promise<Uint8Array>
}

export interface CraftAdapter<C> {
  /** The app's name, for messages. */
  title: string
  /** The kept file to open as it is, or null when it must be built from the content. */
  keptFile: (content: C) => { name: string; base64: string } | null
  /** Opens a file (its name and bytes) in the app, in place of what is open. */
  openFile: (api: CraftApi, name: string, base64: string) => Promise<unknown>
  /** Builds the content in the app (a new document). An error message falls back to the basic editor. */
  build: (api: CraftApi, content: C) => Promise<string | null>
  /** Asks the app to save the document; it hands the file over as a save message. */
  requestSave: (api: CraftApi) => Promise<unknown>
  /** Whether the app has unsaved changes (asked once a second, in case a change report is missed). */
  isDirty: (api: CraftApi) => Promise<boolean>
  /** Whether a file the app handed over is the document itself (not an export). */
  isDocument: (name: string) => boolean
  /** The document's new content, read from its saved file (and the app). */
  read: (
    api: CraftApi,
    bytes: Uint8Array,
    previous: C,
    files: CraftFileRequest,
  ) => Promise<C>
}

export type CraftPhase = 'starting' | 'opening' | 'ready'

export interface CraftSessionOptions<C> {
  adapter: CraftAdapter<C>
  content: C
  /** Goes up when the content is replaced from outside (opened, restored). */
  contentEpoch: number
  onReplace: (next: C) => void
  onFailed: (reason: string) => void
  registerSave: (save: (() => Promise<boolean>) | null) => void
  onPending?: (pending: boolean) => void
  /** A file the app handed over that is not the document (an export): the player's copy. */
  onExport: (name: string, bytes: Uint8Array) => void
}

export function useCraftSession<C>({
  adapter,
  content,
  contentEpoch,
  onReplace,
  onFailed,
  registerSave,
  onPending,
  onExport,
}: CraftSessionOptions<C>) {
  const [api, setApi] = useState<CraftApi | null>(null)
  const [phase, setPhase] = useState<CraftPhase>('starting')
  const contentRef = useRef(content)
  useEffect(() => {
    contentRef.current = content
  })
  const opening = useRef(false)
  const openedEpoch = useRef<number | null>(null)
  const waiting = useRef<Array<(saved: boolean) => void>>([])
  const timers = useRef<{ save?: number; firstChange?: number }>({})
  const asked = useRef<
    Array<{ extension: string; resolve: (bytes: Uint8Array) => void }>
  >([])

  const files = useMemo<CraftFileRequest>(
    () => ({
      next: (extension) =>
        new Promise<Uint8Array>((resolve, reject) => {
          asked.current.push({ extension: extension.toLowerCase(), resolve })
          window.setTimeout(
            () =>
              reject(new Error(`${adapter.title} did not hand over the .${extension}`)),
            SAVE_TIMEOUT_MS,
          )
        }),
    }),
    [adapter],
  )

  /** The app saved the document: keep its file and the content read from it. */
  const kept = useCallback(
    async (bytes: Uint8Array) => {
      if (!api) return
      try {
        const next = await adapter.read(api, bytes, contentRef.current, files)
        contentRef.current = next
        onReplace(next)
        for (const resolve of waiting.current.splice(0)) resolve(true)
      } catch (error) {
        console.error(`${adapter.title}: the document could not be read back.`, error)
        for (const resolve of waiting.current.splice(0)) resolve(false)
      }
    },
    [api, adapter, onReplace, files],
  )

  /** Asks the app to save now; true once the work is kept. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!api || opening.current) return true
    window.clearTimeout(timers.current.save)
    timers.current.firstChange = undefined
    const saved = new Promise<boolean>((resolve) => {
      // Not saved until the file is kept (or the save failed).
      waiting.current.push((ok) => {
        if (timers.current.firstChange === undefined) onPending?.(!ok)
      })
      waiting.current.push(resolve)
      window.setTimeout(() => resolve(false), SAVE_TIMEOUT_MS)
    })
    try {
      await adapter.requestSave(api)
    } catch (error) {
      console.error(`${adapter.title}: could not save.`, error)
      return false
    }
    return saved
  }, [api, adapter, onPending])

  useEffect(() => {
    registerSave(phase === 'ready' ? save : null)
    return () => registerSave(null)
  }, [registerSave, save, phase])

  /** Opens the document in the app (again, after a restore). */
  const open = useCallback(
    async (target: CraftApi, document: C) => {
      opening.current = true
      setPhase('opening')
      try {
        const file = adapter.keptFile(document)
        if (file) {
          await adapter.openFile(target, file.name, file.base64)
        } else {
          const problem = await adapter.build(target, document)
          if (problem) {
            onFailed(problem)
            return
          }
        }
        opening.current = false
        setPhase('ready')
        // Keep the file from the start, so it opens as it is next time.
        if (!file) await save()
      } catch (error) {
        onFailed(`${adapter.title} could not open this file: ${String(error)}`)
      } finally {
        opening.current = false
      }
    },
    [adapter, onFailed, save],
  )

  useEffect(() => {
    if (!api || openedEpoch.current === contentEpoch) return
    openedEpoch.current = contentEpoch
    void open(api, contentRef.current)
  }, [api, contentEpoch, open])

  const onDirty = useCallback(
    (dirty: boolean) => {
      if (!dirty || opening.current) return
      onPending?.(true)
      const now = Date.now()
      timers.current.firstChange ??= now
      window.clearTimeout(timers.current.save)
      const wait =
        now - timers.current.firstChange > SAVE_AT_LEAST_EVERY_MS ? 0 : SAVE_AFTER_MS
      timers.current.save = window.setTimeout(() => void save(), wait)
    },
    [save, onPending],
  )
  useEffect(() => () => window.clearTimeout(timers.current.save), [])

  // The apps report a change when their unsaved flag turns on; a change made
  // while a save is under way can go unreported (seen with Word Craft). Ask
  // once a second as well, and save what is not saved yet.
  useEffect(() => {
    if (!api || phase !== 'ready') return
    const timer = window.setInterval(() => {
      if (opening.current || timers.current.firstChange !== undefined) return
      adapter
        .isDirty(api)
        .then((dirty) => {
          if (dirty && timers.current.firstChange === undefined) onDirty(true)
        })
        .catch(() => {})
    }, 1000)
    return () => window.clearInterval(timer)
  }, [api, phase, adapter, onDirty])

  // Leaving the page: save at once when it is hidden, and ask before closing
  // while a change is not yet kept (as the apps expect of their host).
  useEffect(() => {
    const hidden = () => {
      if (
        document.visibilityState === 'hidden' &&
        timers.current.firstChange !== undefined
      )
        void save()
    }
    const leaving = (event: BeforeUnloadEvent) => {
      if (timers.current.firstChange === undefined) return
      void save()
      event.preventDefault()
    }
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('beforeunload', leaving)
    return () => {
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('beforeunload', leaving)
    }
  }, [save])

  /** A file the app handed over: one asked for, the document, or an export. */
  const onSave = useCallback(
    (name: string, bytes: Uint8Array) => {
      const extension = name.split('.').pop()?.toLowerCase() ?? ''
      const wanted = asked.current.findIndex((a) => a.extension === extension)
      if (wanted >= 0) {
        asked.current.splice(wanted, 1)[0].resolve(bytes)
        return
      }
      if (adapter.isDocument(name)) void kept(bytes)
      else onExport(name, bytes)
    },
    [adapter, kept, onExport],
  )

  /** Opens a file of the player's in place of the document, then keeps it. */
  const importFile = useCallback(
    async (name: string, base64: string) => {
      if (!api) return
      await adapter.openFile(api, name, base64)
      await save()
    },
    [api, adapter, save],
  )

  return { api, phase, onReady: setApi, onSave, onDirty, save, importFile, files }
}
