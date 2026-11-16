# Engineering projects: design, CAD, construction

The Engineer career (Engineering & Technical Services, at Northbank Engineering)
has a design-and-build side, run from the **Projects** app on the work computer.

> **Simulation for learning.** The calculations use standard textbook formulas, but
> the loads, steel catalogue, allowable stress, ground bearing values and prices
> are simplified and fictional. Every screen and document says so.

## The workflow

```
Design ─▶ checks and calculations ─▶ submitted ─▶ design office review
   ▲                                                   │
   └──────── returned with comments ◀──────────────────┤
                                                       ▼ approved
                       documents issued (drawing, bill of quantities)
                                                       ▼
            construction, stage by stage (issues to decide, hold points)
                                                       ▼
                     final inspection ─▶ handover ─▶ result
```

- **Design.** Each project starts from a concept that is deliberately flawed (an
  undersized beam, a shallow and narrow footing, no forklift door, too few windows,
  a parapet too low, a span with no columns). The player changes it in:
  - the **plan editor** (Projects › Design): drag corners (walls stay square), place
    doors, windows and columns, type exact sizes; it snaps to 100 mm and shows
    where an opening fits (green) or not (red, with the reason);
  - the **specification** beside it (walls, beams, foundations, slab, roof, services);
  - **CAD Craft** (Projects › CAD Craft), the real drafting app;
  - **FreeCAD**, on the player's own computer (Projects › FreeCAD).
- **Checks.** Geometry, the client's brief and the calculations (bending, bearing
  pressure, footing width and depth, circuits) update as the design changes, with
  the working shown.
- **Review.** A draft is submitted to the design office, which takes 30 minutes of
  office time. It comes back approved, or returned with every comment. Structural
  changes are checked by the structural engineer and services by the electrical
  engineer. Nothing is built from a design that fails a check.
- **Revisions.** Approved and submitted revisions never change; editing after one
  starts a new draft. Every revision is kept, with what changed and who checked it.
- **Issue for construction.** Needs the approved revision, its drawing issued and
  its bill of quantities made (Projects › Documents).
- **Construction.** The site builds the approved revision only. One working day of
  site work passes in 10 minutes of office time.
  - An approved revision during construction changes the site's plan. Work already
    built that it changes becomes rework, with its time and cost.
  - An unapproved draft never touches the site.
- **Issues** stop the work until the player decides. Each choice changes quality,
  safety, cost, time, the client's satisfaction, reputation and colleagues' trust:
  - a burst excavator hose;
  - a rebar shortage;
  - rain on the day of a pour;
  - the client's extra window, which waits for an approved revision that adds one;
  - a roofer without a harness;
  - a failed insulation test, with the readings to find the faulty circuit;
  - an overspend.
- **Inspections** are hold points. The player goes to the site, walks to each item
  and measures it (a tape in the trench, a meter at the board), then judges each
  reading against the approved design.
  - **Rejecting a real defect** gets it reworked.
  - **Accepting one** lets it through, and it comes back at handover.
  - **Rejecting good work** costs time.

  Each site has a fault that only measuring finds:
  - the yard store's trench is 150 mm shallow in one corner;
  - the footbridge's east abutment sits on soft ground;
  - the workshop's beams are 40 mm low.

- **Handover** needs the final inspection signed off and the inspection report and
  handover file made. The result scores quality, safety, client satisfaction, budget
  and time, and gives XP, skills, reputation and trust. The manager writes with the
  outcome.

## The projects

| Project                               | Offered to                        | Stages                                                             |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Yard store (single-storey, flat roof) | Graduate Engineer                 | All building stages except plumbing and heating                    |
| Mill race footbridge                  | Engineer, after the store         | Survey, abutments, reinforcement, girders by crane, deck, parapets |
| Workshop and offices (two storeys)    | Senior Engineer, after the bridge | Every stage, including plumbing and heating                        |

## On site (3D)

**Projects › Site › Go to the site**, or the office panel. The site is its own scene,
like the court.

- **The build** is drawn from the approved design and how far each stage has got:
  - setting-out pegs and lines;
  - trenches cut into the ground, then reinforcement, then concrete rising;
  - the slab bay by bay, the steel frame, walls rising round their openings;
  - doors and windows, the roof, services and finishes, and the scaffold.
- **The plant works its stage:** an excavator digging, a mixer pouring, a crane
  lifting beams, a dumper and a van.
- **The crew work at their trades:** the surveyor, steel fixers, bricklayers (with a
  labourer carrying blocks from the stores), roofers, the electrician and the
  plumber. The supervisor walks the site; the construction manager is at the cabin.
- **The site itself:** the hoarding and gate, the cabin with the project's board,
  welfare units, and the stores, whose stocks run down as they are used.
- **The engineer** wears a white hard hat and hi-vis. The walls as built are solid,
  with door gaps to walk through. The footbridge has a temporary walkway over the
  mill race until the deck is cast.
- **Sound:** plant, tools, reversing beepers and wind, and no music.
- **Without 3D**, the same panel works on its own.

## CAD Craft (drafting)

The official CADCraft web build, run like the other office apps (see
[CRAFT_APPS.md](CRAFT_APPS.md)).

- The project's drawing is made from the design: a layered plan with grid,
  dimensions, labels, the specification and a title block.
- What the player draws is read back a few seconds after each change, and on Save,
  as the draft revision.
- A drawing that cannot be read yet is still kept, and the reason is shown.

The layers are the contract:

| Layer                  | Read as                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `WS-OUTLINE`           | The walls' centreline (one closed polyline)                 |
| `WS-DOOR`              | A door: a line along a wall, end to end                     |
| `WS-WINDOW`            | A window: the same                                          |
| `WS-COLUMN`            | A column: a circle at its centre                            |
| `WS-TAG`               | Labels near them: `D1 H2100`, `W2 H1050 S1200`, `C1 NB-200` |
| `WS-SPEC`              | The specification: `WALL THICKNESS 215`, `BEAM NB-300` …    |
| `WS-DECK`, `WS-GIRDER` | A bridge's deck outline and girder lines                    |

Everything else (`WS-WALL`, `WS-DIM`, `WS-GRID`, `WS-TITLE`, the player's own layers)
is kept as drawn.

- **Writes:** ASCII DXF R12, in millimetres.
- **Reads:** ASCII DXF R12 to 2018, including CADCraft's own R2000 saves. Lines,
  LWPOLYLINE and POLYLINE, circles, TEXT and MTEXT are read, and units are taken
  from `$INSUNITS`.
- **Checked** with CADCraft 0.20.1 in a browser: the game's drawing opens complete,
  and CADCraft's re-saved file reads back to the same design.

## FreeCAD (3D modelling, installed by the player)

FreeCAD is a desktop application (C++, Qt and OpenCASCADE; LGPL-2.1). It cannot run
inside a web page, and nothing of it is bundled. The game works with the player's
own copy by exchanging files (`src/engineering/cad/freecad.ts`):

1. **Download the project's macro** (Projects › FreeCAD).
2. **Run it in FreeCAD** (Macro › Macros… › Execute). It builds a parametric model:
   - every dimension is a named cell of a `Params` spreadsheet (corners, wall
     thickness and height, each opening's offset, width, height and sill, columns,
     footings, slab, roof, services);
   - the walls, footings, openings (cut out), columns, slab and roof follow those
     cells by expressions.
3. **Change the cells** and press Recompute. Measure, section and draw (TechDraw)
   as you like.
4. **Run the macro again.** It exports to `~/WorkSim/`:
   - `<project>-r<n>.worksim.json`: the design read back from the spreadsheet, the
     model's bounding box and objects, and any objects that failed to recompute;
   - `.obj`, `.step` and `.FCStd`.
5. **Import the files** (Projects › FreeCAD › Choose files…).
   - The `.worksim.json` becomes the draft revision, checked and approved like any
     other.
   - The OBJ (or an STL) is shown in the 3D view over the design and compared with
     it: a mesh more than 3% off on plan is reported.
   - STEP and FCStd files are kept with the project.
   - Damaged files, another project's export, an invalid design and missing data
     are each reported, and the design is left unchanged.

**What needs installing:** only FreeCAD itself, free from freecad.org, and only for
this tab. Everything else in the career works without it. Tested with
FreeCAD 1.1.4: `FREECAD_CMD=<path to freecadcmd> npx vitest run src/engineering`
builds the model, edits a parameter as a player would, exports, and checks the
files. The real export is kept as the test fixture.

## Documents

Projects › Documents makes each document from the project's data, in the office
apps. Each records the revision it shows and is flagged **out of date** when the
site moves on. Making it again keeps the old content in Version history.

- **Drawing:** DXF, "issued for construction".
- **Calculation sheet:** every check, with the working.
- **Bill of quantities:** a Grid Craft workbook. Amounts and totals are live
  formulas.
- **Construction programme:** a workbook, with a chart.
- **Specification**, **site progress report**, **inspection report** and
  **handover file:** Word Craft documents.

## Where things are

| What                                          | Where                                                     |
| --------------------------------------------- | --------------------------------------------------------- |
| Design format, checks, quantities             | `src/engineering/design.ts`, `checks.ts`, `quantities.ts` |
| Revisions, issues, inspections                | `revisions.ts`, `issues.ts`, `inspections.ts`             |
| The game rules (one save: `work.engineering`) | `engine.ts`, `visit.ts`, `state.ts`                       |
| Briefs and site team                          | `briefs.ts`, `people.ts`                                  |
| DXF and FreeCAD                               | `src/engineering/cad/`                                    |
| Documents                                     | `documents.ts`, `src/persistence/engineeringFiles.ts`     |
| 3D build, site, crew, plant                   | `src/engineering/scene/`                                  |
| The Projects app                              | `src/apps/projects/`                                      |

Drawings and models are kept as documents (tool documents of the tool `cad`), so
autosave, version history, backups and exports include them.

## Tests

- **Unit tests** (`src/engineering/**/*.test.ts`):
  - every concept fails and every corrected design passes;
  - calculations, quantities, programmes and revision diffs;
  - review, rejection and approval;
  - issues, hold points, rework, defects let through and the client's window;
  - a whole project to handover;
  - DXF round trips and errors;
  - the FreeCAD macro and imports (with FreeCAD itself when `FREECAD_CMD` is set);
  - documents and stale flags.
- **Browser tests:**
  - `engineering-projects.spec.ts` drives the real UI: the plan editor, review,
    documents, issue for construction, an issue, the site in 3D, measuring and
    judging an inspection, and a reload;
  - `engineering-tour.spec.ts` builds all three sites stage by stage in 3D (with
    screenshots) and hands the yard store over.

## Limits

- **Square corners only.** Building outlines must have square corners; the plan
  editor moves corners but does not add them (draw other outlines in CAD Craft).
- **Simple pitched roofs.** A pitched roof is drawn for rectangular buildings only;
  others get a flat roof in 3D.
- **What the DXF reader takes.** It reads only the WS layers listed above. Blocks,
  hatches and dimension entities are kept in the drawing but not read as design.
- **FreeCAD's role.** FreeCAD edits what the spreadsheet holds; new walls or
  openings are added in WorkSim or CAD Craft. In-game STEP import is not
  supported: reading STEP in a browser needs an LGPL geometry kernel, which the
  project's licence policy avoids. STEP files are kept, not read.
- **Compressed time.** Construction runs on a compressed timeline (10 office
  minutes to a site day). The programme document shows real working days.
