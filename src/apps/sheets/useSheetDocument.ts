/**
 * Connects an open spreadsheet to the save system (see `useSavedDocument`)
 * and adds spreadsheet-specific changes.
 */
import { useCallback } from 'react'
import { SheetContentSchema } from '../../persistence/schemas'
import { useSavedDocument } from '../shared/useSavedDocument'
import { getCellInput, setCellInput } from './model'

export function useSheetDocument(documentId: string | null) {
  const saved = useSavedDocument(documentId, 'sheet', SheetContentSchema)
  const { update } = saved

  /** Changes one cell's value. */
  const setCell = useCallback(
    (sheetId: string, address: string, input: string) => {
      update((content) => {
        const sheet = content.sheets.find((s) => s.id === sheetId)
        if (!sheet || getCellInput(sheet, address) === input) return content
        return setCellInput(content, sheetId, address, input)
      })
    },
    [update],
  )

  return { ...saved, setCell }
}
