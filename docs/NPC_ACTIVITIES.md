# People doing real things

How the people of the world sit, work, eat and use things: on real seats, with real
equipment, holding what they use. This applies to every person: the office's crowd,
the café and shop customers, the people placed in a scene (staff, regulars, members,
partners), and the player.

## What was wrong (November 2026)

- **Sitting on air.** The reading, writing, eating and drinking poses were all built
  on the seated pose. Places where people stand (the standing desk, reception, the
  printer, the water cooler, the kitchen counter, the filing cabinet) used them, so
  people there sat in mid-air with bent legs.
- **Sinking into chairs.** Every seated pose put the hips at one fixed height
  (0.49 m). The real cushions are 0.45–0.51 m up, and the body needs about 0.075 m
  under the hip joint, so seated people sank into their chairs.
- **Seats by coordinates.** Seated places were points typed in by hand, near a chair
  but not on it. Nothing checked that a chair was really there, which way it faced,
  or that nobody else was on it. One park bench sitter faced the backrest.
- **Hands at nothing.** Activities were only animations. Typing ignored where the
  keyboard was. Nobody held the phone they talked into, the document they read, the
  cup they drank from or the clipboard they wrote on. "Typing" was asked for at a
  break room table with no computer, and the exercise bike's rider sat still.

## The system

1. **Anchors** (`src/world/anchors.ts`). Furniture and equipment register where they
   are used, from their own geometry, in world space, when they appear:
   - seats: where the hips go, which way the sitter faces, and the cushion height;
   - keyboards;
   - printers, shelves, counters, checkouts, coffee machines, water coolers,
     whiteboards and plants: where hands reach to.

   A component does this with `useAnchors(specs)` on its group; plain-box scenery
   uses `<Anchors specs>` (`src/world/AnchorPoints.tsx`). An anchor can say what a
   user holds there (`carry`: a basket at the shop shelves, a document from the
   printer). Seats are claimed by whoever sits there, one person per seat
   (`claimSeat`, `releaseSeats`).

2. **Activities** (`src/world/npc/activities.ts`). Every activity declares:
   - its posture: seated, standing or either;
   - what must be within reach (typing needs a keyboard; reaching needs a shelf, a
     printer, a counter, a till, a coffee machine, a water cooler or a plant;
     presenting needs a whiteboard);
   - what is held (phone, document, clipboard and pen, cup, sandwich, card);
   - where the hands go.
3. **Validation** (`resolvePlace`). A place is checked against the anchors that are
   really there:
   - A seated place gets the nearest free seat within 0.6 m. If there is none,
     nothing seated is done there.
   - Each activity is kept only if its posture fits and what it needs is within
     1.4 m. Anything rejected is recorded with the reason.
   - If nothing is left, the person just stands, or sits.
4. **Fitting** (`src/world/character/fit.ts`):
   - Seated poses are put on the actual seat: the hips at the cushion plus 0.075 m,
     and the legs solved so the feet are on the floor (`seatOn`).
   - Hands go on targets by a two-bone arm solution (`armTo`, `handsOn`), leaning
     forward only as far as needed to reach (`leanToReach`).
   - Sitting down and getting up are animated (`sitting`, about one second each).
   - Arm-only clips (typing, reading, writing, drinking, the phone, talking) are done
     seated or standing, as the place allows (`clipFrame(clip, t, posture)`).
5. **Who uses it:**
   - the crowd (`Crowd.tsx`): sits down onto the seat, gets up before walking off
     (reported as `rising` meanwhile, and not yet counted anywhere else),
     and holds what it uses (`Held.tsx`);
   - people placed in a scene (`Npc.tsx`, with `activity` and `also` props);
   - the player (`PlayerRig.tsx`, via `fitToWorld`).

## Adding something new

- **New seat or equipment:** register its anchors in its own component, from its own
  geometry. Everyone can then use it; nothing else needs to change.
- **New activity:** add it to `ACTIVITIES`, with its posture, needs and held props.
  Places that ask for it are checked automatically.
- **New place:** give its `clip` and `also`. The unit test checks that every
  activity a place asks for exists and fits the place's posture. The browser test
  checks, in the real scenes, that nothing asked for is rejected, nobody shares a
  seat, every seated hip is on its seat, and what is held matches what is done.

## Tests

- Unit tests (`src/world/npc/activities.test.ts`):
  - the feet reach the floor from every seat height;
  - the arm solution lands where it was aimed;
  - typing hands land on the keys;
  - seats are found and never shared;
  - no seat means no seated activity, and no keyboard or shelf means no typing or
    reaching;
  - what is held matches what is done;
  - the player is fitted too;
  - every authored place is valid.
- Browser tests (`tests/e2e/activities.spec.ts`) measure the office (mid-morning and
  lunch), the café and the shop. Screenshots: `docs/screenshots/activities/`.

## Not done yet

- Hands and feet are solved only along the way the person faces. The arms' sideways
  angles are the clips' own, so hands land in line with the target, not on a
  particular key.
- There are no fingers: typing is shown by small movements at the elbows, and
  holding by the object in the hand.
- The gym's runners use the treadmill's own drawing, and the trainer and gym desk
  staff simply stand. No one walks a dog, and there are no street vendors yet, so
  neither is drawn.
- Café staff do not carry trays to tables: the barista works the machine and the
  customers order at the counter.
- Seats are matched by distance. A seat that is only reachable round an obstacle is
  still taken if it is the nearest.
