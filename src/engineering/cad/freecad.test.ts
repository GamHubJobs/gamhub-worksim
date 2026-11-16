import { describe, expect, it } from 'vitest'
import { getBrief } from '../briefs'
import type { BuildingDesign } from '../design'
import { correctedYardStore } from '../testDesigns'
import { exchangeName, freecadMacro, parameters, readExchange } from './freecad'
import { meshMatches, readObj, readStl } from './mesh'

import EXPORT_JSON from './fixtures/yard-store-r2.worksim.json?raw'
import EXPORT_OBJ from './fixtures/yard-store-r2.obj?raw'

describe('the FreeCAD macro', () => {
  it('names every dimension in the Params spreadsheet', () => {
    const cells = parameters(correctedYardStore()).map((c) => c[0])
    expect(cells).toEqual(
      expect.arrayContaining([
        'wall_t',
        'p0_x',
        'p3_y',
        'w3_width',
        'd1_height',
        'found_d',
      ]),
    )
  })

  it('carries the project, the revision and the design', () => {
    const macro = freecadMacro(correctedYardStore(), {
      project: 'yard-store',
      title: 'Yard store',
      revision: 3,
    })
    expect(macro).toContain('PROJECT = "yard-store"')
    expect(macro).toContain('REVISION = 3')
    expect(macro).toContain('yard-store-r3.worksim.json')
    expect(macro).toContain('Spreadsheet::Sheet')
    // The walls follow the spreadsheet through expressions.
    expect(macro).toContain('abs(Params.p1_x - Params.p0_x) + Params.wall_t')
  })
})

describe('importing a FreeCAD export', () => {
  it('reads the real export of the yard store (made with FreeCAD 1.1.4)', () => {
    const text = EXPORT_JSON
    const read = readExchange(text, 'yard-store')
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.basedOn).toBe(2)
    expect(read.freecad).toMatch(/^1\./)
    const design = read.design as BuildingDesign
    // A window was made wider in FreeCAD's spreadsheet before exporting.
    expect(design.openings.find((o) => o.id === 'W1')?.width).toBe(1500)
    const mesh = readObj(EXPORT_OBJ)
    expect(mesh.triangles).toBeGreaterThan(100)
    expect(read.model?.objects).toContain('Roof')
    expect(meshMatches(mesh, design).ok).toBe(true)
  })

  it('refuses a damaged file, another project’s export and an invalid design', () => {
    expect(readExchange('{not json', 'yard-store')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/not valid JSON/),
    })
    expect(readExchange('{"hello": 1}', 'yard-store')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/not a WorkSim/),
    })
    const text = EXPORT_JSON
    expect(readExchange(text, 'mill-footbridge')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/another project/),
    })
    const broken = JSON.parse(text)
    broken.design.wall.thickness = -5
    expect(readExchange(JSON.stringify(broken), 'yard-store')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/wall\.thickness/),
    })
  })

  it('reports a mesh that does not match the design', () => {
    const mesh = readObj(EXPORT_OBJ)
    const bridge = getBrief('mill-footbridge')!.concept
    expect(meshMatches(mesh, bridge).ok).toBe(false)
  })

  it('reads ASCII and binary STL', () => {
    const ascii = new TextEncoder().encode(
      'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1000 0 0\nvertex 0 2000 300\nendloop\nendfacet\nendsolid t\n',
    )
    expect(readStl(ascii).bounds).toMatchObject({ x1: 1000, y1: 2000, z1: 300 })
    const bin = new Uint8Array(84 + 50)
    const view = new DataView(bin.buffer)
    view.setUint32(80, 1, true)
    ;[0, 0, 0, 500, 0, 0, 0, 700, 0].forEach((v, i) =>
      view.setFloat32(84 + 12 + i * 4, v, true),
    )
    expect(readStl(bin)).toMatchObject({ triangles: 1, bounds: { x1: 500, y1: 700 } })
    expect(() => readStl(new TextEncoder().encode('hello'))).toThrow()
  })
})

// With FreeCAD itself: runs only where it is available, FREECAD_CMD=<path to
// freecadcmd> (the tests otherwise use the real export kept in fixtures/).
// Node's modules are loaded only then, so the game's code stays browser-only.
interface NodeApis {
  execFileSync: (file: string, args: string[], options: object) => unknown
  existsSync: (path: string) => boolean
  mkdtempSync: (prefix: string) => string
  readFileSync: (path: string, encoding?: string) => string
  writeFileSync: (path: string, data: string) => void
  tmpdir: () => string
  join: (...parts: string[]) => string
  env: Record<string, string | undefined>
}

const env =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process
    ?.env ?? {}
const FREECAD = env.FREECAD_CMD

async function nodeApis(): Promise<NodeApis> {
  const load = (name: string) => import(/* @vite-ignore */ name)
  const [cp, fs, os, path] = await Promise.all([
    load('node:child_process'),
    load('node:fs'),
    load('node:os'),
    load('node:path'),
  ])
  return { ...cp, ...fs, tmpdir: os.tmpdir, join: path.join, env }
}

describe.runIf(!!FREECAD)('with FreeCAD itself', () => {
  it('builds the parametric model, follows an edited parameter, and exports it', async () => {
    const n = await nodeApis()
    const out = n.mkdtempSync(n.join(n.tmpdir(), 'worksim-freecad-'))
    const design = correctedYardStore()
    const macro = n.join(out, 'yard.FCMacro')
    n.writeFileSync(
      macro,
      freecadMacro(design, { project: 'yard-store', title: 'Yard store', revision: 2 }),
    )
    // The player's session: build, widen W1 in the spreadsheet, recompute, run the macro again.
    const session = n.join(out, 'session.py')
    n.writeFileSync(
      session,
      [
        'import FreeCAD as App',
        `exec(open(${JSON.stringify(macro)}, encoding="utf-8").read())`,
        'doc = App.getDocument("WorkSim_yard_store")',
        'doc.getObject("Params").set("w1_width", "1500")',
        'doc.recompute()',
        `exec(open(${JSON.stringify(macro)}, encoding="utf-8").read())`,
      ].join('\n'),
    )
    n.execFileSync(FREECAD!, [session], {
      env: { ...n.env, WORKSIM_OUT: out },
      stdio: 'pipe',
      timeout: 120_000,
    })
    const name = exchangeName('yard-store', 2)
    for (const ext of ['.worksim.json', '.obj', '.step', '.FCStd'])
      expect(n.existsSync(n.join(out, name + ext)), ext).toBe(true)
    const json = n.readFileSync(n.join(out, `${name}.worksim.json`), 'utf8')
    const read = readExchange(json, 'yard-store')
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const got = read.design as BuildingDesign
    expect(got.openings.find((o) => o.id === 'W1')?.width).toBe(1500)
    expect(got.outline).toEqual(design.outline)
    expect(read.model?.invalid).toEqual([])
    expect(read.model?.objects).toEqual(
      expect.arrayContaining(['Walls', 'Slab', 'Roof', 'Footing1']),
    )
    const obj = n.readFileSync(n.join(out, `${name}.obj`), 'utf8')
    expect(meshMatches(readObj(obj), got).ok).toBe(true)
    // Keep the real export as the fixture the other tests use.
    const fixtures = n.env.WORKSIM_WRITE_FIXTURES
    if (fixtures) {
      n.writeFileSync(n.join(fixtures, `${name}.worksim.json`), json)
      n.writeFileSync(n.join(fixtures, `${name}.obj`), obj)
    }
  }, 180_000)

  it('builds and exports the footbridge', async () => {
    const n = await nodeApis()
    const out = n.mkdtempSync(n.join(n.tmpdir(), 'worksim-freecad-'))
    const bridge = getBrief('mill-footbridge')!.concept
    const macro = n.join(out, 'bridge.FCMacro')
    n.writeFileSync(
      macro,
      freecadMacro(bridge, {
        project: 'mill-footbridge',
        title: 'Footbridge',
        revision: 1,
      }),
    )
    n.execFileSync(FREECAD!, [macro], {
      env: { ...n.env, WORKSIM_OUT: out, WORKSIM_MODE: 'build-export' },
      stdio: 'pipe',
      timeout: 120_000,
    })
    const name = exchangeName('mill-footbridge', 1)
    const read = readExchange(
      n.readFileSync(n.join(out, `${name}.worksim.json`), 'utf8'),
      'mill-footbridge',
    )
    expect(read.ok && read.design).toEqual(bridge)
    const mesh = readObj(n.readFileSync(n.join(out, `${name}.obj`), 'utf8'))
    expect(meshMatches(mesh, bridge).ok).toBe(true)
  }, 180_000)
})
