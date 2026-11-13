# Guidance: window controls, the next step, guided tours and help

These are global: every career, app, tool and simulation uses the same
systems.

## Window controls

Every app window shares one frame (`desktop/windows/AppWindowFrame.tsx`) and
one window manager (`desktop/windows/windowManager.ts`), as before:

- **Minimise** hides the window and keeps it mounted, so its state (tabs,
  scroll, what was typed, a simulation under way) is kept. The taskbar
  brings it back.
- **Maximise and restore** toggle, and restore goes back to the same size
  and place.
- **Close** saves first.
- **Moving and resizing:** windows are dragged by the title bar and kept
  reachable on the screen.

**Changed in this round:**

- **A close that cannot save** asks first ("Keep it open" or "Close
  anyway"). The changes are kept for recovery either way.
- **A bug fix:** the title bar and the taskbar could be pushed out of view on
  short screens. An app focusing something could scroll a container meant
  not to scroll. The desktop, its surface and the window frame now use
  `overflow: clip`, which nothing can scroll.
- **A Tour button** in the title bar of every app that has a tour.

## The next step

- **The bar:** `guide/GuideBar.tsx` says the one thing to do next. In the
  office it is a card at the bottom left. At the computer it is a strip
  docked above the taskbar: the windows' area ends above it, so it never
  covers an app, and its detail opens upwards only when asked for.
- **Where the step comes from:**
  - **Live, state-aware hints** from the screen in front (`guide/appHints.ts`,
    `guide/stepHints.ts`). Each is worked out from the real state every time:
    - the physical setup bench names the cable still missing and where it
      goes (for example "Connect the dock end of the network lead to
      Ethernet on the dock"), a lead in the wrong socket first, and which
      side to turn the laptop to;
    - the Repair Bench says the next thing still to do on that laptop;
    - the comms cabinet says to find, then cycle, only the hung device;
    - Computer Deployment says what each step needs and points to the SOP
      without giving its answers;
    - the Help Desk queue names the most urgent ticket and what it still
      needs.

    A minimised or background window publishes nothing.

  - **Otherwise, the game's own next step** (`game/nextStep.ts`):
    - a meeting that is on;
    - a colleague who wants a word;
    - hands-on IT work in the office;
    - unread mail;
    - the task in hand and its next unticked step;
    - submitting when every step is done.

    It never suggests something that cannot be done now.
- **Detail by experience:** beginners (fewer than three tasks passed) see how
  to do it, with the keys. Experienced players see the short version, with
  More.
- **Collapsing:** the bar collapses to a small "Next step" button, and the
  choice is remembered (`work.guide.hintsCollapsed`). In an office close-up,
  the close-up's own header shows the next step instead.
- **Making room for it:**
  - the first window size allows for the strip;
  - a window's contents scroll when an app needs more room than its window
    (the title bar stays fixed above);
  - fitting windows to the screen keeps their bottom edge on the desktop.

## Guided tours

- **The tours** (`guide/tours.ts`):
  - **The introduction** (14 steps): the workplace, moving about, the two
    views, people and objects, Places, the next step, the computer and
    apps, windows, Mail, Tasks, Career, Readiness and the Portfolio,
    WorkSim AI, and saving.
  - **One per app:** Help Desk, Grid Craft, Mail, Tasks, Career, Readiness,
    Portfolio, WorkSim AI, Word Craft, Deck Craft, Cases and Code.
  - **One per profession tool**, made from the tool's own guide so it stays
    true. This covers the accounting, marketing, data and IT tools.
- **How a tour shows** (`guide/TourOverlay.tsx`):
  - the real part of the screen is outlined and the rest dimmed;
  - a card sits beside it without covering it, with the step and Back, Next,
    Skip and Pause;
  - the arrow keys move between steps, and Esc pauses.
- **Steps that need another place:** a step takes the player to the office
  or the computer, or opens the app, so what it describes is there. A part
  not on screen is explained over its window.
- **Where to start a tour:**
  - the Start menu ("Guided tours");
  - the game menu (Esc);
  - Help;
  - an app's title bar (Tour).
- **On a first visit:** a new player gets the introduction once, and the
  next-step bar offers it until it has been taken. Automated browsers do
  not get it, unless the address has `?tour`.
- **Progress is kept with the player** (`work.guide.tours`): taken, skipped,
  or paused at a step (resumed from Help). Old saves get the defaults.

## Help and guidance

The help centre (`ui/HelpPanel.tsx`) is searchable. It has:

- **Getting started:** the help topics.
- **Guided tours:** each with its status, and Start, Resume or Take it again.
- **Keyboard shortcuts:** the walking keys as set, plus the desktop and tour
  keys.
- **Your career's tools:** each tool's guide, with its tour.
