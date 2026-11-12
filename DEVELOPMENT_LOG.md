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

**Phase 2: "The Living Workplace"** (in progress). Milestones:

- [x] 2.1 Workday and daily routine: office clock, schedule, meetings, lunch, deadlines,
      end of day
- [x] 2.2 Energy, stress, engagement and fatigue
- [x] 2.3 Colleague relationships: trust, reputation, personalities, mentorship,
      conflicts with ethical choices
- [x] 2.4 Workplace events: requests, mistakes, recognition, decisions
- [x] 2.5 Career expansion: Junior-level tasks, performance reviews, promotion criteria

**Phase 2 is complete.**

**Phase 3: "Productivity Depth"** (in progress). Milestones:

- [x] 3.1 Docs: a real document editor with templates, autosave and version history
- [x] 3.2 Advanced Sheets: charts, sorting, filtering, conditional formatting, validation
- [x] 3.3 Slides: a real presentation editor with themes, layouts and presentation mode
- [x] 3.4 Integration: charts across apps, attachments, submitting work by email
- [x] 3.5 Multi-application assignments

**Phase 3 is complete.**

**Phase 4: "Multiple Careers and Departments"** (in progress). Milestones:

- [x] 4.1 A reusable career and department framework
- [x] 4.2 Accounting
- [x] 4.3 IT Help Desk (with a Help Desk ticketing app)
- [x] 4.4 Digital Marketing
- [x] 4.5 Data Analysis
- [x] 4.6 Software Development (with a Code editor and tests)

**Phase 4 addition: profession-specific software simulations.** Every career gets
working simulations of the professional software used in its field (see
[docs/PROFESSIONAL_TOOLS.md](docs/PROFESSIONAL_TOOLS.md) for the research and design).

- [x] 4.7 Professional-tools framework (registry, saving, tool tasks, grading,
      progressive unlocks, guides, practice data)
- [x] 4.8 Accounting: Books (ledger, sales, purchases, banking, payroll, reports)
- [x] 4.9 IT Help Desk: Service Desk, Directory and assets, Network Tools
- [x] 4.10 Digital Marketing: Campaigns, Social Planner, Site Analytics, SEO Audit
- [x] 4.11 Data Analysis: Data Studio (datasets, cleaning, SQL, statistics, dashboards)
- [x] 4.12 Software Development: terminal, Git, debug console, API Client

**Phase 4 is complete.**

**Phase 5: "Employability & Career Portfolio"**. Plan:
[docs/PHASE5_PLAN.md](docs/PHASE5_PLAN.md); player guide:
[docs/PORTFOLIO_GUIDE.md](docs/PORTFOLIO_GUIDE.md).

- [x] 5.1 Evidence capture and storage
- [x] 5.2 Backfill for existing saves, backup and safety
- [x] 5.3 Portfolio app: browse, filter, inspect
- [x] 5.4 Competency and experience record
- [x] 5.5 Career progress report and recommendations
- [x] 5.6 PDF engine and report exports
- [x] 5.7 Original file exports and the portfolio package
- [x] 5.8 Employability profile
- [x] 5.9 Integrated projects framework and first two projects
- [x] 5.10 Remaining integrated projects
- [x] 5.11 Hardening: scale, regression, documentation

**Phase 5 is complete.**

**Phase 6: "Real-World Career Simulation"** (complete). Plan:
[docs/PHASE6_PLAN.md](docs/PHASE6_PLAN.md).

- [x] 6.1 Organisation model, case engine, Cases app, save migration
- [x] 6.2 Clients and customers
- [x] 6.3 Business operations: budgets, purchases, approvals
- [x] 6.4 Interdepartmental workflows
- [x] 6.5 Meetings: preparation, meeting, minutes, actions
- [x] 6.6 Complex workplace incidents
- [x] 6.7 Management and leadership
- [x] 6.8 Cross-functional programme: the company expansion
- [x] 6.9 Office integration, balance, hardening, documentation

**Phase 6 is complete.**

**Phase 7: "Career Intelligence, Engagement and Accessibility"** (complete). Plan:
[docs/PHASE7_PLAN.md](docs/PHASE7_PLAN.md).

- [x] 7.1 Career-wide performance record (save format 4)
- [x] 7.2 Achievements and desk customisation
- [x] 7.3 Varied cases and new cases
- [x] 7.4 Career readiness assessments
- [x] 7.5 Performance: code splitting and startup
- [x] 7.6 Accessibility
- [x] 7.7 Portfolio integration, hardening and documentation

**Phase 7 is complete.**

**Phase 8: "Launch Readiness and Ecosystem"** (complete). Plan:
[docs/PHASE8_PLAN.md](docs/PHASE8_PLAN.md).

- [x] 8.1 Career-specific content loading
- [x] 8.2 Profession-specific readiness assessments
- [x] 8.3 Expanded case variations and advanced cases
- [x] 8.4 Accessibility validation
- [x] 8.5 Installable progressive web app
- [x] 8.6 Security and data-integrity hardening
- [x] 8.7 Onboarding, documentation and user experience
- [x] 8.8 Browser compatibility and performance
- [x] 8.9 Final end-to-end regression

**Phase 8 is complete.**

**WorkSim Life** (complete). Plan: [docs/LIFE_PLAN.md](docs/LIFE_PLAN.md).

- [x] L1 Needs, home routines, sleep, the commute, money
- [x] L2 The home: a 3D flat, furniture, upgrades
- [x] L3 Social life: friends, a phone, invitations
- [x] L4 The city: a walkable district, third-person, enterable places
- [x] L5 Getting around: walking, bus, bike, car
- [x] L6 Career life: applications, salary negotiation, a side business
- [x] L7 AI in daily life

**Sound** (complete). Plan: [docs/SOUND_PLAN.md](docs/SOUND_PLAN.md).

- [x] S1 Audio manager and settings
- [x] S2 Interface and game sounds
- [x] S3 Workplace surroundings
- [x] S4 Character sounds (footsteps, doors, sitting, typing)
- [x] S5 The neighbourhood's surroundings
- [x] S6 Music by mood
- [x] S7 People (murmur and greetings; no voice acting)
- [x] S8 Time of day (weather: not applicable, there is no weather in the game)
- [x] S9 Offline, performance and accessibility checks

**WorkSim AI** (complete). Plan: [docs/AI_PLAN.md](docs/AI_PLAN.md).

- [x] AI.1 Architecture audit
- [x] AI.2 AI infrastructure (engines, context, settings, limits, the bridge)
- [x] AI.3 The WorkSim AI desktop app
- [x] AI.4 AI inside Mail, Sheets, Docs, Slides, Tasks, Code and Help Desk
- [x] AI.5 Workplace AI: colleagues and feedback
- [x] AI.6 AI competency and career readiness
- [x] AI.7 Quality assurance

**Workplace realism upgrade** (complete):

- [x] A. The work computer as a Windows 10-style desktop
- [x] B. More realistic 3D people
- [x] C. A more realistic 3D office

**Talking to anyone** (in progress). Guide: [docs/PEOPLE.md](docs/PEOPLE.md).

- [x] P1 Every person in every place can be talked to (E or a click)

**Living scenarios**: [docs/SCENARIOS_PLAN.md](docs/SCENARIOS_PLAN.md). S1 (takeaway) and S2
(meetings in person) done; S3 to S7 next.

**Phone**: [docs/PHONE.md](docs/PHONE.md) (Phone 1 done).

**Game screen**: [docs/GAME_SCREEN.md](docs/GAME_SCREEN.md) (full screen, HUD, pause menu).

**Map**: [docs/MAP.md](docs/MAP.md) (world map, mini-map, routes).

**Relationships, romance and family** (R1–R11 done): [docs/RELATIONSHIPS_PLAN.md](docs/RELATIONSHIPS_PLAN.md).

**Story Mode** (in progress). Plan: [docs/STORY_MODE_PLAN.md](docs/STORY_MODE_PLAN.md).

- [x] Story 1–4 Engine and save, the Story screen and tracker, missions played in the
      world, Finance & Administration chapter 1
- [x] Story 5 Chapters 2 and 3 of the same campaign, and its ending
- [x] Story 6–10 The other five careers
- [ ] Story 11 Presentation and polish

---

## 2026-11-12 · IT Help Desk 3: guidance, hints, Knowledge Base, and the operations shell

The Help Desk becomes an IT operations application, with guidance that knows
the ticket's real situation. The plan for the remaining phases, and where the
work stands, is in `docs/DESKOPS_CONTINUATION.md`.

### What was built

- **The Help Desk shell:**
  - The window opens maximised.
  - A sidebar groups the sections: Service desk (Overview, Ticket queue,
    Knowledge Base) and Systems (Network Tools, Directory, when the queue has
    them). It is a vertical tab list, so keyboard and screen readers work, and
    it collapses to icons on narrow screens.
  - The update line ("INC-3101: Resolved automatically") sits above the
    section.
  - Layouts respond to the space they have (container queries), not the
    screen.
- **Overview:** counted from the queue only (open, not assigned, waiting for
  the employee, people held up, fixed and not closed), with:
  - a ticket table showing each ticket's checks passing;
  - the impact by department;
  - the security policy's events;
  - recent activity.

  A ticket opens from the table.

- **Guidance** (`game/guidance.ts`, pure), on each ticket:
  - **What is still wrong**, from its first failing condition and what the
    systems show.
  - **What was tried**, from the history: changes, Resolved refused, policy
    refusals.
  - **Four progressive hints:** the problem, where to look (the tool), what
    to try next (a specific test), why it works this way (the concept from the
    Knowledge Base).
  - **They follow the real state.** For example: where the route stops,
    which access point a laptop uses, verification before an unlock when the
    policy applies.
  - **Tickets without conditions** get triage hints from the Knowledge Base.
- **Hints and XP:**
  - Each hint opened is counted on the ticket and kept in its history.
  - At hand-in, the XP and skill XP are reduced 5% per hint, at most 30%. The
    score is not affected.
  - The first-try bonus needs no hints.
  - The panel says this before a hint is opened.
- **The IT Knowledge Base** (`content/knowledge/it.ts`):
  - 22 original articles in 10 categories (accounts, network, Windows,
    devices, printers, software, email, security, escalation, documentation).
  - Each has symptoms, diagnosis, resolution, when to escalate and the
    concept.
  - Search, a category filter, bookmarks (kept with the player), and the
    task's own articles.
  - Part of the app, so it works offline.
- **WorkSim AI:**
  - The ticket's context now carries what the systems show, what was tried,
    and the matching Knowledge Base articles.
  - The built-in guide (offline) explains and points to the hints without
    giving the fix.
  - A model is told it cannot change the systems, must never say it has, and
    must not solve graded work step by step in Learning mode.
- **SVG icons** for the new sections. The privileged-group emoji in Directory
  is now an icon (or "(privileged)" in drop-downs).
- **Browser test screenshots:** they are written to `WORKSIM_SHOTS` when set
  (default `docs/screenshots`), so full test runs no longer overwrite the
  user's uncommitted screenshots.

### Tests

- **Unit** (`game/guidance.test.ts`, 16):
  - hints from the real condition and state;
  - the route through an access point;
  - what was tried;
  - "a reset does not unlock";
  - verification first;
  - triage hints;
  - counting and history;
  - no hints once fixed;
  - the XP factor and the hand-in XP;
  - saving and old saves;
  - Knowledge Base coverage and search;
  - the AI context, the offline answer and the model's rules.
- **One existing test updated:** `ai/apps.test.ts` now expects the Knowledge
  Base match in a ticket's AI context.
- **Browser** (`tests/e2e/deskops-guidance.spec.ts`):
  - Overview figures and opening a ticket from it;
  - three hints opened and recorded;
  - the hint's article opened, bookmarked, found by search and the bookmarks
    filter;
  - after a reload, hints and bookmark kept.
- **Accessibility:** the accessibility checks first failed on the new sidebar
  (label contrast; tab names). Both fixed, and the 10 checks pass.
- **Help Desk browser tests:** the 13 spec files that use it, 75 tests, pass.
- **Results after:** `npm run check` clean (106 files, 2,385 tests); production build passed.

### Limits

- **Hints follow the current problem:** if it changes after hints were
  opened, the next ones are about the new problem, but the count stays.
- **Bookmarks are per player,** not per task.

---

## 2026-11-12 · IT Help Desk 2: identity verification and access control

Knowing how to unlock an account is no longer enough. In a directory with a
security policy, an account change is refused until the person asking is
verified against the records, and approved where the policy needs it. The
Directory enforces it inside its own actions. The first task to use it is "The
Account Unlock Request" (Service Desk Analyst). See
`docs/IDENTITY_VERIFICATION.md`.

### The audit first

- **Present** (commit `409dd6e`):
  - Phase 1's ticket engine (`game/incidents.ts`);
  - the Directory's pure actions (`tools/directory/model.ts`): every account
    change goes through them, from the Directory tab, the model answers and the
    tests;
  - the Help Desk's tabs, the office cast and encounters, the skills.
- **Missing:**
  - any record to verify a person against;
  - a policy;
  - approval relationships (no managers or group owners);
  - a security log.
- **The operation boundary is the actions in `model.ts`.** So the policy is
  checked there, not in the buttons.
- **The older directory tasks must not change.** The leaver task says Hannah
  "answered her security questions" in its story. So the policy is part of a
  directory's state, set by the scenarios that use it, and directories without
  one work as before.

### What was built

- **The engine** (`tools/directory/security.ts`, pure):
  - **Sessions:** a verification session covers one account, one ticket and
    the changes chosen. It expires after 10 minutes, and each change can be
    made with it once.
  - **Identity checks:** employee number, staff badge number (compared with
    the record, which is never shown), or a callback to the extension on
    record. Whoever has that extension answers. A number the caller gives
    proves nothing.
  - **Approval:** a separate step. Only the line manager on record, or a
    privileged group's owner, can approve. Anyone else is refused.
  - **Wrong answers:** three of them end the session.
  - **Deterministic:** what each requester says, and whether they are at their
    desk, is scenario data.
- **The policy:**
  - unlock, password reset and MFA registration: 1 check;
  - MFA reset: 2 different checks;
  - disable and enable: the manager's approval;
  - group changes: a check and the manager's approval;
  - privileged groups: 2 checks and the owner's approval;
  - unlocking or resetting a privileged account: the manager's approval as
    well.

  A scenario can make a change stricter.

- **Enforced in the actions.** Every sensitive action in `model.ts` runs
  through `guarded()`:
  - refused: the account and audit log unchanged, a security event recorded,
    the reason returned;
  - allowed: the change made, the session used for it, a "performed" event.

  The clock is in the state (`security.clock`), set before each change, and
  never moves back.

- **Security events:** the account, ticket, change, session, time, kind,
  severity (info, warning, breach) and an explanation, never an answer. A
  failed answer is information; an unsafe step is a warning; changing an
  account nobody verified is a breach.
- **The Help Desk:**
  - an **Identity verification** panel on the ticket: choose the account and
    the change, ask and check, call back, ask for approval. It shows required,
    in progress, failed, expired, approval needed, denied, permitted and done.
  - Security events go into the ticket's history once each, and an assigned
    ticket moves to In progress.
- **The Directory:**
  - each account shows what each change needs, its manager and extension on
    record (badge and employee numbers are never shown);
  - a **Security events** log under the audit log.
- **Colleagues:**
  - the profile's `disruptions` gain an optional `stage` from the real
    outcome;
  - in the office, they say they are being checked, could not be verified,
    are waiting for their manager, or are fed up after two failed answers;
  - once fixed, they thank the player for checking it was really them.
- **The task "The Account Unlock Request"** (IT order 8; the four later tasks
  move down one):
  - Leila, verified by her badge number;
  - Carmen, whose payroll access needs her manager Priya's approval;
  - Owen, who gives an old badge number, is away from his desk and offers his
    mobile. There are two Owens. His account must stay locked, and his ticket
    waits for him.

  Graded on the process (verifications, the failed verification, the policy)
  as well as the results.

- **A new skill:** "Identity and access control", for the IT career.
- **Not in this phase** (as asked): hints with an XP cost, remote desktop,
  voicemail, phone calls, security operations.

### Tests

- **Before:** `npm run check` at `409dd6e`: format, lint and types clean; 103
  files, 2,313 tests passed.
- **Unit** (`tools/directory/security.test.ts`, 25):
  - valid, wrong and differently typed answers;
  - an unknown employee;
  - a callback: confirmed, no answer, the wrong account's owner, a given
    number;
  - three failed attempts;
  - expiry;
  - another employee's session;
  - the wrong change, the wrong group, and each change once;
  - no answers in the log;
  - authorisation: allowed, needs approval, the wrong approver, declined,
    approval without identity, privileged groups, disabling with approval
    alone;
  - every guarded action refused when called directly;
  - directories without a policy unchanged; old directories load.
- **Integration** (`game/verification.test.ts`, 20):
  - a failed verification does not resolve the ticket; nor does a successful
    one alone;
  - the verified repair resolves it automatically;
  - refusals in the right ticket's history;
  - Resolved still refused while broken;
  - no event written twice;
  - saving: sessions and events kept, expired stays expired after loading,
    used sessions do not authorise again;
  - Phase 1 queues and older profiles load;
  - colleagues' stages and lines;
  - grading: the model answer gets full marks, a bypass is a breach, a
    reasonable refusal costs a little, a failed answer nothing, Owen handled
    correctly.
- **Browser** (`tests/e2e/verification.spec.ts`, 2):
  - an unlock refused and recorded; Leila verified and unlocked, resolving her
    ticket; Carmen refused without approval, the wrong approver refused, Priya
    approves, unlocked and resolved; the security log; after a reload, the
    tickets, histories and record unchanged;
  - Owen: the old badge fails, his mobile and his desk prove nothing, unlock
    and reset refused, Resolved refused, the ticket waits.
- **Results after:** `npm run check` clean (105 files, 2,369 tests). Browser suite (Chromium): 219 passed, 4 flaky, 2 failed, 3 skipped. All six passed when rerun on their own, except `week.spec.ts` (an Accounting Grid Craft cell timing out), which failed again when run beside other browser tests and passed alone with one worker; it timed out the same way in the run before this phase, and nothing it uses changed. Offline (PWA): 6 passed. Other browsers: 8 passed, 1 skipped. Build passed. Startup: start screen 302 kB, 2.7 s.

### Limits

- **Opt-in:** the policy applies to directories that carry one (this task).
  The older directory tasks are unchanged.
- **The conversation is written,** in the panel, not a phone call (a later
  phase). Approval is given straight away.
- **Restoring an earlier version** of the queue restores its security record
  with it, as for any change.
- **Progression:** players already past task 7 who have not started the old
  task 8 do this task first. Passed work, XP and levels are not affected.

---

## 2026-11-12 · IT Help Desk 1: tickets that know when they are fixed

A Help Desk ticket can now be tied to the company's simulated systems (Network
Tools and Directory). It resolves because the problem is really fixed, never
because the player chooses Resolved. The first task to use it is "Floor 2 has
lost its Wi-Fi" (Service Desk Analyst). See `docs/STATE_AWARE_TICKETS.md`.

### The audit first

- **Already there, and extended rather than rebuilt:**
  - the Help Desk queue (a `tickets` document);
  - Network Tools (a deterministic network simulation, with pure actions and an
    action log);
  - Directory (pure actions, with an audit log);
  - the office cast (Carmen Ruiz, Arjun Mehta, Leila Haddad and others);
  - encounters, the grading of tickets and tools, and the content tests.
- **Missing:**
  - Wi-Fi: no device depended on an access point;
  - any link between a ticket and the systems;
  - an event mechanism between them.
- **The investigation of ServiceDesk Simulator** (the research doc) was used as
  research only: the idea of tickets checked against the state. No code, text or
  assets from it.

### What was built

- **The condition engine** (`src/game/incidents.ts`, pure):
  - **Eight conditions:** device up, service running, a host reachable (on a
    port), a DNS record, account unlocked, account enabled, password reset, in a
    group.
  - Each gives pass or fail, a label, and what the system shows. A system that
    is not connected fails safely.
- **Event-driven:** every change to a system goes through
  `applyEnvironmentChange`.
  - It compares the state before and after (devices, services, settings, DNS,
    accounts, groups, and the fix made from the action or audit log).
  - It looks again only at the tickets that depend on what changed.
  - No polling, no timers, nothing random. Console commands and findings change
    nothing.
- **The lifecycle:**
  - Open → Assigned → In progress / Waiting for information → Resolved, and
    Reopened if the fault returns before closing.
  - Closed only from Resolved, and final.
  - Choosing Resolved is checked first: if it is not fixed, the status stays, and
    the player is told what is still broken. The attempt is kept in the history.
  - Automatic and manual resolutions are told apart and explained. Each ticket
    resolves once; later changes add no second resolution.
- **The queue and its systems are one saved document.**
  - New optional fields on tickets: requester, conditions, assignee, history,
    resolution.
  - The queue gains an optional `environment`. Everything is additive with
    defaults, so old queues load unchanged.
- **The Help Desk window** has tabs: the queue, and the real Network Tools and
  Directory workspaces on the queue's systems.
  - A ticket tied to the systems shows its assignee, the affected employee and
    systems, each check live, what still prevents resolution, the resolution,
    and its history with the office time.
  - A status line above shows when a ticket resolves or reopens by itself.
- **Wi-Fi in the network simulation:**
  - an optional `accessPoint` per device: while it is down, the device is cut
    off (its route, remote sessions, the map's "No network");
  - a new fault, "Device stopped responding (can be restarted remotely)";
  - evidence checks can require the command's output (a test that worked).

  No older scenario sets an access point, so they behave as before.

- **Colleagues held up:**
  - The profile keeps who is held up by a task's tickets (`work.disruptions`,
    additive).
  - Walking up to them in the office, they say their laptop is off the Wi-Fi, or
    they are locked out. Once it is fixed, they thank the player. Only the
    tickets' requesters are affected, and only while the task is under way.
- **The task "Floor 2 has lost its Wi-Fi"** (order 7; the five later IT tasks
  move down one):
  - Carmen's and Arjun's tickets (one crashed access point).
  - Leila's lockout, which needs both a reset and an unlock.
  - It is graded on the real fixes (`fixed` checks), the cause recorded, a test
    from the access point and one from Carmen's laptop after the fix, and the
    reply to Carmen.
- **Not in this phase** (as asked): identity verification, hints with an XP
  cost, remote desktop, voicemail, calls.

### Found on the way

- **The unit tests failed only because of how the shell was started.** All 102
  files failed in Vitest's own setup (`describe` reading `config` of undefined).
  - Node resolved Vitest from `c:\…` (lower-case drive) while Vitest ran from
    `C:\…`, so it was loaded twice. The shell here sometimes starts in a
    lower-case `c:` folder.
  - From `C:\Users\User\Documents\GamHub-WorkSim` they pass. Not a fault in the
    project.

### Tests

- **Before:** `npm run check` from `C:\…`: format, lint and types clean; 102
  files, 2,278 tests passed. The build passed.
- **Unit** (`src/game/incidents.test.ts`, 24):
  - the Wi-Fi model;
  - open while broken;
  - the right fix resolves, with its explanation, and the wrong or unrelated
    fixes do not;
  - several tickets on one system;
  - multiple conditions (a reset alone does not unlock);
  - choosing Resolved cannot bypass, and a manual resolution once fixed;
  - no duplicate resolution;
  - reopening, and closed staying closed;
  - assigned to in progress;
  - failing safely;
  - ordinary tickets unchanged;
  - colleagues held up only while affected, and what they say;
  - save and reload; older queues and profiles;
  - model answer at 100%, Resolved without a fix scores nothing, and the tool
    checks assess what was done.
- **Browser** (`tests/e2e/state-tickets.spec.ts`), the whole scenario:
  - Resolved refused, the laptop "No network", the wrong restart changes
    nothing;
  - restarting the access point resolves both Wi-Fi tickets with the reason;
  - the test from Carmen's laptop, and a finding;
  - Leila 1 of 2 until unlocked;
  - reply and close; after a reload, closed with its history;
  - submitted at 100%.
- **Results after:** `npm run check` clean (103 files, 2,313 tests). Browser suite (Chromium): 220 passed, 2 flaky, 1 failed, 3 skipped; the failed one (`week.spec.ts`, a Grid Craft cell timing out) and both flaky ones passed when rerun alone. PWA: 5 of 6, the sixth (`offline: repairing the app files`) passed alone. Other browsers: 8 passed, 1 skipped. Build passed. Startup: start screen 296 kB, 2.6 s.

### Limits

- Two systems are connected (Network Tools, Directory). Other kinds of ticket
  (remote desktop, mail) wait for later phases.
- The update to the requester is in the ticket's history; no email is sent.
- The consequence in the office is what the colleague says and seems to be
  doing. Their 3D animation does not change, and it is not covered by a browser
  test (the walking is not scripted). It is covered by unit tests.
- One task uses it so far; the earlier IT tasks are unchanged.
- Players already past task 6 who have not started the old task 7: it is now
  task 8, and waits for the new task 7 first. Passed work, XP and levels are not
  affected.

---

## 2026-11-12 · Office apps 3: Deck Craft, a real presentation app, in the office

The office presentation app is now **Deck Craft**: the official web build of
DeckCraft 0.18.1 by the ArtCraft team (MIT OR Apache-2.0), in the presentation
window. The basic Slides editor stays as the fallback and as the format the graders
read. With Grid Craft and Word Craft, all three office apps are now the real ones.
See `docs/CRAFT_APPS.md`.

### The build

- DeckCraft 0.18.1's web release (published 2026-11-12, the latest) is pinned in
  `crafts.json`. Its checksum was checked against its SHA256SUMS.txt.
- It has the same host mode and page command API as the others
  (`window.deckcraft`, 383 commands).
- **What was learned by trying it:**
  - In the browser, saving or exporting to a path is not available. A file comes to
    the page only by Deck Craft's own Save, Print, or `file.saveBytes`.
  - It opens each file beside the ones already open.
  - Its Save hands back the file the page sent, under that name. A presentation it
    made itself is saved as a `.deckcraft`, after asking for a name.

### What was built

- **The converter** (`src/apps/slides/deckcraft/convert.ts`):
  - **WorkSim's slides are built by command:**
    - each slide in its layout, the text in the layout's placeholders;
    - the other text boxes, shapes, pictures and charts where they were;
    - the notes and the theme.
  - **Deck Craft's work is read back by its own inspection of each slide**
    (`slide.inspect`):
    - the titles, and the text of placeholders, text boxes, shapes and tables;
    - charts, with their data;
    - the notes, the layout and the theme.

    That is what the graders read: slide titles, text, charts and the number of
    slides.

  - Charts from Grid Craft go in as real Deck Craft charts, so charts made in Deck
    Craft count too.
- **The presentation window** opens Deck Craft:
  - The presentation opens from the kept `.pptx` (a new, optional `file` field), or
    is built from WorkSim's slides (templates, task files, older presentations).
  - Either way it is handed to Deck Craft as `<title>.pptx` by the host message, so
    Deck Craft's own Ctrl+S keeps it too.
  - It is saved after each change, before submitting and closing, and when the tab is
    hidden.
  - **In the bar above:**
    - **Present** and **Present from this slide** run Deck Craft's own slide show,
      full screen; Escape ends it;
    - Insert chart / table from Grid Craft;
    - Download .pptx and Export PDF;
    - Import a file….
  - **WorkSim AI** sees the presentation and the selected text, and types a proposal
    in only when the player applies it.
- **Named Deck Craft** wherever the player sees it:
  - the dock and the start menu (searching "slides" still finds it);
  - task, project and career text (the chart hints now name the new button);
  - Help, with a new topic.

  The id stays `slides`.

- **Settings → Office apps** now chooses the basic editors for all three apps.

### Found and fixed on the way

- **Word Craft never reopened its kept .docx** (found by Deck Craft's reload test).
  - Saving checks content against its schema, which writes each object's keys in
    the schema's order. The fingerprint stored with the file was taken before that.
  - So it never matched, and every reopen rebuilt the document from WorkSim's copy,
    without its pictures, footnotes, comments, headers and footers.
  - Fingerprints now ignore the order of keys (`fingerprintValue`). A browser test
    checks that the kept .docx matches.
  - For existing saves nothing gets worse: they rebuild once more, as they did each
    time before, and are then kept.
  - Grid Craft was checked the same way and was not affected; it is unchanged.
- **The slide show did not hear the keyboard** after Present. Two causes:
  - The focus guard (from Grid Craft) gives the app the keyboard only on a click
    or Tab.
  - Deck Craft hears keys only once its canvas has been focused; focusing the frame
    is not enough.

  The shared frame now has `focus()`, which lets the app in as a click would and
  focuses its canvas. Present uses it; the other apps are unchanged.

- **An imported .pptx** opened under its own name. It now opens as this
  presentation's file, under its title.
- **Charts from Grid Craft without a title** showed Deck Craft's placeholder "Chart
  Title". It is now cleared.

### Tests

- **Unit tests** (`deckcraft/convert.test.ts`, 7; `lib/fingerprint.test.ts`, 2):
  - building every slide in its layout, with real charts;
  - a part that cannot be built;
  - reading back titles, text, tables, charts, notes and slides;
  - pictures from WorkSim;
  - IDs and fingerprints, also after the save schema.
- **Browser tests** (`deckcraft.spec.ts`, 7):
  - **a template, edited:**
    - slides added, duplicated, moved and deleted;
    - a chart, notes, a transition and an animation;
    - kept as .pptx and read as the graders read it;
    - reopened from the .pptx with the transition and the animation;
  - the slide show, moved on with the keyboard, Escape ends it, and Present from
    this slide;
  - Download .pptx and Export PDF (real files), and a .pptx imported;
  - WorkSim AI's review;
  - a presentation from before Deck Craft;
  - the basic editor when Deck Craft is missing, and when chosen.
- **The report task, connected** (`wordcraft.spec.ts`), now with its slides in Deck
  Craft: the analysis in Grid Craft, the report in Word Craft, the slides in Deck
  Craft with the chart from the picker, handed in by email, graded 100%.
- **Cross-browser:** the journey opens a presentation in Deck Craft in Chromium,
  Edge, Firefox and WebKit.
- I checked the screenshots (`docs/screenshots/crafts/deckcraft-*.png`).
- **Results:**
  - `npm run check`: format, lint and types clean; 102 test files, 2,278 tests
    passed.
  - `deckcraft.spec.ts` on its own: 7 of 7 passed.
  - With `wordcraft.spec.ts` beside it, two Word Craft tests timed out under the
    load: the AI reply was late, and Word Craft was still starting. Both passed
    when run again on their own; the connected office was graded 100%.
  - **The full regression:**
    - Chromium: 211 passed, 7 flaky (passed on retry), 3 skipped, 4 failed, in 1.5 h.
    - The 4 failures were each run again on their own, and each passed: Grid Craft's
      reload test, Grid Craft's AI test, the first week, and Word Craft's basic-editor
      setting. All four were timeouts under load (a cell typed into, the save
      indicator, the desktop appearing).
    - Of the flaky tests, Deck Craft's slide show failed first because the desktop
      took more than 20 s to appear; on its own it passed.
    - PWA: 5 passed, 1 failed. My test expected the wrong cache name: the apps are
      listed alphabetically (`craft-apps-deckcraft@0.18.1,gridcraft@0.18.0,wordcraft@0.18.0`).
      Corrected in the test and the docs, it passed.
    - Cross-browser: 8 passed, 1 skipped (Chromium, Edge, Firefox and WebKit).
    - The build passed. Startup: the start screen in 2,581 ms (291 kB), the office
      in 2,344 ms.

### Limits

- Read into WorkSim's slides: titles, text, charts, notes, layout and theme. Kept in
  the .pptx only: animations, transitions, pictures added in Deck Craft, SmartArt,
  media, comments and formatting.
- Text formatting is not read back.
- A theme other than WorkSim's four keeps WorkSim's theme in its copy.
- Full screen depends on the browser allowing it. Without it, the show fills the
  window.
- Presenter view with a second screen was not tested.
- Screen reader support of the canvas app is not confirmed; the basic editors are in
  Settings.

---

## 2026-11-12 · Office apps 2: Word Craft, a real word processor, in the office

The office word processor is now **Word Craft**: the official web build of WordCraft
0.18.0 by the ArtCraft team (MIT OR Apache-2.0), in the document window. The basic
Docs editor stays as the fallback and as the format the graders read. Deck Craft is
next. See `docs/CRAFT_APPS.md`.

### The build

- WordCraft 0.18.0's web release (published 2026-11-11) is pinned in `crafts.json`:
  checksum checked against its SHA256SUMS.txt.
- It has host mode and the page command API (`window.wordcraft`, 675 commands).
- In host mode it starts with no document and on its own File › Home. It has no
  option to hide its File tab; what it saves still comes to WorkSim.

### What was built

- **Shared parts, from Grid Craft** (`src/apps/craft/`):
  - `useCraftSession` (opening, saving, pending, leaving) with an adapter per app;
  - `CraftShell` (the bar and the cover).

  Grid Craft now uses them too. Its six browser tests pass, run one at a time.

- **The converter** (`src/apps/docs/wordcraft/`):
  - WorkSim's documents are written as HTML for Word Craft to open.
  - Word Craft's work is read back from its own HTML of the document, by the basic
    editor's parser (TipTap). That gives exactly the headings, text, lists and
    tables the graders read. Then it is tidied: imported fonts and sizes removed.
  - **Charts** go in as pictures whose alternative text carries the chart, and are
    read back as charts, so the "charts" checks count them. A chart inside a line of
    text keeps the line's text.
- **The document window** opens Word Craft:
  - the kept `.docx` (a new, optional `file` field), or the document built from
    WorkSim's (templates, task files);
  - saved after each change, before submitting and closing, and when the tab is
    hidden;
  - in the bar above the document: Insert chart / table from Grid Craft, Download
    .docx, Export PDF, Import a file…;
  - WorkSim AI sees the selected text and the document, and applies a rewrite only
    when chosen.
- **Named Word Craft** wherever the player sees it: the dock, the start menu, task
  and assessment text (the chart hints now name the new button), careers and help.
  The id stays `docs`.
- **Settings → Office apps** now chooses the basic editors for both apps.

### Found and fixed on the way

- **Word Craft stayed on its File › Home** after a document was opened by command.
  It is closed after each open (`ui.backstage`).
- **A chart inside a heading lost the heading's text** when read back. The chart is
  now a block after the line.
- **A chart inserted during a save was sometimes never kept.** Word Craft sent no
  change report, so nothing saved it. The report task lost its chart 2 times in 3.
  - Tracing showed the picture went in, and that the frame was not reloaded.
  - The app's change report was missed.
  - Both apps are now also asked once a second whether they have unsaved changes.
  - The task then passed 3 times out of 3.
- **Drawing a chart picture** no longer waits on `image.decode()` (it could wait
  without end). It loads with a 10-second limit, and an error is shown if it fails.

### Tests

- **Unit tests** (`convert.test.ts`, 6):
  - documents as HTML;
  - charts in alternative text;
  - every template;
  - tidying what comes back;
  - fingerprints.
- **Browser tests** (`wordcraft.spec.ts`, 6):
  - a new document, styled, kept as .docx, read as the graders read it, and
    reopened after a reload;
  - a template with its headings and table, and charts counted (also one inside a
    heading);
  - WorkSim AI's rewrite;
  - **the report task, connected:** the analysis in Grid Craft, the report in Word
    Craft with its chart from the picker, the slides, handed in by email, graded
    100%;
  - the basic editor when Word Craft is missing, and when chosen.
- **Cross-browser:** Firefox and Edge type into Word Craft, and WebKit enters the
  text through the API (see the Grid Craft entry).
- I checked the screenshots (`docs/screenshots/crafts/wordcraft-*.png`). They led to
  the File › Home fix.
- Results:
  - `npm run check`: format, lint and typecheck clean; 2,269 unit tests in 100
    files, all passed.
  - Before the full run:
    - the Grid Craft and Word Craft browser tests, one at a time: 11 of 11;
    - the report task, after the fix: 3 of 3;
    - cross-browser: 8 passed, 1 skipped.
  - **Full Chromium suite:** 210 passed, 2 failed, 3 flaky.
    - **Failed:** "a full first week" and "a working day", both run in the basic
      editors. Each passed when rerun alone (1.0 min each). The week test was flaky
      before, in the Grid Craft runs.
    - **Flaky:** a stand-up meeting, Books, and the Word Craft report task. The
      report task waited for Word Craft to be ready, and passed on retry; it passed
      3 of 3 alone after the fix.

    Your own Firefox was using a lot of CPU during the runs, which slows the
    parallel tests.

  - **PWA:** 5 passed, 1 failed: Grid Craft offline, which took 3.4 minutes instead
    of about 26 seconds, right after the Chromium suite. Rerun alone, it passed; the
    whole PWA suite was then run again and passed 6 of 6.
  - **Firefox, WebKit and Edge:** 8 passed, 1 skipped.
  - **Production build:** OK. Startup: start screen 2.7 s, office 2.2 s.

### Limits

- Only the text, headings, lists, tables and charts are read into WorkSim's
  document. Pictures, footnotes, comments, tracked changes, headers and footers stay
  in the .docx.
- Page size and margins are not read back, and a page break is not read back.
- Charts made inside Word Craft are not WorkSim charts. Charts from Grid Craft are.
- Screen reader support of the canvas app is not confirmed; the basic editors are in
  Settings.

---

## 2026-11-11 · Office apps 1: Grid Craft, a real spreadsheet, in the office

The office spreadsheet is now **Grid Craft**: the official web build of GridCraft
0.18.0, an open-source spreadsheet by the ArtCraft team (MIT OR Apache-2.0), run in
the desktop's window. The game's own editor stays as the fallback and as the format
the graders read. Word Craft and Deck Craft come next, in that order. See
`docs/CRAFT_APPS.md`.

### Inspection and the build

- All three projects (Word, Grid and Deck Craft) are Rust and egui, drawn on a
  canvas. Each has a web build with a host mode for embedding:
  - an iframe that sends files in and hands every save back to the host;
  - a page command API (`window.<app>`) with the app's 400-odd commands, which can
    also read cells and formulas back.
- There are no paid services, network calls, telemetry or AI keys. MIT or
  Apache-2.0; the ArtCraft name and logos are trademarks outside the licence.
- **Option B (official builds) was used:**
  - v0.16.0, the inspected source version, has host mode but no command API.
  - v0.18.0 has both. Its web front end is identical to the extracted `main` source,
    and its licences are unchanged.
  - Verified by SHA-256 against the release's SHA256SUMS.txt and GitHub's own record.
  - The PGP signature could not be checked: the key is not published.
- `npm run crafts` (run before `dev` and `build`) downloads the pinned release
  once, checks it and unpacks it to `public/crafts/gridcraft/`. Nothing of it is
  committed, nor is the extracted source.

### What was built

- **A shared host** (`src/apps/craft/`), for all three apps:
  - `crafts.ts`: whether an app can run here (installed, WebGPU/WebGL2, the
    player's choice);
  - `CraftFrame.tsx`: the iframe, the host messages and the command API.
- **A converter** (`src/apps/sheets/gridcraft/convert.ts`), both ways:
  - Grid Craft's workbook into WorkSim's sheets: inputs, formats, widths and
    charts;
  - WorkSim's sheets into commands that build them in Grid Craft: values, formats,
    widths, validations, conditional formats, filters and charts.

  What the player did not touch keeps its exact input, so "unchanged" checks stay
  fair (`1200.50` is not turned into `1200.5`).

- **The workbook window** opens Grid Craft:
  - The workbook opens from its kept `.xlsx`, or is built from the sheets (a task's
    starting workbook).
  - It is saved 1.5 s after a change, and before Submit and closing. Each save keeps
    the `.xlsx` (a new, optional `file` field) and the sheets.
  - Autosave, crash recovery, version history, backups, grading, AI, exports and
    the Portfolio all work as before.
  - Download .xlsx, Download .csv, Export PDF, and Import a file… (.xlsx, .xls,
    .xlsb, .ods, .csv).
- **WorkSim AI** sees Grid Craft's active cell and selection:
  - it explains formulas and errors, suggests formulas and analyses data;
  - a proposed formula is written into Grid Craft only when the player applies it.
- **The app is called Grid Craft** wherever the player sees it: the dock, the start
  menu, tasks, careers, help, the Docs and Slides insert buttons, and the Portfolio.
  The internal id stays `sheets`, so saves do not change.
- **The basic editor** opens the same workbook when:
  - Grid Craft is missing;
  - the device cannot draw it;
  - it does not start;
  - the player chooses it in **Settings → Office apps** (it works fully with a
    screen reader).
- **Offline:** the app is not part of the game's install (25 MB). It is kept in a
  cache of its own once opened (`craft-apps-gridcraft@0.18.0`) and opens offline
  from then on.
- **Credit and notices:**
  - the window shows "Grid Craft 0.18.0, based on GridCraft by the ArtCraft team"
    and links to the NOTICE;
  - `THIRD_PARTY_NOTICES.md` was added;
  - no ArtCraft marks are used in WorkSim's own interface.
- **Saves:** nothing is migrated. `file` is optional; old workbooks open and are
  built in Grid Craft the first time.

### Tests

- Before writing the tests, all 27 spreadsheet tasks were checked:
  1. Each model answer was built in the real Grid Craft.
  2. It was read back.
  3. It was graded.

  0 differing cells, and the same grade for every task.

- **Unit tests** (`convert.test.ts`, 11):
  - the round trip through a workbook the real Grid Craft saved, covering every
    format, colour, width, chart, validation and conditional format WorkSim keeps;
  - number format codes;
  - kept inputs;
  - every starting workbook;
  - references and fingerprints.
- **Browser tests** (`gridcraft.spec.ts`, 6):
  - the first task done in Grid Craft, from its starting workbook to 100% and
    +100 XP;
  - the practice workbook across a reload, from the `.xlsx`, and its download;
  - the live round trip in the installed Grid Craft (`npm run crafts:fixture`
    remakes the unit tests' fixture after an update);
  - WorkSim AI: explaining, proposing and applying;
  - the basic editor when Grid Craft is missing, and when chosen.
- **PWA** (`offline.spec.ts`): Grid Craft is not cached before it is opened, and
  opens offline after it has been.
- The existing tests use the basic editor (development build under test) and were
  updated for the new name.
- I checked the screenshots (`docs/screenshots/crafts/`): Grid Craft in the window
  with the task pane, and the graded result.
- **Found and fixed by the regression runs:**
  - **Closing a window could lose the last change.** Grid Craft keeps a change
    until it saves, 1.5 s later.
    - Closing any window now saves everything first.
    - Hiding the tab saves Grid Craft at once.
    - Closing the tab with a change not yet kept asks first.
  - **Grid Craft took the keyboard back by itself (Firefox).** Escape and typing
    went to the sheet behind a dialog.
    - The host gives the app the keyboard only when the player clicks or tabs into
      it. Otherwise it returns focus, and passes on a key that slipped through.
    - Firefox gives no event for this, so the host checks four times a second.
  - **"Saved" was shown while Grid Craft still held a change.** The indicator now
    shows the change as pending until the file is kept.
  - **Repair app files now also clears the office apps' cache.**
  - **The cross-browser tests (production build) now use Grid Craft.**
    - Chromium, Edge and Firefox: real typing into the app.
    - WebKit: Playwright's WebKit on Windows draws the app about once a second
      without a graphics card, and loses keys at any typing speed. There the
      entries go in through the app's command API. Real Safari is not tested.
- Results:
  - `npm run check`: format, lint and typecheck clean; 2,263 unit tests in 99
    files, all passed.
  - **Chromium suite, run 1:** 201 passed, 1 failed, 7 flaky.
    - The failure was "whole journey". It passed alone, and 3 of 3 when run one at
      a time; it fails only with three copies at once on this machine, as it did
      before.
    - The flaky tests were older ones: backup, content loading, Data Studio ×2,
      Books, the family at home, the week.
  - **Chromium suite, run 2,** after the window and focus fixes: 203 passed,
    1 failed, 5 flaky.
    - The failure was content loading, which then passed 2 of 2 alone.
    - Flaky: deliveries, interiors, the family at home and the week (older), and
      the Grid Craft reload. That last one found the "Saved" indicator problem;
      after the fix it passed 4 of 4.
  - **After the last fixes:**
    - the Grid Craft tests: 6 of 6;
    - every spreadsheet-related test (Grid Craft, career, desktop, multi-app,
      sheets data, AI in the apps, keyboard, accessibility, journey): 37 of 38;
    - the failure was the first Grid Craft task waiting for a brief "pending"
      state that heavy load had already passed. That check was removed: submitting
      saves first, and the score proves it. The test then passed 2 of 2 in
      parallel.

    The full Chromium suite was not run a third time.

  - **PWA:** 6 of 6, after one unrelated "repair" failure in run 2 passed on rerun.
  - **Firefox, WebKit and Edge:** 8 passed, 1 skipped (service workers in
    Playwright's WebKit on Windows).
  - **Production build:** OK. Startup: start screen 3.1 s, office 1.8 s.

### Limits

- Grid Craft's screen reader support in the browser is not confirmed, hence the
  basic editor in Settings.
- Functions only Grid Craft has (XLOOKUP, LAMBDA…) work in it, but the graders,
  which calculate with WorkSim's engine, see an error.
- Conditional formats, validations and filters made in Grid Craft are kept in the
  `.xlsx`, but not read into the graded sheets. Dates stay serial numbers.
- In a test browser without a graphics card each command takes about a second
  (about 30 ms in a normal browser), so the Grid Craft tests take 1–2 minutes each.

---

## 2026-11-11 · People 1: real seats, real equipment, nothing done at thin air

The owner reported people sitting in mid-air and moving their hands at nothing. The
details are in [docs/NPC_ACTIVITIES.md](docs/NPC_ACTIVITIES.md).

### Causes found

- Reading, writing, eating and drinking were built on the seated pose, and were used
  at standing places: the standing desk, reception, the printer, the water cooler,
  the counter and the filing cabinet. So people there sat on air.
- Seated hips were at one fixed height, 0.49 m. Real cushions are 0.45–0.51 m up, so
  seated people sank into them.
- Seated places were typed-in points near chairs, with no check that a chair was
  there, which way it faced, or whether it was free. The park bench sitter faced the
  backrest.
- Activities had no objects. Typing ignored the keyboard; nothing was held; typing
  was asked for at the break room table, which has no computer; the exercise bike's
  rider sat still.

### Built

- **Interaction anchors** (`world/anchors.ts`). Furniture registers its own:
  - seats, with cushion height and facing: office chairs, café and wedding chairs,
    sofas, park benches, home dining chairs, bed edges and the exercise bike saddle;
  - keyboards: office desks, the manager's new keyboard, the standing desk's laptop
    and a laptop on the café table;
  - printer, filing cabinet, bookshelf, whiteboard, plants, water cooler, coffee
    machines, counters, the shop's aisles and fridges, and both sides of the
    checkout.

  One person per seat.

- **Activities with needs** (`world/npc/activities.ts`). Each activity has a
  posture, what it needs and what is held. Places are checked against the real
  anchors; anything that cannot be done is dropped, with the reason recorded.
- **Fitting to the world** (`character/fit.ts`):
  - hips on the real cushion, legs solved so the feet are on the floor;
  - hands put on the keyboard or the thing reached for, by a two-bone arm solution;
  - sitting down onto the seat, and getting up before walking off;
  - arm-only activities done standing or seated, as the place allows.
- **Used by everyone**: the office crowd and the customers (`Crowd.tsx`), people
  placed in a scene (`Npc.tsx`, with `activity` and `also`), and the player
  (`fitToWorld`). People now hold what they use: phone, document, clipboard and
  pen, cup, sandwich, card, watering can, basket, a product.
- **Places corrected where the check found them wrong:**
  - the standing desk is now typing on its laptop, and the break room table is
    reading and a drink;
  - the kitchen helper faces the coffee machine, and the water cooler is used;
  - the shop's shopper and the café's corner customer were out of reach of what they
    used;
  - the office chairs are 7 cm nearer their desks.

### Tests

- Unit tests (`activities.test.ts`, 12): feet on the floor from every seat height;
  the arm lands on its target; typing hands on the keys; seats found and never
  shared; nothing seated without a seat; no typing without a keyboard; held objects;
  the player; every authored place valid.
- Browser tests (`activities.spec.ts`) measure the real scenes:
  - the office over half a minute, mid-morning and at lunch: no rejected activity,
    no shared seat, seated hips within 2 cm of the cushion and drawn on the seat,
    standing people at full height, held objects as expected, typing on a keyboard;
  - the café and the shop: the regulars and staff.

  The first run failed on cups versus mugs, now fixed. The new unit test also found
  that typists' hands fell 12 cm short of the keys (the typing pose leans back);
  they now lean forward as far as needed.

- I inspected screenshots of the desks, the standing desk, the manager's office and
  the break room at lunch: everyone is on a chair, the coordinator stands at the
  laptop, the manager types at her keyboard, and the lunch table is seated.
- **Performance fix during testing.** The first full runs showed the long
  wedding and week tests slowing from about 1–2 minutes to 9–10. Each held-object
  slot drew every possible object and hid all but one, and the scene people
  re-fitted their poses whenever their parent re-rendered. Now only the object in
  use is drawn (`Held.tsx`), and a person is re-fitted only when where they are or
  what they do changes. The wedding tests now take 1.7 min and 57 s, and the week
  test 49 s.
- **A bug found by the reruns.** While someone was getting up from a chair,
  the snapshot already showed them at their next place, so the meeting counted
  them as present before they had walked over. The stand-up test caught this 2
  times out of 3. A person getting up now has their own status (`rising`) and is
  not counted at a meeting. The dev snapshot is now also taken the moment anyone
  comes in or leaves, so the café test always sees a customer at the door.
- Results:
  - `npm run check`: format, lint and typecheck clean; 2,252 unit tests in 98
    files, all passed.
  - Full Chromium suite, run three times:
    - first run: 1 failed and 9 flaky. I was editing files while it ran, which
      reloads the page; every failing test passed when rerun alone;
    - second run (no edits): 197 passed, 0 failed, 6 flaky;
    - after the performance fix: 197 passed, 0 failed, 6 flaky (city morning,
      café customers, interiors, stand-up, Books reload, week). Each passed on
      retry.
  - The flaky tests rerun:
    - the stand-up failed 2 times in 3: the bug above, fixed, then 9 of 9;
    - the café customers: 3 of 3 alone, and passing in a batch after the
      snapshot fix;
    - interiors, Books and the week passed in a batch;
    - the city morning (a menu walk through the gym and the café) failed once
      more under load, then passed 3 of 3 alone. It is flaky under load and does
      not involve the people.
  - PWA build: 5 passed, 1 skipped. Firefox and WebKit: 8 passed. Production
    build OK. Startup: start screen 2.6 s, office 2.4 s.

---

## 2026-11-10 · Life 1: children grow up, money talks, customers, the courier outside

### Built

- **Children grow up** (`game/children.ts`): a year every two game weeks (baby, toddler,
  school child, teenager, grown up at 18 and living away). They are drawn at their size;
  school-age children are at school on weekdays from 8:45 to 15:30, and not at home then.
  What there is to do with them depends on their age (a lullaby, a bottle, a tower of
  blocks, a story, their day, homework, a video game). An adopted child comes home aged
  four. The Relationships screen gains a Family section. Older saves keep working (a
  child's `born` day was already saved).
- **Money talks** (`game/money.ts`): living together, with less than £150, the partner
  sends a message and wants to talk. Agreeing a budget together brings you closer (+8);
  brushing it off does not (−6). At most once a week, and never for a player who is
  single. Kept in the bond's history, so nothing new in the save.
- **Café and shop customers with a routine**: a schedule person can now have repeating
  visits (`visits` in `world/npc/schedule.ts`). Two walk-in customers in each place
  (one on low graphics) come in through the door all the time it is open, go to the
  counter first (café) or the checkout last (shop), sit or browse in between, and leave.
  They are walked round the furniture by the office's crowd system and can be talked to.
  The regulars, including the people the player can get close to, stay where they were.
- **The courier in the street**: if the takeaway arrives while the player is out in the
  street, the courier waits by the building's door with the bag; walking up to them hands
  it over.

### Tests

- Unit tests: `children.test.ts` (ages and stages, school hours, what there is to do at
  each age, adoption), `customers.test.ts` (visits, the counter and the checkout, coming
  and going while the clock stands still), and a money-talk test in `romance.test.ts`.
- Browser tests (`everyday.spec.ts`): a seven-year-old at home and an eighteen-year-old
  living away, and the Family section; a café customer seen coming in at the door and
  walking to the counter (sampled in the page ten times a second); the courier waiting
  in the street, the bag handed over, and the courier gone. The wedding test's child is
  now four, so that "Play with Ada" is still offered.
- Results: 2,240 unit tests passed (97 files). Chromium browser tests, full run: 199
  passed, 3 skipped, 0 failed, 2 flaky (Data Studio and Books, unrelated, passed on
  retry). Before the full run the new tests were fixed twice: the evening clock had
  passed 6 pm, so the child test now asks about their day (offered at any hour), and
  the café test samples in the page rather than polling (it missed the short walk).
  5 production-build tests passed. Firefox, WebKit and Edge 8 passed, 1 skipped.
  Start screen 291 kB.

---

## 2026-11-10 · Map 1: a world map, a mini-map, and a real route

### Built

- **The world map, on its own** (`world/map/`): full screen over the paused game; M, the
  HUD's Map button, the pause menu, or the phone's Maps app (which puts the phone away
  first). Drawn from one shared set of neighbourhood data (`city/worldMap.ts`, now also
  used by the 3D street): road, pavements, crossings, buildings, the park, the places
  (found, or "not yet found"). Zoom, pan, "Where am I?"; a place's details (what it is,
  opening hours, distance, activities); set or clear the destination.
- **A real route**: the street's own walking grid (the character's) works it out from the
  player to the destination's door, again every second: along the pavements and the
  road, never through buildings. Shown on both maps; cleared on arriving.
- **The mini-map** on the HUD: turned with the player, north marked, nearby places, the
  route, the destination, a pointer when it is off the edge; "In: …" indoors; a click
  opens the map; off in Settings.
- **The phone's Maps app** is now a shortcut, with the destination and recent places.
- Keys do not move the character while the map is open; closing it leaves the player
  exactly where they were. The save gains `life.nav` and `life.phone.minimap`
  (defaults for older saves).

### Tests

- Unit tests (`nav.test.ts`, 6): every place's door is on the street's edge and has an
  icon; the buildings are one shared list; destinations and recent ones; places found by
  walking past; arriving; older saves.
- Browser tests (`map.spec.ts`): M opens it (full screen), the keys do not move the
  player, zoom, a place's details, the destination, the route (every point between the
  buildings), M closes it with the player exactly where they were, the route on the
  mini-map, the pause menu's Map, the phone's Maps app (the phone goes, the map opens);
  and the mini-map turning as the player walks.
- Screenshots: `docs/screenshots/map/`.
- Results: 2,232 unit tests passed. Chromium browser tests, full run: 192 passed, 3
  skipped, 2 flaky (the journey, the full week), 4 failed, all found and fixed: the
  mini-map's drawn text (N, the place name) was not in its accessible name (it now has a
  text name, and the drawing is hidden from screen readers); the phone's Settings now has
  two checkboxes, so its test names the one it means; and the evening-out and Friday
  tests, whose accessibility checks hit the same mini-map problem. Afterwards: the
  accessibility check, the evening out, Friday, the map and the phone tests all passed
  (10 tests). 5 production-build tests passed. Firefox, WebKit and Edge 8 passed,
  1 skipped. Start screen 290 kB.

---

## 2026-11-07 · Story 6–10: a story for every career

### Built

Five new campaigns (`src/game/story/campaigns/`), each with its own people (the
department's manager and senior colleague, and others from the office), its career's own
cases on the computer, two chapters, a side mission, a decision that comes back in the
second chapter, and endings that follow from it:

- **Accounting, "The Halden Account"**: the firm's oldest client disputes a statement
  (write it off, as always, or check the ledger); in VAT season, expenses coded to
  reclaim tax they should not, signed off by a senior colleague (report it, go to the
  manager together, or let her correct it quietly); the year-end.
- **IT Help Desk, "Ticket Zero"**: a ticket open for three weeks (restart it again, or
  find the real cause); a department head's assistant wants admin rights (grant them,
  install the one tool, or refuse); the phishing email, where that choice decides
  whether anything gets in.
- **Digital Marketing, "Launch Week"**: a client changes the brief (agree, or say what it
  will cost first); a vlogger's paid post (mark it as paid, or not; a second chance with
  the manager); the client's reaction to the results.
- **Data Analysis, "Signal and Noise"**: two departments' different numbers for the same
  month; a director's analysis that is meant to support a decision already made (the
  full picture, or only the first year; a second chance); the board meeting.
- **Software Development, "Release Day"**: a vague bug report that is quietly losing
  data (if the player asks exactly what was typed); an impossible deadline (ship less,
  tested, or everything with a known problem; a second chance); release day.

Story Mode is offered on the first screen for every career, and the Story screen shows
each career's own campaign.

### Tests

- Unit tests (`campaigns.test.ts`, 13): six campaigns, one per career, each with its own
  title and people; for each, every scene, person and case it names exists and every
  scene is used; at least two chapters and a side mission; played to the end in five
  different ways of choosing, with at least two different endings.
- Browser test (`story.spec.ts`): IT Help Desk in Story Mode from the first screen, the
  first mission played in person.
- Results: 2,226 unit tests passed. Chromium browser tests, full run: 196 passed, 3
  skipped, none failed or flaky. Production-build tests: 1 failed in the full run (an
  offline-update test whose service worker was not ready yet, as before), then 5 passed
  on their own. Firefox, WebKit and Edge 8 passed, 1 skipped.
- Found and fixed: the six stories had made the start screen 311 kB, because the code
  that saves every change imported them. Stories now register when the desk loads, and
  the first screen has only their titles: 290 kB (from 298 before this work). The story
  and phone browser tests passed again after the change (8 passed).

---

## 2026-11-07 · Relationships 7–11: marriage, a family, hard times, the phone, the story

### Built

- **Engagement and a wedding, played** (`game/family.ts`, `interiors/Wedding.tsx`,
  `WeddingPanel.tsx`): asking to marry (living together, asked and answered); setting
  the date; on the evening, in the park, an arch of flowers, two rows of chairs with the
  player's friends seated, and the partner waiting under the arch. The player walks up:
  the vows (chosen), "I do", the kiss (asked, as always; the guests cheer), the first
  dance together, and celebrating. A wedding not gone to is postponed.
- **A family, if wanted** (optional, asked; someone who never wanted children says so,
  kindly, and it is respected): a baby "on the way" (no more is shown) or an adoption, the
  child arriving after a few days and living at home, shown at a child's size, with
  child-appropriate things to do together (play, a bedtime story, getting ready for
  school). Children are never part of anything romantic.
- **Hard times, from what happened** (never random, never because the player works): a
  low patch can be talked through ("say sorry", +12 closeness); the player can end it
  (separated or divorced; they move out); a partner who has felt neglected for a long
  time (closeness under 15, from missed dates and evenings) ends it themselves; and,
  later, it can be given another go if closeness has recovered.
- **The phone**: a partner at home asks about dinner each evening; the wedding is in the
  calendar with a reminder that day.
- **Story Mode**: a new character mission in "Short Delivery", music night at the café
  (earned by helping Maya with her books): she asks the player out (yes, rather stay
  friends, or think about it) and Walter has a word, which follows from the answer.
- The save gains `life.family` and, per bond, `wedding` (defaults for older saves).

### Tests

- Unit tests (5 more in `romance.test.ts`, 19 in all): proposing and the wedding date
  and the wedding; a missed wedding postponed; a family optional, asked, only with
  someone who wants one, the child arriving; breaking up, moving out, and making up;
  ending it only after long neglect (not at closeness 40), and talking it through. The
  story's consistency test covers the new mission.
- Browser tests (`wedding.spec.ts`): the wedding in the park (guests and Maya there, the
  vows, married, the kiss, the first dance, Married in the Relationships screen); a
  child at home, played with.
- Screenshots: `docs/screenshots/relationships/wedding-*.png`, `first-dance.png`,
  `family.png`.
- Fixed on the way: the wedding was first placed in the pond.
- Results: 2,212 unit tests passed. Chromium browser tests, full run: 191 passed, 3
  skipped, 4 flaky (a backup restore, two tabs, Books, the full week; each passed on its
  retry), none failed. 5 production-build tests passed. Firefox, WebKit and Edge 8
  passed, 1 skipped. Start screen 299 kB.

### Limits

- Children do not grow up yet, and have no school day of their own in 3D.
- Household disagreements about money are not modelled beyond the rent being shared.

---

## 2026-11-07 · Relationships 5–6: evenings at home, staying over, moving in

### Built

- **Becoming a couple** (asked, when dating) and **an evening at yours** (asked, when
  dating): they come round that evening from 7:30 pm and are in the flat, sitting on the
  sofa (or the edge of the bed in a flat without one). Walking up to them, the player
  sits with them; three rounds of talk (holding hands asked and shown, side by side);
  then, if they are a couple, **asking them to stay the night**: a yes means a fade to
  the morning (nothing is shown; "Later that night… and the next morning"), and they are
  there when the player wakes up. Otherwise, goodnight at the front door, face to face.
  A visit the player was out for is missed, and remembered.
- **Moving in** (asked, as a couple): they live in the flat from that day, there whenever
  the player is home, and pay half the rent (the player's half is shown as such on
  Mondays). The save gains `life.partner` and, per bond, `visit` and `stayOver`
  (all with defaults: older saves load unchanged).
- The Relationships screen shows it all in their shared history.

### Tests

- Unit tests (5 more in `romance.test.ts`): asking round and them being there that
  evening (not before 7 pm); staying over asked ("not yet" while dating, yes as a couple)
  and waking up together; a missed visit; moving in (they live there, the option goes);
  half the rent on Monday morning.
- Browser test (`home-life.spec.ts`): Maya round for the evening, sitting together,
  holding hands, asked to stay (yes), bed and the fade, the morning with her there,
  asked to move in (yes), and the Relationships screen showing it.
- Screenshots: `docs/screenshots/relationships/sofa.png`, `night-fade.png`,
  `morning.png`.
- Results: 2,207 unit tests passed. Chromium browser tests, full run: 191 passed, 3
  skipped, 2 flaky (the stand-up in person and Books, each passed on its retry), none
  failed. 5 production-build tests passed. Firefox, WebKit and Edge 8 passed, 1 skipped.
  Start screen 298 kB. The Books tests now wait up to 30 seconds for the tool to open.

---

## 2026-11-07 · Relationships 4: affection, shown between the two

### Built

- **New animations** (`rig.ts`): a hug, a kiss, a slow dance, holding hands across a
  table, and holding hands side by side (each hand).
- **Two people moving together** (`world/npc/moment.ts`): when the other person says yes
  to holding hands on a date, both reach across the café table (or hold hands on the park
  bench) for the rest of the date. Saying goodnight, both stand up and face each other
  beside the table (or in front of the bench), close: a kiss if they said yes to one, a
  hug if they would like one (asked), a wave otherwise; it starts when the player gets
  there, and the date ends when it is over. Seen from the side, so both are in view (a
  new camera framing for activities).
- Never without a yes: holding hands and a kiss only after the other person said yes;
  the goodnight hug is asked like any other.

### Tests

- Unit tests: every new animation gives valid poses (`world.test.ts`).
- Browser test (`date.spec.ts`, now with these): holding hands across the table, and
  goodnight standing face to face (a hug: a kiss was "not yet").
- Screenshots: `docs/screenshots/relationships/holding-hands.png`, `goodnight.png`.
- Results: 2,202 unit tests passed; the date browser test passed. The full browser run is
  done with the next milestone.

---

## 2026-11-06 · Game screen 1: the world is the screen

### Built

- **Full screen** (`world/GameScreen.tsx`): at home and in town, as at work, the 3D world
  fills the window below the slim top bar, with no page around it and no scrolling. What
  can be done there is a drawer over the world (top left), which folds away to a button
  and stays folded; conversations, story scenes and dates opened from it stay on screen.
  Without 3D, the drawer is the page, as before.
- **The HUD** (`desktop/GameHud.tsx`): six small bars (hunger, hygiene, social, fun,
  energy, stress) and Phone, Map and Menu at the bottom right; prompts at the bottom
  centre as before; the controls help at the top centre.
- **The pause menu** (Esc from the world, or Menu): Resume, Map, Missions, Relationships
  (everyone the player is getting close to: stage, closeness, what they love, the date,
  shared history), Character, Inventory, Settings, Help, Save & backup, and the main menu
  (continue, Story Mode, every career). Esc only pauses from the world: an Esc that
  closes a conversation or a pop-up does just that.
- **The world is not rebuilt** by menus, the phone or the drawer (tested).
- **Performance**: in software 3D (no graphics card), the view keeps the old pixel
  budget (about 120,000 pixels) however big the window, so full screen costs no more
  than the old small view; with a graphics card, unchanged.

### Tests

- Browser test (`game-screen.spec.ts`): full screen at work, at home and in town (the
  canvas fills the window below the bar, no scrolling), the HUD, the drawer folding away,
  Esc and the pause menu, Relationships from it, Resume, the phone, the same 3D view
  throughout, resizing the window.
- Found by the full run and fixed: Esc that closed a conversation also opened the pause
  menu (now decided as the key goes down, and only from the world); hotspots under the
  drawer (the test folds it away first, as a player would); the larger software-drawn
  view slowing the whole run (the pixel budget above).
- Screenshots: `docs/screenshots/game-screen/`.
- Results: 2,202 unit tests passed. Chromium browser tests, full run: 187 passed, 3
  skipped, 4 flaky (data tools, the journey, the office arrival, Books; each passed on
  its retry), 1 failed: the accessibility check of the office found the HUD's key hints
  (P, Esc) too faint on a see-through button. Fixed (the HUD is now nearly solid), and
  all 10 accessibility tests then passed. 5 production-build tests passed. Firefox,
  WebKit and Edge 8 passed, 1 skipped. Start screen 298 kB.

### Limits

- Desktop windows only (tested at 1280 × 720 and 1024 × 700); phones and tablets are not
  claimed. The office keeps its own panel and Places bar.

---

## 2026-11-06 · Relationships 1–3: people, bonds, consent, and dates played

### Built

- **Adults with lives of their own** (`content/adults.ts`): eight people already in the
  world, all adults, each with interests, dislikes, what they want, boundaries, free
  evenings, and whether romance with the player could ever happen (for two, it could
  not).
- **Bonds** (`game/romance.ts`; `life.bonds` in the save, empty for older saves): stage,
  closeness, attraction, what the player has found out, what was declined, a date
  arranged, dates, history.
- **Consent as one rule**: every step answered yes, no or not yet by who they are and
  how things stand; a no cannot be asked again for three days; nothing is explicit.
- **Getting to know someone** (`game/personal.ts`, in the existing conversations):
  their interests, compliments, flirting, a hug, asking them out.
- **Dates played in the world** (`game/dates.ts`, `DatePanel.tsx`, `DatePartner.tsx`):
  they wait at the café or in the park; the player sits down with them (dinner or the
  bench) and stays seated; three rounds of talk and asking; the bond follows what
  happened; a good first date means dating; a missed date is remembered. In the phone's
  calendar and reminders. Development tools: `setBond`, `setLifeMinute`.

### Tests

- Unit tests: `romance.test.ts` (9) and `dates.test.ts` (6).
- Browser test (`date.spec.ts`): asking Maya out in person, then the date that evening,
  sitting down to dinner together (paid), talking about what she loves, holding hands,
  a kiss declined ("not yet") and respected, and the end of the evening: dating.
- Screenshots: `docs/screenshots/relationships/`.
- Results: 2,202 unit tests passed. Chromium browser tests, full run: 188 passed, 3
  skipped, 2 flaky (the Social Planner and the stand-up in person, each passed on its
  retry), 1 failed: the Accounting Books tool end to end (both attempts, under the full
  parallel run; both Books tests passed when run alone straight after; Books has failed
  this way under load before, so its waits are to be lengthened). 5 production-build
  tests passed. Firefox, WebKit and Edge 8 passed, 1 skipped. Start screen 299 kB.

### Limits

- Affection is described, not yet animated between the two (next: R4). Moving in,
  marriage, family, challenges and the story are still to come
  ([docs/RELATIONSHIPS_PLAN.md](docs/RELATIONSHIPS_PLAN.md)).

---

## 2026-11-06 · Phone 1: a real smartphone

### Built

- **The phone** (`src/phone/`, `src/game/phone.ts`): a device that rises from the bottom
  of the screen over any view, with a status bar (the game's clock, signal, battery), a
  wallpaper, the home screen's clock and date, an app grid with badges and a dock; back
  and home buttons; P to take it out and put it away (a new control, changeable), Esc,
  or the button. It replaces the old phone panel at home and in town.
- **Eleven apps, connected to the game** (no second copy of anything): Messages (the
  friends' messages and invitations, as before), Contacts (friends and the people met at
  work and in town; calls that ring, connect and talk with the same trust and memory),
  Calendar (meetings, plans, the takeaway, the story), Maps (places, where you are, the
  story's destination, Go there), Bank (the game's money and ledger), Career, Food
  (restaurants whose orders are the home's takeaway, with its courier), Circle (a social
  feed), Browser (written websites), Camera (a photo of the 3D view, kept on the device,
  a gallery), Settings (wallpaper, ringtone, notifications).
- **Notification banners** for news that arrives while playing (a message, the courier,
  a meeting in ten minutes, the next story objective), once each, with a sound.
- **In 3D**: the character takes the phone out, holds it and stands still while it is
  in use; walking resumes when it is away.
- **Sounds**: a ringtone in three versions, a call tone; the existing open, close, tap
  and notification sounds. The save gains `life.phone` (settings and likes, defaults for
  older saves).
- Found while testing: redrawing the 3D view on every frame while the phone was out
  made software-rendered pages too slow to use; it is redrawn with the rest of the place.

### Tests

- Browser tests (`phone.spec.ts`): out with P in the office (held, no walking, an
  accessibility check of the phone), every app opens and shows the game's state (the
  stand-up in the calendar, the balance, the restaurants, a photo taken and in the
  gallery), back and the home bar, a call ringing and connecting, away with P and
  walking again; settings kept across a reload; food ordered on the phone at home paid
  and the courier at the door. The friends test now uses the new phone.
- Screenshots: `docs/screenshots/phone/`.
- Results: 2,187 unit tests passed. Chromium browser tests, full run: 189 passed, 3
  skipped (the opt-in screenshots), 1 flaky (work at the computer reflected in the office,
  passed on its retry), none failed. 5 production-build tests passed. Firefox, WebKit
  and Edge 8 passed, 1 skipped. Start screen 299 kB (unchanged: the phone loads with the
  desk).

### Limits

- Calls are short written exchanges; texts go to friends only; one bank account.

---

## 2026-11-06 · Scenarios 2: meetings attended in person

### Built

- **Meetings are attended in person** (`officeLayout.ts`, `OfficeView.tsx`): joining the
  stand-up walks the player to their place in the circle at the whiteboard; they listen
  while the team speaks in turn, give their own update, and only then has the meeting
  been attended (its content, choices and grading unchanged). Weekly planning and the
  one-to-one happen in the player's chair in the manager's office. Walking away part way
  is not attending; a meeting that is not on cannot be joined. Without 3D, as before.
- **Speaking in turn** (`speakerAt` in `schedule.ts`, used by `Crowd.tsx`): the host
  every other turn (at the stand-up, presenting at the board), each colleague in
  between; everyone else listens; nobody speaks while the player gives their update.
- The stand-up is watched from behind the player, so the circle and the board are seen.

### Tests

- Unit tests: turn-taking (host every other turn, nobody during the player's update,
  others without the host); the player's place (clear floor, facing the board).
- Browser tests (`meetings.spec.ts`): attending the stand-up in person (in the circle,
  listening, the update, then the meeting) and walking away part way (not attended, still
  open to join). Run at normal speed: in software 3D, sped-up stages pass too quickly
  to see.
- Screenshots: `docs/screenshots/meetings/`.
- Results: 2,187 unit tests passed. Chromium browser tests, full run (52 minutes, the
  machine slower than usual): 181 passed, 3 skipped, 5 flaky (data tools, the whole
  journey, Books, the full week and one more, each passed on its retry; the full week
  and Books were flaky before this change too), 1 failed (content loading, which passed
  when run alone straight after). 5 production-build tests passed. Firefox, WebKit and
  Edge: in the full run 1 failed; run again on its own, 8 passed, 1 skipped (as before).
  Start screen 299 kB.

---

## 2026-11-06 · Story 5: “Short Delivery” to its end

### Built

- **Chapter 2 · The supplier review**: the main mission takes the player round the
  office (Leila, Ben, and Dana the coordinator, new to the story) to uncover a supplier
  paid for forty deliveries that never came, signed by a director; the player decides
  whose name goes on the report (their own, the team's, or none). A work mission (a
  consultant's rejected taxi claim, answered as a case on the computer), and two that
  only open if earned in chapter 1: helping Maya (Walter's granddaughter, who runs the
  café) with her shoeboxes of receipts, in town after work; and an afternoon shadowing
  Marcus, who admits he has been offered another job.
- **Chapter 3 · Audit week**: the stand-up, Nina's word on what the auditors asked for,
  Marcus before the auditors, Priya before the report. What the player hid or told in
  chapter 1 comes back here (the credit note; a pale Marcus asking what you will say).
- **The ending**: Priya offers a new role. Take it, put Marcus forward, or turn it down
  to help small businesses like Maya's. Three endings, each with its own summary, and
  what Priya says first depends on what happened with Marcus and the café. The Story
  screen shows "The end" once the main missions are done; side missions stay open and
  the career carries on in free play.
- For development and tests: `window.__worksim.storyAt(mission, flags)` jumps the
  story to a mission.

### Tests

- Unit tests (3 more, 14 in all): the campaign holds together (every scene, person and
  case an objective names exists; every scene is used; every flag a mission needs can be
  earned); the whole story played to three different endings, with side missions only
  when earned; what was hidden in chapter 1 changing chapter 3.
- Browser tests (2 more in `story.spec.ts`): the supplier review played in person with
  four people and the ending chosen, "The end" on the Story screen; and the side mission
  at the café in town, after going home and out.
- Results: 2,185 unit tests passed. Chromium browser tests, full run: 182 passed, 3
  skipped (the opt-in screenshots), 2 flaky (a backup restore and the full first week,
  each failed once and passed on its retry), and 1 failed: the Accounting career's Books
  tool test (saved work after a reload), which failed both attempts under the full
  parallel run and passed when run alone afterwards. It does not touch Story Mode;
  it is noted to watch. 5 production-build tests passed. Firefox, WebKit and Edge 8
  passed, 1 skipped. Start screen 299 kB (from 295: the story titles on the first
  screen).

---

## 2026-11-06 · Story 1–4: Story Mode, and the first chapter played in person

### Built

- **Story Mode** (`src/game/story/`): one engine for every campaign (chapters, missions
  of five kinds, objectives, scenes, decisions, flags, rewards given once), with the
  story kept in its own optional part of the save (`work.story`). Free play is
  unchanged: a career has no story unless the player starts one, and putting it away
  keeps the career.
- **Objectives are done in the world**, by the game's own systems: walking up to the
  person a mission names plays their scene (with choices); a case arrives in the inbox and
  is answered in the work tools; a meeting attended; being somewhere (the café, the park)
  or dressed. The story checks after every change in the game, and after a case is sent.
- **Screens**: Free play or Story Mode on the first screen; a **Story** button in the top
  bar (start, continue, chapters and missions with Start, the people in the story and how
  they see the player, the decisions made, put the story away); a tracker on screen (the
  mission, what to do now and where); a "Mission complete" card (the summary, which
  depends on the decisions, and the rewards).
- **"Short Delivery"** (Finance & Administration), chapter 1: five missions (first
  morning; faces and names; the missing invoice; the bakery on the corner, a side
  mission in town; month-end). The player's choice about a colleague's mistake (cover for
  him, tell the manager, or fix the process together) changes what the manager says,
  what happens at month-end, the summaries and trust. Original characters and writing.
- Fixed on the way: two 3D labels in the office (the player's desk nameplate and the
  department sign) were drawn above the page's panels and could block a click on them.

### Tests

- Unit tests (`story.test.ts`, 11): free play has no story; older saves load; a story
  round-trips through the save; putting it away keeps the career; only the person the
  current objective names has a scene; a finished mission's reward is given once, its
  summary shown, what opens next; a choice is made once; a mission with several physical
  objectives (two people, a case, the manager); a meeting objective; a side mission in
  town; decisions changing later scenes, summaries and trust; completing the chapter.
- Browser tests (`story.spec.ts`): from the first screen in Story Mode, the first
  morning played in person (Nina's welcome, Priya), the mission complete with its XP;
  the missing invoice started from the Story screen; a reload part way (the story carries
  on); Marcus, Ben, the case answered on the computer, Priya saying what follows from the
  decision; the decisions on the Story screen and month-end open. And free play: no story
  unless chosen, one started from the Story screen.
- Screenshots: `docs/screenshots/story/`.
- Results: 2,182 unit tests passed. Chromium browser tests, full run: 182 passed, 3
  skipped (the opt-in screenshots), 1 flaky: the accessibility check of the start screen
  and the office failed its first attempt and passed on its retry; run alone twice
  afterwards, it passed both times. 5 production-build tests passed. Firefox, WebKit and
  Edge 8 passed, 1 skipped (as before). Start screen 295 kB (from 286: the Story Mode
  choice on the first screen).

### Limits

- One campaign, one chapter so far; the other careers say "coming soon".
- No cinematic camera yet: scenes use the conversation view.

---

## 2026-11-06 · People 1: everyone can be talked to

### Built

- **One way to talk to anyone** (`src/world/npc/people.ts`, `src/game/encounters.ts`):
  every person shown in any place puts themselves in a list with who they are and what
  they are doing. The player walks up and presses E (only if they are in sight, not
  through a wall), or clicks them (their name, role and, if busy, what they are doing
  show on hover). They stop, turn to the player and wave; the player stands facing them
  (across the counter, for staff) and the camera looks over the player's shoulder.
- **Who**: the office's eleven people (seven of them named for the first time), the
  café's barista and customers, the cashier, a shopper and a shop assistant, the gym's
  front desk, a trainer and members (mid-run on the treadmills, on a bike), a neighbour
  in the park and people walking there, people walking down the street, the garage's
  salesperson and mechanic, and the courier at the door.
- **What to say depends on who and when**: options by kind of work (a colleague, the
  manager, reception, facilities, a barista, a cashier, shop staff, a salesperson, a
  mechanic, gym staff, a trainer, a member, a local, a customer, the courier), replies
  by personality (warm, quiet, chatty, dry, focused), what they are doing (in a meeting,
  serving, exercising, heading home: they say so; chatting: the player can join, and
  both answer), how well they know the player (an introduction the first time), what
  happened last time (wary after rudeness; thanks after a favour) and the time of day.
- **Consequences without farming**: trust from the first friendly talk of the day only;
  a favour is worth more but takes 15 minutes, once a day; rudeness and insisting cost
  trust and are remembered; after three talks a day they get back to work. Staff can do
  their job from the conversation (the barista's coffee, the cashier's till, the
  trainer's class). Time passes; out in town a friendly chat helps the social need.
- **The save**: `work.relationships` gains an optional `last` (what was said last
  time); older saves load unchanged. A change of trust no longer drops it.
- The four named colleagues keep their own conversations; when busy, they say so.
- A **wave** gesture. The conversation box sits at the side, so both people stay in view;
  Esc ends it from anywhere.

### Tests

- Unit tests: `encounters.test.ts` (15: everyone in every place has something to say
  and to be asked; options differ by work; introductions and personality; busy people;
  joining a conversation; rudeness remembered; no farming; favours; staff actions; the
  time of day; the save, for one person and for a group, in the office and in town;
  older saves) and 4 more in `npc.test.ts` (nearest in sight, not through a wall;
  where to stand; who is talking to the player; what someone is doing).
- Browser tests (`talk.spec.ts`): a colleague asked for, turning and waving, the
  introduction, saying goodbye, E to talk again, a chat and a second question, back to
  work; a colleague at the stand-up who stays there and says so; clicking someone walks
  over to them; a local in the street, the barista, a gym member mid-run, the trainer.
- Found on the way: when the office's 3D view switched to low graphics under load, the
  people were rebuilt and a conversation in progress was forgotten. It now carries on.
- Screenshots: `docs/screenshots/people/`.
- Also found: the hand-written office floor areas (the desks, low) counted as walls for
  "can the player see them", so someone across a desk could not be talked to with E.
  Only things at least 1.5 m tall block the view now (a unit test covers it).
- Results: 2,171 unit tests passed. Chromium browser tests, full run: 180 passed, 3
  skipped (the opt-in screenshots), 1 failed: a backup test (a spreadsheet cell after a
  restore, unrelated to this work) that ran past its 5-second wait twice under the full
  parallel run; it passed in the run before and alone. Its two waits are now 30 seconds,
  and all 7 backup tests passed. In the run before, the full-week test failed once
  and passed on its retry. 5 production-build tests passed. Firefox, WebKit and Edge 8
  passed, 1 skipped (as before). Start screen 286 kB.

### Limits

- Replies are written, not generated (no AI model is involved).
- Customers in the café and the shop stay in one place; they have no day of their own
  yet.

---

## 2026-11-06 · Scenarios 1: a takeaway delivered to the door

### Built

- **The audit and the plan** for living scenarios: `docs/SCENARIOS_PLAN.md` (what is
  visible, partly visible and invisible now; one engine; the order of work).
- **A takeaway, as it happens** (`src/game/delivery.ts`, `life.delivery` in the save,
  added without changing older saves): order and pay once on the phone, wait or do
  something else, the courier comes along the landing and rings the bell, the door opens,
  the bag changes hands, the courier leaves, the food is eaten at the table. Left on the
  doorstep if no one answers; in the fridge if not eaten by bedtime.
- **The home's front door** is a real doorway with a landing outside, and swings open.
- **A doorbell** (generated, captioned) and a **takeaway bag** to carry.
- **Watching from behind** for activities at a doorway.
- Fixed: a home activity without its furniture in 3D (a series without a TV) did nothing
  from the list; it now happens at once.

### Tests

- Unit tests (6): older saves, the stages in order, no double order or early answer or
  eating, handed over then eaten, kept in the save, the fridge at bedtime.
- Browser tests (`delivery.spec.ts`): ordered, reloaded part way (still on its way,
  paid once), the courier at the door holding the bag, answered, the courier gone, eaten,
  paid once; and left on the doorstep, picked up.
- Screenshots: `docs/screenshots/scenarios/`.
- Also: the main accessibility check (about twenty screens in one journey) kept running
  past its limit under the full parallel run, so it is now three journeys (start and the
  office; the work apps; readiness and documents) that run side by side, auditing the
  same screens. The office people tests wait longer for the 3D office to load.
- Results: 2,151 unit tests passed. Chromium browser tests, full run: 177 passed, none
  failed or needed a retry, 3 skipped (the opt-in screenshots). 5 production-build tests
  passed (in the run before, one failed and passed on its own rerun). Firefox, WebKit
  and Edge 8 passed, 1 skipped (as before). Start screen 288 kB (unchanged).

---

## 2026-11-06 · World 2: the people of the office live their day

### Cause

The colleague walking left and right behind the desks was a placeholder: a fixed
route between two points, out and back forever, with no purpose, no knowledge of the
furniture or of anyone else. Everyone else in the office was fixed in place.

### Built

- **A schedule for everyone** (`src/world/npc/schedule.ts`, the office's people in
  `src/office/scene/officeCast.ts`): eleven people, each with a role, a place of their
  own and a day: arriving, the stand-up round the whiteboard, weekly planning in the
  manager's office, work at their place, errands with a purpose (the printer, the
  water cooler, a word with a colleague, the plants, stretching), lunch (the break
  room, the counter, the desk, or out) and going home. Habits differ by person. It
  follows the game clock, is the same every time, and no two people share a place.
- **Walking with a purpose** (`agent.ts`): round the furniture on the shared walking
  grid, stopping on arrival, sitting down at a seat, waiting for someone in the way and
  going round them, and after three failed tries stepping on rather than trying forever.
  People and the player do not walk through one another (`bodies.ts`).
- **Talking**: someone the player goes to talk to comes back to their place, faces them,
  and afterwards goes back to what they were doing.
- **A printer and a standing desk** in the office, for the errands and the coordinator.
- The pacing colleague is now the office coordinator. Docs: `docs/OFFICE_PEOPLE.md`.

### Tests

- Unit tests (15): every place exists; arriving and going home; the stand-up and
  planning; lunch by person; no two people at one place, every minute of a week; visits
  only to someone at their desk; a bounded number of moves a day; coming back to talk;
  walking in, staying put; going round furniture; waiting for someone in the way; a way
  that cannot be found is given up on; leaving through the door.
- Browser tests (`npc.spec.ts`): walking to the stand-up and stopping there, no one
  moving while it lasts, back to the desks after; lunch and going home; the senior
  colleague coming back from the stand-up to talk and rejoining it after.
- Screenshots: `docs/screenshots/npc/`.
- Fixed while testing: on computers drawing 3D in software, people walking redrew the
  office five times a second; now once a second, like the rest of the office there (the
  player moving still draws smoothly). The keyboard-only test now waits for the walk to
  the desk (it goes round the furniture and people, a few seconds longer than the old
  straight line). The collision tests count frames inside something in the game, rather
  than asking many times a second (slow under load), and have longer limits.
- Results: 2,145 unit tests passed. Chromium browser tests, full run: 170 passed, 2
  passed on a retry (getting to know colleagues; work reflected in the office), 1 failed
  (the main accessibility check ran past its 4-minute limit twice under the full run;
  alone it passes in about a minute; its limit is now 6 minutes, not yet rerun in a full
  run), 3 skipped (the opt-in screenshots). The first full run also had the keyboard-only
  test and the collision tests failing, fixed as above and passed on their own. 5
  production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as
  before). Start screen 288 kB (unchanged).

---

## 2026-11-06 · World 1: solid things everywhere

### Cause

Each place had a hand-written list of solid boxes, separate from the furniture drawn,
so anything left off the list could be walked through (the manager's visitor chairs,
the chairs round tables, much of the home); walks to an activity went in a straight
line and stepped through furniture whenever blocked; and two things close together
could squeeze the character into the gap between them.

### Built

- **Solid from what is drawn** (`src/world/physics/solids.ts`): the player reads the
  scene it is in and every object standing between 25 cm and 1.2 m becomes a shape
  matching it (turned boxes, circles for round things, people as circles). The same in
  every place, and in any place added later. Read again every few seconds and on getting
  into or out of the car.
- **Collisions** (`controller.ts`): turned and round shapes; movement in steps of at
  most 10 cm; never into a gap narrower than the character; the car the same.
- **Finding the way** (`src/world/physics/nav.ts`): a grid and A*, used for walking to
  activities and stages; stepping into place only for the last half metre; trying again
  when blocked; stepping out of furniture afterwards.
- **The camera** keeps clear of tall things only.
- **Debug view** (F8, development only) and screenshots in `docs/screenshots/collision/`.

### Tests

- Unit tests: turned and round shapes, a thin wall at a run, being pushed out of a
  sofa, the camera's ray, reading a room (sofa, round table, person; not the rug, the
  lamp or traffic), walking at the sofa from all four sides, finding the way round a
  wall, a spot inside furniture, no way at all, a gap too narrow.
- New browser tests (`collision.spec.ts`): the real character walks and runs about,
  turning, in the office (reception and the manager's office), home, the street, the
  gym, the café, the shop, the park and the garage, and is never inside anything.
  The first run found the character squeezed between the manager's chair and the glass
  wall; fixed (no step into a gap too narrow).
- Results: 2,130 unit tests passed; the collision tests passed (2 of 2), and the
  browser tests for the places, the city, transport, life, the office, the workday and
  the world passed (18 of 18). The full regression runs with the next milestone.

---

## 2026-11-05 · Character 5: rain and controls

### Built

- **Rain** (`src/world/weather.ts`, `src/world/vfx/Rain.tsx`): on about one day in
  three, fixed by the day number. On the street and in the park, streaks of rain fall
  around the player, splash on the ground, the road looks wet and the sky turns grey;
  the rain and distant thunder are heard outdoors, and softly at home. Fewer drops on
  Low graphics, and the rain draws at a capped rate.
- **Weather setting**: Sound & graphics → Weather, _As forecast_ or _Always dry_.
- **Changing the keys**: Sound & graphics → Controls lists every control with its key;
  choose one and press the new key (Esc cancels), or reset them all. Changes apply at
  once, also in a 3D view already open.
- **Interaction screenshots** in `docs/screenshots/interactions/`
  (`npm run shots:interactions`): the office desk, cooking and eating, the shower,
  the bench press, the café, the shop, bed and rain in the street.

### Tests

- New browser tests: rain on a rainy day (heard on the street, and off with Always
  dry); changing a key and resetting the keys. Unit tests for the weather and keys.
- Fixed while testing: the panel now has more than one button whose name includes "Close", so the sound test picks the exact one.
- Results: 2,117 unit tests. Chromium browser tests, full run: 166 passed, 1 passed on a retry (the accessibility check, slow under load), 1 failed (the sound settings test, on the ambiguous Close button), 3 skipped (the opt-in screenshots). After the fix the sound tests were rerun on their own: 2 of 2 passed. 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before). Start screen 288 kB (unchanged).

---

## 2026-11-05 · Character 4: the office

### Built

- **The office is walkable** (`src/office/scene/officeLayout.ts`, `OfficeScene.tsx`)
  with the shared character and controls. Which area the player is in (reception, the
  desks, the manager's office, the break room) follows where they walk, and moving
  between areas takes office time, as the Places buttons always have.
- **Everything is done in person**: sitting down and logging in before the computer
  opens, talking to Nina, the senior colleague and Tom face to face, taking the
  visitor's chair with the manager, making a coffee (steam from the mug), lunch at the
  table, reading the whiteboard and notice board, leaving by the exit. The panel and
  the Places bar walk the character there; the game's result is the same as before,
  at the end. Without 3D, or until it is ready, they act at once.
- The office redraws only when what it shows changes (the walking settings are
  compared by contents).

### Fixed while testing

- The area markers' coordinates were read in the wrong order (the desk sent the player
  between the rows; reception into the break room).
- A walk sliding along a wall could fail to arrive: after a short while the character
  steps through to the spot.
- An area only counts once the player has been in it for a moment, so a boundary cannot
  flip between two areas (each costing office time).
- Computers drawing 3D in software draw the office about once a second: movement and
  activities now keep their real pace however slowly frames come (up to a second a
  frame, in small steps); a camera that has not settled snaps into place.

### Tests

- The browser tests' "sit at the computer" helper also turns on the development-only
  speed-up (a test that starts its own career had none).
- Checked in screenshots: walking from the break room to the desks; walking to the
  chair to use the computer.
- Results: 2,114 unit tests; 166 Chromium browser tests passed (1 skipped: the opt-in location screenshots), 1 of them on a retry: the full first week ran past its 2-minute limit the first time (it is the longest journey, and now walks to the desk and sits down each time); 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before). Start screen 288 kB (unchanged).

## 2026-11-05 · Character 3: the street, the bike and the car

### Built

- **The street uses the shared character** (`src/city/scene/CityScene.tsx`): walking
  with W A S D and the mouse camera, doors as activities ("Press E to go into …", or why
  not), the camera kept inside the street by its buildings.
- **Vehicles** (`src/world/PlayerRig.tsx`, `drive()` in `controller.ts`): F gets on or
  off the bike (quicker, seated and pedalling; the list button still works) and into
  or out of a leased car, which is driven with W and S (accelerate, brake, reverse) and
  A and D (steering that grows with speed), rolls to a stop, stops against walls, and
  stays where it is parked. The camera pulls back behind the car; exhaust (from the
  tailpipe, left behind in the air) and an engine sound.
- **Performance**: while something moves, 3D views now draw at most 30 frames a second
  (20 on low graphics); movement follows real time in small steps. Before this, several
  pages walking at once in software 3D could stall (found in testing).
- **Safety**: turning angles are wrapped with arithmetic and the camera's search is
  bounded, so a bad value can never loop.
- Door prompts now show from the doorstep (they had needed standing out in the street).

### Tests

- 2 new unit tests (driving: accelerating, steering only when moving, braking, rolling
  to a stop, stopping against a wall).
- Browser tests updated for the new door prompt; the footstep count allows for a busy
  computer starting slowly.
- Checked in screenshots: walking across the road to the café and going in; getting
  into the car, driving down the road, getting out beside it.
- Results: 2,114 unit tests; 166 Chromium browser tests passed (1 skipped: the opt-in location screenshots), none needing a retry; 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before). Start screen 288 kB (unchanged).

## 2026-11-05 · Character 2: the home

### Built

- **The flat is walkable** (`src/home/scene/HomeScene.tsx`) with the same character,
  controls and camera as the places, and every home action is performed
  (`src/home/scene/homeLayout.ts`, laid out from the home and the furniture owned):
  cooking with sizzle and steam then eating at the table, breakfast, coffee, a
  takeaway, washing at the basin and the shower (tap, water, splashes, steam, wet
  floor), dressing, reading, the TV (its screen lights up), calls and games on the sofa,
  studying, yoga, going for a run or out, and bed (sit, lie down, fall asleep). The
  front door opens to go out.
- **Camera**: rises to look down in tight spots without a ceiling; during an activity
  it chooses the first clear angle (it had been put behind the kitchen wall).
- **Until a 3D view is ready**, the lists act straight away (a list button had waited
  for a view still loading).
- Water drops made bigger (they could not be seen from above).

### Tests

- Browser tests: the start-up helper turns on the development-only speed-up for every
  test, kept across a reload; the time limit is now 120 s (journeys through a day play
  their activities). Hotspot tests confirm the activity started (or the view changed)
  and click again if not.
- Checked in slow-motion screenshots: cooking at the hob and eating, the shower with
  water, lying in bed.
- Results: 2,112 unit tests; 166 Chromium browser tests passed (1 skipped: the opt-in location screenshots); 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before). Start screen 288 kB (unchanged).

## 2026-11-05 · Character 1: third-person control and physical activities in the places

### Built

- **A character system shared by every place** (`src/world/`, described in
  [docs/CHARACTER.md](docs/CHARACTER.md)): camera-relative movement with running,
  crouching (C, not Ctrl: Ctrl+W closes the browser tab) and jumping; collisions with
  walls and furniture; a third-person camera turned by dragging, Q/R or mouse look, with
  zoom, kept clear of walls; 31 animations in code; an activity format (spot, anchor,
  stages, held things, sounds, effects, the game action at the end); a "Press E" prompt
  and a progress bar.
- **The person model extended** (`office/scene/people.tsx`): running, crouching,
  jumping, whole-body poses (lying, rolling), things held in each hand and hand markers.
  People who do not use these behave exactly as before.
- **The five places are walkable** and every action there is performed: the bench press
  with the bar following the hands, curls, squats, treadmill, bike, class and shower at
  Forge Fitness; ordering, collecting, sitting and eating or drinking at Kettle & Crumb;
  shopping the aisles with a basket and paying at Daily Basket; walking, running and
  sitting at Millpond Park; buying a bike or leasing the car at Cog & Kerb.
- **Effects**: one particle system (water, splashes, steam, sizzle, sweat, bubbles,
  breath, dust, exhaust), wet floors, effects that follow a hand.
- **Sounds**: clank, breath, water, pour, sip, bite, rustle, chair and beep, at their
  moments in each activity; footsteps by floor.
- **The rule**: the game action happens when the activity is finished; stopping it gives
  nothing. Without 3D the list still does things straight away.
- Fixed while testing: the character stuck at the edge of the bench (now steps into
  place when blocked); the cup's steam too bright; the view drew at full speed even when
  nothing moved (now only while something changes); a request remembered from one place
  started again in another (requests now belong to their place).

### Tests

- 13 new unit tests (`src/world/world.test.ts`): movement, collisions, jumping and
  crouching, walking to a spot, the camera and walls, every clip, the bench press,
  activity stages, sounds and effects.
- Browser tests updated: the café, shop, gym and garage tests wait for the activity to
  be played (a development-only speed-up keeps them quick); the hotspot tests check that
  clicking the espresso machine, the weights and the bench does the real thing.
- Screenshots: [docs/screenshots/interactions](docs/screenshots/interactions).
- Results: 2,112 unit tests; 166 Chromium browser tests passed, 3 of them on a retry (timing under load: the career-content loading test, the home front-door test and the footstep count, which counted 12 steps when the computer was slow to release the key); 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before). Start screen 288 kB (unchanged).

## 2026-11-05 · Locations: real environments for every place

### The problem

Going into a place hid the player but left the camera in the street, pointed at the
shop's sign: the café was a close-up of its name (see
[docs/screenshots/locations/before-cafe.png](docs/screenshots/locations/before-cafe.png)).
The flat was a small, sparse view.

### Built

- **Interiors** (`src/city/scene/InteriorScene.tsx`, `src/city/scene/interiors/`): the
  café, the food shop, the gym, the park and Cog & Kerb each have their own 3D
  environment (described in [docs/LOCATIONS.md](docs/LOCATIONS.md)), loaded only when
  the player goes in; the street is not drawn meanwhile. The camera stands inside and
  can be turned and zoomed a little. Staff, customers, members and visitors.
- **Hotspots**: objects with an amber ring do the place's real actions (the same list
  as the buttons, with the same checks and effects), with a label showing the cost and
  time or why not. The player is shown where they last did something.
- **Home**: fittings that come with every home (tall walls with windows, curtains,
  radiators and pictures; tiled kitchen and bathroom, carpeted bedroom; fridge and
  wall cupboards; toilet, basin and mirror; ceiling lights; the front door with coat
  hooks), a larger view, and the furniture owned and the front door as hotspots for
  what they are used for. The furniture shop and its effects are unchanged.
- **Graphics quality** (Auto, High, Low) in the renamed **Sound & graphics** panel,
  applied to every 3D view (office, home, street, places).
- **Sound**: new layers for the interiors (water and ducks in the park, trolleys in
  the shop, treadmills at the gym, an engine in Cog & Kerb's yard).
- Shared vehicle models (`src/city/scene/vehicles.tsx`) for the street and showroom.
- `npm run shots:locations`: screenshots of every location into
  `docs/screenshots/locations` (committed for this report).

### Reviewed

- Visited every location in screenshots: the five places, home's four rooms, the
  street, and the office's reception, desk, manager's office and break room. Fixed what
  the review found: people facing the wrong way, a dark band above the room (the
  camera was outside it), a dark gym and black mirror, closed fridges hiding their
  products, the checkout out of view, cars too close, the flat's front door blocking
  the view.
- The office already met the standard (reception, desks, manager's office, break room,
  colleagues) and was left as it is; the street likewise.

### Tests

- 3 new browser tests (`tests/e2e/interiors.spec.ts`): every place shows its own
  interior with its own sound, and back to the street; clicking the café's espresso
  machine buys a coffee, the gym's weights a workout, the park bench passes time; at
  home, the front door in 3D goes out. In development each hotspot reports where it is
  on screen, so the tests click the real object.
- 1 new unit test (`src/ui/graphics.test.ts`); the sound tests cover the new layers.
- Results: 2,099 unit tests; 166 Chromium browser tests passed; 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before). Start screen 288 kB (unchanged).

## 2026-11-05 · Sound

### Decisions

- **Every sound is generated** in the browser with Web Audio (tones, filtered noise,
  envelopes) rather than recorded. Nothing to licence or download, nothing copied, no
  cost, works offline with no change to the service worker, and the start-up is
  unaffected: the engine is a separate file of about 5 kB (compressed) loaded after
  the first click or key press, and only if some sound is on.
- **One manager** (`src/audio/manager.ts`): settings, per-kind levels, duplicate
  prevention (a minimum gap per sound), captions and scene claims. Views claim a
  scene while shown; the latest claim wins and hands back when released.
- **Game sounds from changes to the save** (`src/audio/useAudio.ts`), so the game rules
  have no sound in them: promotion, achievement, task passed or not, assessment, pay,
  side-business income, offers, declined offers, employers' answers, new email, phone
  messages, going overdrawn, doors in the neighbourhood. At most two at once.
- **No weather** (the game has none) and **no voice acting** (murmur and a greeting
  hum instead; no paid or AI voices).

### Built

- `src/audio/settings.ts`, `scenes.ts`, `manager.ts`, `engine.ts`, `useAudio.ts`,
  `AudioSettingsPanel.tsx` (with `SoundCaptions`).
- **Sound** in the top bar and ♪ on the taskbar: master, five kinds (music,
  surroundings, interface and game sounds, your character, people) with volume,
  switch and a test button, Mute all, Fewer sounds, Sound captions. Saved on this
  device (`worksim.audio.v1`).
- Scenes: reception, the office floor, the computer, the manager's office, the break
  room, the day's end, home, the interview, the street by area (homes, high street,
  park, business district), the café, shop, gym, Cog & Kerb and the park, each by
  time of day.
- Character: footsteps every half stride while walking in 3D (road or pavement,
  quicker when running), carpet steps between office areas, floorboards between rooms
  at home, doors, sitting down at and getting up from the computer, typing in text
  fields and the spreadsheet grid; windows opening and closing on the computer.
- A colleague's greeting when a conversation starts; buttons click softly.

### Tests

- 16 new unit tests (`src/audio/audio.test.ts`).
- 2 new browser tests (`tests/e2e/sound.spec.ts`), including a measured, non-silent
  output, scenes following the player, footsteps in time with walking, settings kept
  after a reload, captions and silence when muted.
- Results: 2,098 unit tests; 163 Chromium browser tests passed (2 spreadsheet tests needed a retry: a screenshot run started at the same time deleted their trace files, not a fault in the app); 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before). Start screen 288 kB (was 283: the small sound manager loads with the app; the engine does not).

## 2026-11-05 · L7: WorkSim AI in daily life

### Built

- **WorkSim AI on the laptop** at home (`src/home/LifeAssistant.tsx`), in the evening
  and now also the morning: **Check my budget**, **Plan my evening** (or morning),
  **What should I learn next?**, and a question box, with **Show what WorkSim AI is
  given** and the source of every answer.
- **Context from the save** (`src/game/lifeAdvice.ts`): the week's statement by
  category with what is due and savings tips; a plan from the lowest needs, the fridge,
  any interview, and bedtime for 8 hours (or, in the morning, what is left and when to
  leave for the bus); learning advice from the weakest skills, promotion requirements
  and the first job-advert gap. Summaries for models carry no name.
- **Engines**: the existing service. The built-in guide (the default) answers the
  three new intents from the save and says it is not an AI model; typed questions are
  recognised only when the home's context is there, so questions at work are
  unaffected. Models, if the player turned one on, get a task rule for each. No AI
  call happens unless the player asks.
- **Fixed** a bug from AI.4: the built-in guide's "speaker notes" pattern contained
  backspace characters where `\b` was meant, so typed requests for speaker notes were
  never recognised (the menu action still worked). The same slip briefly affected the
  new patterns while writing this stage; there are none left in the project.
- No save changes.

### Tests

- 8 new unit tests (`src/game/lifeAdvice.test.ts`): statement categories, budget
  advice (overdraft, taxis), the evening and morning plans, learning advice, what a
  model is given (no name, small), the built-in answers and their label, and intents
  only with the home's context. 1 more in `src/ai/ai.test.ts` for typed speaker-notes
  requests.
- 1 new browser test (`tests/e2e/careerLife.spec.ts`): the three quick questions and a
  typed one answered by the built-in guide, what is shared (no name), and no request
  leaving the computer.
- Results: 2,082 unit tests; 161 Chromium browser tests passed; 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before). Start screen 283 kB.

## 2026-11-05 · L6: career life

### Built

- **The laptop** at home in the evening (`src/home/CareerPanel.tsx`), with three tabs.
- **Jobs**: four fictional employers (Larkspur Housing Trust, Harbour Lane Logistics,
  Quill & Ledger Partners, Brightwater District Council) advertise a role in the
  player's own career. Applications are screened on the real record the next evening,
  with reasons; interviews are three competency questions with feedback on every
  answer; offers stand for a week and can be turned down or mentioned in a pay talk.
  The player stays at their company, so careers and progression are unchanged.
- **Pay**: asking the manager for a rise every four weeks. The answer, the next
  evening, comes from the latest review, reputation and any outside offer; over-asking
  gets the supported amount or nothing, and a big ask with nothing behind it costs
  reputation. Friday pay now includes rises.
- **Side business**: evening tutoring, handmade cards and prints, or bike tune-ups
  (needs a bike): a setup cost, pay each evening that grows with regular customers,
  declared to the employer, and stress for more than three evenings a week.
- **Save data**: `life.career` (applications, rises, the pending pay talk, the
  business). Additive. Everything is deterministic: no AI and no randomness.

### Tests

- 9 new unit tests (`src/game/careerLife.test.ts`): screening with reasons, interviews
  passed and failed, offers lapsing, pay decisions from the record, the manager's
  answer and Friday pay with the rise, an outside offer as leverage, and the side
  business (setup, pay, regulars, closing, overdoing it).
- 1 new browser test (`tests/e2e/careerLife.spec.ts`): applying, starting and working
  on a side business, asking for a rise, and both answers the next evening.
- Fixed a timing race in the cross-browser backup test (`tests/browsers/journey.spec.ts`): restoring ends with a page reload, and the test went on as soon as the safety download started, so in Firefox it sometimes clicked on the page just before it reloaded. It now waits for the reload too. This was the Firefox timeout recorded in L5.
- Results: 2,073 unit tests; 160 Chromium browser tests passed; 5 production-build tests passed; Firefox, WebKit and Edge 8 passed, 1 skipped (as before), after the fix above (before it, the Firefox backup test failed). Start screen 283 kB.

## 2026-11-05 · L5: getting around

### Built

- **Five ways to work** (`src/content/life.ts`): walk, bike (new: free, 20 minutes, fun
  and less stress, a little warm on arrival), bus, car (new: 15 minutes, £4.50 fuel
  and parking each way, a little stress from the traffic) and taxi. The choice, with
  arrival times and reasons, is one component (`src/home/CommuteChoices.tsx`) at the
  front door and at the end of the street.
- **Cog & Kerb** (bikes and car hire, 8:00–20:00) on the high street: buy a bike
  (£240, sold back for £96) or lease a small car (£250 for the first week, then £60
  every Monday until handed back). Rules in `src/game/transport.ts`; the lease is
  charged with the rent.
- **The neighbourhood**: **Get on your bike** halves walking times between places and
  speeds up the player in 3D (seated on a bike). The bike waits by the door, a leased
  car is parked outside, and a bus and three cars drive the street in their lanes,
  stopping for the player.
- **Save data**: `life.vehicles` (bike, car, the last week paid) and `life.city.riding`;
  two new ways to work and a new place in the saved lists. All additive.

### Tests

- 4 new unit tests (`src/game/transport.test.ts`): bike and car need owning; buying,
  riding (half the time), cycling to work (free, warmer) and selling the bike; the
  car lease with its Monday charge, fuel and parking, and handing it back; opening
  hours. The city tests now include Cog & Kerb.
- 1 new browser test (`tests/e2e/transport.spec.ts`): buying a bike, riding home,
  the car offered but not owned, and cycling to work from the street.
- Results: 2,064 unit tests; 159 Chromium browser tests passed; 5 production-build
  tests; Firefox, WebKit and Edge 7 passed, 1 skipped, 1 failed in the full run: the
  Firefox backup-and-restore journey (untouched by this stage) ran past its 3-minute
  limit with two browsers at once, and passed when run again on its own (1.1 minutes).
  Start screen 283 kB.

## 2026-11-05 · L4: the neighbourhood

### Built

- **The neighbourhood** (`src/content/city.ts`): one street with the player's
  building, Kettle & Crumb (café), Daily Basket (food shop), Forge Fitness (gym),
  Millpond Park and the road to the office, each with a door on the street, opening
  hours and activities (eleven in all: breakfast, coffee, dinner, groceries, a ready
  meal, a workout, a class, a gym shower, a walk, a run, a bench).
- **Rules** (`src/game/city.ts`, pure): stepping outside, walking between places (time
  along the street, needs falling on the way), going in (with the reason when a place is
  closed or it is too late), and the walk to work in the morning (the walk commute).
  Home and place activities share one set of rules (`LifeAction`), which now also check
  where the player is; bed is only at home.
- **The street in 3D** (`src/city/scene/CityScene.tsx`): buildings, shop fronts with
  awnings, a park with a pond, trees and benches, street lamps that light up after
  dark, office towers at the end, and five people walking about. The player walks in
  third person (Up and Down walk, Left and Right turn, Shift runs, Enter goes in;
  doors can be clicked), with the camera behind them and kept above the street. Place
  names are drawn in code (no fonts or page elements in 3D). Movement runs on its own
  steady timer; the scene draws 12 times a second when still (once a second on
  software 3D) and 30 while walking.
- **The city screen** (`src/city/CityView.tsx`): the 3D street, a prompt at each
  door, the list of places (walk time, opening hours, why not), the activities inside,
  the phone, needs, money and the evening's log. Needs and money panels are now shared
  with home (`src/home/LifePanels.tsx`). The front door at home has **Go out into the
  neighbourhood**.
- **Save data**: `life.city` (where the player is), additive.
- **Fixed while testing**: the first camera followed from the south and ended up inside
  the buildings on that side; it now follows behind the player and stays above the
  street. Labels drawn as page elements in 3D logged console errors when the street was
  left; they are now drawn in code.

### Tests

- 8 new unit tests (`src/game/city.test.ts`): the places, walking times, an evening at
  the café and the shop and home again, opening hours and late nights, the morning
  routine out and the walk to work, older saves, and the street helpers (doors, bounds).
- 3 new browser tests (`tests/e2e/city.spec.ts`): an evening out (with the
  accessibility audit), walking the street in 3D with the keyboard and going in at a
  door, and a morning at the gym and the café before walking to work.
- The city tests also passed in Firefox and WebKit (run once against the development
  server); they fail on any console error except one that only appears in development
  mode (React mounting the office twice).
- Results: 2,060 unit tests; 158 Chromium browser tests passed; 5 production-build
  tests; Firefox, WebKit and Edge 8 passed, 1 skipped. Start screen 283 kB (the city
  loads only when the player goes out).

## 2026-11-04 · L3: friends, the phone and invitations

### Built

- **Four friends outside work** (`src/content/friends.ts`), each with how the player
  knows them and what they like doing, and six kinds of plan (dinner at their place,
  the cinema, a run, a quiz night, a drink, an online game), each with a time, a
  length, a cost and what it does for needs, energy and stress.
- **Rules** (`src/game/social.ts`, deterministic):
  - _Invitations_: on two evenings in three, when the player gets home, the friend they
    have been in touch with least invites them to something they like (an online game
    only if they own a console).
  - _Answers_: accept (a promise), or decline politely (a small cost). Accepted plans
    are joined from the front door, from their start time until half an hour after;
    going raises the friendship and needs, and costs the time and money.
  - _Overnight_: an ignored invitation is missed (friendship −4); a broken promise costs
    more (−8, and the friend asks if everything is OK). Friendships fade a little each
    night after three days without contact.
  - _Getting in touch_: a message (5 minutes, with a reply), a call (30 minutes), or
    dinner at home (2 hours, two meals from the fridge, needs a table), each until a
    sensible hour.
  - Friendship levels: drifting apart, acquaintance, friend, good friend, close friend.
- **The phone** (`src/home/Phone.tsx`): friends with their friendship level and a
  meter, unread counts, a conversation with each, invitations with Accept and Decline
  and what became of them, and the ways to get in touch (with the reason when one is
  not possible). _Your home_ shows new messages; tonight's plans appear at the front
  door with their time and cost.
- **Shared steps of life at home** moved to `src/game/lifeTime.ts` (needs over time,
  money, the evening log, energy and stress), used by the home, furniture and social
  rules.
- **Save data**: `life.social` (friendships and the last 40 messages), additive.
- **Fixed while testing**: the player's own message bubbles had too little contrast
  (found by the automated accessibility check).

### Tests

- 7 new unit tests (`src/game/social.test.ts`): invitations on two evenings in three,
  accepting and going, declining and broken promises, ignored invitations, messages,
  calls and dinner at home, limits, and fading friendships and their names.
- Results: 2,052 unit tests; 155 Chromium browser tests passed (the office arrival test
  needed a retry: its walks between places now allow 15 seconds, like the other office
  tests); 5 production-build tests; Firefox, WebKit and Edge 8 passed, 1 skipped. Start
  screen 283 kB.
- `life.spec.ts`: a new test accepts Leo's invitation, checks the phone with the
  automated accessibility rules, calls Dan, and goes out from the front door.

---

## 2026-11-04 · L2: the home in 3D, furniture and moving

### Built

- **Homes and furniture** (`src/content/home.ts`): three homes (a studio, a
  one-bedroom flat 10 minutes nearer work, a terraced house 18 minutes nearer), each
  with a rent, a move-in cost, a size, rooms and a place for each kind of furniture;
  seventeen pieces in fifteen slots, each with a price, colours and what it does.
- **Rules** (`src/game/home.ts`): buying (the old piece in that place is sold
  second-hand at 40%), selling, recolouring, and moving (the furniture comes along; the
  new rent applies from the next Monday's rent). Furniture now matters in life
  (`life.ts`):
  - four new activities that need furniture: a proper coffee (energy), studying (skill
    XP to the career skill the player has least of), video games and yoga;
  - activities improved by furniture (series with a sofa and television, meals with a
    fitted kitchen, reading with a bookshelf);
  - a good bed gives more energy in the morning;
  - homely pieces (plants, a lamp, a rug, a sofa) slow how fast fun falls in the
    evening;
  - the rent and every commute's length come from the home.
- **The home in 3D** (`src/home/scene/`): the flat seen from above with low walls,
  every piece of furniture in the colour chosen, the player in the room they are in
  (in work clothes once dressed), evening or morning light, and the camera gliding
  between rooms. Built like the office (simple shapes; software 3D draws once a second
  at a lower resolution; reduced motion keeps it still), loaded only at home, and
  hidden without WebGL: the panels work on their own.
- **Furniture shop and Move home** (`src/home/HomeShop.tsx`), from _Your home_: prices,
  what each piece does, colours, what the old piece sells for, and why something cannot
  be bought or moved to (the money needed, already owned).
- **Save data**: `life.home` (the home and the furniture by slot), additive with the
  starting studio and its basics as defaults.
- **Fixed**: the social need could show a fraction after a working day.

### Tests

- 7 new unit tests (`src/game/home.test.ts`): the starting home, furniture enabling
  activities (and saying what is missing), better activities, studying for skill XP,
  trading in, selling and recolouring, limits, and moving (cost, rent, a shorter
  commute, furniture kept).
- Results: 2,045 unit tests; 154 Chromium browser tests passed (2 needed a retry under
  load: the office arrival test, and the Sheets sorting test, which types a whole table
  and now allows 2 minutes); 5 production-build tests; Firefox, WebKit and Edge 8
  passed, 1 skipped. Start screen 283 kB; JavaScript memory unchanged (17 MB after
  using the apps).
- `life.spec.ts`: a new test buys a games console in a chosen colour, plays, moves to
  the flat and finds the home and the furniture kept after a reload; the 3D home is
  checked to be drawn.

---

## 2026-11-04 · L1: needs, home routines, sleep, the commute and money

The first step from a working day to a whole life. The office day is unchanged: life
starts when it ends and hands back when the player arrives at work.

### Built

- **Life data** in the working state (`work.life`, additive with defaults: saves from
  before simply start it on their next evening; tested): the phase (work, evening,
  morning), a home clock, needs, money, meals in the fridge, the morning routine,
  bedtime, the last commute, a statement of the last 60 payments, and the evening's
  log.
- **Rules** (`src/game/life.ts`, content in `src/content/life.ts`):
  - _Going home_: the working day lowers needs (lunch at work feeds you), the fare is
    paid, and on Fridays the week's pay arrives (by career level, once a week).
  - _Home actions_: eleven, each in a room, taking time, perhaps costing money or
    food, changing needs, energy and stress, with clear reasons when they cannot be
    done (the wrong time of day, too late, cannot afford it, an empty fridge).
  - _Sleep_: the alarm rings at 7:00; hours of sleep come from the bedtime. A weekend
    restores social and fun. Rent is taken on Monday mornings, once a week.
  - _Leaving for work_: walk, bus or taxi, each with a time, a cost and the arrival
    time shown; the next working day starts when the player walks in. Late arrival
    costs reputation; too little sleep, no breakfast, no shower, yesterday's clothes,
    neglected friends and fun, or an overdrawn account each show at work (energy,
    stress, engagement, reputation) and in the day log.
- **Home** (`src/home/HomeView.tsx`): the evening and the morning in the flat, room by
  room, with the needs, money, fridge, statement and the evening's log. The end-of-day
  summary now leads home.
- Help and handbook: _Life outside work_.

### Tests

- 8 new unit tests (`src/game/life.test.ts`): older saves, going home, Friday pay
  (once), actions and their limits, a good evening and morning (no problems at work), a
  late night and a rushed morning (late, short of sleep, hungry, yesterday's clothes),
  and Monday rent (once).
- Results: 2,038 unit tests; 153 Chromium browser tests, all passing first time; 5
  production-build tests; Firefox, WebKit and Edge 8 passed, 1 skipped. Start screen
  281 kB.
- New `life.spec.ts`: Friday pay, an evening out, an accessibility check of the home
  screen, home kept after a reload, Monday rent and a rushed morning showing at work.
  The working-day test now goes home, cooks, sleeps, gets ready and takes the bus.

---

## 2026-11-04 · AI.7: quality assurance

All checks were run on the final code of the milestone:

- **Regression**: 2,030 unit tests; 152 Chromium browser tests, all passing first
  time (26 minutes); 5 production-build tests, including a whole session with no
  console errors and no failed requests, offline start, updates and repair; Firefox,
  WebKit and Edge: 8 passed, 1 skipped (as before).
- **Saves**: older saves load with an empty AI record (unit test); the window and
  settings data stay in LocalStorage, outside game data.
- **AI engines**: the built-in guide, the local engine and the bridge are tested with
  simulated providers (unit and browser tests); no test calls a real provider. The
  bridge was also started for real: it answers WorkSim's origin, refuses others (403),
  and explains that no key is set up, without logging what was asked.
- **Offline**: the production-build offline tests pass; WorkSim AI's built-in guide
  works offline, and a model that cannot be reached falls back to it with the reason.
- **Performance**: start screen 281 kB; JavaScript memory 5 MB at the start screen and
  17 MB in the office (unchanged); the WorkSim AI app loads only when opened.
- **Security**: `npm audit` reports 0 vulnerabilities; no new dependencies were added
  in this milestone.
- **Accessibility**: the automated WCAG checks pass on WorkSim AI and its settings.

### Known limitations

- The built-in guide answers specific requests only; open questions need a model.
  It never pretends otherwise.
- Prompt scoring and sensitive-data detection are rule-based: they teach the habits
  and can miss unusual cases.
- Conversations are not saved (privacy by default); AI competencies are.
- Real cloud providers have not been called in testing (no paid keys were used); the
  request formats follow each provider's documented API.

---

## 2026-11-04 · AI.5–AI.6: AI at work, and AI competencies

### Built

- **The manager's AI policy** (`src/game/aiUse.ts`): the first time the player asks
  WorkSim AI something, their manager emails the company's expectations (responsible
  for what you send; check every figure; no personal or confidential data in AI tools;
  only the approved tool; say when AI helped).
- **Three AI cases for every career** (`src/content/cases/ai/`), from the manager on
  days 2, 3 and 4, each after the last, graded by the existing case engine:
  - _Check an AI summary before it goes to the board_: spot a wrong claim and an
    invented figure against the data, check a figure yourself, decide what to do
    before sharing AI-assisted work, and explain it.
  - _What can go into an AI tool?_: apply the company AI policy to five files, choose
    how to get AI help with a customer complaint safely (anonymised, approved tool),
    and advise a colleague.
  - _Write a prompt that works_: choose the best prompt, say what a vague one lacks
    (context, format, audience), and write an example prompt.
    The manager replies by result, and outcomes change trust, reputation and risk like
    other cases. A new skill every career shares, **Using AI at work**, gains from them.
- **Using AI well, while working**: in Learning mode, a **prompt tip** under a vague
  question (task, context, constraints, detail); a pause before a question that seems
  to contain personal or secret data (an email address, phone number, card or bank
  details, a password, a National Insurance number), with _Edit my question_ or _Send
  anyway_; _I have checked this answer_ under an AI model's answer.
- **AI competencies** in the Career app (_Using AI at work_): Prompting, Checking AI
  answers, Protecting data and Reviewing AI changes, each Not shown yet, Developing,
  Competent or Strong, with the evidence behind it. They come from the quality of
  prompts (the player's own words only; menu questions do not count), the share of
  AI answers checked, warnings heeded, and proposed changes reviewed. Asking more
  questions raises none of them.
- **Save format**: a new `ai` section in the career record, with defaults, so saves
  from before it load unchanged (tested); no format change.

### Tests

- 8 new unit tests (`src/game/aiUse.test.ts`): prompt scoring, sensitive data
  detection (and no false alarms on ordinary questions), the empty record for older
  saves, the policy sent once, only typed prompts scored, and competencies from
  evidence rather than use. The content tests now also check the 18 AI cases (each
  model answer passes its own grading).
- Results: 2,030 unit tests; 152 Chromium browser tests, all passing first time; 5
  production-build tests; Firefox, WebKit and Edge 8 passed, 1 skipped. Start screen
  281 kB; JavaScript memory 17 MB in the office (unchanged).
- New `ai-skills.spec.ts` (2 tests): a prompt tip, the personal-data pause and
  editing the question, the policy email, the AI skills panel; and an AI case solved
  and graded at 100%.

---

## 2026-11-04 · AI.4: WorkSim AI inside the apps

### Built

- **A WorkSim AI menu in each app's toolbar** (`src/apps/ai/AskAiMenu.tsx`), with what
  it can do there; choosing an item opens WorkSim AI with the question asked. Hidden
  where WorkSim AI is not available (files shown read-only in the Portfolio).
  - Mail: summarise, what it asks for, help me reply; in the reply: review my draft,
    improve the wording.
  - Tasks: how to approach the task, which step first, prompting tips.
  - Sheets: explain the formula, why it is not working, suggest a formula, analyse the
    selected data.
  - Docs: review, summarise, suggest a report structure, rewrite the selection.
  - Slides: review the presentation, outline, speaker notes, summary.
  - Code: explain the code, debug the failing tests, which tests to write.
  - Help Desk: summarise the ticket, suggest a resolution, help with the reply.
- **Context from each app**, read only when WorkSim AI needs it (so typing never
  redraws the desktop): the active cell, its error and the numbers next to it, and the
  table around it (up to 30 rows by 8 columns); the selected text and the document;
  the slides' text; the open code file and the last test run; the open ticket with the
  knowledge base articles that share its key words.
- **Proposed changes, reviewed before they are applied**: a formula for a cell, or
  text to replace the selection (or the email draft). WorkSim AI shows the change in
  full with Apply and Dismiss; the app applies it only then, as an ordinary edit that
  can be undone. Models are told exactly what such an action needs back.
- **The built-in guide** now also analyses data (totals, averages, largest and smallest
  with their labels, values more than two standard deviations away, the trend between
  the halves, and a chart recommendation), suggests a SUM formula (a hint only in
  Learning mode), outlines report structures and checks for missing sections, reviews
  slides (titles, crowding, an ending), helps with speaker notes, explains code and
  the first failing test, and matches tickets to knowledge base articles. For
  rewriting it explains how, as it is not an AI model.

### Fixed while testing

- A question sent from an app was asked twice when WorkSim AI opened for it (React
  runs effects twice in development). Each question is now asked once.
- **The office was too heavy on computers without a graphics card.** A frame of the
  upgraded office takes about a quarter of a second in software 3D, and it was drawn
  three times a second, so the page had little time left for clicks (browser tests in
  the office took minutes, or timed out). Software 3D now draws the gentle movement
  once a second (anything that changes is still drawn at once) at a slightly lower
  resolution, and shadows, reflections and contact shadows are only built after the
  graphics have been checked, never on a computer that draws in software.
- **Browsers that hide the graphics hardware.** Firefox and Safari report generic
  graphics names for privacy, so software 3D was not recognised there and the
  full-quality office was built (Firefox tests timed out). The office now also watches
  its first frames: below about seven frames a second it switches to the simpler
  office (ignoring time when the tab is hidden).
- The cross-browser tests now use 127.0.0.1: Firefox sometimes could not reach
  "localhost" when the test server listened on IPv6 only.

### Tests

- 11 new unit tests (`src/ai/apps.test.ts`): the Sheets context and analysis, formula
  suggestions by mode, proposals from model answers, per-action instructions, ticket
  matching, slide reviews and code help.
- Results: 1,968 unit tests; 150 Chromium browser tests, all passing (in 27 minutes,
  down from 40); 5 production-build tests (passed 10 of 10 on a repeat run; one
  intermittent failure in an earlier run); Firefox, WebKit and Edge 8 passed, 1 skipped.
  Start screen 281 kB.
- New `ai-apps.spec.ts` (3 tests): Mail and Tasks; Sheets (an error explained, a
  formula suggested as a hint in Learning mode, proposed in Professional mode,
  applied only on Apply, and data analysed); Docs (a simulated model's rewrite of the
  selection applied only after review). Code and Help Desk are covered by unit tests.

---

## 2026-11-04 · AI.3: the WorkSim AI desktop app

### Built

- **WorkSim AI** (`src/apps/ai/`), a desktop app like the others: desktop icon,
  taskbar, Start (with a tile), search, its own window, kept across reloads. Loaded
  only when opened.
- **Conversation** with suggestions that fit what is open, a composer (Enter to send,
  Stop while waiting), answers with lists, bold, code and formula blocks (rendered as
  elements, never as HTML), and an activity indicator.
- **Every answer is labelled**: "Built-in guide: WorkSim's own rules, not an AI
  model", or "Written by an AI model (provider · model). Check facts and figures before
  you use it", with what was shared. When a model cannot answer, the reason is shown
  and the built-in guide answers.
- **Context panel**: what WorkSim AI knows for the next question, built from the
  window the player was last working in (`src/ai/workContext.ts`): the email open in
  Mail, the task open in Tasks (or the current or next task), the case open in Cases,
  the app, and the player's role. Each item can be unticked; the player's name is
  shown as removed, exactly as it is sent.
- **Modes**: Learning, Professional and Expert, with their meaning shown.
- **Settings**: who answers (built-in guide, a model on this computer, or a cloud model
  through the bridge), with what each costs; a consent box naming exactly where
  questions go (asked again whenever the destination changes); local model and bridge
  details; Check the connection; the daily limit and today's use. "Show what will be
  sent" previews the exact context.
- **Context hub** (`src/apps/ai/hub.ts`) for the apps to offer context and send
  questions (used in AI.4).
- Help and docs: an in-app help topic, a handbook section (including setting up Ollama
  and the bridge), and the privacy page now describes the one exception to "nothing
  is sent anywhere".

### Fixed while testing

- The context panel showed the email with the player's name (it was removed before
  sending, but the panel should show exactly what is shared).
- The task was missing from the context until it had been started.
- Requests introduced by "Could you please:" were run together with the next sentence.

### Tests

- New `ai.spec.ts` (3 tests): answers from the open email and task in Learning and
  Professional modes, unticking context; nothing sent without consent, then the
  (simulated) bridge with labelled answers, the preview, and the fallback when the
  bridge stops; opening from the desktop and search, and settings kept after reload.
  The main accessibility test now also checks WorkSim AI and its settings.
- Results: 1,957 unit tests; 147 Chromium browser tests passed, with
  `colleagues.spec.ts` failing under the full suite's load and passing alone (its
  walks around the office now allow 15 seconds, like the other office tests); 5
  production-build tests (no console errors, no failed requests); Firefox, WebKit and
  Edge 8 passed, 1 skipped. Start screen 281 kB.

---

## 2026-11-04 · AI.1–AI.2: audit and AI infrastructure

### Audit findings

- WorkSim is local-first with **no server and no network requests**, and the privacy
  page promises that nothing is sent anywhere. Real AI therefore has to be opt-in,
  off by default, limited to the minimum context, and visible before it is sent.
- The window manager, taskbar, Start, search and desktop icons all come from one
  list of apps, so a new app fits in without changes to the shell.
- Saves grow by adding fields with defaults; no format change is needed for AI data.
- Every app already knows what the player is looking at (the selected email, cells,
  document, ticket, code file, and the task's brief, steps and hints), which is the
  context the assistant needs.
- Baseline (this morning, on the code of upgrade C): 1,929 unit tests, 144 Chromium,
  5 production-build and 8 cross-browser tests (1 skipped).

### Built (`src/ai/`, `scripts/ai-bridge/`)

- **Three engines behind one service.** The **built-in guide** (default; offline,
  free, deterministic, always labelled "not an AI model") explains formulas with the
  spreadsheet's own parser and function descriptions, explains cell errors,
  summarises text, lists action items with their timing, outlines replies, plans a
  task from its own steps and hints (one step at a time in Learning mode), reviews
  writing style and teaches prompting. A **local model** (any OpenAI-compatible
  server on this computer, such as Ollama) and the **AI bridge** (cloud providers)
  are used only with the player's consent.
- **The AI bridge** (`npm run ai-bridge`): a small server on the player's own
  computer that holds the API keys (from `.env.local`, which git ignores) and
  passes requests to Anthropic, OpenAI or Google. It listens only on this computer,
  answers only pages served from this computer, validates and caps request size,
  has a daily limit and a timeout, explains failures in plain words, and never logs
  what is asked or answered. Only Anthropic has a default model
  (`claude-haiku-5-5`); OpenAI and Google need their model named, so the bridge
  never guesses.
- **Context**: each request carries only the items the app offers, each capped
  (4,000 characters, 9,000 in total), with the player's name replaced by "the
  employee". Structured data for the built-in guide never leaves the device.
- **Modes**: Learning, Professional and Expert change the instructions models get
  (and the built-in guide's answers), not how much work is done for the player.
- **Service**: consent, a daily request limit per device (default 40), a 45-second
  time limit, and a fallback to the built-in guide that says why.

### Tests

- 28 new unit tests: context limits and name removal, settings validation (only
  addresses on this computer), consent, usage counting, the built-in guide's answers
  in each mode, the local engine, timeouts, limits, fallback, and the bridge (origin
  checks, each provider's request format, errors, the daily limit, keys never in a
  reply). No test calls a real AI provider. 1,957 unit tests in total; the
  production build passes. The app does not use the AI code yet, so browser tests
  are run with the next stage.

---

## 2026-11-04 · Upgrade C: a more realistic 3D office

### Built

- **Desks** (`src/office/scene/furniture.tsx`): wood-grain tops on a steel frame with
  a modesty panel, a three-drawer pedestal with handles, a slim monitor on a neck and
  base showing a work screen (brighter when there is new mail), a keyboard with keys,
  a mouse on a mat, papers, a notebook and a mug with a handle.
- **Chairs**: a five-star base with casters, a chrome gas lift, a cushioned seat, a
  reclined back on its support, and armrests.
- **Floors**: wooden planks, and carpet tiles in the open-plan area.
- **Lighting**: a warm sun that casts real shadows, a soft sky light, and an
  environment (light panels and windows, built in the scene) for reflections in
  screens, steel, chrome and the floor; contact shadows stay for the soft darkening
  under furniture.

### Key decisions

- **Detailed but cheap to draw.** Each desk and chair is built once from many shapes
  merged into a few meshes, one per material, shared by every desk and chair. A desk
  is ten meshes and a chair three, about as many as the old box furniture.
- **Textures drawn in code** (wood, planks, carpet, keys, the screen): nothing to
  download, and the office still works offline.
- **Shadows are redrawn once a second**, not every frame.
- **Computers that draw 3D in software** keep the plain lights: no shadows and no
  reflections.

### Performance

- On an Intel HD Graphics 5500 (an ordinary laptop graphics chip from 2015): a steady
  60 frames per second at every place in the office (95% of frames under 17 ms).
- JavaScript memory in the office: 17 MB, unchanged. Start screen: 280 kB.

### Tests

- All suites pass: 1,929 unit tests; 144 Chromium browser tests; 5 production-build
  tests (no console errors and no failed requests: nothing is downloaded); Firefox,
  WebKit and Edge (8, 1 skipped as before). A case test now accepts a minute or two
  passing on the office clock while it works.

---

## 2026-11-04 · Upgrade B: more realistic 3D people

### Built

- **A jointed body** (`src/office/scene/people.tsx`): hips, knees, shoulders, elbows,
  spine and neck, with realistic proportions, hands with thumbs and shoes with soles.
- **Faces**: eyes (whites and irises) that blink, brows, nose, ears, and a mouth
  that rests in a smile or a neutral line and moves while talking. Optional glasses
  and beards.
- **Hair**: nine styles (short, cropped, side parting, long, bob, bun, ponytail,
  curly, bald) in seven colours. Eight skin tones; slim, average and broad builds;
  heights from about 0.96 to 1.05.
- **Clothes**: shirts with collars, blouses, polos with buttons, sweaters, blazers and
  cardigans over a shirt, ties; long, short or rolled sleeves; trousers and shoes.
  Every colleague now has their own look.
- **Movement**: breathing and weight shift; typing with both hands on the keyboard;
  looking at the screen, around the room and, now and then, at the player when close;
  a colleague who walks a route behind the desks, stops, looks around and turns.
  The person the player talks to (Nina, the manager, the senior colleague, Tom) faces
  the player, talks and gestures. Every change of pose is smoothed.
- **Fixed**: the manager's office description showed "{managerFull}" instead of the
  name, and assumed the manager's pronoun.

### Key decisions

- **Still no downloaded models.** People are built from simple shapes; all of them
  share one set of geometries and a small cache of materials.
- **Reduced motion**: people hold a natural pose and nothing moves.
- **Software 3D** (computers without a graphics card): people are drawn without
  their smallest details (ears, brows, nose, collars, buttons, thumbs). Without
  this, browser tests that draw the office in software ran several times slower.
- Memory in the office is unchanged (17 MB of JavaScript memory).

---

## 2026-11-04 · Upgrade A: the work computer as a Windows 10-style desktop

The computer is no longer a browser-style page with a dock: it is a desktop
in the style of Windows 10, around the same apps. This is a change of shell only:
saves, progression, grading and the apps themselves are unchanged.

### Built

- **Desktop** (`src/desktop/windows/DesktopSurface.tsx`): original blue wallpaper
  art (three backgrounds, drawn as SVG, no download), shortcut icons down the left
  (apps and tools) and right (Career, Readiness, Portfolio, handbook, Storage).
  Double-click or Enter opens; icons can be dragged to any free grid cell and keep
  their place. Recycle Bin opens a window of its own.
- **Right-click menu**: View (small, medium, large icons), Sort by (name, default
  arrangement), Refresh, New (a blank document, a presentation or the practice
  workbook, depending on the career's apps), Display settings and Personalize, which
  open a Settings window (background, icon size, reset icons).
- **Windows** (`AppWindowFrame.tsx`, `windowManager.ts`): every app in its own window
  with a title bar, minimise, maximise/restore (or double-click the title bar) and
  close, drag to move, resize from the edges, focus and stacking. One window per
  app (each professional tool is its own app); several open at once. Small screens
  open windows maximised. A window coming to the front takes the keyboard focus.
- **Taskbar** (`Taskbar.tsx`): Start (WorkSim's own mark), "Type here to search" with
  results, app buttons with the open-app line and red counts (locked tools say when
  they unlock), Leave desk, and the tray: the employee and XP, network (online or
  offline), volume, energy as a battery, notifications, Help, Storage & backup, the
  office clock (opens "Your day" upwards) and Show desktop.
- **Start menu** (`StartMenu.tsx`): the employee, settings, storage and leave desk on
  the rail; every app A–Z; tiles for the main apps with their counts.
- **Notifications** pop up in the corner for 15 seconds, then wait in the
  notification centre (the bell) until dismissed or no longer relevant.
- **Persistence**: window layout and desktop settings per save in LocalStorage,
  validated on reading (damaged values are ignored). Not game data, not in backups.
  Leaving the desk and coming back, or reloading, restores the windows.

### Key decisions

- **Windows 10 look, WorkSim's own identity.** The layout, colours and behaviour
  follow Windows 10; the wallpaper, Start mark and app names are WorkSim's own, so
  nothing copies Microsoft's artwork or trademarks.
- **No rebuild.** `Desktop.tsx` routes the same `View` as before: `setView` from any
  app now opens or updates that app's window instead of replacing the screen. The
  per-app rendering moved unchanged into `renderApp(view)`.
- **Saving with several files open.** Mail sending, case submission and assessment
  submission first call the new `saveAll` service (the flush used before backups),
  so a file still open in another window is saved before it is sent or marked.
  Closing a window saves as leaving an app did before.
- **The office keeps its top bar**; the computer uses the taskbar instead.

### Bugs found and fixed

- Tasks kept "Start task" disabled ("Opening…") after opening the work, because it
  used to disappear at that moment; with windows it stays open behind. Fixed (and the
  same pattern in the tools' start page).

### Tests

- Unit: 14 new (window manager: one window per app, cascade, focus, taskbar
  click cycle, maximise, minimise all, move/resize limits, fitting a smaller screen,
  persistence and damaged data; icon layout and settings). 1,929 in total.
- Browser: new `desktop.spec.ts` (7 tests: Mail opens in a window; several apps and
  taskbar switching; minimise, maximise, restore, drag, resize, close, layout kept
  after reload; icons by double-click and keyboard, icon dragging kept after reload;
  right-click menu, New document, Personalize; Start and search; leaving the desk).
  Existing tests updated for windows: `openApp` closes other windows first (one app
  at a time, as before), `showApp` brings an app forward without minimising it, and
  lookups that can now match two windows use the window in front.
- Results: 144 Chromium browser tests pass (2 needed a retry under load and pass
  alone), 5 production-build tests, 8 Firefox/WebKit/Edge (1 skipped, as before),
  and the automated accessibility checks on every screen. Start screen 280 kB.

### Known limitations

- Windows snap (dragging to a screen edge), keyboard window switching (Alt+Tab) and
  several windows of the same app are not included.
- The Recycle Bin is always empty: WorkSim deletes files at once and keeps versions
  and backups instead.

---

## 2026-11-03 · Milestone 8.9: Final end-to-end regression

### Found and fixed

- **Assessment attempts from before 8.2.** An attempt started before the practical
  step was added would have been marked without it. Assessment content is now
  version 2, and an attempt still open on an older version is closed without
  marking and without penalty, with a note asking the player to start again.
  Finished attempts keep their results.
- **A development-only React warning** (“synchronously unmount a root”, from the 3D
  office's labels) was checked. It does not occur in the production build, which
  shows no console errors and no failed requests in a whole session (a new test).

### Added tests

- **The whole journey in one browser test** (`tests/e2e/journey.spec.ts`): new
  player, the start screen's explanation, choosing a career, the office, a
  colleague, mail, levels and achievements, a case, a readiness attempt, portfolio
  evidence and a PDF export, a backup restored on a fresh profile, a second career,
  and a reload.
- **A save from before Phase 8** (`persistence/phase7Save.test.ts`): a Phase 7 backup
  (database version 4, save format 4) restores with its cases, readiness result,
  promotions and seed. A case received before variants stays in its original wording.
  The save keeps working in the current format.
- **No console errors in production** (`tests/pwa/console.spec.ts`).

### Final results

| Check                                      | Result                                                     |
| ------------------------------------------ | ---------------------------------------------------------- |
| Unit tests (`npm run check`)               | 1,915 passed; formatting, lint and types clean             |
| Browser tests, Chromium (`test:e2e`)       | 137 passed (one passed on its automatic retry, under load) |
| Production build: offline app (`test:pwa`) | 5 passed                                                   |
| Firefox, WebKit, Edge (`test:browsers`)    | 8 passed, 1 skipped (offline in WebKit on Windows)         |
| Production build                           | Succeeds; main file 294 kB (94 kB compressed)              |
| `npm audit`                                | 0 vulnerabilities                                          |

Start-up (production build, throttled “fast 3G”, median of three):

| Moment                                        | Phase 7 end   | Phase 8 end                                |
| --------------------------------------------- | ------------- | ------------------------------------------ |
| New player: start screen ready                | 484 kB, 3.9 s | 281 kB, 2.4 s                              |
| Returning player, first visit after an update | 754 kB, 5.6 s | 589 kB, 5.9 s (measured at 8.1)            |
| Returning player, WorkSim already cached      | 754 kB, 5.6 s | 0 kB, 2.3 s (served by the service worker) |

## 2026-11-03 · Milestone 8.8: Browser compatibility and performance

### Built

- **A cross-browser suite** (`npm run test:browsers`, `playwright.browsers.config.ts`)
  runs against a production build in **Firefox**, **WebKit** (Safari's engine) and
  **Microsoft Edge** (the installed Edge 156). It covers:
  - the core journey: start, office, mail, a Sheets formula, Docs, Slides, and saving
    across a reload;
  - backup and restore between two browser profiles, and switching career;
  - offline start.
- **A memory measurement** (`npm run measure:memory`): the JavaScript heap at each
  stage of a session in Chromium.
- **docs/BROWSERS.md:**
  - minimum versions: Chrome and Edge 111, Firefox 128, Safari 16.4, set by the
    styling used;
  - what each browser capability is used for, and the fallback when it is missing;
  - what was tested, and the known limits.

### Results

| Browser  | Core journey        | Backup, restore, career switch | Offline start                                               |
| -------- | ------------------- | ------------------------------ | ----------------------------------------------------------- |
| Chromium | passes (full suite) | passes                         | passes (`npm run test:pwa`)                                 |
| Edge 156 | passes              | passes                         | passes                                                      |
| Firefox  | passes              | passes                         | passes                                                      |
| WebKit   | passes              | passes                         | not run: no service workers in Playwright WebKit on Windows |

Opening a workbook again after a reload or a restore took more than 5 seconds in
WebKit and sometimes in Firefox. It was slow, not stuck: with 30 seconds, every test
passes. Real Safari on macOS has not been tested.

Memory (Chromium, production build, after garbage collection):

| Moment                             | JavaScript heap |
| ---------------------------------- | --------------- |
| Start screen                       | 5 MB            |
| 3D office                          | 17 MB           |
| After opening Sheets, Docs, Slides | 14 MB           |
| After doing that five times more   | 15 MB           |

Memory does not keep growing as apps are opened and closed.

Fallbacks already in place and documented:

- the office panel without WebGL;
- simpler 3D drawing on computers without a graphics card;
- a clear message when browser storage is blocked;
- online-only use without service workers.

## 2026-11-03 · Milestone 8.7: Onboarding, documentation and user experience

### Reviewed

The first-time experience. The start screen explained choosing a career well, but not:

- what WorkSim is not (a job, or a qualification);
- that progress is kept only on this device;
- that it is free with no account;
- that it works offline.

Inside the app, help was spread across the guides in the docs folder only.

### Built

- **Before you start,** a short section on the start screen, closed by default so it
  never gets in the way: a simulation, not a job or a qualification; free with no
  account; progress saved on this device only; backups; offline and installing.
- **Help** in the top bar: a panel of 11 short topics:
  - what WorkSim is and is not;
  - the office;
  - the apps;
  - tasks and feedback;
  - cases;
  - XP, levels and promotion;
  - the portfolio and exports;
  - saving, backups and recovery;
  - installing and offline use;
  - keyboard and accessibility;
  - troubleshooting.

  It opens only when asked, takes keyboard focus, closes with Escape, and returns
  focus.

- **docs/PLAYER_HANDBOOK.md,** the starting point for players, linked first in the
  README. It covers every topic above, links each detailed guide (cases, career,
  portfolio, privacy and security, install and offline, accessibility, browsers), and
  has a troubleshooting table.
- No pop-ups, tours or new notifications were added.

### Tested

- Unit: the help covers every subject a new player needs (from “what it is not” to
  “repair app files”), with unique, non-empty topics.
- Browser:
  - the start screen's section says WorkSim gives no qualifications and keeps
    progress on this device only;
  - Help is reached and used with the keyboard alone (topics, Escape, focus back);
  - the axe audit passes with Help open;
  - the first-day test still passes.

## 2026-11-03 · Milestone 8.6: Security and data-integrity hardening

### Reviewed

- **Backup import:** format, version and checksum are checked, every record is
  validated, a preview comes first, and the replacement is one transaction. Good.
- **Saves and documents:** validated on load; migrations are versioned and tested.
- **HTML exports:** all text is escaped and exports contain no scripts.
- **ZIP and file names:** cleaned of path characters.
- **The app** renders no raw HTML (`dangerouslySetInnerHTML` is not used).
- **Cross-tab:** a tab lock means one writer at a time.
- **Dependencies:** `npm audit` reports 0 vulnerabilities.
- **The service worker** caches same-origin GETs only and never touches IndexedDB.
- **Permissions:** none requested except persistent storage.

### Built (the gaps found)

- **Safety copies on this device** (`persistence/safety.ts`; database version 5 adds
  `safetyCopies` and changes nothing else):
  - a complete copy is kept before every restore, and once before saves in an older
    format are upgraded;
  - the newest three are kept;
  - **Storage & backup** lists them and can put one back, which itself keeps a copy,
    so that can be undone too;
  - they are never in backups and never cleared by a restore.

  This adds to the safety backup file that a restore already downloaded.

- **Size limit.** Files over 250 MB are refused before they are read, since a real
  backup is a few megabytes.
- **CSV exports** mark text that a spreadsheet program would run as a formula (=, +,
  @, or - before non-numbers) with a leading apostrophe. Numbers are unchanged.
- **File names** avoid what Windows refuses (CON, NUL…, and trailing dots).
- **Damaged data.** The error screen now explains in plain words that nothing was
  changed, puts the technical details under “details”, and offers **Try again** and
  **Storage & backup**, so a backup or safety copy can be restored without the app
  having to open.
- **docs/PRIVACY_AND_SECURITY.md:**
  - where data is (this device only; nothing is sent anywhere);
  - what protects it;
  - honest limits: browser storage is not tamper-proof, clearing site data deletes
    everything, backups are not encrypted, and there is no server-grade security.

### Tested

- Unit:
  - a restore keeps a copy, and putting it back restores the exact earlier data;
  - only three copies are kept, never in backups, and never removed by a restore;
  - one copy is taken before an upgrade from an older format, and none when saves
    are current;
  - the database upgrade from version 4 to 5 keeps everything;
  - formula-like CSV text is marked while numbers are untouched;
  - file names Windows refuses are avoided.
- Browser:
  - restore and undo through the real Storage & backup panel;
  - a 251 MB file is refused before it is read;
  - a deliberately damaged save shows the plain explanation and opens Storage &
    backup;
  - the existing backup tests pass.

## 2026-11-03 · Milestone 8.5: Installable progressive web app

### Built

- **A web app manifest** (`public/manifest.webmanifest`): name, standalone display,
  theme colours, and icons rendered from SVG (192, 512, maskable 512 and an Apple
  touch icon; `scripts/pwa/make-icons.mjs`).
- **A hand-written service worker** (`scripts/pwa/sw-template.js`), written to
  `dist/sw.js` by a small build plugin (`scripts/pwa/plugin.ts`). It has:
  - the exact list of the build's files;
  - a version that is a hash of all of them, so any change makes a new version.
- **Caching:**
  - every file of a version is cached at install, or the version is not installed
    and the old one keeps working;
  - files are served from the cache;
  - pages come from the network first, and from the cached page offline;
  - old versions' caches are removed when a new one takes over;
  - IndexedDB (the saves) is never touched.
- **Safe updates.** A new version waits. A quiet notice says it is ready, and **Update
  now** first saves all work (the same save used before backups), then switches. If
  saving fails, the update waits and says so.
- **Recovery.** **Repair app files** in Storage & backup removes the service worker and
  its caches and downloads the app again; saves are unaffected. The error screen now
  has a **Try again** button.
- **An offline notice** when the connection drops, saying that work is still saved on
  this device.
- **Registration in production builds only,** so development and the existing
  browser tests are unchanged.
- **docs/INSTALL_AND_OFFLINE.md** covers:
  - how to install in each browser;
  - what works offline and what needs a connection;
  - that nothing is ever uploaded or synced;
  - updates and repair.

### Found and fixed through testing

The service worker missed its own cached scripts. Servers can mark responses `Vary:
Origin`, and module scripts send an Origin header that the install requests did not.
The service worker now ignores Vary for its own versioned files.

### Tested (`npm run test:pwa`: a production build in Chromium)

- Installability: the manifest is linked and valid, its icons load, and the service
  worker controls the page.
- Offline:
  - WorkSim starts and opens the existing save;
  - work done offline (reading mail) is saved and survives an offline reload;
  - back online, the offline notice goes.
- Updates:
  - a new version is published (the served sw.js changes) and waits;
  - the notice appears while the office stays usable;
  - **Update now** switches to the new version, and the career save is kept.
- Repair: the app files are downloaded again, and the save is kept.
- Not automated: the browser's own install prompt and launching the installed app.
  Browsers do not allow tests to click them.

## 2026-11-03 · Milestone 8.4: Accessibility validation

### Built

- **The audit reaches further.** axe now also checks:
  - the Sheets, Docs and Slides editors with a file open;
  - every profession tool: Books, Help Desk, Network, Ad Campaigns, Data Studio and
    Code.
- **What the wider audit found, and was fixed:**
  - Grey text on the dark consoles of Code and Network was below the contrast ratio.
    Phase 7's darker greys had made it worse on dark backgrounds; those panels now
    use lighter text.
  - The Sheets grid wrapped a plain table. It now has explicit row groups, rows,
    column headers, row headers and cells.
  - The sheet tab list contained the “add a sheet” button, which now sits outside it.
  - Three buttons showed words that were not in their names (“Clear format”,
    “Data”, “T Text”). Their text or names now match.
  - The Docs page had no accessible name. It is now “Document text”, multi-line.
  - Symbol faces of toolbar buttons and the slide pictures inside thumbnails are
    hidden from screen readers; the buttons keep their names.
- **Keyboard and screen readers in the editors:**
  - Sheets announces the active cell's address, value and formula as the selection
    moves.
  - Slides: Tab moves to each element and selects it; Enter edits, the arrow keys
    move, Delete removes.
- **docs/ACCESSIBILITY.md** now has:
  - an honest record of what has and has not been tested: no testing with real
    assistive technology or by disabled users has taken place;
  - a screen-reader test checklist with the combinations to use (NVDA, JAWS,
    Narrator, VoiceOver, Orca) and twelve tasks;
  - the known limits.

### Tested

- Browser: the axe audit passes on every main screen, the three editors and the six
  profession tools.
- Browser: keyboard-only work in Sheets (each move is announced, including formulas)
  and Slides (Tab selects, the arrows move, Enter edits).
- Browser: the existing Sheets, Docs, Slides and multi-app tests still pass.

## 2026-11-02 · Milestone 8.3: Expanded case variations and advanced cases

### Built

- **Six more advanced cases**, one per career, from the third level:
  - Finance & Admin: an invoice paid twice because a reference was keyed two ways;
  - Accounting: a client wanting next year's insurance expensed now (a prepayment);
  - IT Help Desk: a phishing email, and how far it got;
  - Digital Marketing: a paid influencer post without “#ad”;
  - Data Analysis: an overall rate that fell while every group improved;
  - Software Development: a live payment key committed to the repository.

  Every career now has two advanced cases.

- **Twelve more variants:**
  - all six Phase 7 advanced cases now vary their figures (so IT Help Desk and
    Digital Marketing get figure variation too);
  - five of the six new cases vary their figures;
  - the sixth varies names only, because its table repeats the same numbers in
    different rows and a value swap would mix them up.

  Every career now has at least four varied cases, at least two of them in their
  figures (25 varied cases in all).

- **Consistent follow-ups.** A follow-up case (a hand-off coming back, a programme's
  next stage) continues in the variant of the case it follows, so people and figures
  never contradict what the player has already seen.
- **Stability.** Variant names already released are locked by a test: a case a save
  has received can never change.

### Tested

- Unit, for every variant (25):
  - its replacements exist;
  - it is still valid and exactly as demanding;
  - its own answers score 100%;
  - the original answers fail where the figures changed;
  - the original answer appears nowhere in the varied text, so there is no
    contradiction.
- Unit: a follow-up inherits its case's variant; released variant names are kept; four
  varied cases per career, two in their figures; the case balance and difficulty
  balance between careers still hold.
- Browser: a new advanced case in its varied version shows the varied figures and is
  graded against them (100%).

## 2026-11-02 · Milestone 8.2: Profession-specific readiness assessments

### Built

- **A practical step** (`kind: 'practical'`) in every readiness assessment:
  - a real task of the career, done again in its own tool from a fresh starting
    file, without the step-by-step guide;
  - marked by the task's own deterministic checks (`game/practical.ts`), as when
    the task is submitted; the task's report checks are left out, because the
    assessment marks its report separately;
  - code runs in the existing sandboxed worker before marking.
- **Practical tasks by career** (version a / version b, so a retake is new work):

  | Career               | Level 2                                              | Level 3                                                |
  | -------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
  | Finance & Admin      | Budget report / petty cash (Sheets)                  | Savings proposal / payment run (Sheets)                |
  | Accounting           | Bank reconciliation / sales (Books)                  | Payroll (Books) / month-end close (Sheets)             |
  | IT Help Desk         | Printing fault (Network) / leaver access (Directory) | Intranet outage (Network) / major incident (Help Desk) |
  | Digital Marketing    | April ad budget (Ad Campaigns) / SEO fixes           | Funnel (Analytics) / quarterly report (Sheets)         |
  | Data Analysis        | SQL questions / dashboard (Data Studio)              | Statistics (Data Studio) / portfolio review            |
  | Software Development | Working-days tests / NaN bug (Code)                  | Billing report (Code) / API testing (API)              |

- **Marks, the same in every career:**
  - tool work 30, report 25, investigation 15, figure 10, decision 10, message 10;
  - the pass mark stays at 80%, so neither the tool work (70% without it) nor the
    report (75% without it) can be skipped.
- **The file.** It opens in its own app (Sheets, Help Desk, Code or the tool),
  without the task's guide. It is handed in with the assessment, and a passed
  attempt keeps it in the portfolio.
- **The brief.** The task's brief is shown in the step, with the player's name.

### Tested

- Unit, for all 24 assessment versions:
  - the practical task is a real task of the same career, at or below the level;
  - an untouched starting file earns under 60% of the practical marks;
  - the model answer earns at least 90%;
  - good work everywhere passes, while everything except the tool work fails;
  - each version uses a different task;
  - a missing file, or one of the wrong kind, earns nothing.
- Browser:
  - a full pass with real SQL typed and run in Data Studio and a report typed in
    Docs (100%), then the promotion requirement met, the assessment with its Data
    Studio work in the portfolio, and the progress report;
  - in all six careers, the practical step names the right tool, and everything
    right except the tool work and the report scores 45% and says what to do.

## 2026-11-02 · Milestone 8.1: Career-specific content loading

### Built

- **Content packs.** Each career's tasks, cases and readiness assessments are now in
  their own pack, `content/packs/<career>.ts`.
- **Splitting the shared files.** The case and assessment files that mixed all six
  careers were split by career, with shared helpers kept in a `shared.ts`. A script
  did the split and refused to continue if any case had no single career. The full
  unit suite (every task, case, variant and assessment) passed unchanged afterwards.
- **Registries.** `ASSIGNMENTS`, `CASES` and `ASSESSMENTS` start empty and fill as
  packs register, so the game's lookups did not change.
- **`content/loader.ts`** loads a pack once:
  - concurrent requests share one download;
  - a failed download is forgotten, so trying again works;
  - unknown careers are refused.
- **When packs load:**
  - at start, the packs of every career that has a save load before the desk opens
    (the portfolio and the career overview use them);
  - a new player downloads none until a career is chosen;
  - switching careers loads the new career first.
- **Failures.** If a pack cannot be downloaded, the player is told to check their
  connection and try again; the start screen keeps its form.

### Measured (production build, median of three runs, throttled “fast 3G”)

| Moment                            | Phase 7 (before) | 8.1 (after)   |
| --------------------------------- | ---------------- | ------------- |
| New player: start screen ready    | 484 kB, 3.9 s    | 277 kB, 2.3 s |
| Returning player: 3D office drawn | 754 kB, 5.6 s    | 589 kB, 5.9 s |
| One career's content (compressed) | (in the start)   | 35 to 41 kB   |

The office time is about the same: drawing the 3D office (the 3D library is 250 kB
compressed) dominates it, but 165 kB less is downloaded. The office panel itself
appears earlier.

### Tested

- Unit:
  - every career has a pack, and each pack contains only its own career's tasks and
    cases;
  - a career is loaded once, and registering twice adds nothing;
  - tasks stay in order;
  - the whole existing suite runs with all packs loaded.
- Browser:
  - a new player downloads no pack before choosing;
  - a failed download shows the message, and trying again works;
  - switching careers downloads only that career;
  - after a reload, a returning player with two careers has both;
  - the existing career-switching and backup tests pass.

## 2026-11-01 · Milestone 7.7: Portfolio integration, hardening and documentation

### Built

- **The progress report** (on screen and as a PDF) now includes:
  - the simulated workplace experience: only figures above zero, each with its source;
  - readiness assessment results and attempts;
  - earned achievements with their day.
    It also recommends the readiness assessment the next promotion needs, with a button
    that opens it.
- **Passed assessments** are already portfolio items, with their report; the
  simulated-experience statement is unchanged on every report and export.
- **Hardening.** Assessments now need **80%**, not 70%. Everything except the Docs
  report is worth 75 marks, so the report can no longer be skipped. A test checks
  this for every assessment version.
- **Documentation:**
  - a player guide, [docs/CAREER_GUIDE.md](docs/CAREER_GUIDE.md);
  - the architecture notes (Phase 7 section), the roadmap and the README;
  - the Phase 7 plan, marked implemented.

### Tested

- Unit: the report shows nothing that has not happened; it recommends the
  assessment, and reports its attempts, earned achievements and sourced workplace
  figures.
- Browser: after passing an assessment, the progress report shows “Passed (100%) on
  attempt 2” and the achievements.
- Browser, all six careers: the level-2 assessment opens from the Career app. With
  everything right except the report, it scores 75%, is not passed, names the report
  as the thing to work on, and offers a retake.
- Full regression: every unit test, every browser test, and the production build.

## 2026-11-01 · Milestone 7.6: Accessibility

### Built

- **Automated audit.** axe (`@axe-core/playwright`, MPL-2.0, test-only) checked every
  main screen against WCAG 2.1 A/AA. It found colour contrast failures and invalid
  description-list markup in the new performance record; both are fixed:
  - the lightest grey text colours are darkened app-wide to reach 4.5:1;
  - five avatar colours with white text are one shade darker.
- **Focus.** A 3-pixel focus ring on every control, which no control removes any more
  (the start screen's name field and the formula bar used to).
- **Conversations in the office** take keyboard focus when they open, close with
  Escape, and return focus to where the player was.
- **Reduced motion.** With the system setting on:
  - animations, transitions and smooth scrolling are off;
  - the 3D camera jumps between places and people stay still;
  - the scene redraws only every 30 seconds, for the wall clock.
- **Announcements and forms.** Case and assessment results are announced to screen
  readers as they appear. The start screen's hint (and any error) is linked to its
  field.
- **docs/ACCESSIBILITY.md** describes what is supported, how it is tested and the
  limits: no testing yet by people who use assistive technology daily.

### Tested

- Browser: axe finds no violations on:
  - the start screen, the office and a conversation;
  - Mail, Tasks, a case and its result;
  - Career, Readiness and assessment feedback;
  - Portfolio, Docs and Sheets.
- Browser: a whole working session with the keyboard alone:
  - start a career;
  - a conversation, with focus moving in and back out on Escape;
  - walk to the desk and use the computer;
  - read mail;
  - work a case and submit it, scoring 100%.
- Browser: the focus ring is visible, and reduced motion removes transitions while the
  office stays fully usable.

## 2026-11-01 · Milestone 7.5: Performance: code splitting and startup

### Built

- **Investigation.** A source-map breakdown of the 2,207 kB main file found:
  - the career content of all six careers (about 620 kB);
  - the Docs editor, Tiptap/ProseMirror (about 400 kB);
  - React (203 kB), the database layer (96 kB) and Sheets (95 kB).
    The 3D office and the profession tools were already loaded on demand, and
    `npm find-dupes` found no duplicate packages.
- **Apps load when first opened.** Docs, Sheets, Slides, Code, Help Desk, Cases,
  Career, Readiness, Portfolio, Tasks and the tool screens each load the first time
  they are opened, with a short “Opening…” status. The Docs editor loads only when a
  document is shown, including in the portfolio.
- **The desktop loads after the start screen**, once there is a career to show.
- **`scripts/measure-startup.mjs`** measures the production build in a real browser
  on a throttled “fast 3G” connection (1.6 Mbit/s, 150 ms latency), with the cache
  off. It refuses to run if its port is busy, so it can never measure another server.

### Measured (production build, median of three runs)

| Moment                              | Before        | After         |
| ----------------------------------- | ------------- | ------------- |
| Main JavaScript file (uncompressed) | 2,207 kB      | 391 kB        |
| New player: start screen ready      | 684 kB, 5.0 s | 484 kB, 3.9 s |
| Returning player: 3D office drawn   | 929 kB, 8.3 s | 754 kB, 7.3 s |

The kB columns are the compressed JavaScript downloaded. The first time an app is
opened, it now downloads its own part; Docs, for example, is about 150 kB compressed.

### Not done (recorded for later)

The content of all six careers still loads at start, because the game rules look it
up synchronously. Loading only the player's career would save roughly another 150 kB
compressed. It needs a content registry loaded before the career opens: a larger
change, recommended for Phase 8.

### Tested

- Every existing browser test passes against the lazily loaded apps, in particular
  Docs, Sheets, Slides, the portfolio viewer, the developer and IT tools, and the
  readiness assessment, whose report is written in Docs.
- **Found and fixed through testing:**
  - When a recovered document was mounted twice in quick succession (React does
    this in development, and the lazy loading made it more likely), the second mount
    no longer knew a recovery had happened, so it showed the wrong message. Documents
    recovered in the last 10 seconds are now remembered.
  - Test helpers now wait for the desktop to load before deciding whether the player
    is in the office or at the computer.
  - The crash-recovery test now crashes immediately after typing, as intended, and
    then checks that the recovered change is saved: it is still there after another
    reload, with nothing left to recover.

## 2026-11-01 · Milestone 7.4: Career readiness assessments

### Built

- **12 practical assessments**, two per career: one at level 2 and one at level 3.
  Each is 3 office hours of real work, graded like a case:
  - an investigation;
  - a calculation;
  - a decision with reasoned options;
  - a **report written in Docs**, checked by the existing deliverable grader for
    sections, correct figures, key points and length;
  - a written message.
- **The tasks by career:**
  - Finance & Admin: expense claims against policy; a quarterly budget forecast.
  - Accounting: a bank reconciliation with a keying error; management accounts with a
    one-off cost.
  - IT Help Desk: an outage after a DNS change; repeat tickets and their fixes.
  - Digital Marketing: a campaign's ad groups and budget; next quarter's budget plan.
  - Data Analysis: a SQL join counting duplicates; an A/B test read too early.
  - Software Development: a discount defect, its fix and tests; reviewing a caching
    change before release.
- **Versions.** Every assessment has two versions with different figures and details,
  built from parameters so every figure, explanation and check agrees. A retake uses
  the other version, so a first attempt's feedback cannot simply be copied.
- **Feedback** shows the strengths (parts at 80% or more) and the areas to work on
  (under 60%, with the reason), plus practice advice. A failed or timed-out attempt
  can be taken again, and every attempt is kept in the save's record.
- **Promotion.** From level 2, the next promotion also needs the current level's
  assessment. Levels already held are never affected. The Career app lists it as a
  requirement with a link, and the new **Readiness** app on the dock shows it.
- **Portfolio.** A passed assessment goes into the portfolio with a frozen assessment
  record and the report handed in. It earns XP and skills once, on the first pass.
- **Honesty.** Assessments are described as simulated workplace assessments, never as
  qualifications; a test checks the content for qualification claims.
- Also fixed: a varied case's reply email now comes from the varied sender.

### Tested

- Unit: two assessments per career at levels 2 and 3. All 24 versions:
  - are practical, timed and score 100% with model answers and a good report;
  - cannot score 100% without the report;
  - the second version rejects the first version's answers.
- Unit: starting (level, career, one at a time); weak attempts give feedback and no
  XP; retakes switch version and keep the history; first pass gives XP once; time
  running out; versions by seed; promotion waits for the assessment in every career;
  the first and top levels need none.
- Browser (Finance & Admin, end to end):
  - the requirement and its link in the Career app;
  - a rushed first attempt through the real form, with its feedback;
  - a retake in version B, with the report typed in Docs, scoring 100%;
  - the requirement met, and the assessment in the portfolio.

## 2026-11-01 · Milestone 7.3: Varied cases and new cases

### Built

- **Case variants** (`content/cases/variants.ts`, `game/caseVariants.ts`). A variant
  changes people, organisations, references, circumstances or figures, together with
  the answers that follow from them. Replacements are applied in one pass, longest
  first, so they never interfere with each other.
- **13 cases vary** across all six careers. Five of them change the figures, so the
  answer changes: the supplier invoice, client VAT, the sales VAT check, the developer
  estimates and the timesheet deadline circumstances.
- **How a variant is chosen.** Each save has a seed. A case's variant comes from the
  seed and the case ID when the case arrives, and is stored with the case, so it never
  changes later. Saves and cases from before this milestone keep the original wording.
- **The variant everywhere.** Mail, the sender, the Cases app, grading, reminders, the
  office and the frozen portfolio record all use the case's variant.
- **6 advanced cases**, one per career from the third level:
  - a contractor's unnotified price rise;
  - a client wanting a January sale in December to meet a bank covenant;
  - pressure from the CEO's office during an outage;
  - a client cutting a channel that last-click reports under-credit;
  - a biased in-app survey for the board;
  - a slow report caused by thousands of service calls.
- **Difficulty** (foundation, intermediate, advanced) is shown on every case.
- **Browser tests** create saves with seed 0, so they see the original wording; a
  dev hook chooses a seed for the variant test.

### Tested

- Unit: for every variant:
  - its replacements exist in the case;
  - it is still a valid case with the same steps, marks, verdicts and pass mark;
  - its own model answers score 100%;
  - where figures change, the original's answers do not.
- Unit: the seed picks variants reproducibly and covers them all; an arrived case keeps
  its variant even if the seed changes; old cases are the original.
- Unit: every career has at least two varied cases, and the same number of cases at
  each difficulty.
- Browser: a varied case from mail to the portfolio, with the new supplier and figures
  graded and frozen; an advanced case shown and graded.

## 2026-11-01 · Milestone 7.2: Achievements and desk customisation

### Built

- **19 achievements** in four categories (professional performance, workplace
  conduct, leadership, career progression), each worked out from the save:
  - for example, pass 5 tasks first time, pass an incident case, hand off with every
    detail right, decide every request within policy, share out a team's work well,
    reach the level where you lead a team, pass 3 tasks in your profession's main tool;
  - each says exactly how it is earned and shows progress (“2 of 3”);
  - earned ones keep the office day; they are never taken away;
  - one line in the day's log when earned: no pop-ups, streaks, log-in rewards or
    purchases.
- **Your desk:** 15 cosmetic items in 6 slots (plant, mug, lamp, photo frame,
  pinboard, chair). They are earned by achievements or promotions, chosen in the
  Career app, and drawn at the player's desk in the 3D office. “Arrange your desk” at
  the desk opens the choice. A saved item that is unknown or not earned is ignored.

### Tested

- Unit: no achievement for a new career; achievements earned by real work, with the
  day, logged once and never removed; every achievement can be earned in all six
  careers (the cases, steps, projects, tools and levels exist); desk defaults, only
  earned items accepted, tampered saves ignored.
- Persistence: the career record (promotions, achievements, desk) survives a backup
  and restore.
- Browser: tasks earn achievements; an earned plant is placed and kept after a
  reload; “Arrange your desk” in the office opens the desk section.

## 2026-11-01 · Milestone 7.1: Career-wide performance record

### Built

- **Save format 4.** Each career save gains a record of what cannot be worked out
  later: promotions (the level, the office day, the time and the XP), and room for
  achievements, desk items and the case-variation seed. Older saves upgrade
  automatically: levels already held are kept as “before records began”.
- **Performance record** in the Career app, worked out from saved tasks, cases,
  meetings and relationships. Each figure says how it is calculated:
  - clients and customers (cases handled, average score, missed deadlines, client
    satisfaction);
  - budgets and approvals (requests approved, rejected and escalated, the value
    approved, decisions within policy and authority, the spending limit, the
    department’s remaining budget);
  - workplace incidents;
  - meetings and deliverables (team meetings, case meetings joined, files handed in);
  - work with other departments (hand-offs right first time, follow-ups needed);
  - leadership (teams led, work delegated and how well matched, reviews, decisions);
  - relationships (colleagues, average trust, reputation);
  - progression (level, tasks, average score, integrated projects, weekly reviews).
- **Level by level:** tasks and cases are counted at the level the player held when
  they submitted them, so earlier levels keep their record after a promotion.

### Tested

- Unit: the format 3 → 4 upgrade (levels kept, a stable seed); promotions recorded
  with the day; every section explained; customer, approval and hand-off figures
  from real answers; periods split by promotion; all six careers.
- Browser: the record counts a real case, explains it, and survives a reload.

## 2026-11-01 · Milestone 6.9: Office integration, balance, hardening, documentation

### Built

- **Cases in the office.** Reminders at the computer when a case is due within the
  hour, or its meeting is about to start or has started, with **Open the case**. The
  team whiteboard lists open cases and the time left (and opens Cases). The break
  room notice board shows the company indicators and the programme's progress.
- **Your authority** in the Career app: the player's approval limit, and when leading
  a team begins.
- **Balance.** A test keeps the six careers equal: every career has 10 cases of the
  same kinds (two customer cases, whether clients or colleagues, one operations, two
  workflow, one meeting, one incident, one leadership and two programme), with
  985 to 1,020 XP from cases.
- **Hardening.** A save that names a case no longer in the game is ignored
  everywhere (reminders, arrivals, the programme board, the office).
- **Documentation.** A player guide ([docs/CASES_GUIDE.md](docs/CASES_GUIDE.md)), the
  architecture notes and the roadmap updated, and the Phase 6 plan marked implemented.

### Tested

- Unit: deadline and meeting reminders, the whiteboard and notice board, a retired
  case in a save, and the balance between careers.
- Browser: a deadline reminder opens the case, the whiteboard lists it and opens
  Cases, and the Career app shows the player's authority.
- Full regression of every unit and browser test.

## 2026-11-01 · Milestone 6.8: Cross-functional programme: the company expansion

### Built

An organisation-wide programme, **Opening the Manchester office** (25 staff, a
£420,000 one-off budget), in which every department has a workstream. From the
third career level, the player's department is handed its part as a two-stage
programme project:

- **Finance & Admin:** consolidate the departments' one-off costs into the
  programme budget, then advise the review.
- **Accounting:** set up cost centres and decide which costs are capital
  (asset register, depreciation), then advise the review.
- **IT Help Desk:** order laptops and accounts for new hires and transfers, then
  advise the review on opening two weeks earlier.
- **Digital Marketing:** plan the launch campaign, then advise the review.
- **Data Analysis:** build the business case and the measures of success, then
  advise the review.
- **Software Development:** plan the system changes for a second office, then
  advise the review.

A **programme board** in each programme case shows every workstream: the player's
own follows their cases; the other departments (People & Culture, Operations and
the rest) are delivered by simulated colleagues as the days pass. The second stage
arrives as soon as the first is submitted (it is not held back by the limit on open
cases). When both stages are done, the programme becomes a **project** in the
portfolio, with both case records as its stages.

### Tested

- Unit: model answers score 100% for all 12 programme cases; stage 2 arrives after
  stage 1 even with two cases open; the board's statuses; the projects' content.
- Persistence: the programme project links the two case items atomically.
- Browser: IT through the real forms (board, stage 2 by mail, the portfolio
  project with two stages), and both stages to the portfolio for every other career.

## 2026-11-01 · Milestone 6.7: Management and leadership

### Built

Leadership arrives with seniority. Approval authority grows level by level (6.3), and
at the top level of every career a leadership case hands the player a team:

- **Finance & Admin (Finance Officer):** lead month-end: share out the work, review a
  junior’s petty cash reconciliation (a £6 “rounding” difference, a missing receipt),
  turn down a colleague’s offer to work the weekend in favour of sharing and coaching,
  and give feedback.
- **Accounting (Senior Accountant):** allocate quarter-end work, review a journal that
  should have been a prepayment (£4,400), settle a disagreement about an accrual on
  the principle, and give feedback.
- **IT Help Desk (Service Desk Lead):** run the desk for a week, review an analyst’s
  curt reply, handle a complaint about him privately and fairly, and give feedback.
- **Digital Marketing (Manager):** allocate campaigns, review copy with claims that
  can’t be proved, give fair credit for an award entry, and give feedback.
- **Data Analysis (Lead):** prioritise the team’s queue, review a new analyst’s
  conclusion (self-selection, a tiny sample), send an honest early indication, and
  coach her.
- **Software Development (Lead Developer):** plan the sprint within capacity, review
  a pull request (no tests, CSV commas), agree a testing standard together, and write
  review comments.

Delegation checks strengths and capacity (someone with room for one piece of work
can’t take three); feedback is checked for praise, specifics and support, and must
criticise the work, never the person.

### Tested

- Unit tests: leadership cases exist for every career and only at its top level (not
  one level below); nothing that delegates or approves reaches an intern; delegation
  respects capacity.
- Browser tests: the IT lead’s case worked through the real forms (delegation selects,
  the review, the decision and the feedback), and the leadership case of every other
  career end to end.

---

## 2026-11-01 · Milestone 6.6: Complex workplace incidents

### Built

An incident for every career, each needing investigation of the evidence, a judgement
between options that are each explained (including a tempting wrong one), and
corrective work:

- **IT Help Desk: a suspicious login** to the finance director’s account (impossible
  travel, a forwarding rule for “invoice” emails, a phishing link). Contain first,
  close the gap, warn Finance about fake bank details, report without blame.
- **Digital Marketing: a campaign £3,000 over budget**, with IT and Marketing blaming
  each other. The change history settles it (a typed £4,000 instead of £400); tell
  the client honestly and credit the overspend.
- **Data Analysis: a director wants a misleading chart** (a truncated axis, a month
  left out). Keep the honest chart and show the real growth instead.
- **Accounting: asked to delay a bad debt** to hit a target. Recognise the £16,200
  loss this quarter, refuse kindly and help explain the miss.
- **Finance & Admin: a colleague’s payment mistake** leaves a small supplier unable to
  pay staff. Pay the £4,752 the same day, tell the colleague privately, never name
  them to the supplier.
- **Software Development: a client says our report is wrong**: a clock-change bug
  double-counting days for 11 clients. Fix it with a test, correct every client, not
  just the one who noticed, and explain honestly.

### Tested

- Unit tests: every career has an incident with a decision that includes a poor,
  explained option, and corrective written work; every incident’s model answers get
  full marks.
- Browser tests: the data-integrity incident worked through the real forms (findings,
  a wrong choice changed to the right one, the reply; risk goes down), and the
  incident of every other career end to end.

---

## 2026-11-01 · Milestone 6.5: Meetings (preparation, the meeting, minutes and actions)

### Built

- **Meeting cases** have three phases:
  1. **Prepare** a document or slides in the real Docs or Slides app (graded by the
     existing report checks: structure, figures, what it must cover, length).
  2. **The meeting** happens at a set time and place in the office day. The Cases app
     shows when and where; “Work until the meeting starts” moves the office clock, and
     “Join the meeting” records attendance and takes the meeting’s time. Decisions
     that come up in the room unlock only then.
  3. **After the meeting**: record the actions with the right owners (the minutes) and
     send the follow-up.
- Missing the meeting is possible: it goes ahead without you, and the decisions and
  actions score nothing, with the reason.
- **A meeting for every career:** the Finance & Admin team meeting (present the
  spending update), an Accounting client meeting on late payments (agree a payment
  plan), the IT change advisory board (a VPN security update with pilot and rollback),
  a Digital Marketing client quarterly review (budget cut challenge), a Data Analysis
  leadership review (stand by the evidence when asked to drop a risk slide), and a
  Software Development sprint review (a late request goes to the backlog).

### Tested

- Unit tests: joining only from the start until the end, the meeting taking office
  time, missing a meeting, missed meetings scoring their steps zero with the reason,
  and every career having a meeting with preparation, decisions and actions.
- Browser test: the Finance & Admin meeting: steps locked before the meeting, the
  slides opened in Slides, working until the start, joining, and the result.

---

## 2026-11-01 · Milestone 6.4: Interdepartmental workflows

### Built

- **Hand-off steps:** the player passes information on to another department in the form
  it needs (text, figures and choices), checked field by field against the evidence,
  with the reason for every wrong field. Text ignores case and spacing; numbers accept
  £ signs and commas.
- **Hand-offs have consequences downstream.** A follow-up case arrives from the
  receiving department only if the hand-off was wrong (or never made): the problem it
  caused, to own and put right. A correct hand-off simply works. Follow-ups come first
  and are not held back by the limit on open cases.
- **A workflow for every career**, each with its follow-up:

| Career            | Workflow                                                                    | If the hand-off was wrong                      |
| ----------------- | --------------------------------------------------------------------------- | ---------------------------------------------- |
| IT Help Desk      | People & Culture’s new starter → set-up record for Facilities and Directory | The new starter can’t work on her first day    |
| Finance & Admin   | Operations’ approved request → the purchase order                           | Accounting holds the supplier’s invoice        |
| Accounting        | Sales’ signed contract → the billing schedule                               | The new client questions their first invoice   |
| Digital Marketing | The campaign plan → Finance’s budget request                                | Finance sends the request back                 |
| Data Analysis     | Operations’ request → the dashboard specification                           | The board would see the wrong delivery figures |
| Software Dev.     | Support’s escalation → the engineering ticket                               | A serious bug waits too long in the backlog    |

### Tested

- Unit tests: field-by-field checking and reasons, no follow-up after a correct
  hand-off, a follow-up after a wrong or lapsed one, and every career having a
  workflow with a follow-up.
- Browser test: the purchase order filled in through the real form with a wrong total,
  the explained result, and Accounting’s follow-up arriving in Mail.

---

## 2026-11-01 · Milestone 6.3: Business operations (budgets, purchases, approvals)

### Built

- **Approvals follow the rules, not a fixed answer.** For every request the right
  decision is worked out: **reject** if it breaks policy (with the policy’s reason);
  **escalate** if it is above the player’s approval limit (by level: £0, £500, £2,500,
  £10,000) or above what the department has left this quarter; otherwise **approve**.
  The same request can rightly be escalated by a junior and approved by someone more
  senior. Every wrong decision is explained with the rule that applies.
- **Budgets:** each department has a quarterly budget, most of it already committed;
  approved requests commit the rest. Approving against policy raises operational risk
  and hurts budget discipline; approving above your authority hurts discipline too.
- **“Your authority and budgets”** panel on cases with approvals: your limit and what
  each department involved has left.
- **An operations case for every career** (from the second level):
  - Finance & Admin: the week’s purchase requests, and a kind refusal to Ben.
  - Accounting: the payment run, with a duplicate invoice and a bank-details fraud
    attempt (confirm by phone, never by replying to the email).
  - IT Help Desk: equipment requests and a failing UPS battery (urgent, escalated with
    a recommendation).
  - Digital Marketing: an agency billing 15 hours more than agreed (£900), an influencer
    without a contract, and a video within budget.
  - Data Analysis: tool and data purchases, including personal data without a data
    protection agreement.
  - Software Development: a cloud bill over budget from forgotten load-test servers
    (shut them down, add an alert), and tool requests including a duplicate service.

### Tested

- Unit tests: the three rules and their reasons, limits by level (interns approve
  nothing), each operations case needing all three kinds of decision at its first
  level, and approvals committing spending (approving against policy raises risk).
- Browser tests: the Finance & Admin approvals made in the real form (limit and budgets
  shown, 100%, discipline up), and the operations case of each other career at level 2.

---

## 2026-11-01 · Milestone 6.2: Clients and customers

### Built

Every career now has two client or customer cases, arriving after its early tasks:

| Career            | Cases                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Finance & Admin   | A supplier chases an invoice for a short delivery; an employee queries a rejected expense claim                  |
| Accounting        | A client disputes their statement (a misallocated payment); a client asks for VAT figures (and another client’s) |
| IT Help Desk      | A colleague chases a ticket left without updates; a director asks for admin rights for her team                  |
| Digital Marketing | A client changes the brief without budget; a client is unhappy about click-through rate                          |
| Data Analysis     | Sales says the figures don’t match Finance’s (VAT); a director wants everything analysed by tomorrow             |
| Software Dev.     | A vague bug report close to payroll; a feature request with an impossible deadline                               |

Each has realistic evidence, a deadline, a judgement with explained options (for
example confidentiality, security policy, honest trade-offs, scope), a written reply
checked for what it must say and must not say, and consequences for the client
relationship and the organisation’s indicators. Review steps now say “tick every
statement that applies”, so a step can ask what is wrong or what is true.

### Tested

- Content tests: every case’s model answers get full marks, nothing passes without
  work, every decision has one best option, IDs are unique, triggers and skills exist,
  and every career has at least two cases.
- Browser tests: a client case in each of the six careers, from the email to the result
  and the portfolio (with a development-only shortcut that fills in the model answers;
  the step forms themselves are tested by the Finance & Admin case).
- The Finance & Admin browser test waits for answers to be saved before reloading, and
  cases are now graded inside the save, from the answers as stored at that moment.

---

## 2026-11-01 · Milestone 6.1: Organisation model, case engine and the Cases app

### Built

- **Cases** (`src/content/cases/`, engine in `src/game/cases.ts`): pieces of real
  workplace business from clients, colleagues, suppliers and other departments. A case
  has a sender, evidence (text and tables), steps, a deadline in office hours, outcomes
  and the requester’s replies.
- **Eight kinds of step**, each graded with its reasons: review the evidence (mark the
  problems), work out a figure, decide (every option is judged best, acceptable or poor,
  with why), approve / reject / escalate requests, delegate work to team members (with
  capacity), record meeting actions with owners, write a reply (what it must say and
  must not promise, with an example of a good reply shown afterwards), and produce a Doc
  or Slides file with the existing apps (graded by the existing report checks).
- **Arrival and deadlines:** cases arrive after the task or case that leads to them, at
  the right career level, during working hours, at most two open at once, by email
  (shown from the outside contact, with an “Open case” button). A case left past its
  deadline lapses with a small, explained consequence.
- **Consequences:** decisions and outcomes change trust, reputation, departmental
  spending and three organisation indicators (client satisfaction, operational risk,
  budget discipline). XP and skill XP scale with the score, and promotions follow as
  for tasks.
- **The organisation** (`src/content/organisation.ts`): eight departments with heads
  and quarterly budgets, approval limits by career level (interns approve nothing),
  the indicators, clients and suppliers.
- **The Cases app** on every career’s dock (with a badge for open cases): the work queue
  with time left, the organisation indicators, the evidence and steps (answers are
  saved as you work), a confirmation that a case is answered once, and the result with
  every step’s reasons.
- **Portfolio:** a passed case becomes a portfolio item (type “case”) with a frozen
  **case record** (what was asked, the evidence, every answer, how it was judged and why)
  and any documents made for it, in the same save as the result. Cases count as skill
  evidence; the experience record counts them.
- The first case: Finance & Admin, **“A supplier chases an unpaid invoice”** (a
  three-way match with a short delivery: pay £552, ask for the rest, reply politely).

### Save format

- Profile format 3: `work.cases` and `work.org` (indicators and spending). Format 2
  saves and backups (Phases 2 to 5) upgrade automatically with no cases and ordinary
  indicators; nothing else changes.

### Tested

- 12 new unit tests: arrival rules (trigger, working hours, at most two, never twice),
  lapsing with consequences, explained grading, answer validation, recording results
  and rewards, every case’s model answers getting full marks; the upgrade from format 2;
  a pre-Phase 6 backup restoring; a submitted case saved with its portfolio record.
- New browser test: the supplier case from email to result, answers kept across a
  reload, indicators updated, the supplier’s reply, and the case record in the portfolio.

---

## 2026-11-01 · Milestone 5.11: Hardening (Phase 5 complete)

### Done

- **Scale:** a test with 500 portfolio records (about ten times what one device can
  hold today) stores and lists them in well under two seconds, filters and sorts in
  milliseconds, calculates competencies, the experience record, the progress report
  and the profile quickly, and exports 100 items as one PDF.
- **Accessibility review of the Portfolio app:** every control is a labelled button,
  checkbox, field or menu; sections use headings; the open file is a labelled region;
  status messages are announced; skill evidence that counts only as “a smaller part”
  now says so to screen readers too (it was shown only by a dashed border).
- **Documentation:** a player guide ([docs/PORTFOLIO_GUIDE.md](docs/PORTFOLIO_GUIDE.md));
  the architecture document covers the portfolio, exports and projects; the plan is
  marked as implemented.
- **Full regression:** format, lint, types, all unit tests and all browser tests.

### Phase 5 in short

Passed work becomes a portfolio automatically and safely (same save as the grade, one
record per task, protected submitted versions, backfill and backup). Players can browse
it, see their competencies with reasons, read a progress report with explained
recommendations, write an honest employability profile, and export real PDFs and
original files. Every career has an integrated project. Every export says that the work
was done in a simulation and is not employment, a qualification or a reference.

### Known limitations

- Original files are exported in open formats (CSV, HTML, Markdown, source code, JSON),
  not as native Office files (owner’s decision 18.3, recommended default).
- The data lives in the browser: exports state what the simulation is rather than
  claiming to be verified.
- One browser test (“changes made just before a tab crash are recovered”) is
  timing-sensitive when several test browsers run at once; it passes on its own.

---

## 2026-11-01 · Milestone 5.10: The remaining integrated projects

### Built

Every career now has an integrated project at its top level:

- **IT Help Desk, “The Thursday outage”** (Service Desk Lead):
  1. Help Desk: triage the flood of shared-drive and internet tickets as one incident,
     and update the first reporter.
  2. Network Tools: three causes (a stopped file-sharing service, the provider’s line
     down, a reception PC with a hand-typed gateway): findings with evidence, two
     fixed remotely, one passed to the provider.
  3. Help Desk, Docs and Slides: resolve the tickets, write the incident review and
     brief management.
- **Digital Marketing, “Rescue the Health Check launch”** (Digital Marketing Manager),
  with new launch traffic and a new ad account:
  1. Site Analytics: the launch page sends almost nobody to pricing, and paid social
     brings visits that do nothing.
  2. Ad Campaigns: pause the two money-losing ad sets, back the best one, land June
     on budget.
  3. Sheets, Docs and Slides: the scorecard (ROAS and keep or pause), the revised plan
     and the slides.
- **Software Development, “Ship the new mileage rates”** (Lead Developer):
  1. Code: tests for today’s rules that catch deliberate mistakes.
  2. Code and Git: the new rates and a passenger rate on a branch, tested and merged.
  3. Code, Git and Docs: the changelog, a release commit and release notes.
     (The plan suggested starting this project in the API Client; its only bug is
     already the subject of an earlier task, so the project starts with tests instead.)
- **Finance & Admin, “The year-end budget pack”** (Finance Officer):
  1. Sheets: consolidate three departments with cross-sheet references.
  2. Sheets: next year’s proposals against this year, flagging rises over 8%.
  3. Sheets and Slides: the key figures and the directors’ presentation.

### Tested

- The project tests now cover all six projects (stages consistent, in order, at the
  top of the career), and every stage’s model answer gets full marks through the
  content tests. New tests give full marks to a correct outage review and briefing,
  and to the mileage release notes.
- The project browser test now accepts any passing score (full marks are proven by
  the unit tests): under heavy load a long typed report sometimes lost a few points.

---

## 2026-11-01 · Milestone 5.9: Integrated projects (framework and the first two)

### Built

- **Projects** (`src/content/projects.ts`): a brief, objectives, deliverables, how it is
  assessed, and its stages. Each stage is an ordinary task (`projectId` and `stage` on
  the assignment), so it uses the same tools, checks, hand-in and feedback; stages
  open one after another.
- **Project records:** when the last stage passes, the same save that records the
  grade writes one project item: the brief, a row per stage, the average score, and
  every skill and tool used. It links to the stages’ own items (which keep the files)
  instead of copying them. A better stage later refreshes it; the backfill builds
  projects for older saves.
- Projects are not counted twice in skills: competencies use the stages; the
  experience record counts projects separately.
- **Tasks app:** stages show “Project · stage 1 of 3”, and a stage’s page shows the
  project brief with every stage and a tick for each one done.
- **Portfolio:** project items are labelled, show “Project · 3 stages” and a list of
  stages that open each stage’s item; PDFs list the stages.
- **Accounting, “Close the quarter for the board”** (Senior Accountant):
  1. Books: accrue the audit fee and the electricity, record deposit interest.
  2. Sheets: Q1 against budget with variances, percentages and an “Investigate” flag
     for anything over 10% either way, totals and profit.
  3. Sheets and Docs: monthly profit and margin, and the board report, by email.
- **Data Analysis, “Why are customers leaving?”** (Lead Data Analyst), with a new
  subscriptions dataset:
  1. Data Studio: clean the billing export and measure churn by plan with SQL.
  2. Data Studio: a churn dashboard (by plan, by region, revenue lost).
  3. Sheets and Docs: churn and revenue lost by plan, and a findings memo. The insight:
     Basic loses the most customers, but Premium loses the most revenue.

### Tested

- 14 new unit tests: projects are consistent (stages of the same career and level, in
  order, at the top of the career); the project record appears only after the last
  stage, links to the stage items, updates when a stage improves, and is built by the
  backfill; every churn query’s SQL gives the expected result in the real SQL engine;
  correct board and memo reports get full marks. Every stage’s model answer gets full
  marks through the existing content tests.
- New browser test: the whole Accounting project (journals in Books, the variance
  analysis, the board pack by email) and the project item linking its three stages.

---

## 2026-11-01 · Milestone 5.8: Employability profile

### Built

- A **Profile** section in the Portfolio app, with an editor and a live preview of
  exactly what will be exported.
- **In the player’s own words:** display name, headline and summary (saved
  automatically in the `meta` table, so they are in backups).
- **Generated from the records, never edited:** simulated career progress (“Reached
  Junior Developer (level 1 of 4) in the simulated Software Development career”),
  competencies by level, featured work, tools used in passed work, and experience in
  numbers. The player can only show or hide these sections.
- **Featured work** uses the items the player featured (on each item’s page), in an
  order they choose with up and down buttons.
- **Honesty:** the statement is always shown and cannot be hidden. There are no fields
  for employers, job dates, references or qualifications. If the headline or summary
  uses words such as “certified”, “degree” or “worked at”, a reminder explains that
  the profile shows work done in a simulation.
- **Downloads:** the profile as a PDF and as a self-contained web page (the player’s
  text is escaped).

### Tested

- 8 new unit tests: the profile is built from records only, featured work follows the
  player’s order and never includes excluded work, other saves’ work is not counted,
  stored settings keep only the allowed fields, the reminder catches misleading
  words, hiding every section keeps the statement, PDF text, and HTML escaping.
- The export browser test edits the profile, sees the reminder, hides a section,
  downloads the PDF and web page, and checks the text is kept after a reload.
- Known timing-sensitive test: “changes made just before a tab crash are recovered”
  needs the crash within one second of typing, and sometimes misses that window when
  several test browsers run at once. It passes when run on its own; autosave and the
  editor were not changed in Phase 5.

---

## 2026-11-01 · Milestone 5.7: Original files and the portfolio package

### Built

- **Download everything (ZIP)** in the Export section: one folder with a README, the
  portfolio PDF, the competency report, and a folder per included piece of work with
  its own PDF and its original files.
- **Download original files** on each item’s page: that item’s PDF and files as a ZIP.
- Original files are in open formats that work outside WorkSim:
  - Spreadsheets: one CSV per sheet (the values shown) and `Formulas.csv`.
  - Reports and slides: a web page (HTML) and plain text (Markdown); slides keep
    their speaker notes, charts become data tables.
  - Help Desk queues: CSV.
  - Code: the source files exactly as handed in, and `git-log.txt`.
  - Professional tools: one CSV per table of data, and the file’s full data as JSON.
- CSV files start with a byte-order mark so spreadsheet apps show £ and accented
  letters correctly. HTML pages are self-contained, with no scripts.
- The README explains every format and how to open it, and repeats the honesty
  statement.

### Dependencies added

- **fflate** 0.8.3 (MIT): ZIP files, loaded only when exporting.

### Tested

- 63 new unit tests: CSV round trips (commas, quotes, line breaks, £), Markdown and
  HTML output, workbook CSVs matching the values shown, code files byte for byte,
  every tool’s data reading back from its JSON, every task’s files exporting with safe
  names, and the package’s contents.
- The export browser test downloads both ZIPs, unpacks them and checks the README,
  both PDFs and the submitted code.

---

## 2026-11-01 · Milestone 5.6: PDF exports

### Built

- An **Export** section in the Portfolio app, with a “Name on your documents” field and
  two downloads:
  - **Portfolio PDF:** a cover page (name, careers, honesty statement), a contents page
    with page numbers, then every included item, featured first.
  - **Competency report PDF:** how levels are decided, every competency with its
    reasons and evidence, areas to improve, recommended next steps and experience.
- **Download as PDF** on each item’s page.
- Each item shows what was asked, the grade, every check and why it matters, the
  player’s note, and **the work itself as handed in**: spreadsheets as tables of the
  values shown (formulas calculated), reports as headings, text, lists and tables,
  slides slide by slide with speaker notes, ticket queues as tables, code as numbered
  listings, and professional-tool files as tables of their data.
- Charts (in reports and slides) are drawn as vector graphics with their data table
  underneath. All text is real, selectable PDF text; nothing is a screenshot.
- Page numbers and a footer on every page; text the standard PDF fonts cannot show is
  replaced safely (for example “→” becomes “->”).
- `src/export/blocks.ts` turns any file into blocks (headings, paragraphs, lists,
  tables, charts, code). It works for every tool without per-tool code, and the
  original-file exports in 5.7 will reuse it.
- The PDF code is loaded only when exporting (a separate 145 kB compressed file).

### Dependencies added

- **jsPDF** 4.2.1 and **jspdf-autotable** 5.0.9 (MIT): PDF writing in the browser.
- **pdfjs-dist** 6.4.299 (Apache-2.0), tests only: reads the PDFs back to check text.

### Tested

- 68 new unit tests: blocks for sheets (calculated values, formulas), documents,
  slides, tickets, code and every tool’s sample file; every task’s files export;
  generated PDFs read back with pdf.js (item, report with slides, code, portfolio
  contents page numbers pointing at the right pages, a 48-item portfolio, the
  competency report, safe text).
- New browser test: the portfolio, competency report and item PDFs download with the
  right names, start with a PDF header, and contain the work and honesty statement.
- Checked visually by rendering pages with pdf.js.

---

## 2026-11-01 · Milestone 5.5: Career progress report and recommendations

### Built

- A **Progress report** section in the Portfolio app: one report per career save, with
  a one-paragraph summary, recommended next steps, strongest competencies, every
  competency’s level, areas to improve, experience, weekly review ratings, and the
  honesty statement (simulated work, not employment or a qualification).
- **Recommendations** are rule-based, at most five, and each says **why**:
  1. Resubmit a task that has not passed yet (naming the checks not passed).
  2. Do the next task (naming the skills it trains and the weakest one’s level).
  3. Practise a skill shown only once, through a later task that trains it (skipped
     when the next task already does).
  4. Get to know an unlocked tool not used in any passed work yet.
- “Open task” and “Open tool” buttons act on a recommendation (in the career save in
  use).
- Every statement comes from portfolio items, check results or reviews
  (`src/game/progressReport.ts`); nothing is invented or estimated except the clearly
  labelled practice time.

### Tested

- 5 new unit tests on scripted careers: a new career (no claims, first task
  recommended), a failed task first with its checks, only passed work counted with
  every claim linked to an item, unused tools, and no duplicate “practise” advice.
- The portfolio browser test opens the report, checks the summary, the honesty
  statement and a reasoned recommendation, and follows “Open task”.

---

## 2026-11-01 · Milestone 5.4: Competency and experience record

### Built

- A **Skills** section in the Portfolio app (next to Work), for one career save or all.
- **Competencies** are the game’s skills, with levels calculated only from passed work.
  A task counts when the skill is a main part of it (20 skill points or more):
  - **Demonstrated:** 1 such task. **Practised:** 2.
  - **Proficient:** 3, at least one at a career’s second level or above, with an
    average score of 80% or more.
  - Each level says why in words (“Shown in 3 passed tasks, average score 90%,
    including 1 at level 2 or above”) and what the next level needs. Each piece of
    evidence links to the work.
- **Experience:** tasks completed, attempts, estimated practice time (labelled as an
  estimate), tools used in passed work, and each career’s level and tasks passed.
- **To improve:** the checks not fully passed in each task’s latest attempt, and tasks
  not yet passed, with their skills.
- Nothing is stored: opening tools, visiting careers or failing tasks can never raise a
  level. The rules live in `src/game/competencies.ts` and are shown to the player.

### Tested

- 7 new unit tests: every level boundary (including Proficient refused for level 1
  work only, or a low average), minor use not counting, improvement areas from failed
  and partial checks, and the experience record.
- The portfolio browser test opens Skills, checks a Demonstrated skill and its reason,
  the improvement from a failed resubmission, and the link back to the work.

---

## 2026-11-01 · Milestone 5.3: the Portfolio app

### Built

- A **Portfolio** app on every career’s dock (after Career). It lists every passed task
  in the current career save, or in all saves on this device, newest first, with
  featured work at the top.
- **Filters:** career save, skill, tool, level, “Included only”; **sort** by date, score
  or level. Only options that appear in the work are offered.
- **Item page:** what was asked (summary and objectives), “Completed (passed)”, score,
  rating, pass mark and date; what it demonstrates (skills, tools); every check with
  its result and why it matters; every attempt; and the files handed in.
- **Read-only file viewer:** each file opens in its own app’s editor (Sheets, Docs,
  Slides, Help Desk, Code or the professional tool), exactly as submitted. Later
  changes to working files never reach these copies.
- **Presentation choices:** include in exports, feature, and a note (up to 600
  characters). They are saved straight away and never change the results.
- Reloading returns to the open item. The Career app’s Portfolio section links to it.

### Tested

- 4 new unit tests for filtering and sorting.
- Browser tests open the portfolio after a real pass in five careers and file types:
  Software Development (code, read-only, with note and “include” kept after a reload
  and the “Included only” filter), Finance & Admin (workbook and report), IT Help Desk
  (ticket queue), Data Analysis (workbook) and Accounting (Books).

---

## 2026-11-01 · Milestone 5.2: Backfill, backup and safety

### Built

- **Backfill:** work passed before the portfolio existed now joins it automatically
  each time WorkSim opens (and so after restoring a backup, which reloads the app). It
  uses the best passing attempt and its “Submitted” copies from version history. Check
  names are looked up from the task, since older attempts stored only their IDs.
- Safe to run any number of times: tasks that already have a record are never changed.
- If a submitted copy no longer exists, the record is still created from the grade and
  the file is listed as “not available”.
- Tasks skipped with the development shortcut (no check results) never become evidence.
- **Storage & backup panel:** a new Portfolio section with **Rebuild portfolio**, which
  adds anything missing and says how many items were added. The restore preview now
  shows how many portfolio items a backup holds.
- A problem in the backfill is logged and never stops the game from opening.

### Tested

- 54 new unit tests: a Phase 4-style save gets its record (with the exact submitted file
  and check names), running twice changes nothing, failed and skipped work are ignored,
  a missing file is marked “not available”, a pre-Phase 5 backup (database version 3,
  no portfolio tables) restores and then gets its portfolio, and every task’s checks
  have names.
- New browser test: the portfolio is removed, WorkSim reopens and rebuilds it, and the
  Rebuild button then reports it complete.

---

## 2026-11-01 · Milestone 5.1: Evidence capture and storage

### Built

- Two new database tables (save format version 4): `portfolioItems` (one light record per
  passed task, with a unique key so a task can never appear twice) and `portfolioFiles`
  (frozen copies of the files exactly as they were handed in).
- Passing a task now saves its portfolio record **in the same transaction** as the grade:
  if either fails, neither is saved. Each record keeps the task description, level,
  objectives, skills, tools, score, every check’s result and the history of attempts.
- A failed attempt is never evidence. A weaker resubmission only adds to the attempt
  history; a better one replaces the evidence, keeping the player’s note and choices.
- Every attempt now links the submitted versions of the report and slides too.
- “Submitted” and “Original” versions can no longer be removed from Version history
  (shown with a fixed ★ “Always kept: this is evidence of your work”).
- Backups include the portfolio, and restoring brings it back exactly.

### Decisions taken (owner’s questions left open, recommended defaults used)

- One portfolio per device, covering every career save.
- Free MIT libraries (jsPDF, jspdf-autotable, fflate) will be added at milestones 5.6–5.7.
- Exports will be PDF plus open formats, not native Office files.
- Finance & Admin work is included.

### Tested

- 56 new unit tests: capture rules, all-or-nothing saving, duplicate refusal, protected
  evidence fields, protected versions, backup round-trip, the upgrade from version 3, and
  a record for every one of the 48 tasks.
- New browser test: a Software Development task (fail, pass, weaker resubmission, reload)
  keeps exactly one record with the passed code. The report-task browser test checks
  that the workbook, report and slides are all kept in their roles.
- Full check passes (format, lint, types, 1032 unit tests).

---

## 2026-11-01 · Phase 5 planning: Employability & Career Portfolio

### Done

- Reviewed the persistence layer, submission and grading flow, version history, backup,
  the existing Career-app portfolio section, the editors’ read-only modes and the content
  (6 careers, 48 tasks, 23 skills) at commit `2066dc1`.
- Wrote the plan: [docs/PHASE5_PLAN.md](docs/PHASE5_PLAN.md) (architecture assessment,
  data structures, competency rules, user experience, per-career evidence, integrated
  projects, exports and PDFs, migration and backup, integrity, performance, testing,
  eleven milestones, dependencies, risks).
- No application code was changed. The existing check passes (format, lint, types, 976
  unit tests); the last full browser run (69 tests) passed at Phase 4’s final commit.

### Key decisions in the plan

- A passed submission is frozen into a portfolio record **in the same transaction** as
  its grade, with its own copies of the submitted files and the grading result; one
  record per task (no duplicates), replaced only by a better passing attempt.
- Competencies are the existing skills, with explicit, explainable levels (Demonstrated,
  Practised, Proficient) calculated only from passed work.
- PDFs are generated in the browser with free MIT libraries (jsPDF, jspdf-autotable);
  original files are exported in open formats; ZIP packages with fflate.
- Existing saves are upgraded by an idempotent backfill from kept submission versions;
  submission versions become protected from deletion.

### Found during the review

- Attempts link only the main file’s submitted version, not the report’s or slides’.
- Players can currently un-keep “Submitted” versions in Version history, after which they
  may be cleaned up. The plan protects them in milestone 5.1.

### Waiting for the owner

Four decisions are listed in section 18 of the plan (whose portfolio it is on a shared
device, the new free dependencies, native Office formats, and including Finance & Admin).

: developer tools (terminal, Git, debugger, API Client)

### Built

- **Terminal** in the Code app (a tab next to Tests): `ls`, `cat`, `npm test` (the
  real tests, in the test worker), `clear`, `help`, command history, and `git`.
- **Git**, simulated faithfully over the project’s files and saved with the project:
  `status`, `add` (files or `.`), `commit -m` / `-am`, `log` (and
  `--oneline`), `diff` (working tree or `--staged`, line by line), `branch`,
  `checkout` / `switch` (with `-b` / `-c`; refuses to throw away uncommitted
  work), `merge` (fast-forward, a merge commit when branches changed different files,
  and a clear stop on conflicts) and `restore`. Commits have short hashes and parents;
  the prompt shows the current branch.
- **Debug console** (a tab next to Terminal): call any exported function with arguments
  written as a JSON list, and see what it really returns (including `NaN` and
  `undefined`), its `console.log` output, and errors with the line they happened on,
  highlighted in the editor. Runs in the code worker with the time limit.
- **API Client** (a new tool, from Software Developer): a simulated company timesheet API
  with bearer-token authentication, read and write scopes, validation, persistent data
  and the usual status codes (200, 201, 204, 400, 401, 403, 404, 405, 422); a request
  builder (method, URL, headers, JSON body), environment variables (`{{baseUrl}}`,
  tokens), response viewer, history, a saved collection, an API reference and a bug
  report. It has one planted bug: PATCH does not validate hours.
- **New code checks**: tests run on what is committed on **main**, commits with a meaningful
  message, work done on a branch and merged, a clean working tree, and use of the debug
  console. Code projects can start with a Git repository, and tasks can give a whole model
  project (with its history) as the model answer.
- **Three new Software Development tasks** (the path is now seven; promotions at 300,
  700 and 950 XP):
  - _Your first branch, commit and merge_ (Junior): fix late fees on a branch, test,
    commit with a clear message, merge into main, leave the tree clean.
  - _Why does the report say NaN?_ (Developer): reproduce in the debug console (an empty
    week gives NaN; hours sent as text are concatenated), fix both functions, commit.
  - _Test the timesheet API_ (Developer, API Client): happy and sad paths, permissions, a
    saved collection, and a bug report for the PATCH bug.

### Tested

- Unit tests for Git (status, commits, branches, refusing to lose work, fast-forward and
  merge commits, conflicts, diff order, restore), the terminal (quotes, unknown commands),
  the debug call (values, NaN, logs, errors with the right line), and the API (tokens,
  scopes, validation, persistence, unknown paths and methods, the planted bug). Every
  task’s model answer scores 100% and its starting project fails.
- Browser tests: all three tasks done end to end in the real interface (100% each).

---

## 2026-11-01 · Milestone 4.11: Data Studio for the Data Analysis career

### Built

- **Data Studio** (data preparation, SQL and dashboards), one module with five sections
  that unlock with promotions:
  - **Data** (from Junior): datasets with a raw and a clean view, a profile of every
    column (distinct values, blanks, totals), text with stray spaces highlighted, and
    **applied steps** (trim, capitals, replace, change type, remove duplicates, remove
    blank rows, fill blanks, filter, calculated column, rename, remove column). The raw
    data is never changed; steps can be removed; a step that can’t apply is reported
    and skipped.
  - **SQL** (from Analyst): real SQL with **SQLite** (sql.js, MIT licence, runs in the
    browser: no server and no cost), run in a fresh Web Worker with a 5-second limit,
    over the clean tables; result grids, SQLite’s own error messages, saved queries.
  - **Dashboard** (from Analyst): column, bar, line, pie and single-number tiles built
    from saved queries (reusing the app’s chart drawing).
  - **Statistics** (from Senior): count, mean, median, standard deviation, quartiles,
    split by a group, and correlation with a plain-English reading and a reminder that
    correlation is not cause.
  - **Questions**: the task’s questions, answered in the tool.
- **Four new Data Analysis tasks** (the path is now eight; promotions at 300, 700 and
  1,050 XP):
  - _Clean the bookings export in Data Studio_ (Junior): 40 messy rows to 36 clean ones
    with recorded steps.
  - _Answer the sales questions with SQL_ (Analyst): a JOIN with GROUP BY, top 3 with
    LIMIT, months with strftime, and clients with no orders with LEFT JOIN.
  - _Build the Q1 sales dashboard_ (Analyst): a line for the trend, columns for the
    comparison, a headline number.
  - _Did the training work?_ (Senior): a calculated column, group comparison, correlation,
    the honest conclusion (attendance was voluntary) and a memo for the board.
- Expected answers are calculated from the data in code, never typed in.

### Fixed during testing

- The browser tests found two real problems that unit tests could not: sql.js’s browser
  build needs its own engine file (the first version hung on “Running…”), and two clients
  tied for third place, so “the top 3” had two right answers. The order amounts now give a
  clear ranking, and a unit test guards against ties at the cut-off.

### Tested

- Unit tests for every cleaning step, number and date parsing, failing steps, statistics
  (checked against known values), correlation, SQL on SQLite (joins, LEFT JOIN, errors)
  and result comparison; every task’s model answer scores 100% and its starting file fails.
- Browser tests: the cleaning task and the SQL task done end to end with real SQLite in the
  browser (100% each), and sections locked by level.

---

## 2026-11-01 · Milestone 4.10: Digital Marketing tools

### Built

Four separate tools, each a module registered with the tools framework:

- **Social Planner** (social media scheduling): posts per channel with live character
  counts and each channel’s rules (X 280 characters; Instagram needs an image and
  allows no links), images, a week calendar, best posting times per channel, blackout
  periods (website maintenance), and two-hour spacing per channel. Editing a scheduled
  post sends it back to draft to be checked again.
- **SEO Audit** (search engine optimisation): the company website as a crawler sees it.
  A crawl lists issues by type (title missing, too long or short, duplicated; meta
  description missing or wrong length; no H1; images without alt text; broken links),
  and the list only updates when the site is crawled again. Page editor with length
  counters and a search-result preview, keyword data (volume and position) and
  redirects for removed addresses.
- **Ad Campaigns** (paid advertising): campaigns and ad sets with 14 days of realistic
  daily results (generated from typical rates, repeatable), CTR, CPC, CPA, revenue and
  ROAS, switches and daily budgets with an account limit, **budget pacing** (spent,
  projected month, the daily budget that lands exactly on budget) and a change history.
- **Site Analytics** (website analytics): a fortnight of traffic by source, device and
  landing page, explored by any dimension with filters, a booking funnel (arrived →
  pricing → form started → booked) with drop-off at each step, saved reports, and a
  questions panel for the task’s questions. The data hides a real problem: the booking
  form almost never works on phones.
- **Progressive unlocking**: Social Planner from Marketing Assistant; SEO Audit and Ad
  Campaigns from Executive; Site Analytics from Specialist.
- **Four new Marketing tasks** (the path is now eight; promotions at 300, 700 and 1,050
  XP):
  - _Schedule the launch week_ (Assistant, Social Planner): five posts on three channels,
    on brand, at the best times, around a maintenance window.
  - _Get the website ready for search_ (Executive, SEO Audit): fix all 15 issues, target
    “free business review” on the offer page, confirm with a second crawl.
  - _Rescue the April ad budget_ (Executive, Ad Campaigns): pause the three ad sets
    with ROAS below 1, keep the profitable ones, move budget to the best one that is
    held back by its budget, and land the month at 95–100% of budget.
  - _Where do the bookings go?_ (Specialist, Site Analytics + Docs): find the broken
    mobile form, size it (about 108 bookings lost in two weeks), answer the questions,
    save the views, and recommend the fix in a memo.

### Tested

- Unit tests for each tool’s rules (channel limits, blackouts, spacing, back-to-draft;
  the seeded SEO issues, re-crawl behaviour, duplicate titles, unsafe redirects; pacing,
  the daily limit, ratios from totals; consistent analytics data), and for every task:
  model answer 100%, starting file fails.
- Browser tests: the launch week and the budget rescue done end to end (100% each), and
  the SEO audit’s fix-then-recrawl behaviour.

IT support tools (Directory and Network Tools)

### Built

- **Directory** (identity and asset management): user accounts with sign-in names,
  status, lockouts, failed sign-ins and where they came from, MFA and “must change
  password”; actions to create, disable and enable accounts, unlock, reset passwords
  (a reset no longer unlocks: the two are separate decisions), reset and register MFA,
  and add and remove groups; security groups with what each gives access to, privileged
  groups marked; an asset inventory (laptops, phones, monitors) with assignment, return,
  report lost, repair, retire and warranty status; and an **audit log** of every change.
  Sample data uses the company’s own people across all departments.
- **Network Tools** (network diagnostics): a simulated office network (server room, two
  floors, router, firewall, internet link, servers with services, printers, laptops) and
  a console that runs `ping`, `ipconfig`, `nslookup`, `tracert` and
  `portcheck` with realistic output, from your PC or **from a user’s computer** over a
  remote session (with command history). Faults live in the network itself, so every
  command answers consistently: stopped services, wrong gateways, wrong DNS servers,
  wrong DNS records, IP conflicts, dead devices. Remote fixes (restart a crashed device
  or a service, switch a computer to automatic settings, correct a DNS record), a
  network map, DNS records, and **findings** (device, fault, evidence). Devices that
  are physically down cannot be fixed remotely: they must be escalated.
- **Help Desk**: a priority guide (impact × urgency matrix, matching the knowledge base)
  on every ticket; clicking a cell sets the priority.
- **Four new IT tasks** (the path is now eight; promotions at 300, 700 and 1,050 XP):
  - _A new starter and a lost phone_ (Trainee, Directory): an account with exactly the
    requested access, MFA, equipment from stock; a lost phone reported, MFA reset and
    the phone replaced.
  - _A leaver, two lockouts and a request_ (Analyst, Directory): full offboarding; a
    verified user unlocked; an account under attack (214 failures from abroad, owner on
    holiday) kept locked with its password reset; a request for admin rights refused.
  - _Nobody can print, and Maya can’t get online_ (Analyst, Network Tools): a stopped
    print spooler (ping works, the port doesn’t) and a hand-typed wrong gateway.
  - _Monday after the change_ (Senior, Network Tools): a DNS record missed in a server
    move, a laptop using a public DNS server, and an access point needing a site visit.
    Graded on the actual state (accounts, groups, devices, what resolves and answers from
    where), the findings and the evidence gathered in the console.
- Network Tools unlocks at Service Desk Analyst; Directory is available from the start.

### Not built (yet)

- From the plan for the service desk: SLA countdown timers, linking tickets to
  incidents and an editable knowledge base. The Help Desk already covers queues,
  priorities, categories, statuses, replies, notes and a read-only knowledge base;
  knowledge articles are written in Docs.

### Tested

- Unit tests for both scenarios (each symptom appears with the right commands, each fix
  works, the access point can’t be fixed remotely), and for every task: the model answer
  scores 100%, the starting file fails.
- Browser tests: the new-starter task and the Monday incident done end to end in the
  real interface (100% each), and Network Tools locked for a trainee.

Books, complete accounting software

### Built

- **Sales and Purchases**: customers and suppliers (added on the fly), invoices and bills
  with lines, quantities, prices, income or expense accounts and VAT per line, live
  totals, and plain-English problems before approval (missing details, wrong kind of
  account, a supplier reference already entered: “is it a duplicate?”). Approving posts
  the journal (receivables, income and VAT; or expenses, reclaimable VAT and payables).
  Payments in and out post to the bank, can be partial, and can be removed if keyed in
  wrongly. Payment status (awaiting, part paid, paid, overdue) and **aged receivables
  and payables** by how late they are.
- **Banking**: an imported bank statement; each line is matched to the entry in Books
  with the same amount, or recorded to an account if the books are missing it (bank
  charges, direct debits). A live reconciliation shows the statement and book balances,
  items in Books that are not on the statement yet (unpresented), the difference and
  the status.
- **Payroll** (simplified UK rules, explained on screen): employees, monthly pay runs
  with gross pay, income tax, National Insurance, pension and net pay per payslip;
  recalculation after changes; posting the payroll journal (wages; amounts owed to the
  tax office and pension provider; net pay from the bank).
- **Progressive unlocking**: Sales, Purchases and Banking open at Assistant Accountant;
  Payroll at Accountant. Locked sections show a padlock and when they unlock.
- **Four new Accounting tasks** (the path is now nine tasks, mixing Books with
  Sheets, Docs and Slides; promotion thresholds rebalanced to 300, 700 and 1,050 XP):
  - _Invoices, bills and payments in Books_ (Assistant Accountant): two invoices, a
    customer payment, two bills, an overdue bill paid, and a supplier reminder for a bill
    that is already in the books.
  - _Reconcile the bank in Books_ (Assistant Accountant): match the statement, record a
    direct debit and bank charges, and find a receipt keyed in as 1,250 instead of 1,520
    (correct the books, never the statement); an end-of-month payment stays unpresented.
  - _Run March’s payroll_ (Accountant): a new starter and a pay rise, then the pay run.
  - _Close March and report to the board_ (Senior Accountant): depreciation, a prepayment
    and two accruals in Books, then the management accounts in Docs, with income, net
    profit and cash checked against the closed books.
- Report figures in Docs and Slides can now be checked against fixed values, so tasks
  done in a tool (rather than a workbook) can have written deliverables.

### Tested

- Unit tests for invoices and bills (posting, VAT, part payments, overpayment refused,
  duplicates, ageing), reconciliation (matching, recording, unpresented items) and
  payroll (a payslip checked by hand: £3,000 gross → £2,303.34 net; posting); a test
  that every Books action leaves a valid file (a bug found by the browser tests: a new
  bill with no reference yet was silently refused by the save layer); and the model
  answer of every new task scores 100% while the starting file fails.
- Browser tests: the invoicing, bank reconciliation and payroll tasks done end to end in
  the real interface (100% each), and sections locked by level.

the professional-tools framework, and Books

### Built

- **Research and plan**: [docs/PROFESSIONAL_TOOLS.md](docs/PROFESSIONAL_TOOLS.md) records
  the software professionals in each field use, what WorkSim simulates (original names
  and interfaces, no copied branding), the framework design and the build order.
- **The professional-tools framework** (`src/tools/`): a tool registers once (its
  saved-state schema, sections, practice data, guide and glossary, the checks tasks can
  use and a pure grader); a career lists the tools it uses, from which level, and when
  each section unlocks. The desktop, saving, grading and portfolio need no changes for
  new tools:
  - **Saving**: tool files are one generic document kind (`tool`), validated by the
    tool’s own schema, so they get autosave, the emergency journal, **undo and redo**,
    version history, backups and restore.
  - **Tasks**: `kind: 'tool'` tasks carry the starting file (the scenario), a model
    answer and the tool’s checks, all validated against the tool when the game loads.
  - **Desktop**: tools appear on the career’s dock; locked tools show a lock and when
    they unlock. Each tool has a start page (sections, task files, a practice file with
    sample data, the guide) and a window with the task pane, Guide, Undo/Redo and
    Version history.
  - Screens are loaded only when a tool is first opened.
- **Books**, the accounting software (first tool): a chart of accounts; journals with a
  live balance check and plain-English problems (“Debits (418.80) and credits (481.80)
  must be equal”); posting (posted journals are never edited, only reversed); account
  ledgers with running balances; and live reports (trial balance, profit and loss,
  balance sheet, as at any date). The data model already covers sales, purchases,
  banking and payroll for milestone 4.8.
- **First Books task** (Accounts Trainee): _Post March’s journals in Books_: rent,
  equipment (not an expense), a transfer, interest and an accrual, plus a colleague’s
  draft with a transposition error to find and fix. Graded on the journals actually
  posted, the resulting balances, and nothing left in draft. The Accounting path is now
  five tasks; earlier saves are unaffected.

### Tested

- Ledger tests (posting rules, every refusal message, reversals, reports by date, penny
  accuracy) and framework tests (every tool complete; careers only list tools, levels
  and sections that exist; unlocking by level; every tool task’s model answer scores
  100%, its starting file fails, and a missing or wrong file scores nothing).
- Browser tests: the Books task done end to end in the real interface (100%), and the
  practice file with undo, redo and saving across a reload.

---

## 2026-10-31 · Milestone 4.6: the Software Development career and the Code app

### Built

- **Code**, a new app (developers genuinely need one): a file list, a plain-text
  editor with line numbers, Tab and auto-indent, read-only files, and **Run tests**
  with a pass/fail list, the reason for each failure (“Expected 1420, received 121”)
  and console.log output. Projects are a new document kind (`code`), so they get
  autosave, version history, backups and the portfolio like every other file.
- **Safe test runner**: the player’s JavaScript runs in a fresh **Web Worker** for every
  run, with a 5-second limit, so an endless loop is stopped with a clear message instead
  of freezing the game. Files can use `import`/`export`; tests use `test`,
  `describe` and `expect(...).toBe/toEqual/toThrow/…`. No external services.
- **Code grading** (pure, unit-tested): hidden tests (like a reviewer’s), the project’s
  own tests as the task wrote them (editing the test file does not help), the player’s
  own tests (enough of them, all passing), and **mutation testing**: the player’s
  tests are run against copies of the code with bugs planted in them, and must catch
  each one.
- **Engineering department**: Engineering Manager Samuel Adeyemi and Senior Software
  Engineer Rosa Ferreira. Levels: Junior Developer → Software Developer → Senior
  Developer → Lead Developer. New skills: programming, debugging, software testing and
  software design. Tools: Code and Docs.
- **Four tasks**, beginner to advanced:
  1. **Fix the invoice totals**: three real bugs (a loop that skips the first line,
     - instead of ×, a percentage used as a fraction), found from failing tests.
  2. **Check timesheet entries**: turn written rules into validation code with the
     exact messages, in order, and total the valid hours per project.
  3. **Write the tests for working days**: the code is correct; the player writes the
     tests, which must catch five planted bugs (Saturdays, Sundays, holidays, the last
     day, reversed ranges).
  4. **Build the billing report**: a feature from a specification (billable time only,
     rates, rounding, sorting, an error for a missing rate), the player’s own tests, and
     a design note in Docs (Problem, Approach, Testing).

### Tested

- Runner tests (modules, matchers, syntax errors, missing files) and code grading tests
  (model answers score full marks, untouched projects score under half, partial fixes
  get partial credit, editing the test file doesn’t help, failing tests can’t earn
  mutation credit, every planted bug exists in its file).
- Browser test: a Software Development career from onboarding; the tests fail first, the
  test file is read-only, an endless loop is stopped after 5 seconds, the fixed code
  passes and the task scores 100%.

---

## 2026-10-31 · Milestone 4.5: the Data Analysis career

### Built

- **Data & Insights department**: Head of Data & Insights Amara Nwosu (calm, precise,
  always asks “how do you know?” and “so what?”) and Senior Data Analyst Kenji Sato
  (methodical, checks everything twice). Levels: Junior Data Analyst → Data Analyst →
  Senior Data Analyst → Lead Data Analyst. New skills: data cleaning, data
  visualisation and insight communication. Tools: Sheets, Docs and Slides.
- **New spreadsheet functions** that analysts rely on: SUMIFS, COUNTIFS and AVERAGEIFS
  (several conditions at once; ranges must be the same size), SUBSTITUTE and VALUE (for
  cleaning text into numbers). They work in every career, with help text and
  autocomplete. Autocomplete now lists the most common functions first, so `=SU` still
  offers SUM before SUBSTITUTE (the full browser run caught this).
- **Four tasks**, beginner to advanced:
  1. **Clean the customer export**: a messy CRM export (stray spaces, mixed capitals,
     amounts as text with “GBP”, duplicate customers). Clean it in new columns with
     TRIM, PROPER, LOWER, SUBSTITUTE and VALUE, flag duplicates with COUNTIF, and
     summarise; the raw data must stay untouched.
  2. **Sales by region and product**: a pivot-style table with one SUMIFS filled across
     and down (mixed references), totals both ways, orders, average order and large
     orders with COUNTIFS and AVERAGEIFS, the best region and a chart.
  3. **What the client survey says**: satisfaction by team (averages, satisfied share,
     days to resolve, would recommend), the lowest team and the median, a chart, and an
     insight memo with the finding, the evidence, a recommendation and an honest caveat.
  4. **Annual client portfolio review**: growth and revenue per hour for each client,
     a sector summary with SUMIF and COUNTIFS, the fastest-growing client and sector, a
     chart, a review in Docs and board slides.

### Tested

- Engine tests for the new functions (several conditions, mismatched ranges, missing
  conditions, empty averages, cleaning text into numbers).
- Content tests: every model answer scores 100%; figures checked by hand (total spend
  19,151.50 with 4 duplicate rows; West best at 13,600; Audit lowest with 25% satisfied
  and 6.4 days to resolve; portfolio 806,000, up 4.5%, healthcare up 22%).
- Browser test: a Data Analysis career from onboarding, with the first task done end to
  end (100%).

---

## 2026-10-31 · Milestone 4.4: the Digital Marketing career

### Built

- **Marketing department**: manager Sofia Alvarez (creative and ruthlessly data-driven)
  and Senior Digital Marketer Leo Brennan (guards the media budget). Levels: Marketing
  Assistant → Digital Marketing Executive → Specialist → Manager. New skills: campaign
  analytics, copywriting and content strategy. Tools: Sheets, Docs and Slides (no new
  tool was needed: marketers do this work in exactly these apps).
- **Four tasks**, beginner to advanced:
  1. **Campaign performance by channel**: CTR, CPC, conversion rate, CPA and ROAS for
     five channels and the whole campaign (from totals, not averages), flag the
     channel that loses money, and find the best one with INDEX and MATCH.
  2. **Content calendar and launch email**: check every draft post against its
     channel’s house-style limit (LEN and VLOOKUP), count posts per channel, and write
     the launch email in Docs with the offer, the code, the link and one call to action.
  3. **Which subject line won?**: an email A/B test: totals per version with SUMIF,
     open, click and click-to-open rates, uplift, the winner, and a recommendation
     memo backed by the figures.
  4. **Quarterly campaign report**: three months by channel with SUMIF, ROAS and cost
     per lead, the best channel, a chart, a report in Docs and a deck in Slides.

### Tested

- Content tests: every model answer scores 100%; figures checked (best channel Email,
  B wins with 43% more clicks, Q1 revenue 144,100 on 24,350 spend).
- Browser test: a Marketing career from onboarding, with the first task done end to end
  (100%).

---

## 2026-10-31 · Milestone 4.3: the IT Help Desk career

### Built

- **A Help Desk app** (a new tool, because support work genuinely needs one): a ticket
  queue with filters; each ticket shows the requester's message, and the analyst sets
  the **priority** (P1–P4, with what each means and its response time), **category**
  and **status** (new, open, pending, escalated, resolved), writes a **reply** to the
  user and an **internal note**. A **knowledge base** panel holds the desk's guides.
  Ticket queues are a new document type, so they autosave, recover after crashes,
  have version history and are in backups like every other file.
- **Tasks can be built around a ticket queue** instead of a workbook (the assignment
  `kind`); reports and presentations can be added to either. Ticket checks compare
  priorities, categories and statuses with the model answer, and check replies for
  the things they must say (and enough words).
- **IT Services department**: manager Ravi Menon (calm, measures everything), Senior
  Support Analyst Jess Taylor (fixes things before you finish describing them).
  Levels: Service Desk Trainee → Analyst → Senior Support Analyst → Team Lead. Skills:
  troubleshooting, customer service, incident management, technical writing.
- **Four tasks**, beginner to advanced:
  1. **Triage the morning queue**: eight tickets by impact and urgency, the right
     categories, and a phishing report escalated with a reassuring reply.
  2. **Reply to users**: a password reset (self-service, never by email), printer
     troubleshooting steps, asking the right questions about a VPN error, and an
     access request that needs the manager's approval.
  3. **One problem, many tickets**: spot five reports of one Outlook fault, resolve
     them all with the tested fix, and write a knowledge-base article in Docs
     (symptoms, cause, resolution).
  4. **Major incident: email outage**: triage the flood, update users during the
     outage, then write the incident report (summary, timeline, impact, root cause,
     actions) and brief management in Slides.
- Task text can name the department's people (`{manager}`, `{senior}`,
  `{director}`); names are filled in for each task's career.

### Tested

- Unit tests: new queues start untouched; correct triage and a good reply get full
  marks; wrong priorities and a weak reply get specific notes; a missing queue scores
  nothing; names in task text. Content tests apply each task's model answer.
- Browser test: an IT career from onboarding, triaging all eight tickets in the Help
  Desk, escalating and replying to the phishing report, submitting (100%).

---

## 2026-10-31 · Milestone 4.2: the Accounting career

### Built

- **The Accounting department**: manager Daniel Okoro (methodical; teaches by asking
  questions) and Senior Accountant Helen Park (brilliant, impatient with sloppiness),
  with its own stand-up, planning (the month-end close and the auditors), tips and
  notice board.
- **Levels**: Accounts Trainee → Assistant Accountant → Accountant → Senior Accountant,
  with the same XP, reputation and review rules as Finance.
- **New skills**: bookkeeping, reconciliation and financial reporting.
- **Four tasks**, from beginner to advanced:
  1. **Record the week’s transactions** (Trainee): choose the debit and credit account
     for eight transactions (dropdown lists of the chart of accounts), then build the
     ledger with SUMIF and prove that debits equal credits.
  2. **Reconcile the bank account** (Trainee): match the cash book and the statement
     with COUNTIF, find unpresented cheques, outstanding deposits and an unrecorded
     bank fee, and show that the adjusted balances agree.
  3. **Depreciation schedule and memo** (Assistant Accountant): straight-line
     depreciation, MIN to stop at the residual value, IF for fully depreciated assets,
     and a memo in Docs for the CFO with this year’s charge and net book value.
  4. **Month-end: trial balance and results** (Accountant): debit and credit columns
     with IF, a balanced trial balance, an income statement with SUMIF by account type
     and margin, and a management report in Docs.
- Task workbooks can now ship with dropdown lists (data validation).

### Tested

- Content tests: every Accounting model answer scores 100%; key figures checked by
  hand (debits = credits = 17,220; reconciled at 14,050; net profit 6,465).
- Browser test: an Accounting career from onboarding: the manager in the office, the
  dock, the welcome email, and the first task done end to end with the dropdowns
  (100%).

---

## 2026-10-31 · Milestone 4.1: a reusable career and department framework

### Built

- **Departments as data** (`src/content/departments/`): each department defines its
  manager and senior colleague, who the manager reports to, what the team does, what
  people say at the stand-up and weekly planning, the senior colleague's introduction
  and small talk, practical tips and notice-board news. Reception, facilities and HR
  (Nina, Tom, Grace) are shared by every department.
- **Roles instead of names**: game rules refer to "the manager" and "the senior
  colleague"; text uses `{manager}`, `{senior}`, `{department}` and `{director}`,
  filled in for the active department. Events, meetings, reviews, conversations,
  reminders, the day log, emails and the 3D office (the wall sign, "Daniel's office",
  "Talk to Helen") all follow automatically. Stories tied to Finance tasks stay in
  Finance.
- **Careers as data** (`src/content/careers.ts`): description, levels, the skills it
  develops, the tools on the dock, and a sentence for the welcome email.
- **One save per career**: the existing Finance save is untouched. New players choose a
  career at onboarding; the Career app lists every career with progress and can start
  or switch careers. Each career keeps its own progress, colleagues, office clock,
  reviews and files.
- **Files belong to a career**: documents record their owner; Docs, Slides, the
  "insert from Sheets" picker and Mail attachments show only the current career's
  files (plus older files made before careers existed).
- **Portfolio** (Career app): every task passed in the career, with score, level, date,
  skills and buttons to open the files.

### Fixed

- After switching careers, a last save from the closing desk could put the old career
  back on screen. Late saves from a career that is no longer shown are now kept but
  not shown.

### Decisions

- The framework is the reuse: a new career is a career entry, a department file and
  its tasks. Mail, Tasks, Sheets, Docs, Slides, grading, reviews, events and the office
  are shared.
- Separate saves per career (rather than one save holding every career) keep each job
  independent and kept the existing save format unchanged.

---

## 2026-10-31 · Milestones 3.4–3.5: connected apps and multi-application assignments

### Built

- **Assignments with several files**: a task can include a report (Docs) and a
  presentation (Slides) as well as its workbook. Starting the task creates all three
  from templates (each with an "Original" version) and links them to the task. The
  Tasks app lists them ("Your files for this task") with buttons to open each one, and
  Docs and Slides show which task a file belongs to (task files cannot be deleted).
- **Mail with attachments**: Reply to a colleague's email, write a message, and attach
  any of your files (workbooks, documents, presentations). A Sent folder keeps what
  you sent, with its attachments.
- **Handing in by email**: replying to a task email hands the work in. Exactly the
  attached files are graded, so forgetting to attach the report is a real mistake
  with a clear explanation ("No report was attached"). Priya replies with feedback, and
  the usual results window shows every check. The task's own files are attached
  automatically; any other file can be attached instead.
- **Grading reports and presentations** (`src/game/deliverables.ts`), the way a
  manager reads them:
  - **sections**: the expected headings (report) or slide titles (presentation);
  - **figures**: the key numbers, compared with the model answer of the workbook, so
    a report built on a wrong analysis is caught; formatting and sensible rounding are
    accepted ("$227,300", "227.3k", "about $227,000");
  - **mentions**: the important facts (e.g. which departments overspent);
  - **charts**, **tables** and **length** (words or slides).
- **A workbook chart check**: a task can require a chart of certain cells.
- **Two multi-application assignments**, progressively harder:
  - **Monthly departmental performance report** (Junior, task 7): variances, totals
    and a chart in Sheets; a report with an executive summary, findings and
    recommendations, the key figures and the chart; 4–8 slides with the headline
    figure and the chart; then email all three. Step-by-step guidance.
  - **Supplier cost review and savings proposal** (Finance Assistant, task 8):
    percentage changes, a 10% threshold, a SUMIF-based savings estimate; a proposal
    (problem, proposal, savings, recommendation) naming the suppliers to renegotiate;
    5–10 slides with the saving and a recommendation. Much less guidance.
- In the workbook's task pane, multi-file tasks offer "Hand in all your files…"
  instead of submitting the workbook alone.
- A development-only `window.__worksim.skipTo('performance-report')` marks earlier
  tasks as done, for testing.

### Tested

- Unit tests: numbers in text (separators, decimals, k, %, rounding, signs); a
  correct report and presentation get full marks; a vague report gets specific notes
  (missing headings, figures, departments, chart, length); missing attachments score
  zero with an explanation; starting a task creates its report and presentation.
  Content tests check every deliverable's template and every check ID.
- Browser tests: the whole journey (email → task → analysis and chart in Sheets →
  report with the chart in Docs → slides with the figure and chart → reply with three
  attachments → 100%); and handing in without the report.

### Known limitations (Phase 3)

- **Docs**: no pictures inside documents, no comments or tracked changes, and no
  export to Word files (Print / Save as PDF works). Page breaks are shown as lines
  rather than as separate pages while editing.
- **Sheets**: charts live in a side panel rather than floating over the grid; one
  filter per sheet; sorting is by one column at a time.
- **Slides**: no rotation, animations or tables; text formatting applies to a whole
  text box; no export to PowerPoint files.
- **Grading of reports and slides is rule-based**: it checks structure, figures, key
  facts, charts and length, not the quality of the writing. Priya's written feedback
  makes this clear by pointing at specific, fixable problems.
- Charts placed in Docs and Slides are copies: they do not change when the workbook
  changes (insert the chart again to update it).

---

## 2026-10-31 · Milestone 3.3: Slides

### Built

- **A presentation editor** (built in-house, no new dependencies): slide thumbnails,
  the slide canvas scaled to fit, and speaker notes.
  - **Slides**: add (choosing a layout), duplicate, delete (never the last one), move
    up and down.
  - **Layouts**: title slide, title and content, two columns, section header, title
    only, blank. Changing a slide's layout keeps its text.
  - **Themes**: corporate blue, midnight, fresh green, warm (backgrounds, text and
    accent colours; title and section slides use the theme's strong colour).
  - **Elements**: text boxes (size, bold, italic, bullets, alignment, colour), shapes
    (rectangle, rounded rectangle, ellipse, arrow, line; fill colour; text inside),
    pictures from the computer (shrunk to at most 1280 px so files stay small), and
    charts from Sheets. Click to select, drag to move, drag the handles to resize,
    double-click to type, arrow keys to nudge, Delete to remove, bring to front or send
    to back. Undo and redo.
- **Presentation mode**: full screen; next with →, Space, Page Down or a click; back
  with ←; Home/End; Escape ends it.
- **Templates**: monthly business review, project update and proposal, each with a
  sensible structure and [placeholders], plus a blank presentation.
- **Saving like every other file**: autosave, crash recovery, version history,
  backups and restore, rename, the file list.

### Fixed

- **A safety net in the shared save code**: a change that would make a file invalid is
  now refused (and reported in the console) instead of being saved. Found by the new
  browser test: a tiny picture was placed at an invalid size, autosave kept retrying
  the invalid file, and nothing after it could be saved. New elements are now always
  given a valid size, and tiny pictures are enlarged to be visible.

### Tested

- Unit tests: every template is a valid presentation; adding, duplicating, moving and
  deleting slides; never deleting the last slide; changing a layout keeps the text;
  adding, changing, reordering and removing elements; keeping elements on the slide.
- Browser test: a template, a new slide with typed text, a shape moved by dragging, a
  picture, a theme, duplicating and deleting slides, presenting with the keyboard, and
  everything still there after a reload.

---

## 2026-10-31 · Milestone 3.2: advanced Sheets

### Built

- **Charts** (toolbar: Chart): column, bar, line and pie charts drawn live from a
  range (first column = labels, first row = series names), with a title; edit the
  type, title and range, or delete. They redraw as the data changes and are saved with
  the workbook.
- **Sorting** (A→Z, Z→A, also from a filter menu): sorts the table around the cursor
  by the current column, keeps a header row in place, puts empty cells last, keeps
  formatting with its row and adjusts formulas like cut-and-paste (`=B2-C2` moves
  with its row).
- **Filtering** (toolbar: Filter): filter buttons on the header row; tick the values to
  show. Hidden rows are saved, and an active filter is highlighted.
- **Conditional formatting** (toolbar: Rules): highlight cells when they are greater
  or less than, between, equal to, contain text, or are empty, with a fill, text
  colour and/or bold. Uses calculated values, so formulas count.
- **Data validation** (Rules): a list of choices (with a dropdown on the cell, and
  typing in any case is tidied to the listed spelling) or a number with optional
  minimum, maximum and whole-number rule. Invalid input is refused with an
  explanation; formulas and clearing a cell are always allowed.
- **Formatting**: underline (Ctrl+U) and text colour.
- **Sheets data in reports**: Docs can insert a chart from any workbook, or a range of
  cells as a table (as displayed, with its number formats), from the new "Chart" and
  "Data" toolbar buttons.
- Workbook format 3 (the new fields are optional; older workbooks open unchanged).

### Fixed

- Inserting a chart or table in Docs selected it, so a second insert replaced it. The
  cursor now moves to a new line below.
- Category labels under a single-series chart were drawn outside the chart.

### Tested

- Unit tests: chart data from ranges (labels, series, calculated values, pie),
  conditions and conditional styles, list and number validation, filters, the table
  around a cell, sorting with a header and formulas.
- Browser tests: sort, filter, chart and reload; conditional formatting; validation
  (refusal, tidying, dropdown); a chart and a table from Sheets in a Docs report,
  surviving a reload. The formula engine and all earlier tests are unchanged.

---

## 2026-10-31 · Milestone 3.1: Docs

### Built

- **A document editor** built on TipTap (MIT licence, on ProseMirror, MIT; licences
  checked, no other licences in the dependency tree): headings 1–3, paragraphs, bold,
  italic, underline, strikethrough, font sizes, text colour, alignment (left, centre,
  right, justified), bulleted and numbered lists, tables (insert, add/delete rows and
  columns, header row), horizontal lines and page breaks. Keyboard shortcuts work
  (Ctrl+B, Ctrl+Z…), as does undo/redo.
- **Page layout**: an A4 or Letter page with normal, narrow or wide margins; page
  breaks; **Print** (or save as PDF from the print dialog) prints just the page.
- **Document organisation**: an outline of the headings (click to jump), a word count,
  and a file list with rename and delete.
- **Templates**: business report (summary, background, findings table,
  recommendations, next steps), memo, business letter and meeting minutes (details
  table, agenda, decisions, action table), each with [placeholders] and the player's
  name filled in.
- **Saving like every other file**: autosave, the emergency journal (crash recovery),
  version history (preview, restore, keep), backups and restore. A new
  `doc` document type in the same database; nothing else had to change.

### Decisions

- **One save hook for every app**: the spreadsheet's save logic was generalised into
  `useSavedDocument` (autosave, journal, versions, crash recovery, restore, rename);
  Sheets, Docs and Slides all use it. Docs keeps its own undo history (the editor's),
  so it replaces content without adding app-level undo steps.
- **A shared document window** (`DocumentFrame`): rename by clicking the title, save
  indicator, version history, recovery banner.
- Documents are stored as the editor's JSON (validated loosely on load, strictly by
  the editor), so formatting is never lost and grading can read the structure.
- **Charts** are drawn by a small in-house SVG component (`ChartView`: column, bar,
  line, pie), shared by Sheets, Docs and Slides. No chart library was needed.

### Tested

- Unit tests: text extraction, word count, outline, every template is a valid
  document, documents and their versions survive a backup and restore.
- Browser tests: writing and formatting (heading, bold, list, table), outline,
  renaming, autosave and reload, keeping a version, the file list; a template, and
  deleting a file.

---

## 2026-10-31 · Milestone 2.5: career expansion, reviews and promotion criteria

### Built

- **Three Junior Finance Assistant tasks**, unlocked by the promotion (each with a
  briefing, steps, hints, a model answer, "what if the data changes" scenarios and
  feedback):
  - **Budget vs actual report**: SUMIF across sheets with absolute references
    (`$C$2:$C$17`), variance, percentage of budget used (percent format), over-budget
    flags and monthly totals.
  - **Weekly payment run**: IF with AND (approved and due within 7 days; overdue but
    unapproved invoices stay on hold), COUNTIF with `"<0"`, and one payment per
    supplier with SUMIF.
  - **Petty cash reconciliation**: expected vs counted cash, ROUND against tiny
    calculation differences, ABS for a tolerance either way, and missing receipts with
    COUNTIF and SUMIF.
- **Tasks are tied to levels**: Junior tasks stay locked until the promotion; a
  promotion emails the first task of the new level (with a deadline), and Priya
  congratulates the player in person.
- **Weekly performance reviews** (`src/game/reviews.ts`) at Friday's one-to-one, or
  by email if it is missed. Four areas scored 1–5 from the player's real record:
  quality of work (best scores), reliability (deadlines and meetings this week),
  teamwork (colleagues' trust) and professionalism (reputation). Overall: Developing,
  Solid, Strong or Outstanding, with strengths and things to work on. Wellbeing is
  discussed (long days, skipped lunches, fatigue) but never scored. At the meeting the
  player can ask how to improve, respectfully point out missed evidence, or argue.
- **Promotion criteria** beyond XP and tasks: Junior needs a reputation of 35; Finance
  Assistant needs 50 and a review of at least "Solid"; Finance Officer needs 60 and
  "Strong". A good review can complete a promotion that was waiting for it.
- **Career app**: the promotion checklist shows the new requirements; a "Performance
  reviews" section keeps every review. Review emails link to the Career app.
- `advanceCareer` runs after every change, so promotions and new tasks are never
  missed (also for careers saved before this version).
- A development-only `window.__worksim.setTime(day, minute)` hook for browser tests.

### Tested

- Content tests: every new task's model answer scores 100% and an untouched workbook
  fails.
- Unit tests: level locks, the promotion unlocking the Junior tasks, reputation and
  review requirements; reviews of a good week and of a week with missed meetings and
  deadlines; wellbeing mentioned but not scored; one review per week; the email
  review after a Friday without a one-to-one; a promotion completed by a review.
- New browser test: Friday's one-to-one, the review conversation, the written review
  and the Career app.

---

## 2026-10-31 · Milestone 2.4: workplace events

### Built

- **An event system** (`src/game/events.ts`). Events are never random: each is caused
  by the player's own results, workload, deadlines, relationships or wellbeing, and is
  checked after every change. At most one waits at a time, only during working hours.
  The person comes to the player: a "wants a word" card in the office, and a reminder
  at the computer ("Priya has come over to your desk"), which never blocks work.
- **The events**, each with choices, visible effects and a workplace tip:
  - **Feedback on a mistake** (after any submission that does not pass, once per
    task): own it, blame the instructions, or doubt yourself. Dropped if the player
    fixes the work before Priya comes over.
  - **Recognition** (first excellent result on a first attempt): accept it, share
    credit with Marcus (if he helped), or downplay it.
  - **Jealousy** (after recognition, if Marcus is not yet an ally): acknowledge his
    experience, stay professional, snap back, or complain to Priya.
  - **Credit-taking** (after the expense summary, once the next task has started):
    Marcus presented your summary as his. Clarify calmly with evidence, talk to him
    privately first (his response depends on trust), accuse him publicly, or let it go.
  - **A difficult manager** (after a missed deadline): Priya is curt and under
    pressure. Respond to the need, not the tone; or make excuses; or silently overwork.
  - **An unexpected request** from Tom (help check a delivery, 15 minutes). Saying no
    with a reason is fine when busy; "later" without meaning it is noticed. Ignored
    for an hour, the request lapses with a small cost.
  - **An urgent request** from Priya (only when the player is not about to miss a
    deadline): do it now, ask whether it comes before your current task (she moves
    your deadline), or decline.
  - **A decision** that follows: Marcus's figure is £480 short. Tell him privately so he
    can fix it, report it to Priya, or quietly fix it and say nothing.
  - **A wellbeing check-in** (stress or fatigue very high, at most once a week): being
    honest earns a deadline extension and lower stress.
- A development-only `window.__worksim.setWellbeing()` hook for browser tests.

### Tested

- Unit tests: no events on the first morning; mistake feedback (and dropping it when
  fixed); recognition followed by jealousy; a lapsing request; helping takes time; one
  event at a time; the urgent request leading to the decision about Marcus's mistake;
  Priya after a missed deadline (waiting until the next working day); the wellbeing
  check-in; nothing outside working hours.
- New browser test: an overloaded player gets a visit from Priya at the computer, and an
  honest answer extends a deadline.
- All 36 browser tests and all unit tests pass.

---

## 2026-10-31 · Milestone 2.3: colleagues, trust and reputation

### Built

- **A new colleague, Marcus Webb** (Senior Finance Assistant), who sits next to the
  player: ambitious, protective of his position, wary of newcomers, but a good teacher
  once he trusts you. Clickable in the 3D office ("Talk to Marcus").
- **Personalities** for Priya (direct, demanding, fair), Nina (warm, organised, hears
  everything, sometimes wrongly), Tom (laid-back, practical, funny) and Marcus.
- **Trust per colleague** and a **professional reputation**:
  - built by talking to people (+2, then +1 per day; a third chat the same day gets a
    polite "I need to get back to work"), by reliable work (deadlines met, meetings
    attended) and by good choices;
  - lowered by missed meetings and deadlines, leaving early and poor choices.
- **Conversations that unlock over time** (`src/game/conversations.ts`), each with
  choices, visible effects and a workplace tip:
  - Marcus's introduction (curiosity, neutral, or an ill-judged joke about his job);
  - Nina's invitation to lunch with the team (accepting means future lunches are with
    Nina and Tom, a little extra trust each time);
  - Tom asking how the first day went (honesty about the learning curve);
  - **a misunderstanding**: Nina heard you belittled reception. Calmly clarifying
    resolves it; apologising for something you did not do leaves it unresolved;
    getting defensive damages the relationship and your reputation.
- **Mentorship**: once Marcus trusts the player enough, he becomes their mentor and
  gives practical advice on the current task, with a button to open it.
- **Asking for more time**: when a deadline is less than four hours away, Priya can be
  asked for one more day (granted once per task; her reply depends on trust).
- **"Your team" in the Career app**: each colleague's role, personality and trust
  ("Cautious", "Friendly", "Trusts you", "Close ally"), Marcus's mentor status, and the
  player's reputation.

### Performance

- The 3D office now redraws only when what it shows changes (where the player stands,
  the mail alert), not every time the career changes. This made office interactions
  noticeably faster (the office browser test went from over 90 to 56 seconds).
- Typing in the spreadsheet is about twice as slow in **development mode** as it was
  in Phase 1 (React's extra debugging checks), but the built app is unaffected: about
  1 second to type a 30-character formula, mostly the test robot's own typing speed.
  Browser tests now allow 60 seconds each, because they run in development mode.

### Tested

- Unit tests for conversations: introductions, trust per chat, "busy" after three
  chats, remembering one-off conversations, lunch with the team, the misunderstanding
  and its ethical options, mentorship and asking for more time.
- New browser test: talking to Marcus and Nina, choices with visible trust changes,
  and the team in the Career app.
- All 35 browser tests and all unit tests pass.

---

## 2026-10-31 · Milestones 2.1–2.2: the working day and wellbeing

### Built

- **An office clock** (top bar): weekday, week and time, with a dot showing whether it
  is running. Time only moves when the player does something:
  - at the computer it runs 6× faster than real time (10 real minutes = 1 office hour),
    and **pauses** when the tab is hidden or there has been no keyboard/mouse use for 90
    seconds;
  - office actions take a set time (walking 2 min, coffee 10, a chat 10, lunch 45).
- **A daily schedule**: arrive 8:50, work 9:00–5:30, a daily stand-up (9:15), weekly
  planning (Wednesday 11:00), a one-to-one with Priya (Friday 3:30), lunch 11:45–2:00.
  The office closes at 7 pm.
- **Meetings are scenes with choices**, built from the player's real situation (their
  current task, deadline, whether it is late). Each choice shows what it changed
  ("Priya: trust +2", "Reputation +1") and a workplace tip. Missing a meeting costs a
  little trust and reputation; being late costs a little reputation.
- **Deadlines**: tasks received by 11 am are due at 5:30 pm that day; later ones at
  midday the next working day. On time: reputation and trust go up. Late: a one-off
  drop and some stress. One extension can be agreed in advance (used by conversations
  in 2.3).
- **Reminders at the computer** (never blocking): meeting starting, lunchtime, two hours
  without a break, end of the day. Each has a button that walks the player to the right
  place.
- **"Your day" panel** (click the clock): today's schedule with what was attended or
  missed, deadlines, wellbeing with plain advice, and a log of the day.
- **Going home and the next morning**: "Go home" at reception (with a warning when
  leaving before 5 pm with work open). An end-of-day summary shows time worked,
  submissions, meetings, overtime, the day's log and advice. The next day starts at
  8:50 at reception; Friday is followed by Monday.
- **Wellbeing** (`src/game/wellbeing.ts`):
  - **Energy** falls while working (faster after two hours without a break, or when
    very stressed) and comes back with coffee breaks (most when a break is needed),
    lunch and a night's rest.
  - **Stress** rises slowly with work, faster with overdue tasks, overtime and long
    stretches; breaks, lunch, good results and conversations bring it down.
  - **Engagement** grows with meetings, conversations and finished work; motivated
    players feel pressure less.
  - **Fatigue** builds over several days from overtime, skipped lunches and ending
    exhausted; evenings clear some of it and weekends much more. It lowers the next
    morning's energy.
  - **Consequences are gentle**: being tired makes work take longer in office time
    (1.2× when tired, 1.5× when exhausted). Wellbeing never reduces XP or grades, and
    every recovery is free.

### Decisions

- **Action-based time instead of a real-time clock.** Nothing happens while the player
  is away, so nobody is punished for stepping out, and every cost is visible on the
  button ("Have lunch · 45 min").
- **All new state lives in the profile** (`profile.work`), so it autosaves and is part
  of backup and restore with no extra work. Profile format 2; older careers are upgraded
  to a fresh Monday morning with their progress intact.
- **The computer clock saves every 30 seconds** (and when leaving the computer or hiding
  the tab), not on every tick.
- **Game rules stay pure** (`src/game/workday.ts`, `wellbeing.ts`, `meetings.ts`,
  `scenes.ts`, `notices.ts`) and the interface applies them through one `act` function.
- A development-only `window.__worksim.passTime(minutes)` hook lets browser tests move
  the clock without waiting. It does not exist in the built app.

### Tested

- Unit tests for the calendar, deadlines, meetings (attended, late, missed), lunch,
  breaks, deadlines (missed once, extension), submissions, closing time, leaving early,
  weekends and wellbeing recovery; a test that format 1 profiles upgrade correctly.
- New browser test: a full day (schedule, walking, stand-up reminder and choice, lunch
  too early and on time, leaving early, end-of-day summary, Tuesday morning, reload).
- All earlier tests still pass.

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
