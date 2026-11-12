# Accessibility

WorkSim aims to meet **WCAG 2.1 level AA** for everything a player needs to do. This
page lists what is supported and how it is tested.

## What is supported

- **Keyboard only.** Every workflow can be completed with Tab, Shift+Tab, Enter, Space
  and the arrow keys:
  - starting a career;
  - moving around the office;
  - talking to colleagues;
  - reading mail;
  - working on tasks, cases and assessments;
  - submitting work.
- **A visible focus ring.** A 3-pixel blue outline shows which control has keyboard
  focus. No control removes it.
- **The 3D office has a full alternative.** The panel beside the 3D view lists the
  places (as a “Places” menu) and everything you can do where you are, as ordinary
  buttons. The 3D view is a picture of the same thing and is never needed.
- **Conversations.** When a colleague speaks to you, keyboard focus moves into the
  conversation. Escape closes it and returns focus to where you were.
- **Screen readers.** The app uses headings, landmarks (navigation, regions), labelled
  form fields and tables with header cells. Status messages are announced as they
  appear: saving, reminders, results and errors (errors as alerts). Form hints and
  errors are linked to their fields.
- **Colour contrast.** Text meets the AA contrast ratio (4.5:1). The lightest grey text
  colours and some avatar colours were darkened to achieve it.
- **Reduced motion.** If your system asks for less motion:
  - animations and smooth scrolling are switched off;
  - the 3D camera jumps between places instead of gliding;
  - the people in the office stay still.

- **Sound is optional.** Nothing needs sound: every important sound comes with
  something on screen, and **Sound captions** (in Sound) shows a short note for each
  (also announced to screen readers). Each kind of sound has its own volume and
  switch, there is Mute all, and **Fewer sounds** (on at first when the system asks
  for less motion) makes the surroundings quieter and drops button clicks. A
  compressor stops sudden loud sounds. The Sound panel works with the keyboard.

- **The editors.**
  - Grid Craft, the office spreadsheet, is drawn as a picture of its window, and its
    own screen reader support in the browser has not been confirmed. **Settings →
    Office apps** switches to the basic spreadsheet editor, which opens the same
    files. Its grid is a proper grid of rows and cells, and the address and value of
    the active cell (and its formula) are announced as you move.
  - In Slides, Tab moves to each element on a slide and selects it. Enter edits its
    text, the arrow keys move it, and Delete removes it.
  - Word Craft, the office word processor, and Deck Craft, the presentation app, are
    drawn the same way. The same setting
    switches to the basic Docs editor, whose page is a named, multi-line text box.
- **Dark panels.** Text on the dark consoles of the Code and Network tools meets the
  contrast ratio too.

## How it is tested

- `tests/e2e/accessibility.spec.ts` runs the axe WCAG 2.1 A/AA checks and fails on any
  violation. It covers:
  - every main screen, and the states that follow actions (a conversation, a case
    result, assessment feedback);
  - the Sheets, Docs and Slides editors;
  - every profession tool: Books, Help Desk, Network, Ad Campaigns, Data Studio and
    Code.

  In the editors, axe’s experimental “label in name” rule is switched off: it flags
  toolbar buttons whose face is a symbol (“A→Z”) and slide thumbnails. Buttons with
  visible words were changed so their names contain those words.

- `tests/e2e/keyboard.spec.ts` completes a real working session with the keyboard
  alone: start, a conversation, the office, mail and a whole case. It also checks:
  - the focus ring and reduced motion;
  - announcements in the Sheets grid;
  - selecting, moving and editing slide elements with the keyboard.

## What has and has not been tested

**Tested (automatically, in Chromium):**

- the axe checks on every main screen and editor;
- keyboard-only workflows;
- the focus ring;
- reduced motion.

**Not yet tested:**

- **With real assistive technology.** Nobody has yet used WorkSim with a screen
  reader, screen magnifier, voice control or switch access. Automated checks find
  only some problems, so this testing is needed before a public release.
- **By disabled people.** WorkSim has not been tested by disabled people who use
  assistive technology every day.

## Screen-reader testing checklist

Use this checklist when assistive-technology testing becomes possible. Record the
browser, the screen reader and their versions, and for each item: works, works with
difficulty (say what), or does not work.

### Combinations to test

| Screen reader        | Browser              | System  | Priority |
| -------------------- | -------------------- | ------- | -------- |
| NVDA (free)          | Firefox, then Chrome | Windows | High     |
| JAWS                 | Chrome or Edge       | Windows | High     |
| Narrator (built in)  | Edge                 | Windows | Medium   |
| VoiceOver (built in) | Safari               | macOS   | Medium   |
| Orca (free)          | Firefox              | Linux   | Low      |

Also test with the browser zoomed to 200%, and with Windows High Contrast (Contrast
themes) turned on.

### Tasks

1. **Start.** Find and fill the name field (the hint is read with it), choose a
   career with the arrow keys, and start the first day.
2. **The office.** Hear where you are and what you can do. Go to your desk using
   the Places menu. Talk to a colleague: the conversation is read when it opens,
   choices can be made, and Escape returns you to where you were.
3. **Mail.** Move through the inbox, open a message, and hear its sender, subject and
   text.
4. **Tasks.** Open a task and read its steps and hints.
5. **Sheets.** Move around the grid with the arrow keys: the cell address and its
   contents are read as you move. Type a value and a formula, and hear the result.
6. **Docs.** Write a heading and a paragraph, and use the toolbar from the keyboard.
7. **Slides.** Tab to a text box on a slide (it is selected as it gets focus). Press
   Enter to edit it, Escape to finish, and use the arrow keys to move it.
8. **A profession tool,** for example Books or Data Studio: complete one action.
9. **Cases.** Read the evidence tables, tick findings, choose an option, type a
   figure and a reply, submit, and hear the result announced.
10. **Readiness.** Start an assessment, open its practical file, return, and submit.
11. **Portfolio.** Find an item, open its evidence, and download a PDF.
12. **Saving.** Hear the save status change after typing. Open Storage & backup and
    make a backup.

### Known limits to check carefully

- **The 3D office** is a picture only. Everything in it can be done from the panel
  beside it, which is what screen-reader users should use.
- **Charts** in Sheets and Slides have titles, but their data is not described.
  Check whether the data table next to each chart is enough.
- **Slide layout.** Element positions are not announced as you move them with the
  arrow keys.
- **Code editor.** Code is typed into a standard text area. Line numbers are not
  announced.
