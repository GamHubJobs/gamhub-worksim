/**
 * An open document inside the shared document window. The editor is Word
 * Craft, the office's word processor, wherever it can run (see
 * src/apps/craft/crafts.ts); otherwise, or if it fails to start, the basic
 * Docs editor, so the work can always be done. Version previews are shown
 * read-only in the basic editor's view.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { craftAvailable, markFailed, type Installed } from '../craft/crafts'
import { WordCraftEditor } from './wordcraft/WordCraftEditor'
import { DocContentSchema } from '../../persistence/schemas'
import { SheetsPicker, type PickerMode } from '../shared/SheetsPicker'
import { Icon } from '../../ui/Icon'
import { DocumentFrame } from '../shared/DocumentFrame'
import { useSavedDocument } from '../shared/useSavedDocument'
import { DocEditor, type SheetsInsert } from './DocEditor'

interface DocWindowProps {
  documentId: string
  onBack: () => void
  /** The career save, whose workbooks the chart picker offers. */
  ownerId: string
  /** A panel on the right, e.g. the task this document is for. */
  sidePanel?: ReactNode
  /** The player's name, for comments and tracked changes in Word Craft. */
  author?: string
}

function print() {
  document.body.classList.add('printing-doc')
  const done = () => {
    document.body.classList.remove('printing-doc')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
}

export function DocWindow({
  documentId,
  onBack,
  ownerId,
  sidePanel,
  author = '',
}: DocWindowProps) {
  const doc = useSavedDocument(documentId, 'doc', DocContentSchema)
  const { state } = doc

  // Word Craft, when it can be used here ('checking' until known).
  const [craft, setCraft] = useState<Installed | null | 'checking'>('checking')
  const [craftProblem, setCraftProblem] = useState<string | null>(null)
  useEffect(() => {
    let current = true
    void craftAvailable('wordcraft').then((installed) => {
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
    markFailed('wordcraft')
    craftSave.current = null
    setCraftProblem(reason)
    setCraft(null)
  }, [])
  const usingCraft = craft !== null && craft !== 'checking'
  const { flush: flushSaved, saveStatus } = doc
  // Saving everything: Word Craft's latest work first, then the file; and a
  // change Word Craft holds is shown as not saved yet.
  const controls = useMemo(
    () => ({
      ...doc,
      flush: async () => {
        if (craftSave.current && !(await craftSave.current())) return false
        return flushSaved()
      },
      saveStatus:
        usingCraft && craftPending
          ? { ...saveStatus, state: 'pending' as const }
          : saveStatus,
    }),
    [doc, flushSaved, saveStatus, usingCraft, craftPending],
  )
  const [picker, setPicker] = useState<{ mode: PickerMode; insert: SheetsInsert } | null>(
    null,
  )

  return (
    <>
      <DocumentFrame
        documentId={documentId}
        title={state.status === 'ready' ? state.document.title : null}
        controls={controls}
        loadError={state.status === 'error' ? state.message : null}
        loadingText="Opening your document…"
        onBack={onBack}
        sidePanel={sidePanel}
        actions={
          // Word Craft prints with its own Export PDF.
          usingCraft ? null : (
            <button
              type="button"
              onClick={print}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              title="Print, or save as PDF"
            >
              <Icon name="print" className="h-4 w-4" /> Print
            </button>
          )
        }
      >
        {(preview) =>
          state.status === 'ready' && craft === 'checking' ? (
            <p className="p-4 text-slate-500">Opening your document…</p>
          ) : state.status === 'ready' && usingCraft ? (
            <>
              {preview?.kind === 'doc' && (
                <DocEditor
                  key={`preview-${preview.id}-${preview.rev}`}
                  content={preview.content}
                  readOnly
                />
              )}
              <WordCraftEditor
                installed={craft}
                title={state.document.title}
                author={author}
                content={state.content}
                contentEpoch={doc.contentEpoch}
                onReplace={doc.replace}
                onFailed={onCraftFailed}
                registerSave={registerCraftSave}
                onPending={setCraftPending}
                onPickFromSheets={(mode, insert) => setPicker({ mode, insert })}
                hidden={preview !== null}
              />
            </>
          ) : preview?.kind === 'doc' ? (
            <DocEditor
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
              <DocEditor
                // Reload the editor when the content is replaced (e.g. a restore).
                key={`live-${doc.contentEpoch}`}
                content={state.content}
                onChange={doc.replace}
                onPickFromSheets={(mode, insert) => setPicker({ mode, insert })}
              />
            </>
          ) : null
        }
      </DocumentFrame>
      {picker && (
        <SheetsPicker
          ownerId={ownerId}
          mode={picker.mode}
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
    </>
  )
}
