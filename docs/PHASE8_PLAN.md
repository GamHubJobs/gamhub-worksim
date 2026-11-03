# Phase 8 plan: Launch Readiness and Ecosystem

Status: **implemented** (milestones 8.1 to 8.9, November 2026). What was built, and the
tests, are recorded in [DEVELOPMENT_LOG.md](../DEVELOPMENT_LOG.md); players start with
[PLAYER_HANDBOOK.md](PLAYER_HANDBOOK.md).

## Goal

Bring WorkSim to a stable, installable, accessible and reliable release-ready state:

- faster loading;
- assessments in the real profession tools;
- more varied cases;
- an installable offline app;
- hardened data safety;
- clear documentation;
- a full regression.

No new unrelated features, no cloud, no costs.

## Milestones

| #   | Milestone                                     | Acceptance                                                                                       |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 8.1 | Career-specific content loading               | Only the careers with a save are loaded; a failed load can be retried; measured before and after |
| 8.2 | Profession-specific readiness assessments     | Each assessment includes real work in the career’s own tool, graded by that tool’s checks        |
| 8.3 | Expanded case variations and advanced cases   | More varied cases, a second advanced case per career, every variant tested                       |
| 8.4 | Accessibility validation                      | Automated checks on the editors too; a screen-reader test checklist; honest limits               |
| 8.5 | Installable progressive web app               | Manifest, icons, service worker, offline start, safe updates, tested offline                     |
| 8.6 | Security and data-integrity hardening         | Backups validated and protected; safety copies before restores; dependency audit                 |
| 8.7 | Onboarding, documentation and user experience | A player handbook covering every topic in the brief; clearer first steps                         |
| 8.8 | Browser compatibility and performance         | Tested in Chromium, Firefox and WebKit engines where available; requirements documented          |
| 8.9 | Final end-to-end regression                   | Every career and the full journey tested; every reproducible defect fixed                        |

## Design notes

### Career content (8.1)

Each career's tasks, cases and assessments live in a **content pack**
(`content/packs/<career>.ts`), loaded by `content/loader.ts` when needed:

- **At start:** the content of every career that has a save is loaded before the desk
  opens. A new player loads none until a career is chosen.
- **Switching:** switching to another career loads its content first.
- **Lookups:** the content lists (`ASSIGNMENTS`, `CASES`, `ASSESSMENTS`) are registries
  filled as packs load, so the game's lookups stay simple and synchronous.
- **Failures:** a pack is loaded once. A failed load is forgotten so it can be tried
  again, and the player is told what to do.

What every career shares stays in the main bundle: careers, departments, the office,
the tools, the organisation, projects and case variants.
