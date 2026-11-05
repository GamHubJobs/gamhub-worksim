# WorkSim Life: plan

GamHub WorkSim grows from a working day into a whole life: home, needs, money,
friends, a city to move around, and the career at its centre. It stays an original
single-player game: inspired by the freedom of open-world games and the everyday
depth of life simulations, without copying any game's content, names or look.

## Principles

- **The career stays at the centre.** The office day, the desktop, WorkSim AI, tasks,
  cases, grading, progression and saves keep working as they do. Life wraps around
  the working day: the evening and the morning at home, and the journey between.
- **Decisions have consequences.** Skipping breakfast, going to bed late, overspending
  or neglecting friends shows up at work (energy, stress, engagement, punctuality) and
  in the bank balance; looking after yourself helps.
- **Performance first.** It must run on an ordinary laptop (Intel HD 5500) and on
  computers without a graphics card (the simpler 3D path). Every new place is built
  like the office: simple shapes, shared geometry, textures drawn in code.
- **Saves are only ever added to.** New data has defaults, so older saves load and
  simply start the new life on their next evening.
- **Free to play.** Nothing here needs a paid service.

## Stages

| Stage | What it adds                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1    | Needs (hunger, hygiene, social, fun, with energy), the evening and morning at home, sleep, the commute, a wallet with salary and rent, consequences at work |
| L2    | The home: a 3D apartment, furniture to buy and arrange, upgrades, moving home                                                                               |
| L3    | Social life: friends outside work, a phone (messages, calls), invitations, visits                                                                           |
| L4    | The city: a walkable district with a third-person character, enterable places (home, office, café, shop, gym, park), people about                           |
| L5    | Getting around: walking, bus, bike and car, with time, cost and energy                                                                                      |
| L6    | Career life: job applications and recruitment, salary negotiation, a side business                                                                          |
| L7    | AI in daily life: WorkSim AI for budgeting, planning and learning                                                                                           |

Each stage is built, tested (unit, browser, production build, other browsers),
documented and committed before the next.

## L1 in detail

- **The day**: after work the player goes home (the end-of-day summary stays); the
  evening runs on a home clock until bed. The morning starts when they wake (bedtime
  decides how rested they are), runs until they leave, and the commute brings them to
  the office: early, on time, or late.
- **Needs**: hunger, hygiene, social and fun (0–100, high is good), falling as time
  passes, with energy and stress from the existing wellbeing. Each home action (cook,
  eat out, shower, dress, relax, call a friend, read, exercise, sleep) takes time,
  may cost money and changes needs.
- **Consequences**: arriving hungry, unwashed, late or with needs neglected affects
  energy, stress, engagement and reputation, through the existing wellbeing rules.
- **Money**: a wallet with weekly pay by career level (on Friday), weekly rent (on
  Monday), and spending (groceries, meals out, fares), with a statement.
- **Getting to work**: walk (free, slow, some exercise), bus (cheap, quicker) or taxi
  (dear, quickest).

## L4 in detail

- **The neighbourhood**: one main street (an original layout) with the player's
  building, a café, a food shop, a gym, a park, and the road to the office at the end.
  Its places, opening hours and activities are content (`src/content/city.ts`); the
  rules are pure functions (`src/game/city.ts`).
- **Where the player is**: at home, out in the street, or inside a place
  (`life.city`, additive: older saves start at home). Home actions need the player at
  home, place actions inside the place while it is open, and bed only at home.
- **Walking**: going from one place to another takes minutes on the clock along the
  street, and needs fall on the way. Walking about in 3D between doors is free; the
  time is counted from the place left to the place entered.
- **Third person**: the camera follows behind the player and stays above the street, so
  buildings never block the view. Up and Down walk, Left and Right turn, Shift runs,
  Enter goes in; doors can be clicked. Movement runs on its own steady timer, so it is
  the same speed on a slow computer; the scene draws only a few times a second when
  nothing moves.
- **Without 3D**: the list of places does everything the street does.
- **The morning**: from the street the player can go on to work (the walk commute):
  breakfast at the café or a shower at the gym count for the morning routine.

## L5 in detail

- **Ways to work**: walk, bike, bus, car and taxi, each with a time, a cost each way,
  and effects on energy, stress and needs (`COMMUTES` in `src/content/life.ts`). The
  same choice is offered at the front door and at the end of the street, with the
  arrival time and the reason when one is not possible.
- **Owning a way to get around** (`src/content/transport.ts`, `src/game/transport.ts`):
  a bike bought once and sold second-hand; a car on a weekly lease (a deposit for the
  first week, then a charge every Monday with the rent). Both from Cog & Kerb, a new
  place on the high street. Saved in `life.vehicles` (additive).
- **In the neighbourhood**: on the bike, walking times between places are halved and
  the player moves faster in 3D; the bike waits by the door and a leased car is
  parked outside. A bus and cars drive the street in their lanes and stop for the
  player.
