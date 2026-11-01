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

**Phase 5: "Employability & Career Portfolio"** (planned, not started; waiting for the
owner’s authorisation). Plan: [docs/PHASE5_PLAN.md](docs/PHASE5_PLAN.md).

- [x] 5.1 Evidence capture and storage
- [x] 5.2 Backfill for existing saves, backup and safety
- [x] 5.3 Portfolio app: browse, filter, inspect
- [ ] 5.4 Competency and experience record
- [ ] 5.5 Career progress report and recommendations
- [ ] 5.6 PDF engine and report exports
- [ ] 5.7 Original file exports and the portfolio package
- [ ] 5.8 Employability profile
- [ ] 5.9 Integrated projects framework and first two projects
- [ ] 5.10 Remaining integrated projects
- [ ] 5.11 Hardening: scale, regression, documentation

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
