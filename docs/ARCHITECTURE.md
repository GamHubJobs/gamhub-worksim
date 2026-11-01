# GamHub WorkSim: Architecture Overview

This file records the key decisions behind the project, so future work stays consistent.

## Product decisions

- Single-player, **local-first** web application. No multiplayer.
- **Private, commercial** codebase. Only use dependencies whose licences allow
  closed-source commercial use (MIT, Apache-2.0, BSD, CC0, and similar).
  Avoid GPL and "non-commercial" licences.
- **Desktop browsers first.** Mobile and touch support come later.
- 3D office uses **hotspot (click-to-go) navigation**, not free movement.
- First career path: **Office Administration / Finance Intern**.
- $0 budget: no paid services or APIs without explicit approval.
- Learning tools and career progression never depend on purchases.

## Layers

```
Screens & HUD
3D World  |  Workstation (simulated desktop + apps)
Game Core (pure logic: rules, no visuals)
Content (data files: assignments, characters, scenarios)
Persistence (IndexedDB, autosave, versions, backups, future sync)
```

## Rules that keep the project maintainable

1. **Only `src/persistence/` touches storage.** Everything else asks it to save or load.
2. **Game logic and the spreadsheet engine are pure TypeScript.** They never import
   React or 3D code, so they are easy to test and reuse.
3. **Content is data, not code.** New assignments, characters and scenarios are added
   as validated data files.
4. **Every saved record carries sync fields** (`id`, `createdAt`, `updatedAt`, `rev`,
   `deviceId`, `deleted`) and changes are recorded in an `outbox`, so cloud sync can
   be added later without changing the save format.
5. **Saved data is validated on load** and upgraded through versioned migrations.

## Saving principles

- Players never need to press Save. Work autosaves within about a second.
- Crash recovery, version history and backup export/import are core features.
- Browser storage is **not permanent**. It can be cleared by the user, by the browser
  under storage pressure, in private windows, or lost if the site address changes.
  Backups (and later, cloud sync) are the real safety net.

### How a change is saved

```
Player types in a cell
  → app state updated                         (instant)
  → emergency journal in LocalStorage         (instant, synchronous)
  → autosave to IndexedDB via documentsRepo   (~1 s after typing stops, max 5 s)
      → document rev+1, outbox entry          (one transaction)
      → journal entry cleared
      → automatic version if 5 min passed     (documentVersions)
Tab hidden / closed → autosave flushed immediately, "close" version (best effort)
Next start → journal newer than saved document? → recovered and saved
```

### Persistence modules (`src/persistence/`)

| Module                  | Responsibility                                                 |
| ----------------------- | -------------------------------------------------------------- |
| `schemas.ts`            | Zod blueprints and TypeScript types for all saved data         |
| `db.ts`                 | Dexie database, versioned structure, device ID, outbox writes  |
| `documentsRepo.ts`      | Create / read / update / delete documents (validated)          |
| `documentMigrations.ts` | Upgrade old document formats on load                           |
| `versions.ts`           | Version history: snapshots, clean-up, restore                  |
| `autosave.ts`           | Debounced, retrying, never-overlapping autosave                |
| `emergencyJournal.ts`   | Last-second safety copy in LocalStorage                        |
| `session.ts`            | Detects whether the previous session closed normally           |
| `backup.ts`             | Backup export/import (checksum, validation), reminders         |
| `storageHealth.ts`      | Persistent-storage request, usage/quota, warnings              |
| `tabLock.ts`            | Only one tab edits at a time (Web Locks + BroadcastChannel)    |
| `meta.ts`               | Small named values (e.g. which workbook to open)               |
| `workbench.ts`          | The practice workbook                                          |
| `profiles.ts`           | Player profile (career, rewards, mail); start and submit tasks |
| `lastView.ts`           | Which app/workbook was open, to return there after a reload    |
| `portfolio.ts`          | Portfolio items and frozen file copies; presentation changes   |
| `portfolioBackfill.ts`  | Adds earlier passed work to the portfolio (safe to re-run)     |
| `employability.ts`      | The player’s own words for the employability profile           |

## Source folders

| Folder                                | What lives there                                                  |
| ------------------------------------- | ----------------------------------------------------------------- |
| `src/persistence/`                    | Everything that touches storage (see above)                       |
| `src/apps/sheets/engine/`             | Formula engine: parser, functions, calculation, formats (pure TS) |
| `src/apps/sheets/`                    | Spreadsheet model, clipboard, editor UI, workbook window          |
| `src/apps/docs/`                      | Docs: TipTap editor, templates, reading document text             |
| `src/apps/slides/`                    | Slides: model, themes, layouts, editor, presentation mode         |
| `src/apps/helpdesk/`                  | Help Desk: ticket queue, ticket detail, knowledge base            |
| `src/apps/code/`                      | Code: file list, editor, Run tests panel                          |
| `src/apps/shared/`                    | Save hook, document window, file browser, "insert from Sheets"    |
| `src/apps/mail/`, `tasks/`, `career/` | The other desktop apps                                            |
| `src/apps/portfolio/`                 | Portfolio app: work, skills, progress report, export              |
| `src/export/`                         | Exports: blocks, PDFs (`pdf/`), open formats, ZIP package         |
| `src/content/`                        | Content as validated data: company, careers, assignments          |
| `src/content/departments/`            | One file per department: its people, meetings, tips and news      |
| `src/game/`                           | Game rules (pure TS): grading, rewards, unlocks, promotion, mail  |
| `src/game/code/`                      | Code runner, code grading, and the Web Worker that runs them      |
| `src/tools/`                          | Professional tools framework and the tools (Books, …): see below  |
| `src/apps/tools/`                     | Shared tool screens: start page, tool window, guide               |
| `src/desktop/`                        | Onboarding and the simulated desktop (dock, top bar, navigation)  |
| `src/office/`                         | The 3D office (loaded on demand) and its 2D fallback floor plan   |
| `src/workday/`                        | Office clock, "Your day" panel, end-of-day screen                 |
| `src/app/`                            | Start-up, tab hand-over, shared services, the career hook         |

### How a submission is graded

```
Player clicks Submit
  → autosave flushed (submission refused if it cannot be saved)
  → saved workbook loaded
  → grader (src/game/grading.ts), pure functions:
      model answer = starting workbook + solution formulas
      every check compares the player's cells with the model answer
      formula required? function required (SUM, VLOOKUP, …)?
      data changed (assignment scenarios + "every number changed")
        → both workbooks recalculated → still equal?   (catches typed-in results)
  → career rules (src/game/career.ts): XP, skills, feedback email, unlock, promotion
  → one transaction: "Submitted" copy in version history + updated profile
```

Tasks with a report and/or presentation (`deliverables`) are handed in by
replying to the task email with files attached:

```
Player clicks Send in Mail (attachments chosen from all their files)
  → the attached workbook, report and presentation are loaded
    (the task's own files first; any other attached file of each kind counts)
  → grader: workbook checks as above (no workbook attached → zero, explained)
    + deliverable checks (src/game/deliverables.ts) on the report and slides:
      sections (headings / slide titles), figures (compared with the model
      answer, any sensible rounding), mentions, charts, tables, length
  → one transaction: "Submitted" copy of every file + the sent email + the
    profile (XP, feedback email, unlocks, events)
```

Help Desk tasks grade the ticket queue (`src/game/tickets.ts`: priority,
category and status against the model answer, and what each reply says).
Code tasks run tests:

```
Player clicks Submit (or attaches the project to an email)
  → the saved project is sent to a new Web Worker (src/game/code/codeWorker.ts)
      runner: the files are loaded as modules (import/export supported) and
      the tests run with a small test/expect API (src/game/code/runner.ts)
      code checks: "tests" (the project's own test file as the task wrote it,
      or hidden tests), "own-tests" (the player's tests, all passing),
      "mutants" (the player's tests must fail on copies with planted bugs)
  → no answer within 5 seconds → the worker is stopped, every code check
    fails with "Is there a loop that never ends?"
  → the results join the other checks in gradeAssignment (still pure)
```

### Careers and departments

A career (`src/content/careers.ts`) has levels, skills and the apps its dock
shows. Its department (`src/content/departments/`) supplies the manager, the
senior colleague, the director, stand-up and planning lines, tips and news.
Shared text is written with placeholders (`{manager}`, `{senior}`,
`{director}`, …) and filled for the active career at the edges: dialogue,
emails, notices, grading feedback and assignments. Each career is a separate
save (profile), and documents carry their `owner`, so every career has its
own files, colleagues and progress. Finance needed no changes to its saves.

| Career               | Department      | Main tool               | Professional tools                                      |
| -------------------- | --------------- | ----------------------- | ------------------------------------------------------- |
| Finance & Admin      | Finance         | Sheets, Docs, Slides    | —                                                       |
| Accounting           | Accounting      | Sheets, Docs, Slides    | Books                                                   |
| IT Help Desk         | IT Services     | Help Desk, Docs, Slides | Help Desk, Directory, Network Tools                     |
| Digital Marketing    | Marketing       | Sheets, Docs, Slides    | Social Planner, SEO Audit, Ad Campaigns, Site Analytics |
| Data Analysis        | Data & Insights | Sheets, Docs, Slides    | Data Studio (and new Sheets functions)                  |
| Software Development | Engineering     | Code, Docs              | Code (terminal, Git, debugger), API Client              |

### Professional tools

Each career uses simulations of its profession’s software (research, design and plan:
[PROFESSIONAL_TOOLS.md](PROFESSIONAL_TOOLS.md)). A tool registers once in
`src/tools/registry.ts` with a `ToolDefinition`: its state schema, sections, practice
data, guide, check schema and a pure grader. Its screens are registered in
`src/tools/ui.tsx` and loaded on demand. A career lists its tools
(`tools: [{ tool, fromLevel, sections }]`), and the dock, start page, locks, saving
(document kind `tool`), tasks (`kind: 'tool'`) and grading follow automatically.

### Documents of every kind

Workbooks (`sheet`), documents (`doc`, the editor's ProseMirror JSON),
presentations (`slides`), ticket queues (`tickets`) and code projects
(`code`) are stored the same way and share
`useSavedDocument`: autosave, the emergency journal, versions, restore and
rename. A change that would make a file invalid is refused before it is saved.
Charts are drawn by `src/ui/ChartView.tsx` (SVG) everywhere: live in Sheets,
and as frozen copies in Docs and Slides (like pasting a chart into a report).

### The portfolio (Phase 5)

Passing a task saves a portfolio item **in the same transaction** as the grade
(`saveSubmission` with a capture decision from `game/portfolio.ts`). An item is
the task's frozen description, the grade with every check, the attempt history,
and copies of the files handed in (`portfolioFiles`). There is one item per task
(a unique `key`); only a better pass replaces the evidence. The player can change
only how it is presented (included, featured, note, order). Earlier saves and
old backups get their items from the backfill, which runs at start-up. The plan
is in [PHASE5_PLAN.md](PHASE5_PLAN.md).

Competencies, the experience record and the progress report are calculated from
the items when shown (`game/competencies.ts`, `game/progressReport.ts`); nothing
is stored. Exports turn each file into blocks (headings, text, tables, charts,
code) and write them as real PDF text and vector charts, never screenshots.

### The working life (Phase 2)

All of it is stored in `profile.work` (profile format 2), so it autosaves and is
included in backups like the rest of the career.

```
Player action (walk, coffee, lunch, meeting, choice) or computer time
  → a pure game function in src/game (passTime, haveLunch, attendMeeting, applyEffects…)
      wellbeing changes, meetings missed, lunch skipped, deadlines passed, day ends
  → career.act(change): the change is applied to the latest saved profile, in one
    transaction (like every other profile change)
```

- **Time** moves only when the player does something. At the computer it runs 6× real
  time and pauses when the player is away (`src/workday/useWorkClock.ts`).
- **Scenes** (`src/game/scenes.ts`): meetings, conversations and events are dialogues
  with choices; each choice has visible effects (trust, reputation, wellbeing, time)
  and a workplace lesson. Finished scenes are remembered in `work.events.done`.
- **After every action** (`career.act` in `src/app/useCareer.ts`), three checks
  run on the result, all pure and idempotent:
  1. `advanceCareer`: promotion if every requirement is met; briefings and deadlines
     for tasks that have become available;
  2. `checkReviews`: the weekly review by email if Friday ended without a one-to-one;
  3. `checkEvents`: starts the next workplace event whose cause is present (never
     random, one at a time) and lets ignored requests lapse.

| Module (`src/game/`) | Responsibility                                           |
| -------------------- | -------------------------------------------------------- |
| `clock.ts`           | Office calendar: weekdays, weeks, formatting             |
| `workday.ts`         | Time passing, meetings, lunch, breaks, deadlines, days   |
| `wellbeing.ts`       | Energy, stress, engagement, fatigue and their readings   |
| `relationships.ts`   | Trust per colleague and professional reputation          |
| `conversations.ts`   | Talking to colleagues: small talk, one-off conversations |
| `meetings.ts`        | Stand-up and planning scenes                             |
| `events.ts`          | Workplace events and their triggers                      |
| `reviews.ts`         | Weekly performance reviews                               |
| `notices.ts`         | Reminders shown at the computer                          |

## Technology

| Purpose           | Choice                                   |
| ----------------- | ---------------------------------------- |
| Language          | TypeScript                               |
| Build tool        | Vite                                     |
| UI                | React                                    |
| Code checks       | Oxlint                                   |
| Local database    | IndexedDB via Dexie                      |
| Validation        | Zod                                      |
| Styling           | Tailwind CSS                             |
| Tests             | Vitest (unit), Playwright (browser)      |
| 3D                | three.js + React Three Fiber + drei      |
| Docs editor       | TipTap (on ProseMirror), MIT             |
| Charts, Slides    | Own SVG charts and slide editor          |
| Spreadsheet       | Own engine and grid, built incrementally |
| SQL (Data Studio) | sql.js (SQLite in the browser), MIT      |
| PDF exports       | jsPDF + jspdf-autotable, MIT (on demand) |
| PDF tests         | pdfjs-dist, Apache-2.0 (tests only)      |
| ZIP files         | fflate, MIT (on demand)                  |

## Roadmap

0. Foundations: saving, recovery, backups, tooling (done)
1. Vertical slice: "Your First Day as an Intern" (done, including the 3D office)
2. The Living Workplace: workday, wellbeing, colleagues, events, career growth (done)
3. Productivity depth: Docs, advanced Sheets, Slides, multi-app assignments (done)
4. More careers and departments, and profession-specific software (done)
   (see [PROFESSIONAL_TOOLS.md](PROFESSIONAL_TOOLS.md))
5. Employability and career portfolio ← _now_ (see [PHASE5_PLAN.md](PHASE5_PLAN.md))
6. Achievements and customisation
7. Polish
8. Cloud accounts and sync
9. Future: optional cosmetics, GamHub Jobs connection
