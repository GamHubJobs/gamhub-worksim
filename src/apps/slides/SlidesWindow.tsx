/** An open presentation: the Slides editor inside the shared document window. */
import { useState, type ReactNode } from 'react'
import { SlidesContentSchema, type ChartSpec } from '../../persistence/schemas'
import { DocumentFrame } from '../shared/DocumentFrame'
import { SheetsPicker } from '../shared/SheetsPicker'
import { useSavedDocument } from '../shared/useSavedDocument'
import { PresentMode } from './PresentMode'
import { SlidesEditor } from './SlidesEditor'

interface SlidesWindowProps {
  documentId: string
  onBack: () => void
  /** A panel on the right, e.g. the task this presentation is for. */
  sidePanel?: ReactNode
}

export function SlidesWindow({ documentId, onBack, sidePanel }: SlidesWindowProps) {
  const slides = useSavedDocument(documentId, 'slides', SlidesContentSchema)
  const { state } = slides
  const [presenting, setPresenting] = useState<number | null>(null)
  const [picker, setPicker] = useState<((chart: ChartSpec) => void) | null>(null)

  return (
    <>
      <DocumentFrame
        documentId={documentId}
        title={state.status === 'ready' ? state.document.title : null}
        controls={slides}
        loadError={state.status === 'error' ? state.message : null}
        loadingText="Opening your presentation…"
        onBack={onBack}
        sidePanel={sidePanel}
      >
        {(preview) =>
          preview?.kind === 'slides' ? (
            <SlidesEditor
              key={`preview-${preview.id}-${preview.rev}`}
              content={preview.content}
              readOnly
            />
          ) : state.status === 'ready' ? (
            <SlidesEditor
              key={`live-${slides.contentEpoch}`}
              content={state.content}
              onUpdate={slides.update}
              onUndo={slides.undo}
              onRedo={slides.redo}
              canUndo={slides.canUndo}
              canRedo={slides.canRedo}
              onPickChart={(insert) => setPicker(() => insert)}
              onPresent={setPresenting}
            />
          ) : null
        }
      </DocumentFrame>
      {picker && (
        <SheetsPicker
          mode="chart"
          chartsOnly
          onChart={(chart) => {
            picker(chart)
            setPicker(null)
          }}
          onTable={() => setPicker(null)}
          onClose={() => setPicker(null)}
        />
      )}
      {presenting !== null && state.status === 'ready' && (
        <PresentMode
          content={state.content}
          startAt={presenting}
          onExit={() => setPresenting(null)}
        />
      )}
    </>
  )
}
