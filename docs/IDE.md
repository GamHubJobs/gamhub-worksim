# The Code editor (IDE)

The Code app is laid out like the code editors developers use at work, so
what players learn carries over to the real thing.

## How it was built, and the licensing decision

- **Inspected:** a local VSCodium build (version 1.143, Windows). It is an
  Electron desktop application: its workbench (`resources/app/out`, about
  72 MB) runs on Node.js and Electron, with 95 built-in extensions. It cannot
  run inside a web page, and the game does not ship desktop programs.
- **Not copied:** nothing from that folder is used: no files, no executable,
  no binaries, no icons. The folder was only read.
- **Used:** the editor component of VS Code, published separately as
  [`monaco-editor`](https://github.com/microsoft/monaco-editor) (MIT licence),
  installed from npm and bundled with the game. It is loaded only when the
  Code app opens; its workers come from the game too, never from a CDN.
- **Our own:** everything around the editor (the activity bar, Explorer,
  Search, Source Control, Run and Debug, Extensions, the panel, status bar,
  menus and command palette) is WorkSim's own code. No names, icons or
  artwork of VS Code or VSCodium are used. The About box says what Monaco is.

## What it has

| Part            | What it does                                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explorer        | Folders and files (`lib/tax.js`); new, rename, delete and copy path from a right-click menu. Files a task provides stay read only.                                                                                                |
| Tabs            | Several open files, each keeping its own undo history and scroll position; remembered with the project.                                                                                                                           |
| Editor          | Monaco: syntax colours, suggestions, find and replace, multiple cursors, folding, go to line.                                                                                                                                     |
| Search          | Every file, with match case, whole word and regular expressions; replace all (not in read-only files).                                                                                                                            |
| Problems        | Mistakes in the code, from the editor's JavaScript checker, for every file; click one to go there.                                                                                                                                |
| Source Control  | The same Git repository the terminal uses: stage, discard, commit, branches, merge, history, and each change side by side. A merge where both branches changed the same lines writes conflict markers to resolve, then completes. |
| Run and Debug   | Breakpoints (click left of a line number, or F9). Choose a function and its arguments, then step through the run: Continue, Step over, Step back, Stop; the variables and call stack at each step.                                |
| Extensions      | A simulated marketplace: installing switches on a real feature (formatting, bracket colours, the minimap, word wrap, whitespace, tests on save). Nothing is downloaded.                                                           |
| Panel           | Problems, Tests, a simulated Terminal (shell, git, npm test) and the Debug Console.                                                                                                                                               |
| Status bar      | Branch, problems, debugging, tests, cursor position, language. "Simulated workspace" says that code runs in the game.                                                                                                             |
| Command palette | Ctrl+Shift+P (or F1) for every command; Ctrl+P to go to a file. A menu bar (File, Edit, View, Run, Terminal, Help) has the same commands.                                                                                         |

## AI suggestions, reviewed before they change anything

_Suggest a fix (you review it first)_ in the Ask AI menu asks the player's
own AI model, if they have set one up, for a corrected version of the open
file.

- **It is never applied directly.** In WorkSim AI the button reads _Review
  in Code_. It opens the suggestion in Code as a side-by-side diff with
  **Accept the change** and **Reject**, and only Accept changes the file.
  Undo still works.
- **In Learning mode** the model is told to explain the bug, not to write
  the corrected code.
- **The built-in guide** explains instead: it never writes code.

## How the debugger works

`game/code/debugger.ts` adds a call before each statement line inside a
function, on the same line, so line numbers do not change. The function then
runs in the same sandboxed Web Worker as the tests, and each call records the
line and the variables in scope at that moment. The player steps through
that recording, forwards or backwards. Code whose layout the debugger
cannot follow still runs; the view says it was not stepped through.

## Saves

Projects keep their files (now also in folders), Git, terminal and debug
history as before. The editor adds `ide`: the open tabs, breakpoints,
installed extensions, and a merge waiting for its conflicts to be resolved.
All of it is optional, so older saves load unchanged.

## Tests

- `src/game/code/ide.test.ts`: the debugger's recording, folder imports,
  search and replace, the palette, and a merge conflict resolved.
- `tests/e2e/ide.spec.ts`: a new file in a folder, a mistake in Problems,
  search, the palette, a commit, a breakpoint and stepping, and an
  extension, in the real app.
- `tests/e2e/codeEditor.ts`: how the other tests read and set code in Monaco.
