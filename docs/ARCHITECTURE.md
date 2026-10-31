# GamHub WorkSim: Architecture Overview

This file records the key decisions behind the project, so future work stays consistent.

## Product decisions

- Single-player, **local-first** web application. No multiplayer.
- **Private, commercial** codebase. Only use dependencies whose licences allow
  closed-source commercial use (MIT, Apache-2.0, BSD, CC0, and similar).
  Avoid GPL and "non-commercial" licences.
- **Desktop browsers first.** Mobile and touch support come later.
- 3D office uses **hotspot (click-to-go) navigation**, not free movement.
- First career path: **Office Administration / Finance Intern**.
- $0 budget: no paid services or APIs without explicit approval.
- Learning tools and career progression never depend on purchases.

## Layers

```
Screens & HUD
3D World  |  Workstation (simulated desktop + apps)
Game Core (pure logic: rules, no visuals)
Content (data files: assignments, characters, scenarios)
Persistence (IndexedDB, autosave, versions, backups, future sync)
```

## Rules that keep the project maintainable

1. **Only `src/persistence/` touches storage.** Everything else asks it to save or load.
2. **Game logic and the spreadsheet engine are pure TypeScript.** They never import
   React or 3D code, so they are easy to test and reuse.
3. **Content is data, not code.** New assignments, characters and scenarios are added
   as validated data files.
4. **Every saved record carries sync fields** (`id`, `createdAt`, `updatedAt`, `rev`,
   `deviceId`, `deleted`) and changes are recorded in an `outbox`, so cloud sync can
   be added later without changing the save format.
5. **Saved data is validated on load** and upgraded through versioned migrations.

## Saving principles

- Players never need to press Save. Work autosaves within about a second.
- Crash recovery, version history and backup export/import are core features.
- Browser storage is **not permanent**. It can be cleared by the user, by the browser
  under storage pressure, in private windows, or lost if the site address changes.
  Backups (and later, cloud sync) are the real safety net.

## Technology

| Purpose        | Choice                                   |
| -------------- | ---------------------------------------- |
| Language       | TypeScript                               |
| Build tool     | Vite                                     |
| UI             | React                                    |
| Code checks    | Oxlint                                   |
| Local database | IndexedDB via Dexie (Phase 0)            |
| Validation     | Zod (Phase 0)                            |
| Styling        | Tailwind CSS                             |
| Tests          | Vitest, Playwright (Phase 0)             |
| 3D             | Three.js + React Three Fiber (Phase 1)   |
| Spreadsheet    | Own engine and grid, built incrementally |

## Roadmap

0. Foundations: saving, recovery, backups, tooling ← _current_
1. Vertical slice: "Your First Day as an Intern"
2. Productivity depth (Docs app, richer spreadsheet)
3. People and workplace life
4. Time and wellbeing
5. Career breadth
6. Achievements and customisation
7. Polish
8. Cloud accounts and sync
9. Future: optional cosmetics, GamHub Jobs connection
