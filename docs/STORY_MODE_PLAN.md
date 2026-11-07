# Story Mode: plan

Story Mode turns a career into a continuous, mission-based story: a newcomer in a new
city, a first job, colleagues with their own motives, decisions with consequences, and
the freedom to live the rest of the day as the player likes between missions. The
structure takes its cue from open-world, mission-led games (main and side missions,
character missions, chapters, choices that come back later). The characters, places,
missions and writing are all GamHub WorkSim's own; nothing is copied from any game.

## Decisions

- **Same world, same save, separate story.** A story is played in the career's own
  world (the flat, the street, the office, the people) with all its systems. Its
  progress is kept in its own part of the save (`profile.story`, optional: saves without
  it are free play, unchanged). Starting a story never resets the career; leaving it
  aside never stops free play. Mission rewards are real career outcomes (money, trust,
  skills, XP) and say so; they are never qualifications.
- **Missions are played, not read.** Every objective is something done in 3D with the
  systems that exist: walking somewhere, talking to someone who is physically there
  (the story scene opens when the player walks up to them), using an activity (getting
  dressed, the computer, the filing cabinet), attending a meeting, finishing a case in
  the work tools. Text only frames it.
- **One engine, data campaigns.** Campaigns, chapters, missions, objectives, scenes and
  decisions are data; one pure engine works out what is available, what is active, what
  has been done, and applies choices. Each objective is completed by an event the game
  already produces (an action done, a place entered, a conversation held, a meeting
  attended, a case submitted), so the story adds no system of its own.
- **Branching that matters, kept manageable.** Decisions set story flags; flags change
  later scenes, which missions are offered and how characters treat the player. A few
  real branches per chapter, not an explosion of storylines.
- **One complete campaign first** (Finance & Administration), then the same engine for
  the other five careers, each with its own story. Not six shallow ones.

## Order of work

1. **Story 1 · Engine and save**: types, the pure engine, the save (additive, with
   migration tests), the events from the game rules. Unit tests.
2. **Story 2 · Story Mode screen**: Continue, New story, Chapters, Missions (main,
   side, done), Progress, Relationships, Decisions; a mission tracker on screen in the
   3D places (the current objective, and where).
3. **Story 3 · Played in the world**: story scenes when walking up to the person an
   objective names (in place of small talk), with choices; the objective's place marked;
   mission introductions and completion summaries.
4. **Story 4 · Finance & Administration, chapter 1** (complete and playable): the first
   day, the missing invoice, a neighbour's bakery (side), month-end; one decision that
   changes a later scene.
5. **Story 5 · Chapters 2 and 3** of the same campaign, and its ending.
6. **Story 6 to 10 · The other five careers**, one at a time, each tested and
   documented.
7. **Story 11 · Presentation and polish**: cinematic framing for key scenes (skippable),
   music cues, accessibility and performance checks.

## Acceptance (from the brief)

Start a new story; play the opening mission physically; meet and talk to recurring
characters; complete a mission with several physical objectives; make a decision that
changes a later event; unlock a side mission; explore freely between missions; save and
restore story progress (and refresh mid-mission); complete a chapter; return to free
play without losing anything. Screenshots and in-game evidence for each.

## Done

### Story 1–4 · The engine, the Story screen, missions played in the world, chapter 1

- **The engine** (`src/game/story/`): campaigns, chapters, missions (main, side,
  workplace, personal, character), objectives and scenes are data; `engine.ts` works out
  what is open, locked, under way and done, the current objective, the player's
  decisions and the flags they set, and gives a finished mission's reward once (XP,
  trust, money). Objectives are done by the game's own systems: a scene played on
  walking up to the person it names; a case answered on the computer (it arrives when
  the mission starts); a meeting attended; being somewhere or dressed. After every
  change in the game the story checks what has come true.
- **The save**: `work.story`, optional. A career without it is free play, exactly as
  before; older saves load unchanged. Refreshes and restarts carry on where the story
  was. Putting the story away keeps the career.
- **Starting**: the first screen offers Free play or Story Mode (for careers with a
  story); the **Story** button in the top bar starts one later, or shows it: continue,
  the chapters and missions (with Start), the people in the story and how they see the
  player, the decisions made.
- **While playing**: a tracker on screen (the mission, what to do now and where), and a
  "Mission complete" card with the summary (which depends on the decisions) and the
  rewards. Walking up to the person an objective names (E, a click, or the panel's Talk
  button) plays their scene, in place of small talk, with choices.
- **Finance & Administration, "Short Delivery", chapter 1** (five missions): the first
  morning (Nina at reception, Priya in her office); faces and names (Marcus, Tom, Leila);
  the missing invoice (Marcus admits a short delivery he never raised and asks the player
  to keep quiet; Ben has the delivery note; the supplier's case on the computer; telling
  Priya); the bakery on the corner (side: Walter in the park, then the café); month-end
  (the stand-up, then Priya). Covering for Marcus, telling Priya, or fixing the process
  together changes what Priya says when told, what she says at month-end (the auditors
  find the credit note; or the new check caught two more), the summaries and trust.
- **Limits** (then): one campaign, one chapter; the other careers show "coming soon". No
  cinematic camera yet (the conversation view is used). Scenes are written, not
  generated.

### Story 5 · "Short Delivery", chapters 2 and 3 and the ending

- Chapter 2, the supplier review (Leila, Ben, Dana; a supplier paid for deliveries that
  never came; whose name goes on the report), a work mission (a taxi claim, as a case),
  and two side missions earned in chapter 1 (Maya's books at the café; an afternoon with
  Marcus). Chapter 3, audit week, where chapter 1's choice about Marcus comes back. Three
  endings from Priya's offer. Played to each ending in unit tests; the review, the ending
  and the café mission played in the browser.
- **Limits** (then): the other five careers' stories were still to come (done in Story 6–10).

### Story 6–10 · A story for every career

"The Halden Account" (Accounting), "Ticket Zero" (IT Help Desk), "Launch Week" (Digital
Marketing), "Signal and Noise" (Data Analysis), "Release Day" (Software Development):
two chapters each, with the career's own cases, its own people, a decision that comes
back, and endings that follow from it. Each is checked in unit tests (it holds together,
and can be played to more than one ending).
