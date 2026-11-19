# Motion and transitions

One system for how everything in the game moves: panels, windows, the phone,
changes of place and the character. Every transition finishes on its own,
takes no input while it plays, and is instant for players who ask their computer
for reduced motion.

## The pieces

| Part               | Where                                                            | What it does                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timings and curves | `src/index.css` (Motion), `src/ui/motion.ts`                     | `--motion-fast` 140 ms, `--motion-base` 200 ms, `--motion-slow` 320 ms, `--motion-scene` 450 ms; entrances ease out, exits ease in and are quicker                                                                          |
| Entrance classes   | `src/index.css`                                                  | `motion-pop` (dialogs), `motion-rise` (sheets, conversations), `motion-drop` (menus, banners), `motion-slide-left/right` (toasts, drawers), `motion-fade` (backdrops, full-screen scenes), `motion-screen` (a whole screen) |
| Exits              | `usePresence(open)`, `useAfterExit()`                            | Keep a thing on the page while its `-out` class plays, then remove it; with reduced motion, at once. Leaving things carry `data-leaving` and take no clicks or keys                                                         |
| Windows            | `desktop/windows/AppWindowFrame.tsx`                             | Open (pop), minimise to the taskbar and back, maximise and restore (easing size and place), close (fade)                                                                                                                    |
| Changes of place   | `world/transition/Still.tsx`, `capture.ts`, `world/WalkView.tsx` | Every 3D place opens under the last picture of the place left (or a dark curtain), lifted once it has drawn its first frames, at most after 4 s                                                                             |
| The character      | `world/PlayerRig.tsx`, `office/scene/people.tsx`                 | Poses blend joint by joint; the body eases into a seat or spot and turns to face it instead of jumping                                                                                                                      |
| Reduced motion     | `index.css` (the reduced-motion rule), `motionMs()`              | Animations and transitions become instant; exits are not waited for; the body goes straight to its place                                                                                                                    |

## Rules

- Animate only `opacity` and `transform` (cheap to draw). Size and place are
  eased only for maximise and restore, and never while dragging.
- An entrance plays once, when something first appears: panels are keyed per
  conversation or per item, not per line, so they do not replay.
- Nothing waits on an animation's "finished" event alone: each has a timer as
  well, so nothing is ever left half-way.
- A change of place keeps the picture only when going straight from one place
  to the next. Screens between places (the day's end, the work computer) drop
  it, and the next place fades in from dark.
- New panels and dialogs: add an entrance class to the dialog element, and use
  `useAfterExit` for their close buttons if they close often.

## Tests

`tests/e2e/transitions.spec.ts`: windows (each animation finished, sizes right,
closed), a change of place (the curtain lifted, never left, walking straight
after), the phone and the pause menu animating away without blocking the keys,
and reduced motion (closing at once).
