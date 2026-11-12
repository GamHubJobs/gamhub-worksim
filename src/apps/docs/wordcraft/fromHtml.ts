/**
 * Word Craft's HTML as a WorkSim document, read by the basic Docs editor's
 * own parser (so it is exactly what that editor would make of it), then tidied
 * (convert.ts). Needs a browser (DOMParser).
 */
import { generateJSON } from '@tiptap/core'
import type { ChartSpec, DocContent, RichNode } from '../../../persistence/schemas'
import { docExtensions } from '../editor'
import { chartFromAlt, chartPlaceholder, finishDoc } from './convert'

export function htmlToDoc(html: string, previous: DocContent): DocContent {
  const page = new DOMParser().parseFromString(html, 'text/html')
  // Chart pictures become placeholders the parser keeps; other pictures stay in the .docx.
  const charts: ChartSpec[] = []
  for (const image of [...page.querySelectorAll('img')]) {
    const spec = chartFromAlt(image.getAttribute('alt'))
    if (!spec) continue
    const placeholder = page.createElement('p')
    placeholder.textContent = chartPlaceholder(charts.length)
    charts.push(spec)
    // A chart on a line of its own is that line. One in a line of text (a
    // paragraph, a heading, a list item's line) comes after that line, which
    // keeps its text: a chart is a block of its own in WorkSim's documents.
    const line = image.closest('p, h1, h2, h3, h4, h5, h6')
    if (
      line &&
      line.textContent?.trim() === '' &&
      line.querySelectorAll('img').length === 1
    )
      line.replaceWith(placeholder)
    else if (line) {
      image.remove()
      line.after(placeholder)
    } else image.replaceWith(placeholder)
  }
  const parsed = generateJSON(page.body.innerHTML, docExtensions()) as RichNode
  return finishDoc(parsed, charts, previous)
}
