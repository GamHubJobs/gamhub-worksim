/**
 * FreeCAD, the 3D modelling workstation. FreeCAD is a free desktop
 * application (freecad.org): it cannot run inside the game, so the game and
 * the player's own FreeCAD exchange files (src/engineering/cad/freecad.ts).
 * Here: what to install, the project's macro, importing what it exports (the
 * design data becomes a draft revision; the model is checked against it and
 * shown in 3D), and the models imported so far.
 */
import { lazy, Suspense, useEffect, useState } from 'react'
import { exchangeName, freecadMacro, readExchange } from '../../engineering/cad/freecad'
import {
  meshMatches,
  readObj,
  readStl,
  MAX_MODEL_BYTES,
  type MeshInfo,
} from '../../engineering/cad/mesh'
import { getBrief } from '../../engineering/briefs'
import type { Design } from '../../engineering/design'
import { latest, submitted } from '../../engineering/engine'
import type { ProjectState } from '../../engineering/state'
import {
  createCadFile,
  readCadFile,
  type CadFile,
} from '../../persistence/engineeringFiles'
import { BUTTON, Card, PRIMARY } from './parts'
import { download } from './helpers'
import type { ImportedModel } from './ModelViewer'

const ModelViewer = lazy(() => import('./ModelViewer'))

interface Props {
  project: ProjectState
  owner: string
  onDesign: (design: Design, note: string) => void
  onModel: (model: ProjectState['files']['models'][number]) => void
}

/** What FreeCAD exports (a drawing is not among them). */
type ModelFormat = Exclude<CadFile['format'], 'dxf'>

type Picked = {
  name: string
  format: ModelFormat
  text?: string
  bytes?: Uint8Array
}

const FORMATS: Record<string, ModelFormat> = {
  json: 'json',
  obj: 'obj',
  stl: 'stl',
  step: 'step',
  stp: 'step',
  fcstd: 'fcstd',
}

function base64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
}

export function FreeCadTab({ project, owner, onDesign, onModel }: Props) {
  const brief = getBrief(project.id)!
  const working = latest(project)
  const locked = !!submitted(project)
  const [report, setReport] = useState<
    Array<{ tone: 'ok' | 'bad' | 'info'; text: string }>
  >([])
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState<ImportedModel | null>(null)
  const [showDesign, setShowDesign] = useState(true)

  // Show the latest imported mesh.
  useEffect(() => {
    const mesh = [...project.files.models]
      .reverse()
      .find((m) => m.format === 'obj' || m.format === 'stl')
    if (!mesh) return
    let live = true
    void readCadFile(mesh.document).then((file) => {
      if (!live || !file) return
      setViewing(
        file.format === 'obj'
          ? { format: 'obj', data: file.data }
          : { format: 'stl', data: fromBase64(file.data) },
      )
    })
    return () => {
      live = false
    }
  }, [project.files.models])

  function macro() {
    const text = freecadMacro(working.design, {
      project: project.id,
      title: brief.title,
      revision: working.n,
    })
    download(`${exchangeName(project.id, working.n)}.FCMacro`, text, 'text/x-python')
  }

  async function importFiles(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    const notes: typeof report = []
    try {
      const picked: Picked[] = []
      for (const f of Array.from(list)) {
        const lower = f.name.toLowerCase()
        const ext = lower.endsWith('.worksim.json')
          ? 'json'
          : (lower.split('.').pop() ?? '')
        const format = FORMATS[ext]
        if (!format) {
          notes.push({
            tone: 'bad',
            text: `${f.name}: not a file WorkSim takes from FreeCAD (.worksim.json, .obj, .stl, .step, .FCStd).`,
          })
          continue
        }
        if (f.size > MAX_MODEL_BYTES) {
          notes.push({
            tone: 'bad',
            text: `${f.name} is ${(f.size / 1048576).toFixed(1)} MB: the largest WorkSim keeps is ${MAX_MODEL_BYTES / 1048576} MB.`,
          })
          continue
        }
        const bytes = new Uint8Array(await f.arrayBuffer())
        picked.push({
          name: f.name,
          format,
          ...(format === 'json' || format === 'obj'
            ? { text: new TextDecoder().decode(bytes) }
            : { bytes }),
        })
      }
      // The design data first: the mesh is checked against it.
      const data = picked.find((p) => p.format === 'json')
      let design: Design = working.design
      let revisionFor = working.n
      let dataOk = false
      if (data) {
        const read = readExchange(data.text ?? '', project.id)
        dataOk = read.ok
        if (!read.ok)
          notes.push({
            tone: 'bad',
            text: `${data.name}: ${read.error} The design is unchanged.`,
          })
        else {
          design = read.design
          revisionFor = read.basedOn
          if (read.model?.invalid?.length)
            notes.push({
              tone: 'bad',
              text: `FreeCAD could not recompute ${read.model.invalid.join(', ')}: check the Params cells, then export again.`,
            })
          if (read.basedOn < working.n)
            notes.push({
              tone: 'info',
              text: `This export was made from revision ${read.basedOn}; the design is now at revision ${working.n}. It is used as the new draft.`,
            })
          if (locked)
            notes.push({
              tone: 'info',
              text: 'A revision is being checked: import again once it comes back to use this design.',
            })
          else if (JSON.stringify(read.design) === JSON.stringify(working.design))
            notes.push({
              tone: 'ok',
              text: `${data.name}: the design matches the current revision.`,
            })
          else {
            onDesign(read.design, `From FreeCAD ${read.freecad ?? ''}`.trim())
            notes.push({
              tone: 'ok',
              text: `${data.name}: read from FreeCAD ${read.freecad ?? ''}. It is now the draft revision: check it and submit it as usual.`,
            })
          }
        }
      }
      for (const p of picked) {
        // The data file is kept with the project only when it could be read.
        if (p.format === 'json' && (p !== data || !dataOk)) continue
        let info: MeshInfo | null = null
        if (p.format === 'obj' || p.format === 'stl') {
          try {
            info = p.format === 'obj' ? readObj(p.text ?? '') : readStl(p.bytes!)
          } catch (error) {
            notes.push({
              tone: 'bad',
              text: `${p.name}: ${error instanceof Error ? error.message : String(error)}.`,
            })
            continue
          }
          const match = meshMatches(info, design)
          notes.push({
            tone: match.ok ? 'ok' : 'bad',
            text: `${p.name}: ${info.triangles} triangles. ${match.message}`,
          })
          if (!data)
            notes.push({
              tone: 'info',
              text: 'A model without its .worksim.json is kept as a reference: the design is unchanged.',
            })
        }
        const document = await createCadFile(owner, {
          project: project.id,
          role: 'model',
          format: p.format,
          name: p.name,
          data: p.text ?? base64(p.bytes!),
          encoding: p.text !== undefined ? 'text' : 'base64',
          revision: Math.max(1, revisionFor),
          basis: '',
        })
        onModel({
          document,
          name: p.name,
          format: p.format,
          revision: Math.max(1, revisionFor),
          at: 0,
        })
        if (p.format === 'obj') setViewing({ format: 'obj', data: p.text ?? '' })
        if (p.format === 'stl') setViewing({ format: 'stl', data: p.bytes! })
        if (p.format === 'step' || p.format === 'fcstd')
          notes.push({
            tone: 'info',
            text: `${p.name} is kept with the project's files (download it any time).`,
          })
      }
      if (
        !data &&
        !picked.some((p) => p.format === 'obj' || p.format === 'stl') &&
        picked.length
      )
        notes.push({
          tone: 'info',
          text: 'Nothing to read the design from: import the .worksim.json the macro wrote.',
        })
    } finally {
      setReport(notes)
      setBusy(false)
    }
  }

  async function downloadModel(m: ProjectState['files']['models'][number]) {
    const file = await readCadFile(m.document)
    if (!file) return
    download(file.name, file.encoding === 'text' ? file.data : fromBase64(file.data))
  }

  return (
    <div
      className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-[380px_minmax(0,1fr)]"
      data-testid="freecad-tab"
    >
      <div className="space-y-3">
        <Card title="FreeCAD: 3D modelling">
          <p className="text-sm text-slate-700">
            FreeCAD is a free, open-source 3D CAD program for your computer. It runs
            outside the game: WorkSim gives it your design as a macro, and takes back what
            you model.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>
              Install FreeCAD from <span className="font-medium">freecad.org</span> (free;
              tested with FreeCAD 1.1.4). WorkSim never installs or runs it for you.
            </li>
            <li>Download this project's macro (below).</li>
            <li>
              In FreeCAD: <span className="font-medium">Macro › Macros…</span>, add the
              file (or Create and paste it), then{' '}
              <span className="font-medium">Execute</span>. It builds a parametric model.
            </li>
            <li>
              Change dimensions in the <span className="font-medium">Params</span>{' '}
              spreadsheet and press Recompute: the model follows. Measure, section and
              draw it (TechDraw) as you like.
            </li>
            <li>
              Execute the macro again: it exports to{' '}
              <span className="font-mono text-xs">WorkSim</span> in your home folder.
              Import the <span className="font-mono text-xs">.worksim.json</span> and the{' '}
              <span className="font-mono text-xs">.obj</span> here.
            </li>
          </ol>
          <button
            type="button"
            className={`${PRIMARY} mt-3`}
            onClick={macro}
            data-testid="freecad-macro"
          >
            Download the macro (revision {working.n})
          </button>
        </Card>
        <Card title="Import from FreeCAD">
          <label className={`${BUTTON} inline-block cursor-pointer`}>
            {busy ? 'Reading…' : 'Choose files…'}
            <input
              type="file"
              multiple
              accept=".json,.obj,.stl,.step,.stp,.fcstd,.FCStd"
              className="sr-only"
              data-testid="freecad-import"
              onChange={(e) => {
                void importFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          <ul
            className="mt-2 space-y-1 text-xs"
            data-testid="freecad-report"
            aria-live="polite"
          >
            {report.map((r, i) => (
              <li
                key={i}
                className={
                  r.tone === 'bad'
                    ? 'text-red-800'
                    : r.tone === 'ok'
                      ? 'text-emerald-800'
                      : 'text-slate-700'
                }
              >
                {r.text}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Models and files from FreeCAD">
          {project.files.models.length === 0 ? (
            <p className="text-xs text-slate-500">None yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {[...project.files.models].reverse().map((m) => (
                <li key={m.document} className="flex items-center justify-between gap-2">
                  <span>
                    {m.name}{' '}
                    <span className="text-slate-500">(revision {m.revision})</span>
                  </span>
                  <button
                    type="button"
                    className="text-blue-700 underline"
                    onClick={() => void downloadModel(m)}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="flex min-h-[360px] flex-col gap-2">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>
            The design (grey){' '}
            {viewing
              ? 'and the imported model (orange)'
              : '— import a model to compare it'}
          </span>
          <label className="ml-auto flex items-center gap-1">
            <input
              type="checkbox"
              checked={showDesign}
              onChange={(e) => setShowDesign(e.target.checked)}
            />{' '}
            Show the design
          </label>
        </div>
        <div className="min-h-0 flex-1 rounded-md border border-slate-300">
          <Suspense
            fallback={<p className="p-4 text-sm text-slate-500">Opening the 3D view…</p>}
          >
            <ModelViewer
              design={working.design}
              model={viewing}
              showDesign={showDesign}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
