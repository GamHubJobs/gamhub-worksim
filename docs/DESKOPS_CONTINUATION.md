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
| 5     | Chat, voicemail, support calls, communication assessment        | Done           |
| 6     | Security operations: console, investigations, incident response | In progress    |
| 7     | Cross-department incidents, consequences, prioritisation        | To do          |
| 8     | SLAs (office time), reports, workload, manager reviews          | To do          |
| 9     | Competencies, portfolio evidence, readiness, career completion  | To do          |

## Next steps

Phase 6 (security operations). Drafted outside the repository (the scratchpad,
`p6/`); if that is lost, rebuild it from this plan.

- **A Security Console tool** (`src/tools/soc/`):
  - **schema:** sign-ins, alerts, endpoints, emails, mailboxes, accounts, an
    incident with stages, and the scenario's truth (for validation, never
    shown).
  - **model:** actions validated against the truth; a wrong action is
    recorded as a mistake with a consequence; `blockers` and `advance` gate
    each stage.
  - **data:** `securityScenario` (a phishing email, an overseas sign-in, a
    forwarding rule, a remote-access program on LT-0171, and false alarms).
  - **definition:** checks `stage`, `no-mistakes` and `report`.
  - **SecurityConsole** (a dark operations-centre theme).
- **Task `securityIncident.ts`** ("Incident response: a compromised
  account", senior support analyst, IT order 13; the project tasks move to
  14–16). Carmen's ticket INC-3501 has the condition
  `incident-closed: IR-2026-014`.

Wiring:

1. `TicketConditionSchema` gains `incident-closed`; `incidents.ts` evaluates it
   (system `soc`), with changes on stage.
2. `disruptionsOf` adds the consequences:
   - a device isolated by mistake holds up its user ("their computer");
   - an account disabled by mistake holds up its owner ("their account");
   - the compromised device, while isolated, holds up its own user.
3. The environment and the content schema gain `soc`; register the tool and
   its workspace; the shell gets a Security group with the Security Console.
4. Tests:
   - unit: each gate, mistakes and consequences;
   - the model answer at 100%;
   - browser: the whole lifecycle, refusals before evidence, and a wrong
     isolation's consequence.
