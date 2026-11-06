# Talking to anyone

Every person in every place can be talked to: colleagues in the office, staff and
customers in the café, the shop, the gym and the garage, people walking down the street
or through the park, and the courier at the door. Nobody is scenery.

## How it works for the player

- **Walk up and press E**: when someone is near enough and in sight (not through a
  wall), the prompt says "Press E to talk to Leila (Accounts assistant)". If something
  to use is nearer, that comes first.
- **Or click them**: the pointer over someone shows their name, their role and, if they
  are busy, what they are doing ("in a meeting", "exercising"). A click walks the player
  over, round the furniture.
- **They notice you**: the moment the player sets off towards them, they stop what they
  are doing (if they can), turn to face the player and wave. The player stands facing
  them at talking distance (across the counter, for staff behind one) and waves back.
  The camera looks over the player's shoulder, so their face is in view.
- **What to say**: a small box at the side (so both people stay visible) with what they
  say and what the player can say back. The conversation can go on for a few exchanges;
  Esc or "Goodbye" ends it.
- **Afterwards**: they go back to exactly what they were doing, or on with their day.

## What they say depends on

| What                    | Example                                                                                                                                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Their work              | A colleague: chat, ask what they are working on, ask for advice, offer a hand. The barista: order, ask what is good. The cashier: the till, stock. The trainer: guidance, equipment, the class. A local: chat, what is on, suggest a coffee. The courier: thanks, check the order, report a problem. |
| Their personality       | Warm, quiet, chatty, dry or focused: the same question gets a different answer.                                                                                                                                                                                                                      |
| What they are doing     | In a meeting, serving, exercising, heading home: they say so ("Catch me after?"), and only lift a hand. Chatting with someone: the player can join in (both answer) or come back later. Walking: they stop.                                                                                          |
| How well they know you  | The first time, they introduce themselves. After that, a greeting; with high trust, a real smile.                                                                                                                                                                                                    |
| What happened last time | If the player was rude, they are wary next time. If the player helped, they say thanks again.                                                                                                                                                                                                        |
| The time of day         | Morning, afternoon or evening in the greeting.                                                                                                                                                                                                                                                       |
| How often today         | After three conversations in a day, they politely get back to work.                                                                                                                                                                                                                                  |

The office's four named colleagues (the manager, the senior colleague, the receptionist
and facilities) keep their own longer conversations, which unlock with the career; when
they are busy (in a meeting, chatting, heading home), they say so like anyone else.

## Consequences, without farming

- The first friendly conversation of the day with someone builds a little trust; more
  that day builds nothing.
- A real favour (15 minutes of the player's time) builds more, once a day.
- Being rude, or insisting on interrupting someone busy, costs trust, and they remember.
- Staff can do their job from the conversation: the barista makes the coffee, the
  cashier rings up the shopping, the trainer starts the class (the character then goes
  and does it, as usual).
- Everything is kept in the save (`work.relationships`, with `last`, the one new
  optional field; older saves load unchanged), and time passes as it should: a short
  break in the office, the evening moving on in town (a friendly chat also helps the
  social need).

## For developers: making someone talkable

One framework for everyone (`src/world/npc/`, `src/game/encounters.ts`):

- **Who they are**: a `Who` (id, name, role, kind of work, personality). The office's
  people are in `office/scene/officeCast.ts` (`officeWho`); the town's in
  `content/townPeople.ts`.
- **In the world**: people who move about are in a `Crowd` (with `who`); people who stay
  in one place are an `<Npc who={…}>` (standing, seated, or wrapping a custom figure such
  as a runner); people walking a route are a `<Walker who={…}>`. Each puts itself in the
  list in `people.ts` with where it is and what it is doing; that is all it takes for
  the player to be able to talk to it, by E or a click.
- **Talking**: `meet` (the opening and the options) and `respond` (the reply and its
  consequences) are pure; `holdEncounter` writes the result to the save. A new kind of
  person needs a `kind` and its options and replies in `encounters.ts`.
- **Tests**: `src/game/encounters.test.ts` (everyone has something to say and to be
  asked; options differ by work; busy people; joining; rudeness remembered; no farming;
  the save) and `src/world/npc/npc.test.ts` (who is near and in sight; where to stand;
  who is talking to the player); in the browser, `tests/e2e/talk.spec.ts` (a colleague,
  by request, E and a click; someone busy at the stand-up; a local in the street; the
  barista; a gym member mid-run; the trainer).

## Limits

- Conversations are written, not generated: a set of replies per kind of person, varied
  by personality and situation. Nothing here uses an AI model.
- Customers in the café and the shop stay where they are (they have no day of their own
  yet); the office's people do.
