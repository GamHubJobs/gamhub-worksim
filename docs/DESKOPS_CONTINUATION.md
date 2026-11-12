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
| 3     | Guidance, progressive hints (XP), Knowledge Base, AI context    | Done           |
| 4     | Device inventory, Remote Desktop, device troubleshooting        | In progress    |
| 5     | Chat, voicemail, support calls, communication assessment        | To do          |
| 6     | Security operations: console, investigations, incident response | To do          |
| 7     | Cross-department incidents, consequences, prioritisation        | To do          |
| 8     | SLAs (office time), reports, workload, manager reviews          | To do          |
| 9     | Competencies, portfolio evidence, readiness, career completion  | To do          |

## Next steps

Phase 4 (devices). Drafted, not yet in the repository: a Devices tool
(`src/tools/devices/`: schema, model with the actions, data with the company's
fleet, definition with the checks, DevicesWorkspace with Device Management and
Remote Desktop) and the task `content/assignments/it/deviceSupport.ts` ("Slow
laptops and stubborn apps", IT order 9).

1. Add the device conditions to `TicketConditionSchema`: `device-performance`,
   `disk-free`, `app-working`, `device-service`, `network-standard`,
   `updates-installed`, `print-queue-clear`.
2. In `incidents.ts`:
   - `SystemId` gains `devices`;
   - `evaluateDevices`, `devicesChanges` and `entitiesOf` cover it.
3. Wiring:
   - `TicketEnvironment` and `QueueSchema.environment` gain `devices`;
   - `tickets.ts` builds and solves it;
   - register the tool and its workspace.
4. `ToolWorkspaceProps` gains `initialSection`, `reachable` and `related`.
5. The Help Desk sidebar adds Device Management and Remote Desktop.
6. Guidance hints for the device conditions; colleagues' lines for "their
   computer"; renumber the later IT tasks (9 onwards move by one).
7. Tests: unit (model, conditions, guidance), integration (the task's model
   answer at 100%), browser (Remote Desktop fixes resolve tickets).
