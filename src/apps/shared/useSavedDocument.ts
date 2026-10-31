/**
 * Connects an open document (a workbook, document or presentation) to the
 * save system:
 * - every change is written to the emergency journal immediately,
 * - autosave writes it to the database about a second later,
 * - versions are taken every few minutes and when the page is closed,
 * - unsaved changes from a crashed session are recovered on load.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { z } from 'zod'
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
import type { AnyDocument, DocumentKind } from '../../persistence/schemas'
import {
  createVersion,
  listVersions,
  restoreVersion,
  setVersionKept,
} from '../../persistence/versions'

const DEFAULT_VERSION_INTERVAL_MS = 5 * 60 * 1000
const MAX_UNDO_STEPS = 200

function contentEquals(a: unknown, b: unknown): boolean {
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

/** A saved document whose content has the type C. */
type WithContent<C> = AnyDocument & { content: C }

export type SavedDocumentState<C> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; document: WithContent<C>; content: C }

interface VersionTracker<C> {
  /** When the latest version was taken. */
  lastVersionAt: number
  /** The content most recently saved to the database. */
  savedContent: C | null
  /** The content captured by the latest version. */
  versionedContent: C | null
}

const INITIAL_SAVE_STATUS: AutosaveStatus = {
  state: 'idle',
  lastSavedAt: null,
  error: null,
}

const NAMES: Record<DocumentKind, string> = {
  sheet: 'workbook',
  doc: 'document',
  slides: 'presentation',
}

export function useSavedDocument<Content>(
  documentId: string | null,
  kind: DocumentKind,
  contentSchema: z.ZodType<Content>,
) {
  type Doc = WithContent<Content>

  const [state, setState] = useState<SavedDocumentState<Content>>({ status: 'loading' })
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>(INITIAL_SAVE_STATUS)
  const [recoveredUnsavedChanges, setRecoveredUnsavedChanges] = useState(false)
  const [versionsRevision, setVersionsRevision] = useState(0)
  /**
   * Goes up whenever the content is replaced from outside the editor (loaded
   * or restored), so editors that keep their own state know to reload it.
   */
  const [contentEpoch, setContentEpoch] = useState(0)

  const autosaverRef = useRef<Autosaver<Content> | null>(null)
  const documentRef = useRef<Doc | null>(null)
  const latestContentRef = useRef<Content | null>(null)
  const trackerRef = useRef<VersionTracker<Content>>({
    lastVersionAt: 0,
    savedContent: null,
    versionedContent: null,
  })

  // Undo history lives in memory only: it is cleared when the document is closed.
  const historyRef = useRef<{ undo: Content[]; redo: Content[] }>({
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
    const isKind = (document: AnyDocument | undefined): document is Doc =>
      document?.kind === kind

    async function takeVersion(reason: 'auto' | 'close') {
      const document = documentRef.current
      const saved = tracker.savedContent
      if (!document || !saved || saved === tracker.versionedContent) return
      await createVersion(document, reason)
      tracker.versionedContent = saved
      tracker.lastVersionAt = Date.now()
      versionsChanged()
    }

    const autosaver = createAutosaver<Content>({
      save: async (content) => {
        // The schema guarantees the content matches this kind of document.
        const saved = await updateDocument(documentId, {
          content: content as AnyDocument['content'],
        })
        if (!isKind(saved)) throw new Error('Unexpected document type')
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
        if (!isKind(document)) throw new Error(`The ${NAMES[kind]} could not be found.`)
        const versions = await listVersions(id)
        const recovered = findRecoverableContent<Doc>(
          document,
          readJournal(id),
          contentSchema as z.ZodType<Doc['content']>,
        ) as Content | null
        if (!active) return

        documentRef.current = document
        tracker.lastVersionAt = versions[0]?.createdAt ?? 0
        tracker.savedContent = document.content
        tracker.versionedContent = document.content
        const content: Content = recovered ?? document.content
        latestContentRef.current = content
        setState({ status: 'ready', document, content })
        setContentEpoch((n) => n + 1)

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
  }, [documentId, kind, contentSchema, versionsChanged])

  /** Shows new content and saves it: to the journal at once, to the database shortly after. */
  const applyContent = useCallback(
    (next: Content) => {
      if (!documentId) return
      // A change that would make the file invalid is refused, so that it can
      // never block saving everything that comes after it.
      const check = contentSchema.safeParse(next)
      if (!check.success) {
        console.error(
          'A change was refused because it would damage the file.',
          check.error,
        )
        return
      }
      latestContentRef.current = next
      setState((previous) =>
        previous.status === 'ready' ? { ...previous, content: next } : previous,
      )
      writeJournal(documentId, next)
      autosaverRef.current?.schedule(next)
    },
    [documentId, contentSchema],
  )

  /**
   * Changes the content. `change` receives the latest content and returns the
   * new content (or the same object if nothing changed). Each change can be
   * undone.
   */
  const update = useCallback(
    (change: (content: Content) => Content) => {
      const current = latestContentRef.current
      if (!current) return
      const next = change(current)
      if (next === current || contentEquals(next, current)) return
      if (!contentSchema.safeParse(next).success) {
        console.error('A change was refused because it would damage the file.')
        return
      }
      const history = historyRef.current
      history.undo.push(current)
      if (history.undo.length > MAX_UNDO_STEPS) history.undo.shift()
      history.redo = []
      setHistoryState({ canUndo: true, canRedo: false })
      applyContent(next)
    },
    [applyContent, contentSchema],
  )

  /**
   * Replaces the content without adding an undo step, for editors that keep
   * their own undo history (Docs).
   */
  const replace = useCallback(
    (next: Content) => {
      const current = latestContentRef.current
      if (!current || next === current || contentEquals(next, current)) return
      applyContent(next)
    },
    [applyContent],
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
      if (restored.kind !== kind) return
      const document = restored as Doc
      const tracker = trackerRef.current
      documentRef.current = document
      latestContentRef.current = document.content
      tracker.savedContent = document.content
      tracker.versionedContent = document.content
      tracker.lastVersionAt = Date.now()
      clearJournal(documentId)
      // Undo does not reach back past a restore; the restore itself can be
      // undone from version history ("Before a restore").
      historyRef.current = { undo: [], redo: [] }
      setHistoryState({ canUndo: false, canRedo: false })
      setState({ status: 'ready', document, content: document.content })
      setContentEpoch((n) => n + 1)
      versionsChanged()
    },
    [documentId, kind, versionsChanged],
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

  /** Renames the document (saved at once, separately from its content). */
  const rename = useCallback(
    async (title: string) => {
      const trimmed = title.trim().slice(0, 200)
      if (!documentId || !trimmed) return
      await updateDocument(documentId, { title: trimmed })
      if (documentRef.current)
        documentRef.current = { ...documentRef.current, title: trimmed }
      setState((previous) =>
        previous.status === 'ready'
          ? { ...previous, document: { ...previous.document, title: trimmed } }
          : previous,
      )
    },
    [documentId],
  )

  /** Saves any pending changes now. Resolves to true if everything is saved. */
  const flush = useCallback(async () => (await autosaverRef.current?.flush()) ?? true, [])

  return {
    state,
    saveStatus,
    flush,
    recoveredUnsavedChanges,
    versionsRevision,
    contentEpoch,
    update,
    replace,
    undo,
    redo,
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    restore,
    keepCurrentVersion,
    setKept,
    rename,
  }
}
