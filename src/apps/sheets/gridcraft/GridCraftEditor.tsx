/**
 * A workbook open in Grid Craft, the office's spreadsheet app.
 *
 * - The workbook opens from its kept .xlsx file, or is built from WorkSim's
 *   sheets when there is none yet, or it no longer matches them (a task's
 *   starting workbook, or an edit made in the basic editor).
 * - Whenever there are unsaved changes, the work is saved a moment later: the
 *   .xlsx file, and the sheets read from it for grading (see convert.ts).
 *   The window also saves it before submitting and before closing.
 * - WorkSim AI sees the active cell and the selection, and may propose a
 *   formula, which is written only when the player applies it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AskAiMenu } from '../../ai/AskAiMenu'
import { useAiApply, useAiContext } from '../../ai/hub'
import { base64ToBytes, bytesToBase64 } from '../../../lib/base64'
import { downloadFile } from '../../../lib/download'
import type { SheetContent } from '../../../persistence/schemas'
import { CraftFrame, type CraftApi } from '../../craft/CraftFrame'
import { craftBase, CRAFTS, type Installed } from '../../craft/crafts'
import { sheetAiContext } from '../aiContext'
import { createCalculator } from '../engine/workbook'
import { parseAddress, parseRange } from '../model'
import { fingerprint, readWorkbook, workbookCommands, type GcWorkbook } from './convert'

/** How long after a change the work is saved (longer edits are saved at least this often). */
const SAVE_AFTER_MS = 1500
const SAVE_AT_LEAST_EVERY_MS = 8000
/** How long a save may take before it is reported as failed. */
const SAVE_TIMEOUT_MS = 30_000

const IMPORT_TYPES = '.xlsx,.xlsm,.xls,.xlsb,.ods,.csv,.tsv,.txt'

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

type Phase = 'starting' | 'opening' | 'ready'

interface Selection {
  sheet: number
  active: string
  range: string
}

function fileName(title: string, extension: string) {
  const base = title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Workbook'
  return `${base}.${extension}`
}

const decodeJson = (base64: string) =>
  JSON.parse(new TextDecoder().decode(base64ToBytes(base64))) as GcWorkbook

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
  const [api, setApi] = useState<CraftApi | null>(null)
  const [phase, setPhase] = useState<Phase>('starting')
  const [notice, setNotice] = useState<string | null>(null)
  const contentRef = useRef(content)
  useEffect(() => {
    contentRef.current = content
  })
  const opening = useRef(false)
  const openedEpoch = useRef<number | null>(null)
  const waiting = useRef<Array<(saved: boolean) => void>>([])
  const timers = useRef<{ save?: number; firstChange?: number }>({})
  const selection = useRef<Selection>({ sheet: 0, active: 'A1', range: 'A1' })
  const importInput = useRef<HTMLInputElement>(null)

  /** Grid Craft saved the workbook: keep the file and the sheets read from it. */
  const kept = useCallback(
    async (bytes: Uint8Array) => {
      if (!api) return
      try {
        const json = (await api.execute('file.saveBytes', { format: 'json' })) as {
          base64: string
        }
        const sheets = readWorkbook(decodeJson(json.base64), contentRef.current).sheets
        const next: SheetContent = {
          sheets,
          file: {
            format: 'xlsx',
            app: 'gridcraft',
            data: bytesToBase64(bytes),
            basis: fingerprint({ sheets }),
          },
        }
        contentRef.current = next
        onReplace(next)
        for (const resolve of waiting.current.splice(0)) resolve(true)
      } catch (error) {
        console.error('Grid Craft: the workbook could not be read back.', error)
        for (const resolve of waiting.current.splice(0)) resolve(false)
      }
    },
    [api, onReplace],
  )

  /** Asks Grid Craft to save now; true once the work is kept. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!api || opening.current) return true
    window.clearTimeout(timers.current.save)
    timers.current.firstChange = undefined
    const saved = new Promise<boolean>((resolve) => {
      // Not saved until the file is kept (or the save failed).
      waiting.current.push((ok) => {
        if (timers.current.firstChange === undefined) onPending?.(!ok)
      })
      waiting.current.push(resolve)
      window.setTimeout(() => resolve(false), SAVE_TIMEOUT_MS)
    })
    try {
      await api.execute('file.save', {})
    } catch (error) {
      console.error('Grid Craft: could not save.', error)
      return false
    }
    return saved
  }, [api, onPending])

  useEffect(() => {
    registerSave(phase === 'ready' ? save : null)
    return () => registerSave(null)
  }, [registerSave, save, phase])

  /** Opens the workbook in Grid Craft (again, after a restore). */
  const open = useCallback(
    async (target: CraftApi, workbook: SheetContent) => {
      opening.current = true
      setPhase('opening')
      try {
        const file = workbook.file
        if (file && file.basis === fingerprint(workbook)) {
          await target.execute('file.open', {
            name: fileName(title, 'xlsx'),
            base64: file.data,
          })
        } else {
          await target.execute('file.new', {})
          const commands = workbookCommands(workbook)
          const replies = await Promise.all(
            commands.map(([command, params]) =>
              target.execute(command, params).then(
                () => null,
                (error: unknown) => ({ command, error: String(error) }),
              ),
            ),
          )
          const failed = replies.filter((r) => r !== null)
          if (failed.some((f) => /sheet|insertSheet|rename/.test(f.command))) {
            onFailed(
              `Grid Craft cannot open this workbook as it is (${failed[0].error}). It is open in the basic editor instead.`,
            )
            return
          }
          if (failed.length)
            console.warn('Grid Craft: some formatting was not applied.', failed)
        }
        opening.current = false
        setPhase('ready')
        // Keep the file from the start, so it opens as it is next time.
        if (!file || file.basis !== fingerprint(workbook)) await save()
      } catch (error) {
        onFailed(`Grid Craft could not open this workbook: ${String(error)}`)
      } finally {
        opening.current = false
      }
    },
    [onFailed, save, title],
  )

  useEffect(() => {
    if (!api || openedEpoch.current === contentEpoch) return
    openedEpoch.current = contentEpoch
    void open(api, contentRef.current)
  }, [api, contentEpoch, open])

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

  const onDirty = useCallback(
    (dirty: boolean) => {
      if (!dirty || opening.current) return
      onPending?.(true)
      const now = Date.now()
      timers.current.firstChange ??= now
      window.clearTimeout(timers.current.save)
      const wait =
        now - timers.current.firstChange > SAVE_AT_LEAST_EVERY_MS ? 0 : SAVE_AFTER_MS
      timers.current.save = window.setTimeout(() => void save(), wait)
    },
    [save, onPending],
  )
  useEffect(() => () => window.clearTimeout(timers.current.save), [])

  // Leaving the page: save at once when it is hidden, and ask before closing
  // while a change is not yet kept (as Grid Craft expects of its host).
  useEffect(() => {
    const hidden = () => {
      if (
        document.visibilityState === 'hidden' &&
        timers.current.firstChange !== undefined
      )
        void save()
    }
    const leaving = (event: BeforeUnloadEvent) => {
      if (timers.current.firstChange === undefined) return
      void save()
      event.preventDefault()
    }
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('beforeunload', leaving)
    return () => {
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('beforeunload', leaving)
    }
  }, [save])

  const onSave = useCallback(
    (name: string, bytes: Uint8Array) => {
      if (/\.xlsx$/i.test(name)) void kept(bytes)
      // An export (PDF): the player's copy.
      else
        downloadFile(
          fileName(title, name.split('.').pop() ?? 'pdf'),
          bytes,
          'application/pdf',
        )
    },
    [kept, title],
  )

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
        fileName(title, kind),
        base64ToBytes(reply.base64),
        kind === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
    } catch (error) {
      setNotice(`That did not work: ${String(error)}`)
    }
  }

  async function importFile(file: File) {
    if (!api) return
    if (
      !window.confirm(
        `Replace this workbook with ${file.name}? The current one stays in Version history.`,
      )
    )
      return
    try {
      const base64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()))
      await api.execute('file.open', { name: file.name, base64 })
      await save()
      setNotice(`${file.name} was imported.`)
    } catch (error) {
      setNotice(`${file.name} could not be opened: ${String(error)}`)
    }
  }

  const info = CRAFTS.gridcraft
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col ${hidden ? 'hidden' : ''}`}
      data-testid="gridcraft-editor"
      data-phase={phase}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
        <span className="font-medium text-emerald-800">{info.title}</span>
        <button
          type="button"
          className="rounded px-2 py-0.5 hover:bg-slate-200"
          onClick={() => void download('xlsx')}
          disabled={phase !== 'ready'}
        >
          Download .xlsx
        </button>
        <button
          type="button"
          className="rounded px-2 py-0.5 hover:bg-slate-200"
          onClick={() => void download('csv')}
          disabled={phase !== 'ready'}
        >
          Download .csv
        </button>
        <button
          type="button"
          className="rounded px-2 py-0.5 hover:bg-slate-200"
          onClick={() => void download('pdf')}
          disabled={phase !== 'ready'}
        >
          Export PDF
        </button>
        <button
          type="button"
          className="rounded px-2 py-0.5 hover:bg-slate-200"
          onClick={() => importInput.current?.click()}
          disabled={phase !== 'ready'}
        >
          Import a file…
        </button>
        <input
          ref={importInput}
          type="file"
          accept={IMPORT_TYPES}
          className="hidden"
          aria-label="Import a spreadsheet file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void importFile(file)
          }}
        />
        {phase === 'ready' && (
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
        )}
        {notice && (
          <span role="status" className="text-slate-700">
            {notice}
          </span>
        )}
        <span className="ml-auto text-slate-400">
          {info.title} {installed.version}, based on {info.basedOn} ·{' '}
          <a
            className="underline hover:text-slate-600"
            href={`${craftBase('gridcraft')}NOTICE`}
            target="_blank"
            rel="noreferrer"
          >
            licence
          </a>
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <CraftFrame
          app="gridcraft"
          author={author}
          onReady={setApi}
          onSave={onSave}
          onDirty={onDirty}
          onFailed={onFailed}
        />
        {phase !== 'ready' && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white/90 text-sm text-slate-600"
            role="status"
          >
            {phase === 'starting' ? `Starting ${info.title}…` : 'Opening your workbook…'}
          </div>
        )}
      </div>
    </div>
  )
}
