/**
 * CAD Craft, the drafting workstation: the real CAD Craft (CADCraft's
 * official web build, see docs/CRAFT_APPS.md) with the project's drawing
 * open. The drawing is made from the design; what the player draws is read
 * back from it (a few seconds after each change, and on Save) and becomes
 * the design's draft revision. A drawing that cannot be read as a design yet
 * is still kept, and the reason shown.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { CraftFrame, type CraftApi } from '../craft/CraftFrame'
import { craftAvailable, CRAFTS, markFailed, type Installed } from '../craft/crafts'
import { designToDxf, dxfToDesign, LAYERS } from '../../engineering/cad/dxf'
import type { Design } from '../../engineering/design'
import { getBrief } from '../../engineering/briefs'
import { latest, submitted } from '../../engineering/engine'
import type { ProjectState } from '../../engineering/state'
import { fingerprintValue } from '../../lib/fingerprint'
import {
  createCadFile,
  readCadFile,
  updateCadFile,
  type CadFile,
} from '../../persistence/engineeringFiles'
import { BUTTON } from './parts'
import { download } from './helpers'

interface Props {
  project: ProjectState
  owner: string
  author: string
  onDesign: (design: Design, note: string) => void
  onDrawing: (document: string) => void
  /** Where to make the design without CAD Craft. */
  onUsePlanEditor: () => void
}

/** How long after a change the drawing is read back (ms). */
const READ_AFTER_MS = 2500

function decode(base64: string): string {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('windows-1252').decode(bytes)
}

export function CadCraftTab({
  project,
  owner,
  author,
  onDesign,
  onDrawing,
  onUsePlanEditor,
}: Props) {
  const brief = getBrief(project.id)!
  const working = latest(project)
  const locked = !!submitted(project)
  const [installed, setInstalled] = useState<Installed | null | 'checking'>('checking')
  const [failed, setFailed] = useState<string | null>(null)
  const [file, setFile] = useState<{ id: string; cad: CadFile } | null>(null)
  const [status, setStatus] = useState<{
    tone: 'ok' | 'bad' | 'info'
    text: string
  } | null>(null)
  const api = useRef<CraftApi | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const latestRef = useRef({ project, working, file, locked })
  useEffect(() => {
    latestRef.current = { project, working, file, locked }
  })

  useEffect(() => {
    let live = true
    void craftAvailable('cadcraft').then((i) => live && setInstalled(i))
    return () => {
      live = false
    }
  }, [])

  const name = `${project.id}-r${working.n}.dxf`
  const info = {
    project: brief.title,
    client: brief.client.organisation,
    revision: working.n,
    status: working.status === 'approved' ? 'Approved' : 'Draft',
  }

  // The drawing: kept, or made from the design. Made again when the design was changed elsewhere.
  useEffect(() => {
    let live = true
    void (async () => {
      const basis = fingerprintValue(working.design)
      const kept = project.files.drawing ? await readCadFile(project.files.drawing) : null
      if (!live) return
      if (kept && project.files.drawing && kept.basis === basis) {
        setFile({ id: project.files.drawing, cad: kept })
        return
      }
      const cad: CadFile = {
        project: project.id,
        role: 'drawing',
        format: 'dxf',
        name,
        data: designToDxf(working.design, info),
        encoding: 'text',
        revision: working.n,
        basis,
      }
      if (kept && project.files.drawing) {
        await updateCadFile(project.files.drawing, cad)
        if (!live) return
        setFile({ id: project.files.drawing, cad })
        setStatus({
          tone: 'info',
          text: `Redrawn from revision ${working.n}: the design was changed outside CAD Craft.`,
        })
      } else {
        const id = await createCadFile(owner, cad)
        if (!live) return
        onDrawing(id)
        setFile({ id, cad })
      }
    })()
    return () => {
      live = false
    }
    // Only when the design itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprintValue(working.design), project.files.drawing])

  // Opens the drawing in CAD Craft once both are ready (and again when it is redrawn).
  const opened = useRef<string | null>(null)
  const open = useCallback(() => {
    const target = api.current
    const current = latestRef.current.file
    if (!target || !current) return
    const key = `${current.id}:${current.cad.basis}:${current.cad.data.length}`
    if (opened.current === key) return
    opened.current = key
    void target.execute('file.close', { all: true }).catch(() => {})
    target.open(current.cad.name, new TextEncoder().encode(current.cad.data))
  }, [])
  useEffect(() => {
    if (file && api.current && opened.current === null) open()
  }, [file, open])

  /** Reads the drawing in CAD Craft back as the design. */
  const readBack = useCallback(
    async (text?: string) => {
      const { working: w, file: f, locked: isLocked } = latestRef.current
      const target = api.current
      if (!f) return
      try {
        if (text === undefined) {
          if (!target) return
          const reply = (await target.execute('document.bytes', {})) as { data?: string }
          if (!reply?.data) throw new Error('CAD Craft did not hand the drawing over')
          text = decode(reply.data)
        }
        const read = dxfToDesign(text, w.design)
        if (!read.ok) {
          const kept = { ...f.cad, data: text }
          await updateCadFile(f.id, kept)
          setFile({ id: f.id, cad: kept })
          setStatus({
            tone: 'bad',
            text: `Your drawing is kept, but the design is unchanged: ${read.error}`,
          })
          return
        }
        const changed = JSON.stringify(read.design) !== JSON.stringify(w.design)
        if (changed && isLocked) {
          setStatus({
            tone: 'info',
            text: 'Revision being checked: your drawing is kept and will be read when the check is over.',
          })
          const kept = { ...f.cad, data: text }
          await updateCadFile(f.id, kept)
          return
        }
        const kept = { ...f.cad, data: text, basis: fingerprintValue(read.design) }
        await updateCadFile(f.id, kept)
        // The redraw effect must not replace what the player drew.
        opened.current = `${f.id}:${kept.basis}:${kept.data.length}`
        setFile({ id: f.id, cad: kept })
        if (changed) {
          onDesign(read.design, read.notes.join(' '))
          setStatus({
            tone: 'ok',
            text: `Read from the drawing: the draft revision now follows it.${read.notes.length ? ` ${read.notes.join(' ')}` : ''}`,
          })
        } else setStatus({ tone: 'ok', text: 'The drawing and the design agree.' })
      } catch (error) {
        setStatus({
          tone: 'bad',
          text: `Could not read the drawing: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    },
    [onDesign],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (installed === 'checking')
    return <p className="p-4 text-sm text-slate-600">Starting CAD Craft…</p>
  if (!installed || failed)
    return (
      <div
        className="max-w-xl space-y-3 p-4 text-sm text-slate-700"
        data-testid="cadcraft-unavailable"
      >
        <p className="font-medium text-slate-900">
          CAD Craft is not available on this device.
        </p>
        <p>
          {failed ??
            'It is not installed, the device cannot draw it (it needs WebGPU or WebGL2), or the basic editors are chosen in Settings.'}
        </p>
        <p>
          The plan editor makes the same design, and the drawing can be downloaded for any
          CAD program.
        </p>
        <div className="flex gap-2">
          <button type="button" className={BUTTON} onClick={onUsePlanEditor}>
            Use the plan editor
          </button>
          {file && (
            <button
              type="button"
              className={BUTTON}
              onClick={() => download(file.cad.name, file.cad.data, 'image/vnd.dxf')}
            >
              Download the drawing (.dxf)
            </button>
          )}
        </div>
      </div>
    )

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="cadcraft-tab">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
        <span className="font-medium text-slate-800">{name}</span>
        <span className="text-slate-500">
          {CRAFTS.cadcraft.title} {installed.version}, based on {CRAFTS.cadcraft.basedOn}{' '}
          ·{' '}
          <a
            className="underline"
            href="crafts/cadcraft/NOTICE"
            target="_blank"
            rel="noreferrer"
          >
            licence
          </a>
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className={`${BUTTON} text-xs`}
            onClick={() => void readBack()}
            data-testid="cad-read"
          >
            Read the drawing now
          </button>
          <button
            type="button"
            className={`${BUTTON} text-xs`}
            disabled={!file}
            onClick={() =>
              file && download(file.cad.name, file.cad.data, 'image/vnd.dxf')
            }
          >
            Download .dxf
          </button>
          <details className="relative">
            <summary className={`${BUTTON} cursor-pointer list-none text-xs`}>
              How to draw for WorkSim
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-96 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg">
              <p className="mb-1">The layers are what WorkSim reads:</p>
              <ul className="space-y-0.5">
                {[
                  'WS-OUTLINE',
                  'WS-DOOR',
                  'WS-WINDOW',
                  'WS-COLUMN',
                  'WS-TAG',
                  'WS-SPEC',
                  'WS-DECK',
                  'WS-GIRDER',
                ].map((l) => (
                  <li key={l}>
                    <span className="font-mono">{l}</span>: {LAYERS[l].note}
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                Draw a window as a line along a wall's centreline on WS-WINDOW (snap to
                the wall with ENDpoint and NEArest); label it on WS-TAG, e.g.{' '}
                <span className="font-mono">W4 H1050 S1200</span>. Change sizes in the
                WS-SPEC text. Everything else is your drawing and is kept as drawn.
              </p>
            </div>
          </details>
        </div>
      </div>
      {status && (
        <p
          className={`px-3 py-1.5 text-xs ${status.tone === 'bad' ? 'bg-red-50 text-red-800' : status.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'}`}
          role="status"
          data-testid="cad-status"
        >
          {status.text}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <CraftFrame
          app="cadcraft"
          author={author}
          onReady={(a) => {
            api.current = a
            open()
          }}
          onSave={(fileName, bytes) => {
            if (fileName.toLowerCase().endsWith('.dxf'))
              void readBack(new TextDecoder('windows-1252').decode(bytes))
            else download(fileName, bytes)
          }}
          onDirty={(dirty) => {
            if (!dirty) return
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => void readBack(), READ_AFTER_MS)
          }}
          onFailed={(reason) => {
            markFailed('cadcraft')
            setFailed(reason)
          }}
        />
      </div>
    </div>
  )
}
