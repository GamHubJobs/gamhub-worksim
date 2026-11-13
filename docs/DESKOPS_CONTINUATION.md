# DeskOps: continuation record

The IT Help Desk career is being extended, phase by phase, into a full IT
service desk and IT operations simulation ("DeskOps", an internal name: the
app keeps its name, Help Desk). This file says where the work stands, so a
new session can continue without repeating anything. Update it at the end of
every phase.

## Architecture (decided, keep to it)

- **One saved document per scenario.** A Help Desk task's ticket queue
  (`tickets` document) holds its tickets and its `environment`, the simulated
  systems they are checked against. New systems are added to `environment`
  (devices, communications, security operations), never as separate saves.
- **Every change goes through `applyEnvironmentChange`** (`src/game/incidents.ts`):
  - the tickets react to what changed;
  - security events go to ticket histories.
- **Tools are pure.** State, actions and grading live in `src/tools/<tool>/`, as
  Network Tools and Directory do. The UI calls the actions. Rules are enforced
  inside the actions (see the Directory's `guarded`).
- **The Help Desk window is the DeskOps shell.** It is one application with a
  sidebar of sections, not a second app. Sections appear when the queue has
  that system.
- **Reuse:**
  - XP, skills and attempts: `game/career.ts`;
  - competencies: `game/competencies.ts`;
  - portfolio, Readiness, assessments and reviews: `game/reviews.ts`;
  - WorkSim AI: `src/ai`, with the built-in guide offline;
  - the office cast and encounters.
- **Saves are additive:** new fields are optional or defaulted, and old saves
  load (tested in each phase).

## Testing rules

- **Paths:** run from `C:\Users\User\Documents\GamHub-WorkSim` (upper-case
  drive) in PowerShell, or Vitest loads twice.
- **Screenshots:** browser tests write to
  `${WORKSIM_SHOTS ?? 'docs/screenshots'}`. For full runs, set `WORKSIM_SHOTS`
  to a scratch folder so the user's screenshots are not overwritten.
- **Don't commit `docs/screenshots`.**

## Status

| Phase | Scope                                                           | State          |
| ----- | --------------------------------------------------------------- | -------------- |
| 1     | Tickets resolved by the systems' real state                     | Done `409dd6e` |
| 2     | Identity verification and access control                        | Done `63cf341` |
| 3     | Guidance, progressive hints (XP), Knowledge Base, AI context    | Done `8403f51` |
| 4     | Device inventory, Remote Desktop, device troubleshooting        | Done `69ae5fa` |
| 5     | Chat, voicemail, support calls, communication assessment        | Done `4faf405` |
| 6     | Security operations: console, investigations, incident response | Done `1f71ab7` |
| 7     | Cross-department incidents, consequences, prioritisation        | Done `aef82fa` |
| 8     | SLAs (office time), reports, workload, manager reviews          | Done `dd81d0e` |
| 9     | Competencies, portfolio evidence, readiness, career completion  | Done           |

## Next steps

All nine phases are done. The whole system is described in [DESKOPS.md](DESKOPS.md); each phase in the development log (IT Help Desk 1 to 9). Possible later work: more scenarios that combine several systems in one task, drag-and-drop windows in Remote Desktop, and a separate department performance score.
