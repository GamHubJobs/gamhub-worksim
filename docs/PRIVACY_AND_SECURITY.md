# Privacy, security and your data

WorkSim is **local-first**. This page explains what that means for your privacy, what
WorkSim does to keep your data safe, and its honest limits.

## Where your data is

- **All your progress is stored in your browser, on this device:** careers, tasks,
  cases, files, portfolio and settings. It uses the browser’s own storage (IndexedDB).
- **Nothing is sent anywhere, unless you turn on an AI model.** WorkSim has no server, no
  account, no analytics and no tracking. It makes no network requests with your data,
  online or offline. The one exception is WorkSim AI, and only when you choose it (see
  below).
- **The only copies are those on this device,** plus the backup files and exports
  you choose to download.

## What protects your data

- **Saving.** Every change is saved automatically, with an emergency copy kept as you
  type, so work survives a crash or a closed tab. Saves are written in transactions:
  a save either happens completely or not at all.
- **Checks on everything that is loaded.** Every save, document and backup is checked
  against its expected structure before it is used. A damaged record is reported
  instead of being used.
- **Backups are checked before they replace anything:**
  - the file must be a WorkSim backup, from this or an older version;
  - its checksum must match, so damaged or edited files are rejected;
  - every record is checked;
  - files larger than 250 MB are refused.

  You see what a backup contains before you restore it.

- **Safety copies.** Before a backup is restored, and before saves are upgraded to a
  new format, WorkSim keeps a complete copy of your data as it was, on this device.
  The newest three are kept, and **Storage & backup** can put one back (for example,
  to undo a restore).
- **One tab at a time.** If WorkSim is open in two tabs, only one can change your
  data, so they cannot overwrite each other.
- **Updates never touch your data,** and wait until you choose to update (see
  [INSTALL_AND_OFFLINE.md](INSTALL_AND_OFFLINE.md)).
- **Safe exports.** Text you write is escaped in exported web pages, so it can never
  run as code. Exported file names are cleaned. In spreadsheet (CSV) exports, cells
  that start like a formula are marked as text, so a spreadsheet program does not
  run them.
- **Few permissions.** WorkSim asks for no browser permissions: no camera,
  microphone, location or notifications. It may ask the browser to keep its storage
  (“persistent storage”) so the browser does not clear it when space runs low.
- **Dependencies.** WorkSim uses only free, open-source libraries, checked with
  `npm audit`. At the last check there were no known vulnerabilities.

## Honest limits

- **Your data is only as safe as your device and browser.** Anyone who can use your
  browser profile can open WorkSim and see or change your progress. Use your device’s
  own account and lock screen to protect it.
- **Browser storage is not tamper-proof.** Someone with access to the device and
  developer tools can edit the stored data. WorkSim checks data for damage, not for
  deliberate changes. Scores and portfolio evidence on a device are not proof against
  someone determined to fake them.
- **Clearing site data deletes everything.** Clearing the browser’s “cookies and site
  data” for WorkSim, or uninstalling the browser, deletes your progress and the
  safety copies with it. Only downloaded backups survive that.
- **Backups are not encrypted.** A backup file contains your progress in readable
  form. Keep it somewhere private if that matters to you.
- **No server-grade security.** WorkSim is not a server application and does not
  claim the protections of one (accounts, access control, audit logs, encrypted
  storage).
- **Private browsing.** In a private or incognito window, the browser deletes
  WorkSim’s storage when the window closes.

## WorkSim AI

- **Off by default.** WorkSim AI's built-in guide runs entirely on this device and
  sends nothing.
- **Your choice and your consent.** You can turn on a model running on your computer,
  or a cloud model (Anthropic, OpenAI or Google) through the WorkSim AI bridge. Nothing
  is sent until you tick the consent box for that destination; choosing another
  destination asks again.
- **Only the minimum.** Each question carries only the context listed in WorkSim AI's
  Context panel (for example the email or task you have open, and your role), with
  your name replaced by "the employee". You can untick any item, and see exactly what
  will be sent. Nothing else from your save is sent.
- **API keys never reach WorkSim.** Cloud keys live in the bridge, a small server you
  run on your own computer, in a `.env.local` file (which git ignores). The bridge
  only accepts requests from WorkSim running on this computer, has a daily limit, and
  never logs what is asked or answered.
- **The provider's terms apply** to anything sent to a cloud model, including how it
  is stored and charged.
- **Settings stay on this device** and are not in backups. Conversations are not
  saved: they last until WorkSim is closed.
