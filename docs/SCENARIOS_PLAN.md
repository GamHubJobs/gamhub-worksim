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

| Scenario                                                                                       | Where         | Now          | What is missing                                                                                 |
| ---------------------------------------------------------------------------------------------- | ------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| Cooking, eating, washing, the shower, dressing, bed                                            | Home          | Visible      | —                                                                                               |
| Reading, the TV, games, a call, study, yoga                                                    | Home          | Visible      | —                                                                                               |
| The gym, the café (order, collect, sit), the park                                              | Neighbourhood | Visible      | —                                                                                               |
| A week's shopping (basket, aisles, checkout)                                                   | Daily Basket  | Visible      | Carrying the bags home; putting them away                                                       |
| Buying or selling a bike; leasing a car                                                        | Cog & Kerb    | Visible      | A salesperson handing over the keys                                                             |
| Riding the bike, driving the car                                                               | Street        | Visible      | —                                                                                               |
| Sitting at the computer; coffee; lunch; the whiteboard                                         | Office        | Visible      | —                                                                                               |
| Talking to Nina, Marcus, Tom, the manager                                                      | Office        | Visible      | Turn-taking gestures in longer conversations                                                    |
| Colleagues' day (stand-up, desks, lunch)                                                       | Office        | Visible      | —                                                                                               |
| **Takeaway**                                                                                   | Home          | Partly       | No one delivers it: the character "collects" at an empty door; no doorbell, no handover, no bag |
| **Meetings** (stand-up, planning, one-to-one)                                                  | Office        | Visible (S2) | Colleagues gather, but the player joins from the panel and is counted without being there       |
| **Workplace events** (Tom's favour, Priya's urgent task, Marcus's error, recognition, tension) | Office        | Partly       | A dialogue box; the colleague does not come to the player                                       |
| **Promotion**                                                                                  | Office        | Invisible    | An email and a record: no conversation with the manager                                         |
| **Pay rise, salary talk**                                                                      | Home laptop   | Invisible    | A panel                                                                                         |
| **Job applications and interviews**                                                            | Home laptop   | Invisible    | No visit to the company, reception, interviewer                                                 |
| **Side business** (tutoring, crafts, repairs)                                                  | Home laptop   | Invisible    | No customer                                                                                     |
| **Friends' invitations, going out**                                                            | Phone, home   | Partly       | The character goes out; no friends are met                                                      |
| Grocery delivery                                                                               | —             | Not built    | —                                                                                               |
| Home repairs (a technician)                                                                    | —             | Not built    | —                                                                                               |
| A taxi or a lift                                                                               | —             | Not built    | (The bus exists as transport, not as a ride)                                                    |
| A new colleague joining; office visitors; a broken printer; a parcel; a celebration            | —             | Not built    | —                                                                                               |

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
2. **S2 · Meetings attended in person** (office): **done**, see below. Colleagues gather (as now); the
   player walks to the meeting to join it; the host opens it; people speak in turn
   (who is speaking faces the room and gestures); the existing meeting content and
   grading are unchanged; it counts only if the player was there; everyone goes back.
3. **S3 · Workplace events in person**: **done**, see below. The colleague comes to the player's desk (Tom
   asking a favour, Priya with an urgent request), and the existing choices are made
   face to face.
4. **S4 · A promotion from the manager**: **done**, see below. Asked to her office; she talks through the
   work, announces it, the letter on the desk; then the record and pay update.
5. **S5 · Interviews at the company**: **done**, see below. going to the company's reception, signing in,
   waiting, the interviewer coming out, the interview in a meeting room, the result.
6. **S6 · Home services and rides**: **done**, see below. a technician who comes to repair something; a taxi
   that arrives and drives the player.
7. **S7 · Social life and the city**: **done**, see below. friends met at the café or the park; a neighbour
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

### S2 · Meetings attended in person

- **Walked to and attended**: "Join the team stand-up" (or E at the player's place in
  the circle) walks the player to the whiteboard, among the team. They listen while the
  others speak in turn (the manager, at the board, every other turn, presenting; each
  colleague in between, talking; everyone else listening), then give their own update
  (everyone listens), and only then has the meeting been attended: its content, choices
  and grading are as before. Weekly planning and the one-to-one are attended in the
  player's chair in the manager's office. Seen from behind the player, so the circle
  and the board are in view.
- **It counts only if the player was there**: walking away part way (moving, or E) is
  not attending; the meeting stays open to join while it is on, and cannot be joined
  when it is not. Without 3D, the panel joins at once, as before.
- **Tests**: unit tests for turn-taking and the player's place (clear floor, facing the
  board); browser tests for attending in person (in the circle, listening, the update,
  then the meeting) and for walking away part way (not attended).
- **Screenshots**: `docs/screenshots/meetings/`.

### S3 · Workplace events in person

- A workplace event waiting for the player (game/events.ts) sends the person it is
  about to the player's desk: `everyone()` takes `callers` (person → place), and
  they go to `call:player` beside the desk unless they are in a meeting or not in.
  There they are free to talk, "waiting to talk to you".
- Walking up to them (E, a click, or Talk in the panel) opens what they came about,
  with its choices, face to face. Once answered (or lapsed), they go back to their day.
- The panel says "… has come over to your desk" in 3D, "… wants a word" without it.
- Tested: a unit test for the schedule; `events.spec.ts` has the manager walk from
  her office to the desk in the 3D office, be talked to there, and go back.

### S4 · A promotion from the manager

- Promoted (the promotion and the new pay go on the record when the work that earns
  it is handed in, as before), the manager asks to see the player in the manager's
  office: the event `promotion-talk:<level>` (game/events.ts), `at: 'their-office'`,
  so the manager stays there instead of coming to the desk.
- The panel says "… would like to see you in the manager's office" with **Go**, which
  walks the player in; the letter lies on the desk while it waits.
- The manager talks through the work done at the old level, announces the new title,
  and hands over the letter with the new weekly pay; the player thanks them or asks
  what is expected now. Told once per level.
- Written without pronouns for the manager (the six careers' managers differ).
- Tested: unit tests (told in the office, once, only with a promotion);
  `week.spec.ts` earns the promotion, then hears it in person (screenshot checked).

### S5 · Interviews at the company

- The employers hold their interviews in the evening at **Harbourside House**, the
  serviced offices on the high street (a new place, `offices`, door at x 32 on the
  south side). The video interview at home is still there; either counts the same.
- In person: sign in at reception (the visitors' book, a badge); take a seat and wait;
  the interviewer comes out of Meeting Room 2 to the waiting chairs to call the player
  in (talking to them, or "Go into the interview"); both go in and sit across the
  table; the three questions; a handshake; the result goes in the career notes and the
  evening's log ("… at Harbourside House: offered …").
- Each step only after the one before; only while the building is open (it closes at
  21:00, and the interview takes an hour).
- Rules: `canInterviewInPerson`, `bookedInterview` and `interview(…, inPerson)` in
  game/careerLife.ts.
- Tested: unit tests (in person only there, at home only on video, the same score and
  offer, closing time); `interview.spec.ts` plays it in 3D, checking the interviewer
  walks out to the chairs and back to the table (screenshots checked).
- Not saved part way: leaving the building or reloading starts again at reception
  (nothing is counted until the interview is finished).

### S6 · Home services and rides

- **A taxi to work.** Chosen in the street ("Go to work", Taxi), it comes up the road
  from the west end, pulls in at the kerb beside the player and waits ("Your taxi is
  here"); getting in at its back door (E, a click, or walking up), the player is driven
  off east, and the commute (fare and time, as before) takes them to work. From home,
  or without 3D, the taxi is taken straight away as before.
- **A heating engineer at home** (game/repair.ts). The boiler breaks down on set days
  (day 4, then every 15 days; never at random): no shower until it is fixed. In the
  living room, "Call a heating engineer"; they arrive about 40 minutes later, walk along
  the landing and ring; let in, they go to the boiler on the kitchen wall (its light
  red), work on it with the player watching, come back to the door to be paid (£65,
  once), and leave; the light turns green and the shower works again. If no one
  answers within 12 minutes they go, and the player calls again. The repair's steps are
  only listed while there is something to repair. In the save, so a reload carries on.
- Tested: unit tests (the days, the shower, the steps in order, paid once, missed
  visits); `transport.spec.ts` takes the taxi in 3D; `repair.spec.ts` plays the
  breakdown, a reload while the engineer is on the way, the visit and the repair
  (screenshots checked).

### S7 · Social life and the city

- **Friends met in person.** A drink is now at Kettle & Crumb and a run round Millpond
  Park (content/friends.ts `venue`). Said yes to on the phone, "Go" at the front door
  takes the player there, where the friend is waiting (from an hour and a half before
  until half an hour after it starts): sitting at the window table for a drink, or
  stretching by the running loop, then running the laps alongside the player. It
  counts (friendship, needs, money, time) once played. The other plans (the cinema, the
  quiz, dinner at their place, an online game) still happen off-stage.
- **A neighbour in the street.** On Tuesday and Thursday evenings Aisha, the neighbour,
  is on the pavement by the building with her shopping; when the player comes near she
  waves and calls over ("Hi, neighbour! Have you got a minute?"), a conversation started
  by someone else. Stopping to chat brings them closer (once an evening).
- **A parcel.** On Thursday evenings at seven a courier rings with a parcel for next
  door; answering, the player signs for it and takes it in, then takes it round; Aisha
  sends a thank-you and the friendship grows. If no one answers in ten minutes, the
  courier takes it elsewhere (game/parcel.ts; saved).
- **A new colleague's first day.** Ellie joins on day 3: the manager brings her over to
  the player's desk to introduce her (offer to show her round, or say hello); then she
  settles in at the break room table and joins the stand-up.
- **A broken printer.** On Tuesday afternoons the printer jams; the facilities colleague
  waits at it for a hand (ease the sheet out with the power off, force it, or leave it).
- **A team celebration.** Fridays at 16:15, Friday cake: everyone gathers round the
  break room table, with a cake on it; the player can join once (time away, a lift in
  mood, a little trust with each of the team; not counted as a meeting).
- Tested: unit tests for every rule; browser tests in `office-life.spec.ts` (new
  starter, printer, cake), `neighbourhood.spec.ts` (the neighbour, the run, the
  parcel) and `life.spec.ts` (the drink at the café); screenshots checked.
- Found on the way: while running between an activity's points (the park laps), the
  player's position was not shared with anyone else (people keeping clear of them, a
  friend alongside); it is now (`PlayerRig`).
