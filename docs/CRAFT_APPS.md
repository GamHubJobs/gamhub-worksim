# The office apps: Grid Craft (and next, Word Craft and Deck Craft)

The office computer runs real productivity software. Each app is the official,
unmodified web build of an open-source project by the ArtCraft team, run in a window
of the desktop. The player's files are kept in their WorkSim save, like every other
file.

| App        | Built from                                                         | Status      |
| ---------- | ------------------------------------------------------------------ | ----------- |
| Grid Craft | [GridCraft](https://github.com/storytold/gridcraft) 0.18.0         | In the game |
| Word Craft | [WordCraft](https://github.com/storytold/wordcraft) (Docs today)   | Next        |
| Deck Craft | [DeckCraft](https://github.com/storytold/deckcraft) (Slides today) | After that  |

## Where the apps come from

- `scripts/crafts/crafts.json` pins each app: the release version, the download URL
  and its SHA-256 checksum.
- `scripts/crafts/fetch.mjs` (run by `npm run dev`, `npm run build`, or by hand with
  `npm run crafts`):
  - downloads the release ZIP once into `.cache/crafts/`;
  - refuses it unless the checksum matches;
  - unpacks it into `public/crafts/<app>/`, with a `craft.json` recording what was
    installed.
- Neither folder is committed (`.gitignore`), and neither is the extracted source in
  `artcraft-source/`. Without the network and with no cached download, the script
  warns and the game uses its basic editors.

### Updating an app

1. Change its version, URL and checksum in `crafts.json`. The checksum is in the
   release's `SHA256SUMS.txt`, and GitHub shows it for each file.
2. Run `npm run crafts`.
3. Run `npm run crafts:fixture`. This rebuilds the unit tests' fixture with the new
   version.
4. Run the tests (see below).

### Why the build was chosen

- The web builds of v0.18.0 are byte-for-byte the official release files: the
  checksum matches the release's `SHA256SUMS.txt` and GitHub's own record.
- `SHA256SUMS.txt` is also PGP-signed. The signing key, `568DC1F6…B0EF334E`, is not
  published anywhere I could find, so the signature could not be checked. That was
  the case on 2026-11-11.
- v0.16.0, the version of the extracted source, has host mode but not the page
  command API. v0.18.0 has both. Its `apps/gridcraft-web/src` is identical to the
  extracted `main` source.

## How a workbook is opened, saved and graded

```
Workbook window (WorkbookWindow.tsx)
 ├─ craftAvailable('gridcraft')  installed? can draw (WebGPU/WebGL2)? player's choice?
 ├─ yes → GridCraftEditor  ── CraftFrame (iframe, ?host=parent&chrome=none)
 │          │                    messages: gridcraft:ready / :save / :dirty / :failed
 │          │                    window.gridcraft: execute, request, docInspect
 │          ├─ open:  the kept .xlsx (file.open), or the sheets built with commands
 │          ├─ save:  file.save → the .xlsx; file.saveBytes json → readWorkbook → sheets
 │          └─ AI:    the active cell and selection (docInspect), formulas applied with cell.set
 └─ no / failed → the basic editor (SheetEditor), the same file
```

- **Two forms of the same file.** A workbook's content keeps both:
  - `sheets`, WorkSim's own format. The graders, WorkSim AI, the exports, Docs and
    Slides charts, and the Portfolio all read this, unchanged.
  - `file`, the real `.xlsx`, with everything else Grid Craft can do (borders, fonts,
    merges, pivot tables…).

  `file.basis` is the fingerprint of the sheets it was saved with. After an edit in
  the basic editor, or a restored version from before, the two no longer match, and
  Grid Craft rebuilds the workbook from the sheets.

- **Saving.**
  - Grid Craft reports unsaved changes. The editor saves 1.5 s later, and at least
    every 8 s while the player keeps typing.
  - Each save keeps the `.xlsx` and reads Grid Craft's workbook JSON into `sheets`.
  - The save goes through the existing save system (`useSavedDocument.replace`), so
    autosave, crash recovery, version history and backups work as before.
  - The window also saves before Submit and before closing the workbook.
- **Reading back exactly** (`src/apps/sheets/gridcraft/convert.ts`):
  - What the player did not touch stays exactly as it was. Grid Craft keeps `1200.50`
    as `1200.5` and writes formulas without spaces and in capitals. Where the meaning
    is the same, the earlier input is kept, so "unchanged" checks stay fair.
  - Text WorkSim would read as something else (`00123`, `TRUE`) keeps its apostrophe.
  - Formats are read as WorkSim has them:
    - bold, italic and underline;
    - alignment;
    - currency, percentage and number, with their decimals;
    - fill and text colour, matched to the nearest WorkSim colour;
    - column widths;
    - charts: type, title and the cells they draw.
- **Building WorkSim workbooks in Grid Craft** (`workbookCommands`):
  - sheet names;
  - values, with numbers and TRUE/FALSE as WorkSim reads them and other text as text;
  - every format;
  - column widths;
  - list and number validations;
  - conditional formats;
  - filters;
  - charts.

  Commands run in order and are answered together, so a workbook opens in a few
  frames.

- **Grading is unchanged.** All 27 spreadsheet tasks were checked:
  1. Each model answer was built in the real Grid Craft.
  2. It was read back.
  3. It was graded.

  Every cell matched and every grade was the same.

- **Exports.**
  - Download .xlsx and Download .csv come from Grid Craft.
  - Export PDF is Grid Craft's own print layout.
  - Import a file… opens .xlsx, .xls, .xlsb, .ods, .csv or .tsv, after the player
    confirms. The workbook it replaces stays in Version history.

## When Grid Craft is not used

- **The basic editor opens the same workbook when:**
  - Grid Craft is not installed;
  - the device draws with neither WebGPU nor WebGL2;
  - Grid Craft does not start within 60 s;
  - a workbook has sheet names Grid Craft refuses. It follows the Excel rules: 31
    characters at most, and no `'` at the start or end.
- **Settings → Office apps** lets the player always use the basic editor, which works
  fully with a screen reader. This is kept on the device, not in the save.
- **Browser tests of the development build** use the basic editor (they drive it cell
  by cell), unless a test sets `sessionStorage['worksim.crafts'] = 'on'`, as
  `tests/e2e/gridcraft.spec.ts` does.
- **Version previews** are shown read-only in the basic editor's view. Restoring one
  reopens it in Grid Craft.

## Offline

- The service worker leaves the apps out of the game's install. Each is tens of
  megabytes, and most players open only some.
- Each app is kept in a cache of its own once opened, named after the apps' versions
  (`craft-apps-gridcraft@0.18.0`). A game update does not download it again, and it
  works offline from then on.
- An app never opened online is not available offline. The basic editor is used
  instead.

## Licences and credit

- **The code:** GridCraft is MIT OR Apache-2.0. Its `LICENSE-MIT`, `LICENSE-APACHE`,
  `NOTICE` and `ATTRIBUTION.md` (including the fonts' licences) are served with it in
  `public/crafts/gridcraft/`.
- **The credit:** the window shows "Grid Craft 0.18.0, based on GridCraft by the
  ArtCraft team" with a link to the NOTICE. See also `THIRD_PARTY_NOTICES.md`.
- **The marks:** the ArtCraft name and logos are trademarks, outside the licence.
  - WorkSim uses neither in its own interface, icons or texts.
  - The unmodified official build is used as it is, so any marks inside it are there
    as the ArtCraft team ship them.
  - The game's credit line is plain text, as their brand licence allows.

## Tests

- **Unit tests,** `src/apps/sheets/gridcraft/convert.test.ts`:
  - the round trip through a workbook saved by the real Grid Craft
    (`fixtures/everything.gridcraft.json`);
  - number format codes;
  - keeping inputs;
  - building every task's starting workbook;
  - references;
  - fingerprints.
- **Browser tests,** `tests/e2e/gridcraft.spec.ts`:
  - the first task in Grid Craft, from its starting workbook to 100% and the XP;
  - work kept across a reload, from the .xlsx;
  - downloading the .xlsx;
  - the live round trip;
  - WorkSim AI: explaining, proposing and applying;
  - the basic editor when Grid Craft is missing, and when the player chooses it.

  In a test browser without a graphics card each command takes about a second; in a
  normal browser about 30 ms.

## Keyboard focus and leaving

- **Keyboard focus.** Grid Craft takes the keyboard back by itself while a cell is
  selected. This was seen in Firefox, with no event the page hears. `CraftFrame`
  gives it the keyboard only when the player clicks or tabs into it:
  - otherwise focus goes back to where the player was (checked four times a second);
  - a key that reaches the app first is passed on there, so Escape closes the
    dialog in front.
- **Leaving.** Grid Craft holds a change until it saves it:
  - closing a window saves everything first;
  - hiding the tab saves at once;
  - closing the tab with a change not yet kept asks first;
  - the save indicator shows such a change as pending.

## Limits

- Real Safari is not tested. In Playwright's WebKit on Windows (no graphics card,
  about one frame a second) keys reach the app unreliably, so the WebKit test
  enters values through the command API. Chromium, Edge and Firefox are tested
  with real typing.

- Grid Craft is drawn on a canvas. Its own screen reader support in the browser
  could not be confirmed, so the basic editor is offered in Settings.
- WorkSim's graders calculate with WorkSim's formula engine. A formula using a
  function only Grid Craft has (LAMBDA, XLOOKUP…) works in Grid Craft, but shows as
  an error to the grader.
- Conditional formats, validations and filters made in Grid Craft are kept in the
  .xlsx, but not read into WorkSim's sheets, which are not graded on them. Those from
  the starting workbook are kept.
- Dates are kept as Grid Craft stores them (serial numbers). WorkSim's format has no
  date format.
- Charts of a kind WorkSim does not have (area, scatter, …) are read as column
  charts, with the cells they draw.
