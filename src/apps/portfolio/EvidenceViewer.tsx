/**
 * Shows a portfolio file exactly as it was handed in, in its own app's editor,
 * read-only. These are frozen copies: later changes to the working file never
 * reach them.
 */
import { lazy, Suspense } from 'react'
import type { AnyDocument } from '../../persistence/schemas'
import { getTool } from '../../tools/registry'
import { getWorkspace } from '../../tools/ui'
import { CodeEditor } from '../code/CodeEditor'
import { TicketsEditor } from '../helpdesk/TicketsEditor'
import { SheetEditor } from '../sheets/ui/SheetEditor'
import { SlidesEditor } from '../slides/SlidesEditor'

/** The document editor is large, so it loads only when a document is shown. */
const DocEditor = lazy(() =>
  import('../docs/DocEditor').then((m) => ({ default: m.DocEditor })),
)

export function EvidenceViewer({ document }: { document: AnyDocument }) {
  switch (document.kind) {
    case 'sheet':
      return <SheetEditor content={document.content} readOnly />
    case 'doc':
      return (
        <Suspense fallback={<p className="p-4 text-sm text-slate-500">Opening…</p>}>
          <DocEditor content={document.content} readOnly />
        </Suspense>
      )
    case 'slides':
      return <SlidesEditor content={document.content} readOnly />
    case 'code':
      return <CodeEditor content={document.content} readOnly />
    case 'tickets':
      return <TicketsEditor content={document.content} readOnly />
    case 'tool': {
      const Workspace = getWorkspace(document.content.tool)
      const tool = getTool(document.content.tool)
      if (!Workspace || !tool) {
        return <p className="p-6 text-sm text-red-700">This tool is not available.</p>
      }
      return (
        <Suspense
          fallback={<p className="p-6 text-sm text-slate-600">Opening {tool.name}…</p>}
        >
          {/* oxlint-disable-next-line react/static-components -- a fixed lazy component from the tools' table, not created here */}
          <Workspace state={document.content.state} readOnly lockedSections={{}} />
        </Suspense>
      )
    }
  }
}
