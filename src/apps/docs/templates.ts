/**
 * Professional document templates. Each one shows the structure people
 * expect in a real workplace, with [placeholders] to replace.
 */
import type { DocContent, RichNode } from '../../persistence/schemas'

// --- Small builders for document content --------------------------------

type Align = 'left' | 'center' | 'right'

const text = (value: string, marks?: RichNode['marks']): RichNode => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
})

export const p = (value = '', align?: Align): RichNode => ({
  type: 'paragraph',
  ...(align ? { attrs: { textAlign: align } } : {}),
  ...(value ? { content: [text(value)] } : {}),
})

/** A paragraph with a bold label followed by plain text, e.g. "To: Priya". */
export const labelled = (label: string, value: string): RichNode => ({
  type: 'paragraph',
  content: [text(label, [{ type: 'bold' }]), text(` ${value}`)],
})

export const h = (level: 1 | 2 | 3, value: string, align?: Align): RichNode => ({
  type: 'heading',
  attrs: { level, ...(align ? { textAlign: align } : {}) },
  content: [text(value)],
})

const listItem = (value: string): RichNode => ({
  type: 'listItem',
  content: [p(value)],
})

export const bullets = (items: string[]): RichNode => ({
  type: 'bulletList',
  content: items.map(listItem),
})

export const numbered = (items: string[]): RichNode => ({
  type: 'orderedList',
  attrs: { start: 1 },
  content: items.map(listItem),
})

/** A table; the first row is the header row. */
export const table = (rows: string[][]): RichNode => ({
  type: 'table',
  content: rows.map((row, r) => ({
    type: 'tableRow',
    content: row.map((cell) => ({
      type: r === 0 ? 'tableHeader' : 'tableCell',
      attrs: { colspan: 1, rowspan: 1, colwidth: null },
      content: [p(cell)],
    })),
  })),
})

export const pageBreak = (): RichNode => ({ type: 'pageBreak' })

export function docContent(blocks: RichNode[]): DocContent {
  return {
    body: { type: 'doc', content: blocks.length ? blocks : [p()] },
    page: { size: 'a4', margins: 'normal' },
  }
}

// --- Templates ----------------------------------------------------------

export interface DocTemplate {
  id: string
  name: string
  description: string
  /** The new document's title. */
  title: string
  build: (author: string) => DocContent
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'blank',
    name: 'Blank document',
    description: 'An empty page.',
    title: 'Untitled document',
    build: () => docContent([p()]),
  },
  {
    id: 'report',
    name: 'Business report',
    description: 'Summary, background, findings with a table, and recommendations.',
    title: 'Business report',
    build: (author) =>
      docContent([
        h(1, '[Report title]'),
        labelled('Prepared by:', author),
        labelled('Date:', '[Date]'),
        labelled('For:', '[Who the report is for]'),
        h(2, '1. Executive summary'),
        p(
          '[Two or three sentences: what you looked at, the most important finding, and what you recommend. Busy readers may read only this section.]',
        ),
        h(2, '2. Background'),
        p('[Why this report was needed, and what data it is based on.]'),
        h(2, '3. Findings'),
        p('[Your main findings, most important first. Use figures to support each one.]'),
        table([
          ['Item', 'Figure', 'Comment'],
          ['[Item]', '[Value]', '[What it means]'],
          ['[Item]', '[Value]', '[What it means]'],
        ]),
        p(),
        h(2, '4. Recommendations'),
        numbered([
          '[What should happen, and who should do it]',
          '[Second recommendation]',
        ]),
        h(2, '5. Next steps'),
        bullets(['[Action, owner and date]']),
      ]),
  },
  {
    id: 'memo',
    name: 'Memo',
    description: 'A short internal message: who, what, and what needs to happen.',
    title: 'Memo',
    build: (author) =>
      docContent([
        h(1, 'MEMO'),
        labelled('To:', '[Name, team]'),
        labelled('From:', author),
        labelled('Date:', '[Date]'),
        labelled('Subject:', '[One line that says what this is about]'),
        { type: 'horizontalRule' },
        p('[Opening: the purpose of the memo in one sentence.]'),
        p('[Details: the facts the reader needs. Keep paragraphs short.]'),
        p('[Action: what you need the reader to do, and by when.]'),
      ]),
  },
  {
    id: 'letter',
    name: 'Business letter',
    description: 'A formal letter to a supplier, client or other organisation.',
    title: 'Letter',
    build: (author) =>
      docContent([
        p('Cobalt Ridge Consulting', 'right'),
        p('Finance & Administration', 'right'),
        p('[Street address, city]', 'right'),
        p(),
        p('[Date]'),
        p(),
        p('[Recipient name]'),
        p('[Company]'),
        p('[Address]'),
        p(),
        labelled('Re:', '[Subject of the letter]'),
        p(),
        p('Dear [Name],'),
        p('[First paragraph: why you are writing.]'),
        p(
          '[Second paragraph: the details, with any references such as invoice numbers.]',
        ),
        p('[Final paragraph: what you would like them to do next.]'),
        p(),
        p('Yours sincerely,'),
        p(),
        p(author),
        p('Finance & Administration, Cobalt Ridge Consulting'),
      ]),
  },
  {
    id: 'minutes',
    name: 'Meeting minutes',
    description: 'Who attended, what was decided, and who does what by when.',
    title: 'Meeting minutes',
    build: (author) =>
      docContent([
        h(1, 'Minutes: [Meeting name]'),
        table([
          ['Detail', ''],
          ['Date and time', '[Date, time]'],
          ['Location', '[Room or video call]'],
          ['Attendees', '[Names]'],
          ['Apologies', '[Names]'],
          ['Minutes taken by', author],
        ]),
        p(),
        h(2, 'Agenda'),
        numbered(['[First item]', '[Second item]', 'Any other business']),
        h(2, '1. [First item]'),
        labelled('Discussion:', '[A short summary of what was said.]'),
        labelled('Decision:', '[What was agreed.]'),
        h(2, '2. [Second item]'),
        labelled('Discussion:', '[Summary]'),
        labelled('Decision:', '[What was agreed]'),
        h(2, 'Actions'),
        table([
          ['Action', 'Owner', 'Due'],
          ['[What needs to be done]', '[Name]', '[Date]'],
        ]),
        p(),
        labelled('Next meeting:', '[Date and time]'),
      ]),
  },
]

export function getDocTemplate(id: string): DocTemplate {
  return DOC_TEMPLATES.find((template) => template.id === id) ?? DOC_TEMPLATES[0]
}
