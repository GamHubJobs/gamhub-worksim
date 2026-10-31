# GamHub WorkSim: Development Log

Newest entries first. Each milestone lists what was built, key decisions, how it
was tested, and known limitations.

---

## Current status

**Phase 0: Foundations is complete.** Online deployment (0.22) is postponed by the
owner.

**Phase 1: "Your First Day as an Intern"** (in progress). Milestones:

- [x] 1.1 Formula engine (pure TypeScript, heavily tested)
- [x] 1.2 Spreadsheet editor: formula bar, selection, copy/paste, undo/redo, formatting
- [x] 1.3 Assignment system: workplace data, instructions, submission, automatic grading
- [x] 1.4 Simulated desktop with Mail and Tasks; XP, skills, feedback and rewards
- [x] 1.5 More assignments, polish, browser tests for the full journey
- [x] 1.6 Minimal 3D office with hotspot navigation

**Phase 1 is complete.**

---

## 2026-10-31 · Milestone 1.6: the 3D office

### Built

- **A 3D office floor** for Cobalt Ridge Consulting (React Three Fiber + three.js +
  drei, all MIT-licensed, free). Everything is built from simple shapes in code: no
  downloaded models, textures or fonts, no external requests.
  - **Reception**: company feature wall, reception desk with Nina (new character:
    receptionist), waiting area with sofa, rug, plants, glass entrance.
  - **Open-plan workspace**: two rows of desks with monitors, keyboards, mugs and
    papers; five colleagues (typing, looking around); the player's own desk with a
    blue chair, a name plate and a floating envelope when there is unread mail; a team
    whiteboard; a wall clock showing the real time; windows with a city skyline.
  - **Priya's office**: glass walls, desk, Priya, guest chairs, bookshelf.
  - **Break room**: kitchen counter, coffee machine, fridge, water cooler, table with
    a colleague on a break, Tom by the coffee machine, notice board.
- **Click-to-go navigation**: glowing rings on the floor, clicking people/objects, or
  the "Places" bar. The camera glides between four fixed viewpoints.
- **Interactions that reflect real progress** (`src/game/office.ts`, pure, tested):
  - Priya talks about the current task (new, in progress, needs revision with the
    score, all done, promoted) and opens it on the computer.
  - Nina welcomes new starters and later mentions unread email.
  - Tom shares a different practical spreadsheet tip each time.
  - The team whiteboard shows this week's tasks and their status; the notice board
    shows company news; the coffee machine suggests short breaks.
- **The computer is at your desk**: "Use your computer" opens the existing desktop
  (Mail, Tasks, Sheets, Career), unchanged. "Leave desk" in the dock returns to the
  office. New players arrive at reception; reloads return to where the player was.
- **Lightweight by design**:
  - The 3D code is a separate file (~250 kB compressed), downloaded only when the
    office is shown; the rest of the app is unaffected.
  - It draws frames on demand (30 per second for gentle movement, smoothly while the
    camera moves), not as fast as possible.
  - On computers without a graphics card (software 3D), it automatically uses a light
    mode: lower resolution, 3 frames per second when idle, no soft shadows. In testing
    this took the page from 5 to 28 responsive frames per second.
  - Without WebGL at all (or if the 3D view fails), a simple 2D floor plan with the
    same places and interactions is shown instead. Every action also exists as a normal
    button, so the office works with a keyboard and screen readers.

### Decisions

- Built from primitives instead of downloaded models: zero licensing risk, tiny
  download, consistent friendly style, easy to change in code.
- Fixed viewpoints instead of free movement: no motion sickness, no getting lost,
  works with a mouse alone, and keeps the focus on the work.
- The office is a layer on top of the existing desktop: no gameplay, saving or
  grading code changed.

### Tested

- 395 unit tests (adds office dialogue for every career state, layout consistency).
- Browser tests (adds 3): arriving at reception, talking to Nina, Priya, Tom, coffee,
  whiteboard and notice board, Priya opening the task on the computer, leaving the
  desk, the office remembering where the player was; progress at the computer changing
  what Priya says; the 2D floor plan when WebGL is unavailable. All earlier tests now
  walk from reception to the desk first.

### Known limitations

- People don't walk around yet, and there is no day/night or workday clock.
- The light mode on computers without a graphics card is less smooth by design.

---

## 2026-10-31 · Milestone 1.5: a complete first week

### Built

- **Task 2, "Summarise the expense claims"**: 14 realistic claims and the company rule
  "claims over $250 need approval". Teaches IF (one claim is exactly $250.00, so `>`
  vs `>=` matters), SUM, COUNT, AVERAGE, MAX, MIN, COUNTIF, and that counts are not
  money.
- **Task 3, "Check a supplier invoice"**: an invoice and an agreed price list on two
  sheets. Teaches VLOOKUP across sheets with an exact match (the price list is not
  sorted, so forgetting FALSE silently returns wrong prices, which the grader
  catches), IF comparisons and COUNTIF. Three invoice lines are overcharged.
- Passing all three intern tasks with enough XP (300) **promotes the player to
  Junior Finance Assistant**, with a promotion email and banner.
- Every assignment workbook now has an **"Original, as received"** version kept in its
  history, so the starting data can always be restored.
- The task pane's brief greets the player by name; the backup reminder no longer
  covers the top bar.

### Tested

- 387 unit tests (adds both new assignments through the content checks, the `>=`
  trap, VLOOKUP without FALSE, a lookup range that moves when filled down, the full
  week leading to promotion, locked tasks).
- 30 browser tests (adds a full week played through the interface: three tasks,
  every key function, cross-sheet VLOOKUP, promotion to Junior Finance Assistant).

### Known limitations

- There are three tasks so far; the next career level shows "more tasks will arrive".
- No workday clock or energy yet (planned with the wellbeing systems).
- No 3D office yet (next milestone).

---

## 2026-10-31 · Milestone 1.3–1.4: assignments, grading, desktop and career

### Built

- **Content as data** (`src/content/`): a fictional company (Cobalt Ridge Consulting),
  colleagues (manager Priya Raman, Tom from Facilities, Grace from People & Culture),
  six skills, the Office Administration & Finance career (Intern → Junior Finance
  Assistant → Finance Assistant → Finance Officer), and assignments validated by Zod.
- **First assignment, "Price the office supplies order"**: a realistic 10-line supplies
  order. The player calculates line totals, fills the formula down, adds a SUM total
  and formats money, guided by six steps with hints, a "why this matters" section and
  learning objectives.
- **Automatic grading** (`src/game/grading.ts`, pure TypeScript):
  - compares every checked cell with the model answer (with a tolerance for cents);
  - catches typed-in results ("E2 has the right number, but it was typed in");
  - checks required functions ("E13 should use SUM");
  - **robustness test**: changes the source data (the assignment's own scenarios plus
    "every number changed") and recalculates both workbooks, which catches formulas
    with hidden fixed numbers or wrong references;
  - checks formatting cell by cell and that source data was not changed;
  - partial credit per cell; every problem explained cell by cell, with a fix and why
    it matters.
- **Career rules** (`src/game/career.ts`): XP and skill XP only for passing work,
  resubmissions only pay for improvements, +10% bonus for an excellent first attempt,
  skill levels (Novice → Expert), promotion when the level's tasks are all passed and
  enough XP is earned, next task unlocked on first pass, feedback emails listing what
  to fix.
- **Player profile** saved in the database (new table `profiles`, database version 3,
  tested upgrade), included in backups. Starting a task (workbook + profile) and
  submitting (kept "Submitted" copy in version history + profile) are each one
  transaction.
- **Simulated desktop**: first-day screen (name), dock with Mail, Tasks, Sheets and
  Career (unread/new badges), top bar with title and XP.
  - Mail: inbox and reading pane; task emails open the task, feedback emails open the
    detailed results.
  - Tasks: status (New, In progress, Needs revision, Completed, Locked), why it
    matters, objectives, skills, rewards, feedback on the latest submission, history.
  - Sheets: work files and the Practice Workbook; workbook window with save status,
    version history and the **task pane** (steps checklist, hints, brief, Submit).
  - Results screen: score, rating, XP and skill gains, level-ups, unlocked task,
    feedback per check.
  - Career: level, XP, promotion requirements, skills, work record.
- The app reopens where the player left off (last view), so reloads and crash recovery
  return to the open workbook.

### Decisions

- The model answer is a set of formulas, not a list of numbers, so grading always
  matches the data, and scenario tests come for free.
- Failed attempts earn no XP, so XP always means "work that passed".
- One profile record holds the whole career for now (small, simple, syncs as one
  unit). It can be split into tables later if it grows.

### Tested

- 370 unit tests (adds grading of correct, typed-in, hidden-number, wrong-row,
  missing-SUM, unformatted and changed-data workbooks; career rules; profile storage,
  transactions and backups; database upgrade 2→3; every assignment's model answer
  scores 100% and an untouched workbook fails).
- 29 browser tests (adds the full first-day journey: onboarding → email → task →
  failed submission with feedback → doing the work → 100% → XP → reply email →
  career page → reload; and typed-in results being caught). All earlier tests now run
  through the new desktop.

---

## 2026-10-31 · Milestone 1.1–1.2: a real spreadsheet

### Built

- **Formula engine** (`src/apps/sheets/engine/`, pure TypeScript, no React):
  - Parser for numbers, "text", TRUE/FALSE, references (`A1`, `$A$1`, `Prices!A1`,
    `'Price list'!A1`), ranges (`A1:C5`, `A:A`), operators `+ - * / ^ & = <> < > <= >=`
    and `%`, with the same precedence as Excel.
  - 38 functions: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, COUNTBLANK, MEDIAN, PRODUCT,
    IF, IFERROR, AND, OR, NOT, VLOOKUP, HLOOKUP, MATCH, INDEX, SUMIF, COUNTIF, AVERAGEIF,
    ROUND, ROUNDUP, ROUNDDOWN, ABS, INT, MOD, SQRT, CONCATENATE, CONCAT, LEN, UPPER,
    LOWER, PROPER, TRIM, LEFT, RIGHT, MID. Each has help text (syntax, description,
    example).
  - Real spreadsheet errors (#DIV/0!, #VALUE!, #REF!, #NAME?, #N/A, #NUM!, #ERROR!),
    each with a **plain-language explanation of this particular problem**, e.g.
    "There is no function called SUMM. Did you mean SUM?" or "VLOOKUP could not find
    "P-999"… Tip: add FALSE as the last value to look for an exact match."
  - Circular references are detected (also very long loops). Very long formula
    chains (thousands of rows) are calculated in steps instead of crashing.
  - Copying a formula moves its references (`=B2*C2` → `=B3*C3`; `$` keeps them fixed;
    references falling off the sheet become #REF!). Renaming a sheet updates formulas.
- **Display formats**: number (1,234.50), currency ($1,234.50), percent (12.5%), with
  adjustable decimals. Typed values keep their style ("15%", "$99", "4,500.00").
- **Spreadsheet editor** (`ui/SheetEditor.tsx`, replaces the Phase 0 grid):
  - Formula bar (edit there or in the cell), name box (type B12 to jump there).
  - Function name suggestions while typing (Tab to insert) and a help card for the
    function being typed, highlighting the current value.
  - Clicking cells (or using arrow keys) while typing a formula inserts references;
    references are colour-highlighted on the grid. Missing closing brackets are added.
  - Range selection (drag, Shift+click, Shift+arrows, Ctrl+A), Ctrl+arrows to jump.
  - Copy/cut/paste (formulas and formatting inside WorkSim; plain text to and from
    Excel, Google Sheets, email…), Ctrl+D / Ctrl+R fill.
  - Undo/redo (200 steps, toolbar and Ctrl+Z / Ctrl+Y). Undone changes are saved too.
  - Toolbar: bold, italic, alignment, currency, percent, thousands, decimals, fill
    colour, clear formatting. Resizable columns (double-click to fit).
  - Several sheets per workbook: add, rename (double-click), switch.
  - Status bar with Sum, Average and Count of the selection.
  - The grid grows as needed (100 rows / 26 columns minimum).
- **Save format 2** for workbooks: optional cell formatting and column widths. Format 1
  workbooks and backups are upgraded automatically (tested).

### Decisions

- Own engine instead of a library: the open-source engines are either GPL-licensed
  (not allowed for this commercial product) or far larger than needed. Ours is small,
  fully tested and explains errors for learners, which is the point of the product.
- Behaviour follows Excel/Google Sheets wherever possible (operator precedence,
  number/text comparison rules, VLOOKUP's approximate default, empty cells as 0), so
  skills transfer to real jobs.
- Results are recalculated on demand and remembered until the next change; there is
  no stored dependency graph yet. Fast enough for workbooks of several thousand cells.
- No row virtualisation yet: rows are only redrawn when their content changes, which
  keeps the grid responsive at the sizes assignments use.

### Tested

- 327 unit tests (adds ~190): parser, every function, error messages, circular and
  very long chains, reference moving, number formats, clipboard, fill, sheets,
  formula help, save-format upgrade.
- 27 browser tests (adds 9): formulas calculate and update, errors explained, function
  suggestions and click-to-reference, formula bar editing, copy/paste and fill down,
  undo/redo, formatting saved, sheets and cross-sheet formulas, pasting text from
  other programs.

### Known limitations

- No dates/times yet (typed dates stay text), no wildcards in MATCH, no charts.
- Formulas pasted from other programs arrive as text values, not formulas.
- Deleting sheets and inserting/deleting rows and columns are not available yet.
- The production bundle is just over 500 kB (≈150 kB compressed); it will be split
  when the 3D office is added.

---

## 2026-10-31 · Milestone: Stage C, storage protection and backups (Steps 0.16–0.21)

### Built

- **Storage health** (`storageHealth.ts`): asks the browser for persistent storage after
  the first real save (not on first load); shows whether it was granted, usage and
  quota; warns about low space and very small quotas (typical of private windows).
  If IndexedDB is blocked, the player sees a clear explanation instead of a crash.
- **Storage & backup panel** (`StoragePanel.tsx`): honest explanation of where work is
  stored and what can delete it, protection status, last backup time.
- **Backup export** (`backup.ts`): one JSON file with app version, database version,
  date and a SHA-256 checksum. Every table is included automatically (a test fails if a
  new table has no import validator). The outbox and device-specific values (device
  ID, last backup time) are excluded.
- **Backup import**: checks the file (is it a backup? newer app version? checksum?),
  upgrades and validates every item, shows a preview (date, workbook names, number of
  versions, damaged items to skip). Before replacing data it **downloads a safety
  backup of the current data**. The import is one transaction (all or nothing) and marks
  everything for future cloud sync.
- **Backup reminders**: a banner after 7 days of changes without a backup, with "Remind
  me later" (3 days). New players are not nagged in their first week.
- **Multi-tab protection** (`tabLock.ts`): only one tab can edit (Web Locks API). A
  second tab shows "already open in another tab" with **Use WorkSim in this tab**. The
  first tab then saves everything, ends its session normally and hands over; if it does
  not answer within 3 s, the lock is taken by force. A waiting tab takes over
  automatically when the other tab closes. The crash banner is no longer triggered by
  multiple tabs.
- **GitHub Actions** (`.github/workflows/checks.yml`): every push runs formatting, lint,
  type check, unit tests, production build and browser tests (free minutes for private
  repos).

### Decisions

- Import **replaces** all data (no merging) for now. Merging is a sync problem, to be
  solved together with cloud sync in Phase 8.
- Damaged items in a backup are skipped (and reported in the preview) rather than
  rejecting the whole file, so one bad record cannot make a backup useless.
- The app reloads after an import, which is the simplest way to guarantee every screen
  shows the restored data.

### Tested

- 151 unit tests (adds storage health, backup round trip, tampered, newer-version and
  damaged-item handling, reminder rules, database-version consistency).
- 18 browser tests (adds): backup restored into a **fresh browser profile**, safety
  backup downloaded before restoring, non-backup and tampered files rejected without
  changes, storage panel content, second tab blocked, "use here" hand-over with unsaved
  changes carried over (and back), automatic take-over when the first tab closes.

### Known limitations

- The persistent-storage decision is the browser's. Chrome often says "no" for new
  sites until they are used regularly or installed; the panel says so honestly.
- Backups are manual downloads. Automatic backup to a folder (File System Access API,
  Chrome only) or cloud sync can come later.

---

## 2026-10-31 · Milestone: Stage B, the save system (Steps 0.10–0.15)

### Built

- **Documents repository** (`documentsRepo.ts`): the single place documents are saved.
  Every change validates the data, raises `rev`, stamps `updatedAt` and `deviceId`, and
  writes an outbox entry, all in one transaction. Deletion only marks records as
  deleted. Damaged records are reported clearly; one damaged document never hides the
  others.
- **Spreadsheet model and grid** (`apps/sheets/`): 26 × 50 grid with cell selection,
  typing, Enter/Tab/arrow navigation, Escape to cancel, Delete to clear, double-click/F2
  to edit, a cell bar showing the selected cell. No formulas yet (Phase 1).
- **Autosave** (`autosave.ts`): saves 1 s after typing stops (at most every 5 s during
  non-stop work), never runs two saves at once, retries failures forever (1 s, 3 s, then
  every 10 s) without losing data, and saves immediately when the tab is hidden or
  closed. A save indicator shows Unsaved / Saving / Saved · time / error.
- **Emergency journal** (`emergencyJournal.ts`): each change is also written instantly
  to LocalStorage. If the tab crashes before autosave runs, the change is recovered on
  the next start and a banner confirms it.
- **Session marker** (`session.ts`): detects an abnormal shutdown and reassures the
  player that nothing was lost.
- **Version history** (`versions.ts`, `VersionHistoryPanel.tsx`): automatic version
  every 5 minutes of editing, a "when you left" version on close, manual "keep a copy"
  (starred, kept forever), newest 20 automatic versions kept. Read-only preview of any
  version, and restore. Restoring first saves a "before a restore" version, so every
  restore can be undone.
- **Save-format upgrades**: database version 2 (adds a combined index for version
  history) with a tested upgrade from version 1; a document-format upgrade framework
  (`documentMigrations.ts`) that also refuses data saved by a newer app version.
- **Practice workbook** (`workbench.ts`): the single document used in Phase 0.

### Decisions

- **Store what the player typed, never calculated results.** Results will be
  recalculated by the formula engine; saved data stays small and can never contain stale
  totals.
- **Journal on every committed cell change**, not only when closing. Close events are
  unreliable in a crash; a synchronous LocalStorage write per change is cheap.
- **Text still being typed** (not yet confirmed with Enter) is committed automatically
  when the page is hidden or closed.
- **Playwright brought forward** from Step 0.20 so the interface can be verified
  automatically (including real tab crashes) during autonomous development.
- Grid is a plain HTML table for now; virtualisation comes with the Phase 1 grid.

### Tested

- 118 unit tests (Vitest): schemas, database, repository, versions, migrations, autosave
  (with simulated time), journal, session marker, sheet model, time formatting.
- 11 browser tests (Playwright, Chromium):
  - values survive reload; clearing a cell is saved; keyboard editing; clicking away
    saves the edited cell
  - **tab crash 0 s after typing: change recovered from the journal** with banner
  - crash with everything saved: reassuring banner, nothing lost
  - unconfirmed typing is kept on reload; normal reload shows no banner
  - preview / restore / undo-restore; automatic versions while working

### Known limitations (to address later)

- If the **whole browser or computer** crashes (not just the tab), the browser itself
  may not have written its most recent data to disk. A few seconds of work can be lost
  in that case. Backups and, later, cloud sync limit the damage.
- Text being typed into a cell (not yet confirmed) is lost in a hard crash; it is kept
  on a normal close.
- The "when you left" version on close is best effort (the browser may stop it).
- A damaged workbook shows a clear error but is not yet automatically repaired from its
  latest valid version.
- Opening WorkSim in two tabs is not yet protected (Step 0.19). The crash banner may
  also appear wrongly in that case.

---

## 2026-10-31 · Milestone: Stage A, tools and project setup (Steps 0.1–0.9)

- Vite + React 19 + TypeScript 7 project; Oxlint (template default, replaces ESLint),
  Prettier with format-on-save, LF line endings via `.gitattributes`.
- Tailwind CSS 4 styling; Vitest unit tests; `npm run check` runs everything.
- Zod schemas for documents and versions with sync fields (`id`, `createdAt`,
  `updatedAt`, `rev`, `deviceId`, `deleted`).
- Dexie database `gamhub-worksim` (tables: meta, documents, documentVersions, outbox)
  and a per-device ID.
- Private GitHub repository: https://github.com/GamHubJobs/gamhub-worksim
