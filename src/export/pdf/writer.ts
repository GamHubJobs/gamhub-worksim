/**
 * A small layer over jsPDF that lays out blocks on A4 pages: headings,
 * wrapped text, lists, tables (with page breaks), charts drawn as vector
 * graphics, and code listings. All text is real PDF text: selectable and
 * searchable. Loaded only when the player exports something.
 */
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { ChartSpec } from '../../persistence/schemas'
import { MAX_REPORT_ROWS, type Block, type ExportTable } from '../blocks'

const PAGE = { width: 210, height: 297, margin: 18 } as const
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2
const BOTTOM = PAGE.height - PAGE.margin - 6

type Rgb = readonly [number, number, number]

const COLORS: Record<'text' | 'muted' | 'accent' | 'line', Rgb> = {
  text: [30, 41, 59],
  muted: [100, 116, 139],
  accent: [29, 78, 216],
  line: [203, 213, 225],
}

/** Series colours for charts (readable in colour and in greyscale). */
const SERIES = [
  [37, 99, 235],
  [234, 88, 12],
  [22, 163, 74],
  [147, 51, 234],
  [219, 39, 119],
  [100, 116, 139],
] as const

/**
 * The standard PDF fonts cover Western European text (Windows-1252). Other
 * characters are replaced with close equivalents rather than printed wrongly.
 */
const REPLACEMENTS: Record<string, string> = {
  '→': '->',
  '←': '<-',
  '≥': '>=',
  '≤': '<=',
  '≠': '!=',
  '✓': 'v',
  '✔': 'v',
  '✗': 'x',
  '✕': 'x',
  '★': '*',
  '⬆': '^',
  '−': '-',
  ' ': ' ',
  '\t': '  ',
}
const CP1252_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')

export function safeText(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (REPLACEMENTS[ch] !== undefined) out += REPLACEMENTS[ch]
    else if (ch === '\n' || (code >= 32 && code <= 126) || (code >= 160 && code <= 255))
      out += ch
    else if (CP1252_EXTRA.has(ch)) out += ch
    else out += '?'
  }
  return out
}

export class PdfWriter {
  readonly pdf: jsPDF
  private y: number = PAGE.margin

  constructor(title: string) {
    this.pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    this.pdf.setProperties({ title: safeText(title), creator: 'GamHub WorkSim' })
    this.pdf.setFont('helvetica', 'normal')
  }

  get page(): number {
    return this.pdf.getCurrentPageInfo().pageNumber
  }

  newPage() {
    this.pdf.addPage()
    this.y = PAGE.margin
  }

  /** Starts a new page if `height` mm will not fit on this one. */
  private ensure(height: number) {
    if (this.y + height > BOTTOM) this.newPage()
  }

  space(mm: number) {
    this.y += mm
  }

  private style(size: number, weight: 'normal' | 'bold' | 'italic', color = COLORS.text) {
    this.pdf.setFont('helvetica', weight)
    this.pdf.setFontSize(size)
    this.pdf.setTextColor(color[0], color[1], color[2])
  }

  private lines(text: string, width = CONTENT_WIDTH): string[] {
    return this.pdf.splitTextToSize(safeText(text), width) as string[]
  }

  heading(text: string, level: 1 | 2 | 3 = 1) {
    const size = level === 1 ? 17 : level === 2 ? 13 : 11
    this.style(size, 'bold', level === 1 ? COLORS.accent : COLORS.text)
    const lines = this.lines(text)
    const height = lines.length * size * 0.42
    this.ensure(height + 12)
    this.y += level === 1 ? 2 : 3
    this.pdf.text(lines, PAGE.margin, this.y + size * 0.3)
    this.y += height + 2.5
  }

  paragraph(
    text: string,
    options: { size?: number; muted?: boolean; bold?: boolean; indent?: number } = {},
  ) {
    const size = options.size ?? 10
    this.style(
      size,
      options.bold ? 'bold' : 'normal',
      options.muted ? COLORS.muted : COLORS.text,
    )
    const indent = options.indent ?? 0
    const lineHeight = size * 0.45
    const lines = this.lines(text, CONTENT_WIDTH - indent)
    // Short paragraphs are kept together on one page.
    if (lines.length <= 6) this.ensure(lines.length * lineHeight)
    for (const line of lines) {
      this.ensure(lineHeight)
      this.pdf.text(line, PAGE.margin + indent, this.y + size * 0.3)
      this.y += lineHeight
    }
    this.y += 2
  }

  list(items: string[], ordered = false) {
    this.style(10, 'normal')
    items.forEach((item, i) => {
      const marker = ordered ? `${i + 1}.` : '•'
      const lines = this.lines(item, CONTENT_WIDTH - 6)
      lines.forEach((line, j) => {
        this.ensure(4.5)
        if (j === 0) this.pdf.text(marker, PAGE.margin + 1, this.y + 3)
        this.pdf.text(line, PAGE.margin + 6, this.y + 3)
        this.y += 4.5
      })
    })
    this.y += 2
  }

  table(table: ExportTable, options: { maxRows?: number } = {}) {
    const max = options.maxRows ?? MAX_REPORT_ROWS
    if (table.title) this.paragraph(table.title, { bold: true, size: 10 })
    if (table.rows.length === 0) {
      this.paragraph('(empty)', { muted: true, size: 9 })
      return
    }
    const columns = Math.max(table.head.length, ...table.rows.map((r) => r.length))
    const fontSize = columns > 10 ? 6 : columns > 6 ? 7 : 8.5
    autoTable(this.pdf, {
      startY: this.y,
      margin: { left: PAGE.margin, right: PAGE.margin, bottom: PAGE.height - BOTTOM },
      head: table.head.length > 0 ? [table.head.map(safeText)] : undefined,
      body: table.rows.slice(0, max).map((row) => row.map(safeText)),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize,
        cellPadding: 1.2,
        overflow: 'linebreak',
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
      },
    })
    const finalY = (this.pdf as unknown as { lastAutoTable?: { finalY?: number } })
      .lastAutoTable?.finalY
    this.y = (finalY ?? this.y) + 3
    if (table.rows.length > max) {
      this.paragraph(`${table.rows.length - max} more rows are in the original file.`, {
        muted: true,
        size: 8.5,
      })
    }
  }

  /** A chart drawn with lines and shapes, followed by its data. */
  chart(chart: ChartSpec) {
    const height = 62
    this.ensure(height + 14)
    this.paragraph(chart.title || 'Chart', { bold: true, size: 10 })
    const x0 = PAGE.margin + 12
    const y0 = this.y
    const width = CONTENT_WIDTH - 50
    const values = chart.series.flatMap((s) => s.values)
    const pdf = this.pdf
    pdf.setDrawColor(COLORS.line[0], COLORS.line[1], COLORS.line[2])
    pdf.setLineWidth(0.2)

    if (chart.type === 'pie') {
      this.pie(chart, x0 + 30, y0 + height / 2, height / 2 - 4)
    } else if (values.length > 0 && chart.labels.length > 0) {
      const max = Math.max(0, ...values)
      const min = Math.min(0, ...values)
      const range = max - min || 1
      const yOf = (v: number) => y0 + height - ((v - min) / range) * height
      // Axes and the zero line.
      pdf.line(x0, y0, x0, y0 + height)
      pdf.line(x0, yOf(0), x0 + width, yOf(0))
      this.style(6.5, 'normal', COLORS.muted)
      pdf.text(formatNumber(max), x0 - 1, y0 + 2, { align: 'right' })
      if (min < 0) pdf.text(formatNumber(min), x0 - 1, y0 + height, { align: 'right' })
      const slot = width / chart.labels.length
      chart.labels.forEach((label, i) => {
        const text = safeText(label).slice(0, 14)
        pdf.text(text, x0 + slot * (i + 0.5), y0 + height + 4, { align: 'center' })
      })
      if (chart.type === 'line') {
        chart.series.forEach((series, s) => {
          const [r, g, b] = SERIES[s % SERIES.length]
          pdf.setDrawColor(r, g, b)
          pdf.setLineWidth(0.6)
          series.values.forEach((v, i) => {
            if (i === 0) return
            pdf.line(
              x0 + slot * (i - 0.5),
              yOf(series.values[i - 1]),
              x0 + slot * (i + 0.5),
              yOf(v),
            )
          })
        })
      } else {
        // Column and bar charts both draw upright bars, grouped by label.
        const n = Math.max(1, chart.series.length)
        const barWidth = (slot * 0.75) / n
        chart.series.forEach((series, s) => {
          const [r, g, b] = SERIES[s % SERIES.length]
          pdf.setFillColor(r, g, b)
          series.values.forEach((v, i) => {
            const x = x0 + slot * i + slot * 0.125 + barWidth * s
            const top = Math.min(yOf(v), yOf(0))
            pdf.rect(x, top, barWidth, Math.abs(yOf(v) - yOf(0)) || 0.2, 'F')
          })
        })
      }
      this.legend(
        chart.series.map((s) => s.name),
        x0 + width + 4,
        y0,
      )
    }
    this.y = y0 + height + 8
    this.table({
      title: '',
      head: ['', ...chart.series.map((s) => s.name)],
      rows: chart.labels.map((label, i) => [
        label,
        ...chart.series.map((s) =>
          s.values[i] === undefined ? '' : formatNumber(s.values[i]),
        ),
      ]),
    })
  }

  private pie(chart: ChartSpec, cx: number, cy: number, radius: number) {
    const values = (chart.series[0]?.values ?? []).map((v) => Math.max(0, v))
    const total = values.reduce((a, b) => a + b, 0)
    if (total <= 0) return
    let angle = -Math.PI / 2
    values.forEach((v, i) => {
      const sweep = (v / total) * Math.PI * 2
      const [r, g, b] = SERIES[i % SERIES.length]
      this.pdf.setFillColor(r, g, b)
      // A fan of thin triangles approximates the slice; outlining each in
      // the same colour hides the seams between them.
      this.pdf.setDrawColor(r, g, b)
      this.pdf.setLineWidth(0.3)
      const steps = Math.max(2, Math.ceil(sweep / 0.1))
      for (let k = 0; k < steps; k++) {
        const a1 = angle + (sweep * k) / steps
        const a2 = angle + (sweep * (k + 1)) / steps
        this.pdf.triangle(
          cx,
          cy,
          cx + radius * Math.cos(a1),
          cy + radius * Math.sin(a1),
          cx + radius * Math.cos(a2),
          cy + radius * Math.sin(a2),
          'FD',
        )
      }
      angle += sweep
    })
    this.legend(chart.labels, cx + radius + 10, cy - radius)
  }

  private legend(names: string[], x: number, y: number) {
    this.style(7, 'normal')
    names.slice(0, 12).forEach((name, i) => {
      const [r, g, b] = SERIES[i % SERIES.length]
      this.pdf.setFillColor(r, g, b)
      this.pdf.rect(x, y + i * 4.5, 3, 3, 'F')
      this.pdf.text(safeText(name).slice(0, 24), x + 4.5, y + i * 4.5 + 2.6)
    })
  }

  code(title: string, text: string) {
    this.paragraph(title, { bold: true, size: 10 })
    this.pdf.setFont('courier', 'normal')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
    const lines = safeText(text).split('\n')
    lines.forEach((line, i) => {
      const wrapped = this.pdf.splitTextToSize(
        line || ' ',
        CONTENT_WIDTH - 10,
      ) as string[]
      wrapped.forEach((part, j) => {
        this.ensure(3.6)
        this.pdf.setFont('courier', 'normal')
        this.pdf.setFontSize(8)
        if (j === 0) {
          this.pdf.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2])
          this.pdf.text(String(i + 1).padStart(3), PAGE.margin, this.y + 2.6)
          this.pdf.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
        }
        this.pdf.text(part, PAGE.margin + 10, this.y + 2.6)
        this.y += 3.6
      })
    })
    this.y += 3
  }

  blocks(blocks: Block[]) {
    for (const block of blocks) {
      switch (block.kind) {
        case 'heading':
          this.heading(block.text, Math.min(3, block.level + 1) as 2 | 3)
          break
        case 'paragraph':
          this.paragraph(block.text)
          break
        case 'list':
          this.list(block.items, block.ordered)
          break
        case 'table':
          this.table(block.table)
          break
        case 'chart':
          this.chart(block.chart)
          break
        case 'code':
          this.code(block.title, block.text)
          break
      }
    }
  }

  /** Writes text at a fixed place on a page (for the contents page). */
  at(
    page: number,
    x: number,
    y: number,
    text: string,
    options: { right?: boolean } = {},
  ) {
    const current = this.page
    this.pdf.setPage(page)
    this.style(10, 'normal')
    this.pdf.text(safeText(text), x, y, options.right ? { align: 'right' } : undefined)
    this.pdf.setPage(current)
  }

  /** Adds the footer and page numbers to every page, then returns the file. */
  finish(footer: string): Uint8Array {
    const pages = this.pdf.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      this.pdf.setPage(i)
      this.style(7.5, 'normal', COLORS.muted)
      this.pdf.text(safeText(footer), PAGE.margin, PAGE.height - 10)
      this.pdf.text(`Page ${i} of ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 10, {
        align: 'right',
      })
    }
    return new Uint8Array(this.pdf.output('arraybuffer'))
  }
}

export const LAYOUT = { ...PAGE, contentWidth: CONTENT_WIDTH }

function formatNumber(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString('en-GB')
    : n.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}
