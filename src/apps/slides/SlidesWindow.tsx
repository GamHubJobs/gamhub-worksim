/**
 * An open presentation inside the shared document window. The editor is Deck
 * Craft, the office's presentation app, wherever it can run (see
 * src/apps/craft/crafts.ts); otherwise, or if it fails to start, the basic
 * Slides editor, so the work can always be done. Version previews are shown
 * read-only in the basic editor's view.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SlidesContentSchema, type ChartSpec } from '../../persistence/schemas'
import { craftAvailable, markFailed, type Installed } from '../craft/crafts'
import { DocumentFrame } from '../shared/DocumentFrame'
import { SheetsPicker, type PickerMode } from '../shared/SheetsPicker'
import { useSavedDocument } from '../shared/useSavedDocument'
import { DeckCraftEditor } from './deckcraft/DeckCraftEditor'
import { PresentMode } from './PresentMode'
import { SlidesEditor } from './SlidesEditor'

interface SlidesWindowProps {
  documentId: string
  onBack: () => void
  /** The career save, whose workbooks the chart picker offers. */
  ownerId: string
  /** A panel on the right, e.g. the task this presentation is for. */
  sidePanel?: ReactNode
  /** The player's name, for comments in Deck Craft. */
  author?: string
}

interface PickerInsert {
  chart: (chart: ChartSpec) => void
  table: (rows: string[][]) => void
}

export function SlidesWindow({
  documentId,
  onBack,
  ownerId,
  sidePanel,
  author = '',
}: SlidesWindowProps) {
  const slides = useSavedDocument(documentId, 'slides', SlidesContentSchema)
  const { state } = slides
  const [presenting, setPresenting] = useState<number | null>(null)
  const [picker, setPicker] = useState<{ mode: PickerMode; insert: PickerInsert } | null>(
    null,
  )

  // Deck Craft, when it can be used here ('checking' until known).
  const [craft, setCraft] = useState<Installed | null | 'checking'>('checking')
  const [craftProblem, setCraftProblem] = useState<string | null>(null)
  useEffect(() => {
    let current = true
    void craftAvailable('deckcraft').then((installed) => {
      if (current) setCraft(installed)
    })
    return () => {
      current = false
    }
  }, [])
  const craftSave = useRef<(() => Promise<boolean>) | null>(null)
  const registerCraftSave = useCallback((save: (() => Promise<boolean>) | null) => {
    craftSave.current = save
  }, [])
  const [craftPending, setCraftPending] = useState(false)
  const onCraftFailed = useCallback((reason: string) => {
    console.warn(reason)
    markFailed('deckcraft')
    craftSave.current = null
    setCraftProblem(reason)
    setCraft(null)
  }, [])
  const usingCraft = craft !== null && craft !== 'checking'
  const { flush: flushSaved, saveStatus } = slides
  // Saving everything: Deck Craft's latest work first, then the file; and a
  // change Deck Craft holds is shown as not saved yet.
  const controls = useMemo(
    () => ({
      ...slides,
      flush: async () => {
        if (craftSave.current && !(await craftSave.current())) return false
        return flushSaved()
      },
      saveStatus:
        usingCraft && craftPending
          ? { ...saveStatus, state: 'pending' as const }
          : saveStatus,
    }),
    [slides, flushSaved, saveStatus, usingCraft, craftPending],
  )

  return (
    <>
      <DocumentFrame
        documentId={documentId}
        title={state.status === 'ready' ? state.document.title : null}
        controls={controls}
        loadError={state.status === 'error' ? state.message : null}
        loadingText="Opening your presentation…"
        onBack={onBack}
        sidePanel={sidePanel}
      >
        {(preview) =>
          state.status === 'ready' && craft === 'checking' ? (
            <p className="p-4 text-slate-500">Opening your presentation…</p>
          ) : state.status === 'ready' && usingCraft ? (
            <>
              {preview?.kind === 'slides' && (
                <SlidesEditor
                  key={`preview-${preview.id}-${preview.rev}`}
                  content={preview.content}
                  readOnly
                />
              )}
              <DeckCraftEditor
                installed={craft}
                title={state.document.title}
                author={author}
                content={state.content}
                contentEpoch={slides.contentEpoch}
                onReplace={slides.replace}
                onFailed={onCraftFailed}
                registerSave={registerCraftSave}
                onPending={setCraftPending}
                onPickFromSheets={(mode, insert) => setPicker({ mode, insert })}
                hidden={preview !== null}
              />
            </>
          ) : preview?.kind === 'slides' ? (
            <SlidesEditor
              key={`preview-${preview.id}-${preview.rev}`}
              content={preview.content}
              readOnly
            />
          ) : state.status === 'ready' ? (
            <>
              {craftProblem && (
                <p
                  role="status"
                  className="mx-3 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900"
                >
                  {craftProblem}
                </p>
              )}
              <SlidesEditor
                key={`live-${slides.contentEpoch}`}
                content={state.content}
                onUpdate={slides.update}
                onUndo={slides.undo}
                onRedo={slides.redo}
                canUndo={slides.canUndo}
                canRedo={slides.canRedo}
                onPickChart={(insert) =>
                  setPicker({ mode: 'chart', insert: { chart: insert, table: () => {} } })
                }
                onPresent={setPresenting}
              />
            </>
          ) : null
        }
      </DocumentFrame>
      {picker && (
        <SheetsPicker
          ownerId={ownerId}
          mode={picker.mode}
          chartsOnly={!usingCraft}
          onChart={(chart) => {
            picker.insert.chart(chart)
            setPicker(null)
          }}
          onTable={(rows) => {
            picker.insert.table(rows)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {presenting !== null && state.status === 'ready' && !usingCraft && (
        <PresentMode
          content={state.content}
          startAt={presenting}
          onExit={() => setPresenting(null)}
        />
      )}
    </>
  )
}
