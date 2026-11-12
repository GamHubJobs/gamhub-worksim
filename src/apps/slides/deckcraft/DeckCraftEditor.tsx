/**
 * A presentation open in Deck Craft, the office's presentation app (the
 * shared session and window: src/apps/craft/).
 *
 * - The presentation opens from its kept .pptx file, or is built from
 *   WorkSim's presentation by Deck Craft's commands (convert.ts) when there is
 *   none yet or it no longer matches (a task's starting slides, a template, an
 *   edit in the basic editor). Either way it is handed to Deck Craft as a
 *   .pptx file by the host message, so Deck Craft's own Save (Ctrl+S) hands
 *   back the same .pptx.
 * - Each save keeps the .pptx file, and WorkSim's presentation read from Deck
 *   Craft's inspection of each slide, for grading, WorkSim AI and exports.
 * - Charts and tables from Grid Craft go in through the window's picker, as a
 *   real Deck Craft chart (with its data) and table.
 * - Present runs Deck Craft's own slide show, full screen.
 * - WorkSim AI sees the presentation and the selected text, and may propose
 *   text, which is typed in only when the player applies it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AskAiMenu } from '../../ai/AskAiMenu'
import { useAiApply, useAiContext } from '../../ai/hub'
import { base64ToBytes, bytesToBase64 } from '../../../lib/base64'
import { downloadFile } from '../../../lib/download'
import type { ChartSpec, SlidesContent } from '../../../persistence/schemas'
import type { CraftApi } from '../../craft/CraftFrame'
import { CraftShell } from '../../craft/CraftShell'
import { craftFileName, type Installed } from '../../craft/crafts'
import { useCraftSession, type CraftAdapter } from '../../craft/useCraftSession'
import type { PickerMode } from '../../shared/SheetsPicker'
import { slideText } from '../model'
import {
  buildDeck,
  chartParams,
  deckToSlides,
  slidesFingerprint,
  type InspectedSlide,
} from './convert'

const IMPORT_TYPES = '.pptx,.potx,.ppsx,.deckcraft,.txt,.md,.rtf'
const PPTX_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
/** How long Deck Craft may take to open a file it is handed. */
const OPEN_TIMEOUT_MS = 30_000

export interface DeckCraftEditorProps {
  installed: Installed
  title: string
  author: string
  content: SlidesContent
  contentEpoch: number
  onReplace: (next: SlidesContent) => void
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

interface UiState {
  documents?: Array<{ path: string | null; title: string }>
  showing?: unknown
}

interface DeckState {
  dirty?: boolean
  theme?: string
  slides?: unknown[]
  selection?: { text?: string | null; slide?: number }
  /** The file the presentation is saved as (null before it is saved). */
  path?: string | null
}

const ui = async (api: CraftApi) => (await api.request('ui.inspect', {})) as UiState

/**
 * Opens a file in Deck Craft in place of what is open: everything open is
 * closed, then the file is handed over by the host message (so it keeps its
 * name), and is open once Deck Craft lists it.
 */
async function openInPlace(api: CraftApi, name: string, bytes: Uint8Array) {
  for (let n = 0; n < 20 && ((await ui(api)).documents?.length ?? 0) > 0; n++)
    await api.execute('file.close', {})
  api.open(name, bytes)
  const until = Date.now() + OPEN_TIMEOUT_MS
  for (;;) {
    const open = (await ui(api)).documents ?? []
    if (open.length > 0) break
    if (Date.now() > until) throw new Error(`${name} did not open`)
    await new Promise((resolve) => window.setTimeout(resolve, 100))
  }
  // Closing the last presentation shows File › Home; show the slides.
  await api.execute('app.backstage', { on: false }).catch(() => {})
}

/** The presentation as a .pptx, from Deck Craft. */
async function pptxBytes(api: CraftApi): Promise<Uint8Array> {
  const reply = (await api.execute('file.saveBytes', { format: 'pptx' })) as {
    data?: string
  }
  if (!reply.data) throw new Error('Deck Craft did not hand over the .pptx')
  return base64ToBytes(reply.data)
}

/** How Deck Craft opens, builds, saves and reads back a presentation. */
function deckCraftAdapter(title: string): CraftAdapter<SlidesContent> {
  const name = craftFileName(title, 'pptx', 'Presentation')
  return {
    title: 'Deck Craft',
    keptFile: (content) =>
      content.file?.format === 'pptx' && content.file.basis === slidesFingerprint(content)
        ? { name, base64: content.file.data }
        : null,
    openFile: async (api, file, base64) => {
      const bytes = base64ToBytes(base64)
      // A .pptx opens as this presentation's file (under its name). Any other
      // (a template, a show, an outline, a .deckcraft file) opens as itself,
      // then is kept as this presentation's .pptx.
      if (/\.pptx$/i.test(file)) return openInPlace(api, name, bytes)
      await openInPlace(api, file, bytes)
      await openInPlace(api, name, await pptxBytes(api))
    },
    build: async (api, content) => {
      await api.execute('file.new', { blank: true })
      const problems = await buildDeck(
        (command, params) => api.execute(command, params),
        content,
      )
      if (problems.length) console.warn('Deck Craft: parts not built.', problems)
      await openInPlace(api, name, await pptxBytes(api))
      return null
    },
    requestSave: async (api) => {
      // Saved by the player as Deck Craft's own format (Save As .deckcraft):
      // opened again as this presentation's .pptx, so its Save hands that over.
      const deck = (await api.inspect()) as DeckState
      if (!/\.pptx$/i.test(deck.path ?? ''))
        await openInPlace(api, name, await pptxBytes(api))
      await api.execute('file.save', {})
    },
    isDirty: async (api) => ((await api.inspect()) as DeckState).dirty === true,
    isDocument: (file) => /\.pptx$/i.test(file),
    read: async (api, bytes, previous) => {
      const deck = (await api.inspect()) as DeckState
      const inspected = (await Promise.all(
        (deck.slides ?? []).map((_, index) => api.execute('slide.inspect', { index })),
      )) as InspectedSlide[]
      const content = deckToSlides(inspected, deck.theme, previous)
      return {
        ...content,
        file: {
          format: 'pptx',
          app: 'deckcraft',
          data: bytesToBase64(bytes),
          basis: slidesFingerprint(content),
        },
      }
    },
  }
}

export function DeckCraftEditor({
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
}: DeckCraftEditorProps) {
  const [notice, setNotice] = useState<string | null>(null)
  const adapter = useMemo(() => deckCraftAdapter(title), [title])
  const saveRef = useRef<() => Promise<boolean>>(async () => true)
  const onExport = useCallback(
    (file: string, bytes: Uint8Array) => {
      const extension = file.split('.').pop()?.toLowerCase() ?? ''
      // The player saved in Deck Craft's own format (Save As .deckcraft):
      // keep the presentation, as its .pptx (see requestSave).
      if (extension === 'deckcraft') {
        void saveRef.current()
        return
      }
      downloadFile(
        craftFileName(title, extension, 'Presentation'),
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
        .inspect()
        .then((deck) => {
          const text = (deck as DeckState).selection?.text
          selected.current = typeof text === 'string' ? text.trim() : ''
        })
        .catch(() => {})
    void look()
    const timer = window.setInterval(look, 1000)
    return () => window.clearInterval(timer)
  }, [api, phase, hidden])

  useAiContext(
    'slides',
    phase === 'ready'
      ? () => {
          const slides = content.slides.map((slide) => {
            const text = slideText(slide)
            const heading = slide.elements.find(
              (e) => e.type === 'text' && e.role === 'title' && e.text.trim(),
            )
            return {
              title:
                heading?.type === 'text' ? heading.text : (text.split('\n')[0] ?? ''),
              text,
              words: text.split(/\s+/).filter(Boolean).length,
            }
          })
          return [
            ...(selected.current
              ? [
                  {
                    kind: 'selection' as const,
                    label: 'Selected text',
                    text: selected.current,
                  },
                ]
              : []),
            {
              kind: 'slides' as const,
              label: 'The presentation',
              text: slides
                .map((s, i) => `Slide ${i + 1}:\n${s.text || '(empty)'}`)
                .join('\n\n'),
              data: { slides: slides.map(({ title, words }) => ({ title, words })) },
            },
          ]
        }
      : null,
  )
  useAiApply('slides', phase === 'ready' ? ['text'] : null, (proposal) => {
    if (proposal.kind !== 'text' || !api) return false
    api.execute('text.insert', { text: proposal.text }).then(
      () => setNotice(null),
      () => setNotice('Click into a text box on the slide first, then apply the text.'),
    )
    return true
  })

  async function insertChart(chart: ChartSpec) {
    if (!api) return
    const reply = (await api.execute(
      'insert.chart',
      chartParams(chart, [180, 110, 600, 360]),
    )) as {
      id?: number
    }
    // Its title, or none (not Deck Craft's placeholder "Chart Title").
    if (reply.id !== undefined)
      await api.execute('chart.options', { title: chart.title || null, id: reply.id })
  }

  async function insertTable(rows: string[][]) {
    if (!api || rows.length === 0) return
    const columns = Math.max(...rows.map((row) => row.length))
    const reply = (await api.execute('insert.table', {
      rows: rows.length,
      cols: columns,
    })) as { id?: number }
    for (const [r, row] of rows.entries())
      for (const [c, value] of row.entries())
        if (value)
          await api.execute('text.set', { id: reply.id, text: value, cell: [r, c] })
  }

  /** Deck Craft's slide show, full screen (Escape leaves it). */
  function present(from: 'start' | 'current') {
    if (!api) return
    const frame = document.querySelector<HTMLIFrameElement>(
      '[data-testid="craft-deckcraft"]',
    )
    // Full screen needs the click itself: ask before anything is awaited.
    frame?.requestFullscreen?.().catch(() => {})
    // The show takes the keyboard (arrows, Space, Escape) at once.
    api.focus()
    void api
      .execute(from === 'start' ? 'show.fromStart' : 'show.fromCurrent', {})
      .catch((error: unknown) =>
        setNotice(`The slide show did not start: ${String(error)}`),
      )
  }

  // Leaving full screen ends the slide show; ending the show leaves full screen.
  useEffect(() => {
    if (!api) return
    const left = () => {
      if (!document.fullscreenElement)
        void ui(api).then((state) => {
          if (state.showing) void api.execute('show.end', {}).catch(() => {})
        })
    }
    document.addEventListener('fullscreenchange', left)
    const timer = window.setInterval(() => {
      const element = document.fullscreenElement
      if (!element || element.getAttribute('data-testid') !== 'craft-deckcraft') return
      void ui(api)
        .then((state) => {
          if (!state.showing && document.fullscreenElement === element)
            void document.exitFullscreen().catch(() => {})
        })
        .catch(() => {})
    }, 500)
    return () => {
      document.removeEventListener('fullscreenchange', left)
      window.clearInterval(timer)
    }
  }, [api])

  async function download(kind: 'pptx' | 'pdf') {
    if (!api) return
    setNotice(null)
    try {
      if (kind === 'pdf') {
        // Deck Craft's Print hands over a PDF of the slides (onExport downloads it).
        await api.execute('app.print', {})
        return
      }
      if (!(await save())) throw new Error('the presentation could not be saved')
      const file = content.file
      if (file?.format === 'pptx')
        downloadFile(
          craftFileName(title, 'pptx', 'Presentation'),
          base64ToBytes(file.data),
          PPTX_TYPE,
        )
    } catch (error) {
      setNotice(`That did not work: ${String(error)}`)
    }
  }

  async function importPresentation(file: File) {
    if (
      !window.confirm(
        `Replace this presentation with ${file.name}? The current one stays in Version history.`,
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
      app="deckcraft"
      installed={installed}
      author={author}
      phase={phase}
      hidden={hidden}
      testId="deckcraft-editor"
      opening="Opening your presentation…"
      actions={[
        { label: 'Present', run: () => present('start') },
        { label: 'Present from this slide', run: () => present('current') },
        { label: 'Insert chart from Grid Craft', run: () => fromSheets('chart') },
        { label: 'Insert table from Grid Craft', run: () => fromSheets('table') },
        { label: 'Download .pptx', run: () => void download('pptx') },
        { label: 'Export PDF', run: () => void download('pdf') },
      ]}
      importTypes={IMPORT_TYPES}
      importLabel="Import a presentation file"
      onImport={(file) => void importPresentation(file)}
      ai={
        <AskAiMenu
          app="slides"
          compact
          actions={[
            {
              label: 'Review my presentation',
              question: 'Review my presentation',
              action: 'review-slides',
            },
            {
              label: 'Suggest an outline',
              question: 'Suggest a presentation outline',
              action: 'outline',
            },
            { label: 'Help me write speaker notes', action: 'speaker-notes' },
            { label: 'Summarise the presentation', action: 'summarise' },
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
