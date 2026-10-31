/** How a chart looks inside a document. */
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { ChartSpecSchema } from '../../persistence/schemas'
import { ChartView } from '../../ui/ChartView'

export function ChartNodeView({ node, selected }: ReactNodeViewProps) {
  const parsed = ChartSpecSchema.safeParse(node.attrs.spec)
  return (
    <NodeViewWrapper
      className={`my-4 rounded-md border bg-white p-2 ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
      }`}
      data-drag-handle
    >
      {parsed.success ? (
        <ChartView chart={parsed.data} className="mx-auto block w-full max-w-xl" />
      ) : (
        <p className="p-4 text-center text-sm text-slate-500">This chart is damaged.</p>
      )}
    </NodeViewWrapper>
  )
}
