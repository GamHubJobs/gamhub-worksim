# GamHub WorkSim: Development Log

Newest entries first. Each milestone lists what was built, key decisions, how it
was tested, and known limitations.

---

## Current status

**Phase 0: Foundations.** Stages A and B are complete.

**Next up: Stage C (storage protection and backups).**

- [ ] 0.16 Storage health: persistent-storage request, usage/quota, private-mode and
      low-storage warnings, clear error if IndexedDB is unavailable
- [ ] 0.17 Backup export (JSON file with header and checksum)
- [ ] 0.18 Backup import (validate, upgrade, preview, automatic safety backup first) and
      backup reminders
- [ ] 0.19 Multi-tab protection (Web Locks: only one tab edits)
- [ ] 0.21 GitHub Actions: run checks on every push
- [ ] 0.22 (Needs owner approval) Online test deployment on Cloudflare Pages

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
