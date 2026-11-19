# The game's opening

What a player sees from opening the page to standing in their own place: the
logo, loading (the real steps), a flight over the real city to their building,
and the fade into the game. It plays over the game while the game starts
underneath, so it never delays it and never shows an empty or half-drawn world.

## The sequence

1. **The logo** (`launch/Logo.tsx`): the GamHub WorkSim emblem (a skyline rising
   like a chart under a rising sun, drawn in code) and wordmark, out of the
   dark, with a sweep of light, particles drifting up and a slowly moving sky,
   and its own sound (`launch` in audio/engine.ts), at the player's volume
   (browsers play sound only after the first key or click, so the very first
   launch may be silent).
2. **Loading**: the real steps, each ticked as it happens: the save opened, the
   game loaded (the desk and the world on the page), and the place the player
   is in drawn (`world/transition/ready.ts`). The bar counts these steps; there
   is no percentage, since none could be measured honestly.
3. **The flight** (`CityFlyover` in city/scene/CityScene.tsx): the camera over
   the real city (the street, the park, the business district, traffic and
   people) and down over the road to the door of the player's building (the
   office during the working day, home or the place they are in after it). It
   starts only once the player's place is ready behind it.
4. **The fade into the game**: the opening fades and the player is where they
   left off, already drawn.

## How much of it

| Player                              | What plays                                            |
| ----------------------------------- | ----------------------------------------------------- |
| First time (no save, or never seen) | All of it: the logo (2.6 s), the full flight (10 s)   |
| Returning (Opening: Short, default) | A short logo (1.2 s) and a short flight (3.5 s)       |
| Opening: Full                       | All of it every time                                  |
| Opening: Off                        | A loading screen only while loading, then straight in |

- **Skip** at any moment (the button, Esc, Enter or Space): into the game as
  soon as it is ready. "Skip the opening next time" turns it off. The choice is
  in Sound & graphics → Opening, kept on this device (`launch/prefs.ts`).
- **No flight** on Low graphics, with reduced motion, without WebGL, or where 3D
  is drawn in software (`launch/canFly.ts`). If a browser hides that (Firefox),
  the flight draws with less detail when it finds out.
- **Never stuck**: the flight not drawn in 8 s, or running long, goes into the
  game; the whole opening steps aside after 30 s of waiting.
- While the opening covers the world, the world does not redraw for nothing
  (once it is ready), so the flight has the computer to itself.

## Changing place: shown only when drawn

The curtain over a new place (`world/transition/Still.tsx`) lifts when the
place has really drawn itself (the player rig's first frames, once the place
is built and its shaders compiled), however long a slow computer takes. After
1.5 s it says "Arriving…", and it lifts anyway after 15 s (it was 4 s, which on
a slow computer could show a place before it was drawn).

## Tests

- `tests/e2e/launch.spec.ts`: a fresh install (logo, flight, the first-day
  screen), a returning player (a short opening, then the office drawn and
  playable), skipping (and not again), the setting, reduced motion, and the
  save kept through every launch.
- `src/launch/launch.test.ts`: which opening plays, and where the flight ends.
- Automated tests otherwise start without the opening (`openingDisabledForTests`
  in prefs.ts); `worksim.opening.test` turns it on (`on`), or forces the flight
  on a computer without a graphics card (`fly`).
