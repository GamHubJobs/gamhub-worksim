/**
 * The FreeCAD bridge. FreeCAD is a desktop application (C++, Qt and
 * OpenCASCADE, LGPL-2.1): it cannot run inside the game's page, so the game
 * works with a copy the player installs, by exchanging files. Nothing of
 * FreeCAD is copied into the game.
 *
 * 1. The game writes a FreeCAD macro (Python) for the project's design: run
 *    in FreeCAD, it builds a parametric 3D model whose every dimension is a
 *    named cell of a "Params" spreadsheet (walls, corners, openings,
 *    columns, foundations), bound to the model by expressions.
 * 2. The player models in FreeCAD: changes the parameters (the model
 *    follows), measures, makes TechDraw drawings.
 * 3. Running the same macro again exports: the design read back from the
 *    spreadsheet as WorkSim data (.worksim.json), the model as a mesh (.obj)
 *    and as STEP, and the FreeCAD file itself.
 * 4. The player imports those files in the game: the data becomes a draft
 *    revision (checked and approved like any other), the mesh is shown in
 *    the 3D viewer and compared with the data.
 *
 * Pure TypeScript.
 */
import { z } from 'zod'
import { DesignSchema, bounds, walls, type BuildingDesign, type Design } from '../design'

export const EXCHANGE_FORMAT = 'worksim-freecad'

export const ExchangeSchema = z.object({
  format: z.literal(EXCHANGE_FORMAT),
  version: z.literal(1),
  project: z.string().max(40),
  /** The revision the macro was made from. */
  basedOn: z.number().int().min(1),
  design: z.unknown(),
  model: z
    .object({
      /** The model's bounding box (mm). */
      bounds: z.object({
        x0: z.number(),
        y0: z.number(),
        z0: z.number(),
        x1: z.number(),
        y1: z.number(),
        z1: z.number(),
      }),
      objects: z.array(z.string().max(80)).max(500),
      volume: z.number().nonnegative().optional(),
      /** Objects FreeCAD could not recompute (a broken expression). */
      invalid: z.array(z.string().max(80)).max(100).optional(),
    })
    .optional(),
  freecad: z.string().max(40).optional(),
})

export type ExchangeRead =
  | {
      ok: true
      design: Design
      basedOn: number
      model: z.infer<typeof ExchangeSchema>['model']
      freecad: string | undefined
    }
  | { ok: false; error: string }

/** Reads a .worksim.json file exported by the macro, for this project. */
export function readExchange(text: string, project: string): ExchangeRead {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return {
      ok: false,
      error:
        'The file is not valid JSON: it may be damaged or not the one the macro wrote.',
    }
  }
  const outer = ExchangeSchema.safeParse(raw)
  if (!outer.success)
    return {
      ok: false,
      error:
        'This is not a WorkSim FreeCAD export (.worksim.json written by the project’s macro).',
    }
  if (outer.data.project !== project)
    return {
      ok: false,
      error: `This export is for another project (${outer.data.project}).`,
    }
  const design = DesignSchema.safeParse(outer.data.design)
  if (!design.success) {
    const issue = design.error.issues[0]
    return {
      ok: false,
      error: `The design in the export is not valid: ${issue.path.join('.')}: ${issue.message}.`,
    }
  }
  return {
    ok: true,
    design: design.data,
    basedOn: outer.data.basedOn,
    model: outer.data.model,
    freecad: outer.data.freecad,
  }
}

/** A file name from a project ID and revision, e.g. "yard-store-r3". */
export function exchangeName(project: string, revision: number): string {
  return `${project}-r${revision}`
}

const py = (value: unknown) => JSON.stringify(value)

/** The Params spreadsheet's cells: alias, value, description. */
export function parameters(design: Design): Array<[string, number | string, string]> {
  if (design.kind === 'bridge')
    return [
      ['span', design.span, 'Clear span (mm)'],
      ['width', design.width, 'Deck width (mm)'],
      ['girders', design.girders.count, 'Number of girders'],
      ['girder_section', design.girders.section, 'Girder section'],
      [
        'girder_depth',
        Number(design.girders.section.split('-')[1]) || 300,
        'Girder depth (mm)',
      ],
      ['deck_t', design.deck.thickness, 'Deck thickness (mm)'],
      ['abut_h', design.abutment.height, 'Abutment height (mm)'],
      ['abut_base', design.abutment.base, 'Abutment base length (mm)'],
      ['parapet_h', design.parapet.height, 'Parapet height (mm)'],
    ]
  const cells: Array<[string, number | string, string]> = [
    ['wall_t', design.wall.thickness, 'Wall thickness (mm)'],
    ['storey_h', design.wall.height, 'Storey height (mm)'],
    ['storeys', design.storeys, 'Storeys'],
    ['wall_material', design.wall.material, 'Wall material'],
    ['beam_section', design.beam.section, 'Roof and floor beams'],
    ['found_type', design.foundation.type, 'Foundation type'],
    ['found_w', design.foundation.width, 'Foundation width (mm)'],
    ['found_d', design.foundation.depth, 'Foundation depth (mm)'],
    ['slab_t', design.slab.thickness, 'Slab thickness (mm)'],
    ['roof_type', design.roof.type, 'Roof type'],
    ['roof_pitch', design.roof.pitch, 'Roof pitch (degrees)'],
    ['circuits', design.services.circuits, 'Electrical circuits'],
    ['sanitary', design.services.sanitary, 'WCs and basins'],
    ['hvac', design.services.hvac, 'Heating and ventilation units'],
  ]
  design.outline.forEach(([x, y], i) => {
    cells.push(
      [`p${i}_x`, x, `Corner ${i + 1}, x (mm)`],
      [`p${i}_y`, y, `Corner ${i + 1}, y (mm)`],
    )
  })
  for (const o of design.openings) {
    const k = o.id.toLowerCase()
    cells.push(
      [`${k}_offset`, o.offset, `${o.id}: from the wall's start to its centre (mm)`],
      [`${k}_width`, o.width, `${o.id}: width (mm)`],
      [`${k}_height`, o.height, `${o.id}: height (mm)`],
      [`${k}_sill`, o.sill, `${o.id}: sill height (mm)`],
    )
  }
  for (const c of design.columns) {
    const k = c.id.toLowerCase()
    cells.push([`${k}_x`, c.x, `${c.id}: x (mm)`], [`${k}_y`, c.y, `${c.id}: y (mm)`])
  }
  return cells
}

/** The walls, openings and columns as boxes with expressions on the spreadsheet. */
function buildingParts(d: BuildingDesign) {
  const n = d.outline.length
  const H = '(Params.storey_h * Params.storeys)'
  const parts: Array<{
    name: string
    group: 'walls' | 'openings' | 'columns' | 'foundations'
    expr: Record<string, string>
  }> = []
  walls(d).forEach((e, i) => {
    const j = (i + 1) % n
    const horizontal = e.a[1] === e.b[1]
    const [ax, ay, bx, by] = [
      `Params.p${i}_x`,
      `Params.p${i}_y`,
      `Params.p${j}_x`,
      `Params.p${j}_y`,
    ]
    const wall = (
      t: string,
      z: string,
      h: string,
      name: string,
      group: 'walls' | 'foundations',
    ) =>
      parts.push({
        name,
        group,
        expr: horizontal
          ? {
              Length: `abs(${bx} - ${ax}) + ${t}`,
              Width: t,
              Height: h,
              '.Placement.Base.x': `min(${ax}; ${bx}) - ${t} / 2`,
              '.Placement.Base.y': `${ay} - ${t} / 2`,
              '.Placement.Base.z': z,
            }
          : {
              Length: t,
              Width: `abs(${by} - ${ay}) + ${t}`,
              Height: h,
              '.Placement.Base.x': `${ax} - ${t} / 2`,
              '.Placement.Base.y': `min(${ay}; ${by}) - ${t} / 2`,
              '.Placement.Base.z': z,
            },
      })
    wall('Params.wall_t', '0', H, `Wall${i + 1}`, 'walls')
    wall(
      'Params.found_w',
      '-Params.found_d',
      'Params.found_d',
      `Footing${i + 1}`,
      'foundations',
    )
  })
  for (const o of d.openings) {
    const e = walls(d)[o.wall]
    if (!e) continue
    const i = o.wall
    const k = o.id.toLowerCase()
    const horizontal = e.a[1] === e.b[1]
    const sign = horizontal
      ? Math.sign(e.b[0] - e.a[0]) || 1
      : Math.sign(e.b[1] - e.a[1]) || 1
    const start = horizontal ? `Params.p${i}_x` : `Params.p${i}_y`
    const across = horizontal ? `Params.p${i}_y` : `Params.p${i}_x`
    const along = `${start} + ${sign} * Params.${k}_offset - Params.${k}_width / 2`
    const z = `Params.storey_h * ${o.storey} + Params.${k}_sill`
    parts.push({
      name: o.id,
      group: 'openings',
      expr: horizontal
        ? {
            Length: `Params.${k}_width`,
            Width: 'Params.wall_t + 40',
            Height: `Params.${k}_height`,
            '.Placement.Base.x': along,
            '.Placement.Base.y': `${across} - Params.wall_t / 2 - 20`,
            '.Placement.Base.z': z,
          }
        : {
            Length: 'Params.wall_t + 40',
            Width: `Params.${k}_width`,
            Height: `Params.${k}_height`,
            '.Placement.Base.x': `${across} - Params.wall_t / 2 - 20`,
            '.Placement.Base.y': along,
            '.Placement.Base.z': z,
          },
    })
  }
  for (const c of d.columns) {
    const k = c.id.toLowerCase()
    parts.push({
      name: c.id,
      group: 'columns',
      expr: {
        Length: '200',
        Width: '200',
        Height: H,
        '.Placement.Base.x': `Params.${k}_x - 100`,
        '.Placement.Base.y': `Params.${k}_y - 100`,
        '.Placement.Base.z': '0',
      },
    })
  }
  return parts
}

function bridgeParts() {
  const half = 'Params.span / 2'
  const parts: Array<{ name: string; group: string; expr: Record<string, string> }> = [
    {
      name: 'Deck',
      group: 'deck',
      expr: {
        Length: 'Params.span + 1000',
        Width: 'Params.width',
        Height: 'Params.deck_t',
        '.Placement.Base.x': `-${half} - 500`,
        '.Placement.Base.y': '-Params.width / 2',
        '.Placement.Base.z': '0',
      },
    },
    {
      name: 'ParapetNorth',
      group: 'parapets',
      expr: {
        Length: 'Params.span + 1000',
        Width: '60',
        Height: 'Params.parapet_h',
        '.Placement.Base.x': `-${half} - 500`,
        '.Placement.Base.y': 'Params.width / 2 - 60',
        '.Placement.Base.z': 'Params.deck_t',
      },
    },
    {
      name: 'ParapetSouth',
      group: 'parapets',
      expr: {
        Length: 'Params.span + 1000',
        Width: '60',
        Height: 'Params.parapet_h',
        '.Placement.Base.x': `-${half} - 500`,
        '.Placement.Base.y': '-Params.width / 2',
        '.Placement.Base.z': 'Params.deck_t',
      },
    },
    {
      name: 'AbutmentWest',
      group: 'abutments',
      expr: {
        Length: 'Params.abut_base',
        Width: 'Params.width + 1000',
        Height: 'Params.abut_h',
        '.Placement.Base.x': `-${half} - Params.abut_base`,
        '.Placement.Base.y': '-Params.width / 2 - 500',
        '.Placement.Base.z': '-Params.abut_h - Params.girder_depth',
      },
    },
    {
      name: 'AbutmentEast',
      group: 'abutments',
      expr: {
        Length: 'Params.abut_base',
        Width: 'Params.width + 1000',
        Height: 'Params.abut_h',
        '.Placement.Base.x': half,
        '.Placement.Base.y': '-Params.width / 2 - 500',
        '.Placement.Base.z': '-Params.abut_h - Params.girder_depth',
      },
    },
  ]
  return parts
}

/**
 * The FreeCAD macro for a design. Run it once to build the parametric
 * model; run it again (with the model open) to export it for WorkSim.
 */
export function freecadMacro(
  design: Design,
  info: { project: string; title: string; revision: number },
): string {
  const name = exchangeName(info.project, info.revision)
  const docName = `WorkSim_${info.project.replace(/[^A-Za-z0-9]/g, '_')}`
  const params = parameters(design)
  const parts = design.kind === 'building' ? buildingParts(design) : bridgeParts()
  const girders = design.kind === 'bridge' ? design.girders.count : 0
  return `# -*- coding: utf-8 -*-
# WorkSim <-> FreeCAD bridge for "${info.title}", revision ${info.revision}.
# Written by GamHub WorkSim for the player (a simulation for learning).
#
# FIRST RUN: builds a parametric model. Every dimension is a named cell of
#   the "Params" spreadsheet; change a cell, press Recompute, and the model
#   follows. Measure, section and draw it (TechDraw) as you like.
# SECOND RUN (with the model open): exports it for WorkSim to
#   <your home folder>/WorkSim/: ${name}.worksim.json (the design data),
#   ${name}.obj (the model), ${name}.step and ${name}.FCStd.
#   Import the .worksim.json (and the .obj) in WorkSim: Projects > Design >
#   FreeCAD > Import.
#
# Macro > Macros... > Create, paste this in (or open this file), then Execute.

import json
import os
import FreeCAD as App
import Part
import Mesh

PROJECT = ${py(info.project)}
REVISION = ${info.revision}
NAME = ${py(name)}
DOC = ${py(docName)}
KIND = ${py(design.kind)}
DESIGN = json.loads(${py(JSON.stringify(design))})
PARAMS = json.loads(${py(JSON.stringify(params))})
PARTS = json.loads(${py(JSON.stringify(parts))})
GIRDERS = ${girders}
OPENINGS = json.loads(${py(JSON.stringify(design.kind === 'building' ? design.openings.map((o) => [o.id, o.kind, o.wall, o.storey]) : []))})
COLUMNS = json.loads(${py(JSON.stringify(design.kind === 'building' ? design.columns.map((c) => [c.id, c.section]) : []))})
CORNERS = ${design.kind === 'building' ? design.outline.length : 0}
OUT = os.environ.get("WORKSIM_OUT") or os.path.join(os.path.expanduser("~"), "WorkSim")


def say(text):
    App.Console.PrintMessage(text + "\\n")
    if App.GuiUp:
        try:
            from PySide import QtGui
            QtGui.QMessageBox.information(None, "WorkSim", text)
        except Exception:
            pass


def cell(sheet, row):
    return "B%d" % row


def build():
    doc = App.newDocument(DOC)
    sheet = doc.addObject("Spreadsheet::Sheet", "Params")
    sheet.set("A1", "Parameter")
    sheet.set("B1", "Value")
    sheet.set("C1", "What it is")
    for i, (alias, value, label) in enumerate(PARAMS):
        row = i + 2
        sheet.set("A%d" % row, alias)
        sheet.set("B%d" % row, str(value) if isinstance(value, str) else repr(value))
        sheet.set("C%d" % row, label)
        sheet.setAlias("B%d" % row, alias)
    doc.recompute()
    groups = {}
    for part in PARTS:
        box = doc.addObject("Part::Box", part["name"])
        for prop, expr in part["expr"].items():
            box.setExpression(prop, expr)
        groups.setdefault(part["group"], []).append(box)
    doc.recompute()
    if KIND == "building":
        walls = doc.addObject("Part::MultiFuse", "WallsSolid")
        walls.Shapes = groups.get("walls", [])
        result = walls
        if groups.get("openings"):
            holes = doc.addObject("Part::MultiFuse", "Openings")
            holes.Shapes = groups["openings"]
            cut = doc.addObject("Part::Cut", "Walls")
            cut.Base = walls
            cut.Tool = holes
            result = cut
        doc.recompute()
        bb = result.Shape.BoundBox
        # The slab and the roof follow the walls' bounding box (rebuilt on recompute).
        slab = doc.addObject("Part::Box", "Slab")
        slab.setExpression("Length", "Walls.Shape.BoundBox.XLength" if groups.get("openings") else "WallsSolid.Shape.BoundBox.XLength")
        slab.setExpression("Width", "Walls.Shape.BoundBox.YLength" if groups.get("openings") else "WallsSolid.Shape.BoundBox.YLength")
        slab.setExpression("Height", "Params.slab_t")
        slab.setExpression(".Placement.Base.x", "Walls.Shape.BoundBox.XMin" if groups.get("openings") else "WallsSolid.Shape.BoundBox.XMin")
        slab.setExpression(".Placement.Base.y", "Walls.Shape.BoundBox.YMin" if groups.get("openings") else "WallsSolid.Shape.BoundBox.YMin")
        slab.setExpression(".Placement.Base.z", "-Params.slab_t")
        roof = doc.addObject("Part::Box", "Roof")
        roof.setExpression("Length", "Slab.Length + 400 mm")
        roof.setExpression("Width", "Slab.Width + 400 mm")
        roof.setExpression("Height", "250")
        roof.setExpression(".Placement.Base.x", "Slab.Placement.Base.x - 200 mm")
        roof.setExpression(".Placement.Base.y", "Slab.Placement.Base.y - 200 mm")
        roof.setExpression(".Placement.Base.z", "Params.storey_h * Params.storeys")
    else:
        for g in range(GIRDERS):
            girder = doc.addObject("Part::Box", "Girder%d" % (g + 1))
            girder.setExpression("Length", "Params.span + 800")
            girder.setExpression("Width", "200")
            girder.setExpression("Height", "Params.girder_depth")
            girder.setExpression(".Placement.Base.x", "-Params.span / 2 - 400")
            girder.setExpression(".Placement.Base.y", "-Params.width / 2 + Params.width * %d.5 / Params.girders - 100" % g)
            girder.setExpression(".Placement.Base.z", "-Params.girder_depth")
    doc.recompute()
    path = os.path.join(OUT, NAME + ".FCStd")
    try:
        os.makedirs(OUT, exist_ok=True)
        doc.saveAs(path)
    except Exception as error:
        App.Console.PrintWarning("Could not save %s: %s\\n" % (path, error))
    if App.GuiUp:
        try:
            import FreeCADGui
            FreeCADGui.SendMsgToActiveView("ViewFit")
            FreeCADGui.activeDocument().activeView().viewIsometric()
        except Exception:
            pass
    return doc


def value(sheet, alias):
    return sheet.get(alias)


def number(sheet, alias):
    v = sheet.get(alias)
    try:
        return int(round(float(getattr(v, "Value", v))))
    except Exception:
        raise ValueError("Params.%s is not a number" % alias)


def text(sheet, alias):
    return str(sheet.get(alias)).strip()


def read_design(doc):
    sheet = doc.getObject("Params")
    d = json.loads(json.dumps(DESIGN))
    if KIND == "bridge":
        d["span"] = number(sheet, "span")
        d["width"] = number(sheet, "width")
        d["girders"] = {"count": number(sheet, "girders"), "section": text(sheet, "girder_section")}
        d["deck"] = {"thickness": number(sheet, "deck_t")}
        d["abutment"] = {"height": number(sheet, "abut_h"), "base": number(sheet, "abut_base")}
        d["parapet"] = {"height": number(sheet, "parapet_h")}
        return d
    d["outline"] = [[number(sheet, "p%d_x" % i), number(sheet, "p%d_y" % i)] for i in range(CORNERS)]
    d["wall"] = {"thickness": number(sheet, "wall_t"), "height": number(sheet, "storey_h"), "material": text(sheet, "wall_material")}
    d["storeys"] = number(sheet, "storeys")
    d["beam"] = {"section": text(sheet, "beam_section")}
    d["foundation"] = {"type": text(sheet, "found_type"), "width": number(sheet, "found_w"), "depth": number(sheet, "found_d")}
    d["slab"] = {"thickness": number(sheet, "slab_t")}
    d["roof"] = {"type": text(sheet, "roof_type"), "pitch": float(getattr(sheet.get("roof_pitch"), "Value", sheet.get("roof_pitch")))}
    d["services"] = {"circuits": number(sheet, "circuits"), "sanitary": number(sheet, "sanitary"), "hvac": number(sheet, "hvac")}
    openings = []
    for oid, kind, wall, storey in OPENINGS:
        k = oid.lower()
        openings.append({
            "id": oid, "kind": kind, "wall": wall, "storey": storey,
            "offset": number(sheet, k + "_offset"), "width": number(sheet, k + "_width"),
            "height": number(sheet, k + "_height"), "sill": number(sheet, k + "_sill"),
        })
    d["openings"] = openings
    d["columns"] = [{"id": cid, "section": sec, "x": number(sheet, cid.lower() + "_x"), "y": number(sheet, cid.lower() + "_y")} for cid, sec in COLUMNS]
    return d


def export(doc):
    doc.recompute()
    os.makedirs(OUT, exist_ok=True)
    # The model is every solid not used to make another (a wall box fused into
    # the walls, an opening cut out of them); expressions do not count.
    used = set()
    for o in doc.Objects:
        for attr in ("Shapes", "Base", "Tool"):
            v = getattr(o, attr, None)
            if v is None or isinstance(v, (str, App.Vector)):
                continue
            for x in (v if isinstance(v, (list, tuple)) else [v]):
                if hasattr(x, "Name"):
                    used.add(x.Name)
    solids = [o for o in doc.Objects if o.TypeId.startswith("Part::") and o.Shape.Solids and o.Name not in used]
    shapes = [o.Shape for o in solids]
    compound = Part.makeCompound(shapes)
    bb = compound.BoundBox
    data = {
        "format": "worksim-freecad",
        "version": 1,
        "project": PROJECT,
        "basedOn": REVISION,
        "design": read_design(doc),
        "model": {
            "bounds": {"x0": bb.XMin, "y0": bb.YMin, "z0": bb.ZMin, "x1": bb.XMax, "y1": bb.YMax, "z1": bb.ZMax},
            "objects": [o.Label for o in solids][:500],
            "volume": sum(s.Volume for s in shapes),
            "invalid": [o.Label for o in doc.Objects if "Invalid" in o.State][:100],
        },
        "freecad": ".".join(App.Version()[:3]),
    }
    with open(os.path.join(OUT, NAME + ".worksim.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)
    Mesh.export(solids, os.path.join(OUT, NAME + ".obj"))
    Part.export(solids, os.path.join(OUT, NAME + ".step"))
    try:
        doc.saveAs(os.path.join(OUT, NAME + ".FCStd"))
    except Exception:
        pass
    say("Exported for WorkSim to %s:\\n%s.worksim.json, %s.obj, %s.step\\n\\nImport the .worksim.json and the .obj in WorkSim (Projects > Design > FreeCAD)." % (OUT, NAME, NAME, NAME))


def main():
    mode = os.environ.get("WORKSIM_MODE", "")
    doc = App.listDocuments().get(DOC)
    if mode == "build-export":
        export(build())
    elif doc is None:
        build()
        say("The parametric model is built. Change the cells of the Params spreadsheet and press Recompute; run this macro again to export it for WorkSim.")
    else:
        export(doc)


main()
`
}

/** The model's size (mm) the design implies, to compare with an imported mesh. */
export function expectedExtent(design: Design): { x: number; y: number } {
  if (design.kind === 'bridge')
    return { x: design.span + 2 * design.abutment.base, y: design.width + 1000 }
  const b = bounds(design.outline)
  // The roof overhangs the walls by 200 mm each side; the footings stand out by half their width.
  const pad = Math.max(design.wall.thickness + 400, design.foundation.width)
  return { x: b.x1 - b.x0 + pad, y: b.y1 - b.y0 + pad }
}
