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
- [ ] 4.3 IT Help Desk (with a Help Desk ticketing app)
- [ ] 4.4 Digital Marketing
- [ ] 4.5 Data Analysis
- [ ] 4.6 Software Development (with a Code editor and tests)

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
