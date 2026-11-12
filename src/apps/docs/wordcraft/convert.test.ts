import { describe, expect, it } from 'vitest'
import type { ChartSpec, DocContent, RichNode } from '../../../persistence/schemas'
import { DOC_TEMPLATES } from '../templates'
import {
  chartAlt,
  chartFromAlt,
  chartPlaceholder,
  chartsIn,
  docFingerprint,
  docToHtml,
  finishDoc,
} from './convert'

const chart: ChartSpec = {
  type: 'column',
  title: 'Costs by month — Q1 “draft”',
  labels: ['Jan', 'Feb'],
  series: [{ name: 'Costs', values: [1200.5, 980] }],
}
const text = (t: string, marks?: RichNode['marks']): RichNode =>
  marks ? { type: 'text', text: t, marks } : { type: 'text', text: t }
const doc = (...content: RichNode[]): DocContent => ({
  body: { type: 'doc', content },
  page: { size: 'a4', margins: 'normal' },
})

describe('WorkSim documents as HTML for Word Craft', () => {
  const report = doc(
    {
      type: 'heading',
      attrs: { level: 1, textAlign: 'center' },
      content: [text('Q1 report')],
    },
    {
      type: 'paragraph',
      content: [
        text('Costs '),
        text('rose', [{ type: 'bold' }]),
        text(' by 12% <fast> & '),
        text('red', [{ type: 'textStyle', attrs: { color: '#b91c1c' } }]),
      ],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [text('Rent')] }] },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: [text('Item')] }],
            },
            {
              type: 'tableCell',
              attrs: { colspan: 2 },
              content: [{ type: 'paragraph', content: [text('Cost')] }],
            },
          ],
        },
      ],
    },
    { type: 'chart', attrs: { spec: chart } },
    {
      type: 'paragraph',
      content: [text('Line one'), { type: 'hardBreak' }, text('two')],
    },
  )

  it('writes headings, formatting, lists, tables and line breaks as HTML', () => {
    const html = docToHtml(report, ['data:image/png;base64,AAA'])
    expect(html).toContain('<h1 style="text-align:center">Q1 report</h1>')
    expect(html).toContain('<strong>rose</strong> by 12% &lt;fast&gt; &amp; ')
    expect(html).toContain('<span style="color:#b91c1c">red</span>')
    expect(html).toContain('<ul><li><p>Rent</p></li></ul>')
    expect(html).toContain('<th><p>Item</p></th><td colspan="2"><p>Cost</p></td>')
    expect(html).toContain('<p>Line one<br>two</p>')
  })

  it('a chart is a picture whose alternative text carries it', () => {
    expect(chartsIn(report.body)).toEqual([chart])
    const html = docToHtml(report, ['data:image/png;base64,AAA'])
    const alt = /<img src="data:image\/png;base64,AAA" alt="([^"]*)"/.exec(html)![1]
    const decoded = alt.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    expect(decoded.startsWith('Column chart: Costs by month')).toBe(true)
    expect(chartFromAlt(decoded)).toEqual(chart)
    expect(chartFromAlt(chartAlt({ ...chart, title: 'Ümsatz 東京 €' }))?.title).toBe(
      'Ümsatz 東京 €',
    )
    for (const other of ['A photo', '', null, 'x (WorkSim chart !!!)'])
      expect(chartFromAlt(other)).toBeNull()
  })

  it('every document template can be written', () => {
    for (const template of DOC_TEMPLATES) {
      const html = docToHtml(template.build('Sam Taylor'), [])
      expect(html.startsWith('<!DOCTYPE html>'), template.id).toBe(true)
      expect(html.length, template.id).toBeGreaterThan(100)
    }
  })
})

describe('tidying what comes back from Word Craft', () => {
  it('charts come back from their placeholders; the imported font, size and black go', () => {
    const style = (attrs: Record<string, unknown>) => [{ type: 'textStyle', attrs }]
    const parsed: RichNode = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2, textAlign: 'left' },
          content: [
            text('Summary', [
              { type: 'bold' },
              ...style({ color: '#000000', fontSize: '18pt' }),
            ]),
          ],
        },
        {
          type: 'paragraph',
          content: [
            text('Costs ', style({ fontSize: '12pt', fontFamily: 'Times New Roman' })),
            text('rose', [{ type: 'bold' }, ...style({ fontSize: '12pt' })]),
            text(' a lot', style({ fontSize: '12pt' })),
            text(' big', style({ fontSize: '18pt' })),
            text(' blue', style({ color: '#1d4ed8' })),
          ],
        },
        { type: 'paragraph', content: [text(chartPlaceholder(0))] },
        { type: 'paragraph', content: [text(chartPlaceholder(5))] },
      ],
    }
    const result = finishDoc(parsed, [chart], doc())
    expect(result.page).toEqual({ size: 'a4', margins: 'normal' })
    const [heading, paragraph, chartNode, missing] = result.body.content!
    expect(heading).toEqual({
      type: 'heading',
      attrs: { level: 2, textAlign: null },
      content: [text('Summary')],
    })
    expect(paragraph.content).toEqual([
      text('Costs '),
      text('rose', [{ type: 'bold' }]),
      text(' a lot'),
      text(' big', [{ type: 'textStyle', attrs: { fontSize: '24px' } }]),
      text(' blue', [{ type: 'textStyle', attrs: { color: '#1d4ed8' } }]),
    ])
    expect(chartNode).toEqual({ type: 'chart', attrs: { spec: chart } })
    // A placeholder with no chart stays text (it cannot be a chart).
    expect(missing.type).toBe('paragraph')
  })

  it('an empty document stays a valid document', () => {
    expect(finishDoc({ type: 'doc', content: [] }, [], doc()).body).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })

  it('a fingerprint changes with the text, not with the kept file', () => {
    const a = doc({ type: 'paragraph', content: [text('Hello')] })
    expect(
      docFingerprint({
        ...a,
        file: { format: 'docx', app: 'wordcraft', data: 'x', basis: 'y' },
      }),
    ).toBe(docFingerprint(a))
    expect(
      docFingerprint(doc({ type: 'paragraph', content: [text('Hello!')] })),
    ).not.toBe(docFingerprint(a))
  })
})
