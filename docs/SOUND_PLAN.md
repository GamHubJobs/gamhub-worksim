# Sound: plan and design

Sound that makes the world feel alive: the office, the street, the café and home each
sound different, change through the day, and respond to what the player does, without
getting in the way of concentration.

## Principles

- **Original and free.** Every sound is made in the browser as the game runs, with the
  Web Audio API: tones, filtered noise and envelopes. There are no recordings, so there
  is nothing to licence, buy, download or cache, and nothing copied from any other game.
- **Never needed.** The game is fully playable without sound. Sound starts only after
  the player's first click or key press (as browsers require) and only if some sound
  is on. Where Web Audio is missing or fails, everything carries on silently.
- **Comfortable.** Background sounds sit well under everything else, a compressor
  stops anything being suddenly loud, music plays now and then rather than all the
  time, and the same sound is never repeated in quick succession.
- **The player decides.** A master volume, a volume and switch for each kind of sound,
  mute, "fewer sounds" (on by default when the system asks for less motion) and
  captions. Kept on this device, not in saves.

## Architecture

```
Views (office, computer, home, street, places, the laptop's interview)
  │  ask for a scene: a place and a time of day   (useAudioScene / <AudioScene>)
  ▼
src/audio/manager.ts ── settings, levels, scene claims (the latest wins),
  │                     duplicate prevention, captions; tiny, loads with the app
  │  after the first click or key press, if any sound is on:
  ▼
src/audio/engine.ts  ── loaded on demand (about 5 kB compressed)
  ├─ buses: music, surroundings, effects, character, people → compressor → speakers
  ├─ effects: interface and game sounds, footsteps by surface, doors, typing
  ├─ surroundings: steady beds (traffic, wind, air conditioning, a fridge) and
  │   occasional events (cars passing, birds, phones, coffee machines…) by scene
  └─ music: short generated pieces per mood, with rests between

src/audio/scenes.ts  ── pure: places, time of day, what each scene contains, moods
src/audio/useAudio.ts ── the game's news as sounds, read from changes to the save
```

- **Scenes.** Each view claims a scene while it is shown. The manager keeps the claims
  in order, so something inside a view (an interview on the laptop) can take over and
  hand back. A new scene fades the old one out and disconnects its sounds and timers.
- **Game sounds** come from one place (`useGameSounds`): it compares the save before
  and after each change (a new email, a passed task, a promotion, pay, an offer, a
  phone message, a door) and plays at most two sounds, the most important first. The
  game rules stay free of sound.
- **Hidden tab.** When the tab is hidden, the surroundings and music stop; they come
  back when it returns.

## What is heard where

| Scene                 | Surroundings                                                       | Music      |
| --------------------- | ------------------------------------------------------------------ | ---------- |
| Reception             | air conditioning, doors, footsteps, a phone, some talk             | focus      |
| The office floor      | typing, phones, the printer, chairs, colleagues talking, footsteps | focus      |
| At the computer       | the office, quieter, with your own typing                          | focus      |
| Manager's office      | air conditioning, a clock, a chair: quiet                          | none       |
| Break room            | the coffee machine, cups, the microwave, the fridge, talk          | none       |
| High street           | traffic, passing cars, horns, people, footsteps, wind, birds       | city       |
| The homes end         | lighter traffic, birds (most in the morning), doors                | city       |
| The park end          | wind, birds, people                                                | city       |
| Business district     | busier traffic, footsteps, construction in working hours           | electronic |
| Café                  | the coffee machine, cups, the till, lots of talk                   | café       |
| Shop, gym, Cog & Kerb | the till / weights / tools                                         | electronic |
| Home                  | the fridge, a clock, distant traffic, birds or crickets            | home       |
| Interview (laptop)    | home                                                               | interview  |

By time of day: mornings bring birds, the day is busiest, evenings quieter with
crickets, and at night there is little traffic, no horns and no construction.

**Weather** is not part of WorkSim (there is no weather in the game), so there is no
rain or thunder: adding weather only for its sound would not fit what the player sees.

**Voices.** There is no voice acting and no AI voices. People are heard as
conversational murmur (voice-like sound, not words), and a colleague gives a short
friendly "mm-hm" when a conversation starts; the words are on screen.

## Stages

1. Manager and settings (done).
2. Interface and game sounds (done).
3. Workplace surroundings (done).
4. Character sounds: footsteps by surface in time with the walk, doors, sitting down
   and getting up, typing (done).
5. The neighbourhood's surroundings, by area and place (done).
6. Music by mood, with rests, and short pieces for promotions and achievements (done).
7. People: murmur and greetings (done; no voice acting).
8. Time of day (done); weather (not applicable: see above).
9. Offline, performance and accessibility checks (done: no assets to cache, the engine
   loads on demand, captions and "fewer sounds", tests below).

## Testing

- Unit tests (`src/audio/audio.test.ts`): settings, scenes and time of day, the
  manager (loading only after a gesture and when on, failing quietly, duplicates,
  switches, captions, scene claims) and the game's news.
- Browser tests (`tests/e2e/sound.spec.ts`): a real, measurable signal comes out;
  scenes follow the player from the office to home, the street and the café;
  footsteps keep time with walking; settings survive a reload; captions; mute is
  silent.
