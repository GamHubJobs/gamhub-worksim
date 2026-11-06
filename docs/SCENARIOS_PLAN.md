# Living scenarios: events that happen in the world

**Principle.** Important events happen in the 3D world, with the people involved
present, where it is reasonably possible. Text, the panel and notifications support
them; they do not replace them. A scenario gives its result only when it has actually
happened (the food is in the bag in your hands; you sat through the meeting).

This plan audits what exists, describes one engine for every scenario, and sets the
order of work. Each group is built, tested and documented before the next.

## 1. Audit

**Visible**: happens in 3D, with the character doing it.
**Partly visible**: some of it is seen, the important part is not.
**Invisible**: a panel, a dialogue box or a change to the numbers only.

| Scenario                                                                                       | Where         | Now       | What is missing                                                                                 |
| ---------------------------------------------------------------------------------------------- | ------------- | --------- | ----------------------------------------------------------------------------------------------- |
| Cooking, eating, washing, the shower, dressing, bed                                            | Home          | Visible   | —                                                                                               |
| Reading, the TV, games, a call, study, yoga                                                    | Home          | Visible   | —                                                                                               |
| The gym, the café (order, collect, sit), the park                                              | Neighbourhood | Visible   | —                                                                                               |
| A week's shopping (basket, aisles, checkout)                                                   | Daily Basket  | Visible   | Carrying the bags home; putting them away                                                       |
| Buying or selling a bike; leasing a car                                                        | Cog & Kerb    | Visible   | A salesperson handing over the keys                                                             |
| Riding the bike, driving the car                                                               | Street        | Visible   | —                                                                                               |
| Sitting at the computer; coffee; lunch; the whiteboard                                         | Office        | Visible   | —                                                                                               |
| Talking to Nina, Marcus, Tom, the manager                                                      | Office        | Visible   | Turn-taking gestures in longer conversations                                                    |
| Colleagues' day (stand-up, desks, lunch)                                                       | Office        | Visible   | —                                                                                               |
| **Takeaway**                                                                                   | Home          | Partly    | No one delivers it: the character "collects" at an empty door; no doorbell, no handover, no bag |
| **Meetings** (stand-up, planning, one-to-one)                                                  | Office        | Partly    | Colleagues gather, but the player joins from the panel and is counted without being there       |
| **Workplace events** (Tom's favour, Priya's urgent task, Marcus's error, recognition, tension) | Office        | Partly    | A dialogue box; the colleague does not come to the player                                       |
| **Promotion**                                                                                  | Office        | Invisible | An email and a record: no conversation with the manager                                         |
| **Pay rise, salary talk**                                                                      | Home laptop   | Invisible | A panel                                                                                         |
| **Job applications and interviews**                                                            | Home laptop   | Invisible | No visit to the company, reception, interviewer                                                 |
| **Side business** (tutoring, crafts, repairs)                                                  | Home laptop   | Invisible | No customer                                                                                     |
| **Friends' invitations, going out**                                                            | Phone, home   | Partly    | The character goes out; no friends are met                                                      |
| Grocery delivery                                                                               | —             | Not built | —                                                                                               |
| Home repairs (a technician)                                                                    | —             | Not built | —                                                                                               |
| A taxi or a lift                                                                               | —             | Not built | (The bus exists as transport, not as a ride)                                                    |
| A new colleague joining; office visitors; a broken printer; a parcel; a celebration            | —             | Not built | —                                                                                               |

## 2. One engine for every scenario

`src/world/scenario/`. A scenario is data, played by the systems that already exist:
the character and its activities, the people (schedule, walking, places), collisions,
sounds and effects. No scenario gets a system of its own.

- **Definition**: an id; a trigger (an order placed, a time, a game state); the people
  taking part (people of the place, or visitors who arrive: a courier, a technician,
  an interviewer); the place; and **steps**: someone walks somewhere, waits, knocks or
  rings, says something (a line or the player's choice), hands something over, sits,
  does an activity; then the consequence (a game action).
- **State** in the save (additive, so older saves load unchanged): which scenarios are
  scheduled, under way or done, with their stage and when they are due. A refresh or a
  restart resumes from the last stage reached; nothing is paid, delivered or counted
  twice (each scenario's consequence runs once, by its id).
- **People**: a visitor arrives through the door and walks in (never appears inside a
  room); a colleague taking part leaves their routine (the schedule's `attending`) and
  goes back to it afterwards. No duplicates: a person can be in one scenario at a time;
  if they are busy, the scenario waits or explains.
- **The player stays in control**: a scenario can be accepted, declined, put off or
  walked away from where that makes sense; walking away has an explained result (the
  courier leaves the bag with a neighbour; the meeting is missed).
- **Camera**: the normal third-person view; at a moment that matters (the handover, the
  manager's announcement) it frames both people, then gives control back.
- **Away or offline**: everything is on the device and needs no connection. If the
  player is not where the scenario happens, it follows a believable rule (the courier
  waits a few minutes, then leaves the bag at the door; the interview is missed).

## 3. Order of work

1. **S1 · A takeaway delivered** (home): **done**, see below. Order on the phone; the
   order is paid once and recorded; a courier is scheduled, rides up the street,
   rings the bell; the player opens the door; they greet each other, the bag is
   handed over, the food is the player's, the courier leaves; the player unpacks and
   eats. A refresh mid-way resumes; away from home, the bag waits at the door.
2. **S2 · Meetings attended in person** (office). Colleagues gather (as now); the
   player walks to the meeting to join it; the host opens it; people speak in turn
   (who is speaking faces the room and gestures); the existing meeting content and
   grading are unchanged; it counts only if the player was there; everyone goes back.
3. **S3 · Workplace events in person**: the colleague comes to the player's desk (Tom
   asking a favour, Priya with an urgent request), and the existing choices are made
   face to face.
4. **S4 · A promotion from the manager**: asked to her office; she talks through the
   work, announces it, the letter on the desk; then the record and pay update.
5. **S5 · Interviews at the company**: going to the company's reception, signing in,
   waiting, the interviewer coming out, the interview in a meeting room, the result.
6. **S6 · Home services and rides**: a technician who comes to repair something; a taxi
   that arrives and drives the player.
7. **S7 · Social life and the city**: friends met at the café or the park; a neighbour
   in the street; a parcel; a new colleague's first day; a broken printer; a team
   celebration.

## 4. Acceptance (per group, as the brief sets out)

Each group is shown working in the real game, with screenshots: the delivery from order
to handover; a meeting with everyone seated or standing in place; an interview with both
people there; the manager announcing a promotion; a visible checkout; a technician
arriving and repairing; a conversation started by someone else; everyone going back to
their day. And for each: interrupted part way, restored after a refresh, nothing paid or
counted twice, collisions respected, and no loss of speed.

## 5. Done

### S1 · A takeaway delivered

- **The rules** (`src/game/delivery.ts`, kept in the save as `life.delivery`): ordering
  pays once and puts a takeaway on its way (25 minutes); it cannot be ordered again,
  answered early or eaten before it is in hand; at the door it waits 12 minutes, then is
  left on the doorstep; once handed over it is the player's; at bedtime an uneaten one
  goes in the fridge. A reload or a restart carries on from where it was.
- **In the home**: the order on the phone; waiting with the phone; the courier walking
  along the landing outside, ringing the bell (a two-note chime, captioned), ringing
  again while waiting; the front door, now a real doorway, swinging open; saying hello;
  the bag handed over at the moment the player takes it (the courier lets go); the
  courier leaving as the door closes; unpacking and eating at the table. The camera
  watches from behind the player, through the doorway. The courier never comes in.
- **Found and fixed on the way**: a home activity with nothing to do it with in 3D (a
  series without a TV, a book without a shelf) did nothing when chosen from the list.
  It now happens at once, as without 3D.
- **Tests**: unit tests for every step and the save; browser tests for the whole
  delivery (with a reload part way, paid once) and for the doorstep.
- **Screenshots**: `docs/screenshots/scenarios/takeaway-*.png`.
- **Limits**: the courier walks up the landing, not the street (the street is a separate
  view); the player puts the bag down on closing the door, and picks it up again at the
  table.
