# The office apps: Grid Craft, Word Craft and Deck Craft

The office computer runs real productivity software. Each app is the official,
unmodified web build of an open-source project by the ArtCraft team, run in a window
of the desktop. The player's files are kept in their WorkSim save, like every other
file.

| App        | Built from                                                 | Status      |
| ---------- | ---------------------------------------------------------- | ----------- |
| Grid Craft | [GridCraft](https://github.com/storytold/gridcraft) 0.18.0 | In the game |
| Word Craft | [WordCraft](https://github.com/storytold/wordcraft) 0.18.0 | In the game |
| Deck Craft | [DeckCraft](https://github.com/storytold/deckcraft) 0.18.1 | In the game |

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
- **Deck Craft is 0.18.1** (published 2026-11-12), the latest release. It differs
  from 0.18.0 only in a fix to the desktop Flatpak's updates; its web build was
  checked against its `SHA256SUMS.txt` the same way.

## What the apps share (src/apps/craft/)

- `crafts.ts`: whether an app can be used here (installed, the device can draw it,
  the player's choice).
- `CraftFrame.tsx`: the iframe, the host messages and the command API, and the
  keyboard-focus guard.
- `useCraftSession.ts`: opening, saving, the pending indicator and the leave
  guard. Each app describes itself with a `CraftAdapter`:
  - how to open a kept file, or build one from WorkSim's content;
  - how to ask for a save;
  - which handed-over files are the document;
  - how to read a saved file back.
- Changes are noticed in two ways:
  - from the app's change messages;
  - by asking the app once a second whether it has unsaved changes (`isDirty`).

  A change made while a save is under way can go unreported. Word Craft showed this:
  a chart inserted during a save was never kept, until the second way was added.

- `CraftShell.tsx`: the bar above the app and the cover while it opens.
- **The kept file and its fingerprint.** Each kept file records a fingerprint of
  the content it was saved with (`basis`). The file is opened as it is only while
  that still matches; otherwise the content is built in the app again.
  - The fingerprint ignores the order of keys (`fingerprintValue`, in
    `src/lib/fingerprint.ts`). Saving checks content against its schema, which
    writes each object's keys in the schema's order.
  - Word Craft's fingerprint did not, until Deck Craft's tests found it. The .docx
    never matched, so every reopen rebuilt the document from WorkSim's copy,
    without its pictures, footnotes and comments. Grid Craft's workbooks were not
    affected.

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

## Word Craft: how a document is opened, saved and graded

```
Document window (DocWindow.tsx)
 ├─ craftAvailable('wordcraft')
 ├─ yes → WordCraftEditor ── CraftFrame (?host=parent)
 │          ├─ open:  the kept .docx (file.open {path, data}), or WorkSim's document as
 │          │         HTML (docToHtml); then File › Home is closed (ui.backstage false)
 │          ├─ save:  file.save {path: .docx}; then file.save {path: .html} →
 │          │         htmlToDoc (the basic editor's own parser) → body
 │          ├─ from Grid Craft: a chart as insert.picture, the chart in its
 │          │         alternative text; a table as insert.table, filled cell by cell
 │          └─ AI:    the selected text (document.selection) and the document; text
 │                    applied with text.insert
 └─ no / failed → the basic Docs editor, the same file
```

- **Two forms of the same file,** as for workbooks: `body` (graded, read by AI,
  exports and the Portfolio) and `file`, the real `.docx`.
- **Read with the basic editor's parser.** Word Craft writes headings, paragraphs,
  bold, italic, underline, alignment, lists, tables and line breaks as plain HTML.
  The basic editor's own parser (TipTap) reads that HTML, so the result is exactly
  what that editor would hold. `finishDoc` then:
  - removes the font, size and black every imported text carries;
  - turns heading bold into plain headings;
  - turns sizes into the editor's own sizes.
- **Charts.** A WorkSim chart becomes a PNG picture whose alternative text ends with
  "(WorkSim chart <data>)". A picture with that text is read back as the chart, with
  its data, so the "charts" checks count it.
  - A chart on its own line is that line.
  - A chart inside a line of text is read as a block after the line, and the line
    keeps its text.
  - Other pictures stay in the .docx only.
- **Starting documents** (templates, task files) are written as HTML (`docToHtml`),
  with their page size and margins set by command.
- **Checked by:**
  - the browser tests: headings, text, tables and charts as the graders read them;
  - the report task done in Grid Craft and Word Craft and graded at 100%.
- **Above the document:**
  - Insert chart from Grid Craft and Insert table from Grid Craft (the shared
    picker);
  - Download .docx and Export PDF;
  - Import a file… (.docx, .doc, .odt, .rtf, .html, .md, .txt, .tex).
- **Not available while Word Craft is used:** the window's Print button (Export PDF
  instead). Version previews show in the basic editor's view.
- **Word Craft starts on File › Home** when it has nothing open, and opening a file
  by command leaves it there. The adapter closes it after each open.

## Deck Craft: how a presentation is opened, saved and graded

```
Presentation window (SlidesWindow.tsx)
 ├─ craftAvailable('deckcraft')
 ├─ yes → DeckCraftEditor ── CraftFrame (?host=parent)
 │          ├─ open:  everything open is closed (file.close); the kept .pptx is
 │          │         handed over by the host message (deckcraft:open), so it keeps
 │          │         its name; or WorkSim's slides are built by command
 │          │         (buildDeck), saved to bytes (file.saveBytes) and handed over
 │          ├─ save:  file.save → the .pptx comes back (deckcraft:save); each slide
 │          │         read by slide.inspect → deckToSlides → slides
 │          ├─ from Grid Craft: a chart as insert.chart, with its data; a table as
 │          │         insert.table, filled cell by cell
 │          ├─ Present: show.fromStart / show.fromCurrent, full screen
 │          └─ AI:    the presentation and the selected text; text applied with
 │                    text.insert
 └─ no / failed → the basic Slides editor, the same file
```

- **Two forms of the same file,** as for the others: `slides` (graded, read by AI,
  exports and the Portfolio) and `file`, the real `.pptx`.
- **Read by inspection.** Deck Craft describes each slide (`slide.inspect`): its
  layout, every shape with its kind, placeholder, box and text, chart data, table
  cells and the notes. `deckToSlides` turns that into WorkSim's slides:
  - title placeholders → title text, subtitle placeholders → subtitle text, other
    placeholders → body text (the slide number, date and footer are left out);
  - text boxes and shapes, with their text;
  - charts, with their type, categories and series, so the "charts" checks count
    them, including charts made in Deck Craft;
  - tables, as text (a row to a line), so their figures count as the slide's text;
  - pictures: only those that came from WorkSim (found by their alternative
    text); others stay in the .pptx;
  - the notes, the layout and the theme (Deck Craft's DeckCraft, Nocturne, Meadow
    and Ember are WorkSim's corporate, midnight, fresh and warm).
- **Built by command.** Starting slides (templates, task files, a presentation made
  in the basic editor) are built in a new presentation: each slide in its layout,
  the text in the layout's placeholders, the other elements where they were, the
  notes and the theme.
- **Kept as a .pptx.** Deck Craft's own Save (Ctrl+S) hands back the file the page
  sent, under its name. So every presentation is handed to Deck Craft as
  `<title>.pptx`, by the host message:
  - a built one, as its bytes (`file.saveBytes`);
  - an imported outline or `.deckcraft` file, after it is opened.

  If the player saves it as a `.deckcraft` (Save As), the next save opens it again
  as the .pptx.

- **Opening in place.** Deck Craft opens a file beside the ones already open. The
  adapter closes them first, so the window holds one presentation.
- **Checked by:**
  - the browser tests: titles, text, charts with their data, notes and the number
    of slides, as the graders read them;
  - the report task done in Grid Craft, Word Craft and Deck Craft and graded at 100%.
- **Above the presentation:**
  - Present and Present from this slide: Deck Craft's own slide show, full screen.
    Leaving full screen ends the show, and ending it leaves full screen. Its keys
    work (arrows, Space, a number then Enter, B, W, Escape).
  - Insert chart from Grid Craft and Insert table from Grid Craft (the shared
    picker);
  - Download .pptx and Export PDF (Deck Craft's Print, handed over as a PDF);
  - Import a file… (.pptx, .potx, .ppsx, .deckcraft, and outlines in .txt, .md and
    .rtf).
- **Adding, duplicating, deleting and moving slides,** themes, layouts, shapes,
  pictures, tables, charts, SmartArt, animations and transitions are Deck Craft's
  own. All of it is kept in the .pptx.
- **The basic editor's Present** is used only with the basic editor. Version
  previews show in the basic editor's view.

## Offline

- The service worker leaves the apps out of the game's install. Each is tens of
  megabytes, and most players open only some.
- Each app is kept in a cache of its own once opened, named after the apps' versions
  (`craft-apps-deckcraft@0.18.1,gridcraft@0.18.0,wordcraft@0.18.0`). A game update does not download it again, and it
  works offline from then on.
- An app never opened online is not available offline. The basic editor is used
  instead.

## Licences and credit

- **The code:** GridCraft, WordCraft and DeckCraft are MIT OR Apache-2.0. Each
  app's `LICENSE-MIT`, `LICENSE-APACHE` and `NOTICE` are served with it in
  `public/crafts/<app>/`. So are GridCraft's and WordCraft's `ATTRIBUTION.md` (with
  the fonts' licences) and WordCraft's `OFL-*.txt`. DeckCraft's web build ships no
  attribution file; its NOTICE names the bundled fonts and their licences.
- **The credit:** each window shows "Grid Craft 0.18.0, based on GridCraft by the
  ArtCraft team" (or Word Craft…, Deck Craft…) with a link to the NOTICE. See also `THIRD_PARTY_NOTICES.md`.
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

- **Word Craft unit tests,** `src/apps/docs/wordcraft/convert.test.ts`:
  - documents as HTML;
  - charts in alternative text, both ways;
  - every template;
  - tidying what comes back;
  - fingerprints.
- **Word Craft browser tests,** `tests/e2e/wordcraft.spec.ts`:
  - a new document kept as .docx, read as the graders read it, and reopened after a
    reload;
  - a template with its headings and table;
  - charts counted, including one inside a heading;
  - WorkSim AI's rewrite applied only after review;
  - the report task across Grid Craft and Word Craft, graded at 100%;
  - the basic editor when Word Craft is missing, and when chosen.
- **Deck Craft unit tests,** `src/apps/slides/deckcraft/convert.test.ts`:
  - every slide built in its layout, the text in its placeholders;
  - charts built as real charts, and the other elements where they were;
  - a part that cannot be built is reported, and the rest built;
  - reading back titles, text, tables, charts, notes and the slide count;
  - pictures from WorkSim kept;
  - IDs and fingerprints from save to save, also after the save schema.
- **Deck Craft browser tests,** `tests/e2e/deckcraft.spec.ts`:
  - a template built in Deck Craft;
  - slides added, duplicated, moved and deleted, with a chart, notes, a transition
    and an animation;
  - kept as .pptx, read as the graders read it, and reopened from the .pptx with
    the transition and animation;
  - the slide show, moved on with the keyboard and ended with Escape;
  - Download .pptx, Export PDF, and a .pptx imported;
  - WorkSim AI's review;
  - a presentation from before Deck Craft;
  - the basic editor when Deck Craft is missing, and when chosen.
    The report task in `wordcraft.spec.ts` does its slides in Deck Craft.
- **Cross-browser** (`tests/browsers/`): typing into Grid Craft and Word Craft, and a
  presentation opening in Deck Craft, in Chromium, Edge and Firefox (and WebKit).

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
- **Word Craft:**
  - Pictures, footnotes, comments, tracked changes, headers and footers, and fonts
    are kept in the .docx, but only the text, headings, lists, tables and charts are
    read into WorkSim's document.
  - Page size and margins are taken from WorkSim's document when it is built, not
    read back.
  - A page break is written to Word Craft, but not read back.
  - Charts made inside Word Craft (Insert › Chart) are not WorkSim charts. Only
    charts inserted from Grid Craft count.
  - WebKit types into Word Craft through the command API in the tests, as for Grid
    Craft.
- **Deck Craft:**
  - Only titles, text (of placeholders, text boxes, shapes and tables), charts, the
    notes, the layout and the theme are read into WorkSim's slides. Animations,
    transitions, pictures added in Deck Craft, SmartArt, media, comments and
    formatting are kept in the .pptx, but not read.
  - Text formatting is not read back: WorkSim's slides get each role's usual size.
  - A theme other than the four WorkSim has keeps WorkSim's theme in its copy.
  - A slide's layout is read as the nearest of WorkSim's six.
  - Building WorkSim's slides sets the text, boxes, sizes, bold, italic, alignment,
    colour and bullets of text boxes; placeholders take the theme's styles.
  - Presenter view in the browser is Deck Craft's own (drawn in the page). It was
    not tested with a second screen.
