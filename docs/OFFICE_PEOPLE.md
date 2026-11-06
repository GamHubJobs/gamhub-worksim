# The people of the office

The office's colleagues are not set pieces: each has a role, a place of their own and
a day, which follows the game clock. Everything they do has a purpose, and when they
get where they are going they stop there.

## Who they are

| Person               | Their place           | Their day                                                                                 |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Nina, receptionist   | Reception             | The phone, the visitors' book; lunch at the desk. Never far from reception.               |
| The manager          | Her office            | Works there; walks out to see people; leads the stand-up and the weekly planning.         |
| The senior colleague | Front row, beside you | The printer, a word with a colleague; the stand-up and planning; lunch in the break room. |
| Payroll officer      | Front row             | Prints a lot; out for lunch.                                                              |
| Bookkeeper           | Back row              | Quiet: long stretches at the desk, lunch there too.                                       |
| Accounts assistant   | Back row              | Sociable: often over at someone's desk; the water cooler.                                 |
| Financial analyst    | Back row              | Reads a lot; stands up to stretch; sees the manager; lunch at the counter.                |
| Office coordinator   | The standing desk     | Takes papers to the manager and the team; the printer; out for lunch.                     |
| Office administrator | The filing cabinet    | Filing; the printer; the post to reception.                                               |
| Tom, facilities      | The coffee machine    | The kitchen; sees to the printer; waters the plants.                                      |
| Data analyst         | The break room table  | Hot-desks on a laptop; arrives later; lunch where she sits.                               |

## A day

- **Arriving** from 8:10 to 9:20, each at their own time, through the front doors and
  to their place. **Going home** from 16:30 to 18:15, out through the doors.
- **The stand-up** (9:15, every day): the team stands round the whiteboard and the
  manager leads it. **Weekly planning** (Wednesday 11:00) is in the manager's office.
- **Working**: at their place, doing what it is for (typing, reading, the phone,
  writing, filing), changing now and then.
- **Errands**, drawn for each person and hour from their habits: the printer, the
  water cooler, a word with a colleague (only if that colleague is at their desk),
  stretching, the plants. No one sets off in the few minutes before a meeting, lunch
  or going home.
- **Lunch** between 12:00 and 14:00, by person: the break room table, the counter, the
  desk, or out of the office.
- **Talking to the player**: someone the player goes to talk to comes back to their
  place (from the stand-up, say), faces them while they talk, and then goes back to
  what they were doing.

## How it works

```
src/world/npc/
  schedule.ts   where each person is at any minute (pure: the same every time)
  agent.ts      walking there round the furniture, waiting for people, recovering
  bodies.ts     where everyone is standing, so no one walks through anyone
  Crowd.tsx     draws them and runs everyone in one frame loop
src/office/scene/officeCast.ts   the office's people, places and habits
```

- **The clock**: the schedule follows the game clock. The clock stands still while the
  player walks about, so errands carry on slowly (a minute every ten seconds, at most
  a quarter of an hour ahead) and the office does not freeze. When the clock jumps on
  (an hour at the computer), people are already where they should be, rather than
  everyone walking at once.
- **No one shares a place**: if two people want the same place (the printer), the
  second stays at their own.
- **Walking**: on a way found round the furniture from the same solid shapes the player
  bumps into (see [CHARACTER.md](CHARACTER.md)); stopping on arrival; sitting down on
  arriving at a seat; waiting for someone in the way, then going round them; if a way
  keeps failing (three tries), stepping on through rather than trying forever.
- **The player and the people** do not walk through one another.
- **Cost**: one frame loop for everyone, the schedule worked out twice a second, a way
  found only when a destination changes, quick redraws only while someone is walking
  (fewer on low graphics). With reduced motion, people move straight to their places.
- **What was wrong before**: one colleague walked between two fixed points behind the
  desks forever, with no reason and no awareness of anything else: a placeholder
  animation. She is now the office coordinator, with a desk and errands of her own.

## Limits

- People in the office do not yet hold things on their errands (the papers from the
  printer), and the meetings are shown by where people are, while the player still
  joins them from the panel.
- The schedule is the office's; the street and the places in the neighbourhood keep
  their own people as before.

Screenshots: `docs/screenshots/npc/`.
