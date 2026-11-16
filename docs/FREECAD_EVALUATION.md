# FreeCAD and CADCraft: evaluation for the engineering career

Written 2026-11-16, for round 3 of the 3D upgrade. It answers: can FreeCAD be the
career's primary CAD tool, and how? What the game does today is in
[ENGINEERING_PROJECTS.md](ENGINEERING_PROJECTS.md).

## What exists now

- **CADCraft** (embedded, in Projects › CAD Craft): 2D drawing in the page. The
  game writes the design as DXF, CADCraft edits it, and the saved DXF is read back
  as a new revision.
- **FreeCAD bridge** (Projects › FreeCAD, `src/engineering/cad/freecad.ts`): the
  game gives the player a macro. In FreeCAD, the macro builds a parametric model
  from the design. The player changes the named cells and runs the macro again,
  which exports `.worksim.json`, OBJ, STEP and FCStd. The game imports them as a
  draft revision, then checks it, compares the mesh with the design, and keeps
  the files with the project. This was tested against real FreeCAD 1.1.4.
- **Design to construction:** an approved revision is what gets issued to site. The
  construction scene builds the issued design: footings, walls, openings,
  columns, slab, roof and services. Changing the design in FreeCAD therefore
  changes what is built, through review and approval as on a real project.

## The options

| Question          | Desktop FreeCAD (bridge, now)                       | FreeCAD in the browser (WebAssembly)                                                                                                                                                                                                                   | Embedded browser kernel (OpenCascade.js / Manifold)                   |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Feasible          | Yes: built and tested                               | Technically possible. An unofficial port appeared in July 2026 ([report](https://zeli.app/en/story/48867264)) and a demo build of FreeCAD 1.1.3 is described on the [Qt forum](https://forum.qt.io/post/840221). It is not an official FreeCAD release | Yes. Kernels exist as WebAssembly                                     |
| Licence           | LGPL-2.1. The game ships none of it                 | LGPL-2.1 for FreeCAD and OCCT, plus Qt (LGPL/GPL), Coin3D (BSD), VTK and SMESH. Bundling it means shipping its source and relinking terms, against the project's permissive-only rule                                                                  | OpenCascade.js: LGPL-2.1. Manifold: Apache-2.0, which fits the policy |
| Browser           | Not in the browser                                  | Reported to need WebAssembly JSPI and native exceptions (recent Chromium). Several tens of MB to download; heavy on memory                                                                                                                             | Any modern browser. A few MB                                          |
| Offline / install | FreeCAD installed by the player                     | Could be hosted locally, but that is a large addition                                                                                                                                                                                                  | Bundled                                                               |
| Model interchange | Macro → `.worksim.json`, OBJ, STEP, FCStd (working) | The same macro runs (the port includes CPython), so the same files apply                                                                                                                                                                               | Native: the game's own design model                                   |
| Fidelity          | Full FreeCAD (Part, Sketcher, TechDraw, FEM)        | Full FreeCAD, if the port is complete                                                                                                                                                                                                                  | What the game builds: walls, openings, footings, slabs, booleans      |

## Recommendation

1. **Keep FreeCAD as the professional tool, through files.** The bridge already
   gives full FreeCAD. Its outputs change the physical construction through
   review, approval and issue. It works the same with the desktop app and with a
   browser build of FreeCAD, because both run the same macro. Projects › FreeCAD
   says so.
2. **Do not bundle the WebAssembly port.** It is unofficial, a very large
   download, needs specific browser features, and is LGPL with Qt. That conflicts
   with the offline, permissive-licence and modest-hardware goals. If an official,
   maintained browser build appears, it can be offered as a link the player opens
   in another tab, with the same files exchanged.
3. **For modelling inside the game,** add an in-game 3D modeller built on
   **Manifold** (Apache-2.0). It would edit the same design model (wall lines,
   openings, footings and roof) with solid booleans, and preview the result in 3D.
   That is the lightweight integration. It is not built yet (see Outstanding).
4. **CADCraft stays** as the 2D drawing tool (plans, setting-out, DXF), alongside
   FreeCAD for 3D and parametric work.

## How CAD changes the site

The design model is the single source. CADCraft (DXF) and FreeCAD (macro exports)
both produce revisions of it. An approved revision is issued to site, and the
construction engine (`src/engineering/construction`) builds the issued revision's
geometry stage by stage. Moving an opening in FreeCAD therefore moves it in the
built walls on site, once the revision is approved and issued. The engineering
tests cover this path.

## Outstanding

- The in-game Manifold modeller (point 3).
- A link to a browser build of FreeCAD, if an official one is published.
