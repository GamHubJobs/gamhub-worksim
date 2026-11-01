# Phase 7 plan: Career Intelligence, Engagement and Accessibility

Status: **implemented** (milestones 7.1 to 7.7, November 2026). What was built, and the
tests, are recorded in [DEVELOPMENT_LOG.md](../DEVELOPMENT_LOG.md); the player guide is
[CAREER_GUIDE.md](CAREER_GUIDE.md).

## Goal

Make WorkSim more engaging, personal, accessible and fast, and more useful as a record of
professional development. Everything builds on the existing careers, cases, workday,
progression and portfolio; nothing is bolted on.

## Principles

- **Traceable numbers.** Every statistic, rating or achievement is computed from saved
  activity (task attempts, case results, relationships, promotions), and the screen
  says how. No invented scores.
- **Earned, never bought.** Achievements and desk items are earned only by doing the
  work. No streaks, no log-in rewards, no scarcity, no payments, and at most one quiet
  notice per achievement.
- **Honest.** The simulation is simulated experience. Readiness assessments show what
  the player demonstrated in the simulation; they are never certificates or
  qualifications.
- **Balanced.** Every feature works in all six careers, with automated balance checks.
- **Safe data.** Profile format 4 adds new records with defaults and an upgrade step;
  old saves and backups keep working; frozen portfolio evidence never changes.
- **Local-first, free.** No backend, no paid or AI services; deterministic, authored
  content.

## Milestones

| #   | Milestone                                          | Acceptance                                                                                                                                                                            |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | Career-wide performance record (save format 4)     | Career app shows clients, budgets, approvals, incidents, meetings, hand-offs, leadership, relationships, projects and promotions, each with its source; promotions history kept       |
| 7.2 | Achievements and desk customisation                | Achievements unlock from real play in every career; earned desk items appear in the 3D office and persist                                                                             |
| 7.3 | Varied cases and new cases                         | Names, figures and circumstances vary per career save; answers and grading follow the variation; difficulty is unchanged; new cases balanced across careers                           |
| 7.4 | Career readiness assessments                       | A practical, timed assessment per career level built from real steps and files; retakes after a fail; history kept; required for the senior levels without removing existing progress |
| 7.5 | Performance: code splitting and startup            | The first download is much smaller; the 3D office and heavy tools load when needed; measured before and after                                                                         |
| 7.6 | Accessibility                                      | Keyboard-only workflows through the office, a task and a case; focus, dialogs, announcements, reduced motion, contrast                                                                |
| 7.7 | Portfolio integration, hardening and documentation | Achievements, readiness results and the record reach the portfolio, report and exports; full regression across six careers                                                            |

Each milestone has unit tests, browser tests of its real workflow, a regression run,
documentation and a development log entry, then a commit and push.

## Design notes

### Save format 4

`work.record` (with defaults) holds what cannot be recomputed later:

- `promotions`: the level reached, the day and the XP at the time.
- `achievements`: the ID and when each was earned.
- `assessments`: every readiness attempt with its result.
- `desk`: the desk items the player has chosen.
- `seed`: the per-save seed for case variation.

Everything else in the record (clients served, approvals, incidents and so on) is
derived from saved case results and task attempts, so it is always consistent with the
evidence.

### Case variation

A variant is chosen deterministically from the save's seed and the case ID. Variants
replace names, organisations, figures and circumstances, and supply the answers that
match them: a variant changes the scenario, not what is assessed or how hard it is. The
case progress records which variant was used, so a save always reopens the same
scenario, and the portfolio's frozen case record keeps the variant's wording.

### Readiness assessments

An assessment is a timed piece of work for the player's current level. It is built on
the case engine, uses evidence, figures, decisions, written communication and a real
document made in Docs or Slides, and is graded with explanations, strengths and areas
to improve. A failed attempt can be retaken (with a different variant) after practice.
From level 2, the next promotion also asks for a passed assessment of the current
level (80% needed, so the report cannot be skipped). Players who already hold a level keep it.
