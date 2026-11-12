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
| 6     | Security operations: console, investigations, incident response | Done           |
| 7     | Cross-department incidents, consequences, prioritisation        | In progress    |
| 8     | SLAs (office time), reports, workload, manager reviews          | To do          |
| 9     | Competencies, portfolio evidence, readiness, career completion  | To do          |

## Next steps

**Phase 7: cross-department incidents, consequences, prioritisation.**

- Tickets gain an optional `impact` (business service, people affected,
  deadline), passed from `QueueSchema`. The Overview shows a Business impact
  panel: per department, the people held up and what is at risk.
- **Consequences** (existing systems): when a Help Desk task is first
  submitted, each requester's trust changes with their ticket's outcome
  (fixed, or not), and reputation follows the overall outcome. This lives in
  `useCareer.submitAssignment`, via a pure `serviceOutcomes(content)` in
  `game/incidents.ts`, applied with `changeTrust` and `changeReputation`.
- **Task "One fault, five departments"** (service-desk-lead, IT order 17, at
  the end, so nothing is renumbered). On the network:
  - file-01's file sharing has stopped (Finance, Accounting, Data);
  - a development server is down (Engineering);
  - Marketing's publishing tool cannot reach the intranet;
  - low-priority requests interrupt.

  It is graded on the fixes and on the priorities (`field` checks).

**Phase 8: SLAs on the office clock, reports, workload, manager reviews.**

- `TicketActivity` gains `office` (absolute office minutes, from `Moment`).
  The queue gains `officeDay`.
- **`game/sla.ts`:** targets by priority, response and resolution due, time
  remaining, met, at risk or breached. Shown in the queue, the ticket and the
  Overview.
- **A Reports section:** `serviceReport` over all the player's IT queues
  (loaded with `getDocument`). It shows received, resolved, reopened, average
  resolution, overdue, categories, departments, escalations, first-contact
  resolution, and satisfaction (each formula documented).
- **Workload:** tickets can arrive later in the office day (`arrives`
  minutes); a task with arrivals.
- **Manager reviews:** `reviewFor` adds IT service evidence (fixes, security
  checks, communication checks, documentation) from the attempts' checks.

**Phase 9: competencies, portfolio, readiness, completion.**

- **`game/itCompetencies.ts`:** 14 IT operations competencies, mapped to tasks
  and checks. Levels come from passed portfolio items' checks; independent
  work (no hints) counts as stronger evidence. Shown in Portfolio and
  Readiness for the IT career.
- **Portfolio:** DeskOps evidence summaries (tickets, incidents,
  investigations, communication assessments, manager feedback).
- **The IT readiness assessment** is extended with a practical scenario.
- **A career completion record** reflects the demonstrated competencies, and
  is clearly not a real-world certification.
