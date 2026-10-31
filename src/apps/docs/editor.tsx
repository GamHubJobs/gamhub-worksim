/**
 * The Docs editor's building blocks (TipTap, MIT-licensed, built on
 * ProseMirror): text formatting, headings, lists, tables, alignment, font
 * sizes, page breaks and charts.
 */
import { mergeAttributes, Node } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import { ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ChartNodeView } from './ChartNodeView'

/** A chart from Sheets, frozen as it was when inserted. */
export const ChartNode = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { spec: { default: null } }
  },
  parseHTML() {
    return [{ tag: 'figure[data-chart]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, { 'data-chart': '' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView)
  },
})

/** Starts a new page when printed; shown as a dashed line while editing. */
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }]
  },
  renderHTML() {
    return ['div', { 'data-page-break': '', class: 'page-break' }]
  },
})

export const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '24px', '32px']

export function docExtensions(placeholder = 'Start typing…') {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
    }),
    TextStyle,
    FontSize,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TableKit.configure({ table: { resizable: false } }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
    ChartNode,
    PageBreak,
  ]
}
