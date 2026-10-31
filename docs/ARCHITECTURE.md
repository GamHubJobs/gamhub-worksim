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

## Source folders

| Folder                                | What lives there                                                  |
| ------------------------------------- | ----------------------------------------------------------------- |
| `src/persistence/`                    | Everything that touches storage (see above)                       |
| `src/apps/sheets/engine/`             | Formula engine: parser, functions, calculation, formats (pure TS) |
| `src/apps/sheets/`                    | Spreadsheet model, clipboard, editor UI, workbook window          |
| `src/apps/docs/`                      | Docs: TipTap editor, templates, reading document text             |
| `src/apps/slides/`                    | Slides: model, themes, layouts, editor, presentation mode         |
| `src/apps/shared/`                    | Save hook, document window, file browser, "insert from Sheets"    |
| `src/apps/mail/`, `tasks/`, `career/` | The other desktop apps                                            |
| `src/content/`                        | Content as validated data: company, people, careers, assignments  |
| `src/game/`                           | Game rules (pure TS): grading, rewards, unlocks, promotion, mail  |
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

### Documents of every kind

Workbooks (`sheet`), documents (`doc`, the editor's ProseMirror JSON) and
presentations (`slides`) are stored the same way and share
`useSavedDocument`: autosave, the emergency journal, versions, restore and
rename. A change that would make a file invalid is refused before it is saved.
Charts are drawn by `src/ui/ChartView.tsx` (SVG) everywhere: live in Sheets,
and as frozen copies in Docs and Slides (like pasting a chart into a report).

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

| Purpose        | Choice                                   |
| -------------- | ---------------------------------------- |
| Language       | TypeScript                               |
| Build tool     | Vite                                     |
| UI             | React                                    |
| Code checks    | Oxlint                                   |
| Local database | IndexedDB via Dexie                      |
| Validation     | Zod                                      |
| Styling        | Tailwind CSS                             |
| Tests          | Vitest (unit), Playwright (browser)      |
| 3D             | three.js + React Three Fiber + drei      |
| Docs editor    | TipTap (on ProseMirror), MIT             |
| Charts, Slides | Own SVG charts and slide editor          |
| Spreadsheet    | Own engine and grid, built incrementally |

## Roadmap

0. Foundations: saving, recovery, backups, tooling (done)
1. Vertical slice: "Your First Day as an Intern" (done, including the 3D office)
2. The Living Workplace: workday, wellbeing, colleagues, events, career growth (done)
3. Productivity depth: Docs, advanced Sheets, Slides, multi-app assignments (done)
4. More careers and departments ← _next_
5. Achievements and customisation
6. Polish
7. Cloud accounts and sync
8. Future: optional cosmetics, GamHub Jobs connection
