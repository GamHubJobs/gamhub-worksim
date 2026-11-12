/**
 * A workbook open in Grid Craft, the office's spreadsheet app (the shared
 * session and window: src/apps/craft/).
 *
 * - The workbook opens from its kept .xlsx file, or is built from WorkSim's
 *   sheets when there is none yet, or it no longer matches them (a task's
 *   starting workbook, or an edit made in the basic editor).
 * - Each save keeps the .xlsx file and the sheets read from it for grading
 *   (see convert.ts).
 * - WorkSim AI sees the active cell and the selection, and may propose a
 *   formula, which is written only when the player applies it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AskAiMenu } from '../../ai/AskAiMenu'
import { useAiApply, useAiContext } from '../../ai/hub'
import { base64ToBytes, bytesToBase64 } from '../../../lib/base64'
import { downloadFile } from '../../../lib/download'
import type { SheetContent } from '../../../persistence/schemas'
import type { CraftApi } from '../../craft/CraftFrame'
import { CraftShell } from '../../craft/CraftShell'
import { craftFileName, type Installed } from '../../craft/crafts'
import { useCraftSession, type CraftAdapter } from '../../craft/useCraftSession'
import { sheetAiContext } from '../aiContext'
import { createCalculator } from '../engine/workbook'
import { parseAddress, parseRange } from '../model'
import { fingerprint, readWorkbook, workbookCommands, type GcWorkbook } from './convert'

const IMPORT_TYPES = '.xlsx,.xlsm,.xls,.xlsb,.ods,.csv,.tsv,.txt'
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export interface GridCraftEditorProps {
  installed: Installed
  /** The file's name in the app (and for downloads). */
  title: string
  author: string
  content: SheetContent
  /** Goes up when the content is replaced from outside (opened, restored). */
  contentEpoch: number
  onReplace: (next: SheetContent) => void
  onFailed: (reason: string) => void
  /** The window's way to have the latest work saved (before submitting, closing). */
  registerSave: (save: (() => Promise<boolean>) | null) => void
  /** Whether Grid Craft holds changes that are not kept yet (shown as not saved). */
  onPending?: (pending: boolean) => void
  hidden?: boolean
}

interface Selection {
  sheet: number
  active: string
  range: string
}

const decodeJson = (base64: string) =>
  JSON.parse(new TextDecoder().decode(base64ToBytes(base64))) as GcWorkbook

/** How Grid Craft opens, builds, saves and reads back a workbook. */
function gridCraftAdapter(title: string): CraftAdapter<SheetContent> {
  return {
    title: 'Grid Craft',
    keptFile: (workbook) =>
      workbook.file && workbook.file.basis === fingerprint(workbook)
        ? { name: craftFileName(title, 'xlsx', 'Workbook'), base64: workbook.file.data }
        : null,
    openFile: (api, name, base64) => api.execute('file.open', { name, base64 }),
    build: async (api, workbook) => {
      await api.execute('file.new', {})
      const commands = workbookCommands(workbook)
      const replies = await Promise.all(
        commands.map(([command, params]) =>
          api.execute(command, params).then(
            () => null,
            (error: unknown) => ({ command, error: String(error) }),
          ),
        ),
      )
      const failed = replies.filter((r) => r !== null)
      if (failed.some((f) => /sheet|insertSheet|rename/.test(f.command)))
        return `Grid Craft cannot open this workbook as it is (${failed[0].error}). It is open in the basic editor instead.`
      if (failed.length)
        console.warn('Grid Craft: some formatting was not applied.', failed)
      return null
    },
    requestSave: (api) => api.execute('file.save', {}),
    isDirty: async (api) => ((await api.inspect()) as { dirty?: boolean }).dirty === true,
    isDocument: (name) => /\.xlsx$/i.test(name),
    read: async (api: CraftApi, bytes, previous) => {
      const json = (await api.execute('file.saveBytes', { format: 'json' })) as {
        base64: string
      }
      const sheets = readWorkbook(decodeJson(json.base64), previous).sheets
      return {
        sheets,
        file: {
          format: 'xlsx',
          app: 'gridcraft',
          data: bytesToBase64(bytes),
          basis: fingerprint({ sheets }),
        },
      }
    },
  }
}

export function GridCraftEditor({
  installed,
  title,
  author,
  content,
  contentEpoch,
  onReplace,
  onFailed,
  registerSave,
  onPending,
  hidden = false,
}: GridCraftEditorProps) {
  const [notice, setNotice] = useState<string | null>(null)
  const adapter = useMemo(() => gridCraftAdapter(title), [title])
  const onExport = useCallback(
    (name: string, bytes: Uint8Array) =>
      // An export (PDF): the player's copy.
      downloadFile(
        craftFileName(title, name.split('.').pop() ?? 'pdf', 'Workbook'),
        bytes,
        'application/pdf',
      ),
    [title],
  )
  const { api, phase, onReady, onSave, onDirty, importFile } = useCraftSession({
    adapter,
    content,
    contentEpoch,
    onReplace,
    onFailed,
    registerSave,
    onPending,
    onExport,
  })
  const selection = useRef<Selection>({ sheet: 0, active: 'A1', range: 'A1' })

  // Where the player is in the workbook, for WorkSim AI.
  useEffect(() => {
    if (!api || phase !== 'ready' || hidden) return
    const look = () =>
      api
        .inspect()
        .then((state) => {
          const s = state as {
            activeSheet?: number
            activeCell?: string
            selection?: string
          }
          selection.current = {
            sheet: s.activeSheet ?? 0,
            active: s.activeCell ?? 'A1',
            range: (s.selection ?? s.activeCell ?? 'A1').split(',')[0],
          }
        })
        .catch(() => {})
    void look()
    const timer = window.setInterval(look, 1000)
    return () => window.clearInterval(timer)
  }, [api, phase, hidden])

  const calculator = useMemo(() => createCalculator(content), [content])
  useAiContext(
    'sheets',
    phase === 'ready'
      ? () => {
          const at = selection.current
          const sheet = content.sheets[at.sheet] ?? content.sheets[0]
          const active = parseAddress(at.active) ?? { row: 0, column: 0 }
          const range = parseRange(at.range) ?? {
            top: active.row,
            left: active.column,
            bottom: active.row,
            right: active.column,
          }
          return sheetAiContext(sheet, calculator, active, range)
        }
      : null,
  )
  useAiApply('sheets', phase === 'ready' ? ['formula'] : null, (proposal) => {
    if (proposal.kind !== 'formula' || !api || !parseAddress(proposal.cell)) return false
    void api.execute('cell.set', { cell: proposal.cell, input: proposal.formula })
    return true
  })

  async function download(kind: 'xlsx' | 'csv' | 'pdf') {
    if (!api) return
    setNotice(null)
    try {
      if (kind === 'pdf') {
        await api.execute('file.exportPdf', {})
        return
      }
      const reply = (await api.execute('file.saveBytes', { format: kind })) as {
        base64: string
      }
      downloadFile(
        craftFileName(title, kind, 'Workbook'),
        base64ToBytes(reply.base64),
        kind === 'csv' ? 'text/csv' : XLSX_TYPE,
      )
    } catch (error) {
      setNotice(`That did not work: ${String(error)}`)
    }
  }

  async function importWorkbook(file: File) {
    if (
      !window.confirm(
        `Replace this workbook with ${file.name}? The current one stays in Version history.`,
      )
    )
      return
    try {
      await importFile(file.name, bytesToBase64(new Uint8Array(await file.arrayBuffer())))
      setNotice(`${file.name} was imported.`)
    } catch (error) {
      setNotice(`${file.name} could not be opened: ${String(error)}`)
    }
  }

  return (
    <CraftShell
      app="gridcraft"
      installed={installed}
      author={author}
      phase={phase}
      hidden={hidden}
      testId="gridcraft-editor"
      opening="Opening your workbook…"
      actions={[
        { label: 'Download .xlsx', run: () => void download('xlsx') },
        { label: 'Download .csv', run: () => void download('csv') },
        { label: 'Export PDF', run: () => void download('pdf') },
      ]}
      importTypes={IMPORT_TYPES}
      importLabel="Import a spreadsheet file"
      onImport={(file) => void importWorkbook(file)}
      ai={
        <AskAiMenu
          app="sheets"
          compact
          actions={[
            { label: 'Explain the formula in this cell', action: 'explain-formula' },
            { label: 'Why is this formula not working?', action: 'explain-formula' },
            { label: 'Suggest a formula for this cell', action: 'suggest-formula' },
            {
              label: 'Analyse the selected data',
              question: 'Analyse the selected data and recommend a chart',
              action: 'analyse-data',
            },
          ]}
        />
      }
      notice={notice}
      onReady={onReady}
      onSave={onSave}
      onDirty={onDirty}
      onFailed={onFailed}
    />
  )
}
