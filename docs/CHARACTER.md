# Playing the character: movement, camera and physical activities

Inside the places in the neighbourhood the player walks their character about in
third person and does things for real: the character walks to the equipment, sits or
lies down, picks things up and performs the activity, and the game counts it only when
it is finished. This document describes how it works and what is done so far.

## Controls

| Control                   | Keys (default)                          |
| ------------------------- | --------------------------------------- |
| Walk forward / back       | W / S (or ↑ / ↓)                        |
| Move left / right         | A / D                                   |
| Run                       | Shift (hold)                            |
| Crouch                    | C (hold)                                |
| Jump                      | Space                                   |
| Use, start or stop        | E (or Enter)                            |
| Turn the camera           | drag the mouse, or Q / R                |
| Zoom                      | mouse wheel, or + / −                   |
| Mouse look (pointer lock) | the **Mouse look** button; Esc releases |

Crouch is **C** rather than Ctrl: in a browser, Ctrl with W closes the tab, and the
page cannot prevent it. The keys are kept in `src/world/keys.ts` (with saving on this
device); a screen to change them is still to come.

Near something usable, a small prompt says **Press E to …** (or why it cannot be done
now). While an activity plays, a bar shows its stage and progress; pressing E or moving
stops it, and nothing is given for an activity stopped part way. The list beside the 3D
view and the ringed objects start the same activities; without 3D (no WebGL, or if it
fails) the list does them straight away, as before.

## How it works

```
src/world/
  keys.ts                 controls and keys
  character/controller.ts movement: camera-relative, run, crouch, jump, collisions
  character/camera.ts     third-person orbit, kept clear of walls and the ceiling
  character/rig.ts        the animations: every joint as a function of time
  interaction/activity.ts the activity format: where, the prompt, stages, sounds, effects
  PlayerRig.tsx           the player: input → movement → prompts → activities → camera
  WalkView.tsx            the page around a walkable view: keys, mouse, prompt, progress
  props.tsx               things the character holds (a mug, a fork, a card, dumbbells…)
  vfx/                    particles (water, steam, sweat…), wet floors, activity effects
  context.ts              what room objects can see: the activity now, the hands
```

- **The character** is the same person model as the office (`office/scene/people.tsx`),
  extended: running (a longer, quicker stride), crouching, jumping, a whole-body pose
  from an activity (including lying down and rolling onto the side), things held in each
  hand, and markers at the hands so objects can follow them. Every change of pose is
  blended over a moment, so one motion flows into the next.
- **Animations are made in code** (no motion capture): each clip gives the angle of every
  joint at a moment. There are 31: standing, crouching, sitting, typing, reading,
  writing, eating, drinking, the phone, talking, presenting, reaching for a shelf,
  paying, cooking, washing hands, brushing teeth, showering, dressing, lying down,
  sleeping, the bench press, curls, squats, cycling, running on a treadmill, stretching,
  yoga, driving and pushing a door.
- **Collisions**: each place lists its solid boxes on the floor plan; the character slides
  along them. Walking to an activity goes round furniture and, once close (or if it
  stops making progress), steps into place.
- **Activities** are data: a spot and reach, an anchor (where the character goes and
  faces), stages (a clip for some seconds, things held, optionally walking somewhere
  first: a table, the next aisle, the checkout), sounds at their moments, effects in
  their windows, and the game action to complete at the end.
- **Objects that react**: the barbell leaves its rack and follows the hands through the
  reps; the treadmill belt moves; the bike's wheel spins; dumbbells leave the rack; the
  café table gets the plate or cake, which shrinks as it is eaten.
- **Effects**: one particle system (`vfx/Particles.tsx`) with presets for shower water,
  a tap, splashes, steam, sizzling, sweat, bubbles, breath, dust and exhaust; effects
  can follow a hand (steam from a cup being drunk). Water leaves a wet patch that dries.
  Fewer particles on low graphics; nothing is drawn once an effect has ended.
- **The home** is laid out from its size, rooms and the furniture owned
  (`src/home/scene/homeLayout.ts`), so every home and whatever has been bought works:
  each activity happens at the piece of furniture it needs. In tight spots without a
  ceiling (the cutaway flat) the camera rises to look down; during an activity it picks
  the first clear angle.
- **Until the 3D view is ready**, the lists do things straight away.
- **Performance**: only the place the player is in is loaded; the view draws at full
  speed only while something changes (moving, acting, the camera settling) and a few
  times a second otherwise.

## What each place offers

| Place          | Activities (each completes the place's game action)                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forge Fitness  | Bench press (sit, lie back, grip, 5 reps, rack, sit up); dumbbell curls; squats; treadmill; exercise bike; the class (warm-up, mobility, squats, cool-down); a shower (water, splashes, steam, wet floor)                                                                                                                                                                                                                                                        |
| Kettle & Crumb | Coffee and cake, breakfast, dinner: order at the counter with a card, collect, carry to a table, sit, eat or drink                                                                                                                                                                                                                                                                                                                                               |
| Daily Basket   | A week's shopping: take a basket, four aisles picking products, pay at the checkout; a ready meal from the fridge                                                                                                                                                                                                                                                                                                                                                |
| Millpond Park  | A walk round the pond, a run of the loop, sitting on a bench                                                                                                                                                                                                                                                                                                                                                                                                     |
| Cog & Kerb     | Choose a bike and pay; sell a bike back; look over the car, sign the lease, take the keys; hand it back                                                                                                                                                                                                                                                                                                                                                          |
| Home           | Cook at the hob (sizzle and steam) and eat at the table; breakfast; coffee from the machine; a takeaway (order on the phone, collect at the door, eat); brush teeth and wash at the basin (the tap runs), then shower (water, splashes, steam, a wet floor); get dressed; read, watch a series (the TV lights up), call a friend or play games on the sofa; study at the desk; yoga; a run or out with friends; bed (sit, lie down, fall asleep); the front door |

## Still to do

- The street (walking with these controls; the bike and the car with F) and the office
  (sitting at the desk and typing, the manager's office, meetings).
- Weather (rain), a screen to change the keys, and screenshots of every interaction.

## Limits

- The characters are made of simple shapes and animated in code, so movements are
  believable rather than film-quality.
- There is no physics engine: objects move with the animation (the bar with the hands),
  which is reliable and light.
- Desktop keyboard and mouse only; touch screens are not supported in 3D (the lists
  still work).
