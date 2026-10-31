/** An open document: the Docs editor inside the shared document window. */
import { useState, type ReactNode } from 'react'
import { DocContentSchema } from '../../persistence/schemas'
import { SheetsPicker, type PickerMode } from '../shared/SheetsPicker'
import { Icon } from '../../ui/Icon'
import { DocumentFrame } from '../shared/DocumentFrame'
import { useSavedDocument } from '../shared/useSavedDocument'
import { DocEditor, type SheetsInsert } from './DocEditor'

interface DocWindowProps {
  documentId: string
  onBack: () => void
  /** A panel on the right, e.g. the task this document is for. */
  sidePanel?: ReactNode
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

export function DocWindow({ documentId, onBack, sidePanel }: DocWindowProps) {
  const doc = useSavedDocument(documentId, 'doc', DocContentSchema)
  const { state } = doc
  const [picker, setPicker] = useState<{ mode: PickerMode; insert: SheetsInsert } | null>(
    null,
  )

  return (
    <>
      <DocumentFrame
        documentId={documentId}
        title={state.status === 'ready' ? state.document.title : null}
        controls={doc}
        loadError={state.status === 'error' ? state.message : null}
        loadingText="Opening your document…"
        onBack={onBack}
        sidePanel={sidePanel}
        actions={
          <button
            type="button"
            onClick={print}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            title="Print, or save as PDF"
          >
            <Icon name="print" className="h-4 w-4" /> Print
          </button>
        }
      >
        {(preview) =>
          preview?.kind === 'doc' ? (
            <DocEditor
              key={`preview-${preview.id}-${preview.rev}`}
              content={preview.content}
              readOnly
            />
          ) : state.status === 'ready' ? (
            <DocEditor
              // Reload the editor when the content is replaced (e.g. a restore).
              key={`live-${doc.contentEpoch}`}
              content={state.content}
              onChange={doc.replace}
              onPickFromSheets={(mode, insert) => setPicker({ mode, insert })}
            />
          ) : null
        }
      </DocumentFrame>
      {picker && (
        <SheetsPicker
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
