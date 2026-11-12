/**
 * Between Word Craft's documents and WorkSim's own document format (the
 * basic Docs editor's: headings, paragraphs, lists, tables, charts).
 *
 * - `docToHtml`: a WorkSim document as HTML, which Word Craft opens (a task's
 *   starting document, or one written in the basic editor). Charts become
 *   pictures whose alternative text carries the chart, so they can be found
 *   again.
 * - Word Craft's work comes back as HTML too (it writes headings, lists and
 *   tables as such), read by the basic editor's own parser (fromHtml.ts) and
 *   tidied here (`finishDoc`): charts found again, and the formatting every
 *   imported text carries (a font, its size, black) removed.
 *
 * The graders read the text, the headings, the tables and the charts, and
 * count the words: all of that comes through. Everything else Word Craft can
 * do (styles, fonts, pictures, footnotes, track changes…) is kept in the
 * .docx file.
 */
import { fingerprintText } from '../../../lib/fingerprint'
import type { ChartSpec, DocContent, RichNode } from '../../../persistence/schemas'
import { FONT_SIZES } from '../editor'

// ---------------------------------------------------------------------------
// Charts as pictures
// ---------------------------------------------------------------------------

/** The end of a chart picture's alternative text: "… (WorkSim chart <data>)". */
const CHART_MARK = /\(WorkSim chart ([A-Za-z0-9_-]+)\)\s*$/

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (data: string) => {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** The alternative text of a chart picture: readable, and the chart's data at the end. */
export function chartAlt(spec: ChartSpec): string {
  const what = spec.title ? `${spec.type} chart: ${spec.title}` : `${spec.type} chart`
  return `${what[0].toUpperCase()}${what.slice(1)} (WorkSim chart ${toBase64Url(JSON.stringify(spec))})`
}

/** The chart a picture's alternative text carries, if any. */
export function chartFromAlt(alt: string | null | undefined): ChartSpec | null {
  const match = alt ? CHART_MARK.exec(alt) : null
  if (!match) return null
  try {
    const spec = JSON.parse(fromBase64Url(match[1])) as ChartSpec
    return spec && typeof spec.type === 'string' && Array.isArray(spec.series)
      ? spec
      : null
  } catch {
    return null
  }
}

/** Every chart in a document, in order. */
export function chartsIn(node: RichNode): ChartSpec[] {
  const own =
    node.type === 'chart' && node.attrs?.spec ? [node.attrs.spec as ChartSpec] : []
  return [...own, ...(node.content ?? []).flatMap(chartsIn)]
}

// ---------------------------------------------------------------------------
// WorkSim → HTML (for Word Craft to open)
// ---------------------------------------------------------------------------

const escapeText = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttr = (text: string) => escapeText(text).replace(/"/g, '&quot;')

const CSS_SAFE = /^[#\w\s.,()%-]+$/

function markText(node: RichNode): string {
  let html = escapeText(node.text ?? '')
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        html = `<strong>${html}</strong>`
        break
      case 'italic':
        html = `<em>${html}</em>`
        break
      case 'underline':
        html = `<u>${html}</u>`
        break
      case 'strike':
        html = `<s>${html}</s>`
        break
      case 'code':
        html = `<code>${html}</code>`
        break
      case 'textStyle': {
        const styles: string[] = []
        const color = mark.attrs?.color
        const size = mark.attrs?.fontSize
        if (typeof color === 'string' && CSS_SAFE.test(color))
          styles.push(`color:${color}`)
        if (typeof size === 'string' && CSS_SAFE.test(size))
          styles.push(`font-size:${size}`)
        if (styles.length) html = `<span style="${styles.join(';')}">${html}</span>`
        break
      }
    }
  }
  return html
}

function blockStyle(node: RichNode): string {
  const align = node.attrs?.textAlign
  return typeof align === 'string' && align !== 'left' && /^\w+$/.test(align)
    ? ` style="text-align:${align}"`
    : ''
}

function nodeHtml(node: RichNode, charts: string[], chartIndex: { n: number }): string {
  const inner = () =>
    (node.content ?? []).map((c) => nodeHtml(c, charts, chartIndex)).join('')
  switch (node.type) {
    case 'doc':
      return inner()
    case 'text':
      return markText(node)
    case 'hardBreak':
      return '<br>'
    case 'paragraph':
      return `<p${blockStyle(node)}>${inner()}</p>`
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)))
      return `<h${level}${blockStyle(node)}>${inner()}</h${level}>`
    }
    case 'bulletList':
      return `<ul>${inner()}</ul>`
    case 'orderedList':
      return `<ol>${inner()}</ol>`
    case 'listItem':
      return `<li>${inner()}</li>`
    case 'blockquote':
      return `<blockquote>${inner()}</blockquote>`
    case 'codeBlock':
      return `<pre>${escapeText((node.content ?? []).map((c) => c.text ?? '').join(''))}</pre>`
    case 'horizontalRule':
      return '<hr>'
    case 'pageBreak':
      return '<p style="page-break-before:always"></p>'
    case 'table':
      return `<table>${inner()}</table>`
    case 'tableRow':
      return `<tr>${inner()}</tr>`
    case 'tableHeader':
    case 'tableCell': {
      const tag = node.type === 'tableHeader' ? 'th' : 'td'
      const span = (name: string) => {
        const value = Number(node.attrs?.[name] ?? 1)
        return value > 1 ? ` ${name}="${value}"` : ''
      }
      return `<${tag}${span('colspan')}${span('rowspan')}>${inner()}</${tag}>`
    }
    case 'chart': {
      const spec = node.attrs?.spec as ChartSpec | undefined
      const image = charts[chartIndex.n++]
      if (!spec || !image) return ''
      return `<p><img src="${image}" alt="${escapeAttr(chartAlt(spec))}" width="480" height="270"></p>`
    }
    default:
      return inner()
  }
}

/**
 * A WorkSim document as an HTML file for Word Craft. `charts` are the
 * pictures of the document's charts (PNG data URLs), in order (`chartsIn`).
 */
export function docToHtml(content: DocContent, charts: string[]): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en"><head><meta charset="utf-8">',
    '<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}</style>',
    '</head><body>',
    nodeHtml(content.body, charts, { n: 0 }),
    '</body></html>',
  ].join('')
}

// ---------------------------------------------------------------------------
// HTML (from Word Craft) → WorkSim: tidying what the parser made
// ---------------------------------------------------------------------------

/** A paragraph standing for chart number `n` while the HTML is parsed. */
export const chartPlaceholder = (n: number) => `⟦worksim-chart-${n}⟧`
const PLACEHOLDER = /^⟦worksim-chart-(\d+)⟧$/

const BLACK = /^(#000000|#000|rgb\(0,\s*0,\s*0\)|black)$/i

/** A Word Craft font size ("12pt") as one of the basic editor's sizes, if it is one. */
function fontSize(size: unknown): string | null {
  if (typeof size !== 'string') return null
  const px = size.endsWith('pt')
    ? Math.round(parseFloat(size) * (4 / 3))
    : parseFloat(size)
  const value = `${px}px`
  // 16px is ordinary text, so it is left out (as the basic editor does).
  return FONT_SIZES.includes(value) && value !== '16px' ? value : null
}

function tidyMarks(node: RichNode, inHeading: boolean): RichNode['marks'] {
  const marks = (node.marks ?? []).flatMap((mark) => {
    if (mark.type === 'bold' && inHeading) return []
    if (mark.type !== 'textStyle') return [mark]
    const attrs: Record<string, unknown> = {}
    const color = mark.attrs?.color
    if (typeof color === 'string' && color && !BLACK.test(color)) attrs.color = color
    const size = inHeading ? null : fontSize(mark.attrs?.fontSize)
    if (size) attrs.fontSize = size
    return Object.keys(attrs).length ? [{ type: 'textStyle', attrs }] : []
  })
  return marks.length ? marks : undefined
}

const sameMarks = (a: RichNode, b: RichNode) =>
  JSON.stringify(a.marks ?? []) === JSON.stringify(b.marks ?? [])

/** Text nodes with the same formatting, next to each other, as one. */
function mergeText(content: RichNode[]): RichNode[] {
  const merged: RichNode[] = []
  for (const node of content) {
    const last = merged.at(-1)
    if (last?.type === 'text' && node.type === 'text' && sameMarks(last, node))
      merged[merged.length - 1] = { ...last, text: (last.text ?? '') + (node.text ?? '') }
    else merged.push(node)
  }
  return merged
}

function tidy(node: RichNode, charts: ChartSpec[], inHeading = false): RichNode {
  // A paragraph that is only a chart's placeholder is that chart.
  if (node.type === 'paragraph' && node.content?.length === 1) {
    const match = PLACEHOLDER.exec(node.content[0].text ?? '')
    if (match && charts[Number(match[1])])
      return { type: 'chart', attrs: { spec: charts[Number(match[1])] } }
  }
  if (node.type === 'text') {
    const marks = tidyMarks(node, inHeading)
    const { marks: _, ...rest } = node
    return marks ? { ...rest, marks } : rest
  }
  const heading = inHeading || node.type === 'heading'
  const attrs = node.attrs ? { ...node.attrs } : undefined
  if (attrs && attrs.textAlign === 'left') attrs.textAlign = null
  const result: RichNode = { ...node }
  if (attrs) result.attrs = attrs
  if (node.content)
    result.content = mergeText(node.content.map((child) => tidy(child, charts, heading)))
  return result
}

/**
 * The parsed document (`generateJSON` of Word Craft's HTML, with each chart
 * picture replaced by `chartPlaceholder(n)`) as WorkSim keeps it: the charts
 * back, and the formatting every imported text carries removed.
 */
export function finishDoc(
  parsed: RichNode,
  charts: ChartSpec[],
  previous: DocContent,
): DocContent {
  const body = tidy(parsed, charts)
  return {
    body: body.content?.length ? body : { type: 'doc', content: [{ type: 'paragraph' }] },
    page: previous.page,
  }
}

/**
 * A short fingerprint of a document's text and structure, to know whether the
 * kept .docx file still matches it (it does not after an edit in the basic
 * editor, or a version restored from before Word Craft).
 */
export function docFingerprint(content: DocContent): string {
  return fingerprintText(JSON.stringify([content.body, content.page]))
}
