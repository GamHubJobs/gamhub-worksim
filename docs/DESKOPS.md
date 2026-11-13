# The IT Help Desk as an IT operations simulation

The IT Help Desk career is a working IT service desk and IT operations
simulation inside the 3D workplace ("DeskOps" is its internal name; the app is
still called Help Desk).

- **The 3D office stays the world:** colleagues walk up, are held up by real
  faults, and react to what the player does.
- **The work happens on the player's work computer,** in the Help Desk, which
  opens as a full IT operations application.

Phase by phase, with the details of each: the development log (IT Help Desk 1
to 10), [IT_OPERATIONS_TOOLS.md](IT_OPERATIONS_TOOLS.md), [STATE_AWARE_TICKETS.md](STATE_AWARE_TICKETS.md),
[IDENTITY_VERIFICATION.md](IDENTITY_VERIFICATION.md), and the continuation
record [DESKOPS_CONTINUATION.md](DESKOPS_CONTINUATION.md).

## The principle

**A ticket is resolved because the problem is really fixed, never because
someone chose Resolved.** Every ticket can carry conditions on the simulated
systems, and the systems decide.

The same holds for the rest:

- an account change needs a verified person;
- a security incident moves on only when its work is done;
- a competency needs passed work that shows it.

## How it fits together

```
Help Desk window (the shell: a sidebar of sections)
 ├─ Service desk:    Overview · Ticket queue · Knowledge Base · Reports
 ├─ Systems:         Network Tools · Directory · Device Management · Remote Desktop
 ├─ Communications:  Chat · Voicemail · Calls
 ├─ Security:        Security Console
 └─ Tools (always):  Server Room · Computer Deployment · PC Shelf · Repair Bench ·
                     Mail Admin · Mail Security · Asset Management · Ship Manager

One saved document per scenario (a "tickets" document):
 tickets[]           conditions, history (with office time), assignee, hints, impact, SLA data
 environment         network · directory · devices · comms · soc · itops  (each a tool's own state)
 officeDay           when the queue started, for SLAs
```

- **Every change goes through one function,** `applyEnvironmentChange`
  (`src/game/incidents.ts`), which:
  - compares the system before and after;
  - lets only the tickets that depend on what changed react (resolve,
    reopen, write their history);
  - adds the follow-ups: security events into ticket histories, tickets
    opened from voicemail and calls, and messages from colleagues.

  There is no polling and no timer.

- **The tools are pure** (`src/tools/<tool>/`): state, actions that enforce
  their own rules, and graders. Their screens are loaded when opened.

| System    | Folder                | What it simulates                                                                        |
| --------- | --------------------- | ---------------------------------------------------------------------------------------- |
| Network   | `src/tools/network`   | Devices, services, DNS, Wi-Fi access points, the console's commands                      |
| Directory | `src/tools/directory` | Accounts, groups, assets; identity verification and the security policy                  |
| Devices   | `src/tools/devices`   | Computers: apps, services, processes, storage, updates, settings, print queue, event log |
| Comms     | `src/tools/comms`     | Chat channels, voicemail, support calls and the communication assessment                 |
| Security  | `src/tools/soc`       | Sign-ins, alerts, endpoints, emails, mailboxes, accounts, and an incident with 8 stages  |
| IT Ops    | `src/tools/itops`     | Server room, mail and filter, asset register and shelf, shipping, licences, builds       |

## What the player learns, task by task

| IT order | Task                                      | Level   | What is new                                            |
| -------- | ----------------------------------------- | ------- | ------------------------------------------------------ |
| 7        | Floor 2 has lost its Wi-Fi                | Analyst | Tickets checked against the systems                    |
| 8        | The Account Unlock Request                | Analyst | Identity verification and authorisation                |
| 9        | Slow laptops and stubborn apps            | Analyst | Device Management and Remote Desktop                   |
| 10       | Phones, voicemail and chat                | Analyst | Communications and the communication assessment        |
| 11       | The server room and the mail system       | Analyst | The Tools menu: Server Room, Mail Admin, Mail Security |
| 12       | A dead laptop, a new supervisor, a parcel | Analyst | Computer Deployment, PC Shelf, assets, Ship Manager    |
| 15       | Incident response: a compromised account  | Senior  | The Security Console and incident response             |
| 19       | One morning, five departments             | Lead    | Business impact, prioritisation, consequences          |
| 20       | A full day on the desk                    | Lead    | SLAs on the office clock, arrivals, reports            |
| Final    | Readiness: run the service desk           | Lead    | Unguided practical work and the judgement around it    |

## Learning support

- **Guidance on every ticket** (`src/game/guidance.ts`):
  - what the systems show is still wrong;
  - what was tried;
  - four progressive hints built from the real state.

  Each hint takes 5% off the task's XP (at most 30%), never the score.

- **The IT Knowledge Base** (`src/content/knowledge/it.ts`): 29 articles, with
  search and bookmarks; offline.
- **WorkSim AI** (the existing assistant, with a built-in offline guide or the
  player's own provider) sees the ticket's real situation. It explains and
  never solves graded work, and it cannot change the systems.

## Consequences and progression

- **Colleagues:**
  - held up in the 3D office while their problem lasts, and they say so;
  - they thank the player once it is fixed;
  - a fix that would have been unsafe is refused, not hidden.
- **Trust and reputation** (the existing relationship system) follow the real
  outcome of each Help Desk task, once.
- **Manager reviews** name strengths and improvements from the recorded
  results.
- **Competencies:** 14 IT operations competencies (`src/game/itCompetencies.ts`)
  from passed work's checks; work without hints counts as stronger evidence.
  Shown in Readiness and the Portfolio, with a service record from the
  player's own queues.
- **Career completion:**
  - it needs every IT task and the final readiness assessment;
  - the completion record says what was demonstrated;
  - it states that it is not a certification or a promise of employment.

## What is simulated, and what is not

- **All simulated:** every company, person, address, badge, account, email and
  attack is fictional and simulated. Nothing connects to real systems or the
  player's computer, no real credentials exist, and security scenarios use
  reserved example addresses.
- **Calls are written dialogues:** the browser can read lines aloud where it
  has voices, but there is no speech recognition and no paid service.
- **Time is the office clock:** SLAs and arrivals use the game's own office
  clock; nothing uses real-time timers.
