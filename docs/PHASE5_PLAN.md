# Phase 5 plan: Employability & Career Portfolio

Status: **planning only**. Nothing in this document has been implemented. Implementation
starts only when the owner authorises it.

Prepared 1 November 2026, after reviewing the codebase at commit `2066dc1` (Phase 4
complete: 976 unit tests and 69 browser tests passing).

---

## Contents

1. [Summary and recommended order](#1-summary-and-recommended-order)
2. [Current architecture assessment](#2-current-architecture-assessment)
3. [Existing systems and files to reuse](#3-existing-systems-and-files-to-reuse)
4. [Key design decisions](#4-key-design-decisions)
5. [Portfolio data structure](#5-portfolio-data-structure)
6. [Competency and evidence structure](#6-competency-and-evidence-structure)
7. [User experience and navigation](#7-user-experience-and-navigation)
8. [What each career contributes](#8-what-each-career-contributes)
9. [Integrated projects](#9-integrated-projects)
10. [Export and PDF generation](#10-export-and-pdf-generation)
11. [Migration, backup and recovery](#11-migration-backup-and-recovery)
12. [Security, privacy and data integrity](#12-security-privacy-and-data-integrity)
13. [Performance](#13-performance)
14. [Testing strategy](#14-testing-strategy)
15. [Milestone roadmap](#15-milestone-roadmap)
16. [Dependencies and licensing](#16-dependencies-and-licensing)
17. [Risks, limitations and solutions](#17-risks-limitations-and-solutions)
18. [Decisions that need the owner](#18-decisions-that-need-the-owner)

---

## 1. Summary and recommended order

Phase 5 turns work the player has **actually submitted and passed** into a portfolio of
evidence, a record of demonstrated competencies, a progress report, an editable but
honest employability profile, and real exported files (PDF and original formats). It adds
one advanced integrated project per career.

The core decision: **when a task is passed, the submission is frozen into a portfolio
record in the same database transaction that records the grade.** The record keeps its
own copy of every submitted file and of the grading result, so it stays accurate even if
the player later edits the file, deletes old versions, or the task’s content is revised.
Everything else (competencies, reports, profile, exports) is **calculated from these
records**, never typed in, so it cannot drift from what was actually done.

Recommended milestone order (details in [section 15](#15-milestone-roadmap)):

| #    | Milestone                                       | Why this position                                      |
| ---- | ----------------------------------------------- | ------------------------------------------------------ |
| 5.1  | Evidence capture and storage                    | Everything else reads these records; start them early  |
| 5.2  | Backfill for existing saves, backup and safety  | Existing players get their past work; nothing is lost  |
| 5.3  | Portfolio app: browse, filter, inspect          | Makes the captured evidence visible and checkable      |
| 5.4  | Competency and experience record                | Pure calculations over records; no new storage         |
| 5.5  | Career progress report and recommendations      | Builds on 5.4                                          |
| 5.6  | PDF engine and report exports                   | Needs 5.3–5.5 content; first new dependency            |
| 5.7  | Original file exports and the portfolio package | Per-tool exporters; independent of the PDF engine      |
| 5.8  | Employability profile                           | Combines everything above, with locked evidence        |
| 5.9  | Integrated projects framework + two projects    | New content type; produces project portfolio records   |
| 5.10 | Remaining integrated projects                   | Content milestone                                      |
| 5.11 | Hardening: scale, regression, documentation     | Large-portfolio performance and a full regression pass |

---

## 2. Current architecture assessment

What Phase 5 can build on, found by reading the code:

**Persistence (Dexie, `src/persistence/`)**

- Database version 3 with tables `meta`, `documents`, `documentVersions`, `outbox` and
  `profiles` (`db.ts`). New tables are added by declaring a new database version; Dexie
  upgrades existing databases without touching other tables.
- **Every saved file is a document** (`documents`), validated by `DocumentSchema`, with
  six kinds: `sheet`, `doc`, `slides`, `tickets`, `code` and `tool` (the professional
  tools). Each kind has a content format version and upgrade steps
  (`documentMigrations.ts`).
- **Version history** (`versions.ts`): frozen snapshots of whole documents with a reason.
  `saveSubmission` (`profiles.ts`) already creates a **kept `submitted` version of every
  file handed in** (main file, report and slides), inside the same transaction that saves
  the grade. This is the foundation for capturing actual submitted work.
- **Gaps found:**
  - An attempt stores only the main file’s submitted version
    (`AttemptSchema.versionId`); the report and slides versions are created but not
    linked from the attempt.
  - Kept versions can be un-kept by the player in Version history (`VersionHistoryPanel`
    → `setVersionKept`), after which automatic clean-up may delete a **submitted** copy.
    Evidence must not depend on those copies staying.
- **Backup** (`backup.ts`) exports every table except `outbox` and requires a validator
  per table (enforced by a test), so a new table cannot be forgotten. Importing an older
  backup that lacks a new table leaves that table empty. Portfolio data must therefore
  be **rebuildable** from profiles and kept versions (milestone 5.2).
- Profiles (format 2) hold one career save each: XP, skill XP, assignments with every
  attempt (score, rating, per-check results, XP), inbox, work life and reviews.

**Grading (`src/game/`, `src/tools/`)**

- Every task produces a `GradeResult` with per-check results (id, title, why, hint,
  status, earned/points, problems). Sheets, Help Desk, Code (in a worker) and the nine
  professional tools all grade into the same `CheckResult` shape. This gives a
  **consistent, explainable evidence format across all careers**.
- Assignments declare skills (`skills: { skillId: weight }`), level, order, tool, and
  deliverables. Six careers (Finance & Admin plus the five Phase 4 careers), 48 tasks.

**Apps and screens**

- The Career app already has a basic **Portfolio section** (`PortfolioSection.tsx`):
  passed tasks with best score, level, date, skills and buttons that open the **live**
  files (not the submitted versions). Phase 5 replaces this with the real portfolio and
  keeps a summary link.
- Every editor can show content **read-only**: Sheets (version preview), Docs, Slides,
  Help Desk, Code, and every professional tool (`ToolWorkspaceProps.readOnly`). Evidence
  can be inspected in the real tool interfaces without new viewers.
- Charts are drawn as SVG by `ChartView` (reusable in exports).

**Exports today**

- Only the JSON backup (`lib/download.ts`) and printing a document from Docs
  (`window.print`). There is no CSV, XLSX, DOCX, PPTX or PDF generation yet.

---

## 3. Existing systems and files to reuse

| Need                         | Reuse                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| Atomic capture at submission | `persistence/profiles.ts` `saveSubmission` (transaction), `game/career.ts` `recordSubmission` |
| Frozen copies of files       | `DocumentSchema` content, `versions.ts` snapshots (for backfill)                              |
| Evidence of assessment       | `GradeResult` / `CheckResult` (`game/grading.ts`), `AttemptSchema`                            |
| Task metadata                | `content/assignments`, `content/careers.ts` (levels, skills, tools), `tools/registry.ts`      |
| Viewing evidence             | Read-only modes of every editor and tool workspace                                            |
| Charts in exports            | `ui/ChartView.tsx` (SVG)                                                                      |
| Downloads                    | `lib/download.ts` (extend for binary blobs)                                                   |
| Backup and restore           | `backup.ts` table validators and import                                                       |
| Storage warnings             | `storageHealth.ts`                                                                            |
| Navigation                   | Desktop dock (`desktop/Desktop.tsx`), `lastView` (add a view)                                 |
| Tests                        | Vitest with `fake-indexeddb`, Playwright helpers (`tests/e2e/helpers.ts`), dev `skipTo`       |

---

## 4. Key design decisions

Each question from the brief, with the decision and the reason.

**How is completed work captured?** In `saveSubmission`, after grading, in the same
transaction: if the attempt **passes**, write or update the portfolio record. Capturing
in one transaction means a portfolio record exists if and only if the passing grade was
saved: no half states after a crash.

**Automatically on successful submission?** Yes, for passing attempts only (score ≥ the
task’s pass mark). Failed attempts are not portfolio evidence, but they still count in
the experience record (attempts and improvement areas), from the profile.

**How is the actual submitted work preserved?** The record stores **its own frozen copy**
of each submitted file’s content (main file, report, slides), the grading result with
check titles and explanations, and a snapshot of the task’s description at that moment.
It does not rely on live files or on version history, which the player can change.
Version-history `submitted` copies also become protected (they can no longer be un-kept).

**What happens on resubmission?** One record per task per career save (a fixed ID
`profileId:assignmentId`, so duplicates are impossible). A later passing attempt with a
**higher** score replaces the evidence; an equal or lower score does not. The record keeps
a short history of all attempts (date, score), so improvement is visible. Reopening or
viewing a task never writes anything.

**How is competency evidence linked?** Every competency claim is calculated from
records: the record → the task’s skill weights and the passed checks → the competency.
Each competency in the report lists the records that support it, which link back to the
task, the attempt and the files.

**One structure across careers?** Yes: a record holds a list of **evidence files**, each
with a `kind` matching the existing document kinds (`sheet`, `doc`, `slides`, `tickets`,
`code`, `tool` + tool ID). The portfolio does not need to know any career’s details;
each file kind brings its viewer and exporter.

**PDF without a paid service?** Generate PDFs in the browser with **jsPDF** (MIT) and
**jspdf-autotable** (MIT), loaded only when exporting. Charts are rendered from the
existing SVG to images. No server, no service. (Section 10.)

**Exports where tools have limited export functions?** Each file kind gets a plain,
genuine export in an open format (CSV, HTML, Markdown, JSON, SQL, source files in a ZIP)
plus a section in the PDF. Native Office formats (XLSX, DOCX, PPTX) are not in the first
version (section 10 and [decision 18.3](#18-decisions-that-need-the-owner)).

**Keeping the profile accurate?** The profile has two kinds of content: **generated**
(levels, competencies, projects, scores, dates, tools), which the player can only show or
hide, and **presentation** (headline, short summary, which items to feature, their
order), which the player writes. Exports always include the statement that the evidence
comes from simulated workplace activities. (Sections 7 and 12.)

**Migration and backup?** New tables only; existing tables and save formats are
unchanged except one **optional** attempt field. A one-time, repeatable backfill builds
records for work already passed. Backups include the new tables; restoring an older
backup is followed by the same backfill. (Section 11.)

---

## 5. Portfolio data structure

Two new tables (database version 4), so lists stay fast while large file copies are
loaded only when an item is opened.

```ts
// portfolioItems: light, listed and filtered
interface PortfolioItem extends SyncFields {
  id: string // `${profileId}:${assignmentId}` (or `:project:${projectId}`)
  profileId: string // the career save it belongs to
  careerId: string
  type: 'task' | 'project'
  assignmentId?: string // tasks
  projectId?: string // integrated projects
  contentVersion: number // the task's content version when passed
  // Frozen description of what was asked (so later content edits don't change history)
  title: string
  summary: string
  levelId: string
  levelTitle: string
  levelIndex: number // 1–4: difficulty for ordering and reports
  objectives: string[]
  skills: Record<string, number> // the task's skill weights
  tools: string[] // e.g. ['books', 'docs']
  // The assessment of the attempt kept as evidence
  completedAt: number // when that attempt was submitted
  score: number
  rating: 'excellent' | 'good' | 'pass'
  passScore: number
  checks: Array<{
    id: string
    title: string
    why: string
    status: 'passed' | 'partial' | 'failed'
    earned: number
    points: number
  }>
  attempts: Array<{ submittedAt: number; score: number }> // all attempts, for history
  files: Array<{
    fileId: string
    role: 'main' | 'report' | 'presentation'
    kind: DocumentKind
    toolId?: string
    title: string
    bytes: number
  }>
  // Player's presentation choices (never the evidence itself)
  included: boolean // default true
  featured: boolean // default false
  note: string // the player's own words about the work, ≤ 600 chars
  order: number // manual ordering in the profile
}

// portfolioFiles: heavy, loaded on demand
interface PortfolioFile extends SyncFields {
  id: string // fileId
  itemId: string
  snapshot: AnyDocument // the file exactly as submitted (validated by DocumentSchema)
}
```

Indexes: `portfolioItems: 'id, profileId, careerId, completedAt'`,
`portfolioFiles: 'id, itemId'`.

Rules (enforced by the capture function and tested):

- Created or updated **only** inside the submission transaction, or by the backfill.
- The evidence fields (everything except `included`, `featured`, `note` and `order`) are
  written **only** by capture and backfill. The presentation update function accepts
  only the four presentation fields.
- Replacing evidence on a better resubmission deletes the old `portfolioFiles` rows in the
  same transaction.

The attempt gains one optional field, `files?: { doc?: versionId; slides?: versionId }`,
so the report and slides versions are traceable from the profile too (no format change:
old attempts simply don’t have it).

---

## 6. Competency and evidence structure

**Competencies are the existing skills.** The game already has 23 skills (formulas,
bookkeeping, reconciliation, troubleshooting, campaign analytics, data cleaning,
programming, debugging and so on), assigned to careers and weighted per task. Using them
keeps one vocabulary across XP, reports and the portfolio. A small table adds a
plain-English description of what each competency means in practice.

**Evidence** is calculated, never stored separately:

```ts
interface CompetencyEvidence {
  competencyId: string
  items: Array<{
    itemId: string
    weight: number // the task's skill weight
    score: number // the kept attempt's score
    levelIndex: number // task difficulty
    tools: string[]
  }>
  level: 'not-yet' | 'demonstrated' | 'practised' | 'proficient'
  reasons: string[] // why this level, in words
}
```

**Confidence grows with repeated, varied, successful demonstration** using explicit rules
that the report explains in words:

| Level                | Rule (all based on passed portfolio records)                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Not yet demonstrated | No passed task trains this skill                                                                              |
| Demonstrated         | 1 passed task with a weight of 20 or more for the skill                                                       |
| Practised            | 2 or more such tasks                                                                                          |
| Proficient           | 3 or more such tasks, at least one at the career’s second level or above, and an average score of 80% or more |

These thresholds are content constants, easy to tune, and shown in the report (“Proficient
because: 4 tasks, including 2 at Accountant level, average 91%”). There is no hidden or
blended score.

**Experience record** (also calculated):

- Tasks and projects completed, with level and date; attempts made.
- Tools used, counted only from **passed** tasks that used them (opening a tool proves
  nothing).
- Estimated practice time from the tasks’ estimated minutes (labelled as an estimate).
- Career progression from the profile (levels reached, dates of promotions, reviews).

**Improvement areas** come from the latest attempt of each task: checks that ended
`failed` or `partial`, grouped by the task’s competencies, plus tasks still needing
revision. Each one names the check (“Formulas: ‘Totals use cell references’ was partial
in _Bank reconciliation_”).

**Recommendations** (progress report) are rule-based and always give their reason:

1. A task needing revision → “Resubmit _X_: these checks are not yet passed.”
2. The weakest competency that has an available task → “Practise _Y_ in _Z_.”
3. A competency at _Demonstrated_ only → the next task that trains it.
4. A tool never used in a passed task but available at the player’s level → its practice
   file and next task.

---

## 7. User experience and navigation

A new desktop app **Portfolio** (on every career’s dock, after Career). It reads all
career saves on the device, filtered by default to the current career.

```
Portfolio
├─ Work            grid/list of records; filters: career save, skill, tool, level, date;
│                  sort: date, score, level; “Included only” toggle
│   └─ Item        what was asked, when, the score and every check (with why);
│                  the submitted files, opened read-only in their own tool;
│                  attempts history; include / feature / note; export this item
├─ Skills          competencies by level, each with its evidence list and reasons;
│                  improvement areas
├─ Progress report the report (section 6), recommendations; “Export PDF”
├─ Profile         the employability profile: generated sections (locked) +
│                  presentation fields; live preview; export
└─ Export          choose what to export: portfolio PDF, competency report,
                   item reports, original files (ZIP)
```

Beginner-friendly details:

- Empty states explain how items appear (“Pass a task to add it here”).
- Every item shows **Completed (passed)** clearly; incomplete work never appears.
- “What this demonstrates” on each item lists its competencies and the checks passed.
- The Career app’s current Portfolio section becomes a short summary with a link.
- `lastView` gains `portfolio` so reloads return to the same screen.

The honesty statement appears on the Profile screen and in every export:

> This portfolio contains work completed in GamHub WorkSim, a workplace simulation.
> It shows practical skills demonstrated on simulated tasks with simulated data. It is not
> a record of employment, a qualification or a certification.

---

## 8. What each career contributes

Existing tasks already produce real evidence; no content changes are needed for the
portfolio itself.

| Career               | Evidence captured (examples from current tasks)                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finance & Admin      | Expense and budget workbooks with formulas and charts; savings proposals (Docs); performance reports with slides                                               |
| Accounting           | Books files with posted journals, invoices and bills, the bank reconciliation, the pay run, trial balance and statements; month-end report (Docs)              |
| IT Help Desk         | Triaged ticket queues with replies; Directory changes with the audit log; Network Tools console sessions, findings and fixes; incident reports and KB articles |
| Digital Marketing    | Campaign metric workbooks; scheduled social calendars; SEO audits before/after with redirects; ad budget reallocation with pacing; funnel analysis memo        |
| Data Analysis        | Cleaned datasets with applied steps; saved SQL queries and results; dashboards; statistics with written conclusions                                            |
| Software Development | Code projects with tests, Git history and commit messages; debug sessions; API test collections and bug reports; design notes                                  |

Exports per kind (section 10) make these usable outside the game: e.g. Books → CSV
journals and statements; Data Studio → cleaned CSV and `.sql`; Code → source ZIP with
the commit log; Network Tools → findings and console log as text.

---

## 9. Integrated projects

**Approach: a project is a short series of linked tasks (stages) under one brief**, with
shared scenario data, completed when every stage passes. This reuses the whole task
system (tools, grading, deliverables, email hand-in) instead of building a new engine.

New content schema (`content/projects`):

```ts
interface ProjectDefinition {
  id: string
  careerId: string
  levelId: string // usually the career's top level (which has no tasks today)
  title: string
  brief: string // the overall situation
  objectives: string[]
  deliverables: string[] // what will be handed in, in plain words
  assessment: string[] // how it will be judged, in plain words
  stages: string[] // assignment IDs, in order
  passRule: 'all-stages' // every stage passed
}
```

Assignments gain an optional `projectId` and `stage` number. Stages unlock in order (the
existing `order` rule). When the last stage passes, the capture transaction also writes a
**project record** combining the stages’ evidence, with an overall summary (stages,
average score, tools used, total checks passed).

One project per career, at the top level (which currently has no tasks):

| Career            | Project                        | Stages                                                                                         |
| ----------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Accounting        | Close the quarter              | Books: post adjustments → Sheets: variance analysis → Docs + email: board pack                 |
| IT Help Desk      | The Thursday outage            | Help Desk: triage the flood → Network Tools: diagnose and fix → Docs + Slides: incident review |
| Digital Marketing | Rescue the launch              | Site Analytics: find the problem → Ad Campaigns: rebalance → Docs + Slides: revised strategy   |
| Data Analysis     | Churn investigation            | Data Studio: clean and query → Data Studio: dashboard + statistics → Docs: findings memo       |
| Software Dev.     | Fix and ship the timesheet bug | API Client: reproduce → Code: fix on a branch, test, merge → Docs: release notes               |
| Finance & Admin   | Year-end budget pack           | Sheets: consolidate → Sheets: charts and variances → Slides: presentation                      |

Each stage has the usual checks; the project adds the overall assessment summary. The
content test suite proves every stage’s model answer scores 100% and that the project
record is created only after the last stage.

---

## 10. Export and PDF generation

**Libraries (all free, MIT, run in the browser, loaded only when exporting):**

- **jsPDF** with **jspdf-autotable**: text, headings, tables with automatic page breaks,
  images, page numbers, document properties. Standard fonts (Helvetica) cover English
  text, £ and typographic quotes; other characters are replaced safely.
- **fflate**: ZIP files for the portfolio package and code projects (very small).
- Tests only: **pdfjs-dist** (Apache-2.0) to read generated PDFs back and check their
  text.

**Exports:**

| Export                | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio PDF         | Cover (name, careers, honesty statement), contents, one section per included item: what was asked, outcome, checks, competencies, and a rendering of the work (tables for sheets and tool data, document text with headings, slide text, charts as images, code listings)                                                                                                                                                               |
| Competency report PDF | Competencies by level with reasons and evidence references, improvement areas, recommendations                                                                                                                                                                                                                                                                                                                                          |
| Item report PDF       | One item, in full                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Original files (ZIP)  | Per kind: Sheets → CSV per sheet (values) + formulas CSV; Docs → HTML + Markdown; Slides → PDF pages + text; Help Desk → CSV; Code → source files + `git-log.txt`; Books → CSV journals and statements; Directory → CSV users/assets + audit log; Network Tools → findings and console `.txt`; Social/SEO/Campaigns/Analytics → CSV; Data Studio → CSV per clean table + `queries.sql`; API Client → collection JSON + bug report `.md` |
| Portfolio package     | One ZIP: the PDF, the competency report and every included item’s original files, with a README                                                                                                                                                                                                                                                                                                                                         |

The PDF builders are **pure functions** from records to a PDF (bytes), so they run in unit
tests without a browser. Exports never use screenshots of the screen: tables and text are
real PDF text (selectable, searchable); only charts are images.

---

## 11. Migration, backup and recovery

- **Database version 4** adds `portfolioItems` and `portfolioFiles`. No existing table
  changes; profile format stays 2; document formats unchanged.
- **Attempt field** `files` is optional: old attempts remain valid.
- **Protected submitted versions:** `setVersionKept(…, false)` refuses `submitted` and
  `original` versions; the Version history panel no longer offers to un-keep them.
- **Backfill (idempotent, safe to run any time):** for each profile and each passed task
  without a record, find the best passing attempt; take its kept `submitted` versions
  (main via `versionId`; report and slides by document and time); write the record and
  file copies. If a file version no longer exists, the record is created with the grading
  evidence and marked “file not available” rather than skipped. Attempts with no checks
  (made by the development shortcut `skipTo`) never become evidence.
  Runs: once after the database upgrade, after restoring a backup, and on demand from the
  Storage panel (“Rebuild portfolio”).
- **Backup:** add validators for the two tables (the existing test enforces this). Backups
  made after Phase 5 include the portfolio; older backups restore fine and are followed by
  the backfill.
- **Recovery:** records are written in the same transaction as grades, so a crash cannot
  leave a grade without its record (or the reverse). Presentation edits (include, note…)
  are small immediate saves.

---

## 12. Security, privacy and data integrity

- **Local only.** Nothing is uploaded. Exports are created in the browser and saved by
  the player.
- **Personal data.** The profile asks only for what the player wants to show (display
  name, optional headline and summary). No email, phone or address fields are required;
  exports show only what the player entered.
- **Evidence cannot be edited through the app.** Evidence fields are written only by
  capture and backfill; presentation fields cannot change scores, dates, files or
  competencies. Competencies and reports are always recalculated from records.
- **Honest limits.** All data lives on the player’s device and could be altered with
  developer tools. Exports therefore do **not** claim to be verified or certified; they
  state what the simulation is and what it is not. An internal content fingerprint
  (SHA-256 of each record) lets the app detect accidental corruption, and is described as
  that, not as proof.
- **No fake history.** The profile has no fields for employers, job dates, references or
  qualifications. Career levels are described as simulated roles (“Reached Senior
  Accountant level in the simulation”).
- **Exports escape player text** (HTML exports encode it; PDF text is plain).

---

## 13. Performance

- Lists read only `portfolioItems` (a few KB each); file copies (`portfolioFiles`) load
  when an item is opened or exported.
- Expected sizes: 48 tasks + 6 projects per device at most today; file copies are
  typically 5–150 KB (Data Studio and Books files are the largest). A full portfolio of
  all careers is roughly 2–6 MB, well within IndexedDB limits. `storageHealth` already
  warns when space is short.
- Capture adds the copy writes to the submission transaction (milliseconds for these sizes).
- Competency and report calculations are pure and linear in the number of records.
- PDF export streams sections and yields between items so the page stays responsive; a
  progress indicator shows while large exports build. Libraries are loaded on demand.
- Tested with 500 synthetic records (milestone 5.11).

---

## 14. Testing strategy

**Unit tests (Vitest, fake IndexedDB):**

- Capture: a passing submission creates exactly one record with copies of every
  submitted file; a failing one creates none; better resubmission replaces evidence and
  removes old copies; worse resubmission doesn’t; reopening and viewing write nothing.
- For **every task in all six careers**: submitting its model answer creates a record whose
  file copies equal the submitted content and whose checks equal the grade (a generated
  test, like the existing model-answer tests).
- Atomicity: a failure during capture rolls back the grade as well.
- Presentation updates cannot change evidence fields.
- Backfill: builds records from existing saves; idempotent; handles missing versions;
  ignores `skipTo` attempts; works after restoring an old backup.
- Protected versions: submitted versions can’t be un-kept or pruned.
- Competencies: level rules on crafted record sets; reasons text; only passed work counts;
  tools counted only from passed tasks.
- Recommendations: each rule fires with its reason.
- Exporters: every file kind’s export is valid (CSV parses back to the same values, HTML
  contains the headings, ZIP contains the expected files, JSON re-imports).
- PDFs: generated bytes are a valid PDF; text read back (pdf.js) contains the item titles,
  scores, the honesty statement and page numbers.
- Backup: export → import round-trip includes the portfolio; old-format backups still
  restore.
- Existing-save compatibility: databases created at version 3 with Phase 4 saves upgrade
  and backfill correctly (fixtures).

**Browser tests (Playwright):**

- One end-to-end path per career: pass a task (with the dev shortcut for earlier tasks),
  open Portfolio, see the item, open its submitted file read-only in the right tool, and
  check it shows the submitted content (not later edits).
- Resubmission does not duplicate; a better score updates the item.
- Filtering and sorting; include/feature/note persist across reload.
- Progress report and competencies show the expected levels after a scripted run.
- Export: download the portfolio PDF and ZIP (Playwright download events) and verify them
  in the test with pdf.js and fflate.
- Refresh and recovery: reload during and after capture; restore a backup in a fresh
  browser and see the portfolio.
- Full existing regression suite stays green at every milestone.

**Acceptance principle:** a feature is done when its data is right (unit tests) **and** it
works in the real interface (browser test), not when the screen renders.

---

## 15. Milestone roadmap

### 5.1 Evidence capture and storage

- **Objective:** freeze every passed submission into a portfolio record, atomically.
- **Features:** `portfolioItems` and `portfolioFiles` tables; record and file schemas;
  capture in `saveSubmission`; best-attempt replacement; attempt `files` links; protected
  submitted versions.
- **Affected:** `persistence/db.ts`, `persistence/schemas.ts`, `persistence/profiles.ts`
  (`saveSubmission`), `persistence/versions.ts` (`setVersionKept`), `app/useCareer.ts`
  (pass task metadata), `ui/VersionHistoryPanel.tsx`.
- **New:** `persistence/portfolio.ts` (capture, queries, presentation updates),
  `game/portfolio.ts` (pure: build a record from a grade and documents).
- **Dependencies:** none.
- **Data changes:** database version 4 (additive); optional attempt field.
- **Tests:** capture rules, atomicity, replacement, no duplicates, generated test over all
  48 tasks, protected versions.
- **Acceptance:** pass a task in each career → one record with the exact submitted files;
  resubmit lower → unchanged; higher → updated; un-keeping a submitted version is refused.

### 5.2 Backfill, backup and safety

- **Objective:** existing players get records for work already passed; backups carry the
  portfolio.
- **Features:** idempotent backfill; triggers after upgrade and restore; “Rebuild
  portfolio” in the Storage panel; backup validators.
- **Affected:** `persistence/backup.ts`, `ui/StoragePanel.tsx`, start-up (`app/`).
- **New:** `persistence/portfolioBackfill.ts`; test fixtures of version-3 databases.
- **Dependencies:** none.
- **Data changes:** none beyond 5.1.
- **Tests:** backfill from fixtures (all careers), idempotency, missing versions, `skipTo`
  attempts ignored, old and new backup round-trips.
- **Acceptance:** a save from Phase 4 opens with its passed work in the portfolio; restoring
  a pre-Phase-5 backup in a fresh browser shows the same portfolio.

### 5.3 Portfolio app: browse, filter, inspect

- **Objective:** see and check every item and its real submitted work.
- **Features:** Portfolio dock app; list with filters (career save, skill, tool, level,
  date) and sorting; item page (brief, outcome, checks with explanations, attempts,
  competencies); read-only viewers for every file kind; include/feature/note; Career app
  summary link.
- **Affected:** `desktop/Desktop.tsx`, `persistence/lastView.ts`,
  `apps/career/PortfolioSection.tsx`.
- **New:** `apps/portfolio/` (PortfolioApp, ItemList, ItemPage, EvidenceViewer).
- **Dependencies:** none.
- **Data changes:** none.
- **Tests:** browser test per career (item appears, file opens read-only with submitted
  content), filters, presentation fields persist across reload.
- **Acceptance:** a beginner can find any passed task, open what they handed in, and see
  why it scored what it did.

### 5.4 Competency and experience record

- **Objective:** a record of demonstrated competencies and experience, calculated from
  evidence.
- **Features:** competency descriptions; level rules with reasons; evidence lists;
  experience summary (tasks, projects, tools, estimated time, progression); improvement
  areas.
- **Affected:** `content/careers.ts` (competency descriptions), Portfolio app (Skills
  view).
- **New:** `game/competencies.ts`, `content/competencies.ts`.
- **Dependencies:** none.
- **Data changes:** none.
- **Tests:** rules on crafted record sets; opening tools or visiting careers awards
  nothing; improvement areas from failed/partial checks.
- **Acceptance:** each competency shows its level, why, and links to the work behind it.

### 5.5 Career progress report and recommendations

- **Objective:** a professional report with explainable recommendations.
- **Features:** report view (skills, strongest competencies, improvements, projects,
  progression, tools); rule-based recommendations with reasons and links.
- **Affected:** Portfolio app.
- **New:** `game/progressReport.ts`, `apps/portfolio/ProgressReport.tsx`.
- **Dependencies:** none.
- **Data changes:** none.
- **Tests:** each recommendation rule; report content for scripted careers.
- **Acceptance:** every statement and recommendation in the report traces to records.

### 5.6 PDF engine and report exports

- **Objective:** genuine PDFs of the portfolio, the competency report and single items.
- **Features:** PDF builders per section and per file kind; charts as images; contents,
  page numbers, honesty statement; download with progress.
- **Affected:** `lib/download.ts` (binary), Portfolio app (Export view).
- **New:** `export/pdf/` (document builder, item renderers per kind, report renderer).
- **Dependencies:** jsPDF, jspdf-autotable; dev: pdfjs-dist.
- **Data changes:** none.
- **Tests:** generated PDFs read back with pdf.js; one item of every file kind renders;
  large portfolio export; browser download test.
- **Acceptance:** the PDF opens in standard readers, text is selectable, content matches
  the records.

### 5.7 Original file exports and the portfolio package

- **Objective:** usable original files per item, and one package with everything.
- **Features:** exporters per file kind (section 10); ZIP package with README.
- **Affected:** Portfolio app (Export view), tool definitions (optional exporter hook).
- **New:** `export/files/` (one exporter per kind), `export/package.ts`.
- **Dependencies:** fflate.
- **Data changes:** none.
- **Tests:** each exporter round-trips (CSV parses back, JSON re-imports, ZIP lists files);
  package contents.
- **Acceptance:** the package opens on a normal computer; CSVs open in a spreadsheet;
  code files run with Node.

### 5.8 Employability profile

- **Objective:** an honest, editable profile generated from progress.
- **Features:** generated sections (careers, levels, competencies, tools, projects,
  featured items) that can be shown or hidden but not edited; presentation fields
  (display name, headline, summary, featured items and order); preview; PDF and HTML
  export; the honesty statement.
- **Affected:** Portfolio app (Profile view).
- **New:** `game/employabilityProfile.ts`, `apps/portfolio/ProfileEditor.tsx`; settings
  stored in `meta` (validated key) or a small table.
- **Dependencies:** none beyond 5.6.
- **Data changes:** one settings record.
- **Tests:** generated content matches records; presentation edits can’t change evidence;
  no fields for employment, references or qualifications; statement present in exports.
- **Acceptance:** the profile reads professionally and cannot claim more than was done.

### 5.9 Integrated projects framework and first two projects

- **Objective:** advanced multi-tool projects with their own portfolio records.
- **Features:** project definitions; stage assignments; project records on completion;
  Tasks app shows projects with their stages; the first two projects (recommended:
  Accounting and Data Analysis).
- **Affected:** `content/schemas.ts` (assignment `projectId`/`stage`),
  `content/assignments`, `game/career.ts`, Tasks app, capture.
- **New:** `content/projects/`, project stage tasks.
- **Dependencies:** none.
- **Data changes:** project records (same table).
- **Tests:** stage model answers 100%; project record only after the last stage; browser
  test of one full project.
- **Acceptance:** a project can be completed end to end and appears as one rich item.

### 5.10 Remaining integrated projects

- **Objective:** one project for each remaining career.
- **Features:** projects for IT Help Desk, Digital Marketing, Software Development and
  Finance & Admin.
- **Affected / new:** content only.
- **Tests:** as 5.9 for each.
- **Acceptance:** every career has an advanced project at its top level.

### 5.11 Hardening

- **Objective:** confidence at scale and no regressions.
- **Features:** performance pass with 500 records; accessibility review of the Portfolio
  app; documentation (architecture, player guide).
- **Tests:** synthetic large portfolio (list, filters, export time); full regression.
- **Acceptance:** large portfolios stay responsive; all existing and new tests pass.

---

## 16. Dependencies and licensing

| Package         | Licence    | Use                                   | Loaded                    |
| --------------- | ---------- | ------------------------------------- | ------------------------- |
| jsPDF           | MIT        | PDF generation                        | On demand, when exporting |
| jspdf-autotable | MIT        | Tables with page breaks in PDFs       | With jsPDF                |
| fflate          | MIT        | ZIP files                             | On demand                 |
| pdfjs-dist      | Apache-2.0 | Reading PDFs back in tests (dev only) | Tests only                |

All are free, maintained, and work offline. No service, account or API key. Considered and
not recommended for the first version: `pdfmake` (larger, embedded fonts), `exceljs`,
`docx` and `pptxgenjs` (native Office files; larger; see decision 18.3).

---

## 17. Risks, limitations and solutions

| Risk                                                      | Solution                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Storage grows with file copies                            | Copies only for passed, kept attempts (one per task); `storageHealth` warnings; sizes measured in tests |
| Submitted versions were un-kept and pruned before Phase 5 | Backfill keeps the grading evidence and marks files unavailable; protection from 5.1 onwards            |
| Report and slides versions aren’t linked in old attempts  | Backfill matches them by document and submission time; tested with fixtures                             |
| Content edits change what a task asks                     | Records freeze the description and the task version at capture                                          |
| Players overclaim                                         | Evidence locked; honesty statement in every export; no employment or qualification fields               |
| Local data can be tampered with                           | Stated openly; exports make no verification claims                                                      |
| PDF fonts lack some characters                            | Safe replacement map; tests with £, curly quotes and accented names                                     |
| Several people share one device                           | Records belong to career saves; filters per save; decision 18.1                                         |
| Large exports freeze the page                             | Builders yield between items; progress indicator; tested at scale                                       |
| Dev shortcut (`skipTo`) creates fake passes               | Those attempts have no checks or versions and are excluded; the shortcut exists only in development     |
| Project content effort is large                           | Split across 5.9 and 5.10; each stage reuses existing tools and grading                                 |

Limitations to accept in the first version: native Office formats are not produced (open
formats instead); PDFs render charts as images; the profile is a document to export, not a
public web page (no hosting).

---

## 18. Decisions that need the owner

1. **Whose portfolio is it?** Career saves currently each have their own player name. I
   recommend treating everything on one device as one person’s portfolio, with the profile
   showing the saves the player selects (default: all) and one display name entered on the
   Profile screen. If several people share a device, they would each choose their own
   saves. Please confirm this suits your users.
2. **New dependencies:** jsPDF, jspdf-autotable and fflate (all MIT, free, offline,
   loaded only when exporting), plus pdfjs-dist for tests. Please confirm adding them is
   acceptable.
3. **Native Office files:** the plan exports open formats (CSV, HTML, Markdown, source
   files, PDF). Producing real XLSX/DOCX/PPTX is possible with free libraries but adds size
   and effort. Is native Office output a priority for your users (for example, for job
   applications), or are PDF plus open formats enough for Phase 5?
4. **Finance & Admin:** the brief lists five careers; the original sixth career (Finance &
   Admin) would also contribute evidence and get an integrated project. I assume you want
   it included.

Everything else in this plan is a technical choice I can make during implementation.
