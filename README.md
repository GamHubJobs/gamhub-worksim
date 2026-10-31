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

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Run the app locally with instant reload          |
| `npm run build`   | Check types and build the production version     |
| `npm run preview` | Preview the production build locally             |
| `npm run lint`    | Check the code for common mistakes (Oxlint)      |

## Documentation

- [Architecture overview](docs/ARCHITECTURE.md)
