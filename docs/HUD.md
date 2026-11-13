# The HUD layout

The 3D workplace is the game, so the HUD over it is arranged in fixed zones
that never overlap (`src/ui/hud/Hud.tsx`, `src/ui/hud/hudContext.ts`, styles
in `src/index.css`).

## Zones

```
┌──────────────┬───────────────────────────┬──────────────────┐
│ top-left     │ top-centre                │ top-right        │
│ the location │ the controls help         │ camera buttons,  │
│ panel        │ (and the mission-complete │ the mission      │
│ (collapsible)│ notice)                   │ tracker          │
│              ├───────────────────────────┼──────────────────┤
│              │                           │ right: a         │
│              │      the 3D world         │ conversation     │
│              │                           │ (scrolls inside) │
├──────────────┼───────────────────────────┼──────────────────┤
│ bottom-left  │ bottom-centre: the "Press │ bottom-right:    │
│ the next step│ E" prompt or the activity,│ minimap, needs   │
│              │ then the places bar       │ (compact or full)│
│              │                           │ and the buttons  │
└──────────────┴───────────────────────────┴──────────────────┘
```

- **One grid over the world:** `<HudLayout>` (placed in the office) is a CSS
  grid with these zones. The side columns are `--hud-left` and
  `--hud-right` (`clamp()` on the screen width).
- **Slots:** each piece of HUD renders into its zone with `<HudSlot>`, so
  pieces sharing a zone stack instead of covering each other.
- **Without a grid,** a slot renders its old position (its `fallback`). So
  the city, home and the computer are unchanged.
- **Stacking order** (CSS variables): the HUD, then conversations, notices,
  menus and dialogs, help, the guided tour.

## Behaviour

- **Contextual priority:** in a conversation (`mode: 'dialogue'`), the mission
  tracker and the controls help step aside, and the next step shrinks to its
  button. On a narrow screen, the location panel, minimap and needs step
  aside too; the Phone, Map and Menu buttons stay.
- **Short screens** (a 1366 × 768 laptop) get a smaller minimap and tighter
  gaps.
- **Narrow screens** (tablets held upright, phones):
  - two columns, with conversations across the middle;
  - each corner keeps to its share of the screen and scrolls inside it;
  - the next step starts with its detail closed.
- **Remembered on the device:**
  - the location panel collapses to the place's name;
  - the needs show either in full or as six small meters.

## Tests

`tests/e2e/hud-layout.spec.ts` measures every visible piece of HUD in the
office, at 1366 × 768, 1440 × 900, 1600 × 900, 1920 × 1080, 1280 × 720,
1024 × 768 and 390 × 844. It checks while exploring and in a conversation,
and fails on any overlap or anything off the screen.
