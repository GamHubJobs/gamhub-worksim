# Phase 6 plan: Real-World Career Simulation

Status: **in progress** (authorised by the owner on 1 November 2026). Progress is recorded
in [DEVELOPMENT_LOG.md](../DEVELOPMENT_LOG.md).

## Goal

Make Cobalt Ridge feel like a functioning organisation: work arrives from clients,
colleagues, suppliers and other departments; it has context, deadlines and consequences;
departments depend on each other; budgets and approvals matter; meetings produce
deliverables and actions; incidents need judgement; senior players lead. Everything
connects to the existing careers, tools, colleagues, workday, progression and portfolio.

## Architecture: one engine, not seven features

**Cases** are the unit of real workplace business (`src/game/cases/`, content in
`src/content/cases/`). A case:

- **arrives** from a person (client, colleague, supplier, another department) at a natural
  point: after a task is passed, after another case, at a career level, or on a day;
- comes by **email** (and, for in-person matters, as a colleague at the desk), with
  **evidence** to examine (messages, tables, records) and a **deadline** in office time;
- has **steps** the player completes in the **Cases** app:
  - `review`: mark which findings in the evidence are problems (investigation);
  - `figure`: work out a number from the evidence (with a tolerance);
  - `decide`: choose a course of action; every option has a verdict (best, acceptable,
    poor) and the reasoning, so outcomes are explained, never arbitrary;
  - `approve`: approve, reject or escalate requests against budget, policy and the
    player's approval authority;
  - `assign`: delegate work items to team members by skill and capacity (leadership);
  - `actions`: record meeting actions with owners (minutes and follow-up);
  - `reply`: write a response (checked for what it must say and must not promise);
  - `document`: produce a Doc, Sheet or Slides file with the existing apps, graded by the
    existing deliverable checks;
- is **graded** step by step (points, reasons, a rating), answered by the requester, and
  has **consequences**: trust, reputation, department budgets and the organisation's
  indicators (client satisfaction, operational risk, budget discipline);
- **lapses** with a small, explained consequence if ignored past its deadline;
- becomes **portfolio evidence** when passed (a frozen record of the case, the
  decisions and their reasoning, and any documents), in the same transaction as the grade.

**The organisation** (`src/content/organisation.ts`): departments with heads, budgets and
approval limits by level; clients and suppliers; the indicators. Per career save, state
lives in `profile.work.cases` and `profile.work.org` (new fields with defaults, so
existing saves load unchanged; profile format 3 with a tested migration).

**Leadership** is a level gate on cases: `assign`, review-of-team-work and
resource-allocation cases only arrive at senior levels; interns never get authority.

**Cross-functional work** uses case chains that move between departments (a hand-off
case carries data that later cases check), and an organisation-wide programme in which
every career has its own stages while simulated colleagues deliver the other departments'
parts on a shared programme board.

## Milestones

| #   | Milestone                                                  | Acceptance                                                       |
| --- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| 6.1 | Organisation model, case engine, Cases app, save migration | A case arrives, is worked, graded with reasons, has consequences |
| 6.2 | Clients and customers (all six careers)                    | Every career has client cases whose responses change outcomes    |
| 6.3 | Business operations: budgets, purchases, approvals         | Spend limits and approval authority behave correctly             |
| 6.4 | Interdepartmental workflows                                | Hand-offs carry correct information between departments          |
| 6.5 | Meetings 2.0: preparation, meeting, minutes, actions       | Meetings produce real deliverables and follow-up actions         |
| 6.6 | Complex workplace incidents                                | Incidents are resolved by investigation, judgement and work      |
| 6.7 | Management and leadership                                  | Leadership cases unlock only at senior levels, for every career  |
| 6.8 | Cross-functional programme: the company expansion          | Every career contributes; evidence reaches the portfolio         |
| 6.9 | Office integration, balance, hardening, documentation      | All six careers tested end to end; no regressions                |

Each milestone ships with unit tests (engine rules, content consistency, every case's
model answer scores full marks), browser tests of the important workflows, save and
recovery tests, and a regression run, then a commit and push.

## Principles

- Deterministic, authored scenarios; no AI services, no backend, no multiplayer.
- Explain every outcome: each graded step shows what was expected and why.
- Fair consequences: small, explained, recoverable; no arbitrary penalties.
- Balance: every career gets the same kinds of cases in similar numbers.
- Data safety: validated state, defaults for old saves, migration and backup tests.
