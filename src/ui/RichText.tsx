/**
 * Shows content text: paragraphs separated by blank lines, lines starting
 * with "•" as bullet lists, **bold** and `code`. Deliberately tiny, so content
 * writers cannot break the layout.
 */
import { Fragment, type ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const paragraphs = text.trim().split(/\n\s*\n/)
  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((paragraph, i) => {
        const lines = paragraph.split('\n')
        const bullets = lines.filter((line) => line.trim().startsWith('•'))
        const intro = lines.filter((line) => !line.trim().startsWith('•'))
        return (
          <div key={i}>
            {intro.length > 0 && (
              <p>
                {intro.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(line)}
                  </Fragment>
                ))}
              </p>
            )}
            {bullets.length > 0 && (
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {bullets.map((line, j) => (
                  <li key={j}>{inline(line.trim().replace(/^•\s*/, ''))}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
