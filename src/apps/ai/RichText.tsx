/**
 * Shows an answer's simple formatting (paragraphs, lists, **bold**, `code`,
 * code blocks and formulas) as React elements. Never as HTML, so nothing in
 * an answer can run as code on the page.
 */
import { Fragment, type ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const token = match[0]
    parts.push(
      token.startsWith('**') ? (
        <strong key={match.index} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      ) : (
        <code
          key={match.index}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      ),
    )
    last = match.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbers'; items: string[] }
  | { kind: 'code'; text: string; language: string }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const body: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++])
      blocks.push({ kind: 'code', text: body.join('\n'), language: fence[1] })
      continue
    }
    if (!line.trim()) continue
    // A formula on its own line is shown like code.
    if (/^\s*=[A-Z(]/.test(line)) {
      blocks.push({ kind: 'code', text: line.trim(), language: 'formula' })
      continue
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const number = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const last = blocks.at(-1)
    if (bullet) {
      if (last?.kind === 'bullets') last.items.push(bullet[1])
      else blocks.push({ kind: 'bullets', items: [bullet[1]] })
    } else if (number) {
      if (last?.kind === 'numbers') last.items.push(number[1])
      else blocks.push({ kind: 'numbers', items: [number[1]] })
    } else if (last?.kind === 'paragraph' && lines[i - 1]?.trim()) last.lines.push(line)
    else blocks.push({ kind: 'paragraph', lines: [line] })
  }
  return blocks
}

export function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-800">
      {parseBlocks(text).map((block, n) => {
        switch (block.kind) {
          case 'paragraph':
            return (
              <p key={n}>
                {block.lines.map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {inline(line)}
                  </Fragment>
                ))}
              </p>
            )
          case 'bullets':
            return (
              <ul key={n} className="list-disc space-y-1 pl-5">
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item)}</li>
                ))}
              </ul>
            )
          case 'numbers':
            return (
              <ol key={n} className="list-decimal space-y-1 pl-5">
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item)}</li>
                ))}
              </ol>
            )
          case 'code':
            return (
              <pre
                key={n}
                className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800"
                aria-label={block.language === 'formula' ? 'Formula' : 'Code'}
              >
                {block.text}
              </pre>
            )
        }
      })}
    </div>
  )
}
