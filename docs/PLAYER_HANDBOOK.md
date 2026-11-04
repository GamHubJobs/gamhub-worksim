# GamHub WorkSim: player handbook

Start here. This page covers everything you need to get going, with links to the
detailed guides. Inside WorkSim, **Help** in the top bar has the same answers in
short.

## What WorkSim is, and what it is not

WorkSim is a **workplace simulation**. You join Cobalt Ridge Consulting in one of six
careers:

- Finance & Administration;
- Accounting;
- IT Help Desk;
- Digital Marketing;
- Data Analysis;
- Software Development.

You do realistic work in working office apps and profession tools, and get clear
feedback on every piece of work.

WorkSim is **not** a job, a course with a certificate, or a qualification. Your
portfolio shows work done in a simulation, and says so on every page and export.

WorkSim is free, needs no account, and keeps your progress **on this device only**.

## Starting

1. Open WorkSim. The start screen explains what it is.
2. **Choose a career.** Each starts at its first level, in its own department, with
   its own manager, colleagues, tasks and tools. You can start the other careers later
   from the **Career** app; each keeps its own progress.
3. Type your first name (what your colleagues will call you) and choose **Start my
   first day**.

## The office

You arrive at reception in a 3D office.

- **Places** (or the blue rings on the floor) take you to your desk, your manager’s
  office or the break room.
- The **panel beside the 3D view** lists everything you can do where you are: talk to
  colleagues, read the whiteboard, have lunch, go home. You never need the 3D view
  itself.
- At your desk, **Use your computer** opens your apps. **Leave desk** goes back to the
  office.
- The day runs in office time. Meetings, breaks and lunch matter, and so does going
  home on time: your energy and stress change with how you work.

## Your computer

Your work computer has a desktop like a Windows 10 PC.

- **Desktop icons** down the left and right: double-click one (or select it and press
  Enter) to open the app. Drag an icon to move it; WorkSim remembers where you put it.
- **Right-click the desktop** for the menu: icon size (**View**), **Sort by** name,
  **Refresh**, **New** (a document, presentation or practice workbook, depending on
  your career), **Display settings** and **Personalize** (background and icon size).
- **Each app opens in a window.** Drag the title bar to move it and the edges to
  resize it; use the buttons at the top right to minimise, maximise (or double-click
  the title bar) and close. Several apps can be open at once; the one you click comes
  to the front.
- **The taskbar** along the bottom: **Start** (every app, A–Z, and settings), **Type
  here to search**, a button per app (a line under it when it is open, a red number
  for new items), and **Leave desk**. Clicking the button of the window in front
  minimises it; clicking again brings it back.
- **The right-hand end of the taskbar** shows you and your XP, the network, your
  energy as a battery, **Help** (?), **Storage & backup**, and the office clock: click
  the clock for your day. The thin strip at the far right is **Show desktop**.
- **Notifications** (a meeting starting, a case arriving) appear in the bottom-right
  corner.

Windows stay as you left them when you leave your desk, and after you close WorkSim.

## WorkSim AI

**WorkSim AI** is the assistant on your work computer (desktop icon, taskbar, Start,
search). It helps with what you have open: plan a task, explain a formula, summarise an
email, list what it asks for, outline a reply, review your writing, and write better
prompts.

- **Modes.** **Learning** explains and gives one step at a time; **Professional** gives
  practical guidance and reviews; **Expert** explains trade-offs and leaves the decision
  to you. The mode changes how much is explained, not how much is done for you.
- **Context.** The panel on the right lists what WorkSim AI knows for the next question
  (the email or task you have open, your role). Untick anything you do not want to
  share. Your name is never shared.
- **Who answers.** Every answer says what wrote it.
  - **Built-in guide** (the default): WorkSim's own rules. Free, offline, **not an AI
    model**, so it answers specific questions only.
  - **A model on your computer**: free. Install [Ollama](https://ollama.com), download a
    model (for example `ollama pull llama3.2`), start it so WorkSim may use it
    (`OLLAMA_ORIGINS=http://localhost:5173 ollama serve`, using WorkSim's address),
    then choose it in WorkSim AI's Settings with the model's name.
  - **A cloud model through the WorkSim AI bridge**: uses your own API key, and the
    provider charges your account per request. Put the key in a file called
    `.env.local` next to `package.json` (for example `ANTHROPIC_API_KEY=...`; OpenAI
    and Google also need `OPENAI_MODEL` or `GEMINI_MODEL`), run `npm run ai-bridge`,
    and choose the provider in Settings. The key stays in the bridge.
- **Consent.** Nothing is sent to a model until you tick the consent box in Settings.
  **Show what will be sent** shows the exact context. If the model cannot answer, WorkSim
  says why and the built-in guide answers instead.
- **Inside the apps.** Each app has a **WorkSim AI** button in its toolbar with what it
  can do there:
  - **Mail**: summarise an email, list what it asks you to do, outline a reply; review
    your draft, or improve its wording.
  - **Tasks**: how to approach the task, and which step to do first.
  - **Sheets**: explain a formula or an error, suggest a formula for the selected cell,
    and analyse the selected data (totals, unusual values, trends, which chart to use).
  - **Docs**: review your writing, summarise, suggest a report structure, rewrite the
    selected text.
  - **Slides**: review the presentation, suggest an outline, help with speaker notes.
  - **Code**: explain the code and the failing tests, and which tests to write.
  - **Help Desk**: summarise the ticket, suggest a resolution from the knowledge base,
    help with the reply.
- **Proposed changes.** When WorkSim AI suggests a formula or rewritten text, it shows it
  first, with **Apply** and **Dismiss**. Nothing in your work changes until you apply
  it, and you can undo it in the app afterwards. In Learning mode, formula help is a
  hint, so you write the formula yourself.
- **Limits.** A daily limit (40 requests by default, on this computer) and a time limit
  on each request. The bridge has its own daily limit too.

## The apps

| App          | What it is for                                                                         |
| ------------ | -------------------------------------------------------------------------------------- |
| Mail         | Tasks, cases and replies arrive here                                                   |
| Tasks        | Your work, with its steps and hints                                                    |
| Cases        | Clients, budgets, meetings, incidents and leadership situations                        |
| Sheets       | A working spreadsheet with formulas, charts and data tools                             |
| Docs, Slides | Reports and presentations                                                              |
| Career tools | Books, Help Desk, Network, Directory, Ad Campaigns, Analytics, Data Studio, Code, API… |
| Career       | Your level, what promotion needs, your record, achievements and desk                   |
| Readiness    | The practical assessments for your level                                               |
| Portfolio    | Evidence of everything you passed, and exports                                         |

Everything you type is saved automatically.

## Tasks, cases and assessments

- **Tasks** come from your manager by email. Open one in Tasks and choose **Start
  task**. Work through the steps, using the hints, then hand it in. Every check is
  marked and explained. You can improve your work and hand it in again.
- **Cases** are workplace situations with a deadline. Read the evidence, work through
  the steps and submit; a case is answered once, like a real email. See
  [CASES_GUIDE.md](CASES_GUIDE.md).
- **Readiness assessments** (from level 2) are practical work in your profession’s own
  tool plus a report in Docs, marked like real work. You need 80%; if you don’t pass,
  practise and take it again. See [CAREER_GUIDE.md](CAREER_GUIDE.md).

## XP, levels and promotion

Passing work earns **XP** and builds skills. To be promoted you need:

- enough XP;
- every task of your level passed;
- a good enough professional reputation;
- for senior roles, a good weekly review;
- from level 2, your level’s readiness assessment.

The **Career** app shows what you still need, plus your performance record and
achievements. See [CAREER_GUIDE.md](CAREER_GUIDE.md).

## Your portfolio

Everything you pass becomes a portfolio item: what was asked, how it was marked, and
copies of the files you handed in. From Portfolio you can download:

- PDFs of single items;
- a full portfolio PDF;
- a progress report;
- a one-page profile;
- a ZIP with everything.

See [PORTFOLIO_GUIDE.md](PORTFOLIO_GUIDE.md).

## Saving, backups and recovery

- **Saving** is automatic, in this browser on this device. Nothing is uploaded.
- **Backups.** Download one regularly from **Storage & backup**; WorkSim reminds you
  weekly. A backup restores everything, on this or another computer.
- **Restoring** shows what the backup contains first. WorkSim downloads a backup of
  your current data and keeps a **safety copy** on this device, so a restore can be
  undone.
- **Crashes.** If the browser or computer crashes, your work is recovered when you
  reopen WorkSim.

See [PRIVACY_AND_SECURITY.md](PRIVACY_AND_SECURITY.md).

## Installing and offline use

In Chrome or Edge, install WorkSim from the address bar to use it as an app. Once
opened online, it starts and saves offline too. Opening a career for the first time
needs a connection. Updates wait until you choose **Update now**. See
[INSTALL_AND_OFFLINE.md](INSTALL_AND_OFFLINE.md).

## Accessibility

Everything works with the keyboard. Screen readers are supported, and reduced motion
is respected. See [ACCESSIBILITY.md](ACCESSIBILITY.md), including what has not been
tested yet.

## Browsers

Use a current version of **Chrome**, **Edge** or **Firefox** on a desktop or laptop
computer. See [BROWSERS.md](BROWSERS.md) for details and known differences.

## Troubleshooting

| Problem                                                    | What to do                                                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| WorkSim behaves strangely after an update                  | Storage & backup → **Repair app files**. Your saved work is not touched.                       |
| “WorkSim could not load the content for this career”       | Reconnect to the internet (needed the first time a career is opened) and choose **Try again**. |
| “WorkSim is open in another tab”                           | Close the other tab, or choose to use this one. Only one tab can change your work at a time.   |
| “Part of your saved data is damaged”                       | Nothing was changed. Open **Storage & backup** and restore a backup or a safety copy.          |
| Storage is nearly full                                     | Download a backup, then delete old files you no longer need. Storage & backup shows the space. |
| The 3D office is slow                                      | Use the panel beside it; WorkSim also draws more simply on computers without a graphics card.  |
| Progress is missing after using a private/incognito window | Private windows delete their storage when closed. Use a normal window, and keep backups.       |
