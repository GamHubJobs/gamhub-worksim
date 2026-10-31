/** A short description of a document's contents, e.g. "120 filled cells". */
import { countWords } from '../apps/docs/text'
import { countFilledCells } from '../apps/sheets/model'
import type { AnyDocument } from '../persistence/schemas'

export function describeContent(document: AnyDocument): string {
  switch (document.kind) {
    case 'sheet':
      return `${countFilledCells(document.content)} filled cells`
    case 'doc': {
      const words = countWords(document.content.body)
      return `${words} word${words === 1 ? '' : 's'}`
    }
    case 'tickets': {
      const tickets = document.content.tickets.length
      return `${tickets} ticket${tickets === 1 ? '' : 's'}`
    }
    case 'slides': {
      const slides = document.content.slides.length
      return `${slides} slide${slides === 1 ? '' : 's'}`
    }
  }
}
