# Tickets tied to the company's systems

A Help Desk ticket can be tied to the simulated systems (Network Tools and
Directory). It resolves because the problem is really fixed, never because the
player chooses Resolved. Code: `src/game/incidents.ts`; the first task using it:
`src/content/assignments/it/wifiOutage.ts` ("Floor 2 has lost its Wi-Fi").

## How it fits

```
Ticket queue (a Help Desk "tickets" document)
 ├─ tickets[]            each may have conditions, an assignee, a history, a resolution
 └─ environment          the systems the tickets are checked against
     ├─ network          a Network Tools state (the same schema as the tool's files)
     └─ directory        a Directory state

Help Desk window
 ├─ Ticket queue tab     TicketsEditor + TicketSystemsPanel
 ├─ Network Tools tab    the real NetworkWorkspace, on environment.network
 └─ Directory tab        the real DirectoryWorkspace, on environment.directory
```

- **One saved file.** The queue and its systems are one document, so autosave,
  versions, backups and restore cover both, and a change and the tickets'
  reaction to it are saved together.
- **The tools are the existing ones.** The tabs are the same workspaces as the
  Network Tools and Directory apps, with the same actions and sections.
- **Queues without an environment** (every task before this one) work exactly as
  before. Their tickets have no conditions, and their statuses are chosen freely.

## Conditions

Each condition is checked against the state as it is now (`evaluateCondition`).
It gives a pass or fail, a label ("AP-FL2 is responding") and what the system
shows ("AP-FL2 is not responding.").

| Condition          | System    | Passes when                                           |
| ------------------ | --------- | ----------------------------------------------------- |
| `device-up`        | Network   | the device is responding                              |
| `service-running`  | Network   | the service runs on a responding device               |
| `can-reach`        | Network   | from a computer, a host answers (on a port, if given) |
| `dns-record`       | Network   | the record points to the address                      |
| `account-unlocked` | Directory | the account is not locked                             |
| `account-enabled`  | Directory | the account is enabled                                |
| `password-reset`   | Directory | a temporary password has been issued                  |
| `in-group`         | Directory | the user is in the group                              |

- A ticket is fixed when it has conditions and every one passes.
- A system that is not connected to the queue fails safely, with an explanation.
- `can-reach` uses the network simulation's own route and DNS logic, so it agrees
  with what `ping` and `portcheck` show.

### Wi-Fi in the network simulation

A device can have an `accessPoint` (optional; none of the older scenarios set one).
While that access point is down, the device is on but off the network:

- its route stops at the access point;
- other devices cannot reach it;
- a remote session to it cannot start;
- the map shows it as "No network", with "Wi-Fi through AP-…".

A new fault, "Device stopped responding (can be restarted remotely)", describes a
crashed device, as opposed to one that needs someone on site.

## Events, not polling

Every change to a system goes through `applyEnvironmentChange(content, system,
change, moment)`:

1. The tool's action makes the new state (the same pure actions the tool uses).
2. `networkChanges` or `directoryChanges` compares it with the state before. They
   report what changed (a device up or down, services, settings, DNS records,
   accounts, groups) and the fix the player made (the tool's action log or audit
   log).
3. Only tickets with a condition that depends on a change are looked at again.
   Reaching a host depends on the whole route, so any network state change counts
   for `can-reach`. The other conditions depend on what they name.
4. The ticket moves on (below), and each step is written to its history.

Console commands, findings and other changes that alter nothing a condition
depends on leave every ticket as it was. Nothing is random, and nothing runs on a
timer.

## Lifecycle

| Status (stored) | Shown as                       | How it is reached                                  |
| --------------- | ------------------------------ | -------------------------------------------------- |
| `new`           | Open (not assigned)            | the ticket arrives                                 |
| `assigned`      | Assigned                       | Assign to me                                       |
| `open`          | In progress                    | chosen, or the first change to what it is about    |
| `pending`       | Waiting for information        | chosen                                             |
| `resolved`      | Resolved (problem fixed)       | automatically, when every condition passes         |
| `reopened`      | Reopened (the fault came back) | automatically, if a condition fails before closing |
| `closed`        | Closed                         | chosen, only from Resolved; final                  |

- **Choosing Resolved** checks the conditions first (`requestStatus`). If one
  fails, the status stays and the player sees what is still broken. The attempt
  is kept in the history ("Not resolved: …"). If they all pass, it is resolved
  by hand (`resolution.by: 'manual'`). For example, a queue whose systems were
  fixed before the tickets could react.
- **Automatic resolution** (`resolution.by: 'automatic'`) records the
  explanation: the conditions' states, e.g. "AP-FL2 is responding. LT-0161
  reaches file-01 (port 445)." The requester is sent an update (in the history).
- **Once only.** A ticket is resolved on the change to resolved, so later
  changes add no second resolution or update.
- **Closed is final.** A closed ticket does not change again, whatever happens
  to the systems.

## Colleagues held up

A ticket's `requester` is an office person ID (for example `front2`, Carmen Ruiz).
`disruptionsOf(queue)` lists, per requester, whether they are held up (the
conditions fail) or back to work (they pass). This follows the systems, not the
status.

- The Help Desk window keeps it in the profile (`work.disruptions`, additive,
  default `[]`) with `career.syncDisruptions`. Starting the task sets it too.
- In the office, walking up to that colleague shows it in the encounter. While
  held up, they look up from "a laptop that will not connect" and say so. Once it
  is fixed, they thank the player.
- This applies only while the task is under way. Nobody else is affected.

## Grading

- **`fixed`** (a new ticket check): the ticket's conditions pass in the systems as
  handed in, and it is resolved or closed. Choosing Resolved earns nothing.
- **The environment's checks:** each system in a task can carry that tool's own
  checks, graded by the tool's grader (`gradeEnvironment`).
  - The Wi-Fi task uses a Network Tools `finding` (the cause recorded).
  - It also uses `evidence` (the access point tested from the desk, and a test
    from the user's laptop). An evidence item can now require the command's
    output to match, e.g. a reply, so the test must have worked, not only been
    run.
- **Replies** are graded as before (`reply`).

## Writing a task with these tickets

In the task's `queue`:

- give each ticket a `requester` (office person ID) and its `conditions`;
- add `environment.network` and/or `environment.directory`, each with `start`
  (the scenario with its faults), `solution` (the model answer) and `checks`;
- add `fixed` ticket checks.

`applyTicketSolution` applies the model answer's systems, so the model answer is
graded on the real fixes. The tests in `src/game/incidents.test.ts` check that it
gets full marks.

## Limits (phase 1)

- Two systems are connected: Network Tools and Directory. There is no remote
  desktop, mail or phone yet.
- The requester's update is written to the ticket's history; no email is sent.
- The colleague's consequence is in what they say and seem to be doing. Their
  animation in the 3D office does not change.
- Tickets tied to the systems are in one task so far ("Floor 2 has lost its
  Wi-Fi"). The earlier IT tasks are unchanged.
