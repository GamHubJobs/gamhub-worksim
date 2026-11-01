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

## How it is tested

- `tests/e2e/accessibility.spec.ts` runs the axe WCAG 2.1 A/AA checks on every main
  screen and on the states that follow actions (a conversation, a case result,
  assessment feedback). The test fails on any violation.
- `tests/e2e/keyboard.spec.ts` completes a real working session with the keyboard
  alone: start, a conversation, the office, mail and a whole case. It also checks the
  focus ring and reduced motion.

## Known limits

Automated checks find only some problems. The app has not yet been tested by people
who use screen readers or other assistive technology every day. That is recommended
before any public release. The spreadsheet grid and the slide editor work with the
keyboard, but they are complex widgets and would benefit most from that testing.
