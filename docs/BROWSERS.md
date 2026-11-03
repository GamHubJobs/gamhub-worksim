# Supported browsers

WorkSim runs in current desktop browsers. Use it on a desktop or laptop computer; it
is not designed for phones.

## Recommended

| Browser         | Minimum version | Tested                                               |
| --------------- | --------------- | ---------------------------------------------------- |
| Google Chrome   | 111             | Every browser test (Chromium engine)                 |
| Microsoft Edge  | 111             | Core journey, backup and restore, offline (Edge 156) |
| Mozilla Firefox | 128             | Core journey, backup and restore, offline            |
| Apple Safari    | 16.4            | Core journey and backups in the WebKit engine only   |

The minimum versions come from the styling WorkSim uses (Tailwind CSS 4); older
versions may show the app incorrectly.

## What WorkSim needs from the browser

| Capability                  | Used for                           | If it is missing                                                                   |
| --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| IndexedDB (browser storage) | Saving everything                  | WorkSim explains that it cannot save (for example in some private modes) and stops |
| JavaScript modules, Workers | The app, Code tests, SQL           | Required                                                                           |
| WebAssembly                 | The SQL database in Data Studio    | Required for Data Studio                                                           |
| WebGL                       | The 3D office                      | The office panel and Places still work fully; the 3D picture is not shown          |
| Service workers             | Offline use and installing         | WorkSim works online only; Storage & backup says so                                |
| Persistent storage          | Stopping the browser clearing data | Data is still saved; the browser may clear it if the disk is very full             |

Computers without a graphics card draw the 3D office in software. WorkSim notices
this and draws it more simply, at fewer frames per second, so the rest stays
responsive.

## How it was tested (November 2026, Windows)

- **Chromium:** every browser test (more than 130).
- **Firefox, WebKit and Edge** (`npm run test:browsers`, production build):
  - the core journey: start, office, mail, Sheets with a formula, Docs, Slides,
    saving across a reload;
  - backup and restore between two browser profiles, and switching career;
  - offline start (Firefox and Edge).
- **Memory** (`scripts/measure-memory.mjs`, Chromium, production build):
  - about 5 MB of JavaScript memory at the start screen and 17 MB in the 3D office;
  - opening Sheets, Docs and Slides five times over stays at about 15 MB, so memory
    does not keep growing.

## Known differences and limits

- **Firefox** cannot install web apps on desktop, but it works offline in a tab.
- **WebKit** was tested only as Playwright's WebKit on Windows, which is slow and does
  not run service workers. Real Safari on macOS has not been tested: offline use
  there is expected to work, but is unverified.
- **Phones and tablets** are not supported: the apps need a keyboard and a larger
  screen.
- **The 3D office on very old computers** may be slow even in its simpler mode; the
  office panel does everything without it.
