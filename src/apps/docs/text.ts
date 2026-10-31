/** Reading the text of a rich-text document (for word counts, outlines and grading). */
import type { RichNode } from '../../persistence/schemas'

/** All the text in a node, with blocks separated by newlines. */
export function plainText(node: RichNode): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return '\n'
  const inner = (node.content ?? []).map(plainText)
  const isBlock = node.type !== 'paragraph' && node.type !== 'heading'
  return isBlock ? inner.join('\n') : inner.join('')
}

export function countWords(node: RichNode): number {
  return plainText(node).split(/\s+/).filter(Boolean).length
}

export interface OutlineEntry {
  level: number
  text: string
  /** Position among the document's top-level blocks. */
  index: number
}

/** The headings of a document, in order. */
export function outline(body: RichNode): OutlineEntry[] {
  return (body.content ?? []).flatMap((block, index) =>
    block.type === 'heading'
      ? [{ level: Number(block.attrs?.level ?? 1), text: plainText(block).trim(), index }]
      : [],
  )
}

/** Every node of a given type, anywhere in the document. */
export function findNodes(node: RichNode, type: string): RichNode[] {
  const found = node.type === type ? [node] : []
  for (const child of node.content ?? []) found.push(...findNodes(child, type))
  return found
}
