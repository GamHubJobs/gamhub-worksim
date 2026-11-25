# GamHub Space Studio

A space-planning, architecture and interior-design application on the work
computer, and the Architecture & Interior Design career that uses it.

Space Studio is original WorkSim software. SpacePlanner (spaceplanner.co) was
studied as a **functional reference** only. No code, branding, icons, models,
textures or text were copied.

## 1. Investigation (Phase 0)

### Method

| Step                                        | Tool                                                                  | What it established                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Load the guest editor, record its interface | REA `capture_browser_scenario` (accessibility at the end)             | The full tool palette, top bar, layers panel and first-run dialog, by role and name                  |
| Drive it: units, room, door, window, select | A Playwright script (REA's runner cannot click at canvas coordinates) | Drawing by drag, live dimensions, typed exact sizes, selection panels, the saved plan in the browser |
| Static analysis of the running bundle       | REA `analyze_web_bundle` over CDP, on the page the script left open   | Build tool, chunk graph, rendering stack, endpoint candidates                                        |
| Network and storage during the session      | Request log and `localStorage` keys from the same session             | How a guest plan is saved and what is fetched                                                        |
| Public documentation                        | The site's own `/docs` pages (17 read)                                | Intended behaviour of features a guest cannot reach (export, walkthrough settings)                   |

REA evidence IDs (kept in the local REA session): browser scenario
`ev_adb7b103…`, bundle analysis `ev_941626a5…`.

### Observed behaviour

- **One plan, two views.** The 3D view is built from the same plan: "There is no
  separate model to build". Its documentation and the storage both show this:
  the saved guest plan holds walls and openings only, never meshes.
- **Saved plan format (observed in `localStorage`, guest plan).**
  - Walls: `{x1, y1, x2, y2, thickness, height, interior_side}`, in centimetres.
  - Openings belong to a wall: `{wall_id, type, position, width, height, sill_height, swing}`.
    `position` is a fraction (0–1) along the wall.
- **Room tool.** Pressing R and dragging draws four walls, shows live edge
  lengths, and accepts a typed size ("400 × 300"). The finished room shows its
  name and area; the area shown (46.88 m² for 750 × 625 cm) is measured on the
  wall centre lines.
- **Wall settings** apply to the next walls drawn:
  - presets for thickness and clear height;
  - wall types (brick, concrete, drywall, insulated, timber, stone), each with a typical thickness.
- **Selection** opens a properties panel (room name, style, flip, delete) and a
  quick-actions palette, with a rotation ring around the selection.
- **Openings.** D or N, then a click on a wall: one opening per click, after
  which the editor goes back to Select.
- **Shortcuts (documented):**
  - drawing tools: W, R, D, N, U, M, I;
  - V to select, H to pan, Esc to finish;
  - Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y, Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+A;
  - arrow keys nudge by 1 cm, or 10 cm with Shift;
  - Alt+Up and Alt+Down change floor.
- **3D.**
  - **Camera:** orbit, pan and zoom; preset views (3D, Top, Front, Side, Eye level); saved views; a screenshot.
  - **Display:** Day, Golden and Night light; walls shown full, cut away or low.
- **Walkthrough (documented).**
  - WASD and drag to look around; you start in the selected room.
  - Doors open as you approach, and stairs carry you between floors.
  - Collision with walls and furniture is an option.
- **Export (documented, needs an account).** PDF to true scale on A4 to A0,
  floor plans and elevations, and a choice of layers.
- **Saving.** A guest's plan is saved in the browser first. A cloud function
  (`saveGuestPlan`) is also called. After a few minutes a guest is asked to make
  an account, which stopped observation there. No account was made.

### Recovered architecture (bundle analysis)

| Finding                                                                                                                                                                                          | Confidence                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| A Vite production build in 61 chunks.                                                                                                                                                            | Observed (REA vite-runtime detector)                |
| Rendering with three.js: a `three.module` chunk, OrbitControls, RoomEnvironment, RoundedBoxGeometry, BufferGeometryUtils, and the WebGL extension queries three.js makes.                        | Observed (chunk names, extension strings)           |
| Geometry generated from the plan, by module: `wallSideGeometry`, `openingModels`, `roofModel`/`roofMeshes`, `furnitureModels`, `fenceModel`, `buildScene`, `sceneSnapshot`, `proceduralTexture`. | Inferred from chunk names; the bodies were not read |
| The plan is serialised by `planPayload` / `planFile` and exported by `exportModel`.                                                                                                              | Inferred from chunk names                           |
| Saves and catalogue requests go to a hosted backend (Supabase functions `saveGuestPlan`, `publicCatalog`). Furniture thumbnails come from object storage.                                        | Observed (requests)                                 |
| The 3D chunks are loaded on demand. Most were already fetched by the time the 2D editor settled, so they appear to be warmed in advance (a `prewarm3D` chunk).                                   | Observed (request order), inferred purpose          |

### Limits and open questions

- The minified bodies of the geometry modules were not decompiled. How corners
  are joined, how openings are cut and how roofs are generated is **not known**
  from the investigation, so those parts are designed independently below.
- The 3D view was not seen rendered: it was still loading in the headless
  browser when the time-based account gate appeared.
- Two scripts exceeded REA's per-script analysis deadline. Their findings are
  unknown.
- Export, sharing and rendering need an account and were known only from the
  documentation.

## 2. Specification (what Space Studio does)

### Principles

1. **One building model.** The 2D editor, the 3D view, the walkthrough, the
   checks, the reviews and the exports all read the same saved file. No view
   keeps its own copy.
2. **Pure and tested.** The model, its geometry and every edit are pure
   TypeScript (`src/studio/`), without React or three.js.
3. **Local and free.** It has no backend, account, paid API or downloads, and
   all assets are procedural.
4. **WorkSim's own systems.**
   - It is a professional tool (`src/tools/studio`), so autosave, undo, version
     history, backups and restore work as for every tool file.
   - Tasks are graded by its own checks, and colleagues review the real file.

### The model (`src/studio/model.ts`)

All lengths are millimetres (integers once snapped). The plan has x to the
right and y down; in 3D, plan y is z.

| Part             | Fields                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Project          | name, client, display units (mm, cm, m, ft-in), grid size, snapping                                                      |
| Floor (level)    | name, elevation, floor-to-floor height, slab thickness                                                                   |
| Wall             | floor, start, end, thickness, height, type (exterior, interior, partition), finish on each face                          |
| Opening          | wall, kind (door, window, pass-through), distance of its centre from the wall's start, width, height, sill, swing, style |
| Room             | floor, name, use, outline (polygon), floor finish, ceiling finish, whether it has a ceiling                              |
| Item (furniture) | floor, catalogue entry, position, rotation, size (default from the catalogue), colour, material                          |
| Stair            | floor, position, rotation, width, run, the floor it reaches                                                              |
| Column           | floor, position, size, round or square                                                                                   |
| Slab             | floor, outline, kind (balcony, terrace), railing                                                                         |
| Roof             | floor it sits on, outline, kind (flat, gable, hip), pitch, overhang, finish                                              |
| Label, dimension | floor, text and position; a measured line                                                                                |
| Saved view       | name, camera position and target                                                                                         |

An opening stores a distance along its wall, so moving or stretching the wall
moves the opening with it, as in the reference.

### Editing (pure operations, `src/studio/ops.ts`)

Every edit is a function `state → state`, so undo and redo are exact.

- **Drawing and editing walls:**
  - draw walls point by point (Shift locks the angle to 45° steps);
  - draw rectangle rooms by dragging, or by typing the size;
  - move a wall, or one of its ends: corners that share the point follow, and rooms stay closed;
  - set a wall's length, thickness, height and type exactly;
  - set a room's width and depth exactly: its walls, doors and contents follow.
- **Adding elements:** place doors, windows and pass-throughs on a wall, where
  they fit (they are refused, with the reason, where they do not); stairs,
  columns, slabs, roofs, labels and dimensions.
- **Furniture:** place, move, rotate (15° steps, or exactly), resize, recolour
  and change material.
- **Selection:** select one, several (Shift-click or a box) or all. Move,
  rotate, copy, paste, duplicate and delete the selection; nudge it by the grid,
  or by 10 mm with Alt.
- **Floors:** add (copying the outline of the floor below, optionally), rename,
  set heights, delete with confirmation.
- **Snapping:** to the grid, to wall ends and to wall lines, with Alt to ignore
  snaps.
- **Units:** shown and typed in mm, cm, m, or feet and inches; stored in mm.

### 3D (`src/studio/geometry.ts` → `src/tools/studio/three/`)

- **Walls:**
  - boxes, split around openings (the piece below a window sill and the piece
    above each opening);
  - joined ends are extended by half the thickness so that corners close;
  - each face has its own finish.
- **Openings:** frames, glass, door leaves (shown open at their swing).
- **Rooms:** floors and ceilings (made from the room outlines), each with its finish.
- **Other parts:**
  - stairs as steps;
  - columns, slabs with railings;
  - roofs: a flat roof with a parapet, or a gable or hip roof built from the outline's bounding rectangle;
  - furniture built from procedural parts (boxes, cylinders) for each catalogue entry.
- **Light:**
  - day, evening or night, with shadows when graphics allow;
  - night lights the rooms from their ceiling lights.
- **Camera:** orbit, pan and zoom; top, front, side and 3D presets; one floor or
  all floors shown; walls full or cut away; saved views; a screenshot (PNG).

### Walkthrough

- **Movement:**
  - start inside the selected room (or the largest room) at eye height (1.6 m);
  - WASD or the arrow keys walk, the mouse looks around (pointer lock), Shift walks faster.
- **Collision:**
  - walls block the player (a circle against each wall's pieces);
  - doorways and pass-throughs let them through, and windows do not;
  - furniture blocks the player except for low items.
- **Stairs:** walking onto a stair lifts the player smoothly to the floor it
  reaches.
- **Feedback and exit:** the room the player is in is named on screen. Esc
  leaves and returns to the editor.

### Furniture and materials (`src/studio/catalog.ts`, `materials.ts`)

- **Furniture catalogue:** about 70 entries in 14 groups:
  - beds, sofas and seating, tables, desks and office equipment, storage;
  - kitchen, bathroom, lighting, decoration, plants, outdoor;
  - reception, meeting rooms, and technical items.
- **Each catalogue entry** has its size, a price (fictional, for budgets), a
  footprint symbol for the plan, a procedural 3D build, and a default colour and
  material.
- **Materials:** paint colours, timber, tiles, concrete, stone, carpet, glass and
  metal. Each has a colour, a roughness, an optional procedural texture (stripes
  for boards, a grid for tiles), and a fictional price per m².

### Projects, saving and exports

- **Projects:**
  - each project is one tool document;
  - New project (blank or from a starter), duplicate, rename, and delete (with
    confirmation) from Space Studio's start page;
  - task files and the practice file live there too.
- **Saving:** autosave and version history (restore any earlier state) are
  WorkSim's own; Save now flushes at once.
- **Exports, all made from the model:**
  - **SVG:** the floor plan to scale, with dimensions, labels and a title block;
  - **PNG:** the same plan, rasterised;
  - **PDF:** the plans of every floor at a chosen scale (1:50, 1:100 or 1:200) on A3, with a title block, followed by the project report;
  - **DXF:** walls, openings, rooms and furniture on layers, using the CAD writer the Engineering career already has;
  - **JSON:** a full backup of the project, which can be imported back as a new project;
  - **3D screenshot:** a PNG;
  - **Project report (HTML):** rooms and areas, the furniture schedule with costs, finishes, budget, and the checks.

### Checks, tasks and reviews

- **Analysis (`src/studio/analysis.ts`)** reads the model:
  - each room's area and dimensions;
  - doors and windows per room;
  - whether every room can be reached from the entrance through doors;
  - furniture by room and group; clearances (items through walls, overlapping items, or a door swing blocked);
  - stairs that reach a floor, total floor area, and cost against budget.
- **Tool checks** grade tasks on that analysis (for example a room count by
  use, a minimum area, a budget limit).
- **Reviews:** each colleague reviews from their own angle:
  - the Architecture Lead on structure and layout;
  - the Interior Designer on furniture and finishes;
  - the Project Manager on budget and brief;
  - the client on the brief in their own words.

  Every comment names the actual rooms, sizes and items in the player's file.

## 3. Phases

| Phase | Deliverable                                                  |
| ----- | ------------------------------------------------------------ |
| 0     | This investigation and specification                         |
| 1     | Model, geometry and operations, with unit tests              |
| 2     | Space Studio as a tool: the 2D editor and project management |
| 3     | The 3D view from the same model                              |
| 4     | The furniture library                                        |
| 5     | Materials                                                    |
| 6     | The walkthrough                                              |
| 7     | Exports and the report                                       |
| 8     | The career: its tasks, checks, reviews and content           |
| 9     | Browser tests, performance, documentation                    |

## 4. What was built

### Space Studio (`src/studio`, `src/tools/studio`)

| Area             | What the player can do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Projects         | New (blank, a furnished flat, a two-storey house), open, duplicate, rename, delete with confirmation, import a JSON backup. Task files and the practice file sit alongside. Autosave, Save now, Version history (restore any earlier state).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2D plan          | Rooms by drag or typed size (`4200x3600`); walls corner by corner with typed lengths and 45° locking; doors, windows and pass-throughs placed where they fit (refused with the reason where not), opening towards the side clicked; stairs, columns, balconies and terraces, roofs, labels, dimensions, a measuring tape. Snapping to corners, walls and the grid (Alt to place freely). Select, box-select, Shift-click, Select all; move, rotate (handle, `[` `]`, exact angle), resize (handle or fields), copy, paste (also into another project), duplicate, delete; undo and redo. Floors: add (copying the outside walls), rename, heights, delete with confirmation, Alt+Up/Down. Units: mm, cm, m, feet and inches. Layers. |
| 3D               | The same model: walls in pieces round their openings, a finish per face, floors, doors (open), windows, stairs, columns, balconies with railings, flat, gable and hip roofs, procedural furniture and finishes. Orbit, pan, zoom; 3D, Top, Front and Side; saved views; Day, Evening and Night light (lamps lit at night); low walls; all floors or up to this one; roof on or off; select in 3D and edit in the panel; screenshot.                                                                                                                                                                                                                                                                                                  |
| Walkthrough      | Starts in the selected (or largest) room at eye height. W A S D or arrows, Q and E to turn, drag to look, Shift to hurry. Walls always stop you, doorways let you through, windows do not; furniture stops you unless G is pressed. Stairs carry you to the floor above and back. The room you are in is named; room buttons jump between rooms; P takes a photo; Esc returns to 3D.                                                                                                                                                                                                                                                                                                                                                 |
| Library          | 71 items in 12 groups, searchable, each with real sizes, a price, a plan symbol and a procedural 3D build; 11 doors and windows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Finishes         | 37 procedural materials (paint, wood, tiles, stone, concrete, textiles, glass, metal, roofs) with prices per m², for walls (each face), floors, ceilings, furniture, balconies and roofs, shown in 3D at once.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Checks and costs | Rooms that cannot be reached, a missing way in, rooms without windows, small or narrow bedrooms, narrow doors, openings that no longer fit, furniture in walls, overlapping or blocking a door, stairs that land nowhere, cost against budget.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Reviews          | The Architecture Lead, Interior Designer, Project Manager and the client review the design live (Reviews tab) and again when a task is submitted, in the manager's reply. Every comment is worked out from the file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Exports          | PDF (each floor to a standard scale on A3 with a title block and scale bar, then the report), SVG (1:100), PNG, DXF (layered, mm), project report (HTML), JSON backup; 3D screenshot (PNG).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### The career: Architecture & Interior Design

- **The practice:** Spaces & Interiors at Cobalt Ridge Consulting. Its people:
  - Marguerite Achebe, the Architecture Lead (the manager);
  - Tobias Lindqvist, the Senior Designer;
  - Sana Haddad (Interior Designer), Callum Reid (Project Manager), Wen Zhou (Architectural Technologist), Ola Adeyemi (Junior Designer) and others.
- **The office:** its own corner, the design studio, has a plan table, a plotter, the samples library and a model on a plinth. They open Space Studio, and colleagues work there through the day.
- **Levels:**
  - Junior Designer, then Designer, then Senior Designer, then Design Lead.
  - Four new skills: space planning, interior design, building design and working to a brief.
- **Nine tasks in Space Studio**, each graded on the design itself:

  | Level           | Task                                                                                   |
  | --------------- | -------------------------------------------------------------------------------------- |
  | Junior Designer | A two-bedroom flat in a fixed shell                                                    |
  | Junior Designer | Furnishing an office for eight within a budget                                         |
  | Junior Designer | Redesigning a reception: accessible doors, clear swings, seating, a hard-wearing floor |
  | Designer        | Making an overcrowded office work                                                      |
  | Designer        | Correcting a supervisor's review                                                       |
  | Designer        | Planning a shop unit with an accessible WC                                             |
  | Senior Designer | Adding a storey with a stair                                                           |
  | Senior Designer | An interior proposal with a design statement, on budget                                |
  | Design Lead     | Value-engineering an over-budget fit-out                                               |

- **Fifteen cases**, in the same mix as every career:
  - a client who wants a wall removed;
  - the paint order;
  - the studio's requests;
  - the survey handover to a contractor, and its follow-up;
  - the reception design review (a meeting);
  - a blocked escape route on site (an incident);
  - the Manchester office space plan and its review (the programme part);
  - leading the Harbour Housing block;
  - a daylight check;
  - a fit-out estimate;
  - three cases on using AI responsibly.

  Four of them have variants.

- **Readiness assessments:**
  - level 2: is it a double bedroom?
  - level 3: how many desks fit?

  Each has two versions with practical work in Space Studio.

- **Equipment:** a tape measure, a laser distance meter, a hard hat, a work tablet and a staff ID badge.
- **Other professions:** Space Studio is also on the dock for Engineering (from Graduate Engineer) and for Office Administration (from Junior), for office layouts and facilities work.

### Tests

- **Unit tests:**
  - `src/studio/studio.test.ts`: the model, units, geometry, every edit, collision and the analysis;
  - `src/studio/review.test.ts`: the reviews;
  - `src/tools/studio/three/building.test.ts`: the 3D build from the model;
  - the shared tool, case, assessment, variant, workplace and achievement tests now cover the career;
  - every task's model answer scores 100%, and an untouched file fails.
- **Browser tests:** `tests/e2e/space-studio.spec.ts`:
  - drawing, sizing, a door refused where it does not fit, furnishing, rotating, undo and redo;
  - 3D, light, the walkthrough stopped by a wall and out through the doorway, and the project kept after a reload;
  - every export downloaded and read back; duplicate, rename and delete;
  - the corrections task fixed in Space Studio, marked 100%, and the team's review in the manager's reply.

## 5. The story: “The Headquarters Transformation”

The career's Story Mode (`src/game/story/campaigns/architecture.ts`), built on
the same campaign engine as every other career.

| Chapter               | Missions (main, side)                                                                   | What moves it on                                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · New in the studio | A scale rule and a desk; Your first plan; _Which way is north?_                         | Meeting Marguerite and Tobias; **the flat B task passed in Space Studio**; Sana's critique                                                                                                               |
| 2 · The brief         | Our own floor; Everyone wants something; First impressions; _The numbers do not add up_ | The headquarters redesign announced; Finance, Office Administration (Tom) and People & Culture's competing needs; **the Lumen fit-out and the Brightsmile reception passed**; Nina's front-of-house list |
| 3 · Revisions         | Your own zone; The riser; Fifteen per cent; _Open plan, closed doors_                   | **Promotion to Designer**; Northbank Engineering's riser (Ingrid); **the Northgate re-plan passed**; Finance's 15% cut (Priya) and **the studio's requests case**; Sana and Tobias's disagreement        |
| 4 · The presentation  | A week early; Pictures or the truth; The board; What comes next                         | The deadline moved forward with Tobias called away; **the Brightsmile design review case** as a rehearsal; Hamid's renders or the real walkthrough; the board; the promotion opportunity                 |

- **Two new objective kinds** were added to the engine, used by this story and
  open to any career's:
  - `task`: a career task passed; work passed before the story reached it
    counts too;
  - `level`: a promotion.

  The story is checked again after every task is submitted, so it moves on as
  soon as the work is marked.

- **Decisions:** five decisions make a sound design:
  1. listening to Sana's critique;
  2. keeping Office Administration's post room;
  3. moving the meeting suite clear of the riser;
  4. phasing the works rather than cutting accessibility;
  5. showing the real model instead of flattering renders.

  The board raises exactly the problems left in. Four or more good decisions
  earn approval and a recommendation for Senior Designer; two or three bring
  conditions; fewer, a design sent back.

- **Integrity:** missions open in order, a chapter only after the last one's
  main missions, and objectives are done in order, so nothing essential can be
  skipped. Progress is part of the save, so it survives reloads. No case was
  added, so the career's cases stay balanced with every other career's.

## 6. Limits lifted (2026-11-21)

- **Roofs follow the building:**
  - a roof drawn over square-cornered rooms takes their joined outline;
  - pitched roofs are built over each rectangle of it, so an L-shaped plan
    gets a cross-gable;
  - flat roofs follow the outline exactly (`src/studio/outline.ts`).
- **Curved walls (Shift+W):** click both ends, then bend. The curve is made of
  short straight walls, so doors, 3D, collision and the checks work on it as
  on any wall.
- **Typed sizes for any room:** a non-rectangular room is stretched in
  proportion, and its walls and furniture follow.
- **Doors swing:**
  - in the walkthrough each door opens as you come within 1.6 m, and closes
    behind you;
  - in 3D a _Doors open_ button shows them open or closed.
- **Vector PDF:** plans are drawn as lines, fills and text, to scale
  (`src/tools/studio/pdfPlan.ts`).
- **DXF import:** _Import a backup or DXF_ reads Space Studio's own DXF back
  (floors, walls, named rooms, doors, windows, labels), or any other ASCII DXF
  (lines become walls, closed outlines become rooms, in the drawing's units)
  (`src/studio/dxfImport.ts`).

## 7. Limits that remain

- **Roofs on angled outlines:** a roof over rooms that are not square-cornered
  covers their bounding rectangle.
- **Curved walls** are faceted (pieces of about 40 cm).
- **DXF import from other programs** brings walls and rooms. Their doors,
  windows and furniture are not recognised, because every program draws them
  differently.
- **Space guidance and prices** are simplified and fictional, and every screen
  says so.
