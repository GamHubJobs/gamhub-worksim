/**
 * A document open in Word Craft, the office's word processor (the shared
 * session and window: src/apps/craft/).
 *
 * - The document opens from its kept .docx file, or is built from WorkSim's
 *   document (as HTML, convert.ts) when there is none yet or it no longer
 *   matches (a task's starting document, or an edit in the basic editor).
 * - Each save keeps the .docx file, and WorkSim's document read from Word
 *   Craft's HTML of it (fromHtml.ts) for grading, WorkSim AI and exports.
 * - Charts and tables from Grid Craft go in through the window's picker:
 *   a chart as a picture that carries it (so it counts as a chart), a table
 *   as a Word Craft table.
 * - WorkSim AI sees the selected text and the document, and may propose
 *   text, which is written only when the player applies it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AskAiMenu } from '../../ai/AskAiMenu'
import { useAiApply, useAiContext } from '../../ai/hub'
import type { ContextItem } from '../../../ai/types'
import { base64ToBytes, bytesToBase64 } from '../../../lib/base64'
import { downloadFile } from '../../../lib/download'
import type { ChartSpec, DocContent } from '../../../persistence/schemas'
import { chartPng } from '../../../ui/chartImage'
import type { CraftApi } from '../../craft/CraftFrame'
import { CraftShell } from '../../craft/CraftShell'
import { craftFileName, type Installed } from '../../craft/crafts'
import { useCraftSession, type CraftAdapter } from '../../craft/useCraftSession'
import type { PickerMode } from '../../shared/SheetsPicker'
import { outline, plainText } from '../text'
import { chartAlt, chartsIn, docFingerprint, docToHtml } from './convert'
import { htmlToDoc } from './fromHtml'

const IMPORT_TYPES = '.docx,.doc,.odt,.rtf,.html,.htm,.md,.txt,.tex'
const DOCX_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PAGE_SIZES = { a4: 'A4', letter: 'Letter' } as const

export interface WordCraftEditorProps {
  installed: Installed
  title: string
  author: string
  content: DocContent
  contentEpoch: number
  onReplace: (next: DocContent) => void
  onFailed: (reason: string) => void
  registerSave: (save: (() => Promise<boolean>) | null) => void
  onPending?: (pending: boolean) => void
  /** Opens the picker of charts and tables from Grid Craft. */
  onPickFromSheets?: (
    mode: PickerMode,
    insert: { chart: (chart: ChartSpec) => void; table: (rows: string[][]) => void },
  ) => void
  hidden?: boolean
}

const textToBase64 = (text: string) => bytesToBase64(new TextEncoder().encode(text))

/**
 * Word Craft starts on File › Home when it has nothing open (as in host mode,
 * before the document arrives), and opening a file by command leaves it
 * there: show the document.
 */
const showDocument = (api: CraftApi) => api.execute('ui.backstage', { value: false })

/** How Word Craft opens, builds, saves and reads back a document. */
function wordCraftAdapter(title: string): CraftAdapter<DocContent> {
  const name = (extension: string) => craftFileName(title, extension)
  return {
    title: 'Word Craft',
    keptFile: (document) =>
      document.file?.format === 'docx' && document.file.basis === docFingerprint(document)
        ? { name: name('docx'), base64: document.file.data }
        : null,
    openFile: async (api, file, base64) => {
      await api.execute('file.open', { path: file, data: base64 })
      await showDocument(api)
    },
    build: async (api, document) => {
      const charts = await Promise.all(chartsIn(document.body).map(chartPng))
      await api.execute('file.open', {
        path: name('html'),
        data: textToBase64(docToHtml(document, charts)),
      })
      await showDocument(api)
      await Promise.all([
        api.execute('layout.size', { name: PAGE_SIZES[document.page.size] }),
        api.execute('layout.margins', { preset: document.page.margins }),
      ]).catch((error: unknown) =>
        console.warn('Word Craft: page setup not applied.', error),
      )
      return null
    },
    requestSave: (api) => api.execute('file.save', { path: name('docx') }),
    isDirty: async (api) =>
      ((await api.request('ui.inspect', {})) as { dirty?: boolean }).dirty === true,
    isDocument: (file) => /\.docx$/i.test(file),
    read: async (api: CraftApi, bytes, previous, files) => {
      const html = files.next('html')
      await api.execute('file.save', { path: name('html') })
      const document = htmlToDoc(new TextDecoder().decode(await html), previous)
      return {
        ...document,
        file: {
          format: 'docx',
          app: 'wordcraft',
          data: bytesToBase64(bytes),
          basis: docFingerprint(document),
        },
      }
    },
  }
}

export function WordCraftEditor({
  installed,
  title,
  author,
  content,
  contentEpoch,
  onReplace,
  onFailed,
  registerSave,
  onPending,
  onPickFromSheets,
  hidden = false,
}: WordCraftEditorProps) {
  const [notice, setNotice] = useState<string | null>(null)
  const adapter = useMemo(() => wordCraftAdapter(title), [title])
  const saveRef = useRef<() => Promise<boolean>>(async () => true)
  const onExport = useCallback(
    (file: string, bytes: Uint8Array) => {
      const extension = file.split('.').pop()?.toLowerCase() ?? ''
      // A save the player made in Word Craft as HTML (after WorkSim read the
      // document as HTML, that is what its Save writes): keep the document.
      if (extension === 'html' || extension === 'htm') void saveRef.current()
      else
        downloadFile(
          craftFileName(title, extension),
          bytes,
          extension === 'pdf' ? 'application/pdf' : 'application/octet-stream',
        )
    },
    [title],
  )
  const { api, phase, onReady, onSave, onDirty, save, importFile } = useCraftSession({
    adapter,
    content,
    contentEpoch,
    onReplace,
    onFailed,
    registerSave,
    onPending,
    onExport,
  })
  useEffect(() => {
    saveRef.current = save
  }, [save])

  // The selected text, for WorkSim AI.
  const selected = useRef('')
  useEffect(() => {
    if (!api || phase !== 'ready' || hidden) return
    const look = () =>
      api
        .request('document.selection', {})
        .then((reply) => {
          const text = (reply as { text?: unknown }).text
          selected.current = typeof text === 'string' ? text.trim() : ''
        })
        .catch(() => {})
    void look()
    const timer = window.setInterval(look, 1000)
    return () => window.clearInterval(timer)
  }, [api, phase, hidden])

  useAiContext(
    'docs',
    phase === 'ready'
      ? () => {
          const items: ContextItem[] = []
          if (selected.current)
            items.push({
              kind: 'selection',
              label: 'Selected text',
              text: selected.current,
            })
          items.push({
            kind: 'document',
            label: 'The document',
            text: plainText(content.body),
            data: { headings: outline(content.body).map((h) => h.text) },
          })
          return items
        }
      : null,
  )
  useAiApply('docs', phase === 'ready' ? ['text'] : null, (proposal) => {
    if (proposal.kind !== 'text' || !api) return false
    void api.execute('text.insert', { text: proposal.text, paragraphs: true })
    return true
  })

  async function insertChart(chart: ChartSpec) {
    if (!api) return
    setNotice('Inserting the chart…')
    const png = await chartPng(chart)
    await api.execute('insert.picture', {
      data: png.slice(png.indexOf(',') + 1),
      width: 360,
      alt: chartAlt(chart),
    })
    setNotice(null)
  }

  async function insertTable(rows: string[][]) {
    if (!api || rows.length === 0) return
    const columns = Math.max(...rows.map((row) => row.length))
    await api.execute('insert.table', { rows: rows.length, cols: columns })
    // The cursor is in the first cell; Tab moves to the next.
    const cells = rows.flatMap((row) =>
      Array.from({ length: columns }, (_, i) => row[i] ?? ''),
    )
    for (const [i, value] of cells.entries()) {
      if (value) await api.execute('text.insert', { text: value })
      if (i < cells.length - 1) await api.execute('text.tab', {})
    }
  }

  async function download(kind: 'docx' | 'pdf') {
    if (!api) return
    setNotice(null)
    try {
      if (kind === 'pdf') {
        await api.execute('file.exportPdf', { path: craftFileName(title, 'pdf') })
        return
      }
      if (!(await save())) throw new Error('the document could not be saved')
      const file = content.file
      if (file?.format === 'docx')
        downloadFile(craftFileName(title, 'docx'), base64ToBytes(file.data), DOCX_TYPE)
    } catch (error) {
      setNotice(`That did not work: ${String(error)}`)
    }
  }

  async function importDocument(file: File) {
    if (
      !window.confirm(
        `Replace this document with ${file.name}? The current one stays in Version history.`,
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

  const fromSheets = (mode: PickerMode) =>
    onPickFromSheets?.(mode, {
      chart: (chart) =>
        void insertChart(chart).catch((error: unknown) =>
          setNotice(`The chart could not be inserted: ${String(error)}`),
        ),
      table: (rows) =>
        void insertTable(rows).catch((error: unknown) =>
          setNotice(`The table could not be inserted: ${String(error)}`),
        ),
    })

  return (
    <CraftShell
      app="wordcraft"
      installed={installed}
      author={author}
      phase={phase}
      hidden={hidden}
      testId="wordcraft-editor"
      opening="Opening your document…"
      actions={[
        { label: 'Insert chart from Grid Craft', run: () => fromSheets('chart') },
        { label: 'Insert table from Grid Craft', run: () => fromSheets('table') },
        { label: 'Download .docx', run: () => void download('docx') },
        { label: 'Export PDF', run: () => void download('pdf') },
      ]}
      importTypes={IMPORT_TYPES}
      importLabel="Import a document file"
      onImport={(file) => void importDocument(file)}
      ai={
        <AskAiMenu
          app="docs"
          compact
          actions={[
            { label: 'Review my writing', action: 'review' },
            { label: 'Summarise the document', action: 'summarise' },
            {
              label: 'Suggest a structure for my report',
              question: 'Suggest a structure for my report',
              action: 'structure',
            },
            {
              label: 'Rewrite the selected text professionally',
              question: 'Rewrite the selected text in a professional tone',
              action: 'rewrite',
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
