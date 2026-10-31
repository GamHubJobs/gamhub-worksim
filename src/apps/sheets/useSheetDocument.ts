/**
 * Connects an open spreadsheet to the save system:
 * - every change is written to the emergency journal immediately,
 * - autosave writes it to the database about a second later,
 * - versions are taken every few minutes and when the page is closed,
 * - unsaved changes from a crashed session are recovered on load.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createAutosaver,
  type Autosaver,
  type AutosaveStatus,
} from '../../persistence/autosave'
import { getDocument, updateDocument } from '../../persistence/documentsRepo'
import {
  clearJournal,
  findRecoverableContent,
  readJournal,
  writeJournal,
} from '../../persistence/emergencyJournal'
import {
  SheetContentSchema,
  type SheetContent,
  type SheetDocument,
} from '../../persistence/schemas'
import {
  createVersion,
  listVersions,
  restoreVersion,
  setVersionKept,
} from '../../persistence/versions'
import { getCellInput, setCellInput } from './model'

const DEFAULT_VERSION_INTERVAL_MS = 5 * 60 * 1000
const MAX_UNDO_STEPS = 200

function contentEquals(a: SheetContent, b: SheetContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * How often automatic versions are taken. During development it can be
 * shortened for testing with `?versionIntervalSeconds=10` in the address bar.
 */
function getVersionIntervalMs(): number {
  if (import.meta.env.DEV) {
    const seconds = Number(
      new URLSearchParams(window.location.search).get('versionIntervalSeconds'),
    )
    if (seconds > 0) return seconds * 1000
  }
  return DEFAULT_VERSION_INTERVAL_MS
}

export type SheetDocumentState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; document: SheetDocument; content: SheetContent }

interface VersionTracker {
  /** When the latest version was taken. */
  lastVersionAt: number
  /** The content most recently saved to the database. */
  savedContent: SheetContent | null
  /** The content captured by the latest version. */
  versionedContent: SheetContent | null
}

const INITIAL_SAVE_STATUS: AutosaveStatus = {
  state: 'idle',
  lastSavedAt: null,
  error: null,
}

export function useSheetDocument(documentId: string | null) {
  const [state, setState] = useState<SheetDocumentState>({ status: 'loading' })
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>(INITIAL_SAVE_STATUS)
  const [recoveredUnsavedChanges, setRecoveredUnsavedChanges] = useState(false)
  const [versionsRevision, setVersionsRevision] = useState(0)

  const autosaverRef = useRef<Autosaver<SheetContent> | null>(null)
  const documentRef = useRef<SheetDocument | null>(null)
  const latestContentRef = useRef<SheetContent | null>(null)
  const trackerRef = useRef<VersionTracker>({
    lastVersionAt: 0,
    savedContent: null,
    versionedContent: null,
  })

  // Undo history lives in memory only: it is cleared when the workbook is closed.
  const historyRef = useRef<{ undo: SheetContent[]; redo: SheetContent[] }>({
    undo: [],
    redo: [],
  })
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false })

  const versionsChanged = useCallback(() => setVersionsRevision((n) => n + 1), [])

  useEffect(() => {
    if (!documentId) return
    let active = true
    const tracker = trackerRef.current
    const versionIntervalMs = getVersionIntervalMs()

    async function takeVersion(reason: 'auto' | 'close') {
      const document = documentRef.current
      const saved = tracker.savedContent
      if (!document || !saved || saved === tracker.versionedContent) return
      await createVersion(document, reason)
      tracker.versionedContent = saved
      tracker.lastVersionAt = Date.now()
      versionsChanged()
    }

    const autosaver = createAutosaver<SheetContent>({
      save: async (content) => {
        const saved = await updateDocument(documentId, { content })
        if (saved.kind !== 'sheet') throw new Error('Unexpected document type')
        documentRef.current = saved
        tracker.savedContent = content
        // The journal is only needed while changes are not yet in the database.
        if (latestContentRef.current === content) clearJournal(documentId)
        if (Date.now() - tracker.lastVersionAt >= versionIntervalMs) {
          await takeVersion('auto')
        }
      },
    })
    autosaverRef.current = autosaver
    const unsubscribe = autosaver.subscribe(() => setSaveStatus(autosaver.getStatus()))

    async function load(id: string) {
      try {
        const document = await getDocument(id)
        if (!document || document.kind !== 'sheet')
          throw new Error('The workbook could not be found.')
        const versions = await listVersions(id)
        const recovered = findRecoverableContent(
          document,
          readJournal(id),
          SheetContentSchema,
        )
        if (!active) return

        documentRef.current = document
        tracker.lastVersionAt = versions[0]?.createdAt ?? 0
        tracker.savedContent = document.content
        tracker.versionedContent = document.content
        const content = recovered ?? document.content
        latestContentRef.current = content
        setState({ status: 'ready', document, content })

        if (recovered) {
          setRecoveredUnsavedChanges(true)
          autosaver.schedule(recovered)
          void autosaver.flush()
        } else {
          clearJournal(id) // remove any stale entry
        }
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
    void load(documentId)

    // Save immediately when the player switches away or closes the page.
    const onVisibilityChange = () => {
      if (window.document.visibilityState === 'hidden') void autosaver.flush()
    }
    const onPageHide = () => {
      void autosaver.flush().then((saved) => (saved ? takeVersion('close') : undefined))
    }
    window.document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      active = false
      window.document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      unsubscribe()
      void autosaver
        .flush()
        .then((saved) => (saved ? takeVersion('close') : undefined))
        .finally(() => autosaver.dispose())
    }
  }, [documentId, versionsChanged])

  /** Shows new content and saves it: to the journal at once, to the database shortly after. */
  const applyContent = useCallback(
    (next: SheetContent) => {
      if (!documentId) return
      latestContentRef.current = next
      setState((previous) =>
        previous.status === 'ready' ? { ...previous, content: next } : previous,
      )
      writeJournal(documentId, next)
      autosaverRef.current?.schedule(next)
    },
    [documentId],
  )

  /**
   * Changes the content. `change` receives the latest content and returns the
   * new content (or the same object if nothing changed). Each change can be
   * undone.
   */
  const update = useCallback(
    (change: (content: SheetContent) => SheetContent) => {
      const current = latestContentRef.current
      if (!current) return
      const next = change(current)
      if (next === current || contentEquals(next, current)) return
      const history = historyRef.current
      history.undo.push(current)
      if (history.undo.length > MAX_UNDO_STEPS) history.undo.shift()
      history.redo = []
      setHistoryState({ canUndo: true, canRedo: false })
      applyContent(next)
    },
    [applyContent],
  )

  /** Changes one cell's value. */
  const setCell = useCallback(
    (sheetId: string, address: string, input: string) => {
      update((content) => {
        const sheet = content.sheets.find((s) => s.id === sheetId)
        if (!sheet || getCellInput(sheet, address) === input) return content
        return setCellInput(content, sheetId, address, input)
      })
    },
    [update],
  )

  const undo = useCallback(() => {
    const history = historyRef.current
    const current = latestContentRef.current
    const previous = history.undo.pop()
    if (!previous || !current) return
    history.redo.push(current)
    setHistoryState({ canUndo: history.undo.length > 0, canRedo: true })
    applyContent(previous)
  }, [applyContent])

  const redo = useCallback(() => {
    const history = historyRef.current
    const current = latestContentRef.current
    const next = history.redo.pop()
    if (!next || !current) return
    history.undo.push(current)
    setHistoryState({ canUndo: true, canRedo: history.redo.length > 0 })
    applyContent(next)
  }, [applyContent])

  /** Saves everything first; throws if that is not possible. */
  async function saveNow() {
    const saved = await autosaverRef.current?.flush()
    if (saved === false) {
      throw new Error(
        'Your latest changes could not be saved yet. Please try again in a moment.',
      )
    }
  }

  const restore = useCallback(
    async (versionId: string) => {
      if (!documentId) return
      await saveNow()
      const restored = await restoreVersion(documentId, versionId)
      if (restored.kind !== 'sheet') return
      const tracker = trackerRef.current
      documentRef.current = restored
      latestContentRef.current = restored.content
      tracker.savedContent = restored.content
      tracker.versionedContent = restored.content
      tracker.lastVersionAt = Date.now()
      clearJournal(documentId)
      // Undo does not reach back past a restore; the restore itself can be
      // undone from version history ("Before a restore").
      historyRef.current = { undo: [], redo: [] }
      setHistoryState({ canUndo: false, canRedo: false })
      setState({ status: 'ready', document: restored, content: restored.content })
      versionsChanged()
    },
    [documentId, versionsChanged],
  )

  /** Saves the current state as a version that is never removed automatically. */
  const keepCurrentVersion = useCallback(async () => {
    await saveNow()
    const document = documentRef.current
    if (!document) return
    await createVersion(document, 'manual', { keep: true })
    trackerRef.current.versionedContent = trackerRef.current.savedContent
    trackerRef.current.lastVersionAt = Date.now()
    versionsChanged()
  }, [versionsChanged])

  const setKept = useCallback(
    async (versionId: string, keep: boolean) => {
      await setVersionKept(versionId, keep)
      versionsChanged()
    },
    [versionsChanged],
  )

  /** Saves any pending changes now. Resolves to true if everything is saved. */
  const flush = useCallback(async () => (await autosaverRef.current?.flush()) ?? true, [])

  return {
    state,
    saveStatus,
    flush,
    recoveredUnsavedChanges,
    versionsRevision,
    setCell,
    update,
    undo,
    redo,
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    restore,
    keepCurrentVersion,
    setKept,
  }
}
