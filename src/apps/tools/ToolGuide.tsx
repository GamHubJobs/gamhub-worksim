/** A tool's built-in guide: what it is for, how to do the common jobs, and a glossary. */
import type { AnyTool } from '../../tools/types'
import { Icon } from '../../ui/Icon'

export function ToolGuide({ tool, onClose }: { tool: AnyTool; onClose?: () => void }) {
  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white"
      aria-label={`${tool.name} guide`}
      data-testid="tool-guide"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon name="guide" className="h-4 w-4" />
          {tool.name} guide
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the guide"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm text-slate-700">
        <GuideContent tool={tool} />
      </div>
    </aside>
  )
}

export function GuideContent({ tool }: { tool: AnyTool }) {
  return (
    <>
      <p>{tool.guide.intro}</p>
      {tool.guide.topics.map((topic) => (
        <details key={topic.title} className="rounded-md border border-slate-200 p-3">
          <summary className="cursor-pointer font-medium text-slate-900">
            {topic.title}
          </summary>
          <p className="mt-2 leading-relaxed">{topic.body}</p>
        </details>
      ))}
      <div>
        <p className="font-semibold text-slate-900">Glossary</p>
        <dl className="mt-2 space-y-2">
          {tool.guide.glossary.map((entry) => (
            <div key={entry.term}>
              <dt className="font-medium text-slate-900">{entry.term}</dt>
              <dd className="text-slate-600">{entry.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  )
}
