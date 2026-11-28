# GamHub WorkSim

A single-player virtual workplace and career simulation. Players build practical
workplace skills by completing realistic assignments in simulated productivity
software, working with virtual coworkers and progressing through a career.

> **Status:** Phase 0 (Foundations): local saving, autosave, recovery and backups.
> Private, commercial project. Do not share the source code.

## Requirements

- [Node.js](https://nodejs.org/) (LTS or newer)
- Git
- A desktop browser (Chrome recommended during development)

## Getting started

```
npm install     # download the project's tools (first time only)
npm run dev     # start the app at http://localhost:5173
```

Stop the app with `Ctrl+C` in the terminal.

## Commands

| Command                | What it does                                      |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Run the app locally with instant reload           |
| `npm run build`        | Check types and build the production version      |
| `npm run preview`      | Preview the production build locally              |
| `npm run check`        | Run all checks below (do this before committing)  |
| `npm run lint`         | Check the code for common mistakes (Oxlint)       |
| `npm run typecheck`    | Check that data types are used correctly          |
| `npm test`             | Run the automated tests once                      |
| `npm run test:watch`   | Re-run tests automatically whenever you save      |
| `npm run test:e2e`     | Run the browser tests (a robot uses the real app) |
| `npm run format`       | Automatically tidy the formatting of all files    |
| `npm run format:check` | Report files that are not tidily formatted        |

First-time setup for browser tests: `npx playwright install chromium`.

**If browser tests fail on a busy computer.** The tests use the development server,
which prepares each part of the game the first time it is asked for. On a heavily
loaded machine the game can take longer than a check's 5-second wait to open, so
tests fail right after a start or a reload, still showing "Opening GamHub WorkSim…".
To tell this apart from a real fault:

1. Close other programs, and stop other development servers (ports 5173, 5174, 4173).
2. Rerun only the failed files, one at a time, with no retries:
   `npx playwright test tests/e2e/<file>.spec.ts --workers=1 --retries=0`
3. Open the failure's `test-results/<test>/error-context.md`. A page that still
   reads "Opening GamHub WorkSim…" means the machine was slow; anything else is
   worth investigating.
4. To check that a failure is not new, run the same test on an earlier commit
   (for example in a `git worktree`) on the same machine.

Do not lengthen the waits to make such a run pass.

## Documentation

- **[Player handbook](docs/PLAYER_HANDBOOK.md): start here**

- [Architecture overview](docs/ARCHITECTURE.md)
- [Cases: a guide for players](docs/CASES_GUIDE.md)
- [Your career: record, achievements, desk and readiness](docs/CAREER_GUIDE.md)
- [Accessibility](docs/ACCESSIBILITY.md)
- [Installing WorkSim and using it offline](docs/INSTALL_AND_OFFLINE.md)
- [Privacy, security and your data](docs/PRIVACY_AND_SECURITY.md)
- [Supported browsers](docs/BROWSERS.md)
- [Development log](DEVELOPMENT_LOG.md): completed work, decisions and next tasks
