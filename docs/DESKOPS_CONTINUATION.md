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
| 4     | Device inventory, Remote Desktop, device troubleshooting        | Done           |
| 5     | Chat, voicemail, support calls, communication assessment        | In progress    |
| 6     | Security operations: console, investigations, incident response | To do          |
| 7     | Cross-department incidents, consequences, prioritisation        | To do          |
| 8     | SLAs (office time), reports, workload, manager reviews          | To do          |
| 9     | Competencies, portfolio evidence, readiness, career completion  | To do          |

## Next steps

Phase 5 (communications). Drafted outside the repository (the session's
scratchpad, `p5/`); if that is lost, rebuild it from this plan:

- **A Communications tool** (`src/tools/comms/`):
  - **schema:** channels, messages, voicemails and calls. A call is a dialogue
    tree whose options carry qualities: tone, questions, clarity, jargon,
    empathy, updates, closing.
  - **model:** mark read, send, listen, create a ticket from a voicemail or
    call, link to a ticket, mark handled, answer, say, notes, and
    `assessCall`.
  - **definition:** checks `call` (minScore), `routed` (new, or a ticket ID)
    and `chat` (mentions).
  - **CommsWorkspace:** Chat, Voicemail and Calls, using the browser's own
    speech for audio, with the transcript always shown.
- **Task `serviceDeskComms.ts`** ("Phones, voicemail and chat", IT order 10):
  - **Systems:** comms and devices.
  - **Voicemail:** Grace's, linked to INC-3401; Dana's, a new ticket.
  - **Calls:** Ben, a frustrated caller whose call becomes ticket INC-3411,
    tied to DT-0181's Office Suite; Arjun, an unverified password reset.
  - **Chat:** an update in #finance.

Wiring:

1. `TicketEnvironment` and `QueueSchema.environment` gain `comms`.
2. In `incidents.ts`:
   - **Tickets from communications:** a voicemail or call with
     `ticket === opens.id` adds that ticket to the queue (once), with its
     conditions validated by `TicketConditionSchema`. Linking adds a history
     note to the existing ticket.
   - **Follow-ups:** when a ticket becomes resolved or reopened, the requester
     sends a direct message (one per ticket and event).
3. `applyTicketSolution` materialises the tickets from the comms solution.
4. `ToolWorkspaceProps` gains `tickets`, `presence` and `officeTime`.
   Presence comes from the office schedule (`OFFICE_PEOPLE`: hours, lunch,
   meetings).
5. The shell gets a Communications group: Chat, Voicemail, Calls.
6. Renumber the later IT tasks (10 onwards move by one).
7. Tests:
   - unit: model, assessment, routing, follow-ups;
   - the model answer at 100%;
   - browser: voicemail link and create, a call to its assessment, a chat
     update, then fixing Ben's PC resolving his ticket, which brings a thank
     you.
